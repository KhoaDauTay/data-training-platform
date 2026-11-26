// v39 diagram overlap checker (F4, L607; tools/v39/svg-system.md §8). Headless Edge over CDP (no dependency), like scripts/smoke.mjs.
// Bounded: it checks only the routes it is given and starts (and stops, by PID) its own `vite preview` on port 5255.
//
//   npm run overlap -- --routes "#/learn/skill/having,#/engine/postgres/L1/e-pg-l1-05" [--dist dist | --base <url>]
//        [--configs 1280-light,1280-dark,375-light,375-dark,320-light,320-dark] [--lang vi] [--out smoke-out/overlap]
//        [--shots 10] [--shoot "sql-null-truth,sql-group-fold"]   (--shoot: always capture these figures, findings or not)
//   node scripts/overlap-check.mjs --selftest
//
// tests/figures.test.ts imports analyze() and samplePath() from here, so CI and the browser judge with the same rules.
//
// --dist starts `vite preview --outDir <dist> --port 5255 --strictPort` from the repo and stops it (by PID) at the end.
// Every figure on a page (`figure[data-viz]`, `figure[data-fig]`) is stepped from Home to its last step; each step's
// geometry is read in the page (getBBox in viewBox units, getPointAtLength along arrows, CTM only for px sizes and
// overflow) and judged here by analyze(), which is pure: import { analyze, samplePath } from './overlap-check.mjs' to run
// the same rules in Vitest on a model built from shapes (see svg-system.md §7).
//
// Checks: a text/text, b text vs its container or the viewBox, c box/box (not parent), d arrow through text/box,
// e arrow tip < 2 units from its target, f font px under the floor, g horizontal overflow, m figure never mounted.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const BROWSER = process.env.BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
// --port / --prefix: a run beside another agent's keeps its own preview port and Edge profile names
const argv = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(argv('port', 5255));
const PREFIX = argv('prefix', 'bd-v39a-');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── pure rules ──────────────────────────────────────────────────────────────────────────────────────────────────
// seeGap / clear (v39 R1 E9, L627): boxes are judged with their strokes. Two boxes that are neither flush (≤ 0.5 apart, a grid's
// cells) nor clearly apart must show ≥ seeGap units of background between their strokes (else the strokes merge); a text's ink
// stays inside its own box's stroke (clearance ≥ clear). getBBox() ignores strokes, so a 1-unit gap between 1.2-wide strokes and
// ink sitting on the stroke used to pass (pg-tenancy-models, the E9 false negative).
export const RULES = { textGap: 1, boxGap: 1, tipMin: 2, minPx: { 375: 12, 320: 11 }, figPx: 13, inkShrink: 0.15, seeGap: 0.5, clear: 0 };
/** Points along an absolute SVG path (M L H V Q C Z), one per `step` units: the Node twin of getPointAtLength sampling. */
export function samplePath(d, step = 1) {
  const tok = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  if (tok.some((t) => /[a-z]/.test(t) && t !== t.toUpperCase())) throw new Error(`relative path commands unsupported: ${d}`);
  const pts = []; let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '';
  const n = () => Number(tok[i++]);
  const seg = (f, len) => { const k = Math.max(1, Math.ceil(len / step)); for (let j = 1; j <= k; j++) pts.push(f(j / k)); };
  while (i < tok.length) {
    if (/[A-Z]/i.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') { cx = n(); cy = n(); sx = cx; sy = cy; pts.push([cx, cy]); cmd = 'L'; continue; }
    if (cmd === 'Z') { const [x0, y0] = [cx, cy]; seg((t) => [x0 + (sx - x0) * t, y0 + (sy - y0) * t], Math.hypot(sx - x0, sy - y0)); cx = sx; cy = sy; continue; }
    const [x0, y0] = [cx, cy];
    if (cmd === 'L' || cmd === 'H' || cmd === 'V') {
      const x = cmd === 'V' ? cx : n(); const y = cmd === 'H' ? cy : cmd === 'V' ? n() : n();
      seg((t) => [x0 + (x - x0) * t, y0 + (y - y0) * t], Math.hypot(x - x0, y - y0)); cx = x; cy = y;
    } else if (cmd === 'Q') {
      const [qx, qy, x, y] = [n(), n(), n(), n()];
      seg((t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * qx + t * t * x, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * qy + t * t * y], Math.hypot(qx - x0, qy - y0) + Math.hypot(x - qx, y - qy)); cx = x; cy = y;
    } else if (cmd === 'C') {
      const [ax, ay, bx, by, x, y] = [n(), n(), n(), n(), n(), n()];
      const B = (p0, p1, p2, p3, t) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3;
      seg((t) => [B(x0, ax, bx, x, t), B(y0, ay, by, y, t)], Math.hypot(ax - x0, ay - y0) + Math.hypot(bx - ax, by - ay) + Math.hypot(x - bx, y - by)); cx = x; cy = y;
    } else throw new Error(`path command ${cmd} unsupported`);
  }
  return pts;
}

const area = (r) => Math.max(0, r.w) * Math.max(0, r.h);
const ov = (p, q) => [Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y)];
const contains = (o, r, tol = 0.5) => r.x >= o.x - tol && r.y >= o.y - tol && r.x + r.w <= o.x + o.w + tol && r.y + r.h <= o.y + o.h + tol;
const inside = ([x, y], r, shrink = 0) => x > r.x + shrink && x < r.x + r.w - shrink && y > r.y + shrink && y < r.y + r.h - shrink;
/** Signed distance from a point to a rect's edge: > 0 outside, < 0 inside. */
const dist = ([x, y], r) => {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w)), dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return dx || dy ? Math.hypot(dx, dy) : -Math.min(x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y);
};
const ink = (t) => ({ x: t.x + 0.5, w: t.w - 1, y: t.y + t.size * RULES.inkShrink, h: t.h - 2 * t.size * RULES.inkShrink });
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Judges one drawn step. `f` = { vb: [x,y,w,h], texts: [{ k, s, x, y, w, h, size, px, owner? }], boxes: [{ k, kind, x, y, w, h, parent? }],
 * arrows: [{ k, pts: [[x,y]…], tip: [x,y], from?, to? }], page?: { width, overflow: string[] }, fig? }. Units are viewBox units
 * except `px` (rendered font size). `from`/`to`/`owner`/`parent` (data-from, data-to, data-owner, data-parent on new figures)
 * replace the guesses. Returns findings { t: a–g, sev: P1|P2|P3|W, what, n? }.
 */
