const{test}=require('node:test');const assert=require('node:assert/strict');
const{listaPerguntasFrequentes,pedidoListaFaq}=require('../perguntas-frequentes');const{criarPerguntaEscola}=require('../escola');
test('FAQ apresenta sugestões úteis da tarde sem alegar estatísticas inexistentes',()=>{
 const r=listaPerguntasFrequentes();assert.equal(r.criterio,'sugestoes_editoriais');assert.equal(r.periodo,'TARDE');assert.equal(r.perguntas.length,8);
 assert.equal(new Set(r.perguntas.map(x=>x.id)).size,8);assert.ok(r.perguntas.some(x=>x.id==='eletivas'));
 assert.ok(r.perguntas.every(x=>!('contador'in x)&&!('usuarios'in x)));
});
test('pedido de lista não é confundido com uma dúvida específica',()=>{
 for(const p of ['Quais são as perguntas frequentes?','Perguntas frequentes','FAQ','Mostre as dúvidas frequentes'])assert.equal(pedidoListaFaq(p),true);
 for(const p of ['Qual é o IDEB da escola?','Perguntas frequentes sobre matrícula'])assert.equal(pedidoListaFaq(p),false);
});
test('chat retorna perguntas sugeridas, sem despejar respostas de todos os registros',async()=>{
 let body;await criarPerguntaEscola({conteudos:()=>assert.fail('Não deve carregar toda a FAQ'),buscar:()=>assert.fail('Não deve pesquisar todos os registros')})({body:{pergunta:'Quais são as perguntas frequentes?'}},{json(x){body=x;return this}});
 assert.equal(body.handled,true);assert.match(body.solucao,/Quais eletivas/);assert.match(body.solucao,/não um ranking/);assert.doesNotMatch(body.solucao,/649|07:00/);
});
