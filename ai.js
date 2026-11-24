const { somenteOutroPeriodo, AVISO_MANHA } = require('./escopo-tarde');
const { SYSTEM_PROMPT } = require('./public/ai-client');

const PROVIDERS = Object.freeze({
    gemini: { label: 'Google Gemini', key: 'GEMINI_API_KEY', model: 'gemini-3.5-flash-lite', modelEnv: 'GEMINI_MODEL' },
    groq: { label: 'Groq', key: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile', modelEnv: 'GROQ_MODEL', url: 'https://api.groq.com/openai/v1/chat/completions' },
    openrouter: { label: 'OpenRouter', key: 'OPENROUTER_API_KEY', model: 'openrouter/free', modelEnv: 'OPENROUTER_MODEL', url: 'https://openrouter.ai/api/v1/chat/completions' },
    ollama: { label: 'Ollama (local)', model: 'llama3.2', modelEnv: 'OLLAMA_MODEL', local: true },
    puter: { label: 'Puter (conta do usuário)', model: 'gpt-5.4-nano', modelEnv: 'PUTER_MODEL', browser: true }
});

function geminiKey(env = process.env) { return env.SURI_GEMINI?.trim() || env.GEMINI_API_KEY?.trim() || ''; }
function providerKey(provider, env) { return provider === 'gemini' ? geminiKey(env) : PROVIDERS[provider].key ? env[PROVIDERS[provider].key]?.trim() : ''; }
function modelFor(provider, env) { return env[PROVIDERS[provider].modelEnv] || PROVIDERS[provider].model; }
function ollamaBaseUrl(env) {
    const configured = (env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').trim();
    try {
        const url = new URL(configured);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
        return url.toString().replace(/\/$/, '');
    } catch { throw failure('A URL do Ollama é inválida. Use OLLAMA_BASE_URL com um endereço HTTP ou HTTPS válido.', 503); }
}
function publicConfig(env = process.env) {
    const providers = Object.entries(PROVIDERS).map(([id, info]) => ({
        id, label: info.label, model: modelFor(id, env), browser: !!info.browser,
        available: info.browser || !!info.local || !!providerKey(id, env)
    }));
    const preferred = env.AI_PROVIDER || 'gemini';
    return { defaultProvider: Object.hasOwn(PROVIDERS, preferred) ? preferred : 'gemini', providers };
}

function failure(message, status) { return Object.assign(new Error(message), { status }); }
async function generateAnswer({ provider, message, env = process.env, fetchImpl = fetch, systemPrompt = SYSTEM_PROMPT, timeoutMs = 45000, jsonOutput = false, webSearch = false }) {
    const id = provider || env.AI_PROVIDER || 'gemini';
    if (!Object.hasOwn(PROVIDERS, id) || PROVIDERS[id].browser) throw failure('Selecione um provedor de IA válido para o servidor.', 400);
    const info = PROVIDERS[id];
    const key = providerKey(id, env);
    if (!info.local && !key) throw failure('Este provedor de IA ainda não está configurado. Selecione outra opção ou configure a chave no servidor.', 503);
    const model = modelFor(id, env);
    const gemini = id === 'gemini';
    const ollama = !!info.local;
    const url = gemini
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
        : ollama ? `${ollamaBaseUrl(env)}/api/chat` : info.url;
    const body = gemini ? {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 2048, ...(jsonOutput && !webSearch ? { responseMimeType: 'application/json' } : {}) },
        ...(webSearch ? { tools: [{ googleSearch: {} }] } : {})
    } : ollama ? {
        model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        stream: false, options: { num_predict: 2048 }, ...(jsonOutput ? { format: 'json' } : {})
    } : {
        model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        max_tokens: 2048, ...(id === 'openrouter' ? { provider: { allow_fallbacks: false } } : {})
    };
    let response;
    try {
        response = await fetchImpl(url, {
            method: 'POST', signal: AbortSignal.timeout(timeoutMs),
            headers: { 'Content-Type': 'application/json', ...(!gemini && !ollama ? { Authorization: `Bearer ${key}` } : gemini ? { 'x-goog-api-key': key } : {}) },
            body: JSON.stringify(body)
        });
    } catch {
        if (ollama) throw failure('Não foi possível conectar ao Ollama. Confirme se o aplicativo está aberto, se o modelo foi baixado e se OLLAMA_BASE_URL está correto.', 503);
        throw failure('O provedor não respondeu a tempo ou está inacessível. Tente novamente.', 504);
    }
    if (!response.ok) {
        if (ollama && response.status === 404) throw failure(`O modelo "${model}" não foi encontrado no Ollama. Baixe-o com ollama pull ${model} ou ajuste OLLAMA_MODEL.`, 503);
        if (response.status === 429) throw failure('O provedor atingiu o limite de uso. Aguarde ou escolha outra opção.', 429);
        if ([401, 403].includes(response.status)) throw failure('O provedor recusou o acesso. Verifique a chave e as permissões nas configurações seguras.', 502);
        throw failure('O provedor de IA está indisponível ou o modelo não está acessível. Confira a configuração do modelo.', 502);
    }
    let data;
    try { data = await response.json(); } catch { throw failure('O provedor retornou uma resposta inválida.', 502); }
    const content = gemini
        ? data.candidates?.[0]?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('\n')
        : ollama ? data.message?.content : data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw failure('O modelo não retornou uma resposta de texto. Tente novamente.', 502);
    return { solucao: content.trim(), provider: id, model: data.model || data.modelVersion || model,
        ...(gemini && webSearch ? { grounding: data.candidates?.[0]?.groundingMetadata || null } : {}) };
}

function criarDiagnostico(generate = generateAnswer) {
    return async (req, res) => {
        const { logErro } = req.body || {};
        if (typeof logErro !== 'string' || !logErro.trim() || logErro.length > 10000) {
            return res.status(400).json({ erro: 'Informe uma mensagem de até 10.000 caracteres.' });
        }
        if (somenteOutroPeriodo(logErro)) return res.json({ solucao: AVISO_MANHA });
        try {
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

module.exports = { geminiKey, PROVIDERS, publicConfig, generateAnswer, criarDiagnostico };
