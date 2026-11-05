require('dotenv').config({quiet:true});
const { TOPICOS, consultarConteudos } = require('../conteudos-escola');
(async()=>{
 const report=[];
 for(const topico of Object.keys(TOPICOS)){
  try{const result=await consultarConteudos(topico);report.push({topico,status:result.status,registrosPublicadosVisiveis:result.total});if(result.status!=='disponivel'&&!process.exitCode)process.exitCode=2;}
  catch(error){report.push({topico,status:'falha_de_acesso',codigo:error.code||error.status||'indisponivel'});process.exitCode=1;}
 }
 console.log(JSON.stringify(report,null,2));
})().catch(()=>{console.error('Não foi possível verificar a base de conteúdos.');process.exitCode=1});
