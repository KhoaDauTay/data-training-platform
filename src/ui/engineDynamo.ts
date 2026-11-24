import { rcuOne, rcuSum } from '../engine/dynamo/cost';
import type { LabOutput } from '../engine/labs';
import { dyText, type DyKey } from '../i18n/engineDynamo';
import type { EngineDeps } from './engineView';

/**
 * v26 (DynamoDB đủ, L380): the "Partition / Chi phí" panel under a DynamoDB run, a lazy chunk (`engineDynamo`, own budget) that
 * engineNosql loads on the first DynamoDB result. Only types from main modules; main values come through EngineDeps.
 * Three honesty tiers, each with a visible tag: measured (the engine's ConsumedCapacity, LastEvaluatedKey), AWS rule (the
 * formula, recomputed from the returned items only when no filter or projection hides what was read), illustration
 * (partitions: the in-browser engine has none). What cannot be measured here is listed, never given a number.
 */
let d: EngineDeps;
const t = (k: DyKey, p?: Record<string, string | number>): string => dyText(d.getLang(), d.locale(), k, p);
const inline = (s: string): (Node | string)[] => s.split(/`([^`]+)`/).map((x, i) => (i % 2 ? d.h('code', {}, x) : x));
const tag = (k: DyKey): HTMLElement => d.h('span', { class: d.cls.cx(d.cls.PILL, 'bg-surface-2 text-muted ring-1 ring-line'), 'data-tier': k }, t(k));
const line = (s: string): HTMLElement => d.h('p', { class: 'm-0' }, ...inline(s));
const READS_ONE = new Set(['GetItem', 'BatchGetItem', 'TransactGetItems']);
const PAGED = new Set(['Query', 'Scan', 'ExecuteStatement']);

export function costPanel(deps: EngineDeps, r: LabOutput, key: string): HTMLElement | null {
  d = deps;
  const { h } = d;
  const m = r.meta?.dynamo;
  if (!m) return null;
  const num = (n: number): string => n.toLocaleString(d.locale());
  const cap = m.capacity;
  const unit = t(m.write ? 'unit.write' : cap?.read !== undefined || !m.write ? 'unit.read' : 'unit.cu');
  const idx = Object.entries(cap?.indexes ?? {}); // F18: no index read = no split line (the table is the whole total, never a dangling "–")
  const split = cap && idx.length
    ? t('cap.split', { table: num(cap.table ?? 0), idx: idx.map(([name, n]) => t('cap.idx', { name, n: num(n) })).join(' · ') }) : '';
  // The rule, recomputed only when the returned items are exactly what was read (no filter dropped any, nothing projected away).
  let calc = '';
  if (!m.write && cap && m.bytes.length === (r.meta?.count ?? -1) && m.bytes.length) {
    if (m.scanned !== undefined && m.scanned > m.bytes.length) calc = t('calc.filtered', { s: num(m.scanned), n: num(m.bytes.length) });
    else {
      const rule = READS_ONE.has(m.op) ? m.bytes.reduce((s, b) => s + rcuOne(b, m.mode), 0) : rcuSum(m.bytes, m.mode);
      calc = t('calc.items', { n: num(m.bytes.length), b: num(m.bytes.reduce((s, b) => s + b, 0)), r: num(rule), m: num(cap.total) });
    }
  } else if (!m.write && m.scanned !== undefined && m.scanned > (r.meta?.count ?? 0)) calc = t('calc.filtered', { s: num(m.scanned), n: num(r.meta?.count ?? 0) });
  // Illustration: the returned items grouped by the partition key of the table or index read (reads only: a write shows the table after).
  const at = m.pk && !m.write ? r.columns.indexOf(m.pk) : -1;
  const groups = new Map<string, { n: number; b: number }>();
  if (at >= 0) r.rows.forEach((row, i) => {
    const g = groups.get(String(row[at])) ?? { n: 0, b: 0 };
    groups.set(String(row[at]), { n: g.n + 1, b: g.b + (m.bytes.length === r.rows.length ? m.bytes[i] : 0) });
  });
  const box = 'flex flex-col gap-1.5 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm';
  const head = (k: DyKey, title?: string): HTMLElement => h('div', { class: 'flex flex-wrap items-center gap-2' }, tag(k), title ? h('b', {}, ...inline(title)) : null);
  return h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': `${key}-cost`, 'data-dy-cost': '' },
    h('h4', { id: `${key}-cost`, class: 'm-0 text-body-sm font-bold' }, t('title')),
    h('div', { class: box, 'data-dy-measured': '' }, head('tag.measured'),
      cap ? line(t('cap.total', { n: num(cap.total), unit })) : line(t('cap.none')), split ? line(split) : null,
      PAGED.has(m.op) ? h('div', { 'data-dy-page': m.lastKey ? 'more' : 'last' }, line(t(m.lastKey ? 'page.more' : 'page.last')),
        m.lastKey ? h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, JSON.stringify({ ExclusiveStartKey: m.lastKey })) : null) : null),
    h('div', { class: box, 'data-dy-rule': '' }, head('tag.rule'),
      line(t(m.write ? 'rule.write' : `mode.${m.mode}`)), m.write ? null : line(t(READS_ONE.has(m.op) ? 'rule.get' : 'rule.query')), calc ? line(calc) : null),
    groups.size ? h('div', { class: box, 'data-dy-illus': '' }, head('tag.illus', t('part.title', { pk: m.pk! })),
      h('ul', { class: 'm-0 list-disc space-y-0.5 pl-5' }, ...[...groups].slice(0, 8).map(([k, g]) => h('li', {}, h('code', {}, k), ` · ${t('part.row', { n: num(g.n), b: num(g.b) })}`))),
      line(t('part.note'))) : null,
    h('details', { class: 'text-body-sm', 'data-dy-gap': '' }, h('summary', { class: 'cursor-pointer font-semibold' }, t('gap.title')),
      h('p', { class: 'my-1' }, t('gap.list')), h('p', { class: 'm-0 text-caption text-muted' }, t('gap.src'))));
}
