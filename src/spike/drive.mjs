// Spike S-a driver: each "open" is a fresh headless Edge process on a persistent profile (a real second open).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:5204/spike.html';
const SCRATCH = process.argv[2];
const schemas = (process.argv[3] ?? 'game,lab,ecom,fin').split(',');
const RUNS = Number(process.argv[4] ?? 3);
let port = 9700 + Math.floor(Math.random() * 200);

async function open(profile, schema, mode, tries = 3) {
  try { return await open1(profile, schema, mode); } catch (e) { if (tries <= 1) throw e; await new Promise((r) => setTimeout(r, 3000)); return open(profile, schema, mode, tries - 1); }
}
async function open1(profile, schema, mode) {
  const p = port++;
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${p}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  try {
    let ver;
    for (let i = 0; i < 300 && !ver; i++) {
      try { ver = await (await fetch(`http://127.0.0.1:${p}/json/version`)).json(); } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    const tgt = await (await fetch(`http://127.0.0.1:${p}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(tgt.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0; const pend = new Map();
    ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); });
    const send = (method, params) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.navigate', { url: `${BASE}?schema=${schema}&mode=${mode}` });
    let res;
    for (let i = 0; i < 600; i++) {
      const v = await send('Runtime.evaluate', { expression: 'window.__done', awaitPromise: true, returnByValue: true });
      res = v.result?.result?.value; if (res) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    ws.close();
    return res;
  } finally {
    await new Promise((r) => spawn("taskkill", ["/T", "/F", "/PID", String(edge.pid)], { stdio: "ignore" }).on("exit", r));
    await new Promise((r) => setTimeout(r, 2500)); // let the profile lock go
  }
}

if (process.env.MODES) { for (const schema of schemas) for (let run = 1; run <= RUNS; run++) { const prof = mkdtempSync(join(SCRATCH, 'x-')); for (const mode of process.env.MODES.split(',')) console.log(JSON.stringify({ run, ...(await open(prof, schema, mode)) })); } process.exit(0); }
for (const schema of schemas) {
  for (let run = 1; run <= RUNS; run++) {
    const prof = mkdtempSync(join(SCRATCH, `prof-${schema}-`));
    for (const mode of ['cold', 'warm', 'warmraw', 'cold']) console.log(JSON.stringify({ run, ...(await open(prof, schema, mode)) }));
    const prof2 = mkdtempSync(join(SCRATCH, `idb-${schema}-`));
    for (const mode of ['idb', 'idb']) console.log(JSON.stringify({ run, ...(await open(prof2, schema, mode)) }));
    rmSync(prof, { recursive: true, force: true }); rmSync(prof2, { recursive: true, force: true });
  }
}
