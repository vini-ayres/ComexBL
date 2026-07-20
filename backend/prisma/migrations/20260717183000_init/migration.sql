BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[BL_Master] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [ReferenceNumber] VARCHAR(50),
    [MasterNumber] VARCHAR(50) NOT NULL,
    [BlVersion] VARCHAR(10) NOT NULL CONSTRAINT [BL_Master_BlVersion_df] DEFAULT 'DRAFT',
    [BLTypeExportImport] CHAR(1),
    [VesselName] NVARCHAR(200),
    [Voyage] VARCHAR(50),
    [OnboardDate] DATE,
    [ArrivalDate] DATE,
    [HBLCount] INT,
    [ShipperName] NVARCHAR(300),
    [ShipperAddress] NVARCHAR(1000),
    [ConsigneeName] NVARCHAR(300),
    [ConsigneeAddress] NVARCHAR(1000),
    [NotifyName] NVARCHAR(300),
    [NotifyAddress] NVARCHAR(1000),
    [CarrierSCACCode] VARCHAR(20),
    [CarrierName] NVARCHAR(300),
    [CargoTypeLclFclBulk] CHAR(1),
    [LoadType] VARCHAR(3),
    [ServiceTerm] VARCHAR(30),
    [FreightTerm] VARCHAR(10),
    [LoadingPortCode] VARCHAR(10),
    [LoadingPortName] NVARCHAR(200),
    [DischargePortCode] VARCHAR(10),
    [DischargePortName] NVARCHAR(200),
    [DeliveryPortCode] VARCHAR(10),
    [DeliveryPortName] NVARCHAR(200),
    [FinalDestinationPortCode] VARCHAR(10),
    [FinalDestinationPortName] NVARCHAR(200),
    [ContainerNumber] VARCHAR(20),
    [ContainerSealNo1] VARCHAR(30),
    [ContainerType] VARCHAR(20),
    [PackingQuantity] INT,
    [PackingQuantityUnitCode] VARCHAR(10),
    [GrossWeight] DECIMAL(18,3),
    [VolumeMeasure] DECIMAL(18,3),
    [Status] BIT NOT NULL CONSTRAINT [DF_BL_Master_Status] DEFAULT 0,
    [ItemId] NVARCHAR(255),
    [DriveId] NVARCHAR(255),
    CONSTRAINT [PK_BL_Master] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BL_Master_MasterNumber_BlVersion] UNIQUE NONCLUSTERED ([MasterNumber],[BlVersion])
);

-- CreateTable
CREATE TABLE [dbo].[BL_House] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BLMasterId] INT,
    [HouseNumber] VARCHAR(50) NOT NULL,
    [BlVersion] VARCHAR(10) NOT NULL CONSTRAINT [BL_House_BlVersion_df] DEFAULT 'DRAFT',
    [ShipperName] NVARCHAR(300),
    [ShipperAddress] NVARCHAR(1000),
    [ConsigneeName] NVARCHAR(300),
    [ConsigneeAddress] NVARCHAR(1000),
    [NotifyName] NVARCHAR(300),
    [NotifyAddress] NVARCHAR(1000),
    [BLCargoTypeExIm] CHAR(1),
    [OriginalBLMethodCode] VARCHAR(10),
    [ServiceTerm] VARCHAR(30),
    [FreightTerm] VARCHAR(10),
    [ReceiptPortCode] VARCHAR(10),
    [ReceiptPortName] VARCHAR(200),
    [LoadingPortCode] VARCHAR(10),
    [LoadingPortName] NVARCHAR(200),
    [DischargePortCode] VARCHAR(10),
    [DischargePortName] NVARCHAR(200),
    [DeliveryPortCode] VARCHAR(10),
    [DeliveryPortName] NVARCHAR(200),
    [PackingQuantity] INT,
    [PackingQuantityUnitCode] VARCHAR(10),
    [GrossWeight] DECIMAL(18,3),
    [VolumeMeasure] DECIMAL(18,3),
    [IssueDate] DATETIME2,
    [ItemName] NVARCHAR(max),
    [ContainerNumber] VARCHAR(20),
    [ContainerSealNo1] VARCHAR(30),
    [ContainerSealNo2] VARCHAR(30),
    [ContainerType] VARCHAR(20),
    [ContainerQTY] INT,
    [ContainerUnitCode] VARCHAR(50),
    [ContainerGWT] DECIMAL(18,3),
    [ContainerCBM] DECIMAL(18,3),
    [Status] BIT NOT NULL CONSTRAINT [DF_BL_House_Status] DEFAULT 0,
    [ItemId] NVARCHAR(255),
    [DriveId] NVARCHAR(255),
    CONSTRAINT [PK_BL_House] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BL_House_HouseNumber_BlVersion] UNIQUE NONCLUSTERED ([HouseNumber],[BlVersion])
);

