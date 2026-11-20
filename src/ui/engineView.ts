import {
  blocksOf, ENGINES, engineXp, isRight, lessonPassed, parseEngineLesson, parseModules, partsOf, progressOf, SECTIONS, treeOf,
  type EngineId, type EngineLesson, type LessonSource, type Level, type ModuleName, type Question, type Tree,
} from '../engine/content';
import { heapView } from '../engine/inside';
import { gradable, LAB_RUNNERS, type LabEnv, type LabOutput, type LabRunner, type LabVerdict, type PlanLine } from '../engine/labs';
import { vizMountFor, type VizDeps, type VizMounted } from '../engine/vizRegistry';
import type * as I18n from '../i18n';
import { ENGINE_DICT, engineText, type EngineKey } from '../i18n/engine';
import type * as Route from '../route';
import type * as State from '../state';
import type * as Tickets from '../tickets';
import type * as Dom from './dom';
import type * as Feedback from './feedback';
import type * as Icons from './icons';
import type * as ResultTable from './resultTable';
import type { Row } from './sidebar';

/**
 * ENG-CORE (L220): the Database Engine pages (#/engine, #/engine/<engine>, #/engine/<engine>/<level>/<lesson>), the lesson
 * viewer (sections, viz slot, predict, quiz, lab), the #/me block and the sidebar rows. Lazy chunk `engineView` (budget
 * `engineui`): imports only types from main modules and gets every main value through EngineDeps (Plan 6 U3).
 */
export interface EngineDeps {
  h: typeof Dom.h; icon: typeof Icons.icon; t: typeof I18n.t; getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  app: typeof State.app; persist: typeof State.persist; announce: typeof Dom.announce; loader: typeof Dom.loader;
  reducedMotion: typeof Dom.reducedMotion; isDark: () => boolean;
  renderResult: typeof ResultTable.renderResult; errorView: typeof Feedback.errorView; optionOrder: typeof Tickets.optionOrder;
  engineHash: typeof Route.engineHash; engineRouteOf: typeof Route.engineRouteOf;
  enginePathOf: typeof Route.enginePathOf; enginePathHash: typeof Route.enginePathHash; hashOf: typeof Route.hashOf; rerender: () => void;
  cls: { CARD: string; BTN_GO: string; BTN_SECONDARY: string; PILL: string; cx: (...c: (string | false | null | undefined)[]) => string };
  lab: LabEnv;
  /** ENG-VIZ's main values (svg helper, GSAP loader); the diagram chunk itself loads through src/engine/vizRegistry.ts. */
  viz: VizDeps;
}
/** src/engineSources.ts: the lesson index (list fields only), one lazy chunk per lesson, and every engine's modules.yml. */
export interface EngineSources { meta: Record<string, LessonSource>; full: Record<string, () => Promise<LessonSource>>; modules: Record<string, unknown> }

let d: EngineDeps;
let lessons: EngineLesson[] = [];
const trees = {} as Record<EngineId, Tree>;
const NAME: Record<EngineId, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB' };
const SHORT: Record<EngineId, string> = { postgres: 'PG', mongodb: 'MG', dynamodb: 'DY' };
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

