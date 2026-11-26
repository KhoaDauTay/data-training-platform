import {
  blocksOf, docsNoteKey, ENGINES, engineXp, isEsLesson, isRight, onPg, lessonPassed, parseEngineLesson, parseModules, partsOf, progressOf, treeOf,
  type EngineId, type EngineLesson, type Kind, type LabStep, type LessonSource, type Level, type ModuleName, type Rung, type Question, type SectionId, type Tree,
} from '../engine/content';
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
import type { FullCtx } from './engineFull';
import type { HubCtx } from './engineHub';
type HubView = typeof import('./engineHub');

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
  /** v27 (L410–L411): the glossary and interview room routes. */
  engineTermsOf: typeof Route.engineTermsOf; engineTermsHash: typeof Route.engineTermsHash;
  engineInterviewOf: typeof Route.engineInterviewOf; engineInterviewHash: typeof Route.engineInterviewHash; interviewTabHash: typeof Route.interviewTabHash;
  /** v28 (L430): the "Which engine?" page. */
  engineCompareOf: typeof Route.engineCompareOf; engineCompareHash: typeof Route.engineCompareHash;
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
  /** v47 S2 (L940): the lazy engineTrack chunk (track facts, level chooser, "next" buttons, cross-links) and route skill labels. */
  track?: typeof import('./engineTrack');
  skill?: (id: string) => { vi: string; en: string } | undefined;
}
/** src/engineSources.ts: the lesson index (list fields only), one lazy chunk per lesson, and every engine's modules.yml. */
export interface EngineSources { meta: Record<string, LessonSource>; full: Record<string, () => Promise<LessonSource>>; modules: Record<string, unknown> }

