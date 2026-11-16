import { describe, expect, it } from 'vitest';
import {
  chapterTitle, CHAPTERS, contentProblems, currentChapter, nextTicket, parseChapters, parseSkills, SKILLS,
  tablesUnlocked, visibleTickets, xpFor,
} from '../src/progress';
import type { Beat, Ticket } from '../src/tickets';

const mk = (id: string, beat: Beat, extra: Partial<Ticket> = {}): Ticket => ({
  id, chapter: Number(id[2]), title: id, from: { name: 'A', dept: 'Ops' }, difficulty: 2, beat,
  requires: [], grants: [], tables: ['ports'], ordered: false, body: '', task: '', hints: ['a', 'b', 'c'],
  steps: [{ title: '', prompt: '', solution: 'SELECT 1' }], ...extra,
});

const card = (id: string, chapter: number) => `
- id: ${id}
  chapter: ${chapter}
  label: { vi: "nhãn ${id}", en: "label ${id}" }
  syntax: "SELECT"
  when: { vi: "khi", en: "when" }
  trap: { vi: "bẫy", en: "trap" }`;

// aggregate thuộc chương 2: chưa có ticket chương 2 nên chưa bắt buộc được dạy.
const skills = parseSkills([card('select', 1), card('where', 1), card('order_by', 1), card('aggregate', 2)].join('\n'));
const chapters = parseChapters(`
- chapter: 1
  title: { vi: "Tuần thử việc", en: "Probation week" }
  outcomes:
    - { vi: "Lọc", en: "Filter", skills: [select, where] }
`);

const chapter1 = [
  mk('ch1-01', 'teach', { grants: ['select'] }),
  mk('ch1-02', 'develop', { requires: ['select'], grants: ['where'] }),
  mk('ch1-03', 'twist', { requires: ['select'], grants: ['order_by'] }),
  mk('ch1-04', 'rest'),
  mk('ch1-05', 'boss', { requires: ['where', 'order_by'] }),
];
const problems = (tickets: Ticket[], s = skills, c = chapters) => contentProblems(tickets, s, c);
const swap = (id: string, patch: Partial<Ticket>) => chapter1.map((t) => (t.id === id ? { ...t, ...patch } : t));

describe('tiến trình', () => {
  it('tuyến tính: chỉ thấy ticket đã xong + ticket kế tiếp', () => {
    const done = new Set(['ch1-01']);
    expect(nextTicket(chapter1, done)?.id).toBe('ch1-02');
    expect(visibleTickets(chapter1, done).map((t) => t.id)).toEqual(['ch1-01', 'ch1-02']);
    expect(currentChapter(chapter1, done)).toBe(1);
  });

  it('xong hết thì currentChapter là chương cuối, không còn ticket kế tiếp', () => {
    const done = new Set(chapter1.map((t) => t.id));
    expect(nextTicket(chapter1, done)).toBeUndefined();
    expect(currentChapter(chapter1, done)).toBe(1);
  });

  it('bảng mở dần theo chương', () => {
    expect(tablesUnlocked(1)).toContain('shipments');
    expect(tablesUnlocked(1)).not.toContain('containers');
    expect(tablesUnlocked(2)).toContain('containers');
  });

  it('XP trừ 25% mỗi gợi ý, tối đa 3', () => {
    expect(xpFor(mk('ch1-01', 'teach'), 0)).toBe(200);
    expect(xpFor(mk('ch1-01', 'teach'), 1)).toBe(150);
    expect(xpFor(mk('ch1-01', 'teach'), 9)).toBe(50);
  });
});

