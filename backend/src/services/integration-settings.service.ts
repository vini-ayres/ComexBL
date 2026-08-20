import {
  applyGlobalSysInput,
  applyLdapInput,
  composeBindUser,
  mergeGlobalSysRuntime,
  mergeLdapRuntime,
  mergeLocalDbRuntime,
  parseStoredGlobalSysConfig,
  parseStoredLdapConfig,
  redactGlobalSysForAudit,
  redactLdapForAudit,
  sqlServerRuntimeToDatabaseUrl,
  toStoredGlobalSysConfig,
  toStoredLdapConfig,
} from '../mappers/integration-config.mapper.js';
import { integrationConfigRepository } from '../repositories/integration-config.repository.js';
import { authRepository } from '../repositories/auth.repository.js';
import { LDAP_AD_GROUPS } from '../config/ldap-groups.js';
import { BadRequestError } from '../errors/AppError.js';
import { reconnectPrisma } from '../prisma/client.js';
import { INTEGRATION_TYPES } from '../types/integration.types.js';
import type {
  GlobalSysConfigInput,
  GlobalSysConfigResponse,
  GlobalSysRuntimeConfig,
  IntegrationStatus,
  LdapConfigInput,
  LdapConfigResponse,
  LdapRuntimeConfig,
  LocalDbConfigResponse,
} from '../types/integration.types.js';

const ALLOWED_GROUP_NAMES = new Set<string>(LDAP_AD_GROUPS.map((group) => group.name));

export class IntegrationSettingsService {
  private ldapCache: LdapRuntimeConfig | null = null;
  private globalsysCache: GlobalSysRuntimeConfig | null = null;
  private localDbCache: GlobalSysRuntimeConfig | null = null;

  invalidate(): void {
    this.ldapCache = null;
    this.globalsysCache = null;
    this.localDbCache = null;
  }

  async getLdapRuntimeConfig(): Promise<LdapRuntimeConfig> {
    if (this.ldapCache) {
      return this.ldapCache;
    }

    const record = await integrationConfigRepository.findLdap();
    const merged = mergeLdapRuntime({
      stored: parseStoredLdapConfig(record?.ConfigJson),
      preferStored: Boolean(record?.UpdatedByUserId),
    });

    this.ldapCache = merged.config;
    return merged.config;
  }

  async getGlobalSysRuntimeConfig(): Promise<GlobalSysRuntimeConfig> {
    if (this.globalsysCache) {
      return this.globalsysCache;
    }

    const record = await integrationConfigRepository.findGlobalSys();
    const merged = mergeGlobalSysRuntime({
      stored: parseStoredGlobalSysConfig(record?.ConfigJson),
      preferStored: Boolean(record?.UpdatedByUserId),
    });

    this.globalsysCache = merged.config;
    return merged.config;
  }

  async getLocalDbRuntimeConfig(): Promise<GlobalSysRuntimeConfig> {
    if (this.localDbCache) {
      return this.localDbCache;
    }

    const record = await integrationConfigRepository.findLocalDb();
    const merged = mergeLocalDbRuntime({
      stored: parseStoredGlobalSysConfig(record?.ConfigJson),
      preferStored: Boolean(record?.UpdatedByUserId),
    });

    this.localDbCache = merged.config;
    return merged.config;
  }

  async applyStoredLocalDbOverride(): Promise<void> {
    const record = await integrationConfigRepository.findLocalDb();
    if (!record?.UpdatedByUserId) {
      return;
    }

    const config = await this.getLocalDbRuntimeConfig();
    if (!config.enabled) {
      return;
    }

    await reconnectPrisma(sqlServerRuntimeToDatabaseUrl(config));
  }

