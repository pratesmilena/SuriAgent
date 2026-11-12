# SuriAgent

Assistente virtual voltado ao **período da tarde** da Escola Estadual República do Suriname, com consulta de informações escolares e horários no Supabase, chat e login opcional com Google.

**Site:** [suriagent.netlify.app](https://suriagent.netlify.app)

## Funcionalidades

- Consulta de aulas por turma e dia, de segunda a sexta-feira, ou pela semana completa. As turmas são carregadas do Supabase.
- Chat com perguntas sobre horários, localização, história, cursos, projetos, ambiente escolar, eventos, espaços, perguntas frequentes, professores e disciplinas.
- Respostas escolares obtidas pela API do projeto. Perguntas diretas usam o banco; pedidos explícitos de resumo, explicação ou comparação podem usar o Gemini para selecionar trechos relevantes dos conteúdos autorizados. Sem chave, dados relevantes ou disponibilidade do serviço, permanece a resposta direta.
- Exibição do campo `conteudo` da base `conhecimentos`, preservando listas, parágrafos e quebras de linha, sem acrescentar títulos, perguntas duplicadas ou fontes visíveis.
- Consulta de eletivas pelos vínculos docentes e pela disciplina `ELETIVA` da grade, com professores e turmas. Os temas das eletivas não são inferidos quando ausentes do cadastro.
- Perguntas frequentes com oito sugestões úteis e atalhos para consultar o chat. São sugestões editoriais, sem ranking de uso ou coleta de conversas.
- Busca de perguntas escolares não reconhecidas por termos do título, conteúdo e palavras-chave, sem listar uma FAQ genérica.
- Consulta de professores e disciplinas combinando o cadastro docente publicado e a grade da tarde, com reconhecimento de Ale/Alessandra nas pesquisas.
- Chat geral com integração a Gemini, Groq ou OpenRouter, conforme configuração no servidor. A interface não oferece seleção de provedor ou modelo.
- Login Google pelo Supabase Auth, com opção de continuar como visitante. As consultas escolares estão disponíveis nos dois modos.
- Janela **Meu perfil** com nome, e-mail e botão de saída; boas-vindas temporárias após o login.
- Interface responsiva em verde e roxo, menu lateral retrátil, navegação por seções e gradiente animado Plasma.

O chat mantém a conversa na página; não grava histórico permanente. O login não concede edição do banco nem permissões administrativas.

## Tecnologias

| Camada | Implementação |
| --- | --- |
| Interface | HTML, CSS, JavaScript, Bootstrap 5 |
| Gradiente | React, componente AnimatedGradient do Spell UI e esbuild |
| API | Node.js 24 e Express 5 |
| Dados escolares e autenticação | Supabase, PostgreSQL e Supabase Auth |
| Publicação | Netlify, arquivos estáticos e Netlify Functions |
| Templates locais | SQLite |
| Testes | Node.js Test Runner e PGlite |

Marked e DOMPurify são usados para renderizar e sanitizar as respostas Markdown do chat geral. As respostas escolares são exibidas como texto. Os arquivos de Bootstrap, Marked e DOMPurify são servidos junto da aplicação.

## Executar localmente

Requisitos: **Node.js 24**, npm e acesso ao projeto Supabase configurado.

```sh
npm ci
```

Crie `.env` a partir de `.env.example`, caso ainda não exista. Preencha as variáveis necessárias e inicie:

```sh
npm start
```

Abra **http://localhost:3000**. A porta pode ser alterada com `PORT`. O comando de início compila o componente visual automaticamente.

No PowerShell, caso a política de scripts bloqueie `npm.ps1`, use:

```powershell
npm.cmd ci
npm.cmd start
```

Para atualizar uma instalação existente, obtenha as alterações do Git e reinstale as dependências quando o arquivo de dependências mudar. Preserve seu `.env` e o banco local.

## Configuração

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública para as consultas escolares |
| `SUPABASE_AUTH_PUBLISHABLE_KEY` | Chave pública específica do login, quando configurada separadamente |
| `AI_PROVIDER` | Serviço do chat geral: `gemini`, `groq` ou `openrouter` |
| `SURI_GEMINI` (ou `GEMINI_API_KEY`), `GROQ_API_KEY`, `OPENROUTER_API_KEY` | Chave do serviço escolhido, usada no servidor |
| `GEMINI_MODEL`, `GROQ_MODEL`, `OPENROUTER_MODEL` | Modelo do serviço escolhido |
| `PORT` | Porta local, padrão `3000` |

As consultas escolares não exigem chave de IA. O chat geral depende de credencial válida, acesso ao modelo e disponibilidade do serviço configurado. A aplicação não escolhe automaticamente o melhor modelo.

Não versione `.env`, chaves secretas ou bancos locais. Não use `service_role` nem `sb_secret_...` como chave pública. As permissões de leitura são controladas por grants e RLS no Supabase; o login Google também depende da configuração de OAuth e URLs de redirecionamento no painel do serviço.

## Dados escolares

| Tabela | Finalidade |
| --- | --- |
| `public.conhecimentos` | Informações escolares: `id`, `categoria`, `titulo`, `conteudo`, `palavras_chave` e publicação controlada por `suri_publicado`/RLS |
| `public.horario_aulatarde` | Turma, dia, número da aula, início, professor e disciplina |
| `public.escola_professor_disciplinas` | Vínculos docentes, etapa, confirmação e publicação |

O backend também mantém compatibilidade com `escola_conteudos` e `escola_eventos`. Quando essas tabelas não existem ou não fornecem resultados para o assunto, consulta a base existente `conhecimentos`. Elas não são requisito para usar essa base.

Os arquivos de `config/` contêm o endereço de referência, a oferta de cursos informada pela escola e o histórico conferido nos decretos. Os registros disponíveis no Supabase têm tratamento próprio; os arquivos não são uma cópia sincronizada de todo o banco.

Alterações nos horários do Supabase são lidas a cada consulta; não exigem novo deploy nem `git pull`. A grade integrada é a da tarde. A aplicação não infere horários da manhã, datas de eventos ou atribuições docentes ausentes do cadastro.

Os scripts em `docs/sql/` são executados manualmente pelo administrador. Não há execução automática de migrações na inicialização ou no deploy. Confira a finalidade de cada script antes de aplicá-lo a um banco existente.

## API

| Método e rota | Finalidade |
| --- | --- |
| `GET /api/horarios/catalogo` | Turmas e dias disponíveis |
| `GET /api/horarios?turma=...&dia=...` | Aulas da turma; aceita dias de segunda a sexta ou `SEMANA` |
| `POST /api/escola/perguntar` | Pergunta escolar no corpo `{ "pergunta": "..." }` |
| `GET /api/escola/perguntas-frequentes` | Sugestões editoriais de perguntas |
| `GET /api/escola/conteudos/:topico` | Registros por assunto |
| `GET /api/escola` | Cadastro de referência da escola |
| `GET /api/auth/config` | Configuração pública necessária ao login |
| `POST /api/diagnosticar` | Chat geral no corpo `{ "logErro": "..." }` |
| `GET /api/status` | Estado da configuração e revisão do deploy, sem valores secretos |
| `GET /api/templates`, `POST /api/templates` | Templates de código na execução local com SQLite |

A API possui validação de entradas, limites de tempo e limite de requisições. A consulta escolar diferencia configuração ausente, falha de acesso e resultado vazio. Os templates SQLite ficam indisponíveis na publicação Netlify; o banco local não é compartilhado com a hospedagem.

## Testes e verificações

```sh
npm test
npm run build:netlify
npm run check:school
npm run check:contents
npm run check:gemini  # uma chamada real ao Gemini, se a chave estiver configurada
```

A suíte atual contém **112 testes**: contratos HTTP, interpretação das perguntas, consultas Supabase, apresentação das respostas, autenticação, configuração, publicação Netlify e scripts SQL executados em PostgreSQL local por PGlite.

As verificações de integração usam as credenciais do ambiente e apenas leem dados. `check:school` verifica uma turma/dia e o endereço; `check:contents` verifica os assuntos da base. Relatórios locais ficam em `.local/`, fora do Git.

Também foram verificados com o Supabase real os 385 horários das 11 turmas e, após a correção de apresentação, as perguntas sobre eventos, projetos, localização e etapas de ensino. Os testes de provedores de IA usam respostas simuladas; não comprovam disponibilidade ou qualidade dos modelos em uma conta específica.

## Publicação no Netlify

O repositório inclui `netlify.toml` com:

- Build: `npm run build:netlify`.
- Diretório publicado: `dist`.
- Functions: `netlify/functions`.
- API Express empacotada como Function, com consultas sem armazenamento em cache.

As variáveis precisam estar configuradas no Netlify para a execução das Functions. Alterações enviadas à branch conectada são publicadas conforme a configuração de deploy da conta. Configurações OAuth, permissões e conteúdos do Supabase são externos ao GitHub.

## Organização

```text
public/             Interface, navegação, chat e login
ui/                 Componente do gradiente animado
config/             Informações de referência da escola
netlify/functions/  Entrada da API na hospedagem
scripts/            Compilação e verificações
test/              Testes automatizados
dados/              Cadastro estruturado de professores
docs/               Guias, SQL e modelos de importação
```

Os módulos da API, consultas e configuração ficam na raiz. `dist/`, `public/generated/`, `.env`, `.local/`, `node_modules/` e `banco.db` não são versionados.

## Documentação

- [Perguntas frequentes e análise de acompanhamento](docs/PERGUNTAS_FREQUENTES.md)
- [Gemini com a base escolar](docs/GEMINI_E_SUPABASE.md)
- [Publicação no Netlify](docs/PUBLICAR_NETLIFY.md)
- [Login Google e interface](docs/LOGIN_GOOGLE_E_INTERFACE.md)
- [Base existente conhecimentos](docs/CORRIGIR_BASE_CONHECIMENTOS.md)
- [Professores e disciplinas](docs/PROFESSORES_E_TABELAS.md)
- [Verificação das consultas escolares](docs/VERIFICACAO_ESCOLA.md)

## Licença e componentes

O pacote declara licença ISC. Bootstrap, React, Supabase e os demais componentes seguem suas próprias licenças. O gradiente utiliza o componente AnimatedGradient do Spell UI; as referências e os avisos presentes nos componentes devem ser preservados.

## Escopo do período da tarde

Consultas de professores e eletivas usam os vínculos da grade da tarde. Textos gerais que misturam turnos não são apresentados como se fossem exclusivos da tarde: a descrição de horários é limitada ao trecho confirmado da tarde e os totais de matrículas do censo não são atribuídos a esse turno. História e endereço continuam disponíveis como informações gerais. A oferta confirmada para a tarde inclui Ensino Médio e Técnico em Desenvolvimento de Sistemas; outras ofertas não são presumidas para esse período. Perguntas sobre manhã ou período matutino, inclusive comparações com a tarde, recebem um aviso de informação ainda não disponível, sem consultar o banco ou o Gemini. Nenhum registro da manhã foi excluído do banco.

Se o site apresentar uma resposta antiga após uma atualização, confira o deploy de produção no Netlify e a branch conectada (`main`). Execute um novo deploy da versão mais recente e confira `GET /api/status`: o campo `revisao` identifica o commit incluído no build. Atualizar o navegador não substitui um deploy da API.
