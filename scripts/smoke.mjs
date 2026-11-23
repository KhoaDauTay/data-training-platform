// Headless smoke test (product-design-v10 §5.1, V10-D, L150). No dependency: Chrome DevTools Protocol over Node's WebSocket.
//
//   npm run build && npm run smoke                     # starts its own `vite preview` on 5219 (never 5173/5174), stops it after
//   SMOKE_URL=https://khoadautay.github.io/data-training-platform/ npm run smoke   # or: node scripts/smoke.mjs <url>
//
// BROWSER = path or command of Chrome/Edge (default: Edge on Windows, Chrome on macOS, `google-chrome` elsewhere).
// Fresh profile in a temp dir (removed after). Only the processes this script started are stopped, by PID.
// Plays ticket 1 of each domain, one General drill and a lesson's "Thử ngay"; visits every route at 1280 and 375 px.
// Asserts: cargo-query-save.completed holds exactly the ids submitted; cargo-query/lessons.tried holds the lesson; no
// Runtime.exceptionThrown and no console.error; no horizontal scroll at 375; #notice closed once the page is ready; with
// reduced motion the completion dock shows its end state ("Xem lại · Đóng") at once and does not move.
// V20-C (L179): axe-core (node_modules, injected over CDP) on every page of PAGES at 1280 light and 375 dark, failing on
// a serious or critical violation (target-size on); no horizontal scroll at 320 too. Findings: smoke-out/axe-report.json.
// Writes smoke-out/smoke-report.json + one screenshot per step; exits 1 when an assertion fails.
//
//   SMOKE_PERF=3 npm run smoke      # V20-C (L178) instead of the scenario: per run and domain, a fresh profile opens #/d/<d>
//                                   # (seed) and reloads it (snapshot); FCP, first <h1>, DB ready, long tasks -> smoke-out/perf-report.json
//                                   # V22-E: at CPU 1x and 4x (page only), plus ScriptDuration (CDP Performance.getMetrics)
//   SMOKE_BOOT=3 npm run smoke      # V22 BOOT (L247): first open from #/ through the welcome dialog -> smoke-out/boot-report.json
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'smoke-out');
const PORT = Number(process.env.SMOKE_PORT) || 5219; // V10-D: never 5173/5174 (dev servers of other sessions); SMOKE_PORT lets parallel worktrees run at once
const T0 = Date.now();

const DEFAULT_BROWSER = {
  win32: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
}[process.platform] ?? 'google-chrome';
const BROWSER = process.env.BROWSER || DEFAULT_BROWSER;
const URL_ARG = process.argv[2] || process.env.SMOKE_URL || '';

// ---- content: the Solution (variant 0) of each domain's ticket 1, one open drill, the lesson of ticket 1's first skill
function ticket(file) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  const fm = parseYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(src)[1]);
  const sol = /## Solution\s*```sql\r?\n([\s\S]*?)```/.exec(src)[1].trim();
  const v = fm.variants?.[0] ?? {};
  const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(v[k]));
  return { id: fm.id, sql: fill(sol), starter: fm.starter ? fill(String(fm.starter)) : undefined, grants: fm.grants ?? [] };
}
const TICKETS = {
  logistics: ticket('content/tickets/ch1/ch1-01.md'),
  ecommerce: ticket('content/domains/ecom/tickets/ch1/ecom-ch1-01.md'),
  finance: ticket('content/domains/fin/tickets/ch1/fin-ch1-01.md'),
};
const drills = parseYaml(readFileSync(join(ROOT, 'content/general/sql.yml'), 'utf8'));
const DRILL = drills.find((d) => d.kind === 'open'); // an open drill: no ___ starter to fill
// V22-B (L206): the first Logistics Solution with GROUP BY, in story order (chapters by number, files by name).
const GROUPED = readdirSync(join(ROOT, 'content/tickets')).sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)))
  .flatMap((ch) => readdirSync(join(ROOT, 'content/tickets', ch)).sort().map((f) => `content/tickets/${ch}/${f}`))
  .filter((f) => /## Solution\s*```sql[^`]*GROUP BY/.test(readFileSync(join(ROOT, f), 'utf8'))).map(ticket)[0];
const LESSON = parseYaml(readFileSync(join(ROOT, 'content/lessons.yml'), 'utf8')).find((l) => l.id === TICKETS.logistics.grants[0]);
// ENG-CORE (L220): the first Postgres lab in content/engine with no setup and only `rows` steps (the shop chain on `lab`);
// none yet → its step is skipped. Its step solutions are read from the file.
const ENGINE_LAB = (() => {
  const dir = join(ROOT, 'content/engine/postgres');
  const files = existsSync(dir) ? readdirSync(dir).filter((l) => /^L[1-5]$/.test(l)).flatMap((l) => readdirSync(join(dir, l)).filter((f) => f.endsWith('.md')).map((f) => join(dir, l, f))) : [];
  for (const f of files.sort()) {
    const fm = parseYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(f, 'utf8'))?.[1] ?? '') ?? {};
    if (fm.lab && !fm.lab.setup && fm.lab.steps.every((x) => x.check === 'rows')) return { id: fm.id, hash: `#/engine/postgres/${fm.level}/${fm.id}`, steps: fm.lab.steps.map((x) => x.solution) };
  }
  return undefined;
})();

// L248: engine lessons the smoke plays (read from content, so a renamed file fails here, not silently).
const engineLesson = (rel) => {
  const fm = parseYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(ROOT, 'content/engine', rel), 'utf8'))[1]);
  return { ...fm, hash: `#/engine/${fm.engine}/${fm.level}/${fm.id}` };
};
const ENGINE = {
  heap: engineLesson('postgres/L3/05-xmin-xmax-lab.md'),
  mongo: engineLesson('mongodb/L1/04-insert-delete.md'),
  dynamo: engineLesson('dynamodb/L1/09-query-vs-scan.md'),
  quiz: engineLesson('postgres/L3/11-wraparound-quiz.md'),
  predict: engineLesson('postgres/L1/10-explain-basics.md'),
};