-- CreateTable
CREATE TABLE [dbo].[BL_House_Cargo] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlHouseId] INT NOT NULL,
    [Brand] NVARCHAR(55),
    [CounterMark] NVARCHAR(55),
    [CargoType] NVARCHAR(100),
    [HazardClass] VARCHAR(4),
    [UNNumber] VARCHAR(6),
    [Packaging] NVARCHAR(100),
    CONSTRAINT [PK_BL_House_Cargo] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[BL_House_NCM] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlHouseId] INT NOT NULL,
    [NcmCode] VARCHAR(20) NOT NULL,
    CONSTRAINT [PK_BL_House_NCM] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[BL_Workflow] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT,
    [BlHouseId] INT,
    [TipoBl] VARCHAR(10) NOT NULL,
    [Status] VARCHAR(30) NOT NULL,
    [Pendencia] NVARCHAR(500),
    [ResponsavelUserId] INT,
    [Confianca] INT,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [BL_Workflow_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_BL_Workflow] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BL_Workflow_BlMasterId] UNIQUE NONCLUSTERED ([BlMasterId]),
    CONSTRAINT [UQ_BL_Workflow_BlHouseId] UNIQUE NONCLUSTERED ([BlHouseId])
);

-- CreateTable
CREATE TABLE [dbo].[BL_CampoRevisao] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT,
    [BlHouseId] INT,
    [CampoKey] VARCHAR(50) NOT NULL,
    [CampoLabel] NVARCHAR(200) NOT NULL,
    [ValorRecebido] NVARCHAR(500) NOT NULL,
    [ValorManual] NVARCHAR(500),
    [Confianca] INT NOT NULL CONSTRAINT [BL_CampoRevisao_Confianca_df] DEFAULT 0,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT [BL_CampoRevisao_Status_df] DEFAULT 'pendente',
    [UpdatedByUserId] INT,
    [UpdatedAt] DATETIME2 NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [BL_CampoRevisao_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_BL_CampoRevisao] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[BL_HistoricoAlteracao] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT,
    [BlHouseId] INT,
    [UserId] INT,
    [Usuario] NVARCHAR(200) NOT NULL,
    [Campo] NVARCHAR(200) NOT NULL,
    [ValorAntes] NVARCHAR(500) NOT NULL,
    [ValorDepois] NVARCHAR(500) NOT NULL,
    [Acao] VARCHAR(30) NOT NULL CONSTRAINT [BL_HistoricoAlteracao_Acao_df] DEFAULT 'edicao',
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [BL_HistoricoAlteracao_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_BL_HistoricoAlteracao] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[BL_Divergencia] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT,
    [BlHouseId] INT,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT [BL_Divergencia_Status_df] DEFAULT 'pendente',
    [ResolvedByUserId] INT,
    [ResolvedAt] DATETIME2,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [BL_Divergencia_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_BL_Divergencia] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
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
    CONSTRAINT [UQ_BL_DivergenciaCampo_Divergencia_CampoKey] UNIQUE NONCLUSTERED ([BlDivergenciaId],[CampoKey])
);

