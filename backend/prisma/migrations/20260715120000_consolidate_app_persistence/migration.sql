BEGIN TRY

BEGIN TRAN;

-- ---------------------------------------------------------------------------
-- Ajustes nas tabelas BL existentes
-- ---------------------------------------------------------------------------

-- BL_Workflow: substituir Responsavel (texto) por FK para APP_User
IF COL_LENGTH('dbo.BL_Workflow', 'ResponsavelUserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_Workflow] ADD [ResponsavelUserId] INT NULL;
END;

IF COL_LENGTH('dbo.BL_Workflow', 'Responsavel') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_Workflow] DROP COLUMN [Responsavel];
END;

-- BL_CampoRevisao: corrigir constraint única e adicionar UpdatedByUserId
IF EXISTS (
    SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_BL_CampoRevisao_Bl_CampoKey'
)
BEGIN
    ALTER TABLE [dbo].[BL_CampoRevisao] DROP CONSTRAINT [UQ_BL_CampoRevisao_Bl_CampoKey];
END;

IF COL_LENGTH('dbo.BL_CampoRevisao', 'UpdatedByUserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_CampoRevisao] ADD [UpdatedByUserId] INT NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_CampoRevisao_BlTarget'
)
BEGIN
    ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [CK_BL_CampoRevisao_BlTarget]
    CHECK (
        ([BlMasterId] IS NOT NULL AND [BlHouseId] IS NULL) OR
        ([BlMasterId] IS NULL AND [BlHouseId] IS NOT NULL)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'UQ_BL_CampoRevisao_Master_CampoKey'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_CampoRevisao_Master_CampoKey]
    ON [dbo].[BL_CampoRevisao]([BlMasterId], [CampoKey])
    WHERE [BlMasterId] IS NOT NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'UQ_BL_CampoRevisao_House_CampoKey'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_CampoRevisao_House_CampoKey]
    ON [dbo].[BL_CampoRevisao]([BlHouseId], [CampoKey])
    WHERE [BlHouseId] IS NOT NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_CampoRevisao_Status'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_CampoRevisao_Status] ON [dbo].[BL_CampoRevisao]([Status]);
END;

-- BL_HistoricoAlteracao: vínculo opcional com usuário autenticado
IF COL_LENGTH('dbo.BL_HistoricoAlteracao', 'UserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_HistoricoAlteracao] ADD [UserId] INT NULL;
END;

-- Índices adicionais em tabelas OCR
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Master_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_Master_Status] ON [dbo].[BL_Master]([Status]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_House_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_House_Status] ON [dbo].[BL_House]([Status]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_Workflow_BlTarget'
)
BEGIN
    ALTER TABLE [dbo].[BL_Workflow] ADD CONSTRAINT [CK_BL_Workflow_BlTarget]
    CHECK (
        ([BlMasterId] IS NOT NULL AND [BlHouseId] IS NULL) OR
        ([BlMasterId] IS NULL AND [BlHouseId] IS NOT NULL)
    );
END;

-- ---------------------------------------------------------------------------
-- Identidade, RBAC e LDAP
-- ---------------------------------------------------------------------------