// Every route of src/route.ts once; a new route fails here until the smoke knows its hash.
const ROUTE_HASH = {
  home: '#/', learn: '#/learn', practice: '#/practice', me: '#/me', overview: '#/d/logistics', play: '#/d/logistics/play',
  data: '#/d/logistics/data', dashboard: '#/d/logistics/dashboard', map: '#/d/logistics/map', engine: '#/engine',
};
const ROUTES = JSON.parse(/export const ROUTES = (\[[^\]]*\])/.exec(readFileSync(join(ROOT, 'src/route.ts'), 'utf8'))[1].replace(/'/g, '"'));
// V20-C (L179): plus the General sub-pages and the other two domains' pages (the list of tests/axe.test.ts).
const PAGES = [...ROUTES.filter((r) => ROUTE_HASH[r]).map((r) => ROUTE_HASH[r]), '#/learn/sql/1', '#/learn/skill/select', '#/learn/adv/a2', '#/learn/adv/d5',
  '#/learn/interview', '#/engine/postgres', '#/engine/postgres/L1', '#/engine/mongodb/path', '#/engine/mongodb/path/find', '#/engine/dynamodb/L1/e-dy-l1-09', ...(ENGINE_LAB ? [ENGINE_LAB.hash] : []), ...['ecommerce', 'finance'].flatMap((d) => ['', '/play', '/data', '/dashboard', '/map'].map((p) => `#/d/${d}${p}`))];
const mainOf = (hash) => (/\/play$/.test(hash) ? 'shell' : /\/data$/.test(hash) ? 'data' : /\/dashboard$/.test(hash) ? 'dashboard' : 'home');
// axe-core from node_modules (dev dependency, L141; never in dist/), injected into the page over CDP. target-size is off by default.
const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const AXE_RUN = `(async () => {
  // finite animations first (page fade, section steps): axe would read colours mid-fade. Endless loops (mascots, map) stay.
  await Promise.race([Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
    .map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]);
  const r = await axe.run(document, { resultTypes: ['violations'], rules: { 'target-size': { enabled: true } } });
  return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length,
    nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(' '), why: (n.failureSummary ?? '').slice(0, 300) })) }));
})()`;
// v21 (L189): app chrome. `cut` = a shown element in the top bar whose text is wider than its box, or two neighbours that overlap;
// `bottom` = the bottom bar's height (one row of five items).
const CHROME = `(() => {
  const shown = (e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const cut = [...document.querySelectorAll('#status *, #domain-btn *')].filter((e) => shown(e) && e.clientWidth > 2 && !e.matches('[data-badge]') && e.scrollWidth > e.clientWidth + 1).map((e) => e.id || e.textContent.trim().slice(0, 20));
  const row = [...document.querySelector('header').children].filter(shown).map((e) => [e.id || e.className.toString().split(' ')[0], e.getBoundingClientRect()]);
  for (let i = 1; i < row.length; i++) if (row[i][1].left < row[i - 1][1].right - 1 && row[i][1].top < row[i - 1][1].bottom - 1) cut.push(row[i - 1][0] + '|' + row[i][0]);
  const x = document.getElementById('xp').getBoundingClientRect(), c = document.getElementById('chapter').getBoundingClientRect();
  if (shown(document.getElementById('chapter')) && c.right > x.left + 1) cut.push('chapter|xp');
  // QA v22 (L272): nothing past the right edge (the bar overflowed for a player with badges once "Database Engine" joined the nav)
  const over = Math.round(Math.max(0, ...[...document.querySelector('header').querySelectorAll('*')].filter((e) => shown(e) && !e.closest('[popover], .sr-only')).map((e) => e.getBoundingClientRect().right)) - innerWidth);
  if (over > 1) cut.push('off screen by ' + over + ' px');
  return { cut, bottom: Math.round(document.getElementById('bottom-nav').getBoundingClientRect().height) };
})()`;

// ---- report
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const steps = [];
const pageErrors = [];
let failed = false;
const fail = (msg) => {
  throw new Error(msg);
};
async function step(name, fn) {
  const t = Date.now();
  try {
    const detail = await fn();
    steps.push({ name, ok: true, ms: Date.now() - t, ...(detail === undefined ? {} : { detail }) });
    console.log(`ok   ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    failed = true;
    steps.push({ name, ok: false, ms: Date.now() - t, error: String(e?.message ?? e) });
    console.log(`FAIL ${name}: ${e?.message ?? e}`);
  }
  await shot(name).catch(() => {});
}

// ---- processes this script owns (stopped by PID in finally)
const owned = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

async function startPreview() {
  if (!existsSync(join(ROOT, 'dist/index.html'))) fail('dist/ is missing: run `npm run build` first (or pass a URL)');
  try {
    await fetch(`http://127.0.0.1:${PORT}/`);
    fail(`port ${PORT} is already in use; not touching a server this script did not start`);
  } catch (e) {
    if (String(e.message).includes('already in use')) throw e;
  }
  const vite = join(ROOT, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  owned.push(child);
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) fail(`vite preview exited (${child.exitCode})`);
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) return `http://127.0.0.1:${PORT}/`;
    } catch {}
    await sleep(200);
  }
  fail('vite preview did not answer in 20 s');
}

