import { describe, expect, it } from 'vitest';
import { generalNow, loadDomain, loadTickets, loadTicketTemplates } from '../src/content';
import type { DomainId } from '../src/domains';
import { homeModel, kpisOf, kpiTiles, knownSkills, learnedSkills } from '../src/home';
import { placementItems } from '../src/learn';
import { pickForSkill, seedReview, reviewQueue, warmupQueue } from '../src/practice';
import {
  chaptersOf, chapterTablesOf, contentProblems, currentChapter, domainSkills, earlyReview, isOptional, nextTicket, PARTS, passedChapters, rankOf, ROUTE_SKILLS, SKILLS, visibleTickets,
} from '../src/progress';
import { emptySave, parseSave, serializeSave, type Known } from '../src/save';
import { derive } from '../src/scene';
import type { Ticket } from '../src/tickets';
import { navTargets } from '../src/viz/progressDots';

/**
 * v17 I4 (D-N11, L145): a promotion review taken early. Success test of roadmap v15 §5: taking reviews early never breaks
 * rankOf or the KPI tiles, checked with saves that hold only promotion reviews, in all three domains.
 */
await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
const DOMAINS: DomainId[] = ['logistics', 'ecommerce', 'finance'];
const ticketsOf = (d: DomainId): Ticket[] => loadTickets(d);
const bossOf = (tickets: Ticket[], ch: number): Ticket => tickets.find((t) => t.chapter === ch && t.beat === 'boss')!;
const TODAY = '2026-11-19';

describe.each(DOMAINS)('%s: đánh giá thăng tiến làm sớm', (d) => {
  const tickets = ticketsOf(d);
  const chapters = chaptersOf(d);
  const b1 = bossOf(tickets, 1);
  const b2 = bossOf(tickets, 2);
  const ch1 = tickets.filter((t) => t.chapter === 1 && t.beat !== 'boss');

  it('mọi tiền tố tuyến tính: nextTicket/visibleTickets như trước L145, earlyReview = đánh giá của chương đang làm', () => {
    for (let k = 0; k <= tickets.length; k++) {
      const done = new Set(tickets.slice(0, k).map((t) => t.id));
      const first = tickets.find((t) => !done.has(t.id));
      expect(nextTicket(tickets, done)).toBe(first);
      expect(visibleTickets(tickets, done)).toEqual(tickets.filter((t) => done.has(t.id) || t === first));
      const early = earlyReview(tickets, done);
      if (!first || first.beat === 'boss') expect(early).toBeUndefined();
      else expect(early).toBe(bossOf(tickets, first.chapter));
    }
  });

  it('save mới: đánh giá chương 1 làm được ngay', () => {
    expect(earlyReview(tickets, new Set())).toBe(b1);
  });

  it('save chỉ có đánh giá chương 1: chương 2 mở, việc chương 1 thành tùy chọn', () => {
    const done = new Set([b1.id]);
    const next = nextTicket(tickets, done)!;
    expect(next.chapter).toBe(2);
    expect(next).toBe(tickets.find((t) => t.chapter === 2));
    expect(currentChapter(tickets, done)).toBe(2);
    expect([...passedChapters(tickets, done)]).toEqual([1]);
    const passed = passedChapters(tickets, done);
    for (const t of ch1) expect(isOptional(t, done, passed)).toBe(true);
    expect(visibleTickets(tickets, done).map((t) => t.id)).toEqual([...ch1, b1, next].map((t) => t.id));
    expect(earlyReview(tickets, done)).toBe(b2);
    expect(navTargets(tickets, done, b1.id).resume).toBe(next.id);
  });

  it('rankOf với save chỉ có đánh giá: bậc nghề theo chương đã qua', () => {
    const done = new Set([b1.id, b2.id]);
    const rank = rankOf(tickets, done, chapters);
    expect(rank.passed).toEqual([1, 2]);
    expect(rank.career).toEqual(chapters.find((c) => c.chapter === 2)!.career);
    const star = chapters.filter((c) => c.tier && c.chapter <= 2).pop();
    if (star) expect(rank.tier).toEqual(star.career);
    else expect(rank.tier).toBeUndefined();
    expect(nextTicket(tickets, done)!.chapter).toBe(3);
  });

  it('KPI: ô chỉ mở khi đúng việc nguồn đã xong; việc bị bỏ qua vẫn khóa ô của nó', () => {
    const done = new Set([b1.id, b2.id]);
    for (const tile of kpiTiles(kpisOf(d), tickets, done)) expect(tile.open).toBe(!!tile.ticket && done.has(tile.ticket.id));
    const skipped = kpiTiles(kpisOf(d), tickets, done).filter((x) => x.ticket && x.ticket.chapter <= 2 && x.ticket.beat !== 'boss');
    for (const tile of skipped) expect(tile.open).toBe(false);
  });

  it('kỹ năng: đánh giá đạt sớm tính mọi kỹ năng của chương là đã học (Lily, Trang chủ)', () => {
    const done = new Set([b1.id]);
    const grants = ch1.flatMap((t) => t.grants);
    expect(grants.length).toBeGreaterThan(0);
    for (const s of grants) expect(learnedSkills(tickets, done).has(s)).toBe(true);
    const save = { ...emptySave(), completed: [b1.id] };
    const known = knownSkills(save, tickets, SKILLS.map((s) => s.id));
    for (const s of grants) expect(known.has(s)).toBe(true);
  });

  it('homeModel: chương đã qua đánh giá là "done" dù việc còn lại', () => {
    const done = new Set([b1.id]);
    const m = homeModel(tickets, done, chapters, domainSkills(tickets));
    expect(m.chapters.find((c) => c.chapter === 1)).toMatchObject({ status: 'done', done: 1, total: ch1.length + 1 });
    expect(m.chapters.find((c) => c.chapter === 2)?.status).toBe('current');
    expect(m.chapter).toBe(2);
  });

  it('ôn tập: thẻ gieo khi qua sớm đến hạn ngày mai; khởi động chương không có việc nào để lấy', () => {
    const done = new Set([b1.id]);
    const review = seedReview({}, ch1.flatMap((t) => t.grants), TODAY);
    const learned = learnedSkills(tickets, done);
    expect(reviewQueue(review, learned, loadTicketTemplates(d), done, TODAY, () => 0)).toEqual([]);
    // Warm-up draws from finished non-review tasks only: a review-only player has none, so no warm-up card (documented, L145).
    expect(warmupQueue(review, learned, loadTicketTemplates(d), done, 2, TODAY, () => 0)).toEqual([]);
    // No finished task practises these skills: "Practise" on #/practice falls back to the skill page (startSkill, ui/modes.ts).
    for (const s of learned) expect(pickForSkill(s, loadTicketTemplates(d), done, () => 0)).toBeUndefined();
  });

  it('contentProblems không đổi', () => {
    expect(contentProblems(tickets, d === 'logistics' ? SKILLS : domainSkills(tickets), chapters, chapterTablesOf(d))).toEqual([]);
  });
});

