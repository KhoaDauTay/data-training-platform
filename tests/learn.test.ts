import { describe, expect, it } from 'vitest';
import { generalNow, loadTickets } from '../src/content';
import { knownSkills, kpiTiles, KPIS, skillOfDrill } from '../src/home';
import {
  appliesIn, dependsOn, drillState, drillXp, moduleState, nodeState, skillState, type LearnCtx,
} from '../src/learn';
import { chapterSummary } from '../src/overview';
import { nextTicket, PARTS, rankOf, SKILLS } from '../src/progress';
import { emptySave, parseSave, SAVE_VERSION, type Known, type Save } from '../src/save';
import { derive } from '../src/scene';

const tickets = loadTickets();
const g = generalNow()!;
const SKILL_IDS = SKILLS.map((s) => s.id);
const known: Known = { ticketIds: new Set(tickets.map((t) => t.id)), laneIds: new Set(), skills: new Set(SKILL_IDS) };
const save = (over: Partial<Save> = {}): Save => ({ ...emptySave(), ...over });
const ctx = (s: Save, seen: string[] = []): LearnCtx => ({ save: s, tickets, skills: SKILLS, parts: PARTS, general: g, seen, known: knownSkills(s, tickets, SKILLS.map((k) => k.id)) });

describe('save giữ id drill g-… (không cần tải nội dung Chung)', () => {
  it('completed, nháp, graded, hintsUsed của g-… được giữ; id lạ không tiền tố vẫn bị bỏ', () => {
    const raw = JSON.stringify({
      ...emptySave(), version: SAVE_VERSION,
      completed: ['ch1-01', 'g-where-1', 'g-a1-4', 'nope', 'G-WHERE-1'],
      drafts: { 'g-where-1#0': 'SELECT 1', 'nope#0': 'x' },
      graded: { 'g-where-1#0': 'SELECT 2' },
      hintsUsed: { 'g-where-1': 1, nope: 2 },
    });
    const s = parseSave(raw, known);
    expect(s.completed).toEqual(['ch1-01', 'g-where-1', 'g-a1-4']);
    expect(s.drafts).toEqual({ 'g-where-1#0': 'SELECT 1' });
    expect(s.graded).toEqual({ 'g-where-1#0': 'SELECT 2' });
    expect(s.hintsUsed).toEqual({ 'g-where-1': 1 });
  });
});

describe('src/learn.ts', () => {
  it('skillOfDrill: bỏ g- và -<số>, - thành _, chỉ nhận kỹ năng có thật; mọi drill của sql.yml suy đúng', () => {
    expect(skillOfDrill('g-conditional-agg-3', SKILL_IDS)).toBe('conditional_agg');
    expect(skillOfDrill('g-a1-2', SKILL_IDS)).toBeUndefined();
    for (const d of g.drills.filter((x) => x.skill)) expect([d.id, skillOfDrill(d.id, SKILL_IDS)]).toEqual([d.id, d.skill]);
  });

  it('knownSkills: ticket grants xong, ≥ 2 drill, hoặc thẻ review; 1 drill chưa đủ', () => {
    const grant = tickets.find((t) => t.grants.includes('where'))!;
    expect(knownSkills(save({ completed: [grant.id] }), tickets, SKILL_IDS).has('where')).toBe(true);
    expect(knownSkills(save({ completed: ['g-join-1'] }), tickets, SKILL_IDS).has('join')).toBe(false);
    expect(knownSkills(save({ completed: ['g-join-1', 'g-join-3'] }), tickets, SKILL_IDS).has('join')).toBe(true);
    expect(knownSkills(save({ review: { cte: { box: 1, due: '2026-11-20' } } }), tickets, SKILL_IDS).has('cte')).toBe(true);
  });

  it('drillState, skillState, moduleState, nodeState', () => {
    const s = save({ completed: ['g-where-1', 'g-where-2'], review: { where: { box: 4, due: '2026-11-20' } } });
    expect(drillState(s, 'g-where-1')).toBe('done');
    expect(drillState(s, 'g-where-3')).toBe('todo');
    expect(skillState(ctx(s, ['where']), 'where')).toEqual({ lesson: true, drills: 2, total: 4, learned: true, mastered: true });
    expect(skillState(ctx(save()), 'select')).toEqual({ lesson: false, drills: 0, total: 4, learned: false, mastered: false });
    const m1 = moduleState(ctx(s), 1);
    expect(m1.skills).toEqual(['select', 'where', 'order_by', 'limit']); // v24: Part 1 of content/general/route.yml
    expect(m1.learned).toBe(1);
    expect(m1.done).toBe(false);
    const a1 = g.nodes.find((n) => n.id === 'a1')!;
    expect(nodeState(ctx(save()), a1)).toEqual({ done: false, open: false, drills: 0, total: 4 });
    const all = save({ completed: a1.drills.map((d) => d.id), review: { window_agg: { box: 1, due: '2026-11-20' }, window_lag: { box: 1, due: '2026-11-20' } } });
    expect(nodeState(ctx(all), a1)).toMatchObject({ done: true, open: true });
    const d1 = g.nodes.find((n) => n.status === 'external')!;
    expect(nodeState(ctx(save({ completed: g.drills.map((d) => d.id) })), d1).done).toBe(false);
  });

  it('appliesIn và dependsOn', () => {
    const where = appliesIn(tickets, 'where');
    expect(where.slice(0, 2)).toEqual([1, 2]); // chapter 3's tickets list join skills, not where
    expect(where).toEqual([...where].sort((a, b) => a - b));
    for (let n = 1; n <= 12; n++) expect(dependsOn(tickets, n).length, `chương ${n}`).toBeGreaterThan(0);
    expect(dependsOn(tickets, 3)).toContain('join');
    expect(dependsOn(tickets, 1, ['a1'])).toContain('a1');
  });

  it('XP drill: 10 lần đầu (thử thách 20), 0 sau', () => {
    const open = g.byId.get('g-where-2')!;
    const ch = g.drills.find((d) => d.kind === 'challenge')!;
    expect([drillXp(open, true), drillXp(open, false), drillXp(ch, true), drillXp(ch, false)]).toEqual([10, 0, 20, 0]);
  });

  it('không đếm nhầm: rank, việc kế, cảng, tổng kết chương, KPI như cũ khi completed có thêm id g-…', () => {
    const base = tickets.filter((t) => t.chapter <= 2).map((t) => t.id);
    const extra = g.drills.slice(0, 10).map((d) => d.id);
    const a = new Set(base);
    const b = new Set([...base, ...extra]);
    expect(rankOf(tickets, b)).toEqual(rankOf(tickets, a));
    expect(nextTicket(tickets, b)?.id).toBe(nextTicket(tickets, a)?.id);
    expect(derive(tickets, b)).toEqual(derive(tickets, a));
    expect(chapterSummary(tickets, save({ completed: [...b] }), 2)).toEqual(chapterSummary(tickets, save({ completed: [...a] }), 2));
    expect(kpiTiles(KPIS, tickets, b)).toEqual(kpiTiles(KPIS, tickets, a));
  });
});

