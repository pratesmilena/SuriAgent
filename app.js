const fs = require('node:fs');
const { listaPerguntasFrequentes } = require('./perguntas-frequentes');
const express = require('express');
const path = require('path');
const { criarDiagnostico } = require('./ai');
const { criarConsultaHorarios, criarCatalogoHorarios } = require('./horarios');
const { criarPerguntaEscola, informacoesEscola } = require('./escola');
const { rateLimit } = require('express-rate-limit');
const { authConfig, publicAuthConfig } = require('./auth-config');
const { diagnosticoConfiguracao } = require('./configuracao-supabase');
const { criarListaConteudos } = require('./conteudos-escola');

function createApp({ templatesDb: db = null, platform = 'local' } = {}) {
    const app = express();

    app.use(express.json({ limit: '32kb' }));
    app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    app.use('/api', rateLimit({
        windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false,
        ...(platform === 'netlify' ? { validate: { xForwardedForHeader: false } } : {}),
        message: { erro: 'Muitas solicitações. Aguarde um minuto e tente novamente.' }
    }));
    if (platform === 'local') {
        const assets = require('./web-assets');
        for (const [route, file] of Object.entries(assets)) {
            app.get(route, (req, res) => res.sendFile(path.join(__dirname, 'node_modules', file)));
        }
        app.use(express.static(path.join(__dirname, 'public')));
    }

    app.get('/api/status', (req, res) => {
        let revision = process.env.COMMIT_REF || '';
        if (!revision) { try { revision = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/build-info.generated.json'), 'utf8')).revision || ''; } catch {} }
        revision = /^[a-f0-9]{7,40}$/i.test(revision) ? revision.slice(0, 12) : null;
        res.json({ ambiente: platform, revisao: revision, supabase: diagnosticoConfiguracao(),
            login: { configuracaoPublicaValida: publicAuthConfig().available } });
    });
    app.get('/api/horarios/catalogo', criarCatalogoHorarios());
    app.get('/api/horarios', criarConsultaHorarios());
    app.get('/api/escola', (req, res) => res.json(informacoesEscola()));
    app.get('/api/escola/perguntas-frequentes', (req, res) => res.json(listaPerguntasFrequentes()));
    app.get('/api/escola/conteudos/:topico', criarListaConteudos());
    app.post('/api/escola/perguntar', criarPerguntaEscola());
    app.get('/api/auth/config', async (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json(await authConfig());
    });
    app.post('/api/diagnosticar', criarDiagnostico());

    // Endpoint para listar templates
    app.get('/api/templates', (req, res) => {
        if (!db) return res.status(503).json({ erro: 'O catálogo de templates não está disponível nesta publicação.' });
        db.all('SELECT * FROM templates_codigo ORDER BY id DESC', [], (err, rows) => {
            if (err) {
                res.status(500).json({ erro: err.message });
                return;
            }
            res.json({ templates: rows });
        });
    });

    // Endpoint para cadastrar novo template
    app.post('/api/templates', (req, res) => {
        if (!db) return res.status(503).json({ erro: 'O cadastro de templates não está disponível nesta publicação.' });
        const { linguagem, titulo, descricao, codigo_fonte, tags } = req.body || {};
        if (!linguagem || !titulo || !codigo_fonte) {
            return res.status(400).json({ erro: 'Linguagem, título e código fonte são obrigatórios.' });
        }
        
        const stmt = db.prepare('INSERT INTO templates_codigo (linguagem, titulo, descricao, codigo_fonte, tags) VALUES (?, ?, ?, ?, ?)');
        stmt.run([linguagem, titulo, descricao, codigo_fonte, tags], function(err) {
            if (err) {
                res.status(500).json({ erro: err.message });
                return;
            }
            res.json({ mensagem: 'Template cadastrado com sucesso!', id: this.lastID });
        });
        stmt.finalize();
    });

    return app;
}

module.exports = { createApp };
