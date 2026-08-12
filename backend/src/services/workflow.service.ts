import type { BlHouse, BlMaster, BlWorkflow, Prisma } from '@prisma/client';
import { BL_VERSION, isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import type { ComparisonResult } from '../domain/comparison/index.js';
import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import { BlWorkflowRepository } from '../repositories/bl-workflow.repository.js';
import type { GlobalSysXmlDispatchService } from './globalsys-xml-dispatch.service.js';
import type {
  BlDocumentType,
  BlFinalGlobalSysComparisonResult,
  BlWorkflowContext,
  DraftFinalComparisonResult,
  UpdateWorkflowInput,
} from '../types/bl-domain.types.js';
import { runAfterCommit } from '../utils/post-commit.js';

export class WorkflowService {
  constructor(
    private readonly workflowRepository: BlWorkflowRepository,
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly xmlDispatchService?: GlobalSysXmlDispatchService,
  ) {}

  async getWorkflowByMasterNumberAndVersion(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<BlWorkflowContext | null> {
    const master = await this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );

    if (!master) {
      return null;
    }

    const workflow = await this.workflowRepository.findByMasterId(master.Id);

    if (!workflow) {
      return null;
    }

    return {
      workflow,
      documentType: 'Master',
      documentNumber: masterNumber,
      blVersion,
    };
  }

  async getWorkflowByHouseNumberAndVersion(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<BlWorkflowContext | null> {
    const house = await this.houseRepository.findByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );

    if (!house) {
      return null;
    }

    const workflow = await this.workflowRepository.findByHouseId(house.Id);

    if (!workflow) {
      return null;
    }

    return {
      workflow,
      documentType: 'House',
      documentNumber: houseNumber,
      blVersion,
    };
  }

  async getWorkflowByDocument(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ): Promise<BlWorkflowContext | null> {
    const context =
      documentType === 'Master'
        ? await this.getWorkflowByMasterNumberAndVersion(documentNumber, blVersion)
        : await this.getWorkflowByHouseNumberAndVersion(documentNumber, blVersion);

    if (context || blVersion !== BL_VERSION.FINAL) {
      return context;
    }

    return documentType === 'Master'
      ? this.getWorkflowByMasterNumberAndVersion(documentNumber, BL_VERSION.DRAFT)
      : this.getWorkflowByHouseNumberAndVersion(documentNumber, BL_VERSION.DRAFT);
  }

  async updateWorkflowByMasterNumberAndVersion(
    masterNumber: string,
    blVersion: BlVersion,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const master = await this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );

    if (!master) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado`,
      );
    }

    const workflow = await this.workflowRepository.upsert(
      {
        tipoBl: 'Master',
        blMasterId: master.Id,
        documentNumber: masterNumber,
        data,
      },
      tx,
    );

    this.scheduleXmlDispatchIfFinalized('Master', masterNumber, blVersion, data, tx);

    return workflow;
  }

  async updateWorkflowByHouseNumberAndVersion(
    houseNumber: string,
    blVersion: BlVersion,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const house = await this.houseRepository.findByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );

    if (!house) {
      throw new NotFoundError(
        `House ${houseNumber} (${blVersion}) não encontrado`,
      );
    }

    const workflow = await this.workflowRepository.upsert(
      {
        tipoBl: 'House',
        blHouseId: house.Id,
        documentNumber: houseNumber,
        data,
      },
      tx,
    );

    this.scheduleXmlDispatchIfFinalized('House', houseNumber, blVersion, data, tx);

    return workflow;
  }

  async updateWorkflowForMasterDocument(
    master: BlMaster,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const blVersion = this.parseBlVersion(master.BlVersion);
    return this.updateWorkflowByMasterNumberAndVersion(
      master.MasterNumber,
      blVersion,
      data,
      tx,
    );
  }

  async updateWorkflowForHouseDocument(
    house: BlHouse,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const blVersion = this.parseBlVersion(house.BlVersion);
    return this.updateWorkflowByHouseNumberAndVersion(
      house.HouseNumber,
      blVersion,
      data,
      tx,
    );
  }

  async markFinalReceived(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<BlWorkflow> {
    if (documentType === 'Master') {
      const finalVersion = await this.masterRepository.findFinalByMasterNumber(
        documentNumber,
      );

      if (!finalVersion) {
        throw new NotFoundError(
          `FINAL do Master ${documentNumber} ainda não disponível`,
        );
      }

      return this.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        BL_VERSION.FINAL,
        {
          status: 'processando',
          pendencia: 'FINAL recebido — aguardando comparação DRAFT/FINAL',
        },
      );
    }

    const finalVersion = await this.houseRepository.findFinalByHouseNumber(
      documentNumber,
    );

    if (!finalVersion) {
      throw new NotFoundError(
        `FINAL do House ${documentNumber} ainda não disponível`,
      );
    }

    return this.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      BL_VERSION.FINAL,
      {
        status: 'processando',
        pendencia: 'FINAL recebido — aguardando comparação DRAFT/FINAL',
      },
    );
  }

  /**
   * Atualiza workflow conforme ComparisonResult do fluxo canônico (OCR × GlobalSys).
   */
  async applyCanonicalComparisonResult(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
    result: ComparisonResult,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const workflowData = this.buildWorkflowFromCanonicalComparison(result);

    if (documentType === 'Master') {
      return this.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        blVersion,
        workflowData,
        tx,
      );
    }

    return this.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      blVersion,
      workflowData,
      tx,
    );
  }

  /**
   * Atualiza workflow quando a comparação canônica falha antes de produzir ComparisonResult.
   */
  async applyCanonicalComparisonError(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
    message: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const isGlobalSysMissing = message.includes('GlobalSys');
    const workflowData: UpdateWorkflowInput = {
      status: isGlobalSysMissing ? 'nao_encontrado' : 'processando',
      pendencia: isGlobalSysMissing
        ? message
        : `Erro na comparação OCR × GlobalSys: ${message}`,
    };

    if (documentType === 'Master') {
      return this.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        blVersion,
        workflowData,
        tx,
      );
    }

    return this.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      blVersion,
      workflowData,
      tx,
    );
  }

  /**
   * Atualiza workflow do documento FINAL conforme resultado da comparação DRAFT/FINAL.
   */
  async applyComparisonResult(
    documentType: BlDocumentType,
    documentNumber: string,
    comparison: Pick<
      DraftFinalComparisonResult,
      'comparisonStatus' | 'hasDivergence' | 'divergenciaCount' | 'summary'
    >,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const workflowData = this.buildWorkflowFromComparison(comparison);

    if (documentType === 'Master') {
      return this.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        BL_VERSION.FINAL,
        workflowData,
        tx,
      );
    }

    return this.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      BL_VERSION.FINAL,
      workflowData,
      tx,
    );
  }

  /**
   * Atualiza workflow do documento FINAL conforme comparação BL Final × GlobalSys.
   */
  async applyGlobalSysComparisonResult(
    documentType: BlDocumentType,
    documentNumber: string,
    comparison: Pick<
      BlFinalGlobalSysComparisonResult,
      'comparisonStatus' | 'hasDivergence' | 'divergenciaCount' | 'summary'
    >,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const workflowData = this.buildWorkflowFromGlobalSysComparison(comparison);

    if (documentType === 'Master') {
      return this.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        BL_VERSION.FINAL,
        workflowData,
        tx,
      );
    }

    return this.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      BL_VERSION.FINAL,
      workflowData,
      tx,
    );
  }

  /**
   * Atualiza workflow após resolução de divergências (total ou parcial).
   */
  async applyDivergenciaResolutionResult(
    documentType: BlDocumentType,
    documentNumber: string,
    params: {
      allResolved: boolean;
      pendingCount: number;
      resolvedCount: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const workflowData: UpdateWorkflowInput = params.allResolved
      ? {
          status: 'finalizado',
          pendencia: 'Todas as divergências foram resolvidas',
        }
      : {
          status: 'divergencia',
          pendencia: `${params.pendingCount} divergência(s) pendente(s) de resolução (${params.resolvedCount} resolvida(s))`,
        };

    if (documentType === 'Master') {
      return this.updateWorkflowByMasterNumberAndVersion(
        documentNumber,
        BL_VERSION.FINAL,
        workflowData,
        tx,
      );
    }

    return this.updateWorkflowByHouseNumberAndVersion(
      documentNumber,
      BL_VERSION.FINAL,
      workflowData,
      tx,
    );
  }

  private buildWorkflowFromCanonicalComparison(
    result: ComparisonResult,
  ): UpdateWorkflowInput {
    if (result.equal || result.differenceCount === 0) {
      return {
        status: 'finalizado',
        pendencia: 'Comparação OCR × GlobalSys concluída sem divergências',
      };
    }

    return {
      status: 'divergencia',
      pendencia: `${result.differenceCount} divergência(s) entre OCR e GlobalSys — aguardando revisão`,
    };
  }

  private buildWorkflowFromGlobalSysComparison(
    comparison: Pick<
      BlFinalGlobalSysComparisonResult,
      'comparisonStatus' | 'hasDivergence' | 'divergenciaCount' | 'summary'
    >,
  ): UpdateWorkflowInput {
    switch (comparison.comparisonStatus) {
      case 'completo_sem_divergencia':
        return {
          status: 'finalizado',
          pendencia: comparison.summary,
        };
      case 'completo_com_divergencia':
        return {
          status: 'divergencia',
          pendencia: comparison.summary,
        };
      case 'documento_incompleto':
        return {
          status: 'processando',
          pendencia: comparison.summary,
        };
      case 'erro_comparacao':
        return {
          status: 'processando',
          pendencia: `Erro na comparação BL Final × GlobalSys: ${comparison.summary}`,
        };
      default:
        return {
          status: comparison.hasDivergence ? 'divergencia' : 'processando',
          pendencia: comparison.summary,
        };
    }
  }

  private buildWorkflowFromComparison(
    comparison: Pick<
      DraftFinalComparisonResult,
      'comparisonStatus' | 'hasDivergence' | 'divergenciaCount' | 'summary'
    >,
  ): UpdateWorkflowInput {
    switch (comparison.comparisonStatus) {
      case 'completo_sem_divergencia':
        return {
          status: 'finalizado',
          pendencia: comparison.summary,
        };
      case 'completo_com_divergencia':
        return {
          status: 'divergencia',
          pendencia: comparison.summary,
        };
      case 'documento_incompleto':
        return {
          status: 'processando',
          pendencia: comparison.summary,
        };
      case 'erro_comparacao':
        return {
          status: 'processando',
          pendencia: `Erro na comparação DRAFT/FINAL: ${comparison.summary}`,
        };
      default:
        return {
          status: comparison.hasDivergence ? 'divergencia' : 'processando',
          pendencia: comparison.summary,
        };
    }
  }

  assertValidTransition(currentStatus: string, nextStatus: string): void {
    const allowed: Record<string, string[]> = {
      apoio_humano: ['processando', 'finalizado', 'divergencia', 'nao_encontrado'],
      processando: ['finalizado', 'divergencia', 'nao_encontrado'],
      divergencia: ['processando', 'finalizado'],
      nao_encontrado: ['processando', 'apoio_humano'],
      finalizado: [],
    };

    const permitted = allowed[currentStatus] ?? [];

    if (!permitted.includes(nextStatus)) {
      throw new BadRequestError(
        `Transição de workflow inválida: ${currentStatus} → ${nextStatus}`,
      );
    }
  }

  private parseBlVersion(value: string): BlVersion {
    if (!isBlVersion(value)) {
      throw new BadRequestError(`BlVersion inválido: ${value}`);
    }

    return value;
  }

  private scheduleXmlDispatchIfFinalized(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): void {
    if (data.status !== 'finalizado') {
      return;
    }

    if (!this.xmlDispatchService) {
      return;
    }

    runAfterCommit(Boolean(tx), () =>
      this.xmlDispatchService!.handleWorkflowFinalized(
        documentType,
        documentNumber,
        blVersion,
      ),
    );
  }
}
