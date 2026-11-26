import { ENGINES, LEVELS, type EngineId, type Level } from '../engine/content';
import { aliasesOf, docFor, marker, parseGlossary, searchTerms, type Term } from '../engine/glossary';
import type * as I18n from '../i18n';
import { termsText, type TermsKey } from '../i18n/engineTerms';
import type { EngineDeps } from './engineView';
import type { PageSub } from './homeView';

/**
 * v27 (L410, design-v27 §1): the Database Engine glossary page (#/engine/terms[/<id>]: search, engine and level filters, a
 * "hide explanations" self-check, grouped by level) and the term buttons in lessons (first mention only, a native popover
 * opened by click or Enter, never on hover). Lazy chunk `engineTerms` (budget `engineTermsUi`; the YAML is `engineTermsSources`),
 * loaded by engineView beside a lesson's chunk; types only from main modules (Plan 6 U3). Usage is counted in the device pref
 * `cargo-query/engine-terms` (counts only, never in the Save; design-v27 Q10).
 */
let d: EngineDeps;
let terms: Term[] = [];
const NAME: Record<EngineId, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB', redis: 'Redis', design: '', stack: '', olap: '', search: '', graph: '' };
/** F15: design is never a glossary engine (glossary.ts ENG), so it gets no filter (it would match nothing); v47: Redis has no terms yet. */
const TERM_ENGINES = ENGINES.filter((e) => e !== 'design' && e !== 'stack' && e !== 'redis' && e !== 'olap' && e !== 'search' && e !== 'graph');
const tt = (key: TermsKey, params?: I18n.Params): string => termsText(d.getLang(), d.locale(), key, params);
const lang = (): 'vi' | 'en' => d.getLang();

export const USE_KEY = 'cargo-query/engine-terms';
/** `{ opened: { [term id]: n }, page: n }`; anything else reads as zero (ids must be glossary ids, ≤ 400 keys). */
export function parseUse(raw: unknown, ids: ReadonlySet<string>): { opened: Record<string, number>; page: number } {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const n = (x: unknown): number => (typeof x === 'number' && Number.isInteger(x) && x > 0 ? Math.min(x, 1e6) : 0);
  const opened = o.opened && typeof o.opened === 'object' ? Object.entries(o.opened as Record<string, unknown>).filter(([k, v]) => ids.has(k) && n(v)).slice(0, 400) : [];
  return { opened: Object.fromEntries(opened.map(([k, v]) => [k, n(v)])), page: n(o.page) };
}
function count(f: (u: ReturnType<typeof parseUse>) => void): void {
  const u = parseUse(d.prefs.read(USE_KEY), new Set(terms.map((t) => t.id)));
  f(u);
  d.prefs.write(USE_KEY, u);
}

export function initTerms(deps: EngineDeps, raw: unknown): void {
  d = deps;
  terms = parseGlossary(raw).sort((a, b) => a.level.localeCompare(b.level) || a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const onPage = (): void => { if (d.engineTermsOf(location.hash) !== undefined) count((u) => { u.page++; }); };
  onPage();
  addEventListener('hashchange', onPage);
}

/** F29: scrolls only the page's own scroll box (#home), so the document and the top bar never move. */
function scrollHome(el: HTMLElement): void {
  const box = el.closest<HTMLElement>('#home');
  if (!box || box.scrollHeight <= box.clientHeight) { el.scrollIntoView?.({ block: 'start' }); return; } // #home is no scroll box here: the page scrolls
  box.scrollTo?.({ top: box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - 16 });
}

/** `code` spans as <code>; nothing else is interpreted. */
const rich = (text: string): (Node | string)[] =>
  text.split(/(`[^`\n]+`)/).filter(Boolean).map((p) => (p.length > 1 && p.startsWith('`') && p.endsWith('`') ? d.h('code', {}, p.slice(1, -1)) : p));
const levelChip = (lv: Level): HTMLElement => d.h('span', { class: d.cls.cx(d.cls.PILL, 'bg-code text-ink') }, lv);
const docLink = (t: Term, href = t.doc): HTMLElement => d.h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: 'inline-flex items-center gap-1.5' },
  d.icon('external', 'size-4 shrink-0'), tt('docs'), d.h('span', { class: 'sr-only' }, ` (${tt('newTab')})`));
/** The VI word under the English one, when it differs (it may hold `code`). */
const viLine = (t: Term): HTMLElement | null => (lang() === 'vi' && t.viTerm.replace(/`/g, '') !== t.term ? d.h('span', { class: 'text-muted' }, ...rich(t.viTerm)) : null);

