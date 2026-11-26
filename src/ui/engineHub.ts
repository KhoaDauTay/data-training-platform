import type { EngineId, EngineLesson, Kind, Level, Tree } from '../engine/content';
import type * as I18n from '../i18n';
import type { EngineKey } from '../i18n/engine';
import { HUB_DICT, type HubKey } from '../i18n/engineHub';
import type * as Icons from './icons';
import type { Row } from './sidebar';
import type { EngineDeps } from './engineView';

/**
 * v47 S1 (L900–L909): the #/engine landing page and the Engine sidebar, grouped by content type: Khóa học (the five tracks),
 * Chuyên đề (NoSQL path, Extensions shelf, the multi-tenant topic map) and Tham khảo (Best Practice, terms, "Which database?",
 * and since S4 (L983) a link to the one interview room under Học, on its PostgreSQL tab). Lazy chunk `engineHub` (budget `enginehub`), loaded with engineView; every value comes
 * through HubCtx (type-only imports, so no shared chunk is split out of engineView).
 */
export interface HubCtx {
  d: EngineDeps;
  et: (key: EngineKey, params?: I18n.Params) => string;
  engines: readonly EngineId[];
  trees: Readonly<Record<EngineId, Tree>>;
  lessons: () => EngineLesson[];
  done: () => Set<string>;
  lang: () => 'vi' | 'en';
  nameOf: (e: EngineId) => string;
  flat: (e: EngineId) => EngineLesson[];
  progressOf: (ls: EngineLesson[], ok: Set<string>) => { done: number; total: number };
  nextOf: (all: EngineLesson[], ok: Set<string>) => EngineLesson | undefined;
  lessonHash: (l: EngineLesson) => string;
  levelName: (lv: Level) => string;
  levelLessons: (e: EngineId, lv: Level) => EngineLesson[];
  extLessons: () => EngineLesson[];
  engineBadge: (e: EngineId, big?: boolean) => HTMLElement;
  bar: (k: number, n: number, cls?: string) => HTMLElement;
  kindChip: (k: Kind) => HTMLElement;
  tick: (on: boolean) => Node | null;
  topicChip: () => HTMLElement;
  rowLink: (href: string, text: string, main: boolean) => HTMLElement;
  engineIcon: Record<EngineId, Icons.IconName>;
  conceptIcon: Icons.IconName;
  /** On a glossary, compare or interview page (the overview row is not current there). */
  refHere: () => boolean;
}
type Ui = { row: (r: Row) => HTMLElement; group: (text: string) => HTMLElement };

/** v38 R3 (R3-01, L592): the multi-tenant hub lesson, the one topic map the landing links. */
const TOPIC_HUB = 'e-ds-l4-09';
const ht = (c: HubCtx, key: HubKey): string => HUB_DICT[c.lang()][key];

/**
 * eye-v47b B-03 (L1117): Khóa học in four kinds, on the page and in the sidebar, so 12+ tracks stay scannable. Every track is in
 * exactly one (tests/engineCore.test.ts); a track missing here still shows, after the last kind.
 */
export const KINDS: readonly (readonly ['rel' | 'nosql' | 'data' | 'ops', readonly EngineId[]])[] = [
  ['rel', ['postgres', 'design']],
  ['nosql', ['mongodb', 'dynamodb', 'redis', 'graph']],
  ['data', ['stack', 'olap', 'timeseries', 'stream']],
  ['ops', ['search', 'telemetry']],
];
const kindsOf = (c: HubCtx): [HubKey, EngineId[]][] => {
  const out = KINDS.map(([k, es]): [HubKey, EngineId[]] => [`kind.${k}`, es.filter((e) => c.engines.includes(e))]);
  out[out.length - 1][1].push(...c.engines.filter((e) => !KINDS.some(([, es]) => es.includes(e))));
  return out.filter(([, es]) => es.length);
};

