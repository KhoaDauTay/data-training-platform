// v23 review walkthrough (not part of the repo). node walk.mjs <config> ; screenshots next to this file.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../rel23');
const BASE = process.env.BASE || 'http://127.0.0.1:5271/';
const BROWSER = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = JSON.stringify;
const LOG = join(HERE, 'walk.log');
const log = (...a) => { const s = a.join(' '); console.log(s); appendFileSync(LOG, s + '\n'); };

let ws, child, profile, id = 0;
const pending = new Map();
const errors = [];
async function start() {
  profile = mkdtempSync(join(tmpdir(), 'bd-walk-'));
  child = spawn(BROWSER, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let port, page;
  for (let i = 0; i < 150 && !port; i++) { try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch { await sleep(200); } }
  for (let i = 0; i < 50 && !page; i++) { page = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json(), () => []).then((l) => l.find((t) => t.type === 'page')); if (!page) await sleep(200); }
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Target.attachedToTarget') { const sid = m.params.sessionId; ws.send(JSON.stringify({ id: ++id, sessionId: sid, method: 'Runtime.enable' })); }
    if (m.sessionId && (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error'))) errors.push('WORKER ' + JSON.stringify(m.params).slice(0, 300));
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.type + ' ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('LOG ' + m.params.entry.text.slice(0, 200) + ' ' + (m.params.entry.url ?? ''));
  });
  for (const d of ['Page', 'Runtime', 'Network', 'Log']) await send(d + '.enable');
  await send('Network.setBypassServiceWorker', { bypass: true });
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++id; const t = setTimeout(() => reject(new Error(method + ' timeout')), 60000);
  pending.set(i, (m) => { clearTimeout(t); m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
async function ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; }
async function waitFor(what, expr, ms = 30000) { const t = Date.now(); while (Date.now() - t < ms) { const v = await ev(expr).catch(() => undefined); if (v) return v; await sleep(150); } throw new Error('timeout: ' + what); }
async function stopAll() { try { ws?.close(); } catch {} spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch {} }

const FIX = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/save-v5.json'), 'utf8'));
let resetId;
async function reset({ theme, lang, state }) {
  const st = state === 'new' ? { 'cargo-query/prefs': { lang, theme } } : { 'cargo-query-save': FIX, 'cargo-query/tour': { step: 99, knows: true }, 'cargo-query/coach-done': true, 'cargo-query/guides': { seen: [], off: true }, 'cargo-query/prefs': { lang, theme }, 'cargo-query/domain': 'logistics' };
  const token = 'w' + Date.now();
  if (resetId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: resetId });
  resetId = (await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol.startsWith('http') && !sessionStorage.getItem('${token}')) { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('${token}','1'); indexedDB.deleteDatabase('cargo-query'); for (const [k,v] of Object.entries(${S(st)})) localStorage.setItem(k, JSON.stringify(v)); }` })).identifier;
  await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
}
async function size(w, h, theme, reduced) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
}
async function open(hash, { lesson } = {}) {
  await send('Page.navigate', { url: BASE + hash });
  await sleep(400);
  await waitFor('h1 ' + hash, `[...document.querySelectorAll('main')].some(m => !m.hidden && m.querySelector('h1'))`, 45000);
  await waitFor('notice ' + hash, `document.getElementById('notice')?.hidden !== false`, 90000).catch((e) => log('  WARN', e.message));
  if (lesson) await waitFor('engine-page', `!!document.getElementById('engine-page')`, 60000);
  await sleep(1200);
}
async function shot(name) {
  const { w, vh, h, y } = await ev(`({ w: innerWidth, vh: innerHeight, y: scrollY, h: Math.min(document.documentElement.scrollHeight, 3200) })`);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: vh, deviceScaleFactor: 1, mobile: w < 600 }); await ev('scrollTo(0,' + y + ')');
  writeFileSync(join(HERE, name + '.png'), Buffer.from(r.data, 'base64'));
}
const checks = async (tag) => {
  const m = await ev(`(() => { const out = []; const W = innerWidth;
    if (document.documentElement.scrollWidth > W) out.push('hscroll ' + document.documentElement.scrollWidth);
    const hd = document.querySelector('header'); if (hd && hd.getBoundingClientRect().height > 60) out.push('header ' + hd.getBoundingClientRect().height);
    const bn = document.getElementById('bottom-nav'); if (bn && bn.offsetParent && bn.getBoundingClientRect().height >= 72) out.push('bottomnav ' + bn.getBoundingClientRect().height);
    const h1 = [...document.querySelectorAll('main:not([hidden]) h1')]; out.push('h1=' + h1.map(e => e.textContent.trim().slice(0, 40)).join('|'));
    for (const el of document.querySelectorAll('main:not([hidden]) *')) { const r = el.getBoundingClientRect(); if (r.width && r.right > W + 1 && getComputedStyle(el).position !== 'fixed') { let p = el.parentElement, sc = false; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { sc = true; break; } p = p.parentElement; } if (!sc) { out.push('wide ' + el.tagName + '.' + (el.className?.baseVal ?? el.className).toString().slice(0, 40) + ' ' + Math.round(r.right)); break; } } }
    const txt = document.querySelector('main:not([hidden])')?.innerText ?? ''; for (const bad of ['undefined', 'NaN', '[object', 'sắp có', 'coming soon', 'Coming soon', '{{', 'TODO']) if (txt.includes(bad)) out.push('text:' + bad);
    const keys = txt.match(/\\b[a-z]+\\.[a-z][a-zA-Z]+(\\.[a-zA-Z]+)+\\b/g); if (keys) out.push('keys? ' + [...new Set(keys)].slice(0, 5).join(','));
    return out.join(' ; '); })()`);
  log(`  [${tag}] ${m}`);
};

const PAGES = [
  ['home', '#/'], ['learn', '#/learn'], ['drill', '#/learn/play/g-select-1'], ['play', '#/d/logistics/play'],
  ['engine', '#/engine'], ['eng-pg', '#/engine/postgres'], ['eng-mg', '#/engine/mongodb'], ['eng-dy', '#/engine/dynamodb'],
  ['eng-pg-L3', '#/engine/postgres/L3'],
  ['pg-lab-l3-16', '#/engine/postgres/L3/e-pg-l3-16', 1], ['pg-lab-l5-16', '#/engine/postgres/L5/e-pg-l5-16', 1],
  ['pg-predict-l1-10', '#/engine/postgres/L1/e-pg-l1-10', 1], ['pg-predict-l3-17', '#/engine/postgres/L3/e-pg-l3-17', 1],
  ['pg-cap-l1-12', '#/engine/postgres/L1/e-pg-l1-12', 1], ['mg-lab-l1-02', '#/engine/mongodb/L1/e-mg-l1-02', 1],
  ['dy-lab-l1-05', '#/engine/dynamodb/L1/e-dy-l1-05', 1], ['mg-path', '#/engine/mongodb/path'], ['me', '#/me'],
];

async function predict(pid, L, tag) {
  await open(`#/engine/postgres/${L}/${pid}`, { lesson: true });
  const ans = await ev(`(() => { const r = [...document.querySelectorAll('[data-ek^="${pid}-p-"][type=radio]')]; return r.length; })()`);
  // keyboard: focus first radio in DOM order, arrow, then Tab to the button, Enter
  await ev(`document.querySelector('[data-ek^="${pid}-p-"][type=radio]').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await sleep(300);
  const picked = await ev(`document.activeElement?.dataset.ek`);
  for (let i = 0; i < 6; i++) {
    const a = await ev(`document.activeElement?.dataset.ek ?? document.activeElement?.tagName`);
    if (a === `${pid}-p-check`) break;
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(100);
  }
  const onBtn = await ev(`document.activeElement?.dataset.ek`);
  const ring = await ev(`getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth + ' ' + getComputedStyle(document.activeElement).boxShadow.slice(0,60)`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitFor('plan or rows', `!!document.querySelector('#engine-page [data-plan], #engine-page [data-real-rows], #engine-page .error')`, 60000).catch((e) => log('  ERR', e.message));
  await sleep(800);
  const st = await ev(`({ focus: document.activeElement?.dataset.ek ?? document.activeElement?.tagName, status: document.querySelector('[data-ek="${pid}-p-check"]')?.parentElement.querySelector('[role=status]')?.textContent, btnDisabled: document.querySelector('[data-ek="${pid}-p-check"]')?.disabled })`);
  log(`  [${tag} predict] radios=${ans} picked=${picked} tabTo=${onBtn} ring=${ring} after=${S(st)}`);
  await shot(`${tag}-predict-${pid}-first`);
  // pick every other option, find the right one (status .good)
  const n = ans;
  for (let i = 0; i < n; i++) {
    await ev(`document.querySelector('[data-ek="${pid}-p-${i}"]').click()`); await sleep(300);
    const good = await ev(`!!document.querySelector('[data-ek="${pid}-p-check"]')?.parentElement.querySelector('[role=status].good')`);
    if (good) { log(`  [${tag} predict] right=${i}`); await shot(`${tag}-predict-${pid}-right`); }
    else if (i === (n - 1)) await shot(`${tag}-predict-${pid}-wrong`);
  }
  await checks(tag + ' predict ' + pid);
}

async function capstone(tag) {
  await open('#/engine/postgres/L1/e-pg-l1-12', { lesson: true });
  const info = await ev(`({ bar: !!document.querySelector('[data-cap-bar]'), steps: [...document.querySelectorAll('[data-cap-bar] li')].map(li => (li.getAttribute('aria-current')||'-') + ':' + li.textContent.trim().slice(0,30)), go: [...document.querySelectorAll('#engine-page [data-ek$="-submit"]')].map(b => b.dataset.ek + (b.className.includes('bg-accent') ? '*' : '')), barLinks: [...document.querySelectorAll('[data-cap-bar] a, [data-cap-bar] button')].length })`);
  log(`  [${tag} capstone] ${S(info)}`);
  // tab through the bar
  if (info.barLinks) { await ev(`document.querySelector('[data-cap-bar] a, [data-cap-bar] button').focus()`); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(500); log(`  [${tag} capstone] after Enter on bar: focus=${await ev('document.activeElement?.dataset.ek ?? document.activeElement?.tagName + "#" + document.activeElement?.id')} scrollY=${await ev('scrollY')}`); }
}


const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
async function axe(tag) {
  await ev(`window.axe ? 1 : (eval(${S(AXE)}), 1)`);
  const r = await ev(`axe.run(document, { resultTypes: ['violations'], rules: { 'target-size': { enabled: true } } }).then(r => r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ':' + v.nodes.length + ':' + v.nodes.slice(0,2).map(n => n.target.join(' ')).join(' | ')))`);
  log(`  [axe ${tag}] ${r.length ? r.join(' ;; ') : 'ok'}`);
}
async function typeStep(id, i, code) { await ev(`(t => { t.value = ${S(code)}; t.dispatchEvent(new Event('input', { bubbles: true })); })(document.querySelector('[data-ek="${id}-s${i}-code"]'))`); }
async function submit(id, i) {
  await ev(`document.querySelector('[data-ek="${id}-s${i}-submit"]').click()`);
  const st = `document.querySelector('[data-ek="${id}-s${i}-code"]')?.closest('[data-step]').querySelector('[role=status]')`;
  await waitFor('graded', `!!${st}?.textContent && !document.querySelector('[data-ek="${id}-s${i}-submit"]').disabled`, 120000);
  return ev(`(${st}.classList.contains('good') ? 'GOOD ' : 'BAD ') + ${st}.textContent.slice(0,80) + ' | ' + (document.querySelector('[data-ek="${id}-s${i}-code"]')?.closest('[data-step]').querySelector('.error, pre.error')?.textContent.slice(0,120) ?? '')`);
}
async function deep(name) {
  const { parse } = await import('file:///' + join(ROOT, 'node_modules/yaml/dist/index.js').replace(/\\/g, '/'));
  const fm = (f) => parse(readFileSync(join(ROOT, 'content/engine', f), 'utf8').replace(/\r/g, '').split('\n---')[0].replace(/^---\n?/, ''));
  await open('#/engine/postgres/L1/e-pg-l1-10', { lesson: true });
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-0"]').focus()`);
  log(`  [focus radio] ${await ev(`(e => { const s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor + ' off ' + s.outlineOffset; })(document.activeElement)`)}`);
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-check"]').focus()`);
  log(`  [focus btn] ${await ev(`(e => { const s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor; })(document.activeElement)`)}`);
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-0"]').click()`);
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-check"]').click()`);
  await waitFor('plan', `!!document.querySelector('#engine-page [data-plan]')`, 60000);
  await sleep(500);
  log(`  [disabled see] ${await ev(`(e => { const s = getComputedStyle(e); return e.disabled + ' op=' + s.opacity + ' cur=' + s.cursor + ' bg=' + s.backgroundColor; })(document.querySelector('[data-ek="e-pg-l1-10-p-check"]'))`)}`);
  log(`  [focus after plan] ${await ev(`document.activeElement?.dataset.ek`)}`);
  await axe('predict wrong');
  await ev(`(d => d && (d.open = true))(document.querySelector('[aria-labelledby="e-pg-l1-10-plan"] details'))`).catch(() => {});
  await sleep(1000); await shot(`${name}-predict-diagram-open`); await axe('predict diagram open');
  const cap = fm('postgres/L1/12-capstone-registrations.md');
  await open('#/engine/postgres/L1/e-pg-l1-12', { lesson: true });
  await typeStep('e-pg-l1-12', 0, 'ALTER TABLE registrations ADD CONSTRAINT x CHECK (seats > 0');
  log(`  [cap wrong s0] ${await submit('e-pg-l1-12', 0)}`);
  await shot(`${name}-cap-wrong`);
  for (const [i, st] of cap.lab.steps.entries()) {
    await typeStep('e-pg-l1-12', i, String(st.solution).trim());
    log(`  [cap s${i}] ${await submit('e-pg-l1-12', i)} bar=${await ev(`[...document.querySelectorAll('[data-cap-bar] li')].map(li => (li.getAttribute('aria-current') ? '>' : '') + (li.querySelector('.bg-good') ? 'v' : '.')).join('')`)} main=${await ev(`[...document.querySelectorAll('#engine-page [data-ek$="-submit"]')].filter(b => b.matches('.bg-accent')).map(b => b.dataset.ek).join()`)}`);
    if (await ev(`!!document.querySelector('[data-ek="e-pg-l1-12-plans"]')`) && !(await ev(`!!document.querySelector('[data-cap-plans]')`))) {
      await ev(`document.querySelector('[data-ek="e-pg-l1-12-plans"]').click()`);
      await waitFor('plans', `!!document.querySelector('[data-cap-plans]')`, 60000).catch((e) => log('  ERR', e.message));
      await sleep(500); await shot(`${name}-cap-plans`); await axe('cap plans');
    }
  }
  for (const [i, q] of (cap.quiz ?? []).entries()) { await ev(`document.querySelector('[data-ek="e-pg-l1-12-q${i}-${q.answer}"]')?.click()`); await ev(`document.querySelector('[data-ek="e-pg-l1-12-q${i}-check"]')?.click()`); await sleep(200); }
  await sleep(800);
  log(`  [cap done] ${await ev(`!!document.querySelector('[data-cap-done]')`)} completed=${await ev(`JSON.parse(localStorage.getItem('cargo-query-save')).completed.includes('e-pg-l1-12')`)}`);
  await shot(`${name}-cap-done`); await axe('cap done');
  for (const [f, hash, id, wrong] of [['mongodb/L1/02-find-filter.md', '#/engine/mongodb/L1/e-mg-l1-02', 'e-mg-l1-02', 'db.customers.find({ tier: "gold" '], ['dynamodb/L1/05-get-item.md', '#/engine/dynamodb/L1/e-dy-l1-05', 'e-dy-l1-05', '{"op": "GetItem", "input": {"TableName": "Books"']]) {
    const l = fm(f);
    await open(hash, { lesson: true });
    await typeStep(id, 0, wrong); log(`  [${id} syntax] ${await submit(id, 0)}`);
    await shot(`${name}-${id}-error`);
    await typeStep(id, 0, String(l.lab.steps[0].solution).trim()); log(`  [${id} right] ${await submit(id, 0)}`);
    await shot(`${name}-${id}-right`); await axe(id);
  }
  await open('#/engine/postgres/L3/e-pg-l3-16', { lesson: true });
  const nxt = `[...document.querySelectorAll('#engine-page button')].find(b => /^(Tiếp|Next)/.test(b.textContent.trim()))`;
  const pos = [];
  for (let i = 0; i < 8; i++) { const r = await ev(`(b => b ? [b.disabled, Math.round(b.getBoundingClientRect().top + scrollY), Math.round(b.getBoundingClientRect().left)].join(',') : 'none')(${nxt})`); pos.push(r); if (r.startsWith('true') || r === 'none') break; await ev(`${nxt}.click()`); await sleep(400); }
  log(`  [viz steps] ${pos.join(' / ')} anims=${await ev(`document.getAnimations().filter(a => a.playState === 'running').length`)}`);
  await shot(`${name}-viz-end`);
}
async function welcomeSql(name) {
  await reset({ theme: 'light', lang: 'vi', state: 'new' });
  await send('Page.navigate', { url: BASE + '#/engine' }); await sleep(3000);
  for (let i = 0; i < 6; i++) {
    if (await ev(`!!document.querySelector('[data-w="pick-general"]')`)) { await ev(`document.querySelector('[data-w="pick-general"]').click()`); break; }
    await ev(`(d => [...d.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent).pop()?.click())(document.getElementById('welcome-dialog'))`); await sleep(600);
  }
  await sleep(2500);
  log(`  [welcome sql-only] hash=${await ev('location.hash')} dialog=${await ev(`document.getElementById('welcome-dialog')?.open`)} h1=${await ev(`document.querySelector('main:not([hidden]) h1')?.textContent`)}`);
  await shot(`${name}-welcome-sqlonly`);
}

