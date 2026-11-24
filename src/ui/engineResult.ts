import { heapView } from '../engine/inside';
import type { LabOutput } from '../engine/labs';
import type { Params } from '../i18n';
import { resultText, type ResultKey } from '../i18n/engineResult';
import type { EngineDeps } from './engineView';

/**
 * v33 (L537): what is drawn under an Engine lab or example result: the engine numbers (LabMeta) and the pageinspect "Inside"
 * table. Moved out of engineView into its own lazy chunk (`engineResult`), started with engineFull by chunksFor() for every
 * lesson, so a lesson draws once both are in (no new loading state). Imports only types from main modules (Plan 6 U3).
 */
const rt = (d: EngineDeps, key: ResultKey, params?: Params): string => resultText(d.getLang(), d.locale(), key, params);

/** Engine numbers beside the result (LabMeta); nothing when the runner gave none. */
export function metaView(d: EngineDeps, r: LabOutput): HTMLElement | null {
  const m = r.meta;
  if (!m) return null;
  const { h } = d;
  const pairs: [ResultKey, string][] = [];
  if (m.table !== undefined) pairs.push(['meta.table', m.table]);
  // F18: capacity only in the DynamoDB cost panel (engineDynamo), never twice
  for (const k of ['scannedCount', 'count'] as const) if (m[k] !== undefined) pairs.push([`meta.${k}`, m[k]!.toLocaleString(d.locale())]);
  if (m.explain) {
    pairs.push(['meta.stages', m.explain.stages.join(' → ')], ['meta.keysExamined', m.explain.keysExamined.toLocaleString(d.locale())],
      ['meta.docsExamined', m.explain.docsExamined.toLocaleString(d.locale())]);
  }
  const plans = (['planBefore', 'planAfter'] as const).filter((k) => m[k]);
  // R2 E07 (L578d): read more than returned (a Scan + filter) is the point of the number: say it, not only in grey
  const over = m.scannedCount !== undefined && m.count !== undefined && m.scannedCount > m.count;
  return h('section', { class: 'flex flex-col gap-2', 'aria-label': rt(d, 'meta.title') },
    pairs.length ? h('dl', { class: 'm-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm' },
      ...pairs.flatMap(([k, v]) => [h('dt', { class: 'text-muted' }, rt(d, k)), h('dd', { class: over && k === 'meta.scannedCount' ? 'm-0 font-bold tabular-nums text-bad' : 'm-0 font-semibold tabular-nums' }, v)])) : null,
    over ? h('p', { class: 'm-0 rounded-(--r-inset) bg-bad-soft p-2 text-body-sm font-semibold text-ink', 'data-overread': '' },
      rt(d, 'meta.overread', { s: m.scannedCount!, n: m.count! })) : null,
    ...plans.map((k) => h('div', {}, h('p', { class: 'm-0 text-body-sm text-muted' }, rt(d, `meta.${k}`)), h('pre', { tabindex: '0', class: 'sql m-0 overflow-x-auto' }, m[k]!))),
    m.catalog?.length ? h('div', {}, h('p', { class: 'm-0 text-body-sm text-muted' }, rt(d, 'meta.catalog')),
      h('pre', { tabindex: '0', class: 'sql m-0 overflow-x-auto' }, m.catalog.map((row) => row.map(String).join(' | ')).join('\n'))) : null);
}

/** engineView's diagram host (one per slot, kept across redraws). */
type VizSlot = (slot: string, name: string | undefined, engine: 'postgres', model?: unknown, modelKey?: string, bleed?: string) => HTMLElement | null;

/** "Bên trong" (engine-ux-spec §5.3): a pageinspect result as line pointers with decoded infomask flags, or the missing columns. */
export function insideView(d: EngineDeps, vizSlot: VizSlot, r: LabOutput, slot: string): HTMLElement | null {
  const v = heapView(r);
  if (!v) return null;
  const { h } = d;
  if ('missing' in v) return h('p', { class: 'm-0 text-body-sm text-muted' }, rt(d, 'inside.missing', { cols: v.missing.join(', ') }));
  // The real page as ENG-VIZ's heap diagram (L237: heap_page_items rows as they come), above the decoded table.
  const rows = r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
  const diagram = vizSlot(slot, 'pg-heap-page', 'postgres', { rows }, JSON.stringify(r.rows), 'max-sm:-mx-3');
  const head = ['lp', 'lp_flags', 't_xmin', 't_xmax', 't_ctid', 'infomask'];
  return h('figure', { class: 'm-0 flex flex-col gap-2', 'data-inside': '' },
    h('figcaption', { class: 'text-body-sm' }, h('b', {}, `${rt(d, 'inside.title')}: `), rt(d, 'inside.caption', { n: v.rows.length, dead: v.dead, hot: v.hot })),
    h('div', { class: 'overflow-x-auto', tabindex: '0' }, h('table', { class: 'text-body-sm', lang: 'en' },
      h('thead', {}, h('tr', {}, ...head.map((c) => h('th', { scope: 'col', class: 'px-2 text-left font-mono' }, c)))),
      h('tbody', {}, ...v.rows.map((x) => h('tr', { class: x.flag === 'dead' ? 'bad' : x.flags.includes('HOT_UPDATED') || x.flag === 'redirect' ? 'warn' : '' },
        ...[x.lp, x.flag, x.xmin, x.xmax, x.ctid, x.flags.join(' ')].map((c) => h('td', { class: 'px-2 font-mono whitespace-nowrap' }, c)))))),
    diagram));
}
