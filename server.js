require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./database');
const { GoogleGenAI } = require('@google/genai');
const { criarConsultaHorarios } = require('./horarios');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '32kb' }));
app.use('/api', rateLimit({
    windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { erro: 'Muitas solicitações. Aguarde um minuto e tente novamente.' }
}));
const assets = {
    '/vendor/bootstrap.min.css': 'bootstrap/dist/css/bootstrap.min.css',
    '/vendor/bootstrap.bundle.min.js': 'bootstrap/dist/js/bootstrap.bundle.min.js',
    '/vendor/marked.umd.js': 'marked/lib/marked.umd.js',
    '/vendor/purify.min.js': 'dompurify/dist/purify.min.js'
};
for (const [route, file] of Object.entries(assets)) {
    app.get(route, (req, res) => res.sendFile(path.join(__dirname, 'node_modules', file)));
}
app.use(express.static(path.join(__dirname, 'public')));

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
app.get('/api/horarios', criarConsultaHorarios());

// Endpoint para diagnosticar erro com Gemini
app.post('/api/diagnosticar', async (req, res) => {
    const { logErro } = req.body || {};
    
    if (typeof logErro !== 'string' || !logErro.trim() || logErro.length > 10000) {
        return res.status(400).json({ erro: 'O log de erro é obrigatório.' });
    }
    if (!ai) return res.status(503).json({ erro: 'O assistente de IA ainda não está configurado. A consulta de horários está disponível na aba Horários.' });

    try {
        const prompt = `Você é o SuriAgent, um Agente de Suporte Técnico experiente para estudantes de tecnologia.
O usuário enviou a seguinte mensagem/dúvida/erro:
---
${logErro}
---
Responda de forma clara, direta e amigável. Use formatação Markdown (com destaque para blocos de código se houver). Focado sempre em ajudar no aprendizado de programação e configuração de ambiente.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.json({ solucao: response.text });
    } catch (error) {
        console.error('Falha na API do Gemini', { status: error.status || 'indisponivel' });
        res.status(500).json({ erro: 'Ocorreu um erro ao processar sua solicitação de diagnóstico.' });
    }
});

// Endpoint para listar templates
app.get('/api/templates', (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
