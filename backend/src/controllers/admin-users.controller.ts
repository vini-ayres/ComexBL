import type { Request, Response } from 'express';
import { BadRequestError } from '../errors/AppError.js';
import { authRepository } from '../repositories/auth.repository.js';
import { userSyncService } from '../services/user-sync.service.js';
import { getClientIp } from '../middlewares/auth.middleware.js';

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
    const groups = await authRepository.listAdGroups();
    const users = await authRepository.listUsers();

    res.json({
      groups: groups.map((group) => ({
        id: group.Id,
        nomeGrupo: group.Name,
        dn: group.DistinguishedName,
        perfilMapeado: group.defaultRole.Name,
        usuarios: users.filter((user) => user.grupoAD === group.Name).length,
        sincronizadoEm: group.SyncedAt?.toISOString() ?? null,
      })),
    });
  };

  listPermissions = async (_req: Request, res: Response): Promise<void> => {
    const { prisma } = await import('../prisma/client.js');
    const roles = await prisma.appRole.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { Name: 'asc' },
    });

    const permissions = await prisma.appPermission.findMany({
      orderBy: { Key: 'asc' },
    });

    res.json({
      permissoes: permissions.map((permission) => ({
        chave: permission.Key,
        label: permission.Label,
        descricao: permission.Description ?? '',
      })),
      perfis: roles.map((role) => ({
        nome: role.Name,
        permissoes: role.permissions.map((item) => item.permission.Key),
      })),
    });
  };
}

export const adminUsersController = new AdminUsersController();
