import {
  blocksOf, ENGINES, engineXp, isRight, lessonPassed, parseEngineLesson, parseModules, partsOf, progressOf, SECTIONS, treeOf,
  type EngineId, type EngineLesson, type Kind, type LessonSource, type Level, type ModuleName, type Question, type Tree,
} from '../engine/content';
import { heapView } from '../engine/inside';
import { gradable, honestOf, honestRow, LAB_RUNNERS, type Honest, type LabEnv, type LabOutput, type LabRunner, type LabVerdict } from '../engine/labs';
import { vizMountFor, type VizDeps, type VizMounted } from '../engine/vizRegistry';
import type * as I18n from '../i18n';
import { ENGINE_DICT, engineText, type EngineKey } from '../i18n/engine';
import type * as Route from '../route';
import type * as State from '../state';
import type * as Tickets from '../tickets';
import type * as Dom from './dom';
import type * as Editor from './editor';
import type * as Feedback from './feedback';
import type * as HomeView from './homeView';
import type * as Icons from './icons';
import type * as ResultTable from './resultTable';
import type { Row } from './sidebar';
import type { PathCtx } from './enginePathView';
import type * as Celebrate from './celebrate';
import type * as Mascots from './mascots';
import type * as Storage from '../storage';
import type { CapState } from './engineCapstone';
import type { PredictState } from './enginePredict';

/**
 * ENG-CORE (L220), redesign L280: the Database Engine pages (#/engine, #/engine/<engine>, #/engine/<engine>/<level>,
 * #/engine/<engine>/<level>/<lesson>), the lesson viewer (sections, viz slot, predict, quiz, lab), the #/me block and the
 * sidebar rows. Lazy chunk `engineView` (budget `engineui`): imports only types from main modules and gets every main value
 * through EngineDeps (Plan 6 U3). The page's h1 and trail are main's (`subOf()` → homeView `pageSubs.engine`); the NoSQL
 * path pages are their own chunk (enginePathView.ts, L280).
 */
export interface EngineDeps {
  h: typeof Dom.h; icon: typeof Icons.icon; t: typeof I18n.t; getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  app: typeof State.app; persist: typeof State.persist; announce: typeof Dom.announce; loader: typeof Dom.loader;
  reducedMotion: typeof Dom.reducedMotion; isDark: () => boolean;
  renderResult: typeof ResultTable.renderResult; errorView: typeof Feedback.errorView; optionOrder: typeof Tickets.optionOrder;
  engineHash: typeof Route.engineHash; engineRouteOf: typeof Route.engineRouteOf;
  enginePathOf: typeof Route.enginePathOf; enginePathHash: typeof Route.enginePathHash; hashOf: typeof Route.hashOf; rerender: () => void;
  cls: { CARD: string; BTN_GO: string; BTN_SECONDARY: string; BTN_GHOST: string; PILL: string; DONE_PILL: string; cx: (...c: (string | false | null | undefined)[]) => string };
  /** L280: main's list rows (the Overview's chapter rows), so Engine lists look and behave like the rest of the site. */
  ui: { listRow: typeof HomeView.listRow; LIST: string; GROUP_TITLE: string; ABOVE: string };
  /** L281: the app's CodeMirror editor (main bundle) for lab steps and path drills. */
  createEditor: typeof Editor.createEditor;
  lab: LabEnv;
  /** ENG-VIZ's main values (svg helper, GSAP loader); the diagram chunk itself loads through src/engine/vizRegistry.ts. */
  viz: VizDeps;
  /** v23 PRED: device prefs (src/storage.ts), for `cargo-query/engine-first`. */
  prefs: { read: typeof Storage.readJson; write: typeof Storage.writeJson };
  /** v23 CAP: Lily's cheer at a capstone's finish and the level's done badge (src/art/illustrations.ts, lazy). */
  cheer: { mascot: typeof Mascots.mascot; react: typeof Celebrate.react; badge: () => Element };
  /** v24 BP-UI (L346): the Best Practice entry (src/ui/engineBest.ts): a row on #/engine, a link on an engine page with a track. */
  best?: (engine?: EngineId) => HTMLElement | null;
}
/** src/engineSources.ts: the lesson index (list fields only), one lazy chunk per lesson, and every engine's modules.yml. */
export interface EngineSources { meta: Record<string, LessonSource>; full: Record<string, () => Promise<LessonSource>>; modules: Record<string, unknown> }

let d: EngineDeps;
let lessons: EngineLesson[] = [];
const trees = {} as Record<EngineId, Tree>;
const NAME: Record<EngineId, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB' };
/** L280: one generic picture per engine (no logos): a table grid, a JSON document, a key and its values. */
const ENGINE_ICON = { postgres: 'engRelational', mongodb: 'engDocument', dynamodb: 'engKeyValue' } as const satisfies Record<EngineId, Icons.IconName>;
const KIND_ICON = { concept: 'kindConcept', lab: 'kindLab', predict: 'kindPredict', quiz: 'kindQuiz', capstone: 'kindCapstone' } as const satisfies Record<Kind, Icons.IconName>;
const et = (key: EngineKey, params?: I18n.Params): string => engineText(d.getLang(), d.locale(), key, params);

/** Parses every engine's content (throws on a broken file: the main part shows the load failure and Retry). */
export function initEngine(deps: EngineDeps, src: EngineSources): void {
  d = deps;
  fullSrc = src.full;
  lessons = Object.entries(src.meta).map(([path, s]) => parseEngineLesson(s, path));
  for (const e of ENGINES) {
    const names: ModuleName[] = Object.entries(src.modules).filter(([path]) => path.includes(`/${e}/`)).flatMap(([path, s]) => parseModules(s, path));
    trees[e] = treeOf(e, lessons, names);
  }
}

/** Full lessons (sections, lab, quiz), parsed from their own chunk on first open; a failed load is retried by Retry. */
let fullSrc: EngineSources['full'] = {};
const fulls = new Map<string, EngineLesson | 'loading' | 'failed'>();
const pathOf = (l: EngineLesson): string | undefined => Object.keys(fullSrc).find((p) => p.includes(`/${l.engine}/${l.level}/${String(l.order).padStart(2, '0')}-`));
export function fullLesson(l: EngineLesson): EngineLesson | 'loading' | 'failed' {
  const have = fulls.get(l.id);
  if (have) return have;
  const path = pathOf(l);
  if (!path) return 'failed';
  fulls.set(l.id, 'loading');
  void fullSrc[path]().then((s) => fulls.set(l.id, parseEngineLesson(s, path)), () => fulls.set(l.id, 'failed')).finally(() => d.rerender());
  return 'loading';
}

const done = (): Set<string> => new Set(d.app.save.completed);
const lang = (): 'vi' | 'en' => d.getLang();
const flat = (e: EngineId): EngineLesson[] => trees[e].levels.flatMap((l) => l.modules.flatMap((m) => m.lessons));
const lessonHash = (l: EngineLesson): string => d.engineHash(l.engine, l.level, l.id);
const levelName = (lv: Level): string => `${lv} · ${et(`level.${lv}`)}`;
const levelOf = (e: EngineId, lv: string | undefined) => trees[e].levels.find((x) => x.level === lv && x.modules.length);
const levelLessons = (e: EngineId, lv: Level): EngineLesson[] => levelOf(e, lv)?.modules.flatMap((m) => m.lessons) ?? [];
/** The first lesson not done, in engine order (undefined = all done). */
const nextOf = (all: EngineLesson[], ok: Set<string>): EngineLesson | undefined => all.find((x) => !ok.has(x.id));

/**
 * Paragraphs and list items: `code` spans, and **bold** outside code (558 spans in content/engine; review v22 RC: the
 * asterisks showed as text). Nothing else is interpreted.
 */