/** "Start here" / "Pick up where you left off": the first engine with unfinished progress (else PostgreSQL), its next lesson. */
function continueCard(c: HubCtx, ok: Set<string>): HTMLElement | null {
  const { h, cls } = c.d;
  const e = c.engines.find((x) => { const p = c.progressOf(c.flat(x), ok); return p.done > 0 && p.done < p.total; }) ?? 'postgres';
  const all = c.flat(e);
  const next = c.nextOf(all, ok);
  if (!next) return null;
  const started = all.some((x) => ok.has(x.id));
  return h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-6 max-sm:p-4'), 'aria-labelledby': 'engine-cont' },
    h('p', { class: 'm-0 flex items-center gap-2 text-body-sm font-semibold text-accent-ink' }, c.d.icon(c.engineIcon[e], 'size-4'),
      `${c.et(started ? 'cont.resume' : 'cont.start')} · ${c.nameOf(e)} · ${next.level}`),
    h('h2', { id: 'engine-cont', class: 'm-0 text-title font-bold' }, next.title[c.lang()]),
    h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' }, c.kindChip(next.kind), h('span', {}, c.et('minutes', { n: next.minutes }))),
    h('div', {}, h('a', { href: c.lessonHash(next), class: cls.cx(cls.BTN_GO, 'inline-flex items-center gap-2 px-4 py-2 no-underline') },
      c.et(started ? 'cont.btnResume' : 'cont.btnStart'), c.d.icon('arrowRight', 'size-4'))));
}

/** L280: one card per track: picture, name, one line, the level tiles, progress. */
function engineCard(c: HubCtx, e: EngineId, ok: Set<string>): HTMLElement {
  const { h, cls } = c.d;
  const all = c.flat(e);
  const p = c.progressOf(all, ok);
  const next = c.nextOf(all, ok);
  // B-03 (L1117): below 1024 px the card is compact: no facts, no level tiles (both are on the track page)
  return h('li', { class: 'relative cursor-pointer flex flex-col gap-4 rounded-(--r-card) bg-panel p-5 ring-1 ring-line hover:ring-accent max-lg:gap-3 max-sm:p-4' },
    h('div', { class: 'flex items-start gap-4' }, c.engineBadge(e, true),
      h('div', { class: 'min-w-0 flex-1 flex flex-col gap-1' },
        h('h3', { class: 'm-0 text-title font-bold' }, h('a', { href: c.d.engineHash(e), class: 'text-ink no-underline after:absolute after:inset-0' }, c.nameOf(e))),
        h('p', { class: 'm-0 text-body-sm text-muted' }, c.et(`desc.${e}`)),
        e === 'design' ? h('p', { class: cls.cx(c.d.ui.ABOVE, 'm-0 text-caption text-muted') }, h('a', { href: c.d.engineHash('postgres', 'L3'), class: 'inline-flex min-h-6 items-center text-muted' }, c.et('design.deep'))) : null)),
    c.d.track ? h('div', { class: 'max-lg:hidden' }, c.d.track.facts(c, e, true)) : null, // v47 S2 (I4): who for, prerequisites, total time
    h('ol', { class: 'm-0 grid list-none grid-cols-5 gap-2 p-0 max-lg:hidden', 'aria-label': c.et('levels') }, ...c.trees[e].levels.filter((lv) => lv.modules.length).map((lv) => {
      const q = c.progressOf(lv.modules.flatMap((m) => m.lessons), ok);
      const here = next?.level === lv.level;
      return h('li', { class: 'min-w-0' }, h('a', {
        href: c.d.engineHash(e, lv.level), title: `${c.levelName(lv.level)}: ${c.et(`ladder.${e}.${lv.level}`)}`,
        class: cls.cx(c.d.ui.ABOVE, 'flex min-h-14 flex-col items-center justify-center gap-1 rounded-(--r-inset) px-1 py-2 text-ink no-underline hover:bg-accent-soft',
          here ? 'bg-accent-soft ring-2 ring-accent' : 'bg-code ring-1 ring-line'),
      }, h('span', { class: 'flex items-center gap-1 font-bold' }, lv.level, q.total && q.done === q.total ? c.d.icon('check', 'size-4 text-good') : null),
        h('span', { class: 'sr-only' }, `${c.et(`level.${lv.level}`)}, ${c.et('progress', { k: q.done, n: q.total })}`),
        h('span', { class: 'text-caption text-muted tabular-nums', 'aria-hidden': 'true' }, `${q.done}/${q.total}`),
        c.bar(q.done, q.total, 'h-1')));
    })),
    h('div', { class: 'flex flex-wrap items-center gap-x-4 gap-y-2' },
      h('div', { class: 'flex min-w-40 flex-1 items-center gap-3' }, c.bar(p.done, p.total), h('span', { class: 'shrink-0 text-body-sm tabular-nums text-muted' }, c.et('progress', { k: p.done, n: p.total }))),
      next ? h('a', { href: c.lessonHash(next), class: cls.cx(cls.BTN_SECONDARY, c.d.ui.ABOVE, 'px-4 py-1.5 whitespace-nowrap no-underline') },
        `${c.et(p.done ? 'cont.btnResume' : 'cont.btnStart')} · ${next.level}`) : null));
}

