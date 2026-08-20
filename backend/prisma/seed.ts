import { prisma } from '../src/prisma/client.js';
import { env } from '../src/config/env.js';
import {
  globalsysRuntimeFromEnv,
  ldapRuntimeFromEnv,
  localDbRuntimeFromEnv,
  toStoredGlobalSysConfig,
  toStoredLdapConfig,
} from '../src/mappers/integration-config.mapper.js';

const ROLES = [
  { name: 'Administrador', description: 'Acesso total ao sistema e configurações' },
  { name: 'Supervisor', description: 'Supervisão operacional e aprovação de divergências' },
  { name: 'Operador', description: 'Operação diária de BL e apoio humano' },
] as const;

const PERMISSIONS = [
  {
    key: 'visualizar_bl',
    label: 'Visualizar BL',
    description: 'Acessar dashboard, detalhes e documentos de BL',
    module: 'operacao',
  },
  {
    key: 'editar_bl',
    label: 'Editar',
    description: 'Corrigir campos extraídos e dados de apoio humano',
    module: 'operacao',
  },
  {
    key: 'aprovar_divergencias',
    label: 'Aprovar Divergências',
    description: 'Aceitar, manter ou encaminhar divergências GlobalSys',
    module: 'operacao',
  },
  {
    key: 'administrar_usuarios',
    label: 'Administrar Usuários',
    description: 'Gerenciar usuários, grupos AD e permissões',
    module: 'admin',
  },
  {
    key: 'configurar_integracoes',
    label: 'Configurar Integrações',
    description: 'LDAP, OneDrive e bancos de dados',
    module: 'admin',
  },
  {
    key: 'auditoria',
    label: 'Auditoria',
    description: 'Consultar trilha de auditoria do sistema',
    module: 'admin',
  },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Administrador: [
    'visualizar_bl',
    'editar_bl',
    'aprovar_divergencias',
    'administrar_usuarios',
    'configurar_integracoes',
    'auditoria',
  ],
  Supervisor: ['visualizar_bl', 'editar_bl', 'aprovar_divergencias', 'auditoria'],
  Operador: ['visualizar_bl', 'editar_bl'],
};

const AD_GROUPS = [
  {
    name: 'GG_OCR_BL_ADMIN',
    dn: 'CN=GG_OCR_BL_ADMIN,OU=Grupos,OU=OCR,DC=empresa,DC=com,DC=br',
    roleName: 'Administrador',
  },
  {
    name: 'GG_OCR_BL_SUPERVISOR',
    dn: 'CN=GG_OCR_BL_SUPERVISOR,OU=Grupos,OU=OCR,DC=empresa,DC=com,DC=br',
    roleName: 'Supervisor',
  },
  {
    name: 'GG_OCR_BL_OPERADOR',
    dn: 'CN=GG_OCR_BL_OPERADOR,OU=Grupos,OU=OCR,DC=empresa,DC=com,DC=br',
    roleName: 'Operador',
  },
] as const;

const OBSOLETE_AD_GROUPS = [
  'GG_COMEX_ADMIN',
  'GG_COMEX_SUPERVISORES',
  'GG_COMEX_OPERADORES',
  'GG_COMEX_AUDITORIA',
] as const;

const TEST_USER = {
  login: 'teste',
  email: 'teste@empresa.com.br',
  displayName: 'Usuário de Teste',
  avatarColor: '#DC2626',
  adGroupName: 'GG_OCR_BL_ADMIN',
  roleName: 'Administrador',
};

async function removeObsoleteRbac(): Promise<void> {
  await prisma.appAdGroup.deleteMany({
    where: { Name: { in: [...OBSOLETE_AD_GROUPS] } },
  });

  const auditor = await prisma.appRole.findUnique({ where: { Name: 'Auditor' } });
  if (!auditor) return;

  await prisma.appUserRole.deleteMany({ where: { RoleId: auditor.Id } });
  await prisma.appAdGroup.deleteMany({ where: { DefaultRoleId: auditor.Id } });
  await prisma.appRole.delete({ where: { Id: auditor.Id } });
}

async function seedRolesAndPermissions(): Promise<Map<string, number>> {
  const roleIds = new Map<string, number>();

  for (const role of ROLES) {
    const record = await prisma.appRole.upsert({
      where: { Name: role.name },
      update: { Description: role.description, IsSystem: true },
      create: {
        Name: role.name,
        Description: role.description,
        IsSystem: true,
      },
    });
    roleIds.set(role.name, record.Id);
  }

  const permissionIds = new Map<string, number>();

  for (const permission of PERMISSIONS) {
    const record = await prisma.appPermission.upsert({
      where: { Key: permission.key },
      update: {
        Label: permission.label,
        Description: permission.description,
        Module: permission.module,
      },
      create: {
        Key: permission.key,
        Label: permission.label,
        Description: permission.description,
        Module: permission.module,
      },
    });
    permissionIds.set(permission.key, record.Id);
  }

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds.get(roleName);
    if (!roleId) continue;

    for (const permissionKey of permissionKeys) {
      const permissionId = permissionIds.get(permissionKey);
      if (!permissionId) continue;

      await prisma.appRolePermission.upsert({
        where: {
          RoleId_PermissionId: { RoleId: roleId, PermissionId: permissionId },
        },
        update: {},
        create: { RoleId: roleId, PermissionId: permissionId },
      });
    }
  }

  return roleIds;
}

