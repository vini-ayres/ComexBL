import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { getGlobalSysPool } from '../src/globalsys/client.js';
import {
  SQL_FIND_CARGA,
  SQL_FIND_NCM,
  SQL_FIND_TB_BL,
} from '../src/globalsys/globalsys-select.queries.js';

if (!env.globalsys.enabled) {
  console.log('GlobalSys não configurado');
  process.exit(1);
}

const numeroBl = process.argv[2] ?? 'SZX600254900';
const pool = await getGlobalSysPool();

try {
  const bl = await pool.request().input('numeroBL', numeroBl).query(SQL_FIND_TB_BL);
  const carga = await pool.request().input('numeroBL', numeroBl).query(SQL_FIND_CARGA);
  const ncm = await pool.request().input('numeroBL', numeroBl).query(SQL_FIND_NCM);

  console.log('TB_BL', JSON.stringify(bl.recordset[0] ?? null, null, 2));
  console.log('CARGA', carga.recordset.length, JSON.stringify(carga.recordset, null, 2));
  console.log('NCM', ncm.recordset.length, JSON.stringify(ncm.recordset, null, 2));
} finally {
  await pool.close();
}
