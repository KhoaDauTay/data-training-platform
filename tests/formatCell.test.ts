import { describe, expect, it } from 'vitest';
import { formatCell } from '../src/ui/resultTable';

describe('formatCell', () => {
  it('shows timestamps in UTC (the PGlite session zone), never the machine zone', () => {
    expect(formatCell(new Date('2026-07-01T00:00:00Z'), 1184)).toBe('2026-07-01 00:00:00');
    expect(formatCell(new Date(2026, 6, 1, 13, 45, 9, 250), 1114)).toBe('2026-07-01 13:45:09.25'); // v45 S-00: PGlite builds a timestamp from the local wall clock
    expect(formatCell(new Date('2026-07-01T00:00:00Z'), 1082)).toBe('2026-07-01');
    expect(formatCell(new Date('2026-07-01T00:00:00Z'))).toBe('2026-07-01');
  });
});
