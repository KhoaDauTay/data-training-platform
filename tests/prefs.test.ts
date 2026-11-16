import { describe, expect, it } from 'vitest';
import { COACH_KEY, coachDone } from '../src/ui/coach';
import { LAYOUT_KEY, parseLayout } from '../src/ui/splitter';

const store = (key: string, raw: string | null) => ({ getItem: (k: string) => (k === key ? raw : null), setItem: () => {} });

describe('splitter: kích thước đọc từ storage', () => {
  it('giá trị hợp lệ được giữ, ngoài giới hạn bị kẹp', () => {
    expect(parseLayout({ col: 50, row: 30 })).toEqual({ col: 50, row: 30 });
    expect(parseLayout({ col: 99, row: 1 })).toEqual({ col: 60, row: 20 });
  });

  it('không phải số hữu hạn → mặc định (không ra NaN%)', () => {
    expect(parseLayout({ col: 'x', row: null })).toEqual({ col: 40, row: 40 });
    expect(parseLayout({ col: '50', row: Infinity })).toEqual({ col: 40, row: 40 });
    expect(parseLayout(undefined)).toEqual({ col: 40, row: 40 });
    expect(parseLayout([1, 2])).toEqual({ col: 40, row: 40 });
    expect(parseLayout('oops')).toEqual({ col: 40, row: 40 });
  });

  it('LAYOUT_KEY không đổi', () => {
    expect(LAYOUT_KEY).toBe('cargo-query/layout');
  });
});

describe('coach-done đọc từ storage', () => {
  it('chỉ true mới là đã bỏ qua', () => {
    expect(coachDone(store(COACH_KEY, 'true'))).toBe(true);
    expect(coachDone(store(COACH_KEY, '"false"'))).toBe(false);
    expect(coachDone(store(COACH_KEY, '1'))).toBe(false);
    expect(coachDone(store(COACH_KEY, '{oops'))).toBe(false);
    expect(coachDone(store(COACH_KEY, null))).toBe(false);
    expect(coachDone(undefined)).toBe(false);
  });
});
