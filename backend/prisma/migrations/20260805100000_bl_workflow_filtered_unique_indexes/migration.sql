-- BL_Workflow: substituir UNIQUE constraints por índices únicos filtrados.
-- SQL Server permite apenas um NULL em UNIQUE constraints; workflows Master/House
-- usam BlHouseId/BlMasterId = NULL respectivamente, bloqueando o 2º registro.

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = N'UQ_BL_Workflow_BlMasterId'
      AND parent_object_id = OBJECT_ID(N'dbo.BL_Workflow')
)
BEGIN
    ALTER TABLE [dbo].[BL_Workflow] DROP CONSTRAINT [UQ_BL_Workflow_BlMasterId];
END;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = N'UQ_BL_Workflow_BlHouseId'
      AND parent_object_id = OBJECT_ID(N'dbo.BL_Workflow')
)
BEGIN
    ALTER TABLE [dbo].[BL_Workflow] DROP CONSTRAINT [UQ_BL_Workflow_BlHouseId];
END;

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_BL_Workflow_BlMasterId'
      AND object_id = OBJECT_ID(N'dbo.BL_Workflow')
)
BEGIN
    DROP INDEX [UQ_BL_Workflow_BlMasterId] ON [dbo].[BL_Workflow];
END;

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_BL_Workflow_BlHouseId'
      AND object_id = OBJECT_ID(N'dbo.BL_Workflow')
)
BEGIN
    DROP INDEX [UQ_BL_Workflow_BlHouseId] ON [dbo].[BL_Workflow];
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_BL_Workflow_BlMasterId'
      AND object_id = OBJECT_ID(N'dbo.BL_Workflow')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_Workflow_BlMasterId]
        ON [dbo].[BL_Workflow]([BlMasterId])
        WHERE ([BlMasterId] IS NOT NULL);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_BL_Workflow_BlHouseId'
      AND object_id = OBJECT_ID(N'dbo.BL_Workflow')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_BL_Workflow_BlHouseId]
        ON [dbo].[BL_Workflow]([BlHouseId])
        WHERE ([BlHouseId] IS NOT NULL);
END;
