import type * as Content from '../content';
import type * as Dash from '../dashboard';
import type { Card } from '../dashboard';
import type { DomainId } from '../domains';
import type * as Domains from '../domains';
import type * as Home from '../home';
import type * as I18n from '../i18n';
import type * as Insights from '../insights';
import type * as Progress from '../progress';
import type * as Route from '../route';
import type * as SaveMod from '../save';
import type * as State from '../state';
import type * as Storage from '../storage';
import type * as Tickets from '../tickets';
import type { Ticket } from '../tickets';
import type * as Dom from './dom';
import type * as Icons from './icons';
import { meText, type MeKey } from '../i18n/me';
import {
  calendar, certificateSvg, dashFile, importDash as readDashFile, portfolioEntries, portfolioMd, strengths, topErrors, touchesSandbox,
  trySummary, type CertScope,
} from '../me';

/**
 * v16 "Của tôi" (I2 + I6, L142): the #/me page, certificates, portfolio and the dashboard's file/picture exports. A lazy chunk
 * (budget `me`): it imports only types from main modules and gets every main value through `initMe` (Plan 6 U3).
 * The page reads the Save and device prefs only: no query, no seed, no domain switch.
 */
export interface MeDeps {
  h: typeof Dom.h; announce: typeof Dom.announce; icon: typeof Icons.icon; skillIcon: typeof Icons.skillIcon;
  t: typeof I18n.t; getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  app: typeof State.app; persist: typeof State.persist; rerender: () => void;
  readJson: typeof Storage.readJson; writeJson: typeof Storage.writeJson;
  readErrors: typeof Insights.readErrors; readAttempts: typeof Insights.readAttempts;
  days: () => string[];
  loadTickets: typeof Content.loadTickets; loadDomain: typeof Content.loadDomain;
  chaptersOf: typeof Progress.chaptersOf; rankOf: typeof Progress.rankOf; SKILLS: typeof Progress.SKILLS;
  knownSkills: typeof Home.knownSkills; textOf: typeof Tickets.textOf;
  DOMAINS: typeof Domains.DOMAINS; DOMAIN_ID: typeof Domains.DOMAIN_ID; activeDomain: typeof Domains.activeDomain;
  domainSlot: typeof SaveMod.domainSlot; readDashboard: typeof Dash.readDashboard; MAX_CARDS: number;
  hashOf: typeof Route.hashOf; importedNames: () => Promise<string[]>;
  cls: { CARD: string; BTN_GO: string; BTN_SECONDARY: string; cx: (...p: (string | false | null | undefined)[]) => string };
}
let d: MeDeps;
export const initMe = (deps: MeDeps): void => void (d = deps);

const m = (k: MeKey, p?: I18n.Params): string => meText(d.getLang(), k, p);
const NAME_KEY = 'cargo-query/me-name'; // device pref (v7 §5.2), never in the Save
const readName = (): string => {
  const v = d.readJson<unknown>(NAME_KEY);
  return typeof v === 'string' ? v.slice(0, 60) : '';
};
const isDrill = (id: string): boolean => id.startsWith('g-');

// ---------- domain content: loaded once, only for domains the player has played ----------

const state = new Map<DomainId, 'loading' | 'done' | 'failed'>();
const played = (id: DomainId): boolean => id === 'logistics' || d.app.save.completed.some((x) => d.DOMAIN_ID[id].test(x));
function ticketsOf(id: DomainId): Ticket[] | undefined {
  if (id === 'logistics') return d.loadTickets('logistics');
  if (!played(id)) return [];
  const s = state.get(id);
  if (s === 'done') return d.loadTickets(id);
  if (!s) {
    state.set(id, 'loading');
    d.loadDomain(id).then(() => state.set(id, 'done'), () => state.set(id, 'failed')).finally(() => d.rerender());
  }
  return s === 'failed' ? [] : undefined;
}

