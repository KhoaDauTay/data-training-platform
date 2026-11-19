import { describe, expect, it } from 'vitest';
import type { Ticket } from '../src/tickets';
import { navTargets } from '../src/viz/progressDots';

describe('thanh điều hướng việc', () => {
  // Only id, chapter and beat matter here; ch2-03 is chapter 2's promotion review.
  const tickets = ['ch1-01', 'ch1-02', 'ch2-01', 'ch2-02', 'ch2-03']
    .map((id) => ({ id, chapter: Number(id[2]), beat: id === 'ch2-03' ? 'boss' : 'teach' }) as unknown as Ticket);
  it('L145: đánh giá chương 2 làm sớm: ‹ › đi qua việc tùy chọn, resume không trỏ việc tùy chọn', () => {
    const done = new Set(['ch1-01', 'ch1-02', 'ch2-03']);
    expect(navTargets(tickets, done, 'ch2-03')).toEqual({ prev: 'ch2-02', next: undefined, resume: undefined });
    expect(navTargets(tickets, done, 'ch2-01')).toEqual({ prev: 'ch1-02', next: 'ch2-02', resume: undefined });
  });
  it('‹ › đi qua ranh giới chương, việc chưa mở không phải đích', () => {
    const done = new Set(['ch1-01', 'ch1-02']);
    expect(navTargets(tickets, done, 'ch1-02')).toEqual({ prev: 'ch1-01', next: 'ch2-01', resume: 'ch2-01' });
    expect(navTargets(tickets, done, 'ch2-01')).toEqual({ prev: 'ch1-02', next: undefined, resume: undefined });
  });
  it('đang xem lại việc cũ: resume trỏ việc đầu tiên chưa xong', () => {
    expect(navTargets(tickets, new Set(['ch1-01', 'ch1-02', 'ch2-01']), 'ch1-01')).toEqual({ prev: undefined, next: 'ch1-02', resume: 'ch2-02' });
  });
  it('xong hết: không resume', () => {
    expect(navTargets(tickets, new Set(tickets.map((x) => x.id)), 'ch2-03')).toEqual({ prev: 'ch2-02', next: undefined, resume: undefined });
  });
});