function inline(text: string): (Node | string)[] {
  return text.split(/(`[^`\n]+`)/).filter(Boolean).flatMap((p) => (p.length > 1 && p.startsWith('`') && p.endsWith('`') ? [d.h('code', {}, p.slice(1, -1))]
    : p.split(/(\*\*[^*\n]+\*\*)/).filter(Boolean).map((q) => (q.length > 4 && q.startsWith('**') && q.endsWith('**') ? d.h('strong', {}, q.slice(2, -2)) : q))));
}
function prose(text: string): HTMLElement {
  return d.h('div', { class: 'flex flex-col gap-3' }, ...blocksOf(text).map((b) => b.kind === 'p' ? d.h('p', { class: 'm-0' }, ...inline(b.text))
    : b.kind === 'ul' ? d.h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...b.items.map((x) => d.h('li', {}, ...inline(x))))
      : d.h('pre', { class: 'sql m-0 overflow-x-auto' }, b.code)));
}

/** A thin bar; its numbers are always in words beside it (never colour alone, L23). */
function bar(k: number, n: number, cls = 'h-2'): HTMLElement {
  const pct = n ? Math.round((k / n) * 100) : 0;
  return d.h('div', { class: d.cls.cx('w-full overflow-hidden rounded-full bg-code', cls), 'aria-hidden': 'true' },
    d.h('div', { class: d.cls.cx('h-full rounded-full', k && k === n ? 'bg-good' : 'bg-accent'), style: `width:${pct}%` }));
}
const tick = (on: boolean): Node | null => (on ? d.h('span', { class: 'ml-1 text-good' }, d.icon('check', 'inline size-4 align-[-2px]'), d.h('span', { class: 'sr-only' }, et('done'))) : null);
/** The engine's picture in a round tile, like a domain badge (decorative: the name is always beside it). */
const engineBadge = (e: EngineId, big = false): HTMLElement =>
  d.h('span', { class: d.cls.cx('grid shrink-0 place-items-center rounded-full bg-accent-soft text-accent ring-1 ring-line', big ? 'size-14' : 'size-10'), 'aria-hidden': 'true' },
    d.icon(ENGINE_ICON[e], big ? 'size-8' : 'size-6'));
/** A list row's round lead: ✓ when done, else a picture or short text on the accent (current) or code tint. */
function leadDisc(state: 'done' | 'current' | 'todo', inner: Node | string): HTMLElement {
  const { h, cls } = d;
  return state === 'done' ? h('span', { class: 'grid size-10 place-items-center rounded-full bg-good text-on-accent' }, d.icon('check', 'size-5'))
    : h('span', { class: cls.cx('grid size-10 place-items-center rounded-full font-bold', state === 'current' ? 'bg-accent text-on-accent' : 'bg-code text-ink') }, inner);
}
/** The action link of a row (listRow stretches it over the whole row, L86). */
const rowLink = (href: string, text: string, main: boolean): HTMLElement =>
  d.h('a', { href, class: d.cls.cx(main ? d.cls.BTN_SECONDARY : d.cls.BTN_GHOST, 'shrink-0 px-4 py-1.5 whitespace-nowrap no-underline') }, text);

// ---- the page's h1 and trail (main draws them: homeView pageSubs.engine)

/** L280: the h1 and the trail of the open Engine page; undefined on the overview (h1 = "Database Engine"). */
export function subOf(): HomeView.PageSub | undefined {
  const r = d.engineRouteOf(location.hash);
  const e = ENGINES.find((x) => x === r.engine);
  if (!e) return undefined;
  const top = { href: d.hashOf('engine'), text: d.t('nav.engine') };
  const eng = { href: d.engineHash(e), text: NAME[e] };
  const path = e === 'mongodb' ? d.enginePathOf(location.hash) : undefined;
  if (path !== undefined) {
    const title = path && pathMod && pathMod !== 'loading' && pathMod !== 'failed' ? pathMod.skillTitle(path, lang()) : undefined;
    return title ? { title, trail: [top, eng, { href: d.enginePathHash(), text: et('nosql.title') }] } : { title: et('nosql.title'), trail: [top, eng] };
  }
  const lesson = r.lesson ? lessons.find((x) => x.id === r.lesson && x.engine === e) : undefined;
  if (lesson) return { title: lesson.title[lang()], trail: [top, eng, { href: d.engineHash(e, lesson.level), text: levelName(lesson.level) }] };
  const lv = levelOf(e, r.level);
  if (lv) return { title: levelName(lv.level), trail: [top, eng] };
  return { title: NAME[e], trail: [top] };
}

// ---- pages

/** The page the hash names; an unknown level or lesson falls back to its engine, an unknown engine to the overview (no dead end). */
export function enginePage(): HTMLElement {
  keepFocus();
  queueMicrotask(sweepEditors);
  const r = d.engineRouteOf(location.hash);
  const engine = ENGINES.find((e) => e === r.engine);
  const lesson = engine && lessons.find((l) => l.id === r.lesson && l.engine === engine);
  const pathAt = engine === 'mongodb' ? d.enginePathOf(location.hash) : undefined;
  if (pathAt !== undefined) {
    const page = pathPage(pathAt);
    if (page.dataset.drawn !== undefined) page.id = 'engine-page';
    return page;
  }
  const lv = engine && !lesson ? levelOf(engine, r.level) : undefined;
  const full = lesson && fullLesson(lesson);
  // v23: a predict, a capstone or a plan diagram draws only once its lazy chunks are in (the page never changes shape later).
  const extra = typeof full === 'object' ? chunksFor(full) : undefined;
  const f = extra && extra !== 'ready' ? extra : full;
  const page = !lesson ? (engine ? (lv ? levelPage(engine, lv.level) : enginePg(engine)) : overview())
    : f === 'loading' ? loadingLine()
      : f === 'failed' ? failedBox(() => { fulls.delete(lesson.id); if (predMod === 'failed') predMod = undefined; if (capMod === 'failed') capMod = undefined; if (nosqlMod === 'failed') nosqlMod = undefined; d.rerender(); })
        : lessonPage(f!);
  if (f === 'loading' || f === 'failed') return page; // not #engine-page yet: smoke and the axe harness wait for the drawn lesson
  page.id = 'engine-page'; // drawn (not the loading line): tests/axeHarness.ts and scripts/smoke.mjs wait for it
  return page;
}
const loadingLine = (): HTMLElement => d.h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d.loader(), d.t('engine.loading'));
const failedBox = (retry: () => void): HTMLElement => d.h('div', { role: 'alert', class: 'flex flex-col gap-2' }, d.h('p', { class: 'm-0' }, d.t('engine.failed')),
  d.h('button', { type: 'button', onclick: retry }, d.t('data.retry')));

/** "Start here" / "Pick up where you left off": the first engine with unfinished progress (else PostgreSQL), its next lesson. */
function continueCard(ok: Set<string>): HTMLElement | null {
  const { h, cls } = d;
  const e = ENGINES.find((x) => { const p = progressOf(flat(x), ok); return p.done > 0 && p.done < p.total; }) ?? 'postgres';
  const all = flat(e);
  const next = nextOf(all, ok);
  if (!next) return null;
  const started = all.some((x) => ok.has(x.id));
  return h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-6 max-sm:p-4'), 'aria-labelledby': 'engine-cont' },
    h('p', { class: 'm-0 flex items-center gap-2 text-body-sm font-semibold text-accent' }, d.icon(ENGINE_ICON[e], 'size-4'),
      `${et(started ? 'cont.resume' : 'cont.start')} · ${NAME[e]} · ${next.level}`),
    h('h2', { id: 'engine-cont', class: 'm-0 text-title font-bold' }, next.title[lang()]),
    h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' }, kindChip(next.kind), h('span', {}, et('minutes', { n: next.minutes }))),
    h('div', {}, h('a', { href: lessonHash(next), class: cls.cx(cls.BTN_GO, 'inline-flex items-center gap-2 px-4 py-2 no-underline') },
      et(started ? 'cont.btnResume' : 'cont.btnStart'), d.icon('arrowRight', 'size-4'))));
}

/** L280: one card per engine (like the learning path's module cards): picture, name, one line, the L1–L5 tiles, progress. */
function engineCard(e: EngineId, ok: Set<string>): HTMLElement {
  const { h, cls } = d;
  const all = flat(e);
  const p = progressOf(all, ok);
  const next = nextOf(all, ok);
  return h('li', { class: 'relative cursor-pointer flex flex-col gap-4 rounded-(--r-card) bg-panel p-5 ring-1 ring-line hover:ring-accent max-sm:p-4' },
    h('div', { class: 'flex items-start gap-4' }, engineBadge(e, true),
      h('div', { class: 'min-w-0 flex-1 flex flex-col gap-1' },
        h('h3', { class: 'm-0 text-title font-bold' }, h('a', { href: d.engineHash(e), class: 'text-ink no-underline after:absolute after:inset-0' }, NAME[e])),
        h('p', { class: 'm-0 text-body-sm text-muted' }, et(`desc.${e}`)))),
    h('ol', { class: 'm-0 grid list-none grid-cols-5 gap-2 p-0', 'aria-label': et('levels') }, ...trees[e].levels.filter((lv) => lv.modules.length).map((lv) => {
      const q = progressOf(lv.modules.flatMap((m) => m.lessons), ok);
      const here = next?.level === lv.level;
      return h('li', { class: 'min-w-0' }, h('a', {
        href: d.engineHash(e, lv.level), title: `${levelName(lv.level)}: ${et(`ladder.${e}.${lv.level}`)}`,
        class: cls.cx(d.ui.ABOVE, 'flex min-h-14 flex-col items-center justify-center gap-1 rounded-(--r-inset) px-1 py-2 text-ink no-underline hover:bg-accent-soft',
          here ? 'bg-accent-soft ring-2 ring-accent' : 'bg-code ring-1 ring-line'),
      }, h('span', { class: 'flex items-center gap-1 font-bold' }, lv.level, q.total && q.done === q.total ? d.icon('check', 'size-4 text-good') : null),
        h('span', { class: 'sr-only' }, `${et(`level.${lv.level}`)}, ${et('progress', { k: q.done, n: q.total })}`),
        h('span', { class: 'text-caption text-muted tabular-nums', 'aria-hidden': 'true' }, `${q.done}/${q.total}`),
        bar(q.done, q.total, 'h-1')));
    })),
    h('div', { class: 'flex flex-wrap items-center gap-x-4 gap-y-2' },
      h('div', { class: 'flex min-w-40 flex-1 items-center gap-3' }, bar(p.done, p.total), h('span', { class: 'shrink-0 text-body-sm tabular-nums text-muted' }, et('progress', { k: p.done, n: p.total }))),
      next ? h('a', { href: lessonHash(next), class: cls.cx(cls.BTN_SECONDARY, d.ui.ABOVE, 'px-4 py-1.5 whitespace-nowrap no-underline') },
        `${et(p.done ? 'cont.btnResume' : 'cont.btnStart')} · ${next.level}`) : null));
}

/** The NoSQL path as one list row (overview and the MongoDB page): its own picture, a short line, one link. */
function pathRow(): HTMLElement {
  return d.h('ul', { class: d.ui.LIST }, d.ui.listRow({
    lead: d.h('span', { class: 'grid size-10 place-items-center rounded-full bg-accent-soft text-accent' }, d.icon('nosqlPath', 'size-6')),
    title: et('nosql.title'), sub: et('nosql.short'), action: rowLink(d.enginePathHash(), et('nosql.go'), true),
  }));
}

function overview(): HTMLElement {
  const { h } = d;
  const ok = done();
  return h('div', { class: 'flex flex-col gap-8' },
    h('p', { class: 'm-0 text-muted' }, et('intro')),
    continueCard(ok),
    h('section', { 'aria-labelledby': 'engine-list' },
      h('h2', { id: 'engine-list', class: d.ui.GROUP_TITLE }, et('engines')),
      h('ul', { class: 'm-0 grid list-none gap-4 p-0' }, ...ENGINES.map((e) => engineCard(e, ok)))),
    h('section', { 'aria-labelledby': 'engine-path' },
      h('h2', { id: 'engine-path', class: d.ui.GROUP_TITLE }, et('nosql.title')),
      pathRow()),
    d.best?.());
}

/** `#/engine/<engine>`: the engine's line and progress, the next lesson, then one row per level (like the Overview's chapters). */
function enginePg(e: EngineId): HTMLElement {
  const { h, cls } = d;
  const ok = done();
  const all = flat(e);
  const p = progressOf(all, ok);
  const next = nextOf(all, ok);
  return h('div', { class: 'flex flex-col gap-8' },
    h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-4 p-6 max-sm:p-4'), 'aria-label': NAME[e] },
      h('div', { class: 'flex items-start gap-4' }, engineBadge(e, true), h('p', { class: 'm-0 min-w-0 flex-1 text-muted' }, et(`desc.${e}`))),
      h('div', { class: 'flex items-center gap-3' }, bar(p.done, p.total), h('span', { class: 'shrink-0 text-body-sm tabular-nums text-muted' }, et('progress', { k: p.done, n: p.total }))),
      next ? h('div', { class: 'flex flex-wrap items-center gap-3' },
        h('a', { href: lessonHash(next), class: cls.cx(cls.BTN_GO, 'inline-flex items-center gap-2 px-4 py-2 no-underline') }, et(p.done ? 'cont.btnResume' : 'cont.btnStart'), d.icon('arrowRight', 'size-4')),
        h('span', { class: 'min-w-0 text-body-sm text-muted' }, `${next.level} · ${next.title[lang()]}`))
        : h('p', { class: 'm-0 font-bold good' }, et('cont.allDone', { name: NAME[e] })), d.best?.(e)),
    e === 'mongodb' ? h('section', { 'aria-labelledby': 'engine-path' }, h('h2', { id: 'engine-path', class: d.ui.GROUP_TITLE }, et('nosql.title')), pathRow()) : null,
    h('section', { 'aria-labelledby': 'engine-levels' },
      h('h2', { id: 'engine-levels', class: d.ui.GROUP_TITLE }, et('levels')),
      h('ul', { class: d.ui.LIST }, ...trees[e].levels.filter((lv) => lv.modules.length).map((lv) => {
        const q = progressOf(levelLessons(e, lv.level), ok);
        const here = next?.level === lv.level;
        return d.ui.listRow({
          lead: leadDisc(q.done === q.total ? 'done' : here ? 'current' : 'todo', lv.level),
          title: levelName(lv.level), sub: `${et(`ladder.${e}.${lv.level}`)} · ${et('progress', { k: q.done, n: q.total })}`,
          action: rowLink(d.engineHash(e, lv.level), here ? et('row.next') : et('row.levelOpen'), here), current: here,
        });
      }))));
}

/** `#/engine/<engine>/<level>` (L280): the level's modules, each a titled list of lesson rows. */
function levelPage(e: EngineId, lv: Level): HTMLElement {
  const { h } = d;
  const ok = done();
  const ls = levelLessons(e, lv);
  const p = progressOf(ls, ok);
  const next = nextOf(ls, ok);
  return h('div', { class: 'flex flex-col gap-8' },
    h('div', { class: 'flex flex-col gap-3' },
      h('p', { class: 'm-0 text-muted' }, et(`ladder.${e}.${lv}`)),
      h('div', { class: 'flex flex-wrap items-center gap-x-3 gap-y-1' }, h('div', { class: 'flex min-w-40 flex-1' }, bar(p.done, p.total)),
        h('span', { class: 'text-body-sm tabular-nums text-muted' }, `${et('progress', { k: p.done, n: p.total })} · ${et('level.meta', { n: ls.length, m: ls.reduce((a, x) => a + x.minutes, 0) })}`))),
    ...levelOf(e, lv)!.modules.map((m) => {
      const q = progressOf(m.lessons, ok);
      return h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': `mod-${m.id}` },
        h('div', { class: 'flex items-baseline justify-between gap-3' },
          h('h2', { id: `mod-${m.id}`, class: 'm-0 text-title font-bold' }, m.name[lang()]),
          h('span', { class: 'text-body-sm tabular-nums text-muted' }, `${q.done}/${q.total}`)),
        h('ul', { class: d.ui.LIST }, ...m.lessons.map((l) => lessonRow(l, ok, l === next))));
    }));
}