// ---- CDP
let ws;
let cdpId = 0;
const pending = new Map();
let profile;
let browserWs;
let browserChild;
async function startBrowser() {
  profile = mkdtempSync(join(tmpdir(), 'boondata-smoke-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--mute-audio', 'about:blank'];
  if (process.env.CI) args.unshift('--no-sandbox'); // GitHub's ubuntu runner has no user namespace sandbox for Chrome
  const child = browserChild = spawn(BROWSER, args, { stdio: 'ignore' });
  owned.push(child);
  child.on('error', () => {});
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    if (child.exitCode !== null) fail(`browser exited (${child.exitCode}): ${BROWSER}`);
    try {
      const [p, path] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n');
      port = Number(p);
      browserWs = `ws://127.0.0.1:${port}${path.trim()}`;
    } catch {
      await sleep(200);
    }
  }
  if (!port) fail(`browser did not open DevTools in 30 s: ${BROWSER}`);
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {}
    if (!page) await sleep(200);
  }
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.addEventListener('open', r);
    ws.addEventListener('error', j);
  });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
    // v22 (P2-1, L271): workers (PGlite, parser) are attached too, and the Log domain is heard as well: a failed wasm
    // fetch inside the worker reached neither the page's console nor Runtime.exceptionThrown.
    const where = m.sessionId ? 'worker ' : '';
    if (m.method === 'Target.attachedToTarget') {
      const sid = m.params.sessionId;
      for (const k of ['Runtime.enable', 'Log.enable', 'Runtime.runIfWaitingForDebugger']) send(k, {}, sid).catch(() => {});
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      pageErrors.push({ at: Date.now() - T0, kind: `${where}exception`, text: (d.exception?.description ?? d.text ?? '').slice(0, 500) });
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      pageErrors.push({ at: Date.now() - T0, kind: `${where}console.error`, text: m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 500) });
    }
    // console.error is already counted through Runtime; Log adds network, wasm/abort and intervention errors.
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && m.params.entry.source !== 'console-api') {
      const e = m.params.entry;
      pageErrors.push({ at: Date.now() - T0, kind: `${where}log.${e.source}`, text: `${e.text} ${e.url ?? ''}`.trim().slice(0, 500) });
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
}
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const i = ++cdpId;
    const timer = setTimeout(() => reject(new Error(`CDP ${method} timed out`)), 30000);
    pending.set(i, (m) => {
      clearTimeout(timer);
      if (m.error) reject(new Error(`${method}: ${m.error.message}`));
      else resolve(m.result);
    });
    ws.send(JSON.stringify({ id: i, method, params, ...(sessionId && { sessionId }) }));
  });
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result.value;
}
/** Polls `expr` until truthy; a timeout is a failure (never a fixed sleep, §5.1). */
async function waitFor(what, expr, ms = 30000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const v = await ev(expr).catch(() => undefined);
    if (v) return v;
    await sleep(150);
  }
  fail(`timed out after ${ms} ms waiting for ${what}`);
}
async function shot(name) {
  if (!ws) return;
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `${String(steps.length).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '_')}.png`), Buffer.from(r.data, 'base64'));
}
const size = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
const go = (base, hash) => send('Page.navigate', { url: base + hash });
const S = JSON.stringify;
async function key(k, modifiers, code, vk) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers, windowsVirtualKeyCode: vk });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers, windowsVirtualKeyCode: vk });
}
const CTRL = 2;
const SHIFT = 8;
const MOD = process.platform === 'darwin' ? 4 : CTRL; // {mod} = Cmd on macOS
const EDITOR = `document.querySelector('#shell:not([hidden]) #work .cm-content')`;
const editorText = `[...(${EDITOR}?.querySelectorAll('.cm-line') ?? [])].map((l) => l.textContent).join('\\n')`;
const completed = `(JSON.parse(localStorage.getItem('cargo-query-save') || '{}').completed ?? [])`;
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/** Types `sql` into the workspace editor and submits (Mod-Shift-Enter) until `id` is in save.completed. */
async function solve(id, sql, ms = 90000) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await waitFor('the editor and the DB ready', `!!${EDITOR} && !!document.querySelector('#db-status .bg-good')`, 90000);
    await ev(`${EDITOR}.focus()`);
    await key('a', MOD, 'KeyA', 65);
    await send('Input.insertText', { text: sql });
    // the editor may have been replaced while typing (domain entered, ticket switched): check before submitting
    if (norm(await ev(editorText)) !== norm(sql)) continue;
    await key('Enter', MOD | SHIFT, 'Enter', 13);
    const t = Date.now();
    let replaced = false;
    while (Date.now() - t < ms && !replaced) {
      if ((await ev(completed)).includes(id)) return { attempt };
      replaced = norm(await ev(editorText)) !== norm(sql); // a result for a replaced editor only goes to history (render rule): type again
      await sleep(200);
    }
    if (!replaced) fail(`${id} not in save.completed ${ms} ms after Submit`);
  }
  fail(`could not type the Solution of ${id} into a stable editor`);
}

