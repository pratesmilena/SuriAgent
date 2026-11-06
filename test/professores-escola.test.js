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
