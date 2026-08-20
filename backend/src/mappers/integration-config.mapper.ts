import { buildDatabaseUrl, env } from '../config/env.js';
import type {
  GlobalSysConfigInput,
  GlobalSysRuntimeConfig,
  IntegrationSource,
  LdapConfigInput,
  LdapRuntimeConfig,
  StoredGlobalSysConfig,
  StoredLdapConfig,
} from '../types/integration.types.js';

const LDAP_PLACEHOLDER_HOSTS = new Set(['ad01.empresa.com.br']);
const GS_PLACEHOLDER_HOSTS = new Set(['globalsys-sql01.empresa.local']);

export function parseLdapUrl(raw: string): { host: string; port: number; useTls: boolean } {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { host: '', port: 389, useTls: false };
  }

  try {
    const hasScheme = trimmed.includes('://');
    const parsed = new URL(hasScheme ? trimmed : `ldap://${trimmed}`);
    const useTls = parsed.protocol === 'ldaps:';
    const port = parsed.port
      ? Number(parsed.port)
      : useTls
        ? 636
        : 389;

    return {
      host: parsed.hostname,
      port: Number.isFinite(port) && port > 0 ? port : useTls ? 636 : 389,
      useTls,
    };
  } catch {
    const withoutScheme = trimmed.replace(/^ldaps?:\/\//i, '');
    const [hostPart, portPart] = withoutScheme.split(':');
    const port = Number(portPart);

    return {
      host: hostPart ?? trimmed,
      port: Number.isFinite(port) && port > 0 ? port : 389,
      useTls: trimmed.toLowerCase().startsWith('ldaps://'),
    };
  }
}

