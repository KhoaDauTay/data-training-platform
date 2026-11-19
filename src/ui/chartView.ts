import type { QueryResult } from '../db/run';
import { locale, t } from '../i18n';
import { session } from '../session';
import { STARTERS } from '../starterCards';
import { activeDomain } from '../domains';
import { actions } from '../state';
import { BTN_SECONDARY, cx } from '../theme';
import { chartSpec, MAX_POINTS, valueRange, type ChartSpec } from '../viz/chart';
import { niceTicks } from '../viz/ticks';
import { fmt, h } from './dom';
import { formatCell } from './resultTable';
import { s } from './svg';
import { emptyState } from './tabs';

/**
 * ui-ux-v7 C1 (D-U2): one chart style for the Chart tab and the dashboard cards. One data colour (--chart-1 = --accent, both
 * themes; chapter colours stay on chips and ER borders), a clear 0 axis, a few dashed grid lines at nice steps (niceTicks), values
 * in muted/ink text, never in the series colour. A single series needs no legend: the tab's title names it.
 * `card`: a dashboard card (~260–360 px wide); its viewBox is no wider than the narrowest card and `min-w` stops it from scaling
 * below 1:1, so labels stay at least 12 px. The tab draws at the panel's measured width (ResizeObserver).
 */
export type ChartSize = 'tab' | 'card';
const SIZES = {
  tab: { w: 720, labelW: 200, valueW: 90, chars: 28, rowH: 24, lineH: 260, padL: 64, svg: 'h-auto w-full' },
  card: { w: 260, labelW: 92, valueW: 64, chars: 13, rowH: 26, lineH: 170, padL: 48, svg: 'h-auto w-full max-w-[400px] min-w-[260px]' },
} as const;
const LABEL = 'fill-muted text-caption';
const VALUE = 'fill-ink text-caption tabular-nums';
const GRID = 'stroke-chart-grid';
const AXIS_H = 18;

/** Axis ticks and card values print "1,2 triệu" / "1.2M" (VI long form: the short "N"/"Tr" is unclear, like kpiNumber); exact values are in each mark's tooltip. */
const short = (n: number): string =>
  Math.abs(n) < 10000 ? fmt(n) : n.toLocaleString(locale(), { notation: 'compact', compactDisplay: locale().startsWith('vi') ? 'long' : 'short', maximumFractionDigits: 1 });

/** A bar with 3 px rounded corners at its data end only (the end away from the 0 line). */
function barPath(x0: number, x1: number, y: number, hgt: number): string {
  const [a, b] = x1 >= x0 ? [x0, x1] : [x1, x0];
  const r = Math.min(3, (b - a) / 2, hgt / 2);
  const f = (n: number) => n.toFixed(1);
  return x1 >= x0
    ? `M${f(a)},${f(y)}H${f(b - r)}Q${f(b)},${f(y)} ${f(b)},${f(y + r)}V${f(y + hgt - r)}Q${f(b)},${f(y + hgt)} ${f(b - r)},${f(y + hgt)}H${f(a)}Z`
    : `M${f(b)},${f(y)}H${f(a + r)}Q${f(a)},${f(y)} ${f(a)},${f(y + r)}V${f(y + hgt - r)}Q${f(a)},${f(y + hgt)} ${f(a + r)},${f(y + hgt)}H${f(b)}Z`;
}

