import { getGlobalSysPool } from '../globalsys/client.js';
import {
  SQL_FIND_HOUSE_DIVERGENCIA,
  SQL_FIND_MASTER_DIVERGENCIA,
} from '../globalsys/globalsys-select.queries.js';
import {
  extractCargoRecordsFromHouseRows,
  extractNcmRecordsFromHouseRows,
  mapGlobalSysCargoRecord,
  mapGlobalSysHouseRecord,
  mapGlobalSysMasterRecord,
  mapGlobalSysNcmRecord,
} from '../mappers/globalsys-comparacao.mapper.js';
import type {
  GlobalSysCargoDto,
  GlobalSysHouseAggregateDto,
  GlobalSysHouseDto,
  GlobalSysMasterAggregateDto,
  GlobalSysMasterDto,
  GlobalSysNcmDto,
} from '../types/globalsys-comparacao.types.js';

export class GlobalSysComparacaoRepository {
  async loadMasterAggregate(numeroBL: string): Promise<GlobalSysMasterAggregateDto> {
    const master = await this.findMaster(numeroBL);

    return { master };
  }

  async loadHouseAggregate(numeroBL: string): Promise<GlobalSysHouseAggregateDto> {
    const rows = await this.queryHouseRows(numeroBL);
    const house = this.mapHouseFromRows(rows, numeroBL);
    const cargo = this.mapCargoFromRows(rows);
    const ncm = this.mapNcmFromRows(rows);

    return { house, cargo, ncm };
  }

  private async findMaster(numeroBL: string): Promise<GlobalSysMasterDto | null> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('MasterNumber', numeroBL);

    const result = await request.query<Record<string, unknown>>(
      SQL_FIND_MASTER_DIVERGENCIA,
    );
    const record = result.recordset[0] ?? null;

    if (!record) {
      return null;
    }

    return mapGlobalSysMasterRecord(record, numeroBL);
  }

  private mapHouseFromRows(
    rows: Record<string, unknown>[],
    numeroBL: string,
  ): GlobalSysHouseDto | null {
    const record = rows[0] ?? null;

    if (!record) {
      return null;
    }

    return mapGlobalSysHouseRecord(record, numeroBL);
  }

  private mapCargoFromRows(rows: Record<string, unknown>[]): GlobalSysCargoDto[] {
    return extractCargoRecordsFromHouseRows(rows).map(mapGlobalSysCargoRecord);
  }

  private mapNcmFromRows(rows: Record<string, unknown>[]): GlobalSysNcmDto[] {
    return extractNcmRecordsFromHouseRows(rows)
      .map(mapGlobalSysNcmRecord)
      .filter((item): item is GlobalSysNcmDto => item != null);
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

export const globalSysComparacaoRepository = new GlobalSysComparacaoRepository();