-- CreateTable
CREATE TABLE [dbo].[BL_ProcessoEtapa] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT,
    [BlHouseId] INT,
    [Ordem] INT NOT NULL,
    [Titulo] NVARCHAR(200) NOT NULL,
    [Status] VARCHAR(20) NOT NULL,
    [Descricao] NVARCHAR(500),
    [CompletedAt] DATETIME2,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [BL_ProcessoEtapa_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_BL_ProcessoEtapa] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[BL_ConsultaGlobalSys] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT,
    [BlHouseId] INT,
    [TentativaNumero] INT NOT NULL,
    [Sucesso] BIT NOT NULL CONSTRAINT [BL_ConsultaGlobalSys_Sucesso_df] DEFAULT 0,
    [Detalhe] NVARCHAR(500),
    [ExecutadoEm] DATETIME2 NOT NULL CONSTRAINT [BL_ConsultaGlobalSys_ExecutadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_BL_ConsultaGlobalSys] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[APP_User] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [Login] VARCHAR(100) NOT NULL,
    [Email] VARCHAR(200) NOT NULL,
    [DisplayName] NVARCHAR(200) NOT NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT [APP_User_Status_df] DEFAULT 'ativo',
    [AdObjectId] VARCHAR(100),
    [AvatarColor] VARCHAR(20),
    [LastLoginAt] DATETIME2,
    [SyncedAt] DATETIME2,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_User_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_APP_User] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_APP_User_Login] UNIQUE NONCLUSTERED ([Login]),
    CONSTRAINT [UQ_APP_User_Email] UNIQUE NONCLUSTERED ([Email])
);

-- CreateTable
CREATE TABLE [dbo].[APP_Role] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [Name] VARCHAR(50) NOT NULL,
    [Description] NVARCHAR(300),
    [IsSystem] BIT NOT NULL CONSTRAINT [APP_Role_IsSystem_df] DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_Role_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_APP_Role] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_APP_Role_Name] UNIQUE NONCLUSTERED ([Name])
);

-- CreateTable
CREATE TABLE [dbo].[APP_Permission] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [Key] VARCHAR(50) NOT NULL,
    [Label] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(300),
    [Module] VARCHAR(50),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_Permission_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_APP_Permission] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_APP_Permission_Key] UNIQUE NONCLUSTERED ([Key])
);

-- CreateTable
CREATE TABLE [dbo].[APP_RolePermission] (
    [RoleId] INT NOT NULL,
    [PermissionId] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_RolePermission_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_APP_RolePermission] PRIMARY KEY CLUSTERED ([RoleId],[PermissionId])
);

-- CreateTable
CREATE TABLE [dbo].[APP_UserRole] (
    [UserId] INT NOT NULL,
    [RoleId] INT NOT NULL,
    [IsPrimary] BIT NOT NULL CONSTRAINT [APP_UserRole_IsPrimary_df] DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_UserRole_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_APP_UserRole] PRIMARY KEY CLUSTERED ([UserId],[RoleId])
);

-- CreateTable
CREATE TABLE [dbo].[APP_AdGroup] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [Name] VARCHAR(100) NOT NULL,
    [DistinguishedName] NVARCHAR(500) NOT NULL,
    [DefaultRoleId] INT NOT NULL,
    [SyncedAt] DATETIME2,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_AdGroup_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_APP_AdGroup] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_APP_AdGroup_Name] UNIQUE NONCLUSTERED ([Name]),
    CONSTRAINT [UQ_APP_AdGroup_DistinguishedName] UNIQUE NONCLUSTERED ([DistinguishedName])
);

-- CreateTable
CREATE TABLE [dbo].[APP_UserAdGroup] (
    [UserId] INT NOT NULL,
    [AdGroupId] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_UserAdGroup_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_APP_UserAdGroup] PRIMARY KEY CLUSTERED ([UserId],[AdGroupId])
);

