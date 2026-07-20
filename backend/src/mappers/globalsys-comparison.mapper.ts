import {
  GLOBALSYS_TB_CARGA_BL_COLUMNS,
  GLOBALSYS_TB_BL_NCM_COLUMNS,
} from '../constants/globalsys-comparison.constants.js';
import type { BlFinalCargoDto, BlFinalHouseDto } from '../types/bl-final.types.js';
import type { GlobalSysBlRecord } from '../types/globalsys.types.js';
import type {
  GlobalSysCargoRecord,
  GlobalSysComparableCargo,
  GlobalSysComparableNcm,
  GlobalSysNcmRecord,
} from '../types/globalsys-comparison.types.js';

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

export function flattenBlFinalHouse(house: BlFinalHouseDto): Record<string, string | null> {
  return {
    shipperName: house.shipperName,
    consigneeName: house.consigneeName,
    notifyName: house.notifyName,
    loadingPortCode: house.loadingPortCode,
    loadingPortName: house.loadingPortName,
    dischargePortCode: house.dischargePortCode,
    dischargePortName: house.dischargePortName,
    grossWeight: house.grossWeight,
    volumeMeasure: house.volumeMeasure,
    packingQuantity:
      house.packingQuantity != null ? String(house.packingQuantity) : null,
    itemName: house.itemName,
    containerNumber: house.container.containerNumber,
    containerSealNo1: house.container.containerSealNo1,
    containerSealNo2: house.container.containerSealNo2,
    containerType: house.container.containerType,
    containerQty:
      house.container.containerQty != null
        ? String(house.container.containerQty)
        : null,
    containerGwt: house.container.containerGwt,
    containerCbm: house.container.containerCbm,
  };
}

export function readGlobalSysBlField(
  record: GlobalSysBlRecord | null,
  column: string,
): string | null {
  if (!record) {
    return null;
  }

  return readColumnValue(record, column);
}

export function mapGlobalSysCargoRecord(
  record: GlobalSysCargoRecord,
  index: number,
): GlobalSysComparableCargo {
  const mapped: Record<string, string | null> = {};

  for (const { column, apiKey } of GLOBALSYS_TB_CARGA_BL_COLUMNS) {
    mapped[apiKey] = readColumnValue(record, column);
  }

  return {
    Id: index + 1,
    Brand: mapped.brand ?? null,
    CounterMark: mapped.counterMark ?? null,
    CargoType: mapped.cargoType ?? null,
    HazardClass: mapped.hazardClass ?? null,
    UNNumber: mapped.unNumber ?? null,
    Packaging: mapped.packaging ?? null,
  };
}

export function mapGlobalSysNcmRecord(record: GlobalSysNcmRecord): GlobalSysComparableNcm | null {
  const ncmCode = readFirstColumnValue(record, [
    GLOBALSYS_TB_BL_NCM_COLUMNS[0].column,
    'NR_NCM',
    'NCM',
  ]);

  if (!ncmCode) {
    return null;
  }

  return { NcmCode: ncmCode };
}

export function blFinalCargoToComparable(
  cargo: BlFinalCargoDto,
  index: number,
): GlobalSysComparableCargo {
  return {
    Id: index + 1,
    Brand: cargo.brand,
    CounterMark: cargo.counterMark,
    CargoType: cargo.cargoType,
    HazardClass: cargo.hazardClass,
    UNNumber: cargo.unNumber,
    Packaging: cargo.packaging,
  };
}

export function blFinalNcmsToComparable(ncms: string[]): GlobalSysComparableNcm[] {
  return ncms.map((ncmCode) => ({ NcmCode: ncmCode }));
}
