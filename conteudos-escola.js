const { conteudoDaTarde } = require('./escopo-tarde');
const { getSupabase } = require('./supabase');
const { consultarConhecimentos } = require('./conhecimentos-escola');
const { consultarProfessores } = require('./professores-escola');
const TOPICOS = Object.freeze({ historia: 'História da escola', cursos: 'Cursos oferecidos', projetos: 'Projetos desenvolvidos', ambiente: 'Ambiente escolar', eventos: 'Eventos da escola', espacos: 'Espaços da escola', faq: 'Perguntas frequentes', professores: 'Professores e disciplinas' });
function normalizar(texto) { return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function identificarTopicos(pergunta) {
    const texto = normalizar(pergunta);
    const regras = {
        professores: /\b(?:professor|professora|professores|professoras|prof|profs|docente|docentes|leciona|lecionam|ensina|ensinam|ministra|ministram)\b|quem da aula/,
        historia: /historia (?:da |desta |de nossa )?escola|fundacao da escola|quando.{0,30}(?:fundada|inaugurada|criada)|quem fundou|historia.{0,25}suriname|origem da escola|trajetoria da escola|por que.{0,25}(?:suriname|ina)|conhecida.{0,20}ina|apelido da escola/,
        cursos: /cursos oferecidos|(?:que|quais).{0,20}cursos|cursos.{0,35}(?:escola|oferec|disponiveis)|ensino (?:medio|fundamental)|curso tecnico|itinerarios? formativos?|linguagens.{0,10}humanas|exatas.{0,10}natureza|(?:curso|tecnico|formacao).{0,25}desenvolvimento de sistemas|(?:quais|que).{0,20}(?:turnos|etapas de ensino)|(?:turnos|series|anos).{0,25}(?:oferec|escola|disponiveis)/,
        projetos: /quais.{0,20}projetos|projetos desenvolvidos|projetos.{0,25}escola|projeto politico.pedagogico|\bppp\b|projetos? de leitura|reforco escolar|olimpiadas.{0,25}escola|acoes.{0,25}comunidade/,
        ambiente: /ambiente escolar|infraestrutura|estrutura da escola|convivencia|seguranca da escola|rotina.{0,25}escola|entrada e saida|movimento.{0,25}escola|perfil comunitario|convivio.{0,25}escola/,
        eventos: /\beventos\b|proximo evento|calendario escolar|agenda da escola|feiras? (?:e mostras )?culturais?|mostras? culturais?|festa junina|show de talentos|interclasse|gincana|volta as aulas|reuniao de pais|datas? (?:das? |de )?(?:provas|recuperacao)/,
        espacos: /\bespacos\b|laboratorios?\b|\bquadra\b|\bauditorio\b|acessibilidade|(?:tem|possui|ha).{0,20}biblioteca|biblioteca.{0,20}escola|sala de (?:leitura|informatica)|\bpatio\b|refeitorio|cozinha.{0,20}escola|salas? de (?:aula|direcao|coordenacao)/,
        faq: /perguntas frequentes|duvidas frequentes|\bfaq\b|matricula|documentos.{0,20}(?:escola|levar|preciso)|uniforme|merenda|cantina|transferencia escolar|\binep\b|\bideb\b|censo escolar|quantos.{0,20}alunos|publica ou privada|(?:horario|contato|telefone).{0,25}(?:secretaria|direcao|escola)|(?:que horas|quando).{0,25}escola.{0,15}(?:abre|fecha|funciona)|funcionamento.{0,20}escola|rede de ensino|diretoria de ensino|seduc/
    };
    return Object.keys(regras).filter(topico => regras[topico].test(texto) || new RegExp(`^${topico}[?.! ]*$`).test(texto));
}
function termosFaq(pergunta) {
    const texto = normalizar(pergunta);
    return ['matricula','documentos','uniforme','merenda','cantina','transferencia','secretaria','telefone'].filter(termo => texto.includes(termo));
}
async function consultarConteudos(topico, pergunta = '', source = getSupabase(), agora = new Date()) {
    if (!Object.hasOwn(TOPICOS, topico)) throw Object.assign(new Error('Tópico inválido.'), { status: 400 });
    if (topico === 'professores') return consultarProfessores(pergunta + ' tarde', source);
    const eventos = topico === 'eventos';
    const tabela = eventos ? 'escola_eventos' : 'escola_conteudos';
    let query = source.from(tabela).select(eventos
        ? 'id,slug,titulo,conteudo,inicio,fim,local,publico_alvo,fonte,verificado_em'
        : 'id,categoria,slug,titulo,conteudo,fonte,verificado_em', { count: 'exact' }).eq('publicado', true);
    if (!eventos) {
        query = query.eq('categoria', topico);
        const termos = topico === 'faq' ? termosFaq(pergunta) : [];
        if (termos.length) query = query.textSearch('busca', termos.join(' OR '), { type: 'websearch', config: 'portuguese' });
        query = query.order('titulo');
    } else {
        if (!/passados|realizados|anteriores|aconteceram/.test(normalizar(pergunta))) {
            const iso = agora.toISOString();
            query = query.or(`fim.gte.${iso},and(fim.is.null,inicio.gte.${iso})`);
        }
        query = query.order('inicio');
    }
    const { data: recebidos, error, count } = await query.limit(20).abortSignal(AbortSignal.timeout(10000));
    if (error) {
        if (['PGRST205','42P01'].includes(error.code)) return consultarConhecimentos(topico, pergunta, source);
        throw error;
    }
    const data = (recebidos || []).map(row => conteudoDaTarde({ ...row, id: null })).filter(Boolean);
    if (!eventos && !data.length) return consultarConhecimentos(topico, pergunta, source);
    if (eventos) {
        const { data: gerais, error: erroGerais, count: totalGerais } = await source.from('escola_conteudos')
            .select('id,categoria,slug,titulo,conteudo,fonte,verificado_em', { count: 'exact' })
            .eq('publicado', true).eq('categoria', 'eventos').order('titulo').limit(20)
            .abortSignal(AbortSignal.timeout(10000));
        if (erroGerais && !['PGRST205','42P01'].includes(erroGerais.code)) throw erroGerais;
        const registros = [...data, ...(gerais || []).map(row => conteudoDaTarde({ ...row, id: null, informacao_geral: true })).filter(Boolean)];
        if (!registros.length) return consultarConhecimentos(topico, pergunta, source);
        return { topico, status: registros.length ? 'disponivel' : 'sem_conteudo_publicado', registros, total: (count ?? data.length) + (totalGerais ?? gerais?.length ?? 0) };
    }
    return { topico, status: data.length ? 'disponivel' : 'sem_conteudo_publicado', registros: data.map(row => conteudoDaTarde({ ...row, id: null })).filter(Boolean), total: count ?? data.length };
}
function formatarConteudos(resultado) {
    const titulo = TOPICOS[resultado.topico];
    if (resultado.status === 'tabela_pendente') return `${titulo}: esta parte da base escolar ainda está sendo preparada. Não há informação oficial disponível para responder agora.`;
    const avisos = resultado.avisos?.length ? '\n\n' + resultado.avisos.join('\n') : '';
    if (!resultado.registros.length) return `${titulo}: não encontrei informação publicada para esta consulta. Confirme com a secretaria. Não vou completar essa informação por suposição.${avisos}`;
    // A base conhecimentos já fornece o texto final; títulos servem apenas à busca.
    if (resultado.origem === 'conhecimentos') return resultado.registros.map(row => row.conteudo).join('\n\n');
    if (resultado.resposta_sucinta) return resultado.registros[0].conteudo;
    const blocos = resultado.registros.map(row => {
        let extra = '';
        if (resultado.topico === 'eventos' && !row.informacao_geral) {
            const inicio = new Date(row.inicio);
            const data = Number.isNaN(inicio.getTime()) ? 'data não informada' : inicio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
            extra = `\nQuando: ${data}${row.local ? '\nLocal: ' + row.local : ''}${row.publico_alvo ? '\nPúblico: ' + row.publico_alvo : ''}`;
        }
        if (resultado.topico === 'professores') {
            if (row.origens) {
                const fontes = row.origens.map(origem => origem.tipo === 'horarios'
                    ? `Período da tarde · turmas: ${origem.turmas.join(', ')}.`
                    : `${origem.etapa.replace(/_/g, ' ')}.`);
                return `${row.professor} — ${row.disciplina}\n${fontes.join('\n')}`;
            }
            return `${row.professor} — ${row.disciplina} (${row.etapa.replace(/_/g, ' ')})`;
        }
        return `${row.titulo}\n${row.conteudo}${extra}`;
    });
    return `${titulo}\n\n${blocos.join('\n\n')}${resultado.total > resultado.registros.length ? `\n\nExibindo ${resultado.registros.length} de ${resultado.total} registros. Consulte a secretaria para mais informações.` : ''}${avisos}`;
}
function criarListaConteudos(consultar = consultarConteudos) {
    return async (req, res) => {
        const topico = req.params.topico;
        if (!Object.hasOwn(TOPICOS, topico)) return res.status(400).json({ erro: 'Tópico escolar inválido.' });
        try { return res.json(await consultar(topico)); }
        catch { return res.status(503).json({ erro: 'Não foi possível consultar os conteúdos escolares agora.' }); }
    };
}
module.exports = { TOPICOS, identificarTopicos, consultarConteudos, formatarConteudos, criarListaConteudos };
