// UI/UX audit after a deploy (QA v22; docs/team/ux-deploy-checklist.md §1 matrix, §3 automatic items). No dependency:
// Chrome DevTools Protocol over Node's WebSocket, launched like scripts/smoke.mjs (fresh temp profile, removed after).
//
//   npm run build && npm run ux-audit                  # starts its own `vite preview` on 5235 (never 5173/5174), stops it after
//   UX_URL=https://khoadautay.github.io/data-training-platform/ npm run ux-audit   # read-only on the live site
//
// BROWSER = path or command of Chrome/Edge (as smoke). UX_PORT overrides 5235. UX_SHOTS=0 skips screenshots.
// UX_PAGES=#/,#/d/finance limits the page matrix (a quick re-check; the top bar pass always runs).
// State: tests/fixtures/save-v5.json, tour done, guides off; storage cleared between configs; service worker bypassed.
// Matrix: every page of PAGES at 1280×800 light, 1024×700 light, 375×740 dark, 320×640 light (VI); the top bar at
// 1024/1280/1366/1440/1600/1920 in VI and EN. Checks (checklist item in brackets):
//   contrast   text < 4.5:1 (big text < 3:1), colours resolved through a canvas, alpha composited [F1]
//   clipped    text cut by overflow hidden/ellipsis/line-clamp without a title or aria-label [E1]
//   target     a control < 24×24 px (inline links in text excepted) [I3]
//   overflow   horizontal scroll, or a box wider than the viewport outside a scroll area [I2, E4]
//   overlap    a control whose centre is hit by another element [B1]
//   popover    the domain menu / ⋯ menu not under its trigger or not inside the viewport [A1]
//   topbar     header taller than one row, or a cut/overlapping item in #status, 1024–1440 VI+EN [E2]
//   bottomnav  #bottom-nav ≥ 72 px at 320/375 [I1]
//   heading    page h1 not larger than every h2 [H1]
//   load       the page did not draw (an engine page on a build without #/engine is "skipped", not a finding)
// Writes smoke-out/ux-audit.json (+ smoke-out/ux-audit/*.png); exits 1 when a serious finding is left.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'smoke-out');
const SHOTS = join(OUT, 'ux-audit');
const PORT = Number(process.env.UX_PORT) || 5235;
const T0 = Date.now();
const BROWSER = process.env.BROWSER || ({
  win32: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
}[process.platform] ?? 'google-chrome');
const URL_ARG = process.argv[2] || process.env.UX_URL || '';
const WANT_SHOTS = process.env.UX_SHOTS !== '0';

const CONFIGS = [
  { w: 1280, h: 800, theme: 'light' },
  { w: 1024, h: 700, theme: 'light' },
  { w: 375, h: 740, theme: 'dark' },
  { w: 320, h: 640, theme: 'light' },
];
const ALL_PAGES = ['#/', '#/learn', '#/learn/sql/1', '#/learn/skill/select', '#/learn/interview', '#/practice', '#/me',
  ...['logistics', 'ecommerce', 'finance'].flatMap((d) => ['', '/play', '/data', '/dashboard', '/map'].map((p) => `#/d/${d}${p}`)),
  '#/engine', '#/engine/postgres', '#/engine/mongodb/path', '#/engine/dynamodb/L1/e-dy-l1-09'];
const PAGES = process.env.UX_PAGES ? process.env.UX_PAGES.split(',') : ALL_PAGES;
const TOPBAR_PAGES = ['#/d/finance', '#/d/logistics/play', '#/learn'];
const mainOf = (hash) => (/\/play$/.test(hash) ? 'shell' : /\/data$/.test(hash) ? 'data' : /\/dashboard$/.test(hash) ? 'dashboard' : 'home');
const routeOf = (hash) => {
  const d = /^#\/d\/\w+(\/(\w+))?/.exec(hash);
  if (d) return d[2] ?? 'overview';
  return /^#\/(\w+)/.exec(hash)?.[1] ?? 'home';
};
const SEVERITY = { contrast: 'serious', clipped: 'serious', overflow: 'serious', overlap: 'serious', popover: 'serious',
  topbar: 'serious', bottomnav: 'serious', load: 'serious', target: 'moderate', wide: 'moderate', heading: 'moderate' };