/** Paragraphs and list items: `code` spans only, nothing else interpreted (like richText). */
function inline(text: string): (Node | string)[] {
  return text.split(/(`[^`\n]+`)/).filter(Boolean).map((p) => (p.length > 1 && p.startsWith('`') && p.endsWith('`') ? d.h('code', {}, p.slice(1, -1)) : p));
}
function prose(text: string): HTMLElement {
  return d.h('div', { class: 'space-y-3' }, ...blocksOf(text).map((b) => b.kind === 'p' ? d.h('p', { class: 'm-0' }, ...inline(b.text))
    : b.kind === 'ul' ? d.h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...b.items.map((x) => d.h('li', {}, ...inline(x))))
      : d.h('pre', { class: 'sql m-0 overflow-x-auto' }, b.code)));
}

/** A thin bar; its numbers are always in words beside it (never colour alone, L23). */
function bar(k: number, n: number): HTMLElement {
  const pct = n ? Math.round((k / n) * 100) : 0;
  return d.h('div', { class: 'h-2 w-full overflow-hidden rounded-full bg-code', 'aria-hidden': 'true' },
    d.h('div', { class: 'h-2 rounded-full bg-accent', style: `width:${pct}%` }));
}
const tick = (on: boolean): Node | null => (on ? d.h('span', { class: 'ml-1 text-good' }, d.icon('check', 'inline size-4 align-[-2px]'), d.h('span', { class: 'sr-only' }, et('done'))) : null);

// ---- pages

/** The page the hash names; an unknown engine or lesson falls back to its engine or the overview (no dead end). */
export function enginePage(): HTMLElement {
  keepFocus();
  const r = d.engineRouteOf(location.hash);
  const engine = ENGINES.find((e) => e === r.engine);
  const lesson = engine && lessons.find((l) => l.id === r.lesson && l.engine === engine);
  const pathAt = engine === 'mongodb' ? d.enginePathOf(location.hash) : undefined;
  if (pathAt !== undefined) {
    const page = pathPage(pathAt);
    page.id = 'engine-page';
    return page;
  }
  const f = lesson && fullLesson(lesson);
  const page = !lesson ? (engine ? enginePg(engine) : overview())
    : f === 'loading' ? d.h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d.loader(), d.t('engine.loading'))
      : f === 'failed' ? d.h('div', { role: 'alert', class: 'space-y-2' }, d.h('p', { class: 'm-0' }, d.t('engine.failed')),
        d.h('button', { type: 'button', onclick: () => { fulls.delete(lesson.id); d.rerender(); } }, d.t('data.retry')))
        : lessonPage(f!);
  if (f === 'loading' || f === 'failed') return page; // not #engine-page yet: smoke and the axe harness wait for the drawn lesson
  page.id = 'engine-page'; // drawn (not the loading line): tests/axeHarness.ts and scripts/smoke.mjs wait for it
  return page;
}

function overview(): HTMLElement {
  const { h, cls } = d;
  const ok = done();
  return h('div', { class: 'space-y-5' },
    h('p', { class: 'm-0 text-muted' }, et('intro')),
    h('ul', { class: 'm-0 grid list-none gap-4 p-0' }, ...ENGINES.map((e) => {
      const all = flat(e);
      const p = progressOf(all, ok);
      return h('li', { class: cls.cx(cls.CARD, 'relative space-y-3 px-5 py-4 hover:ring-accent') },
        h('h2', { class: 'm-0 text-title font-bold' }, h('a', { href: d.engineHash(e), class: 'after:absolute after:inset-0' }, NAME[e])),
        h('p', { class: 'm-0 text-body-sm text-muted' }, et(`desc.${e}`)),
        h('ol', { class: 'm-0 list-none space-y-1 p-0 text-body-sm' }, ...trees[e].levels.map((lv) => {
          const n = lv.modules.reduce((a, m) => a + m.lessons.length, 0);
          return h('li', { class: 'flex flex-wrap gap-x-2' }, h('b', {}, levelName(lv.level)),
            h('span', { class: 'min-w-0 flex-1 text-muted' }, et(`ladder.${e}.${lv.level}`)), h('span', { class: 'text-muted tabular-nums' }, et('count', { n })));
        })),
        h('p', { class: 'm-0 text-body-sm font-semibold' }, et('progress', { k: p.done, n: p.total })),
        bar(p.done, p.total));
    })));
}

function lessonRow(l: EngineLesson, ok: Set<string>): HTMLElement {
  const { h, cls } = d;
  return h('li', { class: 'flex flex-wrap items-center gap-2' },
    h('a', { href: lessonHash(l), class: 'inline-flex min-h-6 items-center font-semibold max-sm:min-h-11' }, l.title[lang()]), tick(ok.has(l.id)),
    h('span', { class: cls.cx(cls.PILL, 'bg-code text-muted') }, et(`kind.${l.kind}`)),
    h('span', { class: 'text-body-sm text-muted' }, et('minutes', { n: l.minutes })));
}

function enginePg(e: EngineId): HTMLElement {
  const { h } = d;
  const ok = done();
  const p = progressOf(flat(e), ok);
  return h('div', { class: 'space-y-6' },
    h('p', { class: 'm-0' }, h('a', { href: d.hashOf('engine') }, `‹ ${d.t('nav.engine')}`)),
    h('div', { class: 'space-y-2' },
      h('h2', { class: 'm-0 text-title font-bold', id: 'engine-title' }, NAME[e]),
      h('p', { class: 'm-0 text-muted' }, et(`desc.${e}`)),
      h('p', { class: 'm-0 text-body-sm font-semibold' }, et('progress', { k: p.done, n: p.total })), bar(p.done, p.total)),
    e === 'mongodb' ? pathCard() : null,
    ...trees[e].levels.map((lv) => h('section', { class: 'space-y-3', 'aria-labelledby': `lv-${lv.level}` },
      h('h3', { id: `lv-${lv.level}`, class: 'm-0 text-title font-bold' }, levelName(lv.level)),
      h('p', { class: 'm-0 text-body-sm text-muted' }, et(`ladder.${e}.${lv.level}`)),
      ...(lv.modules.length ? lv.modules.map((m) => h('div', { class: 'space-y-2' },
        h('h4', { class: 'm-0 text-body font-bold' }, m.name[lang()]),
        h('ol', { class: 'm-0 list-none space-y-2 p-0' }, ...m.lessons.map((l) => lessonRow(l, ok)))))
        : [h('p', { class: 'm-0 text-body-sm text-muted' }, et('noLessons'))]))));
}

// ---- lesson page

interface Visit {
  picks: Record<string, number>;
  says: Record<string, 'right' | 'wrong' | 'pick'>;
  passed: Set<string>;
  code: string[];
  out: ({ result: LabOutput } | { error: unknown } | undefined)[];
  msg: ({ ok: boolean; text: string } | undefined)[];
  busy?: number;
  /** A Postgres predict's real plan (or why it could not run), after "See the real plan". */
  plan?: PlanLine[] | { error: unknown } | 'busy';
  runner?: Promise<LabRunner>;
}
/** Per lesson, for the session: a redraw (seed done, language switch) rebuilds the page from here, never from the DOM. */
const visits = new Map<string, Visit>();
const visitOf = (id: string): Visit => {
  let v = visits.get(id);
  if (!v) visits.set(id, (v = { picks: {}, says: {}, passed: new Set(), code: [], out: [], msg: [] }));
  return v;
};

/** Focus survives a redraw: the element with the same data-ek gets it back. */
let focusKey: string | null = null;
function keepFocus(): void {
  focusKey = document.activeElement?.getAttribute('data-ek') ?? focusKey;
  queueMicrotask(() => {
    const el = focusKey ? document.querySelector<HTMLElement>(`[data-ek="${CSS.escape(focusKey)}"]`) : null;
    if (el && document.activeElement !== el && (document.activeElement === document.body || !document.activeElement?.isConnected)) el.focus();
    focusKey = null;
  });
}

function complete(l: EngineLesson): void {
  if (done().has(l.id)) return;
  const xp = engineXp(l, false);
  d.app.save.completed.push(l.id);
  d.app.save.xp += xp;
  d.persist(true);
  d.announce(et('complete.xp', { xp }));
  d.rerender();
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
    say === 'right' ? et('right') : say === 'wrong' ? et('wrong') : say === 'pick' ? et('pick') : '');
  return h('fieldset', { class: 'm-0 space-y-2 border-0 p-0' },
    h('legend', { class: 'mb-2 p-0 font-bold' }, label ? h('span', { class: 'block text-caption text-muted' }, label) : null, ...inline(q.q[lang()])),
    ...d.optionOrder(`${l.id}#${part}`, q.options.length).map((i) => h('label', { class: 'flex min-h-11 cursor-pointer items-center gap-2 rounded-(--r-ctl) px-2 hover:bg-code' },
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
          if (v.says[part] === 'right') passPart(l, v, part);
          d.rerender();
        },
      }, et('check')), status),
    say === 'right' ? h('p', { class: 'm-0 rounded-(--r-ctl) bg-code p-3 text-body-sm' }, ...inline(q.why[lang()])) : null);
}

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
      if (verdict.ok) passPart(l, v, `s${i}`);
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

