// Regenerates docs/knowledge/database/boondata-gap-map.md from tutorial-routes.json + rules.mjs + gap-head/gap-tail.md.
// Rules live in rules.mjs; edit them there when BoonData's coverage changes. Run: npm run kb:gen.
import { readFileSync, writeFileSync } from 'node:fs';
import { CORE, OTHER, classify, short, sortTutorials } from './rules.mjs';

const OUT = new URL('../../docs/knowledge/database/', import.meta.url);
const R = JSON.parse(readFileSync(new URL('tutorial-routes.json', OUT), 'utf8'));
const tuts = sortTutorials(R.tutorials);
const counts = {};
let tables = '';
for (const t of tuts) {
  if (!CORE.includes(t.slug)) continue;
  const c = (counts[t.slug] = {});
  tables += `\n### ${t.slug}\n\n| # | Section | Chapter | Status | BoonData coverage (Engine / General) | Knowledge file |\n|---|---|---|---|---|---|\n`;
  for (const s of t.sections) for (const ch of s.chapters) {
    const [st, cov, kb] = classify(t.slug, ch.title);
    c[st] = (c[st] ?? 0) + 1;
    tables += `| ${ch.order} | ${s.section} | [${short(ch.title)}](${ch.url}) | ${st} | ${cov} | ${kb ? `[${kb}](${kb})` : ''} |\n`;
  }
}
let tbl = '| Tutorial | covered | partial | missing | n/a | unmapped |\n|---|---|---|---|---|---|\n';
for (const [k, c] of Object.entries(counts))
  tbl += `| ${k} | ${c.covered ?? 0} | ${c.partial ?? 0} | ${c.missing ?? 0} | ${c['n/a'] ?? 0} | ${c.unmapped ?? 0} |\n`;
let other = '| Tutorial | Chapters | Status | Why |\n|---|---|---|---|\n';
for (const t of tuts) {
  if (CORE.includes(t.slug)) continue;
  const [st, why] = OTHER[t.slug] ?? ['unmapped', 'new tutorial: add it to OTHER in scripts/kb/rules.mjs'];
  other += `| [${t.title}](${t.index}) | ${t.chapters} | ${st} | ${why} |\n`;
}
const head = readFileSync(new URL('gap-head.md', import.meta.url), 'utf8');
const tail = readFileSync(new URL('gap-tail.md', import.meta.url), 'utf8');
writeFileSync(new URL('boondata-gap-map.md', OUT),
  head.replaceAll('{{COUNTS}}', () => tbl).replaceAll('{{OTHER}}', () => other).replaceAll('{{TABLES}}', () => tables) + tail);
const unmapped = tuts.filter((t) => CORE.includes(t.slug)).flatMap((t) => t.sections.flatMap((s) => s.chapters
  .filter((ch) => classify(t.slug, ch.title)[0] === 'unmapped').map((ch) => `${t.slug}: ${ch.title}`)));
console.log('gap map:', JSON.stringify(counts));
if (unmapped.length) console.log(`unmapped ${unmapped.length} (add rules in scripts/kb/rules.mjs):\n  ${unmapped.join('\n  ')}`);
