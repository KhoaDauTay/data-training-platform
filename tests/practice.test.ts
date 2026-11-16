import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import {
  addDays, applyResult, cardOf, dueSkills, INTERVALS, isSuccess, localDay, nextCard,
  pickForSkill, QUEUE_MAX, retryItem, seedReview, todayQueue, variantFor,
} from '../src/practice';
import type { Beat, Ticket } from '../src/tickets';

const T = '2026-11-16';
const base = loadTickets()[0];
const mk = (id: string, beat: Beat, extra: Partial<Ticket> = {}): Ticket => ({
  ...base, id, chapter: Number(id[2]), beat, requires: [], grants: [], variants: [], ...extra,
});

describe('ngày', () => {
  it('localDay theo giờ máy, không theo UTC', () => {
    expect(localDay(new Date(2026, 10, 16, 0, 30))).toBe('2026-11-16');
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('addDays qua tháng, năm, năm nhuận', () => {
    expect(addDays('2026-11-16', 1)).toBe('2026-11-17');
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('Leitner', () => {
  it('khoảng cách 5 hộp', () => {
    expect(INTERVALS).toEqual([1, 2, 4, 8, 16]);
  });

  it('đạt: lên 1 hộp, hẹn theo hộp mới; hộp 5 giữ nguyên', () => {
    expect(nextCard(undefined, true, T)).toEqual({ box: 2, due: '2026-11-18' });
    expect(nextCard({ box: 2, due: T }, true, T)).toEqual({ box: 3, due: '2026-11-20' });
    expect(nextCard({ box: 4, due: T }, true, T)).toEqual({ box: 5, due: '2026-12-02' });
    expect(nextCard({ box: 5, due: T }, true, T)).toEqual({ box: 5, due: '2026-12-02' });
  });

  it('chưa đạt: về hộp 1, ôn lại ngày mai', () => {
    expect(nextCard({ box: 4, due: T }, false, T)).toEqual({ box: 1, due: '2026-11-17' });
  });

  it('đạt = 0 lần sai và ≤ 1 gợi ý', () => {
    expect(isSuccess(0, 0)).toBe(true);
    expect(isSuccess(0, 1)).toBe(true);
    expect(isSuccess(0, 2)).toBe(false);
    expect(isSuccess(1, 0)).toBe(false);
  });

  it('seedReview: kỹ năng mới học hẹn ngày mai, không đè thẻ cũ, không đổi input', () => {
    const before = { select: { box: 3, due: '2026-11-20' } };
    expect(seedReview(before, ['select', 'where'], T)).toEqual({
      select: { box: 3, due: '2026-11-20' },
      where: { box: 1, due: '2026-11-17' },
    });
    expect(before).toEqual({ select: { box: 3, due: '2026-11-20' } });
  });

  it('cardOf: kỹ năng đã học chưa có thẻ = hộp 1 đến hạn hôm nay', () => {
    expect(cardOf({}, 'where', T)).toEqual({ box: 1, due: T });
  });

  it('dueSkills: chỉ kỹ năng đến hạn, sắp theo ngày rồi id', () => {
    const review = { select: { box: 2, due: '2026-11-20' }, where: { box: 1, due: '2026-11-10' } };
    expect(dueSkills(review, ['select', 'where', 'limit'], T)).toEqual(['where', 'limit']);
  });

  it('applyResult: đạt thì lên hộp, chưa đạt thì về hộp 1; đếm solved/failed; không đổi input', () => {
    const state = { review: { select: { box: 2, due: T } }, practice: { solved: 1, failed: 0 } };
    expect(applyResult(state, ['select', 'where'], true, T)).toEqual({
      review: { select: { box: 3, due: '2026-11-20' }, where: { box: 2, due: '2026-11-18' } },
      practice: { solved: 2, failed: 0 },
    });
    expect(applyResult(state, ['select'], false, T)).toEqual({
      review: { select: { box: 1, due: '2026-11-17' } },
      practice: { solved: 1, failed: 1 },
    });
    expect(state.review.select).toEqual({ box: 2, due: T });
  });
});

describe('chọn bài luyện', () => {
  const plain = mk('ch1-01', 'teach', { grants: ['select'] });
  const varied = mk('ch1-02', 'develop', {
    requires: ['select'], grants: ['where'], variants: [{ x: '1' }, { x: '2' }, { x: '3' }],
  });
  const boss = mk('ch1-05', 'boss', { requires: ['order_by'] });
  const notDone = mk('ch1-03', 'twist', { requires: ['select'], variants: [{ x: '1' }, { x: '2' }] });
  const wide = mk('ch1-04', 'rest', { requires: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'] });
  const templates = [plain, varied, notDone, wide, boss];
  const completed = new Set(['ch1-01', 'ch1-02', 'ch1-04', 'ch1-05']);

  it('variantFor: chọn biến thể khác 0 khi có ≥ 2, ngược lại 0', () => {
    expect(variantFor(varied, () => 0)).toBe(1);
    expect(variantFor(varied, () => 0.99)).toBe(2);
    expect(variantFor(plain, () => 0.5)).toBe(0);
  });

  it('pickForSkill ưu tiên ticket đã xong có biến thể; bỏ đánh giá thăng tiến và ticket chưa xong', () => {
    expect(pickForSkill('select', templates, completed, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['select'] });
    expect(pickForSkill('where', templates, completed, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['where'] });
    expect(pickForSkill('order_by', templates, completed, () => 0)).toBeUndefined();
    expect(pickForSkill('limit', templates, completed, () => 0)).toBeUndefined();
  });

  it('todayQueue tối đa QUEUE_MAX bài', () => {
    const learned = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'];
    const q = todayQueue({}, learned, templates, completed, T, () => 0);
    expect(q).toHaveLength(QUEUE_MAX);
    expect(q.every((i) => i.ticketId === 'ch1-04')).toBe(true);
  });

  it('retryItem luyện các kỹ năng ticket đó dạy; ticket rest không dạy gì thì luyện kỹ năng nó cần', () => {
    expect(retryItem(varied, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['where'] });
    expect(retryItem(wide, () => 0).skills).toEqual(wide.requires);
  });
});
