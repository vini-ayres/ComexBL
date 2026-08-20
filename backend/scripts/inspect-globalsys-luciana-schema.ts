import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { getGlobalSysPool } from '../src/globalsys/client.js';

/**
 * SELECT-only inspection of GlobalSys tables used by EDI (Luciana PROC_EDI_*).
 * Never INSERT/UPDATE GlobalSys.
 */

if (!env.globalsys.enabled) {
  console.log('GlobalSys não configurado');
  process.exit(1);
}

const TABLES = [
  'TB_BL',
  'TB_NAVIO',
  'TB_PARCEIRO',
  'TB_PORTO',
  'TB_CIDADE',
  'TB_TIPO_PAGAMENTO',
  'TB_TIPO_CONTAINER',
  'TB_CNTR_BL',
  'TB_AMR_CNTR_BL',
  'TB_CARGA_BL',
  'TB_MERCADORIA',
  'TB_TIPO_CARGA',
  'TB_BL_NCM',
  'TB_NCM',
] as const;

const pool = await getGlobalSysPool();

try {
  for (const table of TABLES) {
    const cols = await pool.request().input('tableName', table).query<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
    }>(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = @tableName
       ORDER BY ORDINAL_POSITION`,
    );

    const names = cols.recordset.map((row) => `${row.COLUMN_NAME} (${row.DATA_TYPE})`);
    console.log(`\n=== ${table} (${names.length} cols) ===`);
    console.log(names.length > 0 ? names.join('\n') : '(tabela não encontrada)');
  }
} finally {
  await pool.close();
}
