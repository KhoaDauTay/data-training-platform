import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Ctx } from '../src/art/logistics';
import { CITIES, openCities } from '../src/art/ecommerce';
import type { Harbor } from '../src/scene';
import { chapterColor } from '../src/theme';
import type { Ticket } from '../src/tickets';
import { ecomRunner } from './helpers';

describe('bản đồ giao hàng E-com (Plan 9 D9-13)', () => {
  it('mỗi thành phố trên bản đồ là thành phố giao hàng có thật trong seed', async () => {
    const r = await (await ecomRunner())('SELECT DISTINCT city FROM deliveries ORDER BY 1');
    expect(CITIES.map((c) => c.name).sort()).toEqual(r.rows.map((x) => String(x[0])));
  });

  it('Da Nang và Hue mở từ đầu; mỗi chương 1–5 mở đúng một thành phố', () => {
    expect([...openCities(new Set())].sort()).toEqual(['Da Nang', 'Hue']);
    for (let ch = 1; ch <= 5; ch++) expect(CITIES.filter((c) => c.opens === ch)).toHaveLength(1);
    expect(openCities(new Set([1, 2, 3, 4, 5, 6])).size).toBe(CITIES.length);
  });
});

// ui-ux-v5 B3: no DOM in Vitest here (tests/illustrations.test.ts does the same): fake elements that record tag, attributes, children.
interface Fake {
  tag: string; attrs: Record<string, string>; children: Fake[]; style: Record<string, string>;
  setAttribute(k: string, v: string): void; append(...c: Fake[]): void; replaceChildren(...c: Fake[]): void;
}
const fakeEl = (tag: string): Fake => ({
  tag, attrs: {}, children: [], style: {},
  setAttribute(k, v) { this.attrs[k] = v; },
  append(...c) { this.children.push(...c); },
  replaceChildren(...c) { this.children = c; },
});
const walk = (n: Fake): Fake[] => [n, ...n.children.filter((c) => typeof c === 'object').flatMap(walk)];

let art: typeof import('../src/art/ecommerce');
beforeAll(async () => {
  vi.stubGlobal('document', { createElementNS: (_ns: string, tag: string) => fakeEl(tag) });
  art = await import('../src/art/ecommerce');
  const { s } = await import('../src/ui/svg');
  const h = (tag: string, _a: unknown, ...kids: (Fake | string | null)[]): Fake => {
    const el = fakeEl(tag);
    el.append(...kids.filter((k): k is Fake => typeof k === 'object' && k !== null));
    return el;
  };
  art.initArt({ t: ((k: string) => k) as never, chapterColor, s, h: h as never, getLang: () => 'vi' });
});
afterAll(() => vi.unstubAllGlobals());

const harbor = (done: number, passed: number[]): Harbor => ({ bays: { 1: done }, passed: new Set(passed), open: new Set(), trips: {}, departures: 0 });
const ctx = (boss: boolean, before: Harbor, after: Harbor): Ctx => ({
  run: { fast: true, done: false },
  tk: { id: 'ecom-ch1-01', chapter: 1, beat: boss ? 'boss' : 'develop' } as unknown as Ticket,
  scene: { kind: boss ? 'promotion' : 'yard' },
  before, after, rankBefore: { passed: [] }, rankAfter: { passed: [...after.passed] },
  art: fakeEl('div') as unknown as HTMLElement, lang: 'vi',
});
const parcels = (root: Fake): Fake[] => walk(root).find((n) => 'data-parcels' in n.attrs)?.children ?? [];
const loops = (root: Fake): Fake[] => walk(root).filter((n) => /\bcq-/.test(n.attrs.class ?? ''));

describe('E-com: nền và dock khi xong việc (ui-ux-v5 B3)', () => {
  it('cảnh Tổng quan có lồng đèn đung đưa và xe máy; bản vẽ không ambient thì không lặp', () => {
    const st = { passed: new Set<number>(), done: 3 };
    const amb = loops(art.storeScene(st) as unknown as Fake).map((n) => n.attrs.class);
    expect(amb.filter((c) => c.includes('cq-sway'))).toHaveLength(3);
    expect(amb.filter((c) => c.includes('cq-scoot'))).toHaveLength(1);
    expect(loops(art.storeScene(st, false) as unknown as Fake)).toEqual([]);
  });

  it('bản đồ: vòng cq-pulse ở thành phố mở gần nhất; chưa mở thêm hoặc trong dock thì không', () => {
    const rings = (m: SVGSVGElement): Fake[] => loops(m as unknown as Fake);
    expect(rings(art.deliveryMap({ passed: new Set(), done: 0 }))).toEqual([]);
    const two = rings(art.deliveryMap({ passed: new Set([1, 2]), done: 10 }));
    expect(two.map((n) => [n.attrs.cx, n.attrs.cy])).toEqual([['810', '214']]); // Ho Chi Minh City, opened by chapter 2
    expect(rings(art.deliveryMap({ passed: new Set([1, 2]), done: 10 }, false))).toEqual([]);
  });

  it('việc thường, chạy nhanh: trạng thái cuối có thêm đúng 1 gói ở ô kế tiếp, không vòng lặp', async () => {
    const c = ctx(false, harbor(12, []), harbor(13, []));
    art.build(c);
    await art.play(c);
    const root = c.art as unknown as Fake;
    const ps = parcels(root);
    expect(ps).toHaveLength(13);
    const last = ps[12];
    // cell 12 = shelf row 1, column 2 (10 per row)
    expect([last.attrs.x, last.attrs.y]).toEqual([String(640 + 2 * 34), String(278 - 48 - 22)]);
    expect(last.attrs.opacity ?? '1').toBe('1');
    expect(last.attrs.transform ?? 'translate(0,0)').toMatch(/^translate\(0,-?0\)$/);
    expect(loops(root)).toEqual([]);
    expect(art.ms(c)).toBe(2200);
  });

  it('thăng tiến, chạy nhanh: thành phố mới mở trên bản đồ, lồng đèn sáng, có thẻ chức danh; 3,0 s', async () => {
    const c = ctx(true, harbor(4, []), harbor(5, [1]));
    art.build(c);
    await art.play(c);
    const root = c.art as unknown as Fake;
    expect(parcels(root)).toHaveLength(5);
    const hanoi = walk(root).filter((n) => n.attrs['data-city'] === 'Ha Noi');
    expect(hanoi.length).toBeGreaterThan(0);
    for (const n of hanoi) expect(n.attrs.opacity ?? '1').toBe('1');
    expect(hanoi.find((n) => n.tag === 'circle')?.attrs.class).toBe(chapterColor(1).fill);
    const lanterns = walk(root).filter((n) => n.tag === 'ellipse');
    expect(lanterns).toHaveLength(3);
    for (const l of lanterns) expect(l.attrs.fill).not.toBe('#f97316');
    expect(walk(root).some((n) => n.tag === 'div' && n.style.opacity === '1')).toBe(true);
    expect(loops(root)).toEqual([]);
    expect(art.ms(c)).toBe(3000);
  });
});
