# Avaliação de opções de IA — SuriAgent

Atualização: a seleção de modelo e a conexão Puter foram retiradas da interface pública a pedido da responsável. A comparação abaixo é um registro técnico/histórico. O serviço usado pelo site é definido apenas no servidor por AI_PROVIDER; não há endpoint público de catálogo de modelos.

Verificação em 4 de novembro de 2026. Escopo: as quatro opções solicitadas, com um modelo inicial por serviço. Não é possível declarar o melhor modelo por qualidade sem executar inferências autenticadas com as mesmas tarefas.

## Decisão provisória

Manter Gemini no backend, atualizando o padrão para `gemini-3.5-flash-lite`, descrito pela documentação oficial atual como opção Flash-Lite para novos projetos. Pode ser adequado a explicações curtas e ao fluxo escolar por priorizar rapidez e economia. Essa é uma hipótese de implantação, não um resultado de benchmark ou garantia de camada gratuita. O custo e os limites dependem do projeto e da conta. Groq e OpenRouter ficam disponíveis para comparação sem trocar código. Puter é uma alternativa explícita para quem optar por usar a própria conta e cota.

## Evidência desta execução

| Opção | Verificação externa | Inferência real |
| --- | --- | --- |
| Puter | SDK oficial carregou no Chromium; catálogo retornou 977 modelos, incluindo o modelo inicial; documentação confirma login e modelo User-Pays | Não executada: navegador sem login (`isSignedIn() === false`) |
| Groq | Requisição sem autenticação ao catálogo retornou HTTP 403 nesta rede; documentação também retornou 403 | Não executada: `GROQ_API_KEY` ausente |
| Gemini | Documentação oficial acessível; catálogo sem chave retornou HTTP 403 | Não executada: `GEMINI_API_KEY` ausente |
| OpenRouter | Catálogo público respondeu HTTP 200 e listou variantes `:free` | Não executada: `OPENROUTER_API_KEY` ausente |

HTTP 403 sem autenticação não identifica sozinho a causa como credencial, rede ou restrição do serviço. HTTP 200 do SDK ou catálogo não demonstra qualidade de resposta, funcionamento de inferência ou quota gratuita. `openrouter/free` é um roteador: registre o modelo efetivo retornado antes de comparar resultados. A disponibilidade atual do modelo Groq sugerido permanece não verificada.

Os 22 testes automatizados passaram (16 de IA e 6 de horários). A verificação de navegador também passou, incluindo os três estados reais sem chave e a resposta simulada do Puter.

Os testes automatizados exercitam os três adaptadores do backend com respostas simuladas, sem gastar cotas: payloads, endpoints, instruções, limites, timeout, ausência de chave, falhas de autenticação, respostas vazias e erros seguros. O normalizador do Puter é testado com texto e blocos. Testes de navegador verificam seleção, login simulado, renderização segura e layout móvel. Resultados simulados não são respostas reais de modelos.

## Como concluir a comparação real

1. Cadastre a chave de cada serviço que deseja comparar nas configurações seguras; nunca em chat ou código. Não é necessário configurar todos para usar apenas um.
2. Reinicie com `NODE_USE_ENV_PROXY=1 npm start` quando houver proxy e execute `npm run compare:ai`. São três solicitações públicas por provedor, sem dados pessoais ou consulta ao banco escolar. O relatório contém respostas, latência e identificação do modelo, nunca as chaves.
3. No Puter, escolha a opção na interface e conecte sua conta. Repita as mesmas perguntas do arquivo `scripts/compare-ai.js`, anotando modelo efetivo e latência. Sem login real, esse teste fica pendente.
4. Revise as respostas em português e o critério de não inventar dados escolares. Repita com várias amostras antes de escolher o vencedor; as duas tarefas objetivas isoladas não avaliam toda a qualidade pedagógica.
5. Defina `AI_PROVIDER` e a variável de modelo correspondente conforme a comparação, cotas e orçamento da escola.

A consulta oficial ao Supabase continua separada e exige `SUPABASE_PUBLISHABLE_KEY`. Nenhum modelo consulta o banco por conta própria, e a IA não recebe acesso SQL.

## Fontes oficiais consultadas

- [Puter — primeiros passos](https://docs.puter.com/getting-started/)
- [Puter — chat](https://docs.puter.com/AI/chat/)
- [Puter — catálogo](https://docs.puter.com/AI/listModels/)
- [Puter — User-Pays](https://docs.puter.com/user-pays-model/)
- [Google — modelos Gemini](https://ai.google.dev/gemini-api/docs/models)
- [Groq — modelos](https://console.groq.com/docs/models) (acesso 403 nesta execução)
- [OpenRouter — catálogo público](https://openrouter.ai/api/v1/models)
