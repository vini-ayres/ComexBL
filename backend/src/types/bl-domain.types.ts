import type {
  BlDivergencia,
  BlHouse,
  BlHouseCargo,
  BlHouseNcm,
  BlMaster,
  BlWorkflow,
} from '@prisma/client';
import type { BlVersion } from '../constants/bl-version.constants.js';
import type { ComparisonStatus } from '../constants/bl-comparison.constants.js';

export type BlDocumentType = 'Master' | 'House';

export interface BlMasterWithHouses {
  master: BlMaster;
  houses: BlHouse[];
}

export interface BlHouseWithRelations {
  house: BlHouse;
  master: BlMaster | null;
  cargos: BlHouseCargo[];
  ncms: BlHouseNcm[];
}

export interface BlVersionPair<T> {
  draft: T | null;
  final: T | null;
}

export interface CreateBlMasterInput {
  blVersion: BlVersion;
  data: Omit<BlMaster, 'Id' | 'BlVersion'> & { BlVersion?: never };
}

export interface CreateBlHouseInput {
  blVersion: BlVersion;
  blMasterId?: number | null;
  data: Omit<BlHouse, 'Id' | 'BlVersion' | 'BLMasterId'> & {
    BlVersion?: never;
    BLMasterId?: never;
  };
}

export interface UpdateWorkflowInput {
  status: string;
  pendencia?: string | null;
  responsavelUserId?: number | null;
  confianca?: number | null;
  /** Não dispara XML/EDI após finalizar (Manter GlobalSys). */
  skipXmlDispatch?: boolean;
  /** Regenera XML mesmo se já houver envio para o Master. */
  forceXmlDispatch?: boolean;
}

export interface WorkflowUpsertParams {
  tipoBl: BlDocumentType;
  blMasterId?: number | null;
  blHouseId?: number | null;
  /** MasterNumber ou HouseNumber do documento desta versão. */
  documentNumber?: string;
  data: UpdateWorkflowInput;
}

export interface RecordConsultaGlobalSysInput {
  blMasterId?: number | null;
  blHouseId?: number | null;
  sucesso: boolean;
  detalhe?: string | null;
}

export interface RelationshipValidationIssue {
  code: string;
  message: string;
  field?: string;
}

export interface RelationshipValidationResult {
  valid: boolean;
  issues: RelationshipValidationIssue[];
}

export interface FieldComparisonResult {
  campoKey: string;
  campoLabel: string;
  draftValue: string | null;
  finalValue: string | null;
  divergent: boolean;
}

export interface CargoComparisonResult {
  logicalKey: string;
  campoKey: string;
  draftValue: string | null;
  finalValue: string | null;
  divergent: boolean;
}

export interface NcmComparisonResult {
  ncmCode: string;
  campoKey: string;
  presence: 'both' | 'draft_only' | 'final_only';
  divergent: boolean;
}

export interface DraftFinalComparisonResult {
  documentType: BlDocumentType;
  documentNumber: string;
  comparisonStatus: ComparisonStatus;
  fieldComparisons: FieldComparisonResult[];
  cargoComparisons: CargoComparisonResult[];
  ncmComparisons: NcmComparisonResult[];
  hasDivergence: boolean;
  divergenciaCount: number;
  changedFields: string[];
  summary: string;
  missingDraft: boolean;
  missingFinal: boolean;
}

export interface DraftFinalComparisonPersistResult extends DraftFinalComparisonResult {
  divergenciaId: number | null;
  workflow: BlWorkflow | null;
  divergencia: BlDivergencia | null;
}

export interface PersistDivergenciaCampoInput {
  campoKey: string;
  campoLabel: string;
  /** DRAFT×FINAL — legado; mapeado para ValorBlFinal quando valorBlFinal ausente. */
  valorDraft?: string;
  /** DRAFT×FINAL — legado; mapeado para ValorGlobalSys quando valorGlobalSys ausente. */
  valorFinal?: string;
  /** BL Final×GlobalSys — valor consolidado local. */
  valorBlFinal?: string;
  /** BL Final×GlobalSys — valor no GlobalSys. */
  valorGlobalSys?: string;
  categoria: 'master' | 'house' | 'cargo' | 'ncm';
  /** Default: pendente. Campos que conferem são gravados como "igual". */
  status?: string;
}

export interface BlFinalGlobalSysFieldComparison {
  campoKey: string;
  campoLabel: string;
  blFinalValue: string | null;
  globalSysValue: string | null;
  divergent: boolean;
}

export interface BlFinalGlobalSysCargoComparison {
  logicalKey: string;
  campoKey: string;
  blFinalValue: string | null;
  globalSysValue: string | null;
  divergent: boolean;
}

export interface BlFinalGlobalSysNcmComparison {
  ncmCode: string;
  campoKey: string;
  presence: 'both' | 'blfinal_only' | 'globalsys_only';
  divergent: boolean;
}

export interface BlFinalGlobalSysComparisonResult {
  documentType: BlDocumentType;
  documentNumber: string;
  comparisonStatus: ComparisonStatus;
  fieldComparisons: BlFinalGlobalSysFieldComparison[];
  cargoComparisons: BlFinalGlobalSysCargoComparison[];
  ncmComparisons: BlFinalGlobalSysNcmComparison[];
  hasDivergence: boolean;
  divergenciaCount: number;
  changedFields: string[];
  summary: string;
  missingBlFinal: boolean;
  missingGlobalSys: boolean;
}

export interface BlFinalGlobalSysComparisonPersistResult
  extends BlFinalGlobalSysComparisonResult {
  divergenciaId: number | null;
  workflow: BlWorkflow | null;
  divergencia: BlDivergencia | null;
}

export interface BlWorkflowContext {
  workflow: BlWorkflow;
  documentType: BlDocumentType;
  documentNumber: string;
  blVersion: BlVersion;
}
