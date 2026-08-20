import type {
  ConferenciaCampoStatus,
  ConferenciaCategoria,
  ConferenciaHeaderStatus,
  ConferenciaResolutionStrategy,
} from '../constants/conferencia-house-master.constants.js';
import type { BlVersion } from '../constants/bl-version.constants.js';
import type { BlDocumentType } from './bl-domain.types.js';
import type { WorkflowSummaryDto } from './workflow.types.js';

export interface ConferenciaCounterpartDto {
  masterNumber: string | null;
  houseNumbers: string[];
  blVersion: BlVersion;
  houseAggregate: boolean;
  missingMaster: boolean;
  missingHouse: boolean;
}

export interface ConferenciaCampoDto {
  id: number;
  campoKey: string;
  campoLabel: string;
  valorHouse: string;
  valorMaster: string;
  valorManual: string | null;
  status: string;
  categoria: ConferenciaCategoria;
}

export interface ConferenciaComparisonFieldDto {
  campoKey: string;
  campoLabel: string;
  categoria: ConferenciaCategoria;
  valorHouse: string;
  valorMaster: string;
  divergent: boolean;
}

export interface ConferenciaLatestDetailDto {
  id: number;
  documentType: BlDocumentType;
  documentNumber: string;
  status: ConferenciaHeaderStatus | string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  campos: ConferenciaCampoDto[];
  comparisonStatus: string;
  comparisonDate: string;
  origin: {
    left: string;
    right: string;
    label: string;
  };
  counterpart: ConferenciaCounterpartDto;
  workflow: WorkflowSummaryDto | null;
}

export interface ConferenciaComparisonResult {
  documentType: BlDocumentType;
  documentNumber: string;
  blVersion: BlVersion;
  comparisonStatus: string;
  hasDivergence: boolean;
  divergenciaCount: number;
  changedFields: string[];
  summary: string;
  missingMaster: boolean;
  missingHouse: boolean;
  fields: ConferenciaComparisonFieldDto[];
  counterpart: ConferenciaCounterpartDto;
}

export interface ConferenciaPersistResult extends ConferenciaComparisonResult {
  conferenciaId: number | null;
  conferenciaStatus: string | null;
  workflow: WorkflowSummaryDto | null;
}

export interface ResolveConferenciaRequestDto {
  resolutionStrategy: ConferenciaResolutionStrategy;
  manualValues?: Record<string, string>;
  observacao?: string;
  responsavelUserId?: number;
  responsavelNome?: string;
  resolvedAt?: string;
}

export interface ResolveConferenciaCampoRequestDto {
  resolutionStrategy: ConferenciaResolutionStrategy;
  manualValue?: string;
  observacao?: string;
  responsavelUserId?: number;
  responsavelNome?: string;
  resolvedAt?: string;
}

export interface ConferenciaCampoResolutionDetailDto {
  campoKey: string;
  campoLabel: string;
  status: ConferenciaCampoStatus | string;
  resolutionStrategy: ConferenciaResolutionStrategy | null;
  resolvedValue: string | null;
  valorHouse: string;
  valorMaster: string;
  observacao: string | null;
  responsavelUserId: number | null;
  responsavelNome: string | null;
  resolvedAt: string | null;
}

export interface ConferenciaResolutionSummaryDto {
  conferenciaId: number;
  status: string;
  totalCampos: number;
  pendingCampos: number;
  resolvedCampos: number;
  allResolved: boolean;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
}

export interface ConferenciaResolveResponseDto {
  summary: ConferenciaResolutionSummaryDto;
  conferencia: ConferenciaLatestDetailDto;
  workflow: WorkflowSummaryDto | null;
  campos: ConferenciaCampoResolutionDetailDto[];
}

export interface ConferenciaDocumentoDto {
  tipo: BlDocumentType;
  numeroBl: string;
  nome: string;
  origemPath: string;
  fileName: string | null;
  blVersion: string;
}

export interface ConferenciaQueueEntry {
  tipo: BlDocumentType;
  id: number;
  documentNumber: string;
  blVersion: string;
}

export interface ConferenciaQueueItemDto {
  conferencia: ConferenciaLatestDetailDto;
  documentos: {
    master: ConferenciaDocumentoDto | null;
    house: ConferenciaDocumentoDto | null;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