describe('Logistics: cảng và Save', () => {
  const tickets = ticketsOf('logistics');
  it('derive: bến của chương đã qua đánh giá sớm mở như khi đi tuyến tính', () => {
    const b1 = bossOf(tickets, 1);
    const early = derive(tickets, new Set([b1.id]));
    const linear = derive(tickets, new Set(tickets.filter((t) => t.chapter === 1).map((t) => t.id)));
    expect([...early.passed]).toEqual([1]);
    expect(early.open).toEqual(linear.open);
  });

  it('Save chỉ có ticket đánh giá đọc lại nguyên vẹn (không đổi định dạng Save)', () => {
    const ids = [1, 2, 3].map((ch) => bossOf(tickets, ch).id);
    const known: Known = { ticketIds: new Set(tickets.map((t) => t.id)), laneIds: new Set(), skills: new Set(SKILLS.map((s) => s.id)) };
    const save = { ...emptySave(), completed: [...ids, 'ecom-ch1-05', 'fin-ch1-05'] };
    expect(parseSave(serializeSave(save), known).completed).toEqual(save.completed);
  });
});

describe('General: kiểm tra đầu vào', () => {
  const g = generalNow()!;
  it('mỗi Phần một bài open; đạt thì mọi kỹ năng của Phần (v24: Phần của route.yml)', () => {
    const items = placementItems(PARTS, g, new Set());
    expect(items).toHaveLength(PARTS.length);
    items.forEach((item, i) => {
      const own = PARTS[i].skills;
      expect(item.skills).toEqual(own);
      const drill = g.byId.get(item.ticketId)!;
      expect(drill.kind).toBe('open');
      expect(own).toContain(drill.skill);
    });
  });

  it('Phần đã học thì không hỏi lại', () => {
    const p1 = PARTS[0].skills;
    const items = placementItems(PARTS, g, new Set(p1));
    expect(items.some((i) => i.skills.some((s) => p1.includes(s)))).toBe(false);
    expect(placementItems(PARTS, g, new Set(ROUTE_SKILLS.map((s) => s.id)))).toEqual([]); // v25 R1: Parts 5–6 also hold the General-only skills
  });
});
