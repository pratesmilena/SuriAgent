const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { interpretar, criarPerguntaEscola } = require('../escola');
const { consultarHorarios, consultarLocalizacao } = require('../supabase');

async function listen(t, app) {
    const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
    return `http://127.0.0.1:${server.address().port}`;
}
async function ask(t, pergunta, deps={}) {
    const app=express();app.use(express.json());app.post('/perguntar',criarPerguntaEscola({localizar:async()=>null,env:{},...deps}));
    const url=await listen(t,app);const response=await fetch(url+'/perguntar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pergunta})});
    return {status:response.status,body:await response.json()};
}

test('pergunta de localização retorna endereço confirmado, sem fingir acesso ao banco', async t=>{
    const r=await ask(t,'Onde fica a escola?');assert.equal(r.status,200);assert.match(r.body.solucao,/810/);assert.match(r.body.solucao,/Itaim Paulista/);assert.match(r.body.solucao,/ainda não foi validada/);assert.equal(r.body.origemLocalizacao,'configuracao-confirmada');
});
test('localização consultada distingue a fonte Supabase',async t=>{
    const r=await ask(t,'Qual é a localização da escola?',{localizar:async()=>({endereco:'Endereço do teste',fonte:'Tabela conhecimentos (simulada)',origem:'supabase-conhecimentos'})});assert.match(r.body.solucao,/Endereço do teste/);assert.equal(r.body.origemLocalizacao,'supabase-conhecimentos');assert.doesNotMatch(r.body.solucao,/ainda não foi validada/);
});
test('indisponibilidade de conhecimentos usa endereço confirmado com origem explícita',async t=>{
    const r=await ask(t,'Como chegar na escola?',{localizar:async()=>{throw new Error('interno');}});assert.equal(r.status,200);assert.equal(r.body.origemLocalizacao,'configuracao-confirmada');assert.doesNotMatch(r.body.solucao,/interno/);
});
test('aulas da turma por dia passam filtros corretos ao banco',async t=>{
    const r=await ask(t,'Quais são as aulas do 3ºC (DS) na terça-feira?',{consultar:async(turma,dia)=>{assert.equal(turma,'3ºC (DS)');assert.equal(dia,'TERÇA');return [{numero_aula:1,horario_inicio:'14:20',disciplina:'Disciplina de teste',professor:'Docente de teste'}];}});
    assert.equal(r.status,200);assert.match(r.body.solucao,/14:20/);assert.match(r.body.solucao,/Disciplina de teste/);
});
test('segunda aula não é confundida com segunda-feira',async t=>{
    const r=await ask(t,'Qual é a segunda aula do 3ºC (DS) na sexta?',{consultar:async(turma,dia)=>{assert.equal(dia,'SEXTA');return [{numero_aula:1,disciplina:'Não selecionada'},{numero_aula:2,disciplina:'Selecionada'}];}});assert.equal(r.body.aulas.length,1);assert.equal(r.body.aulas[0].numero_aula,2);assert.doesNotMatch(r.body.solucao,/Não selecionada/);
});
test('turma ou dia ambíguos pedem esclarecimento sem chamar o banco',async t=>{
    for(const pergunta of ['Quais são as aulas?','Aulas do 3ºC na segunda e sexta','Aulas do 2ºA e do 3ºC na sexta']){
        const r=await ask(t,pergunta,{consultar:()=>assert.fail('Não deve consultar')});assert.equal(r.status,200);assert.match(r.body.solucao,/Informe uma turma/);
    }
});
test('lista vazia não inventa aulas e explica a possível restrição',async t=>{
    const r=await ask(t,'Horários do 3ºC (DS) na sexta',{consultar:async()=>[]});assert.match(r.body.solucao,/Não encontrei/);assert.match(r.body.solucao,/restrição de acesso/);
});
test('Supabase sem chave gera 503 sem repassar a pergunta a uma IA',async t=>{
    const r=await ask(t,'Aulas do 3ºC (DS) na sexta',{consultar:async()=>{throw Object.assign(new Error('segredo'),{status:503});}});assert.equal(r.status,503);assert.equal(r.body.handled,true);assert.doesNotMatch(r.body.erro,/segredo/);
});
test('dúvida de programação segue ao provedor e pergunta inválida retorna 400',async t=>{
    const r=await ask(t,'Explique uma Promise');assert.deepEqual(r.body,{handled:false});assert.equal((await ask(t,'')).status,400);assert.equal(interpretar('1ª aula do 3ºC na sexta').turmas.length,1);
});
test('SDK Supabase real integra com HTTP de teste e serializa filtros e ordenação',async t=>{
    const upstream=express();let called=0;
    upstream.get('/rest/v1/horario_aulatarde',(req,res)=>{called++;assert.equal(req.query.turma,'eq.3ºC (DS)');assert.equal(req.query.dia_semana,'eq.SEXTA');assert.equal(req.query.order,'numero_aula.asc');res.json([{numero_aula:1,disciplina:'Dado simulado'}]);});
    const url=await listen(t,upstream);const client=createClient(url,'chave-somente-teste',{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await ask(t,'Aulas do 3ºC (DS) na sexta',{consultar:(turma,dia)=>consultarHorarios(turma,dia,client)});assert.equal(result.status,200);assert.equal(called,1);assert.match(result.body.solucao,/Dado simulado/);
});
test('conhecimentos usa somente colunas e assunto explicitamente mapeados',async t=>{
    const upstream=express();upstream.get('/rest/v1/conhecimentos',(req,res)=>{assert.equal(req.query.select,'assunto,resposta');assert.equal(req.query.assunto,'eq.endereco');assert.equal(req.query.limit,'2');res.json([{assunto:'endereco',resposta:'Endereço simulado'}]);});
    const client=createClient(await listen(t,upstream),'chave-somente-teste',{auth:{persistSession:false,autoRefreshToken:false}});
    const env={CONHECIMENTOS_ASSUNTO_COLUNA:'assunto',CONHECIMENTOS_RESPOSTA_COLUNA:'resposta',CONHECIMENTOS_LOCALIZACAO_ASSUNTO:'endereco'};
    assert.equal((await consultarLocalizacao(env,client)).origem,'supabase-conhecimentos');
    await assert.rejects(consultarLocalizacao({...env,CONHECIMENTOS_ASSUNTO_COLUNA:'*'},client));
});

test('esquema confirmado na imagem consulta somente id e conteudo do registro 4',async t=>{
    const upstream=express();let calls=0;upstream.get('/rest/v1/conhecimentos',(req,res)=>{calls++;assert.equal(req.query.select,'id,conteudo');assert.equal(req.query.id,'eq.4');res.json([{id:4,conteudo:'ANTONIO JOAO DE MEDEIROS, 810 - ITAIM PAULISTA, São Paulo - SP'}]);});
    const client=createClient(await listen(t,upstream),'chave-somente-teste',{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await consultarLocalizacao({},client);assert.equal(result.origem,'supabase-conhecimentos');assert.match(result.endereco,/810/);assert.equal(calls,1);
});

test('recusa de leitura no banco é distinguida de chave ausente no chat',async t=>{
    const r=await ask(t,'Aulas do 3ºC (DS) na sexta',{consultar:async()=>{throw Object.assign(new Error('detalhes internos'),{code:'42501'});}});
    assert.equal(r.status,503);assert.equal(r.body.codigo,'LEITURA_ESCOLAR_NAO_AUTORIZADA');assert.match(r.body.erro,/permissão/);assert.doesNotMatch(r.body.erro,/internos/);
});
