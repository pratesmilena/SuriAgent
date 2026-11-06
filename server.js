require('dotenv').config();
const { createApp } = require('./app');
const db = require('./database');
const PORT = process.env.PORT || 3000;
const app = createApp({ templatesDb: db });
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
