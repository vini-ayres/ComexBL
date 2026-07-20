BEGIN TRY

BEGIN TRAN;

-- ---------------------------------------------------------------------------
-- Upgrade: banco legado (3 migrations antigas) → schema aprovado Sprint 1
-- ---------------------------------------------------------------------------

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_BL_House_HouseNumber')
BEGIN
    ALTER TABLE [dbo].[BL_House] DROP CONSTRAINT [UQ_BL_House_HouseNumber];
END;

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_BL_Master_MasterNumber')
BEGIN
    ALTER TABLE [dbo].[BL_Master] DROP CONSTRAINT [UQ_BL_Master_MasterNumber];
END;

IF COL_LENGTH('dbo.BL_House', 'BlVersion') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_House] ADD [BlVersion] VARCHAR(10) NOT NULL CONSTRAINT [BL_House_BlVersion_df] DEFAULT 'DRAFT';
END;

IF COL_LENGTH('dbo.BL_Master', 'BlVersion') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_Master] ADD [BlVersion] VARCHAR(10) NOT NULL CONSTRAINT [BL_Master_BlVersion_df] DEFAULT 'DRAFT';
END;

IF COL_LENGTH('dbo.BL_Master', 'LoadType') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_Master] ADD [LoadType] VARCHAR(3) NULL;
END;

IF COL_LENGTH('dbo.BL_Master', 'ContainerSealNo1') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_Master] ADD [ContainerSealNo1] VARCHAR(30) NULL;
END;

IF COL_LENGTH('dbo.BL_House', 'LoadingPortName') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_House] ALTER COLUMN [LoadingPortName] NVARCHAR(200) NULL;
END;

IF COL_LENGTH('dbo.BL_House', 'DischargePortName') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_House] ALTER COLUMN [DischargePortName] NVARCHAR(200) NULL;
END;

IF COL_LENGTH('dbo.BL_House', 'DeliveryPortName') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_House] ALTER COLUMN [DeliveryPortName] NVARCHAR(200) NULL;
END;

IF OBJECT_ID(N'dbo.BL_House_Cargo', N'U') IS NULL
BEGIN
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
END;

IF OBJECT_ID(N'dbo.BL_House_NCM', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_House_NCM] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlHouseId] INT NOT NULL,
        [NcmCode] VARCHAR(20) NOT NULL,
        CONSTRAINT [PK_BL_House_NCM] PRIMARY KEY CLUSTERED ([Id])
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_House_Cargo_BlHouseId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_House_Cargo_BlHouseId] ON [dbo].[BL_House_Cargo]([BlHouseId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_House_NCM_BlHouseId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_House_NCM_BlHouseId] ON [dbo].[BL_House_NCM]([BlHouseId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_House_ContainerNumber_BlVersion')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_House_ContainerNumber_BlVersion] ON [dbo].[BL_House]([ContainerNumber], [BlVersion]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_House_HouseNumber')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_House_HouseNumber] ON [dbo].[BL_House]([HouseNumber]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_House_BlVersion')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_House_BlVersion] ON [dbo].[BL_House]([BlVersion]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_BL_House_HouseNumber_BlVersion')
BEGIN
    ALTER TABLE [dbo].[BL_House] ADD CONSTRAINT [UQ_BL_House_HouseNumber_BlVersion] UNIQUE NONCLUSTERED ([HouseNumber], [BlVersion]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Master_ContainerNumber_BlVersion')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_Master_ContainerNumber_BlVersion] ON [dbo].[BL_Master]([ContainerNumber], [BlVersion]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Master_MasterNumber')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_Master_MasterNumber] ON [dbo].[BL_Master]([MasterNumber]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Master_BlVersion')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_Master_BlVersion] ON [dbo].[BL_Master]([BlVersion]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_BL_Master_MasterNumber_BlVersion')
BEGIN
    ALTER TABLE [dbo].[BL_Master] ADD CONSTRAINT [UQ_BL_Master_MasterNumber_BlVersion] UNIQUE NONCLUSTERED ([MasterNumber], [BlVersion]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_House_Cargo_BL_House')
BEGIN
    ALTER TABLE [dbo].[BL_House_Cargo] ADD CONSTRAINT [FK_BL_House_Cargo_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_House_NCM_BL_House')
BEGIN
    ALTER TABLE [dbo].[BL_House_NCM] ADD CONSTRAINT [FK_BL_House_NCM_BL_House] FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_CampoRevisao_BlTarget')
BEGIN
    ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [CK_BL_CampoRevisao_BlTarget]
    CHECK (
        ([BlMasterId] IS NOT NULL AND [BlHouseId] IS NULL) OR
        ([BlMasterId] IS NULL AND [BlHouseId] IS NOT NULL)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_BL_CampoRevisao_Master_CampoKey')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_CampoRevisao_Master_CampoKey]
    ON [dbo].[BL_CampoRevisao]([BlMasterId], [CampoKey])
    WHERE [BlMasterId] IS NOT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_BL_CampoRevisao_House_CampoKey')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_CampoRevisao_House_CampoKey]
    ON [dbo].[BL_CampoRevisao]([BlHouseId], [CampoKey])
    WHERE [BlHouseId] IS NOT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_Master_BlVersion')
BEGIN
    ALTER TABLE [dbo].[BL_Master] ADD CONSTRAINT [CK_BL_Master_BlVersion]
    CHECK ([BlVersion] IN ('DRAFT', 'FINAL'));
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BL_House_BlVersion')
BEGIN
    ALTER TABLE [dbo].[BL_House] ADD CONSTRAINT [CK_BL_House_BlVersion]
    CHECK ([BlVersion] IN ('DRAFT', 'FINAL'));
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
