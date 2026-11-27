// TEMP (v48 BP-C): measure candidate pairs from a JSON file before writing cards. Deleted before commit.
import { it } from 'vitest';
import { parse as yaml } from 'yaml';
import { judge, promqlSideOf, redisSideOf, sideOf, sideScript, type Pair, type Side } from '../src/engine/best';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import { freshFor, runScript } from '../src/engine/redis/redisLab';
import { format } from '../src/engine/redis/interpreter';
import { esRunner } from '../src/engine/search/esLab';
import { SAMPLES_SQL } from '../src/engine/telemetry/promqlRunner';
import * as pq from '../src/engine/telemetry/promql';

const node = (globalThis as unknown as { process: { getBuiltinModule(id: string): unknown; env: Record<string, string> } }).process;
const { readFileSync, appendFileSync, writeFileSync } = node.getBuiltinModule('fs') as { readFileSync(p: string, e: string): string; appendFileSync(p: string, t: string): void; writeFileSync(p: string, t: string): void };

export async function sides(p: Pair): Promise<[Side, Side]> {
  const one = async (code: string): Promise<Side> => {
    if (p.runtime === 'redis') return redisSideOf(runScript(freshFor({ setup: p.setup, steps: [] }), code).at(-1), format);
    if (p.runtime === 'es') {
      try { const o = await esRunner({ lang: () => 'en' }).run({ setup: p.setup, steps: [] } as never, code.trim()); return { columns: o.columns, rows: o.rows }; } catch (e) { const x = e as { code?: string; message: string }; return { columns: [], rows: [], error: { code: x.code, message: x.message } }; }
    }
    if (p.runtime === 'promql') {
      const r = await runLabScript({ setup: p.setup, steps: [SAMPLES_SQL], timeoutMs: 20_000 });
      const err = r.setupError ?? r.steps[0]?.error;
      return err ? { columns: [], rows: [], error: err } : promqlSideOf(r.steps[0].rows, code, pq);
    }
    const r = await runLabScript(sideScript(p, code, splitSql));
    return sideOf(p, r);
  };
  return [await one(p.bad), await one(p.good)];
}

it('scratch', async () => {
  const txt = readFileSync(node.env.BP_PAIRS, 'utf8'); const list = (node.env.BP_PAIRS.endsWith('.yml') ? yaml(txt) : JSON.parse(txt)) as (Pair & { id: string })[];
  writeFileSync(node.env.BP_PAIRS + '.out', '');
  for (const p of list) {
    const t0 = performance.now();
    const [b, g] = await sides(p);
    const v = judge(p, b, g);
    appendFileSync(node.env.BP_PAIRS + '.out', `\n=== ${p.id} ${JSON.stringify(v)} ${Math.round(performance.now() - t0)}ms\n BAD ${JSON.stringify({ c: b.columns, r: b.rows.slice(0, 6), e: b.error, n: b.node, cost: b.cost })}\n GOOD ${JSON.stringify({ c: g.columns, r: g.rows.slice(0, 6), e: g.error, n: g.node, cost: g.cost })}`);
  }
}, 300_000);
