import { describe, expect, it } from 'vitest';
import {
  CHAPTER_TABLES, chapterTitle, CHAPTERS, contentProblems, currentChapter, nextTicket, parseChapters, parseSkills, rankOf, SKILLS,
  tablesUnlocked, twistUsed, visibleTickets, xpFor,
} from '../src/progress';
import { loadTickets } from '../src/content';
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
  career: { vi: "Junior DA", en: "Junior DA" }
  tier: true
  story: { vi: "Mở đầu", en: "Intro" }
  outcomes:
    - { vi: "Lọc", en: "Filter", skills: [select, where] }
`);

const chapter1 = [
  mk('ch1-01', 'teach', { grants: ['select'] }),
  mk('ch1-02', 'develop', { requires: ['select'], grants: ['where'] }),
  mk('ch1-03', 'twist', { requires: ['select'], grants: ['order_by'] }),
  mk('ch1-04', 'rest'),
  mk('ch1-05', 'boss', { requires: ['where', 'order_by'], steps: [{ title: '', prompt: '', solution: 'SELECT 1' }, { title: '', prompt: '', solution: 'SELECT 1 ORDER BY 1' }] }),
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
    expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
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

  it('boss không dạy kỹ năng nào (grants: [])', () => {
    expect(problems(swap('ch1-05', { grants: ['order_by'] }))).toContain('ch1-05: boss không được dạy kỹ năng (grants phải rỗng)');
  });

  it('ít nhất một Solution của boss phải thật sự dùng kỹ năng twist', () => {
    const noOrder = [{ title: '', prompt: '', solution: 'SELECT 1' }, { title: '', prompt: '', solution: 'SELECT 2' }];
    expect(problems(swap('ch1-05', { steps: noOrder })))
      .toContain('ch1-05: không Solution nào của boss dùng kỹ năng twist "order_by"');
  });

  it('kỹ năng twist không có trong bảng từ khóa thì bỏ qua', () => {
    const custom = parseSkills([card('select', 1), card('where', 1), card('pivot', 1), card('aggregate', 2)].join('\n'));
    const tickets = chapter1.map((t) => (t.id === 'ch1-03' ? { ...t, grants: ['pivot'] } : t.id === 'ch1-05' ? { ...t, requires: ['where', 'pivot'] } : t));
    expect(problems(tickets, custom)).toEqual([]);
  });
});

describe('twistUsed: từ khóa theo kỹ năng', () => {
  it.each([
    ['limit', 'SELECT 1 LIMIT 3', 'SELECT 1'],
    ['having', 'SELECT a FROM t GROUP BY a HAVING count(*) > 1', 'SELECT a FROM t GROUP BY a'],
    ['left_join', 'SELECT * FROM a left  join b ON true', 'SELECT * FROM a JOIN b ON true'],
    ['anti_join', 'SELECT * FROM a LEFT JOIN b ON true WHERE b.id IS NULL', 'SELECT * FROM a LEFT JOIN b ON true'],
    ['anti_join', 'SELECT * FROM a WHERE NOT EXISTS (SELECT 1)', 'SELECT * FROM a WHERE EXISTS (SELECT 1)'],
    ['order_by', 'SELECT 1 ORDER BY 1', 'SELECT 1'],
  ])('%s', (skill, yes, no) => {
    expect(twistUsed(skill, yes)).toBe(true);
    expect(twistUsed(skill, no)).toBe(false);
  });

  it('kỹ năng lạ → undefined (không kiểm)', () => {
    expect(twistUsed('pivot', 'SELECT 1')).toBeUndefined();
  });
});

describe('12 chương (L30, curriculum.md)', () => {
  it('★ đổi chức danh ở ch1, 3, 6, 9, 12; mọi chương có career + story vi/en', () => {
    expect(CHAPTERS.filter((c) => c.tier).map((c) => c.chapter)).toEqual([1, 3, 6, 9, 12]);
    expect(CHAPTERS.find((c) => c.chapter === 12)?.career).toEqual({ vi: 'Trưởng nhóm Phân tích', en: 'Head of Analytics' });
    expect(CHAPTERS.every((c) => c.career.vi && c.career.en && c.story.vi && c.story.en)).toBe(true);
  });

  it('chương thiếu career/story bị báo', () => {
    const bare = parseChapters('- chapter: 1\n  title: { vi: "a", en: "a" }\n');
    expect(problems(chapter1, skills, bare)).toContain('chương 1: thiếu career/story vi/en');
  });

  it('CHAPTER_TABLES: 25 bảng của spec §4, mỗi bảng đúng một lần, mở theo curriculum §3', () => {
    const all = Object.values(CHAPTER_TABLES).flat();
    expect(Object.keys(CHAPTER_TABLES).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(all).toHaveLength(25);
    expect(new Set(all).size).toBe(25);
    expect(tablesUnlocked(4)).toContain('trucking_orders');
    expect(tablesUnlocked(4)).not.toContain('customs_declarations');
    expect(tablesUnlocked(5)).toContain('hs_codes');
    expect(tablesUnlocked(8)).not.toContain('master_bills');
    expect(tablesUnlocked(12)).toContain('claims');
  });

  it('rankOf: thăng tiến theo cột mốc (L19), chức danh chỉ đổi ở chương ★', () => {
    const real = loadTickets();
    const upTo = (ch: number) => new Set(real.filter((t) => t.chapter <= ch).map((t) => t.id));
    expect(rankOf(real, new Set())).toEqual({ passed: [] });
    expect(rankOf(real, upTo(1))).toMatchObject({ passed: [1], tier: { en: 'Junior DA' }, career: { en: 'Junior DA' } });
    expect(rankOf(real, upTo(2))).toMatchObject({ passed: [1, 2], tier: { en: 'Junior DA' }, career: { en: 'Junior DA · volume reporting' } });
    expect(rankOf(real, upTo(3))).toMatchObject({ passed: [1, 2, 3], tier: { en: 'Data Analyst' } });
    const noBoss = new Set(real.filter((t) => t.chapter === 1 && t.beat !== 'boss').map((t) => t.id));
    expect(rankOf(real, noBoss).passed).toEqual([]);
  });
});