export function buildLdapUrl(host: string, port: number, useTls: boolean): string {
  const parsed = parseLdapUrl(host);
  const resolvedHost = parsed.host || host.replace(/^ldaps?:\/\//i, '').split(':')[0] || host;
  const resolvedPort = port > 0 ? port : parsed.port;
  const scheme = useTls ? 'ldaps' : 'ldap';
  return `${scheme}://${resolvedHost}:${resolvedPort}`;
}

export function splitBindIdentity(bindUser: string): { bindDn: string; bindUpn: string } {
  const trimmed = bindUser.trim();

  if (!trimmed) {
    return { bindDn: '', bindUpn: '' };
  }

  const looksLikeDn = /^(cn|ou|dc)=/i.test(trimmed) || trimmed.includes(',DC=') || trimmed.includes(',dc=');
  if (looksLikeDn) {
    return { bindDn: trimmed, bindUpn: '' };
  }

  if (trimmed.includes('@')) {
    return { bindDn: '', bindUpn: trimmed };
  }

  return { bindDn: trimmed, bindUpn: '' };
}

export function composeBindUser(bindDn: string, bindUpn: string): string {
  return bindUpn.trim() || bindDn.trim();
}

export function ldapRuntimeFromEnv(): LdapRuntimeConfig {
  const parsed = parseLdapUrl(env.ldap.url);

  return {
    enabled: env.ldap.enabled,
    url: env.ldap.url,
    host: parsed.host,
    port: parsed.port,
    baseDn: env.ldap.baseDn,
    bindDn: env.ldap.bindDn,
    bindUpn: env.ldap.bindUpn,
    bindPassword: env.ldap.bindPassword,
    useTls: env.ldap.useTls || parsed.useTls,
    groupPrefix: env.ldap.groupPrefix,
  };
}

export function globalsysRuntimeFromEnv(): GlobalSysRuntimeConfig {
  return {
    enabled: env.globalsys.enabled,
    server: env.globalsys.server,
    port: env.globalsys.port,
    name: env.globalsys.name,
    domain: env.globalsys.domain ?? '',
    authMode: env.globalsys.authMode ?? '',
    user: env.globalsys.user,
    password: env.globalsys.password,
    encrypt: env.globalsys.encrypt,
    trustServerCertificate: env.globalsys.trustServerCertificate,
    connectionTimeoutMs: env.globalsys.connectionTimeoutMs,
    requestTimeoutMs: env.globalsys.requestTimeoutMs,
  };
}

export function localDbRuntimeFromEnv(): GlobalSysRuntimeConfig {
  return {
    enabled: true,
    server: env.database.server,
    port: env.database.port,
    name: env.database.name,
    domain: '',
    authMode: 'sql',
    user: env.database.user,
    password: env.database.password,
    encrypt: env.database.encrypt,
    trustServerCertificate: env.database.trustServerCertificate,
    connectionTimeoutMs: env.database.connectionTimeoutMs,
    requestTimeoutMs: env.database.requestTimeoutMs,
  };
}

export function parseStoredLdapConfig(raw: string | null | undefined): Partial<StoredLdapConfig> {
  if (!raw?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const host = stringValue(parsed.host) || stringValue(parsed.servidor);
    const url = stringValue(parsed.url);
    const fromUrl = url ? parseLdapUrl(url) : host ? parseLdapUrl(host) : { host: '', port: 0, useTls: false };
    const bindUser = stringValue(parsed.bindUser);
    const split = bindUser ? splitBindIdentity(bindUser) : { bindDn: '', bindUpn: '' };

    return {
      url: url || undefined,
      host: fromUrl.host || undefined,
      port: numberValue(parsed.port) ?? numberValue(parsed.porta) ?? (fromUrl.port || undefined),
      baseDn: stringValue(parsed.baseDn) || stringValue(parsed.baseDN) || undefined,
      bindDn: stringValue(parsed.bindDn) || split.bindDn || undefined,
      bindUpn: stringValue(parsed.bindUpn) || split.bindUpn || undefined,
      bindPassword: stringValue(parsed.bindPassword) || stringValue(parsed.password) || undefined,
      useTls: booleanValue(parsed.useTls) ?? booleanValue(parsed.usarSSL) ?? (url ? fromUrl.useTls : undefined),
      groupPrefix: stringValue(parsed.groupPrefix) || stringValue(parsed.grupoAD) || undefined,
    };
  } catch {
    return {};
  }
}

export function parseStoredGlobalSysConfig(
  raw: string | null | undefined,
): Partial<StoredGlobalSysConfig> {
  if (!raw?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      server: stringValue(parsed.server) || stringValue(parsed.host) || undefined,
      port: numberValue(parsed.port),
      name: stringValue(parsed.name) || stringValue(parsed.database) || undefined,
      domain: stringValue(parsed.domain),
      authMode: stringValue(parsed.authMode),
      user: stringValue(parsed.user) || stringValue(parsed.usuario) || undefined,
      password: stringValue(parsed.password) || undefined,
      encrypt: booleanValue(parsed.encrypt),
      trustServerCertificate: booleanValue(parsed.trustServerCertificate),
      connectionTimeoutMs: numberValue(parsed.connectionTimeoutMs),
      requestTimeoutMs: numberValue(parsed.requestTimeoutMs),
    };
  } catch {
    return {};
  }
}

export function isLdapPlaceholder(stored: Partial<StoredLdapConfig>): boolean {
  const host = (stored.host || (stored.url ? parseLdapUrl(stored.url).host : '')).toLowerCase();
  return LDAP_PLACEHOLDER_HOSTS.has(host);
}

export function isGlobalSysPlaceholder(stored: Partial<StoredGlobalSysConfig>): boolean {
  return GS_PLACEHOLDER_HOSTS.has((stored.server ?? '').toLowerCase());
}

export function mergeLdapRuntime(options: {
  stored: Partial<StoredLdapConfig>;
  preferStored: boolean;
}): { config: LdapRuntimeConfig; source: IntegrationSource } {
  const fromEnv = ldapRuntimeFromEnv();
  const storedIsPlaceholder = isLdapPlaceholder(options.stored);
  const useStored = options.preferStored && !storedIsPlaceholder && hasLdapConnectionFields(options.stored);
  const primary = useStored ? overlayLdap(fromEnv, options.stored) : fromEnv;
  const withUrl = {
    ...primary,
    url: primary.url || buildLdapUrl(primary.host || primary.url, primary.port, primary.useTls),
  };

  return {
    config: {
      ...withUrl,
      enabled: isLdapEnabled(withUrl),
    },
    source: useStored ? 'database' : 'env',
  };
}

export function mergeGlobalSysRuntime(options: {
  stored: Partial<StoredGlobalSysConfig>;
  preferStored: boolean;
}): { config: GlobalSysRuntimeConfig; source: IntegrationSource } {
  return mergeSqlServerRuntime({
    ...options,
    fromEnv: globalsysRuntimeFromEnv(),
    treatAsPlaceholder: isGlobalSysPlaceholder(options.stored),
  });
}

