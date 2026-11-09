-- Somente a tabela existente conhecimentos. Não cria tabelas nem altera textos.
-- Publica os 13 registros escolares conferidos no arquivo enviado pela responsável.
BEGIN;
ALTER TABLE public.conhecimentos ADD COLUMN IF NOT EXISTS suri_publicado boolean NOT NULL DEFAULT false;
WITH revisados(id,titulo) AS (VALUES
 (1, 'Resumo da Escola'),
 (2, 'Dados do Censo Escolar 2025'),
 (3, 'Matrículas por Etapa (2025)'),
 (4, 'Endereço e Contatos'),
 (5, 'IDEB 2023'),
 (6, 'Estrutura e Recursos'),
 (7, 'A REPÚBLICA DO SURINAME é pública ou privada?'),
 (8, 'Quantos alunos tem a REPÚBLICA DO SURINAME?'),
 (9, 'Quais etapas de ensino a REPÚBLICA DO SURINAME oferece?'),
 (10, 'Onde fica a REPÚBLICA DO SURINAME?'),
 (11, 'Qual o código INEP da REPÚBLICA DO SURINAME?'),
 (12, 'Qual o IDEB da REPÚBLICA DO SURINAME?'),
 (13, 'Horários das Aulas e Períodos Escolares')
)
UPDATE public.conhecimentos AS c SET suri_publicado = true
FROM revisados AS r WHERE c.id = r.id AND c.titulo = r.titulo;
ALTER TABLE public.conhecimentos ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT (id,categoria,titulo,conteudo,palavras_chave)
 ON public.conhecimentos TO anon, authenticated;
DROP POLICY IF EXISTS suri_leitura_endereco_publico ON public.conhecimentos;
DROP POLICY IF EXISTS suri_leitura_conhecimentos_publicados ON public.conhecimentos;
CREATE POLICY suri_leitura_conhecimentos_publicados ON public.conhecimentos
 FOR SELECT TO anon, authenticated USING (suri_publicado = true);
COMMIT;
SELECT id, titulo, suri_publicado FROM public.conhecimentos ORDER BY id;
