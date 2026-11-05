const { createClient } = require('@supabase/supabase-js');

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

async function consultarHorarios(turma, dia, source = getSupabase()) {
    const { data, error } = await source
        .from('horario_aulatarde')
        .select('turma, dia_semana, numero_aula, horario_inicio, professor, disciplina')
        .eq('turma', turma)
        .eq('dia_semana', dia)
        .order('numero_aula', { ascending: true })
        .abortSignal(AbortSignal.timeout(10000));
    if (error) throw error;
    return data;
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

module.exports = { consultarHorarios, consultarLocalizacao };
