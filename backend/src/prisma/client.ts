import '../config/env.js';
import { env } from '../config/env.js';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';
import {
  buildDatabaseUrl,
  buildMssqlConfig,
  fingerprintSqlServerConfig,
  type SqlServerConnectionConfig,
} from '../utils/sql-server-connection.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaFingerprint: string | undefined;
};

function localDbConfigFromEnv(): SqlServerConnectionConfig {
  return {
    server: env.database.server,
    port: env.database.port,
    name: env.database.name,
    domain: env.database.domain,
    authMode: env.database.authMode,
    user: env.database.user,
    password: env.database.password,
    encrypt: env.database.encrypt,
    trustServerCertificate: env.database.trustServerCertificate,
    connectionTimeoutMs: env.database.connectionTimeoutMs,
    requestTimeoutMs: env.database.requestTimeoutMs,
  };
}

function createPrismaClient(config: SqlServerConnectionConfig): PrismaClient {
  const adapter = new PrismaMssql(buildMssqlConfig(config), {
    onPoolError: (err) => {
      logger.error('Erro no pool SQL Server do Prisma', err);
    },
    onConnectionError: (err) => {
      logger.error('Erro de conexão SQL Server do Prisma', err);
    },
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

const initialConfig = localDbConfigFromEnv();

export let prisma = globalForPrisma.prisma ?? createPrismaClient(initialConfig);
let prismaFingerprint =
  globalForPrisma.prismaFingerprint ?? fingerprintSqlServerConfig(initialConfig);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaFingerprint = prismaFingerprint;
}

export async function connectPrisma(): Promise<void> {
  logger.info(
    `Prisma conectando com encrypt=${env.database.encrypt}, trustServerCertificate=${env.database.trustServerCertificate}` +
      (env.database.authMode ? `, authMode=${env.database.authMode}` : ''),
  );
  await prisma.$connect();
  logger.info('Prisma Client conectado ao SQL Server');
}

export async function reconnectPrisma(config: SqlServerConnectionConfig): Promise<void> {
  const fingerprint = fingerprintSqlServerConfig(config);
  if (fingerprint === prismaFingerprint) {
    return;
  }

  const next = createPrismaClient(config);
  await next.$connect();

  const previous = prisma;
  prisma = next;
  prismaFingerprint = fingerprint;
  globalForPrisma.prisma = next;
  globalForPrisma.prismaFingerprint = fingerprint;
  process.env.DATABASE_URL = buildDatabaseUrl(config);

  await previous.$disconnect().catch(() => undefined);
  logger.info('Prisma Client reconectado com a configuração salva na tela');
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma Client desconectado');
}
