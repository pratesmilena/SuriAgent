// Mensagens seguras para os dois pontos de entrada da consulta escolar.
function erroConsulta(error) {
    if (error?.code === '42501') return {
        status: 503,
        codigo: 'LEITURA_ESCOLAR_NAO_AUTORIZADA',
        mensagem: 'A consulta escolar está indisponível por uma permissão do sistema. Avise a equipe responsável pela escola.'
    };
    if (error?.status === 503) return {
        status: 503,
        codigo: 'BANCO_ESCOLAR_NAO_CONFIGURADO',
        mensagem: 'A consulta ao banco escolar ainda não está configurada no servidor. Falta habilitar o acesso ao Supabase.'
    };
    return {
        status: 502,
        codigo: 'FALHA_CONSULTA_ESCOLAR',
        mensagem: 'Não foi possível consultar o banco escolar agora. Tente novamente ou confirme com a secretaria.'
    };
}
module.exports = { erroConsulta };
