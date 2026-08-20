-- XML passa a ser 1 envio por House (partlot reutiliza o Master e dispara XML novo).
-- HBLCount no Master permanece 1; Houses extras agregam pelo mesmo container.
-- SQL Server exige batch separado (EXEC) para usar a coluna recém-adicionada.

IF COL_LENGTH(N'dbo.BL_XmlDispatch', N'BlHouseId') IS NULL
BEGIN
    ALTER TABLE [dbo].[BL_XmlDispatch] ADD [BlHouseId] INT NULL;
END;

EXEC(N'
UPDATE d
SET d.BlHouseId = h.FirstHouseId
FROM [dbo].[BL_XmlDispatch] d
INNER JOIN (
    SELECT BLMasterId, MIN(Id) AS FirstHouseId
    FROM [dbo].[BL_House]
    WHERE BLMasterId IS NOT NULL
    GROUP BY BLMasterId
) h ON h.BLMasterId = d.BlMasterId
WHERE d.BlHouseId IS NULL;
');

EXEC(N'DELETE FROM [dbo].[BL_XmlDispatch] WHERE [BlHouseId] IS NULL;');

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = N'UQ_BL_XmlDispatch_BlMasterId'
      AND parent_object_id = OBJECT_ID(N'dbo.BL_XmlDispatch')
)
BEGIN
    ALTER TABLE [dbo].[BL_XmlDispatch] DROP CONSTRAINT [UQ_BL_XmlDispatch_BlMasterId];
END;

EXEC(N'ALTER TABLE [dbo].[BL_XmlDispatch] ALTER COLUMN [BlHouseId] INT NOT NULL;');

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = N'UQ_BL_XmlDispatch_BlHouseId'
      AND parent_object_id = OBJECT_ID(N'dbo.BL_XmlDispatch')
)
BEGIN
    ALTER TABLE [dbo].[BL_XmlDispatch]
        ADD CONSTRAINT [UQ_BL_XmlDispatch_BlHouseId] UNIQUE ([BlHouseId]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_BL_XmlDispatch_BL_House'
)
BEGIN
    ALTER TABLE [dbo].[BL_XmlDispatch]
        ADD CONSTRAINT [FK_BL_XmlDispatch_BL_House]
        FOREIGN KEY ([BlHouseId]) REFERENCES [dbo].[BL_House]([Id]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BL_XmlDispatch_BlMasterId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BL_XmlDispatch_BlMasterId]
        ON [dbo].[BL_XmlDispatch]([BlMasterId]);
END;
