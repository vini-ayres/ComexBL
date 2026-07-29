BEGIN TRY

BEGIN TRAN;

-- Remover tabelas legadas (GlobalSys / importação antiga)
IF OBJECT_ID(N'[dbo].[TB_HBL]', N'U') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[TB_HBL] DROP CONSTRAINT [FK_TB_HBL_TB_MBL];
END;

DROP TABLE IF EXISTS [dbo].[TB_HBL];
DROP TABLE IF EXISTS [dbo].[TB_MBL];
DROP TABLE IF EXISTS [dbo].[TB_FREIGHT_CHARGE];

-- FK Master ↔ House (se ainda não existir)
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BL_House_BL_Master'
)
BEGIN
    ALTER TABLE [dbo].[BL_House]
    ADD CONSTRAINT [FK_BL_House_BL_Master]
    FOREIGN KEY ([BLMasterId]) REFERENCES [dbo].[BL_Master]([Id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

-- Tabelas da aplicação ComexBL
CREATE TABLE [dbo].[BL_Workflow] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT NULL,
    [BlHouseId] INT NULL,
    [TipoBl] VARCHAR(10) NOT NULL,
    [Status] VARCHAR(30) NOT NULL,
    [Pendencia] NVARCHAR(500),
    [Responsavel] NVARCHAR(200),
    [Confianca] INT,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_Workflow_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_BL_Workflow] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BL_Workflow_BlMasterId] UNIQUE NONCLUSTERED ([BlMasterId]),
    CONSTRAINT [UQ_BL_Workflow_BlHouseId] UNIQUE NONCLUSTERED ([BlHouseId])
);

CREATE TABLE [dbo].[BL_CampoRevisao] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT NULL,
    [BlHouseId] INT NULL,
    [CampoKey] VARCHAR(50) NOT NULL,
    [CampoLabel] NVARCHAR(200) NOT NULL,
    [ValorRecebido] NVARCHAR(500) NOT NULL,
    [ValorManual] NVARCHAR(500),
    [Confianca] INT NOT NULL CONSTRAINT [DF_BL_CampoRevisao_Confianca] DEFAULT 0,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT [DF_BL_CampoRevisao_Status] DEFAULT 'pendente',
    [UpdatedAt] DATETIME2 NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_CampoRevisao_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_BL_CampoRevisao] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BL_CampoRevisao_Bl_CampoKey] UNIQUE NONCLUSTERED ([BlMasterId], [BlHouseId], [CampoKey])
);

CREATE TABLE [dbo].[BL_HistoricoAlteracao] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BlMasterId] INT NULL,
    [BlHouseId] INT NULL,
    [Usuario] NVARCHAR(200) NOT NULL,
    [Campo] NVARCHAR(200) NOT NULL,
    [ValorAntes] NVARCHAR(500) NOT NULL,
    [ValorDepois] NVARCHAR(500) NOT NULL,
    [Acao] VARCHAR(30) NOT NULL CONSTRAINT [DF_BL_HistoricoAlteracao_Acao] DEFAULT 'edicao',
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_HistoricoAlteracao_CreatedAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_BL_HistoricoAlteracao] PRIMARY KEY CLUSTERED ([Id])
);

CREATE NONCLUSTERED INDEX [IX_BL_Workflow_Status] ON [dbo].[BL_Workflow]([Status]);
CREATE NONCLUSTERED INDEX [IX_BL_CampoRevisao_BlMasterId] ON [dbo].[BL_CampoRevisao]([BlMasterId]);
CREATE NONCLUSTERED INDEX [IX_BL_CampoRevisao_BlHouseId] ON [dbo].[BL_CampoRevisao]([BlHouseId]);
CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_BlMasterId] ON [dbo].[BL_HistoricoAlteracao]([BlMasterId]);
CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_BlHouseId] ON [dbo].[BL_HistoricoAlteracao]([BlHouseId]);
CREATE NONCLUSTERED INDEX [IX_BL_HistoricoAlteracao_CreatedAt] ON [dbo].[BL_HistoricoAlteracao]([CreatedAt]);

ALTER TABLE [dbo].[BL_Workflow] ADD CONSTRAINT [FK_BL_Workflow_BL_Master]
    FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[BL_Workflow] ADD CONSTRAINT [FK_BL_Workflow_BL_House]
    FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [FK_BL_CampoRevisao_BL_Master]
    FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[BL_CampoRevisao] ADD CONSTRAINT [FK_BL_CampoRevisao_BL_House]
    FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[BL_HistoricoAlteracao] ADD CONSTRAINT [FK_BL_HistoricoAlteracao_BL_Master]
    FOREIGN KEY ([BlMasterId]) REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[BL_HistoricoAlteracao] ADD CONSTRAINT [FK_BL_HistoricoAlteracao_BL_House]
    FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
