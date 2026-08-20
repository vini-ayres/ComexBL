import { Router } from 'express';
import { adminIntegrationsController } from '../controllers/admin-integrations.controller.js';
import { adminUsersController } from '../controllers/admin-users.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth);

adminRoutes.get(
  '/integrations/ldap',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.getLdap,
);

adminRoutes.put(
  '/integrations/ldap',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.saveLdap,
);

adminRoutes.post(
  '/integrations/ldap/test',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.testLdap,
);

adminRoutes.post(
  '/integrations/ldap/sync',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.syncLdap,
);

adminRoutes.get(
  '/integrations/globalsys',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.getGlobalSys,
);

adminRoutes.put(
  '/integrations/globalsys',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.saveGlobalSys,
);

adminRoutes.post(
  '/integrations/globalsys/test',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.testGlobalSys,
);

adminRoutes.get(
  '/integrations/local-db',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.getLocalDb,
);

adminRoutes.put(
  '/integrations/local-db',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.saveLocalDb,
);

adminRoutes.post(
  '/integrations/local-db/test',
  requirePermission('configurar_integracoes'),
  adminIntegrationsController.testLocalDb,
);

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
