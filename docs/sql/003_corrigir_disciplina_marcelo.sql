-- Para quem executou a primeira versão do cadastro com Efin (?).
-- Executar no SQL Editor como administrador após criar/importar a tabela.
-- Não publica o registro nem sobrescreve disciplinas já revisadas.
BEGIN;
UPDATE public.escola_professor_disciplinas
SET disciplina = 'Educação Financeira', observacao = NULL
WHERE codigo = 'fundamental-marcelo-efin'
  AND disciplina = 'Efin (?)'
  AND observacao = 'Disciplina informada como Efin (?); confirmar nome completo.'
  AND publicado = false
RETURNING professor, disciplina, confirmado, publicado;
COMMIT;
