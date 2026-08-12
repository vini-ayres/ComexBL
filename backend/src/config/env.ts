import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, '../../.env') });

/** Caracteres que exigem escape JDBC/MSSQL na connection string do Prisma. */
const SQL_SERVER_ESCAPE_PATTERN = /[\\;=:[\]/{}@#!]/;

function requireEnv(key: string): string {
  const value = process.env[key];

  if (!value?.trim()) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  }

  return stripQuotes(value.trim());
}

function optionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();

  if (!value) {
    return undefined;
  }

  return stripQuotes(value);
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseBooleanEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();

  if (!raw) {
    return defaultValue;
  }

  if (raw === 'false' || raw === '0' || raw === 'no') {
    return false;
  }

  return raw === 'true' || raw === '1' || raw === 'yes';
}

function parsePositiveIntEnv(key: string, defaultValue: number): number {
  const parsed = Number(process.env[key]);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.trunc(parsed);
}

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

function buildDatabaseUrl(options: {
  server: string;
  port: number;
  user: string;
  password: string;
  database: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectionTimeoutMs: number;
  requestTimeoutMs: number;
}): string {
  const connectionTimeoutSec = Math.ceil(options.connectionTimeoutMs / 1000);
  const requestTimeoutSec = Math.ceil(options.requestTimeoutMs / 1000);

  return [
    `sqlserver://${options.server}:${options.port}`,
    `database=${escapeSqlServerValue(options.database)}`,
    `user=${escapeSqlServerValue(options.user)}`,
    `password=${escapeSqlServerValue(options.password)}`,
    `encrypt=${options.encrypt}`,
    `trustServerCertificate=${options.trustServerCertificate}`,
    `connectionTimeout=${connectionTimeoutSec}`,
    `connectTimeout=${connectionTimeoutSec}`,
    `requestTimeout=${requestTimeoutSec}`,
  ].join(';');
}

const dbServer = requireEnv('DB_SERVER');
const dbPort = parsePositiveIntEnv('DB_PORT', 1433);
const dbUser = requireEnv('DB_USER');
const dbPassword = requireEnv('DB_PASSWORD');
const dbName = requireEnv('DB_NAME');
const dbEncrypt = parseBooleanEnv('DB_ENCRYPT', false);
const dbTrustServerCertificate = parseBooleanEnv(
  'DB_TRUST_SERVER_CERTIFICATE',
  true,
);
const dbConnectionTimeout = parsePositiveIntEnv('DB_CONNECTION_TIMEOUT', 30000);
const dbRequestTimeout = parsePositiveIntEnv('DB_REQUEST_TIMEOUT', 30000);

const databaseUrl = buildDatabaseUrl({
  server: dbServer,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  encrypt: dbEncrypt,
  trustServerCertificate: dbTrustServerCertificate,
  connectionTimeoutMs: dbConnectionTimeout,
  requestTimeoutMs: dbRequestTimeout,
});

const gsDbServer = optionalEnv('GS_DB_SERVER');
const gsDbPort = parsePositiveIntEnv('GS_DB_PORT', 1433);
const gsDbName = optionalEnv('GS_DB_NAME');
const gsDbDomain = optionalEnv('GS_DB_DOMAIN');
const gsDbUser = optionalEnv('GS_DB_USER');
const gsDbPassword = optionalEnv('GS_DB_PASSWORD');
const gsDbAuthMode = optionalEnv('GS_DB_AUTH_MODE');
const gsDbEncrypt = parseBooleanEnv('GS_DB_ENCRYPT', false);
const gsDbTrustServerCertificate = parseBooleanEnv(
  'GS_DB_TRUST_SERVER_CERTIFICATE',
  true,
);
const gsDbConnectionTimeout = parsePositiveIntEnv(
  'GS_DB_CONNECTION_TIMEOUT',
  30000,
);
const gsDbRequestTimeout = parsePositiveIntEnv('GS_DB_REQUEST_TIMEOUT', 30000);

const globalsysEnabled = Boolean(
  gsDbServer && gsDbName && gsDbUser && gsDbPassword,
);

const n8nWebhookEnviarXmlGlobalsysUrl = optionalEnv(
  'N8N_WEBHOOK_ENVIAR_XML_GLOBALSYS_URL',
);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3333),
  isProduction: process.env.NODE_ENV === 'production',
  database: {
    server: dbServer,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    name: dbName,
    encrypt: dbEncrypt,
    trustServerCertificate: dbTrustServerCertificate,
    connectionTimeoutMs: dbConnectionTimeout,
    requestTimeoutMs: dbRequestTimeout,
    url: databaseUrl,
  },
  globalsys: {
    enabled: globalsysEnabled,
    server: gsDbServer ?? '',
    port: gsDbPort,
    name: gsDbName ?? '',
    domain: gsDbDomain,
    authMode: gsDbAuthMode,
    user: gsDbUser ?? '',
    password: gsDbPassword ?? '',
    encrypt: gsDbEncrypt,
    trustServerCertificate: gsDbTrustServerCertificate,
    connectionTimeoutMs: gsDbConnectionTimeout,
    requestTimeoutMs: gsDbRequestTimeout,
  },
  n8n: {
    webhookEnviarXmlGlobalsysUrl: n8nWebhookEnviarXmlGlobalsysUrl,
  },
} as const;

process.env.DATABASE_URL = env.database.url;
