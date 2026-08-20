import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { getGlobalSysPool } from '../src/globalsys/client.js';

if (!env.globalsys.enabled) {
  console.log('GlobalSys não configurado');
  process.exit(1);
}

const TABLES = [
  'TB_MANIFESTO_BL',
  'TB_MANIFESTO_HOUSE_BL',
  'TB_MANIFESTO_CNTR_BL',
  'TB_MANIFESTO_HOUSE_CARGA',
  'TB_MANIFESTO_HOUSE_NCM',
  'TB_TIPO_ESTUFAGEM',
  'TB_INCOTERM',
];

const pool = await getGlobalSysPool();

try {
  for (const table of TABLES) {
    const cols = await pool.request().input('tableName', table).query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tableName ORDER BY ORDINAL_POSITION`,
    );
    console.log(
      `\n=== ${table} ===`,
      cols.recordset.map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME).join(', ') || '(ausente)',
    );
  }
} finally {
  await pool.close();
}
