import '../config/env.js';
import { env } from '../config/env.js';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: env.database.url,
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

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

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma Client desconectado');
}
