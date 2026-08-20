export const INTEGRATION_TYPES = {
  ldap: 'ldap',
  globalsysDb: 'globalsys_db',
  localDb: 'local_db',
  onedrive: 'onedrive',
} as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[keyof typeof INTEGRATION_TYPES];

export type IntegrationStatus = 'conectado' | 'desconectado' | 'erro';

export type IntegrationSource = 'database' | 'env';

export type GlobalSysAuthMode = 'sql' | 'ntlm';

export interface StoredLdapConfig {
  url: string;
  host: string;
  port: number;
  baseDn: string;
  bindDn: string;
  bindUpn: string;
  bindPassword: string;
  useTls: boolean;
  groupPrefix: string;
}

export interface StoredGlobalSysConfig {
  server: string;
  port: number;
  name: string;
  domain: string;
  authMode: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectionTimeoutMs: number;
  requestTimeoutMs: number;
}

export interface LdapRuntimeConfig extends StoredLdapConfig {
  enabled: boolean;
}

export interface GlobalSysRuntimeConfig extends StoredGlobalSysConfig {
  enabled: boolean;
}

export interface LdapConfigInput {
  servidor?: string;
  porta?: number;
  baseDN?: string;
  grupoAD?: string;
  bindUser?: string;
  password?: string;
  usarSSL?: boolean;
}

export interface GlobalSysConfigInput {
  server?: string;
  port?: number;
  database?: string;
  domain?: string;
  authMode?: string;
  user?: string;
  password?: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
}

export interface LdapAdGroupDto {
  id: number;
  nomeGrupo: string;
  dn: string;
  perfilMapeado: string;
  usuarios: number;
  sincronizadoEm: string | null;
}

export interface LdapConfigResponse {
  enabled: boolean;
  source: IntegrationSource;
  status: IntegrationStatus;
  servidor: string;
  porta: number;
  baseDN: string;
  grupoAD: string;
  bindUser: string;
  passwordSet: boolean;
  usarSSL: boolean;
  ultimaSincronizacao: string | null;
  usuariosSincronizados: number;
  gruposMapeados: number;
  grupos: LdapAdGroupDto[];
}

export interface GlobalSysConfigResponse {
  enabled: boolean;
  source: IntegrationSource;
  status: IntegrationStatus;
  server: string;
  port: number;
  database: string;
  domain: string;
  authMode: string;
  user: string;
  passwordSet: boolean;
  encrypt: boolean;
  trustServerCertificate: boolean;
  lastCheckAt: string | null;
  latencyMs: number | null;
  lastError: string | null;
}

export interface LocalDbConfigResponse extends GlobalSysConfigResponse {
  masters: number;
  houses: number;
}

export interface IntegrationTestResult {
  connected: boolean;
  status: IntegrationStatus;
  responseTimeMs: number;
  message: string;
  authMode?: string;
}
