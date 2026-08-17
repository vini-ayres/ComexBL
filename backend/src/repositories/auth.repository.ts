import { prisma } from '../prisma/client.js';
import { pickPrimaryRole } from '../config/ldap-groups.js';
import type { AdminUserListItem } from '../types/auth.types.js';

const AVATAR_COLORS = [
  '#1B3153',
  '#EA8022',
  '#2563EB',
  '#16A34A',
  '#DC2626',
  '#7991B2',
  '#CA8A04',
];

function avatarColorForLogin(login: string): string {
  let hash = 0;
  for (let i = 0; i < login.length; i += 1) {
    hash = (hash * 31 + login.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export class AuthRepository {
  async findUserById(userId: number) {
    return prisma.appUser.findUnique({
      where: { Id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        adGroups: {
          include: { adGroup: true },
        },
      },
    });
  }

  async findUserByLogin(login: string) {
    return prisma.appUser.findUnique({
      where: { Login: login.toLowerCase() },
    });
  }

  async listAdGroups() {
    return prisma.appAdGroup.findMany({
      include: { defaultRole: true },
      orderBy: { Name: 'asc' },
    });
  }

  async upsertUserFromLdap(params: {
    login: string;
    email: string;
    displayName: string;
    adObjectId: string | null;
    syncedAt: Date;
  }) {
    const login = params.login.toLowerCase();
    const email = params.email.toLowerCase();

    return prisma.appUser.upsert({
      where: { Login: login },
      update: {
        Email: email,
        DisplayName: params.displayName,
        AdObjectId: params.adObjectId,
        SyncedAt: params.syncedAt,
      },
      create: {
        Login: login,
        Email: email,
        DisplayName: params.displayName,
        AdObjectId: params.adObjectId,
        AvatarColor: avatarColorForLogin(login),
        Status: 'ativo',
        SyncedAt: params.syncedAt,
      },
    });
  }

  async syncUserGroupsAndRole(params: {
    userId: number;
    adGroupNames: string[];
    syncedAt: Date;
  }) {
    const adGroups = await prisma.appAdGroup.findMany({
      where: { Name: { in: params.adGroupNames } },
      include: { defaultRole: true },
    });

    const roleNames = adGroups.map((group) => group.defaultRole.Name);
    const primaryRoleName = pickPrimaryRole(roleNames);
    const primaryAdGroup =
      adGroups.find((group) => group.defaultRole.Name === primaryRoleName) ??
      adGroups[0] ??
      null;

    await prisma.$transaction(async (tx) => {
      await tx.appUserAdGroup.deleteMany({
        where: { UserId: params.userId },
      });

      if (adGroups.length > 0) {
        await tx.appUserAdGroup.createMany({
          data: adGroups.map((group) => ({
            UserId: params.userId,
            AdGroupId: group.Id,
          })),
        });
      }

      await tx.appUserRole.deleteMany({
        where: { UserId: params.userId },
      });

      if (primaryRoleName) {
        const role = await tx.appRole.findUnique({
          where: { Name: primaryRoleName },
        });

        if (role) {
          await tx.appUserRole.create({
            data: {
              UserId: params.userId,
              RoleId: role.Id,
              IsPrimary: true,
            },
          });
        }
      }

      await tx.appUser.update({
        where: { Id: params.userId },
        data: { SyncedAt: params.syncedAt },
      });
    });

    return {
      primaryRoleName,
      primaryAdGroupName: primaryAdGroup?.Name ?? null,
    };
  }

  async updateLastLogin(userId: number): Promise<void> {
    await prisma.appUser.update({
      where: { Id: userId },
      data: { LastLoginAt: new Date() },
    });
  }

  async updateUserStatus(userId: number, status: string) {
    return prisma.appUser.update({
      where: { Id: userId },
      data: { Status: status },
    });
  }

  async updateAdGroupSync(groupId: number, dn: string, syncedAt: Date) {
    return prisma.appAdGroup.update({
      where: { Id: groupId },
      data: {
        DistinguishedName: dn,
        SyncedAt: syncedAt,
      },
    });
  }

  async listUsers(): Promise<AdminUserListItem[]> {
    const users = await prisma.appUser.findMany({
      include: {
        roles: {
          include: { role: true },
        },
        adGroups: {
          include: { adGroup: true },
        },
      },
      orderBy: { DisplayName: 'asc' },
    });

    return users.map((user) => {
      const primaryRole =
        user.roles.find((item) => item.IsPrimary)?.role ??
        user.roles[0]?.role ??
        null;
      const primaryGroup = user.adGroups[0]?.adGroup ?? null;

      return {
        id: user.Id,
        login: user.Login,
        email: user.Email,
        nome: user.DisplayName,
        grupoAD: primaryGroup?.Name ?? '—',
        perfil: primaryRole?.Name ?? '—',
        status: user.Status,
        ultimoAcesso: user.LastLoginAt?.toISOString() ?? null,
        sincronizadoEm: user.SyncedAt?.toISOString() ?? null,
        avatarColor: user.AvatarColor,
      };
    });
  }

  async getLastSyncAt(): Promise<Date | null> {
    const latest = await prisma.appUser.findFirst({
      where: { SyncedAt: { not: null } },
      orderBy: { SyncedAt: 'desc' },
      select: { SyncedAt: true },
    });

    return latest?.SyncedAt ?? null;
  }

  async deactivateUsersNotInLogins(activeLogins: string[], syncedAt: Date): Promise<number> {
    if (activeLogins.length === 0) {
      return 0;
    }

    const result = await prisma.appUser.updateMany({
      where: {
        Login: { notIn: activeLogins.map((login) => login.toLowerCase()) },
        Status: { not: 'bloqueado' },
        SyncedAt: { not: null },
      },
      data: {
        Status: 'inativo',
        SyncedAt: syncedAt,
      },
    });

    return result.count;
  }

  async writeAuditLog(params: {
    userId?: number | null;
    userLogin: string;
    action: string;
    entityType: string;
    recordRef?: string | null;
    valuesBefore?: Record<string, unknown>;
    valuesAfter?: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> {
    await prisma.appAuditLog.create({
      data: {
        UserId: params.userId ?? null,
        UserLogin: params.userLogin,
        Action: params.action,
        EntityType: params.entityType,
        RecordRef: params.recordRef ?? null,
        ValuesBefore: params.valuesBefore ? JSON.stringify(params.valuesBefore) : null,
        ValuesAfter: params.valuesAfter ? JSON.stringify(params.valuesAfter) : null,
        IpAddress: params.ipAddress ?? null,
      },
    });
  }
}

export const authRepository = new AuthRepository();
