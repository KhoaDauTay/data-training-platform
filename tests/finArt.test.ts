import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import type { Ctx } from '../src/art/logistics';
import { bend, BRANCHES, FIN_TEXT, HQ, openBranches, TIER } from '../src/art/finance';
import type { Harbor } from '../src/scene';
import { chapterColor } from '../src/theme';
import type { Ticket } from '../src/tickets';
import { finRunner } from './helpers';

describe('bản đồ chi nhánh Finance (product-design-v9 §5.3)', () => {
  it('mỗi chi nhánh trên bản đồ là một dòng branches có thật trong seed', async () => {
    const r = await (await finRunner())('SELECT name FROM branches ORDER BY 1');
    expect(BRANCHES.map((b) => b.name).sort()).toEqual(r.rows.map((x) => String(x[0])));
  });

  it('Da Nang và Hoi An mở từ đầu; mỗi chương 1–6 mở đúng một chi nhánh', () => {
    expect([...openBranches(new Set())].sort()).toEqual(['Da Nang', 'Hoi An']);
    for (let ch = 1; ch <= 6; ch++) expect(BRANCHES.filter((b) => b.opens === ch)).toHaveLength(1);
    expect(openBranches(new Set([1, 2, 3, 4, 5, 6])).size).toBe(BRANCHES.length);
  });

  it('không tuyến nào đi qua chấm của chi nhánh khác (cách tâm > 12)', () => {
    for (const b of BRANCHES) {
      if (b === HQ) continue;
      const k = bend(b);
      for (let i = 1; i < 100; i++) {
        const u = i / 100;
        const x = (1 - u) ** 2 * HQ.x + 2 * (1 - u) * u * k.x + u * u * b.x;
        const y = (1 - u) ** 2 * HQ.y + 2 * (1 - u) * u * k.y + u * u * b.y;
        for (const o of BRANCHES) if (o !== b && o !== HQ) expect(Math.hypot(x - o.x, y - o.y), `${b.name} → ${o.name}`).toBeGreaterThan(12);
      }
    }
  });

  it('nhãn sao trên hũ = các chương ★ (tier) của content/domains/fin/chapters.yml', () => {
    const raw = Object.values(import.meta.glob('../content/domains/fin/chapters.yml', { query: '?raw', import: 'default', eager: true }))[0] as string;
    const chapters = parse(raw) as { chapter: number; tier: boolean }[];
    expect([...TIER]).toEqual(chapters.filter((c) => c.tier).map((c) => c.chapter));
  });

  it('bảng chữ VI/EN của chunk: cùng khóa, cùng chỗ trống, EN không dấu (D-F11)', () => {
    expect(Object.keys(FIN_TEXT.en).sort()).toEqual(Object.keys(FIN_TEXT.vi).sort());
    const holes = (x: string): string[] => (x.match(/\{\w+\}/g) ?? []).sort();
    for (const k of Object.keys(FIN_TEXT.vi) as (keyof typeof FIN_TEXT.vi)[]) {
      expect(holes(FIN_TEXT.en[k]), k).toEqual(holes(FIN_TEXT.vi[k]));
      expect(FIN_TEXT.en[k], k).not.toMatch(/[à-ỹđ]/i);
    }
  });
});

// No DOM in Vitest here (as tests/ecomArt.test.ts): fake elements that record tag, attributes, children.
interface Fake {
  tag: string; attrs: Record<string, string>; children: Fake[]; style: Record<string, string>;
  setAttribute(k: string, v: string): void; append(...c: Fake[]): void; replaceChildren(...c: Fake[]): void; remove(): void;
}
const fakeEl = (tag: string): Fake => ({
  tag, attrs: {}, children: [], style: {},
  setAttribute(k, v) { this.attrs[k] = v; },
  append(...c) { this.children.push(...c); },
  replaceChildren(...c) { this.children = c; },
  remove() {},
});
const walk = (n: Fake): Fake[] => [n, ...n.children.filter((c) => typeof c === 'object').flatMap(walk)];