async function run(cfg) {
  const { name, w, h, theme, lang, state, reduced, pages } = cfg;
  log(`== ${name}`);
  await reset({ theme, lang, state });
  await size(w, h, theme, reduced);
  if (cfg.deep) { await deep(name); return; }
  if (cfg.welcome) { await welcomeSql(name); return; }
  if (state === 'new') {
    for (const [tag, hash] of [['home', '#/'], ['engine', '#/engine']]) {
      await reset({ theme, lang, state });
      await send('Page.navigate', { url: BASE + hash }); await sleep(4000);
      log(`  [new ${tag}] dialog=${await ev(`[...document.querySelectorAll('dialog[open]')].map(d=>d.id).join()`)} hash=${await ev('location.hash')}`);
      await shot(`${name}-${tag}-welcome`);
    }
    // new player: engine overview without the welcome (Esc) and a lesson
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(800);
    log(`  [new engine after Esc] dialog=${await ev(`[...document.querySelectorAll('dialog[open]')].map(d=>d.id).join()`)} hash=${await ev('location.hash')}`);
    await shot(`${name}-engine-afteresc`);
    await checks('new engine');
    return;
  }
  for (const [tag, hash, lesson] of pages ?? PAGES) {
    try { await open(hash, { lesson: !!lesson }); await shot(`${name}-${tag}`); await checks(tag); } catch (e) { log(`  FAIL ${tag}: ${e.message}`); await shot(`${name}-${tag}-FAIL`).catch(() => {}); }
  }
  if (cfg.interact) {
    try { await predict('e-pg-l1-10', 'L1', name); } catch (e) { log('  FAIL predict', e.message); }
    try { await predict('e-pg-l3-17', 'L3', name); } catch (e) { log('  FAIL predict2', e.message); }
    try { await predict('e-pg-l3-08', 'L3', name); } catch (e) { log('  FAIL predict3', e.message); }
    try { await capstone(name); } catch (e) { log('  FAIL cap', e.message); }
  }
  if (reduced) {
    await open('#/engine/postgres/L1/e-pg-l1-10', { lesson: true });
    log(`  [reduced] running anims=${await ev(`document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName ?? a.id ?? 'x') + ':' + a.effect?.getComputedTiming().iterations).join()`)}`);
  }
}

