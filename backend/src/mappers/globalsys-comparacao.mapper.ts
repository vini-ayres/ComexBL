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
  const value = record[column];

  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
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

function mapFieldsFromRecord(
  record: Record<string, unknown>,
  fields: readonly { blFinalKey: string; globalSysColumn: string }[],
): Record<string, string | null> {
  const mapped: Record<string, string | null> = {};

  for (const { blFinalKey, globalSysColumn } of fields) {
    mapped[blFinalKey] = readColumnValue(record, globalSysColumn);
  }

  return mapped;
}

export function mapGlobalSysMasterRecord(
  record: Record<string, unknown>,
  numeroBl: string,
): GlobalSysMasterDto {
  const mapped = mapFieldsFromRecord(record, BL_FINAL_MASTER_GLOBALSYS_FIELDS);

  return {
    numeroBl: readColumnValue(record, 'NR_BL') ?? numeroBl,
    referenceNumber: mapped.referenceNumber ?? null,
    vesselName: mapped.vesselName ?? null,
    voyage: mapped.voyage ?? null,
    loadingPortCode: mapped.loadingPortCode ?? null,
    loadingPortName: mapped.loadingPortName ?? null,
    dischargePortCode: mapped.dischargePortCode ?? null,
    dischargePortName: mapped.dischargePortName ?? null,
    shipperName: mapped.shipperName ?? null,
    consigneeName: mapped.consigneeName ?? null,
    grossWeight: mapped.grossWeight ?? null,
    volumeMeasure: mapped.volumeMeasure ?? null,
    containerNumber: mapped.containerNumber ?? null,
  };
}

export function mapGlobalSysHouseRecord(
  record: Record<string, unknown>,
  numeroBl: string,
): GlobalSysHouseDto {
  const mapped = mapFieldsFromRecord(record, BL_FINAL_HOUSE_GLOBALSYS_FIELDS);

  return {
    numeroBl: readColumnValue(record, 'NR_BL') ?? numeroBl,
    shipperName: mapped.shipperName ?? null,
    consigneeName: mapped.consigneeName ?? null,
    notifyName: mapped.notifyName ?? null,
    loadingPortCode: mapped.loadingPortCode ?? null,
    loadingPortName: mapped.loadingPortName ?? null,
    dischargePortCode: mapped.dischargePortCode ?? null,
    dischargePortName: mapped.dischargePortName ?? null,
    grossWeight: mapped.grossWeight ?? null,
    volumeMeasure: mapped.volumeMeasure ?? null,
    itemName: mapped.itemName ?? null,
    containerNumber: mapped.containerNumber ?? null,
  };
}

export function mapGlobalSysCargoRecord(
  record: Record<string, unknown>,
): GlobalSysCargoDto {
  const mapped: Record<string, string | null> = {};

  for (const { column, apiKey } of GLOBALSYS_TB_CARGA_BL_COLUMNS) {
    mapped[apiKey] = readColumnValue(record, column);
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
    'NR_NCM',
    'NCM',
  ]);

  if (!ncmCode) {
    return null;
  }

  return { ncmCode };
}
