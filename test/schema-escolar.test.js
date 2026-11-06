const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const {PGlite}=require('@electric-sql/pglite');
test('SQL aditivo é repetível, protege rascunhos e permite somente leitura publicada',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE conhecimentos(id int primary key, conteudo text); INSERT INTO conhecimentos VALUES (4,\'preservado\'); CREATE TABLE horario_aulatarde(id int); INSERT INTO horario_aulatarde VALUES (1);');
  const sql=await fs.readFile('docs/sql/001_conteudos_escolares.sql','utf8');await db.exec(sql);await db.exec(sql);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM conhecimentos')).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM horario_aulatarde')).rows[0].n,1);
  await db.exec("INSERT INTO escola_conteudos(categoria,slug,titulo,conteudo) VALUES ('historia','rascunho','Rascunho','Não publicado'); INSERT INTO escola_conteudos(categoria,slug,titulo,conteudo,fonte,verificado_em,publicado) VALUES ('cursos','curso-teste','Curso de teste','Conteúdo de teste','Fonte de teste',CURRENT_DATE,true);");
  await assert.rejects(db.exec("INSERT INTO escola_conteudos(categoria,slug,titulo,publicado) VALUES ('faq','sem-fonte','Não revisado',true)"));
  await assert.rejects(db.exec("INSERT INTO escola_eventos(slug,titulo,conteudo,fonte,verificado_em,publicado) VALUES ('evento-sem-data','Teste','Teste','Fonte',CURRENT_DATE,true)"));
  await db.exec("INSERT INTO escola_eventos(slug,titulo) VALUES ('evento-rascunho','Evento não publicado'); INSERT INTO escola_eventos(slug,titulo,conteudo,inicio,fonte,verificado_em,publicado) VALUES ('evento-publico','Evento publicado','Teste',now(),'Fonte',CURRENT_DATE,true);");
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`);const rows=(await db.query('SELECT titulo FROM escola_conteudos')).rows;assert.equal(rows.length,1);assert.equal(rows[0].titulo,'Curso de teste');
   await assert.rejects(db.exec("INSERT INTO escola_conteudos(categoria,slug,titulo) VALUES ('faq','nao-permitido','Não permitido')"));
   const events=(await db.query('SELECT titulo FROM escola_eventos')).rows;assert.equal(events.length,1);assert.equal(events[0].titulo,'Evento publicado');
   await assert.rejects(db.exec("UPDATE escola_eventos SET publicado=true"));
   await assert.rejects(db.exec("UPDATE escola_conteudos SET publicado=true"));await assert.rejects(db.exec('DELETE FROM escola_conteudos'));await db.exec('RESET ROLE');
  }
 }finally{await db.close();}
});


test('cadastro docente importa 17 professores/29 vínculos como rascunho e preserva correções',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  const sql=await fs.readFile('docs/sql/002_professores_ensino_fundamental.sql','utf8');await db.exec(sql);await db.exec(sql);
  const counts=(await db.query('SELECT count(*)::int AS vinculos,count(DISTINCT professor)::int AS professores FROM escola_professor_disciplinas')).rows[0];assert.deepEqual(counts,{vinculos:29,professores:17});
  await db.exec('SET ROLE anon');assert.equal((await db.query('SELECT professor FROM escola_professor_disciplinas')).rows.length,0);await assert.rejects(db.exec("UPDATE escola_professor_disciplinas SET publicado=true"));await db.exec('RESET ROLE');
  await assert.rejects(db.exec("UPDATE escola_professor_disciplinas SET publicado=true WHERE professor='Marcelo'"));
  await db.exec("UPDATE escola_professor_disciplinas SET disciplina='Efin (?)',observacao='Disciplina informada como Efin (?); confirmar nome completo.' WHERE codigo='fundamental-marcelo-efin'");
  const correcao=await fs.readFile('docs/sql/003_corrigir_disciplina_marcelo.sql','utf8');await db.exec(correcao);await db.exec(correcao);
  const marcelo=(await db.query("SELECT disciplina,observacao,publicado FROM escola_professor_disciplinas WHERE codigo='fundamental-marcelo-efin'")).rows[0];assert.deepEqual(marcelo,{disciplina:'Educação Financeira',observacao:null,publicado:false});
  await db.exec("UPDATE escola_professor_disciplinas SET confirmado=true,verificado_em=CURRENT_DATE,publicado=true WHERE codigo='fundamental-miria-matematica'");
  await db.exec('SET ROLE anon');const rows=(await db.query('SELECT professor,disciplina FROM escola_professor_disciplinas')).rows;assert.equal(rows.length,1);assert.equal(rows[0].professor,'Miria');await db.exec('RESET ROLE');
  await db.exec("UPDATE escola_professor_disciplinas SET professor='Nome revisado' WHERE codigo='fundamental-miria-matematica'");await db.exec(sql);assert.equal((await db.query("SELECT professor FROM escola_professor_disciplinas WHERE codigo='fundamental-miria-matematica'")).rows[0].professor,'Nome revisado');
 }finally{await db.close();}
});

test('publicação revisada preserva correções e expõe somente vínculos correspondentes',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(await fs.readFile('docs/sql/002_professores_ensino_fundamental.sql','utf8'));
  await db.exec("UPDATE escola_professor_disciplinas SET disciplina='Disciplina corrigida' WHERE codigo='fundamental-miria-matematica'");
  const sql=await fs.readFile('docs/sql/004_publicar_professores_revisados.sql','utf8');
  await db.exec(sql);await db.exec(sql);
  await db.exec('SET ROLE anon');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM escola_professor_disciplinas')).rows[0].n,28);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM escola_professor_disciplinas WHERE disciplina='Educação Financeira'")).rows[0].n,1);
  await db.exec('RESET ROLE');
  assert.equal((await db.query("SELECT disciplina,publicado FROM escola_professor_disciplinas WHERE codigo='fundamental-miria-matematica'")).rows[0].publicado,false);
 }finally{await db.close();}
});

test('Ale pode ser pesquisada também como Alessandra sem duplicar vínculos',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(await fs.readFile('docs/sql/002_professores_ensino_fundamental.sql','utf8'));
  const sql=await fs.readFile('docs/sql/005_apelido_professora_ale.sql','utf8');
  await db.exec(sql);await db.exec(sql);
  await db.exec(await fs.readFile('docs/sql/004_publicar_professores_revisados.sql','utf8'));
  await db.exec('SET ROLE anon');
  for(const nome of ['Ale','Alessandra']) {
   const rows=(await db.query("SELECT professor,disciplina,nomes_alternativos FROM escola_professor_disciplinas WHERE busca @@ plainto_tsquery('portuguese',$1)",[nome])).rows;
   assert.equal(rows.length,2);assert.ok(rows.every(r=>r.professor==='Ale' && r.nomes_alternativos==='Alessandra'));
   assert.deepEqual(rows.map(r=>r.disciplina).sort(),['Português','Redação']);
  }
 }finally{await db.close();}
});
