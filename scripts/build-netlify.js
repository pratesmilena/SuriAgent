const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
require('./build-ui');
let revision = process.env.COMMIT_REF || '';
if (!revision) { try { revision = require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {} }
fs.writeFileSync(path.join(root, 'config/build-info.generated.json'), JSON.stringify({ revision: /^[a-f0-9]{7,40}$/i.test(revision) ? revision : null }));
const target = path.join(root, 'dist');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public'), target, { recursive: true });
for (const [route, file] of Object.entries(require('../web-assets'))) {
    const dest = path.join(target, route);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, 'node_modules', file), dest);
}
console.log('Publicação Netlify preparada em dist, com dependências visuais locais.');
