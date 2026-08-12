import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { getGlobalSysPool } from '../src/globalsys/client.js';

if (!env.globalsys.enabled) {
  console.log('GlobalSys não configurado');
  process.exit(1);
}

const pool = await getGlobalSysPool();

for (const table of ['TB_CARGA_BL', 'TB_BL_NCM']) {
  const cols = await pool.request().query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`,
  );
  console.log(`\n=== ${table} ===`);
  console.log(cols.recordset.map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME).join(', '));
}

await pool.close();
