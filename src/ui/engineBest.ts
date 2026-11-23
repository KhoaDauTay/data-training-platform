import { BP_TIPS_KEY, parseBpTips, type BpPref } from '../bpPref';
import {
  bestHash, bestRouteOf, BP_SECTIONS, explainOf, judge, needsPlan, parseBestCard, parseHabits, parseTracks, planScan, sideOf, sideScript,
  type BpCard, type BpMeta, type CardSource, type Habits, type Pair, type Side, type Track, type TrackId, type Verdict,
} from '../engine/best';
import type { Question } from '../engine/content';
import type { PgLabClient } from '../engine/pglab/client';
import type * as I18n from '../i18n';
import { bestText, type BestKey } from '../i18n/best';
import type { QueryResult } from '../db/run';
import type { EngineDeps } from './engineView';
import type { PageSub } from './homeView';
import type { Row } from './sidebar';

/**
 * BP-UI (v24, L346; product-design-best-practice §2–§3, §6): the Best Practice pages, #/engine/best/<track> (tabs, the
 * track's value line, Boon's tip switch, "Lỗi hay gặp", filters, the card grid, the quick check), #/engine/best/<track>/<id>
 * (rule, why, the Avoid / Prefer pair with "Run both", the check, avoid line, links, sources) and #/engine/best/habits.
 * Lazy chunk `engineBest` (budget `bpui`), loaded with the engine chunk by src/ui/engine.ts, which hands in the same
 * EngineDeps as engineView (Plan 6 U3: types only from main modules). Styled with the Engine redesign's pieces (L280).
 */
export interface BestSources {
  meta: Record<string, CardSource>; tracks: unknown; habits: unknown;
  full: Partial<Record<TrackId, () => Promise<{ cards: Record<string, CardSource> }>>>;
}
type LessonMeta = Record<string, { fm: unknown }>;

let d: EngineDeps;
/** Main values engineView does not take: a skill's label (content/skills.yml) for the skill chips. */
let main: { skill: (id: string) => { vi: string; en: string } | undefined; sourceTitle: (u: string) => string };
const rt = { of: bestRouteOf, hash: bestHash };
let index: BpMeta[] = [];
let tracks: Track[] = [];
let habits: Habits;
let fullSrc: BestSources['full'] = {};
let lessonsMeta: LessonMeta = {};
const bt = (key: BestKey, params?: I18n.Params): string => bestText(d.getLang(), d.locale(), key, params);
const lang = (): 'vi' | 'en' => d.getLang();
/** No icon of its own: a new duotone path costs main ~0.3 KB gz, the whole v24 allowance (L346). A star = a good habit. */
const BP_ICON = 'star';
const TRACK_KEY = 'cargo-query/bp-track';
const LEVEL_ORDER = (a: BpMeta, b: BpMeta): number => a.level.localeCompare(b.level) || a.code.localeCompare(b.code);

export function initBest(deps: EngineDeps, src: BestSources, lessons: LessonMeta, m: typeof main): void {
  d = deps;
  main = m;
  fullSrc = src.full;
  lessonsMeta = lessons;
  index = Object.entries(src.meta).map(([p, s]) => parseBestCard(s, p)).sort(LEVEL_ORDER);
  tracks = parseTracks(src.tracks);
  habits = parseHabits(src.habits);
}

// ---- full cards: one lazy chunk per track (bpsql, bppg), parsed on first open; a failed load is retried by Retry.
const loaded = new Map<TrackId, Map<string, BpCard> | 'loading' | 'failed'>();
function trackCards(t: TrackId): Map<string, BpCard> | 'loading' | 'failed' {
  const have = loaded.get(t);
  if (have) return have;
  const load = fullSrc[t];
  if (!load) return 'failed';
  loaded.set(t, 'loading');
  void load().then((m) => loaded.set(t, new Map(Object.entries(m.cards).map(([p, s]) => {
    const c = parseBestCard(s, p) as BpCard;
    return [c.id, c];
  }))), () => loaded.set(t, 'failed')).finally(() => d.rerender());
  return 'loading';
}

const done = (): Set<string> => new Set(d.app.save.completed);
const of = (t: TrackId): BpMeta[] => index.filter((c) => c.track === t);
const trackOf = (id: string): Track | undefined => tracks.find((t) => t.id === id);
const tips = (): BpPref => parseBpTips(JSON.stringify(d.prefs.read(BP_TIPS_KEY) ?? {}));
/** Merge-write: the tip's own `seen` and `fixed` stay (bpTip.ts writes them). */
const setTips = (f: (p: BpPref) => Partial<BpPref>): void => {
  const p = tips();
  d.prefs.write(BP_TIPS_KEY, { ...p, ...f(p) });
  d.rerender();
};

