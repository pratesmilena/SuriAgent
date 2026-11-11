# Gemini com os conteúdos escolares

A integração existente usa HTML/CSS/JavaScript no navegador e Node.js/Express no servidor. No Netlify, a mesma API roda como Function. Não foi criado um segundo backend nem alterado o banco.

## Fluxo implementado

1. O navegador envia `{ pergunta }` a `/api/escola/perguntar`.
2. O backend identifica o assunto e consulta as tabelas existentes com as permissões do Supabase.
3. Perguntas diretas, horários, professores e localização continuam usando as respostas atuais. Títulos/fontes não são acrescentados aos textos de conhecimentos.
4. Pedidos explícitos como “Resuma os projetos da escola” ou “Compare os projetos e eventos da escola” podem usar Gemini quando todos os tópicos consultados têm registros acessíveis em `conhecimentos`.
5. O servidor separa os conteúdos em parágrafos e envia somente os trechos recuperados e a pergunta, sem credenciais, dados do perfil Google ou acesso SQL.
6. Gemini retorna índices dos trechos relevantes. O servidor valida todos os índices e monta a resposta com os textos originais, sem permitir frases livres do modelo. Trata-se de síntese extrativa: seleciona/ordena parágrafos, sem inferências ou redação de fatos novos.
7. Falta de chave, cota, timeout de oito segundos ou resposta inválida preservam a resposta direta do banco. Conteúdo ausente não é completado por conhecimento externo.

Essa busca usa as categorias e regras já implementadas; não é busca vetorial nem compreensão irrestrita de qualquer pergunta. Documentos e pergunta são tratados como dados, não comandos. A seleção pelo modelo pode ser imperfeita, mas não pode introduzir texto fora dos trechos fornecidos. A consulta ao banco continua protegida por RLS e grants.

## Configurar a conta

1. Acesse https://aistudio.google.com/apikey com sua própria conta Google e crie uma chave vinculada a um projeto elegível.
2. Localmente, salve `SURI_GEMINI` (ou o nome anterior `GEMINI_API_KEY`) em `.env`, já ignorado pelo Git. No ambiente em nuvem, use as configurações seguras de variáveis/segredos.
3. Configure `GEMINI_MODEL` com um modelo de geração de texto disponível nessa conta. O valor de exemplo do repositório não comprova acesso ao modelo: confirme no AI Studio.
4. No Netlify, configure `SURI_GEMINI` (ou o nome anterior `GEMINI_API_KEY`) e `GEMINI_MODEL` para a execução das Functions, no contexto de produção, e faça um novo deploy. O `.env` local não é transferido ao Netlify.
5. `AI_PROVIDER=gemini` escolhe Gemini para o chat geral; a síntese escolar usa Gemini especificamente. Outros serviços do chat geral continuam disponíveis.

Não envie chaves no chat, em conhecimentos, em capturas de tela nem no GitHub. A chave publicável do Supabase é uma credencial distinta da chave secreta Gemini. Não é necessário criar tabelas ou alterar políticas para ativar este recurso.

## Verificar

```sh
npm test
npm run build:netlify
npm run check:school
npm run check:gemini
```

`check:gemini` faz uma chamada real e informa apenas status, modelo e presença de texto. Código 2 significa chave ausente; código 1 indica falha de chave, modelo, rede ou cota. Não imprime chave nem a resposta do provedor. A chamada pode consumir a cota da conta. A camada gratuita possui limites e depende do modelo/projeto; não há promessa de uso ilimitado ou de ausência de cobrança em contas com faturamento habilitado.

Teste também “Resuma os projetos da escola”, “Quais projetos são desenvolvidos na escola?”, “Onde fica a escola?” e uma consulta de turma/dia. As três últimas mantêm a resposta direta existente. Mesmo com uma chave válida, não é possível garantir ausência de falhas de serviços externos.

O nome alternativo não altera a sensibilidade do valor nem as regras da hospedagem. Se ambos estiverem preenchidos, `SURI_GEMINI` tem prioridade. O valor continua sendo usado exclusivamente no servidor. Se o painel exigir marcação de segredo, mantenha essa proteção; não há garantia de que a troca de nome elimine a restrição.

## Eletivas e perguntas não reconhecidas

“Quais eletiva tem na escola?” e “Tem disciplinas optativas?” são direcionadas ao cadastro de professores/disciplinas e à grade da tarde. A disciplina ELETIVA retorna os professores e as turmas correspondentes, agrupando aulas repetidas. A base atual não informa os nomes dos temas dessas eletivas: o agente não os inventa nem equipara clubes juvenis ou itinerários às eletivas.

Perguntas escolares sem um tópico reconhecido consultam termos específicos do título, categoria, palavras-chave e conteúdo de conhecimentos. Termos genéricos como escola são descartados. O Gemini pode selecionar trechos dentre os registros encontrados, mesmo quando a pergunta não contém “resuma”. Nenhum registro relevante significa resposta de informação não encontrada, sem recorrer à lista inteira de FAQ. A busca é textual, não vetorial; sinônimos não cadastrados ainda podem precisar de palavras-chave melhores.
