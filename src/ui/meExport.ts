import type { Card } from '../dashboard';
import type { DomainId } from '../domains';
import type { Params } from '../i18n';
import { exportText, type ExportKey } from '../i18n/meExport';
import type { PortfolioEntry, PortfolioLevels } from '../me';
import { dashFile, importDash, pictureCards, portfolioMd, touchesSandbox } from '../meExport';
import type { MeDeps } from './meView';

/**
 * v33 (L536): the #/me exports (portfolio zip, take-home file, dashboard card file in and out, card pictures, the share
 * guard), moved out of meView into their own lazy chunk (`meExport`), loaded by meView on the first click that needs one
 * (meView keeps the button state, the file picker and the failure sentence). Like meView it imports only types from main
 * modules; every main value comes through `initExport` (Plan 6 U3).
 */
let d: MeDeps;
let readName: () => string;
export function initExport(deps: MeDeps, name: () => string): void {
  d = deps;
  readName = name;
}

const m = (k: ExportKey, p?: Params): string => exportText(d.getLang(), k, p);
/** V19-D (L170): card pictures, the zip and the take-home file, a lazy chunk of their own. */
const pngChunk = (): Promise<typeof import('./portfolioPng')> => import('./portfolioPng');

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  d.h('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * V19-D (L170): a domain portfolio is a zip, README.md + cards/<id>.png (GitHub strips `data:` images in Markdown). Only
 * cards that ran on this device, are not marked slow and read no imported data are run again for a picture (imported SQL
 * never runs by itself, review-log Plan 5); the others keep their SQL only. Returns the sentence to show; throws on failure.
 */
export async function savePortfolio(dom: DomainId, what: string, entries: PortfolioEntry[], levels: PortfolioLevels, say: (msg: string) => void): Promise<string> {
  const lang = d.getLang();
  const imported = await d.importedNames(); // FIX-1: stored imports too, even before restore ends
  const cards = d.domainSlot(d.app.save, dom).dashboard.cards;
  const shoot = pictureCards(cards, imported, d.ranHere);
  const pp = await pngChunk();
  const pics = await pp.cardPictures(dom, shoot, {
    run: d.run, cardBody: d.cardBody, cardClass: d.cls.cx(d.cls.CARD, 'flex flex-col gap-3 p-4'), footer: m('png.footer'),
    onCard: (i) => say(m('pf.shooting', { i: i + 1, n: shoot.length })),
  });
  const at = new Date();
  const md = portfolioMd({
    lang, scope: dom, what, name: readName(), date: at.toLocaleDateString(d.locale()), entries, cards, imported, pics: new Set(pics.keys()), levels,
  });
  download(`boondata-${dom}-portfolio.zip`, pp.portfolioZip(md, pics, at));
  return m('pf.saved', { n: entries.length, p: pics.size });
}

/** V19-D (L170): the take-homes the learner handed in, as one Markdown file; only on their own click (interviewPrefs). */
export async function saveTakeHomes(): Promise<string> {
  const lang = d.getLang();
  const [content, pp, imported] = await Promise.all([d.loadInterview(), pngChunk(), d.importedNames()]);
  const prefs = d.interviewPrefs();
  const entries = d.passedTakeHomes(prefs).flatMap((r) => {
    const th = content.takeHomes.find((x) => x.id === r.id);
    if (!th) return [];
    const live = prefs.live[r.id]?.phase === 'done' ? prefs.live[r.id] : undefined; // a run started again holds drafts, not passed SQL
    return [{
      title: th.title[lang], brief: th.brief[lang], text: r.text,
      steps: th.steps.map((st) => {
        const sql = live?.passed[st.id];
        return { title: st.title[lang], ...(sql && !touchesSandbox(sql, imported) ? { sql } : {}) };
      }),
      rubric: th.rubric.map((line, i) => ({ line: line[lang], ticked: r.checks.includes(i) })),
    }];
  });
  const md = pp.takeHomeMd({ lang, name: readName(), date: new Date().toLocaleDateString(d.locale()), entries });
  download('boondata-take-home-portfolio.md', new Blob([md], { type: 'text/markdown' }));
  return m('pf.th.saved', { n: entries.length });
}

// ---------- dashboard: file export/import and card pictures (v7 §5.1) ----------

/** Downloads the open domain's cards (title, kind, SQL); cards on imported data stay out. Returns the sentence to show. */
export async function exportDash(): Promise<string> {
  const dom = d.activeDomain();
  const { file, dropped } = dashFile(dom, d.domainSlot(d.app.save, dom).dashboard.cards, await d.importedNames());
  if (file.cards.length) download(`boondata-${dom}.boondash.json`, new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
  return [file.cards.length ? m('dash.exported', { n: file.cards.length }) : m('dash.nothing'), dropped ? m('dash.dropped', { n: dropped }) : ''].join(' ').trim();
}

/** The picked card file (meView opens the picker inside the click): cards added at the end, never run by themselves. */
export async function importDashFile(f: File | undefined): Promise<string | undefined> {
  if (!f || f.size > 1e6) return f && m('dash.badFile');
  const dom = d.activeDomain();
  const slot = d.domainSlot(d.app.save, dom).dashboard;
  const r = importDash(await f.text(), dom, slot.cards, d.readDashboard, d.DOMAINS.map((x) => x.id));
  if ('error' in r) {
    const other = r.error === 'domain' ? d.t(d.DOMAINS.find((x) => x.id === r.domain)!.name) : '';
    return r.error === 'domain' ? m('dash.otherDomain', { domain: other }) : m('dash.badFile');
  }
  slot.cards = r.cards;
  d.persist(true);
  return [m('dash.imported', { n: r.added }), r.skipped ? m('dash.full', { n: r.skipped, max: d.MAX_CARDS }) : ''].join(' ').trim();
}

/** FIX-1 (L147): a share link never carries SQL that reads the player's imported tables (stored ones too) or `sandbox.`. */
export const readsImported = async (sql: string): Promise<boolean> => touchesSandbox(sql, await d.importedNames());

/** One card as a PNG (title, what the card shows, "BoonData · fictional data"); refused for cards on imported data. */
export async function cardPng(article: HTMLElement, c: Card): Promise<string> {
  if (touchesSandbox(c.sql, await d.importedNames())) return m('dash.pngSandbox');
  const blob = await (await pngChunk()).cardBlob(article, c, m('png.footer')); // V19-D: the drawing lives in the portfolioPng chunk
  if (!blob) return m('dash.pngWait');
  download(`boondata-${d.activeDomain()}-${c.id}.png`, blob);
  return m('dash.pngDone', { title: c.title });
}
