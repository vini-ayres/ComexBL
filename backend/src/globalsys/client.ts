import sql from 'mssql';
import { DatabaseError } from '../errors/AppError.js';
import { integrationSettingsService } from '../services/integration-settings.service.js';
import type { GlobalSysRuntimeConfig } from '../types/integration.types.js';
import {
  buildMssqlConfig,
  fingerprintSqlServerConfig,
  parseSqlServerTarget,
  resolveNtlmDomain,
  resolveSqlAuthMode,
  resolveSqlLogin,
  type SqlAuthMode,
} from '../utils/sql-server-connection.js';

type GlobalSysPool = sql.ConnectionPool;
type GlobalSysAuthMode = SqlAuthMode;

let pool: GlobalSysPool | null = null;
let poolPromise: Promise<GlobalSysPool> | null = null;
let poolFingerprint: string | null = null;

function resolveAuthMode(config: Pick<GlobalSysRuntimeConfig, 'authMode' | 'domain'>): GlobalSysAuthMode {
  return resolveSqlAuthMode(config);
}

function fingerprintConfig(config: GlobalSysRuntimeConfig): string {
  return fingerprintSqlServerConfig(config);
}

function assertGlobalSysConfigured(config: GlobalSysRuntimeConfig): void {
  if (!config.enabled) {
    throw new DatabaseError(
      'GlobalSys não configurado. Preencha servidor, banco, usuário e senha na tela Banco de Dados.',
    );
  }
}

function buildConnectionHint(errorMessage: string): string {
  if (!/untrusted domain|integrated authentication/i.test(errorMessage)) {
    return errorMessage;
  }

  return [
    errorMessage,
    'Dica: use autenticação NTLM com o domínio NetBIOS (ex.: ABAINFRA) ou autenticação SQL nativa.',
    'Evite autenticação integrada do Windows: informe usuário e senha explicitamente.',
  ].join(' ');
}

async function connectPool(config: GlobalSysRuntimeConfig): Promise<GlobalSysPool> {
  const instance = new sql.ConnectionPool(buildMssqlConfig(config, { poolMax: 5 }));
  return instance.connect();
}

export async function getGlobalSysPool(): Promise<GlobalSysPool> {
  const config = await integrationSettingsService.getGlobalSysRuntimeConfig();
  assertGlobalSysConfigured(config);

  const fingerprint = fingerprintConfig(config);
  if (pool && poolFingerprint !== fingerprint) {
    await closeGlobalSysPool();
  }

  if (!poolPromise) {
    poolFingerprint = fingerprint;
    poolPromise = connectPool(config)
      .then((connected) => {
        pool = connected;
        return connected;
      })
      .catch((error) => {
        poolPromise = null;
        pool = null;
        poolFingerprint = null;
        throw error;
      });
  }

  try {
    return await poolPromise;
  } catch (error) {
    poolPromise = null;
    pool = null;
    poolFingerprint = null;
    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    throw new DatabaseError(`Falha ao conectar ao GlobalSys: ${buildConnectionHint(message)}`);
  }
}

export async function closeGlobalSysPool(): Promise<void> {
  const current = pool;
  const pending = poolPromise;
  pool = null;
  poolPromise = null;
  poolFingerprint = null;

  if (current) {
    await current.close();
    return;
  }

  if (!pending) {
    return;
  }

  try {
    const connected = await pending;
    await connected.close();
  } catch {
    // pool already failed to connect
  }
}

export async function testSqlServerConfig(config: GlobalSysRuntimeConfig): Promise<{
  connected: boolean;
  responseTimeMs: number;
  authMode?: GlobalSysAuthMode;
  error?: string;
}> {
  const startedAt = Date.now();
  const authMode = resolveAuthMode(config);

  if (!config.server || !config.name || !config.user || !config.password) {
    return {
      connected: false,
      responseTimeMs: 0,
      authMode,
      error: 'Configuração incompleta: informe servidor, banco, usuário e senha.',
    };
  }

  let testPool: GlobalSysPool | null = null;

  try {
    testPool = await connectPool(config);
    await testPool.request().query('SELECT 1 AS ok');

    return {
      connected: true,
      responseTimeMs: Date.now() - startedAt,
      authMode,
    };
  } catch (error) {
    return {
      connected: false,
      responseTimeMs: Date.now() - startedAt,
      authMode,
      error: error instanceof Error ? buildConnectionHint(error.message) : String(error),
    };
  } finally {
    if (testPool) {
      await testPool.close().catch(() => undefined);
    }
  }
}

export async function checkGlobalSysConnection(
  override?: GlobalSysRuntimeConfig,
): Promise<{
  connected: boolean;
  responseTimeMs: number;
  authMode?: GlobalSysAuthMode;
  error?: string;
}> {
  const config = override ?? (await integrationSettingsService.getGlobalSysRuntimeConfig());

  if (!config.enabled) {
    return {
      connected: false,
      responseTimeMs: 0,
      error: 'GlobalSys não configurado',
    };
  }

  const startedAt = Date.now();
  const authMode = resolveAuthMode(config);
  let testPool: GlobalSysPool | null = null;

  try {
    if (override) {
      testPool = await connectPool(config);
      await testPool.request().query('SELECT 1 AS ok');
    } else {
      const sharedPool = await getGlobalSysPool();
      await sharedPool.request().query('SELECT 1 AS ok');
    }

    return {
      connected: true,
      responseTimeMs: Date.now() - startedAt,
      authMode,
    };
  } catch (error) {
    return {
      connected: false,
      responseTimeMs: Date.now() - startedAt,
      authMode,
      error: error instanceof Error ? buildConnectionHint(error.message) : String(error),
    };
  } finally {
    if (testPool) {
      await testPool.close().catch(() => undefined);
    }
  }
}

export const __testing = {
  resolveAuthMode: (authMode?: string, domain?: string) =>
    resolveAuthMode({ authMode: authMode ?? '', domain: domain ?? '' }),
  resolveNtlmDomain,
  parseServerTarget: parseSqlServerTarget,
  resolveSqlLogin,
};