/** One lesson row (engine-ux-spec §4.3): kind picture (✓ when done), title, "kind · minutes · runtime", one link. */
function lessonRow(l: EngineLesson, ok: Set<string>, isNext: boolean): HTMLElement {
  const isDone = ok.has(l.id);
  const k = honestRow(l);
  return d.ui.listRow({
    lead: leadDisc(isDone ? 'done' : isNext ? 'current' : 'todo', d.icon(KIND_ICON[l.kind], 'size-5')),
    title: l.title[lang()],
    sub: `${et(`kind.${l.kind}`)} · ${et('minutes', { n: l.minutes })} · ${et(k === 'diagram' ? 'short.diagram' : k === 'docs' ? 'short.docs' : 'short.run')}`,
    action: rowLink(lessonHash(l), isDone ? et('row.again') : isNext ? et('row.next') : et('row.open'), isNext),
    current: isNext,
  });
}

// ---- lesson page

interface Visit {
  picks: Record<string, number>;
  says: Record<string, 'right' | 'wrong' | 'pick'>;
  /** L317: wrong checks per question; `why` shows after a right answer or the 2nd wrong one (engine-ux-spec "Câu kiểm"). */
  wrongs: Record<string, number>;
  passed: Set<string>;
  code: string[];
  out: ({ result: LabOutput } | { error: unknown } | undefined)[];
  msg: ({ ok: boolean; text: string } | undefined)[];
  busy?: number;
  /** v23 PRED: the predict with a real plan (pick, verdict, the plan tree after "Xem thật"). */
  pred: PredictState;
  /** v23 CAP: the capstone's before/after plans. */
  cap: CapState;
  /** The statement that passed each lab step in this visit (the capstone's "after" plan replays it). */
  good: string[];
  runner?: Promise<LabRunner>;
  /** "Tables used" (L280): the lab's tables and columns after its setup, read once when the panel first opens. */
  tables?: { t: string; cols: string }[] | { error: unknown } | 'busy';
  tablesOpen?: boolean;
}
/** Per lesson, for the session: a redraw (seed done, language switch) rebuilds the page from here, never from the DOM. */
const visits = new Map<string, Visit>();
const visitOf = (id: string): Visit => {
  let v = visits.get(id);
  if (!v) visits.set(id, (v = { picks: {}, says: {}, wrongs: {}, passed: new Set(), code: [], out: [], msg: [], pred: {}, cap: {}, good: [] }));
  return v;
};

