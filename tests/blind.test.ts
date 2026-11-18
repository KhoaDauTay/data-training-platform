// @ts-nocheck -- dev tool run by hand under Node (tsconfig has no Node types)
// Blind-solve tool (L84): not a regular test. Skipped unless BLIND_MODE is set.
//   BLIND_MODE=packet BLIND_FILE=<out.json>  npx vitest run tests/blind.test.ts   -> what the learner sees, per item
//   BLIND_MODE=grade  BLIND_FILE=<answers.json> BLIND_OUT=<out.json> npx vitest run tests/blind.test.ts
// answers.json = { "<id>": "<sql>" }; ids: drill ids (g-…) and lesson ids prefixed "lesson:".
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { generalNow, loadLessons } from '../src/content';
import { compareResults } from '../src/grader';
import { labRun } from './generalRules';

const MODE = process.env.BLIND_MODE;
const tablesIn = (sql: string): string[] => [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))];

interface Item { id: string; task: { vi: string; en: string }; starter?: string; ordered: boolean; solution: string }

function items(): Item[] {
  const g = generalNow()!;
  const drills = g.drills.concat(g.nodes.flatMap((n) => n.drills)).filter((d, i, a) => a.findIndex((x) => x.id === d.id) === i);
  const out: Item[] = drills.map((d) => ({ id: d.id, task: d.task, starter: d.starter, ordered: !!d.ordered, solution: d.solution }));
  for (const [id, l] of loadLessons()) if (!l.node) out.push({ id: `lesson:${id}`, task: l.try.task, ordered: l.try.ordered, solution: l.try.solution });
  return out;
}

describe.skipIf(!MODE)('blind solve', () => {
  it(MODE ?? 'off', async () => {
    const run = await labRun();
    const labTables = new Set((await run("SELECT table_name FROM information_schema.tables WHERE table_schema = 'lab'")).rows.map((r) => String(r[0])));
    if (MODE === 'packet') {
      const sample = new Map<string, unknown>();
      const packet = [];
      for (const it of items()) {
        const tables = tablesIn(it.solution).filter((t) => labTables.has(t));
        for (const t of tables) if (!sample.has(t)) {
          const r = await run(`SELECT * FROM ${t} LIMIT 5`);
          sample.set(t, { columns: r.columns, rows: r.rows });
        }
        let expected: unknown;
        try {
          const r = await run(it.solution);
          expected = { rows: r.rows.length, first3: r.rows.slice(0, 3) };
        } catch (e) { expected = { error: String(e) }; }
        packet.push({ id: it.id, task: it.task.vi, task_en: it.task.en, starter: it.starter, ordered: it.ordered, tables, expected });
      }
      writeFileSync(process.env.BLIND_FILE!, JSON.stringify({ tables: Object.fromEntries(sample), items: packet }, (_k, v) => (typeof v === 'bigint' ? Number(v) : v), 1));
    } else {
      const answers = JSON.parse(readFileSync(process.env.BLIND_FILE!, 'utf8')) as Record<string, string>;
      const byId = new Map(items().map((x) => [x.id, x]));
      const out: Record<string, string> = {};
      for (const [id, sql] of Object.entries(answers)) {
        const it = byId.get(id);
        if (!it) { out[id] = 'unknown id'; continue; }
        try {
          const r = compareResults(await run(it.solution), await run(sql), it.ordered);
          out[id] = r.ok ? 'ok' : JSON.stringify(r, (_k, v) => (typeof v === 'bigint' ? Number(v) : v));
        } catch (e) { out[id] = `error: ${String(e)}`; }
      }
      writeFileSync(process.env.BLIND_OUT!, JSON.stringify(out, null, 1));
    }
  }, 120_000);
});
