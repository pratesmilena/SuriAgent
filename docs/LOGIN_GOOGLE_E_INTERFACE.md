# Interface e login opcional do SuriAgent

## Interface

A interface usa o logotipo fornecido pela responsável, índice de links e menu lateral com Horários de aula, Assistente Suri, Nossa escola e Como usar. O menu pode ser recolhido no desktop; no celular e tablet abre em tela inteira por botão ou gesto a partir da borda esquerda, fecha ao escolher uma seção, com Escape ou gesto para a esquerda. O índice atualiza o fragmento da URL e permite abrir seções diretamente.

O destaque mantém o gradiente e o título, sem a estrela decorativa, a legenda junto dela ou o índice “01 / ESCOLA EM MOVIMENTO”. A estrutura de horários no desktop foi preservada.

O gradiente é o componente Animated Gradient do registro oficial Spell UI, preset **Plasma** roxo. A fonte está em `ui/spell-ui/animated-gradient.tsx`; o registro oficial foi localizado pelo namespace @spell em `https://ui.shadcn.com/r/registries.json`, que aponta para `https://spell.sh/r/animated-gradient.json`. O componente foi adaptado apenas para o tema escuro fixo, removendo a dependência de next-themes. O pequeno ponto React não migra o restante do aplicativo: Express e Bootstrap continuam sendo usados.

`ui/gradient.tsx` aplica o preset Plasma com velocidade reduzida. O componente deixa de ser montado quando sai da tela, a página fica oculta ou o usuário prefere movimento reduzido. Sem WebGL ou JavaScript, o CSS mantém um fundo roxo estático. Não há flashes nem conteúdo essencial no canvas. O bundle local é gerado por `npm run build:ui`; `npm start` executa essa compilação automaticamente via prestart. Após baixar a versão, executar `npm ci` ou `npm.cmd ci` no PowerShell para obter React, React DOM e esbuild.

O Refero foi consultado como referência de organização visual, sem copiar telas ou assets. A página pública `https://refero.design` estava acessível. O endereço tentado para Inspora (`https://inspora.com`) retornou 403; não se afirma integração com essa biblioteca. O nome/link exato de Inspora ainda pode ser fornecido para outra revisão. A tentativa inicial em spellui.com retornou 403; o registro oficial spell.sh foi acessado com sucesso após a responsável fornecer o nome do componente.

## Visitante e conta

A entrada é opcional: consultas de horários, perguntas escolares e acesso aos provedores disponíveis continuam funcionando sem login. O login Google identifica a conta e mostra o estado da sessão; não habilita operações administrativas nem implementa histórico ou sincronização de conversas. Chaves de IA continuam no servidor. Não há seletor de modelo nem conexão Puter no site. O serviço de IA é definido pela administração no servidor; entrar com Google não altera essa escolha.

O navegador usa o SDK Supabase instalado, servido localmente, e OAuth com PKCE. O retorno é a origem atual da aplicação com `#chat-panel`. A sessão é persistida pelo SDK; ao restaurar, getUser confirma a identidade com o serviço. Sair encerra a sessão neste dispositivo. Nome e e-mail são inseridos como texto, sem HTML.

`GET /api/auth/config` fornece somente URL e chave publicável. Nunca fornece chave administrativa ou chave de IA. Quando a variável do ambiente for um placeholder de proxy, configure `SUPABASE_AUTH_PUBLISHABLE_KEY` com a chave pública direta nas variáveis do ambiente; ela é pública por definição e será enviada ao navegador. Não use service_role ou sb_secret. A mesma chave publishable pode ser usada pelo backend e pelo cliente Auth, respeitando RLS.

## Ativar o Google no Supabase (etapa administrativa pendente)

A consulta real a `/auth/v1/settings` confirmou `external.google=false`. O aplicativo detecta esse estado, informa que o Google ainda não foi habilitado e mantém o botão de visitante disponível. O assistente não possui acesso administrativo para habilitar o provedor.

1. No Google Cloud Console, configure a tela de consentimento OAuth do projeto e crie um cliente OAuth do tipo aplicação Web. Se o aplicativo estiver em testes, inclua as contas que poderão testá-lo conforme as regras do Google.
2. Em URIs de redirecionamento autorizados desse cliente, coloque exatamente `https://tjqcltzfqqeveztdumsb.supabase.co/auth/v1/callback` (ou o callback que o painel Supabase indicar).
3. No Supabase, abra Authentication → Sign In / Providers → Google, habilite o provedor e cadastre Client ID e Client Secret do Google. O Client Secret fica somente no painel Supabase, nunca no navegador, GitHub ou chat.
4. Em Authentication → URL Configuration, ajuste Site URL para a URL real do aplicativo. Para desenvolvimento local, use `http://localhost:3000`. Em Redirect URLs, autorize `http://localhost:3000/**` e, se utilizar a porta alternativa, `http://localhost:3001/**`. Em produção, cadastre somente as URLs necessárias do domínio HTTPS real.
5. Salve, reinicie o aplicativo se alterou suas variáveis e recarregue a página. O botão Google ficará disponível quando o serviço informar o provedor habilitado.
6. Abra Entrar → Continuar com Google, conclua a autorização e confirme o retorno à aplicação, o nome da conta e o botão Sair. Saia e confira que a consulta de aulas continua funcionando como visitante.

## Validação

49 testes automatizados locais passaram, incluindo as verificações de chave pública, rejeição de credenciais administrativas, detecção do provedor Google e falha do serviço. No Chromium, foram verificados Plasma em WebGL, modo de movimento reduzido, menu desktop/móvel, atalhos de navegação, Escape, consulta de aulas reais sem login e o aviso real de Google desabilitado. O fluxo de login, verificação de sessão e logout foi exercitado com SDK simulado; não houve autenticação real com uma conta Google. A confirmação ponta a ponta do OAuth depende da configuração administrativa acima e do próprio usuário autorizar sua conta.
