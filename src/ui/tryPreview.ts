import type { QueryResult } from '../db/run';
import { SCHEMAS, type SchemaId } from '../domains';
import type { GradeResult } from '../grader';
import { t } from '../i18n';
import { app, erMeta, expectedResult } from '../state';
import type { ErMetadata } from '../viz/erd';
import { h, loader, nodes } from './dom';
import { errorView } from './feedback';
import { renderResult } from './resultTable';

/**
 * L84: practice tasks (a quick lesson's "Thử ngay", General drills) show the data they read and a sample of the expected
 * result, and a wrong answer says which columns and rows differ. Never used for story, lane, E-com tickets or promotion
 * reviews (L25: no answer values there). Main bundle: lessonCard.ts and work.ts use it, drillBrief.ts gets it via DrillDeps.
 * The brief is rebuilt on every rerender, so only data is cached here (per session); every host draws itself from it.
 */
/** A cached load: `p` settles once `value` or `error` is set. A failed cell is replaced by the next load() (a new host or a reopened table). */
interface Cell<T> { p: Promise<void>; value?: T; error?: unknown }
function load<T>(cache: Map<string, Cell<T>>, key: string, make: () => Promise<T>): Cell<T> {
  const hit = cache.get(key);
  if (hit && hit.error === undefined) return hit;
  const cell: Cell<T> = { p: Promise.resolve() };
  cell.p = make().then((v) => void (cell.value = v), (e: unknown) => void (cell.error = e ?? new Error()));
  cache.set(key, cell);
  return cell;
}
const metas = new Map<string, Cell<ErMetadata>>();
const expected = new Map<string, Cell<QueryResult>>();
const samples = new Map<string, Cell<QueryResult>>();
/** <details> the player opened, by schema|table: stays open across rerenders. */
const opened = new Set<string>();

const seeded = new Set<SchemaId>();
/** Runs on `schema`, seeding it first (`lab` is seeded lazily, L84); `onWait` is called only while that first seed runs. */
export async function runOn(schema: SchemaId, sql: string, onWait?: () => void): Promise<QueryResult> {
  // Always ensure (a no-op once seeded; after a restart DbClient re-seeds or forgets): the set only decides the wait line.
  if (!seeded.has(schema)) onWait?.();
  await app.ensure(schema);
  seeded.add(schema);
  return app.run(sql, { schema });
}

/** Tables the SQL reads (FROM/JOIN identifiers, in order of appearance) that exist in `known`. */
export function tablesIn(sql: string, known: Iterable<string>): string[] {
  const set = new Set(known);
  return [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => set.has(x));
}

/** Column headers by position ("Cột 1", "Column 1"): the Solution's own column names would give the answer away. */
const positional = (rows: unknown[][], width: number, types: number[] = []): QueryResult =>
  ({ columns: Array.from({ length: width }, (_, i) => t('preview.col', { n: i + 1 })), types, rows });

const subhead = (text: string): HTMLElement => h('h4', { class: 'mt-0 mb-1 text-sm' }, text);
const loading = (): HTMLElement => h('p', { class: 'my-1 flex items-center gap-2 text-sm text-muted' }, loader(), t('preview.loading'));

function tableBox(schema: SchemaId, table: string, meta: ErMetadata): HTMLElement {
  const key = `${schema}|${table}`;
  const body = h('div', { class: 'mt-1' });
  const cols = meta.cols.filter((c) => c.table === table);
  const fill = (): void => {
    const c = samples.get(key);
    body.replaceChildren(...nodes(
      h('p', { class: 'my-1 text-sm text-muted' }, t('preview.columns', { list: cols.map((x) => `${x.name} (${x.type})`).join(', ') })),
      !c || (c.value === undefined && c.error === undefined) ? loading() : c.value ? renderResult(c.value, undefined, 5, t('preview.sample', { table })) : errorView(c.error)));
  };
  const box = h('details', { class: 'rounded-lg bg-canvas px-2 py-1 ring-1 ring-line', open: opened.has(key) },
    h('summary', { class: 'cursor-pointer text-sm' }, h('code', {}, table), ` · ${t('preview.colCount', { n: cols.length })}`), body);
  const open = (): void => {
    const c = load(samples, key, () => runOn(schema, `SELECT * FROM "${table.replace(/"/g, '""')}" LIMIT 5`));
    fill();
    void c.p.then(() => body.isConnected && fill());
  };
  box.addEventListener('toggle', () => {
    if (box.open) {
      opened.add(key);
      open();
    } else opened.delete(key);
  });
  if (box.open) open();
  return box;
}

