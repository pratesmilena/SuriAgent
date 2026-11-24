require('dotenv').config({ quiet: true });

const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').trim().replace(/\/$/, '');
const model = process.env.OLLAMA_MODEL || 'llama3.2';

async function main() {
    let url;
    try {
        url = new URL(baseUrl);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch {
        console.error('OLLAMA_BASE_URL inválida. Use, por exemplo, http://127.0.0.1:11434');
        process.exitCode = 1;
        return;
    }

    try {
        const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const models = Array.isArray(data.models) ? data.models : [];
        console.log(`Ollama respondeu em ${url.origin}.`);
        console.log('Modelos instalados:', models.map(item => item.name).join(', ') || 'nenhum');
        if (!models.some(item => item.name === model || item.name?.startsWith(`${model}:`))) {
            console.error(`O modelo "${model}" não está instalado. Execute: ollama pull ${model}`);
            process.exitCode = 1;
            return;
        }
        console.log(`Modelo "${model}" encontrado. Configuração pronta para o SuriAgent.`);
    } catch {
        console.error('Não foi possível acessar o Ollama. Abra o aplicativo Ollama e confirme se o serviço está ativo.');
        process.exitCode = 1;
    }
}

main();
