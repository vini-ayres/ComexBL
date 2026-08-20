import sql from 'mssql';
import { DatabaseError } from '../errors/AppError.js';
import { integrationSettingsService } from '../services/integration-settings.service.js';
import type { GlobalSysRuntimeConfig } from '../types/integration.types.js';

type GlobalSysPool = sql.ConnectionPool;
type GlobalSysAuthMode = 'sql' | 'ntlm';

let pool: GlobalSysPool | null = null;
let poolPromise: Promise<GlobalSysPool> | null = null;
let poolFingerprint: string | null = null;

function resolveAuthMode(config: Pick<GlobalSysRuntimeConfig, 'authMode' | 'domain'>): GlobalSysAuthMode {
  const configured = config.authMode?.toLowerCase();

  if (configured === 'sql' || configured === 'ntlm') {
    return configured;
  }

  return config.domain ? 'ntlm' : 'sql';
}

function resolveSqlLogin(
  user: string,
  password: string,
  domain?: string,
): { userName: string; password: string } {
  if (!domain || user.includes('\\') || user.includes('@')) {
    return { userName: user, password };
  }

  return {
    userName: `${domain}\\${user}`,
    password,
  };
}

function resolveNtlmDomain(domain: string): string {
  const trimmed = domain.trim();
  const dotIndex = trimmed.indexOf('.');

  if (dotIndex > 0) {
    return trimmed.slice(0, dotIndex);
  }

  return trimmed;
}

function parseServerTarget(
  server: string,
  port: number,
): Pick<sql.config, 'server' | 'port' | 'options'> {
  const backslashIndex = server.indexOf('\\');

  if (backslashIndex === -1) {
    return { server, port };
  }

  const host = server.slice(0, backslashIndex);
  const instanceName = server.slice(backslashIndex + 1);

  return {
    server: host,
    port: undefined,
    options: {
      instanceName,
    },
  };
}

function buildAuthentication(config: GlobalSysRuntimeConfig): NonNullable<sql.config['authentication']> {
  const mode = resolveAuthMode(config);

  if (mode === 'ntlm') {
    if (!config.domain) {
      throw new DatabaseError(
        'GlobalSys: o domínio é obrigatório quando o modo de autenticação é NTLM.',
      );
    }

    return {
      type: 'ntlm',
      options: {
        domain: resolveNtlmDomain(config.domain),
        userName: config.user,
        password: config.password,
      },
    };
  }

  const login = resolveSqlLogin(config.user, config.password, config.domain);

  return {
    type: 'default',
    options: {
      userName: login.userName,
      password: login.password,
    },
  };
}

function buildConfig(config: GlobalSysRuntimeConfig): sql.config {
  const parsed = parseServerTarget(config.server, config.port);
  const hasNamedInstance = Boolean(parsed.options?.instanceName);

  return {
    server: parsed.server,
    ...(hasNamedInstance ? {} : { port: config.port }),
    database: config.name,
    authentication: buildAuthentication(config),
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      ...parsed.options,
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      connectTimeout: config.connectionTimeoutMs,
      requestTimeout: config.requestTimeoutMs,
      trustedConnection: false,
      enableArithAbort: true,
    },
  };
}

function fingerprintConfig(config: GlobalSysRuntimeConfig): string {
  return [
    config.server,
    config.port,
    config.name,
    config.domain,
    config.authMode,
    config.user,
    config.password,
    config.encrypt,
    config.trustServerCertificate,
    config.connectionTimeoutMs,
    config.requestTimeoutMs,
  ].join('|');
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
  const instance = new sql.ConnectionPool(buildConfig(config));
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
  parseServerTarget,
  resolveSqlLogin,
};
