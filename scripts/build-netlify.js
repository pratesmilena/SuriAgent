const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
require('./build-ui');
const target = path.join(root, 'dist');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public'), target, { recursive: true });
for (const [route, file] of Object.entries(require('../web-assets'))) {
    const dest = path.join(target, route);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, 'node_modules', file), dest);
}
console.log('Publicação Netlify preparada em dist, com dependências visuais locais.');
