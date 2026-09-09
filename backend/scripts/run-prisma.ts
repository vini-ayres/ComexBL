import { spawnSync } from 'node:child_process';
import { env } from '../src/config/env.js';
import { prisma } from '../src/prisma/client.js';
import { resolveSqlAuthMode } from '../src/utils/sql-server-connection.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Uso: tsx scripts/run-prisma.ts <comando prisma...>');
  process.exit(1);
}

const isMigrateDeploy = args[0] === 'migrate' && args[1] === 'deploy';
const authMode = resolveSqlAuthMode({
  authMode: env.database.authMode,
  domain: env.database.domain,
});

/**
 * O engine nativo do Prisma CLI não autentica NTLM neste host Linux.
 * O runtime da API já usa @prisma/adapter-mssql; o deploy segue o mesmo caminho,
 * lendo DB_NAME / DB_DOMAIN / DB_AUTH_MODE do .env.
 */
if (isMigrateDeploy && authMode === 'ntlm') {
  const { deployPendingMigrations } = await import('./prisma-migrate-deploy.js');

  try {
    await deployPendingMigrations();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }

  process.exit(process.exitCode ?? 0);
}

const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
