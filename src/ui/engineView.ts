import type { QueryResult } from '../db/run';
import {
  blocksOf, ENGINES, engineXp, isRight, lessonPassed, parseEngineLesson, parseModules, partsOf, progressOf, SECTIONS, treeOf,
  type EngineId, type EngineLesson, type Level, type ModuleName, type Question, type Tree,
} from '../engine/content';
import { LAB_RUNNERS, type LabEnv, type LabRunner } from '../engine/labs';
import { vizLoader } from '../engine/vizRegistry';
import type * as I18n from '../i18n';
import { engineText, type EngineKey } from '../i18n/engine';
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
  reducedMotion: typeof Dom.reducedMotion; isDark: () => boolean; parseYaml: (text: string) => unknown;
  renderResult: typeof ResultTable.renderResult; errorView: typeof Feedback.errorView; optionOrder: typeof Tickets.optionOrder;
  engineHash: typeof Route.engineHash; engineRouteOf: typeof Route.engineRouteOf; hashOf: typeof Route.hashOf; rerender: () => void;
  cls: { CARD: string; BTN_GO: string; BTN_SECONDARY: string; PILL: string; cx: (...c: (string | false | null | undefined)[]) => string };
  lab: LabEnv;
}
export type EngineSources = Record<EngineId, { lessons: Record<string, string>; modules: Record<string, string> }>;

let d: EngineDeps;
let lessons: EngineLesson[] = [];
const trees = {} as Record<EngineId, Tree>;
const NAME: Record<EngineId, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB' };
const SHORT: Record<EngineId, string> = { postgres: 'PG', mongodb: 'MG', dynamodb: 'DY' };
const et = (key: EngineKey, params?: I18n.Params): string => engineText(d.getLang(), d.locale(), key, params);

/** Parses every engine's content (throws on a broken file: the main part shows the load failure and Retry). */
export function initEngine(deps: EngineDeps, src: EngineSources): void {
  d = deps;
  lessons = ENGINES.flatMap((e) => Object.entries(src[e].lessons).map(([path, s]) => parseEngineLesson(s, path, deps.parseYaml)));
  for (const e of ENGINES) {
    const names: ModuleName[] = Object.entries(src[e].modules).flatMap(([path, s]) => parseModules(s, path, deps.parseYaml));
    trees[e] = treeOf(e, lessons, names);
  }
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
  const page = lesson ? lessonPage(lesson) : engine ? enginePg(engine) : overview();
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
    h('a', { href: lessonHash(l), class: 'font-semibold' }, l.title[lang()]), tick(ok.has(l.id)),
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
      h('h2', { class: 'm-0 text-heading font-bold', id: 'engine-title' }, NAME[e]),
      h('p', { class: 'm-0 text-muted' }, et(`desc.${e}`)),
      h('p', { class: 'm-0 text-body-sm font-semibold' }, et('progress', { k: p.done, n: p.total })), bar(p.done, p.total)),
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
  out: ({ result: QueryResult } | { error: unknown } | undefined)[];
  msg: ({ ok: boolean; text: string } | undefined)[];
  busy?: number;
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
  if (lessonPassed(l, v.passed)) complete(l);
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
  if (!make || !l.lab) return undefined;
  const lab = l.lab;
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
      v.out[i] = { result: await r.run(l.lab!, code) };
    } catch (error) {
      v.out[i] = { error };
    }
    if (submit) {
      const verdict = await r.check(l.lab!, l.lab!.steps[i], code);
      v.msg[i] = verdict.ok ? { ok: true, text: et('lab.passed') }
        : { ok: false, text: verdict.reason === 'unsupported' ? et('lab.unsupported') : verdict.message ?? et('wrong') };
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

function labView(l: EngineLesson, v: Visit): HTMLElement {
  const { h, cls } = d;
  const steps = l.lab!.steps;
  const live = !!LAB_RUNNERS[l.engine];
  return h('section', { class: 'space-y-4', 'aria-labelledby': `${l.id}-lab` },
    h('h3', { id: `${l.id}-lab`, class: 'm-0 text-title font-bold' }, et('lab.title')),
    h('p', { class: 'm-0 text-body-sm text-muted' }, live ? (l.engine === 'postgres' ? et('lab.data') : '') : et('lab.noRunner')),
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
        h('p', { role: 'status', class: cls.cx('m-0 text-body-sm', msg ? (msg.ok ? 'good' : 'bad') : '') }, msg?.text ?? ''),
        out ? h('div', { class: 'overflow-x-auto' }, 'result' in out ? d.renderResult(out.result) : d.errorView(out.error)) : null);
    }));
}

