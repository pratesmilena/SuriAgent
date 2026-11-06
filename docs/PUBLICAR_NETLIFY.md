# Publicar o SuriAgent no Netlify

## O que está preparado

- A interface é gerada em `dist` com logo, Plasma e dependências locais. O build não inclui `.env`, SQLite ou chaves de IA no JavaScript público.
- As rotas `/api/*` são encaminhadas à Function Express `netlify/functions/api.js`.
- O processo local continua em `npm start`, com SQLite para templates locais. A Function não inicializa SQLite nem tenta gravar no sistema de arquivos da hospedagem.
- Horários, endereço e conteúdos escolares continuam no Supabase. O SQL de criação das novas tabelas de conteúdo permanece uma etapa separada, não é executado no deploy.
- O catálogo/cadastro de templates de código, ainda em SQLite, retorna indisponível na hospedagem. Para disponibilizá-lo online será necessário migrar seus dados e implementar armazenamento persistente. Os dados locais não são apagados nem migrados automaticamente.

## 1. Importar o GitHub

No painel Netlify, use **Add new project → Import an existing project** (o nome pode aparecer como Add new site), escolha GitHub e autorize o repositório `pratesmilena/SuriAgent`.

Selecione a branch `main`. A configuração está em `netlify.toml`:

| Campo | Valor |
| --- | --- |
| Base directory | Raiz do repositório; deixar vazio |
| Build command | `npm run build:netlify` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Node.js de build | 24 |

Não usar `npm start` como comando de build e não publicar somente a pasta public por arrastar/soltar. O import pelo GitHub permite instalar dependências, compilar o Plasma e empacotar o backend. O download estático isolado não executa as rotas da API.

## 2. Cadastrar variáveis

Em Project configuration → Environment variables, cadastre os nomes abaixo. Os nomes dos menus podem variar. Configure-as para o deploy de produção e com escopo **Functions/Runtime**; a configuração de build pode usar o escopo All scopes quando esse for o formato do painel. Não precisa colocar valores no netlify.toml.

Obrigatórias para os dados escolares:

- `SUPABASE_URL`: `https://tjqcltzfqqeveztdumsb.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: a chave publishable do seu projeto, sem enviar pelo chat ou versionar `.env`.

Para o chat de perguntas gerais, use o serviço escolhido pela administração:

- `AI_PROVIDER`: gemini, groq ou openrouter.
- A chave correspondente: `GEMINI_API_KEY`, `GROQ_API_KEY` ou `OPENROUTER_API_KEY`.
- Opcionalmente: `GEMINI_MODEL`, `GROQ_MODEL` ou `OPENROUTER_MODEL`.

Não é necessário preencher as três chaves. Sem chave de IA, as consultas escolares continuam disponíveis e o chat geral informa indisponibilidade. Não use service_role nem sb_secret no navegador. `SUPABASE_AUTH_PUBLISHABLE_KEY` é opcional se o login precisar de uma chave pública direta distinta da usada pelo servidor; normalmente a publishable já é suficiente.

Não configure PORT, NODE_USE_ENV_PROXY ou proxies do ambiente Codex no Netlify. As Functions não usam `app.listen`; a hospedagem injeta as variáveis em tempo de execução. Alterações de variáveis podem exigir um novo deploy para entrar em vigor.

## 3. Publicar e testar

Clique em Deploy. Aguarde o build e a disponibilização da Function `api`. O painel dará uma URL pública semelhante a `https://nome-do-site.netlify.app` — esse exemplo não é o endereço já publicado do projeto.

Confira:

1. A página abre, com logotipo e gradiente Plasma (ou fundo estático quando houver movimento reduzido/ausência de WebGL).
2. O campo Turma recebe os dados do Supabase.
3. A consulta de `3ºC (DS)` em SEXTA retorna as sete aulas cadastradas.
4. No chat, “Onde fica a escola?” retorna o endereço com a fonte.
5. Os assuntos novos só terão respostas quando as tabelas forem criadas e o conteúdo revisado e publicado.

Se falhar, consulte Deploy log para build e Functions logs para a API. `GET /api/horarios/catalogo` deve retornar JSON, não uma página HTML. Não cole valores das variáveis nos logs ou em capturas. Um erro de SELECT/RLS deve ser tratado no Supabase; publicar o site não concede novas permissões ao banco.

## 4. Google login no domínio publicado

Em Supabase → Authentication → URL Configuration:

- Site URL: a URL HTTPS real do site Netlify.
- Redirect URLs: a URL exata com barra final usada pelo aplicativo; se necessário o padrão `https://SEU-SITE.netlify.app/**` apenas para seu domínio. Preserve também localhost:3000/3001 se continuar testando localmente.

O aplicativo retorna à mesma origem com `#chat-panel`, e a URL deve ser autorizada pelo Supabase. Não cadastre domínios desconhecidos nem use um curinga geral para todos os sites Netlify.

No Google Cloud, o callback continua o do Supabase:

`https://tjqcltzfqqeveztdumsb.supabase.co/auth/v1/callback`

O Google Provider precisa estar habilitado no Supabase com o Client ID/Secret apropriados. Consulte `docs/LOGIN_GOOGLE_E_INTERFACE.md`. Publicar o site não habilita automaticamente esse provedor. Se o aplicativo OAuth estiver em teste, autorize as contas de teste no Google. Client Secret fica no painel do Supabase, não no repositório ou no frontend. O login é opcional e não concede edição da base escolar.

## 5. Atualizações posteriores

Com a integração Git conectada, commits enviados para main iniciam novos builds/deploys segundo a configuração do site Netlify. Não é necessário mudar o endereço do login a cada atualização mantendo o mesmo domínio de produção. Deploy previews têm URLs diferentes; não presuma que já estejam autorizadas para OAuth ou que recebam segredos de produção.

## Validação e limites

Build estático e empacotamento da Function foram testados localmente. A Function empacotada leu sete aulas reais do Supabase e a interface foi verificada com o artefato estático. Isso não demonstra que um deploy tenha sido criado na conta Netlify; importação do repositório, variáveis e validação na URL pública são etapas do painel da responsável.

O limitador atual usa memória por instância, identificando o IP do cliente pelo header de plataforma Netlify `x-nf-client-connection-ip`. Ele não é um limitador global distribuído nem garantia de controle de gastos de IA. Os limites de tempo, consumo e gratuidade dependem do plano vigente; consulte o painel da hospedagem e do provedor de IA.

Referência oficial consultada: https://docs.netlify.com/build/frameworks/framework-setup-guides/express/