/** Horizontal bars, label left, value at the bar's end; dashed vertical grid at nice steps with labels below. `width`: the tab's measured width. */
export function bars(r: QueryResult, spec: ChartSpec, col: number, size: ChartSize = 'tab', width?: number): SVGSVGElement {
  const { labelW, valueW, chars, svg } = SIZES[size];
  const W = width ?? SIZES[size].w;
  const rowH = size === 'tab' ? Math.max(SIZES.tab.rowH, Math.min(40, Math.floor(200 / Math.max(1, r.rows.length)))) : SIZES.card.rowH; // tab: ≥ 220 px tall
  const vals = r.rows.map((row) => Number(row[col] ?? 0));
  const ticks = niceTicks(...valueRange(vals), size === 'tab' ? 5 : 3);
  const [lo, hi] = [ticks[0], ticks.at(-1)!];
  const x = (v: number) => labelW + (((Number.isFinite(v) ? v : 0) - lo) / (hi - lo)) * (W - labelW - valueW); // NaN/Infinity: no bar, value still printed
  const x0 = x(0); // negatives grow left of the zero line
  const plot = r.rows.length * rowH + 4;
  return s('svg', { viewBox: `0 0 ${W} ${plot + AXIS_H}`, class: svg, role: 'img', 'aria-label': t('chart.barAria', { col: r.columns[col] }) },
    ...ticks.map((v) => s('g', {},
      s('line', { x1: x(v), x2: x(v), y1: 0, y2: plot, class: GRID, 'stroke-dasharray': '2 3' }),
      s('text', { x: x(v), y: plot + 13, 'text-anchor': 'middle', class: LABEL }, short(v)))),
    s('line', { x1: x0, x2: x0, y1: 0, y2: plot, class: 'stroke-line-strong' }),
    ...r.rows.map((row, i) => {
      const label = formatCell(row[spec.label], r.types[spec.label]);
      const xv = x(vals[i]);
      const y = i * rowH + 4;
      return s('g', {},
        s('title', {}, `${label}: ${fmt(vals[i])}`),
        s('text', { x: labelW - 8, y: y + rowH / 2 + 3, 'text-anchor': 'end', class: LABEL }, label.length > chars ? `${label.slice(0, chars - 1)}…` : label),
        Math.abs(xv - x0) >= 0.5 ? s('path', { d: barPath(x0, xv, y + 3, rowH - 8), class: 'fill-chart' }) : null,
        s('text', { x: (Math.max(x0, xv) + 6).toFixed(1), y: y + rowH / 2 + 3, class: VALUE }, size === 'card' ? short(vals[i]) : fmt(vals[i])));
    }));
}

/** At most `n` evenly spread indexes of `len` items, first and last included. */
const spread = (len: number, n: number): number[] =>
  len <= n ? [...Array(len).keys()] : [...new Set(Array.from({ length: n }, (_, k) => Math.round((k * (len - 1)) / (n - 1))))];

