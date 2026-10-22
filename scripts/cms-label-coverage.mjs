import { readFileSync } from 'node:fs';
import { MESSAGES } from '../lib/uiMessages.ts';
const rows = JSON.parse(readFileSync('lib/_cmsKeys.json', 'utf8'));
let match = 0;
for (const row of rows) {
  if (row.key in MESSAGES.en) match++;
}
console.log('keys in messages', match, '/', rows.length);
