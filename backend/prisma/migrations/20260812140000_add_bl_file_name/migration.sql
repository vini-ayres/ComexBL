-- Arquivo local pós-OCR (n8n → pasta files/). Substitui o uso de ItemId/DriveId (OneDrive).
-- ItemId e DriveId permanecem no banco para remoção manual posterior.

ALTER TABLE [dbo].[BL_Master] ADD [FileName] NVARCHAR(255) NULL;
ALTER TABLE [dbo].[BL_House] ADD [FileName] NVARCHAR(255) NULL;