let d: EngineDeps;
let lessons: EngineLesson[] = [];
const trees = {} as Record<EngineId, Tree>;
/** modules.yml names per engine (the Extensions shelf groups its lessons by these, v43 L720). */
const modNames = {} as Record<EngineId, ModuleName[]>;
const NAME: Record<Exclude<EngineId, 'design' | 'stack' | 'search' | 'timeseries'>, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB', redis: 'Redis', olap: 'OLAP & ClickHouse', stream: 'Streaming & CDC' }; // v47 (L1062): Streaming & CDC is a proper name in VI and EN
/** v28 R4 (L420): product names stay as they are; the design track's name is translated. */
/** v46 (L839a): a lab whose learner types Jinja (a model step, or a ref()/source() Solution: dbt.ts isDbtLab, inlined) shows the dbt notice. */
const dbtLab = (l: EngineLesson): boolean => !!l.lab?.steps.some((s) => s.model || /\{\{\s*(ref|source)\s*\(/.test(s.solution));
const nameOf = (e: EngineId): string => (e === 'design' || e === 'stack' || e === 'search' || e === 'timeseries' ? et(`name.${e}`) : NAME[e]);
/** L280: one generic picture per engine (no logos): a table grid, a JSON document, a key and its values. */
const ENGINE_ICON = { postgres: 'engRelational', mongodb: 'engDocument', dynamodb: 'engKeyValue', redis: 'engRedis', design: 'engDesign', stack: 'engStack', olap: 'engOlap', search: 'engSearch', timeseries: 'engTimeseries', stream: 'engStream' } as const satisfies Record<EngineId, Icons.IconName>;
const KIND_ICON = { concept: 'kindConcept', lab: 'kindLab', predict: 'kindPredict', quiz: 'kindQuiz', capstone: 'kindCapstone' } as const satisfies Record<Kind, Icons.IconName>;
const et = (key: EngineKey, params?: I18n.Params): string => engineText(d.getLang(), d.locale(), key, params);

/** Parses every engine's content (throws on a broken file: the main part shows the load failure and Retry). */
export function initEngine(deps: EngineDeps, src: EngineSources, bp: Record<string, { fm: unknown }> = {}, hubView?: HubView): void {
  d = deps;
  if (hubView) hub = hubView;
  bpTitles = Object.fromEntries(Object.values(bp).map(({ fm }) => fm as { id: string; title: string; title_en: string }).map((f) => [f.id, { vi: f.title, en: f.title_en }]));
  fullSrc = src.full;
  lessons = Object.entries(src.meta).map(([path, s]) => parseEngineLesson(s, path));
  for (const e of ENGINES) {
    const names: ModuleName[] = Object.entries(src.modules).filter(([path]) => path.includes(`/${e}/`)).flatMap(([path, s]) => parseModules(s, path));
    trees[e] = treeOf(e, lessons, names);
    modNames[e] = names;
  }
  d.track?.initTrack(lessons);
}

/** Full lessons (sections, lab, quiz), parsed from their own chunk on first open; a failed load is retried by Retry. */
let fullSrc: EngineSources['full'] = {};
const fulls = new Map<string, EngineLesson | 'loading' | 'failed'>();
const pathOf = (l: EngineLesson): string | undefined => Object.keys(fullSrc).find((p) => p.includes(`/${l.engine}/${l.level === 'EXT' ? 'ext' : l.level}/${String(l.order).padStart(2, '0')}-`));
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
const levelName = (lv: Level): string => (lv === 'EXT' ? et('level.EXT') : `${lv} · ${et(`level.${lv}`)}`);
const levelOf = (e: EngineId, lv: string | undefined) => trees[e].levels.find((x) => x.level === lv && x.modules.length);
/** v43 (L720): the PostgreSQL Extensions shelf, in file order (never in a tree: no badge, no level row, no XP). */
const extLessons = (): EngineLesson[] => lessons.filter((l) => l.level === 'EXT').sort((a, b) => a.order - b.order);
const moduleName = (e: EngineId, id: string): { vi: string; en: string } => {
  const n = modNames[e]?.find((x) => x.id === id);
  return n ? { vi: n.vi, en: n.en } : { vi: id, en: id };
};
/** `done`/`total` of the Extensions shelf (#/me line, v43 L722). */
export const extProgress = (): { done: number; total: number } => progressOf(extLessons(), done());
const levelLessons = (e: EngineId, lv: Level): EngineLesson[] => levelOf(e, lv)?.modules.flatMap((m) => m.lessons) ?? [];
/** The first lesson not done, in engine order (undefined = all done). */
const nextOf = (all: EngineLesson[], ok: Set<string>): EngineLesson | undefined => all.find((x) => !ok.has(x.id));

/**
 * Paragraphs and list items: `code` spans, and **bold** outside code (558 spans in content/engine; review v22 RC: the
 * asterisks showed as text), and lesson/card ids as titled links (v44, below). Nothing else is interpreted.
 */
export function inline(text: string, marked = false): (Node | string)[] {
  // v27: term buttons (marked), never in code spans; v44: bare ids are links before the terms see them
  const plain = (q: string): (Node | string)[] => q.split(BARE).flatMap((x, i) => (i % 2 ? idRef(x) : marked && mark ? mark.inline(x) : x ? [x] : []));
  // v35 R1 (T1-C8-01, L559): inline code may break anywhere, so one long span never widens a 320 px page
  return text.split(CODE).flatMap((p, i) => (!p ? [] : i % 2 ? (p.startsWith('`') && !new RegExp(`^\x60${ID}\x60$`).test(p) ? [d.h('code', { class: '[overflow-wrap:anywhere]' }, p.slice(1, -1))] : idRef(p))
    : p.split(/(\*\*[^*\n]+\*\*)/).filter(Boolean).flatMap((q) => (q.length > 4 && q.startsWith('**') && q.endsWith('**') ? [d.h('strong', {}, ...plain(q.slice(2, -2)))] : plain(q)))));
}
/**
 * v44 (L790–L791): a lesson or Best Practice id anywhere in Engine text (prose, quiz `why`, hints, facts, BP cards; bare or
 * in backticks, with or without a "bài/lesson/thẻ/card" before it) is a link named by the lesson's or card's title only: a
 * learner never reads `e-pg-l4-03`. The word before stays prose ("bài Thống kê nhiều cột ↗"); without a title (never for
 * shipped content: tests/engineBpLink.test.ts) the link says "bài liên quan" and swallows that word, so no "bài bài".
 */
const ID = String.raw`e-(?:(?:pg|mg|dy|rd|ds|st|ol|sr|ts|sm)-(?:l[1-5]|ext)-|bp-[a-z])\d\d`; // v43: + the Extensions shelf (e-pg-ext-NN)
const PRE = String.raw`(?:(?<=^|[\s(])(?:bài|thẻ|lab|lesson|card) )?`;
const CODE = new RegExp(`(${PRE}\x60${ID}\x60|\x60[^\x60\n]+\x60)`);
const BARE = new RegExp(String.raw`(${PRE}\b${ID}(?![\w-]))`);
const SHORT = { pg: 'postgres', mg: 'mongodb', dy: 'dynamodb', rd: 'redis', ds: 'design', st: 'stack', ol: 'olap', sr: 'search', ts: 'timeseries', sm: 'stream' } as const;
let bpTitles: Record<string, { vi: string; en: string }> = {};
function idRef(seg: string): (Node | string)[] {
  const word = /^\S+ /.exec(seg)?.[0] ?? '';
  const id = seg.slice(word.length).replace(/`/g, '');
  const m = /^e-(pg|mg|dy|rd|ds|st|ol|sr|ts|sm)-(l[1-5]|ext)-/.exec(id);
  const title = m ? lessons.find((x) => x.id === id)?.title : bpTitles[id];
  const href = m ? d.engineHash(SHORT[m[1] as keyof typeof SHORT], (m[2] === 'ext' ? 'EXT' : m[2].toUpperCase()) as Level, id) : bpHashOf(id);
  if (!href) return [seg]; // an e-bp code with no track letter: content tests keep this from shipping
  // v38 R3 (R3-05, L593): a completed lesson or card gets the done tick (with its sr-only word), so the hub's map shows progress
  const a = xref(href, title?.[lang()] ?? et('xref.related'), d.app.save.completed.includes(id));
  return title ? [word, a] : [a];
}
/**
 * v35 R1 (E01, L558): a lesson or card link reads as a link: accent ink (≥ 4.5:1 on every surface, both themes), a solid
 * underline and an arrow, never the glossary's dotted teal underline (a term button), never body text.
 */
const XREF = 'font-semibold text-accent-ink underline decoration-1 underline-offset-[3px] hover:decoration-2';
const xref = (href: string, text: string, seen = false): HTMLElement => d.h('a', { href, 'data-xref': '', 'data-done': seen ? '' : false, class: XREF },
  text, d.icon('arrowRight', 'ml-0.5 inline size-3.5 align-[-2px]'), tick(seen));
/**
 * v34 (L545, handoff item 4): a Best Practice card id (`e-bp-s10`) → its card's route. The track follows the code's letter
 * (content/engine/best/<track>/<code>-…), so no card index has to load here; tests/engineBpLink.test.ts checks every card.
 */
const BP_TRACK: Record<string, string> = { a: 'sql', q: 'sql', i: 'postgres', p: 'postgres', s: 'postgres', x: 'postgres', m: 'mongodb', d: 'dynamodb' };
export const bpHashOf = (id: string): string | undefined => {
  const m = /^e-bp-([a-z])\d\d$/.exec(id);
  const track = m && BP_TRACK[m[1]];
  return track ? `#/engine/best/${track}/${id}` : undefined;
};
function prose(text: string, marked = false): HTMLElement {
  return d.h('div', { class: 'flex flex-col gap-3' }, ...blocksOf(text).map((b) => b.kind === 'p' ? d.h('p', { class: 'm-0' }, ...inline(b.text, marked))
    : b.kind === 'ul' ? d.h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...b.items.map((x) => d.h('li', {}, ...inline(x, marked))))
      : d.h('pre', { tabindex: '0', class: 'sql m-0 overflow-x-auto' }, b.code)));
}

/** A thin bar; its numbers are always in words beside it (never colour alone, L23). */
function bar(k: number, n: number, cls = 'h-2'): HTMLElement {
  const pct = n ? Math.round((k / n) * 100) : 0;
  return d.h('div', { class: d.cls.cx('w-full overflow-hidden rounded-full bg-line', cls), 'aria-hidden': 'true' },
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
  const extra = v27Sub();
  if (extra) return extra;
  const r = d.engineRouteOf(location.hash);
  const e = ENGINES.find((x) => x === r.engine);
  if (!e) return undefined;
  const top = { href: d.hashOf('engine'), text: d.t('nav.engine') };
  const eng = { href: d.engineHash(e), text: nameOf(e) };
  const path = e === 'mongodb' ? d.enginePathOf(location.hash) : undefined;
  if (path !== undefined) {
    const title = path && pathMod && pathMod !== 'loading' && pathMod !== 'failed' ? pathMod.skillTitle(path, lang()) : undefined;
    return title ? { title, trail: [top, eng, { href: d.enginePathHash(), text: et('nosql.title') }] } : { title: et('nosql.title'), trail: [top, eng] };
  }
  const lesson = r.lesson ? lessons.find((x) => x.id === r.lesson && x.engine === e) : undefined;
  if (lesson) return { title: lesson.title[lang()], trail: [top, eng, { href: d.engineHash(e, lesson.level), text: levelName(lesson.level) }] };
  if (e === 'postgres' && r.level === 'EXT') return { title: levelName('EXT'), trail: [top, eng] };
  const lv = levelOf(e, r.level);
  if (lv) return { title: levelName(lv.level), trail: [top, eng] };
  return { title: nameOf(e), trail: [top] };
}

// ---- pages

/** The page the hash names; an unknown level or lesson falls back to its engine, an unknown engine to the overview (no dead end). */
export function enginePage(): HTMLElement {
  keepFocus();
  queueMicrotask(sweepEditors);
  const extraPage = v27Page();
  if (extraPage) return extraPage;
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
  const terms = lesson ? termsView() : undefined; // v27: the glossary chunk loads beside the lesson's; a failed one = no term buttons
  const f = extra && extra !== 'ready' ? extra : terms === 'loading' && typeof full === 'object' ? 'loading' : full;
  const shelf = engine === 'postgres' && r.level === 'EXT';
  const page = !lesson ? (engine ? (shelf ? extPage() : lv ? levelPage(engine, lv.level) : enginePg(engine)) : overview())
    : f === 'loading' ? loadingLine()
      : f === 'failed' ? failedBox(() => { fulls.delete(lesson.id); if (predMod === 'failed') predMod = undefined; if (capMod === 'failed') capMod = undefined; if (nosqlMod === 'failed') nosqlMod = undefined; if (fullMod === 'failed') fullMod = undefined; if (resMod === 'failed') resMod = undefined; d.rerender(); })
        : lessonPage(f!);
  if (f === 'loading' || f === 'failed') return page; // not #engine-page yet: smoke and the axe harness wait for the drawn lesson
  page.id = 'engine-page'; // drawn (not the loading line): tests/axeHarness.ts and scripts/smoke.mjs wait for it
  return page;
}
const loadingLine = (): HTMLElement => d.h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d.loader(), d.t('engine.loading'));
const failedBox = (retry: () => void): HTMLElement => d.h('div', { role: 'alert', class: 'flex flex-col gap-2' }, d.h('p', { class: 'm-0' }, d.t('engine.failed')),
  d.h('button', { type: 'button', onclick: retry }, d.t('data.retry')));

/** The NoSQL path as one list row (overview and the MongoDB page): its own picture, a short line, one link. */
function pathRow(): HTMLElement {
  return d.h('ul', { class: d.ui.LIST }, d.ui.listRow({
    lead: d.h('span', { class: 'grid size-10 place-items-center rounded-full bg-accent-soft text-accent' }, d.icon('nosqlPath', 'size-6')),
    title: et('nosql.title'), sub: et('nosql.short'), action: rowLink(d.enginePathHash(), et('nosql.go'), true),
  }));
}

/** v38 R3 (R3-01, L592): the multi-tenant hub lesson, the one topic map the overview links (its row on the level page gets a chip). */
const TOPIC_HUB = 'e-ds-l4-09';
const topicChip = (): HTMLElement => d.h('span', { class: d.cls.cx(d.cls.PILL, 'mr-2 bg-accent-soft text-accent-ink align-[1px]') }, et('topic.map'));

/** v47 S1 (L902): the landing page and the sidebar are the lazy `engineHub` chunk, loaded beside this one (src/ui/engine.ts). */
let hub: HubView;
const hubCtx = (): HubCtx => ({
  d, et, engines: ENGINES, trees, lessons: () => lessons, done, lang, nameOf, flat, progressOf, nextOf, lessonHash, levelName, levelLessons, extLessons,
  engineBadge, bar, kindChip, tick, topicChip, rowLink, engineIcon: ENGINE_ICON, conceptIcon: KIND_ICON.concept, refHere: v27Here,
});
const overview = (): HTMLElement => hub.overview(hubCtx());

/** `#/engine/<engine>`: the engine's line and progress, the next lesson, then one row per level (like the Overview's chapters). */
function enginePg(e: EngineId): HTMLElement {
  const { h, cls } = d;
  const ok = done();
  const all = flat(e);
  const p = progressOf(all, ok);
  const next = nextOf(all, ok);
  return h('div', { class: 'flex flex-col gap-8' },
    h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-4 p-6 max-sm:p-4'), 'aria-label': nameOf(e) },
      h('div', { class: 'flex items-start gap-4' }, engineBadge(e, true), h('p', { class: 'm-0 min-w-0 flex-1 text-muted' }, et(`desc.${e}`))),
      h('div', { class: 'flex items-center gap-3' }, bar(p.done, p.total), h('span', { class: 'shrink-0 text-body-sm tabular-nums text-muted' }, et('progress', { k: p.done, n: p.total }))),
      next ? h('div', { class: 'flex flex-wrap items-center gap-3' },
        h('a', { href: lessonHash(next), class: cls.cx(cls.BTN_GO, 'inline-flex items-center gap-2 px-4 py-2 no-underline') }, et(p.done ? 'cont.btnResume' : 'cont.btnStart'), d.icon('arrowRight', 'size-4')),
        h('span', { class: 'min-w-0 text-body-sm text-muted' }, `${next.level} · ${next.title[lang()]}`))
        : h('p', { class: 'm-0 font-bold good' }, et('cont.allDone', { name: nameOf(e) })), d.track?.facts(hubCtx(), e) ?? null, d.best?.(e)),
    d.track?.chooser(hubCtx(), e) ?? null,
    e === 'mongodb' ? h('section', { 'aria-labelledby': 'engine-path' }, h('h2', { id: 'engine-path', class: d.ui.GROUP_TITLE }, et('nosql.title')), pathRow()) : null,
    e === 'postgres' && extLessons().length ? extRow(ok) : null,
    h('section', { 'aria-labelledby': 'engine-levels' },
      h('h2', { id: 'engine-levels', class: d.ui.GROUP_TITLE }, et('levels')),
      h('ul', { class: d.ui.LIST }, ...trees[e].levels.filter((lv) => lv.modules.length).map((lv) => {
        const q = progressOf(levelLessons(e, lv.level), ok);
        const here = next?.level === lv.level;
        return d.ui.listRow({
          lead: leadDisc(q.done === q.total ? 'done' : here ? 'current' : 'todo', lv.level),
          title: levelName(lv.level), sub: `${et(`ladder.${e}.${lv.level}`)} · ${et('progress', { k: q.done, n: q.total })}`,
          action: rowLink(d.engineHash(e, lv.level), et('row.levelOpen'), false), current: here, // L1093 (eye E-05): the hero holds the one primary
        });
      }))));
}

/** `#/engine/<engine>/<level>` (L280): the level's modules, each a titled list of lesson rows. */
function levelPage(e: EngineId, lv: Rung): HTMLElement {
  const { h } = d;
  const ok = done();
  const ls = levelLessons(e, lv);
  const p = progressOf(ls, ok);
  const next = nextOf(ls, ok);
  return h('div', { class: 'flex flex-col gap-8' },
    h('div', { class: 'flex flex-col gap-3' },
      h('p', { class: 'm-0 text-muted' }, et(`ladder.${e}.${lv}`)),
      h('div', { class: 'flex flex-wrap items-center gap-x-3 gap-y-1' }, h('div', { class: 'flex min-w-40 flex-1' }, bar(p.done, p.total)),
        h('span', { class: 'text-body-sm tabular-nums text-muted' }, `${et('progress', { k: p.done, n: p.total })} · ${et('level.meta', { n: ls.length, m: ls.reduce((a, x) => a + x.minutes, 0) })}`)),
      d.track?.levelHead(hubCtx(), e, lv) ?? null),
    ...levelOf(e, lv)!.modules.map((m) => {
      const q = progressOf(m.lessons, ok);
      return h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': `mod-${m.id}` },
        h('div', { class: 'flex items-baseline justify-between gap-3' },
          h('h2', { id: `mod-${m.id}`, class: 'm-0 text-title font-bold' }, m.name[lang()]),
          h('span', { class: 'text-body-sm tabular-nums text-muted' }, `${q.done}/${q.total}`)),
        h('ul', { class: d.ui.LIST }, ...m.lessons.map((l) => lessonRow(l, ok, l === next, 'head'))));
    }));
}

/** v43 (L720): the Extensions shelf's card on the PostgreSQL page, one list row like the NoSQL path's. */
function extRow(ok: Set<string>): HTMLElement {
  const p = progressOf(extLessons(), ok);
  return d.h('section', { 'aria-labelledby': 'engine-ext' },
    d.h('h2', { id: 'engine-ext', class: d.ui.GROUP_TITLE }, et('level.EXT')),
    d.h('ul', { class: d.ui.LIST }, d.ui.listRow({
      lead: p.total && p.done === p.total ? leadDisc('done', '') : d.h('span', { class: 'grid size-10 place-items-center rounded-full bg-accent-soft text-accent' }, d.icon('puzzle', 'size-6')),
      title: et('ext.title'), sub: `${et('ext.short')} · ${et('progress', { k: p.done, n: p.total })}`, action: rowLink(d.engineHash('postgres', 'EXT'), et('ext.go'), false), // L1093: the hero holds the page's one primary
    })));
}

/** `#/engine/postgres/ext` (v43 L720): the shelf's lessons by module, k/n, and the one "no XP, no badges" line. */
function extPage(): HTMLElement {
  const { h } = d;
  const ok = done();
  const ls = extLessons();
  const p = progressOf(ls, ok);
  const next = nextOf(ls, ok);
  return h('div', { class: 'flex flex-col gap-8' },
    h('div', { class: 'flex flex-col gap-3' },
      h('p', { class: 'm-0 text-muted' }, et('ext.intro')),
      h('p', { class: 'm-0 text-body-sm text-muted', 'data-ext-note': '' }, et('ext.noxp')),
      h('div', { class: 'flex flex-wrap items-center gap-x-3 gap-y-1' }, h('div', { class: 'flex min-w-40 flex-1' }, bar(p.done, p.total)),
        h('span', { class: 'text-body-sm tabular-nums text-muted' }, `${et('ext.done', { k: p.done, n: p.total })} · ${et('level.meta', { n: ls.length, m: ls.reduce((a, x) => a + x.minutes, 0) })}`))),
    ...[...new Set(ls.map((l) => l.module))].map((m) => {
      const mine = ls.filter((l) => l.module === m);
      const q = progressOf(mine, ok);
      return h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': `mod-${m}` },
        h('div', { class: 'flex items-baseline justify-between gap-3' },
          h('h2', { id: `mod-${m}`, class: 'm-0 text-title font-bold' }, moduleName('postgres', m)[lang()]),
          h('span', { class: 'text-body-sm tabular-nums text-muted' }, `${q.done}/${q.total}`)),
        h('ul', { class: d.ui.LIST }, ...mine.map((l) => lessonRow(l, ok, l === next, p.done ? 'next' : 'start'))));
    }));
}

