# Usar a base existente conhecimentos

O arquivo enviado pela responsável contém 13 registros públicos sobre a escola. A política `suri_leitura_endereco_publico` liberava somente id=4 ao visitante e não concedia acesso ao login.

A correção do agente consulta `conhecimentos` quando as tabelas opcionais `escola_conteudos`/`escola_eventos` não existem ou não têm respostas para o tópico. Usa colunas existentes, respeita RLS e mapeia cursos, infraestrutura/espaços e FAQ pelos registros conferidos. Conteúdo novo com categoria historia, cursos, projetos, ambiente, espacos, eventos ou faq também é reconhecido. História, projetos e eventos ainda não estão nos 13 registros enviados; o agente não os inventa. A grade detalhada e o cadastro de professores permanecem em suas tabelas próprias.

## Ação necessária no Supabase

1. Abra `docs/sql/007_liberar_conhecimentos_revisados.sql` no GitHub em Raw.
2. Copie e execute o arquivo completo no SQL Editor do Supabase.
3. O resultado deve mostrar `suri_publicado=true` para os registros originais de IDs 1 a 13. Só correspondências exatas de ID e título são marcadas; diferenças devem ser conferidas, não liberadas indiscriminadamente.
4. Aguarde o deploy do Netlify e teste “Quais cursos a escola oferece?”, “Tem quadra?”, “Qual é o IDEB da escola?” tanto como visitante quanto com login.

O SQL mantém RLS, não publica linhas futuras automaticamente, não dá escrita ao site e não altera os textos. Não foi executado remotamente pelo assistente porque a sessão não fornece ferramenta SQL administrativa.

O registro 13 menciona `horarios_aulas`, enquanto a tabela confirmada do aplicativo é `horario_aulatarde`. Ele também descreve períodos de forma diferente do texto novo (6h às 21h15, três turnos). Confirmar esses detalhes com a escola antes de atualizar a descrição geral; o script não sobrescreve nenhuma das informações.

Não é necessário executar 001/006 para esta correção da base existente. Esses scripts continuam disponíveis somente para quem optar pela estrutura de conteúdo separada.