/** Focus survives a redraw: the element with the same data-ek (or the editor inside it) gets it back. */
let focusKey: string | null = null;
function keepFocus(): void {
  focusKey = document.activeElement?.closest('[data-ek]')?.getAttribute('data-ek') ?? focusKey;
  queueMicrotask(() => {
    const el = focusKey ? document.querySelector<HTMLElement>(`[data-ek="${CSS.escape(focusKey)}"]`) : null;
    if (el && !el.contains(document.activeElement) && (document.activeElement === document.body || !document.activeElement?.isConnected)) {
      const ed = editors.get(focusKey!);
      if (ed) ed.ed.focus(); else el.focus(); // a moved editor lost its focus; it takes it back itself
    }
    focusKey = null;
  });
}

/**
 * L281: one CodeMirror editor per lab step or path drill, kept across redraws (the page is rebuilt on every rerender(): a new
 * editor would lose the cursor and undo). The host carries `data-ek=<key>` and a `value` property, the hook smoke/e2e type
 * through. Postgres gets the SQL language; MongoDB/DynamoDB the same editor without it.
 */
const editors = new Map<string, { host: HTMLElement; ed: Editor.Editor }>();
function codeBox(key: string, value: string, label: string, sql: boolean, on: { change(v: string): void; run(): void; submit(): void }): HTMLElement {
  const have = editors.get(key);
  if (have) {
    have.ed.setLabel(label);
    return have.host;
  }
  const host = d.h('div', { class: 'editor overflow-hidden rounded-(--r-ctl) ring-1 ring-line', lang: 'en', 'data-ek': key });
  const ed = d.createEditor(host, { doc: value, schema: {}, label, plain: !sql, onChange: on.change, onRun: on.run, onSubmit: on.submit, onSelection: () => {} });
  Object.defineProperty(host, 'value', { get: () => ed.getValue(), set: (v: string) => ed.setValue(v) });
  editors.set(key, { host, ed });
  return host;
}
/** After a draw: editors no longer in the page (another lesson or skill) are destroyed. */
function sweepEditors(): void {
  for (const [k, x] of editors) if (!x.host.isConnected) { x.ed.destroy(); editors.delete(k); }
}

function complete(l: EngineLesson): void {
  if (done().has(l.id)) return;
  const xp = engineXp(l, false);
  d.app.save.completed.push(l.id);
  d.app.save.xp += xp;
  d.persist(true);
  d.announce(et('complete.xp', { xp }));
  d.rerender();
  // v23 CAP: Lily cheers at the event (after the redraw that drew the finish card), never while drawing.
  if (l.kind === 'capstone') {
    queueMicrotask(() => {
      const card = document.querySelector<HTMLElement>('[data-cap-done]');
      card?.scrollIntoView?.({ block: 'nearest', behavior: d.reducedMotion() ? 'auto' : 'smooth' }); // the last part may sit at the top
      d.cheer.react(card);
    });
  }
}
function passPart(l: EngineLesson, v: Visit, part: string): void {
  v.passed.add(part);
  if (lessonPassed(l, v.passed, gradable)) complete(l);
}