interface Scope { scope: CertScope; what: string; open: boolean; lock: string; tasks: number; skills: number; rank?: string; tickets: Ticket[] }
function scopes(): Scope[] {
  const lang = d.getLang();
  const done = new Set(d.app.save.completed);
  const out: Scope[] = d.DOMAINS.map((x) => {
    const ts = ticketsOf(x.id) ?? [];
    const last = ts.filter((t) => t.beat === 'boss').sort((a, b) => b.chapter - a.chapter)[0];
    const mine = ts.filter((t) => done.has(t.id));
    const rank = d.rankOf(ts, done, d.chaptersOf(x.id));
    return {
      scope: x.id, what: d.t(x.name), open: !!last && done.has(last.id), tickets: ts,
      lock: m('cert.locked', { what: last ? `${d.t(x.name)} · ${d.textOf(last, lang).title}` : d.t(x.name) }),
      tasks: mine.length, skills: new Set(mine.flatMap((t) => t.grants)).size, rank: (rank.career ?? rank.tier)?.[lang],
    };
  });
  const ids = d.SKILLS.map((s) => s.id);
  const known = d.knownSkills(d.app.save, d.loadTickets('logistics'), ids).size;
  out.push({
    scope: 'general', what: m('cert.general'), open: known === ids.length, tickets: [],
    lock: m('cert.lockedGeneral', { total: ids.length, n: known }), tasks: 0, skills: known,
  });
  return out;
}

// ---------- pictures and files ----------

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  d.h('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const svgUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
function png(svg: string, w: number, hgt: number, scale: number): Promise<Blob> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale);
      c.height = Math.round(hgt * scale);
      const g = c.getContext('2d');
      if (!g) return fail(new Error('no canvas'));
      g.scale(scale, scale);
      g.drawImage(img, 0, 0, w, hgt);
      c.toBlob((b) => (b ? ok(b) : fail(new Error('toBlob'))), 'image/png');
    };
    img.onerror = () => fail(new Error('image'));
    img.src = svgUrl(svg);
  });
}

/**
 * A sprite pose (index.html #mascot-sprite) as self-contained markup: every <use> replaced by a copy of what it points
 * to, gradients copied in, CSS variables resolved to the page's current values and classes dropped (no animation).
 */