/** After a right predict (Postgres): EXPLAIN (FORMAT JSON) of the question's query on the lab's own data (L248). */
function realPlan(l: EngineLesson, v: Visit): HTMLElement {
  const { h, cls } = d;
  const p = v.plan;
  const show = async (): Promise<void> => {
    v.plan = 'busy';
    d.rerender();
    try {
      const r = await runnerFor(l, v)!;
      v.plan = await r.explain!(l.lab ?? { steps: [] }, l.predict!.sql);
    } catch (error) {
      v.plan = { error };
    }
    d.rerender();
  };
  return h('div', { class: 'space-y-2' },
    p === undefined ? h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${l.id}-plan`, onclick: () => void show() }, et('predict.realBtn'))
      : p === 'busy' ? h('p', { class: 'm-0 flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing'))
        : 'error' in p ? d.errorView(p.error)
          : h('figure', { class: 'm-0 space-y-1' }, h('figcaption', { class: 'text-body-sm font-semibold' }, et('predict.real')),
            h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en', 'data-plan': '' }, p.map((x) => `${'  '.repeat(x.depth)}${x.depth ? '-> ' : ''}${x.text}`).join('\n'))));
}

function labView(l: EngineLesson, v: Visit): HTMLElement {
  const { h, cls } = d;
  const steps = l.lab!.steps;
  const live = !!LAB_RUNNERS[l.engine];
  return h('section', { class: 'space-y-4', 'aria-labelledby': `${l.id}-lab` },
    h('h3', { id: `${l.id}-lab`, class: 'm-0 text-title font-bold' }, et('lab.title')),
    h('p', { class: 'm-0 text-body-sm text-muted' }, !live ? et('lab.noRunner') : l.engine === 'mongodb' ? et('lab.dataMongo') : l.engine === 'dynamodb' ? et('lab.dataDynamo') : l.lab!.setup ? et('lab.dataPg') : et('lab.data')),
    ...steps.map((s, i) => {
      const out = v.out[i];
      const msg = v.msg[i];
      const key = `${l.id}-s${i}`;
      return h('div', { class: cls.cx(cls.CARD, 'space-y-3 p-4') },
        h('h4', { class: 'm-0 text-body font-bold' }, et('lab.step', { i: i + 1, n: steps.length }), tick(v.passed.has(`s${i}`))),
        h('p', { class: 'm-0' }, ...inline(s.task[lang()])),
        live ? h('textarea', {
          class: 'w-full rounded-(--r-ctl) bg-code p-2 font-mono text-body-sm ring-1 ring-line', rows: '4', spellcheck: 'false', lang: 'en',
          'aria-label': et('lab.code', { i: i + 1 }), 'data-ek': `${key}-code`,
          oninput: (e: Event) => { v.code[i] = (e.target as HTMLTextAreaElement).value; },
        }, v.code[i] ?? '') : null,
        live ? h('div', { class: 'flex flex-wrap items-center gap-2' },
          h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${key}-run`, disabled: v.busy !== undefined, onclick: () => void labAction(l, v, i, false) }, et('lab.run')),
          h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-4 py-1.5'), 'data-ek': `${key}-submit`, disabled: v.busy !== undefined, onclick: () => void labAction(l, v, i, true) }, et('lab.submit')),
          v.busy === i ? h('span', { class: 'flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing')) : null) : null,
        h('details', {}, h('summary', { class: 'cursor-pointer text-body-sm font-semibold' }, et('lab.hint')), h('p', { class: 'mt-2 mb-0 text-body-sm' }, ...inline(s.hint[lang()]))),
        h('p', { role: 'status', class: cls.cx('m-0 text-body-sm', msg ? (msg.ok ? 'good' : 'bad') : '') }, ...inline(msg?.text ?? '')),
        s.fact && v.passed.has(`s${i}`) ? h('p', { class: 'm-0 rounded-(--r-ctl) bg-code p-3 text-body-sm' }, h('b', {}, `${et('lab.fact')}: `), ...inline(s.fact[lang()])) : null,
        out ? h('div', { class: 'overflow-x-auto' }, 'result' in out ? d.renderResult(out.result) : d.errorView(out.error)) : null,
        out && 'result' in out ? metaView(out.result) : null,
        out && 'result' in out ? insideView(out.result, `${key}-inside`) : null);
    }));
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
  return h('section', { class: 'space-y-2', 'aria-label': et('meta.title') },
    pairs.length ? h('dl', { class: 'm-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm' },
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
  return h('figure', { class: 'm-0 space-y-2', 'data-inside': '' },
    h('figcaption', { class: 'text-body-sm' }, h('b', {}, `${et('inside.title')}: `), et('inside.caption', { n: v.rows.length, dead: v.dead, hot: v.hot })),
    h('div', { class: 'overflow-x-auto' }, h('table', { class: 'text-body-sm', lang: 'en' },
      h('thead', {}, h('tr', {}, ...head.map((c) => h('th', { scope: 'col', class: 'px-2 text-left font-mono' }, c)))),
      h('tbody', {}, ...v.rows.map((x) => h('tr', { class: x.flag === 'dead' ? 'bad' : x.flags.includes('HOT_UPDATED') || x.flag === 'redirect' ? 'warn' : '' },
        ...[x.lp, x.flag, x.xmin, x.xmax, x.ctid, x.flags.join(' ')].map((c) => h('td', { class: 'px-2 font-mono whitespace-nowrap' }, c)))))),
    diagram));
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

function lessonPage(l: EngineLesson): HTMLElement {
  const { h, cls } = d;
  const v = visitOf(l.id);
  const ok = done();
  const parts = partsOf(l, gradable);
  const all = flat(l.engine);
  const next = all[all.findIndex((x) => x.id === l.id) + 1];
  const module = trees[l.engine].levels.find((x) => x.level === l.level)!.modules.find((m) => m.id === l.module)!;
  const req = l.requires.map((id) => lessons.find((x) => x.id === id)).filter((x): x is EngineLesson => !!x);
  const isDone = ok.has(l.id);
  return h('article', { class: 'space-y-6', 'aria-labelledby': 'engine-lesson-title' },
    h('p', { class: 'm-0' }, h('a', { href: d.engineHash(l.engine) }, `‹ ${NAME[l.engine]} · ${levelName(l.level)}`)),
    h('div', { class: 'space-y-2' },
      h('h2', { id: 'engine-lesson-title', class: 'm-0 text-title font-bold' }, l.title[lang()], tick(isDone)),
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' },
        h('span', { class: cls.cx(cls.PILL, 'bg-code') }, et(`kind.${l.kind}`)), h('span', {}, et('minutes', { n: l.minutes })), h('span', { 'aria-hidden': 'true' }, '·'), h('span', {}, module.name[lang()]))),
    l.runtime === 'docs' ? h('p', { class: 'm-0 rounded-(--r-ctl) bg-code p-3 text-body-sm', 'data-runtime': 'docs' }, et('runtime.docs')) : null,
    req.length ? h('p', { class: 'm-0 flex flex-wrap gap-2 text-body-sm' }, h('span', { class: 'text-muted' }, `${et('requires')}:`),
      ...req.map((x) => h('a', { href: lessonHash(x) }, x.title[lang()], tick(ok.has(x.id))))) : null,
    h('section', { class: cls.cx(cls.CARD, 'space-y-2 p-4'), 'aria-labelledby': `${l.id}-obj` },
      h('h3', { id: `${l.id}-obj`, class: 'm-0 text-body font-bold' }, et('objectives')),
      h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...l.objectives.map((o) => h('li', {}, ...inline(o[lang()]))))),
    ...l.sections.map((s) => h('section', { class: 'space-y-3' },
      h('h3', { class: 'm-0 text-title font-bold' }, SECTIONS[s.id][lang() === 'vi' ? 0 : 1]), prose(s.text[lang()]))),
    vizSlot(l.id, l.viz, l.engine),
    l.predict ? h('section', { class: cls.cx(cls.CARD, 'space-y-3 p-4'), 'aria-labelledby': `${l.id}-pred` },
      h('h3', { id: `${l.id}-pred`, class: 'm-0 text-title font-bold' }, et('predict.title')),
      h('pre', { class: 'sql m-0 overflow-x-auto' }, l.predict.sql),
      question(l, v, l.predict, 'p', ''),
      l.engine === 'postgres' && l.runtime !== 'docs' && v.says.p === 'right' ? realPlan(l, v) : null) : null,
    l.quiz?.length ? h('section', { class: 'space-y-4', 'aria-labelledby': `${l.id}-quiz` },
      h('h3', { id: `${l.id}-quiz`, class: 'm-0 text-title font-bold' }, et('quiz.title')),
      ...l.quiz.map((q, i) => h('div', { class: cls.cx(cls.CARD, 'p-4') }, question(l, v, q, `q${i}`, et('quiz.n', { i: i + 1, n: l.quiz!.length }))))) : null,
    l.lab ? labView(l, v) : null,
    h('div', { class: cls.cx(cls.CARD, 'flex flex-wrap items-center gap-3 p-4') },
      isDone ? h('p', { class: 'm-0 font-bold good' }, et('complete.done'))
        : parts.length ? h('p', { class: 'm-0 text-body-sm' }, et('complete.parts', { k: parts.filter((p) => v.passed.has(p)).length, n: parts.length }))
          : h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': `${l.id}-done`, onclick: () => complete(l) }, et('complete.btn')),
      next ? h('a', { href: lessonHash(next), class: 'ml-auto font-bold' }, et('next', { title: next.title[lang()] })) : null),
    l.sources.length ? h('section', { class: 'space-y-2', 'aria-labelledby': `${l.id}-src` },
      h('h3', { id: `${l.id}-src`, class: 'm-0 text-body font-bold' }, et('sources')),
      h('ul', { class: 'm-0 list-disc space-y-1 pl-5 text-body-sm' }, ...l.sources.map((u) =>
        h('li', { class: 'break-all' }, h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, u))))) : null);
}

