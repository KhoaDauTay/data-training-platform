// Polite, resumable sync of the tutorialspoint database tutorial STRUCTURE into docs/knowledge/database/.
//   index (database_tutorials.htm) → each tutorial's table of contents → each chapter page's h2/h3 outline + hash.
// Copyright rule: only titles, URLs, order, heading texts, a hash and dates are kept. Page HTML is parsed in
// memory and dropped; it is never written to disk (state file and logs included).
//
// Usage: node scripts/kb/crawl-tutorials.mjs [--delay 3000] [--days 30] [--full] [--only sql,dbms] [--fresh]
//   --days N  skip chapter pages read within N days by the last completed run (default 30); --full reads all.
//   --only    crawl just these tutorials (the others keep their last data).
//   --fresh   ignore a saved state file and start over.
// Resume: a stopped run (Ctrl+C, 429, network) keeps .kb-crawl-state.json; run the same command again.
// Exit codes: 0 done, 2 stopped (state kept, rerun to resume).
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { BASE, changesMd, daysBetween, diffRoutes, parseIndex, parseOutline, parseToc, robotsAllows, robotsRules } from './lib.mjs';
import { sortTutorials } from './rules.mjs';

const UA = 'Claude-User';
const INDEX = `${BASE}/database_tutorials.htm`;
const EXTRA = ['dbms']; // not on the index page; added because the user named it
const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('docs/knowledge/database/', ROOT);
const STATE = new URL('.kb-crawl-state.json', ROOT);

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : argv[i + 1]; };
const flag = (name) => argv.includes(`--${name}`);
const DELAY = Number(opt('delay', 3000));
const DAYS = Number(opt('days', 30));
const FULL = flag('full');
const ONLY = opt('only', '')?.split(',').filter(Boolean) ?? [];
const today = new Date().toISOString().slice(0, 10);

class Stop extends Error {}
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const prevFile = new URL('tutorial-routes.json', OUT);
const prev = existsSync(prevFile) ? JSON.parse(readFileSync(prevFile, 'utf8')) : { tutorials: [] };
const prevPage = new Map(prev.tutorials.flatMap((t) => t.sections.flatMap((s) => s.chapters)).filter((c) => c.seen).map((c) => [c.url, c]));

let state = !flag('fresh') && existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null;
if (state && (state.only ?? []).join() !== ONLY.join()) throw new Error(`state file is for --only ${state.only}; rerun with the same --only or --fresh`);
state ??= { started: today, only: ONLY, slugs: null, tocs: {}, pages: {}, requests: 0 };
const save = () => { writeFileSync(new URL('.kb-crawl-state.json.tmp', ROOT), JSON.stringify(state)); renameSync(new URL('.kb-crawl-state.json.tmp', ROOT), STATE); };

let last = 0;
let rules = [];
/** One polite GET: waits DELAY since the last request, retries 5xx/timeouts with backoff, Stop on 429 and other 4xx. */
async function get(url) {
  if (!robotsAllows(rules, url)) return { status: 'robots' };
  for (let attempt = 0; ; attempt++) {
    const wait = last + DELAY - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    state.requests++;
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
    } catch (e) {
      res = { status: `network: ${e.cause?.code ?? e.name}` };
    }
    const s = res.status;
    if (s === 200) {
      const html = await res.text();
      if (new URL(res.url).pathname !== new URL(url).pathname) return { status: `redirect ${new URL(res.url).pathname}` };
      return { status: 200, html };
    }
    if (s === 404 || s === 410) return { status: s };
    if (s === 429) throw new Stop(`429 Too Many Requests at ${url}; wait and rerun to resume`);
    if (typeof s === 'number' && s < 500) throw new Stop(`HTTP ${s} at ${url}`);
    if (attempt >= 3) throw new Stop(`${s} at ${url} after ${attempt + 1} tries`);
    const back = 10_000 * 3 ** attempt;
    log(`  ${s}, retry in ${back / 1000} s`);
    await new Promise((r) => setTimeout(r, back));
  }
}

function recordPage(url, html) {
  const o = parseOutline(html);
  state.pages[url] = o ? { outline: o.outline, hash: o.hash, seen: today } : { error: 'no article' };
}

