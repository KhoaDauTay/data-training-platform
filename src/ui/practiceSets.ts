import type { QueryResult } from '../db/run';
import type { ExplainItem } from '../general';
import { learnText, type LearnKey } from '../i18n/learn';
import type * as I18n from '../i18n';
import { mixedSet, pickRound } from '../learn';
import type { DrillDeps } from './drillBrief';

/**
 * v47 (L920–L929): the three Practise sets on #/practice, part of the lazy `learnui` chunk (drillBrief imports it).
 * Fix the broken query (P2) and Mixed review per Part (P3) start a Practice run of drill tickets on `lab` (deps.startSet:
 * 0 XP, nothing saved); Explain this query (P6) is a stepper inside its own card (the brief's reflect pattern), no editor,
 * no route. Nothing here reads the DB until the learner presses "Run this query".
 */
let d$: DrillDeps;
export const initSets = (deps: DrillDeps): void => void (d$ = deps);
export const setText = (key: LearnKey, params?: I18n.Params): string => learnText(d$.getLang(), d$.locale(), key, params);
const lt = setText;

const FIX_ROUND = 6;
const EXPLAIN_ROUND = 5;
/** Items met this session (memory only): the next round takes others first. */
const seenFix = new Set<string>();
const seenExplain = new Set<string>();

const CARD = 'space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line';
/** A card whose one button sits beside its text (the hub's review and interview cards). */
const ROW = 'flex flex-wrap items-center gap-4 rounded-(--r-card) bg-panel p-5 ring-1 ring-line';
const GO = 'rounded-full px-4 py-2 whitespace-nowrap';
const head = (id: string, title: string, desc: string): HTMLElement[] => [
  d$.h('h2', { id, class: 'm-0 text-title font-bold' }, title),
  d$.h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, desc),
];

export function fixCard(): HTMLElement | null {
  const g = d$.generalNow();
  if (!g?.fix.length) return null;
  const { h } = d$;
  const start = (): void => {
    const items = pickRound(g.fix, FIX_ROUND, seenFix, Math.random);
    for (const x of items) seenFix.add(x.id);
    d$.startSet(items.map((x) => ({ ticketId: x.id, variant: 0, skills: [] })), { kind: 'fix' });
  };
  return h('section', { class: ROW, 'aria-labelledby': 'fix-set-title', 'data-set': 'fix' },
    h('div', { class: 'min-w-48 flex-1' }, ...head('fix-set-title', lt('sets.fixTitle'), lt('sets.fixDesc', { n: FIX_ROUND, total: g.fix.length }))),
    h('button', { type: 'button', class: GO, onclick: start }, lt('sets.fixGo', { n: FIX_ROUND })));
}

export function mixCard(): HTMLElement | null {
  const g = d$.generalNow();
  if (!g) return null;
  const { h } = d$;
  const lang = d$.getLang();
  return h('section', { class: CARD, 'aria-labelledby': 'mix-set-title', 'data-set': 'mix' },
    ...head('mix-set-title', lt('sets.mixTitle'), lt('sets.mixDesc')),
    h('ul', { class: 'm-0 grid list-none gap-2 p-0 sm:grid-cols-2' }, ...d$.ROUTE_PARTS.map((p) => h('li', {},
      h('button', {
        type: 'button', class: 'flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left',
        onclick: () => d$.startSet(mixedSet(p.skills, g.bySkill, Math.random), { kind: 'mix', part: p.n }),
      }, h('span', { class: 'shrink-0 font-bold' }, lt('sets.mixPart', { n: p.n })), h('span', { class: 'min-w-0 text-body-sm text-muted' }, p.title[lang]))))));
}

/** The Explain round in memory; a redraw (rerender) draws it again from here. `picks`: the first pick per item (it scores). */
let round: { items: ExplainItem[]; at: number; picks: (number | undefined)[]; out?: { r: QueryResult } | { e: unknown } } | undefined;

export function explainCard(): HTMLElement | null {
  const g = d$.generalNow();
  if (!g?.explain.length) return null;
  const sec = d$.h('section', { 'aria-labelledby': 'explain-set-title', 'data-set': 'explain' });
  drawExplain(sec, g.explain);
  return sec;
}