function inlineSprite(id: string): string | undefined {
  const sym = document.getElementById(id);
  if (!sym) return undefined;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  for (const n of sym.childNodes) g.append(n.cloneNode(true));
  for (let guard = 0; guard < 8; guard++) {
    const uses = g.querySelectorAll('use');
    if (!uses.length) break;
    for (const u of uses) {
      const ref = document.getElementById((u.getAttribute('href') ?? '').slice(1));
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      if (ref) {
        for (const a of ref.attributes) if (a.name !== 'id') box.setAttribute(a.name, a.value);
        for (const n of ref.childNodes) box.append(n.cloneNode(true));
      }
      u.replaceWith(box);
    }
  }
  for (const el of g.querySelectorAll('[class]')) el.removeAttribute('class');
  let body = new XMLSerializer().serializeToString(g).replace(/ id="[^"]*"/g, '');
  const defs = [...new Set([...body.matchAll(/url\(#([\w-]+)\)/g)].map((x) => x[1]))]
    .map((ref) => document.getElementById(ref)).filter((x): x is HTMLElement => !!x).map((x) => new XMLSerializer().serializeToString(x)).join('');
  body = `<defs>${defs}</defs>${body}`;
  const root = getComputedStyle(document.documentElement);
  for (let guard = 0; guard < 6 && body.includes('var(--'); guard++) {
    body = body.replace(/var\(--([\w-]+)(?:,\s*([^()]*))?\)/g, (_, name: string, fb?: string) => root.getPropertyValue(`--${name}`).trim() || fb?.trim() || 'none');
  }
  return `<svg x="0" y="0" width="120" height="120" viewBox="0 0 120 120">${body}</svg>`;
}

function certSvg(s: Scope): string {
  return certificateSvg({
    scope: s.scope, lang: d.getLang(), name: readName(), what: s.what, tasks: s.tasks, skills: s.skills, rank: s.rank,
    date: new Date().toLocaleDateString(d.locale()), mascot: inlineSprite('boon-idle'),
  });
}

// ---------- the page ----------

const card = (...kids: (Node | string | null)[]): HTMLElement => d.h('section', { class: d.cls.cx(d.cls.CARD, 'space-y-3 p-5') }, ...kids);
const title = (text: string, icon: Icons.IconName): HTMLElement =>
  d.h('h2', { class: 'm-0 flex items-center gap-2 text-heading' }, d.icon(icon, 'size-5 text-accent'), text);

function statsCard(): HTMLElement {
  const save = d.app.save;
  const sum = trySummary(d.readAttempts());
  const stat = (label: string, value: string) => d.h('div', { class: 'rounded-(--r-inset) bg-code p-3' },
    d.h('dt', { class: 'text-body-sm text-muted' }, label), d.h('dd', { class: 'm-0 text-heading font-extrabold tabular-nums' }, value));
  const num = (x: number, digits = 0) => x.toLocaleString(d.locale(), { maximumFractionDigits: digits });
  return card(
    d.h('div', { class: 'flex flex-wrap items-center gap-2' },
      d.h('p', { class: 'm-0 flex-1 text-body text-muted' }, m('intro')),
      d.h('span', { class: 'rounded-full bg-code px-2 py-0.5 text-caption font-semibold' }, m('deviceOnly'))),
    d.h('dl', { class: 'm-0 grid grid-cols-2 gap-3 sm:grid-cols-4' },
      stat(m('stat.done'), num(save.completed.filter((x) => !isDrill(x)).length)),
      stat(m('stat.first'), sum.passed ? `${num(Math.round(sum.first * 100))} %` : m('stat.none')),
      stat(m('stat.runs'), sum.passed ? num(sum.runs, 1) : m('stat.none')),
      stat(m('stat.hints'), num(Object.values(save.hintsUsed).reduce((a, b) => a + b, 0)))));
}

function skillsCard(all: Ticket[]): HTMLElement {
  const lang = d.getLang();
  const ids = d.SKILLS.map((s) => s.id);
  const list = strengths(d.knownSkills(d.app.save, all, ids), d.app.save.review);
  const row = (s: { id: string; box: number }) => {
    const skill = d.SKILLS.find((x) => x.id === s.id);
    return d.h('li', { class: 'grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 max-sm:grid-cols-[minmax(0,8rem)_1fr_4rem]' },
      d.h('a', { href: `${d.hashOf('learn')}/skill/${s.id}`, class: 'truncate text-body-sm' }, skill?.label[lang] ?? s.id),
      d.h('span', { class: 'block h-2.5 rounded-full bg-code', 'aria-hidden': 'true' },
        d.h('span', { class: s.box && s.box <= 2 ? 'block h-full rounded-full bg-warn' : 'block h-full rounded-full bg-accent', style: `width:${Math.max(4, s.box * 20)}%` })),
      d.h('span', { class: 'text-right text-body-sm text-muted tabular-nums' }, s.box ? m('skills.box', { box: s.box }) : m('skills.noCard')));
  };
  return card(title(m('skills.title'), 'sigma'),
    list.length
      ? d.h('div', {},
        d.h('p', { class: 'mt-0 mb-3 text-body-sm text-muted' }, m('skills.intro'), ' ',
          m('skills.sum', { solid: list.filter((s) => s.box >= 4).length, weak: list.filter((s) => s.box && s.box <= 2).length, n: list.length })),
        d.h('ul', { class: 'm-0 list-none space-y-2 p-0' }, ...list.slice(0, 8).map(row)),
        list.length > 8 ? d.h('details', { class: 'mt-2' }, d.h('summary', { class: 'cursor-pointer text-body-sm text-muted' }, m('skills.all', { n: list.length })),
          d.h('ul', { class: 'mt-2 mb-0 list-none space-y-2 p-0' }, ...list.slice(8).map(row))) : null)
      : d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('skills.none')));
}

const errLabel = (code: string): string => (ERR[`err.${code}`] ? m(`err.${code}` as MeKey) : m('err.other'));
const ERR: Record<string, true> = Object.fromEntries(['42703', '42P01', '42601', '42803', '42702', '42883', '42804', '22P02', '22012', '22007', '21000', '42P20'].map((c) => [`err.${c}`, true]));

function errorsCard(): HTMLElement {
  const top = topErrors(d.readErrors());
  return card(title(m('err.title'), 'alert'),
    top.length
      ? d.h('ol', { class: 'm-0 list-none space-y-1.5 p-0' }, ...top.map(([code, n]) => d.h('li', { class: 'flex flex-wrap items-baseline gap-x-2 text-body-sm' },
        d.h('span', { class: 'font-semibold' }, errLabel(code)),
        d.h('code', { class: 'rounded-(--r-chip) bg-code px-1.5 text-caption' }, code),
        d.h('span', { class: 'ml-auto text-muted tabular-nums' }, m('err.times', { n })))))
      : d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('err.none')));
}

function daysCard(): HTMLElement {
  const days = d.days();
  const weeks = 8;
  const cells = calendar(days, new Date(), weeks);
  const n = cells.filter((c) => c.on).length;
  return card(title(m('days.title', { w: weeks }), 'calendar'),
    d.h('div', { class: 'grid w-fit grid-flow-col grid-rows-7 gap-1', role: 'img', 'aria-label': m('days.label', { n, w: weeks }) },
      ...cells.map((c) => d.h('span', { class: c.on ? 'block size-3.5 rounded-sm bg-accent' : c.future ? 'block size-3.5 rounded-sm' : 'block size-3.5 rounded-sm bg-code ring-1 ring-line', title: c.day }))),
    d.h('p', { class: 'm-0 text-body-sm' }, m('days.total', { n: days.length })),
    d.h('p', { class: 'm-0 text-caption text-muted' }, m('days.note')));
}

function nextCard(all: Ticket[]): HTMLElement {
  const lang = d.getLang();
  const weak = strengths(d.knownSkills(d.app.save, all, d.SKILLS.map((s) => s.id)), d.app.save.review).find((s) => s.box > 0 && s.box <= 3);
  const err = topErrors(d.readErrors(), 1)[0];
  const skill = weak && d.SKILLS.find((s) => s.id === weak.id);
  const link = (href: string, text: string) => d.h('a', { href, class: d.cls.cx(d.cls.BTN_SECONDARY, 'inline-flex px-4 py-1.5 text-body-sm no-underline') }, text);
  return card(title(m('next.title'), 'route'),
    skill ? d.h('p', { class: 'm-0 text-body-sm' }, m('next.skill', { skill: skill.label[lang], box: weak.box })) : null,
    err ? d.h('p', { class: 'm-0 text-body-sm' }, m('next.err', { what: errLabel(err[0]), code: err[0], n: err[1] })) : null,
    skill ? link(`${d.hashOf('learn')}/skill/${skill.id}`, m('next.go', { skill: skill.label[lang] }))
      : d.h('div', { class: 'space-y-2' }, d.h('p', { class: 'm-0 text-body-sm' }, m('next.none')), link(d.hashOf('learn'), m('next.start'))));
}

function certCard(list: Scope[], waiting: boolean): HTMLElement {
  const imgs: [HTMLImageElement, Scope][] = [];
  const name = d.h('input', {
    id: 'me-name', type: 'text', maxlength: '60', autocomplete: 'name', value: readName(),
    class: 'w-full max-w-sm rounded-(--r-ctl) border border-line bg-panel px-3 py-2 text-body text-ink',
    oninput: (e: Event) => {
      d.writeJson(NAME_KEY, (e.target as HTMLInputElement).value.slice(0, 60));
      for (const [img, s] of imgs) img.src = svgUrl(certSvg(s));
    },
  });
  const item = (s: Scope): HTMLElement => {
    if (!s.open) {
      return d.h('li', { class: 'flex items-start gap-3 rounded-(--r-inset) bg-code p-3 text-body-sm' },
        d.icon('lock', 'mt-0.5 size-4 shrink-0 text-muted'),
        d.h('span', {}, d.h('b', {}, s.what), d.h('br'), d.h('span', { class: 'text-muted' }, s.lock)));
    }
    const img = d.h('img', { src: svgUrl(certSvg(s)), alt: m('cert.alt', { what: s.what }), class: 'block w-full', width: '1123', height: '794' });
    imgs.push([img, s]);
    const file = `boondata-${s.scope}-certificate`;
    return d.h('li', { class: 'overflow-hidden rounded-(--r-inset) ring-1 ring-line' },
      d.h('figure', { class: 'm-0' }, img,
        d.h('figcaption', { class: 'flex flex-wrap items-center gap-2 border-t border-line p-3' },
          d.h('b', { class: 'mr-auto text-body-sm' }, s.what),
          d.h('button', {
            type: 'button', class: d.cls.cx(d.cls.BTN_SECONDARY, 'flex items-center gap-1.5 px-3 py-1 text-body-sm'),
            onclick: () => void png(certSvg(s), 1123, 794, 1.5).then((b) => download(`${file}.png`, b), () => download(`${file}.svg`, new Blob([certSvg(s)], { type: 'image/svg+xml' }))),
          }, d.icon('download', 'size-4'), m('cert.png')),
          d.h('button', {
            type: 'button', class: d.cls.cx(d.cls.BTN_SECONDARY, 'flex items-center gap-1.5 px-3 py-1 text-body-sm'),
            onclick: () => download(`${file}.svg`, new Blob([certSvg(s)], { type: 'image/svg+xml' })),
          }, d.icon('download', 'size-4'), m('cert.svg')))));
  };
  return card(title(m('cert.title'), 'badge'),
    d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('cert.intro')),
    d.h('div', { class: 'space-y-1' },
      d.h('label', { for: 'me-name', class: 'block text-body-sm font-semibold' }, m('cert.name')), name,
      d.h('p', { class: 'm-0 text-caption text-muted' }, m('cert.nameNote'))),
    waiting ? d.h('p', { class: 'm-0 text-body-sm text-muted', 'aria-live': 'polite' }, m('loadingDomains')) : null,
    d.h('ul', { class: 'm-0 grid list-none gap-3 p-0' }, ...list.map(item)));
}

function portfolioCard(list: Scope[]): HTMLElement {
  const lang = d.getLang();
  const item = (s: Scope): HTMLElement | null => {
    if (s.scope === 'general') return null;
    const dom = s.scope;
    if (!s.open) return d.h('li', { class: 'flex items-center gap-2 text-body-sm text-muted' }, d.icon('lock', 'size-4'), m('pf.locked', { domain: s.what }));
    const entries = portfolioEntries(s.tickets, d.app.save, (tk) => d.textOf(tk, lang));
    const save = async () => {
      const imported = await d.importedNames(); // FIX-1: stored imports too, even before restore ends
      const md = portfolioMd({
        lang, scope: dom, what: s.what, name: readName(), date: new Date().toLocaleDateString(d.locale()), entries,
        cards: d.domainSlot(d.app.save, dom).dashboard.cards, imported,
      });
      download(`boondata-${dom}-portfolio.md`, new Blob([md], { type: 'text/markdown' }));
    };
    return d.h('li', { class: 'flex flex-wrap items-center gap-3' },
      d.h('button', { type: 'button', class: d.cls.cx(d.cls.BTN_GO, 'flex items-center gap-1.5 px-4 py-1.5 text-body-sm'), onclick: save }, d.icon('download', 'size-4'), m('pf.download', { domain: s.what })),
      d.h('span', { class: 'text-body-sm text-muted' }, m('pf.count', { n: entries.length })));
  };
  return card(title(m('pf.title'), 'book'),
    d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('pf.intro')),
    d.h('ul', { class: 'm-0 list-none space-y-2 p-0' }, ...list.map(item).filter((x): x is HTMLElement => !!x)));
}

/** The #/me page body (section `me` of <main id="home">), redrawn by rerender(). */
export function mePage(): HTMLElement {
  const list = scopes();
  const waiting = d.DOMAINS.some((x) => ticketsOf(x.id) === undefined);
  const all = list.flatMap((s) => s.tickets);
  return d.h('div', { class: 'space-y-6' },
    statsCard(),
    nextCard(all),
    skillsCard(all),
    d.h('div', { class: 'grid gap-6 md:grid-cols-2' }, errorsCard(), daysCard()),
    certCard(list, waiting),
    portfolioCard(list),
    d.h('p', { class: 'm-0 text-caption text-muted' }, m('data.note')));
}

// ---------- dashboard: file export/import and card pictures (v7 §5.1) ----------

/** Downloads the open domain's cards (title, kind, SQL); cards on imported data stay out. Returns the sentence to show. */
export async function exportDash(): Promise<string> {
  const dom = d.activeDomain();
  const { file, dropped } = dashFile(dom, d.domainSlot(d.app.save, dom).dashboard.cards, await d.importedNames());
  if (file.cards.length) download(`boondata-${dom}.boondash.json`, new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
  return [file.cards.length ? m('dash.exported', { n: file.cards.length }) : m('dash.nothing'), dropped ? m('dash.dropped', { n: dropped }) : ''].join(' ').trim();
}

/** Opens the file picker; `done` gets the sentence to show (cards added at the end, never run by themselves). */
export function importDashFile(done: (msg: string) => void): void {
  const input = d.h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    input.remove();
    if (!f || f.size > 1e6) return void (f && done(m('dash.badFile')));
    const dom = d.activeDomain();
    const slot = d.domainSlot(d.app.save, dom).dashboard;
    const r = readDashFile(await f.text(), dom, slot.cards, d.readDashboard, d.DOMAINS.map((x) => x.id));
    if ('error' in r) {
      const other = r.error === 'domain' ? d.t(d.DOMAINS.find((x) => x.id === r.domain)!.name) : '';
      return done(r.error === 'domain' ? m('dash.otherDomain', { domain: other }) : m('dash.badFile'));
    }
    slot.cards = r.cards;
    d.persist(true);
    done([m('dash.imported', { n: r.added }), r.skipped ? m('dash.full', { n: r.skipped, max: d.MAX_CARDS }) : ''].join(' ').trim());
  });
  document.body.append(input);
  input.click();
}

