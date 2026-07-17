import { env } from '../config/env.js';
import { DatabaseRepository } from '../repositories/database.repository.js';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  api: {
    status: 'ok';
  };
  database: {
    status: 'connected' | 'disconnected';
    server: string;
    database: string;
    encrypt: boolean;
    trustServerCertificate: boolean;
    responseTimeMs: number;
    error?: string;
  };
}

export class HealthService {
  constructor(private readonly databaseRepository: DatabaseRepository) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const dbHealth = await this.databaseRepository.checkConnection();

    return {
      status: dbHealth.connected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.nodeEnv,
      api: {
        status: 'ok',
      },
      database: {
        status: dbHealth.connected ? 'connected' : 'disconnected',
        server: env.database.server,
        database: env.database.name,
        encrypt: env.database.encrypt,
        trustServerCertificate: env.database.trustServerCertificate,
        responseTimeMs: dbHealth.responseTimeMs,
        ...(dbHealth.error ? { error: dbHealth.error } : {}),
      },
    };
  }

  async assertDatabaseConnection(): Promise<void> {
    const dbHealth = await this.databaseRepository.checkConnection();

    if (!dbHealth.connected) {
      throw new Error(
        dbHealth.error ?? 'Não foi possível conectar ao banco de dados',
      );
    }
  }
}