export function analyze(f, width) {
  const out = [];
  const add = (t, sev, what, extra = {}) => out.push({ t, sev, what, ...extra });
  const { texts, boxes, arrows } = f;
  const [vx, vy, vw, vh] = f.vb;
  const byK = new Map(boxes.map((b) => [b.k, b]));
  const ownerOf = (t) => {
    const k = t.owner ?? (/\.[ts]$/.test(t.k ?? '') ? t.k.slice(0, -2) : undefined); // box(): label k.t, sub k.s
    if (k && byK.has(k)) return { b: byK.get(k), how: 'key' };
    const c = [t.x + t.w / 2, t.y + t.h / 2];
    const b = boxes.filter((b) => inside(c, b)).sort((p, q) => area(p) - area(q))[0];
    return b ? { b, how: 'guess' } : undefined;
  };
  // a: text on text (box tier = line boxes touch; ink tier = estimated glyphs overlap)
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const [x, y] = ov(texts[i], texts[j]);
    if (x <= RULES.textGap || y <= RULES.textGap) continue;
    const [ix, iy] = ov(ink(texts[i]), ink(texts[j]));
    const deep = ix > 0 && iy > 0;
    add('a', deep ? (Math.min(ix, iy) >= 2 ? 'P1' : 'P2') : 'I', `"${texts[i].s}" / "${texts[j].s}"`, { depth: r1(deep ? Math.min(ix, iy) : Math.min(x, y)), tier: deep ? 'ink' : 'box' });
  }
  // b: text leaves the viewBox, or crosses the box it belongs to
  for (const t of texts) {
    const e = ink(t);
    const past = Math.max(vx - e.x, vy - e.y, e.x + e.w - (vx + vw), e.y + e.h - (vy + vh));
    if (past > 0.5) { add('b', 'P1', `"${t.s}" leaves the viewBox by ${r1(past)}`, { depth: r1(past) }); continue; }
    const o = ownerOf(t);
    if (!o) continue;
    const cross = Math.max(o.b.x - e.x, e.x + e.w - (o.b.x + o.b.w), o.b.y - e.y, e.y + e.h - (o.b.y + o.b.h));
    if (cross > 0.5) add('b', o.how === 'key' && cross >= 1.5 ? 'P2' : 'P3', `"${t.s}" crosses ${o.b.k ?? o.b.kind} by ${r1(cross)} (${o.how})`, { depth: r1(cross) });
    else if (-cross - (o.b.sw ?? 0) / 2 < RULES.clear) add('b', o.how === 'key' ? 'P2' : 'P3', `"${t.s}" hugs the edge of ${o.b.k ?? o.b.kind}: ${r1(-cross - (o.b.sw ?? 0) / 2)} inside its stroke (${o.how})`, { depth: r1(-cross) });
  }
  // c: boxes overlapping without one containing the other
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const p = boxes[i], q = boxes[j];
    if (p.ok || q.ok || p.parent === q.k || q.parent === p.k || contains(p, q) || contains(q, p)) continue; // data-overlap="ok": overlap by design
    const [x, y] = ov(p, q);
    if (x > RULES.boxGap && y > RULES.boxGap) { add('c', Math.min(x, y) >= 3 ? 'P2' : 'P3', `${p.k ?? p.kind} / ${q.k ?? q.kind}`, { depth: r1(Math.min(x, y)) }); continue; }
    // side by side (sharing > boxGap of one axis) with a sliver between them: strokes merge or nearly do
    const g = x > RULES.boxGap ? -y : y > RULES.boxGap ? -x : undefined;
    const see = g === undefined ? undefined : g - ((p.sw ?? 0) + (q.sw ?? 0)) / 2;
    if (g !== undefined && g > 0.5 && see < RULES.seeGap) add('c', see <= 0 ? 'P2' : 'P3', `${p.k ?? p.kind} / ${q.k ?? q.kind} nearly touch: ${r1(see)} between strokes`, { depth: r1(see) });
  }
  // d + e: arrows
  for (const a of arrows) {
    if (a.pts.length < 2) continue;
    const near = (pt) => boxes.map((b) => ({ b, d: dist(pt, b) })).filter((x) => x.d < 8 && !contains(x.b, { x: Math.min(a.pts[0][0], a.tip[0]), y: Math.min(a.pts[0][1], a.tip[1]), w: Math.abs(a.tip[0] - a.pts[0][0]), h: Math.abs(a.tip[1] - a.pts[0][1]) }))
      .sort((p, q) => Math.abs(p.d) - Math.abs(q.d) || area(p.b) - area(q.b))[0]?.b;
    const src = a.from ? byK.get(a.from) : near(a.pts[0]);
    const dst = a.to ? byK.get(a.to) : near(a.tip);
    if ((a.from && !src) || (a.to && !dst)) add('e', 'P2', `${a.k ?? 'arrow'} names a box that is not drawn (${a.from}→${a.to})`);
    const skip = new Set([src, dst].filter(Boolean));
    for (const b of boxes) if (inside(a.pts[0], b) || inside(a.tip, b) || [...skip].some((s) => contains(b, s))) skip.add(b);
    for (const b of boxes) {
      if (skip.has(b) || b.kind === 'circle') continue; // dots on an axis are crossed by design
      const hits = a.pts.filter((p) => inside(p, b, 0.5)).length;
      if (hits) add('d', hits > 2 ? 'P2' : 'P3', `${a.k ?? 'arrow'} crosses box ${b.k ?? b.kind} (${hits} pts)`, { n: hits });
    }
    for (const t of texts) {
      const o = ownerOf(t)?.b;
      if (o && skip.has(o) && (o === src || o === dst)) continue;
      const hits = a.pts.filter((p) => inside(p, ink(t), 0)).length;
      if (hits) add('d', 'P2', `${a.k ?? 'arrow'} crosses text "${t.s}" (${hits} pts)`, { n: hits });
    }
    if (dst) {
      const g = dist(a.tip, dst);
      if (g < RULES.tipMin) add('e', g < 0 ? 'P2' : 'P3', `${a.k ?? 'arrow'} tip ${r1(g)} from ${dst.k ?? dst.kind}`, { depth: r1(g) });
    }
  }
  // f: rendered size (v39: a content figure, `figure[data-fig]`, keeps 13 px at every width)
  const floor = f.fig ? RULES.figPx : RULES.minPx[width];
  if (floor) for (const t of texts) if (t.px < floor - 0.05) add('f', width === 320 && t.px >= 10 ? 'W' : 'P2', `"${t.s}" ${r1(t.px)} px < ${floor}`, { px: r1(t.px) });
  // g: overflow
  for (const o of f.page?.overflow ?? []) add('g', 'P1', o);
  return out;
}

