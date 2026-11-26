// v21 end-to-end audit (L183). No dependency: Chrome DevTools Protocol over Node's WebSocket, like scripts/smoke.mjs.
//
//   npm run build && npm run e2e                      # own `vite preview` on E2E_PORT (default 5241; never 5173/5174)
//   E2E_ONLY=general,logistics npm run e2e            # sections: see SECTIONS below (L248: `engine` = every engine lesson + NoSQL path drill; v24 `best` = every Best Practice card, v29 all four tracks)
//   E2E_OUT=<dir>                                     # screenshots + e2e-report.json (default: e2e-out/)
//
// Plays every ticket's Solution (variant 0) of every domain in order (promotion-review steps, index labs, conclusions),
// checking save.completed / xp / rank, chapter wrap-ups and KPI tiles; General (one drill per skill, a review run, the
// entry check, the interview room, lessons' "Thử ngay"); #/me exports; dashboard pin/export/import; Sandbox + CSV + a
// sample dataset; notebook; map and lanes; Data page; reloads mid-work; Back/Forward; both themes at 1280 and 375,
// reduced motion and axe on every visited screen; an offline second open. Never stops on a failure: every failed check
// becomes a finding (section, step, route, error, screenshot, console errors in that step). Exit 1 when any check failed.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.E2E_OUT || join(ROOT, 'e2e-out');
const PORT = Number(process.env.E2E_PORT) || 5241;
if (PORT === 5173 || PORT === 5174) throw new Error('E2E_PORT must not be 5173/5174 (other sessions\' dev servers)');
const ONLY = new Set((process.env.E2E_ONLY || '').split(',').filter(Boolean));
const T0 = Date.now();
const BROWSER = process.env.BROWSER || ({ win32: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }[process.platform] ?? 'google-chrome');
const S = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- content (read from the repo, like smoke.mjs)
const yml = (f) => parseYaml(readFileSync(join(ROOT, f), 'utf8'));
function walk(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.md') ? [`${dir}/${e.name}`] : []));
}
/** One ticket, variant 0: id, chapter, beat, the SQL to type for each step (an index lab types its ddl), the conclusion answer. */
function ticket(file) {
  const src = readFileSync(join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
  const fm = parseYaml(/^---\n([\s\S]*?)\n---/.exec(src)[1]);
  const vi = src.split(/\n# EN\n/)[0];
  const v = fm.variants?.[0] ?? {};
  const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(v[k]));
  const sqls = [...vi.matchAll(/\n## (?:Solution|Step \d+:[^\n]*)\n[\s\S]*?```sql\n([\s\S]*?)```/g)].map((m) => fill(m[1].trim()));
  const labs = fm.lab === undefined ? [] : Array.isArray(fm.lab) ? fm.lab : [fm.lab];
  const steps = sqls.map((sql, i) => labs[i]?.ddl ?? sql);
  return { id: fm.id, chapter: fm.chapter, beat: fm.beat, steps, answer: fm.conclusion?.answer, title: fm.title, tier: false, file };
}
const byOrder = (a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id);
const DOMAINS = {
  logistics: { dir: 'content/tickets', chapters: yml('content/chapters.yml'), kpis: yml('content/kpis.yml') },
  ecommerce: { dir: 'content/domains/ecom/tickets', chapters: yml('content/domains/ecom/chapters.yml'), kpis: yml('content/domains/ecom/kpis.yml') },
  finance: { dir: 'content/domains/fin/tickets', chapters: yml('content/domains/fin/chapters.yml'), kpis: yml('content/domains/fin/kpis.yml') },
};
for (const d of Object.values(DOMAINS)) d.tickets = walk(d.dir).map(ticket).sort(byOrder);
const LANE_TASKS = walk('content/lanes').map(ticket);
const SQL_DRILLS = yml('content/general/sql.yml');
const SKILLS = yml('content/skills.yml');
const LESSONS = yml('content/lessons.yml');
// v24 R0 (L335): the learning path's Parts (content/general/route.yml); a Part with no skill yet is not drawn (L336)
const PARTS = yml('content/general/route.yml').map((p) => ({ ...p, skills: p.skills.filter((id) => SKILLS.some((s) => s.id === id)) })).filter((p) => p.skills.length);
/** Skills with a full lesson page (content/general/lessons/<id>.md): its practice is on the page, not in the lesson dialog. */
const FULL_LESSONS = readdirSync(join(ROOT, 'content/general/lessons')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
const INTERVIEW = yml('content/general/interview.yml');

// ---------------------------------------------------------------- report
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/\.(png|json|csv|zip)$/.test(f)) rmSync(join(OUT, f), { force: true });
const results = [];
const findings = [];
const pageErrors = [];
const downloads = [];
let section = '';
let shotN = 0;
const fail = (msg) => { throw new Error(msg); };
/** A check: never throws; a failure becomes a finding with a screenshot and the page errors seen during the check. */
async function step(name, fn, { shotAlways = false } = {}) {
  const t = Date.now();
  const errsBefore = pageErrors.length;
  let hash = '';
  try {
    const detail = await fn();
    results.push({ section, name, ok: true, ms: Date.now() - t, ...(detail === undefined ? {} : { detail }) });
    console.log(`ok   [${section}] ${name} (${Date.now() - t} ms)`);
    if (shotAlways) await shot(name).catch(() => {});
    return true;
  } catch (e) {
    hash = await ev('location.hash').catch(() => '?');
    const file = await shot(`FAIL-${name}`).catch(() => '');
    const errs = pageErrors.slice(errsBefore).map((x) => x.text.split('\n')[0]);
    const f = { section, name, route: hash, error: String(e?.message ?? e).slice(0, 600), shot: file, console: errs };
    findings.push(f);
    results.push({ ...f, ok: false, ms: Date.now() - t });
    console.log(`FAIL [${section}] ${name} @ ${hash}: ${f.error}`);
    return false;
  }
}

// ---------------------------------------------------------------- processes this script owns (stopped by PID)
const owned = [];
function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}
let preview;
async function startPreview() {
  if (!existsSync(join(ROOT, 'dist/index.html'))) fail('dist/ is missing: run `npm run build` first');
  let busy = false;
  try { await fetch(`http://127.0.0.1:${PORT}/`); busy = true; } catch {}
  if (busy) fail(`port ${PORT} is already in use; not touching a server this script did not start`);
  const vite = join(ROOT, 'node_modules/vite/bin/vite.js');
  preview = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  owned.push(preview);
  for (let i = 0; i < 100; i++) {
    if (preview.exitCode !== null) fail(`vite preview exited (${preview.exitCode})`);
    try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) return `http://127.0.0.1:${PORT}/`; } catch {}
    await sleep(200);
  }
  fail('vite preview did not answer in 20 s');
}

// ---------------------------------------------------------------- CDP
let ws;
let cdpId = 0;
const pending = new Map();
let profile;
let browserWs;
let browserChild;
let dlDir;
let dlCleared = false;
async function startBrowser() {
  profile = mkdtempSync(join(tmpdir(), 'boondata-e2e-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--mute-audio', 'about:blank'];
  if (process.env.CI) args.unshift('--no-sandbox');
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
    } catch { await sleep(200); }
  }
  if (!port) fail(`browser did not open DevTools in 30 s: ${BROWSER}`);
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
    if (!page) await sleep(200);
  }
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      pageErrors.push({ at: Date.now() - T0, section, kind: 'exception', text: (d.exception?.description ?? d.text ?? '').slice(0, 500) });
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      pageErrors.push({ at: Date.now() - T0, section, kind: 'console.error', text: m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 500) });
    }
    if (m.method === 'Page.downloadWillBegin') downloads.push({ section, name: m.params.suggestedFilename, guid: m.params.guid, state: 'begin' });
    if (m.method === 'Page.downloadProgress' && m.params.state !== 'inProgress') {
      const d = downloads.find((x) => x.guid === m.params.guid);
      if (d) Object.assign(d, { state: m.params.state, bytes: m.params.receivedBytes });
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  dlDir = join(OUT, 'downloads');
  if (!dlCleared) { rmSync(dlDir, { recursive: true, force: true }); dlCleared = true; }
  mkdirSync(dlDir, { recursive: true });
  await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir }).catch(() => {});
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++cdpId;
  const timer = setTimeout(() => { pending.delete(i); reject(new Error(`CDP ${method} timed out`)); }, 60000);
  pending.set(i, (m) => { clearTimeout(timer); if (m.error) reject(new Error(`${method}: ${m.error.message}`)); else resolve(m.result); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result.value;
}
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
  if (!ws) return '';
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const file = join(OUT, `${String(++shotN).padStart(3, '0')}-${section}-${name.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.png`);
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  return file;
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
  try { if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {} // a locked file in the temp profile is left behind
  profile = undefined;
}
const size = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
const media = (features) => send('Emulation.setEmulatedMedia', { features });
let base = '';
const go = async (hash) => {
  await send('Page.navigate', { url: base + hash });
  await sleep(300);
};
/** A real load of `hash` (not a hashchange): about:blank first. */
async function load(hash) {
  await send('Page.navigate', { url: 'about:blank' });
  await waitFor('about:blank', `location.href === 'about:blank'`, 10000);
  await send('Page.navigate', { url: base + hash });
  await waitFor('the app booted', `!!document.querySelector('header.topbar') && document.readyState === 'complete'`, 30000);
}
async function key(k, modifiers, code, vk) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers, windowsVirtualKeyCode: vk });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers, windowsVirtualKeyCode: vk });
}
const MOD = process.platform === 'darwin' ? 4 : 2;
const SHIFT = 8;
const SAVE = `JSON.parse(localStorage.getItem('cargo-query-save') || '{}')`;
const completed = `(${SAVE}.completed ?? [])`;
const EDITOR = `document.querySelector('#shell:not([hidden]) #work .cm-content')`;
// The whole document from CodeMirror's state (`.cm-content`.cmTile.root.view, @codemirror/view 6.43): CodeMirror draws only the
// lines near the viewport, so `.cm-line` misses the head of a long SQL (ch12-06 step 2) once the editor scrolled to its end.
const editorText = `((c) => c?.cmTile?.root?.view?.state.doc.toString() ?? [...(c?.querySelectorAll('.cm-line') ?? [])].map((l) => l.textContent).join('\\n'))(${EDITOR})`;
const DB_READY = `!!document.querySelector('#db-status .bg-good')`;
/** Clicks the first visible, enabled element matching `sel` whose text matches `re` (a RegExp source); returns its text. */
const clickText = (sel, re, root = 'document') => ev(`(() => { const re = new RegExp(${S(re)}, 'i');
  const el = [...${root}.querySelectorAll(${S(sel)})].find((b) => b.offsetParent !== null && !b.disabled && re.test(b.textContent.replace(/\\s+/g, ' ')));
  if (!el) return null; el.click(); return el.textContent.trim().slice(0, 80); })()`);
async function mustClick(sel, re, what) {
  const t = await clickText(sel, re);
  if (t === null) fail(`no visible ${what ?? sel} matching /${re}/`);
  return t;
}
/** The id of the task the task bar marks as open (story/lane mode). */
const openTask = `(document.querySelector('#map [aria-current="page"][data-nav^="t:"], #map [aria-current="page"][data-nav^="l:"]')?.dataset.nav ?? '').slice(2)`;

