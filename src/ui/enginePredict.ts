import type { EngineLesson } from '../engine/content';
import { answerNode, FIRST_KEY, observe, parseEngineFirst, planTree, shownSetup, withFirst, type PlanNode } from '../engine/predict';
import type { EngineKey } from '../i18n/engine';
import type { EngineDeps } from './engineView';
import { planTreeView } from './enginePlanTree';

// The engineView chunk reaches all of this through one lazy chunk (`enginePredict`, budget `enginePredict`): predict lessons,
// capstones and plan diagrams load it before the page is drawn; the capstone chunk gets these through its context.
export { afterLab, answerNode, capstonePivot, explainSql, hasRealPlan, planTree, stepName } from '../engine/predict';
export { planTreeView };

/**
 * v23 PRED (L256, engine-ux-spec §5.4): a Postgres predict whose answer is a plan. The learner picks, then "Xem thật" grades
 * the pick (a wrong guess is no failure) and runs the real EXPLAIN (FORMAT JSON) on the lab's own data; the result card shows
 * the plan as a tree with the answering node outlined, one observation sentence, then `why`. Picking again after that
 * re-grades at once ("đoán lại được"). The first pick per lesson goes to the device pref `cargo-query/engine-first`.
 * The DOM keeps the hooks scripts/e2e.mjs and tests/engineAxe.test.ts use: `<id>-p-<i>` radios, `<id>-p-check` (this button),
 * a sibling `[role=status]` (`.good` when right), `<id>-plan` (the card's heading) and `[data-plan]` (the tree).
 */
export interface PredictState { pick?: number; say?: 'right' | 'wrong' | 'pick'; viewed?: boolean; plan?: PlanNode | { error: unknown } | 'busy'; json?: unknown; diagram?: boolean }
export interface PredictCtx {
  d: EngineDeps;
  et: (key: EngineKey, params?: Record<string, string | number>) => string;
  inline: (text: string) => (Node | string)[];
  lang: 'vi' | 'en';
  st: PredictState;
  /** The raw EXPLAIN (FORMAT JSON) cell of the question's query on the lab's data. */
  explain: () => Promise<unknown>;
  /** The predict part passed (the lesson may complete). */
  pass: () => void;
  next?: { href: string };
  /** ENG-VIZ's `pg-plan-tree` stepped through on the same EXPLAIN JSON (v23 PG-VIZ live model), or null. */
  diagram?: (json: unknown) => HTMLElement | null;
}

/** Records a lesson's first pick once (device pref, validated on read; never the Save). */
export function recordFirst(d: EngineDeps, id: string, pick: number): void {
  const next = withFirst(parseEngineFirst(d.prefs.read(FIRST_KEY)), id, pick);
  if (next) d.prefs.write(FIRST_KEY, next);
}

export function predictView(l: EngineLesson, c: PredictCtx): HTMLElement {
  const { d, et, st } = c;
  const { h, cls } = d;
  const p = l.predict!;
  const id = l.id;
  const grade = (): void => {
    st.say = st.pick === undefined ? 'pick' : st.pick === p.answer ? 'right' : 'wrong';
    if (st.say === 'right') c.pass();
  };
  const see = async (): Promise<void> => {
    grade();
    if (st.say === 'pick') return d.rerender();
    recordFirst(d, id, st.pick!);
    st.viewed = true;
    st.plan = 'busy';
    d.rerender();
    d.announce(et(st.say === 'right' ? 'predict.right' : 'predict.wrong'));
    focusCard(id);
    try {
      st.json = await c.explain();
      st.plan = planTree(st.json) ?? { error: new Error('EXPLAIN gave no plan') };
    } catch (error) {
      st.plan = { error };
    }
    d.rerender();
  };
  const setup = shownSetup(l.lab?.setup);
  const status = h('p', { role: 'status', class: cls.cx('m-0 text-body-sm', st.say === 'right' ? 'good' : st.say === 'wrong' ? 'bad' : '') },
    st.say === 'right' ? et('predict.right') : st.say === 'wrong' ? et('predict.wrong') : st.say === 'pick' ? et('pick') : '');
  return h('div', { class: 'space-y-4' },
    setup.length ? h('div', { class: 'space-y-1' }, h('p', { class: 'm-0 text-body-sm font-semibold text-muted' }, et('predict.have')), h('pre', { class: 'sql m-0 overflow-x-auto' }, setup.join(';\n'))) : null,
    h('div', { class: 'space-y-1' }, h('p', { class: 'm-0 text-body-sm font-semibold text-muted' }, et('predict.asked')), h('pre', { class: 'sql m-0 overflow-x-auto' }, p.sql)),
    h('fieldset', { class: 'm-0 space-y-3 border-0 p-0' },
      h('legend', { class: 'mb-3 p-0 text-body font-bold' }, ...c.inline(p.q[c.lang])),
      h('div', { class: 'grid gap-3 sm:grid-cols-2' }, ...d.optionOrder(`${id}#p`, p.options.length).map((i) => option(c, l, i))),
      h('div', { class: 'flex flex-wrap items-center gap-3' },
        h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': `${id}-p-check`, disabled: !!st.viewed && !(typeof st.plan === 'object' && 'error' in st.plan), onclick: () => void see() }, `${et('predict.see')} ›`),
        h('span', { class: 'text-body-sm text-muted' }, st.viewed ? et('predict.ran') : et('predict.seeNote')),
        status)),
    st.viewed ? resultCard(l, c) : null);
}

