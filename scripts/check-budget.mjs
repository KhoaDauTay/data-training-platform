// Gzip budget per asset group (KB, gzip -9). Numbers and reasons: Plan Deploy Task 2 (devops §2, F3, L6, P-D1..P-D4).
// Usage: node scripts/check-budget.mjs [dir]   (default dist/assets)
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// First match wins; 'rest' catches every lazy chunk Rolldown names after modules (Mermaid diagrams, sql-formatter as esm-*).
const GROUPS = [
  ['main', /^index-.*\.js$/, 270],
  ['css', /^index-.*\.css$/, 20],
  ['worker', /^worker-/, 160],
  ['pglite', /^pglite-/, 5560],
  ['initdb', /^initdb-/, 140],
  ['parser', /^(libpg-query|parser|steps)-/, 410],
  ['rest', /./, 1560],
];

const dir = process.argv[2] ?? 'dist/assets';
const sums = {};
for (const f of readdirSync(dir)) {
  const [name] = GROUPS.find(([, re]) => re.test(f));
  sums[name] = (sums[name] ?? 0) + gzipSync(readFileSync(`${dir}/${f}`), { level: 9 }).length / 1024;
}
let fail = false;
for (const [name, , budget] of GROUPS) {
  const kb = sums[name];
  const bad = kb === undefined || kb > budget; // a missing group means the build changed shape: look before deploying
  fail ||= bad;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name.padEnd(7)} ${kb === undefined ? 'not found' : `${kb.toFixed(0).padStart(5)} KB gz / ${budget} KB`}`);
}
process.exit(fail ? 1 : 0);
