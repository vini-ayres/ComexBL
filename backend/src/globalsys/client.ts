import sql from 'mssql';
import { env } from '../config/env.js';
import { DatabaseError } from '../errors/AppError.js';

type GlobalSysPool = sql.ConnectionPool;
type GlobalSysAuthMode = 'sql' | 'ntlm';

let poolPromise: Promise<GlobalSysPool> | null = null;

function resolveAuthMode(): GlobalSysAuthMode {
  const configured = env.globalsys.authMode?.toLowerCase();

  if (configured === 'sql' || configured === 'ntlm') {
    return configured;
  }

  return env.globalsys.domain ? 'ntlm' : 'sql';
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

function buildAuthentication(): NonNullable<sql.config['authentication']> {
  const mode = resolveAuthMode();

  if (mode === 'ntlm') {
    if (!env.globalsys.domain) {
      throw new DatabaseError(
        'GlobalSys: GS_DB_DOMAIN é obrigatório quando GS_DB_AUTH_MODE=ntlm',
      );
    }

    return {
      type: 'ntlm',
      options: {
        domain: resolveNtlmDomain(env.globalsys.domain),
        userName: env.globalsys.user,
        password: env.globalsys.password,
      },
    };
  }

  const login = resolveSqlLogin(
    env.globalsys.user,
    env.globalsys.password,
    env.globalsys.domain,
  );

  return {
    type: 'default',
    options: {
      userName: login.userName,
      password: login.password,
    },
  };
}

function buildConfig(): sql.config {
  const parsed = parseServerTarget(env.globalsys.server, env.globalsys.port);
  const hasNamedInstance = Boolean(parsed.options?.instanceName);

  return {
    server: parsed.server,
    ...(hasNamedInstance ? {} : { port: env.globalsys.port }),
    database: env.globalsys.name,
    authentication: buildAuthentication(),
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      ...parsed.options,
      encrypt: env.globalsys.encrypt,
      trustServerCertificate: env.globalsys.trustServerCertificate,
      connectTimeout: env.globalsys.connectionTimeoutMs,
      requestTimeout: env.globalsys.requestTimeoutMs,
      trustedConnection: false,
      enableArithAbort: true,
    },
  };
}

function assertGlobalSysConfigured(): void {
  if (!env.globalsys.enabled) {
    throw new DatabaseError(
      'GlobalSys não configurado. Defina GS_DB_SERVER, GS_DB_NAME, GS_DB_USER e GS_DB_PASSWORD no .env',
    );
  }
}

function buildConnectionHint(errorMessage: string): string {
  if (!/untrusted domain|integrated authentication/i.test(errorMessage)) {
    return errorMessage;
  }

  return [
    errorMessage,
    'Dica: use GS_DB_AUTH_MODE=ntlm com GS_DB_DOMAIN (NetBIOS, ex.: ABAINFRA) ou GS_DB_AUTH_MODE=sql com login SQL nativo.',
    'Evite autenticação integrada do Windows: defina GS_DB_USER e GS_DB_PASSWORD explicitamente.',
  ].join(' ');
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

    throw new DatabaseError(`Falha ao conectar ao GlobalSys: ${buildConnectionHint(message)}`);
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
  authMode?: GlobalSysAuthMode;
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
  const authMode = resolveAuthMode();

  try {
    const pool = await getGlobalSysPool();
    await pool.request().query('SELECT 1 AS ok');

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
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const __testing = {
  resolveAuthMode,
  resolveNtlmDomain,
  parseServerTarget,
  resolveSqlLogin,
};