// ---- the term button and its popover (design-v27 §1.3)

/** Where an open popover sits: under its button from 640 px (fixed, measured once at opening), a bottom sheet below. */
function place(btn: HTMLElement, pop: HTMLElement): void {
  if (innerWidth < 640) { pop.style.top = pop.style.left = ''; return; }
  const r = btn.getBoundingClientRect();
  const w = Math.min(352, innerWidth - 32);
  pop.style.left = `${Math.max(16, Math.min(r.left, innerWidth - 16 - w))}px`;
  pop.style.top = `${Math.min(r.bottom + 6, Math.max(16, innerHeight - 260))}px`;
}

/** `engine`: the lesson's; its docs page wins, another engine's page is never shown (v35 R1, E09). */
function termButton(t: Term, text: string, engine: EngineId): Node[] {
  const doc = docFor(t, engine);
  const { h, cls } = d;
  const pid = `tp-${t.id}`;
  const btn = h('button', {
    type: 'button', popovertarget: pid, 'aria-expanded': 'false', 'data-term': t.id,
    class: 'inline min-h-6 cursor-pointer border-0 bg-transparent p-0 px-0.5 py-0.5 [font:inherit] text-accent underline decoration-dotted underline-offset-4 hover:bg-accent-soft',
  }, text);
  const pop = h('span', {
    id: pid, popover: 'auto', role: 'dialog', 'aria-labelledby': `${pid}-h`,
    class: 'fixed m-0 inset-auto border-0 w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-(--r-card) bg-panel p-4 text-body-sm text-ink ring-1 ring-line shadow-(--shadow-2) [&:popover-open]:flex max-sm:inset-x-4 max-sm:bottom-18 max-sm:w-auto',
  },
  h('span', { class: 'flex flex-wrap items-baseline gap-x-2 gap-y-1' }, h('strong', { id: `${pid}-h`, lang: 'en', class: 'text-body' }, t.term), viLine(t), levelChip(t.level)),
  h('span', { class: 'block' }, ...rich(t[lang()])),
  h('span', { class: 'flex flex-wrap items-center gap-x-4 gap-y-1' },
    h('a', { href: d.engineTermsHash(t.id) }, `${tt('open')} →`), doc ? docLink(t, doc) : null,
    h('button', { type: 'button', popovertarget: pid, popovertargetaction: 'hide', class: cls.cx(cls.BTN_GHOST, 'ml-auto px-3 py-1') }, tt('pop.close'))));
  pop.addEventListener('beforetoggle', (e) => {
    const open = (e as Event & { newState?: string }).newState === 'open';
    if (open) place(btn, pop);
    else if (pop.contains(document.activeElement)) queueMicrotask(() => btn.focus()); // focus back to the button it came from
  });
  pop.addEventListener('toggle', (e) => {
    const open = (e as Event & { newState?: string }).newState === 'open';
    btn.setAttribute('aria-expanded', String(open));
    if (open) count((u) => { u.opened[t.id] = (u.opened[t.id] ?? 0) + 1; });
  });
  return [btn, pop];
}

/**
 * One per lesson draw (the page is rebuilt on every rerender, so the first mention is found again each time): `inline`
 * turns plain text into text + term buttons, `list` is the closing "Terms in this lesson" (every term the prose named).
 */
