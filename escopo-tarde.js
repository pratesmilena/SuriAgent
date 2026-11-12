const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function somenteOutroPeriodo(pergunta) {
    const texto = normalizar(pergunta);
    return /\b(?:manhas?|matutin[oa]s?)\b/.test(texto);
}
function conteudoDaTarde(row) {
    // Números do censo são totais da escola, não matrículas do turno da tarde.
    if ([1, 2, 3, 8].includes(Number(row.id))) return null;
    const texto = String(row.conteudo || '');
    if (!somenteOutroPeriodo(texto)) return row;
    // O cadastro confirmado reúne os dois turnos na mesma frase.
    const tarde = texto.match(/Tarde(?:\/Noite)?\s*\(([^)]*)\)/i);
    if (tarde) return { ...row, conteudo: 'Período da tarde: ' + tarde[1] + '. Consulte as aulas por turma e dia na aba Horários de aula.' };
    const paragrafos = texto.split(/\r?\n\s*\r?\n/).filter(p => !somenteOutroPeriodo(p));
    const conteudo = paragrafos.join('\n\n');
    return conteudo.trim() ? { ...row, conteudo } : null;
}
const AVISO_MANHA = 'As informações do turno da manhã ainda não estão disponíveis no Suri. No momento, posso consultar apenas os dados do período da tarde.';
module.exports = { somenteOutroPeriodo, conteudoDaTarde, AVISO_MANHA };
