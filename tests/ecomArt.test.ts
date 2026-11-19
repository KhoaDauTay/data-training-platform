import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Ctx } from '../src/art/logistics';
import { CITIES, openCities } from '../src/art/ecommerce';
import { DOMAIN_TEXT } from '../src/domains';
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
    // v20 (L186): reviews after the last city say domain.promotedRank, not "one more delivery city" (ui/stage.ts)
    expect(DOMAIN_TEXT.ecommerce.opensTo).toBe(Math.max(...CITIES.map((c) => c.opens)));
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
  art.initArt({ t: ((k: string) => k) as never, chapterColor, s, h: h as never, getLang: () => 'vi', loadedGsap: () => undefined, loadGsap: () => {} });
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
    for (const g of walk(art.storeScene(st) as unknown as Fake).filter((n) => 'data-glow' in n.attrs)) expect(g.attrs.style).toBe('opacity:var(--es-glow)');
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

  it('việc thường, chạy nhanh: trạng thái cuối có thêm đúng 1 gói ở ô kế tiếp, xe đã đi, không vòng lặp', async () => {
    const c = ctx(false, harbor(12, []), harbor(13, []));
    art.build(c);
    await art.play(c);
    const root = c.art as unknown as Fake;
    const ps = parcels(root);
    expect(ps).toHaveLength(13);
    const last = ps[12];
    // cell 12 = shelf row 1, column 2 (10 per row): the box face of the parcel group
    expect([last.children[0].attrs.x, last.children[0].attrs.y]).toEqual([String(640 + 2 * 34), String(278 - 48 - 22)]);
    expect(last.attrs.opacity ?? '1').toBe('1');
    expect(last.attrs.transform).toBeUndefined(); // §2.3: GSAP moves the parcel group, which has no transform attribute of its own
    expect(walk(root).find((n) => 'data-rider' in n.attrs)?.attrs.opacity).toBe('0'); // the scooter has left
    expect(loops(root)).toEqual([]);
    expect(art.ms(c)).toBe(2200);
  });

  it('mỗi lần vẽ có id gradient riêng (Tổng quan và dock có thể cùng nằm trong trang)', () => {
    const st = { passed: new Set<number>(), done: 3 };
    const ids = (r: SVGSVGElement): string[] => walk(r as unknown as Fake).map((n) => n.attrs.id).filter(Boolean);
    const a = ids(art.storeScene(st));
    const b = ids(art.storeScene(st, false));
    expect(a.length).toBeGreaterThan(3);
    expect(new Set(a).size).toBe(a.length);
    expect(a.filter((x) => b.includes(x))).toEqual([]);
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
    expect(walk(root).filter((n) => 'data-lantern' in n.attrs)).toHaveLength(3);
    const glows = walk(root).filter((n) => 'data-glow' in n.attrs);
    expect(glows).toHaveLength(3);
    for (const l of glows) expect(l.attrs.style).toBe('opacity:1'); // lit (unlit glows follow the theme token)
    expect(walk(root).some((n) => n.tag === 'div' && n.style.opacity === '1')).toBe(true);
    expect(loops(root)).toEqual([]);
    expect(art.ms(c)).toBe(3000);
  });

  it('V20-D: đánh giá chương 7 gắn ngôi sao vàng lên biển hiệu (mốc của chương 7), cảnh vẽ lại giữ sao', async () => {
    const stars = (r: Fake): Fake[] => walk(r).filter((n) => 'data-star' in n.attrs);
    expect(stars(art.storeScene({ passed: new Set([1, 2, 3, 4, 5, 6]), done: 30 }) as unknown as Fake)).toHaveLength(0);
    expect(stars(art.storeScene({ passed: new Set([7]), done: 1 }) as unknown as Fake)).toHaveLength(1);
    const c = ctx(true, harbor(34, [1, 2, 3, 4, 5, 6]), harbor(35, [1, 2, 3, 4, 5, 6, 7]));
    (c.tk as { chapter: number }).chapter = 7;
    art.build(c);
    await art.play(c);
    const s = stars(c.art as unknown as Fake);
    expect(s).toHaveLength(1);
    expect(s[0].attrs.opacity).toBe('1');
    expect(s[0].attrs.transform).toBeUndefined();
    expect(parcels(c.art as unknown as Fake)).toHaveLength(30); // the shelves stay full at 30
  });
});