/**
 * One lesson row (engine-ux-spec §4.3): kind picture (✓ when done), title, "kind · minutes · runtime", one link. L1093 (eye E-05):
 * the next row is the page's call only on the shelf ("Bắt đầu" at 0 done, else "Học tiếp"); on a level page the head's button
 * is ('head'), so the row stays a plain "Mở" marked current.
 */
function lessonRow(l: EngineLesson, ok: Set<string>, isNext: boolean, call: 'head' | 'start' | 'next'): HTMLElement {
  const isDone = ok.has(l.id);
  const k = honestRow(l);
  return d.ui.listRow({
    lead: leadDisc(isDone ? 'done' : isNext ? 'current' : 'todo', d.icon(KIND_ICON[l.kind], 'size-5')),
    title: l.id === TOPIC_HUB ? d.h('span', {}, topicChip(), l.title[lang()]) : l.title[lang()],
    sub: `${et(`kind.${l.kind}`)} · ${et('minutes', { n: l.minutes })} · ${et(k === 'diagram' ? 'short.diagram' : k === 'docs' ? 'short.docs' : 'short.run')}`,
    action: rowLink(lessonHash(l), isDone ? et('row.again') : isNext && call !== 'head' ? et(call === 'start' ? 'row.start' : 'row.next') : et('row.open'), isNext && call !== 'head'),
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
  /** F13 (ux-route-v24 §5.3 #6): the steps whose editor is built: the current one, and any the learner opened (kept for the visit). */
  opened: Set<number>;
}
/** Per lesson, for the session: a redraw (seed done, language switch) rebuilds the page from here, never from the DOM. */
const visits = new Map<string, Visit>();
const visitOf = (id: string): Visit => {
  let v = visits.get(id);
  if (!v) visits.set(id, (v = { picks: {}, says: {}, wrongs: {}, passed: new Set(), code: [], out: [], msg: [], pred: {}, cap: {}, good: [], opened: new Set() }));
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
  d.announce(xp ? et('complete.xp', { xp }) : et('complete.noxp')); // v43 (L721): the Extensions shelf, no "+0 XP"
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
  return h('fieldset', { class: 'm-0 min-w-0 space-y-2 border-0 p-0' }, // min-w-0: a fieldset is min-content wide by default (T1-C8-01)
    h('legend', { class: 'mb-2 p-0 font-bold' }, label ? h('span', { class: 'block text-caption font-bold tracking-wider text-muted uppercase' }, label) : null, ...inline(q.q[lang()])),
    ...d.optionOrder(`${l.id}#${part}`, q.options.length).map((i) => {
      // R2 E16 (L578f): a checked wrong pick is red with a ✕, never the teal "selected" look of a pick not checked yet
      const bad = say === 'wrong' && v.picks[part] === i;
      const good = say === 'right' && v.picks[part] === i;
      return h('label', {
        class: cls.cx('flex min-h-11 cursor-pointer items-center gap-2 rounded-(--r-ctl) px-3 py-1 hover:bg-accent-soft',
          bad ? 'bg-bad-soft ring-2 ring-bad' : good ? 'bg-good-soft ring-2 ring-good'
            : 'ring-1 ring-line has-[:checked]:bg-accent-soft has-[:checked]:ring-2 has-[:checked]:ring-accent'),
        'data-wrong-pick': bad ? '' : false,
      },
        h('input', {
          type: 'radio', name, value: String(i), 'data-ek': `${name}-${i}`, checked: v.picks[part] === i,
          onchange: () => { v.picks[part] = i; },
        }), h('span', { class: 'min-w-0 flex-1' }, ...inline(q.options[i][lang()])), bad ? d.icon('x', 'size-4 shrink-0 text-bad') : null);
    }),
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
      // v31 G3 (L515): a run that failed shows its error once, in the error box under the editor; the status line only points to it
      const failed = !verdict.ok && verdict.reason === 'error' && !!v.out[i] && 'error' in v.out[i]!;
      v.msg[i] = { ok: verdict.ok, text: failed ? et('lab.errBelow') : verdictLine(verdict) };
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
/** v30.1 (F01, L480): the full-lesson layout (contents, icon sections, runnable examples), loaded for every lesson. */
let fullMod: typeof import('./engineFull') | 'loading' | 'failed' | undefined;
/** v33 (L537): the parts under a lab or example result (engine numbers, the pageinspect "Inside" table), loaded with engineFull for every lesson. */
let resMod: typeof import('./engineResult') | 'loading' | 'failed' | undefined;
const R = () => resMod as typeof import('./engineResult');
/** v25: the NoSQL lab parts (tables used, MongoDB rule bar, pipeline by step, compared with SQL), once loaded. */
const N = () => (typeof nosqlMod === 'object' ? nosqlMod : undefined);
/** The predict chunk, once chunksFor() said 'ready' (callers run only on a drawn lesson that needed it). */
const P = (): PredChunk => predMod as PredChunk;
const PLAN_VIZ = /plan-tree|query-path|explain/;
/** Starts the chunks a lesson needs; 'ready' when all are in, else 'loading' or 'failed' (Retry clears a failure). */
function chunksFor(l: EngineLesson): 'ready' | 'loading' | 'failed' {
  const wantPred = !!l.predict || l.kind === 'capstone' || (!!l.viz && PLAN_VIZ.test(l.viz));
  const wantCap = l.kind === 'capstone' && !!LAB_RUNNERS[l.engine];
  const wantNosql = !onPg(l.engine) && !!l.lab;
  if (wantNosql && nosqlMod === undefined) {
    nosqlMod = 'loading';
    import('./engineNosql').then((m) => { nosqlMod = m; }, () => { nosqlMod = 'failed'; }).finally(() => d.rerender());
  }
  if (fullMod === undefined) {
    fullMod = 'loading';
    import('./engineFull').then((m) => { fullMod = m; }, () => { fullMod = 'failed'; }).finally(() => d.rerender());
  }
  if (resMod === undefined) {
    resMod = 'loading';
    import('./engineResult').then((m) => { resMod = m; }, () => { resMod = 'failed'; }).finally(() => d.rerender());
  }
  if (wantPred && predMod === undefined) {
    predMod = 'loading';
    import('./enginePredict').then((m) => { predMod = m; }, () => { predMod = 'failed'; }).finally(() => d.rerender());
  }
  if (wantCap && capMod === undefined) {
    capMod = 'loading';
    import('./engineCapstone').then((m) => { capMod = m; }, () => { capMod = 'failed'; }).finally(() => d.rerender());
  }
  const st = [wantPred ? predMod : 'ok', wantCap ? capMod : 'ok', wantNosql ? nosqlMod : 'ok', fullMod, resMod];
  return st.includes('failed') ? 'failed' : st.includes('loading') ? 'loading' : 'ready';
}
const capChunk = (): CapChunk | undefined => (typeof capMod === 'object' ? capMod : undefined);
const levelDone = (l: EngineLesson): boolean => {
  const ok = done();
  return !!trees[l.engine].levels.find((x) => x.level === l.level)?.modules.every((m) => m.lessons.every((x) => ok.has(x.id)));
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
FROM information_schema.columns c WHERE c.table_schema = current_schema()
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.deptype = 'e' AND d.objid = format('%I.%I', c.table_schema, c.table_name)::regclass)
GROUP BY 1 ORDER BY 1`; // v43: not an extension's own tables and views (PostGIS: spatial_ref_sys, geometry_columns…)
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
  if (!onPg(l.engine)) return N()?.tablesPanel(d, l) ?? null; // v25: the NoSQL panel lives in the engineNosql chunk
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

/**
 * R2 E03 (L578b): a Postgres/design step's `perf` bar, in plan-cost words. The NoSQL chunk's `stepTop` (ScannedCount, RCU)
 * is for MongoDB/DynamoDB only: it stays cached after a NoSQL lesson, so a Postgres step must never reach it.
 */
export function pgBar(dd: Pick<EngineDeps, 'h' | 'cls' | 'getLang' | 'locale'>, s: LabStep): HTMLElement | null {
  if (!s.perf) return null;
  const { h, cls } = dd;
  const t = (k: EngineKey, p?: I18n.Params): string => engineText(dd.getLang(), dd.locale(), k, p);
  return h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm', 'data-rule': 'cost' },
    h('span', { class: cls.cx(cls.PILL, 'bg-sun text-sun-ink font-bold') }, t('perf.bar')),
    h('span', { class: 'text-muted' }, ...t('perf.barNote', { table: s.perf.table }).split(/`([^`]+)`/).map((x, i) => (i % 2 ? h('code', {}, x) : x))));
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
    h('div', { class: 'flex flex-col gap-3 rounded-(--r-ctl) bg-info-soft p-4 text-body-sm ring-1 ring-info-line' },
      h('p', { class: 'm-0' }, !live ? et('lab.noRunner') : l.engine === 'mongodb' ? et('lab.dataMongo') : l.engine === 'dynamodb' ? et('lab.dataDynamo') : l.engine === 'redis' ? et('lab.dataRedis') : isEsLesson(l) ? et('search.sim') : l.lab!.setup ? et('lab.dataPg') : et('lab.data')),
      // v43 (L726): the PostGIS tarball (~20 MB) is not precached; say so before the first Run
      live && onPg(l.engine) && /\bpostgis\b/i.test(l.lab!.setup ?? '') ? h('p', { class: 'm-0 text-muted', 'data-postgis-note': '' }, et('lab.postgisOnce')) : null,
      // v46 S-13 (L835): the dbt notice again where the Jinja is typed
      dbtLab(l) ? h('p', { class: 'm-0 text-muted', 'data-stack-sim-lab': '' }, et('stack.sim')) : null,
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
      if (i === main) v.opened.add(i);
      const ed = live && v.opened.has(i);
      // v23 CAP (L257): a capstone's current step (the first not passed) gets the accent ring and says so in words.
      return h('li', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-4 max-sm:p-3', i === cur && 'ring-2 ring-accent'), 'data-step': key, 'aria-current': i === cur ? 'step' : false },
        // v46 S-18 (L835): at 320 the task text goes under the disc at full width
        h('div', { class: 'flex items-start gap-3 max-[400px]:flex-col max-[400px]:gap-2' },
          leadDisc(passed ? 'done' : i === cur ? 'current' : 'todo', String(i + 1)),
          h('div', { class: 'min-w-0 flex-1 flex flex-col gap-1' },
            h('h3', { class: 'm-0 text-caption font-bold tracking-wider text-muted uppercase' }, et('lab.step', { i: i + 1, n: steps.length }),
              i === cur ? h('span', { class: 'ml-2 text-accent-ink' }, `· ${et('cap.current')}`) : null),
            h('p', { class: 'm-0' }, ...inline(s.task[lang()])), onPg(l.engine) ? pgBar(d, s) : N()?.stepTop(d, s))),
        ed ? codeBox(`${key}-code`, v.code[i] ?? '', et('lab.code', { i: i + 1 }), onPg(l.engine) && !isEsLesson(l), {
          change: (x) => { v.code[i] = x; }, run: () => void labAction(l, v, i, false), submit: () => void labAction(l, v, i, true),
        }) : null,
        live && !ed ? h('div', { class: 'flex flex-wrap items-center gap-3' },
          // R2 E12 (v38): the step right before this one, not the current step ("after step 1" on step 6 read as wrong)
          main >= 0 && i > main ? h('span', { class: 'text-body-sm text-muted' }, et('lab.later', { n: i })) : null,
          h('button', { type: 'button', class: cls.cx(cls.BTN_GHOST, 'px-3 py-1'), 'data-ek': `${key}-open`, onclick: (e: Event) => { (e.currentTarget as HTMLElement).blur(); v.opened.add(i); focusKey = `${key}-code`; d.rerender(); } }, et('lab.open'))) : null,
        ed ? h('div', { class: 'flex flex-wrap items-center gap-2' },
          h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${key}-run`, disabled: v.busy !== undefined, onclick: () => void labAction(l, v, i, false) }, et('lab.run')),
          h('button', { type: 'button', class: cls.cx(i === main ? cls.BTN_GO : cls.BTN_SECONDARY, 'px-4 py-1.5 disabled:bg-code disabled:text-disabled disabled:shadow-none'), 'data-ek': `${key}-submit`, disabled: v.busy !== undefined, onclick: () => void labAction(l, v, i, true) }, et('lab.submit')),
          v.busy === i ? h('span', { class: 'flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing')) : null) : null,
        h('details', {}, h('summary', { class: 'cursor-pointer text-body-sm font-semibold text-accent-ink' }, et('lab.hint')), h('p', { class: 'mt-2 mb-0 text-body-sm' }, ...inline(s.hint[lang()]))),
        h('p', { role: 'status', 'data-ek': `${key}-status`, class: cls.cx('m-0 text-body-sm', msg ? (msg.ok ? 'good' : 'bad') : '') }, ...inline(msg?.text ?? '')),
        s.fact && passed ? h('p', { class: 'm-0 rounded-(--r-inset) bg-good-soft p-3 text-body-sm ring-1 ring-good-line' }, h('b', {}, `${et('lab.fact')}: `), ...inline(s.fact[lang()])) : null,
        out ? h('div', { class: 'overflow-x-auto', tabindex: '0' }, shown ? d.renderResult(shown, undefined, undefined, onPg(l.engine) ? undefined : et(l.engine === 'mongodb' ? 'res.docs' : l.engine === 'redis' ? 'res.lines' : 'res.items', { n: shown.rows.length }), l.engine === 'stack' ? { empty: false } : undefined) : d.errorView((out as { error: unknown }).error, false)) : null,
        shown ? R().metaView(d, shown) : null,
        shown ? N()?.stepEnd(d, s, shown, passed, key) : null,
        shown ? R().insideView(d, vizSlot, shown, `${key}-inside`) : null,
        shown ? planViz(l, shown, v.code[i] ?? '', `${key}-plan`) : null);
    })),
    cap && cc ? cap.capPlans(cc) : null);
}

/** The capstone's finish card (nothing until it is done, or for another kind / a lab with no runner). */
function capDoneView(l: EngineLesson, v: Visit): HTMLElement | null {
  const cap = l.kind === 'capstone' && l.lab && LAB_RUNNERS[l.engine] ? capChunk() : undefined;
  return cap ? cap.capDone(capCtx(l, v)) : null;
}

/**
 * v23 (PG-VIZ live model, L258): a lab result that is EXPLAIN (FORMAT JSON) output, on a lesson whose `viz` is the plan tree
 * or the query path, is drawn by that diagram from the learner's own plan (like pageinspect rows → pg-heap-page).
 * `pg-partition-prune` needs the partition bounds too (PruneModel.parts), which a lab result does not carry: it keeps its sample.
 */
function planViz(l: EngineLesson, r: LabOutput, sql: string, slot: string): HTMLElement | null {
  const json = r.columns.length === 1 ? r.rows[0]?.[0] : undefined;
  if (!l.viz || !onPg(l.engine) || typeof predMod !== 'object' || !predMod.planTree(json)) return null;
  const key = JSON.stringify(json);
  if (/query-path/.test(l.viz)) return vizSlot(slot, 'pg-query-path', 'postgres', { sql: sql.replace(/^\s*EXPLAIN\s*(\([^)]*\))?\s*/i, ''), plan: json }, key, 'max-sm:-mx-3');
  if (/plan-tree|explain/.test(l.viz)) return vizSlot(slot, 'pg-plan-tree', 'postgres', json, key, 'max-sm:-mx-3');
  return null;
}

/**
 * One host per diagram (a lesson's `viz:`, or a lab result drawn as a diagram), remounted only when the language, theme or
 * model changes (vizRegistry contract, L238): the old one is destroyed and the new one opens on the same step.
 */
const vizHosts = new Map<string, { key: string; host: HTMLElement; mounted?: VizMounted }>();
/** `bleed` (v31 F5, L510): on phones a diagram inside a padded card spans the card's padding, so its svg stays ≥ 335 px wide at 375. */
function vizSlot(slot: string, name: string | undefined, engine: EngineId, model?: unknown, modelKey = '', bleed = ''): HTMLElement | null {
  if (!name) return null;
  const ctx = { lang: lang(), dark: d.isDark(), reducedMotion: d.reducedMotion() };
  const key = `${ctx.lang}|${ctx.dark}|${modelKey}`;
  const old = vizHosts.get(slot);
  if (old?.key === key) return old.host;
  const step = old?.mounted?.index;
  old?.mounted?.destroy();
  const entry: { key: string; host: HTMLElement; mounted?: VizMounted } = { key, host: d.h('div', { class: d.cls.cx('min-w-0', bleed), 'data-viz': name }) };
  vizHosts.set(slot, entry);
  void vizMountFor(name, SHORT_OF[engine], d.viz, model).then((mount) => {
    if (mount && vizHosts.get(slot) === entry) entry.mounted = mount(entry.host, { ...ctx, step });
  }, () => { vizHosts.delete(slot); }); // a failed chunk leaves the slot empty; the next visit tries again
  return entry.host;
}
const SHORT_OF: Record<EngineId, 'pg' | 'mg' | 'dy'> = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy', redis: 'dy', design: 'pg', stack: 'pg', olap: 'pg', search: 'pg', timeseries: 'pg', stream: 'pg' }; // design diagrams are Postgres ones; Redis has no live-model diagram (its figures are specs)

const HONEST_CLS: Record<Honest, string> = {
  pg: 'bg-good-soft text-ink', mingo: 'bg-good-soft text-ink', dynoxide: 'bg-good-soft text-ink', redis: 'bg-good-soft text-ink', search: 'bg-good-soft text-ink', diagram: 'bg-surface-2 text-muted', docs: 'bg-info-soft text-ink',
};
/** The one honest runtime chip under the title (§3.6, checklist L1). */
function honestChip(l: EngineLesson): HTMLElement {
  const k = honestOf(l);
  return d.h('span', { class: d.cls.cx(d.cls.PILL, HONEST_CLS[k]), 'data-honest': k },
    k === 'docs' ? d.icon('docsOnly', 'size-4') : k === 'diagram' ? d.h('span', { class: 'inline-block size-2 rounded-full bg-current', 'aria-hidden': 'true' }) : d.icon('inApp', 'size-4'), et(`honest.${k}`));
}
const kindChip = (k: Kind): HTMLElement => d.h('span', { class: d.cls.cx(d.cls.PILL, 'bg-code text-ink') }, d.icon(KIND_ICON[k], 'size-4'), et(`kind.${k}`));
const cardHead = (id: string, icon: Icons.IconName, text: string): HTMLElement =>
  d.h('h2', { id, class: 'm-0 flex items-center gap-2 text-title font-bold' }, d.icon(icon, 'size-5 text-accent'), text);

/** v27: the open lesson's term marker (first mentions in objectives and sections), set only while lessonBody draws. */
let mark: ReturnType<TermsView['lessonMarker']> | undefined;

function lessonPage(l: EngineLesson): HTMLElement {
  const tv = termsView();
  mark = typeof tv === 'object' ? tv.lessonMarker(l.engine, l.level) : undefined;
  try {
    return lessonBody(l);
  } finally {
    mark = undefined;
  }
}
function lessonBody(l: EngineLesson): HTMLElement {
  const { h, cls } = d;
  const v = visitOf(l.id);
  const ok = done();
  const parts = partsOf(l, gradable);
  const ext = l.level === 'EXT'; // v43: the shelf walks its own list, back to the shelf at the end
  const all = ext ? extLessons() : flat(l.engine);
  const at = all.findIndex((x) => x.id === l.id);
  const prev = all[at - 1];
  const next = all[at + 1];
  const module = ext ? { name: moduleName(l.engine, l.module) } : levelOf(l.engine, l.level)!.modules.find((m) => m.id === l.module)!;
  const req = l.requires.map((id) => lessons.find((x) => x.id === id)).filter((x): x is EngineLesson => !!x);
  const isDone = ok.has(l.id);
  const n = (pre: string): string | undefined => { const ps = parts.filter((p) => p.startsWith(pre)); return ps.length ? `${ps.filter((p) => isDone || v.passed.has(p)).length}/${ps.length}` : undefined; };
  const fc: FullCtx = { d, l, lang: lang(), inline, make: LAB_RUNNERS[l.engine], meta: (r) => R().metaView(d, r), counts: { lab: n('s'), quiz: n('q') } };
  const F = fullMod as typeof import('./engineFull');
  const secs = (keep: (id: SectionId) => boolean): HTMLElement[] => F.sections(fc, keep);
  return F.wrap(fc, h('article', { class: 'flex min-w-0 flex-col gap-8', 'aria-labelledby': 'home-title' },
    h('div', { class: 'flex flex-col gap-2' },
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' },
        honestChip(l), kindChip(l.kind), h('span', {}, et('minutes', { n: l.minutes })), h('span', { 'aria-hidden': 'true' }, '·'),
        h('a', { href: d.engineHash(l.engine, l.level), class: 'text-muted' }, module.name[lang()]),
        isDone ? h('span', { class: cls.cx(cls.PILL, cls.DONE_PILL) }, d.icon('check', 'size-4'), et('done')) : null),
      l.runtime === 'docs' ? h('p', { class: 'm-0 text-body-sm text-muted', 'data-runtime': 'docs' }, et(docsNoteKey(l) as EngineKey)) : null,
      dbtLab(l) ? h('p', { class: 'm-0 text-body-sm text-muted', 'data-stack-sim': '' }, et('stack.sim')) : null, // v45 (L743)
      isEsLesson(l) ? h('p', { class: 'm-0 text-body-sm text-muted', 'data-search-sim': '' }, et('search.sim')) : null, // v47 (L1016)
      req.length ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, h('span', { class: 'text-muted' }, `${et('requires')}:`),
        ...req.map((x) => h('a', { href: lessonHash(x), class: cls.cx(cls.PILL, 'min-h-6 bg-code text-ink no-underline hover:bg-accent-soft') }, x.title[lang()], tick(ok.has(x.id))))) : null),
    ...secs((id) => id === 'open'),
    h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-2 p-5 max-sm:p-4'), 'aria-labelledby': `${l.id}-obj` },
      h('h2', { id: `${l.id}-obj`, class: 'm-0 text-caption font-bold tracking-wider text-muted uppercase' }, et('objectives')),
      h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...l.objectives.map((o) => h('li', {}, ...inline(o[lang()], true))))),
    ...secs((id) => id !== 'open' && id !== 'recap'),
    vizSlot(l.id, l.viz, l.engine),
    l.predict ? h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-5 max-sm:p-4'), 'aria-labelledby': `${l.id}-pred` },
      cardHead(`${l.id}-pred`, 'kindPredict', et('predict.title')),
      ...(P().hasRealRun(l)
        ? [P().predictView(l, {
          d, et: P().withPred(d, et), inline, lang: lang(), st: v.pred, next: next ? { href: lessonHash(next) } : undefined,
          explain: async () => (await (await runnerFor(l, v)!).run(l.lab ?? { steps: [] }, P().explainSql(l.predict!.sql))).rows[0]?.[0],
          run: async () => (await runnerFor(l, v)!).run(l.lab ?? { steps: [] }, l.predict!.sql),
          pass: () => passPart(l, v, 'p'),
          diagram: (json) => vizSlot(`${l.id}-pred`, 'pg-plan-tree', 'postgres', json, JSON.stringify(json), 'max-sm:-mx-8'),
        })]
        : [h('pre', { tabindex: '0', class: 'sql m-0 overflow-x-auto', lang: 'en' }, l.predict.sql), question(l, v, l.predict, 'p', ''), P().recordedView(l, d, P().withPred(d, et))])) : null,
    // review v23: the lab before the questions (capstone: "quiz = the closing questions", product-design-db-engine §capstone; the lessons' text says "then N questions")
    l.lab ? labView(l, v) : null,
    l.quiz?.length ? h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-4 p-5 max-sm:p-4'), 'aria-labelledby': `${l.id}-quiz` },
      cardHead(`${l.id}-quiz`, 'kindQuiz', et('quiz.title')),
      h('div', { class: 'divide-y divide-line [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0' },
        ...l.quiz.map((q, i) => h('div', {}, question(l, v, q, `q${i}`, et('quiz.n', { i: i + 1, n: l.quiz!.length })))))) : null,
    capDoneView(l, v), // review v23 P3: the finish card after the closing questions, the capstone's last part
    ...secs((id) => id === 'recap'),
    d.track?.links(hubCtx(), l) ?? null,
    h('section', { class: cls.cx(cls.CARD, 'flex flex-wrap items-center gap-3 p-5 max-sm:p-4'), 'aria-label': et('done') },
      isDone ? h('p', { class: 'm-0 flex items-center gap-2 font-bold good' }, d.icon('check', 'size-5'), et('complete.done'))
        : parts.length ? h('p', { class: 'm-0 text-body-sm' }, et('complete.parts', { k: parts.filter((p) => v.passed.has(p)).length, n: parts.length }))
          : h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': `${l.id}-done`, onclick: () => complete(l) }, et('complete.btn')),
      h('div', { class: 'ml-auto flex flex-wrap gap-2' },
        prev ? h('a', { href: lessonHash(prev), class: cls.cx(cls.BTN_GHOST, 'inline-flex items-center gap-1 px-4 py-2 no-underline'), title: prev.title[lang()] }, d.icon('chevronLeft', 'size-4'), et('lesson.prev')) : null,
        isDone && d.track ? d.track.doneNext(hubCtx(), l, all) // v47 S2 (I7): the next unfinished lesson, capstone or level
        : next ? h('a', { href: lessonHash(next), class: cls.cx(isDone ? cls.BTN_GO : cls.BTN_SECONDARY, 'inline-flex items-center gap-1 px-4 py-2 no-underline'), title: et('next', { title: next.title[lang()] }) },
          et('lesson.next'), d.icon('chevronRight', 'size-4'))
          // R2 E13 (L578f): the track's last lesson is no dead end: back to the engine's page
          : h('a', { href: ext ? d.engineHash(l.engine, 'EXT') : d.engineHash(l.engine), class: cls.cx(isDone ? cls.BTN_GO : cls.BTN_SECONDARY, 'inline-flex items-center gap-1 px-4 py-2 no-underline'), 'data-ek': `${l.id}-to-engine` },
            et('lesson.toEngine', { name: ext ? et('level.EXT') : nameOf(l.engine) }), d.icon('chevronRight', 'size-4')))),
    mark?.list() ?? null,
    l.sources.length ? h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': `${l.id}-src` },
      h('h2', { id: `${l.id}-src`, class: 'm-0 text-body font-bold' }, et('sources')),
      // v38 R3 (R3-06, L595): source links look like the other links (accent ink, underline); one marker, the icon, no bullet
      h('ul', { class: 'm-0 list-none space-y-1 p-0 text-body-sm' }, ...l.sources.map((u) =>
        h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', title: u, class: d.cls.cx('inline-flex items-center gap-1.5', XREF) },
          d.icon('external', 'size-4 shrink-0'), sourceTitle(u, l.sourceTitles?.[u]), h('span', { class: 'sr-only' }, ` (${et('newTab')})`)))))) : null));
}

const SITE: Record<string, string> = {
  'www.postgresql.org': 'PostgreSQL', 'wiki.postgresql.org': 'PostgreSQL Wiki', 'www.mongodb.com': 'MongoDB',
  'docs.aws.amazon.com': 'DynamoDB', 'use-the-index-luke.com': 'Use The Index, Luke', 'www.sqlstyle.guide': 'SQL Style Guide',
};
/** v23 (L299): a source's link text, from its URL (sources are bare https URLs): "PostgreSQL · Storage hot". v38: a content `title` replaces the slug. */
export function sourceTitle(u: string, title?: string): string {
  let url: URL;
  try { url = new URL(u); } catch { return u; }
  const dec = (x: string): string => { try { return decodeURIComponent(x); } catch { return x; } };
  // "HowItWorks.DataTypes" → "How It Works Data Types"; "bp-sort-keys" → "best practices: sort keys" (AWS's bp- pages, review v23 P3)
  // L1098 (eye E-13): acronyms in a slug read as acronyms ("ddl constraints" → "DDL constraints")
  const words = (x: string): string => dec(x).replace(/\.html?$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_.]+/g, ' ').trim()
    .replace(/\b(ddl|dml|sql|jsonb?|mvcc|wal|gin|gist|brin|rls|ttl|gsi|lsi|cte|acid)\b/gi, (m) => m.toUpperCase());
  const seg = url.pathname.split('/').filter(Boolean).at(-1);
  const anchor = url.hash.length > 1 && words(url.hash.slice(1).replace(/\.([0-9A-F]{2})/g, '%$1')); // MediaWiki writes ' as .27
  const page = [seg && words(seg.replace(/^bp-/, 'best-practices: ')), anchor && (/[a-z]/.test(anchor) ? anchor : anchor.toLowerCase())].filter(Boolean).join(' › ');
  // v35 R1 (E09): docs.aws.amazon.com is DynamoDB only under /amazondynamodb/ (the SaaS Lens is AWS Well-Architected)
  const aws = url.hostname === 'docs.aws.amazon.com' && !url.pathname.startsWith('/amazondynamodb/')
    ? (url.pathname.includes('/saas-lens/') ? 'AWS SaaS Lens' : 'AWS') : undefined;
  const site = aws ?? SITE[url.hostname] ?? url.hostname.replace(/^www\./, '');
  if (title) return `${site} · ${title}`;
  return page ? `${site} · ${page[0].toUpperCase()}${page.slice(1)}` : site;
}

// ---- #/me and sidebar

/** v24 (L334): the #/me skill map reads each engine's modules from here (src/mastery.ts engineLevels). */
export const engineTrees = (): Readonly<Record<EngineId, Tree>> => trees;

export const sideRows = (ui: { row: (r: Row) => HTMLElement; group: (text: string) => HTMLElement }, bestRows: Node[] = []): (Node | null)[] => hub.sideRows(hubCtx(), ui, bestRows);

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

// ---- v27 (L410–L411): the glossary (#/engine/terms), its own lazy chunk (the interview banks: the one room under Học, v47 S4 L980)

type TermsView = typeof import('./engineTerms');
let termsMod: TermsView | 'loading' | 'failed' | undefined;
function termsView(): TermsView | 'loading' | 'failed' {
  if (termsMod === undefined) {
    termsMod = 'loading';
    Promise.all([import('./engineTerms'), import('../engineTermsSources')])
      .then(([m, src]) => { m.initTerms(d, src.glossary); termsMod = m; }).catch(() => { termsMod = 'failed'; }).finally(() => d.rerender()); // a parse throw too
  }
  return termsMod;
}
// v28 (L430): "Which engine?" (#/engine/compare), its own lazy chunk; lesson links come from this chunk's index
type CmpView = typeof import('./engineCompare');
let cmpMod: CmpView | 'loading' | 'failed' | undefined;
function cmpView(): CmpView | 'loading' | 'failed' {
  if (cmpMod === undefined) {
    cmpMod = 'loading';
    import('./engineCompare').then((m) => {
      m.initCompare({ d, inline: (t) => inline(t), lesson: (id) => { const l = lessons.find((x) => x.id === id); return l && { title: l.title[lang()], hash: lessonHash(l) }; } });
      cmpMod = m;
    }).catch(() => { cmpMod = 'failed'; }).finally(() => d.rerender());
  }
  return cmpMod;
}
function cmpPage(): HTMLElement | undefined {
  if (!d.engineCompareOf(location.hash)) return undefined;
  const m = cmpView();
  if (m === 'loading') return loadingLine();
  if (m === 'failed') return failedBox(() => { cmpMod = undefined; d.rerender(); });
  const page = m.comparePage();
  page.id = 'engine-page';
  return page;
}

const v27Here = (): boolean => d.engineTermsOf(location.hash) !== undefined || d.engineCompareOf(location.hash);
function v27Page(): HTMLElement | undefined {
  const cmp = cmpPage();
  if (cmp) return cmp;
  const terms = d.engineTermsOf(location.hash);
  if (terms === undefined) return undefined;
  const m = termsView();
  if (m === 'loading') return loadingLine();
  if (m === 'failed') return failedBox(() => { termsMod = undefined; d.rerender(); });
  const page = m.termsPage(terms);
  page.id = 'engine-page';
  return page;
}
function v27Sub(): HomeView.PageSub | undefined {
  const top = [{ href: d.hashOf('engine'), text: d.t('nav.engine') }];
  if (d.engineCompareOf(location.hash)) return typeof cmpMod === 'object' ? cmpMod.subOf() : { title: et('v28.compare'), trail: top };
  if (d.engineTermsOf(location.hash) !== undefined) return typeof termsMod === 'object' ? termsMod.subOf() : { title: et('v27.terms'), trail: top };
  return undefined;
}