// ---- small text helpers (./content's blocksOf is engineView's: importing it would make a shared chunk)
function inline(text: string): (Node | string)[] {
  return text.split(/(`[^`\n]+`)/).filter(Boolean).flatMap((p) => (p.length > 1 && p.startsWith('`') && p.endsWith('`') ? [d.h('code', {}, p.slice(1, -1))]
    : p.split(/(\*\*[^*\n]+\*\*)/).filter(Boolean).map((q) => (q.length > 4 && q.startsWith('**') && q.endsWith('**') ? d.h('strong', {}, q.slice(2, -2)) : q))));
}
function prose(text: string): HTMLElement {
  const out: HTMLElement[] = [];
  const parts = text.replace(/\r\n/g, '\n').split(/^```[a-z]*\n([\s\S]*?)^```[ \t]*$/m);
  parts.forEach((part, i) => {
    if (i % 2) return void out.push(d.h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en', tabindex: '0' }, part.replace(/\n$/, '')));
    for (const para of part.trim().split(/\n\s*\n/).filter((x) => x.trim())) {
      const lines = para.split('\n').map((l) => l.trim());
      out.push(lines.every((l) => l.startsWith('- '))
        ? d.h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...lines.map((l) => d.h('li', {}, ...inline(l.slice(2)))))
        : d.h('p', { class: 'm-0' }, ...inline(lines.join(' '))));
    }
  });
  return d.h('div', { class: 'flex flex-col gap-3' }, ...out);
}
const section = (id: keyof typeof BP_SECTIONS, c: BpCard): string | undefined => c.sections.find((s) => s.id === id)?.text[lang()];
const pill = (cls: string, ...kids: (Node | string | null)[]): HTMLElement => d.h('span', { class: d.cls.cx(d.cls.PILL, cls) }, ...kids);
const linkBtn = (href: string, text: string, main = false): HTMLElement =>
  d.h('a', { href, class: d.cls.cx(main ? d.cls.BTN_SECONDARY : d.cls.BTN_GHOST, 'shrink-0 px-4 py-1.5 whitespace-nowrap no-underline') }, text);
function bar(k: number, n: number): HTMLElement {
  return d.h('div', { class: 'h-2 w-full overflow-hidden rounded-full bg-code', 'aria-hidden': 'true' },
    d.h('div', { class: d.cls.cx('h-full rounded-full', k && k === n ? 'bg-good' : 'bg-accent'), style: `width:${n ? Math.round((k / n) * 100) : 0}%` }));
}
const lead = (on: boolean): HTMLElement => d.h('span', { class: d.cls.cx('grid size-10 shrink-0 place-items-center rounded-full', on ? 'bg-good text-on-accent' : 'bg-accent-soft text-accent') },
  d.icon(on ? 'check' : BP_ICON, 'size-6'));

/** Focus survives a redraw (the page is rebuilt on every rerender): the element with the same data-ek gets it back. */
function keepFocus(): void {
  const key = document.activeElement?.closest('[data-ek]')?.getAttribute('data-ek');
  if (key) queueMicrotask(() => document.querySelector<HTMLElement>(`[data-ek="${CSS.escape(key)}"]`)?.focus());
}

/** v23 (L299) on Best Practice: a source reads as its title (engineView's sourceTitle, passed in), the URL stays the href. */
const srcLink = (u: string): HTMLElement => d.h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', title: u, class: 'inline-flex items-center gap-1.5' },
  d.icon('external', 'size-4 shrink-0'), main.sourceTitle(u));

// ---- pages

/** The page the hash names; a bare #/engine/best opens the remembered track, an unknown track SQL, an unknown card its track. */
export function bestPage(): HTMLElement {
  keepFocus();
  const r = rt.of(location.hash) ?? {};
  const go = (hash: string): HTMLElement => {
    queueMicrotask(() => location.replace(hash));
    return d.h('p', { class: 'm-0 min-h-40 text-muted' }, bt('loading'));
  };
  if (r.track === 'habits') return drawn(habitsPage());
  const t = trackOf(r.track ?? '');
  if (!t) {
    const kept = d.prefs.read<string>(TRACK_KEY);
    return go(rt.hash(!r.track && trackOf(kept ?? '') ? kept : 'sql'));
  }
  d.prefs.write(TRACK_KEY, t.id);
  if (!r.id) return drawn(gridPage(t));
  if (!of(t.id).some((c) => c.id === r.id)) return go(rt.hash(t.id));
  const cards = trackCards(t.id);
  if (cards === 'loading') return d.h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d.loader(), bt('loading'));
  if (cards === 'failed') {
    return d.h('div', { role: 'alert', class: 'flex flex-col gap-2' }, d.h('p', { class: 'm-0' }, bt('failed')),
      d.h('button', { type: 'button', class: 'self-start', onclick: () => { loaded.delete(t.id); d.rerender(); } }, bt('retry')));
  }
  return drawn(cardPage(cards.get(r.id)!));
}
/** #engine-page: smoke, ux-audit and the axe harness wait for it (drawn, not a loading line). */
const drawn = (el: HTMLElement): HTMLElement => Object.assign(el, { id: 'engine-page' });

/** The track switch (like the SQL | Engine switch: a nav of links, aria-current; engine-ux-spec §3.2), "SQL 9/30". */
function tabs(current: TrackId | undefined): HTMLElement {
  const ok = done();
  return d.h('nav', { 'aria-label': bt('tracks'), class: 'flex max-w-full gap-1 self-start overflow-x-auto rounded-full bg-code p-1' }, ...tracks.map((t) => {
    const all = of(t.id);
    return d.h('a', {
      href: rt.hash(t.id), 'aria-current': t.id === current ? 'page' : false,
      class: 'flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 font-bold whitespace-nowrap text-muted no-underline aria-[current=page]:bg-panel aria-[current=page]:text-ink aria-[current=page]:shadow-(--shadow-1)',
    }, bt('tab', { name: t.title[lang()], k: all.filter((c) => ok.has(c.id)).length, n: all.length }));
  }));
}

/** Boon's tip switch (§5.6): off for good, or every muted rule back on. Same pref as the tip itself. */
function tipsBox(): HTMLElement {
  const p = tips();
  return d.h('section', { class: d.cls.cx(d.cls.CARD, 'flex flex-wrap items-center gap-x-4 gap-y-2 p-4'), 'aria-label': bt('tips.label') },
    d.h('label', { class: 'flex min-h-11 cursor-pointer items-center gap-3 font-bold' },
      d.h('input', { type: 'checkbox', class: 'size-5', checked: !p.off, 'data-ek': 'bp-tips', onchange: (e: Event) => setTips(() => ({ off: !(e.target as HTMLInputElement).checked })) }),
      bt('tips.label')),
    d.h('p', { class: 'm-0 min-w-0 flex-1 text-body-sm text-muted' }, bt('tips.help')),
    p.mute.length ? d.h('button', { type: 'button', class: d.cls.cx(d.cls.BTN_GHOST, 'px-3 py-1.5'), 'data-ek': 'bp-unmute', onclick: () => setTips(() => ({ mute: [] })) },
      bt('tips.unmute', { n: p.mute.length })) : null);
}

interface Filter { areas: Set<string>; levels: Set<string>; todo: boolean }
const filters = new Map<TrackId, Filter>();
/** ux-route-v24 §6.2: every filter chip carries its count. */
function chip(text: string, n: number, on: boolean, key: string, flip: () => void): HTMLElement {
  return d.h('button', {
    type: 'button', 'aria-pressed': on ? 'true' : 'false', 'data-ek': key, onclick: () => { flip(); d.rerender(); },
    class: d.cls.cx('min-h-11 rounded-full px-3 py-1 text-body-sm font-semibold', on ? 'border-accent bg-accent-soft text-ink ring-1 ring-accent' : 'bg-panel text-ink'),
  }, text, d.h('span', { class: 'ml-1.5 tabular-nums text-muted' }, String(n)));
}
const toggle = (s: Set<string>, v: string): void => void (s.has(v) ? s.delete(v) : s.add(v));

function gridPage(t: Track): HTMLElement {
  const { h, cls } = d;
  const ok = done();
  const f = filters.get(t.id) ?? (filters.set(t.id, { areas: new Set(), levels: new Set(), todo: false }).get(t.id)!);
  const all = of(t.id);
  const shown = all.filter((c) => (!f.areas.size || f.areas.has(c.module)) && (!f.levels.size || f.levels.has(c.level)) && (!f.todo || !ok.has(c.id)));
  const levels = [...new Set(all.map((c) => c.level))].sort();
  const byId = new Map(index.map((c) => [c.id, c]));
  const gallery = t.gallery.map((id) => byId.get(id)).filter((c): c is BpMeta => !!c);
  return h('div', { class: 'flex flex-col gap-8', 'data-track': t.id },
    h('div', { class: 'flex flex-col gap-4' },
      h('p', { class: 'm-0 text-muted' }, bt('intro')),
      tabs(t.id),
      h('p', { class: 'm-0 rounded-(--r-inset) bg-info-soft px-4 py-3 text-body-sm text-ink' }, bt('after', { text: t.after[lang()] }))),
    tipsBox(),
    h('ul', { class: d.ui.LIST }, d.ui.listRow({
      lead: h('span', { class: 'grid size-10 place-items-center rounded-full bg-accent-soft text-accent' }, d.icon('list', 'size-6')),
      title: bt('habits.row'), sub: bt('habits.sub'), action: linkBtn(rt.hash('habits'), bt('habits.go'), true),
    })),
    gallery.length ? h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': 'bp-gallery' },
      h('h2', { id: 'bp-gallery', class: 'm-0 text-title font-bold' }, bt('gallery.title')),
      h('p', { class: 'm-0 text-body-sm text-muted' }, bt('gallery.lead')),
      h('ol', { class: 'm-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3' }, ...gallery.map((c, i) => h('li', { class: 'min-w-0' },
        h('a', { href: rt.hash(c.track, c.id), class: 'flex min-h-11 items-center gap-3 rounded-(--r-inset) bg-panel px-3 py-2 text-ink no-underline ring-1 ring-line hover:ring-accent' },
          h('span', { class: 'grid size-7 shrink-0 place-items-center rounded-full bg-code text-caption font-bold tabular-nums' }, String(i + 1)),
          h('span', { class: 'min-w-0 flex-1' }, c.title[lang()]), ok.has(c.id) ? d.icon('check', 'size-4 shrink-0 text-good') : null))))) : null,
    h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': 'bp-grid' },
      h('div', { class: 'flex items-baseline justify-between gap-3' },
        h('h2', { id: 'bp-grid', class: 'm-0 text-title font-bold' }, bt('grid.title')),
        h('span', { class: 'text-body-sm tabular-nums text-muted' }, bt('progress', { k: all.filter((c) => ok.has(c.id)).length, n: all.length }))),
      h('div', { role: 'group', 'aria-label': bt('filter.title'), class: 'flex flex-wrap gap-2' },
        ...t.areas.filter((a) => all.some((c) => c.module === a)).map((a) => chip(bt(`area.${a}` as BestKey), all.filter((c) => c.module === a).length, f.areas.has(a), `bp-f-${a}`, () => toggle(f.areas, a))),
        ...levels.map((lv) => chip(lv, all.filter((c) => c.level === lv).length, f.levels.has(lv), `bp-f-${lv}`, () => toggle(f.levels, lv))),
        chip(bt('filter.todo'), all.filter((c) => !ok.has(c.id)).length, f.todo, 'bp-f-todo', () => { f.todo = !f.todo; })),
      h('p', { class: 'sr-only', role: 'status' }, bt('grid.count', { n: shown.length })),
      shown.length ? h('ul', { class: 'm-0 grid list-none gap-4 p-0 md:grid-cols-2' }, ...shown.map((c) => gridCard(c, ok.has(c.id))))
        : h('p', { class: 'm-0 text-muted' }, bt('grid.none'))),
    quickBox(t, all.filter((c) => ok.has(c.id))));
}

/** One card in the grid (§2.3): a stretched link (L88), hover changes only the ring (L93). */
function gridCard(c: BpMeta, isDone: boolean): HTMLElement {
  const { h, cls } = d;
  return h('li', { class: 'relative flex cursor-pointer flex-col gap-2 rounded-(--r-card) bg-panel p-5 ring-1 ring-line hover:ring-accent max-sm:p-4', 'data-card': c.id },
    h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' },
      pill('bg-code text-ink', c.level), h('span', { class: 'font-bold tabular-nums text-muted' }, c.code.toUpperCase()),
      isDone ? pill(cls.DONE_PILL, d.icon('check', 'size-4'), bt('done')) : null),
    h('h3', { class: 'm-0 text-title font-bold' }, h('a', { href: rt.hash(c.track, c.id), class: 'text-ink no-underline after:absolute after:inset-0' }, c.title[lang()])),
    h('p', { class: 'm-0 text-body-sm text-muted' }, ...inline(bt('grid.avoid', { text: c.avoid[lang()] }))),
    c.lint ? h('p', { class: 'm-0' }, pill('bg-sun text-sun-ink', bt('grid.lint'))) : null);
}

// ---- quiz (§6): one question; also used by the quick check
interface QState { picks: Record<string, number>; says: Record<string, 'right' | 'wrong' | 'pick'>; wrongs: Record<string, number> }
function question(key: string, q: Question, st: QState, label: string, onRight: () => void): HTMLElement {
  const { h, cls } = d;
  const say = st.says[key];
  return h('fieldset', { class: 'm-0 flex flex-col gap-2 border-0 p-0', 'data-q': key },
    h('legend', { class: 'mb-2 p-0 font-bold' }, h('span', { class: 'block text-caption font-bold tracking-wider text-muted uppercase' }, label), ...inline(q.q[lang()])),
    ...d.optionOrder(key, q.options.length).map((i) => h('label', {
      class: cls.cx('flex min-h-11 cursor-pointer items-center gap-2 rounded-(--r-ctl) px-3 py-1 hover:bg-accent-soft has-[:checked]:bg-accent-soft has-[:checked]:ring-2 has-[:checked]:ring-accent',
        say === 'right' && st.picks[key] === i ? 'bg-good-soft ring-1 ring-good' : 'ring-1 ring-line'),
    }, h('input', { type: 'radio', name: key, value: String(i), 'data-ek': `${key}-${i}`, checked: st.picks[key] === i, onchange: () => { st.picks[key] = i; } }),
    h('span', {}, ...inline(q.options[i][lang()])))),
    h('div', { class: 'flex flex-wrap items-center gap-3' },
      h('button', {
        type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${key}-check`,
        onclick: () => {
          const pick = st.picks[key];
          st.says[key] = pick === undefined ? 'pick' : pick === q.answer ? 'right' : 'wrong';
          if (st.says[key] === 'wrong') st.wrongs[key] = (st.wrongs[key] ?? 0) + 1;
          if (st.says[key] === 'right') onRight();
          d.rerender();
        },
      }, bt('check')),
      h('p', { role: 'status', class: cls.cx('m-0 text-body-sm', say === 'right' ? 'good' : say ? 'bad' : '') }, say ? bt(say) : '')),
    say === 'right' || (st.wrongs[key] ?? 0) >= 2 ? h('p', { class: 'm-0 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm' }, ...inline(q.why[lang()])) : null);
}

