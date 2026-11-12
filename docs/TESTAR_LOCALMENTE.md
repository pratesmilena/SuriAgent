# Testar no computador com VS Code

As variáveis cadastradas no Netlify pertencem àquela hospedagem. Elas não são copiadas para o computador, para este ambiente de desenvolvimento nem para outro provedor.

## 1. Obter a versão atual

Abra a pasta do projeto no VS Code e o terminal PowerShell. No computador usado anteriormente, a pasta era `C:\Users\andra\SuriAgent`:

```powershell
cd C:\Users\andra\SuriAgent
git pull --ff-only origin main
```

Se o Git informar divergência ou alterações que impedem a atualização, pare e confira o erro antes de instalar/iniciar. Não use `reset --hard` para apagar seu trabalho. Se a pasta estiver em outro local, use o caminho real.

## 2. Instalar e preparar o ambiente

Requer Node.js 24. Usar `npm.cmd` no PowerShell evita o bloqueio de execução de `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run setup:local
```

`setup:local` cria `.env` na raiz, ao lado de `package.json`, somente se o arquivo ainda não existir. O `.env` existente é preservado. Abra o arquivo no VS Code e preencha os valores reais:

```dotenv
PORT=3000
SUPABASE_URL=https://tjqcltzfqqeveztdumsb.supabase.co
SUPABASE_PUBLISHABLE_KEY=COLE_A_CHAVE_PUBLICAVEL_DO_SUPABASE
SURI_GEMINI=COLE_A_SUA_CHAVE_GEMINI
AI_PROVIDER=gemini
```

Substitua os dois valores começando com COLE pelas chaves corretas. Se seu `.env` já contém a conexão Supabase funcionando, mantenha-a e acrescente somente o que falta. `GEMINI_API_KEY` também é aceito, mas `SURI_GEMINI` tem prioridade quando os dois existem.

Se você configurou `GEMINI_MODEL` no Netlify, copie o mesmo identificador para o `.env`. Caso não tenha configurado, o código utiliza seu padrão; confirme que o modelo está disponível na conta e admite JSON e Google Search para testar todos os recursos. O teste real detecta falta de acesso ou cota; preencher uma chave não comprova que o modelo esteja habilitado.

Não coloque a chave em HTML, JavaScript público, tabelas de conhecimentos, GitHub ou mensagens do chat. Não use chave `service_role`/`sb_secret_...` como chave publicável do Supabase. Não é preciso colocar o segredo do cliente OAuth Google no `.env`: a autenticação é gerenciada pelo Supabase.

## 3. Verificar antes de abrir o site

```powershell
npm.cmd run check:local
npm.cmd test
npm.cmd run check:school
npm.cmd run check:gemini
```

- `check:local`: verifica preenchimento, Node e formato da configuração sem imprimir valores. `prontaParaTestar: true` ainda não comprova acesso aos serviços.
- `npm test`: verifica o código com testes automatizados e serviços simulados.
- `check:school`: verifica leitura real de horários e endereço.
- `check:gemini`: faz uma chamada real ao Gemini, sem exibir a chave.

Para testar a interpretação e a pesquisa externa:

```powershell
npm.cmd run check:school-ai
npm.cmd run check:school-ai -- --web
```

Cada comando faz chamadas reais e pode consumir cota do Google. Execute um por vez; se houver limite de uso, aguarde a renovação da cota. `--web` acrescenta uma pesquisa Google. Código 2 indica chave ausente, e código 1 indica resultado não confirmado ou falha. Não trate o resultado como sucesso até esses testes passarem na sua conta.

## 4. Iniciar a aplicação

```powershell
npm.cmd start
```

Mantenha o terminal aberto e acesse **http://localhost:3000** no navegador desse mesmo computador. O início compila o Plasma automaticamente. Alterou `.env`? Pare com Ctrl+C e inicie novamente. Não é necessário deploy ou crédito do Netlify para executar localmente.

O endereço localhost deste ambiente de nuvem não é o localhost do seu computador. Não é possível abrir essa aplicação no celular usando o localhost do computador sem configurar acesso de rede; o arquivo de prévia offline anterior também não substitui o backend real.

## 5. Login Google local

No Supabase, em Authentication → URL Configuration → Redirect URLs, autorize:

```text
http://localhost:3000/**
```

Mantenha o provedor Google habilitado. O callback configurado no Google continua sendo o do Supabase (`https://tjqcltzfqqeveztdumsb.supabase.co/auth/v1/callback`), não localhost. O login pode redirecionar incorretamente se localhost não estiver autorizado. Não é necessário trocar a Site URL pública por localhost para adicionar esse endereço permitido.

## Conferência funcional

- Horários: selecione uma turma da tarde e consulte um dia/semana.
- Gestores: “Quem são os gestores da escola?” → Elaine, Paulo e Rita, conforme o registro publicado.
- Eletivas: consulte os professores e turmas cadastrados, sem inventar nomes dos temas.
- Interpretação: “Quem toma conta desse colégio?” e “O que rola no terceirão C quando sextar?”.
- Manhã: deve indicar que a informação ainda não está disponível.
- FAQ: devem aparecer oito sugestões; os atalhos abrem a pergunta no chat.
- Login: confira o perfil, a saída e o acesso como visitante.
- Pesquisa externa: somente quando o dado faltar, confira indicação de pesquisa no Google e as fontes.

Não existe garantia de 100% de compreensão nem disponibilidade permanente de serviços externos. Finalize a validação com dados reais e com a conta Google configurada antes de disponibilizar a aplicação.
