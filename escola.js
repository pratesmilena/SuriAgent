const { consultarHorarios, consultarLocalizacao, listarCatalogoHorarios } = require('./supabase');
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
function criarPerguntaEscola({ consultar = consultarHorarios, localizar = consultarLocalizacao, listar = listarCatalogoHorarios, conteudos = consultarConteudos, env = process.env } = {}) {
    return async (req, res) => {
        const { pergunta } = req.body || {};
        if (typeof pergunta !== 'string' || !pergunta.trim() || pergunta.length > 10000) {
            return res.status(400).json({ erro: 'Informe uma pergunta de até 10.000 caracteres.' });
        }
        const intencao = interpretar(pergunta);
        let topicos = identificarTopicos(pergunta);
        if (intencao.turmas.length && intencao.dias.length) topicos = topicos.filter(topico => topico !== 'professores');
        if (topicos.includes('professores')) topicos = topicos.filter(topico => topico !== 'cursos');
        if (!topicos.length && !intencao.horario && !intencao.localizacao && !intencao.listaTurmas && /\bescola\b|suriname/.test(normalizar(pergunta))) topicos.push('faq');
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
            partes.push(`${local.nome}: ${local.endereco}\nFonte: ${local.fonte}`);
            if (local.origem !== 'supabase-conhecimentos') partes.push('Este endereço foi confirmado na configuração do projeto. A leitura da tabela conhecimentos ainda não foi validada nesta consulta.');
        }
        for (const topico of topicos) {
            try { partes.push(formatarConteudos(await conteudos(topico, pergunta))); }
            catch (error) {
                const falha = erroConsulta(error);
                return res.status(falha.status).json({ handled: true, erro: falha.mensagem, codigo: falha.codigo });
            }
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
                    partes.push(`Aulas de ${turma} em ${dia === 'SEMANA' ? 'segunda a sexta-feira' : dia}:\n${linhas.join('\n')}\nFonte: horários cadastrados pela escola no Supabase.`);
                }
            }
        }
        return res.json({ handled: true, solucao: partes.join('\n\n'), formato: 'texto', fonte: 'base-escolar', ...(origemLocalizacao ? { origemLocalizacao } : {}), ...(aulas ? { turma, dia, aulas } : {}) });
    };
}
module.exports = { interpretar, informacoesEscola, criarPerguntaEscola };
