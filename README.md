# AgenteSuri

Assistente estudantil da Escola Estadual República do Suriname. Interface responsiva com Bootstrap 5, em verde e roxo, consulta de horários oficiais via Supabase e chat com seleção entre Gemini, Groq, OpenRouter e Puter.

## Estado da validação

Os 42 testes locais passaram. Foram verificadas 55 consultas reais no Supabase: 11 turmas × cinco dias, com sete aulas por combinação (385 aulas). A interface foi testada com dados reais de segunda e terça, semana completa e chat por apelido da turma. As consultas usam somente os registros existentes na tabela de horários da tarde, sem criar aulas ou alterar o banco.

A aba Horários carrega automaticamente as turmas de `GET /api/horarios/catalogo`. Os dias sem registros visíveis para a turma ficam indisponíveis. `dia=SEMANA` consulta segunda a sexta e ordena por dia e número da aula; o chat aceita “Quais são as aulas do 3C de segunda a sexta?” e “Quais são as turmas?”. Apelidos são aceitos apenas quando identificam uma única turma cadastrada; o curso nunca é adivinhado em casos ambíguos. O catálogo usa paginação e informa falha em vez de truncar silenciosamente uma lista acima de seu limite de 10 mil linhas.

A chave e o banco SQLite local não são versionados. Configurar as variáveis do ambiente continua necessário em outro computador. As permissões e os registros existentes no Supabase são externos ao repositório; os scripts SQL de revisão não são executados automaticamente. A localização identifica se foi consultada no banco ou lida da configuração confirmada. Os testes de provedores de IA usam simulações, sem comprovar inferência autenticada.

## Desenvolvimento

Requer Node.js 24 e npm. No diretório do projeto:

```sh
npm ci
cp .env.example .env  # somente se .env ainda não existir
npm start
```

Configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no servidor. Use a chave publishable do projeto; não use `service_role` ou `sb_secret_...`. Em ambiente gerenciado, prefira as configurações seguras do ambiente a arquivos locais. As chaves de IA são opcionais para a consulta de horários. O chat usa a chave do provedor selecionado ou a autenticação pessoal do Puter. Nunca envie valores de chaves ao Git.

Quando houver proxy HTTP/HTTPS, execute com Node.js 24 e `NODE_USE_ENV_PROXY=1`, preservando o proxy e o certificado CA fornecidos pelo ambiente. Acesse a aplicação pela porta definida em `PORT` (padrão 3000). Bootstrap, Marked e DOMPurify são servidos localmente; não dependem de CDN.

## Horários oficiais

`GET /api/horarios?turma=3%C2%BAC%20(DS)&dia=SEXTA`

A lista da interface usa os nomes reais do cadastro; a API também aceita variantes que identifiquem uma única turma. Dias aceitos: SEGUNDA, TERÇA, QUARTA, QUINTA, SEXTA e SEMANA. A API consulta somente `public.horario_aulatarde`, seleciona `turma, dia_semana, numero_aula, horario_inicio, professor, disciplina` e ordena por `numero_aula`. Não cria ou altera tabelas, registros ou políticas RLS. A interface diferencia carregamento, falha, resultado vazio e aulas encontradas.

Respostas: 200 com `{ turma, dia, aulas }`; 400 para filtros inválidos; 503 para configuração ausente; 502 para falha na consulta; 429 ao exceder 60 requisições/minuto por IP. Consultas têm limite de 10 segundos.

O administrador da escola deve verificar se a política RLS atual permite a leitura autorizada com a chave publishable. Uma resposta vazia também pode resultar de RLS; sozinha não comprova ausência de aulas. Não torne dados públicos sem autorização. A aplicação inicial usa leitura anônima permitida por RLS: caso os horários exijam autenticação, é necessário implementar Auth antes de disponibilizar essa consulta. Não utilize chave administrativa para contornar permissões.

## Chat e templates

O chat de programação mantém `POST /api/diagnosticar`, com `{ logErro, provider }`. Gemini, Groq e OpenRouter usam chaves exclusivamente no servidor. `GET /api/ia` informa os modelos e a presença de configuração sem revelar chaves. O Puter é uma opção explícita no navegador e usa a conta pessoal do usuário; não passa pela rota de diagnóstico. Respostas Markdown são sanitizadas com DOMPurify. Antes de usar qualquer IA, o chat consulta `POST /api/escola/perguntar`. Perguntas reconhecidas sobre aulas e localização são respondidas pelo backend escolar, sem enviar dados a modelos externos. Perguntas gerais seguem ao provedor selecionado. Não é uma pesquisa aberta na web nem uma ferramenta de SQL para IA.

As rotas existentes de templates (`GET/POST /api/templates`) continuam usando SQLite. `banco.db` é criado automaticamente e ignorado pelo Git; preserve esse arquivo quando contiver dados reais.

## Validação

```sh
npm test
```

Os testes verificam validação HTTP, normalização dos filtros, lista vazia, indisponibilidade, erros sem vazamento de detalhes e contrato da consulta Supabase (tabela, colunas, filtros e ordenação). Usam um serviço simulado, sem modificar dados remotos. Teste a integração real com uma turma conhecida após configurar as credenciais e verificar as permissões RLS. Sem essas credenciais, testes locais não comprovam o acesso ao banco escolar.

Não há build: o Express serve os arquivos de `public/` e os assets das dependências instaladas. Em produção, configure HTTPS e, se houver proxy reverso, configure a confiança em proxies conforme a infraestrutura antes de alterar a identificação por IP do limitador.