export function mergeLocalDbRuntime(options: {
  stored: Partial<StoredGlobalSysConfig>;
  preferStored: boolean;
}): { config: GlobalSysRuntimeConfig; source: IntegrationSource } {
  return mergeSqlServerRuntime({
    ...options,
    fromEnv: localDbRuntimeFromEnv(),
    treatAsPlaceholder: false,
  });
}

function mergeSqlServerRuntime(options: {
  stored: Partial<StoredGlobalSysConfig>;
  preferStored: boolean;
  fromEnv: GlobalSysRuntimeConfig;
  treatAsPlaceholder: boolean;
}): { config: GlobalSysRuntimeConfig; source: IntegrationSource } {
  const useStored =
    options.preferStored && !options.treatAsPlaceholder && hasGlobalSysConnectionFields(options.stored);
  const primary = useStored ? overlayGlobalSys(options.fromEnv, options.stored) : options.fromEnv;

  return {
    config: {
      ...primary,
      enabled: isGlobalSysEnabled(primary),
    },
    source: useStored ? 'database' : 'env',
  };
}

export function applyLdapInput(
  current: LdapRuntimeConfig,
  input: LdapConfigInput,
): LdapRuntimeConfig {
  const servidor = input.servidor?.trim() || current.host || current.url;
  const useTls = input.usarSSL ?? current.useTls;
  const parsed = parseLdapUrl(servidor);
  const port = input.porta && input.porta > 0 ? input.porta : parsed.port || current.port;
  const bindIdentity = input.bindUser?.trim()
    ? splitBindIdentity(input.bindUser)
    : {
        bindDn: current.bindDn,
        bindUpn: current.bindUpn,
      };
  const password = input.password?.trim() ? input.password : current.bindPassword;
  const url = buildLdapUrl(parsed.host || servidor, port, useTls);

  const next: LdapRuntimeConfig = {
    ...current,
    url,
    host: parsed.host || current.host,
    port,
    baseDn: input.baseDN?.trim() || current.baseDn,
    bindDn: bindIdentity.bindDn,
    bindUpn: bindIdentity.bindUpn,
    bindPassword: password,
    useTls,
    groupPrefix: input.grupoAD?.trim() || current.groupPrefix,
  };

  return {
    ...next,
    enabled: isLdapEnabled(next),
  };
}

export function applyGlobalSysInput(
  current: GlobalSysRuntimeConfig,
  input: GlobalSysConfigInput,
): GlobalSysRuntimeConfig {
  const next: GlobalSysRuntimeConfig = {
    ...current,
    server: input.server?.trim() || current.server,
    port: input.port && input.port > 0 ? input.port : current.port,
    name: input.database?.trim() || current.name,
    domain: input.domain != null ? input.domain.trim() : current.domain,
    authMode: input.authMode != null ? input.authMode.trim() : current.authMode,
    user: input.user?.trim() || current.user,
    password: input.password?.trim() ? input.password : current.password,
    encrypt: input.encrypt ?? current.encrypt,
    trustServerCertificate: input.trustServerCertificate ?? current.trustServerCertificate,
  };

  return {
    ...next,
    enabled: isGlobalSysEnabled(next),
  };
}

export function toStoredLdapConfig(config: LdapRuntimeConfig): StoredLdapConfig {
  return {
    url: config.url,
    host: config.host,
    port: config.port,
    baseDn: config.baseDn,
    bindDn: config.bindDn,
    bindUpn: config.bindUpn,
    bindPassword: config.bindPassword,
    useTls: config.useTls,
    groupPrefix: config.groupPrefix,
  };
}

export function toStoredGlobalSysConfig(config: GlobalSysRuntimeConfig): StoredGlobalSysConfig {
  return {
    server: config.server,
    port: config.port,
    name: config.name,
    domain: config.domain,
    authMode: config.authMode,
    user: config.user,
    password: config.password,
    encrypt: config.encrypt,
    trustServerCertificate: config.trustServerCertificate,
    connectionTimeoutMs: config.connectionTimeoutMs,
    requestTimeoutMs: config.requestTimeoutMs,
  };
}

