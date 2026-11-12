const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let revision = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_REF || '';
if (!revision) { try { revision = require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: root }).trim(); } catch {} }
fs.writeFileSync(path.join(root, 'config/build-info.generated.json'), JSON.stringify({ revision: /^[a-f0-9]{7,40}$/i.test(revision) ? revision : null }));