// ---- quick check (§6): 5 random questions from the track's finished cards, 0 XP, nothing saved
const quick = new Map<TrackId, { qs: [BpCard, number][]; st: QState; right: Set<string> }>();
function quickBox(t: Track, finished: BpMeta[]): HTMLElement {
  const { h, cls } = d;
  const run = quick.get(t.id);
  const start = (): void => {
    const cards = trackCards(t.id);
    if (typeof cards !== 'object') return void quick.set(t.id, { qs: [], st: { picks: {}, says: {}, wrongs: {} }, right: new Set() });
    const pool = finished.flatMap((m) => { const c = cards.get(m.id); return c ? c.quiz.map((_, i): [BpCard, number] => [c, i]) : []; });
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    quick.set(t.id, { qs: pool.slice(0, 5), st: { picks: {}, says: {}, wrongs: {} }, right: new Set() });
  };
  const waiting = run && !run.qs.length && trackCards(t.id) !== 'failed';
  if (waiting && typeof trackCards(t.id) === 'object') start(); // the track's cards arrived: draw the questions now
  const live = quick.get(t.id);
  return h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-4 p-5 max-sm:p-4'), 'aria-labelledby': 'bp-quick' },
    h('h2', { id: 'bp-quick', class: 'm-0 flex items-center gap-2 text-title font-bold' }, d.icon('kindQuiz', 'size-5 text-accent'), bt('quick.title')),
    h('p', { class: 'm-0 text-body-sm text-muted' }, finished.length ? bt('quick.sub') : bt('quick.none')),
    live?.qs.length ? h('div', { class: 'divide-y divide-line [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0' },
      ...live.qs.map(([c, i], n) => h('div', {}, question(`bpq-${c.id}-q${i}`, c.quiz[i], live.st, `${c.code.toUpperCase()} · ${bt('quiz.n', { i: n + 1, n: live.qs.length })}`,
        () => live.right.add(`${c.id}-${i}`))))) : waiting ? h('p', { class: 'm-0 flex items-center gap-2 text-muted' }, d.loader(), bt('loading')) : null,
    live?.qs.length ? h('p', { class: 'm-0 font-bold', role: 'status' }, bt('quick.score', { k: live.right.size, n: live.qs.length })) : null,
    finished.length ? h('div', {}, h('button', { type: 'button', class: cls.cx(live ? cls.BTN_SECONDARY : cls.BTN_GO, 'px-5 py-2'), 'data-ek': 'bp-quick', onclick: () => { start(); d.rerender(); } },
      bt(live ? 'quick.again' : 'quick.start'))) : null);
}

