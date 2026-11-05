require('dotenv').config({quiet:true});
const fs=require('node:fs/promises');
const {consultarHorarios,consultarLocalizacao}=require('../supabase');
(async()=>{
 const report={date:new Date().toISOString(),credentials:{supabaseUrl:!!process.env.SUPABASE_URL,supabaseKey:!!process.env.SUPABASE_PUBLISHABLE_KEY},horarios:{},conhecimentos:{}};
 if(!report.credentials.supabaseUrl||!report.credentials.supabaseKey){
  report.horarios.status='blocked_missing_configuration';report.conhecimentos.status='blocked_missing_configuration';process.exitCode=2;
 }else{
  try{const aulas=await consultarHorarios(process.argv[2]||'3ºC (DS)',process.argv[3]||'SEXTA');report.horarios={status:aulas.length?'read_confirmed':'empty_or_rls',count:aulas.length};if(!aulas.length)process.exitCode=2;}
  catch(e){report.horarios={status:e.code==='42501'?'permission_denied':'failed',code:e.code||e.status||'upstream_error',...(e.code==='42501'?{action:'administrator_must_review_select_grants_and_rls'}:{})};process.exitCode=1;}
  try{const local=await consultarLocalizacao();report.conhecimentos={status:local?'read_confirmed':'no_visible_matching_location_check_record_mapping_and_rls'};if(!local&&!process.exitCode)process.exitCode=2;}
  catch(e){report.conhecimentos={status:e.code==='42501'?'permission_denied':'failed',code:e.code||e.status||'upstream_error',...(e.code==='42501'?{action:'administrator_must_review_select_grants_and_rls'}:{})};process.exitCode=1;}
 }
 await fs.mkdir('.local',{recursive:true});await fs.writeFile('.local/school-connection.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(()=>{console.error('Falha ao executar a verificação.');process.exitCode=1});