function question(l: EngineLesson, v: Visit, q: Question, part: string, label: string): HTMLElement {
  const { h, cls } = d;
  const name = `${l.id}-${part}`;
  const say = v.says[part];
  const status = h('p', { role: 'status', class: cls.cx('m-0 text-body-sm', say === 'right' ? 'good' : say ? 'bad' : '') },
    say === 'right' ? et('right') : say === 'wrong' ? et(whyShown(say, v.wrongs[part]) ? 'wrongWhy' : 'wrong') : say === 'pick' ? et('pick') : '');
  return h('fieldset', { class: 'm-0 space-y-2 border-0 p-0' },
    h('legend', { class: 'mb-2 p-0 font-bold' }, label ? h('span', { class: 'block text-caption font-bold tracking-wider text-muted uppercase' }, label) : null, ...inline(q.q[lang()])),
    ...d.optionOrder(`${l.id}#${part}`, q.options.length).map((i) => h('label', {
      class: cls.cx('flex min-h-11 cursor-pointer items-center gap-2 rounded-(--r-ctl) px-3 py-1 hover:bg-accent-soft has-[:checked]:bg-accent-soft has-[:checked]:ring-2 has-[:checked]:ring-accent',
        say === 'right' && v.picks[part] === i ? 'bg-good-soft ring-1 ring-good' : say === 'wrong' && v.picks[part] === i ? 'bg-bad-soft ring-1 ring-line' : 'ring-1 ring-line'),
    },
      h('input', {
        type: 'radio', name, value: String(i), 'data-ek': `${name}-${i}`, checked: v.picks[part] === i,
        onchange: () => { v.picks[part] = i; },
      }), h('span', {}, ...inline(q.options[i][lang()])))),
    h('div', { class: 'flex flex-wrap items-center gap-3' },
      h('button', {
        type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${name}-check`,
        onclick: () => {
          const pick = v.picks[part];
          v.says[part] = pick === undefined ? 'pick' : isRight(q, pick) ? 'right' : 'wrong';
          if (part === 'p' && pick !== undefined && typeof predMod === 'object') predMod.recordFirst(d, l.id, pick);
          if (v.says[part] === 'wrong') v.wrongs[part] = (v.wrongs[part] ?? 0) + 1;
          if (v.says[part] === 'right') passPart(l, v, part);
          d.rerender();
        },
      }, et('check')), status),
    whyShown(say, v.wrongs[part]) ? h('p', { class: 'm-0 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm' }, ...inline(q.why[lang()])) : null);
}
/** L317 (engine-ux-spec, Câu kiểm): the explanation after a right answer, or after the 2nd wrong one (the first wrong is a free retry). */
export const whyShown = (say: 'right' | 'wrong' | 'pick' | undefined, wrongs = 0): boolean => say === 'right' || (say === 'wrong' && wrongs >= 2);

function runnerFor(l: EngineLesson, v: Visit): Promise<LabRunner> | undefined {
  const make = LAB_RUNNERS[l.engine];
  if (!make || (!l.lab && !l.predict)) return undefined;
  const lab = l.lab ?? { steps: [] };
  v.runner ??= make(d.lab).then(async (r) => {
    await r.prepare(lab);
    return r;
  }).catch((e: unknown) => {
    v.runner = undefined; // the next click retries
    throw e;
  });
  return v.runner;
}

async function labAction(l: EngineLesson, v: Visit, i: number, submit: boolean): Promise<void> {
  if (v.busy !== undefined) return; // Mod-Enter in the editor while a run is going
  const code = (v.code[i] ?? '').trim();
  if (!code) {
    v.msg[i] = { ok: false, text: et('lab.empty') };
    d.rerender();
    return;
  }
  v.busy = i;
  v.msg[i] = undefined;
  d.rerender();
  try {
    const r = await runnerFor(l, v)!;
    try {
      v.out[i] = { result: await r.run(l.lab!, code, i) };
    } catch (error) {
      v.out[i] = { error };
    }
    if (submit) {
      const verdict = await r.check(l.lab!, l.lab!.steps[i], code);
      v.msg[i] = { ok: verdict.ok, text: verdictLine(verdict) };
      if (verdict.ok) {
        v.good[i] = code;
        passPart(l, v, `s${i}`);
      }
      d.announce(v.msg[i]!.text);
    }
  } catch (error) {
    v.out[i] = { error };
  } finally {
    v.busy = undefined;
    d.rerender();
  }
}

/** One sentence for a lab verdict: a runner's ready text, else its `why` code (L248), else the generic line. */
function verdictLine(x: LabVerdict): string {
  if (x.ok) return x.tip === 'extraId' ? et('tip.extraId') : et('lab.passed');
  if (x.reason === 'unsupported') return et('lab.unsupported');
  if (x.message) return x.message;
  const key = `why.${x.why}`;
  return x.why && Object.hasOwn(ENGINE_DICT.vi, key) ? et(key as EngineKey, x.params) : et('wrong');
}

// ---- v23 lazy parts: the predict + plan tree chunk (PRED, L256) and the capstone chunk (CAP, L257)

type PredChunk = typeof import('./enginePredict');
type CapChunk = typeof import('./engineCapstone');
let predMod: PredChunk | 'loading' | 'failed' | undefined;
let capMod: CapChunk | 'loading' | 'failed' | undefined;
let nosqlMod: typeof import('./engineNosql') | 'loading' | 'failed' | undefined;
/** v25: the NoSQL lab parts (tables used, MongoDB rule bar, pipeline by step, compared with SQL), once loaded. */
const N = () => (typeof nosqlMod === 'object' ? nosqlMod : undefined);
/** The predict chunk, once chunksFor() said 'ready' (callers run only on a drawn lesson that needed it). */
const P = (): PredChunk => predMod as PredChunk;
const PLAN_VIZ = /plan-tree|query-path|explain/;
/** Starts the chunks a lesson needs; 'ready' when all are in, else 'loading' or 'failed' (Retry clears a failure). */
function chunksFor(l: EngineLesson): 'ready' | 'loading' | 'failed' {
  const wantPred = !!l.predict || l.kind === 'capstone' || (!!l.viz && PLAN_VIZ.test(l.viz));
  const wantCap = l.kind === 'capstone' && !!LAB_RUNNERS[l.engine];
  const wantNosql = l.engine !== 'postgres' && !!l.lab;
  if (wantNosql && nosqlMod === undefined) {
    nosqlMod = 'loading';
    import('./engineNosql').then((m) => { nosqlMod = m; }, () => { nosqlMod = 'failed'; }).finally(() => d.rerender());
  }
  if (wantPred && predMod === undefined) {
    predMod = 'loading';
    import('./enginePredict').then((m) => { predMod = m; }, () => { predMod = 'failed'; }).finally(() => d.rerender());
  }
  if (wantCap && capMod === undefined) {
    capMod = 'loading';
    import('./engineCapstone').then((m) => { capMod = m; }, () => { capMod = 'failed'; }).finally(() => d.rerender());
  }
  const st = [wantPred ? predMod : 'ok', wantCap ? capMod : 'ok', wantNosql ? nosqlMod : 'ok'];
  return st.includes('failed') ? 'failed' : st.includes('loading') ? 'loading' : 'ready';
}
const capChunk = (): CapChunk | undefined => (typeof capMod === 'object' ? capMod : undefined);
const levelDone = (l: EngineLesson): boolean => {
  const ok = done();
  return trees[l.engine].levels.find((x) => x.level === l.level)!.modules.every((m) => m.lessons.every((x) => ok.has(x.id)));
};
function capCtx(l: EngineLesson, v: Visit): import('./engineCapstone').CapCtx {
  const isDone = done().has(l.id); // completed in an earlier visit: every graded step counts as passed
  const graded = (i: number): boolean => gradable(l, l.lab!.steps[i]);
  return {
    d, et: P().withPred(d, et), inline, lang: lang(), l, graded, passed: isDone ? new Set(l.lab!.steps.flatMap((_, i) => (graded(i) ? [`s${i}`] : []))) : v.passed, st: v.cap, tree: P().planTreeView, pred: P(), done: isDone, levelDone: levelDone(l),
    explainAt: async (lab, sql, step) => (await (await runnerFor(l, v)!).run(lab, P().explainSql(sql), step)).rows[0]?.[0],
    mine: (i) => v.good[i],
  };
}

/** Tables and columns of the lab's own schema after its setup (a lab on the shop chain: only the tables its steps name). */
const TABLES_SQL = `SELECT c.table_name::text AS t, string_agg(c.column_name || ' ' || c.data_type, ', ' ORDER BY c.ordinal_position) AS cols
FROM information_schema.columns c WHERE c.table_schema = current_schema() GROUP BY 1 ORDER BY 1`;
async function loadTables(l: EngineLesson, v: Visit): Promise<void> {
  v.tables = 'busy';
  d.rerender();
  try {
    const r = await runnerFor(l, v)!;
    const out = await r.run(l.lab!, TABLES_SQL); // no step: the setup only, no earlier solution replayed
    const named = l.lab!.steps.map((s) => s.solution).join('\n').toLowerCase();
    v.tables = out.rows.map((x) => ({ t: String(x[0]), cols: String(x[1]) }))
      .filter((x) => l.lab!.setup || new RegExp(`\\b${x.t}\\b`).test(named));
  } catch (error) {
    v.tables = { error };
  }
  d.rerender();
}
const tableBox = (name: string, line: string, body: Node): HTMLElement =>
  d.h('details', { class: 'rounded-(--r-inset) bg-canvas px-2 py-1 ring-1 ring-line' },
    d.h('summary', { class: 'cursor-pointer text-body-sm' }, d.h('code', {}, name), ` · ${line}`), body);
/** "Tables used" (L280, blind-pg.md: names the steps need were never shown). Postgres reads it from the lab itself on first open. */
function tablesPanel(l: EngineLesson, v: Visit): HTMLElement | null {
  const { h } = d;
  if (l.engine !== 'postgres') return N()?.tablesPanel(d, l) ?? null; // v25: the NoSQL panel lives in the engineNosql chunk
  const t = v.tables;
  const body = t === undefined ? null : t === 'busy' ? h('p', { class: 'my-1 flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('tables.loading'))
    : 'error' in t ? d.errorView(t.error, false)
      : t.length ? h('div', { class: 'flex flex-col gap-1.5 pt-1' }, ...t.map((x) => tableBox(x.t, et('tables.cols', { n: x.cols.split(', ').length }),
        h('p', { class: 'my-1 text-body-sm text-muted', lang: 'en' }, x.cols))))
        : h('p', { class: 'my-1 text-body-sm text-muted' }, et('tables.none'));
  const box = h('details', { class: 'space-y-1', open: !!v.tablesOpen }, h('summary', { class: 'cursor-pointer text-body-sm font-bold' }, et('tables.title')), body);
  box.addEventListener('toggle', () => {
    v.tablesOpen = box.open;
    if (box.open && (v.tables === undefined || (typeof v.tables === 'object' && 'error' in v.tables))) void loadTables(l, v);
  });
  return box;
}

function labView(l: EngineLesson, v: Visit): HTMLElement {
  const { h, cls } = d;
  const steps = l.lab!.steps;
  const live = !!LAB_RUNNERS[l.engine];
  const cap = l.kind === 'capstone' && live ? capChunk() : undefined;
  const cc = cap ? capCtx(l, v) : undefined;
  const cur = cap && cc ? cap.currentStep(cc) : -1;
  // One BTN_GO per region (v23, L299): only the current step's Submit (the capstone's, else the first not passed) is the main button.
  const main = cap && cc ? cur : steps.findIndex((s, i) => gradable(l, s) && !v.passed.has(`s${i}`));
  return h('section', { class: 'flex flex-col gap-4', 'aria-labelledby': `${l.id}-lab` },
    cardHead(`${l.id}-lab`, 'kindLab', et('lab.title')),
    cap && cc ? cap.capBar(cc) : null,
    h('div', { class: 'flex flex-col gap-3 rounded-(--r-ctl) bg-info-soft p-4 text-body-sm' },
      h('p', { class: 'm-0' }, !live ? et('lab.noRunner') : l.engine === 'mongodb' ? et('lab.dataMongo') : l.engine === 'dynamodb' ? et('lab.dataDynamo') : l.lab!.setup ? et('lab.dataPg') : et('lab.data')),
      live && l.runtime !== 'docs' ? tablesPanel(l, v) : null),
    cap && cc ? cap.capChecks(cc) : null,
    h('ol', { class: 'm-0 list-none space-y-4 p-0' }, ...steps.map((s, i) => {
      const out = v.out[i];
      const msg = v.msg[i];
      const key = `${l.id}-s${i}`;
      const passed = v.passed.has(`s${i}`);
      const res = out && 'result' in out ? out.result : undefined;
      // A passed step drops the "result too large, add a LIMIT" caption (blind-pg l4-01/l4-04): the step is already right.
      const shown = res && passed && res.truncated ? { ...res, truncated: undefined } : res;
      // v23 CAP (L257): a capstone's current step (the first not passed) gets the accent ring and says so in words.
      return h('li', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-4 max-sm:p-3', i === cur && 'ring-2 ring-accent'), 'data-step': key, 'aria-current': i === cur ? 'step' : false },
        h('div', { class: 'flex items-start gap-3' },
          leadDisc(passed ? 'done' : i === cur ? 'current' : 'todo', String(i + 1)),
          h('div', { class: 'min-w-0 flex-1 flex flex-col gap-1' },
            h('h3', { class: 'm-0 text-caption font-bold tracking-wider text-muted uppercase' }, et('lab.step', { i: i + 1, n: steps.length }),
              i === cur ? h('span', { class: 'ml-2 text-accent' }, `· ${et('cap.current')}`) : null),
            h('p', { class: 'm-0' }, ...inline(s.task[lang()])), N()?.stepTop(d, s))),
        live ? codeBox(`${key}-code`, v.code[i] ?? '', et('lab.code', { i: i + 1 }), l.engine === 'postgres', {
          change: (x) => { v.code[i] = x; }, run: () => void labAction(l, v, i, false), submit: () => void labAction(l, v, i, true),
        }) : null,
        live ? h('div', { class: 'flex flex-wrap items-center gap-2' },
          h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${key}-run`, disabled: v.busy !== undefined, onclick: () => void labAction(l, v, i, false) }, et('lab.run')),
          h('button', { type: 'button', class: cls.cx(i === main ? cls.BTN_GO : cls.BTN_SECONDARY, 'px-4 py-1.5 disabled:bg-code disabled:text-disabled disabled:shadow-none'), 'data-ek': `${key}-submit`, disabled: v.busy !== undefined, onclick: () => void labAction(l, v, i, true) }, et('lab.submit')),
          v.busy === i ? h('span', { class: 'flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing')) : null) : null,
        h('details', {}, h('summary', { class: 'cursor-pointer text-body-sm font-semibold text-accent' }, et('lab.hint')), h('p', { class: 'mt-2 mb-0 text-body-sm' }, ...inline(s.hint[lang()]))),
        h('p', { role: 'status', 'data-ek': `${key}-status`, class: cls.cx('m-0 text-body-sm', msg ? (msg.ok ? 'good' : 'bad') : '') }, ...inline(msg?.text ?? '')),
        s.fact && passed ? h('p', { class: 'm-0 rounded-(--r-inset) bg-good-soft p-3 text-body-sm' }, h('b', {}, `${et('lab.fact')}: `), ...inline(s.fact[lang()])) : null,
        out ? h('div', { class: 'overflow-x-auto' }, shown ? d.renderResult(shown) : d.errorView((out as { error: unknown }).error, false)) : null,
        shown ? metaView(shown) : null,
        shown ? N()?.stepEnd(d, s, shown, passed, key) : null,
        shown ? insideView(shown, `${key}-inside`) : null,
        shown ? planViz(l, shown, v.code[i] ?? '', `${key}-plan`) : null);
    })),
    cap && cc ? cap.capPlans(cc) : null,
    cap && cc ? cap.capDone(cc) : null);
}

