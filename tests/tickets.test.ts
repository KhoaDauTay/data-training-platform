import { describe, expect, it } from 'vitest';
import { parseTicket, textOf } from '../src/tickets';

const NORMAL = `---
id: ch1-02
chapter: 1
title: Cảng châu Âu
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
---
Lọc giúp mình các cảng ở \`Europe\`.

Dòng thứ hai.

## Hints
1. Gợi ý một
2. Gợi ý hai
3. Gợi ý ba

## Solution
\`\`\`sql
SELECT code FROM ports WHERE region = 'Europe'
\`\`\`
`;

const BOSS = `---
id: ch1-05
chapter: 1
title: Lô đi Rotterdam
from: { name: Trần An, dept: Management }
difficulty: 2
beat: boss
requires: [where]
grants: []
tables: [shipments]
ordered: true
conclusion:
  question: Lọc theo cột nào?
  options: [status, eta]
  answer: 0
---
Mở đầu.

## Step 1: Đang trên đường
Liệt kê lô.
\`\`\`sql
SELECT ref FROM shipments WHERE status = 'IN_TRANSIT'
\`\`\`

## Step 2: Sắp cập cảng
Thêm điều kiện.
\`\`\`sql
SELECT ref FROM shipments WHERE status = 'IN_TRANSIT' AND eta < '2026-11-15'
\`\`\`

## Hints
1. a
2. b
3. c
`;

/** NORMAL + title_en, columns, "## Task" and an EN block. */
const NORMAL_BI = NORMAL
  .replace('title: Cảng châu Âu\n', 'title: Cảng châu Âu\ntitle_en: European ports\ncolumns: [{ vi: "Cảng", en: "Port" }]\n')
  .replace('Dòng thứ hai.\n', 'Dòng thứ hai.\n\n## Task\nLấy mã cảng.\n') + `
# EN
Please list the ports in \`Europe\`.

## Task
Return the port codes.

## Hints
1. Hint one
2. Hint two
3. Hint three
`;

const BOSS_BI = BOSS
  .replace('title: Lô đi Rotterdam\n', 'title: Lô đi Rotterdam\ntitle_en: Shipments to Rotterdam\ncolumns: [[{ vi: "Mã lô", en: "Ref" }], [{ vi: "Mã lô", en: "Ref" }]]\n')
  .replace('  answer: 0\n', '  answer: 0\nconclusion_en:\n  question: Which column do you filter on?\n  options: [status, eta]\n') + `
# EN
Intro.

## Step 1: In transit
List the shipments.

## Step 2: Arriving soon
Add a condition.

## Hints
1. a
2. b
3. c
`;

/** NORMAL with {{region}} templates and two variants. */
const VARIANT = NORMAL
  .replace('tables: [ports]\n', 'tables: [ports]\nvariants:\n  - { region: Europe }\n  - { region: Asia }\n')
  .replace('`Europe`', '`{{region}}`')
  .replace("region = 'Europe'", "region = '{{region}}'");

