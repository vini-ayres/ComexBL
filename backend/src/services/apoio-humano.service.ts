import type { BlHouse, BlMaster } from '@prisma/client';
import { logger } from '../config/logger.js';
import { isBlVersion } from '../constants/bl-version.constants.js';
import { AppError, BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError.js';
import {
  hasCamposPendentes,
  mapHouseApoioHumano,
  mapHistoricoAlteracao,
  mapMasterApoioHumano,
  mergeCamposComRevisoes,
} from '../mappers/apoio-humano.mapper.js';
import { ApoioHumanoRepository } from '../repositories/apoio-humano.repository.js';
import { authRepository } from '../repositories/auth.repository.js';
import type {
  ApoioHumanoDetailDto,
  ApoioHumanoQueueEntry,
  SaveApoioHumanoRequestDto,
  SaveApoioHumanoResponseDto,
} from '../types/apoio-humano.types.js';
import type { UpdateWorkflowInput } from '../types/bl-domain.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import { getSkipTake } from '../utils/pagination.js';
import type { ConferenciaHouseMasterService } from './conferencia-house-master.service.js';
import type { GlobalSysConsultaService } from './globalsys-consulta.service.js';
import type { WorkflowService } from './workflow.service.js';

const APOIO_HUMANO_PENDENCIA = 'Campos OCR aguardando revisão humana';
const STATUSES_ELIGIBLE_FOR_APOIO_HUMANO = new Set(['processando']);

export class ApoioHumanoService {
  constructor(
    private readonly repository: ApoioHumanoRepository,
    private readonly workflowService: WorkflowService,
    private readonly conferenciaService: ConferenciaHouseMasterService,
    private readonly globalSysConsultaService: GlobalSysConsultaService,
  ) {}

  async getQueueItem(
    pagination: PaginationQuery,
  ): Promise<ApoioHumanoDetailDto> {
    const pendingEntries = await this.resolvePendingEntries();
    const total = pendingEntries.length;

    if (total === 0) {
      throw new NotFoundError('Nenhum BL pendente de apoio humano');
    }

    const { skip } = getSkipTake(pagination);
    const entry = pendingEntries[skip];

    if (!entry) {
      throw new NotFoundError(
        `BL não encontrado na página ${pagination.page} de ${Math.max(1, Math.ceil(total / pagination.pageSize))}`,
      );
    }

    const mapped = await this.loadEntryWithPersisted(entry);

    return {
      ...mapped,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
      },
    };
  }

  /**
   * Valida existência no GlobalSys e grava BL_Workflow.Status = apoio_humano
   * somente para BLs já localizados. Sem isso, o dashboard trata BL sem workflow como processando.
   */
  async syncPendingWorkflowStatus(): Promise<void> {
    await this.resolvePendingEntries();
  }

  async saveCampos(
    tipoParam: string,
    blId: number,
    payload: SaveApoioHumanoRequestDto,
    authUserId?: number,
  ): Promise<SaveApoioHumanoResponseDto> {
    const tipo = this.parseTipo(tipoParam);

    if (!payload.campos?.length) {
      throw new BadRequestError('Informe ao menos um campo para salvar');
    }

    for (const campo of payload.campos) {
      if (!campo.campoKey?.trim() || !campo.campoLabel?.trim()) {
        throw new BadRequestError('Cada campo deve conter campoKey e campoLabel');
      }

      if (!['pendente', 'confirmado', 'editado'].includes(campo.status)) {
        throw new BadRequestError(`Status inválido para o campo ${campo.campoKey}`);
      }
    }

    try {
      const user = authUserId
        ? await authRepository.findUserById(authUserId)
        : await this.repository.findTestUser();

      if (!user) {
        throw new UnauthorizedError('Usuário autenticado não encontrado.');
      }

      const pendentes = payload.campos.filter(
        (campo) => campo.status === 'pendente',
      ).length;
      const confianca = Math.min(
        ...payload.campos.map((campo) => campo.confianca),
      );

      const blExists =
        tipo === 'Master'
          ? await this.repository.findMasterById(blId)
          : await this.repository.findHouseById(blId);

      if (!blExists) {
        throw new NotFoundError(`BL ${tipo} ${blId} não encontrado`);
      }

      const localizadoNoGlobalSys =
        await this.repository.hasLatestSuccessfulConsulta(tipo, blId);

      if (!localizadoNoGlobalSys) {
        throw new BadRequestError(
          'BL ainda não foi localizado no GlobalSys. Conclua a etapa de BL não encontrado antes do Apoio Humano.',
        );
      }

      const saveResult = await this.repository.saveCampos({
        tipo,
        blId,
        campos: payload.campos,
        userId: user.Id,
        userDisplayName: user.DisplayName,
      });

      const workflowData = this.buildWorkflowAfterApoioHumano(
        tipo,
        blExists.BlVersion,
        pendentes,
        confianca,
        user.Id,
      );

      if (tipo === 'Master') {
        await this.workflowService.updateWorkflowForMasterDocument(
          blExists as BlMaster,
          workflowData,
        );
      } else {
        await this.workflowService.updateWorkflowForHouseDocument(
          blExists as BlHouse,
          workflowData,
        );
      }

      const documentNumber =
        tipo === 'Master'
          ? (blExists as BlMaster).MasterNumber
          : (blExists as BlHouse).HouseNumber;
      const blVersion = blExists.BlVersion;

      if (pendentes === 0) {
        await this.conferenciaService.continueAfterApoioHumano(
          tipo,
          documentNumber,
          blVersion,
        );
      }

      return {
        saved: saveResult.saved,
        completed: saveResult.completed,
        historico: saveResult.historico.map(mapHistoricoAlteracao),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('não encontrado')) {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }

  private async resolvePendingEntries(): Promise<ApoioHumanoQueueEntry[]> {
    await this.globalSysConsultaService.consultPendingDocuments();

    const candidates = await this.repository.findQueueCandidates();

    if (candidates.length === 0) {
      return [];
    }

    const masterIds = candidates
      .filter((entry) => entry.tipo === 'Master')
      .map((entry) => entry.id);
    const houseIds = candidates
      .filter((entry) => entry.tipo === 'House')
      .map((entry) => entry.id);

    const [masterRevisoes, houseRevisoes] = await Promise.all([
      this.repository.findRevisoesByMasterIds(masterIds),
      this.repository.findRevisoesByHouseIds(houseIds),
    ]);

    const revisoesByEntry = new Map<string, typeof masterRevisoes>();

    for (const revisao of [...masterRevisoes, ...houseRevisoes]) {
      const tipo = revisao.BlMasterId ? 'Master' : 'House';
      const id = revisao.BlMasterId ?? revisao.BlHouseId;
      if (!id) continue;

      const key = `${tipo}-${id}`;
      const current = revisoesByEntry.get(key) ?? [];
      current.push(revisao);
      revisoesByEntry.set(key, current);
    }

    const pendingEntries: ApoioHumanoQueueEntry[] = [];

    for (const entry of candidates) {
      const mapped = await this.loadEntry(entry);
      const revisoes = revisoesByEntry.get(`${entry.tipo}-${entry.id}`) ?? [];
      const campos = mergeCamposComRevisoes(mapped.campos, revisoes);

      if (hasCamposPendentes(campos)) {
        pendingEntries.push(entry);
      }
    }

    await this.persistApoioHumanoStatus(pendingEntries);

    return pendingEntries;
  }

  private async persistApoioHumanoStatus(
    entries: ApoioHumanoQueueEntry[],
  ): Promise<void> {
    for (const entry of entries) {
      try {
        await this.ensureApoioHumanoWorkflow(entry);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro desconhecido';

        logger.error(
          `Falha ao gravar status apoio_humano para ${entry.tipo} ${entry.id}: ${message}`,
        );
      }
    }
  }

  private async ensureApoioHumanoWorkflow(
    entry: ApoioHumanoQueueEntry,
  ): Promise<void> {
    const workflowData: UpdateWorkflowInput = {
      status: 'apoio_humano',
      pendencia: APOIO_HUMANO_PENDENCIA,
    };

    if (entry.tipo === 'Master') {
      const master = await this.repository.findMasterById(entry.id);

      if (!master) {
        return;
      }

      const currentStatus = await this.getMasterWorkflowStatus(
        master.MasterNumber,
        master.BlVersion,
      );

      if (!(await this.canEnterApoioHumano(entry.tipo, entry.id, currentStatus))) {
        return;
      }

      await this.workflowService.updateWorkflowForMasterDocument(
        master,
        workflowData,
      );
      return;
    }

    const house = await this.repository.findHouseById(entry.id);

    if (!house) {
      return;
    }

    const currentStatus = await this.getHouseWorkflowStatus(
      house.HouseNumber,
      house.BlVersion,
    );

    if (!(await this.canEnterApoioHumano(entry.tipo, entry.id, currentStatus))) {
      return;
    }

    await this.workflowService.updateWorkflowForHouseDocument(
      house,
      workflowData,
    );
  }

  private async canEnterApoioHumano(
    tipo: 'Master' | 'House',
    blId: number,
    currentStatus: string | null,
  ): Promise<boolean> {
    if (currentStatus == null) {
      return false;
    }

    if (!STATUSES_ELIGIBLE_FOR_APOIO_HUMANO.has(currentStatus)) {
      return false;
    }

    return this.repository.hasLatestSuccessfulConsulta(tipo, blId);
  }

  private async getMasterWorkflowStatus(
    masterNumber: string,
    blVersionValue: string,
  ): Promise<string | null> {
    if (!isBlVersion(blVersionValue)) {
      return null;
    }

    const context = await this.workflowService.getWorkflowByMasterNumberAndVersion(
      masterNumber,
      blVersionValue,
    );

    return context?.workflow.Status ?? null;
  }

  private async getHouseWorkflowStatus(
    houseNumber: string,
    blVersionValue: string,
  ): Promise<string | null> {
    if (!isBlVersion(blVersionValue)) {
      return null;
    }

    const context = await this.workflowService.getWorkflowByHouseNumberAndVersion(
      houseNumber,
      blVersionValue,
    );

    return context?.workflow.Status ?? null;
  }

  /**
   * House e Master entram na conferência após a revisão humana.
   * A comparação só começa quando os dois existirem no mesmo container.
   */
  private buildWorkflowAfterApoioHumano(
    _tipo: 'Master' | 'House',
    blVersion: string,
    pendentes: number,
    confianca: number,
    responsavelUserId: number,
  ): UpdateWorkflowInput {
    if (pendentes > 0) {
      return {
        status: 'apoio_humano',
        pendencia: `${pendentes} campo(s) aguardando revisão humana`,
        responsavelUserId,
        confianca,
      };
    }

    return {
      status: 'conferencia_house_master',
      pendencia: `Revisão humana concluída (${blVersion}) — aguardando par House/Master do mesmo container`,
      responsavelUserId,
      confianca,
    };
  }

  private parseTipo(value: string): 'Master' | 'House' {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'master') {
      return 'Master';
    }

    if (normalized === 'house') {
      return 'House';
    }

    throw new BadRequestError('Tipo inválido. Use master ou house');
  }

  private async loadEntryWithPersisted(entry: ApoioHumanoQueueEntry) {
    const mapped = await this.loadEntry(entry);
    const [revisoes, historicoRecords] = await Promise.all([
      this.repository.findRevisoesByBl(entry.tipo, entry.id),
      this.repository.findHistoricoByBl(entry.tipo, entry.id),
    ]);

    return {
      ...mapped,
      campos: mergeCamposComRevisoes(mapped.campos, revisoes),
      historico: historicoRecords.map(mapHistoricoAlteracao),
    };
  }

  private async loadEntry(entry: { tipo: 'Master' | 'House'; id: number }) {
    if (entry.tipo === 'Master') {
      const master = await this.repository.findMasterById(entry.id);

      if (!master) {
        throw new NotFoundError(`BL Master ${entry.id} não encontrado`);
      }

      return mapMasterApoioHumano(master);
    }

    const houseRelations = await this.repository.findHouseWithRelationsById(entry.id);

    if (!houseRelations) {
      throw new NotFoundError(`BL House ${entry.id} não encontrado`);
    }

    return mapHouseApoioHumano(houseRelations.house, {
      cargos: houseRelations.cargos,
      ncms: houseRelations.ncms,
    });
  }
}
