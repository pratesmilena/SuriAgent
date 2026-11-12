require('dotenv').config();
const { createApp } = require('./app');
const platform = process.env.RENDER === 'true' ? 'render' : 'local';
const db = platform === 'local' ? require('./database') : null;
const PORT = process.env.PORT || 3000;
const app = createApp({ templatesDb: db, platform });
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
