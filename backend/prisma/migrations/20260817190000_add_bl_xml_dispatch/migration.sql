IF OBJECT_ID(N'[dbo].[BL_XmlDispatch]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BL_XmlDispatch] (
        [Id] INT NOT NULL IDENTITY(1,1),
        [BlMasterId] INT NOT NULL,
        [Status] VARCHAR(20) NOT NULL,
        [DispatchedAt] DATETIME2 NULL,
        [LastError] NVARCHAR(1000) NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_XmlDispatch_CreatedAt] DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BL_XmlDispatch_UpdatedAt] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_BL_XmlDispatch] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_BL_XmlDispatch_BlMasterId] UNIQUE ([BlMasterId]),
        CONSTRAINT [FK_BL_XmlDispatch_BL_Master] FOREIGN KEY ([BlMasterId])
            REFERENCES [dbo].[BL_Master]([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_XmlDispatch_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_XmlDispatch_Status] ON [dbo].[BL_XmlDispatch]([Status]);
END;
