// Gzip budget per asset group (KB, gzip -9). Numbers and reasons: Plan Deploy Task 2 (devops §2, F3, L6, P-D1..P-D4).
// Usage: node scripts/check-budget.mjs [dir]   (default dist/assets)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// First match wins; 'rest' catches every lazy chunk Rolldown names after modules (Mermaid diagrams, sql-formatter as esm-*).
const GROUPS = [
  ['html', /^index\.html$/, 12], // L132: Lily's six stages (wrapper groups, collar, harness, legs), 9.7 KB gz. ui-ux-v6 D-V6: mascot sprite redrawn as parts (M1, 9.0 KB after T4). ui-ux-v5 §2: dist/index.html (one level above the assets): the mascot sprite and boot script, 7.9 KB before v5
  ['main', /^index-.*\.js$/, 500], // user 2026-11-18: raised from 290 to 500. Before: Plan 7 V1 (needs the user's OK): 268 after Plan 6; routes, sidebar, onboarding and ~90 VI strings. Was 270 (L55)
  ['tickets', /^ticketSources-/, 110], // ticket markdown, lazy, fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule); V22-E (L201): ch1–8 only, frontmatter as JSON
  ['ticketLate', /^ticketLateSources-/, 50], // V22-E (L201): Logistics tickets of chapters 9–12 (src/ticketLateSources.ts), fetched in parallel with `tickets` by loadContent()
  ['lanes', /^laneSources-/, 20], // lane briefs and side tasks (content/lanes/), lazy, fetched at boot beside the tickets (Plan 5)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
  ['lessons', /^lessonSources-/, 35], // quick lessons (content/lessons.yml), lazy, fetched at boot beside the tickets (Plan 6): 8 KB for 11 lessons; Plan 8a: 38 lessons, ~0.75 KB each
  ['art', /^logistics-/, 20], // Plan 8b D8b-2: Tien Sa scene, route map and completion scenes, lazy (prefetched when idle after the first render): 7 KB, took 6 KB off main
  ['illustrations', /^illustrations-/, 15], // Plan 8b D8b-8: drawn illustrations (learning path, modules, empty states, Finance), lazy, fetched by the first page that shows one
  ['css', /^index-.*\.css$/, 22], // v24 R0 (L338): 20 → 22; v23 shipped at 20,433 B of 20,480, the learning-path pages and the full lesson page add ~70 B (layout in plain CSS)
  // ENG-DYNAMO (L245): @dynoxide/wasm-engine 1.5.0 (DynamoDB emulator) copied as plain assets by src/engine/dynamo/worker.ts:
  // its worker script (69 KB gz -9) + dynoxide_bg.wasm (704) + sqlite3.wasm (391) = 1,170 KB gz, fetched only on the first
  // DynamoDB run (the lab worker itself, ~2 KB gz, falls in `worker`). Optional (4th field) until a page imports
  // src/engine/dynamo/client.ts: no importer = nothing built. Never precached (scripts/offline.mjs).
  ['dynamo', /^(dynoxide-worker|dynoxide_bg|sqlite3)-/, 1300], // required since L248 (LAB_RUNNERS.dynamodb imports the client)
  ['worker', /^worker-/, 160],
  ['pglite', /^pglite-/, 5560],
  ['initdb', /^initdb-/, 140],
  ['parser', /^(libpg-query|parser|steps)-/, 410],
  ['fonts', /\.woff2$/, 60], // Plan 7 V2: Nunito variable, latin 39 KB + vietnamese 13 KB (woff2 is already compressed)
  ['general', /^generalSources-/, 40], // v19 L167: skill drills (content/general/sql.yml, 4 per skill since L168) + parsers, lazy: 31 KB gz after the split (was 68/70 with adv.yml, Plan 8a D8a-12)
  ['generalAdv', /^generalAdvSources-/, 50], // v19 L167: advanced DA track (content/general/adv.yml), its own lazy chunk: 46 KB gz (roadmap §2.6 guessed ≤ 15; adv.yml is the bigger file)
  ['interview', /^interview(Sources|View)-/, 25], // v17 I5 (L144): 19 KB gz at T1 (content 12 + UI 7). The interview room, lazy: content/general/interview.yml + parser (interviewSources) and its UI + VI/EN text (interviewView), fetched only on #/learn/interview or a run
  ['learnui', /^(learnView|drillBrief)-/, 25], // v33 (L535): 24.2 → 18.4 KB gz, the full lesson page moved to `learnLesson`. Plan 8a D8a-12/13: General UI (drill workspace, learning path) and its VI/EN text, lazy
  ['learnLesson', /^lessonPage-/, 9], // v33 (L535): src/ui/lessonPage.ts + src/fullLesson.ts (the General full lesson page and its parser), split out of learnui; lazy beside the lesson's gl-<skill> chunk: 7.2 KB gz
  ['generalLesson', /^gl-[a-z0-9_]+-[\w-]{8}\.js$/, 8, 'each'], // v24 R0 (L337): one lazy chunk per General full lesson (content/general/lessons/<skill>.md as JSON; vite.config.ts names it gl-<skill>), fetched when its skill page opens; per file
  ['ecom', /^ecomSources-/, 50], // Plan 9: content/domains/ecom (30 tickets, chapters, people, KPIs), lazy on the first visit (D9-16); V22-E (L201): tickets of ch1–4 only
  ['ecomLate', /^ecomLateSources-/, 25], // V22-E (L201): E-com tickets of chapters 5+ (src/ecomLateSources.ts), fetched in parallel with `ecom` by loadDomain('ecommerce')
  ['ecomart', /^ecommerce-/, 10], // Plan 9: src/art/ecommerce.ts (store scene, delivery map), lazy
  ['ecomseed', /^ecomSeed-/, 10], // Plan 9: src/db/ecom/{schema,seed}.sql, lazy in the worker on ensure('ecom'): 7.6 KB gz -9 measured on the source (D9-16)
  ['fin', /^finSources-/, 50], // Plan 11 T2: content/domains/fin (since v20 L185: tickets of chapters 1–4 + chapters, people, KPIs), lazy on the first visit (product-design-v9 §6.4)
  ['finlate', /^finLateSources-/, 30], // v20 (L185): Finance tickets of chapters 5–7 (src/finLateSources.ts), fetched in parallel with `fin` by loadDomain('finance'); `fin` keeps ch1–4 + chapters/people/KPIs
  ['finseed', /^finSeed-/, 10], // Plan 11 T1: src/db/fin/{schema,seed}.sql, lazy in the worker on ensure('fin') (product-design-v9 §6.4)
  ['finart', /^finance-/, 10], // Plan 11 T6: src/art/finance.ts (counter scene, branch map, completion dock), lazy; after fin/finseed (finSources-/finSeed- never match ^finance-)
  ['gameseed', /^gameSeed-/, 16], // v12.0 P1 (Plan 10 D10-1): src/db/{schema,seed}.sql, lazy in the worker on ensure('game'): 13.3 KB gz -9 on the source
  ['gsap', /^gsap-/, 50], // ui-ux-v6 §2.1: src/art/gsap.ts (GSAP 3.15.1 core + MorphSVG, DrawSVG, MotionPath, Physics2D, CustomEase), lazy: 45 KB measured in v6
  ['frame', /^frame-/, 4], // v13 (product-design-v8 §4): src/frame.ts, the hint scaffold, lazy on the first "fill the scaffold" (brief.ts, lessonCard.ts): 2.9 KB gz; v14 T3 (ROLLUP, NULLS, JT clause, WHERE/CASE breaks; v9 R3 allows +1 KB): 3.2 KB gz
  ['me', /^meView-/, 13], // v33 (L536): 12.1 → 9.3 KB gz, the exports moved to `meExport`. v24 L333: 12 → 13 (37 badge conditions + skill map in VI/EN, minus the certificate SVG; 12.5 measured). v16 (L142): src/ui/meView.ts + src/me.ts + src/i18n/me.ts (#/me page, skill map + badges (v24 L323, certificates removed), portfolio, dashboard file/PNG exports), lazy on the first #/me visit or export click
  ['meExport', /^meExport-/, 5], // v33 (L536): src/ui/meExport.ts + src/meExport.ts + src/i18n/meExport.ts (portfolio, take-home and dashboard card files, card pictures, the share guard), split out of `me`; lazy on the first export, import or share click: 3.9 KB gz
  ['sqlmotion', /^sqlMotion-/, 8], // v10 Track A (L154): src/art/sqlMotion.ts, the Execution order film, GROUP BY fold, JOIN pairs and the guess, VI/EN text inside; lazy on the first draw of that tab
  ['portfolioPng', /^portfolioPng-/, 6], // V19-D (L170): src/ui/portfolioPng.ts + src/portfolio.ts (card pictures, portfolio zip, take-home file), lazy on the first picture or portfolio click: 3.2 KB gz
  ['datasetPanel', /^datasetPanel-/, 5], // V20-B: Sandbox sample-dataset panel, lazy (4.0 KB gz); the CSV itself is public/datasets/, fetched on click, not in assets
  ['engine', /^engineSources-/, 40], // ENG-CORE (L220), L248: the Database Engine lesson index (list fields of every lesson as JSON, src/engineSources.ts), fetched on the first #/engine or #/me visit: 23 KB gz for 195 lessons
  ['engineLesson', /^\d\d-[a-z0-9-]+-[\w-]{8}\.js$/, 8, 'each'], // L248: one lazy chunk per lesson (content/engine/<engine>/L<n>/<NN>-<slug>.md as JSON), fetched when it opens; per file, 5.9 KB gz max at integration
  ['engineui', /^engineView-/, 20], // v33 (L537): 19.3 → 17.9 KB gz, the result extras moved to `engineResult`. ENG-CORE (L220): src/ui/engineView.ts + src/engine/{content,labs,vizRegistry,inside}.ts + src/i18n/engine.ts (pages, lesson viewer, graders, VI/EN text), lazy: 9.7 KB gz at T1
  ['engineuiPath', /^enginePathView-/, 6], // L280: the NoSQL path pages (src/ui/enginePathView.ts), split out of engineView in the Engine redesign; lazy on the first #/engine/mongodb/path
  ['engineTerms', /^engineTermsSources-/, 50], // v27 (L412): content/engine/glossary.yml as JSON (296 terms, every field the page shows), lazy beside a lesson's chunk or on #/engine/terms: 46.2 KB gz (design-v27 §4.2 guessed 39 for 270)
  ['engineTermsUi', /^engineTerms-/, 8], // v27 (L412): src/ui/engineTerms.ts + src/engine/glossary.ts + src/i18n/engineTerms.ts (glossary page, term buttons and popovers): 4.7 KB gz
  ['engineIvBank', /^iv-(postgres|mongodb|dynamodb)-/, 48, 'each'], // v27 (L412): one interview bank per engine (content/engine/iv-<engine>.yml as JSON), fetched when the room shows that engine; per file: pg 44.1 (fixtures), mg 39.6, dy 39.0 KB gz
  ['engineInterviewUi', /^engineInterview-/, 12], // v27 (L412): src/ui/engineInterview.ts + src/engine/{interviewBank,engineInterviewPrefs}.ts + src/i18n/engineInterview.ts, lazy on #/engine/interview: 10.1 KB gz
  ['engineCompare', /^engineCompare-/, 18], // v28 E-CMP (L433): src/ui/engineCompare.ts + src/engine/compare.ts + src/i18n/engineCompare.ts ("Which engine?" #/engine/compare: nine axes, evidence lines, twelve scenarios, VI/EN), lazy from engineView: 15.1 KB gz
  ['engineDeep', /^deepLinks-/, 3], // v28 LINK (L433): src/engine/deepLinks.ts (skill/node → Engine lesson ids + their VI/EN titles for the "Đào sâu" chips), lazy from main's src/ui/deepDive.ts on the first skill page or drill brief: 2.2 KB gz
  ['engineCapstone', /^engineCapstone-/, 6], // v23 CAP (L257): src/ui/engineCapstone.ts (step bar, "Chấm bằng", before/after plans), lazy from engineView on a capstone; its own group since the v22 redesign left engineui no room for it (L296): 1.9 KB gz; engineui 18.7 KB after the move
  ['engineFull', /^engineFull-/, 8], // v30.1 F01 (L480): src/ui/engineFull.ts + src/engine/demo.ts + src/i18n/engineFull.ts (an Engine lesson's contents, icon sections, runnable examples/pitfalls), lazy from engineView on every lesson; engineui was at its 20 KB ceiling
  ['engineResult', /^engineResult-/, 3], // v33 (L537): src/ui/engineResult.ts + src/engine/inside.ts + src/i18n/engineResult.ts (engine numbers and the pageinspect "Inside" table under a result), split out of engineui; lazy with engineFull on every lesson: 2.1 KB gz
  ['engineNosql', /^engineNosql-/, 6], // v25 (L370): src/ui/engineNosql.ts + src/i18n/engineNosql.ts (NoSQL lab tables panel moved out of engineView, MongoDB rule bar, "Pipeline từng bước", "So với SQL"), lazy from engineView on a MongoDB/DynamoDB lab
  ['engineDynamo', /^engineDynamo-/, 5], // v26 (L380): 3.3 KB gz, src/ui/engineDynamo.ts + src/i18n/engineDynamo.ts (src/engine/dynamo/cost.ts, shared with the runner, is its own 0.7 KB chunk in rest)) ("Partition / Chi phí" under a DynamoDB run), lazy from engineNosql on the first DynamoDB result
  ['enginePredict', /^enginePredict-/, 7], // v23 PRED (L256): src/ui/{enginePredict,enginePlanTree}.ts + src/engine/predict.ts ("Xem thật", the plan tree, first-pick pref), lazy from engineView on a predict, capstone or plan-diagram lesson: 3.3 KB gz; L296: + src/i18n/enginePredict.ts (the predict and capstone text, moved out of engineui): 5.3 KB gz
  // ENG-PGLAB (L230): the engine lab's own worker (src/engine/pglab/pglabWorker.ts: a second PGlite JS bundle + session +
  // checkers; the .wasm/.data are shared with the game worker) and the contrib tarballs it fetches only when a lab names
  // them (already gzip). 133 / 136 / 1150 KB measured 2026-11-20. Required since ENG-CORE's LAB_RUNNERS.postgres loads it (L220).
  ['pglab', /^pglabWorker-/, 150],
  ['pgext', /^(pageinspect|pg_visibility|amcheck|pg_walinspect|pg_buffercache|pg_freespacemap|bloom|btree_gin|btree_gist|pg_trgm|pg_stat_statements|ltree|cube|earthdistance)\.tar-.*\.gz$/, 160], // L248: + cube, earthdistance (L2 geo lesson)
  ['pgcrypto', /^pgcrypto\.tar-.*\.gz$/, 1160], // bundles OpenSSL: fetched only by a lab that names pgcrypto
  ['postgis', /^postgis\.tar-.*\.gz$/, 20500], // L711: @electric-sql/pglite-postgis 0.2.16 (PostGIS + GEOS/PROJ/GDAL), ~20 MB; fetched only by a lab that names it, never precached
  ['why', /^(why|whyView)-/, 6], // V22-B (L206): "Vì sao?" under a result row: src/ui/whyView.ts (VI/EN inside) + src/viz/why.ts (worker, beside the steps chunk), lazy on the first click
  ['mapteach', /^mapTeach-/, 9], // L311 + L304: label placement (~0.6 KB) + beginner skill gate (~0.3 KB); V22-A (L203): src/ui/mapTeach.ts + src/viz/geo.ts + src/mapQueries.ts (result map: Map tab and Map page questions, VI/EN inside), lazy on the first Map page or Map tab
  ['engineVizNosql', /^engineVizNosql-/, 15], // ENG-VIZ (L236): MongoDB + DynamoDB diagrams (src/engine/viz/engineVizNosql.ts), lazy from engineViz's loadViz()
  ['engineVizTenant', /^engineVizTenant-/, 8], // v34 (L544) + v35 (L553): pg-tenancy-models, pg-rls-path (src/engine/viz/engineVizTenant.ts), lazy from engineViz's loadViz()
  ['engineVizPg', /^engineVizPgFlow-/, 12], // v23 PG-VIZ (L264): pg-query-path, pg-partition-prune, pg-replication (src/engine/viz/engineVizPgFlow.ts), lazy from engineViz's loadViz()
  ['engineViz', /^engineViz(Core|PlanJson)?-/, 30],
  // v39 F1 (L601): the figure builder (src/engine/viz/figure.ts + the Nunito glyph table glyphs.ts; it shares engineVizCore with
  // engineViz), lazy on the first lesson with `figures:`; and one chunk per spec (content/figures/<name>.yml as JSON), per file.
  ['engineFigure', /^figure-/, 12], // v42 (L697): 11 → 12 for ER mode (entity, row-anchored relationship links, self loop, edge patches per step); v41 R3 (L679): 10 → 11 for the stacked-layout routing (shared slots, lanes beside stacked rows, group edge ends, phone rows, lane labels); v41 (L669a): 9 → 10 after merging v40 R2 (cell anchors, crow's feet) with v41 row arrows; v40 (L643): 7 → 9 for groups, table/doc, side lanes, elbow labels, cell highlight, tip spreading
  ['figureSpec', /^fig-[a-z0-9-]+-[\w-]{8}\.js$/, 2, 'each'], // ENG-VIZ (L235/L236): diagram engine (engineVizCore-*, shared with the NoSQL chunk; engineVizPlanJson-*, EXPLAIN JSON helpers shared with engineVizPgFlow, v23 L264) + Postgres diagrams (engineViz-*), lazy; built as a second entry until ENG-CORE imports it
  ['ics', /^ics-/, 2], // V22-C (L209): src/ics.ts, the weekly reminder file, lazy on "Thêm nhắc vào lịch": 0.7 KB gz
  // L248: the lab runtimes' main-thread side, lazy on the first lab of an engine: the three LabRunner adapters (runner-*),
  // the Mongo engine (mingo + shell parser, engineMongo-*, loaded in its worker), its shop data and the NoSQL path dataset
  // (content/engine/mongodb/path/dataset.json, dataset-*): 75 KB gz at integration.
  ['engineLab', /^(runner|engineMongo|mongoSeed\w*|dataset)-[\w-]{8}\.js$/, 90],
  // L248: the MongoDB path ("Lộ trình NoSQL"): 12 parts of skills, lessons and 168 drills (content/engine/mongodb/path/*.yml as
  // JSON) + the shell parser for its ESR/covered rules, lazy on the first path page: 72 KB gz at integration.
  ['enginePath', /^engineMongoPath-/, 80],
  // BP-LINT (L273): Boon's best-practice tip (src/ui/bpTip.ts, 3.6 KB, lazy when the workspace mounts), the rules
  // (src/viz/bpLint.ts, 1.8) and libpg-query's JS on the main thread (named after its wasm/index.js, 14.8; the .wasm is the
  // worker's file, already in `parser`), both lazy on the first lintable run: 20.2 KB gz at integration. Main +0.1 KB.
  ['bplint', /^(bpTip|bpLint|wasm)-[\w-]{8}\.js$/, 22],
  // v24 BP-T/BP-UI (L345/L346): Best Practice, lazy with the engine chunk. bpindex = list fields of the 60 released cards +
  // tracks.yml + habits.yml (src/bestSources.ts); bpsql/bppg = one chunk per track with the full cards (src/bestSql.ts,
  // src/bestPg.ts), fetched when a card of that track opens; bpui = src/ui/engineBest.ts + src/engine/best.ts +
  // src/i18n/best.ts (+ the bp-tips pref shared with bptip, src/bpPref.ts). Measured at v24: 12.8 / 27.5 / 32.4 / 13.2 KB gz.
  // The design's 4/20/20 assumed per-card chunks (catalogue §13.1.4); the task asked for per-track loaders, so the ceilings
  // are the measurement plus a little room. MongoDB/DynamoDB cards are not in the build (src/engine/best.ts RELEASED).
  ['bpindex', /^bestSources-/, 14],
  ['bpsql', /^bestSql-/, 30],
  ['bppg', /^bestPg-/, 35],
  // v25 BP-MG (L374): the 38 MongoDB cards. bpindexMg = their list fields (src/bestMongoIndex.ts, fetched beside bestSources,
  // which keeps its 14 KB); bpmongo = the full cards (src/bestMongo.ts), fetched when a MongoDB card opens.
  ['bpindexMg', /^bestMongoIndex-/, 8], // measured 5.8 KB gz at v25
  ['bpmongo', /^bestMongo-/, 42], // measured 39.3 KB gz at v25 (38 cards; bppg is 33 for 30)
  // v26 BP-DY (L383): the 32 DynamoDB cards, same split as MongoDB (bestDynamoIndex beside bestSources; bestDynamo on open).
  ['bpindexDy', /^bestDynamoIndex-/, 8], // measured 4.7 KB gz at v26
  ['bpdynamo', /^bestDynamo-/, 48], // measured 45.5 KB gz at v26 (32 cards; the dynoxide setups carry their items, e.g. d06 48 orders)
  ['bpui', /^(engineBest|bpPref)-/, 15],
  ['palette', /^palette-/, 4], // v30.1 F12 (L490): src/ui/palette.ts + src/palette.ts ({mod}+K search: skills, Engine lessons, terms; VI/EN inside), lazy on the first open; the Engine index and glossary are their own chunks
  ['rest', /./, 1560],
];

