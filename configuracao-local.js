const { diagnosticoConfiguracao } = require('./configuracao-supabase');
const { publicAuthConfig } = require('./auth-config');
const { geminiKey, PROVIDERS } = require('./ai');
function verificarConfiguracaoLocal(env = process.env, nodeVersion = process.versions.node) {
    const supabase = diagnosticoConfiguracao(env);
    const nodeCompativel = Number(nodeVersion.split('.')[0]) === 24;
    const geminiConfigurado = !!geminiKey(env);
    const provider = env.AI_PROVIDER?.trim() || 'gemini';
    const chatGeralConfigurado = Object.hasOwn(PROVIDERS, provider) && !PROVIDERS[provider].browser
        && !!(provider === 'gemini' ? geminiKey(env) : env[PROVIDERS[provider].key]?.trim());
    const loginConfigurado = publicAuthConfig(env).available;
    return { nodeCompativel, supabaseConfigurado: supabase.configuracaoCompleta,
        loginConfigurado, geminiConfigurado, chatGeralConfigurado,
        prontaParaTestar: nodeCompativel && supabase.configuracaoCompleta && loginConfigurado && geminiConfigurado && chatGeralConfigurado };
}
module.exports = { verificarConfiguracaoLocal };