async function main() {
  const robots = await get(`${BASE}/robots.txt`);
  if (robots.status !== 200) throw new Stop(`robots.txt: ${robots.status}`);
  rules = robotsRules(robots.html, UA);
  if (!robotsAllows(rules, INDEX)) throw new Stop(`robots.txt disallows ${INDEX} for ${UA}`);

  if (!state.slugs) {
    if (ONLY.length) state.slugs = ONLY;
    else {
      const r = await get(INDEX);
      if (r.status !== 200) throw new Stop(`index: ${r.status}`);
      const slugs = parseIndex(r.html);
      if (slugs.length < 30) throw new Stop(`index lists only ${slugs.length} tutorials (expected ~35): markup changed?`);
      state.slugs = [...slugs, ...EXTRA.filter((s) => !slugs.includes(s))];
    }
    save();
  }
  for (const slug of state.slugs) {
    if (state.tocs[slug]) continue;
    const url = `${BASE}/${slug}/index.htm`;
    const r = await get(url);
    if (r.status !== 200) throw new Stop(`table of contents ${url}: ${r.status}`);
    const toc = parseToc(r.html, slug);
    const n = toc.sections.reduce((k, s) => k + s.chapters.length, 0);
    if (!n) throw new Stop(`table of contents ${url} parsed to 0 chapters: markup changed?`);
    state.tocs[slug] = { ...toc, index: url };
    recordPage(url, r.html); // the index page is also the "Home" chapter: no second request
    log(`toc ${slug}: ${n} chapters`);
    save();
  }
  const urls = [...new Set(state.slugs.flatMap((s) => state.tocs[s].sections.flatMap((x) => x.chapters.map((c) => c.url))))];
  let done = 0;
  for (const url of urls) {
    done++;
    if (state.pages[url]) continue;
    const old = prevPage.get(url);
    if (!FULL && old && daysBetween(old.seen, today) < DAYS) continue;
    if (!url.startsWith(`${BASE}/`)) { state.pages[url] = { error: 'external' }; continue; }
    const r = await get(url);
    if (r.status === 200) recordPage(url, r.html);
    else state.pages[url] = { error: String(r.status) };
    const p = state.pages[url];
    log(`[${done}/${urls.length}] ${url.slice(BASE.length)} ${p.error ?? `${p.outline.length} headings`}`);
    save();
  }
  finish();
}

function finish() {
  const failures = [];
  const crawled = state.slugs.map((slug) => {
    const t = state.tocs[slug];
    const sections = t.sections.map((s) => ({
      section: s.section,
      chapters: s.chapters.map((c) => {
        const p = state.pages[c.url];
        const old = prevPage.get(c.url);
        if (p?.error) failures.push({ url: c.url, status: p.error });
        const keep = p && !p.error ? p : old ? { outline: old.outline, hash: old.hash, seen: old.seen } : {};
        return { ...c, ...keep, ...(p?.error ? { error: p.error } : {}) };
      }),
    }));
    const chapters = sections.reduce((k, s) => k + s.chapters.length, 0);
    return { slug, title: t.title, index: t.index, chapters, sections };
  });
  const others = prev.tutorials.filter((t) => !state.slugs.includes(t.slug));
  const tutorials = sortTutorials(ONLY.length ? [...prev.tutorials.map((t) => crawled.find((c) => c.slug === t.slug) ?? t), ...crawled.filter((c) => !prev.tutorials.some((t) => t.slug === c.slug))] : crawled);
  const outlines = tutorials.flatMap((t) => t.sections.flatMap((s) => s.chapters)).filter((c) => c.outline).length;
  const out = {
    source: INDEX,
    fetched: today,
    method: 'table of contents of each tutorial index page + h2/h3 heading texts and a text hash of each chapter page; no page text is stored',
    crawl: { ua: UA, delayMs: DELAY, robots: 'checked', requests: state.requests, started: state.started, only: ONLY.length ? ONLY : undefined, failures },
    tutorials,
  };
  const d = diffRoutes(prev.tutorials, tutorials, state.slugs);
  writeFileSync(new URL('tutorial-changes.md', OUT), changesMd(d, { date: today, prevDate: prev.fetched, scope: state.slugs, failures }));
  writeFileSync(prevFile, JSON.stringify(out, null, 1) + '\n');
  rmSync(STATE, { force: true });
  log(`done: ${tutorials.length} tutorials (${crawled.length} crawled, ${others.length} kept), ${outlines} outlines, ${failures.length} failures, ${state.requests} requests`);
  log(`changes: +${d.added.length} −${d.removed.length} renamed ${d.renamed.length} moved ${d.moved.length} content ${d.changed.length}`);
}

process.on('SIGINT', () => { save(); log('interrupted; state saved, rerun to resume'); process.exit(2); });
try {
  await main();
} catch (e) {
  save();
  log(e instanceof Stop ? `STOP: ${e.message}` : e.stack);
  log('state saved in .kb-crawl-state.json; rerun the same command to resume');
  process.exit(2);
}
