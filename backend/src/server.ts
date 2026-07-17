import './config/env.js';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectPrisma, disconnectPrisma } from './prisma/client.js';
import { databaseRepository } from './repositories/database.repository.js';
import { HealthService } from './services/health.service.js';

async function bootstrap(): Promise<void> {
  logger.info('Iniciando API ComexBL...');
  logger.info(
    `SQL Server: ${env.database.server}:${env.database.port}/${env.database.name} ` +
      `(encrypt=${env.database.encrypt}, trustServerCertificate=${env.database.trustServerCertificate}, ` +
      `connectionTimeout=${env.database.connectionTimeoutMs}ms, requestTimeout=${env.database.requestTimeoutMs}ms)`,
  );

  await connectPrisma();

  const healthService = new HealthService(databaseRepository);
  await healthService.assertDatabaseConnection();

  logger.info(
    `Conexão com SQL Server validada (${env.database.server}/${env.database.name})`,
  );

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`API rodando em http://localhost:${env.port}`);
    logger.info(`Health check disponível em http://localhost:${env.port}/health`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Recebido ${signal}. Encerrando API...`);

    server.close(async () => {
      await disconnectPrisma();
      logger.info('API encerrada com sucesso');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.error('Falha ao iniciar a API', error);
  process.exit(1);
});