// ── page side: read one figure's geometry (stringified into the page, so it must not close over anything) ──────
function readFigure(fig) {
  const svg = fig.querySelector('svg[viewBox]');
  if (!svg) return null;
  const vb = svg.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number);
  const scale = svg.getScreenCTM()?.a ?? 1;
  const seen = (el) => { let o = 1; for (let e = el; e && e !== svg.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= Number(cs.opacity); } return o; };
  const bb = (el) => { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const k = (el) => el.getAttribute('data-k') ?? undefined;
  const els = [...svg.querySelectorAll('rect, circle, ellipse, path, polygon, text, line, polyline')].filter((e) => !e.closest('defs, marker, [data-ov]') && seen(e) > 0.05);
  const texts = [], boxes = [], arrows = [];
  for (const el of els) {
    const tag = el.tagName.toLowerCase();
    const cs = getComputedStyle(el);
    if (tag === 'text') {
      if (!el.textContent.trim()) continue;
      const size = parseFloat(cs.fontSize);
      texts.push({ k: k(el), s: el.textContent.slice(0, 40), ...bb(el), size, px: size * scale, owner: el.getAttribute('data-owner') ?? undefined });
      continue;
    }
    const filled = cs.fill !== 'none' && tag !== 'line' && tag !== 'polyline';
    if (filled) {
      const b = bb(el);
      if (tag === 'circle' && b.w < 8) continue; // dots, not boxes
      if (b.w > 0.5 && b.h > 0.5) boxes.push({ k: k(el), kind: tag, ...b, sw: cs.stroke === 'none' ? 0 : parseFloat(cs.strokeWidth) || 0, parent: el.getAttribute('data-parent') ?? undefined, ok: el.getAttribute('data-overlap') === 'ok' || undefined });
      continue;
    }
    const mEnd = el.getAttribute('marker-end'), mStart = el.getAttribute('marker-start');
    if (!mEnd && !mStart) continue; // plain connectors and axes are not arrows
    const L = el.getTotalLength();
    const n = Math.max(2, Math.ceil(L));
    let pts = Array.from({ length: n + 1 }, (_, i) => { const p = el.getPointAtLength((i / n) * L); return [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]; });
    if (!mEnd) pts = pts.reverse();
    const m = document.getElementById(/url\(["']?#([^"')]+)/.exec(mEnd ?? mStart)?.[1] ?? '');
    const mvb = (m?.getAttribute('viewBox') ?? '0 0 3 3').split(/[\s,]+/).map(Number);
    const sw = m?.getAttribute('markerUnits') === 'userSpaceOnUse' ? 1 : parseFloat(cs.strokeWidth) || 1;
    const ext = ((mvb[2] - Number(m?.getAttribute('refX') ?? 0)) * (Number(m?.getAttribute('markerWidth') ?? 3) / mvb[2])) * sw;
    const [p, q] = [pts.at(-2), pts.at(-1)]; const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    arrows.push({ k: k(el), pts, tip: [q[0] + ((q[0] - p[0]) / len) * ext, q[1] + ((q[1] - p[1]) / len) * ext], ext, from: el.getAttribute('data-from') ?? undefined, to: el.getAttribute('data-to') ?? undefined });
  }
  const host = fig.parentElement;
  const sr = svg.getBoundingClientRect(), hr = host.getBoundingClientRect();
  const overflow = [];
  if (fig.scrollWidth > fig.clientWidth + 1) overflow.push(`figure scrollWidth ${fig.scrollWidth} > ${fig.clientWidth}`);
  if (sr.right > hr.right + 1 || sr.left < hr.left - 1) overflow.push(`svg ${Math.round(sr.left)}–${Math.round(sr.right)} outside host ${Math.round(hr.left)}–${Math.round(hr.right)}`);
  if (document.scrollingElement.scrollWidth > innerWidth + 1) overflow.push(`page scrollWidth ${document.scrollingElement.scrollWidth} > ${innerWidth}`);
  return { vb, scale, svgPx: Math.round(sr.width), texts, boxes, arrows, page: { overflow }, fig: !!fig.dataset.fig };
}

/** In the page: steps figure `i` from Home to its end and reads each step (no screenshots, one evaluate). */
const STEP_ALL = (i) => `(async () => {
  const readFigure = ${readFigure.toString()};
  await document.fonts.ready;
  const fig = document.querySelectorAll('main:not([hidden]) figure[data-viz], main:not([hidden]) figure[data-fig]')[${i}];
  const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const key = (k) => fig.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const counter = () => fig.querySelector('.tabular-nums')?.textContent ?? '';
  key('Home'); await raf();
  const name = fig.dataset.fig || fig.parentElement?.dataset.viz || fig.dataset.viz || '?';
  const steps = [];
  for (let s = 0; s < 16; s++) {
    steps.push(readFigure(fig));
    const before = counter(); key('ArrowRight'); await raf();
    if (!before || counter() === before) break;
  }
  return { name, steps };
})()`;

// ── browser plumbing ────────────────────────────────────────────────────────────────────────────────────────────
export async function openBrowser(tag) {
  const profile = mkdtempSync(join(tmpdir(), `${PREFIX}${tag}-`));
  const child = spawn(BROWSER, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let port; for (let i = 0; i < 150 && !port; i++) { try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch { await sleep(200); } }
  let page; for (let i = 0; i < 50 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} if (!page) await sleep(200); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; const t = setTimeout(() => no(new Error(`${method} timeout`)), 60000);
    pending.set(i, (m) => { clearTimeout(t); m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result); }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  const waitFor = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(150); } return false; };
  const close = () => { try { ws.close(); } catch {} if (child.exitCode === null) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {} };
  for (const k of ['Page.enable', 'Runtime.enable']) await send(k);
  return { send, ev, waitFor, close };
}
const view = (b, w, theme) => Promise.all([
  b.send('Emulation.setDeviceMetricsOverride', { width: w, height: w < 600 ? 800 : 900, deviceScaleFactor: 1, mobile: w < 600 }),
  b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }] }),
]);

