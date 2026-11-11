const {test}=require('node:test');const assert=require('node:assert/strict');
const{conteudoDaTarde}=require('../escopo-tarde');const{criarPerguntaEscola}=require('../escola');
test('preserva informações gerais e exclui trechos exclusivamente da manhã',()=>{
 const geral={id:14,conteudo:'Criada em 1998.\n\nNome alterado em 2007.'};assert.deepEqual(conteudoDaTarde(geral),geral);
 assert.equal(conteudoDaTarde({id:20,conteudo:'Manhã: 07:00.'}),null);
 const mixto=conteudoDaTarde({id:13,conteudo:'Manhã (Fundamental, às 07:00) e Tarde/Noite (Ensino Médio e Técnico DS, a partir das 14:20, das turmas 1ºA ao 3ºC).'});
 assert.match(mixto.conteudo,/14:20/);assert.doesNotMatch(mixto.conteudo,/07:00|Fundamental|Manhã/);
 assert.equal(conteudoDaTarde({id:2,conteudo:'649 matrículas na escola'}),null);
});
test('perguntas explícitas sobre manhã não consultam a grade da tarde ou a IA',async()=>{
 let body;await criarPerguntaEscola({consultar:()=>assert.fail('Não deve consultar'),elaborar:()=>assert.fail('Não deve elaborar')})({body:{pergunta:'Quais são as aulas do 6A de manhã na segunda?'}},{json(x){body=x;return this}});
 assert.match(body.solucao,/configurado para atender ao período da tarde/);
});