/** Engine numbers beside the result (LabMeta); nothing when the runner gave none. */
function metaView(r: LabOutput): HTMLElement | null {
  const m = r.meta;
  if (!m) return null;
  const { h } = d;
  const pairs: [EngineKey, string][] = [];
  if (m.table !== undefined) pairs.push(['meta.table', m.table]);
  for (const k of ['scannedCount', 'count', 'consumedCapacity'] as const) if (m[k] !== undefined) pairs.push([`meta.${k}`, m[k]!.toLocaleString(d.locale())]);
  if (m.explain) {
    pairs.push(['meta.stages', m.explain.stages.join(' → ')], ['meta.keysExamined', m.explain.keysExamined.toLocaleString(d.locale())],
      ['meta.docsExamined', m.explain.docsExamined.toLocaleString(d.locale())]);
  }
  const plans = (['planBefore', 'planAfter'] as const).filter((k) => m[k]);
  return h('section', { class: 'flex flex-col gap-2', 'aria-label': et('meta.title') },
    pairs.length ? h('dl', { class: 'm-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm' },
      ...pairs.flatMap(([k, v]) => [h('dt', { class: 'text-muted' }, et(k)), h('dd', { class: 'm-0 font-semibold tabular-nums' }, v)])) : null,
    ...plans.map((k) => h('div', {}, h('p', { class: 'm-0 text-body-sm text-muted' }, et(`meta.${k}`)), h('pre', { class: 'sql m-0 overflow-x-auto' }, m[k]!))),
    m.catalog?.length ? h('div', {}, h('p', { class: 'm-0 text-body-sm text-muted' }, et('meta.catalog')),
      h('pre', { class: 'sql m-0 overflow-x-auto' }, m.catalog.map((row) => row.map(String).join(' | ')).join('\n'))) : null);
}

