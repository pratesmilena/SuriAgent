const { consultarHorarios } = require('./supabase');
const DIAS = new Set(['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA']);

function criarConsultaHorarios(consultar = consultarHorarios) {
    return async (req, res) => {
        const turma = typeof req.query.turma === 'string' ? req.query.turma.trim() : '';
        const dia = typeof req.query.dia === 'string' ? req.query.dia.trim().toUpperCase() : '';
        if (!turma || turma.length > 100 || !DIAS.has(dia)) {
            return res.status(400).json({ erro: 'Informe a turma como cadastrada e um dia válido (SEGUNDA a SEXTA).' });
        }
        try {
            const aulas = await consultar(turma, dia);
            return res.json({ turma, dia, aulas });
        } catch (error) {
            console.error('Falha na consulta de horários', { codigo: error.code || 'indisponivel' });
            return res.status(error.status === 503 ? 503 : 502).json({
                erro: error.status === 503
                    ? 'Consulta de horários indisponível. Configure o acesso ao Supabase no servidor.'
                    : 'Não foi possível consultar os horários. Tente novamente mais tarde.'
            });
        }
    };
}

module.exports = { criarConsultaHorarios };
