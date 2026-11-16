import { describe, expect, it } from 'vitest';
import { compareShape, shapeOf, type Shape } from '../src/shape';
import { runner } from './helpers';

describe('shape card', () => {
  it('loại cột lấy từ OID thật: int và numeric đều là số; không giữ tên cột', async () => {
    const run = await runner();
    const r = await run("SELECT code, count(*), round(avg(length(name)), 2), DATE '2026-10-31', true FROM ports GROUP BY code LIMIT 3");
    const s = shapeOf(r);
    expect(s).toEqual({ kinds: ['text', 'number', 'number', 'date', 'bool'], rows: 3 });
    expect(JSON.stringify(s)).not.toContain('count');
  });

  it('so hình dạng kết quả của người chơi với kết quả mong đợi', () => {
    const exp: Shape = { kinds: ['text', 'number'], rows: 4 };
    expect(compareShape(exp, { kinds: ['text', 'number'], rows: 4 })).toEqual({ columns: true, kinds: true, rows: true });
    expect(compareShape(exp, { kinds: ['text', 'text'], rows: 3 })).toEqual({ columns: true, kinds: false, rows: false });
    expect(compareShape(exp, { kinds: ['text'], rows: 4 })).toEqual({ columns: false, kinds: false, rows: true });
  });
});
