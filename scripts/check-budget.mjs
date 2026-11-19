// Gzip budget per asset group (KB, gzip -9). Numbers and reasons: Plan Deploy Task 2 (devops §2, F3, L6, P-D1..P-D4).
// Usage: node scripts/check-budget.mjs [dir]   (default dist/assets)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// First match wins; 'rest' catches every lazy chunk Rolldown names after modules (Mermaid diagrams, sql-formatter as esm-*).
const GROUPS = [
  ['html', /^index\.html$/, 12], // L132: Lily's six stages (wrapper groups, collar, harness, legs), 9.7 KB gz. ui-ux-v6 D-V6: mascot sprite redrawn as parts (M1, 9.0 KB after T4). ui-ux-v5 §2: dist/index.html (one level above the assets): the mascot sprite and boot script, 7.9 KB before v5
  ['main', /^index-.*\.js$/, 500], // user 2026-11-18: raised from 290 to 500. Before: Plan 7 V1 (needs the user's OK): 268 after Plan 6; routes, sidebar, onboarding and ~90 VI strings. Was 270 (L55)
  ['tickets', /^ticketSources-/, 110], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule)
  ['lanes', /^laneSources-/, 20], // lane briefs and side tasks (content/lanes/), lazy, fetched at boot beside the tickets (Plan 5)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
  ['lessons', /^lessonSources-/, 35], // quick lessons (content/lessons.yml), lazy, fetched at boot beside the tickets (Plan 6): 8 KB for 11 lessons; Plan 8a: 38 lessons, ~0.75 KB each
  ['art', /^logistics-/, 20], // Plan 8b D8b-2: Tien Sa scene, route map and completion scenes, lazy (prefetched when idle after the first render): 7 KB, took 6 KB off main
  ['illustrations', /^illustrations-/, 15], // Plan 8b D8b-8: drawn illustrations (learning path, modules, empty states, Finance), lazy, fetched by the first page that shows one
  ['css', /^index-.*\.css$/, 20],
  ['worker', /^worker-/, 160],
  ['pglite', /^pglite-/, 5560],
  ['initdb', /^initdb-/, 140],
  ['parser', /^(libpg-query|parser|steps)-/, 410],
  ['fonts', /\.woff2$/, 60], // Plan 7 V2: Nunito variable, latin 39 KB + vietnamese 13 KB (woff2 is already compressed)
  ['general', /^generalSources-/, 40], // v19 L167: skill drills (content/general/sql.yml, 4 per skill since L168) + parsers, lazy: 31 KB gz after the split (was 68/70 with adv.yml, Plan 8a D8a-12)
  ['generalAdv', /^generalAdvSources-/, 50], // v19 L167: advanced DA track (content/general/adv.yml), its own lazy chunk: 46 KB gz (roadmap §2.6 guessed ≤ 15; adv.yml is the bigger file)
  ['interview', /^interview(Sources|View)-/, 25], // v17 I5 (L144): 19 KB gz at T1 (content 12 + UI 7). The interview room, lazy: content/general/interview.yml + parser (interviewSources) and its UI + VI/EN text (interviewView), fetched only on #/learn/interview or a run
  ['learnui', /^(learnView|drillBrief)-/, 25], // Plan 8a D8a-12/13: General UI (drill workspace, learning path) and its VI/EN text, lazy
  ['ecom', /^ecomSources-/, 50], // Plan 9: content/domains/ecom (30 tickets, chapters, people, KPIs), lazy on the first visit (D9-16)
  ['ecomart', /^ecommerce-/, 10], // Plan 9: src/art/ecommerce.ts (store scene, delivery map), lazy
  ['ecomseed', /^ecomSeed-/, 10], // Plan 9: src/db/ecom/{schema,seed}.sql, lazy in the worker on ensure('ecom'): 7.6 KB gz -9 measured on the source (D9-16)
  ['fin', /^finSources-/, 50], // Plan 11 T2: content/domains/fin (since v20 L185: tickets of chapters 1–4 + chapters, people, KPIs), lazy on the first visit (product-design-v9 §6.4)
  ['finlate', /^finLateSources-/, 30], // v20 (L185): Finance tickets of chapters 5–7 (src/finLateSources.ts), fetched in parallel with `fin` by loadDomain('finance'); `fin` keeps ch1–4 + chapters/people/KPIs
  ['finseed', /^finSeed-/, 10], // Plan 11 T1: src/db/fin/{schema,seed}.sql, lazy in the worker on ensure('fin') (product-design-v9 §6.4)
  ['finart', /^finance-/, 10], // Plan 11 T6: src/art/finance.ts (counter scene, branch map, completion dock), lazy; after fin/finseed (finSources-/finSeed- never match ^finance-)
  ['gameseed', /^gameSeed-/, 16], // v12.0 P1 (Plan 10 D10-1): src/db/{schema,seed}.sql, lazy in the worker on ensure('game'): 13.3 KB gz -9 on the source
  ['gsap', /^gsap-/, 50], // ui-ux-v6 §2.1: src/art/gsap.ts (GSAP 3.15.1 core + MorphSVG, DrawSVG, MotionPath, Physics2D, CustomEase), lazy: 45 KB measured in v6
  ['frame', /^frame-/, 4], // v13 (product-design-v8 §4): src/frame.ts, the hint scaffold, lazy on the first "fill the scaffold" (brief.ts, lessonCard.ts): 2.9 KB gz; v14 T3 (ROLLUP, NULLS, JT clause, WHERE/CASE breaks; v9 R3 allows +1 KB): 3.2 KB gz
  ['me', /^meView-/, 12], // v16 (L142): src/ui/meView.ts + src/me.ts + src/i18n/me.ts (#/me page, certificates, portfolio, dashboard file/PNG exports), lazy on the first #/me visit or export click
  ['sqlmotion', /^sqlMotion-/, 8], // v10 Track A (L154): src/art/sqlMotion.ts, the Execution order film, GROUP BY fold, JOIN pairs and the guess, VI/EN text inside; lazy on the first draw of that tab
  ['portfolioPng', /^portfolioPng-/, 6], // V19-D (L170): src/ui/portfolioPng.ts + src/portfolio.ts (card pictures, portfolio zip, take-home file), lazy on the first picture or portfolio click: 3.2 KB gz
  ['datasetPanel', /^datasetPanel-/, 5], // V20-B: Sandbox sample-dataset panel, lazy (4.0 KB gz); the CSV itself is public/datasets/, fetched on click, not in assets
  // ENG-PGLAB (L230): the engine lab's own worker (src/engine/pglab/pglabWorker.ts: a second PGlite JS bundle + session +
  // checkers; the .wasm/.data are shared with the game worker) and the contrib tarballs it fetches only when a lab names
  // them (already gzip). 133 / 136 / 1150 KB measured 2026-11-20. Optional (`true`) until ENG-CORE imports PgLabClient.
  ['pglab', /^pglabWorker-/, 150, true],
  ['pgext', /^(pageinspect|pg_visibility|amcheck|pg_walinspect|pg_buffercache|pg_freespacemap|bloom|btree_gin|btree_gist|pg_trgm|pg_stat_statements|ltree)\.tar-.*\.gz$/, 145, true],
  ['pgcrypto', /^pgcrypto\.tar-.*\.gz$/, 1160, true], // bundles OpenSSL: fetched only by a lab that names pgcrypto
  ['rest', /./, 1560],
];