  async getLdapPublicConfig(): Promise<LdapConfigResponse> {
    const record = await integrationConfigRepository.findLdap();
    const merged = mergeLdapRuntime({
      stored: parseStoredLdapConfig(record?.ConfigJson),
      preferStored: Boolean(record?.UpdatedByUserId),
    });
    const [usuariosSincronizados, adGroups] = await Promise.all([
      integrationConfigRepository.countActiveUsers(),
      authRepository.listAdGroups(),
    ]);

    const grupos = adGroups
      .filter((group) => ALLOWED_GROUP_NAMES.has(group.Name))
      .map((group) => ({
        id: group.Id,
        nomeGrupo: group.Name,
        dn: group.DistinguishedName,
        perfilMapeado: group.defaultRole.Name,
        usuarios: group._count.users,
        sincronizadoEm: group.SyncedAt?.toISOString() ?? null,
      }));

    this.ldapCache = merged.config;

    return {
      enabled: merged.config.enabled,
      source: merged.source,
      status: normalizeStatus(record?.Status),
      servidor: merged.config.host || merged.config.url,
      porta: merged.config.port,
      baseDN: merged.config.baseDn,
      grupoAD: merged.config.groupPrefix,
      bindUser: composeBindUser(merged.config.bindDn, merged.config.bindUpn),
      passwordSet: Boolean(merged.config.bindPassword),
      usarSSL: merged.config.useTls,
      ultimaSincronizacao: record?.LastSyncAt?.toISOString() ?? null,
      usuariosSincronizados,
      gruposMapeados: grupos.length,
      grupos,
    };
  }

  async getGlobalSysPublicConfig(): Promise<GlobalSysConfigResponse> {
    const record = await integrationConfigRepository.findGlobalSys();
    const merged = mergeGlobalSysRuntime({
      stored: parseStoredGlobalSysConfig(record?.ConfigJson),
      preferStored: Boolean(record?.UpdatedByUserId),
    });

    this.globalsysCache = merged.config;

    const extra = parseStatusExtra(record?.ConfigJson);

    return {
      enabled: merged.config.enabled,
      source: merged.source,
      status: normalizeStatus(record?.Status),
      server: merged.config.server,
      port: merged.config.port,
      database: merged.config.name,
      domain: merged.config.domain,
      authMode: merged.config.authMode,
      user: merged.config.user,
      passwordSet: Boolean(merged.config.password),
      encrypt: merged.config.encrypt,
      trustServerCertificate: merged.config.trustServerCertificate,
      lastCheckAt: record?.LastSyncAt?.toISOString() ?? null,
      latencyMs: extra.latencyMs,
      lastError: extra.lastError,
    };
  }

  async getLocalDbPublicConfig(): Promise<LocalDbConfigResponse> {
    const record = await integrationConfigRepository.findLocalDb();
    const merged = mergeLocalDbRuntime({
      stored: parseStoredGlobalSysConfig(record?.ConfigJson),
      preferStored: Boolean(record?.UpdatedByUserId),
    });

    this.localDbCache = merged.config;
    const extra = parseStatusExtra(record?.ConfigJson);
    const counts = await integrationConfigRepository.countBlRecords();

    return {
      enabled: merged.config.enabled,
      source: merged.source,
      status: normalizeStatus(record?.Status),
      server: merged.config.server,
      port: merged.config.port,
      database: merged.config.name,
      domain: merged.config.domain,
      authMode: merged.config.authMode,
      user: merged.config.user,
      passwordSet: Boolean(merged.config.password),
      encrypt: merged.config.encrypt,
      trustServerCertificate: merged.config.trustServerCertificate,
      lastCheckAt: record?.LastSyncAt?.toISOString() ?? null,
      latencyMs: extra.latencyMs,
      lastError: extra.lastError,
      masters: counts.masters,
      houses: counts.houses,
    };
  }

  async previewLdapConfig(input: LdapConfigInput): Promise<LdapRuntimeConfig> {
    const current = await this.getLdapRuntimeConfig();
    return applyLdapInput(current, input);
  }

  async previewGlobalSysConfig(input: GlobalSysConfigInput): Promise<GlobalSysRuntimeConfig> {
    const current = await this.getGlobalSysRuntimeConfig();
    return applyGlobalSysInput(current, input);
  }

