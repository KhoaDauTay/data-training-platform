// v39 figure system (F1/F4, L600–L609; tools/v39/svg-system.md §8): every figure spec in content/figures is laid out by the
// shipped builder (src/engine/viz/figure.ts, the Nunito glyph table) at 640 / 335 / 280 units × VI / EN × every step and
// variant a lesson uses, then judged by the overlap checker's own pure rules (scripts/overlap-check.mjs analyze(), the same
// code the browser run uses): text on text, text out of its box or the viewBox, box on box, arrow through a box or a label,
// arrow tip < 2 from its target. On top, this file holds the builder's stricter promises: gaps ≥ 16 across and ≥ 36 down,
// tips ≥ 3 short, every label ≥ 13 px and ≤ 18 characters × 2 lines, tokens only, and (v42) an explanation: a point, one
// sentence per step, no data dumped into sentences, the data as generated tables. And the content links: every `figures:` name exists (a spec or a registry diagram), every spec is used.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { analyze, samplePath, type OverlapFrame } from '../scripts/overlap-check.mjs';
import { parseBestCard, type BpCard } from '../src/engine/best';
import { parseEngineLesson, type EngineLesson } from '../src/engine/content';
import type { Shape } from '../src/engine/viz/engineVizCore';
import { resolveViz } from '../src/engine/viz/engineViz';
import { altTables, altText, type FigRef, type FigSpec, layout, linkGap, MARGIN, NOTE_CH, textWidth, tr, WIDE } from '../src/engine/viz/figure';
import { GLYPHS } from '../src/engine/viz/glyphs';
import { parseFullLesson } from '../src/fullLesson';
import { fullLessons, lessonIdOf } from '../src/generalLessonSources';
import { lessonSource } from '../src/lessonSources';
import { parseLessons } from '../src/lessons';
import { VI_DIACRITIC } from './generalRules';

const specs = Object.fromEntries(Object.entries(import.meta.glob<FigSpec>('../content/figures/*.yml', { import: 'default', eager: true }))
  .map(([p, s]) => [p.replace(/^.*\/(.+)\.yml$/, '$1'), s]));
const engineFiles = import.meta.glob<string>('../content/engine/*/{L*,ext}/*.md', { query: '?raw', import: 'default', eager: true });
const engine: EngineLesson[] = Object.entries(engineFiles).map(([p, s]) => parseEngineLesson(s, p, parse));
const general = await Promise.all(Object.entries(fullLessons).map(async ([p, load]) => parseFullLesson(await load(), lessonIdOf(p))));
/** v46 (L860): quick lessons (content/lessons.yml) carry one `figure:` each, drawn with the General (`sql`) prefix. */
const quick = parseLessons(lessonSource);
const SHORT = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy', redis: 'rd', design: 'ds', stack: 'st', olap: 'ol', search: 'sr', telemetry: 'tm' } as const;
// v44 B4 (P1, L812): Best Practice cards host figures too (engineBest's FIG_TRACK)
const best = Object.entries(import.meta.glob<string>('../content/engine/best/*/*.md', { query: '?raw', import: 'default', eager: true })).map(([p, t]) => {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(t.replace(/\r\n/g, '\n'))!;
  return parseBestCard({ fm: parse(m[1]), body: m[2] }, p) as BpCard;
});
const BP_SHORT = { sql: 'sql', postgres: 'pg', mongodb: 'mg', dynamodb: 'dy' } as const;
/** Every figure reference in content: lesson id, its engine short name, the reference. */
const refs: { id: string; eng: string; f: FigRef }[] = [
  ...engine.flatMap((l) => (l.figures ?? []).map((f) => ({ id: l.id, eng: SHORT[l.engine], f }))),
  ...general.flatMap((l) => (l.figures ?? []).map((f) => ({ id: l.id, eng: 'sql', f }))),
  ...best.flatMap((c) => (c.figures ?? []).map((f) => ({ id: c.id, eng: BP_SHORT[c.track], f }))),
  ...quick.flatMap((l) => (l.figure ? [{ id: `quick:${l.id}`, eng: 'sql', f: l.figure }] : [])),
];
const specName = (r: { eng: string; f: FigRef }): string | undefined => [r.f.name, `${r.eng}-${r.f.name}`].find((n) => specs[n]);
const WIDTHS = [640, 335, 280];
const LANGS = ['vi', 'en'] as const;
/** The variants each spec is drawn with somewhere (undefined = the plain figure). */
const used = (name: string): (string | undefined)[] => [...new Set(refs.filter((r) => specName(r) === name).map((r) => r.f.variant))];

/** The checker's model of one frame, from the builder's shapes (the Node twin of readFigure in the browser). */
function model(f: { nodes: Shape[] }, W: number, H: number): OverlapFrame {
  const texts: OverlapFrame['texts'] = [], boxes: OverlapFrame['boxes'] = [], arrows: OverlapFrame['arrows'] = [];
  for (const n of f.nodes) {
    if (n.t === 't') {
      const size = n.size ?? 12.5;
      const w = textWidth(n.s, size, !!n.b, !!n.mono);
      const x = n.a === 'm' ? n.x - w / 2 : n.a === 'e' ? n.x - w : n.x;
      texts.push({ k: n.k, s: n.s, x, y: n.y - (size * 1.364) / 2, w, h: size * 1.364, size, px: size, owner: n.attrs?.['data-owner'] });
    } else if (n.t === 'r') boxes.push({ k: n.k, kind: 'rect', x: n.x, y: n.y, w: n.w, h: n.h, sw: n.bold ? 2.2 : 1.2, parent: n.attrs?.['data-parent'] }); // look()'s strokes
    else if (n.t === 'p' && n.tone) { // v40: a filled path (table cylinder, doc page) is a box to the checker, as getBBox makes it in the browser
      const pts = samplePath(n.d, 0.25);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
      boxes.push({ k: n.k, kind: 'path', x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0, sw: n.w ?? 1.4, parent: n.attrs?.['data-parent'] });
    } else if (n.t === 'p' && n.arrow) {
      const pts = samplePath(n.d);
      const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const ext = 0.75 * (n.w ?? 1.4);
      arrows.push({ k: n.k, pts, tip: [q[0] + ((q[0] - p[0]) / len) * ext, q[1] + ((q[1] - p[1]) / len) * ext], from: n.attrs?.['data-from'], to: n.attrs?.['data-to'] });
    }
  }
  return { vb: [0, 0, W, H], texts, boxes, arrows, fig: true };
}
/** A node's extent in a frame: the union of its shapes (rects and estimated text boxes). */
function extents(f: { nodes: Shape[] }): Map<string, { x0: number; y0: number; x1: number; y1: number }> {
  const out = new Map<string, { x0: number; y0: number; x1: number; y1: number }>();
  const m = model(f, 0, 0);
  const add = (k: string | undefined, x: number, y: number, w: number, h: number): void => {
    const id = /^(?:pv:)?n:([a-z0-9_-]+)/i.exec(k ?? '')?.[1]; // v44 B4 X2: a faded preview holds its node's slot too
    if (!id) return;
    const o = out.get(id);
    out.set(id, o ? { x0: Math.min(o.x0, x), y0: Math.min(o.y0, y), x1: Math.max(o.x1, x + w), y1: Math.max(o.y1, y + h) } : { x0: x, y0: y, x1: x + w, y1: y + h });
  };
  for (const b of m.boxes) add(b.k, b.x, b.y, b.w, b.h);
  for (const t of m.texts) add(t.k, t.x, t.y, t.w, t.h);
  return out;
}
const bis = (v: unknown): { vi: string; en: string }[] => (v && typeof v === 'object' ? ('vi' in v && 'en' in v ? [v as { vi: string; en: string }] : Object.values(v).flatMap(bis)) : []);
const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);

