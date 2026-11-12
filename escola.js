const { consultarHorarios, consultarLocalizacao, listarCatalogoHorarios } = require('./supabase');
const { responderComBase, perguntaAberta } = require('./respostas-escola-ia');
const { buscarConhecimentos, perguntaEletivas, perguntaGestao } = require('./busca-conhecimentos');
const { consultarEletivas } = require('./professores-escola');
const { somenteOutroPeriodo, AVISO_MANHA } = require('./escopo-tarde');
const { pedidoListaFaq, respostaListaFaq } = require('./perguntas-frequentes');
const { interpretarPerguntaEscola } = require('./interpretacao-escola');
const { buscarNaWeb } = require('./pesquisa-web-escola');
const cadastro = require('./config/escola.json');
const { erroConsulta } = require('./erros-consulta');
const { identificarTopicos, consultarConteudos, formatarConteudos } = require('./conteudos-escola');

function normalizar(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
const DIAS = { segunda: 'SEGUNDA', terca: 'TERÇA', quarta: 'QUARTA', quinta: 'QUINTA', sexta: 'SEXTA' };
function interpretar(pergunta) {
    const texto = normalizar(pergunta);
    const horario = /\b(aulas?|horarios?|disciplinas?|professores?)\b/.test(texto);
    const localizacao = /\b(onde fica|localiza\w*|endere[cç]o|como chegar|local da escola)\b/.test(texto);
    const textoDias = texto.replace(/\b(primeira|segunda|terceira|quarta|quinta|sexta|setima|oitava|nona|decima)\s+aula\b/g, '');
    let dias = [...new Set(Object.keys(DIAS).filter(dia => new RegExp(`\\b${dia}\\b`).test(textoDias)).map(dia => DIAS[dia]))];
    const semana = /\b(semana (completa|inteira|toda)|toda a semana|(?:na|da) semana|horarios semanais|de segunda(?:-feira)? a sexta(?:-feira)?)\b/.test(texto);
    if (semana) dias = ['SEMANA'];
    const listaTurmas = /\b(quais (?:sao as )?turmas|listar turmas|todas as turmas)\b/.test(texto);
    const textoTurmas = pergunta.replace(/\b\d{1,2}[ªaºo]?\s+aula\b/gi, '');
    const turmas = [...textoTurmas.matchAll(/\b([1-9])\s*[º°oª]?\s*([a-z])\b(?:\s*\(([^()\n]{1,30})\))?/gi)];
    const ordinal = texto.match(/\b(primeira|segunda|terceira|quarta|quinta|sexta|setima|oitava|nona|decima)\s+aula\b/);
    const numero = texto.match(/\b(\d{1,2})[ªaºo]?\s+aula\b/);
    const numeroAula = ordinal ? ['primeira','segunda','terceira','quarta','quinta','sexta','setima','oitava','nona','decima'].indexOf(ordinal[1]) + 1 : numero ? Number(numero[1]) : null;
    return { horario, localizacao, dias, numeroAula, listaTurmas, turmas: [...new Set(turmas.map(m => `${m[1]}º${m[2].toUpperCase()}${m[3] ? ` (${m[3].trim().toUpperCase()})` : ''}`))] };
}
function informacoesEscola(env = process.env) {
    const endereco = env.ESCOLA_ENDERECO?.trim() || cadastro.endereco;
    let fonte = cadastro.fonte;
    if (env.ESCOLA_ENDERECO?.trim()) {
        fonte = 'Endereço configurado pela escola';
        try { const url = new URL(env.ESCOLA_FONTE_URL); if (url.protocol === 'https:') fonte = url.href; } catch {}
    }
    return { nome: cadastro.nome, endereco, fonte, origem: cadastro.origem, localizacaoConfirmada: !!endereco };
}
function criarPerguntaEscola({ consultar = consultarHorarios, localizar = consultarLocalizacao, listar = listarCatalogoHorarios, conteudos = consultarConteudos, elaborar = responderComBase, buscar = buscarConhecimentos, eletivas = consultarEletivas, interpretacao = interpretarPerguntaEscola, pesquisar = buscarNaWeb, env = process.env } = {}) {
    return async (req, res) => {
        const { pergunta } = req.body || {};
        if (typeof pergunta !== 'string' || !pergunta.trim() || pergunta.length > 10000) {
            return res.status(400).json({ erro: 'Informe uma pergunta de até 10.000 caracteres.' });
        }
        async function responderSemInformacao(mensagem) {
            const pesquisa = await pesquisar(pergunta, { env });
            return res.json({ handled: true, solucao: pesquisa?.solucao || mensagem, formato: 'texto',
                ...(pesquisa ? { pesquisaGoogle: pesquisa.pesquisaGoogle } : {}) });
        }
        if (pedidoListaFaq(pergunta)) return res.json({ handled: true, solucao: respostaListaFaq(), formato: 'texto' });
        if (somenteOutroPeriodo(pergunta)) return res.json({ handled: true, solucao: AVISO_MANHA, formato: 'texto' });
        const intencao = interpretar(pergunta);
        let topicos = identificarTopicos(pergunta);
        let eletivasInterpretadas = false;
        const consultaExata = intencao.localizacao || intencao.listaTurmas || perguntaEletivas(pergunta)
            || (intencao.horario && intencao.turmas.length === 1 && intencao.dias.length === 1);
        if (!consultaExata) {
            let plano = null;
            try { plano = await interpretacao(pergunta, { env }); } catch {}
            if (plano?.tipo === 'manha') return res.json({ handled: true, solucao: AVISO_MANHA, formato: 'texto' });
            if (plano?.tipo === 'esclarecer') {
                const mensagens = {
                    turma: 'Qual é a sua turma? Use o nome da turma cadastrado na aba Horários de aula.',
                    dia: 'Qual dia da semana você quer consultar? Você também pode pedir a semana completa.',
                    aula: 'Qual número da aula você quer consultar?',
                    assunto: 'Você pode explicar um pouco melhor sua pergunta ou indicar o assunto da escola que deseja consultar?'
                };
                return res.json({ handled: true, solucao: mensagens[plano.alvo] || mensagens.assunto, formato: 'texto' });
            }
            if (plano?.tipo === 'sem_informacao') return responderSemInformacao('Não encontrei essa informação nos dados publicados para o período da tarde. Confirme com a secretaria ou coordenação.');
            if (plano?.tipo === 'conhecimentos') {
                let solucao = plano.resultado.registros.map(row => row.conteudo).join('\n\n');
                const resumo = await elaborar(pergunta, [plano.resultado], { env, permitirPerguntaDireta: true });
                if (resumo) solucao = resumo;
                return res.json({ handled: true, solucao, formato: 'texto', fonte: 'base-escolar' });
            }
            if (plano?.tipo === 'professores') {
                try {
                    const resultado = await conteudos('professores', plano.busca);
                    if (plano.turma) {
                        resultado.registros = resultado.registros.filter(row => row.origens?.some(o => o.turmas?.includes(plano.turma)));
                        resultado.total = resultado.registros.length;
                    }
                    return res.json({ handled: true, solucao: formatarConteudos(resultado), formato: 'texto', fonte: 'base-escolar' });
                } catch (error) {
                    const falha = erroConsulta(error);
                    return res.status(falha.status).json({ handled: true, erro: falha.mensagem, codigo: falha.codigo });
                }
            }
            if (plano?.tipo === 'horarios') {
                Object.assign(intencao, { horario: true, listaTurmas: false, localizacao: false,
                    turmas: [plano.turma], dias: [plano.dia], numeroAula: plano.numeroAula });
                topicos = [];
            }
            if (plano?.tipo === 'turmas') { Object.assign(intencao, { listaTurmas: true, localizacao: false }); topicos = []; }
            if (plano?.tipo === 'localizacao') { Object.assign(intencao, { localizacao: true, horario: false }); topicos = []; }
            if (plano?.tipo === 'eletivas') {
                eletivasInterpretadas = true;
                if (plano.turma) intencao.turmas = [plano.turma];
            }
        }
        if (intencao.turmas.length && intencao.dias.length) topicos = topicos.filter(topico => topico !== 'professores');
        if (topicos.includes('professores')) topicos = topicos.filter(topico => topico !== 'cursos');
        const perguntaSobreEletivas = eletivasInterpretadas || perguntaEletivas(pergunta);
        if (perguntaSobreEletivas) {
            try {
                const resultado = await eletivas(pergunta);
                let registros = resultado.registros;
                if (intencao.turmas.length === 1) registros = registros.filter(row => row.origens.some(o => o.turmas?.includes(intencao.turmas[0])));
                const solucao = registros.length
                    ? 'As eletivas do período da tarde estão cadastradas com estes professores:\n\n' + registros.map(row => {
                        const turmas = [...new Set(row.origens.flatMap(o => o.turmas || []))];
                        return '• ' + row.professor + (turmas.length ? ' — turmas: ' + turmas.join(', ') : '') + '.';
                    }).join('\n') + '\n\nA grade identifica a disciplina como ELETIVA, mas não informa os nomes dos temas. Confirme esses nomes com os professores ou a coordenação.'
                    : 'Não encontrei eletivas acessíveis para essa consulta no cadastro de professores e horários. Confirme com a coordenação ou secretaria.';
                return res.json({ handled: true, solucao, formato: 'texto', fonte: 'base-escolar' });
            } catch (error) {
                const falha = erroConsulta(error);
                return res.status(falha.status).json({ handled: true, erro: falha.mensagem, codigo: falha.codigo });
            }
        }
        const buscaLivre = !topicos.length && !intencao.horario && !intencao.localizacao && !intencao.listaTurmas
            && (/\bescola\b|suriname/.test(normalizar(pergunta)) || perguntaGestao(pergunta));
        if (buscaLivre) {
            try {
                const resultado = await buscar(pergunta);
                let solucao = resultado.registros.map(row => row.conteudo).join('\n\n');
                if (!solucao) return responderSemInformacao('Não encontrei informação publicada que responda a essa pergunta. Você pode reformular ou confirmar com a secretaria.');
                else {
                    const resumo = await elaborar(pergunta, [resultado], { env, permitirPerguntaDireta: true });
                    if (resumo) solucao = resumo;
                }
                return res.json({ handled: true, solucao, formato: 'texto', fonte: 'base-escolar' });
            } catch (error) {
                const falha = erroConsulta(error);
                return res.status(falha.status).json({ handled: true, erro: falha.mensagem, codigo: falha.codigo });
            }
        }
        if (!intencao.horario && !intencao.localizacao && !intencao.listaTurmas && !topicos.length) return res.json({ handled: false });
        const partes = [];
        const escola = informacoesEscola(env);
        let origemLocalizacao;
        if (intencao.localizacao) {
            let local = escola;
            try {
                const registro = await localizar(env);
                if (registro) local = { ...escola, ...registro };
            } catch {
                // A informação confirmada pode ser usada, mas não afirmar que veio do banco.
            }
            origemLocalizacao = local.origem;
            partes.push(local.origem === 'supabase-conhecimentos' ? local.endereco : `${local.nome}: ${local.endereco}`);
        }
        const resultados = [];
        for (const topico of topicos) {
            try {
                const resultado = await conteudos(topico, pergunta);
                resultados.push(resultado);
                if (resultado.registros.length) partes.push(formatarConteudos(resultado));
            }
            catch (error) {
                const falha = erroConsulta(error);
                return res.status(falha.status).json({ handled: true, erro: falha.mensagem, codigo: falha.codigo });
            }
        }
        if (!partes.length && resultados.length && resultados.every(r => !r.registros.length)
            && !intencao.listaTurmas && !intencao.turmas.length) {
            return responderSemInformacao(resultados.map(formatarConteudos).join('\n\n'));
        }
        if (perguntaAberta(pergunta) && !intencao.horario && !intencao.localizacao && !intencao.listaTurmas
            && resultados.length && resultados.every(r => r.origem === 'conhecimentos' && r.status === 'disponivel')) {
            const resposta = await elaborar(pergunta, resultados, { env });
            if (resposta) partes.splice(0, partes.length, resposta);
        }
        let aulas;
        let turma;
        let dia;
        if (intencao.listaTurmas) {
            try {
                const catalogo = await listar();
                partes.push(catalogo.turmas.length ? `Turmas cadastradas: ${catalogo.turmas.map(item => item.nome).join(', ')}. Para ver as aulas, escolha uma turma e um dia ou peça a semana completa.` : 'Nenhuma turma está visível na base escolar. Confirme o cadastro e as permissões com a secretaria.');
            } catch (error) {
                const falha = erroConsulta(error);
                return res.status(falha.status).json({ handled: true, erro: falha.mensagem, codigo: falha.codigo });
            }
        }
        if (intencao.horario && !intencao.listaTurmas && (!topicos.length || intencao.turmas.length)) {
            if (intencao.turmas.length !== 1 || intencao.dias.length !== 1) {
                partes.push('Informe uma turma e um único dia da semana. Exemplo: “Quais são as aulas do 3ºC (DS) na sexta-feira?”. Use o nome completo da turma como cadastrado na escola.');
            } else {
                [turma] = intencao.turmas;
                [dia] = intencao.dias;
                try { aulas = await consultar(turma, dia); }
                catch (error) {
                    const falha = erroConsulta(error);
                    return res.status(falha.status).json({ handled: true, erro: falha.mensagem, codigo: falha.codigo });
                }
                turma = aulas[0]?.turma || turma;
                if (intencao.numeroAula) aulas = aulas.filter(aula => Number(aula.numero_aula) === intencao.numeroAula);
                if (!aulas.length) partes.push(`Não encontrei aulas acessíveis para ${turma} em ${dia}. Confira o nome completo da turma na aba Horários ou com a secretaria. Uma lista vazia também pode indicar restrição de acesso aos dados.`);
                else {
                    const linhas = aulas.map(aula => `${dia === 'SEMANA' ? aula.dia_semana + ' · ' : ''}${aula.numero_aula ?? '?'}ª aula · ${aula.horario_inicio || 'horário não informado'} · ${aula.disciplina || 'disciplina não informada'} · ${aula.professor || 'professor(a) não informado(a)'}`);
                    partes.push(`Aulas de ${turma} em ${dia === 'SEMANA' ? 'segunda a sexta-feira' : dia}:\n${linhas.join('\n')}`);
                }
            }
        }
        return res.json({ handled: true, solucao: partes.join('\n\n'), formato: 'texto', fonte: 'base-escolar', ...(origemLocalizacao ? { origemLocalizacao } : {}), ...(aulas ? { turma, dia, aulas } : {}) });
    };
}
module.exports = { interpretar, informacoesEscola, criarPerguntaEscola };
