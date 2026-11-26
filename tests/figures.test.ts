// v39 figure system (F1/F4, L600–L609; tools/v39/svg-system.md §8): every figure spec in content/figures is laid out by the
// shipped builder (src/engine/viz/figure.ts, the Nunito glyph table) at 640 / 335 / 280 units × VI / EN × every step and
// variant a lesson uses, then judged by the overlap checker's own pure rules (scripts/overlap-check.mjs analyze(), the same
// code the browser run uses): text on text, text out of its box or the viewBox, box on box, arrow through a box or a label,
// arrow tip < 2 from its target. On top, this file holds the builder's stricter promises: gaps ≥ 16 across and ≥ 36 down,
// tips ≥ 3 short, every label ≥ 13 px and ≤ 18 characters × 2 lines, tokens only, a text alternative naming every node
// and arrow. And the content links: every `figures:` name exists (a spec or a registry diagram), every spec is used.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { analyze, samplePath, type OverlapFrame } from '../scripts/overlap-check.mjs';
import { parseEngineLesson, type EngineLesson } from '../src/engine/content';
import type { Shape } from '../src/engine/viz/engineVizCore';
import { resolveViz } from '../src/engine/viz/engineViz';
import { altText, type FigRef, type FigSpec, layout, textWidth, tr } from '../src/engine/viz/figure';
import { GLYPHS } from '../src/engine/viz/glyphs';
import { parseFullLesson } from '../src/fullLesson';
import { fullLessons, lessonIdOf } from '../src/generalLessonSources';
import { VI_DIACRITIC } from './generalRules';

const specs = Object.fromEntries(Object.entries(import.meta.glob<FigSpec>('../content/figures/*.yml', { import: 'default', eager: true }))
  .map(([p, s]) => [p.replace(/^.*\/(.+)\.yml$/, '$1'), s]));
const engineFiles = import.meta.glob<string>('../content/engine/*/L*/*.md', { query: '?raw', import: 'default', eager: true });
const engine: EngineLesson[] = Object.entries(engineFiles).map(([p, s]) => parseEngineLesson(s, p, parse));
const general = await Promise.all(Object.entries(fullLessons).map(async ([p, load]) => parseFullLesson(await load(), lessonIdOf(p))));
const SHORT = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy', design: 'ds' } as const;
/** Every figure reference in content: lesson id, its engine short name, the reference. */
const refs: { id: string; eng: string; f: FigRef }[] = [
  ...engine.flatMap((l) => (l.figures ?? []).map((f) => ({ id: l.id, eng: SHORT[l.engine], f }))),
  ...general.flatMap((l) => (l.figures ?? []).map((f) => ({ id: l.id, eng: 'sql', f }))),
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
    } else if (n.t === 'r') boxes.push({ k: n.k, kind: 'rect', x: n.x, y: n.y, w: n.w, h: n.h, parent: n.attrs?.['data-parent'] });
    else if (n.t === 'p' && n.tone) { // v40: a filled path (table cylinder, doc page) is a box to the checker, as getBBox makes it in the browser
      const pts = samplePath(n.d, 0.25);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
      boxes.push({ k: n.k, kind: 'path', x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0, parent: n.attrs?.['data-parent'] });
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
    const id = /^n:([a-z0-9_-]+)/i.exec(k ?? '')?.[1];
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
});

