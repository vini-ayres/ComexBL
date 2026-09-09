import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../src/config/env.js';
import { prisma } from '../src/prisma/client.js';
import { resolveSqlAuthMode } from '../src/utils/sql-server-connection.js';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../prisma/migrations',
);

interface AppliedMigration {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

function checksumOf(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

async function listMigrationDirectories(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function loadAppliedMigrations(): Promise<Map<string, AppliedMigration>> {
  const rows = await prisma.$queryRaw<AppliedMigration[]>`
    SELECT [migration_name], [checksum], [finished_at], [rolled_back_at]
    FROM [_prisma_migrations]
  `;

  return new Map(rows.map((row) => [row.migration_name, row]));
}

async function recordMigration(name: string, checksum: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO [_prisma_migrations] (
      [id],
      [checksum],
      [finished_at],
      [migration_name],
      [logs],
      [rolled_back_at],
      [started_at],
      [applied_steps_count]
    )
    VALUES (
      NEWID(),
      ${checksum},
      SYSUTCDATETIME(),
      ${name},
      NULL,
      NULL,
      SYSUTCDATETIME(),
      1
    )
  `;
}

async function updateMigrationChecksum(name: string, checksum: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE [_prisma_migrations]
    SET [checksum] = ${checksum}
    WHERE [migration_name] = ${name}
  `;
}

export async function deployPendingMigrations(): Promise<void> {
  const authMode = resolveSqlAuthMode({
    authMode: env.database.authMode,
    domain: env.database.domain,
  });

  console.log(
    `Prisma migrate deploy via adapter NTLM → ${env.database.name}` +
      ` (domain=${env.database.domain}, authMode=${authMode}, user=${env.database.user})`,
  );

  const directories = await listMigrationDirectories();
  const applied = await loadAppliedMigrations();

  let appliedCount = 0;

  for (const name of directories) {
    const sqlPath = join(MIGRATIONS_DIR, name, 'migration.sql');
    const sql = await readFile(sqlPath, 'utf8');
    const checksum = checksumOf(sql);
    const existing = applied.get(name);

    if (existing && existing.finished_at && !existing.rolled_back_at) {
      // Só corrige placeholder gravado pelo apply NTLM manual; não reescreve checksum do Prisma CLI.
      if (existing.checksum === 'manual-ntlm-apply') {
        await updateMigrationChecksum(name, checksum);
        console.log(`  already applied: ${name} (checksum NTLM atualizado)`);
      } else {
        console.log(`  already applied: ${name}`);
      }
      continue;
    }

    console.log(`  applying: ${name}`);
    await prisma.$executeRawUnsafe(sql);
    await recordMigration(name, checksum);
    appliedCount += 1;
    console.log(`  applied: ${name}`);
  }

  if (appliedCount === 0) {
    console.log('Nenhuma migration pendente.');
  } else {
    console.log(`${appliedCount} migration(s) aplicada(s).`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deployPendingMigrations()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