// ---- one card

interface Visit { st: QState; passed: Set<number>; run?: 'busy' | { bad: Side; good: Side; v: Verdict } | { error: string } }
const visits = new Map<string, Visit>();
const visitOf = (id: string): Visit => visits.get(id) ?? (visits.set(id, { st: { picks: {}, says: {}, wrongs: {} }, passed: new Set() }).get(id)!);

function complete(c: BpCard): void {
  if (done().has(c.id)) return;
  d.app.save.completed.push(c.id);
  d.app.save.xp += 5; // §7.2: like an Engine concept/quiz, first time only; the quick check gives 0
  d.persist(true);
  d.announce(bt('complete.xp', { xp: 5 }));
  d.rerender();
}

let client: Promise<PgLabClient> | undefined;
/** One lab worker for the cards (fresh database per script). ponytail: separate from engineView's lab runner, so a visit to both holds two workers. */
const lab = (): Promise<PgLabClient> => (client ??= import('../engine/pglab/client').then((m) => new m.PgLabClient()).catch((e: unknown) => { client = undefined; throw e; }));
/** Every released card's side is one statement (tests/bestContent.test.ts): no splitSql here, it lives beside PGlite. */
const one = (s: string): string[] => [s.trim().replace(/;\s*$/, '')];
const failSide = (e: unknown): Side => {
  const x = e as { name?: string; code?: unknown; message?: string };
  return { columns: [], rows: [], error: /Timeout/.test(x?.name ?? '') ? { message: bt('run.slow') } : { code: typeof x?.code === 'string' ? x.code : undefined, message: x?.message || String(e) } };
};
async function labSide(p: Pair, sql: string): Promise<Side> {
  try {
    const r = await d.lab.sql(sql);
    return { columns: r.columns, rows: r.rows, ...(needsPlan(p) ? planScan((await d.lab.sql(explainOf(sql))).rows[0]?.[0], p.expect?.table) : {}) };
  } catch (e) {
    return failSide(e);
  }
}
async function engineSide(p: Pair, sql: string): Promise<Side> {
  try {
    return sideOf(p, await (await lab()).run(sideScript(p, sql, one)));
  } catch (e) {
    return failSide(e);
  }
}
let mongo: Promise<import('../engine/mongo/runner').MongoLabRunner> | undefined;
/** v25 (L374): a `mingo` card side runs on the MongoDB lab runner (its own worker, the card's `setup` as inline data); writes show the collection after. */
async function mingoSide(p: Pair, code: string): Promise<Side> {
  try {
    const r = await (mongo ??= import('../engine/mongo/runner').then((m) => m.mongoRunner(d.lab)).catch((e: unknown) => { mongo = undefined; throw e; }));
    const out = await r.run({ setup: p.setup, steps: [] }, code.trim());
    return { columns: out.columns, rows: out.rows };
  } catch (e) {
    return failSide(e);
  }
}
async function runBoth(c: BpCard): Promise<void> {
  const v = visitOf(c.id);
  if (v.run === 'busy') return;
  v.run = 'busy';
  d.rerender();
  try {
    const side = c.pair.runtime === 'lab' ? labSide : c.pair.runtime === 'mingo' ? mingoSide : engineSide;
    const bad = await side(c.pair, c.pair.bad); // one after the other, in the existing queue (§3.2)
    const good = await side(c.pair, c.pair.good);
    v.run = { bad, good, v: judge(c.pair, bad, good) };
    d.announce(conclusion(c, v.run.bad, v.run.good, v.run.v)); // read once, after both (§8)
  } catch (e) {
    v.run = { error: bt('run.failed', { msg: e instanceof Error ? e.message : String(e) }) };
  }
  d.rerender();
}

