import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { homeModel, LEVELS } from '../src/home';
import { CHAPTERS, SKILLS } from '../src/progress';

const tickets = loadTickets();
const ids = (ch: number) => tickets.filter((t) => t.chapter === ch).map((t) => t.id);
const withTickets = new Set(tickets.map((t) => t.chapter));
const model = (completed: string[], levelOf?: (s: string) => number) =>
  homeModel(tickets, new Set(completed), CHAPTERS, SKILLS, levelOf);

describe('homeModel', () => {
  it('save trống: ticket đầu, chương 1 Đang học, chương có ticket bị khóa, chương chưa có ticket là Sắp có', () => {
    const m = model([]);
    expect(m.next?.id).toBe(tickets[0].id);
    expect(m).toMatchObject({ chapter: 1, done: 0, total: tickets.length, learned: 0 });
    expect(m.chapters.map((c) => c.status)).toEqual(
      CHAPTERS.map((c) => (c.chapter === 1 ? 'current' : withTickets.has(c.chapter) ? 'locked' : 'soon')));
  });

  it('xong chương 1: chương 1 Xong (kèm boss), chương 2 Đang học, đếm ticket theo chương', () => {
    const m = model(ids(1));
    const [c1, c2] = m.chapters;
    expect(c1).toMatchObject({ status: 'done', done: ids(1).length, total: ids(1).length });
    expect(c1.boss?.beat).toBe('boss');
    expect(c1.skills.every((s) => s.chapter === 1)).toBe(true);
    expect(c2).toMatchObject({ status: 'current', done: 0, total: ids(2).length });
    expect(m).toMatchObject({ chapter: 2, done: ids(1).length });
  });

  it('kỹ năng: đã học (mức 1) / chưa học ở chương đang mở / khóa ở chương sau', () => {
    const m = model(ids(1));
    const by = (id: string) => m.skills.find((s) => s.skill.id === id)!;
    expect(by('select')).toMatchObject({ state: 'learned', level: 1 });
    expect(by('aggregate')).toMatchObject({ state: 'open', level: 0 });
    expect(by('join')).toMatchObject({ state: 'locked', level: 0 });
    expect(m.learned).toBe(SKILLS.filter((s) => s.chapter === 1).length);
  });

  it('levelOf (Leitner của Plan 1c) được kẹp trong 1..LEVELS', () => {
    const level = (n: number) => model(ids(1), () => n).skills.find((s) => s.skill.id === 'select')!.level;
    expect(level(3)).toBe(3);
    expect(level(99)).toBe(LEVELS);
    expect(level(0)).toBe(1);
  });

  it('xong hết: không còn ticket tiếp theo, chương có ticket đều Xong, chương trống vẫn Sắp có', () => {
    const m = model(tickets.map((t) => t.id));
    expect(m.next).toBeUndefined();
    expect(m.done).toBe(tickets.length);
    expect(m.chapters.filter((c) => c.total > 0).every((c) => c.status === 'done')).toBe(true);
    expect(m.chapters.filter((c) => c.total === 0).every((c) => c.status === 'soon')).toBe(true);
  });
});
