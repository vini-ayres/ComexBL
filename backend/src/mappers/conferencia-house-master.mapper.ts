import type { BlConferencia, BlConferenciaCampo, BlHistoricoAlteracao } from '@prisma/client';
import {
  CAMPO_STATUS_TO_STRATEGY,
  CONFERENCIA_HEADER_STATUS,
  type ConferenciaCategoria,
  type ConferenciaResolutionStrategy,
} from '../constants/conferencia-house-master.constants.js';
import type { BlVersion } from '../constants/bl-version.constants.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import type {
  ConferenciaCampoDto,
  ConferenciaCampoResolutionDetailDto,
  ConferenciaComparisonResult,
  ConferenciaCounterpartDto,
  ConferenciaLatestDetailDto,
  ConferenciaPersistResult,
  ConferenciaResolutionSummaryDto,
  ConferenciaResolveResponseDto,
} from '../types/conferencia-house-master.types.js';
import type { WorkflowSummaryDto } from '../types/workflow.types.js';

const HISTORICO_CAMPO_SEPARATOR = '|';
const HISTORICO_OBS_PREFIX = '|obs:';

export const CONFERENCIA_ORIGIN = {
  left: 'House',
  right: 'Master',
  label: 'House × Master',
} as const;

export function mapConferenciaCampo(campo: BlConferenciaCampo): ConferenciaCampoDto {
  return {
    id: campo.Id,
    campoKey: campo.CampoKey,
    campoLabel: campo.CampoLabel,
    valorHouse: campo.ValorHouse,
    valorMaster: campo.ValorMaster,
    valorManual: campo.ValorManual,
    status: campo.Status,
    categoria: campo.Categoria as ConferenciaCategoria,
  };
}

export function mapConferenciaLatestDetail(params: {
  conferencia: BlConferencia & { campos: BlConferenciaCampo[] };
  documentType: BlDocumentType;
  documentNumber: string;
  counterpart: ConferenciaCounterpartDto;
  workflow: WorkflowSummaryDto | null;
}): ConferenciaLatestDetailDto {
  const pendingCount = params.conferencia.campos.filter(
    (campo) => campo.Status === 'pendente',
  ).length;

  return {
    id: params.conferencia.Id,
    documentType: params.documentType,
    documentNumber: params.documentNumber,
    status: params.conferencia.Status,
    createdAt: params.conferencia.CreatedAt.toISOString(),
    updatedAt: params.conferencia.UpdatedAt.toISOString(),
    resolvedAt: params.conferencia.ResolvedAt?.toISOString() ?? null,
    campos: params.conferencia.campos.map(mapConferenciaCampo),
    comparisonStatus:
      params.conferencia.Status === CONFERENCIA_HEADER_STATUS.SEM_DIVERGENCIA
        ? 'completo_sem_divergencia'
        : pendingCount > 0
          ? 'completo_com_divergencia'
          : 'completo_sem_divergencia',
    comparisonDate: params.conferencia.UpdatedAt.toISOString(),
    origin: CONFERENCIA_ORIGIN,
    counterpart: params.counterpart,
    workflow: params.workflow,
  };
}

export function mapConferenciaPersist(
  result: ConferenciaComparisonResult,
  extras: {
    conferenciaId: number | null;
    conferenciaStatus: string | null;
    workflow: WorkflowSummaryDto | null;
  },
): ConferenciaPersistResult {
  return {
    ...result,
    conferenciaId: extras.conferenciaId,
    conferenciaStatus: extras.conferenciaStatus,
    workflow: extras.workflow,
  };
}

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

export function mapConferenciaCampoResolutionDetail(params: {
  campo: BlConferenciaCampo;
  historico?: BlHistoricoAlteracao | null;
}): ConferenciaCampoResolutionDetailDto {
  const decoded = params.historico
    ? decodeHistoricoValorDepois(params.historico.ValorDepois)
    : { resolvedValue: params.campo.ValorManual ?? null, observacao: null };

  return {
    campoKey: params.campo.CampoKey,
    campoLabel: params.campo.CampoLabel,
    status: params.campo.Status,
    resolutionStrategy:
      (CAMPO_STATUS_TO_STRATEGY[
        params.campo.Status as keyof typeof CAMPO_STATUS_TO_STRATEGY
      ] as ConferenciaResolutionStrategy | undefined) ?? null,
    resolvedValue: decoded.resolvedValue,
    valorHouse: params.campo.ValorHouse,
    valorMaster: params.campo.ValorMaster,
    observacao: decoded.observacao,
    responsavelUserId: params.historico?.UserId ?? null,
    responsavelNome: params.historico?.Usuario ?? null,
    resolvedAt: params.historico?.CreatedAt.toISOString() ?? null,
  };
}

export function mapConferenciaResolveResponse(params: {
  conferencia: BlConferencia & { campos: BlConferenciaCampo[] };
  conferenciaDetail: ConferenciaLatestDetailDto;
  workflow: WorkflowSummaryDto | null;
  historicoByCampoKey: Map<string, BlHistoricoAlteracao | null>;
}): ConferenciaResolveResponseDto {
  const pendingCampos = params.conferencia.campos.filter(
    (campo) => campo.Status === 'pendente',
  ).length;
  const resolvedCampos = params.conferencia.campos.length - pendingCampos;

  const summary: ConferenciaResolutionSummaryDto = {
    conferenciaId: params.conferencia.Id,
    status: params.conferencia.Status,
    totalCampos: params.conferencia.campos.length,
    pendingCampos,
    resolvedCampos,
    allResolved: pendingCampos === 0,
    resolvedAt: params.conferencia.ResolvedAt?.toISOString() ?? null,
    resolvedByUserId: params.conferencia.ResolvedByUserId,
  };

  return {
    summary,
    conferencia: params.conferenciaDetail,
    workflow: params.workflow,
    campos: params.conferencia.campos.map((campo) =>
      mapConferenciaCampoResolutionDetail({
        campo,
        historico: params.historicoByCampoKey.get(campo.CampoKey),
      }),
    ),
  };
}

export function emptyCounterpart(blVersion: BlVersion): ConferenciaCounterpartDto {
  return {
    masterNumber: null,
    houseNumbers: [],
    blVersion,
    houseAggregate: false,
    missingMaster: true,
    missingHouse: true,
  };
}

export function buildConferenciaDocumento(params: {
  tipo: 'Master' | 'House';
  numeroBl: string;
  fileName: string | null | undefined;
  blVersion: string;
}): {
  tipo: 'Master' | 'House';
  numeroBl: string;
  nome: string;
  origemPath: string;
  fileName: string | null;
  blVersion: string;
} {
  const fileName = params.fileName?.trim() || null;

  return {
    tipo: params.tipo,
    numeroBl: params.numeroBl,
    nome: fileName || `${params.numeroBl}_original.pdf`,
    origemPath: fileName ? `files/${fileName}` : 'files/pendentes',
    fileName,
    blVersion: params.blVersion,
  };
}
