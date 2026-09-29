const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'banco.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Inicializar tabelas
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS conhecimentos_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria TEXT NOT NULL,
            sistema_operacional TEXT NOT NULL,
            problema TEXT NOT NULL,
            solucao_passos TEXT NOT NULL,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS templates_codigo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            linguagem TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT,
            codigo_fonte TEXT NOT NULL,
            tags TEXT
        )
    `);
});

module.exports = db;
