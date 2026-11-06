-- Informações fornecidas pela responsável pelo projeto em 06/11/2026.
-- Requer as tabelas do script 001. Não modifica a grade nem os professores.
-- Preserva registros existentes com o mesmo slug; confira o resultado no Table Editor.
BEGIN;
ALTER TABLE public.escola_conteudos DROP CONSTRAINT escola_conteudos_categoria_check;
ALTER TABLE public.escola_conteudos ADD CONSTRAINT escola_conteudos_categoria_check
 CHECK (categoria IN ('historia','cursos','projetos','ambiente','espacos','faq','eventos'));
INSERT INTO public.escola_conteudos
 (categoria,slug,titulo,conteudo,fonte,verificado_em,publicado)
VALUES
 ('historia','historia-republica-suriname','História da Escola Estadual República do Suriname',
  'Escola pública estadual da zona leste de São Paulo, na região do Itaim Paulista. Integra a rede de escolas nomeadas em homenagem a países. É conhecida na comunidade como "Ina" e atende há décadas moradores do bairro e do entorno.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true),
 ('cursos','cursos-etapas-itinerarios','Cursos e itinerários formativos',
  'Ensino Fundamental II: 6º ao 9º ano. Ensino Médio: 1ª a 3ª série. A partir do 2º ano do Ensino Médio, itinerários formativos: Linguagens/Humanas, Exatas/Natureza e Técnico em Desenvolvimento de Sistemas. Turnos informados: manhã, tarde e noite. Consulte a secretaria para confirmar a oferta de cada turma no ano letivo.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true),
 ('projetos','projetos-pedagogicos-comunidade','Projetos desenvolvidos',
  'Projetos pedagógicos da SEDUC-SP voltados a leitura, reforço, olimpíadas, cultura e esporte. Projetos internos do Projeto Político-Pedagógico, conforme as turmas e os professores do ano, e ações de integração com a comunidade do bairro. A programação específica depende do ano letivo.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true),
 ('ambiente','ambiente-convivencia','Ambiente escolar',
  'Escola de bairro com perfil comunitário e circulação nos três turnos. A convivência ocorre no pátio e nas áreas comuns durante o intervalo. A rotina de entrada e saída concentra movimento em horários de pico, com presença de famílias no entorno.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true),
 ('eventos','eventos-tipos-calendario','Eventos e atividades do calendário escolar',
  'Eventos culturais e esportivos informados: Show de Talentos, Interclasse, Gincana e Festa Junina. Atividades do calendário escolar: volta às aulas, feiras e mostras culturais. Atividades pedagógicas: provas pendentes, reunião de pais e professores e recuperação. Esta é uma relação geral; nenhuma data foi informada. Consulte a secretaria para confirmar a realização e a programação atual.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true),
 ('espacos','espacos-disponiveis','Espaços disponíveis na escola',
  'Salas de aula; pátio e área de convivência; quadra esportiva; sala de leitura/biblioteca; sala de informática; secretaria; salas da direção e da coordenação; refeitório e cozinha.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true),
 ('faq','rede-vinculo-administrativo','Qual é a rede de ensino da escola?',
  'A Escola Estadual República do Suriname pertence à rede estadual, SEDUC-SP, Diretoria de Ensino Leste 2.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true),
 ('faq','horario-funcionamento-escola','Qual é o horário de funcionamento da escola?',
  'O horário de funcionamento informado é de segunda a sexta-feira, das 6h às 21h15. Esse é o funcionamento geral da escola; não define o horário de cada aula nem o atendimento da secretaria.',
  'Informações fornecidas pela responsável pelo projeto',DATE '2026-11-06',true)
ON CONFLICT (slug) DO NOTHING;
COMMIT;
-- As datas dos eventos ainda não foram fornecidas: escola_eventos fica preservada.
SELECT categoria,slug,titulo,publicado FROM public.escola_conteudos
WHERE slug IN ('historia-republica-suriname','cursos-etapas-itinerarios','projetos-pedagogicos-comunidade',
'ambiente-convivencia','eventos-tipos-calendario','espacos-disponiveis','rede-vinculo-administrativo','horario-funcionamento-escola')
ORDER BY categoria;