async function seedAdGroups(roleIds: Map<string, number>): Promise<void> {
  const now = new Date();

  for (const group of AD_GROUPS) {
    const roleId = roleIds.get(group.roleName);
    if (!roleId) continue;

    await prisma.appAdGroup.upsert({
      where: { Name: group.name },
      update: {
        DistinguishedName: group.dn,
        DefaultRoleId: roleId,
        SyncedAt: now,
      },
      create: {
        Name: group.name,
        DistinguishedName: group.dn,
        DefaultRoleId: roleId,
        SyncedAt: now,
      },
    });
  }
}

async function seedTestUser(roleIds: Map<string, number>): Promise<void> {
  const now = new Date();
  const adminRoleId = roleIds.get(TEST_USER.roleName);
  const adminGroup = await prisma.appAdGroup.findUnique({
    where: { Name: TEST_USER.adGroupName },
  });

  const user = await prisma.appUser.upsert({
    where: { Login: TEST_USER.login },
    update: {
      DisplayName: TEST_USER.displayName,
      Email: TEST_USER.email,
      AvatarColor: TEST_USER.avatarColor,
      Status: 'ativo',
      SyncedAt: now,
    },
    create: {
      Login: TEST_USER.login,
      Email: TEST_USER.email,
      DisplayName: TEST_USER.displayName,
      AvatarColor: TEST_USER.avatarColor,
      Status: 'ativo',
      SyncedAt: now,
    },
  });

  if (adminRoleId) {
    await prisma.appUserRole.upsert({
      where: {
        UserId_RoleId: { UserId: user.Id, RoleId: adminRoleId },
      },
      update: { IsPrimary: true },
      create: {
        UserId: user.Id,
        RoleId: adminRoleId,
        IsPrimary: true,
      },
    });
  }

  if (adminGroup) {
    await prisma.appUserAdGroup.upsert({
      where: {
        UserId_AdGroupId: { UserId: user.Id, AdGroupId: adminGroup.Id },
      },
      update: {},
      create: {
        UserId: user.Id,
        AdGroupId: adminGroup.Id,
      },
    });
  }
}

async function seedIntegrationDefaults(): Promise<void> {
  const ldapStored = toStoredLdapConfig(ldapRuntimeFromEnv());
  const globalsysStored = toStoredGlobalSysConfig(globalsysRuntimeFromEnv());
  const localDbStored = toStoredGlobalSysConfig(localDbRuntimeFromEnv());

  const defaults = [
    {
      type: 'ldap',
      config: ldapStored,
      enabled: env.ldap.enabled,
    },
    {
      type: 'onedrive',
      config: {
        tenantId: '',
        clientId: '',
        pastaRaiz: '/BLs/Processados',
      },
      enabled: false,
    },
    {
      type: 'globalsys_db',
      config: globalsysStored,
      enabled: env.globalsys.enabled,
    },
    {
      type: 'local_db',
      config: localDbStored,
      enabled: true,
    },
  ] as const;

  for (const item of defaults) {
    const existing = await prisma.appIntegrationConfig.findUnique({
      where: { Type: item.type },
    });

    if (existing?.UpdatedByUserId) {
      continue;
    }

    await prisma.appIntegrationConfig.upsert({
      where: { Type: item.type },
      update: {
        ConfigJson: JSON.stringify(item.config),
        Status: item.enabled ? existing?.Status ?? 'desconectado' : 'desconectado',
      },
      create: {
        Type: item.type,
        ConfigJson: JSON.stringify(item.config),
        Status: 'desconectado',
      },
    });
  }
}

async function main(): Promise<void> {
  console.log('Seed ComexBL — dados de referência (não altera BL_Master/BL_House OCR).');

  const masters = await prisma.blMaster.count();
  const houses = await prisma.blHouse.count();
  console.log(`OCR existente: ${masters} Master(s), ${houses} House(s).`);

  await removeObsoleteRbac();
  console.log('RBAC obsoleto removido (GG_COMEX_* e perfil Auditor).');

  const roleIds = await seedRolesAndPermissions();
  console.log(`Roles/permissões: ${roleIds.size} perfis, ${PERMISSIONS.length} permissões.`);

  await seedAdGroups(roleIds);
  console.log(`Grupos AD: ${AD_GROUPS.length} grupos mapeados.`);

  await seedTestUser(roleIds);
  console.log(`Usuário de teste "${TEST_USER.login}" vinculado ao perfil ${TEST_USER.roleName}.`);

  await seedIntegrationDefaults();
  console.log('Configurações de integração (ldap, onedrive, globalsys_db, local_db) inicializadas.');
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
