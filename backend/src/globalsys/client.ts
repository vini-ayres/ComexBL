import sql from 'mssql';
import { env } from '../config/env.js';
import { DatabaseError } from '../errors/AppError.js';

type GlobalSysPool = sql.ConnectionPool;

let poolPromise: Promise<GlobalSysPool> | null = null;

function buildConfig(): sql.config {
  const baseConfig: sql.config = {
    server: env.globalsys.server,
    port: env.globalsys.port,
    database: env.globalsys.name,
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: env.globalsys.encrypt,
      trustServerCertificate: env.globalsys.trustServerCertificate,
      connectTimeout: env.globalsys.connectionTimeoutMs,
      requestTimeout: env.globalsys.requestTimeoutMs,
    },
  };

  if (env.globalsys.domain) {
    return {
      ...baseConfig,
      authentication: {
        type: 'ntlm',
        options: {
          domain: env.globalsys.domain,
          userName: env.globalsys.user,
          password: env.globalsys.password,
        },
      },
    };
  }

  return {
    ...baseConfig,
    user: env.globalsys.user,
    password: env.globalsys.password,
  };
}

function assertGlobalSysConfigured(): void {
  if (!env.globalsys.enabled) {
    throw new DatabaseError(
      'GlobalSys não configurado. Defina GS_DB_SERVER, GS_DB_NAME, GS_DB_USER e GS_DB_PASSWORD no .env',
    );
  }
}

export async function getGlobalSysPool(): Promise<GlobalSysPool> {
  assertGlobalSysConfigured();

  if (!poolPromise) {
    poolPromise = sql.connect(buildConfig()).catch((error) => {
      poolPromise = null;
      throw error;
    });
  }

  try {
    return await poolPromise;
  } catch (error) {
    poolPromise = null;
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido';

    throw new DatabaseError(`Falha ao conectar ao GlobalSys: ${message}`);
  }
}

export async function closeGlobalSysPool(): Promise<void> {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  poolPromise = null;
  await pool.close();
}

export async function checkGlobalSysConnection(): Promise<{
  connected: boolean;
  responseTimeMs: number;
  error?: string;
}> {
  if (!env.globalsys.enabled) {
    return {
      connected: false,
      responseTimeMs: 0,
      error: 'GlobalSys não configurado',
    };
  }

  const startedAt = Date.now();

  try {
    const pool = await getGlobalSysPool();
    await pool.request().query('SELECT 1 AS ok');

    return {
      connected: true,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      connected: false,
      responseTimeMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
