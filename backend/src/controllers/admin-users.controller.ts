import type { Request, Response } from 'express';
import { LDAP_AD_GROUPS, ROLE_PRIORITY } from '../config/ldap-groups.js';
import { BadRequestError } from '../errors/AppError.js';
import { authRepository } from '../repositories/auth.repository.js';
import { userSyncService } from '../services/user-sync.service.js';
import { getClientIp } from '../middlewares/auth.middleware.js';

const ALLOWED_ROLE_NAMES = new Set<string>(LDAP_AD_GROUPS.map((group) => group.roleName));
const ALLOWED_GROUP_NAMES = new Set<string>(LDAP_AD_GROUPS.map((group) => group.name));

function roleSortScore(roleName: string): number {
  return ROLE_PRIORITY[roleName] ?? 0;
}

const ALLOWED_STATUS = new Set(['ativo', 'inativo', 'bloqueado']);

export class AdminUsersController {
  listUsers = async (_req: Request, res: Response): Promise<void> => {
    const [users, lastSyncAt] = await Promise.all([
      authRepository.listUsers(),
      authRepository.getLastSyncAt(),
    ]);

    res.json({
      users,
      lastSyncAt: lastSyncAt?.toISOString() ?? null,
    });
  };

  syncUsers = async (req: Request, res: Response): Promise<void> => {
    const result = await userSyncService.syncFromActiveDirectory();

    await authRepository.writeAuditLog({
      userId: req.authUser?.id,
      userLogin: req.authUser?.login ?? 'system',
      action: 'sync_ad_users',
      entityType: 'admin_users',
      valuesAfter: result as unknown as Record<string, unknown>,
      ipAddress: getClientIp(req),
    });

    res.json(result);
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const userId = Number(req.params.id);
    const status = String(req.body?.status ?? '').trim().toLowerCase();

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestError('ID de usuário inválido.');
    }

    if (!ALLOWED_STATUS.has(status)) {
      throw new BadRequestError('Status inválido. Use: ativo, inativo ou bloqueado.');
    }

    const existing = await authRepository.findUserById(userId);

    if (!existing) {
      throw new BadRequestError('Usuário não encontrado.');
    }

    const updated = await authRepository.updateUserStatus(userId, status);

    await authRepository.writeAuditLog({
      userId: req.authUser?.id,
      userLogin: req.authUser?.login ?? 'system',
      action: 'update_user_status',
      entityType: 'admin_users',
      recordRef: String(userId),
      valuesBefore: { status: existing.Status },
      valuesAfter: { status },
      ipAddress: getClientIp(req),
    });

    res.json({
      id: updated.Id,
      status: updated.Status,
    });
  };

  listAdGroups = async (_req: Request, res: Response): Promise<void> => {
    const groups = (await authRepository.listAdGroups()).filter((group) =>
      ALLOWED_GROUP_NAMES.has(group.Name),
    );
    const sorted = [...groups].sort(
      (a, b) => roleSortScore(b.defaultRole.Name) - roleSortScore(a.defaultRole.Name),
    );

    res.json({
      groups: sorted.map((group) => ({
        id: group.Id,
        nomeGrupo: group.Name,
        dn: group.DistinguishedName,
        perfilMapeado: group.defaultRole.Name,
        usuarios: group._count.users,
        sincronizadoEm: group.SyncedAt?.toISOString() ?? null,
      })),
    });
  };

  listPermissions = async (_req: Request, res: Response): Promise<void> => {
    const [roles, permissions] = await Promise.all([
      authRepository.listRolesWithPermissions(),
      authRepository.listPermissionCatalog(),
    ]);

    const sortedRoles = roles
      .filter((role) => ALLOWED_ROLE_NAMES.has(role.Name))
      .sort((a, b) => roleSortScore(b.Name) - roleSortScore(a.Name) || a.Name.localeCompare(b.Name));

    res.json({
      permissoes: permissions.map((permission) => ({
        chave: permission.Key,
        label: permission.Label,
        descricao: permission.Description ?? '',
        modulo: permission.Module ?? null,
      })),
      perfis: sortedRoles.map((role) => ({
        nome: role.Name,
        descricao: role.Description ?? '',
        permissoes: role.permissions.map((item) => item.permission.Key),
        usuarios: role._count.users,
        gruposAD: role.adGroups.map((group) => group.Name),
      })),
    });
  };
}

export const adminUsersController = new AdminUsersController();
