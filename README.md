# AgenteSuri

Assistente estudantil da Escola Estadual República do Suriname. Interface responsiva com Bootstrap 5, em verde e roxo, consulta de horários oficiais via Supabase e chat de suporte técnico via Gemini.

## Desenvolvimento

Requer Node.js 24 e npm. No diretório do projeto:

```sh
npm ci
cp .env.example .env  # somente se .env ainda não existir
npm start
```

Configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no servidor. Use a chave publishable do projeto; não use `service_role` ou `sb_secret_...`. Em ambiente gerenciado, prefira as configurações seguras do ambiente a arquivos locais. A chave Gemini é opcional para a consulta de horários, mas necessária para o chat. Nunca envie valores de chaves ao Git.

Quando houver proxy HTTP/HTTPS, execute com Node.js 24 e `NODE_USE_ENV_PROXY=1`, preservando o proxy e o certificado CA fornecidos pelo ambiente. Acesse a aplicação pela porta definida em `PORT` (padrão 3000). Bootstrap, Marked e DOMPurify são servidos localmente; não dependem de CDN.

## Horários oficiais

`GET /api/horarios?turma=3%C2%BAC%20(DS)&dia=SEXTA`

A turma deve corresponder exatamente ao cadastro. Dias aceitos: SEGUNDA, TERÇA, QUARTA, QUINTA e SEXTA. A API consulta somente `public.horario_aulatarde`, seleciona `turma, dia_semana, numero_aula, horario_inicio, professor, disciplina` e ordena por `numero_aula`. Não cria ou altera tabelas, registros ou políticas RLS. A interface diferencia carregamento, falha, resultado vazio e aulas encontradas.

Respostas: 200 com `{ turma, dia, aulas }`; 400 para filtros inválidos; 503 para configuração ausente; 502 para falha na consulta; 429 ao exceder 60 requisições/minuto por IP. Consultas têm limite de 10 segundos.

O administrador da escola deve verificar se a política RLS atual permite a leitura autorizada com a chave publishable. Uma resposta vazia também pode resultar de RLS; sozinha não comprova ausência de aulas. Não torne dados públicos sem autorização. A aplicação inicial usa leitura anônima permitida por RLS: caso os horários exijam autenticação, é necessário implementar Auth antes de disponibilizar essa consulta. Não utilize chave administrativa para contornar permissões.

## Chat e templates

O chat de programação mantém `POST /api/diagnosticar` e exige `GEMINI_API_KEY`. Respostas Markdown são sanitizadas com DOMPurify. Este chat ainda não consulta horários: a interface direciona à aba de consulta oficial. Chamadas de ferramentas pela IA, login e histórico ficam para uma próxima etapa, conforme o guia.

As rotas existentes de templates (`GET/POST /api/templates`) continuam usando SQLite. `banco.db` é criado automaticamente e ignorado pelo Git; preserve esse arquivo quando contiver dados reais.

## Validação

```sh
npm test
```

Os testes verificam validação HTTP, normalização dos filtros, lista vazia, indisponibilidade, erros sem vazamento de detalhes e contrato da consulta Supabase (tabela, colunas, filtros e ordenação). Usam um serviço simulado, sem modificar dados remotos. Teste a integração real com uma turma conhecida após configurar as credenciais e verificar as permissões RLS. Sem essas credenciais, testes locais não comprovam o acesso ao banco escolar.

Não há build: o Express serve os arquivos de `public/` e os assets das dependências instaladas. Em produção, configure HTTPS e, se houver proxy reverso, configure a confiança em proxies conforme a infraestrutura antes de alterar a identificação por IP do limitador.
