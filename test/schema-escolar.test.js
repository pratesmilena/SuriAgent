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
