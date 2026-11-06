const { getSupabase } = require('./supabase');
const { consultarProfessores } = require('./professores-escola');
const TOPICOS = Object.freeze({ historia: 'História da escola', cursos: 'Cursos oferecidos', projetos: 'Projetos desenvolvidos', ambiente: 'Ambiente escolar', eventos: 'Eventos da escola', espacos: 'Espaços da escola', faq: 'Perguntas frequentes', professores: 'Professores e disciplinas' });
function normalizar(texto) { return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function identificarTopicos(pergunta) {
    const texto = normalizar(pergunta);
    const regras = {
        professores: /\b(?:professor|professora|professores|professoras|prof|profs|docente|docentes|leciona|lecionam|ensina|ensinam|ministra|ministram)\b|quem da aula/,
        historia: /historia (?:da |desta |de nossa )?escola|fundacao da escola|quando.{0,30}(?:fundada|inaugurada|criada)|quem fundou|historia.{0,25}suriname/,
        cursos: /cursos oferecidos|(?:que|quais).{0,20}cursos|cursos.{0,35}(?:escola|oferec|disponiveis)|ensino (?:medio|fundamental)|curso tecnico/,
        projetos: /quais.{0,20}projetos|projetos desenvolvidos|projetos.{0,25}escola/,
        ambiente: /ambiente escolar|infraestrutura|estrutura da escola|convivencia|seguranca da escola/,
        eventos: /\beventos\b|proximo evento|calendario escolar|agenda da escola|feira cultural|festa junina/,
        espacos: /\bespacos\b|laboratorios?\b|\bquadra\b|\bauditorio\b|acessibilidade|(?:tem|possui|ha).{0,20}biblioteca|biblioteca.{0,20}escola/,
        faq: /perguntas frequentes|duvidas frequentes|\bfaq\b|matricula|documentos.{0,20}(?:escola|levar|preciso)|uniforme|merenda|cantina|transferencia escolar|\binep\b|(?:horario|contato|telefone).{0,25}(?:secretaria|direcao|escola)/
    };
    return Object.keys(regras).filter(topico => regras[topico].test(texto) || new RegExp(`^${topico}[?.! ]*$`).test(texto));
}
function termosFaq(pergunta) {
    const texto = normalizar(pergunta);
    return ['matricula','documentos','uniforme','merenda','cantina','transferencia','secretaria','telefone'].filter(termo => texto.includes(termo));
}
async function consultarConteudos(topico, pergunta = '', source = getSupabase(), agora = new Date()) {
    if (!Object.hasOwn(TOPICOS, topico)) throw Object.assign(new Error('Tópico inválido.'), { status: 400 });
    if (topico === 'professores') return consultarProfessores(pergunta, source);
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
    const { data, error, count } = await query.limit(20).abortSignal(AbortSignal.timeout(10000));
    if (error) {
        if (['PGRST205','42P01'].includes(error.code)) return { topico, status: 'tabela_pendente', registros: [], total: 0 };
        throw error;
    }
    return { topico, status: data.length ? 'disponivel' : 'sem_conteudo_publicado', registros: data, total: count ?? data.length };
}
function formatarConteudos(resultado) {
    const titulo = TOPICOS[resultado.topico];
    if (resultado.status === 'tabela_pendente') return `${titulo}: esta parte da base escolar ainda está sendo preparada. Não há informação oficial disponível para responder agora.`;
    const avisos = resultado.avisos?.length ? '\n\n' + resultado.avisos.join('\n') : '';
    if (!resultado.registros.length) return `${titulo}: não encontrei informação publicada para esta consulta. Confirme com a secretaria. Não vou completar essa informação por suposição.${avisos}`;
    const blocos = resultado.registros.map(row => {
        let extra = '';
        if (resultado.topico === 'eventos') {
            const inicio = new Date(row.inicio);
            const data = Number.isNaN(inicio.getTime()) ? 'data não informada' : inicio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
            extra = `\nQuando: ${data}${row.local ? '\nLocal: ' + row.local : ''}${row.publico_alvo ? '\nPúblico: ' + row.publico_alvo : ''}`;
        }
        if (resultado.topico === 'professores') {
            if (row.origens) {
                const fontes = row.origens.map(origem => origem.tipo === 'horarios'
                    ? `Horários da tarde · turmas: ${origem.turmas.join(', ')}. Fonte: ${origem.fonte}.`
                    : `Cadastro docente · ${origem.etapa.replace(/_/g, ' ')}. Fonte: ${origem.fonte}${origem.verificado_em ? '. Verificado em: ' + origem.verificado_em : ''}.`);
                return `${row.professor} — ${row.disciplina}\n${fontes.join('\n')}`;
            }
            return `${row.professor} — ${row.disciplina} (${row.etapa.replace(/_/g, ' ')})\nFonte: ${row.fonte}\nVerificado em: ${row.verificado_em}`;
        }
        return `${row.titulo}\n${row.conteudo}${extra}\nFonte: ${row.fonte || 'Cadastro publicado pela escola'}${row.verificado_em ? '\nVerificado em: ' + row.verificado_em : ''}`;
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
