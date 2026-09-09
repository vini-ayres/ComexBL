import { prisma } from '../prisma/client.js';
import { INTEGRATION_TYPES, type IntegrationStatus, type IntegrationType } from '../types/integration.types.js';

export class IntegrationConfigRepository {
  findByType(type: IntegrationType) {
    return prisma.appIntegrationConfig.findUnique({
      where: { Type: type },
    });
  }

  findLdap() {
    return this.findByType(INTEGRATION_TYPES.ldap);
  }

  findGlobalSys() {
    return this.findByType(INTEGRATION_TYPES.globalsysDb);
  }

  findLocalDb() {
    return this.findByType(INTEGRATION_TYPES.localDb);
  }

  upsert(params: {
    type: IntegrationType;
    configJson: string;
    status: IntegrationStatus;
    lastSyncAt?: Date | null;
    updatedByUserId?: number | null;
  }) {
    return prisma.appIntegrationConfig.upsert({
      where: { Type: params.type },
      create: {
        Type: params.type,
        ConfigJson: params.configJson,
        Status: params.status,
        LastSyncAt: params.lastSyncAt ?? null,
        UpdatedByUserId: params.updatedByUserId ?? null,
      },
      update: {
        ConfigJson: params.configJson,
        Status: params.status,
        LastSyncAt: params.lastSyncAt === undefined ? undefined : params.lastSyncAt,
        UpdatedByUserId: params.updatedByUserId === undefined ? undefined : params.updatedByUserId,
      },
    });
  }

  countBlRecords() {
    return Promise.all([
      prisma.blMaster.count(),
      prisma.blHouse.count(),
    ]).then(([masters, houses]) => ({ masters, houses }));
  }

  countActiveUsers() {
    return prisma.appUser.count({
      where: { Status: 'ativo' },
    });
  }
}

export const integrationConfigRepository = new IntegrationConfigRepository();
