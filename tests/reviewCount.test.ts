// R21-U6 (review-v21): the top bar's "Ôn tập N" is General, so it never depends on which domain is open.
import { afterEach, describe, expect, it } from 'vitest';
import { loadDomain, loadTickets } from '../src/content';
import { reviewCount } from '../src/session';
import { emptySave } from '../src/save';
import { app } from '../src/state';

await loadDomain('finance');
afterEach(() => {
  app.tickets = [];
  app.save = emptySave();
});

describe('R21-U6: số "Ôn tập" giống nhau ở mọi lĩnh vực', () => {
  it('việc Logistics đã xong (chưa có thẻ) + một thẻ đến hạn: cùng số khi mở Logistics, Finance hay không gì', () => {
    const log = loadTickets('logistics');
    app.save = { ...emptySave(), completed: log.filter((t) => t.chapter === 1).map((t) => t.id), review: { join_inner: { box: 1, due: '2000-01-01' } } };
    const counts = [log, loadTickets('finance'), []].map((tickets) => {
      app.tickets = tickets;
      return reviewCount();
    });
    expect(counts[0]).toBeGreaterThan(1);
    expect(new Set(counts).size).toBe(1);
  });
});