/** "Bảng dùng" (columns + 5 rows each, open/close) and "Kết quả mong đợi" (row count + 3 first rows, positional headers). */
export function tryPreview(solution: string, schema: SchemaId): HTMLElement {
  const host = h('section', { class: 'my-2 space-y-3', 'aria-label': t('preview.expected') });
  const key = `${schema}|${solution}`;
  // L131 #1 / v15 Q7: nothing is read (so `lab` is not seeded) until the box is on screen: the hidden workspace draws
  // ticket 1's quick lesson before the player picks anything. Already loaded (a redraw): drawn at once.
  if (expected.has(key) || typeof IntersectionObserver === 'undefined') fillPreview(host, solution, schema, key);
  else {
    host.replaceChildren(loading());
    const io = new IntersectionObserver((seen) => {
      if (!host.isConnected) return io.disconnect(); // a redraw replaced it
      if (!seen.some((x) => x.isIntersecting || x.boundingClientRect.height > 0)) return; // laid out = not inside a hidden view
      io.disconnect();
      fillPreview(host, solution, schema, key);
    });
    io.observe(host);
  }
  return host;
}

function fillPreview(host: HTMLElement, solution: string, schema: SchemaId, key: string): void {
  const meta = load(metas, schema, () => app.ensure(schema).then(() => erMeta(SCHEMAS[schema])));
  const exp = load(expected, key, () => expectedResult(solution, schema));
  const pending = <T>(c: Cell<T>): boolean => c.value === undefined && c.error === undefined;
  const draw = (): void => {
    const m = meta.value;
    const e = exp.value;
    const tables = m ? tablesIn(solution, new Set(m.cols.map((c) => c.table))) : [];
    host.replaceChildren(...nodes(
      h('div', {}, subhead(t('preview.tables')),
        pending(meta) ? loading() : m ? h('div', { class: 'space-y-1.5' }, ...tables.map((x) => tableBox(schema, x, m))) : errorView(meta.error)),
      h('div', {}, subhead(t('preview.expected')),
        h('p', { class: 'mt-0 mb-1 text-sm text-muted' }, t('preview.byPosition')),
        pending(exp) ? loading() : e ? renderResult(positional(e.rows, e.columns.length, e.types), undefined, 3) : errorView(exp.error))));
  };
  draw();
  for (const c of [meta.p, exp.p]) void c.then(() => host.isConnected && draw());
}

type Fail = Exclude<GradeResult, { ok: true }>;
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const list = (xs: number[]): string => xs.map((i) => i + 1).join(', ');

/** One sentence for a wrong practice answer (L84): which columns differ, or how many rows each side has. */
export function verdictText(r: Fail): string {
  if (r.reason === 'error') return r.message;
  if (r.reason === 'columns') return t('verdict.columns', { expected: r.expected, actual: r.actual });
  if (r.reason === 'order') return t('grade.order');
  if (!r.cols) return t('verdict.rows', { expected: r.expectedRows, actual: r.actualRows });
  const { mismatched, moved } = r.cols;
  if (mismatched.length === 0) return t('verdict.pairing');
  const parts: string[] = [];
  const told = new Set<number>();
  for (const { from, to } of moved) {
    if (told.has(from)) continue;
    if (moved.some((x) => x.from === to && x.to === from)) {
      parts.push(t('verdict.swap', { a: Math.min(from, to) + 1, b: Math.max(from, to) + 1 }));
      told.add(to);
    } else parts.push(t('verdict.moved', { from: from + 1, to: to + 1 }));
    told.add(from);
  }
  const wrong = mismatched.filter((i) => !told.has(i));
  if (wrong.length) parts.push(t('verdict.wrong', { list: list(wrong), n: wrong.length }));
  const width = r.extraRows[0]?.length ?? r.missingRows[0]?.length ?? 0;
  const right = Array.from({ length: width }, (_, i) => i).filter((i) => !mismatched.includes(i));
  if (right.length) parts.push(t('verdict.right', { list: list(right), n: right.length }));
  return `${capital(parts.join(', '))}.`;
}

/** diffView() draws something: rows extra or missing (not a column-count or order-only failure). G6 talks about these tables (v13). */
export const hasDiff = (r: Fail): r is Extract<Fail, { reason: 'rows' }> => r.reason === 'rows' && (r.extraRows.length > 0 || r.missingRows.length > 0);

/** Up to 3 of the player's rows not in the answer, then up to 3 answer rows missing; stacked, never paired by position. */
export function diffView(r: Fail): HTMLElement | null {
  if (!hasDiff(r)) return null;
  const block = (title: string, rows: unknown[][], n: number): HTMLElement | null =>
    rows.length ? h('div', {}, subhead(title), renderResult(positional(rows, rows[0].length), undefined, 3, t('diff.caption', { shown: rows.length, n }))) : null;
  return h('div', { class: 'mt-2 space-y-2' }, ...nodes(
    block(t('diff.extra'), r.extraRows, r.extra),
    block(t('diff.missing'), r.missingRows, r.missing)));
}
