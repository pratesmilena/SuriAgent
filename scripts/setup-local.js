const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
try {
    fs.copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'), fs.constants.COPYFILE_EXCL);
    console.log('.env criado a partir do exemplo. Preencha os valores localmente; não envie chaves ao GitHub ou ao chat.');
} catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('.env existente preservado. Confira SURI_GEMINI e as variáveis Supabase sem substituir as configurações já preenchidas.');
}
