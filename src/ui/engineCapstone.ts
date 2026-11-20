import type { EngineLesson, Lab } from '../engine/content';
import type * as Predict from '../engine/predict';
import type { PlanNode } from '../engine/predict';
import type { EngineKey } from '../i18n/engine';
import type { planTreeView } from './enginePlanTree';
import type { EngineDeps } from './engineView';

/**
 * v23 CAP (L257, engine-ux-spec §5.6): the capstone's own parts around its lab, which stays on the lesson page (Q-C1, L258):
 * a sticky step bar, the "Chấm bằng" checklist (one line per step, exactly what its check compares), the plan before and
 * after the step that changes the database (the "after" replays the learner's own statement) and the finish card where Lily
 * cheers beside the level's done badge. Lazy chunk `engineCapstone` (budget group `engineui`), loaded by engineView when a
 * capstone opens; like every lazy chunk it imports only types from main modules, and the plan tree and src/engine/predict.ts come in its context.
 */
export interface CapState { plans?: { before: PlanNode; after: PlanNode } | { error: unknown } | 'busy' }
export interface CapCtx {
  d: EngineDeps;
  et: (key: EngineKey, params?: Record<string, string | number>) => string;
  inline: (text: string) => (Node | string)[];
  lang: 'vi' | 'en';
  l: EngineLesson;
  passed: ReadonlySet<string>;
  st: CapState;
  /** The raw EXPLAIN (FORMAT JSON) cell of `sql` on `lab`, after replaying its first `step` steps. */
  explainAt: (lab: Lab, sql: string, step: number) => Promise<unknown>;
  /** The statement that passed step `i` in this visit (undefined when it was passed in an earlier one). */
  mine: (i: number) => string | undefined;
  tree: typeof planTreeView;
  /** src/engine/predict.ts, passed in (a value import here would make it a shared chunk). */
  pred: Pick<typeof Predict, 'answerNode' | 'capstonePivot' | 'planTree' | 'stepName'>;
  done: boolean;
  levelDone: boolean;
}

const steps = (c: CapCtx) => c.l.lab!.steps;
/** The step in progress: the first one not passed (= the number of steps when all are). */
export const currentStep = (c: Pick<CapCtx, 'l' | 'passed'>): number => {
  const i = c.l.lab!.steps.findIndex((_, j) => !c.passed.has(`s${j}`));
  return i === -1 ? c.l.lab!.steps.length : i;
};

