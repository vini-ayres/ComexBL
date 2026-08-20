import '../config/env.js';
import { env } from '../config/env.js';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(url = env.database.url): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

export let prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectPrisma(): Promise<void> {
  logger.info(
    `Prisma conectando com encrypt=${env.database.encrypt}, trustServerCertificate=${env.database.trustServerCertificate}`,
  );
  await prisma.$connect();
  logger.info('Prisma Client conectado ao SQL Server');
}

export async function reconnectPrisma(url: string): Promise<void> {
  if (url === process.env.DATABASE_URL) {
    return;
  }

  const next = createPrismaClient(url);
  await next.$connect();

  const previous = prisma;
  prisma = next;
  globalForPrisma.prisma = next;
  process.env.DATABASE_URL = url;

  await previous.$disconnect().catch(() => undefined);
  logger.info('Prisma Client reconectado com a configuração salva na tela');
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma Client desconectado');
}