export async function startPreview(dist) {
  const vite = join(REPO, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [vite, 'preview', '--outDir', dist, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { if (child.exitCode !== null) throw new Error(`vite preview exited ${child.exitCode}`); try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) return child; } catch {} await sleep(200); }
  throw new Error('vite preview did not answer in 20 s');
}

/** One config (width, theme, lang): every route, every figure, every step. */
async function runConfig(base, routes, cfg, out, shots) {
  const [w, theme] = cfg.split('-'); const width = Number(w);
  const tag = `${cfg}-${LANG}`;
  const b = await openBrowser(tag);
  const rows = [];
  try {
    await view(b, width, theme);
    const save = JSON.parse(readFileSync(join(REPO, 'tests/fixtures/save-v5.json'), 'utf8'));
    const init = { 'cargo-query-save': save, 'cargo-query/tour': { step: 99, knows: true }, 'cargo-query/coach-done': true, 'cargo-query/guides': { seen: [], off: true }, 'cargo-query/prefs': { lang: LANG, theme }, 'cargo-query/domain': 'logistics' };
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol.startsWith('http') && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.clear(); ${Object.entries(init).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))});`).join('')} }` });
    await b.send('Page.navigate', { url: base }); await b.waitFor(`document.readyState === 'complete' && !!document.querySelector('main:not([hidden]) h1')`, 60000);
    for (const r of routes) {
      await b.send('Page.navigate', { url: base + r.hash });
      const sel = `main:not([hidden]) figure[data-viz] svg, main:not([hidden]) figure[data-fig] svg`;
      const lessonOk = r.id ? `!!document.querySelector('#engine-page[data-lesson="${r.id}"]')` : 'true';
      // every figure slot of the page filled (a lesson may place several, each mounted when its chunk arrives)
      const filled = `[...document.querySelectorAll('main:not([hidden]) [data-fig-slot]')].every((s) => s.querySelector('svg'))`;
      const ok = await b.waitFor(`${lessonOk} && !!document.querySelector('${sel}') && ${filled}`, 25000);
      const row = { ...r, cfg: tag, figures: [] };
      if (!ok) { row.figures.push({ name: r.viz ?? '?', steps: [], findings: [{ t: 'm', sev: 'P1', what: 'no diagram mounted in 25 s' }] }); rows.push(row); console.log(tag, r.hash, 'NO FIGURE'); continue; }
      await sleep(250);
      const n = await b.ev(`document.querySelectorAll('main:not([hidden]) figure[data-viz], main:not([hidden]) figure[data-fig]').length`);
      for (let i = 0; i < n; i++) {
        const { name, steps } = await b.ev(STEP_ALL(i));
        const fig = { name, i, svgPx: steps[0]?.svgPx, scale: steps[0]?.scale, steps: steps.map((s, j) => ({ step: j + 1, findings: s ? analyze(s, width) : [{ t: 'm', sev: 'P1', what: 'no svg' }] })) };
        row.figures.push(fig);
      }
      rows.push(row);
      const c = row.figures.flatMap((f) => f.steps.flatMap((s) => s.findings)).length;
      console.log(tag, r.hash, row.figures.map((f) => `${f.name}:${f.steps.length}st/${f.svgPx}px`).join(' '), c ? `${c} findings` : 'clean');
      writeFileSync(join(out, `raw-${tag}.json`), JSON.stringify(rows));
    }
    if (shots || SHOOT.length) await shoot(b, base, rows, out, tag, shots);
  } finally { b.close(); }
  return rows;
}