const disc = (c: HubCtx, name: Icons.IconName): HTMLElement =>
  c.d.h('span', { class: 'grid size-10 place-items-center rounded-full bg-accent-soft text-accent' }, c.d.icon(name, 'size-6'));

/** The Chuyên đề rows: NoSQL path, the Extensions shelf (never a level, I2), the multi-tenant topic map. Quiet links like Tham khảo (L1096, eye E-10). */
function topicRows(c: HubCtx, ok: Set<string>): HTMLElement[] {
  const { d, et } = c;
  const ext = c.progressOf(c.extLessons(), ok);
  const hub = c.lessons().find((x) => x.id === TOPIC_HUB);
  return [
    d.ui.listRow({ lead: disc(c, 'nosqlPath'), title: et('nosql.title'), sub: et('nosql.short'), action: c.rowLink(d.enginePathHash(), et('nosql.go'), false) }),
    ext.total ? d.ui.listRow({ lead: disc(c, 'puzzle'), title: d.h('span', {}, et('ext.title'), c.tick(ext.done === ext.total)),
      sub: `${et('ext.short')} · ${et('progress', { k: ext.done, n: ext.total })}`, action: c.rowLink(d.engineHash('postgres', 'EXT'), et('ext.go'), false) }) : null,
    hub ? d.ui.listRow({ lead: disc(c, c.conceptIcon), title: d.h('span', {}, c.topicChip(), et('topic.tenancy'), c.tick(ok.has(hub.id))),
      sub: et('topic.tenancyShort'), action: c.rowLink(c.lessonHash(hub), et('topic.go'), false) }) : null,
  ].filter((x): x is HTMLLIElement => !!x);
}

/** The Tham khảo rows: Best Practice (its own chunk), terms, "Which database?", and the one interview room (v47 S4, L983: #/learn/interview?e=pg). */
function refRows(c: HubCtx): HTMLElement[] {
  const { d, et } = c;
  const row = (href: string, icon: Icons.IconName, title: string, sub: string): HTMLElement =>
    d.ui.listRow({ lead: disc(c, icon), title, sub, action: c.rowLink(href, et('v27.open'), false) });
  return [d.best?.() ?? null, row(d.engineTermsHash(), 'bookIndex', et('v27.terms'), et('v27.termsLine')),
    row(d.engineCompareHash(), 'scale', et('v28.compare'), et('v28.compareLine')),
    row(d.engineInterviewHash(), 'secPractice', et('v27.interview'), et('v27.interviewLine'))].filter((x): x is HTMLElement => !!x);
}

