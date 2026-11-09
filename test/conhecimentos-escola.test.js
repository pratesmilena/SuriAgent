const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { consultarConteudos } = require('../conteudos-escola');
async function banco(t, rows) {
 const app=express();app.get('/rest/v1/:table',(req,res)=>{
  if(req.params.table!=='conhecimentos') return res.status(404).json({code:'PGRST205'});
  assert.equal(req.query.select,'id,categoria,titulo,conteudo,palavras_chave');res.json(rows);
 });
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r)}));
 return createClient(`http://127.0.0.1:${server.address().port}`,'test-only',{auth:{persistSession:false}});
}
test('usa tabela existente quando as tabelas propostas não existem',async t=>{
 const db=await banco(t,[{id:9,categoria:'FAQ',titulo:'Etapas',conteudo:'Ensino Fundamental e Médio'}, {id:6,categoria:'Infraestrutura',titulo:'Estrutura',conteudo:'Quadra'}]);
 const cursos=await consultarConteudos('cursos','Quais cursos?',db);
 assert.equal(cursos.registros.length,1);assert.match(cursos.registros[0].conteudo,/Fundamental/);
 const espacos=await consultarConteudos('espacos','Tem quadra?',db);assert.equal(espacos.registros[0].id,6);
 for(const topico of ['historia','projetos','eventos'])assert.equal((await consultarConteudos(topico,'',db)).registros.length,0);
});
test('FAQ filtra a pergunta e não inventa registros bloqueados por RLS',async t=>{
 const db=await banco(t,[{id:4,categoria:'Contato e Endereço',titulo:'Contato',conteudo:'Telefone'}, {id:12,categoria:'FAQ',titulo:'IDEB',conteudo:'IDEB 2023'}]);
 assert.deepEqual((await consultarConteudos('faq','Qual o IDEB?',db)).registros.map(r=>r.id),[12]);
 const limitado=await banco(t,[{id:4,categoria:'Contato e Endereço',titulo:'Contato',conteudo:'Telefone'}]);
 assert.equal((await consultarConteudos('cursos','',limitado)).registros.length,0);
});

test('resposta de cursos é sucinta e inclui os itinerários informados sem censo e horários',async t=>{
 const db=await banco(t,[{id:1,categoria:'Informações Gerais',conteudo:'649 matrículas'}, {id:3,categoria:'Informações Gerais',conteudo:'400 matrículas'}, {id:9,categoria:'FAQ',conteudo:'Ensino Fundamental e Médio'}, {id:13,categoria:'Grade Horária',conteudo:'Dois turnos às 07:00'}]);
 const result=await consultarConteudos('cursos','Quais cursos a escola oferece?',db);
 const texto=require('../conteudos-escola').formatarConteudos(result);
 assert.equal(result.registros.length,1);
 for(const trecho of ['6º ao 9º','1ª a 3ª','Linguagens / Humanas','Exatas / Natureza','Técnico em Desenvolvimento de Sistemas','2º ano'])assert.ok(texto.includes(trecho));
 assert.doesNotMatch(texto,/matrículas|07:00|horarios_aulas|Resumo da Escola/);
 assert.equal((texto.match(/Cursos oferecidos/g)||[]).length,1);
 assert.doesNotMatch(texto,/Fonte:|responsável/);assert.match(result.registros[0].fonte,/responsável/);
});
