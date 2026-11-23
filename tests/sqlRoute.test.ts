import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { generalNow, loadLessons, loadTickets } from '../src/content';
import { knownSkills } from '../src/home';
import { placementItems } from '../src/learn';
import { ALL_PARTS, BOOT_SKILL_IDS, GENERAL_SKILLS, moduleTitle, partOf, PARTS, parseRoute, ROUTE_SKILLS, SKILLS } from '../src/progress';
import { parseSave, type Known } from '../src/save';
import { fullLessons, lessonIdOf } from '../src/generalLessonSources';
import { parseFullLesson } from '../src/fullLesson';
import routeRaw from '../content/general/route.yml?raw';
import sqlYml from '../content/general/sql.yml?raw';

/** v24 R0 (product-route-v24 §1.1, §3.1–3.2, §4 R0; L335–L336): the General route's Parts, read in a new order. */
const g = generalNow()!;
const fixtures = import.meta.glob('./fixtures/save-v*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/**
 * A construct a skill of Part n needs, by the first Part that teaches it (§1.1 order). Literals and comments are blanked first.
 * FILTER counts as Part 4 (`conditional_agg`); `count(col)` skipping NULLs is Part 2's `aggregate`.
 */
const RULES: [number, RegExp][] = [
  [11, /\bEXPLAIN\b|\bCREATE\s+INDEX\b/i],
  [10, /\bOVER\s*\(/i],
  [9, /\b(INSERT|UPDATE|DELETE|MERGE)\b|\bON\s+CONFLICT\b/i],
  [8, /\bUNION\b|\bEXCEPT\b|\bINTERSECT\b|\bFULL\s+(OUTER\s+)?JOIN\b/i],
  [7, /\bWITH\b\s+\w+\s+AS\s*\(|\bDISTINCT\s+ON\b/i],
  [6, /\(\s*SELECT\b|\bEXISTS\b|\b(ANY|ALL)\s*\(/i],
  [5, /\bJOIN\b/i],
  [4, /\bIS\s+(NOT\s+)?NULL\b|\bCOALESCE\b|\bCASE\b|\bFILTER\s*\(|\bNULLIF\b/i],
  [3, /\bI?LIKE\b|::|\bCAST\s*\(|\b(date_trunc|extract|date_part|to_char|lower|upper|trim|btrim|split_part|substring|substr|length|concat|replace|left|right|initcap)\s*\(|\binterval\b|\|\|/i],
  [2, /\b(count|sum|avg|min|max)\s*\(|\bGROUP\s+BY\b|\bHAVING\b|\bDISTINCT\b/i],
];
const code = (sql: string): string => sql.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""').replace(/--[^\n]*/g, '');
/** Parts above `part` whose construct `sql` uses, minus what `given` (a starter the player is handed) already shows. */
const later = (sql: string, part: number, given = ''): number[] =>
  RULES.filter(([q, re]) => q > part && re.test(code(sql)) && !(given && re.test(code(given)))).map(([q]) => q);

describe('route.yml: 11 Phần theo thứ tự mới (L335)', () => {
  it('11 Phần, n = 1..11, mỗi kỹ năng đúng một Phần; 38 kỹ năng đã có + 2 kỹ năng chỉ General (R1) + 3 của R2', () => {
    expect(ALL_PARTS.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const ids = ALL_PARTS.flatMap((p) => p.skills);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of ROUTE_SKILLS) expect([s.id, partOf(s.id) !== undefined]).toEqual([s.id, true]);
    expect(ids.filter((id) => !ROUTE_SKILLS.some((s) => s.id === id)).sort()).toEqual(['insert_select', 'update_join', 'upsert']);
    expect(GENERAL_SKILLS.map((s) => s.id)).toEqual(['cross_join', 'any_all']); // v25 R1 (R2 adds Part 9)
  });

  it('Phần vẽ ra: chỉ kỹ năng đã có; Phần 9 ẩn tới R2 (L336); tên Phần từ route.yml, không từ chapters.yml', () => {
    expect(PARTS.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 10, 11]);
    expect(PARTS.flatMap((p) => p.skills)).toHaveLength(40); // v25 R1: + cross_join, any_all
    expect(moduleTitle(3, 'vi')).toBe('Chữ, ngày và kiểu');
    expect(moduleTitle(9, 'en')).toBe('Writing data');
    expect(partOf('cast')).toBe(3);
    expect(partOf('distinct')).toBe(2);
  });

  it('parseRoute từ chối n sai, kỹ năng ở hai Phần, thiếu tiêu đề', () => {
    const ok = parseYaml(routeRaw) as Record<string, unknown>[];
    expect(parseRoute(ok)).toHaveLength(11);
    expect(() => parseRoute(ok.slice(1))).toThrow(/n = 1/);
    expect(() => parseRoute([{ ...ok[0] }, { ...ok[1], skills: ['select'] }])).toThrow(/hai Phần/);
    expect(() => parseRoute([{ n: 1, title: { vi: 'x' }, skills: [] }])).toThrow(/title/);
  });

  it('kiểm tra đầu vào: một drill mỗi Phần, theo Phần mới', () => {
    const items = placementItems(PARTS, g, new Set());
    expect(items).toHaveLength(PARTS.length);
    PARTS.forEach((p, i) => expect(items[i].skills).toEqual(p.skills));
  });
});

describe('thứ tự tiên quyết (product §1.1 thành test, L336)', () => {
  it('0 drill kỹ năng dùng cấu trúc của Phần sau (Solution và starter)', () => {
    const bad = g.drills.filter((d) => d.skill).flatMap((d) => [d.solution, d.starter ?? ''].flatMap((sql) => later(sql, partOf(d.skill!)!).map((q) => `${d.id} → Phần ${q}`)));
    expect(bad).toEqual([]);
  });

  it('bảy drill viết lại giữ id và loại', () => {
    const want = { 'g-date-math-4': 'review', 'g-coalesce-1': 'faded', 'g-string-fn-2': 'open', 'g-distinct-3': 'trap', 'g-cast-1': 'faded', 'g-cast-2': 'open', 'g-cast-3': 'trap' };
    for (const [id, kind] of Object.entries(want)) expect([id, g.byId.get(id)?.kind]).toEqual([id, kind]);
    expect(sqlYml.match(/^- id: g-/gm)).toHaveLength(152);
  });

  it('bài nhanh: lời giải "Thử ngay" chỉ dùng Phần của nó, trừ khung starter đưa sẵn', () => {
    const bad = [...loadLessons().values()].filter((l) => partOf(l.id)).flatMap((l) => later(l.try.solution, partOf(l.id)!, l.try.starter).map((q) => `${l.id} → Phần ${q}`));
    expect(bad).toEqual([]);
  });

  it('bài đầy đủ: mọi SQL (ví dụ, bẫy) chỉ dùng Phần của nó', async () => {
    for (const [path, load] of Object.entries(fullLessons)) {
      const l = parseFullLesson(await load(), path);
      const sqls = [...l.examples.map((e) => e.sql), ...l.pitfalls.flatMap((p) => [p.wrong, p.fix])];
      expect([l.id, sqls.flatMap((s) => later(s, partOf(l.id)!))]).toEqual([l.id, []]);
    }
  });
});

describe('giữ tiến độ (product §3.2, L327)', () => {
  const tickets = loadTickets('logistics');
  const known: Known = { ticketIds: new Set(tickets.map((t) => t.id)), laneIds: new Set(), skills: new Set(BOOT_SKILL_IDS) };

  it('Known.skills lúc boot = skills.yml + mọi id trong route.yml', () => {
    expect(BOOT_SKILL_IDS).toHaveLength(43);
    for (const s of SKILLS) expect(BOOT_SKILL_IDS).toContain(s.id);
  });

  it('thẻ ôn của một kỹ năng chưa có nội dung (upsert) sống qua parseSave', () => {
    const v5 = JSON.parse(fixtures['./fixtures/save-v5.json']);
    v5.review = { ...v5.review, upsert: { box: 3, due: '2026-11-20' } };
    expect(parseSave(JSON.stringify(v5), known).review.upsert).toEqual({ box: 3, due: '2026-11-20' });
  });

  it('fixture v1–v5 đọc được với Known mới; knownSkills của save-v5 không đổi', () => {
    for (const raw of Object.values(fixtures)) expect(() => parseSave(raw, known)).not.toThrow();
    const s5 = parseSave(fixtures['./fixtures/save-v5.json'], known);
    const old: Known = { ...known, skills: new Set(SKILLS.map((s) => s.id)) };
    const before = parseSave(fixtures['./fixtures/save-v5.json'], old);
    expect(s5).toEqual(before);
    const ids = SKILLS.map((s) => s.id);
    expect([...knownSkills(s5, tickets, ids)].sort()).toEqual([...knownSkills(before, tickets, ids)].sort());
  });

  it('mỗi file bài đầy đủ mang tên một kỹ năng của lộ trình', () => {
    for (const path of Object.keys(fullLessons)) expect(ROUTE_SKILLS.map((s) => s.id)).toContain(lessonIdOf(path));
  });
});
