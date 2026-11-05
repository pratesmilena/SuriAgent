const { test } = require('node:test');
const assert = require('node:assert/strict');
const { publicAuthConfig, authConfig } = require('../auth-config');
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
test('expõe somente URL e chave publicável para autenticação', () => {
    assert.deepEqual(publicAuthConfig({ ...env, GEMINI_API_KEY: 'segredo', GROQ_API_KEY: 'segredo' }), { available: true, url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY });
});
test('sem configuração o modo visitante permanece disponível', () => {
    assert.equal(publicAuthConfig({}).available, false);
    assert.match(publicAuthConfig({}).message, /visitante/);
});
test('recusa chaves administrativas e placeholders de proxy no navegador', () => {
    for (const key of ['sb_secret_test', 'proxy-placeholder', 'service_role']) assert.equal(publicAuthConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: key }).available, false);
    const jwt = 'header.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.sig';
    assert.equal(publicAuthConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: jwt }).available, false);
});
test('aceita a chave anon legada e chave pública específica do navegador', () => {
    const jwt = 'header.' + Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') + '.sig';
    assert.equal(publicAuthConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: jwt }).available, true);
    assert.equal(publicAuthConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: 'placeholder', SUPABASE_AUTH_PUBLISHABLE_KEY: 'sb_publishable_browser' }).publishableKey, 'sb_publishable_browser');
});
test('recusa URLs inseguras ou contendo credenciais', () => {
    for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com?key=private']) assert.equal(publicAuthConfig({ ...env, SUPABASE_URL: url }).available, false);
});
test('detecta se o Google está habilitado sem revelar erro remoto', async () => {
    for (const enabled of [true, false]) {
        const config = await authConfig(env, async (url, options) => {
            assert.equal(url, env.SUPABASE_URL + '/auth/v1/settings');
            assert.equal(options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
            return { ok: true, json: async () => ({ external: { google: enabled } }) };
        });
        assert.equal(config.googleEnabled, enabled);
    }
});
test('falha do serviço de autenticação não interrompe a configuração de visitante', async () => {
    const config = await authConfig(env, async () => { throw new Error('Detalhes privados'); });
    assert.equal(config.available, true); assert.equal(config.googleEnabled, null);
    assert.ok(!JSON.stringify(config).includes('privados'));
});