const num = (x: number | string | undefined): string => (typeof x === 'number' ? x.toLocaleString(d.locale(), { maximumFractionDigits: 2 }) : String(x ?? '?'));
const sideWord = (s: Side): string => (s.rows.length === 1 && s.columns.length === 1 ? num(typeof s.rows[0][0] === 'number' ? s.rows[0][0] : String(s.rows[0][0])) : bt('rows', { n: s.rows.length }));
function conclusion(c: BpCard, bad: Side, good: Side, v: Verdict): string {
  if (!v.ok) return bt('v.odd');
  switch (v.kind) {
    case 'diff': return bt('v.diff', { bad: sideWord(bad), good: sideWord(good) });
    case 'same': return bt('v.same', { n: good.rows.length });
    case 'plan': return bt('v.plan', { table: c.pair.expect?.table ?? '', bad: String(v.bad), good: String(v.good) });
    case 'cost': return bt('v.cost', { bad: num(v.bad), good: num(v.good) });
    case 'size': return bt('v.size', { bad: num(v.bad), good: num(v.good) });
    case 'error': return bt(v.side === 'bad' ? 'v.errorBad' : 'v.errorGood', { code: v.code ?? '' });
    default: return bt('v.runs');
  }
}

/** One side's "Measured" block (§3.3): error + teaching note, or rows / 1×1 value / scan and cost / first 3 rows. Never ms. */
function measure(c: BpCard, s: Side, which: 'bad' | 'good', sql: string): HTMLElement {
  const { h } = d;
  const head = h('p', { class: 'm-0 text-caption font-extrabold tracking-wider text-muted uppercase' }, bt('measure'));
  if (s.error) return h('div', { class: 'flex flex-col gap-2' }, head, d.errorView(s.error.code ? s.error : new Error(s.error.message), true, sql));
  const one1 = s.rows.length === 1 && s.columns.length === 1;
  const size = c.pair.expect?.compare === 'size';
  return h('div', { class: 'flex flex-col gap-2' }, head,
    h('p', { class: 'm-0 flex flex-wrap items-baseline gap-x-3 text-body-sm' },
      one1 ? h('span', { class: 'text-heading font-bold tabular-nums' }, size ? bt('bytes', { n: Number(s.rows[0][0]) }) : num(typeof s.rows[0][0] === 'number' ? s.rows[0][0] : String(s.rows[0][0]))) : null,
      h('span', { class: 'text-muted' }, bt('rows', { n: s.rows.length })),
      s.node ? h('span', { class: 'font-semibold', lang: 'en' }, bt('scan', { node: s.node, cost: num(s.cost) })) : null),
    !one1 && s.rows.length ? h('div', { class: 'overflow-x-auto', tabindex: '0' },
      d.renderResult({ columns: s.columns, rows: s.rows.slice(0, 3), types: [] } as unknown as QueryResult, undefined, 3, bt('firstRows', { side: bt(which) }), { types: false })) : null);
}