/** Phones (I1): Chuyên đề and Tham khảo fold into closed <details>; the open state lives for the session, so a redraw keeps it. */
const opened = new Set<string>();
const phone = (): boolean => typeof matchMedia === 'function' && matchMedia('(max-width: 639px)').matches;
function group(c: HubCtx, id: 'courses' | 'topics' | 'ref', body: HTMLElement, fold: boolean): HTMLElement {
  const { h } = c.d;
  const title = h('h2', { id: `engine-${id}`, tabindex: '-1', class: c.d.cls.cx(c.d.ui.GROUP_TITLE, 'mb-1') }, ht(c, id));
  const line = h('span', { class: 'mb-3 block text-body-sm text-muted' }, ht(c, `${id}.line`));
  if (!fold) return h('section', { 'aria-labelledby': `engine-${id}`, 'data-group': id }, title, line, body);
  // B-16 (L1119): the chevron leads a full-width row with a line under it, so the fold reads as one
  const box = h('details', { class: 'group', 'data-group': id, open: opened.has(id), ontoggle: () => void (box.open ? opened.add(id) : opened.delete(id)) },
    h('summary', { class: 'flex min-h-11 cursor-pointer list-none flex-col justify-center border-b border-line [&::-webkit-details-marker]:hidden' },
      h('span', { class: 'flex items-center gap-2' }, c.d.icon('chevronRight', 'mb-1 size-5 text-ink group-open:rotate-90'), title), line), body);
  return box;
}

/** B-03 (L1117): Khóa học's kinds, each a small heading over its cards. */
function courses(c: HubCtx, ok: Set<string>): HTMLElement {
  const { h } = c.d;
  return h('div', { class: 'flex flex-col gap-6' }, ...kindsOf(c).map(([k, es]) => h('section', { 'aria-labelledby': `engine-${k}`, 'data-kind': k.slice(5) },
    h('h3', { id: `engine-${k}`, tabindex: '-1', class: 'm-0 mb-3 text-body font-bold' }, ht(c, k)),
    h('ul', { class: 'm-0 grid list-none gap-4 p-0 md:max-lg:grid-cols-2 xl:grid-cols-2' }, ...es.map((e) => engineCard(c, e, ok))))));
}

/** B-03 (L1117): a jump row near the top: each kind, then Chuyên đề and Tham khảo (buttons: the router owns the hash). */
function jumpRow(c: HubCtx): HTMLElement {
  const { h } = c.d;
  const go = (id: string): void => {
    const el = document.getElementById(id);
    const box = el?.closest('details');
    if (box) box.open = true;
    el?.scrollIntoView({ block: 'start' });
    el?.focus({ preventScroll: true });
  };
  const targets: [string, string][] = [...kindsOf(c).map(([k]): [string, string] => [`engine-${k}`, ht(c, k)]), ['engine-topics', ht(c, 'topics')], ['engine-ref', ht(c, 'ref')]];
  return h('nav', { 'aria-label': ht(c, 'jump'), 'data-jump': '', class: 'flex flex-wrap items-center gap-2' },
    h('span', { class: 'text-body-sm text-muted' }, ht(c, 'jump')),
    ...targets.map(([id, text]) => h('button', { type: 'button', class: 'min-h-9 rounded-full border-0 bg-panel px-3 text-body-sm text-ink ring-1 ring-line hover:bg-accent-soft', onclick: () => go(id) }, text)));
}

export function overview(c: HubCtx): HTMLElement {
  const { h } = c.d;
  const ok = c.done();
  const fold = phone();
  return h('div', { class: 'flex flex-col gap-8' },
    h('p', { class: 'm-0 text-muted' }, ht(c, 'intro')),
    jumpRow(c),
    continueCard(c, ok),
    group(c, 'courses', courses(c, ok), false),
    group(c, 'topics', h('ul', { class: c.d.ui.LIST }, ...topicRows(c, ok)), fold),
    group(c, 'ref', h('ul', { class: c.d.ui.LIST }, ...refRows(c)), fold));
}

