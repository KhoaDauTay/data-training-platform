import { t } from '../i18n';
import type { Plan, PlanNode } from '../viz/plan';
import { h, reducedMotion } from './dom';
import { s } from './svg';

const COL = 210;
const ROW = 64;
const BOX_W = 168;
const BOX_H = 40;
/** v10 A9 (L156): one run of the dots, 1.6 s each, the last one starting 1.2 s in (≤ 3 s), then still. */
const DOT_S = 1.6;
/** Plans whose dots already ran: a redraw (language, tab switch) of the same memoised plan never replays them. */
const ran = new WeakSet<Plan>();

/** Leaves on the left, root on the right; edge width grows with log(rows). */
export function renderFlow(host: HTMLElement, plan: Plan): void {
  const { nodes } = plan;
  const children = (id: number) => nodes.filter((n) => n.parent === id);
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  const maxRows = Math.max(1, ...nodes.map((n) => n.rows));
  const y = new Map<number, number>();
  let leaf = 0;
  const place = (n: PlanNode): number => {
    const kids = children(n.id);
    const pos = kids.length === 0 ? leaf++ * ROW : kids.map(place).reduce((a, b) => a + b, 0) / kids.length;
    y.set(n.id, pos);
    return pos;
  };
  place(nodes[0]);
  const x = (n: PlanNode) => (maxDepth - n.depth) * COL;
  const width = (maxDepth + 1) * COL;
  const height = Math.max(1, leaf) * ROW;
  const animate = !reducedMotion();
  const runs: [SVGAnimationElement, number][] = [];

  const root = s('svg', { viewBox: `-10 -10 ${width} ${height + 10}`, role: 'img', 'aria-label': t('flow.aria'), class: 'h-auto w-full min-w-[480px]' });
  for (const n of nodes.slice(1)) {
    const p = nodes[n.parent!];
    const x1 = x(n) + BOX_W;
    const y1 = y.get(n.id)! + BOX_H / 2;
    const x2 = x(p);
    const y2 = y.get(p.id)! + BOX_H / 2;
    const d = `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
    const w = 1.5 + (8 * Math.log10(n.rows + 1)) / Math.log10(maxRows + 1);
    root.append(s('path', { d, class: 'fill-none stroke-accent/30', 'stroke-width': w.toFixed(1) }));
    if (animate && n.rows > 0) {
      // Hidden at rest (opacity 0, also parks the dot's 0,0 out of sight); begun only by play() below.
      const move = s('animateMotion', { dur: `${DOT_S}s`, begin: 'indefinite', path: d });
      const fade = s('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.1;0.9;1', dur: `${DOT_S}s`, begin: 'indefinite' });
      root.append(s('circle', { r: 4, class: 'fill-accent', opacity: 0 }, move, fade));
      runs.push([move, (n.id % 4) * 0.4], [fade, (n.id % 4) * 0.4]);
    }
  }
  for (const n of nodes) {
    const label = n.label.length > 24 ? `${n.label.slice(0, 23)}…` : n.label;
    const rows = t('viz.rows', { n: n.rows });
    root.append(s('g', { transform: `translate(${x(n)},${y.get(n.id)})` },
      s('title', {}, `${n.label}: ${rows}`),
      s('rect', { width: BOX_W, height: BOX_H, rx: 6, class: 'fill-panel stroke-line' }),
      s('text', { x: 8, y: 16, class: 'fill-ink text-caption font-semibold' }, label),
      s('text', { x: 8, y: 32, class: 'fill-ink text-caption tabular-nums' }, rows)));
  }
  const play = (): void => runs.forEach(([a, at]) => a.beginElementAt?.(at));
  host.append(
    h('p', { class: 'muted' }, t('flow.intro')),
    runs.length ? h('div', { class: 'actions' }, h('button', { type: 'button', onclick: play }, t('steps.play'))) : '',
    h('div', { class: 'overflow-auto' }, root),
  );
  if (runs.length && !ran.has(plan)) {
    ran.add(plan);
    requestAnimationFrame(play); // once per plan, when the tab first shows it (SMIL needs the element in the page)
  }
}
