import { getGlobalSysPool } from '../globalsys/client.js';
import type {
  GlobalSysBlRecord,
  GlobalSysConsultaResult,
} from '../types/globalsys.types.js';

export class GlobalSysBlRepository {
  async findByNumeroBl(numeroBl: string): Promise<GlobalSysConsultaResult> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBl);

    const result = await request.query<GlobalSysBlRecord>(
      'SELECT * FROM TB_BL WHERE NR_BL = @numeroBL',
    );

    const record = result.recordset[0] ?? null;

    return {
      found: record != null,
      numeroBl,
      record,
    };
  }
}

export const globalSysBlRepository = new GlobalSysBlRepository();
