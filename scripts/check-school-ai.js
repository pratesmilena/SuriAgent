require('dotenv').config({ quiet: true });
const { geminiKey } = require('../ai');
const { interpretarPerguntaEscola } = require('../interpretacao-escola');
const { buscarNaWeb } = require('../pesquisa-web-escola');
(async () => {
    if (!geminiKey()) {
        console.log(JSON.stringify({ status: 'missing_key', action: 'Configure SURI_GEMINI ou GEMINI_API_KEY no servidor.' }));
        process.exitCode = 2; return;
    }
    const perguntas = ['Quem toma conta desse colégio?', 'Quais são as aulas opcionais?', 'O que rola no terceirão C quando sextar?'];
    const resultados = [];
    for (const pergunta of perguntas) {
        const plano = await interpretarPerguntaEscola(pergunta);
        resultados.push({ pergunta, status: plano ? 'interpretado' : 'indisponivel', tipo: plano?.tipo || null });
        if (!plano) process.exitCode = 1;
    }
    if (process.argv.includes('--web')) {
        const pesquisa = await buscarNaWeb('Qual é a localização oficial da Escola Estadual República do Suriname?');
        resultados.push({ buscaGoogle: pesquisa ? 'confirmada_com_fontes' : 'nao_confirmada', fontes: pesquisa?.pesquisaGoogle.fontes.length || 0 });
        if (!pesquisa) process.exitCode = 1;
    }
    console.log(JSON.stringify({ resultados }, null, 2));
})().catch(() => { console.error(JSON.stringify({ status: 'failed', action: 'Confira conexão, permissões, modelo e cota. Nenhuma credencial foi exibida.' })); process.exitCode = 1; });