// ---- #/me and sidebar

export function meBlock(): HTMLElement {
  const { h, cls } = d;
  const ok = done();
  return h('section', { class: cls.cx(cls.CARD, 'space-y-3 p-5'), 'aria-labelledby': 'me-engine' },
    h('h2', { id: 'me-engine', class: 'm-0 text-title font-bold' }, d.t('nav.engine')),
    h('p', { class: 'm-0 text-body-sm text-muted' }, et('me.intro')),
    h('ul', { class: 'm-0 grid list-none gap-3 p-0 sm:grid-cols-3' }, ...ENGINES.map((e) => {
      const p = progressOf(flat(e), ok);
      return h('li', { class: 'space-y-1' }, h('a', { href: d.engineHash(e), class: 'font-bold' }, NAME[e]),
        h('p', { class: 'm-0 text-body-sm tabular-nums' }, et('me.line', { k: p.done, n: p.total })), bar(p.done, p.total));
    })));
}

export function sideRows(ui: { row: (r: Row) => HTMLElement; group: (text: string) => HTMLElement }): (Node | null)[] {
  const r = d.engineRouteOf(location.hash);
  const ok = done();
  const open = ENGINES.find((e) => e === r.engine);
  const out: (Node | null)[] = [
    ui.row({ key: 'e:all', href: d.hashOf('engine'), lead: d.icon('engine'), label: d.t('nav.engine'), current: !open }),
    ui.group(et('side.engines')),
    ...ENGINES.map((e) => {
      const p = progressOf(flat(e), ok);
      return ui.row({ key: `e:${e}`, href: d.engineHash(e), lead: d.h('b', { class: 'text-caption' }, SHORT[e]), label: NAME[e],
        sub: et('me.line', { k: p.done, n: p.total }), current: open === e && !r.lesson });
    }),
  ];
  if (!open) return out;
  // engine-ux-spec §3.1: one row per level, badge `L1` + its short name + done/total; the one current row is the smallest unit
  // holding the page (the open lesson's level; on the engine page the engine row above).
  for (const lv of trees[open].levels) {
    const all = lv.modules.flatMap((m) => m.lessons);
    const p = progressOf(all, ok);
    out.push(ui.row({ key: `e:${open}:${lv.level}`, href: all[0] ? lessonHash(all[0]) : d.engineHash(open),
      lead: p.total && p.done === p.total ? d.icon('check', 'size-5 text-good') : d.h('b', { class: 'text-caption' }, lv.level),
      label: et(`level.${lv.level}`), sub: et('me.line', { k: p.done, n: p.total }), current: all.some((x) => x.id === r.lesson) }));
  }
  return out;
}