function pane(c: BpCard, which: 'bad' | 'good', s: Side | undefined): HTMLElement {
  const { h, cls } = d;
  const sql = c.pair[which];
  return h('section', { class: cls.cx('flex min-w-0 flex-col gap-3 rounded-(--r-card) bg-panel p-4 ring-2', which === 'bad' ? 'ring-bad' : 'ring-good'), 'aria-labelledby': `bp-${which}` },
    h('h3', { id: `bp-${which}`, class: cls.cx('m-0 flex items-center gap-2 text-body font-bold', which === 'bad' ? 'text-bad' : 'text-good') },
      d.icon(which === 'bad' ? 'x' : 'check', 'size-5'), bt(which)),
    h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en', tabindex: '0' }, sql),
    s ? measure(c, s, which, sql) : null);
}

function cardPage(c: BpCard): HTMLElement {
  const { h, cls } = d;
  const v = visitOf(c.id);
  const ok = done();
  const isDone = ok.has(c.id);
  const t = trackOf(c.track)!;
  const list = of(c.track);
  const at = list.findIndex((x) => x.id === c.id);
  const [prev, next] = [list[at - 1], list[at + 1]];
  const p = c.pair;
  const muted = c.lint ? tips().mute.includes(c.lint) : false;
  const res = typeof v.run === 'object' && 'v' in v.run ? v.run : undefined;
  const example = section('example', c);
  const lessonLink = (id: string): HTMLElement | null => {
    const fm = Object.values(lessonsMeta).map((x) => x.fm as { id?: string; engine?: string; level?: string; title?: string; title_en?: string }).find((x) => x.id === id);
    return fm?.engine && fm.level ? h('a', { href: d.engineHash(fm.engine, fm.level, id), class: cls.cx(cls.PILL, 'min-h-6 bg-code text-ink no-underline hover:bg-accent-soft') }, (lang() === 'vi' ? fm.title : fm.title_en) ?? id) : null;
  };
  const chipLink = (href: string, text: string): HTMLElement => h('a', { href, class: cls.cx(cls.PILL, 'min-h-6 bg-code text-ink no-underline hover:bg-accent-soft') }, text);
  const links = [
    c.skills.length ? [bt('skills'), ...c.skills.map((s) => chipLink(`#/learn/skill/${s}`, main.skill(s)?.[lang()] ?? s))] : null,
    c.adv.length ? [bt('adv'), ...c.adv.map((a) => chipLink(`#/learn/adv/${a}`, a.toUpperCase()))] : null,
    c.requires.length ? [bt('requires'), ...c.requires.map(lessonLink)] : null,
  ].filter((x): x is (string | HTMLElement | null)[] => !!x);
  return h('article', { class: 'flex flex-col gap-8', 'aria-labelledby': 'home-title', 'data-card': c.id },
    h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' },
      pill('bg-code text-ink', c.level), h('span', { class: 'font-bold tabular-nums' }, c.code.toUpperCase()),
      h('a', { href: rt.hash(c.track), class: cls.cx(cls.PILL, 'min-h-6 bg-code text-ink no-underline hover:bg-accent-soft') }, bt(`area.${c.module}` as BestKey)), // ≥ 24 px target (ux-audit)
      p.runtime === 'none' ? pill('bg-info-soft text-ink', d.icon('docsOnly', 'size-4'), bt('honest.none', { date: c.verified.date }))
        : pill('bg-good-soft text-ink', h('span', { class: 'inline-block size-2 rounded-full bg-current', 'aria-hidden': 'true' }), bt('honest.run', { version: c.verified.version })),
      c.lint ? h('button', {
        type: 'button', 'aria-pressed': muted ? 'false' : 'true', 'data-ek': 'bp-rule',
        class: cls.cx(cls.PILL, 'min-h-6 border-0', muted ? 'bg-code text-muted' : 'bg-sun text-sun-ink'),
        onclick: () => setTips((x) => ({ mute: muted ? x.mute.filter((r) => r !== c.lint) : [...new Set([...x.mute, c.lint!])] })),
      }, bt('tips.rule')) : null,
      isDone ? pill(cls.DONE_PILL, d.icon('check', 'size-4'), bt('done')) : null),
    h('section', { class: 'flex flex-col gap-2 rounded-(--r-card) border-l-4 border-accent bg-panel p-5 ring-1 ring-line max-sm:p-4', 'aria-labelledby': 'bp-rule-h' },
      h('h2', { id: 'bp-rule-h', class: 'm-0 text-caption font-bold tracking-wider text-muted uppercase' }, bt('rule')),
      h('div', { class: 'text-body' }, prose(section('idea', c) ?? ''))),
    h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': 'bp-why' },
      h('h2', { id: 'bp-why', class: 'm-0 text-title font-bold' }, bt('why')), prose(section('why', c) ?? '')),
    h('section', { class: 'flex flex-col gap-4', 'aria-label': `${bt('bad')} / ${bt('good')}` },
      h('div', { class: 'grid gap-4 md:grid-cols-2' }, pane(c, 'bad', res?.bad), pane(c, 'good', res?.good)),
      p.runtime === 'none' ? h('p', { class: 'm-0 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm text-muted', 'data-runtime': 'none' }, bt('run.none'))
        : h('div', { class: 'flex flex-wrap items-center gap-3' },
          h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'inline-flex items-center gap-2 px-5 py-2'), 'data-ek': 'bp-run', disabled: v.run === 'busy', onclick: () => void runBoth(c) },
            v.run === 'busy' ? d.loader() : d.icon('kindLab', 'size-4'), bt(v.run === 'busy' ? 'running' : 'runBoth')),
          h('span', { class: 'text-caption text-muted' }, bt(p.runtime === 'lab' ? 'run.lab' : p.runtime === 'mingo' ? 'run.mingo' : 'run.engine'), v.run === 'busy' ? ` · ${bt('run.first')}` : '')),
      h('p', {
        role: 'status', 'data-verdict': res ? (res.v.ok ? res.v.kind : 'odd') : false,
        class: cls.cx('m-0 rounded-(--r-inset) text-body-sm text-ink', res && 'px-4 py-3 font-semibold', res && (!res.v.ok || res.v.kind === 'diff' || res.v.kind === 'error' ? 'bg-warn-soft' : 'bg-good-soft')),
      }, res ? conclusion(c, res.bad, res.good, res.v) : typeof v.run === 'object' && 'error' in v.run ? v.run.error : '')),
    example ? h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': 'bp-ex' }, h('h2', { id: 'bp-ex', class: 'm-0 text-title font-bold' }, bt('example')), prose(example)) : null,
    h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-4 p-5 max-sm:p-4'), 'aria-labelledby': 'bp-quiz' },
      h('h2', { id: 'bp-quiz', class: 'm-0 flex items-center gap-2 text-title font-bold' }, d.icon('kindQuiz', 'size-5 text-accent'), bt('quiz.title')),
      h('div', { class: 'divide-y divide-line [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0' },
        ...c.quiz.map((q, i) => h('div', {}, question(`${c.id}-q${i}`, q, v.st, bt('quiz.n', { i: i + 1, n: c.quiz.length }), () => {
          v.passed.add(i);
          if (c.quiz.every((_, j) => v.passed.has(j))) complete(c);
        }))))),
    h('section', { class: cls.cx('flex items-start gap-3 rounded-(--r-card) p-5 max-sm:p-4', isDone ? 'bg-good-soft' : 'bg-surface-2'), 'aria-labelledby': 'bp-avoid' },
      isDone ? d.icon('check', 'size-5 shrink-0 text-good') : d.icon(BP_ICON, 'size-5 shrink-0 text-accent'),
      h('div', { class: 'flex flex-col gap-1' }, h('h2', { id: 'bp-avoid', class: 'm-0 text-body font-bold' }, bt('avoid')), h('p', { class: 'm-0' }, ...inline(c.avoid[lang()])))),
    links.length ? h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': 'bp-links' },
      h('h2', { id: 'bp-links', class: 'm-0 text-body font-bold' }, bt('links')),
      ...links.map(([label, ...kids]) => h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, h('span', { class: 'text-muted' }, `${label}:`), ...kids))) : null,
    h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': 'bp-src' },
      h('h2', { id: 'bp-src', class: 'm-0 text-body font-bold' }, bt('sources')),
      h('ul', { class: 'm-0 list-disc space-y-1 pl-5 text-body-sm' }, ...c.sources.map((u) => h('li', {}, srcLink(u)))),
      h('p', { class: 'm-0 text-caption text-muted' }, bt('verified', { version: c.verified.version, date: c.verified.date }))),
    h('nav', { class: cls.cx(cls.CARD, 'flex flex-wrap items-center justify-end gap-2 p-4'), 'aria-label': t.title[lang()] },
      prev ? h('a', { href: rt.hash(c.track, prev.id), class: cls.cx(cls.BTN_GHOST, 'inline-flex items-center gap-1 px-4 py-2 no-underline'), title: prev.title[lang()] }, d.icon('chevronLeft', 'size-4'), bt('prev')) : null,
      next ? h('a', { href: rt.hash(c.track, next.id), class: cls.cx(isDone ? cls.BTN_GO : cls.BTN_SECONDARY, 'inline-flex items-center gap-1 px-4 py-2 no-underline'), title: next.title[lang()] }, bt('next'), d.icon('chevronRight', 'size-4')) : null));
}

