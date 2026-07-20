import type { DivergenciaResolutionStrategy } from '../constants/divergencia-resolution.constants.js';
import type { DivergenciaLatestDetailDto } from './divergencia.types.js';
import type { WorkflowSummaryDto } from './workflow.types.js';

export interface ResolveDivergenciaRequestDto {
  resolutionStrategy: DivergenciaResolutionStrategy;
  manualValues?: Record<string, string>;
  observacao?: string;
  responsavelUserId?: number;
  responsavelNome?: string;
  resolvedAt?: string;
}

export interface ResolveDivergenciaCampoRequestDto {
  resolutionStrategy: DivergenciaResolutionStrategy;
  manualValue?: string;
  observacao?: string;
  responsavelUserId?: number;
  responsavelNome?: string;
  resolvedAt?: string;
}

export interface DivergenciaCampoResolutionDetailDto {
  campoKey: string;
  campoLabel: string;
  status: string;
  resolutionStrategy: DivergenciaResolutionStrategy | null;
  resolvedValue: string | null;
  valorBlFinal: string;
  valorGlobalSys: string;
  observacao: string | null;
  responsavelUserId: number | null;
  responsavelNome: string | null;
  resolvedAt: string | null;
}

export interface DivergenciaResolutionSummaryDto {
  divergenciaId: number;
  status: string;
  totalCampos: number;
  pendingCampos: number;
  resolvedCampos: number;
  allResolved: boolean;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
}

export interface DivergenciaResolveResponseDto {
  summary: DivergenciaResolutionSummaryDto;
  divergencia: DivergenciaLatestDetailDto;
  workflow: WorkflowSummaryDto | null;
  campos: DivergenciaCampoResolutionDetailDto[];
}