const SEV = { P1: 100, P2: 10, P3: 1, W: 0, I: 0 };
/** Screenshots of the worst (diagram, step) of this config, with the findings' elements outlined. */
async function shoot(b, base, rows, out, tag, max) {
  const cand = new Map();
  for (const r of rows) for (const f of r.figures) for (const s of f.steps) {
    const score = s.findings.reduce((a, x) => a + SEV[x.sev], 0);
    const key = f.name; // one shot per diagram: its worst step
    if ((score >= 10 || (SHOOT.includes(f.name) && s.step === f.steps.length)) && (!cand.has(key) || cand.get(key).score < score)) cand.set(key, { r, f, s, score });
  }
  const dir = join(out, 'cap'); mkdirSync(dir, { recursive: true });
  for (const { r, f, s, score } of [...cand.values()].sort((p, q) => q.score - p.score).slice(0, Math.max(max, SHOOT.length))) {
    await b.send('Page.navigate', { url: base + r.hash });
    if (!(await b.waitFor(`!!document.querySelectorAll('main:not([hidden]) figure[data-viz] svg, main:not([hidden]) figure[data-fig] svg')[${f.i}]`, 25000))) continue;
    await sleep(300);
    const clip = await b.ev(`(async () => { const fig = document.querySelectorAll('main:not([hidden]) figure[data-viz], main:not([hidden]) figure[data-fig]')[${f.i}];
      const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      fig.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); await raf();
      for (let i = 1; i < ${s.step}; i++) { fig.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await raf(); }
      fig.scrollIntoView({ block: 'start' }); await raf(); const r = fig.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: Math.min(r.height, innerHeight - r.top) }; })()`);
    const file = `${tag}-${f.name}-s${s.step}.png`;
    const shot = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip: { x: Math.max(0, clip.x - 4), y: Math.max(0, clip.y - 4), width: clip.width + 8, height: clip.height + 8, scale: 1 } });
    writeFileSync(join(dir, file), Buffer.from(shot.data, 'base64'));
    s.shot = `cap/${file}`; s.score = score;
  }
}