// ---- MongoDB path ("Lộ trình NoSQL", L248): 12 parts of skills on one shared dataset, each a short lesson and 4 drills

type PathChunk = typeof import('../engineMongoPath');
type MongoRunnerMod = typeof import('../engine/mongo/runner');
let pathMod: PathChunk | 'loading' | 'failed' | undefined;
let mongo: Promise<ReturnType<MongoRunnerMod['mongoRunner']>> | undefined;
const PATH_LAB = { setup: 'path', steps: [] };
/** Drill XP on the first pass, like a General drill (L248). */
const PATH_XP = 10;
const slugOf = (skill: string): string => skill.replace(/^mg\./, '').replace(/_/g, '-');

function pathChunk(): PathChunk | 'loading' | 'failed' {
  if (pathMod === undefined) {
    pathMod = 'loading';
    import('../engineMongoPath').then((m) => { pathMod = m; }, () => { pathMod = 'failed'; }).finally(() => d.rerender());
  }
  return pathMod;
}
const mongoRunner = (): Promise<ReturnType<MongoRunnerMod['mongoRunner']>> =>
  (mongo ??= import('../engine/mongo/runner').then((m) => m.mongoRunner(d.lab)).catch((e: unknown) => { mongo = undefined; throw e; }));

function pathCard(): HTMLElement {
  const { h, cls } = d;
  return h('section', { class: cls.cx(cls.CARD, 'relative space-y-1 px-5 py-4 hover:ring-accent'), 'aria-labelledby': 'path-card' },
    h('h3', { id: 'path-card', class: 'm-0 text-title font-bold' }, h('a', { href: d.enginePathHash(), class: 'after:absolute after:inset-0' }, et('path.title'))),
    h('p', { class: 'm-0 text-body-sm text-muted' }, et('path.intro')));
}

