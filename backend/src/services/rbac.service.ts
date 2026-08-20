import type { AuthenticatedUser } from '../types/auth.types.js';

type UserWithRelations = NonNullable<
  Awaited<ReturnType<import('../repositories/auth.repository.js').AuthRepository['findUserById']>>
>;

export class RbacService {
  mapUserToAuthenticatedUser(user: UserWithRelations): AuthenticatedUser {
    const roles = user.roles.map((item) => item.role.Name);
    const primaryRoleEntry =
      user.roles.find((item) => item.IsPrimary) ?? user.roles[0] ?? null;
    const primaryAdGroup = user.adGroups[0]?.adGroup ?? null;

    const permissionSet = new Set<string>();
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissionSet.add(rolePermission.permission.Key);
      }
    }

    return {
      id: user.Id,
      login: user.Login,
      email: user.Email,
      displayName: user.DisplayName,
      status: user.Status,
      primaryRole: primaryRoleEntry?.role.Name ?? null,
      primaryAdGroup: primaryAdGroup?.Name ?? null,
      roles,
      permissions: [...permissionSet],
    };
  }

  hasPermission(user: AuthenticatedUser, permission: string): boolean {
    return user.permissions.includes(permission);
  }

  hasAnyPermission(user: AuthenticatedUser, permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(user, permission));
  }
}

export const rbacService = new RbacService();