// ── reporting ───────────────────────────────────────────────────────────────────────────────────────────────────
function summary(all) {
  const lines = ['| type | P1 | P2 | P3 | W (waiver) | I (info) | raw total | distinct (diagram, step, width, finding) |', '|---|---|---|---|---|---|---|---|'];
  const NAMES = { a: 'a text/text', b: 'b text vs box/viewBox', c: 'c box/box', d: 'd arrow through', e: 'e arrow tip < 2', f: 'f font px', g: 'g overflow', m: 'm not mounted' };
  for (const t of Object.keys(NAMES)) {
    const fs = all.flatMap((r) => r.figures.flatMap((f) => f.steps.flatMap((s) => s.findings.filter((x) => x.t === t).map((x) => ({ ...x, key: `${f.name}|${s.step}|${r.cfg.split('-')[0]}|${x.what}` })))));
    const c = (sev) => fs.filter((x) => x.sev === sev).length;
    lines.push(`| ${NAMES[t]} | ${c('P1')} | ${c('P2')} | ${c('P3')} | ${c('W')} | ${c('I')} | ${fs.length} | ${new Set(fs.map((x) => x.key)).size} |`);
  }
  return lines.join('\n');
}

// ── self-test: one seeded defect per rule on a synthetic page ─────────────────────────────────────────────────────
const SELF = `<!doctype html><meta name=viewport content="width=device-width"><style>body{margin:0;font:16px sans-serif}main{width:300px}</style><main>
<figure data-fig="clean" style="margin:0"><svg viewBox="0 0 300 120" width="300"><defs><marker id="m" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z"/></marker></defs>
<rect data-k="a" x="10" y="10" width="100" height="40" fill="#eee"/><text data-k="a.t" x="60" y="30" text-anchor="middle" dominant-baseline="middle" style="font-size:13px">App</text>
<rect data-k="b" x="10" y="70" width="100" height="40" fill="#eee"/><text data-k="b.t" x="60" y="90" text-anchor="middle" dominant-baseline="middle" style="font-size:13px">DB</text>
<line x1="60" y1="51" x2="60" y2="64" stroke="#000" stroke-width="1.4" marker-end="url(#m)"/></svg></figure>
<figure data-fig="bad" style="margin:0"><svg viewBox="0 0 300 120" width="360"><defs><marker id="m2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z"/></marker></defs>
<text x="20" y="20" style="font-size:9px">overlapping one</text><text x="30" y="21" style="font-size:9px">overlapping two</text>
<rect data-k="box" x="150" y="10" width="40" height="30" fill="#eee"/><text data-k="box.t" x="152" y="25" dominant-baseline="middle" style="font-size:12px">far too wide label</text>
<rect data-k="p" x="20" y="60" width="60" height="40" fill="#ddd"/><rect data-k="q" x="60" y="80" width="60" height="30" fill="#ccc"/>
<rect data-k="s" x="200" y="60" width="30" height="20" fill="#eee"/><rect data-k="t" x="270" y="60" width="25" height="20" fill="#eee"/><rect data-k="mid" x="240" y="55" width="20" height="30" fill="#bbb"/>
<path d="M231 70 H270" fill="none" stroke="#000" stroke-width="1.4" marker-end="url(#m2)"/><text x="296" y="110" style="font-size:9px">outside</text></svg></figure>
<figure data-fig="tight" style="margin:0"><svg viewBox="0 0 300 60" width="300"><!-- E9: the old pool strips (15 high on a 16 pitch, 1.2 strokes, 12.5-unit Nunito labels), rescaled for the fallback sans-serif: 12 on 13 -->
<rect data-k="ps0" x="10" y="10" width="92" height="12" rx="2" style="fill:#def;stroke:#048;stroke-width:1.2"/><text data-k="pt0" x="14" y="16" dominant-baseline="middle" style="font-size:12.5px">tenant_id A</text>
<rect data-k="ps1" x="10" y="23" width="92" height="12" rx="2" style="fill:#fed;stroke:#840;stroke-width:1.2"/><text data-k="pt1" x="14" y="29" dominant-baseline="middle" style="font-size:12.5px">tenant_id B</text></svg></figure></main>`;
async function selftest() {
  const b = await openBrowser('self');
  try {
    await view(b, 320, 'light');
    await b.send('Page.navigate', { url: `data:text/html,${encodeURIComponent(SELF)}` }); await b.waitFor(`document.readyState === 'complete'`, 10000);
    const clean = analyze((await b.ev(STEP_ALL(0))).steps[0], 320);
    const bad = analyze((await b.ev(STEP_ALL(1))).steps[0], 320);
    const tight = analyze((await b.ev(STEP_ALL(2))).steps[0], 320); // E9 false negative: both rules must see it
    const tightMiss = ['b', 'c'].filter((t) => !tight.some((x) => x.t === t && /hugs|nearly/.test(x.what)));
    const want = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const miss = want.filter((t) => !bad.some((x) => x.t === t));
    console.log('clean:', clean.length ? clean : 'no findings'); console.log('bad:', bad.map((x) => `${x.t} ${x.sev} ${x.what}`).join('\n     '));
    console.log('tight:', tight.map((x) => `${x.t} ${x.sev} ${x.what}`).join('\n       '));
    // Node twin: samplePath agrees with a straight line
    const p = samplePath('M0 0 H10 V10'); if (p.length !== 21 || p.at(-1)[1] !== 10) throw new Error('samplePath');
    if (clean.length || miss.length || tightMiss.length) { console.error('SELFTEST FAIL', { clean: clean.length, miss, tightMiss }); process.exitCode = 1; } else console.log('SELFTEST OK');
  } finally { b.close(); }
}