/** A radio card: chosen = --accent-soft + 2 px ring (CSS :has, no redraw); after "Xem thật" the right one and a wrong pick say so in words. */
function option(c: PredictCtx, l: EngineLesson, i: number): HTMLElement {
  const { d, et, st } = c;
  const { h, cls } = d;
  const p = l.predict!;
  const right = st.viewed && i === p.answer;
  const wrongPick = st.viewed && i === st.pick && i !== p.answer;
  return h('label', {
    class: cls.cx('flex min-h-13 cursor-pointer items-center gap-3 rounded-(--r-ctl) px-3 py-2 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-accent',
      right ? 'bg-good-soft' : wrongPick ? 'bg-bad-soft' : 'has-[:checked]:bg-accent-soft'),
  },
    h('input', {
      type: 'radio', name: `${l.id}-p`, value: String(i), 'data-ek': `${l.id}-p-${i}`, checked: st.pick === i,
      onchange: () => {
        st.pick = i;
        if (!st.viewed) return;
        st.say = i === p.answer ? 'right' : 'wrong';
        if (st.say === 'right') c.pass();
        d.rerender();
      },
    }),
    h('span', { class: 'min-w-0 flex-1' }, ...c.inline(p.options[i][c.lang])),
    right ? h('span', { class: 'text-caption font-bold text-good' }, `✓ ${et('predict.answer')}`)
      : wrongPick ? h('span', { class: 'text-caption font-bold text-bad' }, `✗ ${et('predict.yours')}`) : null);
}

function resultCard(l: EngineLesson, c: PredictCtx): HTMLElement {
  const { d, et, st } = c;
  const { h, cls } = d;
  const p = l.predict!;
  const plan = st.plan;
  const right = st.say === 'right';
  const tree = plan && plan !== 'busy' && !('error' in plan) ? plan : undefined;
  return h('section', { class: 'space-y-3 rounded-(--r-card) bg-surface-2 p-4', 'aria-labelledby': `${l.id}-plan` },
    h('div', { class: 'flex flex-wrap items-center gap-2' },
      h('span', { class: cls.cx(cls.PILL, right ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad', 'font-bold') }, right ? `✓ ${et('predict.right')}` : `✗ ${et('predict.wrong')}`),
      h('h4', { id: `${l.id}-plan`, class: 'm-0 text-body font-bold', tabindex: '-1', 'data-ek': `${l.id}-plan` }, et('predict.realTitle'))),
    plan === 'busy' ? h('p', { class: 'm-0 flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing'))
      : plan && 'error' in plan ? d.errorView(plan.error) : null,
    tree ? h('div', { class: 'overflow-x-auto' }, planTreeView(h, tree, { label: et('plan.label'), answer: et('plan.answer') }, answerNode(tree, p.expect))) : null,
    tree && c.diagram ? diagramBox(c) : null,
    tree ? h('p', { class: 'm-0' }, observe(tree, p.sql, p.expect).map((o) => et(`obs.${o.code}`, o.params)).join(' ')) : null,
    plan !== 'busy' ? h('div', { class: 'rounded-(--r-ctl) bg-panel p-3 text-body-sm' }, ...c.inline(p.why[c.lang])) : null,
    c.next && plan !== 'busy' ? h('p', { class: 'm-0' }, h('a', { href: c.next.href, class: cls.cx(cls.BTN_GO, 'inline-flex px-5 py-2 no-underline') }, `${et('predict.next')} ›`)) : null);
}

/** The same plan as ENG-VIZ's stepped diagram, folded (the tree above is the answer; this walks it node by node). */
function diagramBox(c: PredictCtx): HTMLElement {
  const { h } = c.d;
  const host = c.st.diagram ? c.diagram!(c.st.json) : null;
  return h('details', { open: !!c.st.diagram, ontoggle: (e: Event) => {
    const open = (e.target as HTMLDetailsElement).open;
    if (open !== !!c.st.diagram) { c.st.diagram = open; c.d.rerender(); }
  } }, h('summary', { class: 'cursor-pointer text-body-sm font-semibold' }, c.et('predict.diagram')), host);
}

/** engine-ux-spec §9.2: after "Xem thật" focus moves to the result card's heading; the page scrolls `block: nearest`. */
function focusCard(id: string): void {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-ek="${CSS.escape(`${id}-plan`)}"]`);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: 'nearest' });
  }, 0);
}
