import { describe, expect, it } from 'vitest';
import src from '../src/main.ts?raw';

// main.ts is a top-level-await module that needs a browser, so this checks its source order instead:
// the DB worker (PGlite download + seed) must start before the ticket chunk is awaited, so both load in parallel.
describe('khởi động', () => {
  it('DbClient được tạo trước await loadContent() (Plan 5: cùng lúc với từ điển EN)', () => {
    const db = src.indexOf('new DbClient(');
    const content = src.indexOf('await Promise.all([loadContent(), loadLang()])');
    expect(db).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(db);
  });
});
