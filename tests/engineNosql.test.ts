// @vitest-environment jsdom
// v25 (L370–L375): the MongoDB lab extras drawn by the lazy engineNosql chunk (rule bar, "mong lỗi", "Pipeline từng bước",
// "So với SQL") and the predict chunk's `recorded` block, on a minimal EngineDeps (main's own h/icon).
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { h } from '../src/ui/dom';
import { icon } from '../src/ui/icons';
import { parseEngineLesson, type LabStep } from '../src/engine/content';
import type { LabOutput } from '../src/engine/labs';
import { pgBar, type EngineDeps } from '../src/ui/engineView';
import { capChecks, type CapCtx } from '../src/ui/engineCapstone';
import { stepEnd, stepTop, tablesPanel } from '../src/ui/engineNosql';
import { recordedView, withPred } from '../src/ui/enginePredict';
import { costPanel } from '../src/ui/engineDynamo';

const d = {
  h, icon, getLang: () => 'en', locale: () => 'en-US',
  cls: { CARD: 'card', BTN_GO: 'go', BTN_SECONDARY: 'sec', BTN_GHOST: 'ghost', PILL: 'pill', DONE_PILL: 'done', cx: (...c: unknown[]) => c.filter(Boolean).join(' ') },
} as unknown as EngineDeps;
const et = withPred(d, (k) => k);
const step = (x: Partial<LabStep>): LabStep => ({ task: { vi: 'a', en: 'a' }, solution: 'db.o.find()', check: 'doc', ordered: false, hint: { vi: 'h', en: 'h' }, ...x });
const run = (pipeline: { stage: string; n: number }[]): LabOutput => ({ columns: [], types: [], rows: [], meta: { pipeline: pipeline.map((p) => ({ ...p, head: [{ a: 1 }] })) } });
const files = import.meta.glob<string>('../content/engine/mongodb/L*/*.md', { query: '?raw', import: 'default', eager: true });
const lesson = (id: string) => Object.entries(files).map(([p, s]) => parseEngineLesson(s, p, parse)).find((l) => l.id === id)!;

describe('engineDynamo: Partition / Chi phí (v26 L380)', () => {
  const dy = (m: NonNullable<LabOutput['meta']>['dynamo'], rows: unknown[][] = [], count = rows.length): LabOutput =>
    ({ columns: ['pk', 'sk'], types: [], rows, meta: { count, dynamo: m } });
  it('measured capacity and its split, the rule recomputed from whole items, a tag on every tier', () => {
    const el = costPanel(d, dy({ op: 'Query', mode: 'eventual', write: false, bytes: [100, 200], pk: 'pk', scanned: 2,
      capacity: { total: 0.5, table: 0, indexes: { byStatus: 0.5 } } }, [['A', '1'], ['A', '2']]), 'k')!;
    expect([...el.querySelectorAll('[data-tier]')].map((x) => x.getAttribute('data-tier'))).toEqual(['tag.measured', 'tag.rule', 'tag.illus']);
    expect(el.querySelector('[data-dy-measured]')!.textContent).toContain('Consumed capacity: 0.5 read units (RCU)');
    expect(el.querySelector('[data-dy-measured]')!.textContent).toContain('index byStatus 0.5');
    expect(el.querySelector('[data-dy-rule]')!.textContent).toContain('2 items, 300 bytes in all → 0.5 RCU. Measured: 0.5.');
    expect(el.querySelector('[data-dy-page]')!.getAttribute('data-dy-page')).toBe('last');
    expect(el.querySelector('[data-dy-illus] li')!.textContent).toContain('2 items');
    expect(el.querySelector('[data-dy-gap]')!.textContent).toContain('Throttling');
  });
  it('a filter hides what was read: no recomputed number; LastEvaluatedKey shown as the next ExclusiveStartKey', () => {
    const el = costPanel(d, dy({ op: 'Scan', mode: 'strong', write: false, bytes: [50], scanned: 6, lastKey: { pk: 'B', sk: '9' }, capacity: { total: 1 } }, [['B', '9']]), 'k')!;
    expect(el.querySelector('[data-dy-rule]')!.textContent).toContain('the charge is for the 6 items read, not the 1 items returned');
    expect(el.querySelector('[data-dy-page]')!.getAttribute('data-dy-page')).toBe('more');
    expect(el.querySelector('[data-dy-page] pre')!.textContent).toBe('{"ExclusiveStartKey":{"pk":"B","sk":"9"}}');
  });
  it('no ConsumedCapacity: says so, never a number; a write shows the write rule', () => {
    const el = costPanel(d, dy({ op: 'CreateTable', mode: 'eventual', write: true, bytes: [] }), 'k')!;
    expect(el.querySelector('[data-dy-measured]')!.textContent).toContain('no measured number');
    expect(el.querySelector('[data-dy-rule]')!.textContent).toContain('rounded up to 1 KB');
  });
  it('the cost bar and a DynamoDB "mong lỗi" above the editor', () => {
    expect(stepTop(d, step({ perf: { table: 'Orders' }, slow: 'x' }))!.getAttribute('data-rule')).toBe('cost');
    expect(stepTop(d, step({ error: 'TransactionCanceledException' }))!.textContent).toContain('DynamoDB refuses');
  });
});

