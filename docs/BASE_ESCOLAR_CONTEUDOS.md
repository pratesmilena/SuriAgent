# Base de informações escolares: auditoria e preenchimento

## O que falta nos oito tópicos

| Tópico | Situação encontrada | Onde cadastrar |
| --- | --- | --- |
| História da escola | Não havia consulta por assunto no agente. Não foi possível auditar os textos antigos: só o id 4 de conhecimentos está visível para a chave atual. | escola_conteudos, categoria historia |
| Cursos oferecidos | O nome DS nas turmas não comprova a descrição ou todas as ofertas de cursos. Faltava consulta própria. | escola_conteudos, categoria cursos |
| Projetos desenvolvidos | Não havia consulta própria; dados atuais não confirmados. | escola_conteudos, categoria projetos |
| Ambiente escolar | A captura antiga de conhecimentos indicava “Estrutura e Recursos”, mas esse registro não está acessível à chave atual. | escola_conteudos, categoria ambiente |
| Horários | Já integrado: 385 aulas, 11 turmas, segunda a sexta, com consulta por dia e semana completa. | Manter horario_aulatarde |
| Eventos | Não havia calendário estruturado nem consulta própria. | escola_eventos |
| Espaços disponíveis | Não havia consulta própria; não presumir biblioteca, laboratório ou quadra apenas por exemplos. | escola_conteudos, categoria espacos |
| Perguntas frequentes | A captura antiga mostrava registros FAQ, mas somente o endereço id 4 está visível. O agente não buscava os demais. | escola_conteudos, categoria faq |

“Não confirmado” não significa que os dados não existam. A auditoria usa as permissões da aplicação, que não dão acesso administrativo a todos os registros. Não foram copiadas ou ampliadas políticas de conhecimentos. Antes de redigitar textos, o administrador pode consultar seus registros existentes e reaproveitar somente os conteúdos revisados, com a fonte e a categoria corretas.

Foram adicionadas consultas controladas no backend para os sete tópicos restantes. Os dados não são produzidos pela IA e o agente não recebe acesso SQL. Conteúdos escolares são exibidos como texto, com fonte e data de verificação. Quando uma tabela ainda não foi criada ou não há conteúdo publicado visível, o agente informa a limitação e não encaminha essas perguntas a um modelo para inventar respostas.

## 1. Criar as duas tabelas

No projeto correto do Supabase, abra **SQL Editor → New query**, copie o conteúdo completo de `docs/sql/001_conteudos_escolares.sql` e execute como administrador.

A proposta cria:

- `escola_conteudos`: história, cursos, projetos, ambiente, espaços e FAQ.
- `escola_eventos`: agenda com início, fim, local e público-alvo.

As tabelas existentes conhecimentos e horario_aulatarde são preservadas. O script não insere dados nem publica textos fictícios. Pode ser executado novamente para repetir a mesma configuração inicial, mas não é um mecanismo para alterar posteriormente colunas de uma tabela existente com esquema incompatível.

As novas tabelas usam RLS e leitura apenas de linhas com `publicado = true` para anon e authenticated. Os papéis do site não recebem escrita. O administrador cadastra e revisa informações pelo painel. Essas políticas não concedem acesso a dados pessoais de alunos. Não são adicionadas políticas públicas às tabelas antigas.

O SQL foi testado em PostgreSQL local via PGlite, incluindo repetição, preservação de registros existentes, restrições de publicação e leitura/escrita por papel. Não foi executado no Supabase remoto; essa etapa depende do administrador do projeto.

## 2. Preencher escola_conteudos

No Table Editor, escolha a tabela e use Insert row. Use um registro por curso, projeto, espaço ou pergunta frequente. História e ambiente podem ter um ou mais textos curtos e organizados.

| Campo | Como preencher |
| --- | --- |
| categoria | Um dos valores exatos: historia, cursos, projetos, ambiente, espacos, faq |
| slug | Identificador único sem acentos, com letras minúsculas, números e hífens; por exemplo historia-da-escola |
| titulo | Nome do curso/projeto/espaço ou pergunta completa no caso de FAQ |
| conteudo | Resposta oficial em texto, com detalhes suficientes para responder ao estudante |
| fonte | Documento, URL oficial, comunicado ou setor responsável que confirmou a informação |
| verificado_em | Data real da revisão no formato AAAA-MM-DD |
| publicado | false durante preparação; true somente depois de revisar |

