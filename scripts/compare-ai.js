require('dotenv').config({ quiet:true });
const fs=require('node:fs/promises');
const path=require('node:path');
const { PROVIDERS, generateAnswer }=require('../ai');
const tasks=[
    {id:'calculo',prompt:'Responda apenas com o número: quanto é 2 + 2?',expected:'4'},
    {id:'javascript',prompt:'Qual é a saída de console.log([1, 2, 3].map(x => x * 2).join(","))? Responda apenas com a saída, sem Markdown.',expected:'2,4,6'},
    {id:'horarios',prompt:'Qual é a primeira aula do 3ºC na sexta-feira? Se você não tem acesso aos dados oficiais, diga isso e indique onde consultar.',expected:null}
];
async function compare() {
    const report={date:new Date().toISOString(),scope:'Um modelo configurado por provedor, três tarefas públicas, uma execução. Não é uma avaliação de todos os modelos disponíveis.',results:[]};
    for(const [provider,info] of Object.entries(PROVIDERS)) {
        const result={provider,model:process.env[info.modelEnv]||info.model,samples:[]};
        if(info.browser) {result.status='requires_authenticated_browser';report.results.push(result);continue;}
        if(!process.env[info.key]) {result.status='blocked_missing_key';report.results.push(result);continue;}
        for(const task of tasks) {
            const start=performance.now();
            try {
                const answer=await generateAnswer({provider,message:task.prompt});
                result.samples.push({task:task.id,ms:Math.round(performance.now()-start),...answer,exactMatch:task.expected===null?null:answer.solucao.trim()===task.expected,reviewRequired:task.expected===null});
            }catch(error){result.samples.push({task:task.id,status:error.status||502,error:error.message});break;}
        }
        result.status=result.samples.length===tasks.length&&result.samples.every(s=>s.solucao)?'completed_needs_review':'failed';
        report.results.push(result);
    }
    const output=process.argv[2]||'.local/ai-comparison.json';
    await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    if(!report.results.some(r=>r.status==='completed_needs_review'))process.exitCode=2;
}
compare().catch(()=>{console.error('Não foi possível concluir o relatório.');process.exitCode=1});
