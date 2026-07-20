import { BadRequestError } from '../errors/AppError.js';
import type { DivergenciaResolutionStrategy } from '../constants/divergencia-resolution.constants.js';
import type {
  ResolveDivergenciaCampoRequestDto,
  ResolveDivergenciaRequestDto,
} from '../types/divergencia-resolution.types.js';

const RESOLUTION_STRATEGIES = new Set<DivergenciaResolutionStrategy>([
  'aceitar_bl_final',
  'aceitar_globalsys',
  'manual',
]);

function parseResolutionStrategy(value: unknown): DivergenciaResolutionStrategy {
  const strategy = String(value ?? '').trim() as DivergenciaResolutionStrategy;

  if (!RESOLUTION_STRATEGIES.has(strategy)) {
    throw new BadRequestError(
      'resolutionStrategy inválido. Use: aceitar_bl_final, aceitar_globalsys ou manual',
    );
  }

  return strategy;
}

function parseOptionalString(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function parseOptionalUserId(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestError('responsavelUserId inválido');
  }

  return parsed;
}

function parseManualValues(value: unknown): Record<string, string> | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestError('manualValues deve ser um objeto campoKey → valor');
  }

  const entries = Object.entries(value as Record<string, unknown>);

  return Object.fromEntries(
    entries.map(([key, val]) => [key, String(val ?? '').trim()]),
  );
}

export function parseResolveDivergenciaBody(body: unknown): ResolveDivergenciaRequestDto {
  const payload = (body ?? {}) as Record<string, unknown>;

  return {
    resolutionStrategy: parseResolutionStrategy(payload.resolutionStrategy),
    manualValues: parseManualValues(payload.manualValues),
    observacao: parseOptionalString(payload.observacao),
    responsavelUserId: parseOptionalUserId(payload.responsavelUserId),
    responsavelNome: parseOptionalString(payload.responsavelNome),
    resolvedAt: parseOptionalString(payload.resolvedAt),
  };
}

export function parseResolveDivergenciaCampoBody(
  body: unknown,
): ResolveDivergenciaCampoRequestDto {
  const payload = (body ?? {}) as Record<string, unknown>;

  return {
    resolutionStrategy: parseResolutionStrategy(payload.resolutionStrategy),
    manualValue: parseOptionalString(payload.manualValue),
    observacao: parseOptionalString(payload.observacao),
    responsavelUserId: parseOptionalUserId(payload.responsavelUserId),
    responsavelNome: parseOptionalString(payload.responsavelNome),
    resolvedAt: parseOptionalString(payload.resolvedAt),
  };
}