describe('v39 figures: content links', () => {
  it('có spec, mỗi spec được ít nhất một bài dùng', () => {
    expect(Object.keys(specs).length).toBeGreaterThan(0);
    const unused = Object.keys(specs).filter((n) => !refs.some((r) => specName(r) === n));
    expect(unused).toEqual([]);
  });
  it('mọi tên trong figures: là một spec hoặc một sơ đồ registry; variant và step có thật', () => {
    const bad = refs.flatMap(({ id, eng, f }) => {
      const n = specName({ eng, f });
      if (!n) return resolveViz(f.name, eng) ? [] : [`${id}: ${f.name} không có spec hay sơ đồ`];
      const s = specs[n];
      return [
        ...(f.variant && !s.variants?.[f.variant] ? [`${id}: ${n} không có variant ${f.variant}`] : []),
        ...(f.step !== undefined && f.step >= Math.max(1, s.steps?.length ?? 0) ? [`${id}: ${n} không có bước ${f.step}`] : []),
      ];
    });
    expect(bad).toEqual([]);
  });
  it('v46 (L860): bài học nhanh có hình là một spec thật (không sơ đồ registry); ≥ 35 bài có hình; cùng hình với bài đầy đủ khi bài đó có', () => {
    const withFig = quick.filter((l) => l.figure);
    expect(withFig.length).toBeGreaterThanOrEqual(35);
    expect(withFig.filter((l) => !specs[l.figure!.name]).map((l) => `${l.id}: ${l.figure!.name}`)).toEqual([]);
    const full = new Map(general.map((l) => [l.id, (l.figures ?? []).map((f) => f.name)]));
    expect(withFig.filter((l) => full.has(l.id) && (full.get(l.id) ?? []).length > 0 && !full.get(l.id)!.includes(l.figure!.name)).map((l) => l.id)).toEqual([]);
  });
  it('v42 (L696): không bài hay hình nào viết sơ đồ ER bằng ký tự (||--o{ …): vẽ bằng thực thể và chân chim', () => {
    const raw = import.meta.glob<string>(['../content/engine/**/*.md', '../content/general/**/*.md', '../content/figures/*.yml'], { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(raw).length).toBeGreaterThan(100);
    expect(Object.entries(raw).filter(([, s]) => /\|\|--|--o\{|\}o--|\|o--|--\|\{/.test(s)).map(([p]) => p)).toEqual([]);
  });
});

// v44 (L766): diagrams drawn with characters are figures now (tools/v42/diagram-plan-v42.md §2A). A ```text block in a lesson
// may not draw with box-drawing characters, arrowheads or `-->` at all, and a block of arrow lines (≥ 2 lines with -> / → / <- /
// ←) must be one of the text tables, arithmetic chains, notation and real output that stay (§2B/§2C), listed here by file and
// first line. A new one is a timeline or flow to draw as a figure, or a reviewed addition to this list.
const ARROW_TEXT_OK: Record<string, string> = {
  'design/L3/01-functional-dependency.md | X → Y     reflexivity': '2C: Armstrong axioms notation',
  'design/L3/03-closure-keys.md | 1. split right sides': '2C: minimal cover steps',
  'design/L3/04-level-check.md | R(A, B, C, D), F = {A → B': '2C: FD notation',
  'dynamodb/L1/03-no-join-limits.md | SQL                          DynamoDB': '2B: SQL → DynamoDB table',
  'dynamodb/L2/08-item-size.md | "shirt-color": "R"   -> 11 + 1': '2B: size arithmetic',
  'dynamodb/L2/10-write-cost.md | PutItem 500 B           -> 1 WCU': '2B: cost arithmetic',
  'dynamodb/L2/13-limit-filter.md | Limit 6, page 1  -> ScannedCount': '2B: page counts',
  'dynamodb/L3/01-access-patterns.md | <access pattern>': '2C: access-pattern template',
  'dynamodb/L3/01-access-patterns.md | 1. One customer profile': '2B: access patterns table',
  'dynamodb/L3/06-sparse-index.md | {"op": "UpdateItem", "input": {..., "Upd': '2C: request sketch',
  'dynamodb/L3/07-single-table.md | PK = <ENTITY>#<id>': '2C: key template',
  'dynamodb/L3/07-single-table.md | // WRONG: one table per entity': '2C: WRONG/FIX code',
  'dynamodb/L3/12-gsi-eventual.md | Query byStatus = NEW': '2B: read then strong read',
  'dynamodb/L3/13-single-vs-multi-cost.md | Shop      Query PK = CUST#C-02': '2B: cost table',
  'dynamodb/L4/03-hot-partition-math.md | 3 KB -> 4 KB = 1 RCU (strong)': '2B: rounding arithmetic',
  'dynamodb/L4/03-hot-partition-math.md | 1.5 KB -> 2 KB = 2 WCU': '2B: rounding arithmetic',
  'dynamodb/L4/03-hot-partition-math.md | Query:        40.8 KB -> 44 KB': '2B: rounding arithmetic',
  'dynamodb/L4/06-capacity-modes.md | steady 280 WCU all day': '2B: mode choice table',
  'dynamodb/L4/08-sparse-gsi.md | GSI key attributes present': '2C: rule lines',
  'mongodb/L2/17-lookup-unwind.md | $lookup                          -> 4': '2B: stage counts',
  'mongodb/L5/01-wiredtiger.md | RAM 4 GB   -> 0.5 x (4 - 1)': '2B: cache-size arithmetic',
  'postgres/L4/15-parallel-query-jit.md | Finalize Aggregate': '2C: real EXPLAIN output',
  'postgres/L4/16-capstone-slow-report.md | status MCV: {delivered,open,lost}': '2C: real pg_stats output',
};
describe('v44: no diagrams drawn with characters', () => {
  const raw = import.meta.glob<string>(['../content/engine/**/*.md', '../content/general/**/*.md'], { query: '?raw', import: 'default', eager: true });
  const blocks = Object.entries(raw).flatMap(([p, s]) => [...s.split(/\r?\n# EN\r?\n/)[0].matchAll(/```text\r?\n([\s\S]*?)```/g)]
    .map((m) => ({ file: p.replace(/^.*content\/(engine|general)\//, ''), lines: m[1].split(/\r?\n/).filter(Boolean) })));
  it('không ký tự khung, đầu mũi tên hay --> trong khối text', () => {
    expect(blocks.length).toBeGreaterThan(100);
    expect(blocks.filter((b) => b.lines.some((l) => /[─-╿▲-◄]|-->|<--|==>|\+--/.test(l))).map((b) => `${b.file} | ${b.lines[0]}`)).toEqual([]);
  });
  it('khối nhiều dòng mũi tên chỉ là bảng, phép tính, ký hiệu hay output thật đã duyệt (§2B/§2C)', () => {
    const arrowy = blocks.filter((b) => b.lines.filter((l) => /->|→|<-|←/.test(l)).length >= 2).map((b) => `${b.file} | ${b.lines[0]}`);
    const key = (s: string): string | undefined => Object.keys(ARROW_TEXT_OK).find((k) => s.startsWith(k));
    expect(arrowy.filter((s) => !key(s))).toEqual([]);
    expect(Object.keys(ARROW_TEXT_OK).filter((k) => !arrowy.some((s) => s.startsWith(k))), 'mục thừa').toEqual([]);
  });
});

describe.each(Object.keys(specs))('v39 figure %s', (name) => {
  const spec = specs[name];
  it('giới hạn: ≤ 12 node, ≤ 14 mũi tên, ≤ 6 bước; tên file = [a-z0-9-]+; VI và EN đủ, EN không dấu', () => {
    expect(name).toMatch(/^(sql|ds|st|sr|tm|pg|mg|dy|rd|ol|bp)-[a-z0-9-]+$/); // v44 B4 (L812): bp- = a Best Practice card's figure
    expect(spec.nodes.length).toBeLessThanOrEqual(12);
    expect((spec.edges ?? []).length).toBeLessThanOrEqual(14);
    expect((spec.steps ?? []).length).toBeLessThanOrEqual(6);
    expect(spec.steps?.length ?? 0).not.toBe(1);
    expect(tr(spec.title, 'vi') && tr(spec.title, 'en') && tr(spec.caption, 'vi') && tr(spec.caption, 'en')).toBeTruthy();
    for (const b of bis(spec)) {
      expect(b.vi.trim() && b.en.trim(), JSON.stringify(b)).toBeTruthy();
      expect(b.en, b.en).not.toMatch(VI_DIACRITIC);
    }
    expect(new Set(spec.nodes.map((n) => n.id)).size).toBe(spec.nodes.length);
  });
  it('mọi ký tự vẽ ra có trong bảng độ rộng Nunito (ký tự lạ ước 0,62 em: đo lại bảng trước)', () => {
    const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\u00a0/g, ' '); // v40 R2: a no-break space measures as a space
    // drawn text only: title, caption, sentences and alt texts are HTML (any character)
    const drawn = { ...spec, steps: (spec.steps ?? []).map((s) => ({ ...s, say: '', alt: '' })), caption: '', title: '', alt: '',
      variants: Object.fromEntries(Object.entries(spec.variants ?? {}).map(([k, v]) => [k, { ...v, title: '', caption: '', alt: '' }])) };
    const odd = [...new Set(strings(drawn).flatMap((s) => [...fold(s)]))].filter((c) => !GLYPHS.includes(c));
    expect(odd).toEqual([]);
  });

  for (const variant of used(name).length ? used(name) : [undefined]) {
    for (const lang of LANGS) {
      it.each(WIDTHS)(`${variant ?? 'gốc'} · ${lang} · W %i: không chồng lấn (analyze a–e), khoảng cách, mũi tên, cỡ chữ, màu token`, (W) => {
        const d = layout(spec, lang, W, variant);
        expect(d.w).toBe(W);
        d.frames.forEach((f, i) => {
          const at = `${name} ${variant ?? ''} ${lang} W${W} bước ${i + 1}`;
          expect(analyze(model(f, d.w, d.h), W), at).toEqual([]);
          // builder promises beyond the checker's thresholds
          const notes = new Set(spec.nodes.filter((n) => n.shape === 'note').map((n) => n.id));
          const titled = new Set(spec.nodes.filter((n) => n.shape === 'grid' || n.shape === 'bars').map((n) => n.id));
          for (const n of f.nodes) if (n.t === 't') {
            expect(n.size ?? 0, `${at}: "${n.s}"`).toBeGreaterThanOrEqual(13);
            // R1 E14: a note, and a table's or chart's title and sub, keep one line up to NOTE_CH characters on a wide figure
            const note = W >= WIDE && (notes.has(/^(?:pv:)?n:(.+)\.t\d+$/.exec(n.k)?.[1] ?? '') || titled.has(/^(?:pv:)?n:(.+)\.[hs]\d+$/.exec(n.k)?.[1] ?? '')) // v44 B4 X2: pv: = a later step's node, faded;
            expect([...n.s].length, `${at}: "${n.s}"`).toBeLessThanOrEqual(note ? NOTE_CH : 18);
          }
          const ex = [...extents(f).entries()];
          for (let a = 0; a < ex.length; a++) for (let b = a + 1; b < ex.length; b++) {
            const [p, q] = [ex[a][1], ex[b][1]];
            const dx = Math.max(p.x0 - q.x1, q.x0 - p.x1), dy = Math.max(p.y0 - q.y1, q.y0 - p.y1);
            if (dx < 0 && dy < 0) throw new Error(`${at}: ${ex[a][0]} / ${ex[b][0]} chồng nhau`);
            if (dy < 0) expect(dx, `${at}: ${ex[a][0]} ↔ ${ex[b][0]}`).toBeGreaterThanOrEqual(15.5);
            else if (dx < 0) expect(dy, `${at}: ${ex[a][0]} ↕ ${ex[b][0]}`).toBeGreaterThanOrEqual(notes.has(ex[a][0]) || notes.has(ex[b][0]) ? 15.5 : GAP_MIN_Y);
          }
          const m = model(f, d.w, d.h);
          // (g) twin: every box and arrow point inside the viewBox (the svg is exactly W wide, so nothing scrolls)
          for (const b of m.boxes) expect(b.x >= 0 && b.y >= 0 && b.x + b.w <= d.w && b.y + b.h <= d.h, `${at}: ${b.k} hors viewBox`).toBe(true);
          for (const a of m.arrows) for (const [x, y] of a.pts) expect(x >= 0 && y >= 0 && x <= d.w && y <= d.h, `${at}: ${a.k} hors viewBox`).toBe(true);
          // lines the checker skips (links, the bars mark; strikes cross their own row on purpose) never cross a label
          for (const n of f.nodes) {
            if ((n.t !== 'l' && n.t !== 'p') || n.arrow || (n.t === 'p' && !!n.tone) || /:x\d+$/.test(n.k)) continue; // v40: a filled path is a box
            const pts = n.t === 'l' ? samplePath(`M${n.x1} ${n.y1} L${n.x2} ${n.y2}`) : samplePath(n.d);
            for (const t of m.texts) {
              const hit = pts.some(([x, y]) => x > t.x + 0.5 && x < t.x + t.w - 0.5 && y > t.y + t.size * 0.15 && y < t.y + t.h - t.size * 0.15);
              expect(hit, `${at}: ${n.k} cắt chữ "${t.s}"`).toBe(false);
            }
          }
          // tokens only: every tone and ink the builder writes maps to an --eng-* alias in the core
          for (const n of f.nodes) expect(JSON.stringify({ ...n, s: undefined })).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(|var\(--(?!eng-)/i); // v44 B4: drawn text is content (TENANT#C02, VOTE#2026), not a colour
          // R1 E10: two arrows into one box land ≥ 16 apart or share one tip (a bus), never a double arrowhead
          for (let p = 0; p < m.arrows.length; p++) for (let q = p + 1; q < m.arrows.length; q++) {
            const [A, B] = [m.arrows[p], m.arrows[q]];
            const d = Math.hypot(A.tip[0] - B.tip[0], A.tip[1] - B.tip[1]);
            if (A.to && A.to === B.to) expect(d < 0.5 || d >= 16, `${at}: ${A.k} / ${B.k} tips ${d}`).toBe(true);
          }
          // R1 E4/E5 (L626): linked tables side by side are linkGap(lines) apart, or the row already fills the room
          const xs = extents(f);
          const pairs = new Map<string, number>();
          for (const e of spec.edges ?? []) if (e.link) { const k = [e.from, e.to].map((x) => x.split('#')[0]).sort().join('|'); pairs.set(k, (pairs.get(k) ?? 0) + 1); }
          for (const [k, lines] of pairs) {
            const [p, q] = k.split('|').map((id) => xs.get(id));
            if (!p || !q || p === q || Math.min(p.y1, q.y1) <= Math.max(p.y0, q.y0)) continue; // stacked: no lines drawn; v42: a self loop
            const gap = Math.max(p.x0 - q.x1, q.x0 - p.x1);
            const row = [...xs.values()].filter((o) => Math.min(o.y1, p.y1) > Math.max(o.y0, p.y0));
            const span = Math.max(...row.map((o) => o.x1)) - Math.min(...row.map((o) => o.x0));
            if (gap < linkGap(lines) - 1) expect(span, `${at}: ${k} gap ${gap} < ${linkGap(lines)} with room left`).toBeGreaterThanOrEqual(W - 2 * MARGIN - 2);
          }
          for (const a of m.arrows) {
            const t = m.boxes.find((b) => b.k === a.to);
            if (!t) continue; // a grid end: analyze() finds its nearest cell (rule e, tip < 2)
            const g = Math.max(t.x - a.tip[0], a.tip[0] - (t.x + t.w), t.y - a.tip[1], a.tip[1] - (t.y + t.h));
            expect(g, `${at}: ${a.k} mũi tên cách đích`).toBeGreaterThanOrEqual(2.99);
          }
          checkGroups(f, at, spec);
        });
      });
    }
    // v40 (R1 E8/E13): a figure whose text alternative is written by hand gives every variant it is shown with its own title
    if (variant && spec.alt) it(`${variant}: variant có tiêu đề riêng`, () => expect(spec.variants?.[variant]?.title).toBeTruthy());
    it(`${variant ?? 'gốc'}: giải thích sơ đồ (v42, L700–L704): ý chính, mỗi bước một câu, câu ≤ 220 ký tự, không đổ dữ liệu, bảng dữ liệu sinh từ grid`, () => {
      for (const lang of LANGS) {
        const [point, ...steps] = altText(spec, lang, variant);
        expect(sentences(point).length, `${lang} ý chính`).toBeGreaterThanOrEqual(1);
        // a stepped figure = the point, then each step once (the core's numbered list): no "Bước n" written in, no entry repeated
        if (!variant && (spec.steps?.length ?? 0) > 1) {
          expect(steps, lang).toHaveLength(spec.steps!.length);
          expect(new Set([point, ...steps]).size, lang).toBe(steps.length + 1);
        }
        const tables = altTables(spec, lang, variant);
        const v = variant === undefined ? undefined : spec.variants?.[variant];
        const shown = new Set(v?.step !== undefined ? spec.steps?.[v.step].show ?? spec.nodes.map((n) => n.id) : v?.show ?? spec.nodes.map((n) => n.id));
        // v44 (L784, L802 eye E2): a variant may patch a grid's rows or bars (another lesson's data), and its tables are the grids its
        // own frame draws, as the variant's and that step's set patch them (never the base's)
        // B4 eye X4 (L822): the base figure's table is the node in `data_step`, else in the last step that shows it
        const lastStep = (id: string): number | undefined => {
          const st = spec.steps ?? [];
          if (spec.data_step !== undefined && (!st[spec.data_step - 1]?.show || st[spec.data_step - 1].show!.includes(id))) return spec.data_step - 1;
          for (let i = st.length - 1; i >= 0; i--) if (!st[i].show || st[i].show!.includes(id)) return i;
          return undefined;
        };
        const stepOf = (id: string): number | undefined => (v ? v.step : lastStep(id));
        const patch = (n: FigSpec['nodes'][number]): FigSpec['nodes'][number] => { const k = stepOf(n.id); return ({ ...n, ...v?.set?.[n.id], ...(k !== undefined ? spec.steps?.[k].set?.[n.id] : {}) }) as FigSpec['nodes'][number]; };
        const grids = spec.nodes.filter((n) => (n.shape === 'grid' || n.shape === 'bars') && (v?.step !== undefined || v?.show ? shown.has(n.id) : !spec.steps?.length || spec.steps.some((st) => !st.show || st.show.includes(n.id)))).map(patch); // v44 B4: a node only a variant shows has no table in the base figure
        expect(tables.length, `${lang} bảng dữ liệu`).toBe(grids.length);
        for (const [i, t] of tables.entries()) {
          expect(t.caption, lang).not.toBe('');
          if (variant && grids[i].label) expect(t.caption, `${lang}: bảng của variant phải là bảng nó vẽ`).toBe(tr(grids[i].label, lang));
          expect(t.rows.length, `${lang} ${t.caption}`).toBe(grids[i].cells?.length ?? grids[i].items?.length ?? 0);
          expect(t.rows.flat().some(Boolean), `${lang} ${t.caption}: ô nào cũng trống`).toBe(true);
          expect(t.head.every(Boolean), `${lang} ${t.caption}: tiêu đề cột trống`).toBe(true); // an empty th is an axe finding
        }
        // the point: at most 2 sentences, plus an optional closing "Kết quả: …" / "Result: …" line (drawn as its own paragraph)
        expect(sentences(point).filter((x, i, a) => !(i === a.length - 1 && /^(Kết quả|Result): /.test(x))).length, `${lang} ý chính > 2 câu: ${point}`).toBeLessThanOrEqual(2);
        for (const s of steps) expect(sentences(s), `${lang}: ${s}`).toHaveLength(1);
        for (const s of [point, ...steps]) {
          for (const x of sentences(s)) expect([...x].length, `${lang}: ${x}`).toBeLessThanOrEqual(MAX_SENTENCE);
          expect(s, s).not.toMatch(/(Bước|Step) \d|\((hộp|bảng|box|table)\)|sáng lên|mờ đi|highlighted|fades?\b/);
          expect(dumpedRows(s, spec, lang), `${lang} đổ dữ liệu: ${s}`).toBeLessThanOrEqual(3);
        }
      }
    });
  }
});

describe('v39 R1: checker and builder regressions', () => {
  it('E9: analyze() sees strokes that merge and text sitting on its strip (the old pool strips: 15 high on a 16 pitch)', () => {
    const strip = (i: number) => ({ k: `ps${i}`, kind: 'rect', x: 10, y: 10 + i * 16, w: 92, h: 15, sw: 1.2 });
    // Nunito's box is 1.364 em; dominant-baseline middle puts it ~1.25 lower than the strip's middle (what Edge's getBBox gave)
    const label = (i: number) => ({ k: `pt${i}`, s: 'tenant_id A', x: 14, y: 17.5 + i * 16 - 8.53 + 1.25, w: 70, h: 17.05, size: 12.5, px: 12.5 });
    const got = analyze({ vb: [0, 0, 120, 60], texts: [label(0), label(1)], boxes: [strip(0), strip(1)], arrows: [] }, 375);
    expect(got.some((x) => x.t === 'c' && /nearly touch/.test(x.what))).toBe(true);
    expect(got.some((x) => x.t === 'b' && /hugs/.test(x.what))).toBe(true);
    // flush cells (a grid) and cells 4 apart stay clean
    const cells = [0, 1].map((i) => ({ k: `c${i}`, kind: 'rect', x: 10 + i * 40, y: 10, w: 40, h: 24, sw: 1.2 }));
    const apart = [0, 1].map((i) => ({ k: `d${i}`, kind: 'rect', x: 10, y: 50 + i * 24, w: 40, h: 20, sw: 1.2 }));
    expect(analyze({ vb: [0, 0, 120, 120], texts: [], boxes: [...cells, ...apart], arrows: [] }, 375)).toEqual([]);
  });
  it('E4/E5: the linked tables keep their lines side by side at 335 (the wider gap never wraps them)', () => {
    // (EN clause-order is wider than 335 even at the 32 floor: it stacks there, as it did before)
    for (const [name, lang] of [['sql-clause-order', 'vi'], ['sql-inner-join-pairs', 'vi'], ['sql-inner-join-pairs', 'en']] as const) {
      const d = layout(specs[name], lang, 335);
      const lines = d.frames[0].nodes.filter((n) => n.t === 'p' && !n.arrow).length;
      expect(lines, `${name} ${lang}`).toBe((specs[name].edges ?? []).filter((e) => e.link).length);
    }
  });
});

// v41 R3 (r3-eye E1/E2): the phone-stacking tangles the a–e rules missed, as the builder drew them at 280 before the fix
describe('v41 R3: rules h, i, j and the stacked-layout routing', () => {
  const arrow = (k: string, d: string) => { const pts = samplePath(d); const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]]; const l = Math.hypot(q[0] - p[0], q[1] - p[1]); return { k, pts, tip: [q[0] + ((q[0] - p[0]) / l) * 1.125, q[1] + ((q[1] - p[1]) / l) * 1.125] as [number, number] }; };
  const frame = (arrows: ReturnType<typeof arrow>[], texts: OverlapFrame['texts'] = []): OverlapFrame => ({ vb: [0, 0, 280, 400], texts, boxes: [], arrows, fig: true });
  it('h + j: E1, the read and checkpoint lanes 8 apart and their last legs crossing on one line', () => {
    const got = analyze(frame([arrow('e:1', 'M124 142 L124 152 L248 152 L248 221 L125 221 L125 234.875'), arrow('e:2', 'M124 316 L124 295 L264 295 L264 229 L125 229 L125 207.125')]), 320);
    expect(got.some((x) => x.t === 'h')).toBe(true);
    expect(got.some((x) => x.t === 'j')).toBe(true);
  });
  it('j: two tips 10 apart pointing at each other; not two arrows into one box side by side', () => {
    expect(analyze(frame([arrow('a', 'M50 10 V45'), arrow('b', 'M50 90 V55')]), 320).some((x) => x.t === 'j')).toBe(true);
    expect(analyze(frame([arrow('a', 'M50 10 V45'), arrow('b', 'M80 10 V45')]), 320)).toEqual([]);
  });
  it('i: E2, an arrowhead stopping 4 above the wrapped title "C-01 (khóa"; 9 clear passes', () => {
    const title = { k: 'n:c1.h0', s: 'C-01 (khóa', x: 85, y: 184.95, w: 80, h: 19.1, size: 14, px: 14 };
    expect(analyze(frame([arrow('e:0', 'M102 62 L102 179.875')], [title]), 320).some((x) => x.t === 'i')).toBe(true);
    expect(analyze(frame([arrow('e:0', 'M102 62 L102 174.875')], [title]), 320).filter((x) => x.t === 'i')).toEqual([]);
  });
  it('h: a bus (shared lane, one tip) is not two parallel arrows', () => {
    expect(analyze(frame([arrow('a', 'M20 10 V40 H100 V80'), arrow('b', 'M180 10 V40 H100 V80')]), 320).filter((x) => x.t === 'h')).toEqual([]);
  });
  for (const lang of LANGS) it(`${lang} · W 280: hidden alternates share a slot, lanes stay beside the stacked rows (no side lane)`, () => {
    const q = layout(specs['dy-query-vs-scan'], lang, 280);
    const rect = (f: { nodes: Shape[] }, k: string) => f.nodes.find((n) => n.k === k) as Extract<Shape, { t: 'r' }>;
    expect(rect(q.frames[0], 'n:q').y, 'Query and Scan in one slot').toBe(rect(q.frames[1], 'n:s').y);
    const m = layout(specs['pg-memory-two-kinds'], lang, 280);
    const g = rect(m.frames[0], 'g:sh');
    for (const a of m.frames[0].nodes.filter((n) => n.t === 'p' && n.arrow)) for (const [x] of samplePath((a as { d: string }).d)) expect(x, `${a.k} inside the frame's width`).toBeLessThan(g.x + g.w);
  });
});

/** v40 groups: members ≥ 10 inside the frame (below its 20-unit label band), every other node ≥ 12 outside it. */
function checkGroups(f: { nodes: Shape[] }, at: string, spec?: FigSpec): void {
  const m = model(f, 0, 0);
  for (const g of m.boxes.filter((b) => /^g:[^.]+$/.test(b.k ?? ''))) for (const [id, e] of extents(f)) {
    const member = m.boxes.some((b) => (b.k === `n:${id}` || b.k?.startsWith(`n:${id}:`)) && b.parent === g.k) // v40 R2: a grid's cells
      || !!spec?.groups?.some((x) => `g:${x.id}` === g.k && x.nodes.includes(id)); // v41: or the spec's own group list
    if (member) expect(Math.min(e.x0 - g.x, g.x + g.w - e.x1, e.y0 - g.y - 20, g.y + g.h - e.y1), `${at}: ${id} sát mép nhóm ${g.k}`).toBeGreaterThanOrEqual(9.5);
    else expect(Math.max(g.x - e.x1, e.x0 - (g.x + g.w), g.y - e.y1, e.y0 - (g.y + g.h)), `${at}: ${id} sát nhóm ${g.k}`).toBeGreaterThanOrEqual(12);
  }
}

// v40 builder shapes on a spec of their own (CI proves each shape at every width, not only where content happens to use it):
// a group, a table cylinder, a doc page, a cell highlight, a labelled elbow, a routed plain link and a side lane between rows
// that are not neighbours (content uses a lane where a row wraps on a phone: ds-2nf-split at 335/280).
const SHAPES: FigSpec = {
  title: 'v40 shapes', caption: 'test',
  groups: [{ id: 'g', label: { vi: 'Một database', en: 'One database' }, nodes: ['t', 'f'] }],
  nodes: [
    { id: 'app', label: { vi: 'Ứng dụng', en: 'Application' } },
    { id: 'pool', label: 'Pool', sub: { vi: 'mượn kết nối', en: 'borrows one' } },
    { id: 't', shape: 'table', label: 'products', sub: { vi: 'bảng', en: 'table' } },
    { id: 'f', shape: 'doc', label: { vi: 'file · trang 8 kB', en: 'file · 8 kB pages' } },
    { id: 'grid', shape: 'grid', label: 'staff', head: ['id', 'dept_id'], cells: [['1', '1'], ['4', '9']], cellTone: { '1:1': 'dead' } },
    { id: 'far', shape: 'key', label: { vi: 'ở xa', en: 'far away' }, tone: 'warm' },
  ],
  rows: [['app', 'pool'], ['t', 'f'], ['grid'], ['far']],
  edges: [
    { from: 'app', to: 't', label: { vi: 'đọc', en: 'reads' } },
    { from: 'pool', to: 'f', link: true, dash: true },
    { from: 'pool', to: 'far' },
  ],
};
describe('v46 (L880, b56 eye X1–X3): the line language and empty cells', () => {
  const SPEC = { title: 'k', caption: 'k', alt: 'k.', nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' },
    { id: 'g', shape: 'grid', label: 'g', head: ['x', 'y'], cells: [['1', ''], ['', '']], cellTone: { '0:1': 'warm' } }],
    rows: [['a', 'b', 'c'], ['g']], edges: [{ from: 'a', to: 'b', kind: 'skip', label: 'không' }, { from: 'b', to: 'c', kind: 'error' }, { from: 'c', to: 'g' }] } as unknown as Parameters<typeof layout>[0];
  it('skip = dashed, no head; error = solid red arrow; a plain edge is a solid arrow', () => {
    const f = layout(SPEC, 'vi', 640).frames[0];
    const p = (i: number) => f.nodes.find((n) => n.k === `e:${i}`) as { arrow?: boolean; dash?: boolean; ink?: string };
    expect([p(0).arrow, p(0).dash]).toEqual([undefined, true]);
    expect([p(1).arrow, p(1).dash, p(1).ink]).toEqual([true, false, 'dead']);
    expect([p(2).arrow, p(2).ink]).toEqual([true, 'edge']);
  });
  it('an empty cell in a row with text keeps its rect and tone; an all-empty row is not drawn', () => {
    const f = layout(SPEC, 'vi', 640).frames[0];
    const cell = (k: string) => f.nodes.find((n) => n.k === k) as { tone?: string } | undefined;
    expect(cell('n:g:1:1')?.tone).toBe('warm');
    expect(cell('n:g:2:0')).toBeUndefined();
  });
});
describe('v40 builder shapes', () => {
  for (const lang of LANGS) it.each(WIDTHS)(`${lang} · W %i: nhóm, trụ, tài liệu, ô tô sáng, nhãn gấp khúc, đường nối, làn bên`, (W) => {
    const d = layout(SHAPES, lang, W);
    const f = d.frames[0];
    const at = `shapes ${lang} W${W}`;
    const m = model(f, d.w, d.h);
    expect(analyze(m, W), at).toEqual([]);
    checkGroups(f, at);
    for (const n of f.nodes) if (n.t === 't') expect(n.size ?? 0).toBeGreaterThanOrEqual(13);
    for (const b of m.boxes) expect(b.x >= 0 && b.y >= 0 && b.x + b.w <= d.w && b.y + b.h <= d.h, `${at}: ${b.k} hors viewBox`).toBe(true);
    for (const a of m.arrows) for (const [x, y] of a.pts) expect(x >= 0 && y >= 0 && x <= d.w && y <= d.h, `${at}: ${a.k} hors viewBox`).toBe(true);
    for (const a of m.arrows) {
      const t = m.boxes.find((b) => b.k === a.to);
      if (t) expect(Math.max(t.x - a.tip[0], a.tip[0] - (t.x + t.w), t.y - a.tip[1], a.tip[1] - (t.y + t.h)), `${at}: ${a.k}`).toBeGreaterThanOrEqual(2.99);
    }
    const k = (s: string): Shape | undefined => f.nodes.find((n) => n.k === s);
    expect(k('g:g')?.t, 'group frame').toBe('r');
    expect(f.nodes.findIndex((n) => n.k === 'g:g'), 'group under everything').toBe(0);
    expect((k('n:t') as { tone?: string } | undefined)?.tone, 'cylinder is a filled path').toBeTruthy();
    expect(k('n:f')?.t, 'doc is a path').toBe('p');
    expect(k('n:grid:2:1')?.t === 'r' && (k('n:grid:2:1') as { bold?: boolean }).bold, 'highlighted cell').toBe(true);
    expect(f.nodes.some((n) => n.k.endsWith('.l') && n.t === 't' && (n.s === 'đọc' || n.s === 'reads')), 'edge label drawn').toBe(true);
    const lane = f.nodes.find((n) => n.t === 'p' && n.arrow && n.attrs?.['data-to'] === 'n:far');
    expect(lane && lane.t === 'p' && samplePath(lane.d).some(([x]) => x > W - 40), 'side lane at the right').toBe(true);
  });
  it('lỗi nội dung: nhóm không trọn hàng, nhãn trên làn bên', () => {
    expect(() => layout({ ...SHAPES, groups: [{ id: 'g', label: 'x', nodes: ['t'] }] }, 'vi', 640)).toThrow(/nhóm/);
    expect(() => layout({ ...SHAPES, edges: [{ from: 'pool', to: 'far', label: 'x' }] }, 'vi', 640)).toThrow(/làn bên/);
  });
});

// v41 (R2 lesson 2, L651): an arrow naming a grid row leaves from that row's cells when the two nodes sit side by side
// (straight when the target spans the row, a step in the gap otherwise; no label); stacked, it is routed from the node like any arrow.
const ROWS: FigSpec = {
  title: 'v41 row arrows', caption: 'test',
  nodes: [
    { id: 'page', shape: 'grid', label: 'page', head: ['id', 'stored'], cells: [['1', 'inline'], ['2', 'pointer'], ['3', 'inline']] },
    { id: 'toast', shape: 'grid', label: 'toast', head: ['seq', 'len'], cells: [['0', '1996'], ['1', '1996'], ['2', '412']] },
    { id: 'low', label: 'box' },
  ],
  rows: [['page', 'toast'], ['low']],
  edges: [{ from: 'page#1', to: 'toast' }, { from: 'page#2', to: 'low' }],
};
describe('v41 row-anchored arrows', () => {
  for (const lang of LANGS) it.each(WIDTHS)(`${lang} · W %i: mũi tên rời đúng dòng bảng, không chồng lấn`, (W) => {
    const d = layout(ROWS, lang, W);
    const f = d.frames[0];
    expect(analyze(model(f, d.w, d.h), W), `rows ${lang} W${W}`).toEqual([]);
    const a = f.nodes.find((n) => n.t === 'p' && n.arrow && n.k === 'e:0');
    const row = f.nodes.find((n) => n.k === 'n:page:2:1'); // head is row 0, so body row 1 is drawn row 2
    expect(a && a.t === 'p' && row && row.t === 'r').toBe(true);
    if (a?.t !== 'p' || row?.t !== 'r') return;
    const [x0, y0] = samplePath(a.d)[0];
    const side = f.nodes.find((n) => n.k === 'n:toast:1:0');
    const sideBySide = side?.t === 'r' && side.y < row.y + row.h && side.y + side.h > row.y;
    if (sideBySide) {
      expect(y0, 'starts at the row middle').toBeCloseTo(row.y + row.h / 2, 0);
      expect(x0 - (row.x + row.w), 'starts 2 past the cell edge').toBeCloseTo(2, 0);
    }
  });
  it('lỗi nội dung: nhãn trên mũi tên từ dòng bảng (dòng và đích tự nói tên)', () => {
    expect(() => layout({ ...ROWS, edges: [{ from: 'page#1', to: 'toast', label: 'x' }] }, 'vi', 640)).toThrow(/dòng bảng/);
  });
});

// v40 R2 (r2-eye E-01–E-03): edge kinds, cell anchors and crow's-foot end marks, on the specs that use them
describe('v40 R2: edge kinds, cell anchors, crow\'s foot', () => {
  const pts = (n: Shape): number[][] => (n.t === 'p' ? samplePath(n.d) : []);
  for (const lang of LANGS) it.each(WIDTHS)(`${lang} · W %i`, (W) => {
    // E-01: the split (solid, into the frame) and the foreign key (dashed, labelled) look different; no side lane on a phone
    const s = layout(specs['ds-2nf-split'], lang, W).frames[0].nodes;
    const arrows = s.filter((n) => n.t === 'p' && n.arrow);
    const fk = s.find((n) => n.k === 'e:2');
    expect(fk && fk.t === 'p' && fk.dash, 'FK dashed').toBe(true);
    expect(s.find((n) => n.k === 'e:2.l' && n.t === 't')?.t === 't' && (s.find((n) => n.k === 'e:2.l') as { s: string }).s).toBe(lang === 'vi' ? 'khóa ngoại' : 'foreign key');
    for (const a of arrows.filter((n) => n.k !== 'e:2')) expect(a.t === 'p' && !a.dash, `${a.k} solid`).toBe(true);
    for (const a of arrows) for (const [x] of pts(a)) expect(x, `${a.k} side lane`).toBeLessThan(W - 24);
    // E-02: the links leave the dept_id cells (the last column) and end on the departments' first cells; two into one row spread
    const r = layout(specs['ds-relation-anatomy'], lang, W).frames[0].nodes;
    const links = r.filter((n) => /^e:\d$/.test(n.k));
    if (links.length) { // side by side only (stacked on a phone: the text alternative keeps them)
      const cell = (k: string) => r.find((n) => n.k === k) as Extract<Shape, { t: 'r' }>;
      [0, 1, 2, 4].forEach((row, i) => {
        const [p0, p1] = [pts(links[i])[0], pts(links[i]).at(-1)!];
        const from = cell(`n:staff:${row + 1}:3`), to = cell(`n:dept:${[0, 1, 2, 0][i] + 1}:0`);
        expect(Math.abs(p0[0] - (from.x + from.w)), `link ${i} start`).toBeLessThan(0.5);
        expect(Math.abs(p1[0] - to.x), `link ${i} end`).toBeLessThan(0.5);
      });
      expect(Math.abs(pts(links[0]).at(-1)![1] - pts(links[3]).at(-1)![1]), 'shared end spread').toBe(8);
    }
    // E-03: every relationship line carries a real mark at both ends (no ASCII pills); zero kinds add a hollow circle; the legend draws all four
    const c = layout(specs['ds-cardinality'], lang, W).frames[0].nodes;
    expect(c.filter((n) => n.t === 't' && /^(\|\||o\{|\|\{|\|o)$/.test(n.s))).toEqual([]);
    (specs['ds-cardinality'].edges ?? []).forEach((e, i) => {
      const line = pts(c.find((n) => n.k === `e:${i}`)!);
      for (const [j, end] of [[0, line[0]], [1, line.at(-1)!]] as const) {
        const m = c.find((n) => n.k === `e:${i}.m${j}`);
        expect(m, `e:${i} mark ${j}`).toBeTruthy();
        for (const [x, y] of pts(m!)) expect(Math.hypot(x - end[0], y - end[1]), `e:${i} mark ${j} near its end`).toBeLessThan(28.5); // the stem lies on the line
      }
      const zeros = (e.ends ?? []).filter((k) => k?.startsWith('zero')).length;
      expect(c.filter((n) => n.t === 'c' && n.k.startsWith(`e:${i}.m`)).length, `e:${i} circles`).toBe(zeros);
    });
    for (const k of ['k1', 'k2', 'k3', 'k4']) expect(c.some((n) => n.k === `n:${k}.m`), `legend ${k}`).toBe(true);
  });
  it('lỗi nội dung: neo vào ô không ở mép', () => {
    const bad = { ...specs['ds-relation-anatomy'], edges: [{ from: 'staff#0.1', to: 'dept#0.0', link: true }] };
    expect(() => layout(bad, 'vi', 640)).toThrow(/mép/);
  });
  it('E-16: chữ thay hình từng bước không lặp, không nhãn "Bước n"', () => {
    const a = altText(specs['ds-closure-rounds'], 'vi');
    expect(a).toHaveLength(specs['ds-closure-rounds'].steps!.length + 1);
    expect(a.join(' ')).not.toMatch(/Bước \d/);
  });
});

/** Rows are ≥ 36 apart; a node shorter than its row sits in the middle, so its own gap is never smaller. */
const GAP_MIN_Y = 35.5;

// ── v42 (L700–L704): "Giải thích sơ đồ" rules ─────────────────────────────────────────────────────────────────────
const MAX_SENTENCE = 220;
/** Sentences: a stop (. ! ? …) then a space and a capital or digit, so `o.order_date` and `IS NULL` never split one. */
function sentences(s: string): string[] {
  return s.trim().split(/(?<=[.!?…])\s+(?=[\p{Lu}\d"“($])/u).filter(Boolean); // `$unwind …` starts a sentence too
}
/** Every grid row the spec can draw (base, step and variant patches), as its identifying cell texts: a value found in ≥ 3
 * rows of its grid (TRUE, NULL, a status) is a category, not a row's identity, and is left out. */
function gridRows(spec: FigSpec, lang: 'vi' | 'en'): string[][] {
  const out = new Map<string, string[]>();
  const add = (n: { shape?: string; cells?: unknown[][] } | undefined): void => {
    const rows = (n?.cells ?? []).map((r) => r.map((c) => tr(c as never, lang)));
    const common = (c: string): boolean => rows.filter((r) => r.includes(c)).length >= 3;
    for (const r of rows) { const t = r.filter((c) => !common(c)); out.set(JSON.stringify(t), t); }
  };
  spec.nodes.forEach(add);
  for (const set of [...(spec.steps ?? []).map((s) => s.set), ...Object.values(spec.variants ?? {}).map((v) => v.set)]) Object.values(set ?? {}).forEach((p) => add(p as never));
  return [...out.values()];
}
/** L703: a data dump = a grid row written out: ≥ 2 of its values (≥ 2 characters) inside one clause (split at ";" and at
 * sentence ends). An explanation may name up to 3 rows; more is an inventory that belongs in the data table. */
function dumpedRows(s: string, spec: FigSpec, lang: 'vi' | 'en'): number {
  const esc = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const has = (seg: string, c: string): boolean => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(c)}($|[^\\p{L}\\p{N}])`, 'u').test(seg);
  const segs = sentences(s).flatMap((x) => x.split(';'));
  return gridRows(spec, lang).filter((r) => segs.some((seg) => new Set(r.filter((c) => [...c].length >= 2 && has(seg, c))).size >= 2)).length;
}

describe('v42: giải thích sơ đồ, quy tắc tự kiểm', () => {
  it('đoạn cũ người dùng dán (stores) bị chặn: câu > 220 ký tự và đổ > 3 dòng dữ liệu', () => {
    const old = 'Bảng stores có 5 dòng và 4 cột id, name, city, opened_on: 1 Hai Chau, Da Nang, 2023-03-01; 2 Son Tra, Da Nang, 2024-06-15; 3 Ben Thanh, HCM City, 2022-11-20; 4 Thao Dien, HCM City, 2025-09-01; 5 Hoan Kiem, Hanoi, 2024-01-10. Hai cột name và city sáng lên: SELECT giữ chúng.';
    expect(Math.max(...sentences(old).map((x) => [...x].length))).toBeGreaterThan(MAX_SENTENCE);
    expect(dumpedRows(old, specs['sql-rows-columns'], 'vi')).toBeGreaterThan(3);
  });
  it('tách câu không cắt o.order_date, IS NULL, 5 dòng × 2 cột', () => {
    expect(sentences('Điều kiện o.order_date nằm ở ON. Kết quả: 5 dòng × 2 cột.')).toHaveLength(2);
    expect(sentences('WHERE o.id IS NULL giữ dòng không có cặp.')).toHaveLength(1);
  });
  it('bảng dữ liệu: sql-rows-columns (cols) cho bảng stores 5 dòng × 4 cột, có tiêu đề', () => {
    const [t] = altTables(specs['sql-rows-columns'], 'vi', 'cols');
    expect(t).toEqual({ caption: 'stores', head: ['id', 'name', 'city', 'opened_on'], rows: expect.any(Array) });
    expect(t.rows).toHaveLength(5);
    expect(t.rows[0]).toEqual(['1', 'Hai Chau', 'Da Nang', '2023-03-01']);
  });
});

// v42 (L690–L697): ER mode. An entity (title band, attribute rows, PK / FK pills), relationship links anchored to attribute rows,
// every crow's-foot kind at both ends, and a self loop, at 640/335/280 × VI/EN. Links carry no marker, so the checker never
// treats them as arrows: here they are fed to analyze() as arrows too, and rules d (through a box or text) and h (parallel ≤ 8)
// must stay clean; every end mark stays clear of every text.
const CARDS = ['one', 'zero-one', 'many', 'one-many', 'zero-many'] as const;
const ER = (c: (typeof CARDS)[number]): FigSpec => ({
  title: 'v42 ER', caption: 'test',
  nodes: [
    { id: 'a', shape: 'entity', label: 'CUSTOMER', fields: [{ name: 'id', pk: true }, 'name'] },
    { id: 'b', shape: 'entity', label: 'ORDER', fields: [{ name: 'id', pk: true }, { name: 'customer_id', fk: true }, 'ordered_at'] },
    { id: 'c', shape: 'entity', label: 'ORDER_LINE', fields: [{ name: 'order_id', pk: true, fk: true }, 'qty'] },
    { id: 'e', shape: 'entity', label: 'EMPLOYEE', fields: [{ name: 'id', pk: true }, 'name', { name: 'manager_id', fk: true }] },
  ],
  rows: [['a', 'b'], ['c', 'e']],
  edges: [
    { from: 'a#0', to: 'b#1', link: true, ends: [c, c], label: { vi: 'đặt', en: 'places' } },
    { from: 'b#0', to: 'c#0', link: true, ends: [c, c], label: { vi: 'gồm', en: 'contains' } },
    { from: 'e#0', to: 'e#2', link: true, ends: [c, c], label: { vi: 'quản lý', en: 'manages' } },
  ],
});
/** Links (relationship lines) as arrows for the checker, and the d/h findings they give. */
function linkFindings(f: { nodes: Shape[] }, W: number, H: number): string[] {
  const m = model(f, W, H);
  const links = f.nodes.filter((n): n is Extract<Shape, { t: 'p' }> => n.t === 'p' && !n.arrow && !n.tone && /^e:\d+$/.test(n.k));
  m.arrows.push(...links.map((n) => { const pts = samplePath(n.d); return { k: n.k, pts, tip: pts[pts.length - 1] as [number, number] }; }));
  return analyze(m, W).filter((x) => x.t === 'd' || x.t === 'h').map((x) => x.what);
}
/** Every crow's-foot mark point outside every text's ink. */
function marksClear(f: { nodes: Shape[] }, at: string): void {
  const m = model(f, 0, 0);
  for (const n of f.nodes) if (n.t === 'p' && /^e:\d+\.m\d$/.test(n.k)) for (const [x, y] of samplePath(n.d)) for (const t of m.texts)
    expect(x > t.x + 0.5 && x < t.x + t.w - 0.5 && y > t.y + t.size * 0.15 && y < t.y + t.h - t.size * 0.15, `${at}: ${n.k} on "${t.s}"`).toBe(false);
}
describe('v42 ER mode', () => {
  for (const c of CARDS) for (const lang of LANGS) it.each(WIDTHS)(`${c} · ${lang} · W %i: thực thể, neo dòng, vòng tự nối, chân chim hai đầu`, (W) => {
    const d = layout(ER(c), lang, W);
    const f = d.frames[0];
    const at = `er ${c} ${lang} W${W}`;
    expect(analyze(model(f, d.w, d.h), W), at).toEqual([]);
    expect(linkFindings(f, d.w, d.h), at).toEqual([]);
    marksClear(f, at);
    for (const n of f.nodes) if (n.t === 't') { expect(n.size ?? 0).toBeGreaterThanOrEqual(13); expect([...n.s].length).toBeLessThanOrEqual(18); }
    for (const n of f.nodes) if (n.t === 'p' || n.t === 'r') for (const [x, y] of n.t === 'p' ? samplePath(n.d) : [[n.x, n.y], [n.x + n.w, n.y + n.h]]) expect(x >= 0 && y >= 0 && x <= d.w && y <= d.h, `${at}: ${n.k} hors viewBox`).toBe(true);
    const k = (s: string) => f.nodes.find((n) => n.k === s);
    const r = (s: string) => k(s) as Extract<Shape, { t: 'r' }>;
    const mid = (s: string) => r(s).y + r(s).h / 2;
    const pts = (s: string) => samplePath((k(s) as { d: string }).d);
    // entity: box, title band, pills (PK, FK; both on order_id), names after the pill column
    expect(k('n:c.b')?.t).toBe('p');
    expect([k('n:c.k00.t'), k('n:c.k01.t')].map((t) => (t as { s: string }).s)).toEqual(['PK', 'FK']);
    expect((k('n:b.f1') as { x: number }).x).toBe((k('n:b.f0') as { x: number }).x);
    // every link has both marks; zero kinds add one hollow circle each
    for (const i of [0, 1, 2]) {
      expect(k(`e:${i}.m0`) && k(`e:${i}.m1`), `${at}: e:${i} marks`).toBeTruthy();
      expect(f.nodes.filter((n) => n.t === 'c' && n.k.startsWith(`e:${i}.m`)).length).toBe(c.startsWith('zero') ? 2 : 0);
    }
    // row anchors: side by side, the line leaves CUSTOMER's id row and lands on ORDER's customer_id row (level legs, one step)
    const p0 = pts('e:0');
    if (r('n:a').y === r('n:b').y) {
      expect(p0[0][1], `${at}: from a#0`).toBeCloseTo(mid('n:a.k00'), 0);
      expect(p0.at(-1)![1], `${at}: to b#1`).toBeCloseTo(mid('n:b.k10'), 0);
      for (const [p, q] of [[p0[0], p0[1]], [p0.at(-2)!, p0.at(-1)!]]) expect(p[1], `${at}: level end legs`).toBe(q[1]);
    }
    // self loop: out of EMPLOYEE's id row and back into its manager_id row, at the box's right, no arrowhead, the verb beside it
    const loop = pts('e:2'), box = r('n:e');
    expect((k('e:2') as { arrow?: boolean }).arrow).toBeFalsy();
    expect(loop[0][0]).toBeCloseTo(box.x + box.w, 0);
    expect(loop.at(-1)![0]).toBeCloseTo(box.x + box.w, 0);
    expect(loop[0][1]).toBeCloseTo(mid('n:e.k00'), 0);
    expect(loop.at(-1)![1]).toBeCloseTo(mid('n:e.k20'), 0);
    expect((k('e:2.l') as { x: number }).x).toBeGreaterThan(Math.max(...loop.map(([x]) => x)));
  });
  // the content's ER figures: links clear of boxes, texts and each other at every width, step and variant
  // v44 (L785): every spec that draws an entity, not a hand-kept list
  const ER_SPECS = Object.keys(specs).filter((n) => specs[n].nodes.some((x) => x.shape === 'entity'));
  for (const name of ER_SPECS) for (const variant of [undefined, ...Object.keys(specs[name]?.variants ?? {})]) for (const lang of LANGS)
    it.each(WIDTHS)(`${name} ${variant ?? ''} · ${lang} · W %i: đường quan hệ không cắt hộp, chữ; dấu không chạm chữ`, (W) => {
      const d = layout(specs[name], lang, W, variant);
      d.frames.forEach((f, i) => { const at = `${name} ${lang} W${W} ${i}`; expect(linkFindings(f, d.w, d.h), at).toEqual([]); marksClear(f, at); });
      expect(d.frames.flatMap((f) => f.nodes).filter((n) => n.t === 't' && /\|\||o\{|\|\{|\}o/.test(n.s))).toEqual([]);
    });
  // hosts are any width 280–640 (390–430 px phones, tablets): partial wraps must route as cleanly as the three test widths
  const sweep: [string, FigSpec, string | undefined][] = [...CARDS.map((c): [string, FigSpec, undefined] => [`er ${c}`, ER(c), undefined]),
    ...ER_SPECS.flatMap((n) => [undefined, ...Object.keys(specs[n].variants ?? {})].map((v): [string, FigSpec, string | undefined] => [n, specs[n], v]))];
  for (const [name, spec, v] of sweep) for (const lang of LANGS) it(`${name} ${v ?? ''} · ${lang} · mọi bề rộng 280–640 (bước 4): không lỗi dựng, analyze, đường quan hệ và dấu sạch`, () => {
    for (let W = 280; W <= 640; W += 4) {
      const d = layout(spec, lang, W, v);
      d.frames.forEach((f, i) => {
        const at = `${name} ${v ?? ''} ${lang} W${W} ${i}`;
        expect(analyze(model(f, d.w, d.h), W), at).toEqual([]);
        expect(linkFindings(f, d.w, d.h), at).toEqual([]);
        marksClear(f, at);
      });
    }
  }, 120000);
  it('năm dấu chân chim khác nhau', () => {
    // the loop sits in the same place for every kind, so its first mark's shapes compare directly
    const marks = CARDS.map((c) => JSON.stringify(layout(ER(c), 'vi', 640).frames[0].nodes.filter((n) => n.k.startsWith('e:2.m0'))));
    expect(new Set(marks).size).toBe(5);
  });
  it('lỗi nội dung: vòng tự nối trên cùng một dòng', () => {
    const s = ER('one');
    expect(() => layout({ ...s, edges: [{ from: 'e#1', to: 'e#1', link: true, ends: ['one', 'many'] }] }, 'vi', 640)).toThrow(/vòng/);
  });
});
