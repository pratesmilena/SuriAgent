function valor(env, nome) { return typeof env[nome] === 'string' ? env[nome].trim() : ''; }
function urlProjeto(env = process.env) {
    try {
        const url = new URL(valor(env, 'SUPABASE_URL'));
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) return null;
        return url.origin;
    } catch { return null; }
}
function diagnosticoConfiguracao(env = process.env) {
    const urlConfigurada = !!valor(env, 'SUPABASE_URL');
    const chaveConfigurada = !!valor(env, 'SUPABASE_PUBLISHABLE_KEY');
    return { urlConfigurada, urlValida: !!urlProjeto(env), chaveConfigurada,
        configuracaoCompleta: !!urlProjeto(env) && chaveConfigurada };
}
function lerConfiguracao(env = process.env) {
    const status = diagnosticoConfiguracao(env);
    if (!status.configuracaoCompleta) {
        throw Object.assign(new Error('A configuração do Supabase está ausente ou inválida neste servidor.'), {
            status: 503, code: status.urlConfigurada && !status.urlValida ? 'SUPABASE_URL_INVALIDA' : 'SUPABASE_CONFIG_AUSENTE'
        });
    }
    return { url: urlProjeto(env), key: valor(env, 'SUPABASE_PUBLISHABLE_KEY') };
}
module.exports = { valor, urlProjeto, diagnosticoConfiguracao, lerConfiguracao };