/**
 * The sidebar (I1): overview row, then Khóa học (the open track's levels right under its row), Chuyên đề, Tham khảo on every
 * engine page. `bestRows` are Best Practice's own rows (engineBest.sideRows), drawn first in Tham khảo with main's ui, so they
 * keep their current state on a Best Practice page. One current row (L189): the topic map row never is (its level row is).
 */
export function sideRows(c: HubCtx, ui: Ui, bestRows: Node[]): (Node | null)[] {
  const { d, et } = c;
  const r = d.engineRouteOf(location.hash);
  const ok = c.done();
  const open = c.engines.find((e) => e === r.engine);
  const path = open === 'mongodb' && d.enginePathOf(location.hash) !== undefined;
  const out: (Node | null)[] = [
    ui.row({ key: 'e:all', href: d.hashOf('engine'), lead: d.icon('engine'), label: d.t('nav.engine'), current: !open && !c.refHere() }),
  ];
  // B-03 (L1117): the tracks under their kind's label (a gap between kinds in the rail, style.css)
  for (const [k, es] of kindsOf(c)) for (const e of es) {
    if (e === es[0]) out.push(ui.group(ht(c, k)));
    const p = c.progressOf(c.flat(e), ok);
    out.push(ui.row({ key: `e:${e}`, href: d.engineHash(e), lead: d.icon(c.engineIcon[e]), label: c.nameOf(e),
      sub: et('me.line', { k: p.done, n: p.total }), current: open === e && !r.level && !path }));
    if (e !== open) continue;
    // engine-ux-spec §3.1 (L189): one row per level, the number only in its badge, its short name, done/total
    for (const lv of c.trees[e].levels.filter((x) => x.modules.length)) {
      const q = c.progressOf(c.levelLessons(e, lv.level), ok);
      out.push(ui.row({ key: `e:${e}:${lv.level}`, href: d.engineHash(e, lv.level),
        lead: q.total && q.done === q.total ? d.icon('check', 'size-5 text-good') : d.h('b', { class: 'text-caption' }, lv.level),
        label: et(`level.${lv.level}`), full: c.levelName(lv.level), sub: et('me.line', { k: q.done, n: q.total }), current: r.level === lv.level }));
    }
  }
  out.push(ui.group(ht(c, 'topics')),
    ui.row({ key: 'e:path', href: d.enginePathHash(), lead: d.icon('nosqlPath'), label: et('nosql.title'), current: path }));
  const ext = c.progressOf(c.extLessons(), ok);
  if (ext.total) out.push(ui.row({ key: 'e:ext', href: d.engineHash('postgres', 'EXT'), lead: ext.done === ext.total ? d.icon('check', 'size-5 text-good') : d.icon('puzzle'),
    label: et('level.EXT'), sub: et('me.line', { k: ext.done, n: ext.total }), current: open === 'postgres' && r.level === 'EXT' }));
  const hub = c.lessons().find((x) => x.id === TOPIC_HUB);
  if (hub) out.push(ui.row({ key: 'e:topic', href: c.lessonHash(hub), lead: d.icon(c.conceptIcon), label: ht(c, 'topic.side'), full: `${et('topic.map')}: ${et('topic.tenancy')}`, current: false }));
  out.push(ui.group(ht(c, 'ref')), ...bestRows,
    ui.row({ key: 'e:terms', href: d.engineTermsHash(), lead: d.icon('bookIndex'), label: et('v27.terms'), current: d.engineTermsOf(location.hash) !== undefined }),
    ui.row({ key: 'e:cmp', href: d.engineCompareHash(), lead: d.icon('scale'), label: et('v28.compare'), current: d.engineCompareOf(location.hash) }),
    ui.row({ key: 'e:iv', href: d.engineInterviewHash(), lead: d.icon('secPractice'), label: et('v27.interview'), current: false })); // S4: the room is a Học page, never current here
  return out;
}
