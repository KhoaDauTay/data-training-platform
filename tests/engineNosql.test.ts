// @vitest-environment jsdom
// v25 (L370–L375): the MongoDB lab extras drawn by the lazy engineNosql chunk (rule bar, "mong lỗi", "Pipeline từng bước",
// "So với SQL") and the predict chunk's `recorded` block, on a minimal EngineDeps (main's own h/icon).
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { h } from '../src/ui/dom';
import { icon } from '../src/ui/icons';
import { parseEngineLesson, type LabStep } from '../src/engine/content';
import type { LabOutput } from '../src/engine/labs';
import type { EngineDeps } from '../src/ui/engineView';
import { stepEnd, stepTop, tablesPanel } from '../src/ui/engineNosql';
import { recordedView, withPred } from '../src/ui/enginePredict';

const d = {
  h, icon, getLang: () => 'en', locale: () => 'en-US',
  cls: { CARD: 'card', BTN_GO: 'go', BTN_SECONDARY: 'sec', BTN_GHOST: 'ghost', PILL: 'pill', DONE_PILL: 'done', cx: (...c: unknown[]) => c.filter(Boolean).join(' ') },
} as unknown as EngineDeps;
const et = withPred(d, (k) => k);
const step = (x: Partial<LabStep>): LabStep => ({ task: { vi: 'a', en: 'a' }, solution: 'db.o.find()', check: 'doc', ordered: false, hint: { vi: 'h', en: 'h' }, ...x });
const run = (pipeline: { stage: string; n: number }[]): LabOutput => ({ columns: [], types: [], rows: [], meta: { pipeline: pipeline.map((p) => ({ ...p, head: [{ a: 1 }] })) } });
const files = import.meta.glob<string>('../content/engine/mongodb/L*/*.md', { query: '?raw', import: 'default', eager: true });
const lesson = (id: string) => Object.entries(files).map(([p, s]) => parseEngineLesson(s, p, parse)).find((l) => l.id === id)!;

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
