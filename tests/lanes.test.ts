import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { LANE_TABLES, laneLabel, laneProblems, laneTables, laneTaskState, parseLaneBriefs, shown } from '../src/lanes';
import { nextTicket } from '../src/progress';
import { parseTicket, type Ticket } from '../src/tickets';

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
