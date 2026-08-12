import type { BlHouse, BlMaster } from '@prisma/client';
import type { BlVersion } from '../constants/bl-version.constants.js';
import { isBlVersion } from '../constants/bl-version.constants.js';
import { NotFoundError } from '../errors/AppError.js';
import { prisma } from '../prisma/client.js';
import { BlConsultaGlobalSysRepository } from '../repositories/bl-consulta-globalsys.repository.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import { GlobalSysBlRepository } from '../repositories/globalsys-bl.repository.js';
import type { BlDocumentType, BlVersionPair } from '../types/bl-domain.types.js';
import type { GlobalSysConsultaResult } from '../types/globalsys.types.js';
import type { WorkflowService } from './workflow.service.js';
import type { DivergenciaService } from './divergencia.service.js';

export interface GlobalSysFinalPairContext<T> {
  documentType: BlDocumentType;
  documentNumber: string;
  draft: T | null;
  final: T | null;
  consultaGlobalSys?: GlobalSysConsultaResult | null;
}

export interface ExecuteGlobalSysConsultaResult {
  found: boolean;
  tentativaNumero: number;
  workflowStatus: string;
  detalhe: string;
  numeroBl: string;
}

/**
 * Camada de aplicação para integração GlobalSys.
 * Consulta externa e persistência do FINAL — integração completa na Sprint 3+.
 */
