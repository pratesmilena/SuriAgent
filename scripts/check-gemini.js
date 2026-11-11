require('dotenv').config({ quiet: true });
const { generateAnswer, geminiKey } = require('../ai');
(async () => {
    if (!geminiKey()) {
        console.log(JSON.stringify({ status: 'missing_key', action: 'Configure SURI_GEMINI ou GEMINI_API_KEY nas variáveis seguras do servidor.' }));
        process.exitCode = 2; return;
    }
    // Uma chamada real, autorizada pelo administrador; pode consumir a cota da conta.
    const result = await generateAnswer({ provider: 'gemini', message: 'Responda somente: Suri conectado.', timeoutMs: 15000 });
    console.log(JSON.stringify({ status: 'response_received', model: result.model, nonEmptyText: !!result.solucao.trim() }));
})().catch(error => {
    console.error(JSON.stringify({ status: 'failed', httpStatus: error.status || null,
        action: 'Confira chave, acesso ao modelo GEMINI_MODEL e cota no Google AI Studio. Nenhuma credencial foi exibida.' }));
    process.exitCode = 1;
});
