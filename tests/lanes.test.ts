import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { LANE_TABLES, laneLabel, laneProblems, laneTables, laneTaskState, parseLaneBriefs as briefsOf, shown } from '../src/lanes';
import { parse as parseYaml } from 'yaml';
const parseLaneBriefs = (src: string, origin?: string) => briefsOf(parseYaml(src), origin); // V22-E: the parser takes parsed YAML
import { nextTicket } from '../src/progress';
import { parseTicket as ticketOf, type Ticket } from '../src/tickets';
import { mdData } from '../scripts/contentJson.mjs';
// V22-E: parseTicket takes the build's { fm, body }; these tests keep writing markdown.
const parseTicket = (src: string, origin: string) => ticketOf(mdData(src), origin);

const story = loadTickets();
const BRIEF = `
- port: NLRTM
  country: { vi: Hà Lan, en: Netherlands }
  intro: { vi: a, en: a }
  numbers:
    - { value: "~30", text: { vi: ngày, en: days } }
    - { value: "+40%", text: { vi: giá mua, en: buy rate }, after: 7 }
  facts:
    - { label: { vi: Hàng, en: Cargo }, text: { vi: dệt may, en: textiles } }
  asked: { vi: hỏi, en: asked }
`;
const task = (id: string, extra: Partial<Ticket> = {}): Ticket => ({
  id, chapter: 2, title: id, from: { name: 'Đặng Hà', dept: 'Sales' }, difficulty: 2, beat: 'rest', requires: ['aggregate'], grants: [],
  tables: ['shipments'], ordered: true, body: '', task: '', hints: [], steps: [{ title: '', prompt: '', solution: 'SELECT 1' }], lane: 'NLRTM', ...extra,
});

describe('bài tuyến: luật mở và luật nội dung (src/lanes.ts)', () => {
  it('đọc hồ sơ tuyến; mục có after chỉ hiện khi đã qua chương đó (L49: +40% chờ ch7)', () => {
    const [b] = parseLaneBriefs(BRIEF);
    expect(b.port).toBe('NLRTM');
    expect(b.numbers.filter((x) => shown(x, new Set([1, 2, 3]))).map((x) => x.value)).toEqual(['~30']);
    expect(b.numbers.filter((x) => shown(x, new Set([7]))).map((x) => x.value)).toEqual(['~30', '+40%']);
    expect(() => parseLaneBriefs(BRIEF.replace('NLRTM', 'XXXXX'))).toThrow(/port/);
    expect(() => parseLaneBriefs(BRIEF.replace('{ label: { vi: Hàng, en: Cargo },', '{ label: { vi: Hàng },'))).toThrow(/label/);
  });

  it('mở khi tuyến đã mở VÀ đã qua đánh giá chương của bài; đã xong thì luôn "done"', () => {
    const r1 = task('r-1');
    expect(laneTaskState(r1, new Set(['NLRTM']), new Set([1, 2]), [])).toBe('open');
    expect(laneTaskState(r1, new Set(['NLRTM']), new Set([1]), [])).toBe('locked'); // a ship opened the lane early (L32)
    expect(laneTaskState(r1, new Set(), new Set([1, 2]), [])).toBe('locked');
    expect(laneTaskState(r1, new Set(), new Set(), ['r-1'])).toBe('done');
    expect(laneLabel(r1)).toBe('R-1');
  });

  it('bảng của tuyến chỉ hiện khi tuyến mở (D-B4)', () => {
    expect(laneTables(['NLRTM'])).toEqual([]);
    expect(laneTables(['SGSIN', 'AUSYD']).sort()).toEqual(['bunker_prices', 'lane_profiles']);
    expect(Object.values(LANE_TABLES).flat().every((x) => !story.some((t) => t.tables.includes(x)))).toBe(true); // story never uses them
  });

  it('laneProblems: kỹ năng chưa dạy, bảng chưa mở, mở trước tuyến, dạy kỹ năng, trùng id, thiếu hồ sơ', () => {
    const briefs = parseLaneBriefs(BRIEF);
    expect(laneProblems([task('r-1')], briefs, story)).toEqual([]);
    const bad = [
      task('r-2', { requires: ['join'] }),
      task('r-3', { tables: ['rate_contracts'] }),
      task('r-4', { chapter: 1 }),
      task('r-5', { grants: ['join'] }),
      task('ch1-01'),
      task('sg-1', { lane: 'SGSIN', chapter: 3, requires: [] }),
    ];
    const p = laneProblems(bad, briefs, story).join('\n');
    expect(p).toMatch(/r-2: cần kỹ năng "join"/);
    expect(p).toMatch(/r-3: dùng bảng "rate_contracts"/);
    expect(p).toMatch(/r-4: mở trước khi tuyến Rotterdam mở/);
    expect(p).toMatch(/r-5: bài tuyến không dạy kỹ năng/);
    expect(p).toMatch(/ch1-01: trùng id/);
    expect(p).toMatch(/sg-1: tuyến SGSIN chưa có hồ sơ/);
  });

  it('lane: trong frontmatter phải là mã cảng; ticket chính không có lane và nextTicket không bao giờ là bài tuyến', () => {
    const src = '---\nid: x\nchapter: 2\ntitle: x\nfrom: { name: A, dept: Ops }\ndifficulty: 1\nbeat: rest\nlane: {{L}}\n---\nx\n\n## Hints\n1. a\n2. b\n3. c\n\n## Solution\n```sql\nSELECT 1\n```\n';
    expect(parseTicket(src.replace('{{L}}', 'NLRTM'), 'x.md').lane).toBe('NLRTM');
    expect(() => parseTicket(src.replace('{{L}}', 'rotterdam'), 'x.md')).toThrow(/x\.md: lane/);
    expect(story.filter((t) => t.lane)).toEqual([]);
    expect(nextTicket(story, new Set(story.map((t) => t.id)))).toBeUndefined();
  });
});

