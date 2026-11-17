import { describe, expect, it } from 'vitest';
import { loadTicketTemplates, loadTickets } from '../src/content';
import {
  addDays, applyResult, cardOf, dueSkills, INTERVALS, isSuccess, localDay, nextCard,
  pickForSkill, QUEUE_MAX, retryItem, reviewQueue, seedReview, variantFor, WARMUP_SIZE, warmupQueue,
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

  it('applyResult: đạt thì lên hộp, chưa đạt thì về hộp 1; đếm solved/weak; không đổi input', () => {
    const state = { review: { select: { box: 2, due: T } }, practice: { solved: 1, weak: 0 } };
    expect(applyResult(state, ['select', 'where'], true, T)).toEqual({
      review: { select: { box: 3, due: '2026-11-20' }, where: { box: 2, due: '2026-11-18' } },
      practice: { solved: 2, weak: 0 },
    });
    expect(applyResult(state, ['select'], false, T)).toEqual({
      review: { select: { box: 1, due: '2026-11-17' } },
      practice: { solved: 1, weak: 1 },
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

  it('reviewQueue: mỗi ticket một lần, gom mọi kỹ năng đến hạn nó luyện', () => {
    const learned = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'];
    expect(reviewQueue({}, learned, templates, completed, T, () => 0)).toEqual([{ ticketId: 'ch1-04', variant: 0, skills: learned }]);
  });

  it('reviewQueue: tối đa QUEUE_MAX bài, số bài không phụ thuộc rnd', () => {
    const many = Array.from({ length: 8 }, (_, i) => mk(`ch1-1${i}`, 'develop', { grants: [`s${i}`] }));
    const ids = new Set(many.map((t) => t.id));
    const learned = many.map((_, i) => `s${i}`);
    const q = reviewQueue({}, learned, many, ids, T, () => 0);
    expect(q).toHaveLength(QUEUE_MAX);
    expect(reviewQueue({}, learned, many, ids, T, () => 0.99)).toHaveLength(QUEUE_MAX);
  });
  it('warmupQueue: chỉ kỹ năng của chương trước, hộp thấp trước, mỗi ticket một lần, tối đa WARMUP_SIZE', () => {
    const ch2 = mk('ch2-01', 'teach', { grants: ['aggregate'], variants: [{ x: '1' }, { x: '2' }, { x: '3' }] });
    const all = [...templates, ch2];
    const done = new Set([...completed, 'ch2-01']);
    const review = { select: { box: 3, due: T }, where: { box: 1, due: '2026-11-20' } };
    // chapter 2 starts: chapter-1 skills only; where (box 1) before select (box 3); ch1-02 is taken, so select goes to ch1-01
    expect(warmupQueue(review, ['select', 'where', 'aggregate'], all, done, 2, T, () => 0)).toEqual([
      { ticketId: 'ch1-02', variant: 1, skills: ['where'] },
      { ticketId: 'ch1-01', variant: 0, skills: ['select'] },
    ]);
    // chapter 3: chapter-2 skills join; where has no other ticket once ch1-02 is taken, so it is skipped
    expect(warmupQueue({}, ['select', 'where', 'aggregate'], all, done, 3, T, () => 0).map((i) => i.skills[0])).toEqual(['aggregate', 'select']);
    expect(warmupQueue({}, ['select'], all, done, 1, T, () => 0)).toEqual([]);
    const many = Array.from({ length: 6 }, (_, i) => mk(`ch1-2${i}`, 'develop', { grants: [`s${i}`] }));
    expect(warmupQueue({}, many.map((_, i) => `s${i}`), many, new Set(many.map((t) => t.id)), 2, T, () => 0)).toHaveLength(WARMUP_SIZE);
  });

  it('retryItem luyện các kỹ năng ticket đó dạy; ticket rest không dạy gì thì luyện kỹ năng nó cần', () => {
    expect(retryItem(varied, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['where'] });
    expect(retryItem(wide, () => 0).skills).toEqual(wide.requires);
  });
});

describe('hàng ôn trên nội dung thật (L37)', () => {
  const templates = loadTicketTemplates();
  const ch1 = new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05']);
  const ch12 = new Set([...ch1, 'ch2-01', 'ch2-02', 'ch2-03', 'ch2-04', 'ch2-05']);
  const ch1Skills = ['select', 'where', 'order_by', 'limit'];
  const ch12Skills = [...ch1Skills, 'aggregate', 'group_by', 'having'];

  it('cả 4 kỹ năng ch1 đến hạn → một bài ch1-03 (biến thể khác 0) gom cả 4', () => {
    for (const r of [0, 0.5, 0.99]) {
      const q = reviewQueue({}, ch1Skills, templates, ch1, T, () => r);
      expect(q).toHaveLength(1);
      expect(q[0].ticketId).toBe('ch1-03');
      expect(q[0].variant).not.toBe(0);
      expect([...q[0].skills].sort()).toEqual([...ch1Skills].sort());
    }
  });

  it('không lặp (ticket, biến thể), mỗi kỹ năng đến hạn một lần, số bài như nhau với mọi rnd', () => {
    const lens = new Set<number>();
    for (const r of [0, 0.3, 0.7, 0.99]) {
      const q = reviewQueue({}, ch12Skills, templates, ch12, T, () => r);
      lens.add(q.length);
      expect(new Set(q.map((i) => `${i.ticketId}#${i.variant}`)).size).toBe(q.length);
      expect(new Set(q.map((i) => i.ticketId)).size).toBe(q.length);
      const skills = q.flatMap((i) => i.skills);
      expect(new Set(skills).size).toBe(skills.length);
    }
    expect(lens.size).toBe(1);
  });

  it('kỹ năng chỉ có bài không biến thể: đổi ngày thì đổi bài (không làm lại đúng một câu mỗi ngày)', () => {
    const pick = (day: string) => reviewQueue({}, ['aggregate'], templates, ch12, day, () => 0)[0].ticketId;
    expect(pick('2026-11-16')).not.toBe(pick('2026-11-17'));
  });
});