// R2 E03 (L578b): a Postgres/design capstone's cost bar speaks of the plan cost, never ScannedCount, and "Chấm bằng" lists it.
describe('thanh chi phí theo engine (e-ds-l5-11)', () => {
  const dsFiles = import.meta.glob<string>('../content/engine/design/L5/11-*.md', { query: '?raw', import: 'default', eager: true });
  const ds = Object.entries(dsFiles).map(([p, s]) => parseEngineLesson(s, p, parse))[0];
  const bar = ds.lab!.steps.findIndex((s) => s.perf);
  it('pgBar: plan-cost words with the table, no DynamoDB words; nothing without perf', () => {
    expect(bar).toBe(5);
    const el = pgBar(d, ds.lab!.steps[bar])!;
    expect(el.getAttribute('data-rule')).toBe('cost');
    expect(el.textContent).toContain('EXPLAIN');
    expect(el.querySelectorAll('code')[1]?.textContent).toBe('orders');
    expect(el.textContent).not.toMatch(/ScannedCount|ConsumedCapacity|Scan \+/);
    expect(pgBar(d, ds.lab!.steps[0])).toBeNull();
  });
  it('capChecks: the bar is in the step 6 line, Postgres wording; a NoSQL step gets the NoSQL wording', () => {
    const ctx = (l: typeof ds) => ({ d, et, inline: (t: string) => [t], lang: 'en', l, passed: new Set<string>(), graded: () => true } as unknown as CapCtx);
    const line = (l: typeof ds, i: number) => capChecks(ctx(l)).querySelector(`[data-check="${i}"]`)!.textContent!;
    expect(line(ds, bar)).toContain('cost bar: `orders` is read through an index');
    expect(line(ds, 0)).not.toContain('cost bar');
    const dy = { ...ds, engine: 'dynamodb' as const };
    expect(line(dy, bar)).toContain('cost bar: it reads no more than the answer');
  });
});

describe('engineNosql', () => {
  it('pipeline by stage: counts, $match after $group reads as HAVING, traps for the stages present', () => {
    const el = stepEnd(d, step({}), run([{ stage: '$match', n: 7 }, { stage: '$group', n: 3 }, { stage: '$match', n: 2 }]), false, 'k')!;
    const rows = [...el.querySelectorAll('[data-pipeline] tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
    expect(rows).toEqual([['1', '$match', 'WHERE', '7'], ['2', '$group', 'GROUP BY', '3'], ['3', '$match', 'HAVING', '2']]);
    expect(el.querySelectorAll('[data-compare] li')).toHaveLength(2); // $match, $group
  });
  it('`sql:` stays hidden until the step passes; nothing without a pipeline or sql', () => {
    const s = step({ sql: 'SELECT 1;' });
    expect(stepEnd(d, s, run([]), false, 'k')!.querySelector('[data-sql-compare]')).toBeNull();
    expect(stepEnd(d, s, run([]), true, 'k')!.querySelector('[data-sql-compare]')?.textContent).toBe('SELECT 1;');
    expect(stepEnd(d, step({}), { columns: [], types: [], rows: [] }, true, 'k')).toBeNull();
  });
  it('rule bar and "mong lỗi" notes above the editor', () => {
    expect(stepTop(d, step({}))).toBeNull();
    expect(stepTop(d, step({ rule: 'covered', index: '{ a: 1 }' }))!.textContent).toContain('not measured on a real MongoDB');
    expect(stepTop(d, step({ error: 'duplicate_key' }))!.querySelector('code')?.textContent).toBe('duplicate_key');
  });
  it('tables used: the collections of inline lab data', () => {
    const el = tablesPanel(d, lesson('e-mg-l3-18'))!;
    expect([...el.querySelectorAll('summary code')].map((c) => c.textContent)).toEqual(['orders', 'stores']);
  });
  it('recorded: figures only where the docs print them, else the no-figures line; a source link', () => {
    const six = recordedView(lesson('e-mg-l3-06'), d, et)!;
    expect(six.querySelector('[data-recorded-output]')?.textContent).toContain('totalDocsExamined: 21349');
    expect(six.querySelector('a')?.getAttribute('href')).toBe('https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/');
    const eight = recordedView(lesson('e-mg-l3-08'), d, et)!;
    expect(eight.querySelector('[data-recorded-output]')).toBeNull();
    expect(eight.textContent).toContain('prints no explain figures');
    expect(recordedView(lesson('e-mg-l1-08'), d, et)).toBeNull();
  });
});