// ── main ────────────────────────────────────────────────────────────────────────────────────────────────────────
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const LANG = arg('lang', 'vi');
const SHOOT = (arg('shoot') ?? '').split(',').filter(Boolean);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--selftest')) await selftest();
  else {
    const out = resolve(arg('out', join(REPO, 'smoke-out/overlap'))); mkdirSync(out, { recursive: true });
    if (!arg('routes') && !arg('lessons')) throw new Error('give --routes "#/a,#/b" (or --lessons <json>): the checker is bounded to the pages it is told');
    const lessons = arg('lessons') ? JSON.parse(readFileSync(resolve(arg('lessons')), 'utf8').replace(/^\uFEFF/, '')) : [];
    const routes = arg('routes') ? arg('routes').split(',').map((hash) => ({ hash, id: /\/(e-[a-z]{2}-l\d-\d\d)$/.exec(hash)?.[1] }))
      : lessons.filter((l) => !arg('only') || arg('only').split(',').includes(l.id)).map((l) => ({ hash: `#/engine/${l.engine}/${l.level}/${l.id}`, id: l.id, viz: l.viz }));
    const configs = arg('configs', '1280-light,1280-dark,375-light,375-dark,320-light,320-dark').split(',');
    let preview;
    const base = arg('base') ?? `http://127.0.0.1:${PORT}/`;
    try {
      if (!arg('base')) { const dist = resolve(arg('dist', join(REPO, 'dist'))); if (!existsSync(join(dist, 'index.html'))) throw new Error(`no build at ${dist}: run vite build first`); preview = await startPreview(dist); }
      const t0 = Date.now();
      const all = (await Promise.all(configs.map((c) => runConfig(base, routes, c, out, Number(arg('shots', 10)))))).flat();
      writeFileSync(join(out, `overlap-${LANG}.json`), JSON.stringify({ at: new Date().toISOString(), base, configs, rules: RULES, rows: all }, null, 1));
      const md = summary(all);
      writeFileSync(join(out, `overlap-${LANG}.md`), `${md}\n`);
      console.log(md); console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s`);
    } finally { if (preview && preview.exitCode === null) spawnSync('taskkill', ['/PID', String(preview.pid), '/T', '/F'], { stdio: 'ignore' }); }
  }
}