describe.each(Object.keys(specs))('v39 figure %s', (name) => {
  const spec = specs[name];
  it('giới hạn: ≤ 12 node, ≤ 14 mũi tên, ≤ 6 bước; tên file = [a-z0-9-]+; VI và EN đủ, EN không dấu', () => {
    expect(name).toMatch(/^(sql|ds|pg|mg|dy)-[a-z0-9-]+$/);
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
    const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    const odd = [...new Set(strings({ ...spec, steps: (spec.steps ?? []).map((s) => ({ ...s, say: '' })), caption: '', title: '', alt: '', variants: Object.fromEntries(Object.entries(spec.variants ?? {}).map(([k, v]) => [k, { ...v, alt: '', title: '', caption: '' }])) }).flatMap((s) => [...fold(s)]))].filter((c) => !GLYPHS.includes(c));
    expect(odd).toEqual([]);
  });

  for (const variant of used(name).length ? used(name) : [undefined]) {
    for (const lang of LANGS) {
      it.each(WIDTHS)(`${variant ?? 'gốc'} · ${lang} · W %i: không chồng lấn (analyze a–e), khoảng cách, mũi tên, cỡ chữ, màu token`, (W) => {
        const d = layout(spec, lang, W, variant);
        expect(d.w).toBe(W);
        d.frames.forEach((f, i) => checkFrame(f, d, W, `${name} ${variant ?? ''} ${lang} W${W} bước ${i + 1}`));
      });
    }
    it(`${variant ?? 'gốc'}: lời thay hình nêu mọi node và mọi mũi tên (VI, EN), hoặc lời viết tay`, () => {
      for (const lang of LANGS) {
        const alt = altText(spec, lang, variant).join(' ');
        if (spec.alt || (variant && spec.variants?.[variant]?.alt)) { // v40 (R1 E11): written by hand, a real paragraph
          expect(alt.length, `${lang}: ${alt}`).toBeGreaterThanOrEqual(80);
          continue;
        }
        for (const n of spec.nodes) {
          const words = n.shape === 'grid' ? (n.cells ?? []).flat().map((c) => tr(c, lang)) : n.shape === 'bars' ? (n.items ?? []).map((i) => tr(i.label, lang)) : [tr(n.label, lang)];
          for (const w of words.filter(Boolean)) expect(alt, `${lang} ${n.id}: ${w}`).toContain(w);
        }
        expect(alt.split('→').length - 1 + alt.split('–').length - 1).toBeGreaterThanOrEqual((spec.edges ?? []).length);
      }
    });
    // v40 (R1 E8/E13): a figure whose text is written by hand gives every variant it is shown with its own title
    if (variant && spec.alt) it(`${variant}: variant có tiêu đề riêng`, () => expect(spec.variants?.[variant]?.title).toBeTruthy());
  }
});

/**
 * One drawn frame against every rule: the checker's analyze() (a text/text, b text out of its box or the viewBox, c box/box,
 * d arrow through a box or a label, e tip < 2), the (g) twin (everything inside the viewBox, which is exactly W wide), and
 * the builder's own promises: ≥ 13 px, ≤ 18 characters a line, gaps ≥ 16 / ≥ 36, tips ≥ 3, tokens only, plain lines off
 * labels, groups around their members (v40), and never two arrowheads side by side on one box (v40, R1 E10).
 */
