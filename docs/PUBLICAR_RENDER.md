# Publicação de testes no Render Free

## Escolha e limites conferidos

O Render executa o servidor Node.js/Express existente, com interface e API no mesmo domínio. O repositório inclui `render.yaml` com plano `free`; não cria banco de dados Render e mantém o Supabase existente. Essa opção é adequada para o protótipo e a apresentação acadêmica.

Segundo a documentação consultada em 11/11/2026:

- O serviço Free suspende após 15 minutos sem tráfego e pode levar cerca de um minuto para iniciar na próxima visita.
- O workspace recebe 750 horas de instância gratuita por mês, compartilhadas entre os serviços gratuitos.
- Há limites de tráfego e minutos de build. Excedê-los pode suspender o serviço/builds; com faturamento habilitado, podem existir cobranças suplementares conforme o plano e os limites de gasto.
- O disco é efêmero e os serviços gratuitos não possuem disco persistente. Por isso, o modo Render não habilita os templates SQLite locais; todas as funções escolares continuam usando Supabase.
- O próprio Render não recomenda instâncias Free para aplicações de produção que precisam de disponibilidade garantida. Não é uma promessa de hospedagem ilimitada ou gratuita para qualquer volume de uso.

Referências oficiais: https://render.com/docs/free e https://render.com/docs/deploy-node-express-app. Vercel Hobby também foi avaliado (https://vercel.com/docs/plans/hobby), mas tem condições de uso pessoal/não comercial e requer adaptação de publicação; a opção preparada nesta entrega é Render.

## Pré-requisito

Conclua [os testes locais](TESTAR_LOCALMENTE.md), incluindo as chamadas reais ao Gemini e Google Search na sua conta. Criar e conectar a conta Render/GitHub exige sua própria autenticação; nenhum serviço remoto foi criado pelo assistente.

## Publicar quando estiver pronto

1. Entre em https://dashboard.render.com com sua conta.
2. Escolha **New → Blueprint**, conecte o repositório `pratesmilena/SuriAgent` e a branch `main`. O arquivo `render.yaml` define o serviço.
3. Confira que o plano selecionado é **Free**. Não habilite um plano pago para seguir este roteiro. Verifique no painel eventuais requisitos de verificação/faturamento da sua conta.
4. Preencha as variáveis solicitadas: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SURI_GEMINI`. Os valores não ficam no YAML nem no GitHub. `AI_PROVIDER=gemini` já está definido.
5. Em Environment, configure também `GEMINI_MODEL` se você usava um modelo específico no Netlify ou se o padrão não estiver disponível/compatível com Google Search. Não copie o arquivo `.env` para o GitHub.
6. Crie o serviço e aguarde o build/deploy. Use o domínio `.onrender.com` efetivamente informado no painel, sem presumir que um nome específico esteja disponível.

### Alternativa manual

Em **New → Web Service**, use:

| Campo | Valor |
| --- | --- |
| Repositório | `pratesmilena/SuriAgent` |
| Branch | `main` |
| Root directory | Deixe vazio: o servidor web está na raiz, não em `mobile/` |
| Language/runtime | Node |
| Instance type | Free |
| Build command | `npm ci && npm run build:render` |
| Start command | `npm run start:render` |
| Health check path | `/healthz` |

Cadastre as mesmas variáveis em Environment. O Node 24 está indicado em `.node-version` e `package.json`. O servidor lê a porta fornecida pelo Render e escuta em `0.0.0.0`.

## Ajustar o login Google

No Supabase → Authentication → URL Configuration:

- Troque Site URL para o domínio público real do serviço novo quando ele se tornar o endereço principal.
- Acrescente o novo domínio às Redirect URLs, com `/**` ao final.
- Mantenha `http://localhost:3000/**` para os testes locais.

O callback autorizado no Google continua sendo `https://tjqcltzfqqeveztdumsb.supabase.co/auth/v1/callback`. A migração de hospedagem não muda o projeto Supabase nem exige recriar tabelas, usuários, RLS ou chaves.

## Conferir a publicação

- Abra `/healthz`: deve retornar `{"status":"ok"}` sem chamar os serviços externos.
- Abra `/api/status`: `ambiente` deve ser `render`; `revisao` deve corresponder ao commit publicado.
- Teste horários, gestores, eletivas, FAQ, perfil/saída e a mensagem de indisponibilidade da manhã.
- Teste uma pergunta reescrita e, quando faltar informação, a pesquisa Google com fontes.
- Após configurar a nova URL, confira o fluxo completo de login Google.

Alterações futuras na branch conectada podem disparar novos builds conforme a configuração do Render. Esses builds também possuem limites. Atualizações de registros do Supabase continuam sendo lidas nas consultas, sem precisar publicar código novamente.

## O que mudou no servidor

`server.js` identifica `RENDER=true` e inicializa o modo Render. `createApp` serve interface, assets e API nesse modo. O proxy é configurado para confiar em um salto da plataforma. O SQLite não é inicializado no Render, mantendo sua funcionalidade exclusivamente local. O build gera a identificação de versão, usando `RENDER_GIT_COMMIT` quando disponível.

Nenhuma configuração de Netlify foi removida. Ela continua no histórico/projeto, mas não é usada para publicar o serviço Render. As cotas do Google e do Supabase continuam independentes da hospedagem escolhida.
