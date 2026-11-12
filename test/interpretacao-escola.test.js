const {test}=require('node:test');const assert=require('node:assert/strict');
const{interpretarPerguntaEscola,carregarContexto,validarPlano}=require('../interpretacao-escola');
const{criarPerguntaEscola}=require('../escola');
const env={SURI_GEMINI:'private-test-only'};
const contexto={documentos:[{id:17,categoria:'Gestão',titulo:'Gestores',conteudo:'Diretora: Elaine.\n\nVice-diretor: Paulo.'},{id:16,categoria:'Eventos',titulo:'Calendário',conteudo:'Festa Junina em junho.'}],catalogo:{turmas:[{nome:'3ºC (DS)',dias:['SEXTA']},{nome:'1ºA',dias:['SEGUNDA']}]},professores:['ALE','PEDRO','ALICE / LUIZ'],disciplinas:['MAT','ELETIVA']};
async function plano(pergunta,result){return interpretarPerguntaEscola(pergunta,{env,carregar:async()=>contexto,generate:async args=>{
 assert.equal(args.provider,'gemini');assert.equal(args.jsonOutput,true);assert.equal(args.timeoutMs,8000);assert.ok(!args.message.includes(env.SURI_GEMINI));return{solucao:JSON.stringify(result)};
},agora:new Date('2026-11-11T15:00:00Z')});}
test('interpretação aceita sinônimos com seleção limitada aos registros recuperados',async()=>{
 const r=await plano('quem toma conta desse colégio?',{tipo:'conhecimentos',indices:[0],confianca:0.95,resposta:'Texto inventado pelo modelo'});
 assert.equal(r.resultado.registros[0].id,17);assert.equal(r.resultado.registros[0].conteudo,contexto.documentos[0].conteudo);assert.ok(!JSON.stringify(r).includes('Texto inventado'));
});
test('sem credencial não carrega contexto nem chama o Gemini',async()=>{
 assert.equal(await interpretarPerguntaEscola('Quem cuida daqui?',{env:{},carregar:()=>assert.fail(),generate:()=>assert.fail()}),null);
});
test('falha do Gemini, recusa do banco e JSON inválido permitem manter o fluxo existente',async()=>{
 for(const options of [{carregar:async()=>{throw Error('permissão')}},{generate:async()=>{throw Error('cota')}},{generate:async()=>({solucao:'Texto livre sem JSON'})}])
 assert.equal(await interpretarPerguntaEscola('Quem cuida daqui?',{env,carregar:async()=>contexto,generate:async()=>({solucao:'{}'}),...options}),null);
});
test('índices ausentes e planos SQL não podem definir consultas ou respostas',()=>{
 for(const p of [null,{},[],{tipo:'turmas',confianca:'1'},{tipo:'sql',sql:'DELETE FROM conhecimentos',confianca:1},{tipo:'conhecimentos',indices:[999],confianca:1},{tipo:'conhecimentos',indices:['0'],confianca:1}])assert.equal(validarPlano(p,contexto),null);
 assert.deepEqual(validarPlano({tipo:'conhecimentos',indices:[0],confianca:0.2},contexto),{tipo:'esclarecer',alvo:'assunto'});
});
test('horários aceitam somente turma e dia reais e número de aula válido',async()=>{
 assert.deepEqual(await plano('o que rola no terceirão c na sexta?',{tipo:'horarios',turma:'3C',dia:'SEXTA',numeroAula:2,confianca:0.9}),{tipo:'horarios',turma:'3ºC (DS)',dia:'SEXTA',numeroAula:2});
 for(const[p,alvo]of [[{turma:'9Z',dia:'SEXTA'},'turma'],[{turma:'1ºA',dia:'DOMINGO'},'dia'],[{turma:'1ºA',dia:'SEGUNDA',numeroAula:-1},'aula']])
 assert.equal(validarPlano({tipo:'horarios',confianca:0.95,...p},contexto).alvo,alvo);
});
test('docentes e matérias são validados no catálogo, com Ale/Alessandra',()=>{
 assert.deepEqual(validarPlano({tipo:'professores',nome:'Alessandra',disciplina:'MAT',turma:'1A',confianca:1},contexto),{tipo:'professores',busca:'ale MAT',turma:'1ºA'});
 assert.equal(validarPlano({tipo:'professores',nome:'Pessoa inexistente',confianca:1},contexto).tipo,'sem_informacao');
 assert.equal(validarPlano({tipo:'professores',disciplina:'Matéria inventada',confianca:1},contexto).tipo,'sem_informacao');
});
test('o contexto contém somente dados legíveis e elimina manhã e totais sem turno',async()=>{
 const source={from(table){assert.ok(['conhecimentos','horario_aulatarde'].includes(table));return{select(cols){assert.ok(!cols.includes('*'));return this},order(){return this},range(){return this},async abortSignal(){return{error:null,data:table==='conhecimentos'?[{id:2,conteudo:'649 matrículas'},{id:17,categoria:'Gestão',conteudo:'Elaine, Paulo e Rita.'},{id:88,categoria:'Turnos',conteudo:'Manhã: 07:00.'}]:[{turma:'1ºA',dia_semana:'SEGUNDA',professor:'PEDRO',disciplina:'MAT'}]}}}}};
 const r=await carregarContexto(source);assert.deepEqual(r.documentos.map(r=>r.id),[17]);assert.deepEqual(r.professores,['PEDRO']);assert.equal(r.catalogo.turmas[0].nome,'1ºA');
});
async function perguntar(pergunta,interpretacao,deps={}){let body;await criarPerguntaEscola({interpretacao,...deps})({body:{pergunta}},{status(s){this.code=s;return this},json(x){body={status:this.code||200,...x};return this}});return body;}
test('roteamento semântico encontra conhecimentos sem palavra escola e preserva o conteúdo',async()=>{
 const r=await perguntar('quem toma conta daqui?',async()=>({tipo:'conhecimentos',resultado:{origem:'conhecimentos',status:'disponivel',registros:[contexto.documentos[0]]}}),{elaborar:async()=>null});
 assert.equal(r.solucao,contexto.documentos[0].conteudo);
});
test('horário interpretado consulta a função existente e não usa texto livre do Gemini',async()=>{
 const r=await perguntar('o q rola no terceirão c qdo sextar?',async()=>({tipo:'horarios',turma:'3ºC (DS)',dia:'SEXTA',numeroAula:2}),{consultar:async(turma,dia)=>{assert.equal(turma,'3ºC (DS)');assert.equal(dia,'SEXTA');return[{turma,numero_aula:2,disciplina:'PB',professor:'JEFFERSON'}]}});
 assert.match(r.solucao,/JEFFERSON/);assert.equal(r.aulas.length,1);
});
test('interpretação pode direcionar turmas, eletivas, professores e localização',async()=>{
 const turmas=await perguntar('quais salas posso escolher?',async()=>({tipo:'turmas'}),{listar:async()=>({turmas:[{nome:'1ºA'}]})});assert.match(turmas.solucao,/1ºA/);
 const eletivas=await perguntar('tem matéria opcional?',async()=>({tipo:'eletivas',turma:'1ºA'}),{eletivas:async()=>({registros:[{professor:'PEDRO',origens:[{turmas:['1ºA']}]}]})});assert.match(eletivas.solucao,/PEDRO/);
 const professores=await perguntar('quem ensina essa matéria?',async()=>({tipo:'professores',busca:'PEDRO',turma:'1ºA'}),{conteudos:async(topico,busca)=>{assert.equal(topico,'professores');assert.equal(busca,'PEDRO');return{topico:'professores',status:'disponivel',registros:[{professor:'PEDRO',disciplina:'MAT',origens:[{tipo:'horarios',turmas:['1ºA']}]}],total:1}}});assert.match(professores.solucao,/PEDRO/);
 const local=await perguntar('em qual rua é o colégio?',async()=>({tipo:'localizacao'}),{localizar:async()=>({endereco:'Endereço cadastrado',origem:'supabase-conhecimentos'})});assert.equal(local.solucao,'Endereço cadastrado');
});
test('manhã implícita, ambiguidade e ausência de dados não geram respostas inventadas',async()=>{
 const manha=await perguntar('quero informações do primeiro turno',async()=>({tipo:'manha'}));assert.match(manha.solucao,/manhã ainda não estão disponíveis/);
 const incompleto=await perguntar('e a minha?',async()=>({tipo:'esclarecer',alvo:'assunto',resposta:'Resposta falsa'}));assert.match(incompleto.solucao,/explicar um pouco melhor/);assert.doesNotMatch(incompleto.solucao,/falsa/);
 const ausente=await perguntar('qual o telefone pessoal da diretora?',async()=>({tipo:'sem_informacao'}));assert.match(ausente.solucao,/Não encontrei essa informação/);
});
test('perguntas exatas e manhã explícita não consomem uma chamada de interpretação',async()=>{
 const fail=()=>assert.fail('Não deve classificar pergunta exata');
 await perguntar('Onde fica a escola?',fail,{localizar:async()=>null});
 await perguntar('Quais são as aulas do 3C na sexta?',fail,{consultar:async()=>[]});
 await perguntar('Quais são as aulas da manhã?',fail);
 const geral=await perguntar('Explique Promise em JavaScript',async()=>({tipo:'fora_escopo'}));assert.equal(geral.handled,false);
});
