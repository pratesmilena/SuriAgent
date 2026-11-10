-- Usa somente conhecimentos; requer a política do script 007 para leitura pelo site.
-- Preserva o resumo e os demais registros. Pode executar novamente sem duplicar.
BEGIN;
LOCK TABLE public.conhecimentos IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.conhecimentos ADD COLUMN IF NOT EXISTS suri_publicado boolean NOT NULL DEFAULT false;
INSERT INTO public.conhecimentos
(id,categoria,titulo,conteudo,palavras_chave,suri_publicado)
OVERRIDING SYSTEM VALUE
SELECT (SELECT coalesce(max(id),0)+1 FROM public.conhecimentos), 'historia',
'Informações e Histórico da Escola',
'• Criação original: criada pelo Decreto nº 43.679, de 9 de dezembro de 1998, como Escola Estadual Jardim Iná II, no Jardim Tua, distrito de Itaim Paulista, São Paulo.

• Mudança de nome: pelo Decreto nº 52.439, de 4 de dezembro de 2007, assinado pelo governador José Serra, passou a chamar-se Escola Estadual República do Suriname.',
'história, criação, Jardim Iná II, Jardim Tua, 1998, mudança de nome, 2007, Decreto 43679, Decreto 52439', true
WHERE NOT EXISTS (SELECT 1 FROM public.conhecimentos WHERE categoria='historia' AND titulo='Informações e Histórico da Escola');
-- Mantém a sequência alinhada quando id é serial/identity.
DO $$
DECLARE sequencia text;
BEGIN
 sequencia := pg_get_serial_sequence('public.conhecimentos','id');
 IF sequencia IS NOT NULL THEN
  PERFORM setval(sequencia::regclass,
   greatest(coalesce(pg_sequence_last_value(sequencia::regclass),0),
    (SELECT max(id) FROM public.conhecimentos)), true);
 END IF;
END $$;
COMMIT;
SELECT id,titulo,conteudo,suri_publicado FROM public.conhecimentos
WHERE categoria='historia';
-- Referência mantida no projeto: https://www.al.sp.gov.br/repositorio/legislacao/decreto/2007/decreto-52439-04.12.2007.html