// ---- processes this script owns (stopped by PID)
const owned = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg) => { throw new Error(msg); };
function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}
async function startPreview() {
  if (!existsSync(join(ROOT, 'dist/index.html'))) fail('dist/ is missing: run `npm run build` first (or set UX_URL)');
  if (await fetch(`http://127.0.0.1:${PORT}/`).then(() => true, () => false)) fail(`port ${PORT} is already in use; not touching a server this script did not start`);
  const child = spawn(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  owned.push(child);
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) fail(`vite preview exited (${child.exitCode})`);
    if (await fetch(`http://127.0.0.1:${PORT}/`).then((r) => r.ok, () => false)) return `http://127.0.0.1:${PORT}/`;
    await sleep(200);
  }
  fail('vite preview did not answer in 20 s');
}

// ---- CDP
let ws, browserWs, browserChild, profile;
let cdpId = 0;
const pending = new Map();
const pageErrors = [];
async function startBrowser() {
  profile = mkdtempSync(join(tmpdir(), 'boondata-ux-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--mute-audio', 'about:blank'];
  if (process.env.CI) args.unshift('--no-sandbox');
  browserChild = spawn(BROWSER, args, { stdio: 'ignore' });
  owned.push(browserChild);
  browserChild.on('error', () => {});
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    if (browserChild.exitCode !== null) fail(`browser exited (${browserChild.exitCode}): ${BROWSER}`);
    try {
      const [p, path] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n');
      port = Number(p);
      browserWs = `ws://127.0.0.1:${port}${path.trim()}`;
    } catch { await sleep(200); }
  }
  if (!port) fail(`browser did not open DevTools in 30 s: ${BROWSER}`);
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    page = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json(), () => []).then((l) => l.find((t) => t.type === 'page'));
    if (!page) await sleep(200);
  }
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') pageErrors.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text ?? '').slice(0, 300));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setBypassServiceWorker', { bypass: true }); // v21: a service worker carries old state between runs
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++cdpId;
  const timer = setTimeout(() => reject(new Error(`CDP ${method} timed out`)), 60000);
  pending.set(i, (m) => { clearTimeout(timer); m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
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
  stop(browserChild);
  try { if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}
const S = JSON.stringify;
const size = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
const media = (theme) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
const settle = () => ev(`Promise.race([Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime)).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]).then(() => true)`);

const FIXTURE = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/save-v5.json'), 'utf8'));
/** Clears storage and writes the fixture state before the app's first script runs on the next document (as smoke's V22-C). */
let resetScript;
async function reset(base, theme, lang) {
  const state = { 'cargo-query-save': FIXTURE, 'cargo-query/tour': { step: 99, knows: true }, 'cargo-query/coach-done': true,
    'cargo-query/guides': { seen: [], off: true }, 'cargo-query/prefs': { lang, theme }, 'cargo-query/domain': 'logistics' };
  const token = `ux-${Date.now()}`;
  if (resetScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: resetScript });
  resetScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol.startsWith('http') && !sessionStorage.getItem('${token}')) {
    localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('${token}', '1'); indexedDB.deleteDatabase('cargo-query');
    for (const [k, v] of Object.entries(${S(state)})) localStorage.setItem(k, JSON.stringify(v)); }` })).identifier;
  await send('Page.navigate', { url: 'about:blank' });
  await waitFor('about:blank', `location.href === 'about:blank'`, 10000);
}
/** Opens `hash` and waits until its <main> shows an h1 and #notice is closed; 'skipped' when the build has no such route. */
async function open(base, hash) {
  await send('Page.navigate', { url: base + hash });
  const main = mainOf(hash);
  try { await waitFor(`route ${routeOf(hash)}`, `location.hash.startsWith(${S(hash)}) && document.body.dataset.route === ${S(routeOf(hash))}`, 10000); } catch (e) {
    if (!hash.startsWith('#/engine')) throw e;
    return `skipped: the build shows ${await ev('location.hash + " as route " + document.body.dataset.route')}`;
  }
  await waitFor(`<main id="${main}"> with an h1`, `(m => m && !m.hidden && !!m.querySelector('h1'))(document.getElementById(${S(main)}))`, 45000);
  await waitFor('#notice closed', `document.getElementById('notice').hidden`, 90000);
  if (/^#\/engine\/\w+\/(L\d|path\/)/.test(hash)) await waitFor('#engine-page (the drawn lesson)', `!!document.getElementById('engine-page')`, 60000);
  await settle().catch(() => {});
  await sleep(300);
  return 'ok';
}

// ---- in-page checks (one expression; returns the findings of the shown page)
const AUDIT = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data;
    const a = (/(?:rgba|hsla|oklch|oklab|lab|lch|color)\\([^)]*\\/\\s*([\\d.]+%?)/.exec(c) || /rgba\\([^,]+,[^,]+,[^,]+,\\s*([\\d.]+)/.exec(c));
    let al = a ? (a[1].endsWith('%') ? parseFloat(a[1]) / 100 : parseFloat(a[1])) : 1; if (c === 'transparent') al = 0; return [d[0], d[1], d[2], al]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const opacity = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && el.closest('[hidden]') === null && el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) !== false; };
  // background behind el: null when an image (not a gradient over a colour) is under it
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') return null; const c = rgba(s.backgroundColor); if (c[3] > 0) { stack.push(c); if (c[3] >= 0.99) break; } }
    stack.push(rgba(getComputedStyle(document.body).backgroundColor)); let out = stack.pop(); while (stack.length) { const c = stack.pop(); out = [0,1,2].map((i) => c[i] * c[3] + out[i] * (1 - c[3])); } return out; };
  const short = (el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || el.title || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
  const path = (el) => { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList[0] && !/[:[]/.test(e.classList[0]) ? '.' + e.classList[0] : '')); return p.join('>'); };
  const modal = [...document.querySelectorAll('dialog[open]')].find((d) => d.matches(':modal'));
  const scope = modal ?? document.body;
  const vw = innerWidth, vh = innerHeight;
  const out = { contrast: [], clipped: [], target: [], wide: [], overlap: [] };
  const seen = new Set();
  const CONTROL = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link]';
  for (const el of scope.querySelectorAll('*')) {
    if (el.closest('svg, .cm-editor, .sr-only, [aria-hidden=true]') || ['SCRIPT','STYLE','OPTION','svg','TEMPLATE'].includes(el.tagName) || !vis(el)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    // F1 contrast
    if (own && opacity(el) > 0.05) {
      const fg = rgba(s.color), bg = bgOf(el);
      if (bg) { const f = [0,1,2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])); const k = ratio(f, bg);
        const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
        if (k < (big ? 3 : 4.5) && !el.closest(':disabled, [aria-disabled=true], [inert]')) { const key = short(el) + k.toFixed(1);
          if (!seen.has(key)) { seen.add(key); out.contrast.push({ text: short(el), ratio: +k.toFixed(2), fg: s.color, at: path(el), size: s.fontSize }); } } }
    }
    // E1 clipped (only text that really is cut; a title or aria-label on it or its control means intended)
    if (own && el.clientWidth > 2) {
      const cutX = el.scrollWidth > el.clientWidth + 1 && (s.textOverflow === 'ellipsis' || /hidden|clip/.test(s.overflowX));
      const cutY = s.webkitLineClamp !== 'none' && s.webkitLineClamp && el.scrollHeight > el.clientHeight + 1;
      if (cutX || cutY) { const c = el.closest(CONTROL); const named = el.matches('[title], [aria-label]') || (c && c.matches('[title], [aria-label]')); out.clipped.push({ text: short(el), sw: el.scrollWidth, cw: el.clientWidth, at: path(el), titled: !!named }); }
    }
    // I3 targets (inline links inside running text are excepted, as in WCAG 2.5.8)
    if (el.matches(CONTROL) && r.width > 2 && (r.width < 24 || r.height < 24) && !(el.tagName === 'A' && s.display === 'inline' && el.closest('p, li, td, dd'))
      && !el.matches('input[type=radio], input[type=checkbox]') ) out.target.push({ text: short(el), w: Math.round(r.width), h: Math.round(r.height), at: path(el) });
    // E4 wider than the viewport outside a scroll area
    if (r.right > vw + 1 && s.position !== 'fixed') { let sc = false; for (let e = el.parentElement; e; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (/auto|scroll|hidden|clip/.test(o) && e !== document.body && e !== document.documentElement) { sc = true; break; } }
      if (!sc) out.wide.push({ text: short(el), right: Math.round(r.right), at: path(el) }); }
    // B1 overlap: a control fully in the viewport and inside every clipping ancestor must be hit at its centre by itself
    if (el.matches(CONTROL) && r.width >= 8 && r.height >= 8 && r.left >= 0 && r.top >= 0 && r.right <= vw && r.bottom <= vh && s.pointerEvents !== 'none') {
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      let inside = true; for (let e = el.parentElement; e && inside; e = e.parentElement) { if (/auto|scroll|hidden|clip/.test(getComputedStyle(e).overflow)) { const b = e.getBoundingClientRect(); if (x < b.left || x > b.right || y < b.top || y > b.bottom) inside = false; } }
      const hit = inside && document.elementFromPoint(x, y);
      const pinned = (n) => { for (let e = n; e; e = e.parentElement) if (/fixed|sticky/.test(getComputedStyle(e).position)) return e; return null; };
      const bar = hit && pinned(hit);
      if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !(hit.closest('label')?.control === el) && !(bar && !bar.contains(el))) {
        const by = hit.closest(CONTROL) ?? hit; out.overlap.push({ text: short(el), at: path(el), by: path(by), byText: short(by) }); }
    }
  }
  const h1 = document.querySelector('main:not([hidden]) h1:not(.sr-only)');
  const h2 = [...document.querySelectorAll('main:not([hidden]) h2')].filter(vis).map((e) => parseFloat(getComputedStyle(e).fontSize));
  const bn = document.getElementById('bottom-nav'); const bnr = bn && vis(bn) ? bn.getBoundingClientRect() : null;
  return { ...out, modal: !!modal,
    hscroll: Math.max(document.documentElement.scrollWidth, innerWidth) > __W__ ? document.documentElement.scrollWidth : 0,
    heading: h1 && h2.length && parseFloat(getComputedStyle(h1).fontSize) <= Math.max(...h2) ? { h1: getComputedStyle(h1).fontSize, h2: Math.max(...h2) } : null,
    bottom: bnr ? Math.round(bnr.height) : null, theme: document.documentElement.dataset.theme };
})()`;

// A1: open a popover from its trigger and compare the boxes.
const ANCHOR = (btn, menu) => `(async () => {
  const b = document.getElementById(${S(btn)}), m = document.getElementById(${S(menu)});
  if (!b || !m || !b.offsetParent) return null;
  b.click(); await new Promise((r) => setTimeout(r, 250));
  if (!m.matches(':popover-open')) return { open: false };
  const br = b.getBoundingClientRect(), mr = m.getBoundingClientRect();
  m.hidePopover(); await new Promise((r) => setTimeout(r, 100));
  const gap = Math.round(mr.top - br.bottom);
  const edge = Math.min(Math.abs(mr.left - br.left), Math.abs(mr.right - br.right));
  const clamped = (mr.left <= 9 && br.left < mr.left + 8) || (mr.right >= innerWidth - 9);
  const overlapsX = mr.left < br.right && mr.right > br.left;
  const inView = mr.left >= 0 && mr.right <= innerWidth + 0.5 && mr.top >= 0 && mr.bottom <= innerHeight + 0.5;
  const ok = gap >= 2 && gap <= 14 && overlapsX && (edge <= 8 || clamped) && inView;
  return { open: true, ok, gap, edge: Math.round(edge), inView, btn: [br.left, br.top, br.right, br.bottom].map(Math.round), menu: [mr.left, mr.top, mr.right, mr.bottom].map(Math.round) };
})()`;

// E2: the top bar is one row and nothing in #status is cut or overlaps its neighbour (the smoke's CHROME, plus the row height).
const TOPBAR = `(() => {
  const shown = (e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const header = document.querySelector('header');
  const cut = [...document.querySelectorAll('#status *, #domain-btn *')].filter((e) => shown(e) && e.clientWidth > 2 && !e.matches('[data-badge]') && e.scrollWidth > e.clientWidth + 1).map((e) => 'cut ' + (e.id || e.textContent.trim().slice(0, 20)));
  const row = [...header.children].filter(shown).map((e) => [e.id || e.className.toString().split(' ')[0], e.getBoundingClientRect()]);
  for (let i = 1; i < row.length; i++) if (row[i][1].left < row[i - 1][1].right - 1 && row[i][1].top < row[i - 1][1].bottom - 1) cut.push('overlap ' + row[i - 1][0] + '|' + row[i][0]);
  const tops = row.map(([, r]) => r.top + r.height / 2); const spread = Math.max(...tops) - Math.min(...tops);
  if (spread > 8) cut.push('two rows (centres ' + Math.round(spread) + ' px apart)');
  const over = Math.round(Math.max(0, ...[...header.querySelectorAll('*')].filter((e) => shown(e) && !e.closest('[popover], .sr-only')).map((e) => e.getBoundingClientRect().right)) - innerWidth);
  if (over > 1) cut.push('off screen by ' + over + ' px');
  const h = Math.round(header.getBoundingClientRect().height); if (h > 60) cut.push('header ' + h + ' px tall');
  return { cut, height: h };
})()`;

// ---- run
const findings = [];
const skipped = [];
const visits = [];
const add = (check, page, config, detail) => findings.push({ check, severity: SEVERITY[check], page, config, ...detail });
let base = '';
let crashed;
try {
  base = URL_ARG ? (URL_ARG.endsWith('/') ? URL_ARG : URL_ARG + '/') : await startPreview();
  mkdirSync(SHOTS, { recursive: true });
  await startBrowser();
  for (const c of CONFIGS) {
    const config = `${c.w} ${c.theme}`;
    await size(c.w, c.h);
    await media(c.theme);
    await reset(base, c.theme, 'vi');
    for (const hash of PAGES) {
      const t = Date.now();
      let state;
      try { state = await open(base, hash); } catch (e) { add('load', hash, config, { error: String(e.message ?? e) }); continue; }
      if (state !== 'ok') { skipped.push({ page: hash, config, why: state }); continue; }
      try {
        const a = await ev(AUDIT.replace('__W__', String(c.w)));
        for (const k of ['contrast', 'target', 'wide', 'overlap']) for (const d of a[k]) add(k, hash, config, d);
        for (const d of a.clipped) if (!d.titled) add('clipped', hash, config, d);
        if (a.hscroll) add('overflow', hash, config, { scrollWidth: a.hscroll, width: c.w });
        if (a.heading) add('heading', hash, config, a.heading);
        if (c.w <= 375 && a.bottom !== null && a.bottom >= 72) add('bottomnav', hash, config, { height: a.bottom });
        if (a.theme !== c.theme) add('load', hash, config, { error: `<html data-theme> is ${a.theme}` });
        // A1 once per config, on the first domain page (the chip sits after the nav links there)
        if (hash === '#/d/logistics') for (const [btn, menu] of [['domain-btn', 'domain-menu'], ['more-btn', 'more-menu']]) {
          const m = await ev(ANCHOR(btn, menu));
          if (m && (!m.open || !m.ok)) add('popover', hash, config, { trigger: `#${btn}`, menu: `#${menu}`, ...m });
        }
        if (WANT_SHOTS) {
          const r = await send('Page.captureScreenshot', { format: 'png' });
          writeFileSync(join(SHOTS, `${c.theme}-${c.w}-${hash.replace(/^#\/?/, '').replace(/\//g, '_') || 'home'}.png`), Buffer.from(r.data, 'base64'));
        }
        visits.push({ page: hash, config, ms: Date.now() - t });
      } catch (e) { add('load', hash, config, { error: `audit: ${e.message ?? e}` }); }
    }
  }
  // E2: the top bar at 1024–1440, VI and EN
  await media('light');
  for (const lang of ['vi', 'en']) {
    await reset(base, 'light', lang);
    for (const w of [1024, 1280, 1366, 1440, 1600, 1920]) {
      await size(w, 800);
      for (const hash of TOPBAR_PAGES) {
        try { if ((await open(base, hash)) !== 'ok') continue; } catch (e) { add('load', hash, `${w} ${lang}`, { error: String(e.message ?? e) }); continue; }
        const m = await ev(TOPBAR).catch((e) => ({ cut: [`audit: ${e.message}`] }));
        const shownLang = await ev('document.documentElement.lang');
        if (shownLang !== lang) m.cut.push(`<html lang> is ${shownLang}, expected ${lang}`);
        if (m.cut.length) add('topbar', hash, `${w} light ${lang}`, { problems: m.cut, height: m.height });
        visits.push({ page: hash, config: `${w} topbar ${lang}` });
      }
    }
  }
} catch (e) {
  crashed = String(e?.message ?? e);
} finally {
  await closeBrowser();
  for (const c of owned) stop(c);
}

// ---- report: every finding, and a summary that counts one element once across pages
const key = (f) => `${f.check}|${f.at ?? f.trigger ?? f.page}|${f.text ?? ''}|${(f.problems ?? []).join()}`;
const unique = new Map();
for (const f of findings) { const k = key(f); if (!unique.has(k)) unique.set(k, { ...f, where: [] }); unique.get(k).where.push(`${f.config} ${f.page}`); }
const summary = {};
for (const f of unique.values()) { const s = (summary[f.check] ??= { severity: SEVERITY[f.check], found: 0, unique: 0 }); s.unique++; s.found += f.where.length; }
const serious = [...unique.values()].filter((f) => f.severity === 'serious');
mkdirSync(OUT, { recursive: true });
const report = { ok: !crashed && serious.length === 0, base, browser: BROWSER, at: new Date().toISOString(), ms: Date.now() - T0, crashed,
  matrix: { configs: CONFIGS, pages: PAGES, topbar: { widths: [1024, 1280, 1366, 1440, 1600, 1920], langs: ['vi', 'en'], pages: TOPBAR_PAGES } },
  summary, unique: [...unique.values()], findings, skipped, visits, pageErrors };
writeFileSync(join(OUT, 'ux-audit.json'), JSON.stringify(report, null, 1));
console.log(`ux-audit ${base} (${visits.length} visits, ${skipped.length} skipped, ${(report.ms / 1000).toFixed(0)} s)`);
for (const [k, s] of Object.entries(summary)) console.log(`  ${k.padEnd(10)} ${s.severity.padEnd(8)} ${String(s.unique).padStart(3)} unique, ${s.found} on pages`);
for (const f of serious.slice(0, 15)) console.log(`  ! ${f.check} ${f.at ?? f.trigger ?? ''} "${f.text ?? (f.problems ?? []).join(', ')}" ${f.ratio ? f.ratio + ':1 ' : ''}@ ${f.where[0]}${f.where.length > 1 ? ` (+${f.where.length - 1})` : ''}`);
if (crashed) console.log(`  CRASHED: ${crashed}`);
console.log(`${report.ok ? 'UX AUDIT OK' : 'UX AUDIT FAILED'}: ${serious.length} serious unique, report: smoke-out/ux-audit.json`);
process.exit(report.ok ? 0 : 1);
