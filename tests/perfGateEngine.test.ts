// v24 R0 (L341, schema-perf-v24.md §4.2): the perf gate for Postgres Engine labs with `setup`. One fresh lab database per
// lesson: setup, then each step in order (a write runs, as the runtime's replay would before the next step; a read is
// EXPLAINed with the table facts of that moment). Engine budget = GATE.engineMax (no norm: catalog and function scans make it
// meaningless), plus the sargability rule. Then every `perf:` bar: Solution passes, `slow:` (same rows) is refused.
import { describe, expect, it } from 'vitest';
import { parseEngineLesson, type EngineLesson, type LessonSource } from '../src/engine/content';
import { perfVerdict } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner } from '../src/engine/pglab/runner';
import { runLabScript } from '../src/engine/pglab/session';
import { grade } from '../src/grader';
import { GATE, nonSargable, planLine, planNodes, slowVerdict } from '../src/planCheck';
import { factsOf, factsSql, readOf } from './perfFacts';

/** Engine steps over budget on purpose (`<lesson id>.s<n>`), each with its reason. Stale entries fail. */
const ALLOW: Record<string, string> = {};

const files = import.meta.glob<LessonSource>('../content/engine/postgres/L*/*.md', { query: '?fm', import: 'default', eager: true });
const lessons: EngineLesson[] = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p)).filter((l) => l.lab?.setup).sort((a, b) => a.id.localeCompare(b.id));
const [FA, FB] = factsSql(`n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%'`);

describe('perf gate: Engine labs có setup', () => {
  const failing = new Set<string>();
  let planned = 0;
  it.each(lessons.map((l) => [l.id, l] as const))('%s', async (_, l) => {
    const lab = l.lab!;
    const steps: string[] = [];
    const reads: [string, number][] = []; // step name, index of its EXPLAIN in `steps`
    lab.steps.forEach((s, i) => {
      const read = readOf(s.solution);
      if (!read) return void steps.push(s.solution);
      steps.push(FA, FB, `EXPLAIN (FORMAT JSON) ${read}`);
      reads.push([`${l.id}.s${i + 1}`, steps.length - 1]);
    });
    const r = await runLabScript({ setup: lab.setup, extensions: extensionsOf(lab.setup, ...lab.steps.map((s) => s.solution)), steps });
    expect(r.setupError).toBeUndefined();
    const fails: string[] = [];
    planned += reads.length;
    for (const [name, at] of reads) {
      const out = r.steps[at];
      expect(out.status, `${name}: ${out.error?.message}`).toBe('ok');
      const json = out.rows[0][0];
      const cost = planNodes(json)[0]?.['Total Cost'] ?? 0;
      const bad = nonSargable(json, factsOf(r.steps[at - 2].rows, r.steps[at - 1].rows));
      if (cost <= GATE.engineMax && !bad) continue;
      failing.add(name);
      if (!ALLOW[name]) fails.push(`${name}: cost ${Math.round(cost)}${bad ? ` non-sargable Seq Scan ${bad}` : ''} · ${planLine(json)}`);
    }
    expect(fails, 'over budget: fix the Solution, or add it to ALLOW with a reason').toEqual([]);
  }, 120_000);
  it('ALLOW không cũ; đủ bước đọc', () => {
    expect(Object.keys(ALLOW).filter((k) => !failing.has(k))).toEqual([]);
    expect(planned).toBeGreaterThan(140);
  });
});

describe('perf gate: thanh perf: của bài Engine có setup', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300), slow: slowVerdict }, { run: runLabScript, reset: () => undefined });
  const bars = lessons.flatMap((l) => l.lab!.steps.map((s, i) => [`${l.id}.s${i + 1}`, l, i] as const).filter(([, , i]) => l.lab!.steps[i].perf));

  it('R0: có ít nhất một bước Engine có thanh', () => expect(bars.length).toBeGreaterThan(0));

  it.each(bars)('%s: lời giải qua, slow: trượt vì chậm', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(s.check).toBe('rows');
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, s.slow!)).toMatchObject({ ok: false, reason: 'wrong', why: expect.stringMatching(/^slow/) });
    // without the bar the slow answer is right (same rows): the refusal is the bar, not the grader
    const plain = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
    expect(await plain.check(l.lab!, s, s.slow!)).toMatchObject({ ok: true });
    expect(await perfVerdict({}, s, async () => [0, 0])).toBeUndefined(); // no slowVerdict passed (tests, old env): no bar
  }, 120_000);
});
