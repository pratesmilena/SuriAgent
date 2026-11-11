const {test}=require('node:test');const assert=require('node:assert/strict');
const{responderComBase}=require('../respostas-escola-ia');const{criarPerguntaEscola}=require('../escola');
const env={GEMINI_API_KEY:'test-only'};
const base=[{origem:'conhecimentos',status:'disponivel',registros:[{conteudo:'Projeto de leitura.\n\nClube de música.'}]}];
test('Gemini recebe apenas trechos autorizados e retorna seleção validada pelo servidor',async()=>{
 const r=await responderComBase('Resuma os projetos da escola',base,{env,generate:async args=>{
  assert.equal(args.provider,'gemini');assert.equal(args.timeoutMs,8000);assert.match(args.systemPrompt,/não invente/);
  const payload=JSON.parse(args.message);assert.equal(payload.documentos.length,2);assert.ok(!args.message.includes('test-only'));
  return{solucao:'{"trechos":[1]}'}}});assert.equal(r,'Clube de música.');
});
test('sem chave, sem documentos ou pergunta direta não chama IA',async()=>{
 const generate=()=>assert.fail('Não deve chamar');
 assert.equal(await responderComBase('Resuma os projetos',base,{env:{},generate}),null);
 assert.equal(await responderComBase('Quais projetos?',base,{env,generate}),null);
 assert.equal(await responderComBase('Resuma os projetos',[],{env,generate}),null);
 assert.equal(await responderComBase('Resuma os projetos',[{...base[0],origem:'outra'}],{env,generate}),null);
});
test('saída livre, índices inventados e falha do serviço não substituem a resposta do banco',async()=>{
 for(const solucao of ['Texto inventado','{"trechos":[99]}','{"trechos":["0"]}','{"trechos":[]}'])
  assert.equal(await responderComBase('Resuma os projetos',base,{env,generate:async()=>({solucao})}),null);
 assert.equal(await responderComBase('Resuma os projetos',base,{env,generate:async()=>{throw new Error('cota')}}),null);
});
async function perguntar(pergunta,deps){let body;await criarPerguntaEscola(deps)({body:{pergunta}},{json(r){body=r;return this},status(){return this}});return body;}
test('rota integra a base à elaboração apenas em perguntas abertas',async()=>{
 let chamadas=0;const deps={env,conteudos:async()=>base[0],elaborar:async()=>{chamadas++;return 'Clube de música.'}};
 assert.equal((await perguntar('Resuma os projetos da escola',deps)).solucao,'Clube de música.');
 assert.equal((await perguntar('Quais projetos são desenvolvidos na escola?',deps)).solucao,base[0].registros[0].conteudo);
 assert.equal(chamadas,1);
});
test('endereço, horários e ausência de dados nunca são enviados para elaboração',async()=>{
 const elaborar=()=>assert.fail('Não deve elaborar');
 await perguntar('Onde fica a escola?',{elaborar,localizar:async()=>null});
 await perguntar('Explique as aulas do 3C na sexta',{elaborar,consultar:async()=>[]});
 await perguntar('Resuma os projetos da escola',{elaborar,conteudos:async()=>({origem:'conhecimentos',status:'sem_conteudo_publicado',registros:[]})});
});

test('elaboração escolar aceita o mesmo nome alternativo da credencial Gemini',async()=>{
 let chamada=false;const r=await responderComBase('Resuma os projetos',base,{env:{SURI_GEMINI:'test-alias'},generate:async()=>{chamada=true;return{solucao:'{"trechos":[0]}'}}});
 assert.equal(chamada,true);assert.equal(r,'Projeto de leitura.');
});