export function lessonMarker(engine: EngineId, level: Level): { inline: (text: string) => (Node | string)[]; list: () => HTMLElement | null } {
  const m = marker(terms, engine, level);
  return {
    inline: (text) => m.mark(text).flatMap((p): (Node | string)[] => (typeof p === 'string' ? [p] : termButton(p.term, p.text, engine))),
    list: () => (m.seen.length ? d.h('details', { class: 'rounded-(--r-card) bg-panel p-4 ring-1 ring-line', 'data-terms': '' },
      d.h('summary', { class: 'cursor-pointer font-bold' }, tt('inLesson', { n: m.seen.length })),
      d.h('ul', { class: 'mt-3 mb-0 grid list-none gap-x-6 gap-y-1 p-0 text-body-sm sm:grid-cols-2' }, ...m.seen.map((t) =>
        d.h('li', {}, d.h('a', { href: d.engineTermsHash(t.id), lang: 'en' }, t.term), lang() === 'vi' && t.viTerm.replace(/`/g, '') !== t.term ? d.h('span', { class: 'text-muted' }, ' · ', ...rich(t.viTerm)) : null)))) : null),
  };
}

// ---- the glossary page (design-v27 §1.2)

const f = { q: '', engines: new Set<EngineId>(ENGINES), levels: new Set<Level>(LEVELS), hide: false };
let focused: string | undefined; // the deep-linked id already scrolled to (once per hash, never on a redraw)

export function subOf(): PageSub {
  return { title: tt('title'), trail: [{ href: d.hashOf('engine'), text: d.t('nav.engine') }] };
}

function entry(t: Term): HTMLElement {
  const { h } = d;
  const text = h('p', { class: 'm-0' }, ...rich(t[lang()]));
  return h('article', { id: `term-${t.id}`, class: 'flex flex-col gap-2 rounded-(--r-card) bg-panel p-4 ring-1 ring-line', 'aria-labelledby': `term-${t.id}-h` },
    h('h3', { id: `term-${t.id}-h`, tabindex: '-1', class: 'm-0 flex flex-wrap items-baseline gap-x-2 text-title font-bold' }, h('span', { lang: 'en' }, t.term), viLine(t) ? h('span', { class: 'text-body font-normal' }, viLine(t)) : null),
    h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, ...t.engines.map((e) => h('span', { class: d.cls.cx(d.cls.PILL, 'bg-accent-soft text-ink') }, NAME[e])), levelChip(t.level)),
    f.hide ? h('details', {}, h('summary', { class: 'cursor-pointer text-body-sm font-semibold text-accent-ink' }, tt('show')), text) : text,
    lang() === 'vi' && t.avoid ? h('p', { class: 'm-0 text-body-sm text-muted' }, tt('avoid', { x: t.avoid })) : null,
    h('p', { class: 'm-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm' }, docLink(t), // v47 S2 (I7): the term's lesson
      d.track?.termLink(d, [t.term, ...aliasesOf(t)], t.engines, t.level, `${NAME[t.engines[0]] ?? ''} ${t.level}`.trim()) ?? null));
}

function list(): HTMLElement[] {
  const { h } = d;
  const found = searchTerms(terms, f.q, f.engines, f.levels);
  const status = h('p', { role: 'status', class: 'm-0 text-body-sm text-muted' }, tt('count', { n: found.length }));
  if (!found.length) {
    return [status, h('div', { class: 'flex flex-col items-start gap-3 rounded-(--r-card) bg-panel p-6 ring-1 ring-line' },
      h('p', { class: 'm-0' }, tt('none')),
      h('button', { type: 'button', class: d.cls.cx(d.cls.BTN_SECONDARY, 'px-4 py-1.5'), onclick: () => { f.q = ''; f.engines = new Set(ENGINES); f.levels = new Set(LEVELS); d.rerender(); } }, tt('clear')))];
  }
  const lvs = LEVELS.filter((lv) => found.some((t) => t.level === lv));
  // F14: jump to a level and back to the top (buttons: the router owns the hash); F29: only #home scrolls, never the document
  const jump = (id: string): void => { const el = document.getElementById(id); if (el) scrollHome(el); el?.focus({ preventScroll: true }); };
  const btn = (text: string, id: string, label?: string): HTMLElement => h('button', { type: 'button', class: d.cls.cx(d.cls.BTN_GHOST, 'px-3 py-1 text-body-sm'), 'aria-label': label ?? false, onclick: () => jump(id) }, text);
  return [status, lvs.length > 1 ? h('nav', { class: 'flex flex-wrap items-center gap-1', 'aria-label': tt('jump') }, ...lvs.map((lv) => btn(lv, `terms-${lv}`, `${tt('jump')} ${lv}`))) : null,
    ...lvs.map((lv) =>
      h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': `terms-${lv}` },
        h('h2', { id: `terms-${lv}`, tabindex: '-1', class: d.ui.GROUP_TITLE }, `${tt('group', { lv })} · ${found.filter((t) => t.level === lv).length}`),
        ...found.filter((t) => t.level === lv).map(entry),
        h('p', { class: 'm-0' }, btn(tt('top'), 'terms-q'))))].filter((x): x is HTMLElement => !!x);
}

/** `#/engine/terms[/<id>]`: a known id loosens the filters until it shows, then gets the focus once. */
export function termsPage(id: string): HTMLElement {
  const { h } = d;
  const t = id ? terms.find((x) => x.id === id) : undefined;
  if (t && focused !== id) {
    if (!searchTerms([t], f.q, f.engines, f.levels).length) { f.q = ''; t.engines.forEach((e) => f.engines.add(e)); f.levels.add(t.level); }
    focused = id;
    queueMicrotask(() => {
      const el = document.getElementById(`term-${id}-h`);
      if (el) scrollHome(el);
      el?.focus({ preventScroll: true });
    });
  }
  if (!id) focused = undefined;
  const results = h('div', { class: 'flex flex-col gap-6', 'data-terms-list': '' }, ...list());
  const redraw = (): void => results.replaceChildren(...list()); // typing never rebuilds the page (the field keeps its caret)
  const check = <T extends string>(set: Set<T>, v: T, label: string): HTMLElement => h('label', { class: 'inline-flex min-h-6 cursor-pointer items-center gap-2 rounded-full bg-code px-3 py-1 text-body-sm has-[:checked]:bg-accent-soft' },
    h('input', { type: 'checkbox', checked: set.has(v), 'data-ek': `terms-${v}`, onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) set.add(v); else set.delete(v); redraw(); } }), label);
  const search = h('input', { type: 'search', id: 'terms-q', value: f.q, 'data-ek': 'terms-q', 'aria-describedby': 'terms-q-hint', autocomplete: 'off',
    class: 'min-h-11 w-full rounded-(--r-ctl) bg-panel px-3 ring-1 ring-line-strong', oninput: (e: Event) => { f.q = (e.target as HTMLInputElement).value; redraw(); } });
  return h('div', { class: 'flex min-w-0 flex-col gap-6 wrap-anywhere' }, // F28: long identifiers (`ProvisionedThroughputExceededException`) wrap at 375 px
    h('p', { class: 'm-0 text-muted' }, tt('intro')),
    h('search', { class: 'flex flex-col gap-3 rounded-(--r-card) bg-surface-2 p-4' },
      h('div', { class: 'flex flex-col gap-1' }, h('label', { for: 'terms-q', class: 'font-bold' }, tt('search')), search,
        h('p', { id: 'terms-q-hint', class: 'm-0 text-caption text-muted' }, tt('search.hint'))),
      h('fieldset', { class: 'm-0 flex flex-wrap items-center gap-2 border-0 p-0' }, h('legend', { class: 'mb-1 p-0 text-body-sm font-bold' }, tt('engines')), ...TERM_ENGINES.map((e) => check(f.engines, e, NAME[e]))),
      h('fieldset', { class: 'm-0 flex flex-wrap items-center gap-2 border-0 p-0' }, h('legend', { class: 'mb-1 p-0 text-body-sm font-bold' }, tt('levels')), ...LEVELS.map((lv) => check(f.levels, lv, lv))),
      h('label', { class: 'inline-flex min-h-6 cursor-pointer items-center gap-2 text-body-sm' },
        h('input', { type: 'checkbox', checked: f.hide, 'data-ek': 'terms-hide', onchange: (e: Event) => { f.hide = (e.target as HTMLInputElement).checked; redraw(); } }), tt('hide'))),
    results);
}
