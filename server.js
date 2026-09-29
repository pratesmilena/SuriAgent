require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./database');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint para diagnosticar erro com Gemini
app.post('/api/diagnosticar', async (req, res) => {
    const { logErro, detalhes } = req.body;
    
    if (!logErro) {
        return res.status(400).json({ erro: 'O log de erro é obrigatório.' });
    }

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
        console.error('Erro ao chamar a API do Gemini:', error);
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
    const { linguagem, titulo, descricao, codigo_fonte, tags } = req.body;
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
