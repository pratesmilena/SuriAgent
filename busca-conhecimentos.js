const { getSupabase } = require('./supabase');
const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stop = new Set('a as o os um uma uns umas de da das do dos em na nas no nos e ou que qual quais quem como quando onde por para porque tem ter temos ha existe existem sao e eh me diga pode poderia gostaria saber escola escolar escolas suriname republica oferecido oferecidos oferecida oferecidas oferece oferecem disponivel disponiveis aluno alunos voce voces por favor sobre'.split(' '));
const tokens = texto => normalizar(texto).split(/[^a-z0-9]+/).filter(x => x.length > 2 && !stop.has(x)).map(x => x.endsWith('s') ? x.slice(0, -1) : x);
function perguntaEletivas(pergunta) {
    return /\beletivas?\b|(?:disciplinas?|atividades?)\s+(?:optativas?|eletivas?)/.test(normalizar(pergunta));
}
async function buscarConhecimentos(pergunta, source = getSupabase()) {
    const eletivas = perguntaEletivas(pergunta);
    const termos = eletivas ? ['eletiva', 'optativa'] : [...new Set(tokens(pergunta))];
    if (!termos.length) return { origem: 'conhecimentos', status: 'sem_conteudo_publicado', registros: [], total: 0 };
    const rows = [];
    for (let inicio = 0; inicio < 10000; inicio += 1000) {
        const { data, error } = await source.from('conhecimentos')
            .select('id,categoria,titulo,conteudo,palavras_chave').order('id').range(inicio, inicio + 999)
            .abortSignal(AbortSignal.timeout(10000));
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) break;
        if (inicio === 9000) throw new Error('A base excede o limite da consulta completa.');
    }
    const classificados = rows.map(row => {
        const destaque = tokens(row.titulo + ' ' + (row.palavras_chave || '') + ' ' + row.categoria);
        const corpo = tokens(row.conteudo);
        const encontrados = termos.filter(termo => destaque.includes(termo) || corpo.includes(termo));
        return { row, score: encontrados.reduce((score, termo) => score + (destaque.includes(termo) ? 3 : 1), 0) };
    }).filter(item => item.score > 0).sort((a,b) => b.score-a.score || Number(a.row.id)-Number(b.row.id));
    const registros = classificados.slice(0, 3).map(({row}) => row);
    return { origem: 'conhecimentos', status: registros.length ? 'disponivel' : 'sem_conteudo_publicado', registros, total: classificados.length };
}
module.exports = { buscarConhecimentos, perguntaEletivas };