function pathPage(slug: string): HTMLElement {
  const { h, cls } = d;
  const m = pathChunk();
  if (m === 'loading') return h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d.loader(), d.t('engine.loading'));
  if (m === 'failed') return h('div', { role: 'alert', class: 'space-y-2' }, h('p', { class: 'm-0' }, d.t('engine.failed')),
    h('button', { type: 'button', onclick: () => { pathMod = undefined; d.rerender(); } }, d.t('data.retry')));
  const { path } = m;
  const ok = done();
  const skill = path.skills.find((x) => slugOf(x.id) === slug);
  if (skill) return skillPage(m, skill, ok);
  return h('div', { class: 'space-y-6' },
    h('p', { class: 'm-0' }, h('a', { href: d.engineHash('mongodb') }, `‹ MongoDB`)),
    h('div', { class: 'space-y-2' }, h('h2', { class: 'm-0 text-title font-bold', id: 'engine-title' }, et('path.title')),
      h('p', { class: 'm-0 text-muted' }, et('path.intro'))),
    ...path.manifest.parts.map((p) => h('section', { class: 'space-y-2', 'aria-labelledby': `part-${p.n}` },
      h('h3', { id: `part-${p.n}`, class: 'm-0 text-title font-bold' }, `${et('path.part', { n: p.n })} · ${p.title[lang()]}`),
      h('ol', { class: 'm-0 list-none space-y-2 p-0' }, ...path.skills.filter((x) => x.part === p.n).map((x) => {
        const drills = path.drills.filter((dr) => dr.skill === x.id);
        const k = drills.filter((dr) => ok.has(dr.id)).length;
        return h('li', { class: 'flex flex-wrap items-center gap-2' },
          h('a', { href: d.enginePathHash(slugOf(x.id)), class: 'inline-flex min-h-6 items-center font-semibold max-sm:min-h-11' }, x.label[lang()]), tick(drills.length > 0 && k === drills.length),
          h('span', { class: 'text-body-sm text-muted tabular-nums' }, et('path.skillDone', { k, n: drills.length })));
      })))));
}

