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

module.exports = { consultarHorarios };