/** One host per lesson, remounted only when the language or theme changes (vizRegistry contract). */
const vizHosts = new Map<string, { key: string; host: HTMLElement; cleanup?: () => void }>();
function vizSlot(l: EngineLesson): HTMLElement | null {
  const load = vizLoader(l.viz);
  if (!load) return null;
  const ctx = { lang: lang(), dark: d.isDark(), reducedMotion: d.reducedMotion() };
  const key = `${ctx.lang}|${ctx.dark}`;
  const old = vizHosts.get(l.id);
  if (old?.key === key) return old.host;
  old?.cleanup?.();
  const entry: { key: string; host: HTMLElement; cleanup?: () => void } = { key, host: d.h('div', { class: 'min-w-0', 'data-viz': l.viz! }) };
  vizHosts.set(l.id, entry);
  void load().then((mount) => {
    if (vizHosts.get(l.id) === entry) entry.cleanup = mount(entry.host, ctx) ?? undefined;
  }, () => { vizHosts.delete(l.id); }); // a failed chunk leaves the slot empty; the next visit tries again
  return entry.host;
}

function lessonPage(l: EngineLesson): HTMLElement {
  const { h, cls } = d;
  const v = visitOf(l.id);
  const ok = done();
  const parts = partsOf(l);
  const all = flat(l.engine);
  const next = all[all.indexOf(l) + 1];
  const module = trees[l.engine].levels.find((x) => x.level === l.level)!.modules.find((m) => m.id === l.module)!;
  const req = l.requires.map((id) => lessons.find((x) => x.id === id)).filter((x): x is EngineLesson => !!x);
  const isDone = ok.has(l.id);
  return h('article', { class: 'space-y-6', 'aria-labelledby': 'engine-lesson-title' },
    h('p', { class: 'm-0' }, h('a', { href: d.engineHash(l.engine) }, `‹ ${NAME[l.engine]} · ${levelName(l.level)}`)),
    h('div', { class: 'space-y-2' },
      h('h2', { id: 'engine-lesson-title', class: 'm-0 text-heading font-bold' }, l.title[lang()], tick(isDone)),
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' },
        h('span', { class: cls.cx(cls.PILL, 'bg-code') }, et(`kind.${l.kind}`)), h('span', {}, et('minutes', { n: l.minutes })), h('span', { 'aria-hidden': 'true' }, '·'), h('span', {}, module.name[lang()]))),
    req.length ? h('p', { class: 'm-0 flex flex-wrap gap-2 text-body-sm' }, h('span', { class: 'text-muted' }, `${et('requires')}:`),
      ...req.map((x) => h('a', { href: lessonHash(x) }, x.title[lang()], tick(ok.has(x.id))))) : null,
    h('section', { class: cls.cx(cls.CARD, 'space-y-2 p-4'), 'aria-labelledby': `${l.id}-obj` },
      h('h3', { id: `${l.id}-obj`, class: 'm-0 text-body font-bold' }, et('objectives')),
      h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...l.objectives.map((o) => h('li', {}, ...inline(o[lang()]))))),
    ...l.sections.map((s) => h('section', { class: 'space-y-3' },
      h('h3', { class: 'm-0 text-title font-bold' }, SECTIONS[s.id][lang() === 'vi' ? 0 : 1]), prose(s.text[lang()]))),
    vizSlot(l),
    l.predict ? h('section', { class: cls.cx(cls.CARD, 'space-y-3 p-4'), 'aria-labelledby': `${l.id}-pred` },
      h('h3', { id: `${l.id}-pred`, class: 'm-0 text-title font-bold' }, et('predict.title')),
      h('pre', { class: 'sql m-0 overflow-x-auto' }, l.predict.sql),
      question(l, v, l.predict, 'p', '')) : null,
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
  for (const lv of trees[open].levels) {
    if (!lv.modules.length) continue;
    out.push(ui.group(levelName(lv.level)));
    lv.modules.forEach((m, i) => {
      const p = progressOf(m.lessons, ok);
      out.push(ui.row({ key: `e:${open}:${lv.level}:${m.id}`, href: lessonHash(m.lessons[0]),
        lead: p.done === p.total ? d.icon('check', 'size-5 text-good') : d.h('b', {}, String(i + 1)),
        label: m.name[lang()], sub: et('me.line', { k: p.done, n: p.total }), current: m.lessons.some((x) => x.id === r.lesson) }));
    });
  }
  return out;
}

