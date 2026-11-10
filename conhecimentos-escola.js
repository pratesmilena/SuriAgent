const historia = require('./config/historia.json');
const cursos = require('./config/cursos.json');
const { getSupabase } = require('./supabase');
const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Mapeamento dos registros conferidos no arquivo enviado pela responsável.
const IDS = { historia: [], cursos: [1, 3, 9, 13], projetos: [], ambiente: [6], espacos: [6], eventos: [], faq: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13] };
async function consultarConhecimentos(topico, pergunta = '', source = getSupabase()) {
    const { data, error } = await source.from('conhecimentos')
        .select('id,categoria,titulo,conteudo,palavras_chave').order('id').limit(1000)
        .abortSignal(AbortSignal.timeout(10000));
    if (error) {
        if (['PGRST205', '42P01'].includes(error.code)) return { topico, status: 'tabela_pendente', registros: [], total: 0 };
        throw error;
    }
    let rows = data.filter(row => IDS[topico]?.includes(Number(row.id)) || normalizar(row.categoria) === topico);
    if (topico === 'historia' && !rows.length) return { topico, status: 'disponivel', registros: [{ ...historia }], total: 1 };
    if (topico === 'cursos') {
        const turnos = /turnos?|periodos?/.test(normalizar(pergunta));
        if (!turnos && rows.some(row => Number(row.id) === 9)) {
            // A oferta detalhada foi fornecida pela responsável; não atribuí-la ao texto antigo do banco.
            return { topico, status: 'disponivel', registros: [{ titulo: 'Cursos oferecidos',
                conteudo: cursos.etapas.map(x => '• ' + x).join('\n') + '\n\nItinerários (' + cursos.inicioItinerarios.toLowerCase() + '):\n' + cursos.itinerarios.map(x => '• ' + x).join('\n'),
                fonte: cursos.fonte }], total: 1, resposta_sucinta: true };
        }
        rows = rows.filter(row => normalizar(row.categoria) === 'cursos' || Number(row.id) === (turnos ? 13 : 9));
    }
    if (topico === 'faq') {
        const texto = normalizar(pergunta);
        const regras = [
            [/\binep\b/, [4, 11], /inep/], [/\bideb\b/, [5, 12], /ideb/],
            [/quantos.{0,20}(alunos|matriculas)|censo|quantidade de alunos/, [2, 3, 8], /alunos|censo|matriculas/],
            [/telefone|contato|\bcep\b/, [4], /telefone|contato|cep/],
            [/funcionamento|que horas|horario|abre|fecha/, [13], /funcionamento|horario/],
            [/publica|privada|rede de ensino|diretoria de ensino|seduc/, [1, 7], /rede|publica|seduc|diretoria/]
        ];
        const regra = regras.find(([pattern]) => pattern.test(texto));
        if (regra) rows = rows.filter(row => regra[1].includes(Number(row.id)) || regra[2].test(normalizar(row.titulo + ' ' + row.palavras_chave)));
    }
    const registros = rows.slice(0, 20).map(row => ({ ...row, informacao_geral: true, fonte: 'Base escolar no Supabase · conhecimentos' }));
    return { topico, status: registros.length ? 'disponivel' : 'sem_conteudo_publicado', registros, total: rows.length };
}
module.exports = { consultarConhecimentos };