describe('skills.yml và chapters.yml', () => {
  it('file thật nạp được, hợp lệ khi chưa có ticket', () => {
    expect(SKILLS.map((s) => s.id)).toEqual(expect.arrayContaining(
      ['select', 'where', 'order_by', 'limit', 'aggregate', 'group_by', 'having', 'join', 'multi_join', 'left_join', 'anti_join'],
    ));
    expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(contentProblems([])).toEqual([]);
  });

  it('chapterTitle theo ngôn ngữ', () => {
    expect(chapterTitle(1, 'vi')).toBe('Tuần thử việc');
    expect(chapterTitle(1, 'en')).toBe('Probation week');
    expect(chapterTitle(99, 'en')).toBe('');
  });

  it('parseSkills báo lỗi cấu trúc', () => {
    expect(() => parseSkills('a: 1')).toThrow(/danh sách/);
    expect(() => parseSkills(card('select', 1) + card('select', 1))).toThrow(/trùng id "select"/);
    expect(() => parseSkills('- id: x')).toThrow(/chapter/);
  });
});

describe('contentProblems', () => {
  it('chương hợp lệ → không có lỗi', () => {
    expect(problems(chapter1)).toEqual([]);
  });

  it('phát hiện kỹ năng chưa dạy (soft-lock)', () => {
    expect(problems(swap('ch1-02', { requires: ['join'] }))).toContain('ch1-02: cần kỹ năng "join" nhưng chưa ticket nào trước đó dạy');
  });

  it('phát hiện bảng chưa mở', () => {
    expect(problems(swap('ch1-03', { tables: ['containers'] }))).toContain('ch1-03: dùng bảng "containers" chưa mở ở chương 1');
  });

  it('phát hiện sai nhịp chương và trùng id', () => {
    // beats: develop, teach, rest, boss, twist, twist
    const bad = [chapter1[1], chapter1[0], chapter1[3], chapter1[4], chapter1[2], chapter1[2]];
    const p = problems(bad);
    expect(p).toContain('chương 1: ticket đầu phải là teach');
    expect(p).toContain('chương 1: ticket cuối phải là boss');
    expect(p).toContain('chương 1: ngay trước boss phải là rest');
    expect(p).toContain('ch1-03: trùng id');
  });

  it('requires/grants phải có trong skills.yml', () => {
    expect(problems(swap('ch1-02', { grants: ['wher'] }))).toContain('ch1-02: kỹ năng "wher" không có trong skills.yml');
  });

  it('mỗi kỹ năng được dạy đúng 1 lần, đúng chương', () => {
    expect(problems(swap('ch1-04', { grants: ['where'] }))).toContain('kỹ năng "where": được dạy 2 lần, cần đúng 1');
    expect(problems(swap('ch1-02', { grants: [] }))).toContain('kỹ năng "where": được dạy 0 lần, cần đúng 1');
    expect(problems(swap('ch1-04', { grants: ['aggregate'] }))).toContain('ch1-04: dạy "aggregate" nhưng skills.yml ghi chương 2');
  });

  it('outcome chỉ dùng kỹ năng của chương này hoặc trước', () => {
    const late = parseChapters(`
- chapter: 1
  title: { vi: "a", en: "a" }
  outcomes:
    - { vi: "x", en: "x", skills: [aggregate, nope] }
`);
    const p = problems(chapter1, skills, late);
    expect(p).toContain('chương 1: outcome dùng kỹ năng "aggregate" của chương 2');
    expect(p).toContain('chương 1: outcome dùng kỹ năng "nope" không có trong skills.yml');
  });

  it('mỗi kỹ năng có thẻ đủ vi/en; mỗi chương có ticket phải có trong chapters.yml', () => {
    const noCard = parseSkills(`${card('select', 1)}${card('where', 1)}${card('order_by', 1)}\n- id: limit\n  chapter: 1\n  label: { vi: "a", en: "b" }`);
    expect(problems(chapter1, noCard)).toContain('kỹ năng "limit": thiếu nhãn hoặc thẻ (label, syntax, when, trap đủ vi/en)');
    expect(problems(chapter1, skills, [])).toContain('chương 1: thiếu trong chapters.yml');
  });

  it('boss phải kiểm tra kỹ năng của ticket twist', () => {
    expect(problems(swap('ch1-05', { requires: ['where'] })))
      .toContain('ch1-05: boss phải kiểm tra kỹ năng twist "order_by" (thêm vào requires)');
  });
});
