const {test}=require('node:test');const assert=require('node:assert/strict');
const {buscarConhecimentos}=require('../busca-conhecimentos');const {criarPerguntaEscola}=require('../escola');
function banco(rows){return{from(table){assert.equal(table,'conhecimentos');return{select(){return this},order(){return this},range(){return this},async abortSignal(){return{data:rows,error:null}}}}}}
const registros=[{id:15,categoria:'Projetos',titulo:'Clubes juvenis',conteudo:'Clube de música e podcast.',palavras_chave:'clubes, música, podcast'}, {id:9,categoria:'FAQ',titulo:'Ensino',conteudo:'Ensino Médio.',palavras_chave:'ensino'}];
test('não confunde eletivas e atividades optativas com clubes, FAQ ou itinerários',async()=>{
 for(const pergunta of ['Quais eletiva tem na escola?','Quais eletivas a escola oferece?','Tem disciplinas optativas?']){
  assert.equal((await buscarConhecimentos(pergunta,banco(registros))).registros.length,0);
 }
});
test('novo conteúdo publicado sobre eletivas é localizado sem adicionar ID no código',async()=>{
 const r=await buscarConhecimentos('Quais eletiva tem na escola?',banco([...registros,{id:81,categoria:'Oferta escolar',titulo:'Eletivas disponíveis',conteudo:'Eletivas: Robótica e Fotografia.',palavras_chave:'eletivas, optativas'}]));
 assert.deepEqual(r.registros.map(r=>r.id),[81]);
 assert.equal((await buscarConhecimentos('Quais atividades optativas tem na escola?',banco(r.registros))).registros[0].id,81);
});
test('busca com linguagem livre encontra palavras-chave em qualquer categoria e descarta termos genéricos',async()=>{
 const r=await buscarConhecimentos('Quero saber sobre podcast na escola',banco(registros));assert.deepEqual(r.registros.map(r=>r.id),[15]);
 assert.equal((await buscarConhecimentos('Qual é a escola?',banco(registros))).registros.length,0);
});
async function perguntar(pergunta,deps){let body;await criarPerguntaEscola(deps)({body:{pergunta}},{status(){return this},json(x){body=x;return this}});return body;}
test('rota não usa FAQ genérica para eletivas nem envia dados ausentes ao Gemini',async()=>{
 const r=await perguntar('Quais eletiva tem na escola?',{eletivas:async()=>({registros:[]}),buscar:p=>buscarConhecimentos(p,banco(registros)),conteudos:()=>assert.fail('Não deve listar FAQ'),elaborar:()=>assert.fail('Não deve gerar sem registros')});
 assert.match(r.solucao,/Não encontrei eletivas acessíveis/);assert.doesNotMatch(r.solucao,/Ensino Médio/);
});
test('pergunta desconhecida busca contexto relevante e pode chamar Gemini com os registros encontrados',async()=>{
 let called=false;const r=await perguntar('Quero saber sobre podcast na escola',{buscar:p=>buscarConhecimentos(p,banco(registros)),elaborar:async(p,results,options)=>{called=true;assert.equal(options.permitirPerguntaDireta,true);assert.equal(results[0].registros[0].id,15);return 'Clube de música e podcast.';}});
 assert.equal(called,true);assert.equal(r.solucao,'Clube de música e podcast.');
});

test('eletivas são consultadas por vínculo docente, sem usar FAQ ou clubes',async()=>{
 const r=await perguntar('Quais eletiva tem na escola?',{eletivas:async()=>({registros:[{professor:'PEDRO',disciplina:'ELETIVA',origens:[{tipo:'horarios',turmas:['1ºA']}]}]}),buscar:()=>assert.fail('Não deve buscar FAQ'),conteudos:()=>assert.fail('Não deve consultar clubes')});
 assert.match(r.solucao,/PEDRO/);assert.match(r.solucao,/1ºA/);assert.match(r.solucao,/não informa os nomes dos temas/);
});
