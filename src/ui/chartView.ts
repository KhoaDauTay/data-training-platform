import type { QueryResult } from '../db/run';
import { t } from '../i18n';
import { cx, type ChapterColor } from '../theme';
import { chartSpec, MAX_POINTS, valueRange, type ChartSpec } from '../viz/chart';
import { fmt, h } from './dom';
import { formatCell } from './resultTable';
import { s } from './svg';

const W = 720;
const SVG = 'h-auto w-full max-w-[900px]';
const LABEL = 'fill-muted text-xs';
const VALUE = 'fill-ink text-xs tabular-nums';

function bars(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
  const rowH = 24;
  const labelW = 200;
  const vals = r.rows.map((row) => Number(row[col] ?? 0));
  const [lo, hi] = valueRange(vals);
  const x = (v: number) => labelW + (((Number.isFinite(v) ? v : 0) - lo) / (hi - lo)) * (W - labelW - 90); // NaN/Infinity: no bar, value still printed
  const x0 = x(0); // negatives grow left of the zero line
  const height = r.rows.length * rowH + 8;
  return s('svg', { viewBox: `0 0 ${W} ${height}`, class: SVG, role: 'img', 'aria-label': t('chart.barAria', { col: r.columns[col] }) },
    ...r.rows.map((row, i) => {
      const label = formatCell(row[spec.label], r.types[spec.label]);
      const xv = x(vals[i]);
      return s('g', { transform: `translate(0,${i * rowH + 4})` },
        s('title', {}, `${label}: ${fmt(vals[i])}`),
        s('text', { x: labelW - 8, y: 15, 'text-anchor': 'end', class: LABEL }, label.length > 28 ? `${label.slice(0, 27)}…` : label),
        s('rect', { x: Math.min(x0, xv).toFixed(1), y: 3, width: Math.max(1, Math.abs(xv - x0)).toFixed(1), height: rowH - 8, rx: 3, class: color.fill }),
        s('text', { x: (Math.max(x0, xv) + 6).toFixed(1), y: 15, class: VALUE }, fmt(vals[i])));
    }));
}

function line(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
  const H = 260;
  const pad = { l: 64, r: 16, t: 12, b: 32 };
  const pts = r.rows
    .map((row) => ({ t: (row[spec.label] as Date | null)?.getTime(), v: row[col] === null ? null : Number(row[col]), raw: row[spec.label] }))
    .filter((p): p is { t: number; v: number; raw: unknown } => p.t !== undefined && p.v !== null && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
  const [t0, t1] = [pts[0]?.t ?? 0, pts.at(-1)?.t ?? 1];
  const [vmin, vmax] = valueRange(pts.map((p) => p.v));
  const x = (tm: number) => pad.l + ((tm - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - vmin) / (vmax - vmin)) * (H - pad.t - pad.b);
  return s('svg', { viewBox: `0 0 ${W} ${H}`, class: SVG, role: 'img', 'aria-label': t('chart.lineAria', { col: r.columns[col] }) },
    s('line', { x1: pad.l, y1: y(0), x2: W - pad.r, y2: y(0), class: 'stroke-line' }),
    s('text', { x: pad.l - 6, y: y(vmax) + 4, 'text-anchor': 'end', class: LABEL }, fmt(vmax)),
    s('text', { x: pad.l - 6, y: y(vmin) + 4, 'text-anchor': 'end', class: LABEL }, fmt(vmin)),
    s('text', { x: pad.l, y: H - 8, class: LABEL }, pts[0] ? formatCell(pts[0].raw, r.types[spec.label]) : ''),
    s('text', { x: W - pad.r, y: H - 8, 'text-anchor': 'end', class: LABEL }, pts.at(-1) ? formatCell(pts.at(-1)!.raw, r.types[spec.label]) : ''),
    s('polyline', { points: pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '), 'stroke-width': 2, class: cx('fill-none', color.stroke) }),
    ...pts.map((p) => s('circle', { cx: x(p.t).toFixed(1), cy: y(p.v).toFixed(1), r: 3, class: color.fill },
      s('title', {}, `${formatCell(p.raw, r.types[spec.label])}: ${fmt(p.v)}`))));
}

export function renderChart(host: HTMLElement, r: QueryResult, color: ChapterColor): void {
  const spec = chartSpec(r);
  if (!spec) {
    host.append(h('p', { class: 'muted' }, t('chart.empty', { max: MAX_POINTS })));
    return;
  }
  const area = h('div', { class: 'overflow-auto' });
  const draw = (col: number) => area.replaceChildren(spec.kind === 'bar' ? bars(r, spec, col, color) : line(r, spec, col, color));
  const picker = spec.values.length > 1
    ? h('label', { class: 'mb-2 inline-flex items-center gap-2 text-sm' }, t('chart.valueCol'), (() => {
        const sel = h('select', { class: 'rounded-md bg-panel px-2 py-1 ring-1 ring-line' }, ...spec.values.map((i) => h('option', { value: String(i) }, r.columns[i])));
        sel.addEventListener('change', () => draw(Number(sel.value)));
        return sel;
      })())
    : null;
  host.append(picker ?? '', area);
  draw(spec.values[0]);
}