async function closeBrowser() {
  try {
    if (browserWs) {
      const b = new WebSocket(browserWs);
      await Promise.race([new Promise((r) => b.addEventListener('open', r)), sleep(2000)]);
      if (b.readyState === 1) b.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      await sleep(500);
    }
  } catch {}
  ws?.close();
  ws = browserWs = undefined;
  stop(browserChild);
  // V22-E: Edge can hold a profile file a little longer on Windows (EPERM); a leftover temp dir must not end the run.
  try { if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
  profile = undefined;
}

// ---- V20-C performance mode (SMOKE_PERF=<runs>): per domain and run, a fresh profile opens #/d/<domain> (first visit:
// seed) and reloads it (second visit: snapshot). Times are ms from navigation start. Long tasks are counted up to "DB ready".
const PERF_RUNS = Number(process.env.SMOKE_PERF) || 0;
const SCHEMA_OF = { logistics: 'game', ecommerce: 'ecom', finance: 'fin' };
const PERF_PROBE = `(() => { const p = window.__perf = { longTasks: [] };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) p.longTasks.push([Math.round(e.startTime), Math.round(e.duration)]); })
    .observe({ type: 'longtask', buffered: true });
  const seen = () => { if (!p.render && document.querySelector('main:not([hidden]) h1')) p.render = Math.round(performance.now()); };
  new MutationObserver(seen).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); })()`;
async function perfLoad(schema) {
  const m = await waitFor(`db:ensure:${schema}`, `(() => { const e = performance.getEntriesByName('db:ensure:${schema}')[0];
    return e && window.__perf.render && { db: Math.round(e.startTime + e.duration) }; })()`, 120000);
  return ev(`(() => { const p = window.__perf, db = ${m.db}; const before = p.longTasks.filter(([s]) => s < db);
    const js = performance.getEntriesByType('resource').filter((r) => /\\.js$/.test(r.name) && r.startTime < p.render);
    return { fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0), render: p.render, db,
      long: before, longTasks: before.length, longMs: before.reduce((a, [, d]) => a + d, 0), longMax: Math.max(0, ...before.map(([, d]) => d)),
      bootJs: js.map((r) => r.name.split('/').pop().replace(/-[\\w-]{8}\\.js$/, '')) }; })()`);
}
// V22-E: each run is measured at CPU 1x and 4x (Emulation.setCPUThrottlingRate on the page target only; the DB worker is
// not throttled, L187, so 4x measures render and main-thread work, not the seed). `script` = CDP Performance.getMetrics
// ScriptDuration (ms of main-thread script) read at "DB ready"; the metric restarts with each document, so it covers one load.
const RATES = [1, 4];
const scriptMs = async () => Math.round(1000 * (await send('Performance.getMetrics')).metrics.find((m) => m.name === 'ScriptDuration').value);
async function perf(base) {
  const rows = [];
  for (let run = 1; run <= PERF_RUNS; run++) {
    for (const cpu of RATES) for (const d of Object.keys(SCHEMA_OF)) {
      await startBrowser();
      await size(1280, 800);
      await send('Emulation.setCPUThrottlingRate', { rate: cpu });
      await send('Performance.enable');
      await send('Page.addScriptToEvaluateOnNewDocument', { source: PERF_PROBE });
      await go(base, `#/d/${d}`);
      const first = await perfLoad(SCHEMA_OF[d]);
      first.script = await scriptMs();
      await waitFor('db:snapshot', `performance.getEntriesByName('db:snapshot').length > 0`, 60000);
      await ev('window.__old = true');
      await send('Page.reload');
      await waitFor('the reloaded document', '!window.__old && !!window.__perf', 30000);
      const second = await perfLoad(SCHEMA_OF[d]);
      second.script = await scriptMs();
      rows.push({ run, cpu, domain: d, first, second });
      console.log(`run ${run} cpu ${cpu}x ${d.padEnd(9)} first: fcp ${first.fcp} render ${first.render} db ${first.db} script ${first.script} long ${first.longTasks}/${first.longMs}ms`
        + ` | second: fcp ${second.fcp} render ${second.render} db ${second.db} script ${second.script} long ${second.longTasks}/${second.longMs}ms`);
      await closeBrowser();
    }
  }
  const med = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const summary = {};
  for (const cpu of RATES) for (const d of Object.keys(SCHEMA_OF)) for (const k of ['first', 'second'])
    for (const f of ['fcp', 'render', 'db', 'script', 'longTasks', 'longMs', 'longMax'])
      summary[`${cpu}x.${d}.${k}.${f}`] = med(rows.filter((r) => r.domain === d && r.cpu === cpu).map((r) => r[k][f]));
  console.log('medians', summary, 'boot js (first visit):', rows[0].first.bootJs.join(', '));
  writeFileSync(join(OUT, 'perf-report.json'), JSON.stringify({ base, at: new Date().toISOString(), rows, summary }, null, 1));
}

// ---- V22 BOOT (SMOKE_BOOT=<runs>): a fresh profile opens `#/` and walks the welcome dialog as fast as a bot can
// (language → Logistics → start). Times are ms from navigation: dialog shown, Logistics picked, "Begin" enabled, ticket 1
// shown after Begin, engine ready (db:ready), each seed's start/end (db:ensure:<schema>), the DB ready for ticket 1
// (db:ensure:game end). L247: Begin no longer waits for the seed, so it also checks that ticket 1 shows the "preparing"
// banner and a loading dot, that a Run typed during the seed is answered once it is in, with no restart and no page error.
const BOOT_RUNS = Number(process.env.SMOKE_BOOT) || 0;
async function boot(base) {
  const rows = [];
  const vis = (w) => `!!document.querySelector('dialog[open] [data-w="${w}"]')`;
  for (let run = 1; run <= BOOT_RUNS; run++) {
    pageErrors.length = 0;
    await startBrowser();
    await size(1280, 800);
    await go(base, '#/');
    const welcome = await waitFor('the welcome dialog', `document.querySelector('dialog[open] [data-w]') && Math.round(performance.now())`, 60000);
    let picked = 0;
    for (let i = 0; i < 6 && !(await ev(vis('begin'))); i++) {
      await waitFor('a welcome button', `${vis('begin')} || ${vis('pick-logistics')} || ${vis('next')}`, 60000);
      if (await ev(vis('pick-logistics'))) {
        picked = await ev(`(document.querySelector('dialog[open] [data-w="pick-logistics"]').click(), Math.round(performance.now()))`);
      } else if (await ev(vis('next'))) await ev(`document.querySelector('dialog[open] [data-w="next"]').click()`);
    }
    const begin = await waitFor('Begin enabled', `(() => { const b = document.querySelector('dialog[open] [data-w="begin"]'); return b && !b.disabled && Math.round(performance.now()); })()`, 120000);
    await ev(`document.querySelector('dialog[open] [data-w="begin"]').click()`);
    const ticket = await waitFor('ticket 1 in the workspace', `!document.querySelector('dialog[open]') && document.querySelector('#shell:not([hidden]) #brief-title') && Math.round(performance.now())`, 60000);
    const during = await ev(`({ notice: document.getElementById('notice').hidden ? '' : document.getElementById('notice').textContent, green: !!document.querySelector('#db-status .bg-good') })`);
    if (!during.notice || during.green) fail(`ticket 1 during the seed shows no progress: ${S(during)}`);
    await waitFor('the editor', `!!${EDITOR}`, 30000);
    await ev(`${EDITOR}.focus()`);
    await key('a', MOD, 'KeyA', 65);
    await send('Input.insertText', { text: 'SELECT 1 AS one' });
    await key('Enter', MOD, 'Enter', 13);
    await waitFor('db:ensure:game', `performance.getEntriesByName('db:ensure:game').length > 0`, 120000);
    await waitFor('the queued Run answered', `[...document.querySelectorAll('#panel th')].some((x) => x.textContent.trim().startsWith('one'))`, 60000);
    const after = await ev(`({ notice: document.getElementById('notice').hidden, green: !!document.querySelector('#db-status .bg-good'), restarts: performance.getEntriesByName('db:restart').length })`);
    if (!after.notice || !after.green || after.restarts) fail(`after the seed: ${S(after)}`);
    if (pageErrors.length) fail(`page errors: ${S(pageErrors)}`);
    // review-v21 BOOT: nothing of the Engine area (sources, view, its PGlite, `browser-*` = the yaml library it parses with) on first open
    const engineJs = await ev(`performance.getEntriesByType('resource').map((e) => e.name.split('/').pop()).filter((n) => /^(engineSources|engineView|pglab|browser-)/.test(n))`);
    if (engineJs.length) fail(`Engine chunks fetched on first open: ${engineJs.join(', ')}`);
    const marks = await ev(`(() => { const r = (n) => Math.round(n), m = (n) => performance.getEntriesByName(n)[0];
      const seeds = Object.fromEntries(performance.getEntriesByType('measure').filter((e) => e.name.startsWith('db:ensure:'))
        .map((e) => [e.name.slice(10), [r(e.startTime), r(e.startTime + e.duration)]]));
      const js = performance.getEntriesByType('resource').filter((e) => /\\.js$/.test(e.name));
      const end = (re) => r(Math.max(0, ...js.filter((e) => re.test(e.name)).map((e) => e.responseEnd)));
      return { fcp: r(m('first-contentful-paint')?.startTime ?? 0), spawn: r(m('db:spawn')?.startTime ?? 0), engine: r(m('db:ready')?.startTime ?? 0), seeds,
        main: end(/\\/index-/), content: end(/(ticketSources|ticketLateSources|en-)/) }; })()`);
    const row = { run, welcome, picked, begin, ticket, during: during.notice, ...marks, dbReady: marks.seeds.game?.[1] };
    rows.push(row);
    console.log(`boot run ${run}`, JSON.stringify(row));
    await closeBrowser();
  }
  const med = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const summary = Object.fromEntries(['fcp', 'main', 'content', 'welcome', 'picked', 'engine', 'begin', 'ticket', 'dbReady'].map((k) => [k, med(rows.map((r) => r[k]))]));
  console.log('boot medians', summary);
  writeFileSync(join(OUT, 'boot-report.json'), JSON.stringify({ base, at: new Date().toISOString(), rows, summary }, null, 1));
}

// ---- the run
let base = '';
if (PERF_RUNS || BOOT_RUNS) {
  try {
    base = URL_ARG ? (URL_ARG.endsWith('/') ? URL_ARG : URL_ARG + '/') : await startPreview();
    if (BOOT_RUNS) await boot(base);
    if (PERF_RUNS) await perf(base);
  } finally {
    await closeBrowser();
    for (const c of owned) stop(c);
  }
  process.exit(0);
}
try {
  await step('start', async () => {
    base = URL_ARG ? (URL_ARG.endsWith('/') ? URL_ARG : URL_ARG + '/') : await startPreview();
    await startBrowser();
    return { base, browser: BROWSER, drill: DRILL.id, lesson: LESSON.id };
  });
  if (failed) throw new Error('start failed');
  await size(1280, 800);

  await step('welcome: pick Logistics, begin', async () => {
    await go(base, '');
    // ui-ux-v7 O1 (L148): language → domain (picking a card advances) → begin; walk whatever panel is showing.
    await waitFor('the welcome dialog', `!!document.querySelector('dialog[open] [data-w]')`, 30000);
    const vis = (sel) => `(b => b && b.offsetParent && !b.disabled)(document.querySelector('dialog[open] ${sel}'))`;
    let begun = false;
    for (let i = 0; i < 8 && !begun; i++) {
      await waitFor('a welcome button', `${vis('[data-w="begin"]')} || ${vis('[data-w="pick-logistics"]')} || ${vis('[data-w="next"]')}`, 120000);
      for (const w of ['begin', 'pick-logistics', 'next']) {
        if (await ev(vis(`[data-w="${w}"]`))) { await ev(`document.querySelector('dialog[open] [data-w="${w}"]').click()`); begun = w === 'begin'; break; }
      }
      await sleep(300);
    }
    if (!begun) throw new Error('never reached Begin on the welcome dialog');
    await waitFor('the workspace', `!!${EDITOR} && !document.querySelector('dialog[open]')`, 30000);
  });

  await step(`lesson "${LESSON.id}": Thử ngay`, async () => {
    const area = `[...document.querySelectorAll('#shell textarea')].find((a) => a.offsetParent)`;
    await waitFor('the lesson card', `!!${area}`, 30000);
    await ev(`(() => { const a = ${area}; a.value = ${S(LESSON.try.solution)}; a.dispatchEvent(new Event('input', { bubbles: true }));
      a.nextElementSibling.querySelector('button.primary').click(); })()`);
    await waitFor('lessons.tried', `(JSON.parse(localStorage.getItem('cargo-query/lessons') || '{}').tried ?? []).includes(${S(LESSON.id)})`, 60000);
  });

  await step(`logistics: submit ${TICKETS.logistics.id}`, () => solve(TICKETS.logistics.id, TICKETS.logistics.sql));

  for (const d of ['ecommerce', 'finance']) {
    const tk = TICKETS[d];
    await step(`${d}: submit ${tk.id}${d === 'finance' ? ' (reduced motion)' : ''}`, async () => {
      if (d === 'finance') await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await go(base, `#/d/${d}/play`);
      // every label the dock's button gets: with motion the first one is "Bỏ qua" (anim.skip), reduced motion goes straight to Close
      if (d === 'finance') await ev(`(() => { window.__skipLabels = []; const b = document.getElementById('stage-skip');
        new MutationObserver(() => window.__skipLabels.push(b.dataset.i18n)).observe(b, { attributes: true, attributeFilter: ['data-i18n'] }); })()`);
      // the domain's own ticket 1 is open once its starter is in the editor (the editor is recreated when the domain is entered)
      if (tk.starter) await waitFor(`${tk.id}'s starter`, `${S(norm(tk.starter))} === (${editorText}).replace(/\\s+/g, ' ').trim()`, 90000);
      return solve(tk.id, tk.sql);
    });
  }

  await step('reduced motion: dock at its end frame', async () => {
    // §5.1: the dock shows the folded "Xem lại · Đóng" row at once, no scene playing. Checked before any navigation (a hashchange closes it).
    await waitFor('the folded dock', `(() => { const s = document.getElementById('stage');
      return s && !s.hidden && s.dataset.mini === 'true' && !document.getElementById('stage-replay').hidden
        && document.getElementById('stage-skip').dataset.i18n === 'app.close'; })()`, 5000);
    const box = await ev(`(r => ({ x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 }))(document.getElementById('stage').getBoundingClientRect())`);
    const a = (await send('Page.captureScreenshot', { format: 'png', clip: box })).data;
    await sleep(300); // the one fixed wait: two pictures 300 ms apart must be equal (GSAP runs on rAF, getAnimations() cannot see it)
    const b = (await send('Page.captureScreenshot', { format: 'png', clip: box })).data;
    if (a !== b) fail('the dock changed within 300 ms under reduced motion');
    const labels = await ev('window.__skipLabels');
    if (!labels.length || labels.includes('anim.skip')) fail(`dock button labels ${S(labels)}: expected Close only (no Skip, no scene)`);
    await send('Emulation.setEmulatedMedia', { features: [] });
  });

  await step(`drill ${DRILL.id}`, async () => {
    // a fresh load of the drill hash reopens that drill (route.ts drillOfHash); about:blank first, so it is a real load, not a hashchange
    await send('Page.navigate', { url: 'about:blank' });
    await waitFor('about:blank', `location.href === 'about:blank'`, 10000);
    await go(base, `#/learn/play/${DRILL.id}`);
    await waitFor('the drill workspace', `location.hash === ${S('#/learn/play/' + DRILL.id)} && !!${EDITOR}`, 60000);
    return solve(DRILL.id, DRILL.solution);
  });

  await step('save.completed holds exactly the submitted ids', async () => {
    const want = [TICKETS.logistics.id, TICKETS.ecommerce.id, TICKETS.finance.id, DRILL.id].sort();
    const got = [...(await ev(completed))].sort();
    if (S(got) !== S(want)) fail(`completed = ${S(got)}, expected ${S(want)}`);
    return got;
  });

  if (ENGINE_LAB) await step(`engine lab ${ENGINE_LAB.id}: every step submitted, lesson completed`, async () => {
    await go(base, ENGINE_LAB.hash);
    await waitFor('the lesson page with its lab', `!!document.querySelector('#engine-page [data-ek="${ENGINE_LAB.id}-s0-code"]')`, 60000);
    for (const [i, sql] of ENGINE_LAB.steps.entries()) {
      const at = (what) => `document.querySelector('[data-ek="${ENGINE_LAB.id}-s${i}-${what}"]')`;
      await ev(`(t => { t.value = ${S(sql)}; t.dispatchEvent(new Event('input', { bubbles: true })); })(${at('code')})`);
      await ev(`${at('submit')}.click()`);
      await waitFor(`step ${i + 1} passed`, `[...document.querySelectorAll('#engine-page [role=status].good')].length > ${i}`, 90000);
    }
    await waitFor('the lesson in save.completed', `${completed}.includes(${S(ENGINE_LAB.id)})`, 10000);
    await shot('engine-lab');
  });

  // L248: engine runtimes in the real app. `submit(l, i)` types step i's Solution and waits for its green status line.
  const submitStep = async (l, i) => {
    const at = (what) => `document.querySelector('[data-ek="${l.id}-s${i}-${what}"]')`;
    await ev(`(t => { t.value = ${S(l.lab.steps[i].solution)}; t.dispatchEvent(new Event('input', { bubbles: true })); })(${at('code')})`);
    await ev(`${at('submit')}.click()`);
    await waitFor(`${l.id} step ${i + 1} passed`, `(${at('code')})?.closest('[data-step]').querySelector('[role=status]')?.classList.contains('good')`, 120000);
  };
  const openLesson = async (l) => {
    await go(base, l.hash);
    await waitFor(`${l.id} drawn`, `!!document.querySelector('#engine-page[data-lesson]')`, 60000);
  };
  await step(`engine ${ENGINE.heap.id}: pageinspect step passes and the heap diagram draws the real rows`, async () => {
    await openLesson(ENGINE.heap);
    await submitStep(ENGINE.heap, 1);
    await waitFor('pg-heap-page diagram with one line pointer per row', `(f => f && f.querySelectorAll('tbody tr').length === 5 && !!f.querySelector('[data-viz="pg-heap-page"] svg'))(document.querySelector('[data-inside]'))`, 60000);
    await shot('engine-heap');
  });
  await step(`engine ${ENGINE.mongo.id}: every MongoDB step passes, lesson completed`, async () => {
    await openLesson(ENGINE.mongo);
    for (const i of ENGINE.mongo.lab.steps.keys()) await submitStep(ENGINE.mongo, i);
    await waitFor('the lesson in save.completed', `${completed}.includes(${S(ENGINE.mongo.id)})`, 10000);
    await shot('engine-mongo');
  });
  await step(`engine ${ENGINE.dynamo.id}: DynamoDB Query passes and shows ScannedCount`, async () => {
    await openLesson(ENGINE.dynamo);
    await submitStep(ENGINE.dynamo, 0);
    const meta = await ev(`[...document.querySelectorAll('#engine-page section[aria-label] dt')].map((x) => x.textContent + '=' + x.nextElementSibling.textContent)`);
    if (!meta.some((x) => /^(Đã quét|Scanned)=\d/.test(x))) fail(`no ScannedCount line: ${S(meta)}`);
    await shot('engine-dynamo');
    return meta;
  });
  await step(`engine ${ENGINE.quiz.id}: quiz answered right, lesson completed`, async () => {
    await openLesson(ENGINE.quiz);
    for (const [i, q] of ENGINE.quiz.quiz.entries()) {
      await ev(`document.querySelector('[data-ek="${ENGINE.quiz.id}-q${i}-${q.answer}"]').click()`);
      await ev(`document.querySelector('[data-ek="${ENGINE.quiz.id}-q${i}-check"]').click()`);
    }
    await waitFor('the quiz lesson in save.completed', `${completed}.includes(${S(ENGINE.quiz.id)})`, 10000);
  });
  await step(`engine ${ENGINE.predict.id}: predict answered, the real plan shows ${ENGINE.predict.predict.expect?.node}`, async () => {
    await openLesson(ENGINE.predict);
    const id = ENGINE.predict.id;
    await ev(`document.querySelector('[data-ek="${id}-p-${ENGINE.predict.predict.answer}"]').click()`);
    await ev(`document.querySelector('[data-ek="${id}-p-check"]').click()`);
    await waitFor('"see the real plan"', `!!document.querySelector('[data-ek="${id}-plan"]')`, 10000);
    await ev(`document.querySelector('[data-ek="${id}-plan"]').click()`);
    await waitFor('the plan', `!!document.querySelector('[data-plan]')`, 90000);
    const plan = await ev(`document.querySelector('[data-plan]').textContent`);
    if (!plan.includes(ENGINE.predict.predict.expect.node)) fail(`plan has no ${ENGINE.predict.predict.expect.node}: ${plan}`);
    await shot('engine-predict');
    return plan;
  });

  for (const r of ROUTES) if (!ROUTE_HASH[r]) await step(`route ${r}`, () => fail(`route '${r}' has no hash in scripts/smoke.mjs`));
  // V20-C: axe at 1280 light and 375 dark (0 serious/critical), horizontal scroll at 375 and 320.
  const axeFound = [];
  for (const [w, hgt, theme, withAxe] of [[1280, 800, 'light', true], [375, 740, 'dark', true], [320, 640, 'light', false]]) {
    await size(w, hgt);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
    for (const hash of PAGES) {
      await step(`${w}px ${theme} ${hash}`, async () => {
        await go(base, hash);
        const main = mainOf(hash);
        await waitFor(`<main id="${main}"> with an h1`, `(location.hash === ${S(hash)} || location.hash.startsWith(${S(hash + '/')})) && (m => m && !m.hidden && !!m.querySelector('h1'))(document.getElementById(${S(main)}))`, 30000);
        await waitFor('#notice closed (DB/domain ready)', `document.getElementById('notice').hidden`, 90000);
        const m = await ev(`({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, theme: document.documentElement.dataset.theme,
          main: (x => x.scrollWidth - x.clientWidth)(document.getElementById(${S(main)})) })`);
        // against the emulated width, not innerWidth: a mobile viewport may zoom out and grow innerWidth with the content
        if (w <= 375 && Math.max(m.sw, m.iw) > w) fail(`horizontal scroll: scrollWidth ${m.sw}, innerWidth ${m.iw} > ${w}`);
        if (m.theme !== theme) fail(`<html data-theme> is ${m.theme}, expected ${theme}`);
        const chrome = await ev(CHROME);
        if (chrome.cut.length) fail(`top bar: cut or overlapping: ${chrome.cut.join(', ')}`);
        if (w < 1024 && chrome.bottom >= 72) fail(`#bottom-nav is ${chrome.bottom} px tall (one row is < 72)`);
        if (!withAxe) return m;
        if (!(await ev('!!window.axe'))) await send('Runtime.evaluate', { expression: AXE });
        if (!(await ev('!!window.axe'))) fail('axe-core did not load into the page');
        const found = await ev(AXE_RUN);
        if (found.length) axeFound.push({ page: `${w}px ${theme} ${hash}`, found });
        const bad = found.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        if (bad.length) fail(`axe: ${bad.map((v) => `${v.id} (${v.impact}, ${v.count}× e.g. ${v.nodes[0].target})`).join('; ')}`);
        return { ...m, axe: found.map((v) => `${v.id} ${v.impact} ${v.count}`) };
      });
    }
  }
  writeFileSync(join(OUT, 'axe-report.json'), JSON.stringify(axeFound, null, 1));

  // ---- V22-B (L206, roadmap-v22 S2): Run the first GROUP BY Solution in the workspace, "Vì sao?" on row 1 shows its source-row count.
  await step(`why: row 1 of ${GROUPED.id}`, async () => {
    await size(1280, 800);
    await send('Emulation.setEmulatedMedia', { features: [] });
    await go(base, '#/d/logistics/play');
    await waitFor('the editor and the DB ready', `!!${EDITOR} && !!document.querySelector('#db-status .bg-good')`, 90000);
    await ev(`(${EDITOR}).focus()`);
    await key('a', MOD, 'KeyA', 65);
    await send('Input.insertText', { text: GROUPED.sql });
    await key('Enter', MOD, 'Enter', 13);
    const btn = `[...document.querySelectorAll('#shell td button[aria-expanded]')].find((b) => b.textContent === 'Vì sao?')`;
    await waitFor('a "Vì sao?" button on the result', `!!${btn}`, 60000);
    await ev(`${btn}.click()`);
    const n = await waitFor('the source-row count', `(/gom (\\d+) dòng nguồn/.exec(document.querySelector('#shell tr[data-why]')?.textContent ?? '') ?? [])[1]`, 60000);
    if (!(Number(n) > 0)) fail(`source rows: ${n}`);
    return { id: GROUPED.id, n: Number(n) };
  });
  // ---- V22-A (L203): the result map. On each domain's Map page, run the picked point's sample SQL; the result is drawn on the map.
  await size(1280, 800);
  await send('Emulation.setEmulatedMedia', { features: [] });
  for (const d of ['logistics', 'ecommerce', 'finance']) {
    await step(`V22-A ${d}: map question runs and draws`, async () => {
      await go(base, `#/d/${d}/map`);
      if (d !== 'logistics') {
        // L304: this beginner knows no GROUP BY in E-com/Finance yet, so the map says so instead of a sample; as "I know SQL" it asks
        await waitFor('the GROUP BY note', `/GROUP BY/.test(document.querySelector('#routes-title')?.parentElement?.parentElement?.textContent ?? '') && !document.querySelector('#home [data-map-run]')`, 90000);
        await ev(`localStorage.setItem('cargo-query/tour', JSON.stringify({ ...JSON.parse(localStorage.getItem('cargo-query/tour') ?? '{}'), knows: true })); true`);
        await go(base, `#/d/${d}`);
        await go(base, `#/d/${d}/map`);
      }
      await waitFor('the map question', `!!document.querySelector('#home [data-map-run]') && document.getElementById('notice').hidden`, 90000);
      await ev(`document.querySelector('#home [data-map-run]').click(); true`);
      await waitFor('the result on the map', `!!document.querySelector('#home [data-map-overlay] circle, #home [data-map-overlay] path') || !!document.querySelector('#home [data-map-error]')`, 60000);
      if (await ev(`!!document.querySelector('#home [data-map-error]')`)) fail('the sample SQL failed');
      if (d !== 'logistics') await ev(`localStorage.setItem('cargo-query/tour', JSON.stringify({ ...JSON.parse(localStorage.getItem('cargo-query/tour')), knows: false })); true`);
      return ev(`document.querySelectorAll('#home [data-map-overlay] [data-row]').length`);
    });
  }

  // ---- V22-C (L208, roadmap-v22 S3): a returning player (save-v5 with chapter 2 not started, 15 days away) sees Boon's
  // welcome-back line and exactly one "Buổi học hôm nay" card (no warm-up, review or drill card on Home, one primary button);
  // Home at 375 is <= 70 % of the 1694 px measured before V22-C (review-log "V22-C"). Then a weekly goal shows on Lily's card.
  await step('V22-C: returning player, one session card, Home height at 375', async () => {
    await size(375, 740);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    const pad = (n) => String(n).padStart(2, '0');
    const day = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/save-v5.json'), 'utf8'));
    const state = {
      'cargo-query-save': { ...fx, completed: fx.completed.filter((id) => !id.startsWith('ch2-')), review: { select: { box: 3, due: day(1) }, where: { box: 2, due: day(2) } } },
      'cargo-query/tour': { step: 8, knows: false }, 'cargo-query/domain': 'logistics', 'cargo-query/coach-done': true,
      'cargo-query/days': [day(40), day(30), day(22), day(15)], 'cargo-query/goal': {},
    };
    const init = Object.entries(state).map(([k, v]) => `localStorage.setItem(${S(k)}, ${S(S(v))});`).join('');
    const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol.startsWith('http') && !sessionStorage.getItem('v22c')) { sessionStorage.setItem('v22c', '1'); ${init} }` });
    await send('Page.navigate', { url: 'about:blank' });
    await waitFor('about:blank', `location.href === 'about:blank'`, 10000);
    await go(base, '#/');
    await waitFor('Home with the session card', `!!document.querySelector('#home [data-session]') && document.getElementById('notice').hidden`, 60000);
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    await sleep(1500); // fonts and the Lily sprite settle; the height is read twice below and must agree
    const H = `(() => { let e = document.getElementById('home'); while (e && !/(auto|scroll)/.test(getComputedStyle(e).overflowY)) e = e.parentElement; return (e || document.scrollingElement).scrollHeight; })()`;
    const h1 = await ev(H);
    const h2 = await waitFor('a stable Home height', `(h => h === ${h1} && h)(${H})`, 5000).catch(() => ev(H));
    const m = await ev(`({ sessions: document.querySelectorAll('#home [data-session]').length, back: !!document.querySelector('#home [data-welcome-back]'),
      old: ['warmup-title', 'review-title', 'hub-title'].filter((id) => document.getElementById(id)),
      primary: [...document.querySelectorAll('#home button, #home a')].filter((b) => b.offsetParent && /(^| )bg-accent( |$)/.test(b.className)).length })`);
    if (m.sessions !== 1) fail(`${m.sessions} session cards, expected 1`);
    if (!m.back) fail('no welcome-back line after 15 days away');
    if (m.old.length) fail(`practice cards still on Home: ${m.old.join(', ')}`);
    if (m.primary !== 1) fail(`${m.primary} primary buttons on Home, expected 1`);
    if (h2 > 0.7 * 1694) fail(`Home is ${h2} px at 375, over 70 % of 1694`);
    await ev(`(s => { s.closest('details').open = true; s.value = '5'; s.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#home [data-session] details select'))`);
    await waitFor('the weekly goal on Lily\'s card', `/\\/5/.test(document.querySelector('#home [data-goal]')?.textContent ?? '')`, 5000);
    return { ...m, height: h2, ratio: Math.round((h2 / 1694) * 1000) / 1000 };
  });

  // v21 U1/U2 (L189): the top bar at 1024–1920, VI and EN, on the domain with the longest titles (Finance) and the workspace.
  // QA v22 (L272): late in the run (it replaces the scenario's save), as a returning player (save-v5: Inbox and Review badges shown), the widest bar.
  const badges = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/save-v5.json'), 'utf8'));
  const badgeInit = Object.entries({ 'cargo-query-save': badges, 'cargo-query/tour': { step: 99, knows: true }, 'cargo-query/coach-done': true, 'cargo-query/domain': 'logistics' })
    .map(([k, v]) => `localStorage.setItem(${S(k)}, ${S(S(v))});`).join('');
  const { identifier: badgeScript } = await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol.startsWith('http') && !sessionStorage.getItem('qa22')) { sessionStorage.setItem('qa22', '1'); ${badgeInit} }` });
  await send('Page.navigate', { url: 'about:blank' });
  await waitFor('about:blank', `location.href === 'about:blank'`, 10000);
  for (const lang of ['vi', 'en']) for (const [w, hgt] of [[1024, 700], [1280, 800], [1440, 900], [1920, 1000]]) {
    await size(w, hgt);
    for (const hash of ['#/d/finance', '#/d/logistics/play']) {
      await step(`top bar ${w}px ${lang} ${hash}`, async () => {
        await go(base, hash);
        await waitFor(`<main id="${mainOf(hash)}"> with an h1`, `(m => m && !m.hidden && !!m.querySelector('h1'))(document.getElementById(${S(mainOf(hash))}))`, 30000);
        await ev(`document.querySelector('[data-lang=${lang}]').click()`);
        await waitFor(`lang ${lang}`, `document.documentElement.lang === ${S(lang)}`, 10000);
        if (await ev(`document.getElementById('review-btn').hidden || document.getElementById('inbox-btn').hidden`)) fail('the badge buttons are not shown');
        const chrome = await ev(CHROME);
        if (chrome.cut.length) fail(`top bar: cut or overlapping: ${chrome.cut.join(', ')}`);
        return chrome;
      });
    }
  }
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: badgeScript });
  await ev(`document.querySelector('[data-lang=vi]').click()`);

  // ---- v21 §3 (v21-ux-review U11, QA v22): at 375 the completion dock of the chapter 1 promotion review never covers
  // "Bắt đầu chương 2" once it is scrolled as far into view as the page allows (the other two cheap checks: CHROME above).
  await step('375: the promotion dock leaves "Bắt đầu chương 2" free', async () => {
    await size(375, 740);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/save-v5.json'), 'utf8'));
    const state = {
      'cargo-query-save': { ...fx, completed: ['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04'], bossStep: {}, drafts: {}, graded: {} },
      'cargo-query/tour': { step: 99, knows: true }, 'cargo-query/domain': 'logistics', 'cargo-query/coach-done': true,
    };
    const init = Object.entries(state).map(([k, v]) => `localStorage.setItem(${S(k)}, ${S(S(v))});`).join('');
    const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol.startsWith('http') && !sessionStorage.getItem('v21s3')) { sessionStorage.setItem('v21s3', '1'); ${init} }` });
    await send('Page.navigate', { url: 'about:blank' });
    await waitFor('about:blank', `location.href === 'about:blank'`, 10000);
    await go(base, '#/d/logistics/play');
    await waitFor('the editor and the DB ready', `!!${EDITOR} && !!document.querySelector('#db-status .bg-good')`, 90000);
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    const src = readFileSync(join(ROOT, 'content/tickets/ch1/ch1-05.md'), 'utf8');
    const answer = parseYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(src)[1]).conclusion.answer;
    const sqls = [...src.split('# EN')[0].matchAll(/## Step \d+:[^\n]*\n[\s\S]*?```sql\r?\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    for (const [i, sql] of sqls.entries()) {
      await ev(`document.querySelector('#pane-tabs [data-pane=work]').click()`);
      await waitFor(`step ${i + 1}'s editor`, `!!${EDITOR} && ${EDITOR}.offsetParent !== null`, 10000);
      await ev(`${EDITOR}.focus()`);
      await key('a', MOD, 'KeyA', 65);
      await send('Input.insertText', { text: sql });
      await key('Enter', MOD | SHIFT, 'Enter', 13);
      if (i < sqls.length - 1) await waitFor(`step ${i + 2}`, `JSON.parse(localStorage.getItem('cargo-query-save')).bossStep['ch1-05'] === ${i + 1}`, 60000);
      else await waitFor('the conclusion form', `!!document.getElementById('conclusion-form')`, 60000);
    }
    await ev(`(f => { f.querySelector('input[value="${answer}"]').click(); f.requestSubmit(); })(document.getElementById('conclusion-form'))`);
    const NEXT = `[...document.querySelectorAll('#ticket button')].find((b) => /Bắt đầu chương 2/.test(b.textContent) && b.offsetParent)`;
    await waitFor('the review in save.completed', `${completed}.includes('ch1-05')`, 30000);
    await ev(`document.querySelector('#pane-tabs [data-pane=ticket]').click()`);
    await waitFor('"Bắt đầu chương 2"', `!!${NEXT}`, 30000);
    const covered = `(() => { const b = ${NEXT}; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect();
      const st = document.getElementById('stage'); const s = st.hidden ? null : st.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { stage: !!s && s.width > 0 && s.left < r.right && s.right > r.left && s.top < r.bottom && s.bottom > r.top, hit: !!hit && !b.contains(hit), at: hit?.id || hit?.tagName }; })()`;
    const first = await ev(covered);
    await sleep(3500); // after the dock folds (L221) or keeps its scene
    const later = await ev(covered);
    for (const [when, m] of [['at once', first], ['after 3.5 s', later]]) {
      if (m.stage) fail(`#stage covers "Bắt đầu chương 2" ${when}`);
      if (m.hit) fail(`"Bắt đầu chương 2" is covered by ${m.at} ${when}`);
    }
    return { first, later };
  });

  await step('no page errors', async () => {
    if (pageErrors.length) fail(`${pageErrors.length} error(s): ${pageErrors.map((e) => e.text.split('\n')[0]).join(' | ').slice(0, 800)}`);
  });
} catch (e) {
  failed = true;
  steps.push({ name: 'run', ok: false, error: String(e?.message ?? e) });
  console.log(`FAIL run: ${e?.message ?? e}`);
} finally {
  await closeBrowser();
  for (const c of owned) stop(c);
}

const report = { ok: !failed, base, browser: BROWSER, ms: Date.now() - T0, at: new Date().toISOString(), steps, pageErrors,
  shots: readdirSync(OUT).filter((f) => f.endsWith('.png')) };
writeFileSync(join(OUT, 'smoke-report.json'), JSON.stringify(report, null, 1));
console.log(`${failed ? 'SMOKE FAILED' : 'SMOKE OK'} in ${(report.ms / 1000).toFixed(1)} s, report: smoke-out/smoke-report.json`);
process.exit(failed ? 1 : 0);
