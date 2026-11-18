// Runs every draft Solution (all variants, all steps) and every wrong answer on a fresh finance seed.
// node runall.mjs [-v] [fin-chN-0M]
import { finDb } from './db.mjs';
import { TICKETS, apply } from './tickets.mjs';
const { db } = await finDb();
const norm = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) ? (Math.round(Number(v) * 100) / 100).toFixed(2) : v === null ? 'NULL' : String(v);
const run = async (sql) => (await db.query(sql, [], { rowMode: 'array' })).rows.map((r) => r.map(norm).join('|'));
const key = (rows, ordered) => JSON.stringify(ordered ? rows : [...rows].sort());
const verbose = process.argv.includes('-v'); const only = process.argv.find((a) => a.startsWith('fin-'));
const problems = [];
for (const t of TICKETS) {
  if (only && t.id !== only) continue;
  for (let si = 0; si < t.steps.length; si++) {
    const keys = [];
    for (let vi = 0; vi < t.variants.length; vi++) {
      const v = t.variants[vi]; const sql = apply(t.steps[si], v);
      let rows; try { rows = await run(sql); } catch (e) { problems.push(`${t.id}.${si + 1} v${vi} ERROR ${e.message}`); continue; }
      if (!rows.length) problems.push(`${t.id}.${si + 1} v${vi} 0 rows`);
      keys.push(key(rows, t.ordered));
      console.log(`${t.id}.${si + 1} v${vi}: ${rows.length} rows` + (verbose || rows.length <= 4 ? '  ' + rows.slice(0, verbose ? 40 : 4).join('  ;  ') : ''));
      for (const w of t.wrong ?? []) {
        let wr; try { wr = await run(apply(w, v)); } catch (e) { problems.push(`${t.id} v${vi} wrong ERROR ${e.message}`); continue; }
        if (key(wr, t.ordered) === key(rows, t.ordered)) problems.push(`${t.id} v${vi} wrong == solution`);
      }
    }
    if (new Set(keys).size !== keys.length) problems.push(`${t.id}.${si + 1} variants not pairwise different`);
  }
}
console.log('\nPROBLEMS:\n' + (problems.join('\n') || 'none'));