/** One line over dates: nice y grid with labels, 4–6 date labels, a soft area under the line, points only up to 24, the last value labelled. */
export function line(r: QueryResult, spec: ChartSpec, col: number, size: ChartSize = 'tab', width?: number): SVGSVGElement {
  const { lineH: H, padL, svg } = SIZES[size];
  const W = width ?? SIZES[size].w;
  const pad = { l: padL, r: size === 'tab' ? 56 : 36, t: 12, b: 26 };
  const pts = r.rows
    .map((row) => ({ t: (row[spec.label] as Date | null)?.getTime(), v: row[col] === null ? null : Number(row[col]), raw: row[spec.label] }))
    .filter((p): p is { t: number; v: number; raw: unknown } => p.t !== undefined && p.v !== null && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
  const [t0, t1] = [pts[0]?.t ?? 0, pts.at(-1)?.t ?? 1];
  const ticks = niceTicks(...valueRange(pts.map((p) => p.v)), size === 'tab' ? 5 : 3);
  const [vmin, vmax] = [ticks[0], ticks.at(-1)!];
  const x = (tm: number) => pad.l + ((tm - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - vmin) / (vmax - vmin)) * (H - pad.t - pad.b);
  const xy = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`);
  const at = (p: { raw: unknown; v: number }) => `${formatCell(p.raw, r.types[spec.label])}: ${fmt(p.v)}`;
  const last = pts.at(-1);
  const focusable = size === 'tab';
  return s('svg', { viewBox: `0 0 ${W} ${H}`, class: svg, role: 'img', 'aria-label': t('chart.lineAria', { col: r.columns[col] }) },
    ...ticks.map((v) => s('g', {},
      s('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: v === 0 ? 'stroke-line-strong' : GRID, 'stroke-dasharray': v !== 0 && '2 3' }),
      s('text', { x: pad.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: LABEL }, short(v)))),
    ...spread(pts.length, size === 'tab' ? 6 : 3).map((i, k, all) => s('text', {
      x: x(pts[i].t), y: H - 8, class: LABEL, 'text-anchor': all.length > 1 && k === 0 ? 'start' : k === all.length - 1 && all.length > 1 ? 'end' : 'middle',
    }, formatCell(pts[i].raw, r.types[spec.label]))),
    pts.length > 1 ? s('path', { d: `M${xy[0]}L${xy.slice(1).join('L')}L${x(t1).toFixed(1)},${y(Math.max(vmin, 0)).toFixed(1)}L${x(t0).toFixed(1)},${y(Math.max(vmin, 0)).toFixed(1)}Z`, class: 'fill-chart', 'fill-opacity': '0.12' }) : null,
    s('polyline', { points: xy.join(' '), 'stroke-width': 2, 'stroke-linejoin': 'round', class: 'fill-none stroke-chart' }),
    ...(pts.length <= 24 ? pts : last ? [last] : []).map((p) => s('circle', { cx: x(p.t).toFixed(1), cy: y(p.v).toFixed(1), r: 4, class: 'fill-chart stroke-panel', 'stroke-width': 2, ...(focusable ? { tabindex: '0', 'aria-label': at(p) } : {}) },
      s('title', {}, at(p)))),
    last ? s('text', { x: x(last.t) + 7, y: y(last.v) - 6, class: VALUE }, short(last.v)) : null);
}

/** Sandbox only: an example that charts (the open domain's starter bar card), put in the editor as an undoable edit. */
function exampleButton(): HTMLElement | null {
  const ex = session.mode.kind === 'sandbox' ? STARTERS[activeDomain()]?.find((c) => c.kind === 'bar') : undefined;
  return ex ? h('button', { type: 'button', class: cx(BTN_SECONDARY, 'px-4 py-1.5'), onclick: () => actions.useSql(ex.sql) }, t('chart.insertExample')) : null;
}

export function renderChart(host: HTMLElement, r: QueryResult): void {
  const spec = chartSpec(r);
  if (!spec) {
    host.append(emptyState('chart', t('chart.emptyHint', { max: MAX_POINTS }), exampleButton()));
    return;
  }
  const title = h('p', { class: 'm-0 text-body-sm font-semibold' });
  const area = h('div', { class: 'min-w-0' });
  let col = spec.values[0];
  let drawnW = 0;
  const draw = () => {
    const w = Math.max(320, Math.round(area.clientWidth || SIZES.tab.w));
    drawnW = w;
    title.textContent = t('chart.title', { value: r.columns[col], label: r.columns[spec.label] });
    area.replaceChildren(spec.kind === 'bar' ? bars(r, spec, col, 'tab', w) : line(r, spec, col, 'tab', w));
  };
  const picker = spec.values.length > 1
    ? h('label', { class: 'inline-flex items-center gap-2 text-body-sm' }, t('chart.valueCol'), (() => {
        const sel = h('select', { class: 'rounded-(--r-inset) bg-panel px-2 py-1 ring-1 ring-line' }, ...spec.values.map((i) => h('option', { value: String(i) }, r.columns[i])));
        sel.addEventListener('change', () => {
          col = Number(sel.value);
          draw();
        });
        return sel;
      })())
    : null;
  host.append(h('div', { class: 'mb-2 flex flex-wrap items-center justify-between gap-2' }, title, picker ?? ''), area);
  draw();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      if (!area.isConnected) return ro.disconnect(); // the tab was redrawn: this chart is gone
      if (Math.abs(Math.max(320, area.clientWidth) - drawnW) > 8) draw();
    });
    ro.observe(area);
  }
}
