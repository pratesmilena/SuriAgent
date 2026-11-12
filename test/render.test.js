const {test}=require('node:test');const assert=require('node:assert/strict');const {createApp}=require('../app');
async function servidor(t){const app=createApp({platform:'render'});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r)}));return{app,url:`http://127.0.0.1:${server.address().port}`};}
test('Render serve interface, assets e API no mesmo servidor',async t=>{
 const{url}=await servidor(t);
 for(const route of ['/','/vendor/bootstrap.min.css','/vendor/bootstrap.bundle.min.js','/app.js'])assert.equal((await fetch(url+route)).status,200,route);
 const health=await fetch(url+'/healthz');assert.deepEqual(await health.json(),{status:'ok'});
 const school=await fetch(url+'/api/escola');assert.match((await school.json()).nome,/Suriname/);
 const faq=await fetch(url+'/api/escola/perguntas-frequentes');assert.equal((await faq.json()).perguntas.length,8);
});
test('Render não oferece escrita em SQLite efêmero',async t=>{
 const{url}=await servidor(t);for(const method of ['GET','POST']){const r=await fetch(url+'/api/templates',{method,headers:{'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});assert.equal(r.status,503);}
 assert.ok(!Object.keys(require.cache).some(p=>p.endsWith('/database.js')));
});
test('proxy Render confia somente no salto mais próximo e não no primeiro IP forjado',async t=>{
 const{app,url}=await servidor(t);assert.equal(app.get('trust proxy'),1);app.get('/test-ip',(req,res)=>res.json({ip:req.ip}));
 const r=await fetch(url+'/test-ip',{headers:{'X-Forwarded-For':'198.51.100.99, 192.0.2.7'}});assert.equal((await r.json()).ip,'192.0.2.7');
});
