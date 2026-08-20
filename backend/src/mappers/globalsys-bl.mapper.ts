import { GLOBALSYS_TB_BL_COLUMNS } from '../constants/globalsys-bl.constants.js';
import type { GlobalSysBlRecord } from '../types/globalsys.types.js';
import type { GlobalSysBlLookupDto } from '../types/globalsys-api.types.js';

function readColumnValue(
  record: GlobalSysBlRecord,
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

export function mapGlobalSysBlRecord(
  record: GlobalSysBlRecord | null,
): GlobalSysBlLookupDto | null {
  if (!record) {
    return null;
  }

  const mapped = {} as GlobalSysBlLookupDto;

  for (const { column, apiKey } of GLOBALSYS_TB_BL_COLUMNS) {
    mapped[apiKey] = readColumnValue(record, column);
  }

  return mapped;
}

export function createEmptyGlobalSysBlLookup(): GlobalSysBlLookupDto {
  return {
    numeroBl: null,
    referenciaEdi: null,
    vesselName: null,
    voyage: null,
    loadingPortCode: null,
    loadingPortName: null,
    dischargePortCode: null,
    dischargePortName: null,
    consigneeName: null,
    shipperName: null,
    grossWeight: null,
    volume: null,
    containerNumber: null,
  };
}