let art: typeof import('../src/art/finance');
beforeAll(async () => {
  vi.stubGlobal('document', { createElementNS: (_ns: string, tag: string) => fakeEl(tag) });
  art = await import('../src/art/finance');
  const { s } = await import('../src/ui/svg');
  const h = (tag: string, _a: unknown, ...kids: (Fake | string | null)[]): Fake => {
    const el = fakeEl(tag);
    el.append(...kids.filter((k): k is Fake => typeof k === 'object' && k !== null));
    return el;
  };
  art.initArt({ t: ((k: string) => k) as never, chapterColor, s, h: h as never, getLang: () => 'vi', loadedGsap: () => undefined, loadGsap: () => {} });
});
afterAll(() => vi.unstubAllGlobals());

const harbor = (done: number, passed: number[]): Harbor => ({ bays: { 1: done }, passed: new Set(passed), open: new Set(), trips: {}, departures: 0 });
const ctx = (boss: boolean, chapter: number, before: Harbor, after: Harbor): Ctx => ({
  run: { fast: true, done: false },
  tk: { id: `fin-ch${chapter}-0${boss ? 5 : 2}`, chapter, beat: boss ? 'boss' : 'develop' } as unknown as Ticket,
  scene: { kind: boss ? 'promotion' : 'yard' },
  before, after, rankBefore: { passed: [] }, rankAfter: { passed: [...after.passed] },
  art: fakeEl('div') as unknown as HTMLElement, lang: 'vi',
});
const coins = (root: Fake): Fake[] => walk(root).find((n) => 'data-coins' in n.attrs)?.children ?? [];
const loops = (root: Fake): Fake[] => walk(root).filter((n) => /\bcq-/.test(n.attrs.class ?? ''));
const stars = (root: Fake): Fake[] => walk(root).filter((n) => 'data-star' in n.attrs);

