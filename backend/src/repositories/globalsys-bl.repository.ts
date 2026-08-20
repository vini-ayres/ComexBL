import { getGlobalSysPool } from '../globalsys/client.js';
import {
  SQL_FIND_CARGA,
  SQL_FIND_HOUSE_DIVERGENCIA,
  SQL_FIND_MASTER_DIVERGENCIA,
  SQL_FIND_NCM,
  SQL_FIND_TB_BL,
} from '../globalsys/globalsys-select.queries.js';
import {
  extractCargoRecordsFromHouseRows,
  extractNcmRecordsFromHouseRows,
} from '../mappers/globalsys-comparacao.mapper.js';
import type { GlobalSysConsultaResult } from '../types/globalsys.types.js';
import type {
  GlobalSysBlBundle,
  GlobalSysCargoRecord,
  GlobalSysNcmRecord,
} from '../types/globalsys-comparison.types.js';

export class GlobalSysBlRepository {
  async findByNumeroBl(numeroBl: string): Promise<GlobalSysConsultaResult> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBl);

    const result = await request.query(SQL_FIND_TB_BL);
    const record = result.recordset[0] ?? null;

    return {
      found: record != null,
      numeroBl,
      record,
    };
  }

  async findCargaByNumeroBl(numeroBl: string): Promise<GlobalSysCargoRecord[]> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBl);

    const result = await request.query<GlobalSysCargoRecord>(SQL_FIND_CARGA);

    return result.recordset ?? [];
  }

  async findNcmByNumeroBl(numeroBl: string): Promise<GlobalSysNcmRecord[]> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBl);

    const result = await request.query<GlobalSysNcmRecord>(SQL_FIND_NCM);

    return result.recordset ?? [];
  }

  async findMasterBundle(
    masterNumber: string,
    containerNumber?: string | null,
  ): Promise<GlobalSysBlBundle> {
    const rows = await this.queryMasterRows(masterNumber);
    const record = this.pickMasterRecord(rows, containerNumber);

    return {
      numeroBl: masterNumber,
      blFound: rows.length > 0,
      blRecord: record,
      cargos: [],
      ncms: [],
    };
  }

  async findHouseBundle(houseNumber: string): Promise<GlobalSysBlBundle> {
    const rows = await this.queryHouseRows(houseNumber);
    const record = rows[0] ?? null;

    return {
      numeroBl: houseNumber,
      blFound: record != null,
      blRecord: record,
      cargos: extractCargoRecordsFromHouseRows(rows),
      ncms: extractNcmRecordsFromHouseRows(rows),
    };
  }

  async findBundleByNumeroBl(
    numeroBl: string,
    kind: 'Master' | 'House' = 'House',
  ): Promise<GlobalSysBlBundle> {
    if (kind === 'Master') {
      return this.findMasterBundle(numeroBl);
    }

    return this.findHouseBundle(numeroBl);
  }

  private pickMasterRecord(
    rows: Record<string, unknown>[],
    containerNumber?: string | null,
  ): Record<string, unknown> | null {
    if (rows.length === 0) {
      return null;
    }

    const expected = containerNumber?.trim();
    if (!expected) {
      return rows[0] ?? null;
    }

    const matched = rows.find((row) => {
      const value = row.ContainerNumber ?? row.NR_CNTR;
      return value != null && String(value).trim() === expected;
    });

    return matched ?? rows[0] ?? null;
  }

  private async queryMasterRows(
    masterNumber: string,
  ): Promise<Record<string, unknown>[]> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('MasterNumber', masterNumber);

    const result = await request.query<Record<string, unknown>>(
      SQL_FIND_MASTER_DIVERGENCIA,
    );

    return result.recordset ?? [];
  }

  private async queryHouseRows(
    houseNumber: string,
  ): Promise<Record<string, unknown>[]> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('HouseNumber', houseNumber);

    const result = await request.query<Record<string, unknown>>(
      SQL_FIND_HOUSE_DIVERGENCIA,
    );

    return result.recordset ?? [];
  }
}

export const globalSysBlRepository = new GlobalSysBlRepository();
