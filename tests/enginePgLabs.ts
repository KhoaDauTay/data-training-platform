// v23 QA (L277): every Postgres engine lab that has `setup` runs on the real lab runtime (src/engine/pglab, PGlite in Node),
// the way the page grades it. tests/engineContent.test.ts covers the labs without setup (on `lab`); tests/enginePredict.test.ts
// covers every predict `expect` and the capstone before/after plans. Each step boots ~3 fresh databases (the runner's check
// runs the Solution as both answer and player, then one script with the fact probe), ~680 boots in all, so the labs are cut
// into 15 files (tests/enginePgLabs.L<n><a|b|c>.test.ts: level, then every third lab) that Vitest runs in parallel.
import { describe, expect, it } from 'vitest';
import { parseEngineLesson, type EngineLesson, type LessonSource } from '../src/engine/content';
import { gradable } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript } from '../src/engine/pglab/session';
import { compareResults, grade } from '../src/grader';

const files = import.meta.glob<LessonSource>('../content/engine/postgres/L*/*.md', { query: '?fm', import: 'default', eager: true });
const lessons: EngineLesson[] = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p)).sort((a, b) => a.id.localeCompare(b.id));
const env = { grade, verdict: (r: unknown) => JSON.stringify(r).slice(0, 400) };
const runner = pgScriptRunner(env, { run: runLabScript, reset: () => undefined });

/** Steps left out on purpose, each with its reason. Empty: every gradable step of every setup lab is checked. */
const SKIP: Record<string, string> = {};
const SHARDS = 3;

export function pgLabSuite(level: string, shard: number, of = SHARDS): void {
  const labs = lessons.filter((l) => l.level === level && l.lab?.setup).filter((_, i) => i % of === shard);
  describe(`Postgres ${level} labs with setup on the lab runtime (${shard + 1}/${of})`, () => {
    it('there are some', () => expect(labs.length).toBeGreaterThan(0));
    it.each(labs.map((l) => [l.id, l] as const))('%s: setup runs', async (_, l) => {
      await expect(runner.prepare(l.lab!)).resolves.toBeUndefined();
    });
    const steps = labs.flatMap((l) => l.lab!.steps.map((s, i) => [`${l.id} bước ${i + 1} (${s.check})`, l, i] as const));
    it.each(steps)('%s: Solution qua check của chính nó; fact.probe = fact.expect', async (name, l, i) => {
      const lab = l.lab!;
      const s = lab.steps[i];
      if (SKIP[name]) return;
      if (gradable(l, s)) expect(await runner.check(lab, s, s.solution)).toMatchObject({ ok: true });
      // the Solution runs after setup and the earlier steps that change something (the runtime's replay), with rows for `rows`
      const replay = replayOf(lab, i);
      const probe = s.fact?.probe;
      const r = await runLabScript({ setup: lab.setup, extensions: extensionsOf(lab.setup, ...lab.steps.map((x) => x.solution), probe), steps: [...replay, s.solution, ...(probe ? [probe] : [])] });
      expect(r.setupError).toBeUndefined();
      expect(r.steps.filter((x) => x.status !== 'ok').map((x) => [x.sql.slice(0, 80), x.error?.code, x.error?.message])).toEqual([]);
      if (s.check === 'rows') expect(r.steps[replay.length].rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      if (s.fact?.expect) {
        expect(probe, 'fact.expect cần probe').toBeDefined();
        const got = r.steps[r.steps.length - 1];
        const want = { columns: got.columns, types: [], rows: s.fact.expect };
        expect(compareResults(want, got, true).ok, `probe ${probe}\nmuốn ${JSON.stringify(s.fact.expect)}\nđược ${JSON.stringify(got.rows)}`).toBe(true);
      }
    }, 120_000);
  });
}
