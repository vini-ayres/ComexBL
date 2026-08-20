import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { getGlobalSysPool } from '../src/globalsys/client.js';

if (!env.globalsys.enabled) {
  console.log('GlobalSys não configurado');
  process.exit(1);
}

const pool = await getGlobalSysPool();
const cols = await pool.request().query(
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TB_BL' ORDER BY ORDINAL_POSITION",
);
console.log('TB_BL columns:');
console.log(cols.recordset.map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME).join('\n'));

try {
  const sample = await pool.request().query('SELECT TOP 1 * FROM TB_BL');
  console.log('\nSample row keys:', Object.keys(sample.recordset[0] ?? {}).join(', '));
} catch (error) {
  console.error('Sample query failed:', error instanceof Error ? error.message : error);
}

await pool.close();
