import type { BlHouse, BlHouseCargo, BlHouseNcm, BlMaster, Prisma } from '@prisma/client';
import type { BlVersion } from '../constants/bl-version.constants.js';
import { BL_VERSION } from '../constants/bl-version.constants.js';
import {
  BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
  BL_FINAL_MASTER_GLOBALSYS_FIELDS,
} from '../constants/globalsys-comparison.constants.js';
import {
  CARGO_COMPARABLE_FIELDS,
  HOUSE_SCALAR_FIELDS,
  MASTER_SCALAR_FIELDS,
  type ComparisonStatus,
  type DivergenciaCampoCategoria,
} from '../constants/bl-comparison.constants.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/AppError.js';
import {
  DIVERGENCIA_HEADER_STATUS,
  STRATEGY_TO_CAMPO_STATUS,
  isCampoPending,
  type DivergenciaResolutionStrategy,
} from '../constants/divergencia-resolution.constants.js';
import {
  buildHistoricoCampoRef,
  encodeHistoricoValorDepois,
  mapDivergenciaResolveResponse,
  resolveCampoAcceptedValue,
} from '../mappers/divergencia-resolution.mapper.js';
import { mapDivergenciaLatestDetail } from '../mappers/divergencia.mapper.js';
import { mapWorkflowSummary } from '../mappers/workflow.mapper.js';
import { BlHistoricoAlteracaoRepository } from '../repositories/bl-historico-alteracao.repository.js';
import type {
  ResolveDivergenciaCampoRequestDto,
  ResolveDivergenciaRequestDto,
} from '../types/divergencia-resolution.types.js';
import { comparisonEngine } from '../domain/comparison/index.js';
import type { ComparisonResult } from '../domain/comparison/index.js';
import { GlobalSysCanonicalMapper } from '../mappers/globalsys-canonical.mapper.js';
import { OcrCanonicalMapper } from '../mappers/ocr-canonical.mapper.js';
import {
  blFinalCargoToComparable,
  blFinalNcmsToComparable,
  flattenBlFinalHouse,
  mapGlobalSysCargoRecord,
  mapGlobalSysNcmRecord,
  readGlobalSysBlField,
} from '../mappers/globalsys-comparison.mapper.js';
import { prisma } from '../prisma/client.js';
import { BlDivergenciaCampoRepository } from '../repositories/bl-divergencia-campo.repository.js';
import { BlDivergenciaRepository } from '../repositories/bl-divergencia.repository.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import { GlobalSysBlRepository } from '../repositories/globalsys-bl.repository.js';
import { globalSysComparacaoRepository } from '../repositories/globalsys-comparacao.repository.js';
import { divergenciaRepository } from '../repositories/divergencia.repository.js';
import type {
  BlDocumentType,
  BlFinalGlobalSysCargoComparison,
  BlFinalGlobalSysComparisonPersistResult,
  BlFinalGlobalSysComparisonResult,
  BlFinalGlobalSysFieldComparison,
  BlFinalGlobalSysNcmComparison,
  CargoComparisonResult,
  DraftFinalComparisonPersistResult,
  DraftFinalComparisonResult,
  FieldComparisonResult,
  NcmComparisonResult,
  PersistDivergenciaCampoInput,
} from '../types/bl-domain.types.js';
import type { BlFinalHouseDto } from '../types/bl-final.types.js';
import type { GlobalSysBlRecord } from '../types/globalsys.types.js';
import type { GlobalSysComparableCargo, GlobalSysComparableNcm } from '../types/globalsys-comparison.types.js';
import {
  buildCargoLogicalKey,
  normalizeNcmCode,
  serializeComparisonValue,
  valuesDiverge,
} from '../utils/comparison.utils.js';
import {
  deriveComparisonStatusFromPersisted,
  inferComparisonKind,
  resolveComparisonOrigin,
} from '../utils/comparison-kind.utils.js';
import type { BlFinalService } from './bl-final.service.js';
import type { WorkflowService } from './workflow.service.js';