/** #/engine/best/habits (catalogue §14.3): one row per habit; chips only for released cards. */
function habitsPage(): HTMLElement {
  const { h, cls } = d;
  const ok = done();
  const byId = new Map(index.map((c) => [c.id, c]));
  return h('div', { class: 'flex flex-col gap-8' },
    h('div', { class: 'flex flex-col gap-4' }, h('p', { class: 'm-0 text-muted' }, ...inline(habits.intro[lang()])), tabs(undefined)),
    h('ol', { class: d.ui.LIST }, ...habits.habits.map((x, i) => {
      const cards = x.cards.map((id) => byId.get(id)).filter((c): c is BpMeta => !!c);
      return h('li', { class: 'flex items-start gap-4 px-5 py-4 max-sm:px-4' },
        h('span', { class: 'grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent' }, String(i + 1)),
        h('div', { class: 'flex min-w-0 flex-1 flex-col gap-2' },
          h('h2', { class: 'm-0 text-title font-bold' }, ...inline(x.text[lang()])),
          h('ul', { class: 'm-0 list-disc space-y-1 pl-5 text-body-sm' }, ...x.points.map((pt) => h('li', {}, ...inline(pt[lang()])))),
          cards.length ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, h('span', { class: 'text-muted' }, `${bt('habits.cards')}:`),
            ...cards.map((c) => h('a', { href: rt.hash(c.track, c.id), class: cls.cx(cls.PILL, 'min-h-6 bg-code text-ink no-underline hover:bg-accent-soft'), title: c.title[lang()] },
              c.code.toUpperCase(), ok.has(c.id) ? d.icon('check', 'size-4 text-good') : null))) : null));
    })),
    h('p', { class: 'm-0 rounded-(--r-inset) bg-info-soft px-4 py-3 text-body-sm text-ink' }, ...inline(habits.after[lang()])),
    h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': 'bp-hsrc' },
      h('h2', { id: 'bp-hsrc', class: 'm-0 text-body font-bold' }, bt('habits.sources')),
      h('ul', { class: 'm-0 list-none space-y-1 p-0 text-body-sm' }, ...habits.sources.map((u, i) => h('li', {}, `[${i + 1}] `, srcLink(u))))));
}

