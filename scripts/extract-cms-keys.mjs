import fs from 'node:fs';
const t = fs.readFileSync('lib/siteChrome.ts', 'utf8');
const re = /\{ key: '([^']+)', label: '((?:\\'|[^'])*)'/g;
const rows = [];
let m;
while ((m = re.exec(t))) rows.push({ key: m[1], label: m[2].replace(/\\'/g, "'") });
console.log('count', rows.length);
fs.writeFileSync('lib/_cmsKeys.json', JSON.stringify(rows, null, 2));
