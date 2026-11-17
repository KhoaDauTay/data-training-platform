// Gzip budget per asset group (KB, gzip -9). Numbers and reasons: Plan Deploy Task 2 (devops §2, F3, L6, P-D1..P-D4).
// Usage: node scripts/check-budget.mjs [dir]   (default dist/assets)
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// First match wins; 'rest' catches every lazy chunk Rolldown names after modules (Mermaid diagrams, sql-formatter as esm-*).
const GROUPS = [
  ['main', /^index-.*\.js$/, 290], // Plan 7 V1 (needs the user's OK): 268 after Plan 6; routes, sidebar, onboarding and ~90 VI strings. Was 270 (L55)
  ['tickets', /^ticketSources-/, 110], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule)
  ['lanes', /^laneSources-/, 20], // lane briefs and side tasks (content/lanes/), lazy, fetched at boot beside the tickets (Plan 5)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
  ['lessons', /^lessonSources-/, 35], // quick lessons (content/lessons.yml), lazy, fetched at boot beside the tickets (Plan 6): 8 KB for 11 lessons; Plan 8a: 38 lessons, ~0.75 KB each
  ['css', /^index-.*\.css$/, 20],
  ['worker', /^worker-/, 160],
  ['pglite', /^pglite-/, 5560],
  ['initdb', /^initdb-/, 140],
  ['parser', /^(libpg-query|parser|steps)-/, 410],
  ['fonts', /\.woff2$/, 60], // Plan 7 V2: Nunito variable, latin 39 KB + vietnamese 13 KB (woff2 is already compressed)
  ['general', /^generalSources-/, 70], // Plan 8a D8a-12: drills (content/general/sql.yml) + advanced nodes (adv.yml) + parsers, lazy, fetched only when a drill or General page opens
  ['learnui', /^(learnView|drillBrief)-/, 25], // Plan 8a D8a-12/13: General UI (drill workspace, learning path) and its VI/EN text, lazy
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