IF OBJECT_ID(N'[dbo].[APP_User]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_User] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [Login] VARCHAR(100) NOT NULL,
        [Email] VARCHAR(200) NOT NULL,
        [DisplayName] NVARCHAR(200) NOT NULL,
        [Status] VARCHAR(20) NOT NULL CONSTRAINT [DF_APP_User_Status] DEFAULT 'ativo',
        [AdObjectId] VARCHAR(100) NULL,
        [AvatarColor] VARCHAR(20) NULL,
        [LastLoginAt] DATETIME2 NULL,
        [SyncedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_User_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_APP_User] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_APP_User_Login] UNIQUE NONCLUSTERED ([Login]),
        CONSTRAINT [UQ_APP_User_Email] UNIQUE NONCLUSTERED ([Email])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_Role]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_Role] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [Name] VARCHAR(50) NOT NULL,
        [Description] NVARCHAR(300) NULL,
        [IsSystem] BIT NOT NULL CONSTRAINT [DF_APP_Role_IsSystem] DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_Role_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_APP_Role] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_APP_Role_Name] UNIQUE NONCLUSTERED ([Name])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_Permission]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_Permission] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [Key] VARCHAR(50) NOT NULL,
        [Label] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(300) NULL,
        [Module] VARCHAR(50) NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_Permission_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_APP_Permission] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_APP_Permission_Key] UNIQUE NONCLUSTERED ([Key])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_RolePermission]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_RolePermission] (
        [RoleId] INT NOT NULL,
        [PermissionId] INT NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_RolePermission_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_APP_RolePermission] PRIMARY KEY CLUSTERED ([RoleId], [PermissionId])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_UserRole]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_UserRole] (
        [UserId] INT NOT NULL,
        [RoleId] INT NOT NULL,
        [IsPrimary] BIT NOT NULL CONSTRAINT [DF_APP_UserRole_IsPrimary] DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_UserRole_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_APP_UserRole] PRIMARY KEY CLUSTERED ([UserId], [RoleId])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_AdGroup]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_AdGroup] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [Name] VARCHAR(100) NOT NULL,
        [DistinguishedName] NVARCHAR(500) NOT NULL,
        [DefaultRoleId] INT NOT NULL,
        [SyncedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_AdGroup_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_APP_AdGroup] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_APP_AdGroup_Name] UNIQUE NONCLUSTERED ([Name]),
        CONSTRAINT [UQ_APP_AdGroup_DistinguishedName] UNIQUE NONCLUSTERED ([DistinguishedName])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_UserAdGroup]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_UserAdGroup] (
        [UserId] INT NOT NULL,
        [AdGroupId] INT NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_UserAdGroup_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_APP_UserAdGroup] PRIMARY KEY CLUSTERED ([UserId], [AdGroupId])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_AuditLog]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_AuditLog] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [UserId] INT NULL,
        [UserLogin] NVARCHAR(200) NOT NULL,
        [Action] NVARCHAR(200) NOT NULL,
        [EntityType] NVARCHAR(100) NOT NULL,
        [RecordRef] NVARCHAR(200) NULL,
        [ValuesBefore] NVARCHAR(MAX) NULL,
        [ValuesAfter] NVARCHAR(MAX) NULL,
        [IpAddress] VARCHAR(45) NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_AuditLog_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_APP_AuditLog] PRIMARY KEY CLUSTERED ([Id])
    );
END;

IF OBJECT_ID(N'[dbo].[APP_IntegrationConfig]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[APP_IntegrationConfig] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [Type] VARCHAR(30) NOT NULL,
        [ConfigJson] NVARCHAR(MAX) NOT NULL,
        [Status] VARCHAR(20) NOT NULL CONSTRAINT [DF_APP_IntegrationConfig_Status] DEFAULT 'desconectado',
        [LastSyncAt] DATETIME2 NULL,
        [UpdatedByUserId] INT NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_APP_IntegrationConfig_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_APP_IntegrationConfig] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_APP_IntegrationConfig_Type] UNIQUE NONCLUSTERED ([Type])
    );
END;

-- ---------------------------------------------------------------------------
-- Domínio operacional BL (novas tabelas)
-- ---------------------------------------------------------------------------

IF OBJECT_ID(N'[dbo].[BL_Divergencia]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_Divergencia] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlMasterId] INT NULL,
        [BlHouseId] INT NULL,
        [Status] VARCHAR(20) NOT NULL CONSTRAINT [DF_BL_Divergencia_Status] DEFAULT 'pendente',
        [ResolvedByUserId] INT NULL,
        [ResolvedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_Divergencia_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_BL_Divergencia] PRIMARY KEY CLUSTERED ([Id])
    );
END;

IF OBJECT_ID(N'[dbo].[BL_DivergenciaCampo]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_DivergenciaCampo] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlDivergenciaId] INT NOT NULL,
        [CampoKey] VARCHAR(50) NOT NULL,
        [CampoLabel] NVARCHAR(200) NOT NULL,
        [ValorBlFinal] NVARCHAR(500) NOT NULL,
        [ValorGlobalSys] NVARCHAR(500) NOT NULL,
        [Status] VARCHAR(20) NOT NULL,
        [Categoria] VARCHAR(10) NOT NULL,
        CONSTRAINT [PK_BL_DivergenciaCampo] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_BL_DivergenciaCampo_Divergencia_CampoKey] UNIQUE NONCLUSTERED ([BlDivergenciaId], [CampoKey])
    );
