-- Baseline do histórico Prisma após upgrade (executar manualmente após upgrade_existing_db.sql)
DELETE FROM [dbo].[_prisma_migrations]
WHERE [migration_name] IN (
    N'20260708185924_comex_bl',
    N'20260708194500_remove_legacy_tables_and_add_app_tables',
    N'20260715120000_consolidate_app_persistence'
);
