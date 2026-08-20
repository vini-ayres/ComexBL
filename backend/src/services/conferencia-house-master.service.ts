import type { BlHouse, BlMaster, Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';
import { BL_VERSION, isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import {
  CONFERENCIA_FIELDS,
  CONFERENCIA_HEADER_STATUS,
  CONFERENCIA_PAIR_NOT_READY_STATUSES,
  CONFERENCIA_WORKFLOW_STATUS,
  STRATEGY_TO_CAMPO_STATUS,
  isCampoPending,
  isConferenciaFieldKey,
  resolveCampoAcceptedValue,
  type ConferenciaComparableField,
  type ConferenciaResolutionStrategy,
} from '../constants/conferencia-house-master.constants.js';
import { PRISMA_EXTENDED_TRANSACTION_OPTIONS } from '../constants/prisma.constants.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/AppError.js';
import { applyConferenciaValueToDocument } from '../mappers/conferencia-house-master-entity.mapper.js';
import {
  buildConferenciaDocumento,
  buildHistoricoCampoRef,
  emptyCounterpart,
  encodeHistoricoValorDepois,
  mapConferenciaLatestDetail,
  mapConferenciaPersist,
  mapConferenciaResolveResponse,
} from '../mappers/conferencia-house-master.mapper.js';
import { mapWorkflowSummary } from '../mappers/workflow.mapper.js';
import { prisma } from '../prisma/client.js';
import { BlConferenciaCampoRepository } from '../repositories/bl-conferencia-campo.repository.js';
import { BlConferenciaRepository } from '../repositories/bl-conferencia.repository.js';
import { BlHistoricoAlteracaoRepository } from '../repositories/bl-historico-alteracao.repository.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import type { BlDocumentType, UpdateWorkflowInput } from '../types/bl-domain.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import type {
  ConferenciaComparisonFieldDto,
  ConferenciaComparisonResult,
  ConferenciaCounterpartDto,
  ConferenciaDocumentoDto,
  ConferenciaLatestDetailDto,
  ConferenciaPersistResult,
  ConferenciaQueueEntry,
  ConferenciaQueueItemDto,
  ConferenciaResolveResponseDto,
  ResolveConferenciaCampoRequestDto,
  ResolveConferenciaRequestDto,
} from '../types/conferencia-house-master.types.js';
import { getSkipTake } from '../utils/pagination.js';
import type { WorkflowSummaryDto } from '../types/workflow.types.js';
import type { DivergenciaService } from './divergencia.service.js';
import type { WorkflowService } from './workflow.service.js';

type ScalarSource = {
  GrossWeight: unknown;
  VolumeMeasure: unknown;
  PackingQuantity: unknown;
};

type ConferenciaResolveContext = {
  documentType: BlDocumentType;
  documentNumber: string;
  blVersion: BlVersion;
  blMasterId: number | null;
  blHouseId: number | null;
  targetBlId: number;
};

export class ConferenciaHouseMasterService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly conferenciaRepository: BlConferenciaRepository,
    private readonly conferenciaCampoRepository: BlConferenciaCampoRepository,
    private readonly historicoRepository: BlHistoricoAlteracaoRepository,
    private readonly workflowService: WorkflowService,
    private readonly divergenciaService: DivergenciaService,
  ) {}

  async getQueueItem(pagination: PaginationQuery): Promise<ConferenciaQueueItemDto> {
    const pendingEntries = await this.resolvePendingQueue();
    const total = pendingEntries.length;

    if (total === 0) {
      throw new NotFoundError('Nenhuma conferência pendente');
    }

    const { skip } = getSkipTake({ ...pagination, pageSize: 1 });
    const entry = pendingEntries[skip];

    if (!entry) {
      throw new NotFoundError(
        `BL não encontrado na página ${pagination.page} de ${Math.max(1, Math.ceil(total))}`,
      );
    }

    const persisted =
      entry.tipo === 'Master'
        ? await this.conferenciaRepository.findLatestByMasterIdWithCampos(entry.id)
        : await this.conferenciaRepository.findLatestByHouseIdWithCampos(entry.id);

    if (!persisted) {
      throw new NotFoundError(
        `Nenhuma conferência House × Master encontrada para ${entry.tipo} ${entry.documentNumber}`,
      );
    }

    const conferencia = await this.getById(persisted.Id);
    const documentos = await this.loadDocumentos(entry, conferencia);

    return {
      conferencia,
      documentos,
      pagination: {
        page: pagination.page,
        pageSize: 1,
        total,
        totalPages: Math.max(1, Math.ceil(total)),
      },
    };
  }

  /**
   * Após Apoio Humano: a conferência só começa quando existir Master e House
   * do mesmo ContainerNumber. Enquanto faltar um dos dois, o documento espera.
   */
  async continueAfterApoioHumano(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersionValue: string,
  ): Promise<ConferenciaPersistResult | null> {
    const blVersion = this.parseBlVersion(blVersionValue);
    const pair = await this.resolveContainerPair(documentType, documentNumber, blVersion);

    if (!pair.ready) {
      await this.markWaitingForPair(
        documentType,
        documentNumber,
        blVersion,
        pair.waitingMessage,
      );
      return null;
    }

    if (pair.master) {
      for (const house of pair.houses) {
        if (house.BLMasterId == null) {
          await this.houseRepository.linkToMaster(house.Id, pair.master.Id);
        }
      }
    }

    const housesToCompare: BlHouse[] = [];
    for (const house of pair.houses) {
      if (documentType === 'House' && house.HouseNumber === documentNumber) {
        housesToCompare.push(house);
        continue;
      }

      const houseWorkflow = await this.workflowService.getWorkflowByDocument(
        'House',
        house.HouseNumber,
        this.parseBlVersion(house.BlVersion),
      );

      if (houseWorkflow?.workflow.Status === CONFERENCIA_WORKFLOW_STATUS) {
        housesToCompare.push(house);
      }
    }

    if (housesToCompare.length === 0) {
      if (pair.master) {
        await this.tryAdvanceMasterIfPairSettled(
          pair.master.MasterNumber,
          this.parseBlVersion(pair.master.BlVersion),
        );
      }
      return null;
    }

    let last: ConferenciaPersistResult | null = null;
    for (const house of housesToCompare) {
      last = await this.triggerAfterApoioHumano(
        'House',
        house.HouseNumber,
        house.BlVersion,
      );
    }

    return last;
  }

  /**
   * Disparado após Apoio Humano concluir. Compara House × Master e
   * avança o workflow (divergência GlobalSys ou finalizado) se não houver diferença.
   */
  async triggerAfterApoioHumano(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersionValue: string,
  ): Promise<ConferenciaPersistResult | null> {
    try {
      const blVersion = this.parseBlVersion(blVersionValue);
      return await this.compareAndPersist(documentType, documentNumber, blVersion);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido na conferência House × Master';

      logger.warn(`Falha na conferência House × Master: ${message}`, {
        err: error,
        documentType,
        documentNumber,
      });

      return null;
    }
  }

  async compare(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion = BL_VERSION.FINAL,
  ): Promise<ConferenciaComparisonResult> {
    return this.buildComparison(documentType, documentNumber, blVersion);
  }

  async compareAndPersist(
    documentType: BlDocumentType,
    documentNumber: string,
    preferredVersion: BlVersion = BL_VERSION.FINAL,
  ): Promise<ConferenciaPersistResult> {
    const comparison = await this.buildComparison(
      documentType,
      documentNumber,
      preferredVersion,
    );

    const document = await this.resolveDocument(
      documentType,
      documentNumber,
      comparison.blVersion,
    );

    const conferenciaStatus = comparison.hasDivergence
      ? CONFERENCIA_HEADER_STATUS.PENDENTE
      : CONFERENCIA_HEADER_STATUS.SEM_DIVERGENCIA;

    const persisted = await prisma.$transaction(async (tx) => {
      const conferencia = await this.conferenciaRepository.upsert(
        {
          blMasterId: documentType === 'Master' ? document.id : null,
          blHouseId: documentType === 'House' ? document.id : null,
          status: conferenciaStatus,
        },
        tx,
      );

      await this.conferenciaCampoRepository.replaceCampos(
        conferencia.Id,
        comparison.fields
          .filter((field) => field.divergent)
          .map((field) => ({
            campoKey: field.campoKey,
            campoLabel: field.campoLabel,
            valorHouse: field.valorHouse,
            valorMaster: field.valorMaster,
            categoria: field.categoria,
          })),
        tx,
      );

      const workflow = await this.applyWorkflowAfterComparison(
        documentType,
        documentNumber,
        comparison.blVersion,
        comparison,
        tx,
      );

      return { conferencia, workflow };
    }, PRISMA_EXTENDED_TRANSACTION_OPTIONS);

    if (!comparison.hasDivergence) {
      await this.advanceAfterConferencia(
        documentType,
        documentNumber,
        comparison.blVersion,
      );
    }

    const workflowSummary = persisted.workflow
      ? mapWorkflowSummary({
          workflow: persisted.workflow,
          documentType,
          documentNumber,
          blVersion: comparison.blVersion,
        })
      : null;

    return mapConferenciaPersist(comparison, {
      conferenciaId: persisted.conferencia.Id,
      conferenciaStatus: persisted.conferencia.Status,
      workflow: workflowSummary,
    });
  }

  async getLatest(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<ConferenciaLatestDetailDto> {
    const document = await this.resolveDocumentPreferringAnyVersion(
      documentType,
      documentNumber,
    );

    const conferencia =
      documentType === 'Master'
        ? await this.conferenciaRepository.findLatestByMasterIdWithCampos(document.id)
        : await this.conferenciaRepository.findLatestByHouseIdWithCampos(document.id);

    if (!conferencia) {
      throw new NotFoundError(
        `Nenhuma conferência House × Master encontrada para ${documentType} ${documentNumber}`,
      );
    }

    const counterpart = await this.buildCounterpartForDocument(
      documentType,
      document.record,
      document.blVersion,
    );

    const workflowContext = await this.workflowService.getWorkflowByDocument(
      documentType,
      documentNumber,
      document.blVersion,
    );

    return mapConferenciaLatestDetail({
      conferencia,
      documentType,
      documentNumber,
      counterpart,
      workflow: workflowContext
        ? mapWorkflowSummary(workflowContext)
        : null,
    });
  }

  async getById(id: number): Promise<ConferenciaLatestDetailDto> {
    const conferencia = await this.conferenciaRepository.findByIdWithCampos(id);

    if (!conferencia) {
      throw new NotFoundError(`Conferência ${id} não encontrada`);
    }

    const context = await this.resolveDocumentContextFromConferencia(conferencia);
    const counterpart = await this.buildCounterpartFromIds(
      context.documentType,
      context.blMasterId,
      context.blHouseId,
      context.blVersion,
    );

    const workflowContext = await this.workflowService.getWorkflowByDocument(
      context.documentType,
      context.documentNumber,
      context.blVersion,
    );

    return mapConferenciaLatestDetail({
      conferencia,
      documentType: context.documentType,
      documentNumber: context.documentNumber,
      counterpart,
      workflow: workflowContext ? mapWorkflowSummary(workflowContext) : null,
    });
  }

  private async resolvePendingQueue(): Promise<ConferenciaQueueEntry[]> {
    await this.advanceMastersWhenHousesAreSettled();

    const candidates = await this.conferenciaRepository.findQueueCandidates();
    const pending: ConferenciaQueueEntry[] = [];

    for (const candidate of candidates) {
      try {
        const blVersion = this.parseBlVersion(candidate.blVersion);
        const pair = await this.resolveContainerPair(
          candidate.tipo,
          candidate.documentNumber,
          blVersion,
        );

        if (!pair.ready) {
          await this.markWaitingForPair(
            candidate.tipo,
            candidate.documentNumber,
            blVersion,
            pair.waitingMessage,
          );
          continue;
        }

        let latest = await this.tryGetLatestByBlId(candidate.tipo, candidate.id);
        const needsCompare = !latest || latest.counterpart.missingMaster;

        if (needsCompare) {
          await this.compareAndPersist(candidate.tipo, candidate.documentNumber, blVersion);
          latest = await this.tryGetLatestByBlId(candidate.tipo, candidate.id);
        }

        const pendingCampos =
          latest?.campos.filter(
            (campo) =>
              isConferenciaFieldKey(campo.campoKey) && isCampoPending(campo.status),
          ) ?? [];

        if (latest && pendingCampos.length > 0) {
          pending.push(candidate);
          continue;
        }

        const workflowContext = await this.workflowService.getWorkflowByDocument(
          candidate.tipo,
          candidate.documentNumber,
          latest?.counterpart.blVersion ?? BL_VERSION.FINAL,
        );

        if (workflowContext?.workflow.Status === CONFERENCIA_WORKFLOW_STATUS) {
          await this.advanceAfterConferencia(
            candidate.tipo,
            candidate.documentNumber,
            workflowContext.blVersion,
          );
        }
      } catch (error) {
        logger.warn('Falha ao avaliar BL na fila de conferência House × Master', {
          err: error,
          tipo: candidate.tipo,
          documentNumber: candidate.documentNumber,
        });
      }
    }

    return this.preferFinalPerHouseNumber(pending);
  }

  /**
   * Master só avança quando todos os Houses do mesmo container já saíram
   * da conferência (e não estão em Apoio Humano / não encontrado).
   */
  private async advanceMastersWhenHousesAreSettled(): Promise<void> {
    const masters = await this.conferenciaRepository.findMastersInConferencia();

    for (const master of masters) {
      try {
        await this.tryAdvanceMasterIfPairSettled(
          master.documentNumber,
          this.parseBlVersion(master.blVersion),
        );
      } catch (error) {
        logger.warn('Falha ao avaliar Master aguardando conferência House × Master', {
          err: error,
          documentNumber: master.documentNumber,
        });
      }
    }
  }

  private preferFinalPerHouseNumber(
    entries: ConferenciaQueueEntry[],
  ): ConferenciaQueueEntry[] {
    const byNumber = new Map<string, ConferenciaQueueEntry>();

    for (const entry of entries) {
      const existing = byNumber.get(entry.documentNumber);

      if (!existing) {
        byNumber.set(entry.documentNumber, entry);
        continue;
      }

      const entryIsFinal = entry.blVersion === BL_VERSION.FINAL;
      const existingIsFinal = existing.blVersion === BL_VERSION.FINAL;

      if (entryIsFinal && !existingIsFinal) {
        byNumber.set(entry.documentNumber, entry);
      }
    }

    return [...byNumber.values()].sort((a, b) => a.id - b.id);
  }

  private normalizeContainerNumber(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private isWorkflowReadyForPair(status: string | null | undefined): boolean {
    if (!status) {
      return false;
    }

    return !CONFERENCIA_PAIR_NOT_READY_STATUSES.has(status);
  }

  private async markWaitingForPair(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
    pendencia: string,
  ): Promise<void> {
    const data: UpdateWorkflowInput = {
      status: CONFERENCIA_WORKFLOW_STATUS,
      pendencia,
    };

    if (documentType === 'Master') {
      await this.workflowService.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        blVersion,
        data,
      );
      return;
    }

    await this.workflowService.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      blVersion,
      data,
    );
  }

  private async resolveContainerPair(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ): Promise<{
    ready: boolean;
    waitingMessage: string;
    master: BlMaster | null;
    houses: BlHouse[];
  }> {
    const document = await this.resolveDocument(documentType, documentNumber, blVersion);
    const record = document.record;
    const container = this.normalizeContainerNumber(record.ContainerNumber);

    if (!container) {
      return {
        ready: false,
        waitingMessage:
          'Aguardando Container Number para vincular House e Master na conferência',
        master: documentType === 'Master' ? (record as BlMaster) : null,
        houses: documentType === 'House' ? [record as BlHouse] : [],
      };
    }

    let master: BlMaster | null =
      documentType === 'Master' ? (record as BlMaster) : null;

    if (!master) {
      const house = record as BlHouse;
      if (house.BLMasterId) {
        master = (await this.masterRepository.findById(house.BLMasterId))?.master ?? null;
      }
    }

    if (!master) {
      master = await this.masterRepository.findByContainerNumberAndVersion(
        container,
        document.blVersion,
      );
    }

    const houses = await this.houseRepository.findByContainerNumberAndVersion(
      container,
      document.blVersion,
    );

    if (!master) {
      return {
        ready: false,
        waitingMessage:
          'Aguardando Master do mesmo container para conferência House × Master',
        master: null,
        houses,
      };
    }

    const housesForPair =
      houses.length > 0
        ? houses
        : documentType === 'House'
          ? [record as BlHouse]
          : await this.houseRepository.findByMasterId(master.Id);

    if (housesForPair.length === 0) {
      return {
        ready: false,
        waitingMessage:
          'Aguardando House do mesmo container para conferência House × Master',
        master,
        houses: [],
      };
    }

    const masterWorkflow = await this.workflowService.getWorkflowByDocument(
      'Master',
      master.MasterNumber,
      this.parseBlVersion(master.BlVersion),
    );

    if (!this.isWorkflowReadyForPair(masterWorkflow?.workflow.Status)) {
      return {
        ready: false,
        waitingMessage:
          'Aguardando Master concluir etapas anteriores para conferência House × Master',
        master,
        houses: housesForPair,
      };
    }

    if (documentType === 'House') {
      return {
        ready: true,
        waitingMessage: '',
        master,
        houses: [record as BlHouse],
      };
    }

    const readyHouses: BlHouse[] = [];
    for (const house of housesForPair) {
      const houseWorkflow = await this.workflowService.getWorkflowByDocument(
        'House',
        house.HouseNumber,
        this.parseBlVersion(house.BlVersion),
      );

      if (this.isWorkflowReadyForPair(houseWorkflow?.workflow.Status)) {
        readyHouses.push(house);
      }
    }

    if (readyHouses.length === 0) {
      return {
        ready: false,
        waitingMessage:
          'Aguardando House do mesmo container concluir etapas anteriores para conferência House × Master',
        master,
        houses: housesForPair,
      };
    }

    return {
      ready: true,
      waitingMessage: '',
      master,
      houses: readyHouses,
    };
  }

  private async tryAdvanceLinkedMasterAfterHouse(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<void> {
    const house = await this.houseRepository.findByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );

    if (!house) {
      return;
    }

    let master: BlMaster | null = null;
    if (house.BLMasterId) {
      master = (await this.masterRepository.findById(house.BLMasterId))?.master ?? null;
    }

    const container = this.normalizeContainerNumber(house.ContainerNumber);
    if (!master && container) {
      master = await this.masterRepository.findByContainerNumberAndVersion(
        container,
        blVersion,
      );
    }

    if (!master) {
      return;
    }

    await this.tryAdvanceMasterIfPairSettled(
      master.MasterNumber,
      this.parseBlVersion(master.BlVersion),
    );
  }

  private async tryAdvanceMasterIfPairSettled(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<void> {
    const master = await this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );

    if (!master) {
      return;
    }

    const workflow = await this.workflowService.getWorkflowByDocument(
      'Master',
      masterNumber,
      blVersion,
    );

    if (workflow?.workflow.Status !== CONFERENCIA_WORKFLOW_STATUS) {
      return;
    }

    const container = this.normalizeContainerNumber(master.ContainerNumber);
    const houses = container
      ? await this.houseRepository.findByContainerNumberAndVersion(container, blVersion)
      : await this.houseRepository.findByMasterId(master.Id);

    if (houses.length === 0) {
      return;
    }

    for (const house of houses) {
      const houseWorkflow = await this.workflowService.getWorkflowByDocument(
        'House',
        house.HouseNumber,
        this.parseBlVersion(house.BlVersion),
      );
      const status = houseWorkflow?.workflow.Status;

      if (
        !status
        || CONFERENCIA_PAIR_NOT_READY_STATUSES.has(status)
        || status === CONFERENCIA_WORKFLOW_STATUS
      ) {
        return;
      }
    }

    await this.advanceAfterConferencia('Master', masterNumber, blVersion);
  }

  private async tryGetLatestByBlId(
    documentType: BlDocumentType,
    blId: number,
  ): Promise<ConferenciaLatestDetailDto | null> {
    const persisted =
      documentType === 'Master'
        ? await this.conferenciaRepository.findLatestByMasterIdWithCampos(blId)
        : await this.conferenciaRepository.findLatestByHouseIdWithCampos(blId);

    if (!persisted) {
      return null;
    }

    try {
      return await this.getById(persisted.Id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }

      throw error;
    }
  }

  private async loadDocumentos(
    entry: ConferenciaQueueEntry,
    conferencia: ConferenciaLatestDetailDto,
  ): Promise<{
    master: ConferenciaDocumentoDto | null;
    house: ConferenciaDocumentoDto | null;
  }> {
    if (entry.tipo === 'Master') {
      const found = await this.masterRepository.findById(entry.id);
      const master = found
        ? buildConferenciaDocumento({
            tipo: 'Master',
            numeroBl: found.master.MasterNumber,
            fileName: found.master.FileName,
            blVersion: found.master.BlVersion,
          })
        : null;

      const houseNumber = conferencia.counterpart.houseNumbers[0];
      let house: ConferenciaDocumentoDto | null = null;

      if (houseNumber) {
        const houseRecord =
          (await this.houseRepository.findByHouseNumberAndVersion(
            houseNumber,
            conferencia.counterpart.blVersion,
          )) ??
          (await this.houseRepository.findByHouseNumberAndVersion(
            houseNumber,
            conferencia.counterpart.blVersion === BL_VERSION.FINAL
              ? BL_VERSION.DRAFT
              : BL_VERSION.FINAL,
          ));

        if (houseRecord) {
          house = buildConferenciaDocumento({
            tipo: 'House',
            numeroBl: houseRecord.HouseNumber,
            fileName: houseRecord.FileName,
            blVersion: houseRecord.BlVersion,
          });
        }
      }

      return { master, house };
    }

    const found = await this.houseRepository.findById(entry.id);
    const house = found
      ? buildConferenciaDocumento({
          tipo: 'House',
          numeroBl: found.house.HouseNumber,
          fileName: found.house.FileName,
          blVersion: found.house.BlVersion,
        })
      : null;

    let master: ConferenciaDocumentoDto | null = null;

    if (found?.master) {
      master = buildConferenciaDocumento({
        tipo: 'Master',
        numeroBl: found.master.MasterNumber,
        fileName: found.master.FileName,
        blVersion: found.master.BlVersion,
      });
    } else if (conferencia.counterpart.masterNumber) {
      const masterRecord =
        (await this.masterRepository.findByMasterNumberAndVersion(
          conferencia.counterpart.masterNumber,
          conferencia.counterpart.blVersion,
        )) ??
        (await this.masterRepository.findByMasterNumberAndVersion(
          conferencia.counterpart.masterNumber,
          conferencia.counterpart.blVersion === BL_VERSION.FINAL
            ? BL_VERSION.DRAFT
            : BL_VERSION.FINAL,
        ));

      if (masterRecord) {
        master = buildConferenciaDocumento({
          tipo: 'Master',
          numeroBl: masterRecord.MasterNumber,
          fileName: masterRecord.FileName,
          blVersion: masterRecord.BlVersion,
        });
      }
    }

    return { master, house };
  }

  async resolveConferencia(
    id: number,
    input: ResolveConferenciaRequestDto,
  ): Promise<ConferenciaResolveResponseDto> {
    const conferencia = await this.conferenciaRepository.findByIdWithCampos(id);

    if (!conferencia) {
      throw new NotFoundError(`Conferência ${id} não encontrada`);
    }

    const context = await this.resolveDocumentContextFromConferencia(conferencia);
    const pendingCampos = conferencia.campos.filter(
      (campo) => isConferenciaFieldKey(campo.CampoKey) && isCampoPending(campo.Status),
    );

    if (pendingCampos.length === 0) {
      throw new ConflictError('Não há campos pendentes para resolver');
    }

    this.validateManualResolutionInput(input.resolutionStrategy, {
      manualValues: input.manualValues,
    });

    const resolvedAt = this.parseResolvedAt(input.resolvedAt);
    const responsavel = this.resolveResponsavel(input);

    const persisted = await prisma.$transaction(async (tx) => {
      for (const campo of pendingCampos) {
        const manualValue = input.manualValues?.[campo.CampoKey];

        await this.applyCampoResolution({
          context,
          campo,
          strategy: input.resolutionStrategy,
          manualValue,
          observacao: input.observacao,
          responsavel,
          resolvedAt,
          tx,
        });
      }

      return this.persistResolutionWrites({
        conferenciaId: id,
        context,
        responsavel,
        resolvedAt,
        tx,
      });
    }, PRISMA_EXTENDED_TRANSACTION_OPTIONS);

    const workflow = await this.applyWorkflowAfterResolution(context, persisted);
    const result = await this.buildResolveResponse(id, context, { workflow });
    return this.advanceIfFullyResolved(result);
  }

  async resolveCampo(
    conferenciaId: number,
    campoKey: string,
    input: ResolveConferenciaCampoRequestDto,
  ): Promise<ConferenciaResolveResponseDto> {
    const decodedCampoKey = decodeURIComponent(campoKey);
    const conferencia =
      await this.conferenciaRepository.findByIdWithCampos(conferenciaId);

    if (!conferencia) {
      throw new NotFoundError(`Conferência ${conferenciaId} não encontrada`);
    }

    const campo = conferencia.campos.find((item) => item.CampoKey === decodedCampoKey);

    if (!campo) {
      throw new NotFoundError(
        `Campo ${decodedCampoKey} não encontrado na conferência ${conferenciaId}`,
      );
    }

    if (!isConferenciaFieldKey(decodedCampoKey)) {
      throw new BadRequestError(
        `Campo ${decodedCampoKey} não faz parte da conferência House × Master`,
      );
    }

    if (!isCampoPending(campo.Status)) {
      throw new ConflictError(`Campo ${decodedCampoKey} já foi resolvido`);
    }

    this.validateManualResolutionInput(input.resolutionStrategy, {
      manualValue: input.manualValue,
    });

    const context = await this.resolveDocumentContextFromConferencia(conferencia);
    const resolvedAt = this.parseResolvedAt(input.resolvedAt);
    const responsavel = this.resolveResponsavel(input);

    const persisted = await prisma.$transaction(async (tx) => {
      await this.applyCampoResolution({
        context,
        campo,
        strategy: input.resolutionStrategy,
        manualValue: input.manualValue,
        observacao: input.observacao,
        responsavel,
        resolvedAt,
        tx,
      });

      return this.persistResolutionWrites({
        conferenciaId,
        context,
        responsavel,
        resolvedAt,
        tx,
      });
    }, PRISMA_EXTENDED_TRANSACTION_OPTIONS);

    const workflow = await this.applyWorkflowAfterResolution(context, persisted);
    const result = await this.buildResolveResponse(conferenciaId, context, { workflow });
    return this.advanceIfFullyResolved(result);
  }

  private async buildComparison(
    documentType: BlDocumentType,
    documentNumber: string,
    preferredVersion: BlVersion,
  ): Promise<ConferenciaComparisonResult> {
    const document = await this.resolveDocumentPreferringVersion(
      documentType,
      documentNumber,
      preferredVersion,
    );

    const { counterpart, master, houses } = await this.loadComparisonSources(
      documentType,
      document.record,
      document.blVersion,
    );

    const masterValues =
      documentType === 'Master' ? (document.record as BlMaster) : master;
    const houseValues =
      documentType === 'House'
        ? (document.record as BlHouse)
        : houses.length > 0
          ? this.aggregateHouses(houses)
          : null;

    const fields: ConferenciaComparisonFieldDto[] = CONFERENCIA_FIELDS.map((field) => {
      const valorMaster = this.readSerializedValue(masterValues, field);
      const valorHouse = this.readSerializedValue(houseValues, field);
      const divergent = this.valuesDiverge(valorHouse, valorMaster, field.kind);

      return {
        campoKey: field.key,
        campoLabel: field.label,
        categoria: field.categoria,
        valorHouse,
        valorMaster,
        divergent,
      };
    });

    const changedFields = fields.filter((field) => field.divergent).map((field) => field.campoKey);
    const hasDivergence = changedFields.length > 0;
    const incomplete = counterpart.missingMaster || counterpart.missingHouse;

    let comparisonStatus = 'completo_sem_divergencia';
    if (incomplete && hasDivergence) {
      comparisonStatus = 'documento_incompleto';
    } else if (hasDivergence) {
      comparisonStatus = 'completo_com_divergencia';
    }

    const summary = incomplete
      ? hasDivergence
        ? `${changedFields.length} diferença(s) House × Master — documento incompleto (Master ou House ausente)`
        : 'Documento incompleto para conferência House × Master'
      : hasDivergence
        ? `${changedFields.length} diferença(s) de quantidade, peso bruto ou volume entre House e Master`
        : 'Quantidade, peso bruto e volume conferem entre House e Master';

    return {
      documentType,
      documentNumber,
      blVersion: document.blVersion,
      comparisonStatus,
      hasDivergence,
      divergenciaCount: changedFields.length,
      changedFields,
      summary,
      missingMaster: counterpart.missingMaster,
      missingHouse: counterpart.missingHouse,
      fields,
      counterpart,
    };
  }

  private async loadComparisonSources(
    documentType: BlDocumentType,
    record: BlMaster | BlHouse,
    blVersion: BlVersion,
  ): Promise<{
    counterpart: ConferenciaCounterpartDto;
    master: BlMaster | null;
    houses: BlHouse[];
  }> {
    if (documentType === 'Master') {
      const master = record as BlMaster;
      const houses = await this.houseRepository.findByMasterIdAndVersion(master.Id, blVersion);

      return {
        master,
        houses,
        counterpart: {
          masterNumber: master.MasterNumber,
          houseNumbers: houses.map((house) => house.HouseNumber),
          blVersion,
          houseAggregate: true,
          missingMaster: false,
          missingHouse: houses.length === 0,
        },
      };
    }

    const house = record as BlHouse;
    let master: BlMaster | null = null;

    if (house.BLMasterId) {
      const found = await this.masterRepository.findById(house.BLMasterId);
      master = found?.master ?? null;
    }

    if (!master && house.ContainerNumber) {
      master = await this.masterRepository.findByContainerNumberAndVersion(
        house.ContainerNumber,
        blVersion,
      );
    }

    return {
      master,
      houses: [house],
      counterpart: {
        masterNumber: master?.MasterNumber ?? null,
        houseNumbers: [house.HouseNumber],
        blVersion,
        houseAggregate: false,
        missingMaster: master == null,
        missingHouse: false,
      },
    };
  }

  private async buildCounterpartForDocument(
    documentType: BlDocumentType,
    record: BlMaster | BlHouse,
    blVersion: BlVersion,
  ): Promise<ConferenciaCounterpartDto> {
    const loaded = await this.loadComparisonSources(documentType, record, blVersion);
    return loaded.counterpart;
  }

  private async buildCounterpartFromIds(
    documentType: BlDocumentType,
    blMasterId: number | null,
    blHouseId: number | null,
    blVersion: BlVersion,
  ): Promise<ConferenciaCounterpartDto> {
    if (documentType === 'Master' && blMasterId != null) {
      const found = await this.masterRepository.findById(blMasterId);
      if (!found) {
        return emptyCounterpart(blVersion);
      }
      return this.buildCounterpartForDocument('Master', found.master, blVersion);
    }

    if (documentType === 'House' && blHouseId != null) {
      const found = await this.houseRepository.findById(blHouseId);
      if (!found) {
        return emptyCounterpart(blVersion);
      }
      return this.buildCounterpartForDocument('House', found.house, blVersion);
    }

    return emptyCounterpart(blVersion);
  }

  private aggregateHouses(houses: BlHouse[]): ScalarSource {
    const weights = houses
      .map((house) => this.toNumber(house.GrossWeight))
      .filter((value): value is number => value != null);
    const volumes = houses
      .map((house) => this.toNumber(house.VolumeMeasure))
      .filter((value): value is number => value != null);
    const quantities = houses
      .map((house) => house.PackingQuantity)
      .filter((value): value is number => value != null);

    return {
      GrossWeight: weights.length > 0 ? this.sum(weights) : null,
      VolumeMeasure: volumes.length > 0 ? this.sum(volumes) : null,
      PackingQuantity: quantities.length > 0 ? quantities.reduce((a, b) => a + b, 0) : null,
    };
  }

  private readSerializedValue(
    source: ScalarSource | null,
    field: ConferenciaComparableField,
  ): string {
    if (!source) {
      return '';
    }

    const raw = source[field.key];

    if (raw == null) {
      return '';
    }

    if (field.kind === 'decimal') {
      const num = this.toNumber(raw);
      return num == null ? '' : this.formatDecimal(num);
    }

    if (field.kind === 'int') {
      const num = this.toNumber(raw);
      return num == null ? '' : String(Math.round(num));
    }

    return String(raw).trim();
  }

  private valuesDiverge(
    houseValue: string,
    masterValue: string,
    kind: ConferenciaComparableField['kind'],
  ): boolean {
    const left = houseValue.trim();
    const right = masterValue.trim();

    if (!left && !right) {
      return false;
    }

    if (kind === 'int') {
      const leftNum = this.parseNumeric(left);
      const rightNum = this.parseNumeric(right);

      if (leftNum == null || rightNum == null) {
        return left !== right;
      }

      return Math.abs(leftNum - rightNum) > 0;
    }

    const leftNum = this.parseNumeric(left);
    const rightNum = this.parseNumeric(right);

    if (leftNum == null || rightNum == null) {
      return left !== right;
    }

    return Math.abs(leftNum - rightNum) > 0.001;
  }

  private async applyWorkflowAfterComparison(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
    comparison: ConferenciaComparisonResult,
    tx: Prisma.TransactionClient,
  ) {
    const workflowData: UpdateWorkflowInput = comparison.hasDivergence
      ? {
          status: CONFERENCIA_WORKFLOW_STATUS,
          pendencia: comparison.summary,
        }
      : {
          status: CONFERENCIA_WORKFLOW_STATUS,
          pendencia: comparison.summary,
        };

    if (documentType === 'Master') {
      return this.workflowService.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        blVersion,
        workflowData,
        tx,
      );
    }

    return this.workflowService.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      blVersion,
      workflowData,
      tx,
    );
  }

  private async advanceAfterConferencia(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ): Promise<void> {
    if (blVersion === BL_VERSION.DRAFT) {
      const data: UpdateWorkflowInput = {
        status: 'finalizado',
        pendencia: 'Conferência House × Master concluída — processo finalizado',
      };

      if (documentType === 'Master') {
        await this.workflowService.updateWorkflowByMasterNumberAndVersion(
          documentNumber,
          blVersion,
          data,
        );
      } else {
        await this.workflowService.updateWorkflowByHouseNumberAndVersion(
          documentNumber,
          blVersion,
          data,
        );
      }

      if (documentType === 'House') {
        await this.tryAdvanceLinkedMasterAfterHouse(documentNumber, blVersion);
      }
      return;
    }

    const data: UpdateWorkflowInput = {
      status: 'processando',
      pendencia: 'Conferência House × Master concluída — aguardando comparação GlobalSys',
    };

    if (documentType === 'Master') {
      await this.workflowService.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        blVersion,
        data,
      );
    } else {
      await this.workflowService.updateWorkflowByHouseNumberAndVersion(
        documentNumber,
        blVersion,
        data,
      );
    }

    await this.divergenciaService.triggerCanonicalComparison(documentType, documentNumber);

    if (documentType === 'House') {
      await this.tryAdvanceLinkedMasterAfterHouse(documentNumber, blVersion);
    }
  }

  private async applyCampoResolution(params: {
    context: ConferenciaResolveContext;
    campo: {
      Id: number;
      CampoKey: string;
      CampoLabel: string;
      ValorHouse: string;
      ValorMaster: string;
    };
    strategy: ConferenciaResolutionStrategy;
    manualValue?: string;
    observacao?: string;
    responsavel: { userId: number | null; nome: string };
    resolvedAt: Date;
    tx: Prisma.TransactionClient;
  }): Promise<void> {
    const acceptedValue = resolveCampoAcceptedValue({
      strategy: params.strategy,
      valorHouse: params.campo.ValorHouse,
      valorMaster: params.campo.ValorMaster,
      manualValue: params.manualValue,
    });

    if (!acceptedValue && params.strategy === 'manual') {
      throw new BadRequestError(
        `Valor manual obrigatório para o campo ${params.campo.CampoKey}`,
      );
    }

    const campoStatus = STRATEGY_TO_CAMPO_STATUS[params.strategy];

    if (params.context.blHouseId != null) {
      await applyConferenciaValueToDocument(
        {
          documentType: 'House',
          blId: params.context.blHouseId,
          campoKey: params.campo.CampoKey,
          value: acceptedValue,
        },
        params.tx,
      );
    }

    if (params.context.blMasterId != null) {
      await applyConferenciaValueToDocument(
        {
          documentType: 'Master',
          blId: params.context.blMasterId,
          campoKey: params.campo.CampoKey,
          value: acceptedValue,
        },
        params.tx,
      );
    }

    await this.conferenciaCampoRepository.updateResolution(
      params.campo.Id,
      {
        status: campoStatus,
        valorHouse: acceptedValue,
        valorMaster: acceptedValue,
        valorManual: params.strategy === 'manual' ? acceptedValue : null,
      },
      params.tx,
    );

    await this.historicoRepository.create(
      {
        blMasterId: params.context.blMasterId,
        blHouseId: params.context.blHouseId,
        userId: params.responsavel.userId,
        usuario: params.responsavel.nome,
        campo: buildHistoricoCampoRef(params.campo.CampoKey, params.campo.CampoLabel),
        valorAntes: `${params.campo.ValorHouse} / ${params.campo.ValorMaster}`,
        valorDepois: encodeHistoricoValorDepois(acceptedValue, params.observacao),
        acao: 'resolucao_conferencia_campo',
        createdAt: params.resolvedAt,
      },
      params.tx,
    );
  }

  private async persistResolutionWrites(params: {
    conferenciaId: number;
    context: ConferenciaResolveContext;
    responsavel: { userId: number | null; nome: string };
    resolvedAt: Date;
    tx: Prisma.TransactionClient;
  }): Promise<{
    pendingCount: number;
    resolvedCount: number;
    allResolved: boolean;
  }> {
    const refreshed = await this.conferenciaRepository.findByIdWithCampos(
      params.conferenciaId,
      params.tx,
    );

    if (!refreshed) {
      throw new NotFoundError(`Conferência ${params.conferenciaId} não encontrada`);
    }

    const pendingCount = refreshed.campos.filter(
      (campo) => isConferenciaFieldKey(campo.CampoKey) && isCampoPending(campo.Status),
    ).length;
    const resolvedCount =
      refreshed.campos.filter((campo) => isConferenciaFieldKey(campo.CampoKey)).length -
      pendingCount;
    const allResolved = pendingCount === 0;

    if (allResolved) {
      await this.conferenciaRepository.updateStatus(
        params.conferenciaId,
        CONFERENCIA_HEADER_STATUS.RESOLVIDO,
        params.tx,
        params.responsavel.userId,
        params.resolvedAt,
      );

      await this.historicoRepository.create(
        {
          blMasterId: params.context.blMasterId,
          blHouseId: params.context.blHouseId,
          userId: params.responsavel.userId,
          usuario: params.responsavel.nome,
          campo: `Conferência ${params.conferenciaId}`,
          valorAntes: CONFERENCIA_HEADER_STATUS.PENDENTE,
          valorDepois: CONFERENCIA_HEADER_STATUS.RESOLVIDO,
          acao: 'resolucao_conferencia',
          createdAt: params.resolvedAt,
        },
        params.tx,
      );
    }

    return { pendingCount, resolvedCount, allResolved };
  }

  private async applyWorkflowAfterResolution(
    context: ConferenciaResolveContext,
    persisted: { pendingCount: number; resolvedCount: number; allResolved: boolean },
  ) {
    const remainingPendencia = persisted.allResolved
      ? 'Conferência House × Master concluída'
      : `${persisted.pendingCount} diferença(s) pendente(s) na conferência House × Master (${persisted.resolvedCount} resolvida(s))`;

    const workflowData: UpdateWorkflowInput = {
      status: CONFERENCIA_WORKFLOW_STATUS,
      pendencia: remainingPendencia,
    };

    try {
      if (context.documentType === 'Master') {
        return await this.workflowService.updateWorkflowByMasterNumberAndVersion(
          context.documentNumber,
          context.blVersion,
          workflowData,
        );
      }

      return await this.workflowService.updateWorkflowByHouseNumberAndVersion(
        context.documentNumber,
        context.blVersion,
        workflowData,
      );
    } catch (error) {
      logger.warn('Valor gravado na conferência, mas falhou a atualização do workflow', {
        err: error,
        documentType: context.documentType,
        documentNumber: context.documentNumber,
      });

      const existing = await this.workflowService.getWorkflowByDocument(
        context.documentType,
        context.documentNumber,
        context.blVersion,
      );

      if (!existing) {
        throw error;
      }

      return existing.workflow;
    }
  }

  private async buildResolveResponse(
    conferenciaId: number,
    context: ConferenciaResolveContext,
    persisted: {
      workflow: Awaited<
        ReturnType<WorkflowService['updateWorkflowByHouseNumberAndVersion']>
      >;
    },
  ): Promise<ConferenciaResolveResponseDto> {
    const conferenciaAfterUpdate =
      await this.conferenciaRepository.findByIdWithCampos(conferenciaId);

    if (!conferenciaAfterUpdate) {
      throw new NotFoundError(`Conferência ${conferenciaId} não encontrada`);
    }

    const counterpart = await this.buildCounterpartFromIds(
      context.documentType,
      context.blMasterId,
      context.blHouseId,
      context.blVersion,
    );

    const workflowSummary: WorkflowSummaryDto = mapWorkflowSummary({
      workflow: persisted.workflow,
      documentType: context.documentType,
      documentNumber: context.documentNumber,
      blVersion: context.blVersion,
    });

    const conferenciaDetail = mapConferenciaLatestDetail({
      conferencia: conferenciaAfterUpdate,
      documentType: context.documentType,
      documentNumber: context.documentNumber,
      counterpart,
      workflow: workflowSummary,
    });

    const historicoByCampoKey = await this.loadHistoricoByCampoKeys(
      context.blMasterId,
      context.blHouseId,
      conferenciaAfterUpdate.campos.map((campo) => campo.CampoKey),
    );

    return mapConferenciaResolveResponse({
      conferencia: conferenciaAfterUpdate,
      conferenciaDetail,
      workflow: workflowSummary,
      historicoByCampoKey,
    });
  }

  private async advanceIfFullyResolved(
    result: ConferenciaResolveResponseDto,
  ): Promise<ConferenciaResolveResponseDto> {
    if (!result.summary.allResolved) {
      return result;
    }

    try {
      await this.advanceAfterConferencia(
        result.conferencia.documentType,
        result.conferencia.documentNumber,
        result.conferencia.counterpart.blVersion,
      );
    } catch (error) {
      logger.warn('Conferência resolvida, mas falhou o avanço do workflow', {
        err: error,
        conferenciaId: result.summary.conferenciaId,
      });
    }

    return result;
  }

  private async resolveDocumentContextFromConferencia(conferencia: {
    Id: number;
    BlMasterId: number | null;
    BlHouseId: number | null;
  }): Promise<ConferenciaResolveContext> {
    if (conferencia.BlHouseId != null) {
      const found = await this.houseRepository.findById(conferencia.BlHouseId);

      if (!found) {
        throw new NotFoundError(
          `House vinculado à conferência ${conferencia.Id} não encontrado`,
        );
      }

      const master =
        found.master ?? (await this.findLinkedMasterForHouse(found.house));

      return {
        documentType: 'House',
        documentNumber: found.house.HouseNumber,
        blVersion: this.parseBlVersion(found.house.BlVersion),
        blMasterId: master?.Id ?? null,
        blHouseId: found.house.Id,
        targetBlId: found.house.Id,
      };
    }

    if (conferencia.BlMasterId != null) {
      const found = await this.masterRepository.findById(conferencia.BlMasterId);

      if (!found) {
        throw new NotFoundError(
          `Master vinculado à conferência ${conferencia.Id} não encontrado`,
        );
      }

      const houses = await this.findLinkedHousesForMaster(found.master);

      return {
        documentType: 'Master',
        documentNumber: found.master.MasterNumber,
        blVersion: this.parseBlVersion(found.master.BlVersion),
        blMasterId: found.master.Id,
        blHouseId: houses[0]?.Id ?? null,
        targetBlId: found.master.Id,
      };
    }

    throw new NotFoundError(
      `Conferência ${conferencia.Id} não possui documento associado`,
    );
  }

  private async findLinkedMasterForHouse(house: BlHouse): Promise<BlMaster | null> {
    if (house.BLMasterId) {
      const found = await this.masterRepository.findById(house.BLMasterId);
      if (found?.master) {
        return found.master;
      }
    }

    const container = this.normalizeContainerNumber(house.ContainerNumber);
    if (!container) {
      return null;
    }

    return this.masterRepository.findByContainerNumberAndVersion(
      container,
      this.parseBlVersion(house.BlVersion),
    );
  }

  private async findLinkedHousesForMaster(master: BlMaster): Promise<BlHouse[]> {
    const linked = await this.houseRepository.findByMasterId(master.Id);
    if (linked.length > 0) {
      return linked;
    }

    const container = this.normalizeContainerNumber(master.ContainerNumber);
    if (!container) {
      return [];
    }

    return this.houseRepository.findByContainerNumberAndVersion(
      container,
      this.parseBlVersion(master.BlVersion),
    );
  }

  private async resolveDocument(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ): Promise<{ id: number; record: BlMaster | BlHouse; blVersion: BlVersion }> {
    return this.resolveDocumentPreferringVersion(documentType, documentNumber, blVersion);
  }

  private async resolveDocumentPreferringVersion(
    documentType: BlDocumentType,
    documentNumber: string,
    preferredVersion: BlVersion,
  ): Promise<{ id: number; record: BlMaster | BlHouse; blVersion: BlVersion }> {
    const preferred = await this.findVersionRecord(
      documentType,
      documentNumber,
      preferredVersion,
    );

    if (preferred) {
      return {
        id: preferred.Id,
        record: preferred,
        blVersion: preferredVersion,
      };
    }

    const fallbackVersion =
      preferredVersion === BL_VERSION.FINAL ? BL_VERSION.DRAFT : BL_VERSION.FINAL;
    const fallback = await this.findVersionRecord(
      documentType,
      documentNumber,
      fallbackVersion,
    );

    if (!fallback) {
      throw new NotFoundError(
        `${documentType} ${documentNumber} não encontrado (DRAFT/FINAL)`,
      );
    }

    return {
      id: fallback.Id,
      record: fallback,
      blVersion: fallbackVersion,
    };
  }

  private async resolveDocumentPreferringAnyVersion(
    documentType: BlDocumentType,
    documentNumber: string,
  ) {
    return this.resolveDocumentPreferringVersion(
      documentType,
      documentNumber,
      BL_VERSION.FINAL,
    );
  }

  private async findVersionRecord(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ) {
    if (documentType === 'Master') {
      return this.masterRepository.findByMasterNumberAndVersion(documentNumber, blVersion);
    }

    return this.houseRepository.findByHouseNumberAndVersion(documentNumber, blVersion);
  }

  private async loadHistoricoByCampoKeys(
    blMasterId: number | null,
    blHouseId: number | null,
    campoKeys: string[],
  ) {
    const map = new Map<string, Awaited<
      ReturnType<BlHistoricoAlteracaoRepository['findLatestCampoResolucao']>
    >>();

    await Promise.all(
      campoKeys.map(async (campoKey) => {
        const historico = await this.historicoRepository.findLatestCampoResolucao(
          blMasterId,
          blHouseId,
          campoKey,
          'resolucao_conferencia_campo',
        );
        map.set(campoKey, historico);
      }),
    );

    return map;
  }

  private validateManualResolutionInput(
    strategy: ConferenciaResolutionStrategy,
    values: { manualValue?: string; manualValues?: Record<string, string> },
  ) {
    if (strategy !== 'manual') {
      return;
    }

    if (values.manualValue != null && values.manualValue.trim().length > 0) {
      return;
    }

    if (values.manualValues && Object.keys(values.manualValues).length > 0) {
      return;
    }

    throw new BadRequestError(
      'Valor manual obrigatório quando resolutionStrategy é "manual"',
    );
  }

  private parseResolvedAt(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestError('resolvedAt inválido');
    }

    return parsed;
  }

  private resolveResponsavel(input: {
    responsavelUserId?: number;
    responsavelNome?: string;
  }) {
    return {
      userId: input.responsavelUserId ?? null,
      nome: input.responsavelNome?.trim() || 'Sistema',
    };
  }

  private parseBlVersion(value: string): BlVersion {
    if (!isBlVersion(value)) {
      throw new BadRequestError(`BlVersion inválido: ${value}`);
    }

    return value;
  }

  private toNumber(value: unknown): number | null {
    if (value == null) {
      return null;
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private parseNumeric(value: string): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatDecimal(value: number): string {
    return String(Number(value.toFixed(3)));
  }

  private sum(values: number[]): number {
    return values.reduce((acc, value) => acc + value, 0);
  }
}
