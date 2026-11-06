const {getSupabase}=require('./supabase');
const stop=new Set('qual quais sao os as o a de da do das dos e que quem todos todas liste listar nomes nome relacao me mostre sobre corpo quais professores professor professora professoras docentes docente ensina ensinam leciona lecionam disciplina disciplinas materia materias escola ensino fundamental medio no na nos nas da por favor tem quais trabalham trabalha'.split(' '));
function termos(pergunta){return pergunta.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(x=>x&&!stop.has(x));}
async function consultarProfessores(pergunta='',source=getSupabase()){
 let query=source.from('escola_professor_disciplinas')
  .select('id,professor,disciplina,etapa,fonte,verificado_em',{count:'exact'})
  .eq('publicado',true).eq('confirmado',true);
 const texto=pergunta.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(texto.includes('ensino fundamental'))query=query.eq('etapa','ENSINO_FUNDAMENTAL');
 else if(texto.includes('ensino medio'))query=query.eq('etapa','ENSINO_MEDIO');
 const busca=termos(pergunta);
 if(busca.length)query=query.textSearch('busca',busca.join(' '),{type:'plain',config:'portuguese'});
 const{data,error,count}=await query.order('professor').order('disciplina').limit(50).abortSignal(AbortSignal.timeout(10000));
 if(error){if(['PGRST205','42P01'].includes(error.code))return{topico:'professores',status:'tabela_pendente',registros:[],total:0};throw error;}
 return {topico:'professores',status:data.length?'disponivel':'sem_conteudo_publicado',registros:data,total:count??data.length,limite:50};
}
module.exports={consultarProfessores};