interface DrillVisit { code?: string; pick?: number; out?: { result: LabOutput } | { error: unknown }; msg?: { ok: boolean; text: string }; busy?: boolean }
const drillVisits = new Map<string, DrillVisit>();
const drillVisit = (id: string): DrillVisit => {
  let v = drillVisits.get(id);
  if (!v) drillVisits.set(id, (v = {}));
  return v;
};

function skillPage(m: PathChunk, skill: PathChunk['path']['skills'][number], ok: Set<string>): HTMLElement {
  const { h, cls } = d;
  const lesson = m.path.lessons.find((x) => x.id === skill.id);
  const drills = m.path.drills.filter((x) => x.skill === skill.id);
  const code = (c: string | undefined): HTMLElement | null => (c ? h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, c) : null);
  return h('article', { class: 'space-y-6', 'aria-labelledby': 'engine-lesson-title' },
    h('p', { class: 'm-0' }, h('a', { href: d.enginePathHash() }, `‹ ${et('path.back')} · ${et('path.part', { n: skill.part })}`)),
    h('h2', { id: 'engine-lesson-title', class: 'm-0 text-title font-bold' }, skill.label[lang()]),
    lesson?.concept ? h('section', { class: 'space-y-2' }, h('h3', { class: 'm-0 text-title font-bold' }, et('path.concept')), prose(lesson.concept[lang()])) : null,
    lesson?.example ? h('section', { class: 'space-y-2' }, h('h3', { class: 'm-0 text-title font-bold' }, et('path.example')), code(lesson.example),
      lesson.explain ? prose(lesson.explain[lang()]) : null) : null,
    lesson?.mistake?.query ? h('section', { class: 'space-y-2' }, h('h3', { class: 'm-0 text-title font-bold' }, et('path.mistake')), code(lesson.mistake.query),
      lesson.mistake[lang()] ? prose(lesson.mistake[lang()]!) : null) : null,
    h('section', { class: 'space-y-4', 'aria-labelledby': 'path-drills' },
      h('h3', { id: 'path-drills', class: 'm-0 text-title font-bold' }, et('path.drills')),
      ...drills.map((dr, i) => drillCard(m, dr, i, ok))));
}

