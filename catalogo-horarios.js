const DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
function normalizarTurma(turma) {
    return turma.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[º°ª\s]/g, '');
}
function escolherTurma(turma, nomes) {
    const normal = normalizarTurma(turma);
    const exatas = nomes.filter(nome => normalizarTurma(nome) === normal);
    if (exatas.length === 1) return exatas[0];
    if (exatas.length > 1) return null;
    if (normal.includes('(')) return null;
    const candidatas = nomes.filter(nome => normalizarTurma(nome).split('(')[0] === normal);
    return candidatas.length === 1 ? candidatas[0] : null;
}
function montarCatalogo(rows) {
    const mapa = new Map();
    for (const row of rows) {
        if (!row.turma || !DIAS.includes(row.dia_semana)) continue;
        if (!mapa.has(row.turma)) mapa.set(row.turma, new Set());
        mapa.get(row.turma).add(row.dia_semana);
    }
    return { dias: DIAS, turmas: [...mapa].sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true }))
        .map(([nome, dias]) => ({ nome, dias: DIAS.filter(dia => dias.has(dia)) })) };
}
module.exports = { DIAS, escolherTurma, montarCatalogo };
