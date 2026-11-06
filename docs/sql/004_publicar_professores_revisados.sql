-- Execute no SQL Editor após conferir os 29 vínculos informados pela responsável.
-- Requer a tabela do script 002 e, para importações antigas, a correção 003.
-- Publica somente correspondências exatas; não substitui correções nem outras linhas.
BEGIN;
WITH revisados(codigo, professor, disciplina) AS (VALUES
  ('fundamental-miria-matematica', 'Miria', 'Matemática'),
  ('fundamental-miria-orientacao-de-estudo-de-matematica', 'Miria', 'Orientação de Estudo de Matemática'),
  ('fundamental-iara-tecnologia', 'Iara', 'Tecnologia'),
  ('fundamental-iara-ciencias', 'Iara', 'Ciências'),
  ('fundamental-joyce-portugues', 'Joyce', 'Português'),
  ('fundamental-joyce-redacao', 'Joyce', 'Redação'),
  ('fundamental-enilson-geografia', 'Enilson', 'Geografia'),
  ('fundamental-enilson-projeto-de-vida', 'Enilson', 'Projeto de Vida'),
  ('fundamental-luciana-historia', 'Luciana', 'História'),
  ('fundamental-luciana-tecnologia', 'Luciana', 'Tecnologia'),
  ('fundamental-neusa-historia', 'Neusa', 'História'),
  ('fundamental-neusa-projeto-de-vida', 'Neusa', 'Projeto de Vida'),
  ('fundamental-anderson-matematica', 'Anderson', 'Matemática'),
  ('fundamental-anderson-orientacao-de-estudos-de-matematica', 'Anderson', 'Orientação de Estudos de Matemática'),
  ('fundamental-djalma-orientacao-de-portugues', 'Djalma', 'Orientação de Português'),
  ('fundamental-djalma-portugues', 'Djalma', 'Português'),
  ('fundamental-katia-educacao-fisica', 'Katia', 'Educação Física'),
  ('fundamental-lubueno-geografia', 'LuBueno', 'Geografia'),
  ('fundamental-lubueno-tecnologia', 'LuBueno', 'Tecnologia'),
  ('fundamental-cicero-ciencias', 'Cicero', 'Ciências'),
  ('fundamental-altair-artes', 'Altair', 'Artes'),
  ('fundamental-elis-ingles', 'Elis', 'Inglês'),
  ('fundamental-elis-projeto-de-vida', 'Elis', 'Projeto de Vida'),
  ('fundamental-tiago-matematica', 'Tiago', 'Matemática'),
  ('fundamental-tiago-orientacao-de-estudos-de-matematica', 'Tiago', 'Orientação de Estudos de Matemática'),
  ('fundamental-olimpia-redacao', 'Olimpia', 'Redação'),
  ('fundamental-ale-portugues', 'Ale', 'Português'),
  ('fundamental-ale-redacao', 'Ale', 'Redação'),
  ('fundamental-marcelo-efin', 'Marcelo', 'Educação Financeira')
)
UPDATE public.escola_professor_disciplinas AS p
SET confirmado = true, publicado = true, verificado_em = CURRENT_DATE
FROM revisados AS r
WHERE p.codigo = r.codigo AND p.professor = r.professor
  AND p.disciplina = r.disciplina AND p.etapa = 'ENSINO_FUNDAMENTAL'
  AND p.observacao IS NULL AND length(trim(p.fonte)) > 0
  AND p.publicado = false
RETURNING p.professor, p.disciplina, p.confirmado, p.publicado;
COMMIT;
