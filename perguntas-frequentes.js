const perguntas = Object.freeze([
    { id: 'turmas', pergunta: 'Quais são as turmas da tarde?' },
    { id: 'horarios', pergunta: 'Como posso consultar os horários de aula da minha turma?' },
    { id: 'eletivas', pergunta: 'Quais eletivas tem no período da tarde?' },
    { id: 'cursos', pergunta: 'Quais cursos a escola oferece no período da tarde?' },
    { id: 'projetos', pergunta: 'Quais projetos são desenvolvidos na escola?' },
    { id: 'eventos', pergunta: 'Quais eventos e atividades fazem parte do calendário da escola?' },
    { id: 'endereco', pergunta: 'Onde fica a escola?' },
    { id: 'historia', pergunta: 'Qual é a história da escola?' }
]);
function listaPerguntasFrequentes() {
    return { criterio: 'sugestoes_editoriais', periodo: 'TARDE', descricao: 'Perguntas úteis sobre o período da tarde e informações gerais da escola. A lista não representa um ranking de uso.', perguntas };
}
function pedidoListaFaq(pergunta) {
    const texto = pergunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return /^(?:(?:quais|mostre|liste|ver|consultar)(?: sao)?(?: as)?\s+)?(?:perguntas|duvidas)\s+(?:mais\s+)?frequentes[?!.\s]*$|^faq[?!.\s]*$/.test(texto);
}
function respostaListaFaq() {
    return 'Você pode perguntar:\n\n' + perguntas.map(item => '• ' + item.pergunta).join('\n') + '\n\nSão sugestões de consulta, não um ranking das perguntas dos usuários.';
}
module.exports = { listaPerguntasFrequentes, pedidoListaFaq, respostaListaFaq };
