const {test}=require('node:test');const assert=require('node:assert/strict');const express=require('express');const {createClient}=require('@supabase/supabase-js');
const {identificarTopicos,consultarConteudos,formatarConteudos}=require('../conteudos-escola');const {criarPerguntaEscola}=require('../escola');
test('identifica os seis tópicos de conteúdo e eventos sem capturar dúvida de código',()=>{
 const casos={historia:'Qual é a história da escola?',cursos:'Que cursos a escola oferece?',projetos:'Quais projetos a escola desenvolve?',ambiente:'Como é o ambiente escolar?',espacos:'Quais espaços estão disponíveis?',faq:'Quais documentos preciso para matrícula?',eventos:'Quais os próximos eventos?'};
 for(const[topico,pergunta]of Object.entries(casos))assert.ok(identificarTopicos(pergunta).includes(topico));
 assert.deepEqual(identificarTopicos('Explique uma Promise em JavaScript'),[]);
});
async function rest(t,fn){const app=express();app.get('/rest/v1/:table',fn);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));return createClient(`http://127.0.0.1:${server.address().port}`,'test-only',{auth:{persistSession:false,autoRefreshToken:false}});}
test('consulta exige publicado e categoria no SDK real',async t=>{
 const db=await rest(t,(req,res)=>{assert.equal(req.params.table,'escola_conteudos');assert.equal(req.query.publicado,'eq.true');assert.equal(req.query.categoria,'eq.cursos');assert.equal(req.query.limit,'20');assert.ok(!req.query.select.includes('*'));res.set('Content-Range','0-0/1').json([{id:1,titulo:'Curso de teste',conteudo:'Texto de teste',fonte:'Documento de teste'}]);});
 const result=await consultarConteudos('cursos','',db);assert.equal(result.status,'disponivel');assert.match(formatarConteudos(result),/Documento de teste/);
});
test('FAQ aplica busca textual com termos controlados',async t=>{
 const db=await rest(t,(req,res)=>{assert.match(req.query.busca,/matricula/);assert.match(req.query.busca,/wfts/);res.json([]);});const result=await consultarConteudos('faq','O que preciso para matrícula?',db);assert.equal(result.status,'sem_conteudo_publicado');assert.match(formatarConteudos(result),/Não vou completar/);
});
test('eventos atuais filtram datas e histórico omite esse filtro',async t=>{
 let calls=0;const db=await rest(t,(req,res)=>{calls++;assert.equal(req.params.table,'escola_eventos');assert.equal(req.query.publicado,'eq.true');if(calls===1)assert.match(req.query.or,/2026-11-05/);else assert.equal(req.query.or,undefined);res.json([]);});
 await consultarConteudos('eventos','Próximos eventos',db,new Date('2026-11-05T12:00:00Z'));await consultarConteudos('eventos','Eventos realizados',db);assert.equal(calls,2);
});
test('tabela ausente é distinta de conteúdo vazio e recusa de leitura',async t=>{
 const db=await rest(t,(req,res)=>res.status(404).json({code:'PGRST205',message:'ausente'}));const result=await consultarConteudos('historia','',db);assert.equal(result.status,'tabela_pendente');assert.match(formatarConteudos(result),/sendo preparada/);
 await assert.rejects(consultarConteudos('toString','',db),{status:400});
});
test('o chat usa a base para os tópicos novos, sem depender da IA',async()=>{
 for(const pergunta of ['Qual a história da escola?','Quais cursos são oferecidos?','Quais projetos desenvolvidos?','Como é o ambiente escolar?','Quais os próximos eventos?','Quais espaços disponíveis?','Perguntas frequentes']){
  let body;const res={status(){return this;},json(x){body=x;return this;}};let calls=0;
  await criarPerguntaEscola({conteudos:async topico=>{calls++;return {topico,status:'disponivel',registros:[{titulo:'Teste',conteudo:'Dado confirmado de teste',fonte:'Fonte de teste'}],total:1};}})({body:{pergunta}},res);assert.equal(body.handled,true);assert.match(body.solucao,/Dado confirmado/);assert.ok(calls>0);
 }
});
test('cadastro de eventos apresenta data no fuso de São Paulo',()=>{
 const text=formatarConteudos({topico:'eventos',status:'disponivel',total:1,registros:[{titulo:'Evento de teste',conteudo:'Teste',inicio:'2026-11-05T15:00:00Z',local:'Local de teste',fonte:'Teste'}]});assert.match(text,/12:00/);assert.match(text,/05\/11\/2026/);
});
