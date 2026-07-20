import { getGlobalSysPool } from '../globalsys/client.js';
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

    const result = await request.query(
      'SELECT * FROM TB_BL WHERE NR_BL = @numeroBL',
    );

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

    const result = await request.query<GlobalSysCargoRecord>(
      'SELECT * FROM TB_CARGA_BL WHERE NR_BL = @numeroBL',
    );

    return result.recordset ?? [];
  }

  async findNcmByNumeroBl(numeroBl: string): Promise<GlobalSysNcmRecord[]> {
    const pool = await getGlobalSysPool();
    const request = pool.request();
    request.input('numeroBL', numeroBl);

    const result = await request.query<GlobalSysNcmRecord>(
      'SELECT * FROM TB_BL_NCM WHERE NR_BL = @numeroBL',
    );

    return result.recordset ?? [];
  }

  async findBundleByNumeroBl(numeroBl: string): Promise<GlobalSysBlBundle> {
    const [bl, cargos, ncms] = await Promise.all([
      this.findByNumeroBl(numeroBl),
      this.findCargaByNumeroBl(numeroBl),
      this.findNcmByNumeroBl(numeroBl),
    ]);

    return {
      numeroBl,
      blFound: bl.found,
      blRecord: bl.record,
      cargos,
      ncms,
    };
  }
}

export const globalSysBlRepository = new GlobalSysBlRepository();