// ---- main's seams: h1 + trail, sidebar rows, the entry on #/engine and #/engine/postgres

export function subOf(): PageSub | undefined {
  const r = rt.of(location.hash);
  if (!r) return undefined;
  const top = { href: d.hashOf('engine'), text: d.t('nav.engine') };
  if (r.track === 'habits') return { title: habits.title[lang()], trail: [top, { href: rt.hash(), text: 'Best Practice' }] };
  const t = trackOf(r.track ?? '');
  const c = t && index.find((x) => x.id === r.id && x.track === t.id);
  return c ? { title: c.title[lang()], trail: [top, { href: rt.hash(t.id), text: `Best Practice · ${t.title[lang()]}` }] } : { title: 'Best Practice', trail: [top] };
}

export function sideRows(ui: { row: (r: Row) => HTMLElement; group: (text: string) => HTMLElement }): Node[] {
  const r = rt.of(location.hash);
  const ok = done();
  return [ui.group(bt('side.group')),
    ...tracks.map((t) => {
      const all = of(t.id);
      return ui.row({ key: `bp:${t.id}`, href: rt.hash(t.id), lead: d.icon(BP_ICON), label: t.title[lang()],
        full: `Best Practice · ${t.title[lang()]}`, sub: bt('progress', { k: all.filter((c) => ok.has(c.id)).length, n: all.length }), current: r?.track === t.id });
    }),
    ui.row({ key: 'bp:habits', href: rt.hash('habits'), lead: d.icon('list'), label: bt('side.habits'), current: r?.track === 'habits' })];
}

/** The entry (§2.4): a row on #/engine (no engine), a ghost link on an engine page that has a track (PostgreSQL). */
export function entry(engine?: string): HTMLElement | null {
  const { h } = d;
  if (engine) {
    const t = trackOf(engine);
    return t ? h('p', { class: 'm-0' }, h('a', { href: rt.hash(t.id), class: d.cls.cx(d.cls.BTN_GHOST, 'inline-flex items-center gap-1 px-3 py-1.5 no-underline') },
      d.icon(BP_ICON, 'size-4'), bt('entry.engine', { name: t.title[lang()] }), d.icon('chevronRight', 'size-4'))) : null;
  }
  const ok = done();
  return h('section', { 'aria-labelledby': 'engine-best' },
    h('h2', { id: 'engine-best', class: d.ui.GROUP_TITLE }, 'Best Practice'),
    h('ul', { class: d.ui.LIST }, d.ui.listRow({
      lead: lead(false), title: 'Best Practice',
      sub: bt('entry.sub', { n: index.length, k: index.filter((c) => ok.has(c.id)).length }),
      action: linkBtn(rt.hash(), bt('entry.go'), true),
    })));
}