describe('parseTicket', () => {
  it('ticket thường', () => {
    const t = parseTicket(NORMAL, 'x.md');
    expect(t).toMatchObject({
      id: 'ch1-02', chapter: 1, title: 'Cảng châu Âu', from: { name: 'Hoàng Khánh', dept: 'Ops' },
      difficulty: 1, beat: 'develop', requires: ['select'], grants: ['where'], tables: ['ports'], ordered: false,
      hints: ['Gợi ý một', 'Gợi ý hai', 'Gợi ý ba'], task: '',
    });
    expect(t.body).toBe('Lọc giúp mình các cảng ở `Europe`.\n\nDòng thứ hai.');
    expect(t.steps).toEqual([{ title: '', prompt: '', solution: "SELECT code FROM ports WHERE region = 'Europe'" }]);
    expect(t.conclusion).toBeUndefined();
    expect(t.en).toBeUndefined();
  });

  it('boss ticket có nhiều bước và kết luận', () => {
    const t = parseTicket(BOSS, 'b.md');
    expect(t.ordered).toBe(true);
    expect(t.steps.map((s) => s.title)).toEqual(['Đang trên đường', 'Sắp cập cảng']);
    expect(t.steps[1].prompt).toBe('Thêm điều kiện.');
    expect(t.conclusion).toEqual({ question: 'Lọc theo cột nào?', options: ['status', 'eta'], answer: 0 });
  });

  it('chấp nhận xuống dòng CRLF', () => {
    expect(parseTicket(NORMAL.replace(/\n/g, '\r\n'), 'crlf.md').hints).toHaveLength(3);
    expect(parseTicket(NORMAL_BI.replace(/\n/g, '\r\n'), 'crlf.md').en?.hints).toHaveLength(3);
  });

  it('báo lỗi khi thiếu frontmatter, thiếu solution, sai beat, boss thiếu kết luận, mục lạ', () => {
    expect(() => parseTicket('no frontmatter', 'a.md')).toThrow(/a\.md/);
    expect(() => parseTicket(NORMAL.replace(/## Solution[\s\S]*$/, ''), 'b.md')).toThrow(/b\.md/);
    expect(() => parseTicket(NORMAL.replace('beat: develop', 'beat: party'), 'c.md')).toThrow(/beat/);
    expect(() => parseTicket(BOSS.replace(/conclusion:[\s\S]*?answer: 0\n/, ''), 'd.md')).toThrow(/conclusion/);
    expect(() => parseTicket(NORMAL.replace('3. Gợi ý ba\n', ''), 'e.md')).toThrow(/3 hints/);
    expect(() => parseTicket(NORMAL.replace('## Hints', '## Gợi ý'), 'f.md')).toThrow(/mục lạ/);
  });
});

describe('song ngữ (# EN), ## Task, columns, starter', () => {
  it('ticket thường: VI ở trường gốc, EN trong en', () => {
    const t = parseTicket(NORMAL_BI, 'bi.md');
    expect(t.body).toBe('Lọc giúp mình các cảng ở `Europe`.\n\nDòng thứ hai.');
    expect(t.task).toBe('Lấy mã cảng.');
    expect(t.steps[0].columns).toEqual([{ vi: 'Cảng', en: 'Port' }]);
    expect(t.en).toEqual({
      title: 'European ports', body: 'Please list the ports in `Europe`.', task: 'Return the port codes.',
      hints: ['Hint one', 'Hint two', 'Hint three'], steps: [{ title: '', prompt: '' }],
    });
  });

  it('textOf: EN có thì dùng EN; thiếu EN thì trả VI và fallback', () => {
    const bi = parseTicket(NORMAL_BI, 'bi.md');
    expect(textOf(bi, 'en')).toMatchObject({ title: 'European ports', task: 'Return the port codes.', fallback: false });
    expect(textOf(bi, 'vi')).toMatchObject({ title: 'Cảng châu Âu', task: 'Lấy mã cảng.', fallback: false });
    expect(textOf(parseTicket(NORMAL, 'x.md'), 'en')).toMatchObject({ title: 'Cảng châu Âu', fallback: true });
  });

  it('boss: EN có cùng các bước, conclusion_en dùng chung answer', () => {
    const t = parseTicket(BOSS_BI, 'boss.md');
    expect(t.steps.map((s) => s.columns)).toEqual([[{ vi: 'Mã lô', en: 'Ref' }], [{ vi: 'Mã lô', en: 'Ref' }]]);
    expect(t.en?.steps).toEqual([{ title: 'In transit', prompt: 'List the shipments.' }, { title: 'Arriving soon', prompt: 'Add a condition.' }]);
    expect(textOf(t, 'en').conclusion).toEqual({ question: 'Which column do you filter on?', options: ['status', 'eta'] });
    expect(textOf(t, 'vi').conclusion).toEqual({ question: 'Lọc theo cột nào?', options: ['status', 'eta'] });
  });

  it('starter là chuỗi SQL', () => {
    const teach = NORMAL.replace('beat: develop', 'beat: teach').replace('tables: [ports]\n', 'tables: [ports]\nstarter: SELECT * FROM ports\n');
    expect(parseTicket(teach, 't.md').starter).toBe('SELECT * FROM ports');
    expect(() => parseTicket(teach.replace('starter: SELECT * FROM ports', 'starter: [1]'), 'd.md')).toThrow(/starter/);
  });

  it('báo lỗi định dạng song ngữ và columns', () => {
    const bad = (src: string) => () => parseTicket(src, 'bad.md');
    expect(bad(`${NORMAL_BI}\n# EN\nx\n`)).toThrow(/một khối/);
    expect(bad(NORMAL_BI.replace('3. Hint three\n', '3. Hint three\n\n## Solution\n```sql\nSELECT 1\n```\n'))).toThrow(/SQL dùng chung/);
    expect(bad(NORMAL_BI.replace('3. Hint three\n', ''))).toThrow(/EN cần đúng 3 hints/);
    expect(bad(NORMAL_BI.replace('title_en: European ports\n', ''))).toThrow(/title_en/);
    expect(bad(NORMAL_BI.replace('## Task\nReturn the port codes.\n', ''))).toThrow(/Task/);
    expect(bad(NORMAL.replace('title: Cảng châu Âu\n', 'title: Cảng châu Âu\ntitle_en: x\n'))).toThrow(/# EN/);
    expect(bad(BOSS_BI.replace('## Step 2: Arriving soon\nAdd a condition.\n', ''))).toThrow(/Step N/);
    expect(bad(BOSS_BI.replace(/(conclusion_en:\n.*\n  options:) \[status, eta\]/, '$1 [status]'))).toThrow(/conclusion_en/);
    const boss2 = 'columns: [[{ vi: "Mã lô", en: "Ref" }], [{ vi: "Mã lô", en: "Ref" }]]';
    const normal1 = 'columns: [{ vi: "Cảng", en: "Port" }]';
    expect(bad(BOSS_BI.replace(boss2, 'columns: [[{ vi: "Mã lô", en: "Ref" }]]'))).toThrow(/columns/);
    expect(bad(NORMAL_BI.replace(normal1, 'columns: port'))).toThrow(/columns/);
    // L25: plain string labels, a missing or blank `en` are rejected
    expect(bad(NORMAL_BI.replace(normal1, 'columns: [port]'))).toThrow(/\{ vi, en \}/);
    expect(bad(NORMAL_BI.replace(normal1, 'columns: [{ vi: "Cảng" }]'))).toThrow(/\{ vi, en \}/);
    expect(bad(NORMAL_BI.replace(normal1, 'columns: [{ vi: "Cảng", en: " " }]'))).toThrow(/\{ vi, en \}/);
  });
});

describe('variants', () => {
  it('đọc biến thể; giá trị số thành chuỗi', () => {
    expect(parseTicket(VARIANT, 'v.md').variants).toEqual([{ region: 'Europe' }, { region: 'Asia' }]);
    const numeric = VARIANT.replace('{ region: Europe }', '{ region: 2026 }');
    expect(parseTicket(numeric, 'v.md').variants?.[0]).toEqual({ region: '2026' });
  });

  it('báo lỗi biến thể', () => {
    const bad = (src: string) => () => parseTicket(src, 'v.md');
    expect(bad(VARIANT.replace('  - { region: Asia }\n', ''))).toThrow(/2–4/);
    expect(bad(VARIANT.replace('{ region: Asia }', '{ area: Asia }'))).toThrow(/variants\[1\].*region/);
    expect(bad(VARIANT.replace('{ region: Asia }', '{ region: Asia, extra: x }'))).toThrow(/variants\[1\]/);
    expect(bad(VARIANT.replace('{ region: Asia }', `{ region: "Asia'" }`))).toThrow(/variants\[1\]\.region/);
    expect(bad(VARIANT.replace(/variants:\n(.*\n){2}/, ''))).toThrow(/\{\{region\}\} nhưng không có variants/);
    expect(bad(BOSS.replace('ordered: true\n', 'ordered: true\nvariants:\n  - { a: x }\n  - { a: y }\n'))).toThrow(/boss không có variants/);
  });

  it('khóa biến thể so theo từng tên, không theo chuỗi ghép (khóa YAML có dấu phẩy không lọt)', () => {
    const two = VARIANT
      .replace("region = '{{region}}'", "region = '{{region}}' AND '{{zone}}' <> ''")
      .replace('  - { region: Europe }\n  - { region: Asia }\n', '  - { region: Europe, zone: x }\n  - { "region,zone": y }\n');
    expect(() => parseTicket(two, 'v.md')).toThrow(/variants\[1\] phải có đúng các khóa/);
  });

  it('các biến thể phải khác nhau từng đôi', () => {
    const dup = VARIANT.replace('{ region: Asia }', '{ region: Europe }');
    expect(() => parseTicket(dup, 'v.md')).toThrow(/variants\[1\] trùng variants\[0\]/);
    const typed = VARIANT.replace('{ region: Europe }', '{ region: 2026 }').replace('{ region: Asia }', '{ region: "2026" }');
    expect(() => parseTicket(typed, 'v.md')).toThrow(/variants\[1\] trùng variants\[0\]/); // same SQL once rendered
  });
});