export class GlobalSysService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly consultaRepository: BlConsultaGlobalSysRepository,
    private readonly globalSysBlRepository: GlobalSysBlRepository,
    private readonly workflowService: WorkflowService,
    private readonly divergenciaService: DivergenciaService,
  ) {}

  async locateDraftMaster(masterNumber: string): Promise<BlMaster | null> {
    return this.masterRepository.findDraftByMasterNumber(masterNumber);
  }

  async locateFinalMaster(masterNumber: string): Promise<BlMaster | null> {
    return this.masterRepository.findFinalByMasterNumber(masterNumber);
  }

  async locateDraftHouse(houseNumber: string): Promise<BlHouse | null> {
    return this.houseRepository.findDraftByHouseNumber(houseNumber);
  }

  async locateFinalHouse(houseNumber: string): Promise<BlHouse | null> {
    return this.houseRepository.findFinalByHouseNumber(houseNumber);
  }

  async locateMasterPair(
    masterNumber: string,
  ): Promise<BlVersionPair<BlMaster>> {
    const [draft, finalVersion] = await Promise.all([
      this.locateDraftMaster(masterNumber),
      this.locateFinalMaster(masterNumber),
    ]);

    return { draft, final: finalVersion };
  }

  async locateHousePair(houseNumber: string): Promise<BlVersionPair<BlHouse>> {
    const [draft, finalVersion] = await Promise.all([
      this.locateDraftHouse(houseNumber),
      this.locateFinalHouse(houseNumber),
    ]);

    return { draft, final: finalVersion };
  }

  /**
   * Prepara contexto para quando o GlobalSys sobrescreve o DRAFT com FINAL.
   * A persistência do FINAL e sincronização virão na Sprint 3+.
   */
  async prepareFinalOverwriteContext(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<GlobalSysFinalPairContext<BlMaster | BlHouse>> {
    if (documentType === 'Master') {
      const pair = await this.locateMasterPair(documentNumber);

      if (!pair.draft && !pair.final) {
        throw new NotFoundError(`Master ${documentNumber} não encontrado`);
      }

      const consulta = await this.consultGlobalSys(documentNumber);

      return {
        documentType,
        documentNumber,
        draft: pair.draft,
        final: pair.final,
        consultaGlobalSys: consulta,
      };
    }

    const pair = await this.locateHousePair(documentNumber);

    if (!pair.draft && !pair.final) {
      throw new NotFoundError(`House ${documentNumber} não encontrado`);
    }

    const consulta = await this.consultGlobalSys(documentNumber);

    return {
      documentType,
      documentNumber,
      draft: pair.draft,
      final: pair.final,
      consultaGlobalSys: consulta,
    };
  }

  /**
   * Consulta TB_BL no GlobalSys (integração existente).
   * Registro em BlConsultaGlobalSys será acoplado na Sprint 3.
   */
  async consultGlobalSys(numeroBl: string): Promise<GlobalSysConsultaResult> {
    return this.globalSysBlRepository.findByNumeroBl(numeroBl);
  }

  /**
   * Consulta TB_BL, registra tentativa e atualiza workflow.
   * Operações de domínio usam MasterNumber/HouseNumber + BlVersion.
   */
  async executeConsulta(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
    responsavelUserId: number,
  ): Promise<ExecuteGlobalSysConsultaResult> {
    this.assertBlVersion(blVersion);

    const consulta = await this.consultGlobalSys(documentNumber);
    const detalhe = consulta.found
      ? 'BL localizado no GlobalSys'
      : 'Não encontrado no GlobalSys';
    const workflowStatus = consulta.found ? 'apoio_humano' : 'nao_encontrado';
    const pendencia = consulta.found
      ? 'Campos OCR aguardando revisão humana'
      : 'BL não localizado no GlobalSys';

    const workflowData = {
      status: workflowStatus,
      pendencia,
      responsavelUserId,
    };

    const record = await prisma.$transaction(async (tx) => {
      if (documentType === 'Master') {
        const master = await this.masterRepository.findByMasterNumberAndVersion(
          documentNumber,
          blVersion,
        );

        if (!master) {
          throw new NotFoundError(
            `Master ${documentNumber} (${blVersion}) não encontrado`,
          );
        }

        const created = await this.consultaRepository.record(
          {
            blMasterId: master.Id,
            sucesso: consulta.found,
            detalhe,
          },
          tx,
        );

        await this.workflowService.updateWorkflowByMasterNumberAndVersion(
          documentNumber,
          blVersion,
          workflowData,
          tx,
        );

        return created;
      }

      const house = await this.houseRepository.findByHouseNumberAndVersion(
        documentNumber,
        blVersion,
      );

      if (!house) {
        throw new NotFoundError(
          `House ${documentNumber} (${blVersion}) não encontrado`,
        );
      }

      const created = await this.consultaRepository.record(
        {
          blHouseId: house.Id,
          sucesso: consulta.found,
          detalhe,
        },
        tx,
      );

      await this.workflowService.updateWorkflowByHouseNumberAndVersion(
        documentNumber,
        blVersion,
        workflowData,
        tx,
      );

      return created;
    });

    return {
      found: consulta.found,
      tentativaNumero: record.TentativaNumero,
      workflowStatus,
      detalhe,
      numeroBl: documentNumber,
    };
  }

  async recordConsultaForMaster(
    masterNumber: string,
    blVersion: BlVersion,
    sucesso: boolean,
    detalhe?: string,
  ) {
    const master = await this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );

    if (!master) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado`,
      );
    }

    return this.consultaRepository.record({
      blMasterId: master.Id,
      sucesso,
      detalhe,
    });
  }

  async recordConsultaForHouse(
    houseNumber: string,
    blVersion: BlVersion,
    sucesso: boolean,
    detalhe?: string,
  ) {
    const house = await this.houseRepository.findByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );

    if (!house) {
      throw new NotFoundError(
        `House ${houseNumber} (${blVersion}) não encontrado`,
      );
    }

    return this.consultaRepository.record({
      blHouseId: house.Id,
      sucesso,
      detalhe,
    });
  }

  /**
   * FINAL recebido do GlobalSys — dispara comparação BL Final × GlobalSys.
   *
   * Pré-requisito: documento FINAL local já persistido.
   *
   * Fluxo:
   * 1. Valida existência do FINAL local (prepareFinalOverwriteContext)
   * 2. Monta BL Final consolidado (BlFinalService — FINAL + Apoio Humano)
   * 3. Consulta GlobalSys (TB_BL, TB_CARGA_BL, TB_BL_NCM)
   * 4. Compara BL Final × GlobalSys e persiste divergências
   * 5. Atualiza workflow conforme comparisonStatus
   *
   * Não sobrescreve FINAL a partir do GlobalSys.
   * Não executa comparação DRAFT × FINAL (use POST /divergencia/.../compare-and-persist).
   */
  async onFinalReceived(
    documentType: BlDocumentType,
    documentNumber: string,
  ) {
    const context = await this.prepareFinalOverwriteContext(
      documentType,
      documentNumber,
    );

    if (!context.final) {
      throw new NotFoundError(
        `FINAL de ${documentType} ${documentNumber} não encontrado`,
      );
    }

    const comparison =
      await this.divergenciaService.compareAndPersistBlFinalWithGlobalSys(
        documentType,
        documentNumber,
      );

    return {
      context,
      comparison,
      workflow: comparison.workflow,
      message: comparison.summary,
    };
  }

  private assertBlVersion(blVersion: string): asserts blVersion is BlVersion {
    if (!isBlVersion(blVersion)) {
      throw new NotFoundError(`BlVersion inválido: ${blVersion}`);
    }
  }
}
