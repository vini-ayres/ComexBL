import {
  BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
  BL_FINAL_MASTER_GLOBALSYS_FIELDS,
  GLOBALSYS_TB_BL_NCM_COLUMNS,
  GLOBALSYS_TB_CARGA_BL_COLUMNS,
} from '../constants/globalsys-comparison.constants.js';
import type {
  GlobalSysCargoDto,
  GlobalSysHouseDto,
  GlobalSysMasterDto,
  GlobalSysNcmDto,
} from '../types/globalsys-comparacao.types.js';

function readColumnValue(
  record: Record<string, unknown>,
  column: string,
): string | null {
  let value = record[column];

  if (value === undefined) {
    const match = Object.keys(record).find(
      (key) => key.toLowerCase() === column.toLowerCase(),
    );
    value = match != null ? record[match] : undefined;
  }

  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function readFirstColumnValue(
  record: Record<string, unknown>,
  columns: readonly string[],
): string | null {
  for (const column of columns) {
    const value = readColumnValue(record, column);
    if (value != null) {
      return value;
    }
  }

  return null;
}

const MASTER_COLUMN_FALLBACKS: Record<string, readonly string[]> = {
  vesselName: ['VesselName', 'NM_NAVIO'],
  voyage: ['Voyage', 'NR_VIAGEM'],
  carrierName: ['CarrierName', 'NM_TRANSPORTADOR'],
  carrierScacCode: ['CarrierSCACCode', 'CD_SCAC'],
  freightTerm: ['FreightTerm', 'NM_TIPO_PAGAMENTO', 'CD_TIPO_PAGAMENTO'],
  containerNumber: ['ContainerNumber', 'NR_CNTR'],
  containerSealNo1: ['ContainerSealNo1', 'NR_LACRE'],
  containerType: ['ContainerType', 'NM_TIPO_CONTAINER'],
  packingQuantity: ['PackingQuantity', 'QT_MERCADORIA'],
  packingQuantityUnitCode: ['PackingQuantityUnitCode', 'NM_UNIDADE_EMBALAGEM'],
  grossWeight: ['GrossWeight', 'VL_PESO_BRUTO'],
  volumeMeasure: ['VolumeMeasure', 'VL_M3'],
};

const HOUSE_COLUMN_FALLBACKS: Record<string, readonly string[]> = {
  shipperName: ['ShipperName', 'NM_SHIPPER'],
  consigneeName: ['ConsigneeName', 'NM_CONSIGNEE'],
  notifyName: ['NotifyName', 'NM_NOTIFY'],
  deliveryPortName: ['DeliveryPortName', 'NM_DESTINO_FINAL'],
  packingQuantity: ['PackingQuantity', 'QT_MERCADORIA'],
  grossWeight: ['GrossWeight', 'VL_PESO_BRUTO'],
  volumeMeasure: ['VolumeMeasure', 'VL_M3'],
  itemName: ['ItemName', 'DS_MERCADORIA'],
  issueDate: ['IssueDate', 'DT_EMISSAO_BL'],
  containerNumber: ['ContainerNumber', 'NR_CNTR'],
};

const CARGO_COLUMN_FALLBACKS: Record<string, readonly string[]> = {
  brand: ['Brand', 'MARCA'],
  counterMark: ['ConterMark', 'CounterMark', 'CONTRAMARCA'],
  cargoType: ['CargoType', 'NM_TIPO_CARGA'],
  hazardClass: ['HazardClass', 'CLASSE_PERIGO'],
  unNumber: ['UNNumber', 'COD_CARGA_PERIGOSA'],
  packaging: ['Packaging', 'NM_EMBALAGEM', 'NM_MERCADORIA'],
};

const HOUSE_CARGO_PRESENCE_COLUMNS = [
  ...Object.values(CARGO_COLUMN_FALLBACKS).flat(),
  'ItemName',
  'DS_MERCADORIA',
] as const;

function mapFieldsFromRecord(
  record: Record<string, unknown>,
  fields: readonly { blFinalKey: string; globalSysColumn: string }[],
  fallbacks: Record<string, readonly string[]>,
): Record<string, string | null> {
  const mapped: Record<string, string | null> = {};

  for (const { blFinalKey, globalSysColumn } of fields) {
    mapped[blFinalKey] = readFirstColumnValue(record, [
      globalSysColumn,
      ...(fallbacks[blFinalKey] ?? []),
    ]);
  }

  return mapped;
}

export function mapGlobalSysMasterRecord(
  record: Record<string, unknown>,
  numeroBl: string,
): GlobalSysMasterDto {
  const mapped = mapFieldsFromRecord(
    record,
    BL_FINAL_MASTER_GLOBALSYS_FIELDS,
    MASTER_COLUMN_FALLBACKS,
  );

  return {
    numeroBl:
      readFirstColumnValue(record, ['MasterNumber', 'NR_BL']) ?? numeroBl,
    referenceNumber: readColumnValue(record, 'REFERENCIA_EDI'),
    vesselName: mapped.vesselName ?? null,
    voyage: mapped.voyage ?? null,
    carrierName: mapped.carrierName ?? null,
    carrierScacCode: mapped.carrierScacCode ?? null,
    freightTerm: mapped.freightTerm ?? null,
    loadingPortCode: readColumnValue(record, 'CD_PORTO_ORIGEM'),
    loadingPortName: readColumnValue(record, 'NM_PORTO_ORIGEM'),
    dischargePortCode: readColumnValue(record, 'CD_PORTO_DESTINO'),
    dischargePortName: readColumnValue(record, 'NM_PORTO_DESTINO'),
    shipperName: readFirstColumnValue(record, ['ShipperName', 'NM_SHIPPER']),
    consigneeName: readFirstColumnValue(record, [
      'ConsigneeName',
      'NM_CONSIGNEE',
    ]),
    packingQuantity: readFirstColumnValue(
      record,
      MASTER_COLUMN_FALLBACKS.packingQuantity,
    ),
    packingQuantityUnitCode: readFirstColumnValue(
      record,
      MASTER_COLUMN_FALLBACKS.packingQuantityUnitCode,
    ),
    grossWeight: readFirstColumnValue(
      record,
      MASTER_COLUMN_FALLBACKS.grossWeight,
    ),
    volumeMeasure: readFirstColumnValue(
      record,
      MASTER_COLUMN_FALLBACKS.volumeMeasure,
    ),
    containerNumber: mapped.containerNumber ?? null,
    containerSealNo1: mapped.containerSealNo1 ?? null,
    containerType: mapped.containerType ?? null,
  };
}

export function mapGlobalSysHouseRecord(
  record: Record<string, unknown>,
  numeroBl: string,
): GlobalSysHouseDto {
  const mapped = mapFieldsFromRecord(
    record,
    BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
    HOUSE_COLUMN_FALLBACKS,
  );

  return {
    numeroBl:
      readFirstColumnValue(record, ['HouseNumber', 'NR_BL']) ?? numeroBl,
    shipperName: mapped.shipperName ?? null,
    consigneeName: mapped.consigneeName ?? null,
    notifyName: mapped.notifyName ?? null,
    loadingPortCode: readColumnValue(record, 'CD_PORTO_ORIGEM'),
    loadingPortName: readColumnValue(record, 'NM_PORTO_ORIGEM'),
    dischargePortCode: readColumnValue(record, 'CD_PORTO_DESTINO'),
    dischargePortName: readColumnValue(record, 'NM_PORTO_DESTINO'),
    deliveryPortName: mapped.deliveryPortName ?? null,
    packingQuantity: mapped.packingQuantity ?? null,
    grossWeight: mapped.grossWeight ?? null,
    volumeMeasure: mapped.volumeMeasure ?? null,
    itemName: mapped.itemName ?? null,
    issueDate: mapped.issueDate ?? null,
    containerNumber: readFirstColumnValue(
      record,
      HOUSE_COLUMN_FALLBACKS.containerNumber,
    ),
  };
}

export function mapGlobalSysCargoRecord(
  record: Record<string, unknown>,
): GlobalSysCargoDto {
  const mapped: Record<string, string | null> = {};

  for (const { column, apiKey } of GLOBALSYS_TB_CARGA_BL_COLUMNS) {
    mapped[apiKey] = readFirstColumnValue(record, [
      column,
      ...(CARGO_COLUMN_FALLBACKS[apiKey] ?? []),
    ]);
  }

  return {
    brand: mapped.brand ?? null,
    counterMark: mapped.counterMark ?? null,
    cargoType: mapped.cargoType ?? null,
    hazardClass: mapped.hazardClass ?? null,
    unNumber: mapped.unNumber ?? null,
    packaging: mapped.packaging ?? null,
  };
}

export function mapGlobalSysNcmRecord(
  record: Record<string, unknown>,
): GlobalSysNcmDto | null {
  const ncmCode = readFirstColumnValue(record, [
    GLOBALSYS_TB_BL_NCM_COLUMNS[0].column,
    'CD_NCM',
    'NR_NCM',
    'NCM',
  ]);

  if (!ncmCode) {
    return null;
  }

  return { ncmCode };
}

export function extractCargoRecordsFromHouseRows(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.filter((row) =>
    HOUSE_CARGO_PRESENCE_COLUMNS.some(
      (column) => readColumnValue(row, column) != null,
    ),
  );
}

export function extractNcmRecordsFromHouseRows(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (rows.length === 0) {
    return [];
  }

  const aggregated = readFirstColumnValue(rows[0], [
    GLOBALSYS_TB_BL_NCM_COLUMNS[0].column,
    'CD_NCM',
  ]);

  if (!aggregated) {
    return [];
  }

  const uniqueCodes = [
    ...new Set(
      aggregated
        .split(',')
        .map((code) => code.trim())
        .filter((code) => code.length > 0),
    ),
  ];

  return uniqueCodes.map((ncmCode) => ({ NcmCode: ncmCode, CD_NCM: ncmCode }));
}
