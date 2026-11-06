const {test}=require('node:test');const assert=require('node:assert/strict');
const {diagnosticoConfiguracao,lerConfiguracao}=require('../configuracao-supabase');
const {createApp}=require('../app');
test('diagnóstico diferencia variável ausente de URL inválida sem mostrar valores',()=>{
 const semChave=diagnosticoConfiguracao({SUPABASE_URL:'https://example.supabase.co'});assert.equal(semChave.urlValida,true);assert.equal(semChave.chaveConfigurada,false);
 const invalida=diagnosticoConfiguracao({SUPABASE_URL:'https://supabase.com/dashboard/project/test',SUPABASE_PUBLISHABLE_KEY:'test-secret'});assert.equal(invalida.urlConfigurada,true);assert.equal(invalida.urlValida,false);assert.ok(!JSON.stringify(invalida).includes('test-secret'));
});
test('configuração aceita espaços externos e recusa campos vazios ou URL inadequada',()=>{
 assert.deepEqual(lerConfiguracao({SUPABASE_URL:' https://example.supabase.co/ \n',SUPABASE_PUBLISHABLE_KEY:' test-key \n'}),{url:'https://example.supabase.co',key:'test-key'});
 assert.throws(()=>lerConfiguracao({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:' '}),{status:503});
 assert.throws(()=>lerConfiguracao({SUPABASE_URL:'"https://example.supabase.co"',SUPABASE_PUBLISHABLE_KEY:'key'}),{code:'SUPABASE_URL_INVALIDA'});
});
test('status HTTP informa apenas configuração e revisão sem expor credenciais',async t=>{
 const server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const r=await fetch(`http://127.0.0.1:${server.address().port}/api/status`);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const data=await r.json();assert.equal(data.ambiente,'local');assert.equal(typeof data.supabase.chaveConfigurada,'boolean');assert.equal(typeof data.login.configuracaoPublicaValida,'boolean');assert.ok(!('publishableKey' in data));assert.ok(!('url' in data.supabase));
});
