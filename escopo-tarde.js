const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function somenteOutroPeriodo(pergunta) {
    const texto = normalizar(pergunta);
    return /\bmanha\b/.test(texto) && !/\btarde\b/.test(texto);
}
function conteudoDaTarde(row) {
    // Números do censo são totais da escola, não matrículas do turno da tarde.
    if ([1, 2, 3, 8].includes(Number(row.id))) return null;
    const texto = String(row.conteudo || '');
    if (!/\bmanha\b/.test(normalizar(texto))) return row;
    // O cadastro confirmado reúne os dois turnos na mesma frase.
    const tarde = texto.match(/Tarde(?:\/Noite)?\s*\(([^)]*)\)/i);
    if (tarde) return { ...row, conteudo: 'Período da tarde: ' + tarde[1] + '. Consulte as aulas por turma e dia na aba Horários de aula.' };
    const paragrafos = texto.split(/\r?\n\s*\r?\n/).filter(p => !/\bmanha\b/.test(normalizar(p)));
    const conteudo = paragrafos.join('\n\n');
    return conteudo.trim() ? { ...row, conteudo } : null;
}
module.exports = { somenteOutroPeriodo, conteudoDaTarde };
