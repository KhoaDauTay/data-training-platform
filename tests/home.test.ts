import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { chapterOfId, homeModel, KPIS, kpiTiles, kpiValue, LEVELS, parseKpis, type Kpi } from '../src/home';
import { CHAPTERS, SKILLS } from '../src/progress';
import { upsert } from '../src/registry';

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

describe('Bảng điều hành KPI (L18 ★5, L23)', () => {
  const res = (rows: unknown[][]) => ({ columns: (rows[0] ?? []).map((_, i) => `c${i}`), types: [], rows });
  const kpi = (kind: Kpi['kind'], col = 0): Kpi => ({ id: 'x', ticket: 'ch2-01', step: 0, col, kind, label: { vi: 'a', en: 'a' } });

  it('ô chỉ mở khi xong đúng việc tính ra nó; ô của chương chưa có nội dung luôn khóa', () => {
    const tiles = kpiTiles(KPIS, tickets, new Set([...ids(1), ...ids(2)]));
    const by = (id: string) => tiles.find((x) => x.kpi.id === id)!;
    expect(by('shipments2025')).toMatchObject({ open: true, ticket: { id: 'ch2-01' } });
    expect(by('teuByCarrier')).toMatchObject({ open: false, ticket: { id: 'ch3-02' } });
    expect(by('q3margin')).toMatchObject({ open: false, ticket: undefined });
    expect(chapterOfId('ch12-06')).toBe(12);
    expect(KPIS[KPIS.length - 1].id).toBe('q3margin');
    expect(new Set(KPIS.map((k) => k.id)).size).toBe(KPIS.length);
  });

  it('ô trỏ tới bước không có của ticket bị bỏ qua (Trang chủ không throw)', () => {
    expect(kpiTiles([{ ...kpi('number'), step: 99 }], tickets, new Set())).toEqual([]);
  });

  it('mọi ô trỏ tới ticket có thật, hoặc tới chương chưa có ticket nào', () => {
    const chapters = new Set(tickets.map((t) => t.chapter));
    const bad = KPIS.filter((k) => !tickets.some((t) => t.id === k.ticket) && chapters.has(chapterOfId(k.ticket)));
    expect(bad).toEqual([]);
  });

  it('kpiValue: số theo locale, đếm dòng, 5 thanh lớn nhất', () => {
    expect(kpiValue(kpi('number'), res([[9694, '123.5']]), 'vi')).toEqual({ text: '9.694' });
    expect(kpiValue(kpi('number', 1), res([[9694, '1234567.5']]), 'en')).toEqual({ text: '1,234,567.5' });
    expect(kpiValue(kpi('rowcount'), res([[1], [2], [3]]), 'en')).toEqual({ text: '3' });
    const bars = kpiValue(kpi('bar'), res([['SEA', 'EXPORT', 5], ['AIR', 'IMPORT', 9], ['A', 'B', 1], ['C', 'D', 2], ['E', 'F', 3], ['G', 'H', 4]]), 'en');
    expect(bars).toEqual({ bars: [
      { label: 'AIR · IMPORT', value: 9, text: '9' }, { label: 'SEA · EXPORT', value: 5, text: '5' }, { label: 'G · H', value: 4, text: '4' },
      { label: 'E · F', value: 3, text: '3' }, { label: 'C · D', value: 2, text: '2' },
    ] });
  });

  it('parseKpis báo lỗi cấu trúc', () => {
    expect(parseKpis('- { id: a, ticket: ch1-01, kind: rowcount, label: { vi: "a", en: "b" } }')[0]).toMatchObject({ step: 0, col: 0 });
    expect(() => parseKpis('- { id: a, ticket: ch1-01, kind: pie, label: { vi: "a", en: "b" } }')).toThrow(/kind/);
    expect(() => parseKpis('- { id: a, ticket: ch1-01, kind: bar }')).toThrow(/label/);
    expect(() => parseKpis('id: a')).toThrow(/danh sách/);
  });
});

describe('upsert (đăng ký mục Trang chủ, chế độ, menu)', () => {
  it('cùng id thay mục cũ; danh sách luôn sắp theo order', () => {
    const list: { id: string; order: number; v?: number }[] = [];
    upsert(list, { id: 'b', order: 20 });
    upsert(list, { id: 'a', order: 10 });
    upsert(list, { id: 'b', order: 5, v: 2 });
    expect(list).toEqual([{ id: 'b', order: 5, v: 2 }, { id: 'a', order: 10 }]);
  });
});
