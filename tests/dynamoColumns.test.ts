// @vitest-environment jsdom
// R2 E07 (L578d): DynamoDB result columns in a stable order with the keys first (the engine returns attributes in no
// fixed order: e-dy-l3-14 showed `port, SK, …` on one run and `weightKg, port, …` on the next, PK off screen), and a
// result that read more than it returned says so beside the numbers.
import { describe, expect, it } from 'vitest';
import { columnOrder } from '../src/engine/dynamo/runner';
import { metaView } from '../src/ui/engineResult';
import { h } from '../src/ui/dom';
import type { EngineDeps } from '../src/ui/engineView';

describe('columnOrder', () => {
  it('table keys, then index keys, then the rest by name, whatever order the items came in', () => {
    const keys = ['PK', 'SK', 'GSI1PK', 'SK', 'status', 'SK'];
    const a = columnOrder(['port', 'SK', 'weightKg', 'status', 'PK', 'GSI1PK'], keys);
    const b = columnOrder(['weightKg', 'port', 'GSI1PK', 'PK', 'status', 'SK'], keys);
    expect(a).toEqual(['PK', 'SK', 'GSI1PK', 'status', 'port', 'weightKg']);
    expect(b).toEqual(a);
  });
  it('a key the items lack is left out; no keys = by name', () => {
    expect(columnOrder(['b', 'PK', 'a'], ['PK', 'SK'])).toEqual(['PK', 'a', 'b']);
    expect(columnOrder(['b', 'a', 'b'], [])).toEqual(['a', 'b']);
  });
});

describe('metaView: read more than returned', () => {
  const d = { h, getLang: () => 'vi', locale: () => 'vi-VN' } as unknown as EngineDeps;
  const out = (scannedCount: number, count: number) => ({ columns: [], types: [], rows: [], meta: { scannedCount, count } });
  it('Scan + filter: the line names both numbers; a Query that reads what it returns has none', () => {
    const el = metaView(d, out(15, 4))!;
    expect(el.querySelector('[data-overread]')!.textContent).toContain('Đã quét 15 để trả về 4');
    expect(metaView(d, out(5, 5))!.querySelector('[data-overread]')).toBeNull();
  });
});
