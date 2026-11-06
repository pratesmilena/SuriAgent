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
| Marcelo | Educação Financeira — esclarecimento fornecido pela responsável |

## Como adicionar no Supabase

1. Abrir SQL Editor → New query.
2. Colar o arquivo completo 002_professores_ensino_fundamental.sql e executar como administrador. O assistente não o executou no banco remoto.
3. Abrir a nova tabela no Table Editor e revisar nomes, disciplinas, etapa e fonte.
4. Para cada vínculo efetivamente confirmado pela escola, preencher verificado_em com a data real da revisão, marcar confirmado=true e publicado=true. Só linhas confirmadas e publicadas ficam visíveis ao site.
5. A disciplina de Marcelo foi esclarecida como Educação Financeira. Se a versão antiga já foi importada com Efin (?), execute docs/sql/003_corrigir_disciplina_marcelo.sql. O código fundamental-marcelo-efin foi preservado para evitar duplicações. A correção não publica o registro; a revisão segue o mesmo processo dos demais vínculos.

O site não recebe permissões de escrita. Não são cadastrados e-mails, telefones ou dados pessoais de estudantes nesse diretório. O login Google não concede edição da tabela. Os nomes não foram inferidos a partir da grade existente nem publicados automaticamente.

## Consulta pelo agente

A integração está preparada para perguntas como:

- Quais são os professores do Ensino Fundamental?
- Quais disciplinas a professora Miria leciona no Ensino Fundamental?
- Quem ensina Matemática no Ensino Fundamental?

O backend combina os vínculos confirmados/publicados do cadastro docente com professor e disciplina dos horários da tarde. Agrupa vínculos repetidos, informa as turmas e mantém a origem de cada informação. Não é preciso copiar a grade para o cadastro docente. Consultas por etapa usam somente o cadastro, pois a grade não confirma a etapa; consultas por período usam somente horários com período conhecido. Ainda não há integração com uma grade da manhã. Uma pergunta sobre professor de uma turma/dia/aula específicos continua usando horario_aulatarde; o cadastro docente não substitui a grade. A tabela ainda precisa ser criada e preenchida/publicada no Supabase para esse novo diretório responder.

A rota de conteúdo aceita também `GET /api/escola/conteudos/professores`. `npm run check:contents` verifica a disponibilidade desse assunto junto dos conteúdos anteriores. Tabela ainda não criada, ausência de dados publicados e falha de acesso são situações diferentes; nenhuma delas comprova que o professor não trabalha na escola.

## Validação

Os testes executam o SQL em PostgreSQL local (PGlite), conferem os 29 vínculos/17 professores, repetição sem duplicar, preservação de correções e RLS escondendo rascunhos. Testam a consulta com o SDK Supabase em HTTP simulado, filtros por nome/etapa e a preservação das consultas da grade. Não houve escrita no banco Supabase remoto.

## Publicar os vínculos já conferidos

Depois de revisar a lista acima, executar `docs/sql/004_publicar_professores_revisados.sql` no SQL Editor do Supabase. O script publica apenas os 29 vínculos originais que correspondam exatamente a código, professor e disciplina, sem observação pendente. Não altera vínculos já publicados ou corrigidos. Para Marcelo importado como Efin (?), aplicar o script 003 antes. A publicação pode retornar menos de 29 linhas se algumas já estiverem publicadas ou tiverem sido editadas; conferir o Table Editor.

Exemplos de perguntas: “Quais matérias a professora Miria leciona?”, “Quem ensina Matemática?”, “Quais disciplinas cada professor leciona na tarde?”. Siglas de disciplinas da grade são mantidas como cadastradas, sem expandir significados por suposição. Os scripts não foram executados remotamente pelo assistente.

## Nome alternativo da professora Ale

Executar `docs/sql/005_apelido_professora_ale.sql` no SQL Editor. Acrescenta `nomes_alternativos`, registra Alessandra nos vínculos de Ale do Fundamental e inclui os nomes alternativos na busca. Preserva nome, disciplinas e estado de publicação. Pode executar novamente sem duplicar o apelido. Assim, “Quais disciplinas a professora Alessandra leciona?” encontra os mesmos vínculos publicados de Ale. O agente também reconhece os dois nomes na pesquisa dos horários da tarde.
