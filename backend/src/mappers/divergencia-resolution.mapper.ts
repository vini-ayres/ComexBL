import type { BlDivergencia, BlDivergenciaCampo, BlHistoricoAlteracao } from '@prisma/client';
import {
  CAMPO_STATUS_TO_STRATEGY,
  type DivergenciaResolutionStrategy,
} from '../constants/divergencia-resolution.constants.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import type {
  DivergenciaCampoResolutionDetailDto,
  DivergenciaResolutionSummaryDto,
  DivergenciaResolveResponseDto,
} from '../types/divergencia-resolution.types.js';
import type { DivergenciaLatestDetailDto } from '../types/divergencia.types.js';
import type { WorkflowSummaryDto } from '../types/workflow.types.js';

const HISTORICO_CAMPO_SEPARATOR = '|';
const HISTORICO_OBS_PREFIX = '|obs:';

export function buildHistoricoCampoRef(campoKey: string, campoLabel: string): string {
  return `${campoKey}${HISTORICO_CAMPO_SEPARATOR}${campoLabel}`;
}

export function parseHistoricoCampoRef(campo: string): {
  campoKey: string;
  campoLabel: string;
} {
  const separatorIndex = campo.indexOf(HISTORICO_CAMPO_SEPARATOR);

  if (separatorIndex === -1) {
    return { campoKey: campo, campoLabel: campo };
  }

  return {
    campoKey: campo.slice(0, separatorIndex),
    campoLabel: campo.slice(separatorIndex + 1),
  };
}

export function encodeHistoricoValorDepois(
  resolvedValue: string,
  observacao?: string | null,
): string {
  if (!observacao?.trim()) {
    return resolvedValue;
  }

  return `${resolvedValue}${HISTORICO_OBS_PREFIX}${observacao.trim()}`;
}

export function decodeHistoricoValorDepois(valorDepois: string): {
  resolvedValue: string;
  observacao: string | null;
} {
  const obsIndex = valorDepois.indexOf(HISTORICO_OBS_PREFIX);

  if (obsIndex === -1) {
    return { resolvedValue: valorDepois, observacao: null };
  }

  return {
    resolvedValue: valorDepois.slice(0, obsIndex),
    observacao: valorDepois.slice(obsIndex + HISTORICO_OBS_PREFIX.length) || null,
  };
}

export function resolveCampoAcceptedValue(params: {
  strategy: DivergenciaResolutionStrategy;
  valorBlFinal: string;
  valorGlobalSys: string;
  manualValue?: string | null;
}): string {
  switch (params.strategy) {
    case 'aceitar_bl_final':
      return params.valorBlFinal;
    case 'aceitar_globalsys':
      return params.valorGlobalSys;
    case 'manual':
      return params.manualValue?.trim() ?? '';
    default:
      return '';
  }
}

export function mapCampoResolutionDetail(params: {
  campo: BlDivergenciaCampo;
  historico?: BlHistoricoAlteracao | null;
}): DivergenciaCampoResolutionDetailDto {
  const strategy = CAMPO_STATUS_TO_STRATEGY[
    params.campo.Status as keyof typeof CAMPO_STATUS_TO_STRATEGY
  ] ?? null;

  const historicoParsed = params.historico
    ? decodeHistoricoValorDepois(params.historico.ValorDepois)
    : { resolvedValue: null, observacao: null };

  const resolvedValue =
    historicoParsed.resolvedValue ??
    (strategy
      ? resolveCampoAcceptedValue({
          strategy,
          valorBlFinal: params.campo.ValorBlFinal,
          valorGlobalSys: params.campo.ValorGlobalSys,
        })
      : null);

  return {
    campoKey: params.campo.CampoKey,
    campoLabel: params.campo.CampoLabel,
    status: params.campo.Status,
    resolutionStrategy: strategy,
    resolvedValue,
    valorBlFinal: params.campo.ValorBlFinal,
    valorGlobalSys: params.campo.ValorGlobalSys,
    observacao: historicoParsed.observacao,
    responsavelUserId: params.historico?.UserId ?? null,
    responsavelNome: params.historico?.Usuario ?? null,
    resolvedAt: params.historico?.CreatedAt.toISOString() ?? null,
  };
}

export function mapDivergenciaResolutionSummary(params: {
  divergencia: BlDivergencia;
  campos: BlDivergenciaCampo[];
}): DivergenciaResolutionSummaryDto {
  const pendingCampos = params.campos.filter((campo) => campo.Status === 'pendente').length;
  const resolvedCampos = params.campos.length - pendingCampos;

  return {
    divergenciaId: params.divergencia.Id,
    status: params.divergencia.Status,
    totalCampos: params.campos.length,
    pendingCampos,
    resolvedCampos,
    allResolved: params.campos.length === 0 || pendingCampos === 0,
    resolvedAt: params.divergencia.ResolvedAt?.toISOString() ?? null,
    resolvedByUserId: params.divergencia.ResolvedByUserId ?? null,
  };
}

export function mapDivergenciaResolveResponse(params: {
  divergencia: BlDivergencia & { campos: BlDivergenciaCampo[] };
  documentType: BlDocumentType;
  documentNumber: string;
  divergenciaDetail: DivergenciaLatestDetailDto;
  workflow: WorkflowSummaryDto | null;
  historicoByCampoKey: Map<string, BlHistoricoAlteracao | null>;
}): DivergenciaResolveResponseDto {
  return {
    summary: mapDivergenciaResolutionSummary({
      divergencia: params.divergencia,
      campos: params.divergencia.campos,
    }),
    divergencia: params.divergenciaDetail,
    workflow: params.workflow,
    campos: params.divergencia.campos.map((campo) =>
      mapCampoResolutionDetail({
        campo,
        historico: params.historicoByCampoKey.get(campo.CampoKey) ?? null,
      }),
    ),
  };
}