  async previewLocalDbConfig(input: GlobalSysConfigInput): Promise<GlobalSysRuntimeConfig> {
    const current = await this.getLocalDbRuntimeConfig();
    return applyGlobalSysInput(current, input);
  }

  async saveLdapConfig(input: LdapConfigInput, userId: number): Promise<LdapConfigResponse> {
    const next = await this.previewLdapConfig(input);
    this.assertLdapSave(next, input);

    const stored = toStoredLdapConfig(next);
    const currentPublic = await this.getLdapPublicConfig();

    await integrationConfigRepository.upsert({
      type: INTEGRATION_TYPES.ldap,
      configJson: JSON.stringify(stored),
      status: currentPublic.status === 'conectado' ? 'conectado' : 'desconectado',
      updatedByUserId: userId,
    });

    this.invalidate();
    return this.getLdapPublicConfig();
  }

  async saveGlobalSysConfig(
    input: GlobalSysConfigInput,
    userId: number,
  ): Promise<GlobalSysConfigResponse> {
    const next = await this.previewGlobalSysConfig(input);
    this.assertGlobalSysSave(next, input);

    const stored = toStoredGlobalSysConfig(next);
    const currentPublic = await this.getGlobalSysPublicConfig();

    await integrationConfigRepository.upsert({
      type: INTEGRATION_TYPES.globalsysDb,
      configJson: JSON.stringify({
        ...stored,
        lastError: currentPublic.lastError,
        latencyMs: currentPublic.latencyMs,
      }),
      status: currentPublic.status === 'conectado' ? 'conectado' : 'desconectado',
      updatedByUserId: userId,
    });

    this.invalidate();
    return this.getGlobalSysPublicConfig();
  }

  async saveLocalDbConfig(
    input: GlobalSysConfigInput,
    userId: number,
  ): Promise<LocalDbConfigResponse> {
    const next = await this.previewLocalDbConfig(input);
    this.assertSqlServerSave(next, input, 'banco local');

    const stored = toStoredGlobalSysConfig(next);
    const currentPublic = await this.getLocalDbPublicConfig();

    await integrationConfigRepository.upsert({
      type: INTEGRATION_TYPES.localDb,
      configJson: JSON.stringify({
        ...stored,
        lastError: currentPublic.lastError,
        latencyMs: currentPublic.latencyMs,
      }),
      status: currentPublic.status === 'conectado' ? 'conectado' : 'desconectado',
      updatedByUserId: userId,
    });

    this.invalidate();
    try {
      await reconnectPrisma(sqlServerRuntimeToDatabaseUrl(next));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      throw new BadRequestError(
        `Configuração salva, mas a API não reconectou ao banco local: ${message}`,
      );
    }
    return this.getLocalDbPublicConfig();
  }

  async markLdapStatus(status: IntegrationStatus, lastSyncAt?: Date | null): Promise<void> {
    const record = await integrationConfigRepository.findLdap();
    const runtime = await this.getLdapRuntimeConfig();
    const stored = toStoredLdapConfig(runtime);
    const previous = parseStoredLdapConfig(record?.ConfigJson);

    await integrationConfigRepository.upsert({
      type: INTEGRATION_TYPES.ldap,
      configJson: JSON.stringify({
        ...stored,
        bindPassword: previous.bindPassword || stored.bindPassword,
      }),
      status,
      lastSyncAt,
      updatedByUserId: record?.UpdatedByUserId ?? null,
    });
  }

  async markGlobalSysCheck(params: {
    status: IntegrationStatus;
    latencyMs: number;
    lastError?: string | null;
  }): Promise<void> {
    const record = await integrationConfigRepository.findGlobalSys();
    const runtime = await this.getGlobalSysRuntimeConfig();
    const stored = toStoredGlobalSysConfig(runtime);
    const previous = parseStoredGlobalSysConfig(record?.ConfigJson);

    await integrationConfigRepository.upsert({
      type: INTEGRATION_TYPES.globalsysDb,
      configJson: JSON.stringify({
        ...stored,
        lastError: params.lastError ?? null,
        latencyMs: params.latencyMs,
        password: previous.password || stored.password,
      }),
      status: params.status,
      lastSyncAt: new Date(),
      updatedByUserId: record?.UpdatedByUserId ?? null,
    });

    this.globalsysCache = runtime;
  }