export class DivergenciaService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly divergenciaRepository: BlDivergenciaRepository,
    private readonly divergenciaCampoRepository: BlDivergenciaCampoRepository,
    private readonly historicoRepository: BlHistoricoAlteracaoRepository,
    private readonly workflowService: WorkflowService,
    private readonly blFinalService: BlFinalService,
    private readonly globalSysBlRepository: GlobalSysBlRepository,
  ) {}

  async compareMaster(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<ComparisonResult> {
    const master = await this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );

    if (!master) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado no OCR`,
      );
    }

    const globalSysAggregate =
      await globalSysComparacaoRepository.loadMasterAggregate(masterNumber);

    const localCanonical = OcrCanonicalMapper.fromMaster(master);
    const globalSysCanonical =
      GlobalSysCanonicalMapper.fromMaster(globalSysAggregate);

    if (!globalSysCanonical) {
      throw new NotFoundError(
        `Master ${masterNumber} não encontrado no GlobalSys`,
      );
    }

    const result = comparisonEngine.compareMaster(localCanonical, globalSysCanonical);

    await prisma.$transaction(async (tx) => {
      await divergenciaRepository.persistMasterComparison(master.Id, result, tx);
      await this.workflowService.applyCanonicalComparisonResult(
        'Master',
        masterNumber,
        blVersion,
        result,
        tx,
      );
    });

    return result;
  }

  async compareHouse(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<ComparisonResult> {
    const relations =
      await this.houseRepository.findWithRelationsByHouseNumberAndVersion(
        houseNumber,
        blVersion,
      );

    if (!relations) {
      throw new NotFoundError(
        `House ${houseNumber} (${blVersion}) não encontrado no OCR`,
      );
    }

    const globalSysAggregate =
      await globalSysComparacaoRepository.loadHouseAggregate(houseNumber);

    const localCanonical = OcrCanonicalMapper.fromHouse(
      relations.house,
      relations.cargos,
      relations.ncms,
    );

    const globalSysCanonical =
      GlobalSysCanonicalMapper.fromHouse(globalSysAggregate);

    if (!globalSysCanonical) {
      throw new NotFoundError(
        `House ${houseNumber} não encontrado no GlobalSys`,
      );
    }

    const result = comparisonEngine.compareHouse(localCanonical, globalSysCanonical);

    await prisma.$transaction(async (tx) => {
      await divergenciaRepository.persistHouseComparison(relations.house.Id, result, tx);
      await this.workflowService.applyCanonicalComparisonResult(
        'House',
        houseNumber,
        blVersion,
        result,
        tx,
      );
    });

    return result;
  }

  /**
   * Dispara comparação canônica OCR × GlobalSys após FINAL revisado.
   * Falhas atualizam o workflow sem propagar exceção ao caller.
   */
  async triggerCanonicalComparison(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<ComparisonResult | null> {
    try {
      if (documentType === 'Master') {
        return await this.compareMaster(documentNumber, BL_VERSION.FINAL);
      }

      return await this.compareHouse(documentNumber, BL_VERSION.FINAL);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido na comparação OCR × GlobalSys';

      await this.workflowService.applyCanonicalComparisonError(
        documentType,
        documentNumber,
        BL_VERSION.FINAL,
        message,
      );

      return null;
    }
  }

  async compareAndPersistMaster(
    masterNumber: string,
  ): Promise<DraftFinalComparisonPersistResult> {
    return this.compareAndPersist('Master', masterNumber);
  }

  async compareAndPersistHouse(
    houseNumber: string,
  ): Promise<DraftFinalComparisonPersistResult> {
    return this.compareAndPersist('House', houseNumber);
  }

  async compareAndPersist(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<DraftFinalComparisonPersistResult> {
    try {
      const comparison = await this.compareDraftAndFinal(
        documentType,
        documentNumber,
      );

      if (comparison.comparisonStatus === 'documento_incompleto') {
        const workflow = await this.workflowService.applyComparisonResult(
          documentType,
          documentNumber,
          comparison,
        );

        return {
          ...comparison,
          divergenciaId: null,
          divergencia: null,
          workflow,
        };
      }

      return await this.persistComparisonResult(comparison);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido na comparação';

      const failureComparison: DraftFinalComparisonResult = {
        documentType,
        documentNumber,
        comparisonStatus: 'erro_comparacao',
        fieldComparisons: [],
        cargoComparisons: [],
        ncmComparisons: [],
        hasDivergence: false,
        divergenciaCount: 0,
        changedFields: [],
        summary: message,
        missingDraft: false,
        missingFinal: false,
      };

      const workflow = await this.workflowService.applyComparisonResult(
        documentType,
        documentNumber,
        failureComparison,
      );

      return {
        ...failureComparison,
        divergenciaId: null,
        divergencia: null,
        workflow,
      };
    }
  }

  async compareDraftAndFinalMaster(
    masterNumber: string,
  ): Promise<DraftFinalComparisonResult> {
    return this.compareDraftAndFinal('Master', masterNumber);
  }

  async compareDraftAndFinalHouse(
    houseNumber: string,
  ): Promise<DraftFinalComparisonResult> {
    return this.compareDraftAndFinal('House', houseNumber);
  }

  async compareDraftAndFinal(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<DraftFinalComparisonResult> {
    if (documentType === 'Master') {
      return this.runDraftAndFinalMasterComparison(documentNumber);
    }

    return this.runDraftAndFinalHouseComparison(documentNumber);
  }

  compareFields<T extends Record<string, unknown>>(
    draft: T,
    finalVersion: T,
    fields: readonly { key: keyof T & string; label: string }[],
    keyPrefix = '',
  ): FieldComparisonResult[] {
    return fields.map(({ key, label }) => {
      const draftValue = serializeComparisonValue(draft[key]);
      const finalValue = serializeComparisonValue(finalVersion[key]);
      const campoKey = keyPrefix ? `${keyPrefix}.${key}` : key;

      return {
        campoKey,
        campoLabel: keyPrefix ? `${keyPrefix} — ${label}` : label,
        draftValue,
        finalValue,
        divergent: valuesDiverge(draftValue, finalValue),
      };
    });
  }

  compareCargo(
    draftCargos: BlHouseCargo[],
    finalCargos: BlHouseCargo[],
    keyPrefix = '',
  ): CargoComparisonResult[] {
    const draftMap = new Map<string, BlHouseCargo>();
    const finalMap = new Map<string, BlHouseCargo>();

    for (const cargo of draftCargos) {
      draftMap.set(buildCargoLogicalKey(cargo), cargo);
    }

    for (const cargo of finalCargos) {
      finalMap.set(buildCargoLogicalKey(cargo), cargo);
    }

    const allKeys = new Set([...draftMap.keys(), ...finalMap.keys()]);
    const comparisons: CargoComparisonResult[] = [];

    for (const logicalKey of allKeys) {
      const draft = draftMap.get(logicalKey);
      const finalCargo = finalMap.get(logicalKey);
      const prefix = keyPrefix ? `${keyPrefix}.` : '';

      for (const field of CARGO_COMPARABLE_FIELDS) {
        const draftValue = draft ? serializeComparisonValue(draft[field]) : null;
        const finalValue = finalCargo
          ? serializeComparisonValue(finalCargo[field])
          : null;

        comparisons.push({
          logicalKey,
          campoKey: `${prefix}cargo.${logicalKey}.${field}`,
          draftValue,
          finalValue,
          divergent: valuesDiverge(draftValue, finalValue),
        });
      }

      if (!draft || !finalCargo) {
        comparisons.push({
          logicalKey,
          campoKey: `${prefix}cargo.${logicalKey}.__presence__`,
          draftValue: draft ? 'presente' : null,
          finalValue: finalCargo ? 'presente' : null,
          divergent: true,
        });
      }
    }

    return comparisons;
  }

  compareNcm(
    draftNcms: BlHouseNcm[],
    finalNcms: BlHouseNcm[],
    keyPrefix = '',
  ): NcmComparisonResult[] {
    const draftCodes = new Set(
      draftNcms.map((item) => normalizeNcmCode(item.NcmCode)),
    );
    const finalCodes = new Set(
      finalNcms.map((item) => normalizeNcmCode(item.NcmCode)),
    );
    const allCodes = new Set([...draftCodes, ...finalCodes]);
    const prefix = keyPrefix ? `${keyPrefix}.` : '';

    return [...allCodes].sort().map((ncmCode) => {
      const inDraft = draftCodes.has(ncmCode);
      const inFinal = finalCodes.has(ncmCode);
      const presence = inDraft && inFinal
        ? 'both'
        : inDraft
          ? 'draft_only'
          : 'final_only';

      return {
        ncmCode,
        campoKey: `${prefix}ncm.${ncmCode}`,
        presence,
        divergent: presence !== 'both',
      };
    });
  }

  private async runDraftAndFinalMasterComparison(
    masterNumber: string,
  ): Promise<DraftFinalComparisonResult> {
    const [draft, finalVersion] = await Promise.all([
      this.masterRepository.findWithHousesByMasterNumberAndVersion(
        masterNumber,
        BL_VERSION.DRAFT,
      ),
      this.masterRepository.findWithHousesByMasterNumberAndVersion(
        masterNumber,
        BL_VERSION.FINAL,
      ),
    ]);

    const missingDraft = draft == null;
    const missingFinal = finalVersion == null;

    if (missingDraft || missingFinal) {
      return this.buildIncompleteResult(
        'Master',
        masterNumber,
        missingDraft,
        missingFinal,
      );
    }

    const fieldComparisons = this.compareFields(
      draft.master,
      finalVersion.master,
      MASTER_SCALAR_FIELDS,
    );

    const houseComparisons = await this.compareMasterHouses(
      draft.houses,
      finalVersion.houses,
    );

    fieldComparisons.push(...houseComparisons.fieldComparisons);

    return this.buildComparisonResult(
      'Master',
      masterNumber,
      fieldComparisons,
      houseComparisons.cargoComparisons,
      houseComparisons.ncmComparisons,
    );
  }

  private async runDraftAndFinalHouseComparison(
    houseNumber: string,
  ): Promise<DraftFinalComparisonResult> {
    const [draft, finalVersion] = await Promise.all([
      this.houseRepository.findWithRelationsByHouseNumberAndVersion(
        houseNumber,
        BL_VERSION.DRAFT,
      ),
      this.houseRepository.findWithRelationsByHouseNumberAndVersion(
        houseNumber,
        BL_VERSION.FINAL,
      ),
    ]);

    const missingDraft = draft == null;
    const missingFinal = finalVersion == null;

    if (missingDraft || missingFinal) {
      return this.buildIncompleteResult(
        'House',
        houseNumber,
        missingDraft,
        missingFinal,
      );
    }

    const fieldComparisons = this.compareFields(
      draft.house,
      finalVersion.house,
      HOUSE_SCALAR_FIELDS,
    );
    const cargoComparisons = this.compareCargo(draft.cargos, finalVersion.cargos);
    const ncmComparisons = this.compareNcm(draft.ncms, finalVersion.ncms);

    return this.buildComparisonResult(
      'House',
      houseNumber,
      fieldComparisons,
      cargoComparisons,
      ncmComparisons,
    );
  }

  private async compareMasterHouses(
    draftHouses: BlHouse[],
    finalHouses: BlHouse[],
  ): Promise<{
    fieldComparisons: FieldComparisonResult[];
    cargoComparisons: CargoComparisonResult[];
    ncmComparisons: NcmComparisonResult[];
  }> {
    const draftByNumber = new Map(draftHouses.map((house) => [house.HouseNumber, house]));
    const finalByNumber = new Map(finalHouses.map((house) => [house.HouseNumber, house]));
    const allNumbers = new Set([...draftByNumber.keys(), ...finalByNumber.keys()]);

    const fieldComparisons: FieldComparisonResult[] = [];
    const cargoComparisons: CargoComparisonResult[] = [];
    const ncmComparisons: NcmComparisonResult[] = [];

    for (const houseNumber of allNumbers) {
      const prefix = `house.${houseNumber}`;
      const draftHouse = draftByNumber.get(houseNumber);
      const finalHouse = finalByNumber.get(houseNumber);

      if (!draftHouse || !finalHouse) {
        fieldComparisons.push({
          campoKey: `${prefix}.__presence__`,
          campoLabel: `House ${houseNumber} — presença`,
          draftValue: draftHouse ? 'presente' : null,
          finalValue: finalHouse ? 'presente' : null,
          divergent: true,
        });
        continue;
      }

      fieldComparisons.push(
        ...this.compareFields(draftHouse, finalHouse, HOUSE_SCALAR_FIELDS, prefix),
      );

      const [draftRelations, finalRelations] = await Promise.all([
        this.houseRepository.findWithRelationsByHouseNumberAndVersion(
          houseNumber,
          BL_VERSION.DRAFT,
        ),
        this.houseRepository.findWithRelationsByHouseNumberAndVersion(
          houseNumber,
          BL_VERSION.FINAL,
        ),
      ]);

      if (draftRelations && finalRelations) {
        cargoComparisons.push(
          ...this.compareCargo(
            draftRelations.cargos,
            finalRelations.cargos,
            prefix,
          ),
        );
        ncmComparisons.push(
          ...this.compareNcm(draftRelations.ncms, finalRelations.ncms, prefix),
        );
      }
    }

    return { fieldComparisons, cargoComparisons, ncmComparisons };
  }

  private buildComparisonResult(
    documentType: BlDocumentType,
    documentNumber: string,
    fieldComparisons: FieldComparisonResult[],
    cargoComparisons: CargoComparisonResult[],
    ncmComparisons: NcmComparisonResult[],
  ): DraftFinalComparisonResult {
    const divergentFields = fieldComparisons.filter((item) => item.divergent);
    const divergentCargo = cargoComparisons.filter((item) => item.divergent);
    const divergentNcm = ncmComparisons.filter((item) => item.divergent);
    const divergenciaCount =
      divergentFields.length + divergentCargo.length + divergentNcm.length;
    const hasDivergence = divergenciaCount > 0;
    const comparisonStatus: ComparisonStatus = hasDivergence
      ? 'completo_com_divergencia'
      : 'completo_sem_divergencia';

    const changedFields = [
      ...divergentFields.map((item) => item.campoKey),
      ...divergentCargo.map((item) => item.campoKey),
      ...divergentNcm.map((item) => item.campoKey),
    ];

    return {
      documentType,
      documentNumber,
      comparisonStatus,
      fieldComparisons,
      cargoComparisons,
      ncmComparisons,
      hasDivergence,
      divergenciaCount,
      changedFields,
      summary: hasDivergence
        ? `${divergenciaCount} divergência(s) entre DRAFT e FINAL`
        : 'Comparação DRAFT/FINAL concluída sem divergências',
      missingDraft: false,
      missingFinal: false,
    };
  }

  private buildIncompleteResult(
    documentType: BlDocumentType,
    documentNumber: string,
    missingDraft: boolean,
    missingFinal: boolean,
  ): DraftFinalComparisonResult {
    const parts: string[] = [];
    if (missingDraft) parts.push('DRAFT ausente');
    if (missingFinal) parts.push('FINAL ausente');

    return {
      documentType,
      documentNumber,
      comparisonStatus: 'documento_incompleto',
      fieldComparisons: [],
      cargoComparisons: [],
      ncmComparisons: [],
      hasDivergence: false,
      divergenciaCount: 0,
      changedFields: [],
      summary: `Par DRAFT/FINAL incompleto: ${parts.join(' e ')}`,
      missingDraft,
      missingFinal,
    };
  }

  private async persistComparisonResult(
    comparison: DraftFinalComparisonResult,
  ): Promise<DraftFinalComparisonPersistResult> {
    const finalRecord = await this.resolveFinalRecord(
      comparison.documentType,
      comparison.documentNumber,
    );

    if (!finalRecord) {
      throw new NotFoundError(
        `FINAL de ${comparison.documentType} ${comparison.documentNumber} não encontrado`,
      );
    }

    const campos = this.mapComparisonToPersistedCampos(comparison);
    const divergenciaStatus = comparison.hasDivergence ? 'pendente' : 'sem_divergencia';

    const result = await prisma.$transaction(async (tx) => {
      const divergencia = await this.divergenciaRepository.upsert(
        {
          blMasterId:
            comparison.documentType === 'Master' ? finalRecord.Id : null,
          blHouseId:
            comparison.documentType === 'House' ? finalRecord.Id : null,
          status: divergenciaStatus,
        },
        tx,
      );

      await this.divergenciaCampoRepository.replaceCampos(
        divergencia.Id,
        campos,
        tx,
      );

      const workflow = await this.workflowService.applyComparisonResult(
        comparison.documentType,
        comparison.documentNumber,
        comparison,
        tx,
      );

      return { divergencia, workflow };
    });

    return {
      ...comparison,
      divergenciaId: result.divergencia.Id,
      divergencia: result.divergencia,
      workflow: result.workflow,
    };
  }

  private async resolveFinalRecord(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<BlMaster | BlHouse | null> {
    if (documentType === 'Master') {
      return this.masterRepository.findFinalByMasterNumber(documentNumber);
    }

    return this.houseRepository.findFinalByHouseNumber(documentNumber);
  }

  private mapComparisonToPersistedCampos(
    comparison: DraftFinalComparisonResult,
  ): PersistDivergenciaCampoInput[] {
    const campos: PersistDivergenciaCampoInput[] = [];

    for (const field of comparison.fieldComparisons.filter((item) => item.divergent)) {
      campos.push({
        campoKey: field.campoKey,
        campoLabel: field.campoLabel,
        valorDraft: field.draftValue ?? '',
        valorFinal: field.finalValue ?? '',
        categoria: this.resolveFieldCategoria(field.campoKey),
      });
    }

    for (const cargo of comparison.cargoComparisons.filter((item) => item.divergent)) {
      campos.push({
        campoKey: cargo.campoKey,
        campoLabel: cargo.campoKey,
        valorDraft: cargo.draftValue ?? '',
        valorFinal: cargo.finalValue ?? '',
        categoria: 'cargo',
      });
    }

    for (const ncm of comparison.ncmComparisons.filter((item) => item.divergent)) {
      campos.push({
        campoKey: ncm.campoKey,
        campoLabel: `NCM ${ncm.ncmCode}`,
        valorDraft: ncm.presence === 'final_only' ? '' : ncm.ncmCode,
        valorFinal: ncm.presence === 'draft_only' ? '' : ncm.ncmCode,
        categoria: 'ncm',
      });
    }

    return campos;
  }

  private resolveFieldCategoria(campoKey: string): DivergenciaCampoCategoria {
    if (campoKey.startsWith('house.') || campoKey.includes('.house.')) {
      return 'house';
    }

    if (campoKey.startsWith('cargo.') || campoKey.includes('.cargo.')) {
      return 'cargo';
    }

    if (campoKey.startsWith('ncm.') || campoKey.includes('.ncm.')) {
      return 'ncm';
    }

    return 'master';
  }

  async compareBlFinalWithGlobalSys(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<BlFinalGlobalSysComparisonResult> {
    if (documentType === 'Master') {
      return this.compareBlFinalWithGlobalSysMaster(documentNumber);
    }

    return this.compareBlFinalWithGlobalSysHouse(documentNumber);
  }

  async compareAndPersistBlFinalWithGlobalSys(
    documentType: BlDocumentType,
    documentNumber: string,
  ): Promise<BlFinalGlobalSysComparisonPersistResult> {
    try {
      const comparison = await this.compareBlFinalWithGlobalSys(
        documentType,
        documentNumber,
      );

      if (comparison.comparisonStatus === 'documento_incompleto') {
        const workflow = await this.workflowService.applyGlobalSysComparisonResult(
          documentType,
          documentNumber,
          comparison,
        );

        return {
          ...comparison,
          divergenciaId: null,
          divergencia: null,
          workflow,
        };
      }

      return await this.persistBlFinalGlobalSysComparison(comparison);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido na comparação BL Final × GlobalSys';

      const failureComparison: BlFinalGlobalSysComparisonResult = {
        documentType,
        documentNumber,
        comparisonStatus: 'erro_comparacao',
        fieldComparisons: [],
        cargoComparisons: [],
        ncmComparisons: [],
        hasDivergence: false,
        divergenciaCount: 0,
        changedFields: [],
        summary: message,
        missingBlFinal: false,
        missingGlobalSys: false,
      };

      const workflow = await this.workflowService.applyGlobalSysComparisonResult(
        documentType,
        documentNumber,
        failureComparison,
      );

      return {
        ...failureComparison,
        divergenciaId: null,
        divergencia: null,
        workflow,
      };
    }
  }

  compareBlFinalGlobalSysFields(
    blFinal: Record<string, string | null | undefined>,
    globalSysRecord: GlobalSysBlRecord | null,
    fields: readonly {
      blFinalKey: string;
      globalSysColumn: string;
      label: string;
    }[],
    keyPrefix = '',
  ): BlFinalGlobalSysFieldComparison[] {
    return fields.map(({ blFinalKey, globalSysColumn, label }) => {
      const blFinalValue = serializeComparisonValue(blFinal[blFinalKey]);
      const globalSysValue = readGlobalSysBlField(globalSysRecord, globalSysColumn);
      const campoKey = keyPrefix ? `${keyPrefix}.${blFinalKey}` : blFinalKey;

      return {
        campoKey,
        campoLabel: keyPrefix ? `${keyPrefix} — ${label}` : label,
        blFinalValue,
        globalSysValue,
        divergent: valuesDiverge(blFinalValue, globalSysValue),
      };
    });
  }

  compareBlFinalGlobalSysCargo(
    blFinalCargos: GlobalSysComparableCargo[],
    globalSysCargos: GlobalSysComparableCargo[],
    keyPrefix = '',
  ): BlFinalGlobalSysCargoComparison[] {
    const draftMap = new Map<string, GlobalSysComparableCargo>();
    const globalSysMap = new Map<string, GlobalSysComparableCargo>();

    for (const cargo of blFinalCargos) {
      draftMap.set(buildCargoLogicalKey(cargo), cargo);
    }

    for (const cargo of globalSysCargos) {
      globalSysMap.set(buildCargoLogicalKey(cargo), cargo);
    }

    const allKeys = new Set([...draftMap.keys(), ...globalSysMap.keys()]);
    const comparisons: BlFinalGlobalSysCargoComparison[] = [];

    for (const logicalKey of allKeys) {
      const blFinal = draftMap.get(logicalKey);
      const globalSys = globalSysMap.get(logicalKey);
      const prefix = keyPrefix ? `${keyPrefix}.` : '';

      for (const field of CARGO_COMPARABLE_FIELDS) {
        const blFinalValue = blFinal
          ? serializeComparisonValue(blFinal[field])
          : null;
        const globalSysValue = globalSys
          ? serializeComparisonValue(globalSys[field])
          : null;

        comparisons.push({
          logicalKey,
          campoKey: `${prefix}cargo.${logicalKey}.${field}`,
          blFinalValue,
          globalSysValue,
          divergent: valuesDiverge(blFinalValue, globalSysValue),
        });
      }

      if (!blFinal || !globalSys) {
        comparisons.push({
          logicalKey,
          campoKey: `${prefix}cargo.${logicalKey}.__presence__`,
          blFinalValue: blFinal ? 'presente' : null,
          globalSysValue: globalSys ? 'presente' : null,
          divergent: true,
        });
      }
    }

    return comparisons;
  }

  compareBlFinalGlobalSysNcm(
    blFinalNcms: GlobalSysComparableNcm[],
    globalSysNcms: GlobalSysComparableNcm[],
    keyPrefix = '',
  ): BlFinalGlobalSysNcmComparison[] {
    const blFinalCodes = new Set(
      blFinalNcms.map((item) => normalizeNcmCode(item.NcmCode)),
    );
    const globalSysCodes = new Set(
      globalSysNcms.map((item) => normalizeNcmCode(item.NcmCode)),
    );
    const allCodes = new Set([...blFinalCodes, ...globalSysCodes]);
    const prefix = keyPrefix ? `${keyPrefix}.` : '';

    return [...allCodes].sort().map((ncmCode) => {
      const inBlFinal = blFinalCodes.has(ncmCode);
      const inGlobalSys = globalSysCodes.has(ncmCode);
      const presence = inBlFinal && inGlobalSys
        ? 'both'
        : inBlFinal
          ? 'blfinal_only'
          : 'globalsys_only';

      return {
        ncmCode,
        campoKey: `${prefix}ncm.${ncmCode}`,
        presence,
        divergent: presence !== 'both',
      };
    });
  }

  private async compareBlFinalWithGlobalSysMaster(
    masterNumber: string,
  ): Promise<BlFinalGlobalSysComparisonResult> {
    let blFinal;

    try {
      blFinal = await this.blFinalService.getMasterBlFinal(masterNumber);
    } catch {
      return this.buildBlFinalGlobalSysIncompleteResult(
        'Master',
        masterNumber,
        true,
        false,
      );
    }

    const masterBundle = await this.globalSysBlRepository.findBundleByNumeroBl(
      masterNumber,
    );

    if (!masterBundle.blFound) {
      return this.buildBlFinalGlobalSysIncompleteResult(
        'Master',
        masterNumber,
        false,
        true,
      );
    }

    const fieldComparisons = this.compareBlFinalGlobalSysFields(
      blFinal.master as unknown as Record<string, string | null>,
      masterBundle.blRecord,
      BL_FINAL_MASTER_GLOBALSYS_FIELDS,
    );

    const houseComparisons = await this.compareBlFinalGlobalSysHouses(
      blFinal.houses,
    );

    fieldComparisons.push(...houseComparisons.fieldComparisons);

    return this.buildBlFinalGlobalSysComparisonResult(
      'Master',
      masterNumber,
      fieldComparisons,
      houseComparisons.cargoComparisons,
      houseComparisons.ncmComparisons,
    );
  }

  private async compareBlFinalWithGlobalSysHouse(
    houseNumber: string,
  ): Promise<BlFinalGlobalSysComparisonResult> {
    let house;

    try {
      house = await this.blFinalService.getConsolidatedHouse(houseNumber);
    } catch {
      return this.buildBlFinalGlobalSysIncompleteResult(
        'House',
        houseNumber,
        true,
        false,
      );
    }

    const bundle = await this.globalSysBlRepository.findBundleByNumeroBl(
      houseNumber,
    );

    if (!bundle.blFound) {
      return this.buildBlFinalGlobalSysIncompleteResult(
        'House',
        houseNumber,
        false,
        true,
      );
    }

    const fieldComparisons = this.compareBlFinalGlobalSysFields(
      flattenBlFinalHouse(house),
      bundle.blRecord,
      BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
    );

    const cargoComparisons = this.compareBlFinalGlobalSysCargo(
      house.cargos.map(blFinalCargoToComparable),
      bundle.cargos.map(mapGlobalSysCargoRecord),
    );

    const ncmComparisons = this.compareBlFinalGlobalSysNcm(
      blFinalNcmsToComparable(house.ncms),
      bundle.ncms
        .map(mapGlobalSysNcmRecord)
        .filter((item): item is GlobalSysComparableNcm => item != null),
    );

    return this.buildBlFinalGlobalSysComparisonResult(
      'House',
      houseNumber,
      fieldComparisons,
      cargoComparisons,
      ncmComparisons,
    );
  }

  private async compareBlFinalGlobalSysHouses(
    houses: BlFinalHouseDto[],
  ): Promise<{
    fieldComparisons: BlFinalGlobalSysFieldComparison[];
    cargoComparisons: BlFinalGlobalSysCargoComparison[];
    ncmComparisons: BlFinalGlobalSysNcmComparison[];
  }> {
    const fieldComparisons: BlFinalGlobalSysFieldComparison[] = [];
    const cargoComparisons: BlFinalGlobalSysCargoComparison[] = [];
    const ncmComparisons: BlFinalGlobalSysNcmComparison[] = [];

    for (const house of houses) {
      const prefix = `house.${house.houseNumber}`;
      const bundle = await this.globalSysBlRepository.findBundleByNumeroBl(
        house.houseNumber,
      );

      if (!bundle.blFound) {
        fieldComparisons.push({
          campoKey: `${prefix}.__presence__`,
          campoLabel: `House ${house.houseNumber} — presença no GlobalSys`,
          blFinalValue: 'presente',
          globalSysValue: null,
          divergent: true,
        });
        continue;
      }

      fieldComparisons.push(
        ...this.compareBlFinalGlobalSysFields(
          flattenBlFinalHouse(house),
          bundle.blRecord,
          BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
          prefix,
        ),
      );

      cargoComparisons.push(
        ...this.compareBlFinalGlobalSysCargo(
          house.cargos.map(blFinalCargoToComparable),
          bundle.cargos.map(mapGlobalSysCargoRecord),
          prefix,
        ),
      );

      ncmComparisons.push(
        ...this.compareBlFinalGlobalSysNcm(
          blFinalNcmsToComparable(house.ncms),
          bundle.ncms
            .map(mapGlobalSysNcmRecord)
            .filter((item): item is GlobalSysComparableNcm => item != null),
          prefix,
        ),
      );
    }

    return { fieldComparisons, cargoComparisons, ncmComparisons };
  }

  private buildBlFinalGlobalSysComparisonResult(
    documentType: BlDocumentType,
    documentNumber: string,
    fieldComparisons: BlFinalGlobalSysFieldComparison[],
    cargoComparisons: BlFinalGlobalSysCargoComparison[],
    ncmComparisons: BlFinalGlobalSysNcmComparison[],
  ): BlFinalGlobalSysComparisonResult {
    const divergentFields = fieldComparisons.filter((item) => item.divergent);
    const divergentCargo = cargoComparisons.filter((item) => item.divergent);
    const divergentNcm = ncmComparisons.filter((item) => item.divergent);
    const divergenciaCount =
      divergentFields.length + divergentCargo.length + divergentNcm.length;
    const hasDivergence = divergenciaCount > 0;
    const comparisonStatus: ComparisonStatus = hasDivergence
      ? 'completo_com_divergencia'
      : 'completo_sem_divergencia';

    return {
      documentType,
      documentNumber,
      comparisonStatus,
      fieldComparisons,
      cargoComparisons,
      ncmComparisons,
      hasDivergence,
      divergenciaCount,
      changedFields: [
        ...divergentFields.map((item) => item.campoKey),
        ...divergentCargo.map((item) => item.campoKey),
        ...divergentNcm.map((item) => item.campoKey),
      ],
      summary: hasDivergence
        ? `${divergenciaCount} divergência(s) entre BL Final e GlobalSys`
        : 'Comparação BL Final × GlobalSys concluída sem divergências',
      missingBlFinal: false,
      missingGlobalSys: false,
    };
  }

  private buildBlFinalGlobalSysIncompleteResult(
    documentType: BlDocumentType,
    documentNumber: string,
    missingBlFinal: boolean,
    missingGlobalSys: boolean,
  ): BlFinalGlobalSysComparisonResult {
    const parts: string[] = [];
    if (missingBlFinal) parts.push('BL Final ausente');
    if (missingGlobalSys) parts.push('GlobalSys ausente');

    return {
      documentType,
      documentNumber,
      comparisonStatus: 'documento_incompleto',
      fieldComparisons: [],
      cargoComparisons: [],
      ncmComparisons: [],
      hasDivergence: false,
      divergenciaCount: 0,
      changedFields: [],
      summary: `Comparação BL Final × GlobalSys incompleta: ${parts.join(' e ')}`,
      missingBlFinal,
      missingGlobalSys,
    };
  }

  private async persistBlFinalGlobalSysComparison(
    comparison: BlFinalGlobalSysComparisonResult,
  ): Promise<BlFinalGlobalSysComparisonPersistResult> {
    const finalRecord = await this.resolveFinalRecord(
      comparison.documentType,
      comparison.documentNumber,
    );

    if (!finalRecord) {
      throw new NotFoundError(
        `FINAL de ${comparison.documentType} ${comparison.documentNumber} não encontrado`,
      );
    }

    const campos = this.mapBlFinalGlobalSysToPersistedCampos(comparison);
    const divergenciaStatus = comparison.hasDivergence ? 'pendente' : 'sem_divergencia';

    const result = await prisma.$transaction(async (tx) => {
      const divergencia = await this.divergenciaRepository.upsert(
        {
          blMasterId:
            comparison.documentType === 'Master' ? finalRecord.Id : null,
          blHouseId:
            comparison.documentType === 'House' ? finalRecord.Id : null,
          status: divergenciaStatus,
        },
        tx,
      );

      await this.divergenciaCampoRepository.replaceCampos(
        divergencia.Id,
        campos,
        tx,
      );

      const workflow = await this.workflowService.applyGlobalSysComparisonResult(
        comparison.documentType,
        comparison.documentNumber,
        comparison,
        tx,
      );

      return { divergencia, workflow };
    });

    return {
      ...comparison,
      divergenciaId: result.divergencia.Id,
      divergencia: result.divergencia,
      workflow: result.workflow,
    };
  }

  private mapBlFinalGlobalSysToPersistedCampos(
    comparison: BlFinalGlobalSysComparisonResult,
  ): PersistDivergenciaCampoInput[] {
    const campos: PersistDivergenciaCampoInput[] = [];

    for (const field of comparison.fieldComparisons.filter((item) => item.divergent)) {
      campos.push({
        campoKey: field.campoKey,
        campoLabel: field.campoLabel,
        valorBlFinal: field.blFinalValue ?? '',
        valorGlobalSys: field.globalSysValue ?? '',
        categoria: this.resolveFieldCategoria(field.campoKey),
      });
    }

    for (const cargo of comparison.cargoComparisons.filter((item) => item.divergent)) {
      campos.push({
        campoKey: cargo.campoKey,
        campoLabel: cargo.campoKey,
        valorBlFinal: cargo.blFinalValue ?? '',
        valorGlobalSys: cargo.globalSysValue ?? '',
        categoria: 'cargo',
      });
    }

    for (const ncm of comparison.ncmComparisons.filter((item) => item.divergent)) {
      campos.push({
        campoKey: ncm.campoKey,
        campoLabel: `NCM ${ncm.ncmCode}`,
        valorBlFinal: ncm.presence === 'globalsys_only' ? '' : ncm.ncmCode,
        valorGlobalSys: ncm.presence === 'blfinal_only' ? '' : ncm.ncmCode,
        categoria: 'ncm',
      });
    }

    return campos;
  }

  async getLatestPersistedByDocument(
    documentType: BlDocumentType,
    documentNumber: string,
  ) {
    const finalRecord = await this.resolveFinalRecord(documentType, documentNumber);

    if (!finalRecord) {
      throw new NotFoundError(
        `FINAL de ${documentType} ${documentNumber} não encontrado`,
      );
    }

    const divergencia =
      documentType === 'Master'
        ? await this.divergenciaRepository.findLatestByMasterId(finalRecord.Id)
        : await this.divergenciaRepository.findLatestByHouseId(finalRecord.Id);

    if (!divergencia) {
      throw new NotFoundError(
        `Nenhuma divergência persistida para ${documentType} ${documentNumber}`,
      );
    }

    const withCampos = await this.divergenciaRepository.findByIdWithCampos(
      divergencia.Id,
    );

    if (!withCampos) {
      throw new NotFoundError(`Divergência ${divergencia.Id} não encontrada`);
    }

    return this.enrichPersistedDivergencia({
      divergencia: withCampos,
      documentType,
      documentNumber,
    });
  }

  async getPersistedById(id: number) {
    const divergencia = await this.divergenciaRepository.findByIdWithCampos(id);

    if (!divergencia) {
      throw new NotFoundError(`Divergência ${id} não encontrada`);
    }

    if (divergencia.BlMasterId != null) {
      const master = await this.masterRepository.findById(divergencia.BlMasterId);

      if (!master) {
        throw new NotFoundError(
          `Master vinculado à divergência ${id} não encontrado`,
        );
      }

      return this.enrichPersistedDivergencia({
        divergencia,
        documentType: 'Master',
        documentNumber: master.master.MasterNumber,
      });
    }

    if (divergencia.BlHouseId != null) {
      const house = await this.houseRepository.findById(divergencia.BlHouseId);

      if (!house) {
        throw new NotFoundError(
          `House vinculado à divergência ${id} não encontrado`,
        );
      }

      return this.enrichPersistedDivergencia({
        divergencia,
        documentType: 'House',
        documentNumber: house.house.HouseNumber,
      });
    }

    throw new NotFoundError(
      `Divergência ${id} não possui documento associado`,
    );
  }

  private async enrichPersistedDivergencia(params: {
    divergencia: Awaited<ReturnType<BlDivergenciaRepository['findByIdWithCampos']>>;
    documentType: BlDocumentType;
    documentNumber: string;
  }) {
    const { divergencia, documentType, documentNumber } = params;

    if (!divergencia) {
      throw new NotFoundError('Divergência não encontrada');
    }

    const workflowContext = await this.workflowService.getWorkflowByDocument(
      documentType,
      documentNumber,
      BL_VERSION.FINAL,
    );

    const campoKeys = divergencia.campos.map((campo) => campo.CampoKey);
    const comparisonKind = inferComparisonKind({
      campoKeys,
      workflowPendencia: workflowContext?.workflow.Pendencia,
    });

    return {
      divergencia,
      documentType,
      documentNumber,
      comparisonKind,
      comparisonStatus: deriveComparisonStatusFromPersisted({
        divergenciaStatus: divergencia.Status,
        campoCount: divergencia.campos.length,
      }),
      comparisonDate: divergencia.UpdatedAt,
      origin: resolveComparisonOrigin(comparisonKind),
      workflow: workflowContext,
    };
  }

  async resolveDivergencia(id: number, input: ResolveDivergenciaRequestDto) {
    const divergencia = await this.divergenciaRepository.findByIdWithCampos(id);

    if (!divergencia) {
      throw new NotFoundError(`Divergência ${id} não encontrada`);
    }

    const context = await this.resolveDocumentContextFromDivergencia(divergencia);
    const pendingCampos = divergencia.campos.filter((campo) =>
      isCampoPending(campo.Status),
    );

    if (pendingCampos.length === 0) {
      throw new ConflictError('Não há campos pendentes para resolver');
    }

    this.validateManualResolutionInput(input.resolutionStrategy, {
      manualValues: input.manualValues,
    });

    const resolvedAt = this.parseResolvedAt(input.resolvedAt);
    const responsavel = this.resolveResponsavel(input);

    return prisma.$transaction(async (tx) => {
      for (const campo of pendingCampos) {
        const manualValue = input.manualValues?.[campo.CampoKey];

        await this.applyCampoResolution({
          divergencia,
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

      return this.finalizeDivergenciaResolution({
        divergenciaId: id,
        context,
        responsavel,
        resolvedAt,
        tx,
      });
    });
  }

  async resolveCampo(
    divergenciaId: number,
    campoKey: string,
    input: ResolveDivergenciaCampoRequestDto,
  ) {
    const decodedCampoKey = decodeURIComponent(campoKey);
    const divergencia =
      await this.divergenciaRepository.findByIdWithCampos(divergenciaId);

    if (!divergencia) {
      throw new NotFoundError(`Divergência ${divergenciaId} não encontrada`);
    }

    const campo = divergencia.campos.find(
      (item) => item.CampoKey === decodedCampoKey,
    );

    if (!campo) {
      throw new NotFoundError(
        `Campo ${decodedCampoKey} não encontrado na divergência ${divergenciaId}`,
      );
    }

    if (!isCampoPending(campo.Status)) {
      throw new ConflictError(`Campo ${decodedCampoKey} já foi resolvido`);
    }

    this.validateManualResolutionInput(input.resolutionStrategy, {
      manualValue: input.manualValue,
    });

    const context = await this.resolveDocumentContextFromDivergencia(divergencia);
    const resolvedAt = this.parseResolvedAt(input.resolvedAt);
    const responsavel = this.resolveResponsavel(input);

    return prisma.$transaction(async (tx) => {
      await this.applyCampoResolution({
        divergencia,
        context,
        campo,
        strategy: input.resolutionStrategy,
        manualValue: input.manualValue,
        observacao: input.observacao,
        responsavel,
        resolvedAt,
        tx,
      });

      return this.finalizeDivergenciaResolution({
        divergenciaId,
        context,
        responsavel,
        resolvedAt,
        tx,
      });
    });
  }

  private async finalizeDivergenciaResolution(params: {
    divergenciaId: number;
    context: {
      documentType: BlDocumentType;
      documentNumber: string;
      blMasterId: number | null;
      blHouseId: number | null;
    };
    responsavel: { userId: number | null; nome: string };
    resolvedAt: Date;
    tx: Prisma.TransactionClient;
  }) {
    const refreshed = await this.divergenciaRepository.findByIdWithCampos(
      params.divergenciaId,
    );

    if (!refreshed) {
      throw new NotFoundError(`Divergência ${params.divergenciaId} não encontrada`);
    }
    const pendingCount = refreshed.campos.filter((campo) =>
      isCampoPending(campo.Status),
    ).length;
    const resolvedCount = refreshed.campos.length - pendingCount;
    const allResolved = refreshed.campos.length === 0 || pendingCount === 0;

    if (allResolved) {
      await this.divergenciaRepository.updateStatus(
        params.divergenciaId,
        DIVERGENCIA_HEADER_STATUS.RESOLVIDO,
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
          campo: `Divergência ${params.divergenciaId}`,
          valorAntes: DIVERGENCIA_HEADER_STATUS.PENDENTE,
          valorDepois: DIVERGENCIA_HEADER_STATUS.RESOLVIDO,
          acao: 'resolucao_divergencia',
          createdAt: params.resolvedAt,
        },
        params.tx,
      );
    }

    const workflow = await this.workflowService.applyDivergenciaResolutionResult(
      params.context.documentType,
      params.context.documentNumber,
      {
        allResolved,
        pendingCount,
        resolvedCount,
      },
      params.tx,
    );

    const divergenciaAfterUpdate =
      (await this.divergenciaRepository.findByIdWithCampos(params.divergenciaId)) ??
      refreshed;

    const enriched = await this.enrichPersistedDivergencia({
      divergencia: divergenciaAfterUpdate,
      documentType: params.context.documentType,
      documentNumber: params.context.documentNumber,
    });

    const historicoByCampoKey = await this.loadHistoricoByCampoKeys(
      params.context.blMasterId,
      params.context.blHouseId,
      divergenciaAfterUpdate.campos.map((campo) => campo.CampoKey),
    );

    const divergenciaDetail = mapDivergenciaLatestDetail({
      divergencia: enriched.divergencia,
      documentType: enriched.documentType,
      documentNumber: enriched.documentNumber,
      comparisonKind: enriched.comparisonKind,
      comparisonStatus: enriched.comparisonStatus,
      comparisonDate: enriched.comparisonDate,
      origin: enriched.origin,
      workflow: enriched.workflow
        ? mapWorkflowSummary({
            workflow: enriched.workflow.workflow,
            documentType: enriched.documentType,
            documentNumber: enriched.documentNumber,
            blVersion: BL_VERSION.FINAL,
          })
        : null,
    });

    return mapDivergenciaResolveResponse({
      divergencia: divergenciaAfterUpdate,
      documentType: params.context.documentType,
      documentNumber: params.context.documentNumber,
      divergenciaDetail,
      workflow: mapWorkflowSummary({
        workflow,
        documentType: params.context.documentType,
        documentNumber: params.context.documentNumber,
        blVersion: BL_VERSION.FINAL,
      }),
      historicoByCampoKey,
    });
  }

  private async applyCampoResolution(params: {
    divergencia: NonNullable<
      Awaited<ReturnType<BlDivergenciaRepository['findByIdWithCampos']>>
    >;
    context: {
      blMasterId: number | null;
      blHouseId: number | null;
    };
    campo: { Id: number; CampoKey: string; CampoLabel: string; ValorBlFinal: string; ValorGlobalSys: string };
    strategy: DivergenciaResolutionStrategy;
    manualValue?: string;
    observacao?: string;
    responsavel: { userId: number | null; nome: string };
    resolvedAt: Date;
    tx: Prisma.TransactionClient;
  }) {
    const acceptedValue = resolveCampoAcceptedValue({
      strategy: params.strategy,
      valorBlFinal: params.campo.ValorBlFinal,
      valorGlobalSys: params.campo.ValorGlobalSys,
      manualValue: params.manualValue,
    });

    if (!acceptedValue && params.strategy === 'manual') {
      throw new BadRequestError(
        `Valor manual obrigatório para o campo ${params.campo.CampoKey}`,
      );
    }

    const campoStatus = STRATEGY_TO_CAMPO_STATUS[params.strategy];

    await this.divergenciaCampoRepository.updateResolution(
      params.campo.Id,
      {
        status: campoStatus,
        valorBlFinal: acceptedValue,
        valorGlobalSys: acceptedValue,
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
        valorAntes: `${params.campo.ValorBlFinal} / ${params.campo.ValorGlobalSys}`,
        valorDepois: encodeHistoricoValorDepois(acceptedValue, params.observacao),
        acao: 'resolucao_divergencia_campo',
        createdAt: params.resolvedAt,
      },
      params.tx,
    );
  }

  private async resolveDocumentContextFromDivergencia(
    divergencia: NonNullable<
      Awaited<ReturnType<BlDivergenciaRepository['findByIdWithCampos']>>
    >,
  ) {
    if (divergencia.BlMasterId != null) {
      const master = await this.masterRepository.findById(divergencia.BlMasterId);

      if (!master) {
        throw new NotFoundError(
          `Master vinculado à divergência ${divergencia.Id} não encontrado`,
        );
      }

      return {
        documentType: 'Master' as const,
        documentNumber: master.master.MasterNumber,
        blMasterId: divergencia.BlMasterId,
        blHouseId: null,
      };
    }

    if (divergencia.BlHouseId != null) {
      const house = await this.houseRepository.findById(divergencia.BlHouseId);

      if (!house) {
        throw new NotFoundError(
          `House vinculado à divergência ${divergencia.Id} não encontrado`,
        );
      }

      return {
        documentType: 'House' as const,
        documentNumber: house.house.HouseNumber,
        blMasterId: null,
        blHouseId: divergencia.BlHouseId,
      };
    }

    throw new NotFoundError(
      `Divergência ${divergencia.Id} não possui documento associado`,
    );
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
        );
        map.set(campoKey, historico);
      }),
    );

    return map;
  }

  private validateManualResolutionInput(
    strategy: DivergenciaResolutionStrategy,
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
}
