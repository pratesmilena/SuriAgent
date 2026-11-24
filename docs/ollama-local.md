# Integração do Ollama local com o SuriAgent

Esta integração adiciona o Ollama como provedor de IA do backend existente. As consultas escolares continuam passando primeiro pelas rotas e fontes oficiais da escola; o Ollama é usado pelo chat geral quando o provedor configurado for `ollama`.

## Requisitos

- Windows, macOS ou Linux com Ollama instalado e em execução.
- Um modelo já baixado no Ollama.
- Node.js 24.x, conforme o projeto SuriAgent.

## 1. Baixar e iniciar um modelo

No terminal do computador, confira se o Ollama está disponível:

```powershell
ollama --version
```

Baixe um modelo de acordo com a memória e capacidade do computador. Exemplo:

```powershell
ollama pull llama3.2
```

Confira os modelos instalados:

```powershell
ollama list
```

O aplicativo Ollama deve permanecer aberto enquanto o SuriAgent usar o modelo. Por padrão, a API local fica em `http://127.0.0.1:11434`.

## 2. Configurar o SuriAgent

Na raiz do repositório, crie ou edite o arquivo `.env` (não publique esse arquivo). Para usar o Ollama como provedor padrão, configure:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

O nome em `OLLAMA_MODEL` deve corresponder a um modelo exibido por `ollama list`. Por exemplo, se a listagem mostrar `qwen2.5:3b`, use exatamente esse nome.

## 3. Verificar a conexão

Na pasta do projeto:

```powershell
npm install
npm run check:ollama
```

O diagnóstico consulta `/api/tags`, confirma que o serviço responde e verifica se o modelo configurado está instalado. Em seguida, inicie o SuriAgent:

```powershell
npm start
```

Abra `http://localhost:3000` no navegador. Envie uma pergunta geral no chat. As perguntas reconhecidas como consultas escolares continuam sendo tratadas pelo mecanismo escolar antes de chegar ao provedor de IA.

## Como a integração funciona

- O backend reutiliza `ai.js`, a camada de provedores já existente.
- Para Ollama, o servidor chama `POST /api/chat` e envia as mensagens de sistema e usuário.
- A resposta do modelo é normalizada para o mesmo formato usado pelos outros provedores.
- O modelo, o endereço e o provedor padrão são definidos no ambiente do servidor. Nenhuma chave de API é necessária para Ollama.
- Se o serviço não estiver ativo ou o modelo não existir, o backend retorna uma mensagem orientativa, sem expor detalhes internos.

## Importante sobre publicação na internet

O endereço `127.0.0.1` sempre aponta para a própria máquina que executa o backend. Se o site estiver publicado no Netlify e o backend estiver hospedado em outro servidor, esse servidor não conseguirá acessar o Ollama instalado no computador do estudante. Para usar o Ollama local, execute também o backend do SuriAgent nesse computador e abra o site servido por ele em `http://localhost:3000`.

Não exponha a porta 11434 diretamente à internet. Para acesso remoto seria necessário hospedar o modelo em infraestrutura própria e protegida, com autenticação e controles de rede.

## Testes

Os testes automatizados em `test/ai.test.js` simulam a API do Ollama e verificam o formato da requisição, a resposta, a ausência de chave, a URL inválida e os erros de conexão/modelo ausente. Eles não substituem o teste real no computador com o Ollama instalado e o modelo baixado.
