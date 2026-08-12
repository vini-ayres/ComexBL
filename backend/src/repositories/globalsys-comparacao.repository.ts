import { getGlobalSysPool } from '../globalsys/client.js';
import {
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

const SQL_FIND_TB_BL = 'SELECT * FROM TB_BL WHERE NR_BL = @numeroBL';

const SQL_FIND_CARGA = `SELECT c.*
  FROM TB_CARGA_BL c
  INNER JOIN TB_BL b ON b.ID_BL = c.ID_BL
  WHERE b.NR_BL = @numeroBL`;

const SQL_FIND_NCM = `SELECT n.*
  FROM TB_BL_NCM n
  INNER JOIN TB_BL b ON b.ID_BL = n.ID_BL
  WHERE b.NR_BL = @numeroBL`;

export class GlobalSysComparacaoRepository {
  async loadMasterAggregate(numeroBL: string): Promise<GlobalSysMasterAggregateDto> {
    const master = await this.findMaster(numeroBL);

    return { master };
  }

  async loadHouseAggregate(numeroBL: string): Promise<GlobalSysHouseAggregateDto> {
    const [house, cargo, ncm] = await Promise.all([
      this.findHouse(numeroBL),
      this.findCargo(numeroBL),
      this.findNcm(numeroBL),
    ]);

    return { house, cargo, ncm };
  }

  private async findMaster(numeroBL: string): Promise<GlobalSysMasterDto | null> {
    const record = await this.findTbBlRecord(numeroBL);

    if (!record) {
      return null;
    }

    return mapGlobalSysMasterRecord(record, numeroBL);
  }

  private async findHouse(numeroBL: string): Promise<GlobalSysHouseDto | null> {
    const record = await this.findTbBlRecord(numeroBL);

    if (!record) {
      return null;
    }

    return mapGlobalSysHouseRecord(record, numeroBL);
  }

  private async findCargo(numeroBL: string): Promise<GlobalSysCargoDto[]> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBL);

    const result = await request.query<Record<string, unknown>>(SQL_FIND_CARGA);

    return (result.recordset ?? []).map(mapGlobalSysCargoRecord);
  }

  private async findNcm(numeroBL: string): Promise<GlobalSysNcmDto[]> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBL);

    const result = await request.query<Record<string, unknown>>(SQL_FIND_NCM);

    return (result.recordset ?? [])
      .map(mapGlobalSysNcmRecord)
      .filter((item): item is GlobalSysNcmDto => item != null);
  }

  private async findTbBlRecord(
    numeroBL: string,
  ): Promise<Record<string, unknown> | null> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBL);

    const result = await request.query<Record<string, unknown>>(SQL_FIND_TB_BL);

    return result.recordset[0] ?? null;
  }
}

export const globalSysComparacaoRepository = new GlobalSysComparacaoRepository();