/** Types `sql` into the workspace editor (replacing everything) and presses Mod-Shift-Enter (Submit) or Mod-Enter (Run). */
async function typeAnd(sql, submit = true) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await waitFor('the editor and the DB ready', `!!${EDITOR} && ${DB_READY}`, 120000);
    await ev(`${EDITOR}.focus()`);
    await key('a', MOD, 'KeyA', 65);
    await send('Input.insertText', { text: sql });
    if (norm(await ev(editorText)) !== norm(sql)) { await sleep(300); continue; }
    if (submit) await key('Enter', MOD | SHIFT, 'Enter', 13);
    else await key('Enter', MOD, 'Enter', 13);
    return;
  }
  const why = await ev(`(() => { const all = [...document.querySelectorAll('#work .cm-content')];
    return all.length + ' editor(s); editable ' + all.map((c) => c.contentEditable).join(',') + '; focus in editor ' + !!document.activeElement?.closest('.cm-editor')
      + '; text: ' + ${editorText}.slice(0, 120); })()`).catch((e) => e.message);
  fail(`could not type into a stable editor (${why})`);
}
/** Submits until `done()` (an expression) is truthy; retypes when the editor got replaced meanwhile (render rule). */
async function submitUntil(sql, doneExpr, ms = 90000) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await typeAnd(sql, true);
    const t = Date.now();
    let replaced = false;
    while (Date.now() - t < ms && !replaced) {
      if (await ev(doneExpr).catch(() => false)) return attempt;
      replaced = norm(await ev(editorText).catch(() => '')) !== norm(sql);
      await sleep(200);
    }
    if (!replaced) {
      const fb = await ev(`(document.querySelector('#work [role=status]')?.textContent ?? '') + ' | ' + (document.querySelector('#panel')?.innerText ?? '').slice(0, 300)`).catch(() => '');
      fail(`not accepted ${ms} ms after Submit; feedback: ${norm(fb).slice(0, 400)}`);
    }
  }
  fail('the editor kept being replaced');
}
const saveNow = () => ev(SAVE);

// ---------------------------------------------------------------- sections
async function boot(domain = 'logistics') {
  await load('');
  await waitFor('the welcome dialog', `!!document.querySelector('dialog[open] [data-w]')`, 30000);
  const vis = (sel) => `(b => b && b.offsetParent && !b.disabled)(document.querySelector('dialog[open] ${sel}'))`;
  for (let i = 0; i < 10; i++) {
    if (!(await ev(`!!document.querySelector('dialog[open] [data-w]')`))) break;
    // L1090: "knows" is asked only after the goal "I know SQL" (then Skip the entry check)
    for (const w of ['knows', `pick-${domain}`, 'goal-sql', 'skip', 'next']) {
      if (await ev(vis(`[data-w="${w}"]`))) { await ev(`document.querySelector('dialog[open] [data-w="${w}"]').click()`); break; }
    }
    await sleep(400);
  }
  if (await ev(`!!document.querySelector('dialog[open] [data-w]')`)) fail('the welcome dialog never closed after "knows"');
}

/** Opens `id` through the task bar (or the chapter select when it is in another chapter). */
async function openTicket(id, chapter) {
  if ((await ev(openTask)) === id) return;
  const clicked = await ev(`(() => { const b = document.querySelector('#map [data-nav="t:${id}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`);
  if (!clicked) {
    await ev(`(() => { const s = document.querySelector('#map select[data-nav="chapter"]'); s.value = '${chapter}'; s.dispatchEvent(new Event('change')); })()`);
    await sleep(300);
    await ev(`document.querySelector('#map [data-nav="t:${id}"]')?.click()`);
  }
  await waitFor(`${id} open in the task bar`, `${openTask} === ${S(id)}`, 30000);
}

async function playDomain(domain) {
  const D = DOMAINS[domain];
  await step(`open #/d/${domain}/play`, async () => {
    await go(`#/d/${domain}/play`);
    await waitFor('the workspace', `!document.getElementById('shell').hidden && !!${EDITOR}`, 60000);
    await waitFor('the domain DB seeded', DB_READY, 120000);
  });
  let expected = (await ev(openTask).catch(() => '')) || '';
  let axedBoss = false, axedWrap = false, axedRecap = false;
  for (const tk of D.tickets) {
    const ok = await step(`${tk.id} (${tk.beat}${tk.steps.length > 1 ? `, ${tk.steps.length} steps` : ''})`, async () => {
      const before = await saveNow();
      if (before.completed?.includes(tk.id)) return 'already done';
      const at = await ev(openTask);
      if (at !== tk.id) {
        if (expected === tk.id) findings.push({ section, name: `${tk.id}: next-task button`, route: await ev('location.hash'), error: `after the previous task the open task is ${at}, expected ${tk.id}`, shot: await shot(`nav-${tk.id}`), console: [] });
        await openTicket(tk.id, tk.chapter);
      }
      for (let i = 0; i < tk.steps.length; i++) {
        const last = i === tk.steps.length - 1;
        if (!last) await submitUntil(tk.steps[i], `(${SAVE}.bossStep ?? {})[${S(tk.id)}] >= ${i + 1}`);
        else if (tk.beat === 'boss') await submitUntil(tk.steps[i], `!!document.getElementById('conclusion-form')`);
        else await submitUntil(tk.steps[i], `${completed}.includes(${S(tk.id)})`);
      }
      if (tk.beat === 'boss') {
        if (!axedBoss) { axedBoss = true; await axe(`${domain} conclusion form ${tk.id}`); }
        await ev(`(() => { const f = document.getElementById('conclusion-form'); f.querySelector('input[value="${tk.answer}"]').click(); f.requestSubmit(); })()`);
        await waitFor(`${tk.id} in save.completed`, `${completed}.includes(${S(tk.id)})`, 15000);
      }
      const after = await saveNow();
      if (!(after.xp > before.xp)) fail(`xp did not grow (${before.xp} → ${after.xp})`);
      // the completion dock: wait for it, then close it (Esc) so it does not cover the next screenshots
      await sleep(400);
      if (tk.beat === 'boss') {
        await waitFor('the chapter wrap-up', `!!document.getElementById('wrapup-title')`, 10000);
        if (!axedWrap) { axedWrap = true; await sleep(3200); await axe(`${domain} chapter wrap-up ${tk.id}`); }
        const ch = D.chapters.find((c) => c.chapter === tk.chapter);
        if (ch?.tier) {
          const rank = await ev(`document.getElementById('rank').textContent.trim()`);
          if (rank !== ch.career.vi) fail(`rank after the ★ review is "${rank}", expected "${ch.career.vi}"`);
        }
      } else {
        await waitFor('the Recap', `!!document.querySelector('#ticket .recap')`, 10000);
        if (!axedRecap) { axedRecap = true; await sleep(3200); await axe(`${domain} Recap ${tk.id}`); }
      }
      await key('Escape', 0, 'Escape', 27);
      return { xp: after.xp - before.xp };
    });
    // move on the way a player does: the main button ("Việc tiếp theo →" or the wrap-up's "Bắt đầu chương N →")
    const i = D.tickets.indexOf(tk);
    const next = D.tickets[i + 1];
    expected = next?.id ?? '';
    if (ok && next) {
      await sleep(200);
      const clicked = tk.beat === 'boss'
        ? await clickText('#ticket button', '^Bắt đầu chương')
        : await clickText('#map [data-nav="continue"]', '.');
      if (clicked === null && next.chapter === tk.chapter + (tk.beat === 'boss' ? 1 : 0)) {
        findings.push({ section, name: `${tk.id}: no main button to the next task`, route: await ev('location.hash'), error: `expected ${tk.beat === 'boss' ? 'the wrap-up\'s "Bắt đầu chương"' : '"Việc tiếp theo →"'} button`, shot: await shot(`nonext-${tk.id}`), console: [] });
      }
      await sleep(300);
    }
  }
  await step('save holds every ticket of the domain', async () => {
    const c = new Set((await saveNow()).completed);
    const missing = D.tickets.filter((t) => !c.has(t.id)).map((t) => t.id);
    if (missing.length) fail(`missing ${missing.length}: ${missing.join(', ')}`);
    const last = D.chapters.filter((c) => c.tier).at(-1);
    const rank = await ev(`document.getElementById('rank').textContent.trim()`);
    if (last && rank !== last.career.vi) fail(`final rank "${rank}", expected "${last.career.vi}"`);
    return { done: D.tickets.length, rank };
  });
  await step('every KPI tile is open on the dashboard', async () => {
    await go(`#/d/${domain}/dashboard`);
    await waitFor('the dashboard', `!document.getElementById('dashboard').hidden && !!document.querySelector('#dashboard h1')`, 30000);
    const labels = S(D.kpis.map((k) => k.label.vi));
    const tiles = await waitFor('KPI values computed', `(() => { const want = ${labels};
      const arts = [...document.querySelectorAll('#dashboard article')].filter((a) => want.includes(a.querySelector('h3')?.textContent.trim()));
      const t = arts.map((a) => ({ label: a.querySelector('h3').textContent.trim(), locked: a.textContent.includes('Đang khóa'),
        value: a.querySelector('h3').parentElement.nextElementSibling?.textContent.trim() ?? '' }));
      return t.length && t.every((x) => x.locked || x.value !== '…') ? t : null; })()`, 60000);
    const locked = tiles.filter((x) => x.locked);
    const broken = tiles.filter((x) => !x.locked && (x.value === '—' || x.value === ''));
    if (tiles.length !== D.kpis.length) fail(`${tiles.length} tiles shown, kpis.yml has ${D.kpis.length}`);
    if (locked.length) fail(`${locked.length} tile(s) still locked: ${locked.map((x) => x.label).join(' | ')}`);
    if (broken.length) fail(`${broken.length} tile(s) without a value: ${broken.map((x) => x.label).join(' | ')}`);
    return { tiles: tiles.length };
  }, { shotAlways: true });
}

