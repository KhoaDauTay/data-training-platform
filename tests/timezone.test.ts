// v45 S-00 (stack-eye): result cells print as Postgres prints them, whatever the viewer's time zone. PGlite parses `timestamp`
// as local wall-clock time, so a UTC-based formatter showed 22:00 as 15:00 in Vietnam. This file runs in Asia/Ho_Chi_Minh.
process.env.TZ = 'Asia/Ho_Chi_Minh';
import { describe, expect, it } from 'vitest';
import { runLabScript } from '../src/engine/pglab/session';
import { grade } from '../src/grader';
import { formatCell } from '../src/ui/resultTable';

const SQL = `SELECT timestamp '2026-10-30 22:00' AS ts, timestamp '2026-03-01' AS midnight,
  timestamp '2026-08-31 23:59:59.999' AS frac, date '2026-03-01' AS d,
  timestamptz '2026-10-30 22:00+00' AS tz, (timestamp '2026-10-30 22:00')::text AS as_text`;

describe('time zone (TZ=Asia/Ho_Chi_Minh): cells equal Postgres text', () => {
  it('the process really runs at UTC+7', () => expect(new Date('2026-01-01T00:00:00Z').getTimezoneOffset()).toBe(-420));

  it('timestamp, date and timestamptz print without a local shift', async () => {
    const r = await runLabScript({ steps: [SQL] });
    const s = r.steps[0];
    expect(s.error).toBeUndefined();
    const cells = s.rows[0].map((v, i) => formatCell(v, s.types[i]));
    expect(cells).toEqual(['2026-10-30 22:00:00', '2026-03-01 00:00:00', '2026-08-31 23:59:59.999', '2026-03-01', '2026-10-30 22:00:00', '2026-10-30 22:00:00']);
    expect(cells[0]).toBe(cells[5]); // the cell equals Postgres' own ::text
    expect(formatCell(s.rows[0][0])).toBe('2026-10-30 22:00:00'); // no type (grader samples): the wall clock
  }, 60_000);

  it('grading is unaffected: the same timestamp query passes, a shifted one does not', async () => {
    const run = async (sql: string) => {
      const r = await runLabScript({ steps: [sql] });
      const s = r.steps[0];
      return { columns: s.columns, types: s.types, rows: s.rows, ms: s.ms };
    };
    const want = "SELECT timestamp '2026-10-30 22:00' AS t";
    expect(await grade(run, want, want, false)).toMatchObject({ ok: true });
    expect(await grade(run, want, "SELECT timestamp '2026-10-30 15:00' AS t", false)).toMatchObject({ ok: false });
  }, 60_000);
});
