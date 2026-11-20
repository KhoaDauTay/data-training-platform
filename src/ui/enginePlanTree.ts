import type { PlanNode } from '../engine/predict';
import type * as Dom from './dom';

/**
 * v23 PRED (L256): a real plan as a tree of boxes (engine-ux-spec §5.4 "nút kế hoạch"), drawn in HTML so it reflows at
 * 320 px and screen readers read it as nested lists. Each box: node type, index and table (code, never translated), then the
 * planner's cost and row estimate in EXPLAIN's own notation (never milliseconds). `mark` = the node that answers the
 * question: an --accent outline plus words, never colour alone. Part of the engineView chunk; the capstone chunk gets it
 * through its context (no second copy, no shared chunk).
 */
export interface TreeText { label: string; answer: string }
export function planTreeView(h: typeof Dom.h, root: PlanNode, text: TreeText, mark?: PlanNode): HTMLElement {
  const num = (n: number): string => String(Math.round(n * 100) / 100); // as EXPLAIN prints it, in every language
  const box = (n: PlanNode): HTMLElement => h('li', { class: 'space-y-2' },
    h('div', { class: n === mark ? 'rounded-(--r-inset) bg-panel px-3 py-2 ring-2 ring-accent' : 'rounded-(--r-inset) bg-panel px-3 py-2 ring-1 ring-line' },
      h('p', { class: 'm-0 font-mono text-body-sm', lang: 'en' }, h('b', {}, n.node),
        n.index ? ` using ${n.index}` : '', n.relation ? ` on ${n.relation}` : ''),
      h('p', { class: 'm-0 font-mono text-caption text-muted', lang: 'en' }, `cost=${num(n.startup)}..${num(n.cost)} rows=${num(n.rows)}`),
      n === mark ? h('p', { class: 'm-0 mt-1 text-caption font-bold text-accent' }, text.answer) : null),
    n.children.length ? h('ul', { class: 'm-0 ml-3 list-none space-y-2 border-l-2 border-line py-0 pr-0 pl-3' }, ...n.children.map(box)) : null);
  return h('ul', { class: 'm-0 list-none p-0', 'aria-label': text.label, 'data-plan': '' }, box(root));
}
