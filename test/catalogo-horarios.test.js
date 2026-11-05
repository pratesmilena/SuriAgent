const {test}=require('node:test');const assert=require('node:assert/strict');
const {montarCatalogo,escolherTurma}=require('../catalogo-horarios');
const {consultarHorarios,listarCatalogoHorarios}=require('../supabase');
const {interpretar,criarPerguntaEscola}=require('../escola');

test('catálogo deduplica turmas e ordena dias de segunda a sexta',()=>{
 const result=montarCatalogo([{turma:'3ºC (DS)',dia_semana:'SEXTA'},{turma:'1ºA',dia_semana:'TERÇA'},{turma:'1ºA',dia_semana:'SEGUNDA'},{turma:'1ºA',dia_semana:'SEGUNDA'}]);
 assert.deepEqual(result.turmas,[{nome:'1ºA',dias:['SEGUNDA','TERÇA']},{nome:'3ºC (DS)',dias:['SEXTA']}]);
});
test('apelidos só são resolvidos quando há uma única turma correspondente',()=>{
 assert.equal(escolherTurma('3C',['1ºA','3ºC (DS)']),'3ºC (DS)');
 assert.equal(escolherTurma('3ºC (DS)',['3ºC (DS)','3ºC (ADM)']),'3ºC (DS)');
 assert.equal(escolherTurma('3C',['3ºC (DS)','3ºC (ADM)']),null);
 assert.equal(escolherTurma('3ºC (ADM)',['3ºC (DS)']),null);
});
test('catálogo continua após mil registros sem truncar turmas',async()=>{
 const ranges=[];const source={from(){return this;},select(){return this;},order(){return this;},range(a,b){ranges.push([a,b]);return this;},abortSignal(){return Promise.resolve({data:ranges.length===1?Array.from({length:1000},()=>({turma:'1ºA',dia_semana:'SEGUNDA'})):[{turma:'3ºC (DS)',dia_semana:'SEXTA'}],error:null});}};
 const result=await listarCatalogoHorarios(source);assert.equal(result.turmas.length,2);assert.deepEqual(ranges,[[0,999],[1000,1999]]);
});
test('semana completa usa filtro de dias e ordenação cronológica',async()=>{
 const source={from(){return this;},select(){return this;},eq(k,v){assert.equal(k,'turma');return this;},in(k,v){assert.equal(k,'dia_semana');assert.deepEqual(v,['SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA']);return this;},order(){return this;},abortSignal(){return Promise.resolve({data:[{dia_semana:'SEXTA',numero_aula:1},{dia_semana:'SEGUNDA',numero_aula:2},{dia_semana:'SEGUNDA',numero_aula:1}],error:null});}};
 const rows=await consultarHorarios('1ºA','SEMANA',source);assert.deepEqual(rows.map(x=>[x.dia_semana,x.numero_aula]),[['SEGUNDA',1],['SEGUNDA',2],['SEXTA',1]]);
});
test('consulta vazia resolve apelido com catálogo e busca a turma real',async()=>{
 let turma;let mode;let calls=0;
 const source={from(){calls++;return this;},select(s){mode=s.includes('horario_inicio')?'aulas':'catalogo';return this;},eq(k,v){if(k==='turma')turma=v;return this;},order(){return this;},range(){return this;},abortSignal(){return Promise.resolve({data:mode==='catalogo'?[{turma:'3ºC (DS)',dia_semana:'SEGUNDA'}]:turma==='3ºC (DS)'?[{turma,dia_semana:'SEGUNDA',numero_aula:1}]:[],error:null});}};
 const rows=await consultarHorarios('3C','SEGUNDA',source);assert.equal(rows[0].turma,'3ºC (DS)');assert.equal(calls,3);
});
test('chat reconhece semana completa e lista das turmas',async()=>{
 assert.deepEqual(interpretar('Aulas do 3C de segunda a sexta').dias,['SEMANA']);
 assert.deepEqual(interpretar('Aulas do 1A na semana completa').dias,['SEMANA']);
 assert.equal(interpretar('Quais são as turmas?').listaTurmas,true);
 let body;const res={json(x){body=x;return this;},status(){return this;}};
 await criarPerguntaEscola({listar:async()=>({turmas:[{nome:'1ºA'},{nome:'3ºC (DS)'}]})})({body:{pergunta:'Quais são as turmas?'}},res);assert.match(body.solucao,/1ºA, 3ºC \(DS\)/);
 await criarPerguntaEscola({consultar:async(turma,dia)=>{assert.equal(dia,'SEMANA');return [{turma:'3ºC (DS)',dia_semana:'SEGUNDA',numero_aula:1,disciplina:'Teste'}];}})({body:{pergunta:'Aulas do 3C na semana completa'}},res);assert.match(body.solucao,/SEGUNDA/);assert.match(body.solucao,/3ºC \(DS\)/);
});
