const { createClient } = require('@supabase/supabase-js');
const { DIAS, escolherTurma, montarCatalogo } = require('./catalogo-horarios');

let client;
function getSupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
        const error = new Error('Consulta de horários indisponível. Configure o acesso ao Supabase no servidor.');
        error.status = 503;
        throw error;
    }
    client ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
}

async function listarCatalogoHorarios(source = getSupabase()) {
    const rows = [];
    for (let inicio = 0; inicio < 10000; inicio += 1000) {
        const { data, error } = await source.from('horario_aulatarde')
            .select('turma,dia_semana,numero_aula')
            .order('turma').order('dia_semana').order('numero_aula')
            .range(inicio, inicio + 999).abortSignal(AbortSignal.timeout(10000));
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return montarCatalogo(rows);
    }
    throw new Error('O catálogo excedeu o limite de consulta; não é possível mostrar uma lista completa.');
}

async function consultarHorarios(turma, dia, source = getSupabase()) {
    async function buscar(nome) {
        let query = source.from('horario_aulatarde')
            .select('turma, dia_semana, numero_aula, horario_inicio, professor, disciplina')
            .eq('turma', nome);
        query = dia === 'SEMANA' ? query.in('dia_semana', DIAS) : query.eq('dia_semana', dia);
        const { data, error } = await query.order('numero_aula', { ascending: true })
            .abortSignal(AbortSignal.timeout(10000));
        if (error) throw error;
        return dia === 'SEMANA' ? data.sort((a, b) => DIAS.indexOf(a.dia_semana) - DIAS.indexOf(b.dia_semana) || Number(a.numero_aula) - Number(b.numero_aula)) : data;
    }
    let aulas = await buscar(turma);
    if (!aulas.length) {
        const catalogo = await listarCatalogoHorarios(source);
        const nome = escolherTurma(turma, catalogo.turmas.map(item => item.nome));
        if (nome && nome !== turma) aulas = await buscar(nome);
    }
    return aulas;
}

async function consultarLocalizacao(env = process.env, source) {
    const cadastro = require('./config/escola.json');
    const assunto = env.CONHECIMENTOS_ASSUNTO_COLUNA || cadastro.conhecimentos.assuntoColuna;
    const resposta = env.CONHECIMENTOS_RESPOSTA_COLUNA || cadastro.conhecimentos.respostaColuna;
    const valor = env.CONHECIMENTOS_LOCALIZACAO_ASSUNTO || cadastro.conhecimentos.localizacaoAssunto;
    if ((assunto && !valor) || (!assunto && valor)) return null;
    if (![resposta, ...(assunto ? [assunto] : [])].every(nome => /^[\p{L}_][\p{L}\p{N}_]{0,62}$/u.test(nome))) {
        throw new Error('Mapeamento de conhecimentos inválido.');
    }
    let consulta = (source || getSupabase()).from('conhecimentos')
        .select(assunto ? `${assunto},${resposta}` : resposta);
    consulta = assunto ? consulta.eq(assunto, valor) : consulta.ilike(resposta, '%810%');
    const { data, error } = await consulta.limit(2)
        .abortSignal(AbortSignal.timeout(10000));
    if (error) throw error;
    if (data?.length !== 1 || typeof data[0][resposta] !== 'string' || !data[0][resposta].trim()) return null;
    if (!assunto) {
        const texto = data[0][resposta].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (!texto.includes('antonio joao de medeiros') || !texto.includes('810')) return null;
    }
    return { endereco: data[0][resposta].trim(), fonte: 'Cadastro escolar no Supabase · conhecimentos', origem: 'supabase-conhecimentos' };
}

module.exports = { consultarHorarios, consultarLocalizacao, listarCatalogoHorarios, getSupabase };
