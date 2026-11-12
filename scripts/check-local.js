require('dotenv').config({ quiet: true });
const { verificarConfiguracaoLocal } = require('../configuracao-local');
const status = verificarConfiguracaoLocal();
console.log(JSON.stringify({ ...status,
    observacao: 'Esta checagem verifica preenchimento e formato. Use check:school e check:gemini para testar o acesso real; login Google depende das URLs autorizadas no Supabase.' }, null, 2));
if (!status.prontaParaTestar) process.exitCode = 2;
