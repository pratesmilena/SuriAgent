const { getSupabase } = require('./supabase');
const stop = new Set('qual quais sao os as o a de da do das dos e que quem todos todas cada liste listar nomes nome relacao me mostre sobre corpo professores professor professora professoras prof profs docentes docente ensina ensinam leciona lecionam ministra ministram disciplina disciplinas materia materias escola ensino fundamental medio no na nos nas por favor tem trabalham trabalha aula aulas periodo periodos turno turnos manha tarde dos dois'.split(' '));
function normalizar(texto) { return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function termos(pergunta) { return normalizar(pergunta).split(/[^a-z0-9]+/).filter(x => x && !stop.has(x)); }
async function paginar(query) {
    const rows = [];
    for (let inicio = 0; inicio < 10000; inicio += 1000) {
        const { data, error } = await query().range(inicio, inicio + 999).abortSignal(AbortSignal.timeout(10000));
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
    }
    throw new Error('O cadastro ultrapassa o limite de consulta completa.');
}
async function consultarProfessores(pergunta = '', source = getSupabase()) {
    const texto = normalizar(pergunta);
    const etapa = texto.includes('ensino fundamental') ? 'ENSINO_FUNDAMENTAL' : texto.includes('ensino medio') ? 'ENSINO_MEDIO' : null;
    const manha = /\bmanha\b/.test(texto);
    const tarde = /\btarde\b/.test(texto);
    const periodo = manha && !tarde ? 'MANHA' : tarde && !manha ? 'TARDE' : null;
    const busca = termos(pergunta);
    const [cadastro, grade] = await Promise.allSettled([
        paginar(() => {
            let q = source.from('escola_professor_disciplinas')
                .select('id,codigo,professor,disciplina,etapa,fonte,verificado_em')
                .eq('publicado', true).eq('confirmado', true);
            if (etapa) q = q.eq('etapa', etapa);
            if (busca.length) q = q.textSearch('busca', busca.join(' '), { type: 'plain', config: 'portuguese' });
            return q.order('professor').order('disciplina').order('codigo');
        }),
        // Esta tabela comprova período da tarde, mas não a etapa de ensino.
        etapa || periodo === 'MANHA' ? Promise.resolve([]) : paginar(() => source.from('horario_aulatarde')
            .select('professor,disciplina,turma,dia_semana,numero_aula')
            .order('turma').order('dia_semana').order('numero_aula'))
    ]);
    const avisos = [];
    const cadastroAusente = cadastro.status === 'rejected' && ['PGRST205', '42P01'].includes(cadastro.reason?.code);
    const erros = [cadastro, grade].filter(result => result.status === 'rejected' && !(result === cadastro && cadastroAusente));
    if (cadastroAusente) avisos.push('O cadastro docente ainda não está disponível; a resposta usa os horários acessíveis.');
    else if (cadastro.status === 'rejected') avisos.push('Não foi possível consultar o cadastro docente nesta tentativa.');
    if (grade.status === 'rejected') avisos.push('Não foi possível consultar os horários da tarde nesta tentativa.');
    if (etapa) avisos.push('A grade da tarde não informa a etapa de ensino. Para esta pergunta, foram usados somente vínculos com a etapa confirmada no cadastro docente.');
    if (periodo) avisos.push('O cadastro docente não informa manhã/tarde. Para esta pergunta, são usados apenas os horários com período conhecido.');
    const mapa = new Map();
    const keyFor = row => normalizar(row.professor).trim() + '|' + normalizar(row.disciplina).trim();
    function registro(row) {
        const key = keyFor(row);
        if (!mapa.has(key)) mapa.set(key, { professor: row.professor, disciplina: row.disciplina, origens: [] });
        return mapa.get(key);
    }
    if (!periodo && cadastro.status === 'fulfilled') {
        for (const row of cadastro.value) {
            registro(row).origens.push({ tipo: 'cadastro', etapa: row.etapa, fonte: row.fonte, verificado_em: row.verificado_em });
        }
    }
    if (grade.status === 'fulfilled') {
        for (const row of grade.value) {
            if (!row.professor?.trim() || !row.disciplina?.trim()) continue;
            const palavras = normalizar(row.professor + ' ' + row.disciplina).split(/[^a-z0-9]+/);
            if (!busca.every(termo => palavras.includes(termo))) continue;
            const item = registro(row);
            let origem = item.origens.find(o => o.tipo === 'horarios');
            if (!origem) { origem = { tipo: 'horarios', periodo: 'TARDE', turmas: [], fonte: 'Horários cadastrados pela escola no Supabase' }; item.origens.push(origem); }
            if (row.turma && !origem.turmas.includes(row.turma)) origem.turmas.push(row.turma);
        }
    }
    const rows = [...mapa.values()].sort((a, b) => a.professor.localeCompare(b.professor, 'pt-BR') || a.disciplina.localeCompare(b.disciplina, 'pt-BR'));
    if (!rows.length && erros.length) throw erros[0].reason;
    return { topico: 'professores', status: rows.length ? 'disponivel' : 'sem_conteudo_publicado', registros: rows.slice(0, 50), total: rows.length, limite: 50, avisos };
}
module.exports = { consultarProfessores };