describe('Finance: cảnh quầy Hũ Bạc và dock khi xong việc', () => {
  it('cảnh Tổng quan: một đồng xu mỗi việc (tối đa 30), sao theo chương ★ đã qua; cây cau đung đưa, vệt sáng lướt kính; bản vẽ tĩnh thì không lặp', () => {
    const st = { passed: new Set([1, 2, 3, 4]), done: 20 };
    const svg = art.scene(st) as unknown as Fake;
    expect(coins(svg)).toHaveLength(20);
    expect(coins(art.scene({ passed: new Set(), done: 40 }) as unknown as Fake)).toHaveLength(30);
    expect(stars(svg).map((n) => n.attrs['data-star'])).toEqual(['1', '4']);
    expect(loops(svg).map((n) => n.attrs.class).sort()).toEqual(['cq-palm', 'cq-shine']);
    expect(loops(art.scene(st, false) as unknown as Fake)).toEqual([]);
    expect(svg.attrs['aria-label']).toContain('20');
  });

  it('đồng xu xếp từ đáy hũ lên, màu theo chương (5 đồng một chương)', () => {
    const cs = coins(art.scene({ passed: new Set(), done: 30 }) as unknown as Fake);
    const top = (c: Fake): number => Number(c.children.find((n) => n.tag === 'ellipse')?.attrs.cy);
    expect(top(cs[0])).toBeGreaterThan(top(cs[5]));
    expect(top(cs[25])).toBeLessThan(top(cs[20]));
    expect(cs[0].children.find((n) => n.tag === 'ellipse')?.attrs.class).toBe(chapterColor(1).fill);
    expect(cs[29].children.find((n) => n.tag === 'ellipse')?.attrs.class).toBe(chapterColor(6).fill);
  });

  it('bản đồ: vòng cq-pulse ở chi nhánh mở gần nhất; chưa mở thêm hoặc trong dock thì không', () => {
    expect(loops(art.map({ passed: new Set(), done: 0 }) as unknown as Fake)).toEqual([]);
    const two = loops(art.map({ passed: new Set([1, 2]), done: 10 }) as unknown as Fake);
    const lc = BRANCHES.find((b) => b.opens === 2)!;
    expect(two.map((n) => [n.attrs.cx, n.attrs.cy])).toEqual([[String(lc.x), String(lc.y)]]);
    expect(loops(art.map({ passed: new Set([1, 2]), done: 10 }, false) as unknown as Fake)).toEqual([]);
    expect(art.items({ passed: new Set([1]), done: 5 })).toHaveLength(BRANCHES.length);
  });

  it('mỗi lần vẽ có id gradient/clip riêng (Tổng quan và dock có thể cùng nằm trong trang)', () => {
    const st = { passed: new Set<number>(), done: 3 };
    const ids = (r: SVGSVGElement): string[] => walk(r as unknown as Fake).map((n) => n.attrs.id).filter(Boolean);
    const a = ids(art.scene(st));
    const b = ids(art.scene(st, false));
    expect(a.length).toBeGreaterThan(3);
    expect(new Set(a).size).toBe(a.length);
    expect(a.filter((x) => b.includes(x))).toEqual([]);
  });

  it('việc thường, chạy nhanh: thêm đúng 1 đồng xu ở ô kế tiếp, đồng bay đã vào hũ, không vòng lặp; 2,2 s', async () => {
    const c = ctx(false, 3, harbor(12, [1, 2]), harbor(13, [1, 2]));
    art.build(c);
    await art.play(c);
    const root = c.art as unknown as Fake;
    const cs = coins(root);
    expect(cs).toHaveLength(13);
    const last = cs[12];
    expect(last.attrs.opacity ?? '1').toBe('1');
    expect(last.attrs.transform).toBeUndefined(); // GSAP moves the coin group, which has no transform attribute of its own
    const slot = art.slot(12);
    expect(last.children.find((n) => n.tag === 'ellipse')?.attrs).toMatchObject({ cx: String(slot.x), cy: String(slot.y) });
    expect(walk(root).find((n) => 'data-flyer' in n.attrs)?.attrs.opacity).toBe('0');
    expect(loops(root)).toEqual([]);
    expect(art.ms(c)).toBe(2200);
  });

  it('thăng tiến chương ★, chạy nhanh: chi nhánh mới mở trên bản đồ, sao dán lên hũ, có thẻ chức danh; 3,0 s', async () => {
    const c = ctx(true, 4, harbor(19, [1, 2, 3]), harbor(20, [1, 2, 3, 4]));
    art.build(c);
    await art.play(c);
    const root = c.art as unknown as Fake;
    expect(coins(root)).toHaveLength(20);
    const name = BRANCHES.find((b) => b.opens === 4)!.name;
    const dot = walk(root).filter((n) => n.attrs['data-branch'] === name);
    expect(dot.length).toBeGreaterThan(0);
    for (const n of dot) expect(n.attrs.opacity ?? '1').toBe('1');
    expect(dot.find((n) => n.tag === 'circle')?.attrs.class).toBe(chapterColor(4).fill);
    const st = stars(root);
    expect(st.map((n) => n.attrs['data-star'])).toEqual(['1', '4']);
    for (const n of st) expect(n.attrs.opacity ?? '1').toBe('1');
    expect(walk(root).some((n) => n.tag === 'div' && n.style.opacity === '1')).toBe(true);
    expect(loops(root)).toEqual([]);
    expect(art.ms(c)).toBe(3000);
  });

  it('thăng tiến chương không ★: chi nhánh mở, không thêm sao', async () => {
    const c = ctx(true, 2, harbor(9, [1]), harbor(10, [1, 2]));
    art.build(c);
    await art.play(c);
    expect(stars(c.art as unknown as Fake).map((n) => n.attrs['data-star'])).toEqual(['1']);
  });
});