const SECTIONS = {};
/** The shared profile: General, the three domains and the tools run in one save, in that order (each builds on the last). */
let sharedUp = false;
async function shared() {
  if (sharedUp && ws) return;
  await startBrowser();
  await size(1280, 800);
  await step("welcome: knows SQL, pick Logistics", () => boot("logistics"));
  sharedUp = true;
}
for (const d of ["logistics", "ecommerce", "finance"]) SECTIONS[d] = async () => {
  await shared();
  await playDomain(d);
};
// ---- screens: every page at 1280 light and 375 dark + reduced motion; axe (serious/critical = finding), no sideways scroll
const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const AXE_RUN = `(async () => {
  await Promise.race([Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
    .map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]);
  const r = await axe.run(document, { resultTypes: ['violations'], rules: { 'target-size': { enabled: true } } });
  return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length,
    nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(' '), why: (n.failureSummary ?? '').slice(0, 300) })) }));
})()`;
const axeAll = [];
/** rule|target → { rule, impact, help, target, why, screens[] }: one finding per serious/critical rule + target at the end of the run. */
const axeIssues = new Map();
/** axe on the current screen. Never throws (a violation must not stop the flow under test); returns the rule list. */
async function axe(label) {
  try {
    if (!(await ev('!!window.axe'))) await send('Runtime.evaluate', { expression: AXE });
    const found = await ev(AXE_RUN);
    if (found.length) axeAll.push({ screen: label, section, route: await ev('location.hash'), found });
    for (const v of found) for (const n of v.nodes) {
      const k = v.id + '|' + n.target;
      if (!axeIssues.has(k)) axeIssues.set(k, { rule: v.id, impact: v.impact, help: v.help, target: n.target, why: n.why, screens: [] });
      axeIssues.get(k).screens.push(label);
    }
    return found.map((v) => `${v.id} ${v.impact} ${v.count}`);
  } catch (e) {
    return [`axe failed: ${e.message}`];
  }
}
const mainOf = (hash) => (/\/play(\/|$)/.test(hash) ? 'shell' : /\/data(\/|$)/.test(hash) ? 'data' : /\/dashboard$/.test(hash) ? 'dashboard' : 'home');
async function screen(hash, label, { axeOn = true, w = 1280 } = {}) {
  await go(hash);
  const main = mainOf(hash);
  await waitFor(`<main id="${main}"> with an h1`, `(m => m && !m.hidden && !!m.querySelector('h1'))(document.getElementById(${S(main)}))`, 30000);
  await waitFor('#notice closed', `document.getElementById('notice').hidden`, 120000);
  const m = await ev(`({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })`);
  if (w <= 375 && Math.max(m.sw, m.iw) > w) fail(`horizontal scroll: scrollWidth ${m.sw} > ${w}`);
  return axeOn ? axe(label) : undefined;
}
/** axe on whatever is on screen now (a dialog, a run in progress): a step of its own. */
const axeHere = (label) => step(`axe: ${label}`, () => axe(label));
const SCREENS = ['#/', '#/learn', '#/learn/sql/1', '#/learn/sql/6', '#/learn/skill/join', '#/learn/adv/a2', '#/learn/adv/d5', '#/learn/interview', '#/practice', '#/me',
  ...['logistics', 'ecommerce', 'finance'].flatMap((d) => ['', '/play', '/data', '/dashboard', '/map'].map((p) => `#/d/${d}${p}`))];
SECTIONS.screens = async () => {
  await startBrowser();
  await size(1280, 800);
  await step('welcome: knows SQL, Logistics', () => boot('logistics'));
  if (playedSave) await step('screens use the played save (every domain done)', async () => {
    await ev(`localStorage.setItem('cargo-query-save', ${S(playedSave)})`);
    await load('#/');
  });
  for (const [w, h, theme, reduce] of [[1280, 800, 'light', false], [375, 740, 'dark', true], [1280, 800, 'dark', false], [375, 740, 'light', false]]) {
    await size(w, h);
    await media([{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }]);
    for (const hash of SCREENS) {
      const label = `${w}px ${theme}${reduce ? ' reduced' : ''} ${hash}`;
      await step(label, async () => {
        const r = await screen(hash, label, { w });
        const theme2 = await ev('document.documentElement.dataset.theme');
        if (theme2 !== theme) fail(`<html data-theme> is ${theme2}, expected ${theme}`);
        return r;
      }, { shotAlways: true });
    }
  }
  await media([]);
  await closeBrowser();
};

// ---- reloads in the middle of work: a drill (hash + draft), the Sandbox (draft), an interview set (question + clock)
SECTIONS.reload = async () => {
  await startBrowser();
  await size(1280, 800);
  await step('welcome', () => boot('logistics'));
  const drill = SQL_DRILLS.find((d) => d.kind === 'open');
  const half = drill.solution.slice(0, Math.ceil(drill.solution.length / 2));
  await step(`reload mid-drill ${drill.id} keeps the drill and its draft`, async () => {
    await go(`#/learn/play/${drill.id}`);
    await waitFor('the drill workspace', `!!${EDITOR} && /Bài luyện/.test(document.getElementById('brief-title')?.textContent ?? '')`, 60000);
    await sleep(500);
    await typeAnd(half, false);
    await sleep(800);
    const before = (await saveNow()).drafts?.[`${drill.id}#0`];
    await send('Page.reload');
    await sleep(500);
    await waitFor('the drill workspace again', `location.hash === ${S('#/learn/play/' + drill.id)} && !!${EDITOR}`, 60000);
    const txt = await waitFor('the draft back', `(t => t.trim().length ? t : null)(${editorText})`, 15000).catch(async (e) => {
      const after = (await saveNow()).drafts?.[`${drill.id}#0`];
      fail(`${e.message}; save.drafts[${drill.id}#0] before reload ${S(before?.slice(0, 40))}, after ${S(after?.slice(0, 40))}; editor ${S(await ev(editorText))}`);
    });
    if (norm(txt) !== norm(half)) fail(`draft after reload: ${S(txt.slice(0, 80))}, expected ${S(half.slice(0, 80))}`);
  });
  await step('reload mid-Sandbox keeps its draft', async () => {
    await enterSandbox('logistics');
    const sql = 'SELECT 42 AS answer';
    await typeAnd(sql, false);
    await waitFor('the run result', `/42/.test(document.getElementById('panel')?.innerText ?? '')`, 30000);
    await sleep(800);
    await send('Page.reload');
    await waitFor('the app again', `!!document.querySelector('header.topbar')`, 30000);
    await sleep(1500);
    const draft = (await saveNow()).sandboxDraft;
    if (norm(draft ?? '') !== sql) fail(`save.sandboxDraft after reload: ${S(draft)}`);
    return { hashAfter: await ev('location.hash'), sandboxShown: await ev(`norm => 0`).catch(() => '') };
  });
  const set = INTERVIEW.sets[0];
  await step(`reload mid-interview (${set.id}, question 2) reopens question 2`, async () => {
    await startSet(set, true);
    await submitUntil(set.questions[0].solution, `/Câu này đã đúng/.test(document.getElementById('ticket')?.textContent ?? '')`);
    await mustClick('#ticket button', '^Câu sau');
    await waitFor('question 2', `location.hash === ${S('#/learn/play/' + set.questions[1].id)}`, 15000);
    await typeAnd('SELECT 1', false);
    await sleep(800);
    const clock1 = await ev(`document.getElementById('iv-clock')?.textContent.trim()`);
    await send('Page.reload');
    await waitFor('question 2 again', `location.hash === ${S('#/learn/play/' + set.questions[1].id)} && !!${EDITOR} && !!document.getElementById('iv-clock')`, 60000);
    const nav = await ev(`[...document.querySelectorAll('#ticket nav button')].map((b) => b.getAttribute('aria-label') + (b.getAttribute('aria-current') ? '*' : ''))`);
    if (!nav[0]?.includes('đã đúng')) fail(`question 1 lost its ✓ after the reload: ${S(nav)}`);
    if (!nav[1]?.endsWith('*')) fail(`question 2 is not current after the reload: ${S(nav)}`);
    return { clockBefore: clock1, clockAfter: await ev(`document.getElementById('iv-clock')?.textContent.trim()`) };
  });
  await closeBrowser();
};

// ---- Back/Forward through pages of three areas
SECTIONS.history = async () => {
  await startBrowser();
  await size(1280, 800);
  await step('welcome', () => boot('logistics'));
  const path = ['#/', '#/learn', '#/learn/sql/2', '#/d/logistics', '#/d/logistics/data', '#/d/logistics/play', '#/d/ecommerce', '#/practice', '#/me'];
  await step('visit 9 pages', async () => { for (const h of path) await screen(h, h, { axeOn: false }); });
  const at = async (want) => {
    await waitFor(`hash ${want}`, `location.hash === ${S(want)} || location.hash.startsWith(${S(want + '/')}) || (${S(want)} === '#/' && location.hash === '')`, 15000);
    await waitFor(`the page of ${want}`, `(m => m && !m.hidden && !!m.querySelector('h1'))(document.getElementById(${S(mainOf(want))}))`, 30000);
  };
  await step('Back to the start', async () => { for (let i = path.length - 2; i >= 0; i--) { await ev('history.back()'); await at(path[i]); } });
  await step('Forward to the end', async () => { for (let i = 1; i < path.length; i++) { await ev('history.forward()'); await at(path[i]); } });
  const drill = SQL_DRILLS.find((d) => d.kind === 'open');
  await step('drill → Back → Forward reopens the drill', async () => {
    await go('#/learn/skill/' + drill.skill);
    await waitFor('the skill page', `!document.getElementById('home').hidden && /Bài luyện/.test(document.getElementById('home').textContent)`, 30000);
    await go('#/learn/play/' + drill.id);
    await waitFor('the drill', `!!${EDITOR}`, 60000);
    await ev('history.back()');
    await at('#/learn/skill/' + drill.skill);
    await ev('history.forward()');
    await waitFor('the drill again', `location.hash === ${S('#/learn/play/' + drill.id)} && !!${EDITOR} && /Bài luyện/.test(document.getElementById('brief-title')?.textContent ?? '')`, 30000);
  });
  await closeBrowser();
};

// ---- offline: one seeded visit, then a second open with the network off (CDP)
SECTIONS.offline = async () => {
  await startBrowser();
  await size(1280, 800);
  await step('welcome + seeded visit', async () => {
    await boot('logistics');
    await go('#/d/logistics/play');
    await waitFor('DB ready', DB_READY, 120000);
    const ctl = await waitFor('a service worker controls the page', `!!navigator.serviceWorker?.controller`, 20000).catch(() => false);
    if (!ctl) {
      await send('Page.reload');
      await waitFor('a service worker controls the page (after a reload)', `!!navigator.serviceWorker?.controller`, 30000);
    }
    await sleep(4000); // the precache fills in the background
  });
  await step('second open offline: page, DB and a query', async () => {
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await load('#/d/logistics/play');
    await waitFor('the workspace', `!document.getElementById('shell').hidden && !!${EDITOR}`, 60000);
    await waitFor('DB ready offline', DB_READY, 120000);
    await typeAnd('SELECT COUNT(*) AS n FROM ports', false);
    await waitFor('a result offline', `/\\d/.test(document.getElementById('panel')?.innerText ?? '')`, 30000);
  }, { shotAlways: true });
  await step('offline: General and a domain never opened', async () => {
    await go('#/learn/sql/1');
    await waitFor('the module page', `!document.getElementById('home').hidden && !!document.querySelector('#home h1')`, 30000);
    await go('#/d/finance');
    await sleep(5000);
    return ev(`document.getElementById('notice').hidden ? 'no notice' : document.getElementById('notice').textContent.trim().slice(0, 160)`);
  }, { shotAlways: true });
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
  await closeBrowser();
};

