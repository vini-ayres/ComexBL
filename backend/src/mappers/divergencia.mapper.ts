import type { BlDivergencia, BlDivergenciaCampo } from '@prisma/client';
import { COMPARISON_ORIGIN_BY_KIND } from '../constants/comparison-kind.constants.js';
import type {
  BlDocumentType,
  BlFinalGlobalSysComparisonPersistResult,
  BlFinalGlobalSysComparisonResult,
  DraftFinalComparisonPersistResult,
  DraftFinalComparisonResult,
} from '../types/bl-domain.types.js';
import type {
  DivergenciaComparisonResponseDto,
  DivergenciaDetailDto,
  DivergenciaGlobalSysComparisonResponseDto,
  DivergenciaGlobalSysPersistResponseDto,
  DivergenciaLatestDetailDto,
  DivergenciaPersistResponseDto,
} from '../types/divergencia.types.js';
import {
  mapPersistedDivergenciaCategoria,
  type ComparisonStatus,
} from '../constants/bl-comparison.constants.js';
import type { ComparisonKind, ComparisonOriginDto } from '../constants/comparison-kind.constants.js';
import type { WorkflowSummaryDto } from '../types/workflow.types.js';
import { mapWorkflowSummary } from './workflow.mapper.js';

export function mapDivergenciaComparison(
  result: DraftFinalComparisonResult,
): DivergenciaComparisonResponseDto {
  return {
    documentType: result.documentType,
    documentNumber: result.documentNumber,
    comparisonKind: 'DRAFT_FINAL',
    origin: COMPARISON_ORIGIN_BY_KIND.DRAFT_FINAL,
    comparisonStatus: result.comparisonStatus,
    hasDivergence: result.hasDivergence,
    divergenciaCount: result.divergenciaCount,
    changedFields: result.changedFields,
    summary: result.summary,
    missingDraft: result.missingDraft,
    missingFinal: result.missingFinal,
    fields: result.fieldComparisons.map((field) => ({
      campoKey: field.campoKey,
      campoLabel: field.campoLabel,
      valorDraft: field.draftValue,
      valorFinal: field.finalValue,
      divergent: field.divergent,
    })),
    cargo: result.cargoComparisons.map((cargo) => ({
      logicalKey: cargo.logicalKey,
      campoKey: cargo.campoKey,
      valorDraft: cargo.draftValue,
      valorFinal: cargo.finalValue,
      divergent: cargo.divergent,
    })),
    ncm: result.ncmComparisons.map((ncm) => ({
      ncmCode: ncm.ncmCode,
      campoKey: ncm.campoKey,
      presence: ncm.presence,
      divergent: ncm.divergent,
    })),
  };
}

export function mapDivergenciaPersist(
  result: DraftFinalComparisonPersistResult,
): DivergenciaPersistResponseDto {
  return {
    ...mapDivergenciaComparison(result),
    divergenciaId: result.divergenciaId,
    divergenciaStatus: result.divergencia?.Status ?? null,
    workflow: result.workflow
      ? mapWorkflowSummary({
          workflow: result.workflow,
          documentType: result.documentType,
          documentNumber: result.documentNumber,
          blVersion: 'FINAL',
        })
      : null,
  };
}

export function mapDivergenciaGlobalSysComparison(
  result: BlFinalGlobalSysComparisonResult,
): DivergenciaGlobalSysComparisonResponseDto {
  return {
    documentType: result.documentType,
    documentNumber: result.documentNumber,
    comparisonKind: 'GLOBALSYS',
    origin: COMPARISON_ORIGIN_BY_KIND.GLOBALSYS,
    comparisonStatus: result.comparisonStatus,
    hasDivergence: result.hasDivergence,
    divergenciaCount: result.divergenciaCount,
    changedFields: result.changedFields,
    summary: result.summary,
    missingBlFinal: result.missingBlFinal,
    missingGlobalSys: result.missingGlobalSys,
    fields: result.fieldComparisons.map((field) => ({
      campoKey: field.campoKey,
      campoLabel: field.campoLabel,
      valorBlFinal: field.blFinalValue,
      valorGlobalSys: field.globalSysValue,
      divergent: field.divergent,
    })),
    cargo: result.cargoComparisons.map((cargo) => ({
      logicalKey: cargo.logicalKey,
      campoKey: cargo.campoKey,
      valorBlFinal: cargo.blFinalValue,
      valorGlobalSys: cargo.globalSysValue,
      divergent: cargo.divergent,
    })),
    ncm: result.ncmComparisons.map((ncm) => ({
      ncmCode: ncm.ncmCode,
      campoKey: ncm.campoKey,
      presence: ncm.presence,
      divergent: ncm.divergent,
    })),
  };
}

export function mapDivergenciaGlobalSysPersist(
  result: BlFinalGlobalSysComparisonPersistResult,
): DivergenciaGlobalSysPersistResponseDto {
  return {
    ...mapDivergenciaGlobalSysComparison(result),
    divergenciaId: result.divergenciaId,
    divergenciaStatus: result.divergencia?.Status ?? null,
    workflow: result.workflow
      ? mapWorkflowSummary({
          workflow: result.workflow,
          documentType: result.documentType,
          documentNumber: result.documentNumber,
          blVersion: 'FINAL',
        })
      : null,
  };
}

export function mapDivergenciaDetail(params: {
  divergencia: BlDivergencia & { campos: BlDivergenciaCampo[] };
  documentType: BlDocumentType;
  documentNumber: string;
}): DivergenciaDetailDto {
  return {
    id: params.divergencia.Id,
    documentType: params.documentType,
    documentNumber: params.documentNumber,
    status: params.divergencia.Status,
    createdAt: params.divergencia.CreatedAt.toISOString(),
    updatedAt: params.divergencia.UpdatedAt.toISOString(),
    resolvedAt: params.divergencia.ResolvedAt?.toISOString() ?? null,
    campos: params.divergencia.campos.map((campo) => ({
      id: campo.Id,
      campoKey: campo.CampoKey,
      campoLabel: campo.CampoLabel,
      valorDraft: campo.ValorBlFinal,
      valorFinal: campo.ValorGlobalSys,
      valorBlFinal: campo.ValorBlFinal,
      valorGlobalSys: campo.ValorGlobalSys,
      status: campo.Status,
      categoria: mapPersistedDivergenciaCategoria(campo.CampoKey, campo.Categoria),
    })),
  };
}

export function mapDivergenciaLatestDetail(params: {
  divergencia: BlDivergencia & { campos: BlDivergenciaCampo[] };
  documentType: BlDocumentType;
  documentNumber: string;
  comparisonKind: ComparisonKind | null;
  comparisonStatus: ComparisonStatus;
  comparisonDate: Date;
  origin: ComparisonOriginDto | null;
  workflow: WorkflowSummaryDto | null;
}): DivergenciaLatestDetailDto {
  return {
    ...mapDivergenciaDetail({
      divergencia: params.divergencia,
      documentType: params.documentType,
      documentNumber: params.documentNumber,
    }),
    comparisonKind: params.comparisonKind,
    comparisonStatus: params.comparisonStatus,
    comparisonDate: params.comparisonDate.toISOString(),
    origin: params.origin,
    workflow: params.workflow,
  };
}