END;

IF OBJECT_ID(N'[dbo].[BL_ProcessoEtapa]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_ProcessoEtapa] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlMasterId] INT NULL,
        [BlHouseId] INT NULL,
        [Ordem] INT NOT NULL,
        [Titulo] NVARCHAR(200) NOT NULL,
        [Status] VARCHAR(20) NOT NULL,
        [Descricao] NVARCHAR(500) NULL,
        [CompletedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_ProcessoEtapa_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_BL_ProcessoEtapa] PRIMARY KEY CLUSTERED ([Id])
    );
END;

IF OBJECT_ID(N'[dbo].[BL_ConsultaGlobalSys]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_ConsultaGlobalSys] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlMasterId] INT NULL,
        [BlHouseId] INT NULL,
        [TentativaNumero] INT NOT NULL,
        [Sucesso] BIT NOT NULL CONSTRAINT [DF_BL_ConsultaGlobalSys_Sucesso] DEFAULT 0,
        [Detalhe] NVARCHAR(500) NULL,
        [ExecutadoEm] DATETIME2 NOT NULL CONSTRAINT [DF_BL_ConsultaGlobalSys_ExecutadoEm] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_BL_ConsultaGlobalSys] PRIMARY KEY CLUSTERED ([Id])
    );
END;

-- ---------------------------------------------------------------------------
-- Foreign keys — RBAC
-- ---------------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_RolePermission_APP_Role')
BEGIN
    ALTER TABLE [dbo].[APP_RolePermission] ADD CONSTRAINT [FK_APP_RolePermission_APP_Role]
        FOREIGN KEY ([RoleId]) REFERENCES [dbo].[APP_Role]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_RolePermission_APP_Permission')
BEGIN
    ALTER TABLE [dbo].[APP_RolePermission] ADD CONSTRAINT [FK_APP_RolePermission_APP_Permission]
        FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[APP_Permission]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_UserRole_APP_User')
BEGIN
    ALTER TABLE [dbo].[APP_UserRole] ADD CONSTRAINT [FK_APP_UserRole_APP_User]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_UserRole_APP_Role')
BEGIN
    ALTER TABLE [dbo].[APP_UserRole] ADD CONSTRAINT [FK_APP_UserRole_APP_Role]
        FOREIGN KEY ([RoleId]) REFERENCES [dbo].[APP_Role]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_AdGroup_APP_Role')
BEGIN
    ALTER TABLE [dbo].[APP_AdGroup] ADD CONSTRAINT [FK_APP_AdGroup_APP_Role]
        FOREIGN KEY ([DefaultRoleId]) REFERENCES [dbo].[APP_Role]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_UserAdGroup_APP_User')
BEGIN
    ALTER TABLE [dbo].[APP_UserAdGroup] ADD CONSTRAINT [FK_APP_UserAdGroup_APP_User]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_UserAdGroup_APP_AdGroup')
BEGIN
    ALTER TABLE [dbo].[APP_UserAdGroup] ADD CONSTRAINT [FK_APP_UserAdGroup_APP_AdGroup]
        FOREIGN KEY ([AdGroupId]) REFERENCES [dbo].[APP_AdGroup]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_AuditLog_APP_User')
BEGIN
    ALTER TABLE [dbo].[APP_AuditLog] ADD CONSTRAINT [FK_APP_AuditLog_APP_User]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_APP_IntegrationConfig_APP_User')
