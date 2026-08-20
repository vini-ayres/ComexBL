import { LDAP_AD_GROUPS } from '../config/ldap-groups.js';
import { ForbiddenError } from '../errors/AppError.js';
import { authRepository } from '../repositories/auth.repository.js';
import type { UserSyncResult } from '../types/auth.types.js';
import { integrationSettingsService } from './integration-settings.service.js';
import type { LdapUserEntry } from './ldap.service.js';
import { ldapService } from './ldap.service.js';

export class UserSyncService {
  async syncFromActiveDirectory(): Promise<UserSyncResult> {
    const syncedAt = new Date();
    const adGroups = await authRepository.listAdGroups();
    const activeLogins = new Set<string>();
    let usersCreated = 0;
    let usersUpdated = 0;
    let groupsProcessed = 0;

    for (const configuredGroup of adGroups) {
      const ldapGroup = await ldapService.findGroupByName(configuredGroup.Name);

      if (!ldapGroup) {
        continue;
      }

      groupsProcessed += 1;
      await authRepository.updateAdGroupSync(
        configuredGroup.Id,
        ldapGroup.dn,
        syncedAt,
      );

      const members = await ldapService.listGroupMembers(ldapGroup.dn);

      for (const member of members) {
        await this.upsertSyncedUser(member, syncedAt, activeLogins, () => {
          usersCreated += 1;
        }, () => {
          usersUpdated += 1;
        });
      }
    }

    const usersDeactivated = await authRepository.deactivateUsersNotInLogins(
      [...activeLogins],
      syncedAt,
    );

    await integrationSettingsService.markLdapStatus('conectado', syncedAt);

    return {
      syncedAt: syncedAt.toISOString(),
      groupsProcessed,
      usersCreated,
      usersUpdated,
      usersDeactivated,
      totalActiveUsers: activeLogins.size,
    };
  }

  async provisionUserFromLogin(ldapUser: LdapUserEntry): Promise<{
    userId: number;
    primaryRoleName: string | null;
    primaryAdGroupName: string | null;
  }> {
    if (ldapUser.adGroupNames.length === 0) {
      throw new ForbiddenError(
        'Usuário autenticado no AD, porém não pertence a nenhum grupo autorizado (GG_OCR_BL_*).',
      );
    }

    const syncedAt = new Date();
    const existing = await authRepository.findUserByLogin(ldapUser.login);
    const user = await authRepository.upsertUserFromLdap({
      login: ldapUser.login,
      email: ldapUser.email,
      displayName: ldapUser.displayName,
      adObjectId: ldapUser.adObjectId,
      syncedAt,
    });

    if (!existing) {
      // counted as created during sync only
    }

    const mapping = await authRepository.syncUserGroupsAndRole({
      userId: user.Id,
      adGroupNames: ldapUser.adGroupNames,
      syncedAt,
    });

    return {
      userId: user.Id,
      primaryRoleName: mapping.primaryRoleName,
      primaryAdGroupName: mapping.primaryAdGroupName,
    };
  }

  private async upsertSyncedUser(
    ldapUser: LdapUserEntry,
    syncedAt: Date,
    activeLogins: Set<string>,
    onCreated: () => void,
    onUpdated: () => void,
  ): Promise<void> {
    if (!ldapUser.adGroupNames.length) {
      return;
    }

    const existing = await authRepository.findUserByLogin(ldapUser.login);
    const user = await authRepository.upsertUserFromLdap({
      login: ldapUser.login,
      email: ldapUser.email,
      displayName: ldapUser.displayName,
      adObjectId: ldapUser.adObjectId,
      syncedAt,
    });

    if (existing) {
      onUpdated();
    } else {
      onCreated();
    }

    await authRepository.syncUserGroupsAndRole({
      userId: user.Id,
      adGroupNames: ldapUser.adGroupNames,
      syncedAt,
    });

    activeLogins.add(ldapUser.login.toLowerCase());
  }
}

export const userSyncService = new UserSyncService();

export { LDAP_AD_GROUPS };
