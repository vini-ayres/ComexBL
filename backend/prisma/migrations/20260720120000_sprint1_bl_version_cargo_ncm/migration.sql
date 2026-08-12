BEGIN TRY

BEGIN TRAN;

-- ---------------------------------------------------------------------------
-- Sprint 1 (parte 1): colunas BlVersion e ajustes estruturais base
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

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
