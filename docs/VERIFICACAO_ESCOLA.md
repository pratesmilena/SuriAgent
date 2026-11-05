# Como conferir as consultas escolares

Estado atual: 36 testes locais passaram. Após a concessão de leitura pela responsável no Supabase, o backend retornou sete aulas reais do 3ºC (DS) em SEXTA; a tabela da interface e o chat foram verificados no navegador. A leitura do endereço na tabela conhecimentos permanece pendente; a configuração local tem origem explícita. Os registros abaixo preservam o histórico do diagnóstico.

Diagnóstico inicial em 04/11/2026: 34 testes locais passaram, incluindo integração do SDK Supabase com HTTP simulado. Isso não substitui leitura autenticada do projeto remoto. O endpoint remoto respondeu HTTP 401 em requisição sem chave. A variável SUPABASE_PUBLISHABLE_KEY está ausente; não foi confirmada a leitura de registros reais.

## Conectar no ambiente Codex

1. No projeto Supabase, abra Settings → API Keys e copie a chave Publishable. Não use service_role ou sb_secret.
2. Nas configurações seguras do ambiente Codex, preencha o requisito SUPABASE_PUBLISHABLE_KEY. A URL é https://tjqcltzfqqeveztdumsb.supabase.co.
3. Salve as configurações e reinicie o ambiente/processo para receber as variáveis. Preencher um campo não demonstra que o processo já recebeu a chave.
4. No diretório /workspace/SuriAgent, execute `NODE_USE_ENV_PROXY=1 npm run check:school -- '3ºC (DS)' SEXTA`. O relatório em .local/school-connection.json deve mostrar read_confirmed para as duas consultas. Não compartilhe a chave em chat, screenshots ou Git.

Em computador local, configure as mesmas variáveis em um arquivo .env ignorado pelo Git e inicie `npm start`. Abra o aplicativo pelo navegador usando a porta local 3000. Se não houver proxy, NODE_USE_ENV_PROXY não é necessário.

## Conferir na interface

Na aba Assistente Suri, experimente:

- “Onde fica a escola?” — deve mostrar Antônio João de Medeiros, 810, Itaim Paulista, São Paulo/SP. A origem informa se veio do registro no Supabase ou da configuração confirmada pela responsável.
- “Quais são as aulas do 3ºC (DS) na sexta-feira?” — deve consultar a turma e o dia e mostrar as aulas encontradas, em ordem. Use o nome exato de uma turma que existe na sua tabela.
- “Qual é a segunda aula do 3ºC (DS) na sexta?” — deve mostrar somente a aula de número 2, sem confundir “segunda aula” com segunda-feira.
- “Quais são as aulas?” — deve pedir turma e dia em vez de inventar uma resposta.

A aba Horários de aula também continua disponível para conferir os filtros diretamente. Esses fluxos não dependem de Gemini, Groq, OpenRouter ou login Puter.

## O que observar no Supabase

A captura fornecida confirma public.conhecimentos com id, categoria, titulo e conteudo (sem acento). A localização usa o registro 4, “Endereço e Contatos”, e lê apenas id e conteudo. Os horários usam public.horario_aulatarde e os campos turma, dia_semana, numero_aula, horario_inicio, professor e disciplina; o esquema de horários ainda exige confirmação na consulta real.

Se ocorrer falha de acesso ou lista vazia, confira a chave, o esquema e as permissões RLS com a pessoa responsável pela escola. O backend não altera tabelas ou políticas. Uma lista vazia pode ser causada por RLS ou pelo nome da turma e não comprova ausência de registros. Não desative RLS nem use chave administrativa para contornar uma recusa.

## Resultado do teste com a chave fornecida

A chave publishable foi aceita pelo serviço em 04/11/2026. A leitura de horario_aulatarde retornou código PostgreSQL 42501: permission denied for table horario_aulatarde. O servidor orientou conceder SELECT ao papel anon. A leitura de conhecimentos retornou HTTP 200 com zero registros acessíveis; isso ainda não valida a localização no banco, pois pode haver RLS ou ausência de linhas acessíveis.

Há um diagnóstico somente de leitura em docs/sql/diagnostico-acesso.sql. A proposta docs/sql/liberar-leitura-revisar.sql foi preparada para revisão e **não foi executada**. Ela só é adequada se a escola autorizar acesso público aos horários e ao endereço. Permite leitura dos campos usados pelo aplicativo, restringe conhecimentos ao id 4 por uma nova política e não concede escrita. Políticas permissivas existentes se combinam por OR e devem ser revisadas antes de executar qualquer mudança. Se o acesso deve ser restrito, usar autenticação em vez de liberar anon.

A chave foi colocada somente em .env local, ignorado pelo Git. Para persistir a configuração do ambiente pelo fluxo da plataforma, preencha também o campo seguro SUPABASE_PUBLISHABLE_KEY; nenhum valor foi salvo em arquivos versionados.

## Revisão de conexão e tutoriais

Os três vídeos solicitados (lgd_GgomCmE, SIKe2bv5qHw e OztHXOnQLXc) não puderam ser consultados: o proxy retornou `403 Forbidden` ao abrir as páginas. Nenhuma orientação foi atribuída a esses tutoriais. Para comparar soluções, fornecer transcrição ou trechos sobre configuração do cliente, permissões SELECT e políticas RLS.

O tratamento das rotas foi ajustado: o código PostgreSQL 42501 gera HTTP 503 com o código seguro LEITURA_ESCOLAR_NAO_AUTORIZADA, distinguindo-o de BANCO_ESCOLAR_NAO_CONFIGURADO. O script check:school identifica permission_denied e indica revisão de GRANT SELECT e RLS por administrador. Não imprime conteúdo dos registros ou chaves. Os 36 testes locais passaram; dois testes novos cobrem a recusa de leitura nas rotas de horários e chat.

Para concluir no painel Supabase: abrir o projeto → SQL Editor → New query; executar primeiro docs/sql/diagnostico-acesso.sql. Revisar as políticas retornadas e, somente se a escola autorizar consulta pública sem login, revisar a proposta docs/sql/liberar-leitura-revisar.sql antes de executá-la. Para dados restritos, usar Supabase Auth e políticas para authenticated. Nenhuma dessas alterações administrativas foi executada pelo assistente. Depois, repetir `NODE_USE_ENV_PROXY=1 npm run check:school` no backend. A chave publishable não permite conceder privilégios SQL.

## Leitura dos horários confirmada após o GRANT

Após a responsável executar GRANT de leitura nas colunas necessárias de horario_aulatarde, a consulta autenticada pela chave publishable retornou sete aulas para 3ºC (DS) em SEXTA. A validação no navegador confirmou sete linhas na aba Horários e a resposta do chat baseada nos registros reais do Supabase. O erro 42501 dos horários foi resolvido. A consulta de localização em conhecimentos ainda não retornou um registro visível; permanece uma pendência separada. O endereço da configuração local continua identificado como tal.
