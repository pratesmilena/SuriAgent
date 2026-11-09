const {test}=require('node:test');const assert=require('node:assert/strict');const express=require('express');const {createClient}=require('@supabase/supabase-js');
const{consultarProfessores}=require('../professores-escola');const{identificarTopicos,formatarConteudos}=require('../conteudos-escola');const{criarPerguntaEscola}=require('../escola');
test('professores do Fundamental não são tratados como oferta de cursos ou horário de turma',async()=>{
 assert.ok(identificarTopicos('Quais professores do ensino fundamental?').includes('professores'));
 let response;await criarPerguntaEscola({conteudos:async topico=>{assert.equal(topico,'professores');return{topico,status:'disponivel',registros:[{professor:'Miria',disciplina:'Matemática',etapa:'ENSINO_FUNDAMENTAL',fonte:'Teste',verificado_em:'2026-11-06'}],total:1};}})({body:{pergunta:'Quais os professores do Ensino Fundamental?'}},{json(x){response=x;return this;},status(){return this;}});assert.match(response.solucao,/Miria — Matemática/);assert.doesNotMatch(response.solucao,/Informe uma turma/);
});
test('consulta docente exige publicado e confirmado, com etapa e busca por nome',async t=>{
 const app=express();app.get('/rest/v1/escola_professor_disciplinas',(req,res)=>{assert.equal(req.query.publicado,'eq.true');assert.equal(req.query.confirmado,'eq.true');assert.equal(req.query.etapa,'eq.ENSINO_FUNDAMENTAL');assert.equal(req.query.busca,'plfts(portuguese).miria');res.json([{professor:'Miria',disciplina:'Matemática',etapa:'ENSINO_FUNDAMENTAL',fonte:'Teste',verificado_em:'2026-11-06'}]);});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const db=createClient(`http://127.0.0.1:${server.address().port}`,'test-only',{auth:{persistSession:false,autoRefreshToken:false}});const result=await consultarProfessores('Quais disciplinas a professora Miria leciona no Ensino Fundamental?',db);assert.equal(result.registros.length,1);assert.match(formatarConteudos(result),/Miria/);assert.match(formatarConteudos({...result,total:51}),/Exibindo 1 de 51/);
});
test('pergunta de professor em uma aula específica continua consultando a grade',async()=>{
 let response;await criarPerguntaEscola({consultar:async()=>[{turma:'3ºC (DS)',numero_aula:1,disciplina:'PB',professor:'Docente de teste'}],conteudos:()=>assert.fail('Não deve misturar cadastro docente com grade')})({body:{pergunta:'Qual professor da primeira aula do 3C na sexta?'}},{json(x){response=x;return this;},status(){return this;}});assert.match(response.solucao,/Docente de teste/);
});

async function bancoDeTeste(t, cadastro, grade) {
 const app=express();
 app.get('/rest/v1/escola_professor_disciplinas',(req,res)=>{
  assert.equal(req.query.publicado,'eq.true');assert.equal(req.query.confirmado,'eq.true');
  res.json(cadastro);
 });
 app.get('/rest/v1/horario_aulatarde',(_req,res)=>res.json(grade));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 return createClient(`http://127.0.0.1:${server.address().port}`,'test-only',{auth:{persistSession:false,autoRefreshToken:false}});
}
test('une cadastro e grade sem duplicar vínculos ou perder as turmas e fontes',async t=>{
 const db=await bancoDeTeste(t,[{professor:'Miria',disciplina:'Matemática',etapa:'ENSINO_FUNDAMENTAL',fonte:'Cadastro revisado'}],[
  {professor:'Miria',disciplina:'Matemática',turma:'6A'},
  {professor:'Miria',disciplina:'Matemática',turma:'6A'},
  {professor:'Miria',disciplina:'Matemática',turma:'6B'},
  {professor:'Outra',disciplina:'Artes',turma:'7A'}]);
 assert.ok(identificarTopicos('O que a Miria ensina?').includes('professores'));
 const result=await consultarProfessores('O que a Miria ensina?',db);
 assert.equal(result.total,1);assert.equal(result.registros[0].origens.length,2);
 assert.deepEqual(result.registros[0].origens[1].turmas,['6A','6B']);
 assert.doesNotMatch(formatarConteudos(result),/Fonte:|Cadastro revisado/);assert.match(formatarConteudos(result),/6A, 6B/);
});
test('grade responde mesmo quando não há cadastro publicado',async t=>{
 const db=await bancoDeTeste(t,[],[{professor:'Jefferson',disciplina:'PB',turma:'3ºC (DS)'}]);
 const result=await consultarProfessores('Quais disciplinas o professor Jefferson leciona?',db);
 assert.equal(result.total,1);assert.equal(result.registros[0].disciplina,'PB');
 assert.match(formatarConteudos(result),/Período da tarde/);
});
test('não atribui manhã nem etapa à grade da tarde por suposição',async t=>{
 const db=await bancoDeTeste(t,[],[{professor:'Jefferson',disciplina:'PB',turma:'3ºC (DS)'}]);
 for(const pergunta of ['Quais professores na manhã?','Quais professores do ensino médio?']){
  const result=await consultarProfessores(pergunta,db);assert.equal(result.total,0);assert.ok(result.avisos.length);
 }
});

test('nome alternativo Alessandra encontra Ale nos horários',async t=>{
 const db=await bancoDeTeste(t,[],[{professor:'Ale',disciplina:'Português',turma:'6A'}]);
 const result=await consultarProfessores('Quais disciplinas a professora Alessandra leciona?',db);
 assert.equal(result.total,1);assert.equal(result.registros[0].professor,'Ale');
});
