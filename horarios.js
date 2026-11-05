const { consultarHorarios, listarCatalogoHorarios } = require('./supabase');
const { erroConsulta } = require('./erros-consulta');
const DIAS = new Set(['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SEMANA']);

function criarConsultaHorarios(consultar = consultarHorarios) {
    return async (req, res) => {
        const turma = typeof req.query.turma === 'string' ? req.query.turma.trim() : '';
        const dia = typeof req.query.dia === 'string' ? req.query.dia.trim().toUpperCase() : '';
        if (!turma || turma.length > 100 || !DIAS.has(dia)) {
            return res.status(400).json({ erro: 'Informe a turma como cadastrada e um dia válido (SEGUNDA a SEXTA).' });
        }
        try {
            const aulas = await consultar(turma, dia);
            return res.json({ turma: aulas[0]?.turma || turma, dia, aulas });
        } catch (error) {
            console.error('Falha na consulta de horários', { codigo: error.code || 'indisponivel' });
            const falha = erroConsulta(error);
            return res.status(falha.status).json({ erro: falha.mensagem, codigo: falha.codigo });
        }
    };
}

function criarCatalogoHorarios(listar = listarCatalogoHorarios) {
    return async (req, res) => {
        try { return res.json(await listar()); }
        catch (error) {
            const falha = erroConsulta(error);
            return res.status(falha.status).json({ erro: falha.mensagem, codigo: falha.codigo });
        }
    };
}
module.exports = { criarConsultaHorarios, criarCatalogoHorarios };
