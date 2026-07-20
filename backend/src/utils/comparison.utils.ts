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

export function normalizeNcmCode(code: string): string {
  return code.trim().toUpperCase();
}