`id`, `criado_em` e `busca` são automáticos. Não tente editar busca. Publicação sem texto, fonte ou data de verificação é recusada. A busca de perguntas frequentes usa o índice textual em português; uma pergunta de matrícula não deve receber uma resposta genérica de assunto diferente.

Informações a levantar para cada categoria:

- **História:** data de criação confirmada, origem do nome, marcos, evolução da unidade e documentos que comprovem os fatos.
- **Cursos:** nome oficial, nível/modalidade, turno, duração, público atendido, requisitos e orientação de ingresso; evite anunciar uma oferta que não esteja vigente.
- **Projetos:** nome, objetivo, atividades, público, período e como participar, com responsável institucional quando autorizado.
- **Ambiente:** organização, convivência, acessibilidade, apoio ao estudante, atendimento e orientações confirmadas pela direção.
- **Espaços:** nome, finalidade, horários e regras de uso, disponibilidade e acessibilidade. Só cadastrar os espaços realmente existentes.
- **FAQ:** uma pergunta e resposta por registro: matrícula, documentos, uniforme, alimentação, transferência, contato e atendimento da secretaria. Reaproveitar os textos existentes após revisão.

O arquivo `docs/dados/escola_conteudos-modelo.csv` contém apenas os cabeçalhos para organizar uma importação. Os campos automáticos ficam de fora. Preencher `publicado` com false para rascunhos; não deixar esse campo nulo. Datas e fontes não devem ser inventadas.

## 3. Preencher escola_eventos

Campos comuns: slug, titulo, conteudo, fonte, verificado_em e publicado. Campos específicos:

- inicio: data/hora com fuso, por exemplo no formato `AAAA-MM-DDTHH:MM:SS-03:00`, com a data real confirmada.
- fim: opcional, igual ou posterior ao início.
- local: espaço ou endereço real do evento.
- publico_alvo: para quem o evento é destinado.

Um evento só pode ser publicado com início, descrição, fonte e revisão. Se a data ainda não foi confirmada, mantenha como rascunho. O agente apresenta horários no fuso America/Sao_Paulo. A consulta padrão lista eventos ainda não encerrados ou com início futuro; perguntas por eventos “realizados”, “passados” ou “anteriores” permitem consultar o cadastro histórico em ordem cronológica. No máximo 20 registros são mostrados por consulta, com aviso quando houver mais. Não há confirmação de presença, reservas ou envio de notificações nesta etapa.

Use `docs/dados/escola_eventos-modelo.csv` para preparar dados sem preencher os campos automáticos.

## 4. Conferir o agente

Depois de criar as tabelas e publicar informações reais, execute no terminal local:

```powershell
npm.cmd run check:contents
npm.cmd test
```

O primeiro comando informa tópico, estado e quantidade visível sem imprimir conteúdo ou chaves. Código 2 indica algum tópico ainda sem conteúdo visível ou tabela pendente; código 1 indica falha de acesso; código 0 significa que todos os sete tópicos têm pelo menos um registro visível. Ele não avalia a exatidão dos fatos. Para horários, continue usando `npm.cmd run check:school`.

Na aba Nossa escola há atalhos para os oito assuntos. Eles abrem o assistente e preparam uma pergunta; clique em Enviar. Perguntas sugeridas:

- Qual é a história da escola?
- Quais cursos a escola oferece?
- Quais projetos são desenvolvidos na escola?
- Como é o ambiente escolar?
- Quais são as aulas do 3C na semana completa?
- Quais são os próximos eventos da escola?
- Quais espaços estão disponíveis na escola?
- Quais documentos preciso para matrícula?

O backend oferece também `GET /api/escola/conteudos/:topico`, com topico entre historia, cursos, projetos, ambiente, eventos, espacos e faq. O endpoint é somente leitura. Não exige login para ler informações publicadas, preservando o fluxo visitante; o login Google não concede privilégios de edição.