function drawExplain(sec: HTMLElement, all: ExplainItem[], focus?: string): void {
  const { h, nodes } = d$;
  const lang = d$.getLang();
  const redraw = (f?: string): void => drawExplain(sec, all, f);
  const begin = (): void => {
    const items = pickRound(all, EXPLAIN_ROUND, seenExplain, Math.random);
    for (const x of items) seenExplain.add(x.id);
    round = { items, at: 0, picks: [] };
    redraw('sql');
  };
  const title = h('h2', { id: 'explain-set-title', class: 'm-0 text-title font-bold', tabindex: '-1', 'data-f': 'title' }, lt('sets.explainTitle'));
  sec.className = round ? CARD : ROW;
  if (!round) {
    sec.replaceChildren(h('div', { class: 'min-w-48 flex-1' }, title, h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, lt('sets.explainDesc', { n: EXPLAIN_ROUND, total: all.length }))),
      h('button', { type: 'button', class: GO, onclick: begin }, lt('sets.explainGo', { n: EXPLAIN_ROUND })));
  } else if (round.at >= round.items.length) {
    const r = round;
    const ok = r.items.filter((x, i) => r.picks[i] === x.answer).length;
    sec.replaceChildren(title, h('p', { role: 'status', class: 'm-0 font-semibold', tabindex: '-1', 'data-f': 'score' }, lt('sets.score', { ok, n: r.items.length })),
      h('div', { class: 'flex flex-wrap gap-2' },
        h('button', { type: 'button', class: GO, onclick: begin }, lt('sets.again')),
        h('button', { type: 'button', class: GO, onclick: () => { round = undefined; redraw('title'); } }, lt('sets.close'))));
  } else {
    const r = round;
    const x = r.items[r.at];
    const pick = r.picks[r.at];
    const choose = (i: number): void => {
      if (r.picks[r.at] !== undefined) return; // the first pick counts; the marks and reasons are already shown
      r.picks[r.at] = i;
      redraw(`o${i}`);
    };
    const run = (): void => void d$.runOn('lab', x.sql).then((res) => ({ r: res }), (e: unknown) => ({ e })).then((out) => {
      if (round !== r || r.items[r.at] !== x) return; // the learner moved on meanwhile
      r.out = out;
      redraw('run');
    });
    const mark = (i: number): string => (pick === undefined ? '' : i === x.answer ? '✓ ' : i === pick ? '✗ ' : '');
    const options = x.options.map((o, i) => h('button', {
      type: 'button', 'data-f': `o${i}`, 'aria-pressed': pick === i ? 'true' : 'false',
      class: pick !== undefined && i === x.answer ? 'text-left ring-2 ring-good' : 'text-left',
      onclick: () => choose(i),
    }, mark(i), o.text[lang]));
    const right = x.options[x.answer];
    const out = r.out;
    sec.replaceChildren(...nodes(
      title,
      h('p', { class: 'm-0 text-body-sm text-muted' }, lt('sets.explainOf', { i: r.at + 1, n: r.items.length })),
      h('pre', { class: 'sql m-0', lang: 'en', tabindex: '-1', 'data-f': 'sql' }, x.sql),
      h('div', { class: 'font-semibold' }, d$.richText(x.q[lang])),
      h('div', { class: 'flex flex-col items-start gap-1.5' }, ...options),
      h('div', { role: 'status', class: 'space-y-1' }, ...(pick === undefined ? [] : [
        h('div', { class: pick === x.answer ? 'good' : 'bad' }, d$.richText(`${lt(pick === x.answer ? 'sets.right' : 'sets.wrong')} ${x.options[pick].why[lang]}`)),
        pick === x.answer ? null : d$.richText(`${lt('sets.answer', { text: right.text[lang] })} ${right.why[lang]}`),
      ])),
      pick === undefined ? null : h('div', { class: 'flex flex-wrap gap-2' },
        h('button', { type: 'button', class: GO, 'data-f': 'run', onclick: run }, lt('sets.run')),
        h('button', { type: 'button', class: GO, onclick: () => { r.at++; r.out = undefined; redraw(r.at >= r.items.length ? 'score' : 'sql'); } }, lt('sets.next'))),
      out ? ('r' in out ? d$.renderResult(out.r, undefined, 10) : d$.errorView(out.e, false)) : null,
    ));
  }
  if (focus) sec.querySelector<HTMLElement>(`[data-f="${focus}"]`)?.focus();
}