  async markLocalDbCheck(params: {
    status: IntegrationStatus;
    latencyMs: number;
    lastError?: string | null;
  }): Promise<void> {
    const record = await integrationConfigRepository.findLocalDb();
    const runtime = await this.getLocalDbRuntimeConfig();
    const stored = toStoredGlobalSysConfig(runtime);
    const previous = parseStoredGlobalSysConfig(record?.ConfigJson);

    await integrationConfigRepository.upsert({
      type: INTEGRATION_TYPES.localDb,
      configJson: JSON.stringify({
        ...stored,
        lastError: params.lastError ?? null,
        latencyMs: params.latencyMs,
        password: previous.password || stored.password,
      }),
      status: params.status,
      lastSyncAt: new Date(),
      updatedByUserId: record?.UpdatedByUserId ?? null,
    });

    this.localDbCache = runtime;
  }

  redactLdap(config: LdapRuntimeConfig): Record<string, unknown> {
    return redactLdapForAudit(toStoredLdapConfig(config));
  }

  redactGlobalSys(config: GlobalSysRuntimeConfig): Record<string, unknown> {
    return redactGlobalSysForAudit(toStoredGlobalSysConfig(config));
  }

  private assertLdapSave(config: LdapRuntimeConfig, input: LdapConfigInput): void {
    if (!input.servidor?.trim() && !config.host && !config.url) {
      throw new BadRequestError('Informe o servidor LDAP.');
    }
    if (!config.baseDn) {
      throw new BadRequestError('Informe o Base DN.');
    }
    if (!config.bindDn && !config.bindUpn) {
      throw new BadRequestError('Informe o usuário de bind (DN ou UPN).');
    }
    if (!config.bindPassword) {
      throw new BadRequestError('Informe a senha da conta de serviço LDAP.');
    }
  }

  private assertGlobalSysSave(config: GlobalSysRuntimeConfig, input: GlobalSysConfigInput): void {
    this.assertSqlServerSave(config, input, 'GlobalSys');
  }

  private assertSqlServerSave(
    config: GlobalSysRuntimeConfig,
    input: GlobalSysConfigInput,
    label: string,
  ): void {
    if (!input.server?.trim() && !config.server) {
      throw new BadRequestError(`Informe o servidor do ${label}.`);
    }
    if (!config.name) {
      throw new BadRequestError(`Informe o nome do ${label}.`);
    }
    if (!config.user) {
      throw new BadRequestError(`Informe o usuário de conexão do ${label}.`);
    }
    if (!config.password) {
      throw new BadRequestError(`Informe a senha de conexão do ${label}.`);
    }

    const authMode = config.authMode.trim().toLowerCase();
    if (authMode === 'ntlm' && !config.domain.trim()) {
      throw new BadRequestError('Informe o domínio quando o modo de autenticação for NTLM.');
    }
  }
}

function normalizeStatus(status: string | null | undefined): IntegrationStatus {
  if (status === 'conectado' || status === 'erro') {
    return status;
  }
  return 'desconectado';
}

function parseStatusExtra(raw: string | null | undefined): {
  latencyMs: number | null;
  lastError: string | null;
} {
  if (!raw) {
    return { latencyMs: null, lastError: null };
  }

  try {
    const parsed = JSON.parse(raw) as { latencyMs?: unknown; lastError?: unknown };
    return {
      latencyMs: typeof parsed.latencyMs === 'number' ? parsed.latencyMs : null,
      lastError: typeof parsed.lastError === 'string' ? parsed.lastError : null,
    };
  } catch {
    return { latencyMs: null, lastError: null };
  }
}

export const integrationSettingsService = new IntegrationSettingsService();
