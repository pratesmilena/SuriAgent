-- Execute no SQL Editor do Supabase. Mantém o nome Ale e as disciplinas existentes.
BEGIN;
ALTER TABLE public.escola_professor_disciplinas
    ADD COLUMN IF NOT EXISTS nomes_alternativos text NOT NULL DEFAULT '';
UPDATE public.escola_professor_disciplinas
SET nomes_alternativos = concat_ws(' ', nullif(trim(nomes_alternativos), ''), 'Alessandra')
WHERE professor = 'Ale' AND etapa = 'ENSINO_FUNDAMENTAL'
  AND nomes_alternativos !~* '\mAlessandra\M';
-- Recria somente a coluna de busca calculada, sem alterar os registros.
ALTER TABLE public.escola_professor_disciplinas DROP COLUMN busca;
ALTER TABLE public.escola_professor_disciplinas ADD COLUMN busca tsvector
    GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(professor,'') || ' ' ||
        coalesce(nomes_alternativos,'') || ' ' || coalesce(disciplina,''))) STORED;
CREATE INDEX escola_professores_busca_idx ON public.escola_professor_disciplinas USING gin(busca);
GRANT SELECT (busca, nomes_alternativos) ON public.escola_professor_disciplinas TO anon, authenticated;
COMMIT;