/** "Bên trong" (engine-ux-spec §5.3): a pageinspect result as line pointers with decoded infomask flags, or the missing columns. */
function insideView(r: LabOutput, slot: string): HTMLElement | null {
  const v = heapView(r);
  if (!v) return null;
  const { h } = d;
  if ('missing' in v) return h('p', { class: 'm-0 text-body-sm text-muted' }, et('inside.missing', { cols: v.missing.join(', ') }));
  // The real page as ENG-VIZ's heap diagram (L237: heap_page_items rows as they come), above the decoded table.
  const rows = r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
  const diagram = vizSlot(slot, 'pg-heap-page', 'postgres', { rows }, JSON.stringify(r.rows));
  const head = ['lp', 'lp_flags', 't_xmin', 't_xmax', 't_ctid', 'infomask'];
  return h('figure', { class: 'm-0 flex flex-col gap-2', 'data-inside': '' },
    h('figcaption', { class: 'text-body-sm' }, h('b', {}, `${et('inside.title')}: `), et('inside.caption', { n: v.rows.length, dead: v.dead, hot: v.hot })),
    h('div', { class: 'overflow-x-auto' }, h('table', { class: 'text-body-sm', lang: 'en' },
      h('thead', {}, h('tr', {}, ...head.map((c) => h('th', { scope: 'col', class: 'px-2 text-left font-mono' }, c)))),
      h('tbody', {}, ...v.rows.map((x) => h('tr', { class: x.flag === 'dead' ? 'bad' : x.flags.includes('HOT_UPDATED') || x.flag === 'redirect' ? 'warn' : '' },
        ...[x.lp, x.flag, x.xmin, x.xmax, x.ctid, x.flags.join(' ')].map((c) => h('td', { class: 'px-2 font-mono whitespace-nowrap' }, c)))))),
    diagram));
}

/**
 * v23 (PG-VIZ live model, L258): a lab result that is EXPLAIN (FORMAT JSON) output, on a lesson whose `viz` is the plan tree
 * or the query path, is drawn by that diagram from the learner's own plan (like pageinspect rows → pg-heap-page).
 * `pg-partition-prune` needs the partition bounds too (PruneModel.parts), which a lab result does not carry: it keeps its sample.
 */
function planViz(l: EngineLesson, r: LabOutput, sql: string, slot: string): HTMLElement | null {
  const json = r.columns.length === 1 ? r.rows[0]?.[0] : undefined;
  if (!l.viz || l.engine !== 'postgres' || typeof predMod !== 'object' || !predMod.planTree(json)) return null;
  const key = JSON.stringify(json);
  if (/query-path/.test(l.viz)) return vizSlot(slot, 'pg-query-path', 'postgres', { sql: sql.replace(/^\s*EXPLAIN\s*(\([^)]*\))?\s*/i, ''), plan: json }, key);
  if (/plan-tree|explain/.test(l.viz)) return vizSlot(slot, 'pg-plan-tree', 'postgres', json, key);
  return null;
}

/**
 * One host per diagram (a lesson's `viz:`, or a lab result drawn as a diagram), remounted only when the language, theme or
 * model changes (vizRegistry contract, L238): the old one is destroyed and the new one opens on the same step.
 */
const vizHosts = new Map<string, { key: string; host: HTMLElement; mounted?: VizMounted }>();
function vizSlot(slot: string, name: string | undefined, engine: EngineId, model?: unknown, modelKey = ''): HTMLElement | null {
  if (!name) return null;
  const ctx = { lang: lang(), dark: d.isDark(), reducedMotion: d.reducedMotion() };
  const key = `${ctx.lang}|${ctx.dark}|${modelKey}`;
  const old = vizHosts.get(slot);
  if (old?.key === key) return old.host;
  const step = old?.mounted?.index;
  old?.mounted?.destroy();
  const entry: { key: string; host: HTMLElement; mounted?: VizMounted } = { key, host: d.h('div', { class: 'min-w-0', 'data-viz': name }) };
  vizHosts.set(slot, entry);
  void vizMountFor(name, SHORT_OF[engine], d.viz, model).then((mount) => {
    if (mount && vizHosts.get(slot) === entry) entry.mounted = mount(entry.host, { ...ctx, step });
  }, () => { vizHosts.delete(slot); }); // a failed chunk leaves the slot empty; the next visit tries again
  return entry.host;
}
const SHORT_OF: Record<EngineId, 'pg' | 'mg' | 'dy'> = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy' };

const HONEST_CLS: Record<Honest, string> = {
  pg: 'bg-good-soft text-ink', mingo: 'bg-good-soft text-ink', dynoxide: 'bg-good-soft text-ink', diagram: 'bg-surface-2 text-muted', docs: 'bg-info-soft text-ink',
};
/** The one honest runtime chip under the title (§3.6, checklist L1). */
function honestChip(l: EngineLesson): HTMLElement {
  const k = honestOf(l);
  return d.h('span', { class: d.cls.cx(d.cls.PILL, HONEST_CLS[k]), 'data-honest': k },
    k === 'docs' ? d.icon('docsOnly', 'size-4') : d.h('span', { class: 'inline-block size-2 rounded-full bg-current', 'aria-hidden': 'true' }), et(`honest.${k}`));
}
const kindChip = (k: Kind): HTMLElement => d.h('span', { class: d.cls.cx(d.cls.PILL, 'bg-code text-ink') }, d.icon(KIND_ICON[k], 'size-4'), et(`kind.${k}`));
const cardHead = (id: string, icon: Icons.IconName, text: string): HTMLElement =>
  d.h('h2', { id, class: 'm-0 flex items-center gap-2 text-title font-bold' }, d.icon(icon, 'size-5 text-accent'), text);