const dir = process.argv[2] ?? 'dist/assets';
const sums = {};
const files = readdirSync(dir).map((f) => [f, `${dir}/${f}`]);
if (existsSync(`${dir}/../index.html`)) files.push(['index.html', `${dir}/../index.html`]);
for (const [f, path] of files) {
  const [name] = GROUPS.find(([, re]) => re.test(f));
  sums[name] = (sums[name] ?? 0) + gzipSync(readFileSync(path), { level: 9 }).length / 1024;
}
let fail = false;
for (const [name, , budget, optional] of GROUPS) {
  const kb = sums[name];
  if (kb === undefined && optional) {
    console.log(`skip ${name.padEnd(10)} not in this build (not wired yet)`);
    continue;
  }
  const bad = kb === undefined || kb > budget; // a missing group means the build changed shape: look before deploying
  fail ||= bad;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name.padEnd(10)} ${kb === undefined ? 'not found' : `${kb.toFixed(0).padStart(5)} KB gz / ${budget} KB`}`);
}
// ui-ux-v6 §2.1/§2.2: no GSAP in main, and GSAP's copyright notice kept in its chunk (its licence forbids removing it).
const text = (re) => files.filter(([f]) => re.test(f)).map(([, path]) => readFileSync(path, 'utf8')).join(' ');
const gsapText = text(/^gsap-.*\.js$/);
for (const [ok, what] of [
  [!text(/^index-.*\.js$/).includes('GreenSock'), 'main has no GSAP'],
  [/@license Copyright 2008-\d+, GreenSock/.test(gsapText), 'gsap chunk keeps its @license notice'],
]) {
  fail ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
}
process.exit(fail ? 1 : 0);
