# Aplicação dos três materiais ao SuriAgent

## Fontes e limites

Análise dos resumos fornecidos pela responsável pelo projeto. Não foi possível assistir aos vídeos diretamente: o acesso ao YouTube retornou HTTP 403. Não são atribuídos aos autores comandos SQL nem correções que os resumos não comprovam.

1. Robson Oliveira — Supabase, banco e login: https://www.youtube.com/watch?v=lgd_GgomCmE. Resumo baseado em transcrição e descrição.
2. Bruno Devx — Lovable, Supabase e GitHub: https://www.youtube.com/watch?v=SIKe2bv5qHw. Material parcial, baseado em título e descrição; não permite reproduzir procedimentos técnicos.
3. NoCode StartUp — curso Supabase: https://www.youtube.com/watch?v=OztHXOnQLXc. Resumo baseado em transcrição e descrição.

## O que se aplica

| Conceito | Evidência no SuriAgent | Ação aplicável |
| --- | --- | --- |
| URL e chave pública | A chave fornecida alcançou a Data API; a resposta de horários identificou o papel anon e privilégio ausente | Manter a conexão existente; não trocar por chave administrativa |
| Esquema compatível | A captura confirma conhecimentos com id, categoria, titulo, conteudo; endereço no id 4 | Consultar o esquema existente, sem recriar tabelas |
| Permissões SQL e RLS | PostgreSQL 42501: permission denied for table horario_aulatarde; conhecimentos sem linhas visíveis | Conferir GRANT SELECT e políticas por papel no painel administrativo |
| Authentication | O cliente atual é de servidor, sem sessão de usuário, usando a chave publishable | Se a leitura for restrita, implementar login e propagar/verificar o JWT nas consultas; adicionar apenas a tela não basta |
| Validar a integração | Testes locais cobrem o contrato e o tratamento de falhas; o teste real ainda falha | Reexecutar check:school após a liberação administrativa e conferir o chat e as turmas reais |
| GitHub e frontend | Código já possui Express, Bootstrap e integração GitHub | Não migrar para Lovable nem trocar o frontend para corrigir privilégio SQL |

## O que não deve ser transplantado

Não recriar tabelas usando o esquema de cursos do vídeo 1 ou do marketplace do vídeo 3. Não adicionar perfis, favoritos, avaliações, Storage ou triggers sem uma necessidade do projeto. Não criar views para tentar contornar permissões. Se uma view se tornar necessária, analisar security_invoker e as permissões das tabelas envolvidas. Não desligar RLS nem confirmação de e-mail como solução para o erro de leitura.

## Causa e incertezas

O erro de horários é confirmado como falta de privilégio SELECT para anon, anterior à avaliação dos filtros de turma e dia. A chave publishable não concede privilégios SQL por si só. O fato de o Table Editor exibir registros não comprova que o papel anon os possa consultar.

Para conhecimentos, zero registros visíveis ainda não identifica sozinho a causa. Conferir a existência do id 4, as políticas, o estado de RLS e o mapeamento. Não afirmar que o banco está vazio ou que a RLS é comprovadamente a única causa.

O diagnóstico anterior à liberação registrou permission_denied, código 42501, em horários e ausência de localização visível na consulta mapeada. Após a responsável executar o GRANT necessário, a leitura dos horários foi confirmada: sete aulas reais retornadas, com validação da tabela e do chat no navegador. Conhecimentos permanece pendente. As alterações de tratamento de erro foram verificadas por 36 testes locais; esses testes não demonstram acesso remoto liberado.

## Procedimento concreto restante

1. Um administrador do projeto Supabase abre SQL Editor e executa docs/sql/diagnostico-acesso.sql. Esse diagnóstico é somente leitura e não expõe chaves nem conteúdo das linhas escolares.
2. Definir se horários e endereço são autorizados para consulta pública ou se exigem login.
3. Para acesso público autorizado, revisar docs/sql/liberar-leitura-revisar.sql considerando as políticas já existentes. Essa proposta não foi executada. Concede apenas leitura dos campos usados pela aplicação; a política de conhecimentos cobre id 4. Políticas permissivas existentes combinam-se por OR e podem ampliar o acesso.
4. Para acesso restrito, implementar Supabase Auth no aplicativo, validar a sessão no backend e aplicar regras para authenticated em vez da liberação pública para anon. Não usar uma service_role como atalho.
5. Reexecutar `NODE_USE_ENV_PROXY=1 npm run check:school -- '3ºC (DS)' SEXTA`. Para uma turma existente e acessível, horários deve retornar read_confirmed, e conhecimentos também deve retornar read_confirmed.
6. Conferir na interface “Onde fica a escola?” e “Quais são as aulas do 3ºC (DS) na sexta-feira?”. A localização deve identificar a fonte Supabase quando a leitura do registro funcionar. A configuração local confirmada não deve ser apresentada como leitura do banco.

Não há ferramenta administrativa Supabase ou conexão PostgreSQL administrativa disponível nesta sessão. A chave publishable pode ler o que o papel já permite; não executa GRANT ou CREATE POLICY. Portanto a etapa administrativa não pode ser concluída apenas alterando arquivos JavaScript.