// ---- General: entry check, one drill per skill (module by module), a review run, the interview room, lessons' "Thử ngay"
const stripMd = (s) => norm(String(s).replace(/[`*]/g, ''));
/** The drill shown in the left pane (a practice run's hash has no id): found by its task text. */
async function shownDrill() {
  const txt = stripMd(await ev(`document.getElementById('ticket').textContent`));
  const hits = SQL_DRILLS.filter((d) => txt.includes(stripMd(d.task.vi)));
  if (!hits.length) fail(`could not tell which drill is shown: ${txt.slice(0, 200)}`);
  return hits.sort((a, b) => b.task.vi.length - a.task.vi.length)[0];
}
const pageHas = (re) => `new RegExp(${S(re)}).test(document.getElementById('ticket')?.textContent ?? '')`;
/** A practice run (review or entry check): solve each item, "Bài tiếp →", until the end line. */
async function practiceRun(endRe, max = 20) {
  let n = 0;
  for (; n < max; n++) {
    await waitFor('the next item or the end', `${pageHas(endRe)} || !!${EDITOR}`, 60000);
    if (await ev(pageHas(endRe))) return n;
    const d = await shownDrill();
    const prog = await ev(`document.getElementById('ticket').textContent.match(/bài (\\d+)\\/(\\d+)/)?.[0] ?? ''`);
    await submitUntil(d.solution, `[...document.querySelectorAll('#ticket .actions button.primary')].some((b) => b.offsetParent && /Bài tiếp/.test(b.textContent))`);
    await mustClick('#ticket .actions button.primary', 'Bài tiếp');
    await waitFor('the item changed', `!(document.getElementById('ticket').textContent.includes(${S(prog)})) || ${pageHas(endRe)}`, 15000).catch(() => {});
  }
  fail(`no end line after ${max} items`);
}
SECTIONS.general = async () => {
  await shared();
  const modules = PARTS.map((p) => p.n);
  await step('entry check (one drill per module)', async () => {
    await go('#/learn');
    await waitFor('the entry-check card', `!!document.querySelector('section[aria-labelledby="place-title"] button')`, 60000);
    await axe('#/learn with the entry-check card');
    await ev(`document.querySelector('section[aria-labelledby="place-title"] button').click()`);
    await waitFor('the entry-check banner', pageHas('Kiểm tra đầu vào · bài 1/'), 60000);
    await axeHere('entry check, item 1');
    const n = await practiceRun('Xong kiểm tra đầu vào');
    const line = await ev(`document.getElementById('brief-title')?.textContent.trim()`);
    if (!line.includes(`${modules.length}/${modules.length}`) && !line.includes(`${n}/${n}`)) fail(`end line "${line}" after ${n} items`);
    const cards = Object.keys((await saveNow()).review ?? {}).length;
    if (cards < SKILLS.length) fail(`after a clean entry check save.review has ${cards} cards, expected every skill (${SKILLS.length})`);
    return { items: n, line, cards };
  }, { shotAlways: true });
  await step('#/learn: no entry-check card once every module is known', async () => {
    await go('#/learn');
    await waitFor('the learn page', `!!document.querySelector('#home h1')`, 30000);
    await sleep(1500);
    if (await ev(`!!document.querySelector('section[aria-labelledby="place-title"]')`)) fail('the entry-check card is still offered');
  });
  for (const m of modules) {
    const skills = PARTS.find((p) => p.n === m).skills.map((id) => SKILLS.find((s) => s.id === id));
    await step(`module ${m}: one drill per skill (${skills.length})`, async () => {
      await go(`#/learn/sql/${m}`);
      await waitFor('the module page', `!!document.querySelector('#home a[href^="#/learn/skill/"]')`, 60000);
      const passed = [];
      for (const [i, s] of skills.entries()) {
        const d = SQL_DRILLS.find((x) => x.skill === s.id && x.kind === 'open') ?? SQL_DRILLS.find((x) => x.skill === s.id);
        if (i === 0) { // the way a player goes: module page → skill page → the drill button
          await ev(`document.querySelector('#home a[href="#/learn/skill/${s.id}"]').click()`);
          await waitFor('the skill page', `location.hash === '#/learn/skill/${s.id}'`, 15000);
          await waitFor('the drill buttons', `[...document.querySelectorAll('#home button')].some((b) => /Tự làm|Điền vào chỗ trống/.test(b.textContent))`, 30000);
          await mustClick('#home button', d.kind === 'open' ? '^Tự làm' : '^Điền vào');
        } else await go(`#/learn/play/${d.id}`);
        await waitFor(`the drill ${d.id}`, `location.hash === ${S('#/learn/play/' + d.id)} && !!${EDITOR}`, 60000);
        await submitUntil(d.solution, `${completed}.includes(${S(d.id)})`);
        await waitFor('the drill recap', `/Đạt/.test(document.getElementById('drill-recap')?.textContent ?? '')`, 10000);
        passed.push(d.id);
      }
      return passed.length;
    });
  }
  // v26 R2 (L390) write drills (Part 9): Submit runs the write, then the drill's `check:` read in the same BEGIN … ROLLBACK,
  // and grades that read. A decoy (the drill's `wrong:` write, else the check read alone, which writes nothing) is refused;
  // the Solution passes. Open drills were passed in the module loop above, so the other kinds are walked here.
  const writeDrills = SQL_DRILLS.filter((d) => d.check && d.kind !== 'open');
  await step(`write drills: Submit grades the check read (${writeDrills.length})`, async () => {
    const bad = [];
    for (const d of writeDrills) {
      await go(`#/learn/play/${d.id}`);
      await waitFor(`the drill ${d.id}`, `location.hash === ${S('#/learn/play/' + d.id)} && !!${EDITOR}`, 60000);
      const decoy = d.wrong?.[0]?.sql ?? d.check;
      const prev = await ev(`document.querySelector('#work [role=status]')?.textContent?.trim() ?? ''`);
      await typeAnd(decoy, true);
      // a decoy that errors (the check read alone on a table only the write creates, 42P01) may answer in the Result tab only
      await waitFor(`the verdict on the decoy of ${d.id}`, `(t => !!t && t !== ${S(prev)} && !/Đang chạy/.test(t))(document.querySelector('#work [role=status]')?.textContent?.trim())`, 60000).catch(() => sleep(3000));
      if (await ev(`${completed}.includes(${S(d.id)})`)) bad.push(`${d.id}: the decoy passed`);
      await submitUntil(d.solution, `${completed}.includes(${S(d.id)})`);
    }
    if (bad.length) fail(bad.join('; '));
    return writeDrills.length;
  });
  await step('drill workspace: Thoát bài luyện goes back to the skill page', async () => {
    const d = SQL_DRILLS.find((x) => x.kind === 'trap');
    await go(`#/learn/play/${d.id}`);
    await waitFor('the drill', `!!${EDITOR}`, 60000);
    await axe('drill workspace');
    await mustClick('#ticket button', 'Thoát bài luyện');
    await waitFor('the skill page', `location.hash === ${S('#/learn/skill/' + d.skill)}`, 15000);
  });
  await step('review run (cards made due)', async () => {
    await ev(`(() => { const s = ${SAVE}; for (const k of Object.keys(s.review ?? {})) s.review[k].due = '2020-01-01'; localStorage.setItem('cargo-query-save', JSON.stringify(s)); })()`);
    await load('#/practice');
    await waitFor('the review button', `(b => b && !b.hidden && b.offsetParent)(document.getElementById('review-btn'))`, 60000);
    const label = await ev(`document.getElementById('review-btn').getAttribute('aria-label')`);
    await ev(`document.getElementById('review-btn').click()`);
    await waitFor('the practice banner', pageHas('Luyện tập · bài 1/'), 60000);
    await axeHere('review run, item 1');
    const n = await practiceRun('Xong lượt luyện');
    const line = await ev(`document.getElementById('brief-title')?.textContent.trim()`);
    if (!line.includes(`${n}/${n}`)) fail(`end line "${line}" after ${n} items`);
    return { label, items: n, line, practice: (await saveNow()).practice };
  }, { shotAlways: true });
  const set = INTERVIEW.sets[0];
  await step(`interview set ${set.id} with the clock`, () => playSet(set), { shotAlways: true });
  const th = INTERVIEW.takeHomes[0];
  await step(`take-home ${th.id} to the rubric`, async () => {
    await go('#/learn/interview');
    // v21 U24: one main button on the room page (a set's), so a take-home row's Start is a plain button
    await waitFor('the take-home list', `!!document.querySelector('section[aria-labelledby="iv-th"] li button')`, 60000);
    await ev(`[...[...document.querySelectorAll('section[aria-labelledby="iv-th"] li')].find((li) => li.textContent.includes(${S(th.title.vi)})).querySelectorAll('button')].find((b) => /^(Bắt đầu|Làm tiếp)/.test(b.textContent.trim())).click()`);
    for (const [i, st] of th.steps.entries()) {
      await waitFor(`step ${i + 1}`, `location.hash === ${S(`#/learn/play/${th.id}-${i + 1}`)} && !!${EDITOR}`, 60000);
      const nextDone = i === th.steps.length - 1 ? `!!document.getElementById('iv-text')` : `location.hash === ${S(`#/learn/play/${th.id}-${i + 2}`)}`;
      await submitUntil(st.solution, nextDone);
    }
    await axeHere('take-home write phase');
    await ev(`(() => { const a = document.getElementById('iv-text'); a.value = 'Cửa hàng 3 hụt mục tiêu nhiều nhất, chủ yếu vào quý 2. Đề xuất xem lại mục tiêu và tồn kho.'; a.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await mustClick('#ticket button.primary', 'tự chấm theo rubric');
    await waitFor('the rubric', `document.querySelectorAll('#ticket fieldset input[type=checkbox]').length > 0`, 15000);
    const m = await ev(`(() => { const c = [...document.querySelectorAll('#ticket fieldset input[type=checkbox]')]; c.forEach((x) => x.click()); return c.length; })()`);
    await waitFor('the score', pageHas(`Bạn tự chấm: ${m}/${m}`), 10000);
    await axeHere('take-home rubric');
    await mustClick('#ticket button.primary', 'Về phòng phỏng vấn');
    await waitFor('the room', `location.hash === '#/learn/interview'`, 15000);
    const pref = await ev(`JSON.parse(localStorage.getItem('cargo-query/interview') || '{}').takeHomes?.[${S(th.id)}]`);
    if (!pref || pref.rubric !== m) fail(`cargo-query/interview takeHomes.${th.id} = ${S(pref)}`);
    return { rubric: m };
  }, { shotAlways: true });
  await step(`lessons: "Thử ngay" for every skill (${SKILLS.length})`, async () => {
    const bad = [];
    for (const s of SKILLS) {
      const l = LESSONS.find((x) => x.id === s.id);
      await go(`#/learn/skill/${s.id}`);
      if (FULL_LESSONS.includes(s.id)) { // v24 R0: the full lesson page holds "Thử ngay" itself (one editor, Submit)
        const host = `document.querySelector('[data-fl-editor$="#try"]')`;
        await waitFor('the lesson page editor', `!!${host}`, 60000);
        if (s === SKILLS[0]) await axe('full lesson page');
        await ev(`(() => { ${host}.value = ${S(l.try.solution)}; [...document.querySelectorAll('#home [data-lesson-page] button')].find((b) => b.textContent.trim() === 'Nộp').click(); })()`);
        const ok = await waitFor('the verdict', `(p => p && /text-(good|bad)/.test(p.className) ? p.className + '|' + p.textContent.trim() : null)(document.querySelector('[data-fl-verdict]'))`, 60000).catch((e) => `timeout ${e.message}`);
        if (!/text-good/.test(ok)) bad.push(`${s.id}: ${String(ok).slice(0, 120)}`);
        continue;
      }
      await waitFor('the lesson button', `!!document.querySelector('#home button[aria-haspopup="dialog"]')`, 30000);
      await ev(`document.querySelector('#home button[aria-haspopup="dialog"]').click()`);
      await waitFor('the lesson dialog', `document.getElementById('lesson-dialog')?.open && !!document.querySelector('#lesson-dialog textarea')`, 15000);
      if (s === SKILLS[0]) await axe('lesson dialog');
      await ev(`(() => { const a = document.querySelector('#lesson-dialog textarea'); a.value = ${S(l.try.solution)}; a.dispatchEvent(new Event('input', { bubbles: true }));
        [...document.querySelectorAll('#lesson-dialog button.primary')].find((b) => /Kiểm câu trả lời/.test(b.textContent)).click(); })()`);
      const ok = await waitFor('the verdict', `(p => p && !/Đang chạy/.test(p.textContent) && p.textContent.trim() ? p.className + '|' + p.textContent.trim() : null)([...document.querySelectorAll('#lesson-dialog p[role=status]')].find((p) => /good|bad/.test(p.className)))`, 60000).catch((e) => `timeout ${e.message}`);
      if (!/good/.test(ok)) bad.push(`${s.id}: ${String(ok).slice(0, 120)}`);
      await ev(`document.getElementById('lesson-dialog').close()`);
    }
    const tried = await ev(`JSON.parse(localStorage.getItem('cargo-query/lessons') || '{}').tried ?? []`);
    const missing = SKILLS.filter((s) => !tried.includes(s.id) && !FULL_LESSONS.includes(s.id)).map((s) => s.id); // the page's "Thử ngay" writes no pref
    if (bad.length || missing.length) fail(`not passed: ${bad.join('; ')}; not in tried: ${missing.join(', ')}`);
    return SKILLS.length;
  });
};
async function startSet(set, timer) {
  await go('#/learn/interview');
  await waitFor('the set list', `!!document.querySelector('section[aria-labelledby="iv-sets"] li button')`, 60000);
  await ev(`(() => { const c = document.getElementById('iv-timer'); if (c && c.checked !== ${timer}) c.click(); })()`);
  const li = `[...document.querySelectorAll('section[aria-labelledby="iv-sets"] li')].find((li) => li.querySelector('h3')?.textContent.includes(${S(set.title.vi)}))`; // v21 UX-A: h4 → h3
  // a run left from earlier: start over
  if (await ev(`[...${li}.querySelectorAll('button')].some((b) => /Làm lại từ đầu/.test(b.textContent))`)) await ev(`[...${li}.querySelectorAll('button')].find((b) => /Làm lại từ đầu/.test(b.textContent)).click()`);
  else await ev(`[...${li}.querySelectorAll('button')].find((b) => /^Bắt đầu/.test(b.textContent.trim())).click()`); // v21 U24: only one row's button is primary
  await waitFor('question 1', `location.hash === ${S('#/learn/play/' + set.questions[0].id)} && !!${EDITOR}`, 60000);
}
async function playSet(set) {
  await startSet(set, true);
  const clock = await waitFor('the clock', `document.getElementById('iv-clock')?.textContent.trim()`, 10000);
  if (!/Còn \d+:\d\d/.test(clock)) fail(`clock reads "${clock}"`);
  await axeHere('interview question 1');
  for (const [i, q] of set.questions.entries()) {
    await waitFor(`question ${i + 1}`, `location.hash === ${S('#/learn/play/' + q.id)} && !!${EDITOR}`, 30000);
    await submitUntil(q.solution, pageHas('Câu này đã đúng'));
    if (i < set.questions.length - 1) await mustClick('#ticket button', '^Câu sau');
  }
  await mustClick('#ticket button', 'Kết thúc bộ đề');
  const line = await waitFor('the result', `(t => /Kết quả/.test(t) ? t : null)(document.getElementById('brief-title')?.textContent ?? '')`, 15000);
  if (!line.includes(`${set.questions.length}/${set.questions.length}`)) fail(`result "${line}"`);
  const pref = await ev(`JSON.parse(localStorage.getItem('cargo-query/interview') || '{}').sets?.[${S(set.id)}]`);
  if (!pref || pref.solved !== set.questions.length || !pref.timer) fail(`cargo-query/interview sets.${set.id} = ${S(pref)}`);
  return { line, clock };
}

