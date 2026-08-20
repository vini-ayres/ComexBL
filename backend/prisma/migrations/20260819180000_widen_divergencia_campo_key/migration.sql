-- CampoKey de divergência precisa acomodar prefixo house.{hbl}.cargo.{token}.{field}
-- sem truncar e colidir na unique (BlDivergenciaId, CampoKey).

IF COL_LENGTH(N'dbo.BL_DivergenciaCampo', N'CampoKey') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[BL_DivergenciaCampo] ALTER COLUMN [CampoKey] VARCHAR(200) NOT NULL;
END;
