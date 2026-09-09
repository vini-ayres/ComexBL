import type sql from 'mssql';
import { DatabaseError } from '../errors/AppError.js';

export type SqlAuthMode = 'sql' | 'ntlm';

export interface SqlServerConnectionConfig {
  server: string;
  port: number;
  name: string;
  domain?: string;
  authMode?: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectionTimeoutMs: number;
  requestTimeoutMs: number;
}

/** Caracteres que exigem escape JDBC/MSSQL na connection string do Prisma. */
const SQL_SERVER_ESCAPE_PATTERN = /[\\;=:[\]/{}@#!]/;

/**
 * Escapa valores para connection string SQL Server (Prisma/JDBC).
 * Não usar encodeURIComponent — senhas com @, #, ! devem ir entre chaves {}.
 * @see https://www.prisma.io/docs/orm/overview/databases/sql-server
 */
export function escapeSqlServerValue(value: string): string {
  if (!SQL_SERVER_ESCAPE_PATTERN.test(value)) {
    return value;
  }

  const escaped = value.replace(/\}/g, '}}').replace(/\{/g, '{{');
  return `{${escaped}}`;
}

export function resolveSqlAuthMode(
  config: Pick<SqlServerConnectionConfig, 'authMode' | 'domain'>,
): SqlAuthMode {
  const configured = config.authMode?.trim().toLowerCase();

  if (configured === 'sql' || configured === 'ntlm') {
    return configured;
  }

  return config.domain?.trim() ? 'ntlm' : 'sql';
}

export function resolveNtlmDomain(domain: string): string {
  const trimmed = domain.trim();
  const dotIndex = trimmed.indexOf('.');

  if (dotIndex > 0) {
    return trimmed.slice(0, dotIndex);
  }

  return trimmed;
}

export function resolveSqlLogin(
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

export function parseSqlServerTarget(
  server: string,
  port: number,
): Pick<sql.config, 'server' | 'port' | 'options'> {
  const normalized = String(server ?? '').trim().replace(/\\+/g, '\\');
  const backslashIndex = normalized.indexOf('\\');

  if (!normalized || backslashIndex === -1) {
    return { server: normalized, port };
  }

  const host = normalized.slice(0, backslashIndex).trim();
  const instanceName = normalized.slice(backslashIndex + 1).replace(/^\\+/, '').trim();

  if (!host || !instanceName) {
    return { server: normalized.replace(/\\/g, ''), port };
  }

  return {
    server: host,
    port: undefined,
    options: {
      instanceName,
    },
  };
}

export function buildMssqlAuthentication(
  config: SqlServerConnectionConfig,
): NonNullable<sql.config['authentication']> {
  const mode = resolveSqlAuthMode(config);

  if (mode === 'ntlm') {
    if (!config.domain?.trim()) {
      throw new DatabaseError(
        'O domínio é obrigatório quando o modo de autenticação é NTLM.',
      );
    }

    if (config.user.trim().toLowerCase() === 'sa') {
      throw new DatabaseError(
        'NTLM não funciona com o usuário sa. Informe uma conta de domínio Windows ou use autenticação SQL.',
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

export function buildMssqlConfig(
  config: SqlServerConnectionConfig,
  options?: { poolMax?: number },
): sql.config {
  const parsed = parseSqlServerTarget(config.server, config.port);
  const hasNamedInstance = Boolean(parsed.options?.instanceName);

  return {
    server: parsed.server,
    ...(hasNamedInstance ? {} : { port: config.port }),
    database: config.name,
    authentication: buildMssqlAuthentication(config),
    pool: {
      max: options?.poolMax ?? 10,
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

export function fingerprintSqlServerConfig(config: SqlServerConnectionConfig): string {
  return [
    config.server,
    config.port,
    config.name,
    config.domain ?? '',
    config.authMode ?? '',
    config.user,
    config.password,
    config.encrypt,
    config.trustServerCertificate,
    config.connectionTimeoutMs,
    config.requestTimeoutMs,
  ].join('|');
}

/**
 * Connection string JDBC para Prisma CLI (migrate/generate).
 * Instância nomeada não leva porta — o SQL Browser resolve em UDP 1434.
 * NTLM usa integratedSecurity com usuário DOMAIN\user (domínio NetBIOS).
 */
export function buildDatabaseUrl(config: SqlServerConnectionConfig): string {
  const parsed = parseSqlServerTarget(config.server, config.port);
  const instanceName = parsed.options?.instanceName;
  const hostPart = instanceName
    ? `${parsed.server}\\${instanceName}`
    : `${parsed.server}:${config.port}`;
  const connectionTimeoutSec = Math.ceil(config.connectionTimeoutMs / 1000);
  const requestTimeoutSec = Math.ceil(config.requestTimeoutMs / 1000);
  const authMode = resolveSqlAuthMode(config);

  const parts = [
    `sqlserver://${hostPart}`,
    `database=${escapeSqlServerValue(config.name)}`,
  ];

  if (authMode === 'ntlm') {
    const domain = resolveNtlmDomain(config.domain ?? '');
    const user =
      config.user.includes('\\') || config.user.includes('@') || !domain
        ? config.user
        : `${domain}\\${config.user}`;

    parts.push(`user=${escapeSqlServerValue(user)}`);
    parts.push(`password=${escapeSqlServerValue(config.password)}`);
    parts.push('integratedSecurity=true');
  } else {
    const login = resolveSqlLogin(config.user, config.password, config.domain);
    parts.push(`user=${escapeSqlServerValue(login.userName)}`);
    parts.push(`password=${escapeSqlServerValue(login.password)}`);
  }

  parts.push(`encrypt=${config.encrypt}`);
  parts.push(`trustServerCertificate=${config.trustServerCertificate}`);
  parts.push(`connectionTimeout=${connectionTimeoutSec}`);
  parts.push(`connectTimeout=${connectionTimeoutSec}`);
  parts.push(`requestTimeout=${requestTimeoutSec}`);

  return parts.join(';');
}
