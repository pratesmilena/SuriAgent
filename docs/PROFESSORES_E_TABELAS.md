# Tabelas e cadastro de professores

## Inventário com o acesso disponível

Consultas de leitura confirmaram estas tabelas do projeto:

| Tabela | Uso |
| --- | --- |
| public.conhecimentos | Base anterior; a aplicação consulta o endereço no registro 4 |
| public.horario_aulatarde | Aulas por turma e dia, com professor e disciplina |

A aplicação não possui credencial administrativa para listar todas as tabelas, schemas e objetos privados do Supabase. A API não localizou escola_conteudos e escola_eventos no esquema exposto. Elas foram propostas no script 001, mas a criação no banco não foi confirmada por estas consultas. Para obter a lista completa das tabelas do aplicativo, executar docs/sql/listar-tabelas.sql no SQL Editor como administrador. As tabelas internas de Authentication e Storage não são o lugar para cadastrar professores ou disciplinas.

## Onde colocar a lista enviada

A nova tabela proposta é `public.escola_professor_disciplinas`, com um registro para cada vínculo professor–disciplina. Ela separa o cadastro docente da grade: os dados recebidos indicam Ensino Fundamental, mas não especificam turma, dia, aula ou horário. Por isso, nenhuma linha de horario_aulatarde foi alterada. Não é correto atribuir esses professores às turmas de Ensino Médio/DS sem a grade correspondente.

O SQL `docs/sql/002_professores_ensino_fundamental.sql` cria a tabela com RLS e insere os 17 professores/29 vínculos fornecidos como rascunho. Funciona independentemente da criação das tabelas de conteúdo/eventos. Executá-lo novamente não duplica vínculos nem sobrescreve correções, porque usa codigo único e ON CONFLICT DO NOTHING. As tabelas anteriores são preservadas.

Arquivos de dados:

- dados/professores-ensino-fundamental.json: lista estruturada para revisão.
- docs/dados/professores-ensino-fundamental.csv: alternativa para importação no Table Editor.

Usar o SQL com INSERT ou o CSV; não importar ambos sem conferir os códigos únicos. Os nomes foram mantidos como informados, com uniformização de caixa em Iara/Djalma. Acentos usuais das disciplinas foram corrigidos. “Orientação de Estudo” e “Orientação de Estudos” foram mantidos conforme a lista enviada; confirmar a nomenclatura oficial antes de publicar. Apelidos como LuBueno e Ale não foram expandidos para nomes completos.

## Dados recebidos

| Professor | Disciplinas informadas |
| --- | --- |
| Miria | Matemática; Orientação de Estudo de Matemática |
| Iara | Tecnologia; Ciências |
| Joyce | Português; Redação |
| Enilson | Geografia; Projeto de Vida |
| Luciana | História; Tecnologia |
| Neusa | História; Projeto de Vida |
| Anderson | Matemática; Orientação de Estudos de Matemática |
| Djalma | Orientação de Português; Português |
| Katia | Educação Física |
| LuBueno | Geografia; Tecnologia |
| Cicero | Ciências |
| Altair | Artes |
| Elis | Inglês; Projeto de Vida |
| Tiago | Matemática; Orientação de Estudos de Matemática |
| Olimpia | Redação |
| Ale | Português; Redação |
| Marcelo | Efin (?) — nome completo da disciplina ainda não confirmado |

## Como adicionar no Supabase

1. Abrir SQL Editor → New query.
2. Colar o arquivo completo 002_professores_ensino_fundamental.sql e executar como administrador. O assistente não o executou no banco remoto.
3. Abrir a nova tabela no Table Editor e revisar nomes, disciplinas, etapa e fonte.
4. Para cada vínculo efetivamente confirmado pela escola, preencher verificado_em com a data real da revisão, marcar confirmado=true e publicado=true. Só linhas confirmadas e publicadas ficam visíveis ao site.
5. Marcelo fica com observacao preenchida e sem publicação. Confirmar o significado de Efin (?), corrigir disciplina e só então remover a observação pendente, revisar a data e publicar. O banco recusa publicação com observação pendente.

O site não recebe permissões de escrita. Não são cadastrados e-mails, telefones ou dados pessoais de estudantes nesse diretório. O login Google não concede edição da tabela. Os nomes não foram inferidos a partir da grade existente nem publicados automaticamente.

## Consulta pelo agente

A integração está preparada para perguntas como:

- Quais são os professores do Ensino Fundamental?
- Quais disciplinas a professora Miria leciona no Ensino Fundamental?
- Quem ensina Matemática no Ensino Fundamental?

O backend consulta a tabela por etapa e busca textual em português, selecionando apenas registros confirmados/publicados. Uma pergunta sobre professor de uma turma/dia/aula específicos continua usando horario_aulatarde; o cadastro docente não substitui a grade. A tabela ainda precisa ser criada e preenchida/publicada no Supabase para esse novo diretório responder.

A rota de conteúdo aceita também `GET /api/escola/conteudos/professores`. `npm run check:contents` verifica a disponibilidade desse assunto junto dos conteúdos anteriores. Tabela ainda não criada, ausência de dados publicados e falha de acesso são situações diferentes; nenhuma delas comprova que o professor não trabalha na escola.

## Validação

Os testes executam o SQL em PostgreSQL local (PGlite), conferem os 29 vínculos/17 professores, repetição sem duplicar, preservação de correções e RLS escondendo rascunhos. Testam a consulta com o SDK Supabase em HTTP simulado, filtros por nome/etapa e a preservação das consultas da grade. Não houve escrita no banco Supabase remoto.