export function sqlServerRuntimeToDatabaseUrl(config: GlobalSysRuntimeConfig): string {
  const user =
    config.domain && !config.user.includes('\\') && !config.user.includes('@')
      ? `${config.domain}\\${config.user}`
      : config.user;

  return buildDatabaseUrl({
    server: config.server,
    port: config.port,
    user,
    password: config.password,
    database: config.name,
    encrypt: config.encrypt,
    trustServerCertificate: config.trustServerCertificate,
    connectionTimeoutMs: config.connectionTimeoutMs,
    requestTimeoutMs: config.requestTimeoutMs,
  });
}

export function redactLdapForAudit(config: StoredLdapConfig): Record<string, unknown> {
  return {
    url: config.url,
    host: config.host,
    port: config.port,
    baseDn: config.baseDn,
    bindUser: composeBindUser(config.bindDn, config.bindUpn),
    useTls: config.useTls,
    groupPrefix: config.groupPrefix,
    passwordSet: Boolean(config.bindPassword),
  };
}

export function redactGlobalSysForAudit(config: StoredGlobalSysConfig): Record<string, unknown> {
  return {
    server: config.server,
    port: config.port,
    name: config.name,
    domain: config.domain,
    authMode: config.authMode,
    user: config.user,
    encrypt: config.encrypt,
    trustServerCertificate: config.trustServerCertificate,
    passwordSet: Boolean(config.password),
  };
}

export function isLdapEnabled(config: Pick<LdapRuntimeConfig, 'url' | 'baseDn' | 'bindDn' | 'bindUpn' | 'bindPassword'>): boolean {
  return Boolean(
    config.url &&
      config.baseDn &&
      (config.bindDn || config.bindUpn) &&
      config.bindPassword,
  );
}

export function isGlobalSysEnabled(
  config: Pick<GlobalSysRuntimeConfig, 'server' | 'name' | 'user' | 'password'>,
): boolean {
  return Boolean(config.server && config.name && config.user && config.password);
}

function overlayLdap(base: LdapRuntimeConfig, stored: Partial<StoredLdapConfig>): LdapRuntimeConfig {
  const host = stored.host || (stored.url ? parseLdapUrl(stored.url).host : '') || base.host;
  const useTls = stored.useTls ?? (stored.url ? parseLdapUrl(stored.url).useTls : base.useTls);
  const port = stored.port || base.port;
  const url = stored.url || (host ? buildLdapUrl(host, port, useTls) : base.url);
  const hasStoredBind = Boolean(stored.bindDn || stored.bindUpn);

  return {
    ...base,
    url,
    host,
    port,
    baseDn: stored.baseDn || base.baseDn,
    bindDn: hasStoredBind ? (stored.bindDn ?? '') : base.bindDn,
    bindUpn: hasStoredBind ? (stored.bindUpn ?? '') : base.bindUpn,
    bindPassword: stored.bindPassword || base.bindPassword,
    useTls,
    groupPrefix: stored.groupPrefix || base.groupPrefix,
  };
}

function overlayGlobalSys(
  base: GlobalSysRuntimeConfig,
  stored: Partial<StoredGlobalSysConfig>,
): GlobalSysRuntimeConfig {
  return {
    ...base,
    server: stored.server || base.server,
    port: stored.port || base.port,
    name: stored.name || base.name,
    domain: stored.domain ?? base.domain,
    authMode: stored.authMode ?? base.authMode,
    user: stored.user || base.user,
    password: stored.password || base.password,
    encrypt: stored.encrypt ?? base.encrypt,
    trustServerCertificate: stored.trustServerCertificate ?? base.trustServerCertificate,
    connectionTimeoutMs: stored.connectionTimeoutMs || base.connectionTimeoutMs,
    requestTimeoutMs: stored.requestTimeoutMs || base.requestTimeoutMs,
  };
}

function hasLdapConnectionFields(stored: Partial<StoredLdapConfig>): boolean {
  return Boolean((stored.url || stored.host) && stored.baseDn && (stored.bindDn || stored.bindUpn));
}

function hasGlobalSysConnectionFields(stored: Partial<StoredGlobalSysConfig>): boolean {
  return Boolean(stored.server && stored.name && stored.user);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
  }

  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  return undefined;
}
