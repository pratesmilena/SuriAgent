# Informações fornecidas em 6 de novembro de 2026

No Supabase, abra SQL Editor → New query, copie `docs/sql/006_informacoes_escola.sql` por completo e clique em Run. Requer as tabelas criadas pelo script 001. O assistente não executou esse SQL no banco remoto.

O script publica os textos enviados pela responsável, com essa origem explícita. A data de referência é o recebimento das informações, sem alegar verificação independente. Preserva slugs já cadastrados: se houver um registro com o mesmo slug, ele não será sobrescrito.

| Índice | Tabela | Categoria |
| --- | --- | --- |
| História | escola_conteudos | historia |
| Cursos e turnos | escola_conteudos | cursos |
| Projetos | escola_conteudos | projetos |
| Ambiente | escola_conteudos | ambiente |
| Tipos de eventos sem data | escola_conteudos | eventos |
| Espaços | escola_conteudos | espacos |
| Rede de ensino e funcionamento geral | escola_conteudos | faq |

`escola_eventos` permanece reservada a eventos com datas reais. O agente reúne essa agenda e as informações gerais, distinguindo os registros sem data. Não altera conhecimentos, professores nem horario_aulatarde. Não atribui aulas aos turnos da manhã/noite e não acrescenta EJA.

Depois que o Netlify concluir o deploy e o SQL for aplicado, teste: “Qual é a história da escola?”, “Quais cursos a escola oferece?”, “Quais eventos a escola tem?”, “Quais espaços estão disponíveis?” e “Qual é o horário de funcionamento da escola?”.