/** Sticky at the top of the lab (solid --panel, a 1 px rule): one 6 px segment per step, names from lg, one line below it. */
export function capBar(c: CapCtx): HTMLElement {
  const { d, et } = c;
  const { h, cls } = d;
  const all = steps(c);
  const cur = currentStep(c);
  const name = (i: number): string => c.pred.stepName(all[i].task[c.lang], all[i].name?.[c.lang]);
  return h('nav', { class: 'sticky top-0 z-10 space-y-1 border-b border-line bg-panel px-3 py-2', 'aria-label': et('cap.bar'), 'data-cap-bar': '' },
    h('ol', { class: 'm-0 flex list-none gap-2 p-0' }, ...all.map((_, i) => {
      const ok = c.passed.has(`s${i}`);
      return h('li', { class: 'min-w-0 flex-1 space-y-1', 'aria-current': i === cur ? 'step' : false },
        h('span', { class: cls.cx('block h-1.5 rounded-full', ok ? 'bg-good' : i === cur ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line'), 'aria-hidden': 'true' }),
        h('span', { class: cls.cx('block truncate text-caption max-lg:sr-only', i === cur ? 'font-bold text-ink' : 'text-muted') },
          `${i + 1}. ${name(i)}`, h('span', { class: 'sr-only' }, ` (${ok ? et('cap.passed') : i === cur ? et('cap.current') : et('cap.todo')})`)));
    })),
    h('p', { class: 'm-0 text-caption font-semibold lg:hidden', 'aria-hidden': 'true' },
      cur < all.length ? et('cap.now', { i: cur + 1, n: all.length, name: name(cur) }) : et('cap.allDone', { n: all.length })));
}

/** "Chấm bằng": ✓ / ○ and the words of each step's check (rows, plan, catalog, doc), redrawn after every Submit. */
export function capChecks(c: CapCtx): HTMLElement {
  const { d, et } = c;
  const { h, cls } = d;
  const words = (i: number): string => {
    const s = steps(c)[i];
    const key: EngineKey = s.check === 'rows' ? (s.ordered ? 'cap.check.rowsOrdered' : 'cap.check.rows') : `cap.check.${s.check}`;
    return et(key, { i: i + 1 });
  };
  return h('section', { class: cls.cx(cls.CARD, 'space-y-2 p-4'), 'aria-labelledby': `${c.l.id}-graded` },
    h('h4', { id: `${c.l.id}-graded`, class: 'm-0 text-body font-bold' }, et('cap.gradedBy')),
    h('ul', { class: 'm-0 list-none space-y-1 p-0 text-body-sm' }, ...steps(c).map((_, i) => {
      const ok = c.passed.has(`s${i}`);
      return h('li', { class: 'flex items-start gap-2' },
        ok ? d.icon('check', 'mt-0.5 size-4 shrink-0 text-good') : h('span', { class: 'mt-0.5 inline-block size-4 shrink-0 rounded-full ring-2 ring-line-strong', 'aria-hidden': 'true' }),
        h('span', {}, words(i), h('span', { class: 'sr-only' }, ` (${ok ? et('cap.passed') : et('cap.todo')})`)));
    })));
}

/** Plans "Trước" and "Sau" side by side (stacked below lg) with their planner cost; never milliseconds. */
export function capPlans(c: CapCtx): HTMLElement | null {
  const { d, et, st } = c;
  const { h, cls } = d;
  const piv = c.pred.capstonePivot(c.l.lab);
  if (!piv) return null;
  const mine = c.mine(piv.gate) ?? (c.done ? steps(c)[piv.gate].solution : undefined);
  const open = c.passed.has(`s${piv.gate}`) && mine !== undefined;
  const load = async (): Promise<void> => {
    st.plans = 'busy';
    d.rerender();
    try {
      const lab = c.l.lab!;
      const after: Lab = { ...lab, steps: lab.steps.map((s, j) => (j === piv.gate ? { ...s, solution: mine! } : s)) };
      const [b, a] = [c.pred.planTree(await c.explainAt(lab, piv.query, piv.before)), c.pred.planTree(await c.explainAt(after, piv.query, piv.after))];
      st.plans = b && a ? { before: b, after: a } : { error: new Error('EXPLAIN gave no plan') };
    } catch (error) {
      st.plans = { error };
    }
    d.rerender();
  };
  const p = st.plans;
  const side = (title: string, t: PlanNode): HTMLElement => h('div', { class: 'min-w-0 space-y-2' },
    h('p', { class: 'm-0 text-body-sm font-bold' }, title),
    h('div', { class: 'overflow-x-auto' }, c.tree(d.h, t, { label: `${et('plan.label')}: ${title}`, answer: et('plan.answer') }, c.pred.answerNode(t))),
    h('p', { class: 'm-0 text-body-sm tabular-nums' }, et('cap.cost', { c: Math.round(t.cost * 100) / 100 })));
  const same = (a: PlanNode, b: PlanNode): boolean => JSON.stringify(a) === JSON.stringify(b);
  return h('section', { class: cls.cx(cls.CARD, 'space-y-3 p-4'), 'aria-labelledby': `${c.l.id}-plans` },
    h('h4', { id: `${c.l.id}-plans`, class: 'm-0 text-body font-bold' }, et('cap.plans')),
    h('div', { class: 'space-y-1' }, h('p', { class: 'm-0 text-body-sm text-muted' }, et('cap.query')), h('pre', { class: 'sql m-0 overflow-x-auto' }, piv.query)),
    !open ? h('p', { class: 'm-0 text-body-sm text-muted' }, et('cap.plansGate', { i: piv.gate + 1 }))
      : p === undefined ? h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${c.l.id}-plans`, onclick: () => void load() }, et('cap.plansBtn'))
        : p === 'busy' ? h('p', { class: 'm-0 flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing'))
          : 'error' in p ? d.errorView(p.error)
            : h('div', { class: 'grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]', 'data-cap-plans': '' },
              side(et('cap.before'), p.before),
              h('span', { class: 'self-center text-center text-heading font-bold text-accent', 'aria-hidden': 'true' }, h('span', { class: 'max-lg:hidden' }, '→'), h('span', { class: 'lg:hidden' }, '↓')),
              side(et('cap.after'), p.after),
              same(p.before, p.after) ? h('p', { class: 'm-0 text-body-sm lg:col-span-3' }, et('cap.same')) : null),
    h('p', { class: 'm-0 rounded-(--r-ctl) bg-info-soft p-3 text-body-sm' }, et('cap.fresh')));
}

/** The finish (engine-ux-spec §5.6): Lily cheers beside the level's done badge; react() runs at the completion event, not here. */
export function capDone(c: CapCtx): HTMLElement | null {
  if (!c.done) return null;
  const { d, et } = c;
  const { h, cls } = d;
  return h('section', { class: cls.cx(cls.CARD, 'flex items-center gap-4 p-4'), 'aria-labelledby': `${c.l.id}-capdone`, 'data-cap-done': '' },
    h('span', { class: 'size-20 shrink-0' }, d.cheer.mascot('lily', 'cheer', 'size-20')),
    h('div', { class: 'min-w-0 flex-1 space-y-1' },
      h('h3', { id: `${c.l.id}-capdone`, class: 'm-0 text-title font-bold' }, et('cap.done', { level: c.l.level })),
      h('p', { class: 'm-0 text-body-sm' }, et('cap.doneLine', { n: steps(c).length })),
      c.levelDone ? h('p', { class: 'm-0 text-body-sm font-bold good' }, et('cap.levelDone', { level: c.l.level })) : null),
    h('span', { class: 'block size-10 shrink-0', 'aria-hidden': 'true' }, d.cheer.badge()));
}
