const { valor, urlProjeto } = require('./configuracao-supabase');

function publicAuthConfig(env = process.env) {
    const key = valor(env, 'SUPABASE_AUTH_PUBLISHABLE_KEY') || valor(env, 'SUPABASE_PUBLISHABLE_KEY');
    let safeKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!safeKey && key.split('.').length === 3) {
        try { safeKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch {}
    }
    const url = urlProjeto(env);
    if (!safeKey || !url) return { available: false, message: 'O login ainda não está disponível. Você pode continuar como visitante.' };
    return { available: true, url, publishableKey: key };
}

async function authConfig(env = process.env, fetchImpl = fetch) {
    const config = publicAuthConfig(env);
    if (!config.available) return config;
    try {
        const response = await fetchImpl(`${config.url}/auth/v1/settings`, {
            headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(10000)
        });
        if ([401, 403].includes(response.status)) {
            return { available: false, message: 'O acesso à conta está indisponível no momento. Continue como visitante.', code: 'SUPABASE_AUTH_ACESSO_RECUSADO' };
        }
        if (response.ok) {
            const settings = await response.json();
            return { ...config, googleEnabled: settings.external?.google === true };
        }
    } catch {}
    return { ...config, googleEnabled: null };
}
module.exports = { publicAuthConfig, authConfig };
