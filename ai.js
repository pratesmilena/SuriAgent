const { SYSTEM_PROMPT } = require('./public/ai-client');

const PROVIDERS = Object.freeze({
    gemini: { label: 'Google Gemini', key: 'GEMINI_API_KEY', model: 'gemini-3.5-flash-lite', modelEnv: 'GEMINI_MODEL' },
    groq: { label: 'Groq', key: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile', modelEnv: 'GROQ_MODEL', url: 'https://api.groq.com/openai/v1/chat/completions' },
    openrouter: { label: 'OpenRouter', key: 'OPENROUTER_API_KEY', model: 'openrouter/free', modelEnv: 'OPENROUTER_MODEL', url: 'https://openrouter.ai/api/v1/chat/completions' },
    puter: { label: 'Puter (conta do usuário)', model: 'gpt-5.4-nano', modelEnv: 'PUTER_MODEL', browser: true }
});

function modelFor(provider, env) { return env[PROVIDERS[provider].modelEnv] || PROVIDERS[provider].model; }
function publicConfig(env = process.env) {
    const providers = Object.entries(PROVIDERS).map(([id, info]) => ({
        id, label: info.label, model: modelFor(id, env), browser: !!info.browser,
        available: info.browser || !!env[info.key]
    }));
    const preferred = env.AI_PROVIDER || 'gemini';
    return { defaultProvider: Object.hasOwn(PROVIDERS, preferred) ? preferred : 'gemini', providers };
}

function failure(message, status) { return Object.assign(new Error(message), { status }); }
async function generateAnswer({ provider, message, env = process.env, fetchImpl = fetch }) {
    const id = provider || env.AI_PROVIDER || 'gemini';
    if (!Object.hasOwn(PROVIDERS, id) || PROVIDERS[id].browser) throw failure('Selecione um provedor de IA válido para o servidor.', 400);
    const info = PROVIDERS[id];
    if (!env[info.key]) throw failure('Este provedor de IA ainda não está configurado. Selecione outra opção ou configure a chave no servidor.', 503);
    const model = modelFor(id, env);
    const gemini = id === 'gemini';
    const url = gemini
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
        : info.url;
    const body = gemini ? {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 2048 }
    } : {
        model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: message }],
        max_tokens: 2048, ...(id === 'openrouter' ? { provider: { allow_fallbacks: false } } : {})
    };
    let response;
    try {
        response = await fetchImpl(url, {
            method: 'POST', signal: AbortSignal.timeout(45000),
            headers: { 'Content-Type': 'application/json', ...(gemini ? { 'x-goog-api-key': env[info.key] } : { Authorization: `Bearer ${env[info.key]}` }) },
            body: JSON.stringify(body)
        });
    } catch {
        throw failure('O provedor não respondeu a tempo ou está inacessível. Tente novamente.', 504);
    }
    if (!response.ok) {
        if (response.status === 429) throw failure('O provedor atingiu o limite de uso. Aguarde ou escolha outra opção.', 429);
        if ([401, 403].includes(response.status)) throw failure('O provedor recusou o acesso. Verifique a chave e as permissões nas configurações seguras.', 502);
        throw failure('O provedor de IA está indisponível ou o modelo não está acessível. Confira a configuração do modelo.', 502);
    }
    let data;
    try { data = await response.json(); } catch { throw failure('O provedor retornou uma resposta inválida.', 502); }
    const content = gemini
        ? data.candidates?.[0]?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('\n')
        : data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw failure('O modelo não retornou uma resposta de texto. Tente novamente.', 502);
    return { solucao: content.trim(), provider: id, model: data.model || data.modelVersion || model };
}

function criarDiagnostico(generate = generateAnswer) {
    return async (req, res) => {
        const { logErro } = req.body || {};
        if (typeof logErro !== 'string' || !logErro.trim() || logErro.length > 10000) {
            return res.status(400).json({ erro: 'Informe uma mensagem de até 10.000 caracteres.' });
        }
        try {
            // A escolha pertence à configuração do servidor, não ao corpo da requisição.
            const resultado = await generate({ message: logErro.trim() });
            return res.json({ solucao: resultado.solucao });
        } catch (error) {
            const status = [429, 502, 503, 504].includes(error.status) ? error.status : 503;
            const mensagens = {
                429: 'Há muitas solicitações no momento. Aguarde um pouco e tente novamente.',
                502: 'Não foi possível responder agora. Tente novamente em alguns instantes.',
                503: 'O assistente está temporariamente indisponível para esta pergunta. As consultas escolares continuam disponíveis.',
                504: 'A resposta demorou mais que o esperado. Tente novamente em alguns instantes.'
            };
            return res.status(status).json({ erro: mensagens[status] });
        }
    };
}

module.exports = { PROVIDERS, publicConfig, generateAnswer, criarDiagnostico };
