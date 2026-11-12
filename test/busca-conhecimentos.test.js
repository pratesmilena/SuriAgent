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
async function perguntar(pergunta,deps){let body;await criarPerguntaEscola({interpretacao:async()=>null,...deps})({body:{pergunta}},{status(){return this},json(x){body=x;return this}});return body;}
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

test('gestores são encontrados com sinônimos e sem exigir a palavra escola',async()=>{
 const gestao={id:17,categoria:'Gestão',titulo:'Equipe gestora',conteudo:'Diretora: Elaine.\n\nVice-diretor da tarde: Paulo.\n\nCoordenadora da tarde: Rita.',palavras_chave:'gestão, gestores, diretora, vice-diretor, coordenadora'};
 for(const pergunta of ['Quem são os gestores da escola?','Quem é a diretora?','Qual é o nome do vice-diretor da tarde?','Quem cuida da coordenação na escola?','Quem manda na escola?','Quem administra a escola?','quem sao os gestore da escola']){
  const r=await perguntar(pergunta,{buscar:p=>buscarConhecimentos(p,banco([gestao,...registros])),elaborar:async()=>null});
  assert.equal(r.handled,true,pergunta);assert.match(r.solucao,/Elaine/,pergunta);assert.match(r.solucao,/Paulo/,pergunta);assert.match(r.solucao,/Rita/,pergunta);
 }
});
test('Gemini pode selecionar somente o trecho do gestor solicitado, com contexto validado',async()=>{
 const gestao={id:17,categoria:'Gestão',titulo:'Equipe gestora',conteudo:'Diretora: Elaine.\n\nVice-diretor da tarde: Paulo.\n\nCoordenadora da tarde: Rita.',palavras_chave:'gestão, diretora, vice-diretor, coordenadora'};
 const r=await perguntar('Qual é o nome do vice-diretor da tarde?',{env:{SURI_GEMINI:'test-only'},buscar:p=>buscarConhecimentos(p,banco([gestao])),elaborar:(pergunta,resultados,options)=>require('../respostas-escola-ia').responderComBase(pergunta,resultados,{...options,generate:async args=>{
  assert.match(args.message,/Paulo/);assert.equal(args.provider,'gemini');return{solucao:'{"trechos":[1]}'};
 }})});assert.equal(r.solucao,'Vice-diretor da tarde: Paulo.');
});