const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline'];
/** A chart <svg> copy whose look does not depend on the page's CSS (classes and variables resolved per element). */
function frozenSvg(svg: SVGSVGElement): { text: string; w: number; h: number } {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const from = [svg, ...svg.querySelectorAll('*')];
  const to = [copy, ...copy.querySelectorAll('*')];
  from.forEach((el, i) => {
    const cs = getComputedStyle(el);
    to[i].setAttribute('style', STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';'));
    to[i].removeAttribute('class');
  });
  const r = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const hgt = Math.max(1, Math.round(r.height));
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(w));
  copy.setAttribute('height', String(hgt));
  return { text: new XMLSerializer().serializeToString(copy), w, h: hgt };
}

/** One card as a PNG (title, what the card shows, "BoonData · fictional data"); refused for cards on imported data. */
/** FIX-1 (L147): a share link never carries SQL that reads the player's imported tables (stored ones too) or `sandbox.`. */
export const readsImported = async (sql: string): Promise<boolean> => touchesSandbox(sql, await d.importedNames());

export async function cardPng(article: HTMLElement, c: Card): Promise<string> {
  if (touchesSandbox(c.sql, await d.importedNames())) return m('dash.pngSandbox');
  const body = article.querySelector<HTMLElement>('[data-card-body][data-ready]'); // a card with a result (not its Run button)
  const chart = c.kind === 'bar' || c.kind === 'line' ? body?.querySelector<SVGSVGElement>(':scope > div > svg') : undefined;
  const table = c.kind === 'table' ? body?.querySelector('table') : undefined;
  const big = c.kind === 'number' ? body?.querySelector('p > span[aria-hidden=true]') : undefined;
  if (!body || (!chart && !table && !big)) return m('dash.pngWait');
  const cs = getComputedStyle(article);
  const bg = cs.backgroundColor;
  const ink = cs.color;
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || ink;
  const font = "Nunito, 'Segoe UI', system-ui, sans-serif";
  const W = 800;
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  if (!g) return m('dash.pngWait');
  let rows: string[][] = [];
  let pic: { img: HTMLImageElement; w: number; h: number } | undefined;
  if (chart) {
    const f = frozenSvg(chart);
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error('image'));
      img.src = svgUrl(f.text);
    });
    const k = Math.min(1, (W - 48) / f.w);
    pic = { img, w: f.w * k, h: f.h * k };
  } else if (table) {
    // Header cells: the column name only (not the type line or the screen-reader label); the row-number column is left out.
    const cell = (x: Element): string => (x.tagName === 'TH' ? [...x.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('') : x.textContent ?? '').trim();
    rows = [...table.querySelectorAll('tr')].slice(0, 11).map((tr) => [...tr.querySelectorAll('th,td')].map(cell).slice(1));
  }
  const bodyH = pic ? pic.h : table ? rows.length * 30 + 8 : 80;
  const H = 72 + bodyH + 56;
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  g.scale(scale, scale);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = ink;
  g.font = `700 22px ${font}`;
  g.fillText(c.title.slice(0, 70), 24, 44);
  if (pic) g.drawImage(pic.img, 24, 64, pic.w, pic.h);
  else if (table) {
    const n = Math.max(1, ...rows.map((r) => r.length));
    const colW = (W - 48) / n;
    rows.forEach((r, i) => {
      g.font = `${i === 0 ? 700 : 400} 15px ${font}`;
      g.fillStyle = i === 0 ? muted : ink;
      r.forEach((cell, j) => {
        let s = cell;
        while (s.length > 1 && g.measureText(s).width > colW - 10) s = `${s.slice(0, -2)}…`;
        g.fillText(s, 24 + j * colW, 92 + i * 30);
      });
    });
  } else if (big) {
    g.font = `800 48px ${font}`;
    g.fillText((big.textContent ?? '').trim().slice(0, 30), 24, 132);
  }
  g.font = `600 13px ${font}`;
  g.fillStyle = muted;
  g.textAlign = 'right';
  g.fillText(m('png.footer'), W - 24, H - 22);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) return m('dash.pngWait');
  download(`boondata-${d.activeDomain()}-${c.id}.png`, blob);
  return m('dash.pngDone', { title: c.title });
}