BEGIN
    ALTER TABLE [dbo].[APP_IntegrationConfig] ADD CONSTRAINT [FK_APP_IntegrationConfig_APP_User]
        FOREIGN KEY ([UpdatedByUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

-- ---------------------------------------------------------------------------
-- Foreign keys — BL operacional
-- ---------------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_Workflow_APP_User')
BEGIN
    ALTER TABLE [dbo].[BL_Workflow] ADD CONSTRAINT [FK_BL_Workflow_APP_User]
        FOREIGN KEY ([ResponsavelUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_CampoRevisao_APP_User')
BEGIN
    ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [FK_BL_CampoRevisao_APP_User]
        FOREIGN KEY ([UpdatedByUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_HistoricoAlteracao_APP_User')
BEGIN
    ALTER TABLE [dbo].[BL_HistoricoAlteracao] ADD CONSTRAINT [FK_BL_HistoricoAlteracao_APP_User]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_Divergencia_BL_Master')
BEGIN
    ALTER TABLE [dbo].[BL_Divergencia] ADD CONSTRAINT [FK_BL_Divergencia_BL_Master]
        FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_Divergencia_BL_House')
BEGIN
    ALTER TABLE [dbo].[BL_Divergencia] ADD CONSTRAINT [FK_BL_Divergencia_BL_House]
        FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_Divergencia_APP_User')
BEGIN
    ALTER TABLE [dbo].[BL_Divergencia] ADD CONSTRAINT [FK_BL_Divergencia_APP_User]
        FOREIGN KEY ([ResolvedByUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_DivergenciaCampo_BL_Divergencia')
BEGIN
    ALTER TABLE [dbo].[BL_DivergenciaCampo] ADD CONSTRAINT [FK_BL_DivergenciaCampo_BL_Divergencia]
        FOREIGN KEY ([BlDivergenciaId]) REFERENCES [dbo].[BL_Divergencia]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_ProcessoEtapa_BL_Master')
BEGIN
    ALTER TABLE [dbo].[BL_ProcessoEtapa] ADD CONSTRAINT [FK_BL_ProcessoEtapa_BL_Master]
        FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_ProcessoEtapa_BL_House')
BEGIN
    ALTER TABLE [dbo].[BL_ProcessoEtapa] ADD CONSTRAINT [FK_BL_ProcessoEtapa_BL_House]
        FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_ConsultaGlobalSys_BL_Master')
BEGIN
    ALTER TABLE [dbo].[BL_ConsultaGlobalSys] ADD CONSTRAINT [FK_BL_ConsultaGlobalSys_BL_Master]
        FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_ConsultaGlobalSys_BL_House')
BEGIN
    ALTER TABLE [dbo].[BL_ConsultaGlobalSys] ADD CONSTRAINT [FK_BL_ConsultaGlobalSys_BL_House]
        FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_Divergencia_BlTarget')
BEGIN
    ALTER TABLE [dbo].[BL_Divergencia] ADD CONSTRAINT [CK_BL_Divergencia_BlTarget]
    CHECK (
        ([BlMasterId] IS NOT NULL AND [BlHouseId] IS NULL) OR
        ([BlMasterId] IS NULL AND [BlHouseId] IS NOT NULL)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_ProcessoEtapa_BlTarget')
BEGIN
    ALTER TABLE [dbo].[BL_ProcessoEtapa] ADD CONSTRAINT [CK_BL_ProcessoEtapa_BlTarget]
    CHECK (
        ([BlMasterId] IS NOT NULL AND [BlHouseId] IS NULL) OR
        ([BlMasterId] IS NULL AND [BlHouseId] IS NOT NULL)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_ConsultaGlobalSys_BlTarget')
BEGIN
    ALTER TABLE [dbo].[BL_ConsultaGlobalSys] ADD CONSTRAINT [CK_BL_ConsultaGlobalSys_BlTarget]
    CHECK (
        ([BlMasterId] IS NOT NULL AND [BlHouseId] IS NULL) OR
        ([BlMasterId] IS NULL AND [BlHouseId] IS NOT NULL)
    );
END;

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_User_Status')
    CREATE NONCLUSTERED INDEX [IX_APP_User_Status] ON [dbo].[APP_User]([Status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_User_SyncedAt')
    CREATE NONCLUSTERED INDEX [IX_APP_User_SyncedAt] ON [dbo].[APP_User]([SyncedAt]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_Permission_Module')
    CREATE NONCLUSTERED INDEX [IX_APP_Permission_Module] ON [dbo].[APP_Permission]([Module]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_UserRole_RoleId')
    CREATE NONCLUSTERED INDEX [IX_APP_UserRole_RoleId] ON [dbo].[APP_UserRole]([RoleId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_AdGroup_DefaultRoleId')
    CREATE NONCLUSTERED INDEX [IX_APP_AdGroup_DefaultRoleId] ON [dbo].[APP_AdGroup]([DefaultRoleId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_UserAdGroup_AdGroupId')
    CREATE NONCLUSTERED INDEX [IX_APP_UserAdGroup_AdGroupId] ON [dbo].[APP_UserAdGroup]([AdGroupId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_AuditLog_CreatedAt')
    CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_CreatedAt] ON [dbo].[APP_AuditLog]([CreatedAt]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_AuditLog_UserId')
    CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_UserId] ON [dbo].[APP_AuditLog]([UserId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_AuditLog_EntityType')
    CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_EntityType] ON [dbo].[APP_AuditLog]([EntityType]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_AuditLog_Action')
    CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_Action] ON [dbo].[APP_AuditLog]([Action]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_APP_IntegrationConfig_Status')
    CREATE NONCLUSTERED INDEX [IX_APP_IntegrationConfig_Status] ON [dbo].[APP_IntegrationConfig]([Status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Workflow_ResponsavelUserId')
    CREATE NONCLUSTERED INDEX [IX_BL_Workflow_ResponsavelUserId] ON [dbo].[BL_Workflow]([ResponsavelUserId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Workflow_UpdatedAt')
    CREATE NONCLUSTERED INDEX [IX_BL_Workflow_UpdatedAt] ON [dbo].[BL_Workflow]([UpdatedAt]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_HistoricoAlteracao_UserId')
    CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_UserId] ON [dbo].[BL_HistoricoAlteracao]([UserId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Divergencia_BlMasterId')
    CREATE NONCLUSTERED INDEX [IX_BL_Divergencia_BlMasterId] ON [dbo].[BL_Divergencia]([BlMasterId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Divergencia_BlHouseId')
    CREATE NONCLUSTERED INDEX [IX_BL_Divergencia_BlHouseId] ON [dbo].[BL_Divergencia]([BlHouseId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Divergencia_Status')
    CREATE NONCLUSTERED INDEX [IX_BL_Divergencia_Status] ON [dbo].[BL_Divergencia]([Status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_DivergenciaCampo_Status')
    CREATE NONCLUSTERED INDEX [IX_BL_DivergenciaCampo_Status] ON [dbo].[BL_DivergenciaCampo]([Status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_ProcessoEtapa_BlMasterId_Ordem')
    CREATE NONCLUSTERED INDEX [IX_BL_ProcessoEtapa_BlMasterId_Ordem] ON [dbo].[BL_ProcessoEtapa]([BlMasterId], [Ordem]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_ProcessoEtapa_BlHouseId_Ordem')
    CREATE NONCLUSTERED INDEX [IX_BL_ProcessoEtapa_BlHouseId_Ordem] ON [dbo].[BL_ProcessoEtapa]([BlHouseId], [Ordem]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_ConsultaGlobalSys_BlMasterId_ExecutadoEm')
    CREATE NONCLUSTERED INDEX [IX_BL_ConsultaGlobalSys_BlMasterId_ExecutadoEm] ON [dbo].[BL_ConsultaGlobalSys]([BlMasterId], [ExecutadoEm]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_ConsultaGlobalSys_BlHouseId_ExecutadoEm')
    CREATE NONCLUSTERED INDEX [IX_BL_ConsultaGlobalSys_BlHouseId_ExecutadoEm] ON [dbo].[BL_ConsultaGlobalSys]([BlHouseId], [ExecutadoEm]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_ConsultaGlobalSys_Sucesso')
    CREATE NONCLUSTERED INDEX [IX_BL_ConsultaGlobalSys_Sucesso] ON [dbo].[BL_ConsultaGlobalSys]([Sucesso]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW;

END CATCH
