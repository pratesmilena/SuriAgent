const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const {handler}=require('../netlify/functions/api');
function event(path,method='GET',body){return {httpMethod:method,path,headers:{'content-type':'application/json','x-nf-client-connection-ip':'192.0.2.10'},queryStringParameters:null,body:body?JSON.stringify(body):null,isBase64Encoded:false,requestContext:{}};}
test('função Netlify atende API e URL direta sem inicializar SQLite',async()=>{
 for(const path of ['/api/escola','/.netlify/functions/api/escola']){const r=await handler(event(path),{});assert.equal(r.statusCode,200);assert.match(JSON.parse(r.body).nome,/Suriname/);}
 assert.ok(!Object.keys(require.cache).some(p=>p.endsWith('/database.js')||p.includes('/node_modules/sqlite3/')));
});
test('função preserva JSON, validação e não inventa persistência de templates',async()=>{
 let r=await handler(event('/api/escola/perguntar','POST',{pergunta:'Onde fica a escola?'}),{});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).handled,true);
 r=await handler(event('/api/horarios'),{});assert.equal(r.statusCode,400);
 for(const method of ['GET','POST']){r=await handler(event('/api/templates',method,{}),{});assert.equal(r.statusCode,503);assert.match(JSON.parse(r.body).erro,/não está disponível/);}
});
test('origem do cliente é separada por IP de plataforma no limitador',async()=>{
 // Cada IP tem seu próprio orçamento dentro desta instância da função.
 for(let i=0;i<61;i++) {const e=event('/api/escola');e.headers['x-nf-client-connection-ip']='192.0.2.20';const r=await handler(e,{});if(i===60)assert.equal(r.statusCode,429);}
 const e=event('/api/escola');e.headers['x-nf-client-connection-ip']='192.0.2.21';assert.equal((await handler(e,{})).statusCode,200);
});
test('saída estática contém Plasma e dependências locais, sem .env ou banco',async()=>{
 require('node:child_process').execFileSync(process.execPath,['scripts/build-netlify.js'],{stdio:'pipe'});
 for(const file of ['dist/index.html','dist/generated/gradient.js','dist/vendor/bootstrap.min.css','dist/vendor/bootstrap.bundle.min.js','dist/vendor/marked.umd.js','dist/vendor/purify.min.js','dist/vendor/supabase.js'])assert.ok((await fs.stat(file)).size>100);
 for(const file of ['dist/.env','dist/banco.db','dist/server.js'])await assert.rejects(fs.access(file));
});
