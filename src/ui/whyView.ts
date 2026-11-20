import type { Lang } from '../i18n';
import type * as Dom from './dom';
import type * as Table from './resultTable';
import type { WhyResult } from '../viz/why';

/**
 * V22-B (L206): the explanation under one result row, lazy chunk `whyView` (budget `why`). Only `import type` from main
 * modules (Plan 6 U3): main values come through init(). VI/EN text lives here, not in vi.ts/en.ts.
 */
let h: typeof Dom.h;
let loader: typeof Dom.loader;
let formatCell: typeof Table.formatCell;
let getLang: () => Lang;
export function init(d: { h: typeof Dom.h; loader: typeof Dom.loader; formatCell: typeof Table.formatCell; getLang: () => Lang }): void {
  ({ h, loader, formatCell, getLang } = d);
}

const TEXT = {
  vi: {
    group: (n: number) => `Dòng này gom ${n} dòng nguồn`, where: ' có ', more: (n: number) => `+ ${n} dòng nữa`,
    join: 'Dòng này ghép ', with: ' với ', via: ' qua ', pairs: (n: number) => ` (${n} cặp cho ra cùng dòng này)`,
    none: 'không có dòng khớp, nên các cột bên phải là trống',
    notYet: 'Chưa giải thích được câu này (WITH, UNION, hàm cửa sổ, câu con, ROLLUP hoặc cột nhóm không có trong SELECT).',
    lost: 'Không tìm lại được dòng nguồn của dòng này.', failed: 'Không tải được phần giải thích. Bấm lại để thử.',
  },
  en: {
    group: (n: number) => `This row groups ${n} source rows`, where: ' with ', more: (n: number) => `+ ${n} more rows`,
    join: 'This row joins ', with: ' with ', via: ' on ', pairs: (n: number) => ` (${n} pairs give this same row)`,
    none: 'no matching row, so the right-hand columns are empty',
    notYet: 'This query cannot be explained yet (WITH, UNION, window functions, sub-queries, ROLLUP or a group column missing from SELECT).',
    lost: 'The source rows of this row could not be found again.', failed: 'The explanation did not load. Click again to retry.',
  },
};
const MAX_TERMS = 5;
const cell = (v: unknown) => formatCell(v);
const code = (s: string) => h('code', {}, s);

function table(cols: string[], rows: unknown[][]): HTMLElement {
  return h('div', { class: 'overflow-x-auto' }, h('table', { class: 'w-auto text-body-sm' },
    h('thead', {}, h('tr', {}, ...cols.map((c) => h('th', { scope: 'col', class: 'font-semibold' }, c)))),
    h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((v) => h('td', {}, cell(v))))))));
}

function body(r: WhyResult): (Node | string)[] {
  const x = TEXT[getLang()];
  if (!r.ok) return [h('p', { class: 'm-0' }, r.reason === 'noRow' || r.reason === 'error' ? x.lost : x.notYet)];
  if (r.kind === 'group') {
    const keys = r.cols.flatMap((c, i) => (r.agg[i] || !r.rows[0] ? [] : [`${c} = ${cell(r.rows[0][i])}`]));
    const sums = r.cols.flatMap((c, i) => (r.agg[i] && /^sum\(/i.test(c)
      ? [h('p', { class: 'my-1' }, code(`${c} = ${r.rows.slice(0, MAX_TERMS).map((row) => cell(row[i])).join(' + ')}${r.n > MAX_TERMS ? ' + …' : ''}`))] : []));
    return [
      h('p', { class: 'm-0' }, h('strong', {}, x.group(r.n)), ...(keys.length ? [x.where, ...keys.flatMap((k, i) => [i ? ', ' : '', code(k)])] : []), '.'),
      table(r.cols, r.rows),
      r.n > r.rows.length ? h('p', { class: 'my-1 text-muted' }, x.more(r.n - r.rows.length)) : '',
      ...sums,
    ];
  }
  const pair = r.rows[0] ?? [];
  const named = r.tables.map((t, j) => (pair[j] && 'id' in pair[j]! ? `${t} id ${cell(pair[j]!.id)}` : t));
  const on = r.on.filter((o): o is string => !!o);
  return [
    h('p', { class: 'm-0' }, x.join, ...named.flatMap((n, i) => [i ? x.with : '', code(n)]), ...(on.length ? [x.via, ...on.flatMap((o, i) => [i ? ', ' : '', code(o)])] : []),
      r.n > 1 ? x.pairs(r.n) : '', '.'),
    h('div', { class: 'mt-1 flex flex-wrap gap-3' }, ...r.tables.map((t, j) => {
      const o = pair[j];
      return h('div', { class: 'min-w-0' }, h('p', { class: 'my-0 font-semibold' }, t),
        o ? table(Object.keys(o).slice(0, 8), [Object.values(o).slice(0, 8)]) : h('p', { class: 'my-0 text-muted' }, x.none));
    })),
  ];
}

/** Opens (or closes) the explanation row under `btn`'s row; `ask` runs the worker request. */
export function toggle(btn: HTMLButtonElement, span: number, ask: () => Promise<unknown>): void {
  const tr = btn.closest('tr')!;
  const open = tr.nextElementSibling as HTMLElement | null;
  if (open?.dataset.why !== undefined) {
    open.remove();
    if (open.dataset.why !== 'failed') return void btn.setAttribute('aria-expanded', 'false'); // a failed one opens again: the retry
  }
  const box = h('div', { role: 'status', class: 'rounded-(--r-inset) bg-surface-2 p-2 text-body-sm' }, loader());
  const row = h('tr', { 'data-why': '' }, h('td', { colspan: String(span), class: 'whitespace-normal' }, box));
  tr.after(row);
  btn.setAttribute('aria-expanded', 'true');
  ask().then((r) => box.replaceChildren(...body(r as WhyResult)), () => {
    row.dataset.why = 'failed';
    box.replaceChildren(h('p', { class: 'm-0 bad' }, TEXT[getLang()].failed));
  });
}
