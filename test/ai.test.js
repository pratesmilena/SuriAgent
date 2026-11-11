const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { generateAnswer, publicConfig, criarDiagnostico } = require('../ai');
const { puterText } = require('../public/ai-client');

for (const [provider, key] of [['gemini','GEMINI_API_KEY'],['groq','GROQ_API_KEY'],['openrouter','OPENROUTER_API_KEY']]) {
    test(`${provider}: contrato HTTP e resposta normalizada (simulado)`, async () => {
        let calls = 0;
        const result = await generateAnswer({ provider, message: 'Explique Promise.', env: { [key]: 'test-key' }, fetchImpl: async (url, options) => {
            calls++;
            const host = new URL(url).hostname;
            assert.equal(host, {gemini:'generativelanguage.googleapis.com',groq:'api.groq.com',openrouter:'openrouter.ai'}[provider]);
            assert.equal(options.method,'POST'); assert.ok(options.signal instanceof AbortSignal);
            assert.ok(!url.includes('test-key'));
            const payload=JSON.parse(options.body);
            if(provider==='gemini') { assert.equal(options.headers['x-goog-api-key'],'test-key'); assert.equal(payload.contents[0].parts[0].text,'Explique Promise.'); assert.match(payload.systemInstruction.parts[0].text,/Não invente/); }
            else { assert.equal(options.headers.Authorization,'Bearer test-key'); assert.equal(payload.messages[0].role,'system'); assert.equal(payload.messages[1].content,'Explique Promise.'); }
            return { ok:true, json:async()=>provider==='gemini' ? {candidates:[{content:{parts:[{thought:true,text:'interno'},{text:'Uma Promise representa um resultado futuro.'}]}}]} : {choices:[{message:{content:'Uma Promise representa um resultado futuro.'}}]} };
        }});
        assert.equal(calls,1); assert.equal(result.provider,provider); assert.equal(result.solucao,'Uma Promise representa um resultado futuro.');
    });
    test(`${provider}: sem chave não chama API`, async () => {
        await assert.rejects(generateAnswer({provider,message:'Oi',env:{},fetchImpl:()=>assert.fail('Não deve chamar API')}), {status:503});
    });
}

test('configuração pública não contém chaves nem aceita provedor herdado do protótipo', () => {
    const config=publicConfig({GROQ_API_KEY:'segredo',AI_PROVIDER:'toString'});
    assert.equal(config.defaultProvider,'gemini');
    assert.equal(config.providers.find(x=>x.id==='groq').available,true);
    assert.equal(config.providers.find(x=>x.id==='gemini').available,false);
    assert.ok(!JSON.stringify(config).includes('segredo'));
});

test('modelo pode ser configurado por ambiente', async () => {
    const r=await generateAnswer({provider:'groq',message:'Oi',env:{GROQ_API_KEY:'test',GROQ_MODEL:'modelo-configurado'},fetchImpl:async(url,options)=>{
        assert.equal(JSON.parse(options.body).model,'modelo-configurado');return {ok:true,json:async()=>({choices:[{message:{content:'Olá'}}]})};
    }});assert.equal(r.model,'modelo-configurado');
});

for (const [upstream, expected] of [[401,502],[403,502],[404,502],[429,429],[500,502]]) {
    test(`erro remoto ${upstream} é tratado sem expor corpo ou repetir requisição`, async()=>{
        let calls=0;await assert.rejects(generateAnswer({provider:'groq',message:'Oi',env:{GROQ_API_KEY:'secreto'},fetchImpl:async()=>{calls++;return {ok:false,status:upstream,json:()=>assert.fail('Não deve ler erro remoto')};}}),{status:expected});assert.equal(calls,1);
    });
}

test('falha de rede e resposta inválida são identificadas',async()=>{
    const args={provider:'groq',message:'Oi',env:{GROQ_API_KEY:'test'}};
    await assert.rejects(generateAnswer({...args,fetchImpl:async()=>{throw new Error('Bearer secreto')}}),{status:504});
    await assert.rejects(generateAnswer({...args,fetchImpl:async()=>({ok:true,json:async()=>{throw new Error('JSON')}})}),{status:502});
    await assert.rejects(generateAnswer({...args,fetchImpl:async()=>({ok:true,json:async()=>({choices:[]})})}),{status:502});
});

test('Puter normaliza texto e blocos sem aceitar respostas vazias',()=>{
    assert.equal(puterText({message:{content:[{type:'text',text:'Olá'},{type:'image',text:'ignorar'}]}}),'Olá');
    assert.equal(puterText(' Oi '),'Oi');assert.throws(()=>puterText({message:{content:[]}}));
});

test('rota valida a mensagem e mantém a escolha de modelo no servidor',async t=>{
    const app=express();app.use(express.json());let calls=0;
    app.post('/api/diagnosticar',criarDiagnostico(async({provider,message})=>{calls++;assert.equal(message,'Oi');assert.equal(provider,undefined);return {solucao:'Olá',provider:'gemini',model:'teste'};}));
    const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
    const url=`http://127.0.0.1:${server.address().port}/api/diagnosticar`;
    for(const body of [{},{logErro:42},{logErro:' '},{logErro:'x'.repeat(10001)}]) {
        assert.equal((await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).status,400);
    }
    assert.equal(calls,0);
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({logErro:' Oi ',provider:'groq'})});
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{solucao:'Olá'});assert.equal(calls,1);
});

test('erro técnico do provedor não é exposto ao usuário do chat',async t=>{
    const app=express();app.use(express.json());app.post('/api/diagnosticar',criarDiagnostico(async()=>{throw Object.assign(new Error('GEMINI_API_KEY: detalhe interno do modelo'),{status:503});}));
    const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/diagnosticar`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({logErro:'Oi'})});assert.equal(response.status,503);const body=await response.json();assert.match(body.erro,/consultas escolares/);assert.doesNotMatch(body.erro,/GEMINI|modelo|API_KEY/);
});

test('elaboração escolar usa instruções próprias no Gemini sem enviar a chave no conteúdo',async()=>{
 const result=await generateAnswer({provider:'gemini',message:'{"documentos":[{"id":0,"conteudo":"Projeto de leitura"}]}',env:{GEMINI_API_KEY:'private-test-key'},systemPrompt:'Selecione somente índices dos documentos.',timeoutMs:8000,fetchImpl:async(url,options)=>{
  const body=JSON.parse(options.body);assert.equal(body.systemInstruction.parts[0].text,'Selecione somente índices dos documentos.');assert.ok(!options.body.includes('private-test-key'));assert.ok(!url.includes('private-test-key'));
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"trechos":[0]}'}]}}]})};
 }});assert.equal(result.solucao,'{"trechos":[0]}');
});
