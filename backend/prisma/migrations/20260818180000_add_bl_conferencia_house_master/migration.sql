-- Conferência House × Master: peso, volume e embalagem após Apoio Humano

IF OBJECT_ID(N'[dbo].[BL_Conferencia]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_Conferencia] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlMasterId] INT NULL,
        [BlHouseId] INT NULL,
        [Status] VARCHAR(20) NOT NULL CONSTRAINT [DF_BL_Conferencia_Status] DEFAULT 'pendente',
        [ResolvedByUserId] INT NULL,
        [ResolvedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_Conferencia_CreatedAt] DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_Conferencia_UpdatedAt] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_BL_Conferencia] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_BL_Conferencia_BL_Master] FOREIGN KEY ([BlMasterId])
            REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_BL_Conferencia_BL_House] FOREIGN KEY ([BlHouseId])
            REFERENCES [dbo].[BL_House]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_BL_Conferencia_APP_User] FOREIGN KEY ([ResolvedByUserId])
            REFERENCES [dbo].[APP_User]([Id]) ON DELETE NO ACTION
    );
END;

IF OBJECT_ID(N'[dbo].[BL_ConferenciaCampo]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_ConferenciaCampo] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlConferenciaId] INT NOT NULL,
        [CampoKey] VARCHAR(80) NOT NULL,
        [CampoLabel] NVARCHAR(200) NOT NULL,
        [ValorHouse] NVARCHAR(500) NOT NULL,
        [ValorMaster] NVARCHAR(500) NOT NULL,
        [ValorManual] NVARCHAR(500) NULL,
        [Status] VARCHAR(30) NOT NULL,
        [Categoria] VARCHAR(20) NOT NULL,
        CONSTRAINT [PK_BL_ConferenciaCampo] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_BL_ConferenciaCampo_Conferencia_CampoKey] UNIQUE NONCLUSTERED ([BlConferenciaId], [CampoKey]),
        CONSTRAINT [FK_BL_ConferenciaCampo_BL_Conferencia] FOREIGN KEY ([BlConferenciaId])
            REFERENCES [dbo].[BL_Conferencia]([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Conferencia_BlMasterId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_Conferencia_BlMasterId] ON [dbo].[BL_Conferencia]([BlMasterId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Conferencia_BlHouseId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_Conferencia_BlHouseId] ON [dbo].[BL_Conferencia]([BlHouseId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_Conferencia_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_Conferencia_Status] ON [dbo].[BL_Conferencia]([Status]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_ConferenciaCampo_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_ConferenciaCampo_Status] ON [dbo].[BL_ConferenciaCampo]([Status]);
END;