const CONFIGS = {
  deep1280: { name: 'light-1280-deep', w: 1280, h: 800, theme: 'light', lang: 'vi', state: 'ret', deep: true },
  deep375: { name: 'dark-375-deep', w: 375, h: 740, theme: 'dark', lang: 'vi', state: 'ret', deep: true, reduced: true },
  wsql: { name: 'light-1280-new', w: 1280, h: 800, theme: 'light', lang: 'vi', state: 'new', welcome: true },
  new1280: { name: 'light-1280-new', w: 1280, h: 800, theme: 'light', lang: 'vi', state: 'new' },
  r1280: { name: 'light-1280', w: 1280, h: 800, theme: 'light', lang: 'vi', state: 'ret', interact: true },
  r1024: { name: 'light-1024', w: 1024, h: 700, theme: 'light', lang: 'vi', state: 'ret' },
  r375: { name: 'dark-375', w: 375, h: 740, theme: 'dark', lang: 'vi', state: 'ret', reduced: true, interact: true },
  r320: { name: 'light-320', w: 320, h: 640, theme: 'light', lang: 'vi', state: 'ret' },
  en1280: { name: 'en-light-1280', w: 1280, h: 800, theme: 'light', lang: 'en', state: 'ret', pages: [['home', '#/'], ['engine', '#/engine'], ['pg-predict-l1-10', '#/engine/postgres/L1/e-pg-l1-10', 1], ['pg-cap-l1-12', '#/engine/postgres/L1/e-pg-l1-12', 1], ['play', '#/d/logistics/play']], interact: true },
  en1024: { name: 'en-light-1024', w: 1024, h: 700, theme: 'light', lang: 'en', state: 'ret', pages: [['home', '#/'], ['engine', '#/engine'], ['play', '#/d/logistics/play']] },
  dark1280: { name: 'dark-1280', w: 1280, h: 800, theme: 'dark', lang: 'vi', state: 'ret', pages: [['engine', '#/engine'], ['pg-predict-l1-10', '#/engine/postgres/L1/e-pg-l1-10', 1], ['pg-cap-l1-12', '#/engine/postgres/L1/e-pg-l1-12', 1], ['pg-lab-l3-16', '#/engine/postgres/L3/e-pg-l3-16', 1]] },
};
const which = process.argv.slice(2);
await start();
try { for (const k of which) { errors.length = 0; await run(CONFIGS[k]); log(`  errors(${errors.length}): ${[...new Set(errors)].join('\n    ')}`); } } finally { await stopAll(); }
