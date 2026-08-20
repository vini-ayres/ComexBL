import {
  BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
  BL_FINAL_MASTER_GLOBALSYS_FIELDS,
} from './globalsys-comparison.constants.js';

/**
 * Campos do Master visíveis e validáveis na interface
 * (Apoio Humano, divergência DRAFT×FINAL e telas correlatas).
 */
export const MASTER_SCALAR_FIELDS = [
  { key: 'VesselName', label: 'Vessel Name' },
  { key: 'Voyage', label: 'Voyage' },
  { key: 'CarrierSCACCode', label: 'Carrier SCAC Code' },
  { key: 'CarrierName', label: 'Carrier Name' },
  { key: 'FreightTerm', label: 'Freight Term' },
  { key: 'ContainerNumber', label: 'Container Number' },
  { key: 'ContainerSealNo1', label: 'Container Seal No 1' },
  { key: 'ContainerType', label: 'Container Type' },
  { key: 'PackingQuantity', label: 'Packing Quantity' },
  { key: 'PackingQuantityUnitCode', label: 'Packing Quantity Unit Code' },
  { key: 'GrossWeight', label: 'Gross Weight' },
  { key: 'VolumeMeasure', label: 'Volume Measure' },
] as const;

/** Master no Apoio Humano: Packing Quantity Unit Code não entra na validação. */
export const APOIO_HUMANO_MASTER_SCALAR_FIELDS = MASTER_SCALAR_FIELDS.filter(
  (field) => field.key !== 'PackingQuantityUnitCode',
);

/**
 * Campos escalares do House visíveis e validáveis na interface.
 * Cargo (Brand, CounterMark, CargoType, HazardClass, UNNumber, Packaging)
 * e NcmCode entram pelas coleções correspondentes.
 */
export const HOUSE_SCALAR_FIELDS = [
  { key: 'ShipperName', label: 'Shipper Name' },
  { key: 'ConsigneeName', label: 'Consignee Name' },
  { key: 'NotifyName', label: 'Notify Name' },
  { key: 'DeliveryPortName', label: 'Delivery Port Name' },
  { key: 'ContainerNumber', label: 'Container Number' },
  { key: 'PackingQuantity', label: 'Packing Quantity' },
  { key: 'GrossWeight', label: 'Gross Weight' },
  { key: 'VolumeMeasure', label: 'Volume Measure' },
  { key: 'IssueDate', label: 'Issue Date' },
  { key: 'ItemName', label: 'Item Name' },
] as const;

export const CARGO_COMPARABLE_FIELDS = [
  'Brand',
  'CounterMark',
  'CargoType',
  'HazardClass',
  'UNNumber',
  'Packaging',
] as const;

export const CARGO_FIELD_LABELS: Record<(typeof CARGO_COMPARABLE_FIELDS)[number], string> = {
  Brand: 'Brand',
  CounterMark: 'Counter Mark',
  CargoType: 'Cargo Type',
  HazardClass: 'Hazard Class',
  UNNumber: 'UN Number',
  Packaging: 'Packaging',
};

export function isPresenceCampoKey(campoKey: string): boolean {
  return /(?:^|[._])__presence__?$/i.test(campoKey) || campoKey.includes('__presence__');
}

export type ComparisonStatus =
  | 'completo_sem_divergencia'
  | 'completo_com_divergencia'
  | 'documento_incompleto'
  | 'erro_comparacao';

export type DivergenciaCampoCategoria = 'master' | 'house' | 'cargo' | 'ncm';

const UI_CATEGORIAS: ReadonlySet<string> = new Set(['master', 'house', 'cargo', 'ncm']);

const HOUSE_LEAF_KEYS = new Set(
  BL_FINAL_HOUSE_GLOBALSYS_FIELDS.map((field) => field.blFinalKey),
);

const MASTER_LEAF_KEYS = new Set(
  BL_FINAL_MASTER_GLOBALSYS_FIELDS.map((field) => field.blFinalKey),
);

/**
 * Abas da tela de divergência só exibem master/house/cargo/ncm.
 * O motor canônico ainda emite general/container/party/port — inferimos a aba pelo path.
 */
export function resolveDivergenciaCampoCategoria(campoKey: string): DivergenciaCampoCategoria {
  if (campoKey.startsWith('house.') || campoKey.includes('.house.')) {
    return 'house';
  }

  if (campoKey.startsWith('cargo.') || campoKey.includes('.cargo.')) {
    return 'cargo';
  }

  if (campoKey.startsWith('ncm.') || campoKey.includes('.ncm.')) {
    return 'ncm';
  }

  const leaf = campoKey.split('.').pop() ?? campoKey;

  if (HOUSE_LEAF_KEYS.has(leaf)) {
    return 'house';
  }

  if (MASTER_LEAF_KEYS.has(leaf)) {
    return 'master';
  }

  return 'master';
}

export function mapPersistedDivergenciaCategoria(
  campoKey: string,
  rawCategoria: string | null | undefined,
): DivergenciaCampoCategoria {
  if (rawCategoria && UI_CATEGORIAS.has(rawCategoria)) {
    return rawCategoria as DivergenciaCampoCategoria;
  }

  return resolveDivergenciaCampoCategoria(campoKey);
}
