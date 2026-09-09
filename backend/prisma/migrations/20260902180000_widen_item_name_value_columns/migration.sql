-- ItemName em BL_House já é NVARCHAR(MAX). Os valores comparados/resolvidos
-- (Item Name incluso) eram gravados em NVARCHAR(500) e estouravam no histórico
-- ao concatenar BL Final + GlobalSys (P2000 em ValorAntes).

IF COL_LENGTH(N'dbo.BL_HistoricoAlteracao', N'ValorAntes') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_HistoricoAlteracao] ALTER COLUMN [ValorAntes] NVARCHAR(MAX) NOT NULL;
END;

IF COL_LENGTH(N'dbo.BL_HistoricoAlteracao', N'ValorDepois') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_HistoricoAlteracao] ALTER COLUMN [ValorDepois] NVARCHAR(MAX) NOT NULL;
END;

IF COL_LENGTH(N'dbo.BL_DivergenciaCampo', N'ValorBlFinal') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_DivergenciaCampo] ALTER COLUMN [ValorBlFinal] NVARCHAR(MAX) NOT NULL;
END;

IF COL_LENGTH(N'dbo.BL_DivergenciaCampo', N'ValorGlobalSys') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_DivergenciaCampo] ALTER COLUMN [ValorGlobalSys] NVARCHAR(MAX) NOT NULL;
END;

IF COL_LENGTH(N'dbo.BL_CampoRevisao', N'ValorRecebido') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_CampoRevisao] ALTER COLUMN [ValorRecebido] NVARCHAR(MAX) NOT NULL;
END;

IF COL_LENGTH(N'dbo.BL_CampoRevisao', N'ValorManual') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_CampoRevisao] ALTER COLUMN [ValorManual] NVARCHAR(MAX) NULL;
END;
