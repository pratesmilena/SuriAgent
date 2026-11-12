const {test}=require('node:test');const assert=require('node:assert/strict');const{verificarConfiguracaoLocal}=require('../configuracao-local');
const completo={SUPABASE_URL:'https://school.example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_public-test-only',SURI_GEMINI:'private-test-only',AI_PROVIDER:'gemini'};
test('configuração local indica os requisitos sem imprimir valores das credenciais',()=>{
 const r=verificarConfiguracaoLocal(completo,'24.11.1');assert.equal(r.prontaParaTestar,true);assert.equal(r.geminiConfigurado,true);assert.equal(r.loginConfigurado,true);assert.ok(!JSON.stringify(r).includes('private-test-only'));assert.ok(!JSON.stringify(r).includes('public-test-only'));
});
test('ausência da chave Gemini não é confundida com configuração completa',()=>{
 const r=verificarConfiguracaoLocal({...completo,SURI_GEMINI:''},'24.11.1');assert.equal(r.supabaseConfigurado,true);assert.equal(r.geminiConfigurado,false);assert.equal(r.prontaParaTestar,false);
});
test('URL inválida, chave administrativa e Node incompatível são detectados',()=>{
 assert.equal(verificarConfiguracaoLocal({...completo,SUPABASE_URL:'http://localhost'},'24.1.0').prontaParaTestar,false);
 assert.equal(verificarConfiguracaoLocal({...completo,SUPABASE_PUBLISHABLE_KEY:'sb_secret_do-not-publish'},'24.1.0').loginConfigurado,false);
 assert.equal(verificarConfiguracaoLocal(completo,'20.1.0').prontaParaTestar,false);
});
test('nome anterior da chave continua aceito e provedor inválido impede validação completa',()=>{
 assert.equal(verificarConfiguracaoLocal({...completo,SURI_GEMINI:'',GEMINI_API_KEY:'legacy-test-only'},'24.1.0').prontaParaTestar,true);
 assert.equal(verificarConfiguracaoLocal({...completo,AI_PROVIDER:'puter'},'24.1.0').prontaParaTestar,false);
});