/** Plan 5 lane content (content/lanes/): the same release rules as story tickets (tests/content.test.ts), on their own list. */
describe('nội dung bài tuyến đợt 1 (Rotterdam, Singapore, Sydney)', async () => {
  const { loadLanes } = await import('../src/content');
  const { CHAPTER_TABLES } = await import('../src/progress');
  const { personOf } = await import('../src/people');
  const { textOf } = await import('../src/tickets');
  const { runner } = await import('./helpers');
  const briefsYml = (await import('../content/lanes/lanes.yml?raw')).default;
  const { tasks, briefs } = loadLanes();
  const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|BOOKED|IN_TRANSIT|ARRIVED|DELIVERED|CANCELLED|EXPORT|IMPORT|SEA|AIR)\b|\b[a-z]+_[a-z_]+\b/g;
  const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
  const ALL = [...Object.values(CHAPTER_TABLES).flat(), ...Object.values(LANE_TABLES).flat()];
  const tablesIn = (sql: string): string[] =>
    [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => ALL.includes(x));
  const prompt = (t: Ticket, lang: 'vi' | 'en'): string => { const x = textOf(t, lang); return [x.body, x.task].join('\n'); };
  const allText = (t: Ticket, lang: 'vi' | 'en'): string => { const x = textOf(t, lang); return [x.title, x.body, x.task, ...x.hints].join('\n'); };

  it('9 bài tuyến cho 3 tuyến, mỗi tuyến có hồ sơ; không lỗi luật mở (kỹ năng, bảng, chương, id)', () => {
    expect(tasks.map((t) => t.id).sort()).toEqual(['r-1', 'r-2', 'r-3', 's-1', 's-2', 's-3', 'sg-1', 'sg-2', 'sg-3']);
    expect(briefs.map((b) => b.port).sort()).toEqual(['AUSYD', 'NLRTM', 'SGSIN']);
    expect(laneProblems(tasks, briefs, story)).toEqual([]);
    expect(tasks.filter((t) => !t.lane || t.variants || t.beat !== 'rest').map((t) => t.id)).toEqual([]); // no Practice deck, so no variants (D-B5)
    expect(tasks.filter((t) => personOf(t.from.name)?.dept !== t.from.dept).map((t) => t.id)).toEqual([]);
  });

  it('L49: cảng gốc là Tiên Sa, không còn chữ Cát Lái; người gửi R-2 là Đặng Hà (Sales)', () => {
    const texts = [briefsYml, ...tasks.flatMap((t) => [allText(t, 'vi'), allText(t, 'en')])].join('\n');
    expect(texts).not.toMatch(/c[áa]t\s*l[áa]i/i);
    for (const b of briefs) expect(JSON.stringify(b)).toMatch(/Tiên Sa.*Tien Sa/s); // VI and EN both name the hub
    expect(tasks.find((t) => t.id === 'r-2')!.from).toEqual({ name: 'Đặng Hà', dept: 'Sales' });
  });

  it('L49: R-3 mở sau chương 7; trước đó hồ sơ Rotterdam không lộ "+40%" hay chi tiết tăng giá', () => {
    expect(tasks.find((t) => t.id === 'r-3')!.chapter).toBe(7);
    const b = briefs.find((x) => x.port === 'NLRTM')!;
    const visible = (passed: Set<number>, lang: 'vi' | 'en') => [b.intro[lang], b.asked[lang],
      ...b.numbers.filter((x) => shown(x, passed)).flatMap((x) => [x.value ?? '', x.text[lang]]),
      ...b.facts.filter((x) => shown(x, passed)).flatMap((x) => [x.label?.[lang] ?? '', x.text[lang]])].join('\n');
    const RISE = /40\s*%|GRI|tăng giá|rate (rise|increase)/i;
    for (const lang of ['vi', 'en'] as const) {
      expect(visible(new Set([1, 2, 3, 4, 5, 6]), lang)).not.toMatch(RISE);
      expect(visible(new Set([1, 2, 3, 4, 5, 6, 7]), lang)).toMatch(RISE);
    }
  });

  it('hồ sơ tuyến: EN không dấu tiếng Việt', () => {
    const en = briefs.flatMap((b) => [b.country.en, b.intro.en, b.asked.en, ...[...b.numbers, ...b.facts].flatMap((x) => [x.text.en, x.label?.en ?? ''])]);
    expect(en.join('\n')).not.toMatch(VI_DIACRITIC);
  });

  it.each(tasks)('$id: song ngữ, code span VI = EN, EN không dấu, đề không có backtick / từ khóa SQL / tên cột', (t) => {
    expect(t.en).toBeDefined();
    expect(codeSpans(allText(t, 'en'))).toEqual(codeSpans(allText(t, 'vi')));
    expect(allText(t, 'en').replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    for (const lang of ['vi', 'en'] as const) {
      expect(prompt(t, lang)).not.toContain('`');
      expect(prompt(t, lang).match(SQLISH)).toBeNull();
    }
  });

  it.each(tasks)('$id: Solution chạy được, có dòng, đủ nhãn cột, ORDER BY khi ordered, chỉ dùng bảng đã khai', async (t) => {
    const sql = t.steps[0].solution;
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
    if (t.ordered) expect(sql).toMatch(/order\s+by/i);
    expect(tablesIn(sql).filter((x) => !t.tables.includes(x))).toEqual([]);
    const r = await (await runner())(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.steps[0].columns?.length).toBe(r.columns.length);
    for (const label of t.steps[0].columns ?? []) {
      expect(label.en).not.toMatch(VI_DIACRITIC);
      expect(r.columns).not.toContain(label.vi);
    }
  });
});
