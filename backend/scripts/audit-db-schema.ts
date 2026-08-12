import '../src/config/env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      finished_at: Date | null;
      applied_steps_count: number;
      rolled_back_at: Date | null;
      started_at: Date;
      logs: string | null;
    }>
  >(
    `SELECT migration_name, finished_at, applied_steps_count, rolled_back_at, started_at, logs
     FROM _prisma_migrations ORDER BY started_at`,
  );
  console.log('=== _prisma_migrations ===');
  console.log(JSON.stringify(migrations, null, 2));

  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT t.name AS table_name
     FROM sys.tables t
     WHERE t.schema_id = SCHEMA_ID('dbo')
     ORDER BY t.name`,
  );
  console.log('\n=== TABLES ===');
  for (const r of tables) console.log(r.table_name);

  const expectedTables = [
    'BL_Master', 'BL_House', 'BL_House_Cargo', 'BL_House_NCM',
    'BL_Workflow', 'BL_CampoRevisao', 'BL_HistoricoAlteracao',
    'BL_Divergencia', 'BL_DivergenciaCampo', 'BL_ProcessoEtapa', 'BL_ConsultaGlobalSys',
    'APP_User', 'APP_Role', 'APP_Permission', 'APP_RolePermission', 'APP_UserRole',
    'APP_AdGroup', 'APP_UserAdGroup', 'APP_AuditLog', 'APP_IntegrationConfig',
  ];
  const existing = new Set(tables.map((t) => t.table_name));
  console.log('\n=== MISSING TABLES (expected by schema) ===');
  for (const t of expectedTables) {
    if (!existing.has(t)) console.log('MISSING:', t);
  }

  for (const tbl of ['BL_Master', 'BL_House', 'BL_CampoRevisao']) {
    const cols = await prisma.$queryRawUnsafe<
      Array<{ col_name: string; type_name: string; is_nullable: boolean }>
    >(
      `SELECT c.name AS col_name, ty.name AS type_name, c.is_nullable
       FROM sys.columns c
       JOIN sys.types ty ON c.user_type_id = ty.user_type_id
       WHERE c.object_id = OBJECT_ID(N'dbo.${tbl}')
       ORDER BY c.column_id`,
    );
    console.log(`\n=== COLUMNS ${tbl} ===`);
    for (const c of cols) console.log(`  ${c.col_name} (${c.type_name}, nullable=${c.is_nullable})`);
  }

  const indexes = await prisma.$queryRawUnsafe<Array<{ table_name: string; index_name: string }>>(
    `SELECT OBJECT_NAME(i.object_id) AS table_name, i.name AS index_name
     FROM sys.indexes i
     WHERE OBJECT_NAME(i.object_id) IN ('BL_Master','BL_House','BL_CampoRevisao')
       AND i.name IS NOT NULL
     ORDER BY table_name, index_name`,
  );
  console.log('\n=== INDEXES (BL_Master, BL_House, BL_CampoRevisao) ===');
  for (const i of indexes) console.log(`  ${i.table_name}.${i.index_name}`);

  const constraints = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; constraint_name: string; constraint_type: string }>
  >(
    `SELECT OBJECT_NAME(parent_object_id) AS table_name, name AS constraint_name, type_desc AS constraint_type
     FROM sys.objects
     WHERE type IN ('C','F','UQ','PK')
       AND OBJECT_NAME(parent_object_id) IN ('BL_Master','BL_House','BL_CampoRevisao')
     ORDER BY table_name, constraint_name`,
  );
  console.log('\n=== CONSTRAINTS ===');
  for (const c of constraints) console.log(`  ${c.table_name}.${c.constraint_name} (${c.constraint_type})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