describe('session: mode drill (Plan 8a Task 7)', () => {
  it('startDrill đặt mode drill; keepsWork; activeTicket = drillTicket; activeSchema lab; mode khác: game', async () => {
    const { session, keepsWork, activeTicket, activeSchema, schemaOf, workKey, isClosed } = await import('../src/session');
    const { drillTicket } = await import('../src/general');
    const drill = g.byId.get('g-where-1')!;
    const ticket = drillTicket(drill);
    session.mode = { kind: 'drill', ticket, drill, wrong: 0 };
    expect(keepsWork()).toBe(true);
    expect(activeTicket()).toBe(ticket);
    expect(activeSchema()).toBe('lab');
    expect(schemaOf(ticket)).toBe('lab');
    expect(workKey()).toBe('g-where-1#0');
    expect(isClosed('g-where-1')).toBe(false); // a passed drill can be submitted again (0 XP)
    session.mode = { kind: 'sandbox' };
    expect(activeSchema()).toBe('game');
    expect(schemaOf(tickets[0])).toBe('game');
    session.mode = { kind: 'story' };
  });
});

describe('Domain ↔ Chung (Plan 8a Task 11)', () => {
  it('dependsOn: mọi chương 1–12 dựa vào ít nhất một kỹ năng có thật', () => {
    for (let n = 1; n <= 12; n++) {
      const deps = dependsOn(tickets, n);
      expect([n, deps.length > 0]).toEqual([n, true]);
      for (const id of deps) expect(SKILLS.some((s) => s.id === id)).toBe(true);
    }
  });
});

describe('stamper (ui-ux-v5 B1: icon đóng dấu khi kỹ năng vừa thành "đã học")', () => {
  it('v6 S4: fresh() chưa tiêu dấu (trang vẽ hai lần liền khi vào), spend() mới tiêu', async () => {
    const { stamper } = await import('../src/learn');
    const st = stamper();
    const s1 = {};
    st.base(s1, ['m1']);
    expect(st.fresh('m1', true)).toBe(false);
    expect(st.fresh('m2', false)).toBe(false);
    expect(st.fresh('m2', true)).toBe(true);
    expect(st.fresh('m2', true)).toBe(true); // the second draw of the same entry still gets it
    st.spend('m2');
    expect(st.fresh('m2', true)).toBe(false);
    expect(st.stamp('m2', true)).toBe(false);
  });
  it('lần vẽ đầu chỉ đặt mốc; kỹ năng mới học đóng dấu đúng một lần (vẽ lại thì không)', async () => {
    const { stamper } = await import('../src/learn');
    const st = stamper();
    const s1 = {};
    st.base(s1, ['select']);
    expect(st.stamp('select', true)).toBe(false);
    expect(st.stamp('where', false)).toBe(false);
    st.base(s1, ['select', 'where']);
    expect(st.stamp('where', true)).toBe(true);
    st.base(s1, ['select', 'where']); // a rerender (language switch, seed done) never replays it
    expect(st.stamp('where', true)).toBe(false);
  });
  it('kỹ năng chưa vẽ thì chưa tiêu: đóng dấu ở trang vẽ nó sau', async () => {
    const { stamper } = await import('../src/learn');
    const st = stamper();
    const s1 = {};
    st.base(s1, []);
    st.base(s1, ['join']);
    expect(st.stamp('join', true)).toBe(true);
  });
  it('nhập save (đối tượng save mới) đặt lại mốc: không đóng dấu hàng loạt', async () => {
    const { stamper } = await import('../src/learn');
    const st = stamper();
    st.base({}, []);
    st.base({}, ['select', 'where']);
    expect(st.stamp('select', true)).toBe(false);
  });
});
