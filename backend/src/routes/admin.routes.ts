import { Router } from 'express';
import { adminUsersController } from '../controllers/admin-users.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth);

adminRoutes.get(
  '/users',
  requirePermission('administrar_usuarios'),
  adminUsersController.listUsers,
);

adminRoutes.post(
  '/users/sync',
  requirePermission('administrar_usuarios'),
  adminUsersController.syncUsers,
);

adminRoutes.patch(
  '/users/:id/status',
  requirePermission('administrar_usuarios'),
  adminUsersController.updateStatus,
);

adminRoutes.get(
  '/rbac/ad-groups',
  requirePermission('administrar_usuarios'),
  adminUsersController.listAdGroups,
);

adminRoutes.get(
  '/rbac/permissions',
  requirePermission('administrar_usuarios'),
  adminUsersController.listPermissions,
);
