import type { ComparisonStatus } from '../constants/bl-comparison.constants.js';
import {
  COMPARISON_ORIGIN_BY_KIND,
  type ComparisonKind,
  type ComparisonOriginDto,
} from '../constants/comparison-kind.constants.js';
import {
  BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
  BL_FINAL_MASTER_GLOBALSYS_FIELDS,
} from '../constants/globalsys-comparison.constants.js';

const GLOBALSYS_SCALAR_KEYS = new Set<string>([
  ...BL_FINAL_MASTER_GLOBALSYS_FIELDS.map((field) => field.blFinalKey),
  ...BL_FINAL_HOUSE_GLOBALSYS_FIELDS.map((field) => field.blFinalKey),
]);

function getLeafCampoKey(campoKey: string): string {
  const parts = campoKey.split('.');
  return parts[parts.length - 1] ?? campoKey;
}

function isCargoOrNcmCampoKey(campoKey: string): boolean {
  return campoKey.includes('.cargo.') || campoKey.includes('.ncm.');
}

/**
 * Infere o tipo de comparação a partir das chaves persistidas em BL_DivergenciaCampo.
 *
 * DRAFT×FINAL usa campoKey PascalCase (ex.: ReferenceNumber, house.123.ShipperName).
 * BL Final×GlobalSys usa campoKey camelCase (ex.: referenceNumber, house.123.shipperName).
 *
 * Campos de carga/NCM compartilham a mesma convenção nos dois fluxos; nesses casos
 * usa-se workflow.pendencia como fallback.
 */
export function inferComparisonKindFromCampoKeys(
  campoKeys: string[],
): ComparisonKind | null {
  let draftFinalSignals = 0;
  let globalSysSignals = 0;

  for (const campoKey of campoKeys) {
    if (isCargoOrNcmCampoKey(campoKey)) {
      continue;
    }

    const leafKey = getLeafCampoKey(campoKey);

    if (leafKey === '__presence__') {
      continue;
    }

    if (/^[a-z]/.test(leafKey) || GLOBALSYS_SCALAR_KEYS.has(leafKey)) {
      globalSysSignals += 1;
      continue;
    }

    if (/^[A-Z]/.test(leafKey)) {
      draftFinalSignals += 1;
    }
  }

  if (globalSysSignals > draftFinalSignals) {
    return 'GLOBALSYS';
  }

  if (draftFinalSignals > globalSysSignals) {
    return 'DRAFT_FINAL';
  }

  return null;
}

export function inferComparisonKindFromPendencia(
  pendencia: string | null | undefined,
): ComparisonKind | null {
  if (!pendencia) {
    return null;
  }

  if (/GlobalSys|BL Final/i.test(pendencia)) {
    return 'GLOBALSYS';
  }

  if (/DRAFT.*FINAL|DRAFT\/FINAL/i.test(pendencia)) {
    return 'DRAFT_FINAL';
  }

  return null;
}

export function inferComparisonKind(params: {
  campoKeys: string[];
  workflowPendencia?: string | null;
}): ComparisonKind | null {
  const fromCampoKeys = inferComparisonKindFromCampoKeys(params.campoKeys);

  if (fromCampoKeys) {
    return fromCampoKeys;
  }

  return inferComparisonKindFromPendencia(params.workflowPendencia);
}

export function resolveComparisonOrigin(
  comparisonKind: ComparisonKind | null,
): ComparisonOriginDto | null {
  if (!comparisonKind) {
    return null;
  }

  return COMPARISON_ORIGIN_BY_KIND[comparisonKind];
}

/** Deriva ComparisonStatus a partir do registro persistido (sem reexecutar comparação). */
export function deriveComparisonStatusFromPersisted(params: {
  divergenciaStatus: string;
  campoCount: number;
}): ComparisonStatus {
  if (params.divergenciaStatus === 'sem_divergencia') {
    return 'completo_sem_divergencia';
  }

  if (params.campoCount > 0) {
    return 'completo_com_divergencia';
  }

  return 'completo_sem_divergencia';
}