## Seleção e comparação de IA

O padrão provisório é `AI_PROVIDER=gemini` com `GEMINI_MODEL=gemini-3.5-flash-lite`. A escolha prioriza uma variante Flash para respostas curtas em português e programação; **não há vencedor medido enquanto faltarem credenciais para a comparação real**. O modelo anterior `gemini-2.5-flash` tem restrições para novos projetos na documentação atual. Todas as escolhas podem ser alteradas sem modificar o código:

| Opção | Configuração no servidor | Modelo inicial |
| --- | --- | --- |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| Groq | `GROQ_API_KEY`, `GROQ_MODEL` | `llama-3.3-70b-versatile` (acesso atual ainda não verificado) |
| OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | `openrouter/free` (roteador, modelo efetivo pode variar) |
| Puter | `PUTER_MODEL`; usuário entra na conta pelo navegador | `gpt-5.4-nano` |

Na aba Assistente Suri, selecione o provedor. Para Puter, clique em **Conectar ao Puter**, autentique-se na janela oficial e só então envie sua mensagem. O SDK oficial `https://js.puter.com/v2/` é carregado apenas ao selecionar Puter. O modelo de cobrança é por conta do usuário, sujeito a saldo, cotas e disponibilidade; não é garantia de gratuidade ilimitada. O Express continua necessário para Supabase, templates e os outros provedores. As mensagens vão para o provedor escolhido; não há troca automática para outro serviço em caso de erro.

Os endpoints corrigidos são `https://api.groq.com/openai/v1/chat/completions`, `https://openrouter.ai/api/v1/chat/completions` e `https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent`. Chaves nunca ficam na URL nem no navegador. As chamadas do backend têm timeout de 45 segundos, limite de saída e tratamento de autenticação, cota e respostas vazias. As políticas de gratuidade e o catálogo podem mudar; confira sua conta antes do uso. O teste ao vivo faz até três chamadas por provedor configurado e pode consumir sua cota/saldo.

```sh
npm test                   # testes locais, com respostas simuladas
npm run compare:ai          # chamadas reais somente aos provedores com chaves configuradas
```

O segundo comando salva `.local/ai-comparison.json` e encerra com código 2 se nenhum provedor concluiu as tarefas; ausência de chave não é sucesso. O Puter requer navegador autenticado e é registrado separadamente. Compare acerto das tarefas objetivas, clareza em português, orientação pedagógica, não invenção de horários, latência e custo. A resposta escolar exige revisão humana. Não é uma comparação de todos os modelos de cada catálogo nem uma avaliação estatística com uma única amostra. Veja [a avaliação e as limitações](docs/AVALIACAO_IA.md).

## Perguntas sobre a escola

O chat reconhece perguntas como “Onde fica a escola?”, “Quais são as aulas do 3ºC (DS) na sexta-feira?” e “Qual é a segunda aula do 3ºC (DS) na terça?”. Interpreta turma, dia e número da aula com regras controladas, sem depender de chave de IA. Se faltar turma/dia ou houver ambiguidade, pede esclarecimento. Turmas são resolvidas pelo cadastro; variantes ambíguas não são escolhidas automaticamente. As respostas são exibidas como texto, com a origem dos dados.

`POST /api/escola/perguntar` recebe `{ pergunta }` e retorna `{ handled, solucao, formato }`; quando a intenção não é escolar retorna `{ handled: false }`. Falhas no acesso a horários retornam 503 (configuração ausente) ou 502 (falha remota), sem consultar uma IA para completar dados que faltam.

`GET /api/escola` fornece o cadastro de referência. O endereço em `config/escola.json` foi informado pela responsável pelo projeto: Antônio João de Medeiros, 810, Itaim Paulista, São Paulo/SP. A resposta deixa explícito quando esse cadastro foi usado em vez da tabela `conhecimentos`.

A captura do painel Supabase confirmou `conhecimentos` com as colunas `id`, `categoria`, `titulo` e `conteudo` (sem acento). O cadastro padrão em `config/escola.json` consulta apenas `id,conteudo` do registro `id=4`, “Endereço e Contatos”. A leitura real ainda depende de chave e RLS autorizada.

Se o cadastro possuir um identificador de assunto, é possível configurar um filtro exato com:

- `CONHECIMENTOS_ASSUNTO_COLUNA`: nome real da coluna do assunto.
- `CONHECIMENTOS_RESPOSTA_COLUNA`: nome real da coluna com o endereço em texto.
- `CONHECIMENTOS_LOCALIZACAO_ASSUNTO`: valor exato que identifica o registro do endereço.

Os nomes das colunas foram confirmados na captura do painel; não há mudanças no banco. Só as colunas mapeadas são lidas, com até dois registros para detectar ambiguidade. O registro só é usado se houver exatamente um resultado com texto. Se a consulta não for possível, o endereço confirmado na configuração continua disponível com a origem explícita. Políticas RLS devem permitir somente a leitura escolar autorizada.

```sh
NODE_USE_ENV_PROXY=1 npm run check:school -- '3ºC (DS)' SEXTA
```

O comando verifica o acesso real ao Supabase, sem imprimir registros ou chaves. Salva `.local/school-connection.json`; código 2 indica configuração/mapeamento ausente ou resultado vazio que ainda precisa de verificação. Resultado vazio não comprova ausência de aulas, pois pode haver RLS. Veja [o roteiro de conferência](docs/VERIFICACAO_ESCOLA.md).
