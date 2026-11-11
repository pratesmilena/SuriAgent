# Perguntas frequentes

## Funcionamento atual

O site oferece oito sugestões editoriais em Nossa escola → Perguntas frequentes. Ao escolher uma, abre o chat com a pergunta preenchida; o envio consulta as rotas existentes e as informações atuais do Supabase. O pedido “Quais são as perguntas frequentes?” também lista essas sugestões, sem despejar os registros antigos de censo, contato e horários.

A lista está em `perguntas-frequentes.js` e é servida por `GET /api/escola/perguntas-frequentes`. Não contém contadores, nomes, e-mails ou perguntas livres de usuários. Não há registro permanente do histórico nem acompanhamento em segundo plano. As sugestões não são apresentadas como “as mais feitas”. Não foram criadas tabelas ou alteradas políticas do banco.

## Avaliação do acompanhamento solicitado

É tecnicamente possível medir frequência, mas não existe um histórico anterior que permita calcular o ranking real neste projeto. Persistir contagens em memória na Function ou no SQLite local não serve como estatística global: instâncias do Netlify são independentes e temporárias.

Uma implementação persistente exigiria provisionamento administrativo de uma tabela/função de contagem no Supabase e controle de acesso específico. O desenho recomendado é contar apenas o identificador de um assunto aprovado, a data e o total, sem armazenar o texto livre, IP, nome, e-mail ou identificador de conta. O ranking deveria usar uma janela recente, limitar repetições por sessão, excluir testes e reservar espaço para assuntos menos frequentes, evitando que um único tema ocupe todas as sugestões. As respostas continuariam vindo da base atual, sem serem publicadas automaticamente a partir das conversas.

Essa coleta não foi ativada. Nesta entrega foi utilizada a alternativa solicitada: perguntas gerais úteis, com indicação transparente do critério editorial.
