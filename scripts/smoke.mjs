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
const LESSON = parseYaml(readFileSync(join(ROOT, 'content/lessons.yml'), 'utf8')).find((l) => l.id === TICKETS.logistics.grants[0]);

// Every route of src/route.ts once; a new route fails here until the smoke knows its hash.
const ROUTE_HASH = {
  home: '#/', learn: '#/learn', practice: '#/practice', me: '#/me', overview: '#/d/logistics', play: '#/d/logistics/play',
  data: '#/d/logistics/data', dashboard: '#/d/logistics/dashboard', map: '#/d/logistics/map',
};
const ROUTES = JSON.parse(/export const ROUTES = (\[[^\]]*\])/.exec(readFileSync(join(ROOT, 'src/route.ts'), 'utf8'))[1].replace(/'/g, '"'));
// V20-C (L179): plus the General sub-pages and the other two domains' pages (the list of tests/axe.test.ts).
const PAGES = [...ROUTES.filter((r) => ROUTE_HASH[r]).map((r) => ROUTE_HASH[r]), '#/learn/sql/1', '#/learn/skill/select', '#/learn/adv/a2', '#/learn/adv/d5',
  '#/learn/interview', ...['ecommerce', 'finance'].flatMap((d) => ['', '/play', '/data', '/dashboard', '/map'].map((p) => `#/d/${d}${p}`))];
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
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      pageErrors.push({ at: Date.now() - T0, kind: 'exception', text: (d.exception?.description ?? d.text ?? '').slice(0, 500) });
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      pageErrors.push({ at: Date.now() - T0, kind: 'console.error', text: m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 500) });
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++cdpId;
    const timer = setTimeout(() => reject(new Error(`CDP ${method} timed out`)), 30000);
    pending.set(i, (m) => {
      clearTimeout(timer);
      if (m.error) reject(new Error(`${method}: ${m.error.message}`));
      else resolve(m.result);
    });
    ws.send(JSON.stringify({ id: i, method, params }));
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
  if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
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
async function perf(base) {
  const rows = [];
  for (let run = 1; run <= PERF_RUNS; run++) {
    for (const d of Object.keys(SCHEMA_OF)) {
      await startBrowser();
      await size(1280, 800);
      await send('Page.addScriptToEvaluateOnNewDocument', { source: PERF_PROBE });
      await go(base, `#/d/${d}`);
      const first = await perfLoad(SCHEMA_OF[d]);
      await waitFor('db:snapshot', `performance.getEntriesByName('db:snapshot').length > 0`, 60000);
      await ev('window.__old = true');
      await send('Page.reload');
      await waitFor('the reloaded document', '!window.__old && !!window.__perf', 30000);
      const second = await perfLoad(SCHEMA_OF[d]);
      rows.push({ run, domain: d, first, second });
      console.log(`run ${run} ${d.padEnd(9)} first: fcp ${first.fcp} render ${first.render} db ${first.db} long ${first.longTasks}/${first.longMs}ms`
        + ` | second: fcp ${second.fcp} render ${second.render} db ${second.db} long ${second.longTasks}/${second.longMs}ms`);
      await closeBrowser();
    }
  }
  const med = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const summary = {};
  for (const d of Object.keys(SCHEMA_OF)) for (const k of ['first', 'second']) for (const f of ['fcp', 'render', 'db', 'longTasks', 'longMs', 'longMax'])
    summary[`${d}.${k}.${f}`] = med(rows.filter((r) => r.domain === d).map((r) => r[k][f]));
  console.log('medians', summary, 'boot js (first visit):', rows[0].first.bootJs.join(', '));
  writeFileSync(join(OUT, 'perf-report.json'), JSON.stringify({ base, at: new Date().toISOString(), rows, summary }, null, 1));
}

// ---- the run
let base = '';
if (PERF_RUNS) {
  try {
    base = URL_ARG ? (URL_ARG.endsWith('/') ? URL_ARG : URL_ARG + '/') : await startPreview();
    await perf(base);
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

  // ---- V22-A (L203): the result map. On each domain's Map page, run the picked point's sample SQL; the result is drawn on the map.
  await size(1280, 800);
  await send('Emulation.setEmulatedMedia', { features: [] });
  for (const d of ['logistics', 'ecommerce', 'finance']) {
    await step(`V22-A ${d}: map question runs and draws`, async () => {
      await go(base, `#/d/${d}/map`);
      await waitFor('the map question', `!!document.querySelector('#home [data-map-run]') && document.getElementById('notice').hidden`, 90000);
      await ev(`document.querySelector('#home [data-map-run]').click(); true`);
      await waitFor('the result on the map', `!!document.querySelector('#home [data-map-overlay] circle, #home [data-map-overlay] path') || !!document.querySelector('#home [data-map-error]')`, 60000);
      if (await ev(`!!document.querySelector('#home [data-map-error]')`)) fail('the sample SQL failed');
      return ev(`document.querySelectorAll('#home [data-map-overlay] [data-row]').length`);
    });
  }

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