// ---- tools, after the three domains are played in the shared profile: lanes, Data page, Sandbox + CSV + dataset, pin,
// dashboard export/import, notebook, ⋯ export/import, #/me exports
async function download(what, re, click, ms = 30000) {
  const n = downloads.length;
  await click();
  const t = Date.now();
  while (Date.now() - t < ms) {
    const d = downloads.slice(n).find((x) => new RegExp(re).test(x.name ?? ''));
    if (d && d.state === 'completed') return `${d.name} (${d.bytes} B)`;
    if (d && d.state === 'canceled') fail(`${what}: download canceled`);
    await sleep(200);
  }
  fail(`${what}: no completed download matching /${re}/ within ${ms} ms (seen: ${downloads.slice(n).map((x) => x.name).join(', ') || 'none'})`);
}
async function enterSandbox(domain) {
  await go(`#/d/${domain}`);
  await waitFor('the overview', `!document.getElementById('home').hidden && !!document.getElementById('modes-title')`, 60000);
  const ok = await ev(`(() => { const b = [...document.querySelectorAll('#home button')].find((x) => /^Sandbox/.test(x.querySelector('b')?.textContent ?? '')); if (!b) return false; b.click(); return true; })()`);
  if (!ok) fail('no "Sandbox: SQL tự do" mode card on the Overview');
  await waitFor('the Sandbox', `/Sandbox/.test(document.getElementById('brief-title')?.textContent ?? '') && !!${EDITOR}`, 30000);
}
async function setFile(selector, path) {
  const { root } = await send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) fail(`no ${selector}`);
  await send('DOM.setFileInputFiles', { nodeId, files: [path] });
}
SECTIONS.tools = async () => {
  await shared();
  await step('lanes: every side task from the map (Logistics)', async () => {
    const solved = [];
    for (const port of ['SGSIN', 'NLRTM', 'AUSYD']) {
      for (const task of LANE_TASKS.filter((x) => x.file.includes(`/${port.toLowerCase()}/`))) {
        await go('#/d/logistics/map');
        await waitFor('the lane list', `!!document.getElementById('lane-btn-${port}')`, 60000);
        await ev(`document.getElementById('lane-btn-${port}').click()`);
        await waitFor('the lane brief', `!!document.getElementById('lane-title')`, 15000);
        if (port === 'SGSIN' && !solved.length) await axe('map with a lane brief');
        const started = await ev(`(() => { const li = [...document.querySelectorAll('#home li')].find((x) => x.textContent.includes(${S(task.title)}));
          const b = li && [...li.querySelectorAll('button')].find((x) => /Làm bài tuyến|Xem lại/.test(x.textContent)); if (!b) return li ? 'no button: ' + li.textContent.slice(0, 100) : 'no row'; b.click(); return 'ok'; })()`);
        if (started !== 'ok') fail(`${task.id}: ${started}`);
        await waitFor(`${task.id} open`, `${openTask} === ${S(task.id)} && !!${EDITOR}`, 30000);
        await submitUntil(task.steps[0], `(${SAVE}.lanes ?? []).includes(${S(task.id)})`);
        solved.push(task.id);
      }
    }
    if (solved.length !== LANE_TASKS.length) fail(`solved ${solved.length}/${LANE_TASKS.length}`);
    await mustClick('#map button[data-nav="back"]', '.');
    return solved;
  });
  await step('Data page: pick a table, 5 sample rows', async () => {
    await go('#/d/logistics/data');
    await waitFor('the Data page', `!!document.getElementById('data-title') && !!document.getElementById('data-table-title')`, 60000);
    await ev(`(() => { const s = document.getElementById('data-select'); if (!s) return; s.value = 'customers'; s.dispatchEvent(new Event('change')); })()`);
    await waitFor('customers', `document.getElementById('data-table-title')?.textContent.trim() === 'customers'`, 15000);
    await mustClick('#data button', 'Xem 5 dòng mẫu');
    await waitFor('the sample rows', `document.querySelectorAll('#data table').length >= 2 && [...document.querySelectorAll('#data table')].at(-1).querySelectorAll('tbody tr').length === 5`, 30000);
    await axe('Data page with sample rows');
  }, { shotAlways: true });
  const csv = join(OUT, 'e2e_cities.csv');
  writeFileSync(csv, 'city,country,population\nDa Nang,VN,1220000\nHue,VN,1160000\nHoi An,VN,120000\n');
  await step('Sandbox: run, CSV import, query the import', async () => {
    await enterSandbox('logistics');
    await typeAnd('SELECT COUNT(*) AS n FROM shipments', false);
    await waitFor('the run', `/\\d/.test(document.querySelector('#panel table')?.textContent ?? '')`, 30000);
    await waitFor('My data', `!!document.getElementById('mydata-file')`, 30000);
    await setFile('#mydata-file', csv);
    await waitFor('the import line', `/đã nạp bảng e2e_cities/.test(document.getElementById('ticket').textContent)`, 60000);
    await typeAnd('SELECT city FROM e2e_cities ORDER BY population DESC', false);
    await waitFor('the imported rows', `/Da Nang/.test(document.querySelector('#panel table')?.textContent ?? '')`, 30000);
    await axe('Sandbox with My data');
  }, { shotAlways: true });
  await step('Sandbox: sample dataset (penguins) + one guided question', async () => {
    await waitFor('the datasets panel', `!!document.getElementById('datasets-title')`, 30000);
    await mustClick('#ticket button.primary', 'Nạp bộ này');
    await waitFor('penguins loaded', `/đã nạp bảng penguins/.test(document.getElementById('ticket').textContent)`, 60000);
    const ds = yml('content/general/datasets.yml');
    const q = (ds.datasets ?? ds)[0].questions?.[0];
    if (!q) fail('datasets.yml: no question with a solution on the first dataset');
    {
      await ev(`(() => { const a = document.querySelector('#ticket textarea[aria-label^="Câu SQL của bạn"]'); a.value = ${S(q.solution)}; a.dispatchEvent(new Event('input', { bubbles: true }));
        [...a.closest('li').querySelectorAll('button')].find((b) => /Kiểm tra/.test(b.textContent)).click(); })()`);
      await waitFor('the check', `[...document.querySelectorAll('#ticket li p[role=status]')].some((p) => /Đúng rồi/.test(p.textContent))`, 30000);
    }
    await typeAnd('SELECT species, COUNT(*) AS n FROM penguins GROUP BY species', false);
    await waitFor('the penguins', `/Adelie/.test(document.querySelector('#panel table')?.textContent ?? '')`, 30000);
  }, { shotAlways: true });
  await step('editing after a run turns Pin off ("Chạy lại trước khi ghim") before the next run', async () => {
    await ev(`document.querySelectorAll('dialog[open]').forEach((d) => d.close())`);
    await waitFor('the editor', `!!${EDITOR}`, 15000);
    await ev(`${EDITOR}.focus()`);
    await key('End', MOD, 'End', 35);
    await send('Input.insertText', { text: ' -- edited' });
    await sleep(1500);
    const bar = await ev(`(() => { const b = [...document.querySelectorAll('#panel button')].find((x) => /Ghim lên/.test(x.textContent) && x.offsetParent);
      return { button: b ? (b.disabled ? 'disabled' : 'enabled') : 'none', stale: /Chạy lại trước khi ghim|SQL đã đổi|đã thay đổi/i.test(document.getElementById('panel').innerText) }; })()`);
    if (bar.button === 'enabled') fail(`the Result tab still offers an enabled "Ghim lên" for the previous run after the editor changed (no run since): ${S(bar)}`);
    return bar;
  });
  await step('Pin a Sandbox query to the dashboard', async () => {
    await ev(`document.querySelectorAll('dialog[open]').forEach((d) => d.close())`);
    await typeAnd("SELECT status, COUNT(*) AS n FROM shipments GROUP BY status ORDER BY status", false);
    await waitFor('the new result', `/IN_TRANSIT/.test(document.querySelector('#panel table')?.textContent ?? '')`, 30000);
    await waitFor('the Pin button', `[...document.querySelectorAll('#panel button')].some((b) => /Ghim lên/.test(b.textContent) && !b.disabled)`, 30000);
    await mustClick('#panel button', 'Ghim lên');
    const dlg = `document.querySelector('dialog[aria-labelledby="pin-dialog-title"]')`;
    await waitFor('the pin dialog', `${dlg}?.open`, 10000);
    await axe('pin dialog');
    await ev(`(() => { const d = ${dlg}; d.querySelector('input[name="pin-kind"][value="bar"]').click(); const t = d.querySelector('#pin-title'); t.value = 'E2E: lô theo trạng thái'; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(300);
    await mustClick('dialog[aria-labelledby="pin-dialog-title"] button', '^Ghim$');
    await waitFor('the card in the save', `(${SAVE}.dashboard?.cards ?? []).some((c) => c.title === 'E2E: lô theo trạng thái')`, 15000);
  });
  await step('Dashboard: card drawn, second card, move, export, import', async () => {
    await ev(`document.querySelectorAll('dialog[open]').forEach((d) => d.close())`);
    await typeAnd('SELECT COUNT(*) AS n FROM customers', false);
    await waitFor('the new result', `(t => t && !/IN_TRANSIT/.test(t.textContent) && t.querySelectorAll('tbody tr').length === 1)(document.querySelector('#panel table'))`, 30000);
    await waitFor('the Pin button', `[...document.querySelectorAll('#panel button')].some((b) => /Ghim lên/.test(b.textContent) && !b.disabled)`, 30000);
    await mustClick('#panel button', 'Ghim lên');
    await waitFor('the pin dialog', `document.querySelector('dialog[aria-labelledby="pin-dialog-title"]')?.open`, 10000);
    await ev(`(() => { const d = document.querySelector('dialog[aria-labelledby="pin-dialog-title"]'); d.querySelector('input[name="pin-kind"][value="number"]').click(); const t = d.querySelector('#pin-title'); t.value = 'E2E: số khách'; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await mustClick('dialog[aria-labelledby="pin-dialog-title"] button', '^Ghim$');
    await waitFor('two cards', `(${SAVE}.dashboard?.cards ?? []).length === 2`, 15000);
    await go('#/d/logistics/dashboard');
    await waitFor('both cards drawn', `document.querySelectorAll('#dashboard [data-card-body][data-ready]').length === 2`, 30000);
    await axe('dashboard with two cards');
    const second = (await saveNow()).dashboard.cards[1].id;
    await ev(`document.querySelector('#dashboard button[data-card="${second}"][data-act="up"]').click()`);
    await waitFor('moved up', `${SAVE}.dashboard.cards[0].id === ${S(second)}`, 10000);
    const exported = await download('Xuất thẻ', 'boondash\\.json$', () => mustClick('#dashboard button', '^Xuất thẻ'));
    const png = await download('card PNG', `\\.png$`, () => ev(`document.querySelector('#dashboard button[data-act="png"]').click()`));
    // import the exported file back: two more cards
    await send('Page.setInterceptFileChooserDialog', { enabled: true });
    const files = readdirSync(dlDir).filter((f) => f.endsWith('.boondash.json'));
    let chooser;
    const onMsg = (e) => { const m = JSON.parse(e.data); if (m.method === 'Page.fileChooserOpened') chooser = m.params; };
    ws.addEventListener('message', onMsg);
    await mustClick('#dashboard button', '^Nhập thẻ');
    await waitFor('the file chooser', 'true', 1000).catch(() => {});
    for (let i = 0; i < 30 && !chooser; i++) await sleep(100);
    ws.removeEventListener('message', onMsg);
    if (!chooser) fail('"Nhập thẻ" opened no file chooser');
    await send('DOM.setFileInputFiles', { backendNodeId: chooser.backendNodeId, files: [join(dlDir, files[0])] });
    await send('Page.setInterceptFileChooserDialog', { enabled: false });
    await waitFor('four cards', `(${SAVE}.dashboard?.cards ?? []).length === 4`, 15000);
    return { exported, png };
  }, { shotAlways: true });
  await step('Notebook: open, filter, close', async () => {
    await ev(`document.querySelectorAll('dialog[open]').forEach((d) => d.close())`);
    await ev(`document.getElementById('notebook-btn').click()`);
    await waitFor('the notebook', `document.getElementById('notebook-dialog')?.open`, 10000);
    await axe('notebook open');
    await ev(`(() => { const i = document.querySelector('#notebook-dialog input[type=search]'); i.value = 'join'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await waitFor('filtered cards', `document.querySelectorAll('#notebook-dialog article').length > 0`, 5000);
    if ((await ev(`document.getElementById('notebook-btn').getAttribute('aria-expanded')`)) !== 'true') fail('#notebook-btn aria-expanded is not true while open');
    await key('Escape', 0, 'Escape', 27);
    await waitFor('closed', `!document.getElementById('notebook-dialog').open`, 5000);
  });
  await step('⋯ export progress, then import it back', async () => {
    const before = await saveNow();
    const name = await download('Xuất tiến độ', 'progress\\.json$', async () => {
      await ev(`document.getElementById('more-btn').click()`);
      await sleep(200);
      await ev(`document.getElementById('export-btn').click()`);
    });
    const file = readdirSync(dlDir).find((f) => /progress.*\.json$/.test(f));
    await setFile('#import-input', join(dlDir, file));
    await waitFor('"Đã nhập tiến độ."', `/Đã nhập tiến độ/.test(document.getElementById('notice').textContent)`, 15000);
    const after = await saveNow();
    if (after.completed.length !== before.completed.length || after.xp !== before.xp) fail(`after import: ${after.completed.length} done / ${after.xp} xp, before ${before.completed.length} / ${before.xp}`);
    return name;
  });
  await step('#/me: skill map, badges (v24 L323, no certificate), portfolios (zip per domain, take-home md)', async () => {
    await go('#/me');
    await waitFor('the skill map with the engines', `!document.getElementById('home').hidden && !!document.querySelector('#home [data-me=skill-map] ol')`, 60000);
    await axe('#/me with the skill map and badges');
    const got = [];
    const me = await ev(`({ badges: document.querySelectorAll('#home [data-me=badges] [data-badge]').length, held: [...document.querySelectorAll('#home [data-me=badges] [data-badge][data-have=true]')].map((b) => b.dataset.badge),
      rows: document.querySelectorAll('#home [data-me=skill-map] [data-skill]').length, cert: [...document.querySelectorAll('#home button')].some((b) => /^Tải (PNG|SVG)$/.test(b.textContent.trim())) })`);
    if (me.badges !== 37) fail(`${me.badges} badges, expected 37`);
    if (me.cert) fail('a certificate button is still on #/me');
    if (!me.rows) fail('the skill map has no skill rows');
    // every promotion review of the 3 domains was passed above: their badges are held (the old certificates' rule)
    for (const dom of ['logistics', 'ecommerce', 'finance']) if (!me.held.includes(`domain-${dom}`)) fail(`badge domain-${dom} not held (${me.held.join(', ')})`);
    got.push(me);
    const pfs = await ev(`[...document.querySelectorAll('#home button')].filter((b) => /^Tải portfolio/.test(b.textContent.trim())).map((b) => b.textContent.trim())`);
    for (const label of pfs) {
      got.push(await download(label, label.includes('.md') ? 'take-home-portfolio\\.md$' : 'portfolio\\.zip$', async () => {
        await waitFor('buttons enabled', `[...document.querySelectorAll('#home button')].filter((b) => /^Tải portfolio/.test(b.textContent.trim())).every((b) => !b.disabled)`, 60000);
        await ev(`[...document.querySelectorAll('#home button')].find((b) => b.textContent.trim() === ${S(label)}).click()`);
      }, 90000));
    }
    if (pfs.length < 4) fail(`${pfs.length} portfolio buttons (${pfs.join(' | ')}), expected 3 domains + take-home`);
    return got;
  }, { shotAlways: true });
  playedSave = await ev(`localStorage.getItem('cargo-query-save')`);
};
let playedSave;


// ---- engine (L248): every Database Engine lesson in the real app, in file order. A lab types each gradable step's Solution
// and waits for its green line; a quiz/predict picks the answers; a concept (or a lesson with nothing gradable) uses its
// button. Then the NoSQL path: every drill's Solution (or answer). Each lesson is one check, so the report lists the failures.
const ENGINE_LESSONS = ['postgres', 'mongodb', 'dynamodb', 'design', 'stack', 'olap', 'timeseries', 'telemetry'].flatMap((e) => walk(`content/engine/${e}`).filter((f) => /\/L[1-5]\//.test(f)).sort().map((f) => {
  const fm = parseYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(ROOT, f), 'utf8'))[1]);
  return { ...fm, hash: `#/engine/${fm.engine}/${fm.level}/${fm.id}` };
}));
const PATH_FILES = yml('content/engine/mongodb/path/index.yml');
const PATH_DRILLS = PATH_FILES.files.flatMap((f) => yml(`content/engine/mongodb/path/${f.drills}`));
/** Same rule as src/engine/predict.ts hasRealPlan() (v23 PRED: the predict card with "Xem thật" and the plan tree). */
const realPlan = (l) => (l.engine === 'postgres' || l.engine === 'design' || l.engine === 'stack' || l.engine === 'olap' || l.engine === 'timeseries' || l.engine === 'telemetry') && l.runtime !== 'docs' && !!l.predict && (!!l.lab?.setup || !!l.predict.expect);
/** Same rule as src/engine/predict.ts readsCounters() (L296, blind-pg l3-08): "Xem thật" shows the query's rows, not a plan. */
const readsCounters = (l) => realPlan(l) && !l.predict.expect && !!l.lab?.setup && /\bpg_stat(io)?_/i.test(l.predict.sql);
/** Same rule as src/engine/predict.ts mongoRows() (v25): a MongoDB predict on a lab without `recorded` gets "Xem thật" with the real documents. */
const mongoRows = (l) => l.engine === 'mongodb' && l.runtime !== 'docs' && !!l.lab && !!l.predict && !l.predict.recorded;
/** Same rule as hasRealRun(): the predict card with "Xem thật" (a real plan, a counters question, or MongoDB's real documents). */
const realRun = (l) => realPlan(l) || mongoRows(l);
/** Same rule as src/engine/predict.ts capstonePivot() (v23 CAP): the step after which the before/after plans open. */
const readsSql = (sql) => /^\s*(\(\s*)?(select|with|explain|table|values|show)\b/i.test(String(sql).replace(/^\s*(--[^\n]*\n\s*)*/, ''));
function capstonePivot(lab) {
  const steps = lab?.steps ?? [];
  const t = steps.findIndex((s) => s.target);
  if (t >= 0) return { gate: t };
  for (let p = steps.length - 1; p >= 0; p--) {
    if (steps[p].check !== 'plan') continue;
    const change = steps.slice(0, p).map((s, i) => (readsSql(s.solution) ? -1 : i)).filter((i) => i >= 0).pop();
    return change === undefined ? undefined : { gate: change };
  }
  return undefined;
}
/** v23 PG-C lessons (L268): VACUUM size, count(*) predict, Buffers line, unused indexes, REINDEX. */
const NEW_V23 = ['e-pg-l3-16', 'e-pg-l3-17', 'e-pg-l3-18', 'e-pg-l5-16', 'e-pg-l5-17'];
/** Same rule as src/engine/labs.ts gradable(). */
const gradableStep = (l, st) => l.runtime !== 'docs' && ((l.engine === 'postgres' || l.engine === 'design' || l.engine === 'stack' || l.engine === 'olap' || l.engine === 'timeseries' || l.engine === 'telemetry') ? st.check !== 'doc' && !(st.check === 'plan' && !l.lab?.setup) : st.check === 'doc' || (l.engine === 'dynamodb' && st.check === 'catalog')); // L299
SECTIONS.engine = async () => {
  await shared();
  const counts = { lessons: 0, passed: 0, steps: 0, predicts: 0, capstones: 0, capPlans: 0, refused: 0, failedLessons: [] };
  for (const l of ENGINE_LESSONS) {
    counts.lessons++;
    const ok = await step(`engine ${l.id} (${l.kind}${l.lab ? `, ${l.lab.steps.length} steps` : ''})`, async () => {
      await go(l.hash);
      await waitFor(`${l.id} drawn`, `!!document.querySelector('#engine-page[data-lesson]')`, 60000);
      const id = l.id;
      const pick = async (part, q) => {
        await ev(`document.querySelector('[data-ek="${id}-${part}-${q.answer}"]').click()`);
        await ev(`document.querySelector('[data-ek="${id}-${part}-check"]').click()`);
        await waitFor(`${part} right`, `!!document.querySelector('[data-ek="${id}-${part}-check"]')?.parentElement.querySelector('[role=status].good')`, 5000);
      };
      for (const [i, q] of (l.quiz ?? []).entries()) await pick(`q${i}`, q);
      // v23 PRED (L278): a predict with a real plan is answered wrong first, then "Xem thật": the verdict says wrong, the
      // real plan draws (and holds `expect`), focus is on the card heading, and picking the right option then passes the part.
      if (l.predict && realRun(l)) {
        const n = l.predict.options.length;
        const wrong = (l.predict.answer + 1) % n;
        const status = `document.querySelector('[data-ek="${id}-p-check"]')?.parentElement.querySelector('[role=status]')`;
        await ev(`document.querySelector('[data-ek="${id}-p-${wrong}"]').click()`);
        await ev(`document.querySelector('[data-ek="${id}-p-check"]').click()`);
        await waitFor('the wrong verdict', `!!${status}?.classList.contains('bad')`, 5000);
        const real = readsCounters(l) || mongoRows(l) ? '[data-real-rows]' : '[data-plan]'; // v25: MongoDB's "Xem thật" = the real documents
        await waitFor('the real plan', `!!document.querySelector('${real}') || !!document.querySelector('[aria-labelledby="${id}-plan"] .error')`, 120000);
        const plan = await ev(`document.querySelector('${real}')?.textContent ?? document.querySelector('[aria-labelledby="${id}-plan"]')?.textContent`);
        if (!(await ev(`!!document.querySelector('${real}')`))) fail(`no real ${real}: ${plan}`);
        if (await ev(`document.activeElement?.getAttribute('data-ek') !== ${S(`${id}-plan`)}`)) fail('focus did not move to the result card heading');
        const x = l.predict.expect;
        if (x && (!plan.includes(x.node) || (x.index && !plan.includes(x.index)) || (x.table && !plan.includes(x.table)))) fail(`predict.expect ${S(x)} not in the real plan: ${plan}`);
        counts.predicts++;
        await ev(`document.querySelector('[data-ek="${id}-p-${l.predict.answer}"]').click()`);
        await waitFor('right after the real plan', `!!${status}?.classList.contains('good')`, 5000);
      } else if (l.predict) await pick('p', l.predict);
      const cap = l.kind === 'capstone' && !!l.lab && l.runtime !== 'docs';
      const pivot = cap && (l.engine === 'postgres' || l.engine === 'design' || l.engine === 'stack' || l.engine === 'olap' || l.engine === 'timeseries' || l.engine === 'telemetry') ? capstonePivot(l.lab) : undefined;
      if (cap && !(await ev(`!!document.querySelector('#engine-page [data-cap-bar]')`))) fail('no capstone step bar');
      for (const [i, st] of (l.lab?.steps ?? []).entries()) {
        if (!gradableStep(l, st)) continue;
        counts.steps++;
        const at = (what) => `document.querySelector('[data-ek="${id}-s${i}-${what}"]')`;
        const status = `(${at('code')})?.closest('[data-step]').querySelector('[role=status]')`;
        /** Types `code` into this step's editor, presses its Submit and waits for a new verdict; true when it passed. */
        const submit = async (code, what) => {
          await ev(`${at('open')}?.click()`); // F13 (L480): a step not reached yet has no editor until opened
          const prev = await ev(`${status}?.textContent ?? ''`);
          await ev(`(t => { t.value = ${S(String(code).trim())}; t.dispatchEvent(new Event('input', { bubbles: true })); })(${at('code')})`);
          await ev(`${at('submit')}.click()`);
          await waitFor(`step ${i + 1} graded (${what})`, `!!${status}?.textContent && !${at('submit')}.disabled && (${status}.textContent !== ${S(prev)} || ${status}.classList.contains('good'))`, 180000);
          return ev(`${status}.classList.contains('good')`);
        };
        // L299: one main Submit per lab, and it is this step's (the first gradable step not passed)
        if (await ev(`[...document.querySelectorAll('#engine-page [data-ek$="-submit"].bg-accent')].map((b) => b.dataset.ek).join()`) !== `${id}-s${i}-submit`) fail(`step ${i + 1}: the main Submit is not this step's alone`);
        // v25–v27 step kinds: a bar (MongoDB `rule:`, DynamoDB/Postgres `perf:`) names itself above the editor and refuses its
        // `slow:` answer; a "mong lỗi" step (`error:`) refuses a command that runs; a Postgres `after:` step refuses doing nothing.
        // the line comes from the lazy engineNosql chunk, so it may draw a moment after the step
        if (st.rule || st.error || (st.perf && l.engine !== 'postgres')) await waitFor(`step ${i + 1}: the rule/cost/error line above the editor`, `!!(${at('code')})?.closest('[data-step]').querySelector('[data-rule]')`, 30000);
        const other = l.lab.steps.find((x) => !x.error && x !== st)?.solution;
        const decoy = st.slow ? ['slow', st.slow] : st.error && other ? ['a command that runs', other] : st.after ? ['doing nothing', 'SELECT 1'] : undefined;
        if (decoy) {
          if (await submit(decoy[1], decoy[0])) fail(`step ${i + 1}: ${decoy[0]} was accepted`);
          counts.refused++;
        }
        if (!(await submit(st.solution, 'Solution'))) fail(`step ${i + 1}: ${await ev(`${status}.textContent`)} | ${await ev(`(${at('code')})?.closest('[data-step]').querySelector('.error, pre.error')?.textContent ?? ''`)}`);
        if (cap) {
          // v23 CAP (L278): the bar marks the step passed and moves on; at the pivot the before/after plans open
          const bar = `document.querySelectorAll('#engine-page [data-cap-bar] li')`;
          await waitFor(`bar step ${i + 1} passed`, `!!${bar}[${i}]?.querySelector('.bg-good')`, 5000);
          // current = the first gradable step not passed (src/ui/engineCapstone.ts currentStep); passed = the gradable steps up to i.
          // After the last gradable step the lesson is done and every gradable step counts as passed: none is current.
          const last = !l.lab.steps.some((x, j) => j > i && gradableStep(l, x));
          const next = last ? -1 : l.lab.steps.findIndex((x, j) => j > i && gradableStep(l, x));
          if (next >= 0 && !(await ev(`${bar}[${next}]?.getAttribute('aria-current') === 'step'`))) fail(`bar: step ${next + 1} is not current after step ${i + 1}`);
          if (last) await waitFor('no step current once the capstone is done', `![...${bar}].some((li) => li.getAttribute('aria-current') === 'step')`, 10000);
          // L278: a step the browser cannot grade (DynamoDB `catalog`) is never drawn passed, not even once the capstone is done
          if (await ev(`[...${bar}].some((li) => li.hasAttribute('data-ungraded') && !!li.querySelector('.bg-good'))`)) fail('an ungraded step shows as passed in the bar');
          if (pivot && pivot.gate === i) {
            await ev(`document.querySelector('[data-ek="${id}-plans"]').click()`);
            await waitFor('before/after plans', `!!document.querySelector('#engine-page [data-cap-plans]') || !!document.querySelector('[aria-labelledby="${id}-plans"] .error')`, 120000);
            if (!(await ev(`!!document.querySelector('#engine-page [data-cap-plans]')`))) fail(`plans: ${await ev(`document.querySelector('[aria-labelledby="${id}-plans"]').textContent`)}`);
            if (await ev(`document.querySelectorAll('#engine-page [data-cap-plans] [data-plan]').length`) !== 2) fail('the capstone plans are not two trees');
            counts.capPlans++;
          }
        }
      }
      const btn = `document.querySelector('[data-ek="${id}-done"]')`;
      if (await ev(`!!${btn}`)) await ev(`${btn}.click()`);
      await waitFor('the lesson in save.completed', `${completed}.includes(${S(id)})`, 10000);
      if (cap) {
        await waitFor('the capstone finish', `!!document.querySelector('#engine-page [data-cap-done]')`, 10000);
        counts.capstones++;
      }
    });
    if (ok) counts.passed++;
    else counts.failedLessons.push(l.id);
  }
  await step(`engine: ${counts.passed}/${counts.lessons} lessons passed (${counts.steps} lab steps, ${counts.predicts} real plans, ${counts.capstones} capstones, ${counts.capPlans} before/after, ${counts.refused} slow/decoy answers refused)`, () => {
    if (counts.failedLessons.length) fail(`failed: ${counts.failedLessons.join(', ')}`);
    return counts;
  });
  // v23 PG-C (L268): the new lessons are walked like every other one; this line names them so a missing file shows.
  await step(`engine: v23 lessons ${NEW_V23.join(', ')}`, () => {
    const absent = NEW_V23.filter((x) => !ENGINE_LESSONS.some((l) => l.id === x));
    const bad = NEW_V23.filter((x) => counts.failedLessons.includes(x));
    if (absent.length || bad.length) fail(`absent: ${absent.join(', ') || '-'}; failed: ${bad.join(', ') || '-'}`);
  });
  // NoSQL path: every drill
  const slug = (sk) => sk.replace(/^mg\./, '').replace(/_/g, '-');
  let open = '';
  const failedDrills = [];
  for (const dr of PATH_DRILLS) {
    const ok = await step(`path ${dr.id}`, async () => {
      if (open !== dr.skill) {
        await go(`#/engine/mongodb/path/${slug(dr.skill)}`);
        await waitFor('the skill page', `!!document.querySelector('#engine-page [data-drill="${dr.id}"]')`, 60000);
        open = dr.skill;
      }
      if (dr.format === 'choice') await ev(`document.querySelector('[data-ek="${dr.id}-${dr.answer}"]').click()`);
      else await ev(`(t => { t.value = ${S(String(dr.solution).trim())}; t.dispatchEvent(new Event('input', { bubbles: true })); })(document.querySelector('[data-ek="${dr.id}-code"]'))`);
      await ev(`document.querySelector('[data-ek="${dr.id}-submit"]').click()`);
      const status = `document.querySelector('[data-drill="${dr.id}"] [role=status]')`;
      await waitFor('graded', `!!${status}?.textContent && !document.querySelector('[data-ek="${dr.id}-submit"]').disabled`, 60000);
      if (!(await ev(`${status}.classList.contains('good')`))) fail(await ev(`${status}.textContent`));
    });
    if (!ok) failedDrills.push(dr.id);
  }
  await step(`engine path: ${PATH_DRILLS.length - failedDrills.length}/${PATH_DRILLS.length} drills passed`, () => {
    if (failedDrills.length) fail(`failed: ${failedDrills.join(', ')}`);
  });
};

// ---- best (v24 BP-UI, L346): the Best Practice area. Every released card: "Run both" gives the card's verdict (never the
// "odd" line) and the check's right answers complete it (+5 XP each); the gallery, filters, the quick check, Boon's tip switch,
// and Boon's tip in the Sandbox → "Vì sao?" → the card. BEST_SHOTS=<dir>: 1280 light / 1024 light / 375 dark / 320 light pictures.
const BEST_CARDS = ['sql', 'postgres', 'mongodb', 'dynamodb'].flatMap((t) => walk(`content/engine/best/${t}`).sort().map((f) =>
  parseYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(ROOT, f), 'utf8'))[1])));
SECTIONS.best = async () => {
  await shared();
  await step('best: #/engine has the Best Practice row; #/engine/best opens the SQL track', async () => {
    await go('#/engine');
    await waitFor('the Best Practice row', `!!document.querySelector('#engine-page a[href="#/engine/best"]')`, 60000);
    await ev(`document.querySelector('#engine-page a[href="#/engine/best"]').click()`);
    await waitFor('the SQL grid', `location.hash === '#/engine/best/sql' && !!document.querySelector('#engine-page[data-track="sql"]')`, 30000);
    const n = await ev(`document.querySelectorAll('#engine-page [data-card]').length`);
    const g = await ev(`document.querySelectorAll('#bp-gallery ~ ol a').length`);
    if (n !== 30 || g < 8) fail(`${n} cards (want 30), ${g} gallery tiles (want ≥ 8)`);
    await ev(`document.querySelector('[data-ek="bp-f-a"]').click()`);
    await sleep(200);
    const a = await ev(`document.querySelectorAll('#engine-page [data-card]').length`);
    await ev(`document.querySelector('[data-ek="bp-f-a"]').click()`);
    if (a !== BEST_CARDS.filter((c) => c.module === 'a').length) fail(`filter A shows ${a}`);
  });
  // v29: the MongoDB and DynamoDB tracks (cards run their pairs on mingo / dynoxide): each tab opens its own grid with every card
  for (const t of ['mongodb', 'dynamodb']) {
    await step(`best: #/engine/best/${t} lists its ${BEST_CARDS.filter((c) => c.track === t).length} cards`, async () => {
      await go(`#/engine/best/${t}`);
      await waitFor(`the ${t} grid`, `!!document.querySelector('#engine-page[data-track="${t}"]')`, 60000);
      const want = BEST_CARDS.filter((c) => c.track === t).length;
      // the track's index is its own lazy chunk: wait for the grid to fill, then compare
      await waitFor(`${want} cards`, `document.querySelectorAll('#engine-page [data-card]').length >= ${want}`, 30000).catch(() => {});
      const n = await ev(`document.querySelectorAll('#engine-page [data-card]').length`);
      if (n !== want) fail(`${n} cards, want ${want}`);
    });
  }
  const xp0 = (await saveNow()).xp ?? 0;
  const failed = [];
  const verdicts = {};
  for (const c of BEST_CARDS) {
    const ok = await step(`best ${c.id} (${c.pair.runtime}/${c.pair.check})`, async () => {
      await go(`#/engine/best/${c.track}/${c.id}`);
      await waitFor(`${c.id} drawn`, `!!document.querySelector('#engine-page[data-card="${c.id}"]')`, 60000);
      let verdict = 'syntax';
      if (c.pair.runtime !== 'none') {
        await ev(`document.querySelector('[data-ek="bp-run"]').click()`);
        await waitFor('the verdict', `!!document.querySelector('#engine-page [data-verdict]')`, 120000);
        verdict = await ev(`document.querySelector('#engine-page [data-verdict]').dataset.verdict`);
        if (verdict === 'odd') fail(`Run both: ${await ev(`document.querySelector('#engine-page [data-verdict]').textContent`)}`);
      }
      for (const [i, q] of c.quiz.entries()) {
        await ev(`document.querySelector('[data-ek="${c.id}-q${i}-${q.answer}"]').click()`);
        await ev(`document.querySelector('[data-ek="${c.id}-q${i}-check"]').click()`);
        await sleep(100);
      }
      await waitFor('completed', `${completed}.includes(${S(c.id)})`, 10000);
      verdicts[c.pair.runtime] = (verdicts[c.pair.runtime] ?? 0) + 1;
      return verdict;
    });
    if (!ok) failed.push(c.id);
  }
  await step(`best: ${BEST_CARDS.length - failed.length}/${BEST_CARDS.length} cards passed, +5 XP each`, async () => {
    if (failed.length) fail(`failed: ${failed.join(', ')}`);
    if (!verdicts.mingo || !verdicts.dynoxide) fail(`no MongoDB or DynamoDB pair ran: ${S(verdicts)}`);
    const xp = (await saveNow()).xp - xp0;
    if (xp !== 5 * BEST_CARDS.length) fail(`XP +${xp}, want +${5 * BEST_CARDS.length}`);
  });
  await step('best: quick check draws 5 questions from finished cards; the tip switch writes the pref', async () => {
    await go('#/engine/best/postgres');
    await waitFor('the PostgreSQL grid', `!!document.querySelector('#engine-page[data-track="postgres"]')`, 30000);
    await ev(`document.querySelector('[data-ek="bp-quick"]').click()`);
    await waitFor('5 questions', `document.querySelectorAll('#engine-page [data-q^="bpq-"]').length === 5`, 30000);
    await ev(`document.querySelector('[data-ek="bp-tips"]').click()`);
    await sleep(200);
    if ((await ev(`JSON.parse(localStorage.getItem('cargo-query/bp-tips') || '{}').off`)) !== true) fail('switch off did not write off: true');
    await ev(`document.querySelector('[data-ek="bp-tips"]').click()`);
    await sleep(200);
    if ((await ev(`JSON.parse(localStorage.getItem('cargo-query/bp-tips') || '{}').off`)) !== false) fail('switch on did not write off: false');
  });
  await step('best: Boon tip in the Sandbox (Q01: a beginner hears it too) → "Vì sao?" opens the card', async () => {
    await enterSandbox('logistics');
    await typeAnd('SELECT count(*) AS ports FROM ports WHERE region = NULL', false);
    await waitFor('the tip', `!!document.querySelector('#work a[href="#/engine/best/sql/e-bp-q01"]')`, 90000);
    await ev(`document.querySelector('#work a[href="#/engine/best/sql/e-bp-q01"]').click()`);
    await waitFor('the Q01 card', `!!document.querySelector('#engine-page[data-card="e-bp-q01"]')`, 60000);
  });
  if (process.env.BEST_SHOTS) {
    mkdirSync(process.env.BEST_SHOTS, { recursive: true });
    for (const [w, h, theme] of [[1280, 800, 'light'], [1024, 700, 'light'], [375, 740, 'dark'], [320, 640, 'light']]) {
      for (const [hash, name] of [['#/engine/best/sql', 'sql'], ['#/engine/best/sql/e-bp-q02', 'q02']]) {
        await step(`best shot ${name} ${w} ${theme}`, async () => {
          await size(w, h);
          await ev(`localStorage.setItem('cargo-query/prefs', JSON.stringify({ ...JSON.parse(localStorage.getItem('cargo-query/prefs') || '{}'), theme: ${S(theme)} }))`);
          await load(hash);
          await waitFor('drawn', `!!document.getElementById('engine-page') && document.documentElement.dataset.theme === ${S(theme)}`, 60000);
          if (name === 'q02') {
            await ev(`document.querySelector('[data-ek="bp-run"]').click()`);
            await waitFor('the verdict', `!!document.querySelector('#engine-page [data-verdict]')`, 120000);
          }
          await sleep(500);
          const sw = await ev('document.documentElement.scrollWidth');
          if (w <= 375 && sw > w) fail(`horizontal scroll ${sw} > ${w}`);
          const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: await ev('document.documentElement.scrollHeight'), scale: 1 } });
          writeFileSync(join(process.env.BEST_SHOTS, `${name}-${w}-${theme}.png`), Buffer.from(r.data, 'base64'));
          return axe(`best ${name} ${w} ${theme}`);
        });
      }
    }
    await size(1280, 800);
  }
};