function lessonPage(l: EngineLesson): HTMLElement {
  const { h, cls } = d;
  const v = visitOf(l.id);
  const ok = done();
  const parts = partsOf(l, gradable);
  const all = flat(l.engine);
  const at = all.findIndex((x) => x.id === l.id);
  const prev = all[at - 1];
  const next = all[at + 1];
  const module = levelOf(l.engine, l.level)!.modules.find((m) => m.id === l.module)!;
  const req = l.requires.map((id) => lessons.find((x) => x.id === id)).filter((x): x is EngineLesson => !!x);
  const isDone = ok.has(l.id);
  return h('article', { class: 'flex flex-col gap-8', 'aria-labelledby': 'home-title', 'data-lesson': l.id },
    h('div', { class: 'flex flex-col gap-2' },
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' },
        honestChip(l), kindChip(l.kind), h('span', {}, et('minutes', { n: l.minutes })), h('span', { 'aria-hidden': 'true' }, '·'),
        h('a', { href: d.engineHash(l.engine, l.level), class: 'text-muted' }, module.name[lang()]),
        isDone ? h('span', { class: cls.cx(cls.PILL, cls.DONE_PILL) }, d.icon('check', 'size-4'), et('done')) : null),
      l.runtime === 'docs' ? h('p', { class: 'm-0 text-body-sm text-muted', 'data-runtime': 'docs' }, et(l.docsWhy ? `runtime.docs.${l.docsWhy}` : 'runtime.docs')) : null,
      req.length ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, h('span', { class: 'text-muted' }, `${et('requires')}:`),
        ...req.map((x) => h('a', { href: lessonHash(x), class: cls.cx(cls.PILL, 'min-h-6 bg-code text-ink no-underline hover:bg-accent-soft') }, x.title[lang()], tick(ok.has(x.id))))) : null),
    h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-2 p-5 max-sm:p-4'), 'aria-labelledby': `${l.id}-obj` },
      h('h2', { id: `${l.id}-obj`, class: 'm-0 text-caption font-bold tracking-wider text-muted uppercase' }, et('objectives')),
      h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...l.objectives.map((o) => h('li', {}, ...inline(o[lang()]))))),
    ...l.sections.map((s) => h('section', { class: 'flex flex-col gap-3' },
      h('h2', { class: 'm-0 text-title font-bold' }, SECTIONS[s.id][lang() === 'vi' ? 0 : 1]), prose(s.text[lang()]))),
    vizSlot(l.id, l.viz, l.engine),
    l.predict ? h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-5 max-sm:p-4'), 'aria-labelledby': `${l.id}-pred` },
      cardHead(`${l.id}-pred`, 'kindPredict', et('predict.title')),
      ...(P().hasRealRun(l)
        ? [P().predictView(l, {
          d, et: P().withPred(d, et), inline, lang: lang(), st: v.pred, next: next ? { href: lessonHash(next) } : undefined,
          explain: async () => (await (await runnerFor(l, v)!).run(l.lab ?? { steps: [] }, P().explainSql(l.predict!.sql))).rows[0]?.[0],
          run: async () => (await runnerFor(l, v)!).run(l.lab ?? { steps: [] }, l.predict!.sql),
          pass: () => passPart(l, v, 'p'),
          diagram: (json) => vizSlot(`${l.id}-pred`, 'pg-plan-tree', 'postgres', json, JSON.stringify(json)),
        })]
        : [h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, l.predict.sql), question(l, v, l.predict, 'p', ''), P().recordedView(l, d, P().withPred(d, et))])) : null,
    // review v23: the lab before the questions (capstone: "quiz = the closing questions", product-design-db-engine §capstone; the lessons' text says "then N questions")
    l.lab ? labView(l, v) : null,
    l.quiz?.length ? h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-4 p-5 max-sm:p-4'), 'aria-labelledby': `${l.id}-quiz` },
      cardHead(`${l.id}-quiz`, 'kindQuiz', et('quiz.title')),
      h('div', { class: 'divide-y divide-line [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0' },
        ...l.quiz.map((q, i) => h('div', {}, question(l, v, q, `q${i}`, et('quiz.n', { i: i + 1, n: l.quiz!.length })))))) : null,
    h('section', { class: cls.cx(cls.CARD, 'flex flex-wrap items-center gap-3 p-5 max-sm:p-4'), 'aria-label': et('done') },
      isDone ? h('p', { class: 'm-0 flex items-center gap-2 font-bold good' }, d.icon('check', 'size-5'), et('complete.done'))
        : parts.length ? h('p', { class: 'm-0 text-body-sm' }, et('complete.parts', { k: parts.filter((p) => v.passed.has(p)).length, n: parts.length }))
          : h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': `${l.id}-done`, onclick: () => complete(l) }, et('complete.btn')),
      h('div', { class: 'ml-auto flex flex-wrap gap-2' },
        prev ? h('a', { href: lessonHash(prev), class: cls.cx(cls.BTN_GHOST, 'inline-flex items-center gap-1 px-4 py-2 no-underline'), title: prev.title[lang()] }, d.icon('chevronLeft', 'size-4'), et('lesson.prev')) : null,
        next ? h('a', { href: lessonHash(next), class: cls.cx(isDone ? cls.BTN_GO : cls.BTN_SECONDARY, 'inline-flex items-center gap-1 px-4 py-2 no-underline'), title: et('next', { title: next.title[lang()] }) },
          et('lesson.next'), d.icon('chevronRight', 'size-4')) : null)),
    l.sources.length ? h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': `${l.id}-src` },
      h('h2', { id: `${l.id}-src`, class: 'm-0 text-body font-bold' }, et('sources')),
      h('ul', { class: 'm-0 list-disc space-y-1 pl-5 text-body-sm' }, ...l.sources.map((u) =>
        h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', title: u, class: 'inline-flex items-center gap-1.5' },
          d.icon('external', 'size-4 shrink-0'), sourceTitle(u), h('span', { class: 'sr-only' }, ` (${et('newTab')})`)))))) : null);
}

const SITE: Record<string, string> = {
  'www.postgresql.org': 'PostgreSQL', 'wiki.postgresql.org': 'PostgreSQL Wiki', 'www.mongodb.com': 'MongoDB',
  'docs.aws.amazon.com': 'DynamoDB', 'use-the-index-luke.com': 'Use The Index, Luke', 'www.sqlstyle.guide': 'SQL Style Guide',
};
/** v23 (L299): a source's link text, from its URL (sources are bare https URLs): "PostgreSQL · Storage hot". */
export function sourceTitle(u: string): string {
  let url: URL;
  try { url = new URL(u); } catch { return u; }
  const dec = (x: string): string => { try { return decodeURIComponent(x); } catch { return x; } };
  // "HowItWorks.DataTypes" → "How It Works Data Types"; "bp-sort-keys" → "bp sort keys"
  const words = (x: string): string => dec(x).replace(/\.html?$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_.]+/g, ' ').trim();
  const seg = url.pathname.split('/').filter(Boolean).at(-1);
  const anchor = url.hash.length > 1 && words(url.hash.slice(1).replace(/\.([0-9A-F]{2})/g, '%$1')); // MediaWiki writes ' as .27
  const page = [seg && words(seg), anchor && (/[a-z]/.test(anchor) ? anchor : anchor.toLowerCase())].filter(Boolean).join(' › ');
  const site = SITE[url.hostname] ?? url.hostname.replace(/^www\./, '');
  return page ? `${site} · ${page[0].toUpperCase()}${page.slice(1)}` : site;
}

// ---- #/me and sidebar

/** v24 (L334): the #/me skill map reads each engine's modules from here (src/mastery.ts engineLevels). */
export const engineTrees = (): Readonly<Record<EngineId, Tree>> => trees;

export function sideRows(ui: { row: (r: Row) => HTMLElement; group: (text: string) => HTMLElement }): (Node | null)[] {
  const r = d.engineRouteOf(location.hash);
  const ok = done();
  const open = ENGINES.find((e) => e === r.engine);
  const path = open === 'mongodb' && d.enginePathOf(location.hash) !== undefined;
  const out: (Node | null)[] = [
    ui.row({ key: 'e:all', href: d.hashOf('engine'), lead: d.icon('engine'), label: d.t('nav.engine'), current: !open }),
    ui.group(et('side.engines')),
    ...ENGINES.map((e) => {
      const p = progressOf(flat(e), ok);
      return ui.row({ key: `e:${e}`, href: d.engineHash(e), lead: d.icon(ENGINE_ICON[e]), label: NAME[e],
        sub: et('me.line', { k: p.done, n: p.total }), current: open === e && !r.level && !path });
    }),
  ];
  if (!open) return out;
  // engine-ux-spec §3.1 (L189): one row per level, the number only in its badge, its short name, done/total; the one current
  // row is the smallest unit holding the page (the level page or the open lesson's level).
  for (const lv of trees[open].levels.filter((x) => x.modules.length)) {
    const p = progressOf(levelLessons(open, lv.level), ok);
    out.push(ui.row({ key: `e:${open}:${lv.level}`, href: d.engineHash(open, lv.level),
      lead: p.total && p.done === p.total ? d.icon('check', 'size-5 text-good') : d.h('b', { class: 'text-caption' }, lv.level),
      label: et(`level.${lv.level}`), full: levelName(lv.level), sub: et('me.line', { k: p.done, n: p.total }), current: r.level === lv.level }));
  }
  if (open === 'mongodb') out.push(ui.row({ key: 'e:path', href: d.enginePathHash(), lead: d.icon('nosqlPath'), label: et('nosql.title'), current: path }));
  return out;
}

// ---- MongoDB path ("Lộ trình NoSQL", L248): its own lazy chunk since L280 (budget `engineuiPath`)

type PathView = typeof import('./enginePathView');
let pathMod: PathView | 'loading' | 'failed' | undefined;
function pathPage(slug: string): HTMLElement {
  if (pathMod === undefined) {
    pathMod = 'loading';
    import('./enginePathView').then((m) => { pathMod = m; }, () => { pathMod = 'failed'; }).finally(() => d.rerender());
  }
  if (pathMod === 'loading') return loadingLine();
  if (pathMod === 'failed') return failedBox(() => { pathMod = undefined; d.rerender(); });
  const ctx: PathCtx = { d, et, inline, prose, tick, verdictLine, codeBox, done, leadDisc, rowLink };
  return pathMod.pathPage(ctx, slug);
}
