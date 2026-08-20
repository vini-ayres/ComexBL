import type { ComparisonStatus } from '../constants/bl-comparison.constants.js';
import type { ComparisonKind, ComparisonOriginDto } from '../constants/comparison-kind.constants.js';
import type { BlDocumentType } from './bl-domain.types.js';
import type { WorkflowSummaryDto } from './workflow.types.js';

export interface DivergenciaCampoDto {
  campoKey: string;
  campoLabel: string;
  valorDraft: string | null;
  valorFinal: string | null;
  divergent: boolean;
}

export interface DivergenciaGlobalSysCampoDto {
  campoKey: string;
  campoLabel: string;
  valorBlFinal: string | null;
  valorGlobalSys: string | null;
  divergent: boolean;
}

export interface DivergenciaCargoDto {
  logicalKey: string;
  campoKey: string;
  valorDraft: string | null;
  valorFinal: string | null;
  divergent: boolean;
}

export interface DivergenciaGlobalSysCargoDto {
  logicalKey: string;
  campoKey: string;
  valorBlFinal: string | null;
  valorGlobalSys: string | null;
  divergent: boolean;
}

export interface DivergenciaNcmDto {
  ncmCode: string;
  campoKey: string;
  presence: 'both' | 'draft_only' | 'final_only';
  divergent: boolean;
}

export interface DivergenciaGlobalSysNcmDto {
  ncmCode: string;
  campoKey: string;
  presence: 'both' | 'blfinal_only' | 'globalsys_only';
  divergent: boolean;
}

export interface DivergenciaComparisonResponseDto {
  documentType: BlDocumentType;
  documentNumber: string;
  comparisonKind: ComparisonKind;
  origin: ComparisonOriginDto;
  comparisonStatus: ComparisonStatus;
  hasDivergence: boolean;
  divergenciaCount: number;
  changedFields: string[];
  summary: string;
  missingDraft: boolean;
  missingFinal: boolean;
  fields: DivergenciaCampoDto[];
  cargo: DivergenciaCargoDto[];
  ncm: DivergenciaNcmDto[];
}

export interface DivergenciaPersistResponseDto extends DivergenciaComparisonResponseDto {
  divergenciaId: number | null;
  divergenciaStatus: string | null;
  workflow: WorkflowSummaryDto | null;
}

export interface DivergenciaGlobalSysComparisonResponseDto {
  documentType: BlDocumentType;
  documentNumber: string;
  comparisonKind: ComparisonKind;
  origin: ComparisonOriginDto;
  comparisonStatus: ComparisonStatus;
  hasDivergence: boolean;
  divergenciaCount: number;
  changedFields: string[];
  summary: string;
  missingBlFinal: boolean;
  missingGlobalSys: boolean;
  fields: DivergenciaGlobalSysCampoDto[];
  cargo: DivergenciaGlobalSysCargoDto[];
  ncm: DivergenciaGlobalSysNcmDto[];
}

export interface DivergenciaGlobalSysPersistResponseDto
  extends DivergenciaGlobalSysComparisonResponseDto {
  divergenciaId: number | null;
  divergenciaStatus: string | null;
  workflow: WorkflowSummaryDto | null;
}

export interface DivergenciaCampoDetailDto {
  id: number;
  campoKey: string;
  campoLabel: string;
  valorDraft: string;
  valorFinal: string;
  valorBlFinal: string;
  valorGlobalSys: string;
  status: string;
  categoria: string;
}

export interface DivergenciaDetailDto {
  id: number;
  documentType: BlDocumentType;
  documentNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  campos: DivergenciaCampoDetailDto[];
}

/** Resposta enriquecida de divergência persistida (latest / by-id). */
export interface DivergenciaLatestDetailDto extends DivergenciaDetailDto {
  comparisonKind: ComparisonKind | null;
  comparisonStatus: ComparisonStatus;
  comparisonDate: string;
  origin: ComparisonOriginDto | null;
  workflow: WorkflowSummaryDto | null;
}