const dir = process.argv[2] ?? 'dist/assets';
const sums = {};
const maxes = {};
const files = readdirSync(dir).map((f) => [f, `${dir}/${f}`]);
if (existsSync(`${dir}/../index.html`)) files.push(['index.html', `${dir}/../index.html`]);
for (const [f, path] of files) {
  const [name] = GROUPS.find(([, re]) => re.test(f));
  const kb = gzipSync(readFileSync(path), { level: 9 }).length / 1024;
  sums[name] = (sums[name] ?? 0) + kb;
  maxes[name] = Math.max(maxes[name] ?? 0, kb);
}
let fail = false;
for (const [name, , budget, mode] of GROUPS) {
  const optional = mode === 'optional';
  // 'each' (L248): the budget is per file (one lazy chunk per lesson, only the open one is fetched); the line shows the largest.
  const kb = mode === 'each' ? maxes[name] : sums[name];
  if (kb === undefined && optional) {
    console.log(`skip ${name.padEnd(10)} not in this build (not wired yet)`);
    continue;
  }
  const bad = kb === undefined || kb > budget; // a missing group means the build changed shape: look before deploying
  fail ||= bad;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name.padEnd(10)} ${kb === undefined ? (optional ? 'not built (no importer yet)' : 'not found') : `${kb.toFixed(0).padStart(5)} KB gz / ${budget} KB`}`);
}
// ui-ux-v6 §2.1/§2.2: no GSAP in main, and GSAP's copyright notice kept in its chunk (its licence forbids removing it).
const text = (re) => files.filter(([f]) => re.test(f)).map(([, path]) => readFileSync(path, 'utf8')).join(' ');
const gsapText = text(/^gsap-.*\.js$/);
for (const [ok, what] of [
  [!text(/^index-.*\.js$/).includes('GreenSock'), 'main has no GSAP'],
  [!text(/^index-.*\.js$/).includes('dynoxide'), 'main has no DynamoDB engine'],
  // V22-E (L201): content YAML is JSON at build time (scripts/contentJson.mjs); these strings are the `yaml` library's own.
  [!/YAMLParseError|Implicit keys of flow sequence/.test(text(/^index-.*\.js$/)), 'main has no yaml library'],
  [/@license Copyright 2008-\d+, GreenSock/.test(gsapText), 'gsap chunk keeps its @license notice'],
]) {
  fail ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
}
process.exit(fail ? 1 : 0);
