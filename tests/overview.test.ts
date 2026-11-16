import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { learnedSkills } from '../src/home';
import { chapterSummary, grantedBy, outcomeDone, resumeStep } from '../src/overview';
import { CHAPTER_TABLES, xpFor } from '../src/progress';
import { emptySave } from '../src/save';
import type { Beat, Ticket } from '../src/tickets';

const base = loadTickets()[0];
const step = base.steps[0];
const mk = (id: string, beat: Beat, extra: Partial<Ticket> = {}): Ticket => ({
  ...base, id, chapter: Number(id[2]), beat, difficulty: 2, requires: [], grants: [], steps: [{ ...step }], variants: [], ...extra,
});

const t1 = mk('ch1-01', 'teach', { grants: ['select'] });
const t2 = mk('ch1-02', 'develop', { requires: ['select'], grants: ['where'] });
const boss = mk('ch1-05', 'boss', { requires: ['where'], steps: [{ ...step }, { ...step }, { ...step }] });
const t4 = mk('ch2-01', 'teach', { grants: ['aggregate'] });
const tickets = [t1, t2, boss, t4];

describe('overview', () => {
  it('learnedSkills (home.ts) = grants của ticket đã xong', () => {
    expect([...learnedSkills(tickets, new Set(['ch1-01']))]).toEqual(['select']);
  });

  it('outcomeDone: theo kỹ năng; outcome rỗng tick khi xong cả chương có ticket', () => {
    const all = new Set(['ch1-01', 'ch1-02', 'ch1-05']);
    const learned = learnedSkills(tickets, all);
    expect(outcomeDone(['select', 'where'], 1, tickets, all, learned)).toBe(true);
    expect(outcomeDone(['aggregate'], 1, tickets, all, learned)).toBe(false);
    expect(outcomeDone([], 1, tickets, all, learned)).toBe(true);
    expect(outcomeDone([], 1, tickets, new Set(['ch1-01']), learned)).toBe(false);
    expect(outcomeDone([], 12, tickets, all, learned)).toBe(false);
  });

  it('chapterSummary: XP tính lại bằng xpFor, tổng gợi ý, kỹ năng, bảng chương sau', () => {
    const save = { ...emptySave(), completed: ['ch1-01', 'ch1-02', 'ch1-05'], hintsUsed: { 'ch1-02': 1 } };
    expect(chapterSummary(tickets, save, 1)).toEqual({
      xp: xpFor(t1, 0) + xpFor(t2, 1) + xpFor(boss, 0),
      hints: 1,
      skills: ['select', 'where'],
      newTables: CHAPTER_TABLES[2] ?? [],
    });
  });

  it('grantedBy tìm ticket dạy kỹ năng', () => {
    expect(grantedBy(tickets, 'where')?.id).toBe('ch1-02');
    expect(grantedBy(tickets, 'cte')).toBeUndefined();
  });

  it('resumeStep: kẹp bước đánh giá, ticket đã xong về 0', () => {
    expect(resumeStep({ ...emptySave(), bossStep: { 'ch1-05': 1 } }, boss)).toBe(1);
    expect(resumeStep({ ...emptySave(), bossStep: { 'ch1-05': 9 } }, boss)).toBe(2);
    expect(resumeStep({ ...emptySave(), completed: ['ch1-05'], bossStep: { 'ch1-05': 1 } }, boss)).toBe(0);
    expect(resumeStep(emptySave(), undefined)).toBe(0);
  });
});
