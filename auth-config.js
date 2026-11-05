function publicAuthConfig(env = process.env) {
    const key = env.SUPABASE_AUTH_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';
    let safeKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!safeKey && key.split('.').length === 3) {
        try { safeKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch {}
    }
    let url;
    try {
        const parsed = new URL(env.SUPABASE_URL);
        if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash) url = parsed.origin;
    } catch {}
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
        if (response.ok) {
            const settings = await response.json();
            return { ...config, googleEnabled: settings.external?.google === true };
        }
    } catch {}
    return { ...config, googleEnabled: null };
}
module.exports = { publicAuthConfig, authConfig };
