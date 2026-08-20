import type { Request, Response } from 'express';
import { BadRequestError, ServiceUnavailableError } from '../errors/AppError.js';
import { checkGlobalSysConnection, closeGlobalSysPool, testSqlServerConfig } from '../globalsys/client.js';
import { getClientIp } from '../middlewares/auth.middleware.js';
import { authRepository } from '../repositories/auth.repository.js';
import { integrationSettingsService } from '../services/integration-settings.service.js';
import { ldapService } from '../services/ldap.service.js';
import { userSyncService } from '../services/user-sync.service.js';
import type {
  GlobalSysConfigInput,
  IntegrationTestResult,
  LdapConfigInput,
} from '../types/integration.types.js';

function toOptionalString(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  return String(value);
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value == null || value === '') {
    return undefined;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return undefined;
}

function parseLdapInput(body: Record<string, unknown>): LdapConfigInput {
  return {
    servidor: toOptionalString(body.servidor),
    porta: toOptionalNumber(body.porta),
    baseDN: toOptionalString(body.baseDN),
    grupoAD: toOptionalString(body.grupoAD),
    bindUser: toOptionalString(body.bindUser),
    password: toOptionalString(body.password),
    usarSSL: toOptionalBoolean(body.usarSSL),
  };
}

function parseGlobalSysInput(body: Record<string, unknown>): GlobalSysConfigInput {
  return {
    server: toOptionalString(body.server),
    port: toOptionalNumber(body.port),
    database: toOptionalString(body.database),
    domain: toOptionalString(body.domain),
    authMode: toOptionalString(body.authMode),
    user: toOptionalString(body.user),
    password: toOptionalString(body.password),
    encrypt: toOptionalBoolean(body.encrypt),
    trustServerCertificate: toOptionalBoolean(body.trustServerCertificate),
  };
}

function ldapErrorMessage(error: unknown): string {
  if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Falha ao conectar ao servidor LDAP.';
}

export class AdminIntegrationsController {
  getLdap = async (_req: Request, res: Response): Promise<void> => {
    res.json(await integrationSettingsService.getLdapPublicConfig());
  };

  saveLdap = async (req: Request, res: Response): Promise<void> => {
    const input = parseLdapInput((req.body ?? {}) as Record<string, unknown>);
    const before = await integrationSettingsService.getLdapPublicConfig();
    const saved = await integrationSettingsService.saveLdapConfig(input, req.authUser!.id);

    await authRepository.writeAuditLog({
      userId: req.authUser?.id,
      userLogin: req.authUser?.login ?? 'system',
      action: 'update_ldap_config',
      entityType: 'integration_ldap',
      valuesBefore: {
        servidor: before.servidor,
        porta: before.porta,
        baseDN: before.baseDN,
        bindUser: before.bindUser,
        usarSSL: before.usarSSL,
        grupoAD: before.grupoAD,
      },
      valuesAfter: {
        servidor: saved.servidor,
        porta: saved.porta,
        baseDN: saved.baseDN,
        bindUser: saved.bindUser,
        usarSSL: saved.usarSSL,
        grupoAD: saved.grupoAD,
      },
      ipAddress: getClientIp(req),
    });

    res.json(saved);
  };

  testLdap = async (req: Request, res: Response): Promise<void> => {
    const input = parseLdapInput((req.body ?? {}) as Record<string, unknown>);
    const config = await integrationSettingsService.previewLdapConfig(input);
    const startedAt = Date.now();

    try {
      await ldapService.testConnection(config);
      const responseTimeMs = Date.now() - startedAt;
      await integrationSettingsService.markLdapStatus('conectado');

      const result: IntegrationTestResult = {
        connected: true,
        status: 'conectado',
        responseTimeMs,
        message: 'Conexão LDAP estabelecida com sucesso.',
      };
      res.json(result);
    } catch (error) {
      const responseTimeMs = Date.now() - startedAt;
      await integrationSettingsService.markLdapStatus('erro');
      const result: IntegrationTestResult = {
        connected: false,
        status: 'erro',
        responseTimeMs,
        message: ldapErrorMessage(error),
      };
      res.json(result);
    }
  };

  syncLdap = async (req: Request, res: Response): Promise<void> => {
    const result = await userSyncService.syncFromActiveDirectory();

    await authRepository.writeAuditLog({
      userId: req.authUser?.id,
      userLogin: req.authUser?.login ?? 'system',
      action: 'sync_ad_users',
      entityType: 'integration_ldap',
      valuesAfter: result as unknown as Record<string, unknown>,
      ipAddress: getClientIp(req),
    });

    res.json(result);
  };

  getGlobalSys = async (_req: Request, res: Response): Promise<void> => {
    res.json(await integrationSettingsService.getGlobalSysPublicConfig());
  };

