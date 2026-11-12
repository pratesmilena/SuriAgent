const {test}=require('node:test');const assert=require('node:assert/strict');
const{buscarNaWeb}=require('../pesquisa-web-escola');const{criarPerguntaEscola}=require('../escola');
const env={SURI_GEMINI:'private-test-only'};
const identidade='A Escola Estadual República do Suriname fica no Itaim Paulista, São Paulo.';
function resposta(){return{solucao:identidade+' Texto não sustentado.',grounding:{groundingChunks:[{web:{uri:'https://www.educacao.sp.gov.br/exemplo',title:'Página institucional de teste'}}],groundingSupports:[{segment:{text:identidade},groundingChunkIndices:[0]}],searchEntryPoint:{renderedContent:'<div>Pesquisa Google de teste</div>'}}}}
test('busca Google só aceita segmentos com evidência e identifica a origem externa',async()=>{
 const r=await buscarNaWeb('Qual o site oficial da escola?',{env,generate:async args=>{assert.equal(args.provider,'gemini');assert.equal(args.webSearch,true);assert.equal(args.timeoutMs,8000);assert.ok(!args.message.includes(env.SURI_GEMINI));return resposta()}});
 assert.match(r.solucao,/pesquisa no Google, fora da base escolar/);assert.match(r.solucao,/educacao.sp.gov.br/);assert.doesNotMatch(r.solucao,/Texto não sustentado/);assert.equal(r.pesquisaGoogle.fontes.length,1);assert.match(r.pesquisaGoogle.renderedContent,/Pesquisa Google/);
});
test('sem chave, manhã ou dados privados não há pesquisa na internet',async()=>{
 const fail=()=>assert.fail('Não deve pesquisar');
 assert.equal(await buscarNaWeb('Qual o site da escola?',{env:{},generate:fail}),null);
 for(const p of ['Qual a coordenadora da manhã?','Qual o CPF da diretora?','Qual o telefone pessoal do professor?'])assert.equal(await buscarNaWeb(p,{env,generate:fail}),null);
});
test('sem citações, fonte insegura ou escola não confirmada não publica texto da IA',async()=>{
 for(const mutate of [r=>{r.grounding=null},r=>{r.grounding.groundingSupports=[]},r=>{r.grounding.groundingChunks[0].web.uri='javascript:alert(1)'},r=>{r.grounding.groundingSupports[0].segment.text='Uma escola de outra cidade'},r=>{r.solucao='NAO_CONFIRMADO'},r=>{r.grounding.groundingSupports[0].segment.text=identidade+' O turno da manhã começa às 07h.'}]){
  const raw=resposta();mutate(raw);assert.equal(await buscarNaWeb('Dados da escola?',{env,generate:async()=>raw}),null);
 }
 assert.equal(await buscarNaWeb('Dados da escola?',{env,generate:async()=>{throw Error('cota')}}),null);
});
async function perguntar(pergunta,deps){let body;await criarPerguntaEscola({env,interpretacao:async()=>null,...deps})({body:{pergunta}},{status(){return this},json(x){body=x;return this}});return body;}
test('Supabase tem prioridade e informação encontrada não causa busca Google',async()=>{
 const r=await perguntar('Quem cuida da gestão da escola?',{buscar:async()=>({origem:'conhecimentos',status:'disponivel',registros:[{conteudo:'Diretora: Elaine.'}]}),elaborar:async()=>null,pesquisar:()=>assert.fail('Dado está no banco')});assert.equal(r.solucao,'Diretora: Elaine.');
});
test('dado escolar ausente pode usar pesquisa, mas ambiguidade e manhã não',async()=>{
 const r=await perguntar('Qual o site oficial da escola?',{buscar:async()=>({registros:[]}),pesquisar:async()=>({solucao:'Informação encontrada em pesquisa no Google: página oficial.',pesquisaGoogle:{fontes:[]}})});assert.match(r.solucao,/Google/);assert.ok(r.pesquisaGoogle);
 const fail=()=>assert.fail('Não deve pesquisar');
 await perguntar('Quem trabalha de manhã?',{pesquisar:fail});
 const incompleto=await perguntar('E a minha?',{interpretacao:async()=>({tipo:'esclarecer',alvo:'turma'}),pesquisar:fail});assert.match(incompleto.solucao,/Qual é a sua turma/);
});
test('ausência reconhecida semanticamente e tópico sem cadastro também permitem fallback externo',async()=>{
 const pesquisar=async()=>({solucao:'Pesquisa Google confirmada.',pesquisaGoogle:{fontes:[]}});
 assert.match((await perguntar('Qual o email institucional?',{interpretacao:async()=>({tipo:'sem_informacao'}),pesquisar})).solucao,/Google/);
 assert.match((await perguntar('Quais projetos a escola desenvolve?',{conteudos:async()=>({topico:'projetos',status:'sem_conteudo_publicado',registros:[]}),pesquisar})).solucao,/Google/);
});
