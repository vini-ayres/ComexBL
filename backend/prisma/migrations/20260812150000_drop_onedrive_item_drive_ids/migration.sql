-- Remove colunas legadas OneDrive (ItemId / DriveId). Idempotente se já removidas manualmente.

IF COL_LENGTH('dbo.BL_Master', 'ItemId') IS NOT NULL
  ALTER TABLE [dbo].[BL_Master] DROP COLUMN [ItemId];

IF COL_LENGTH('dbo.BL_Master', 'DriveId') IS NOT NULL
  ALTER TABLE [dbo].[BL_Master] DROP COLUMN [DriveId];

IF COL_LENGTH('dbo.BL_House', 'ItemId') IS NOT NULL
  ALTER TABLE [dbo].[BL_House] DROP COLUMN [ItemId];

IF COL_LENGTH('dbo.BL_House', 'DriveId') IS NOT NULL
  ALTER TABLE [dbo].[BL_House] DROP COLUMN [DriveId];