  saveGlobalSys = async (req: Request, res: Response): Promise<void> => {
    const input = parseGlobalSysInput((req.body ?? {}) as Record<string, unknown>);
    const before = await integrationSettingsService.getGlobalSysPublicConfig();
    const saved = await integrationSettingsService.saveGlobalSysConfig(input, req.authUser!.id);
    await closeGlobalSysPool();

    await authRepository.writeAuditLog({
      userId: req.authUser?.id,
      userLogin: req.authUser?.login ?? 'system',
      action: 'update_globalsys_db_config',
      entityType: 'integration_globalsys',
      valuesBefore: {
        server: before.server,
        port: before.port,
        database: before.database,
        domain: before.domain,
        authMode: before.authMode,
        user: before.user,
        encrypt: before.encrypt,
        trustServerCertificate: before.trustServerCertificate,
      },
      valuesAfter: {
        server: saved.server,
        port: saved.port,
        database: saved.database,
        domain: saved.domain,
        authMode: saved.authMode,
        user: saved.user,
        encrypt: saved.encrypt,
        trustServerCertificate: saved.trustServerCertificate,
      },
      ipAddress: getClientIp(req),
    });

    res.json(saved);
  };

  testGlobalSys = async (req: Request, res: Response): Promise<void> => {
    const input = parseGlobalSysInput((req.body ?? {}) as Record<string, unknown>);
    const config = await integrationSettingsService.previewGlobalSysConfig(input);
    const check = await checkGlobalSysConnection(config);

    await integrationSettingsService.markGlobalSysCheck({
      status: check.connected ? 'conectado' : 'erro',
      latencyMs: check.responseTimeMs,
      lastError: check.connected ? null : (check.error ?? 'Falha ao conectar ao GlobalSys.'),
    });

    if (check.connected) {
      await closeGlobalSysPool();
    }

    const result: IntegrationTestResult = {
      connected: check.connected,
      status: check.connected ? 'conectado' : 'erro',
      responseTimeMs: check.responseTimeMs,
      message: check.connected
        ? 'Conexão com o GlobalSys estabelecida com sucesso.'
        : (check.error ?? 'Falha ao conectar ao GlobalSys.'),
      authMode: check.authMode,
    };
    res.json(result);
  };

  getLocalDb = async (_req: Request, res: Response): Promise<void> => {
    res.json(await integrationSettingsService.getLocalDbPublicConfig());
  };

  saveLocalDb = async (req: Request, res: Response): Promise<void> => {
    const input = parseGlobalSysInput((req.body ?? {}) as Record<string, unknown>);
    const before = await integrationSettingsService.getLocalDbPublicConfig();
    const preview = await integrationSettingsService.previewLocalDbConfig(input);
    const check = await testSqlServerConfig(preview);

    if (!check.connected) {
      throw new BadRequestError(
        `Não foi possível aplicar a configuração do banco local: ${check.error ?? 'falha na conexão.'}`,
      );
    }

    const saved = await integrationSettingsService.saveLocalDbConfig(input, req.authUser!.id);

    await authRepository.writeAuditLog({
      userId: req.authUser?.id,
      userLogin: req.authUser?.login ?? 'system',
      action: 'update_local_db_config',
      entityType: 'integration_local_db',
      valuesBefore: sqlServerAuditFields(before),
      valuesAfter: sqlServerAuditFields(saved),
      ipAddress: getClientIp(req),
    });

    res.json(saved);
  };

  testLocalDb = async (req: Request, res: Response): Promise<void> => {
    const input = parseGlobalSysInput((req.body ?? {}) as Record<string, unknown>);
    const config = await integrationSettingsService.previewLocalDbConfig(input);
    const check = await testSqlServerConfig(config);

    await integrationSettingsService.markLocalDbCheck({
      status: check.connected ? 'conectado' : 'erro',
      latencyMs: check.responseTimeMs,
      lastError: check.connected ? null : (check.error ?? 'Falha ao conectar ao banco local.'),
    });

    const result: IntegrationTestResult = {
      connected: check.connected,
      status: check.connected ? 'conectado' : 'erro',
      responseTimeMs: check.responseTimeMs,
      message: check.connected
        ? 'Conexão com o banco local estabelecida com sucesso.'
        : (check.error ?? 'Falha ao conectar ao banco local.'),
      authMode: check.authMode,
    };
    res.json(result);
  };
}

function sqlServerAuditFields(config: {
  server: string;
  port: number;
  database: string;
  domain: string;
  authMode: string;
  user: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
}) {
  return {
    server: config.server,
    port: config.port,
    database: config.database,
    domain: config.domain,
    authMode: config.authMode,
    user: config.user,
    encrypt: config.encrypt,
    trustServerCertificate: config.trustServerCertificate,
  };
}

export const adminIntegrationsController = new AdminIntegrationsController();
