import { prisma } from '../prisma/client.js';

export interface DatabaseHealthResult {
  connected: boolean;
  responseTimeMs: number;
  error?: string;
}

export class DatabaseRepository {
  async checkConnection(): Promise<DatabaseHealthResult> {
    const startedAt = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1 AS result`;

      return {
        connected: true,
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';

      return {
        connected: false,
        responseTimeMs: Date.now() - startedAt,
        error: message,
      };
    }
  }
}

export const databaseRepository = new DatabaseRepository();
