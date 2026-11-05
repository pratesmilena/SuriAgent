-- PROPOSTA PARA REVISÃO DA ESCOLA. NÃO FOI EXECUTADA PELO ASSISTENTE.
-- Usar somente se esses horários e o endereço estiverem autorizados para
-- consulta pública, sem login. Para acesso restrito, implementar Auth e
-- políticas de authenticated em vez de liberar anon.
-- Primeiro executar diagnostico-acesso.sql e revisar políticas existentes.
-- As instruções abaixo não concedem INSERT, UPDATE ou DELETE.

BEGIN;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT (turma, dia_semana, numero_aula, horario_inicio, professor, disciplina)
ON public.horario_aulatarde TO anon;
GRANT SELECT (id, conteudo) ON public.conhecimentos TO anon;

ALTER TABLE public.horario_aulatarde ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conhecimentos ENABLE ROW LEVEL SECURITY;

-- Políticas criadas apenas se estes nomes ainda não existirem.
-- Políticas permissivas existentes se combinam por OR: revisar primeiro!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='horario_aulatarde' AND policyname='suri_leitura_horarios_publicos') THEN
    CREATE POLICY suri_leitura_horarios_publicos ON public.horario_aulatarde
      FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='conhecimentos' AND policyname='suri_leitura_endereco_publico') THEN
    CREATE POLICY suri_leitura_endereco_publico ON public.conhecimentos
      FOR SELECT TO anon USING (id = 4);
  END IF;
END $$;
COMMIT;
