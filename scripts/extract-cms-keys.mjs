import fs from 'node:fs';

const re =
  /\{ key: '([^']+)', label: (?:"((?:\\"|[^"])*)"|'((?:\\'|[^'])*)')/g;

function extractRows(src) {
  const rows = [];
  let m;
  while ((m = re.exec(src))) {
    const raw = m[2] ?? m[3];
    rows.push({
      key: m[1],
      label: raw.replace(/\\'/g, "'").replace(/\\"/g, '"'),
    });
  }
  return rows;
}

const siteChrome = fs.readFileSync('lib/siteChrome.ts', 'utf8');
const pageMeta = fs.readFileSync('lib/chromePageMeta.ts', 'utf8');

const byKey = new Map();
for (const row of extractRows(siteChrome)) byKey.set(row.key, row);
for (const row of extractRows(pageMeta)) {
  if (!byKey.has(row.key)) byKey.set(row.key, row);
}

const rows = [...byKey.values()];
console.log('count', rows.length);
fs.writeFileSync('lib/_cmsKeys.json', JSON.stringify(rows, null, 2));