// ---------------------------------------------------------------- the run
const ORDER = ['general', 'logistics', 'ecommerce', 'finance', 'tools', 'engine', 'best', 'screens', 'reload', 'history', 'offline'];
try {
  base = await startPreview();
  for (const name of ORDER) {
    if (ONLY.size && !ONLY.has(name)) continue;
    if (['screens', 'reload', 'history', 'offline'].includes(name) && sharedUp) { await closeBrowser(); sharedUp = false; }
    section = name;
    await SECTIONS[name]().catch(async (e) => {
      findings.push({ section, name: 'section aborted', route: await ev('location.hash').catch(() => '?'), error: String(e?.message ?? e).slice(0, 600), shot: await shot('abort').catch(() => ''), console: [] });
      console.log(`ABORT [${section}] ${e?.message ?? e}`);
    });
    const errs = pageErrors.filter((e) => e.section === name && !(name === 'offline' && /ERR_INTERNET_DISCONNECTED|Failed to fetch|NetworkError|net::/i.test(e.text)));
    if (errs.length) {
      const uniq = [...new Set(errs.map((e) => e.text.split('\n')[0]))];
      findings.push({ section: name, name: `page errors (${errs.length})`, route: '', error: uniq.slice(0, 8).join(' | ').slice(0, 900), shot: '', console: uniq.slice(0, 20) });
      console.log(`FAIL [${name}] ${errs.length} page error(s): ${uniq[0].slice(0, 200)}`);
    }
    if (!sharedUp) await closeBrowser();
  }
  for (const i of axeIssues.values()) if (i.impact === 'serious' || i.impact === 'critical') {
    findings.push({ section: 'axe', name: `axe ${i.rule} (${i.impact}) on ${i.target}`, route: i.screens[0], error: `${i.help}; ${i.why}`.slice(0, 600), shot: '', console: [], screens: i.screens });
  }
} catch (e) {
  findings.push({ section: 'run', name: 'run', route: '', error: String(e?.message ?? e), shot: '', console: [] });
  console.log(`FAIL run: ${e?.message ?? e}`);
} finally {
  await closeBrowser();
  for (const c of owned) stop(c);
}

const report = { ok: findings.length === 0, base, browser: BROWSER, ms: Date.now() - T0, at: new Date().toISOString(),
  counts: { checks: results.length, passed: results.filter((r) => r.ok).length, findings: findings.length }, findings, pageErrors, downloads, results };
writeFileSync(join(OUT, 'axe-report.json'), JSON.stringify({ issues: [...axeIssues.values()], screens: axeAll }, null, 1));
writeFileSync(join(OUT, 'e2e-report.json'), JSON.stringify(report, null, 1));
console.log(`${findings.length ? 'E2E: ' + findings.length + ' finding(s)' : 'E2E OK'} in ${(report.ms / 1000).toFixed(0)} s; ${report.counts.passed}/${report.counts.checks} checks; report: ${join(OUT, 'e2e-report.json')}`);
process.exit(findings.length ? 1 : 0);