function checkFrame(f: { nodes: Shape[] }, d: { w: number; h: number }, W: number, at: string): void {
  expect(analyze(model(f, d.w, d.h), W), at).toEqual([]);
  for (const n of f.nodes) if (n.t === 't') {
    expect(n.size ?? 0, `${at}: "${n.s}"`).toBeGreaterThanOrEqual(13);
    expect([...n.s].length, `${at}: "${n.s}"`).toBeLessThanOrEqual(18);
  }
  const ex = [...extents(f).entries()];
  for (let a = 0; a < ex.length; a++) for (let b = a + 1; b < ex.length; b++) {
    const [p, q] = [ex[a][1], ex[b][1]];
    const dx = Math.max(p.x0 - q.x1, q.x0 - p.x1), dy = Math.max(p.y0 - q.y1, q.y0 - p.y1);
    if (dx < 0 && dy < 0) throw new Error(`${at}: ${ex[a][0]} / ${ex[b][0]} chồng nhau`);
    if (dy < 0) expect(dx, `${at}: ${ex[a][0]} ↔ ${ex[b][0]}`).toBeGreaterThanOrEqual(15.5);
    else if (dx < 0) expect(dy, `${at}: ${ex[a][0]} ↕ ${ex[b][0]}`).toBeGreaterThanOrEqual(GAP_MIN_Y);
  }
  const m = model(f, d.w, d.h);
  for (const b of m.boxes) expect(b.x >= 0 && b.y >= 0 && b.x + b.w <= d.w && b.y + b.h <= d.h, `${at}: ${b.k} hors viewBox`).toBe(true);
  for (const a of m.arrows) for (const [x, y] of a.pts) expect(x >= 0 && y >= 0 && x <= d.w && y <= d.h, `${at}: ${a.k} hors viewBox`).toBe(true);
  // lines the checker skips (links, the bars mark, a cylinder's cap, a page's fold; strikes cross their own row on purpose) never cross a label
  for (const n of f.nodes) {
    if ((n.t !== 'l' && n.t !== 'p') || n.arrow || (n.t === 'p' && n.tone) || /:x\d+$/.test(n.k)) continue;
    const pts = n.t === 'l' ? samplePath(`M${n.x1} ${n.y1} L${n.x2} ${n.y2}`) : samplePath(n.d);
    for (const t of m.texts) {
      const hit = pts.some(([x, y]) => x > t.x + 0.5 && x < t.x + t.w - 0.5 && y > t.y + t.size * 0.15 && y < t.y + t.h - t.size * 0.15);
      expect(hit, `${at}: ${n.k} cắt chữ "${t.s}"`).toBe(false);
    }
  }
  for (const n of f.nodes) expect(JSON.stringify(n)).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(|var\(--(?!eng-)/i);
  for (const a of m.arrows) {
    const t = m.boxes.find((b) => b.k === a.to);
    if (!t) continue; // a grid end: analyze() finds its nearest cell (rule e, tip < 2)
    const g = Math.max(t.x - a.tip[0], a.tip[0] - (t.x + t.w), t.y - a.tip[1], a.tip[1] - (t.y + t.h));
    expect(g, `${at}: ${a.k} mũi tên cách đích`).toBeGreaterThanOrEqual(2.99);
  }
  // v40 (R1 E10): two arrowheads into one box sit ≥ 16 apart, never as one double head
  for (let i = 0; i < m.arrows.length; i++) for (let j = i + 1; j < m.arrows.length; j++) {
    const [p, q] = [m.arrows[i], m.arrows[j]];
    if (p.to && p.to === q.to) expect(Math.hypot(p.tip[0] - q.tip[0], p.tip[1] - q.tip[1]), `${at}: ${p.k}/${q.k} cùng đích, sát nhau`).toBeGreaterThanOrEqual(16);
  }
  // v40 groups: members ≥ 10 inside the frame (below its label band), every other node ≥ 12 outside it
  const ext = extents(f);
  for (const g of m.boxes.filter((b) => /^g:[^.]+$/.test(b.k ?? ''))) {
    for (const [id, e] of ext) {
      const r = m.boxes.find((b) => b.k === `n:${id}`);
      const member = m.boxes.some((b) => b.k?.startsWith(`n:${id}`) && b.parent === g.k) || (r?.parent === g.k);
      const gap = Math.max(g.x - e.x1, e.x0 - (g.x + g.w), g.y - e.y1, e.y0 - (g.y + g.h));
      if (member) expect(Math.min(e.x0 - g.x, g.x + g.w - e.x1, e.y0 - g.y - 20, g.y + g.h - e.y1), `${at}: ${id} sát mép nhóm ${g.k}`).toBeGreaterThanOrEqual(9.5);
      else expect(gap, `${at}: ${id} sát nhóm ${g.k}`).toBeGreaterThanOrEqual(12);
    }
  }
}

// v40 builder shapes on a spec of their own (CI proves each shape at every width, not only where content happens to use it):
// a group, a table cylinder, a doc page, a cell highlight, a labelled elbow, a routed plain link and a side lane between rows
// that are not neighbours (the lane also appears whenever a row wraps on a phone and leaves a neighbour behind).
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
describe('v40 builder shapes', () => {
  for (const lang of LANGS) it.each(WIDTHS)(`${lang} · W %i: nhóm, trụ, tài liệu, ô tô sáng, nhãn gấp khúc, đường nối, làn bên`, (W) => {
    const d = layout(SHAPES, lang, W);
    const f = d.frames[0];
    checkFrame(f, d, W, `shapes ${lang} W${W}`);
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

/** Rows are ≥ 36 apart; a node shorter than its row sits in the middle, so its own gap is never smaller. */
const GAP_MIN_Y = 35.5;