function drillCard(m: PathChunk, dr: PathChunk['path']['drills'][number], i: number, ok: Set<string>): HTMLElement {
  const { h, cls } = d;
  const v = drillVisit(dr.id);
  const kind = (['faded', 'open', 'trap', 'review'] as const).find((k) => k === dr.kind);
  v.code ??= dr.starter ?? '';
  const status = h('p', { role: 'status', class: cls.cx('m-0 text-body-sm', v.msg ? (v.msg.ok ? 'good' : 'bad') : '') }, ...inline(v.msg?.text ?? ''));
  const choice = dr.format === 'choice';
  return h('div', { class: cls.cx(cls.CARD, 'space-y-3 p-4'), 'data-drill': dr.id },
    h('h4', { class: 'm-0 text-body font-bold' }, et('path.drill', { i: i + 1, kind: kind ? et(`path.kind.${kind}`) : dr.kind }), tick(ok.has(dr.id))),
    h('p', { class: 'm-0' }, ...inline(dr.task[lang()])),
    dr.grade === 'esr' && dr.query ? h('div', { class: 'space-y-1' }, h('p', { class: 'm-0 text-body-sm text-muted' }, ...inline(et('path.esr'))), h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, dr.query)) : null,
    choice && dr.shown ? h('div', { class: 'space-y-1' }, h('p', { class: 'm-0 text-body-sm text-muted' }, et('path.shown')), h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, dr.shown)) : null,
    choice ? h('fieldset', { class: 'm-0 space-y-1 border-0 p-0' }, h('legend', { class: 'mb-1 p-0 text-body-sm font-semibold' }, et('path.choice')),
      ...(dr.options ?? []).map((o, j) => h('label', { class: 'flex min-h-11 cursor-pointer items-center gap-2 rounded-(--r-ctl) px-2 hover:bg-code' },
        h('input', { type: 'radio', name: dr.id, value: String(j), checked: v.pick === j, 'data-ek': `${dr.id}-${j}`, onchange: () => { v.pick = j; } }),
        h('span', {}, ...inline(o[lang()])))))
      : h('textarea', {
        class: 'w-full rounded-(--r-ctl) bg-code p-2 font-mono text-body-sm ring-1 ring-line', rows: '4', spellcheck: 'false', lang: 'en',
        'aria-label': et('lab.code', { i: i + 1 }), 'data-ek': `${dr.id}-code`, oninput: (e: Event) => { v.code = (e.target as HTMLTextAreaElement).value; },
      }, v.code),
    h('div', { class: 'flex flex-wrap items-center gap-2' },
      choice || dr.grade === 'esr' ? null : h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${dr.id}-run`, disabled: !!v.busy, onclick: () => void drillAction(m, dr, false) }, et('lab.run')),
      h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-4 py-1.5'), 'data-ek': `${dr.id}-submit`, disabled: !!v.busy, onclick: () => void drillAction(m, dr, true) }, choice ? et('check') : et('lab.submit')),
      v.busy ? h('span', { class: 'flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing')) : null),
    h('details', {}, h('summary', { class: 'cursor-pointer text-body-sm font-semibold' }, et('lab.hint')), h('p', { class: 'mt-2 mb-0 text-body-sm' }, ...inline(dr.hint[lang()]))),
    status,
    choice && v.msg?.ok && dr.why ? h('p', { class: 'm-0 rounded-(--r-ctl) bg-code p-3 text-body-sm' }, ...inline(dr.why[lang()])) : null,
    v.out ? h('div', { class: 'overflow-x-auto' }, 'result' in v.out ? d.renderResult(v.out.result) : d.errorView(v.out.error)) : null);
}

/** Grades one path drill: a choice by its index, an ESR drill by the key order, the rest by result (+ the covered rule). */
async function drillVerdict(m: PathChunk, dr: PathChunk['path']['drills'][number], code: string, v: DrillVisit): Promise<{ ok: boolean; text: string }> {
  const tip = (w?: { vi: string; en: string }) => (w ? et('path.wrongTip', { tip: w[lang()] }) : undefined);
  if (dr.format === 'choice') {
    if (v.pick === undefined) return { ok: false, text: et('pick') };
    if (v.pick === dr.answer) return { ok: true, text: et('right') };
    return { ok: false, text: tip(dr.wrong?.find((w) => w.option === v.pick)) ?? et('wrong') };
  }
  if (dr.grade === 'esr') {
    if (m.followsEsr(dr.query!, code)) return { ok: true, text: et('lab.passed') };
    const flat = (x: string) => x.replace(/\s+/g, '');
    return { ok: false, text: tip(dr.wrong?.find((w) => w.query && flat(w.query) === flat(code))) ?? et('path.notEsr') };
  }
  const r = await mongoRunner();
  const step = { solution: dr.solution!, check: 'doc' as const, ordered: !!dr.ordered, task: dr.task, hint: dr.hint };
  const g = await r.check(PATH_LAB, step, code, { strictId: dr.grade === 'covered' });
  if (g.ok) {
    if (dr.grade === 'covered' && dr.index && !m.isCovered(code, dr.index)) return { ok: false, text: et('path.notCovered') };
    return { ok: true, text: verdictLine(g) };
  }
  if (g.reason === 'wrong') {
    for (const w of dr.wrong ?? []) {
      if (!w.query) continue;
      const same = await r.check(PATH_LAB, { ...step, solution: w.query }, code, { strictId: true }).catch(() => ({ ok: false }));
      if (same.ok) return { ok: false, text: tip(w)! };
    }
  }
  return { ok: false, text: verdictLine(g) };
}

async function drillAction(m: PathChunk, dr: PathChunk['path']['drills'][number], submit: boolean): Promise<void> {
  const v = drillVisit(dr.id);
  const code = (v.code ?? '').trim();
  if (dr.format !== 'choice' && !code) {
    v.msg = { ok: false, text: et('lab.empty') };
    d.rerender();
    return;
  }
  v.busy = true;
  v.msg = undefined;
  d.rerender();
  try {
    if (dr.format !== 'choice' && dr.grade !== 'esr') {
      try {
        v.out = { result: await (await mongoRunner()).run(PATH_LAB, code) };
      } catch (error) {
        v.out = { error };
      }
    }
    if (submit) {
      v.msg = await drillVerdict(m, dr, code, v);
      d.announce(v.msg.text);
      if (v.msg.ok && !done().has(dr.id)) {
        d.app.save.completed.push(dr.id);
        d.app.save.xp += PATH_XP;
        d.persist(true);
        d.announce(et('complete.xp', { xp: PATH_XP }));
      }
    }
  } catch (error) {
    v.out = { error };
  } finally {
    v.busy = false;
    d.rerender();
  }
}