-- CreateTable
CREATE TABLE [dbo].[APP_AuditLog] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT,
    [UserLogin] NVARCHAR(200) NOT NULL,
    [Action] NVARCHAR(200) NOT NULL,
    [EntityType] NVARCHAR(100) NOT NULL,
    [RecordRef] NVARCHAR(200),
    [ValuesBefore] NVARCHAR(max),
    [ValuesAfter] NVARCHAR(max),
    [IpAddress] VARCHAR(45),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_AuditLog_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_APP_AuditLog] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[APP_IntegrationConfig] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [Type] VARCHAR(30) NOT NULL,
    [ConfigJson] NVARCHAR(max) NOT NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT [APP_IntegrationConfig_Status_df] DEFAULT 'desconectado',
    [LastSyncAt] DATETIME2,
    [UpdatedByUserId] INT,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [APP_IntegrationConfig_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_APP_IntegrationConfig] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_APP_IntegrationConfig_Type] UNIQUE NONCLUSTERED ([Type])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_ContainerNumber] ON [dbo].[BL_Master]([ContainerNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_ContainerNumber_BlVersion] ON [dbo].[BL_Master]([ContainerNumber], [BlVersion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_DeliveryPortCode] ON [dbo].[BL_Master]([DeliveryPortCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_LoadingPortCode] ON [dbo].[BL_Master]([LoadingPortCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_OnboardDate] ON [dbo].[BL_Master]([OnboardDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_VesselName] ON [dbo].[BL_Master]([VesselName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_Status] ON [dbo].[BL_Master]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_MasterNumber] ON [dbo].[BL_Master]([MasterNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_BlVersion] ON [dbo].[BL_Master]([BlVersion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_BLMasterId] ON [dbo].[BL_House]([BLMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_ContainerNumber] ON [dbo].[BL_House]([ContainerNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_ContainerNumber_BlVersion] ON [dbo].[BL_House]([ContainerNumber], [BlVersion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_Status] ON [dbo].[BL_House]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_HouseNumber] ON [dbo].[BL_House]([HouseNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_BlVersion] ON [dbo].[BL_House]([BlVersion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_Cargo_BlHouseId] ON [dbo].[BL_House_Cargo]([BlHouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_NCM_BlHouseId] ON [dbo].[BL_House_NCM]([BlHouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Workflow_Status] ON [dbo].[BL_Workflow]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Workflow_ResponsavelUserId] ON [dbo].[BL_Workflow]([ResponsavelUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Workflow_UpdatedAt] ON [dbo].[BL_Workflow]([UpdatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_CampoRevisao_BlMasterId] ON [dbo].[BL_CampoRevisao]([BlMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_CampoRevisao_BlHouseId] ON [dbo].[BL_CampoRevisao]([BlHouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_CampoRevisao_Status] ON [dbo].[BL_CampoRevisao]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_BlMasterId] ON [dbo].[BL_HistoricoAlteracao]([BlMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_BlHouseId] ON [dbo].[BL_HistoricoAlteracao]([BlHouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_CreatedAt] ON [dbo].[BL_HistoricoAlteracao]([CreatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_UserId] ON [dbo].[BL_HistoricoAlteracao]([UserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Divergencia_BlMasterId] ON [dbo].[BL_Divergencia]([BlMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Divergencia_BlHouseId] ON [dbo].[BL_Divergencia]([BlHouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Divergencia_Status] ON [dbo].[BL_Divergencia]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_DivergenciaCampo_Status] ON [dbo].[BL_DivergenciaCampo]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_ProcessoEtapa_BlMasterId_Ordem] ON [dbo].[BL_ProcessoEtapa]([BlMasterId], [Ordem]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_ProcessoEtapa_BlHouseId_Ordem] ON [dbo].[BL_ProcessoEtapa]([BlHouseId], [Ordem]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_ConsultaGlobalSys_BlMasterId_ExecutadoEm] ON [dbo].[BL_ConsultaGlobalSys]([BlMasterId], [ExecutadoEm]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_ConsultaGlobalSys_BlHouseId_ExecutadoEm] ON [dbo].[BL_ConsultaGlobalSys]([BlHouseId], [ExecutadoEm]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_ConsultaGlobalSys_Sucesso] ON [dbo].[BL_ConsultaGlobalSys]([Sucesso]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_User_Status] ON [dbo].[APP_User]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_User_SyncedAt] ON [dbo].[APP_User]([SyncedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_Permission_Module] ON [dbo].[APP_Permission]([Module]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_UserRole_RoleId] ON [dbo].[APP_UserRole]([RoleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_AdGroup_DefaultRoleId] ON [dbo].[APP_AdGroup]([DefaultRoleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_UserAdGroup_AdGroupId] ON [dbo].[APP_UserAdGroup]([AdGroupId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_CreatedAt] ON [dbo].[APP_AuditLog]([CreatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_UserId] ON [dbo].[APP_AuditLog]([UserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_EntityType] ON [dbo].[APP_AuditLog]([EntityType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_AuditLog_Action] ON [dbo].[APP_AuditLog]([Action]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_APP_IntegrationConfig_Status] ON [dbo].[APP_IntegrationConfig]([Status]);

-- AddForeignKey
ALTER TABLE [dbo].[BL_House] ADD CONSTRAINT [FK_BL_House_BL_Master] FOREIGN KEY ([BLMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_House_Cargo] ADD CONSTRAINT [FK_BL_House_Cargo_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_House_NCM] ADD CONSTRAINT [FK_BL_House_NCM_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_Workflow] ADD CONSTRAINT [FK_BL_Workflow_BL_Master] FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_Workflow] ADD CONSTRAINT [FK_BL_Workflow_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_Workflow] ADD CONSTRAINT [FK_BL_Workflow_APP_User] FOREIGN KEY ([ResponsavelUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [FK_BL_CampoRevisao_BL_Master] FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [FK_BL_CampoRevisao_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [FK_BL_CampoRevisao_APP_User] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_HistoricoAlteracao] ADD CONSTRAINT [FK_BL_HistoricoAlteracao_BL_Master] FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_HistoricoAlteracao] ADD CONSTRAINT [FK_BL_HistoricoAlteracao_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_HistoricoAlteracao] ADD CONSTRAINT [FK_BL_HistoricoAlteracao_APP_User] FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_Divergencia] ADD CONSTRAINT [FK_BL_Divergencia_BL_Master] FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_Divergencia] ADD CONSTRAINT [FK_BL_Divergencia_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_Divergencia] ADD CONSTRAINT [FK_BL_Divergencia_APP_User] FOREIGN KEY ([ResolvedByUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_DivergenciaCampo] ADD CONSTRAINT [FK_BL_DivergenciaCampo_BL_Divergencia] FOREIGN KEY ([BlDivergenciaId]) REFERENCES [dbo].[BL_Divergencia]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_ProcessoEtapa] ADD CONSTRAINT [FK_BL_ProcessoEtapa_BL_Master] FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_ProcessoEtapa] ADD CONSTRAINT [FK_BL_ProcessoEtapa_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_ConsultaGlobalSys] ADD CONSTRAINT [FK_BL_ConsultaGlobalSys_BL_Master] FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BL_ConsultaGlobalSys] ADD CONSTRAINT [FK_BL_ConsultaGlobalSys_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_RolePermission] ADD CONSTRAINT [FK_APP_RolePermission_APP_Role] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[APP_Role]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_RolePermission] ADD CONSTRAINT [FK_APP_RolePermission_APP_Permission] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[APP_Permission]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_UserRole] ADD CONSTRAINT [FK_APP_UserRole_APP_User] FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_UserRole] ADD CONSTRAINT [FK_APP_UserRole_APP_Role] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[APP_Role]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_AdGroup] ADD CONSTRAINT [FK_APP_AdGroup_APP_Role] FOREIGN KEY ([DefaultRoleId]) REFERENCES [dbo].[APP_Role]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_UserAdGroup] ADD CONSTRAINT [FK_APP_UserAdGroup_APP_User] FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_UserAdGroup] ADD CONSTRAINT [FK_APP_UserAdGroup_APP_AdGroup] FOREIGN KEY ([AdGroupId]) REFERENCES [dbo].[APP_AdGroup]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_AuditLog] ADD CONSTRAINT [FK_APP_AuditLog_APP_User] FOREIGN KEY ([UserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[APP_IntegrationConfig] ADD CONSTRAINT [FK_APP_IntegrationConfig_APP_User] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Constraints complementares (não expressas nativamente no Prisma)
-- ---------------------------------------------------------------------------

ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [CK_BL_CampoRevisao_BlTarget]
CHECK (
    ([BlMasterId] IS NOT NULL AND [BlHouseId] IS NULL) OR
    ([BlMasterId] IS NULL AND [BlHouseId] IS NOT NULL)
);

CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_CampoRevisao_Master_CampoKey]
ON [dbo].[BL_CampoRevisao]([BlMasterId], [CampoKey])
WHERE [BlMasterId] IS NOT NULL;

CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_CampoRevisao_House_CampoKey]
ON [dbo].[BL_CampoRevisao]([BlHouseId], [CampoKey])
WHERE [BlHouseId] IS NOT NULL;

ALTER TABLE [dbo].[BL_Master] ADD CONSTRAINT [CK_BL_Master_BlVersion]
CHECK ([BlVersion] IN ('DRAFT', 'FINAL'));

ALTER TABLE [dbo].[BL_House] ADD CONSTRAINT [CK_BL_House_BlVersion]
CHECK ([BlVersion] IN ('DRAFT', 'FINAL'));

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
