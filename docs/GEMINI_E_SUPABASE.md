# Interpretação escolar e pesquisa com Gemini

A aplicação usa HTML/CSS/JavaScript no navegador, Node.js/Express no servidor e Netlify Functions na publicação. As credenciais permanecem no servidor; nenhuma tabela ou política foi criada para esta integração.

## Fluxo atual

1. A pergunta chega a `POST /api/escola/perguntar`.
2. Pedidos explícitos de FAQ recebem as sugestões editoriais. Manhã/matutino recebem o aviso de indisponibilidade. Endereço, turma/dia completos e eletivas reconhecidas continuam usando suas consultas diretas.
3. Para as outras formulações, com Gemini configurado, o backend lê os conteúdos acessíveis de `conhecimentos` e os catálogos da grade da tarde. O modelo recebe esses dados e a pergunta, sem credenciais ou perfil do usuário.
4. Gemini retorna um plano JSON: selecionar conteúdos, consultar horários, docentes, eletivas, turmas ou endereço; pedir esclarecimento; informar ausência de dados; ou indicar que a dúvida não é escolar. O servidor valida tipos, índices, turma, dia, número de aula e nomes nos catálogos. O modelo não escreve nem executa SQL.
5. A resposta usa somente os registros selecionados ou o resultado das funções de consulta existentes. A seleção de parágrafos e itens de lista também é validada: não são aceitas frases livres como fatos escolares do banco.
6. Sem chave, com cota excedida, timeout ou plano inválido, as regras de busca anteriores continuam disponíveis. Uma pergunta ambígua não recebe uma turma inventada: o assistente pede esclarecimento.
7. Se uma informação escolar não estiver na base, o backend pode ativar Google Search pelo Gemini. Essa resposta é identificada como externa e mostra fontes. Falha da pesquisa ou evidência insuficiente mantém a mensagem de informação não encontrada.

A interpretação aceita sinônimos, abreviações e algumas grafias informais, mas não garante compreensão de toda formulação possível. Não é uma busca vetorial. O contexto está limitado a 80 documentos/32 mil caracteres, com paginação de até 10 mil registros para os catálogos. O sistema não usa histórico anterior para resolver pronomes ambíguos. Hoje/amanhã usam a referência de data de São Paulo, sem presumir calendário de feriados ou dias letivos.

## Google Search quando falta informação

A pesquisa usa a ferramenta nativa `googleSearch` da API Gemini. O prompt identifica a escola da Rua Antônio João de Medeiros, 810, Itaim Paulista, São Paulo, e prioriza fontes oficiais. Não é suficiente o modelo dizer que pesquisou: o servidor exige metadados de grounding, segmentos apoiados em fontes HTTP/HTTPS e identificação da mesma escola/localidade. Afirmações sem suporte são descartadas. Essa validação reduz erros de atribuição, mas fontes externas podem estar desatualizadas e ainda precisam de avaliação humana.

O texto começa indicando “Informação encontrada em pesquisa no Google, fora da base escolar” e inclui URLs das fontes. As sugestões fornecidas pelo Google, quando presentes, são exibidas em iframe isolado, sem permissão para executar scripts ou acessar a página principal. As respostas do Supabase continuam sem fontes/títulos extras. Nada encontrado na web é gravado automaticamente no banco.

A busca não é feita para substituir turma/dia ausentes, para dados da manhã, contatos pessoais ou credenciais. Falha de permissão/conexão do banco não é apresentada como ausência de informação para contornar o acesso. A chave e o modelo precisam permitir pesquisa Google. Esse recurso possui cotas e condições próprias, que podem envolver cobrança; confira o projeto Google antes de usá-lo em produção. A autorização no chat não altera o plano do provedor nem os créditos do Netlify.

Referências técnicas conferidas:

- https://ai.google.dev/gemini-api/docs/google-search
- https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta — `Tool.googleSearch`, `GroundingMetadata.groundingChunks`, `groundingSupports` e `searchEntryPoint`.

## Configurar e verificar

1. Crie uma chave da sua conta em https://aistudio.google.com/apikey.
2. Salve `SURI_GEMINI` (ou `GEMINI_API_KEY`) no `.env` local ou nas configurações seguras da hospedagem. Se ambos estiverem preenchidos, `SURI_GEMINI` tem prioridade. O nome não muda a sensibilidade do valor nem as regras da hospedagem.
3. Configure `GEMINI_MODEL` com um modelo de geração de texto disponível na conta, com JSON e Google Search quando esse recurso for utilizado. O valor de exemplo do repositório não comprova acesso ao modelo.
4. No Netlify, as variáveis precisam estar disponíveis à execução das Functions. Um novo deploy publica o código; salvar a variável local não a transfere à hospedagem.
5. `AI_PROVIDER` define o serviço do chat geral. Interpretação, seleção escolar e pesquisa Google usam Gemini especificamente.

```sh
npm test
npm run build:netlify
npm run check:school
npm run check:gemini
npm run check:school-ai
npm run check:school-ai -- --web
```

Os três últimos comandos podem consumir a cota da conta. `check:gemini` faz uma chamada simples; `check:school-ai` testa três interpretações reais e só testa pesquisa Google se `--web` for informado. Código 2 significa chave ausente, e código 1 informa falha/resultado não confirmado. Chaves e respostas privadas do provedor não são impressas.

Testes locais cobrem planos inválidos, índices inexistentes, fontes inválidas, ausência de grounding, escola diferente, baixa confiança, manhã, indisponibilidade e preservação das respostas existentes. A interpretação também foi avaliada com seis perguntas informais, usando Supabase real e Gemini por meio do backend já publicado. Isso não comprova que o site antigo tenha recebido o código novo. A pesquisa Google nova foi validada por testes simulados; não houve chamada real com a ferramenta de pesquisa porque a chave está somente no Netlify e a versão nova ainda depende de deploy.
