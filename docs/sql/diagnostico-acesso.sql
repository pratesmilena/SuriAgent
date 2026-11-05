-- Somente leitura. Executar no SQL Editor do projeto Supabase.
-- Não retorna credenciais nem conteúdo das tabelas escolares.
SELECT n.nspname AS esquema, c.relname AS tabela,
       c.relrowsecurity AS rls_ativo,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select_tabela,
       has_any_column_privilege('anon', c.oid, 'SELECT') AS anon_select_alguma_coluna
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('conhecimentos', 'horario_aulatarde');

SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conhecimentos', 'horario_aulatarde');

SELECT count(*) AS registros_endereco_id_4
FROM public.conhecimentos WHERE id = 4;


-- Conferir esquema e privilégios de cada coluna usada pelo backend.
SELECT table_name, column_name, data_type,
       has_column_privilege('anon',
           format('%I.%I', table_schema, table_name),
           column_name, 'SELECT') AS anon_select_coluna
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'conhecimentos' AND column_name IN ('id', 'conteudo'))
    OR (table_name = 'horario_aulatarde' AND column_name IN (
      'turma', 'dia_semana', 'numero_aula', 'horario_inicio', 'professor', 'disciplina'
    ))
  )
ORDER BY table_name, ordinal_position;
