import { it } from 'vitest';
import { runLabScript, splitSql } from '../src/engine/pglab/session';

const fs = (globalThis as unknown as { process: { getBuiltinModule(id: string): { readFileSync(p: string, e: string): string; writeFileSync(p: string, s: string): void } } }).process;
const SP = 'C:/Users/KHOA~1.HUY/AppData/Local/Temp/claude/be8c95d1f89f2452/e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc/scratchpad/';
it('probe', async () => {
  const f = fs.getBuiltinModule('fs');
  const setup = f.readFileSync(SP + 'setup.sql', 'utf8');
  const q = f.readFileSync(SP + 'q.sql', 'utf8');
  const r = await runLabScript({ setup, steps: splitSql(q).map((sql) => ({ sql, expectError: undefined })) as never });
  const out = [r.setupError ? 'SETUP ' + JSON.stringify(r.setupError) : ''];
  for (const s of r.steps) out.push('> ' + s.sql.slice(0, 80).replace(/\n/g, ' '), s.error ? 'ERR ' + s.error.code + ' ' + s.error.message : [s.columns.join(' | '), ...s.rows.map((x) => x.map((v) => (v instanceof Date ? v.toISOString() : String(v))).join(' | '))].join('\n'));
  f.writeFileSync(SP + 'out.txt', out.join('\n'));
}, 120_000);