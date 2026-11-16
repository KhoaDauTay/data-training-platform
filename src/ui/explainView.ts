import { t, type Key } from '../i18n';
import { cx } from '../theme';
import { isHeavyScan, nodeHelpKey, type Plan, type PlanDetail } from '../viz/plan';
import { fmt, h } from './dom';

const DETAIL_KEY: Record<PlanDetail['kind'], Key> = {
  index: 'plan.index',
  indexCond: 'plan.indexCond',
  hashCond: 'plan.hashCond',
  joinFilter: 'plan.joinFilter',
  filter: 'plan.filter',
  groupKey: 'plan.groupKey',
  sortKey: 'plan.sortKey',
};

const detailText = (d: PlanDetail): string =>
  t(DETAIL_KEY[d.kind], { v: d.text }) + (d.removed ? t('plan.removed', { n: d.removed }) : '');

export function renderExplain(host: HTMLElement, plan: Plan): void {
  const max = Math.max(1, ...plan.nodes.map((n) => n.scanned));
  host.append(
    h('p', { class: 'muted' }, t('explain.intro', { ms: fmt(plan.executionMs, 1) })),
    h('div', { class: 'space-y-1' }, ...plan.nodes.map((n) =>
      // Indent is per node data, so it is an inline style, not a class.
      h('details', { class: cx('rounded-md bg-code px-2 py-1 ring-1', isHeavyScan(n) ? 'ring-warn' : 'ring-line'), style: `margin-left:${n.depth * 20}px` },
        h('summary', { class: 'flex cursor-pointer flex-wrap items-center gap-2' },
          h('span', { class: 'min-w-[200px] font-semibold' }, n.label),
          h('span', { class: 'h-2 min-w-20 flex-1 overflow-hidden rounded bg-line', 'aria-hidden': 'true' },
            h('i', { class: 'block h-full bg-accent', style: `width:${Math.max(2, (n.scanned / max) * 100)}%` })),
          h('span', { class: 'min-w-[90px] tabular-nums' }, t('viz.rows', { n: n.rows })),
          h('span', { class: 'muted tabular-nums' }, `${fmt(n.ms, 2)} ms`),
          isHeavyScan(n) ? h('span', { class: 'warn', role: 'img', 'aria-label': t('explain.heavy'), title: t('explain.heavy') }, '⚠') : null),
        h('p', { class: 'my-1' }, t(nodeHelpKey(n.type))),
        n.estRows !== n.rows ? h('p', { class: 'muted my-1' }, t('explain.estimate', { est: fmt(n.estRows), actual: fmt(n.rows) })) : null,
        ...n.detail.map((d) => h('p', { class: 'my-1' }, h('code', {}, detailText(d))))))),
  );
}
