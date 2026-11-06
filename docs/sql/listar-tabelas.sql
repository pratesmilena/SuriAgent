-- Tabelas do aplicativo; executar no SQL Editor como administrador.
SELECT schemaname AS esquema, tablename AS tabela
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- As tabelas de Authentication/Storage são internas do Supabase e não são
-- o lugar para cadastrar o corpo docente ou disciplinas.
