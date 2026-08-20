import type { BlHouseCargo } from '@prisma/client';

export function serializeComparisonValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'object' && 'toString' in value) {
    return String(value);
  }

  return String(value);
}

export function valuesDiverge(
  draft: string | null,
  finalValue: string | null,
): boolean {
  const normalizedDraft = normalizeComparisonValue(draft);
  const normalizedFinal = normalizeComparisonValue(finalValue);
  return normalizedDraft !== normalizedFinal;
}

function normalizeFreightTerm(value: string): string | null {
  const upper = value.trim().toUpperCase();

  if (upper === 'P' || upper === 'PREPAID') {
    return 'PREPAID';
  }

  if (upper === 'C' || upper === 'COLLECT') {
    return 'COLLECT';
  }

  return null;
}

export function normalizeComparedFieldValue(
  campoKey: string,
  value: unknown,
): string | null {
  const serialized = serializeComparisonValue(value);

  if (serialized == null) {
    return null;
  }

  const trimmed = serialized.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const leaf = campoKey.split('.').pop() ?? campoKey;

  if (leaf === 'freightTerm') {
    return normalizeFreightTerm(trimmed) ?? trimmed;
  }

  return trimmed.replace(/\s+/g, ' ');
}

function normalizeComparisonValue(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type CargoLogicalKeySource = Pick<
  BlHouseCargo,
  'Id' | 'Brand' | 'CounterMark' | 'CargoType' | 'HazardClass' | 'UNNumber'
>;

/** Chave lógica de cargo: prioriza identidade hazmat, depois marca/contramarcas. */
export function buildCargoLogicalKey(cargo: CargoLogicalKeySource): string {
  const hazard = normalizeComparisonValue(cargo.HazardClass);
  const un = normalizeComparisonValue(cargo.UNNumber);

  if (hazard || un) {
    return `hazmat:${hazard ?? ''}|${un ?? ''}`;
  }

  const brand = normalizeComparisonValue(cargo.Brand);
  const counterMark = normalizeComparisonValue(cargo.CounterMark);
  const cargoType = normalizeComparisonValue(cargo.CargoType);

  if (brand || counterMark || cargoType) {
    return `cargo:${brand ?? ''}|${counterMark ?? ''}|${cargoType ?? ''}`;
  }

  return `cargo:id:${cargo.Id}`;
}

/** Título legível para exibição de um item de cargo (Apoio Humano, divergências, etc.). */
export function formatCargoDisplayTitle(
  cargo: CargoLogicalKeySource,
  index: number,
): string {
  const hazard = normalizeComparisonValue(cargo.HazardClass);
  const un = normalizeComparisonValue(cargo.UNNumber);
  const brand = normalizeComparisonValue(cargo.Brand);
  const counterMark = normalizeComparisonValue(cargo.CounterMark);
  const cargoType = normalizeComparisonValue(cargo.CargoType);
  const ordinal = index + 1;

  if (hazard || un) {
    const hazmatParts = [
      hazard ? `Classe ${hazard}` : null,
      un ? `UN ${un}` : null,
    ].filter(Boolean);

    return `Cargo ${ordinal} · Perigoso · ${hazmatParts.join(' · ')}`;
  }

  const identityParts = [
    brand ? `Marca ${brand}` : null,
    counterMark ? `Contramarca ${counterMark}` : null,
    cargoType,
  ].filter(Boolean);

  if (identityParts.length > 0) {
    return `Cargo ${ordinal} · ${identityParts.join(' · ')}`;
  }

  return `Cargo ${ordinal}`;
}

export function normalizeNcmCode(code: string): string {
  return code.trim().toUpperCase();
}

const CARGO_CAMPO_TOKEN_MAX_LENGTH = 24;

/**
 * Token curto e estável para CampoKey persistido.
 * A chave lógica completa (ex.: cargo:||LASER TUBE CUTTING MACHINE...) estoura
 * VARCHAR e faz Brand/CounterMark/etc. colidirem após truncamento.
 */
export function compactCargoKeyToken(logicalKey: string): string {
  const normalized = logicalKey.trim();

  if (
    normalized.length > 0 &&
    normalized.length <= CARGO_CAMPO_TOKEN_MAX_LENGTH &&
    /^[A-Za-z0-9:_|-]+$/.test(normalized)
  ) {
    return normalized;
  }

  return `h${fnv1a32Hex(normalized)}`;
}

export function buildCargoCampoKey(
  prefix: string,
  logicalKey: string,
  field: string,
): string {
  return `${prefix}cargo.${compactCargoKeyToken(logicalKey)}.${field}`;
}

function fnv1a32Hex(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
