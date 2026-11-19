import { describe, expect, it, vi } from 'vitest';
import html from '../index.html?raw';
import css from '../src/style.css?raw';
import { POSES, RIG } from '../src/ui/mascots';

const start = html.indexOf('<svg id="mascot-sprite"');
const sprite = html.slice(start, html.indexOf('</svg>', start));
const ids = new Set([...sprite.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]));
const light = css.split(':root {')[1]?.split('}')[0] ?? '';

describe('linh vật (L57, product-design-v6 §1)', () => {
  it('mỗi tư thế (6 cho mỗi bạn) là một công thức phần, và mỗi phần có trong sprite (v6 M1)', () => {
    for (const who of ['lily', 'boon'] as const) {
      expect(Object.keys(RIG[who])).toEqual([...POSES]);
      for (const p of POSES) {
        expect(RIG[who][p].length).toBeGreaterThan(1);
        expect(RIG[who][p].filter((part) => !sprite.includes(`<g id="${who}-${part}"`))).toEqual([]);
      }
    }
  });

  it('logo top bar: symbol boon-idle dựng đúng công thức boon idle, không data-mascot', () => {
    const sym = sprite.split('<symbol id="boon-idle" viewBox="0 0 120 120">')[1]?.split('</symbol>')[0] ?? '';
    expect([...sym.matchAll(/href="#boon-([\w-]+)"/g)].map((m) => m[1])).toEqual([...RIG.boon.idle]);
    expect(html).toMatch(/<svg class="size-9"[^>]*><use href="#boon-idle"><\/use><\/svg>/);
  });

  it('giai đoạn Lily: khăn, sao, laptop là phần riêng theo biến CSS; mọi tư thế đứng có đủ', () => {
    for (const [part, v] of [['collar', 'collar-on'], ['scarf', 'scarf-on'], ['badge', 'badge-on'], ['harness', 'harness-on'], ['laptop', 'prop-on']]) {
      expect(sprite).toContain(`<g id="lily-${part}" style="opacity:var(--lily-${v})">`);
      for (const p of POSES.filter((x) => x !== 'sleep')) expect(RIG.lily[p]).toContain(part);
    }
  });

  it('L132: biến hình giai đoạn nằm trên nhóm con, không trên phần mang vòng lặp idle (.tail, .eyes)', () => {
    for (const id of ['lily-tail', 'lily-eyes-open']) {
      const open = sprite.match(new RegExp(`<g id="${id}"[^>]*>`))?.[0] ?? '';
      expect(open, id).toMatch(/class="(tail|eyes)"/);
      expect(open, id).not.toContain('style=');
      expect(sprite.split(open)[1]?.startsWith('<g style="transform:'), id).toBe(true);
    }
    // every stage variable the sprite reads is registered (tweens as a number) and listed in LOOK
    const used = new Set([...sprite.matchAll(/var\(--lily-([\w-]+?)\)/g)].map((m) => m[1]).filter((v) => /^(size|head|lift|perk|paw|ears|ear-tilt|tail|chest|spot\d|shut|eye|[\w]+-on)$/.test(v)));
    expect(used.size).toBeGreaterThan(12);
    for (const v of used) expect(css, v).toContain(`@property --lily-${v} {`);
  });

  it('L134: Lily ngủ có đốm theo ba bậc như khi thức (sơ sinh trắng trơn); mõm dài ra theo đầu; mắt cún to trong nhóm con', () => {
    const sleep = sprite.split('<g id="lily-sleep">')[1]?.split('</g>\n')[0] ?? '';
    for (const n of [1, 2, 3]) expect(sleep).toContain(`style="opacity:var(--lily-spot${n})"`);
    const head = sprite.split('<g id="lily-head">')[1]?.split('\n')[0] ?? '';
    expect(head).toContain('scaleY(calc(1 + (1 - var(--lily-head))');
    expect(sprite).toContain('<g style="transform:scale(var(--lily-eye))');
  });

  it('mọi href="#…" và url(#…) trong sprite trỏ tới một id có thật', () => {
    const refs = [...sprite.matchAll(/(?:href="#|url\(#)([\w-]+)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(20);
    expect(refs.filter((r) => !ids.has(r))).toEqual([]);
  });

  it('mọi màu var(--…) của sprite có trong :root (theme tối chỉ ghi đè một phần)', () => {
    const vars = new Set([...sprite.matchAll(/var\(--([\w-]+)\)/g)].map((m) => m[1]));
    expect([...vars].filter((v) => !light.includes(`--${v}:`))).toEqual([]);
  });

  it('không còn tên cũ của mockup (Bin, Mây) hay tên nhân vật có bản quyền', () => {
    expect(sprite).not.toMatch(/\bbin-|\bmay-|Mây|Snoopy|Donald|Duck/i);
  });

  it('sprite không display:none (animation không chạy trong cây bị ẩn), aria-hidden, đứng đầu <body>', () => {
    expect(sprite).toMatch(/^<svg id="mascot-sprite" class="absolute size-0 overflow-hidden" aria-hidden="true" focusable="false">/);
    expect(html.indexOf('<body>')).toBeLessThan(start);
    expect(html.slice(html.indexOf('<body>') + 6, start).trim().startsWith('<!--')).toBe(true);
  });
});

// ui-ux v5 §1: CSS motion rules. Declarations are `animation:` and custom properties holding one (`--animate-pop`, `--lily-wag`…).
const anims = [...css.matchAll(/(?:^|[;{\s])(animation|--[\w-]+)\s*:\s*([^;}]+)/g)]
  .filter(([, prop, v]) => prop === 'animation' || /\d(?:ms|s)\b/.test(v))
  .flatMap(([, , v]) => v.replace(/\([^)]*\)/g, '()').split(',').map((a) => a.trim()))
  .filter((a) => a && !/^(none|var\()/.test(a));
const ms = (t: string) => parseFloat(t) * (t.endsWith('ms') ? 1 : 1000);

describe('chuyển động (ui-ux v5 §1)', () => {
  it('mỗi animation một lần (không infinite) dài ≤ 3 s, tính cả delay và số lần lặp', () => {
    const long = anims.filter((a) => {
      const words = a.split(/\s+/);
      if (words.includes('infinite')) return false;
      const [dur = 0, delay = 0] = words.filter((w) => /^-?[\d.]+m?s$/.test(w)).map(ms);
      const count = Number(words.find((w) => /^[\d.]+$/.test(w)) ?? 1);
      return dur * count + Math.max(delay, 0) > 3000;
    });
    expect(anims.length).toBeGreaterThan(10);
    expect(long).toEqual([]);
  });

  it('mọi tên cq-* được dùng có @keyframes, và không tên nào định nghĩa hai lần', () => {
    const defined = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    expect(defined.filter((n, i) => defined.indexOf(n) !== i)).toEqual([]);
    const used = anims.flatMap((a) => a.match(/\bcq-[\w-]+/g) ?? []);
    expect(used.filter((n) => !defined.includes(n))).toEqual([]);
  });

  it('giảm chuyển động vẫn tắt mọi animation (khung tĩnh)', () => {
    const reduce = css.split('@media (prefers-reduced-motion: reduce)')[1] ?? '';
    expect(reduce).toMatch(/^\s*\{\s*\*\s*\{[^}]*animation:\s*none\s*!important/);
  });

  it('@property cho mọi biến giai đoạn của Lily (LOOK), giá trị đầu = :root = giai đoạn 3', async () => {
    const { LOOK } = await import('../src/lily');
    for (const [k, v] of Object.entries(LOOK[3])) {
      const root = light.split(`--lily-${k}:`)[1]?.split(';')[0].trim();
      expect(root, k).toBe(String(v));
      expect(css).toContain(`@property --lily-${k} { syntax: '<number>'; inherits: true; initial-value: ${v}; }`);
    }
  });
});

describe('A3 + A1: mốc trong phiên (ui-ux-v5)', () => {
  it('XP: lần vẽ đầu và sau khi nhập save (đối tượng save mới): 0; tăng: N; không tăng: 0', async () => {
    const { gainSince } = await import('../src/ui/celebrate');
    const save = {};
    expect(gainSince(undefined, save, 50)).toBe(0);
    expect(gainSince({ save, n: 50 }, save, 60)).toBe(10);
    expect(gainSince({ save, n: 60 }, save, 60)).toBe(0);
    expect(gainSince({ save, n: 60 }, {}, 900)).toBe(0);
  });

  it('Lily lớn: lần đầu không; giai đoạn tăng thì có, trong 4 s; nhập save (cao hay thấp hơn) thì không', async () => {
    const { gainSince, markGrew, grewLately } = await import('../src/ui/celebrate');
    const save = {};
    expect(gainSince(undefined, save, 2)).toBe(0);
    expect(gainSince({ save, n: 0 }, save, 1)).toBeGreaterThan(0);
    expect(gainSince({ save, n: 1 }, {}, 3)).toBe(0);
    expect(gainSince({ save, n: 2 }, {}, 0)).toBe(0);
    vi.useFakeTimers();
    try {
      expect(grewLately()).toBe(false);
      markGrew();
      vi.advanceTimersByTime(4000);
      expect(grewLately()).toBe(true);
      vi.advanceTimersByTime(1);
      expect(grewLately()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('A4: loader chung (ui-ux-v5)', () => {
  it('#cq-load trong sprite: 3 hàng .ld, không chữ, chỉ chạy khi trang có loader', () => {
    const sym = sprite.split('<symbol id="cq-load"')[1]?.split('</symbol>')[0] ?? '';
    expect(sym).not.toBe('');
    expect(sym.match(/class="ld"/g)).toHaveLength(3);
    expect(sym).not.toMatch(/<text/);
    expect(css).toMatch(/body:has\(use\[href="#cq-load"\]\) #mascot-sprite \.ld[^{]*\{[^}]*animation:[^}]*cq-ld[^}]*infinite/);
  });

  it('thanh <progress> chỉ khi biết tổng và chưa tải xong', async () => {
    const { downloading } = await import('../src/db/loadProgress');
    expect(downloading(undefined)).toBe(false);
    expect(downloading({ loaded: 5 })).toBe(false);
    expect(downloading({ loaded: 5, total: 0 })).toBe(false);
    expect(downloading({ loaded: 5, total: 10 })).toBe(true);
    expect(downloading({ loaded: 10, total: 10 })).toBe(false);
  });
});

describe('B2 + B4 (ui-ux-v5)', () => {
  it('zz của Lily ngủ chỉ bay khi một trang đang hiện có Lily ngủ; Boon ngủ không', () => {
    expect(css).toMatch(/body:has\(main:not\(\[hidden\]\) \[data-mascot=lily\]\[data-pose=sleep\]\) #lily-zz \.zz\s*\{[^}]*animation:[^}]*cq-floatz[^}]*infinite/);
    expect(css).not.toMatch(/:has\([^)]*boon-sleep/);
  });

  it('dấu của Boon: vào bằng opacity (không transform trên aside), Boon nhảy là SVG lá', () => {
    expect(css).toMatch(/\.cq-fade\s*\{[^}]*animation:\s*cq-fade 200ms/);
    expect(css).toMatch(/@keyframes cq-fade\s*\{[^}]*opacity: 0[^}]*\}/);
    expect(css).not.toMatch(/@keyframes cq-fade\s*\{[^}]*(transform|translate|scale)/);
    expect(css).toMatch(/svg\[data-mascot\]\.cq-hop\s*\{[^}]*animation:\s*cq-hop 320ms[^}]*80ms/);
  });
});

describe('rig GSAP (ui-ux-v6 M1, T5)', () => {
  it('mỗi phản ứng có phần để động, các phần đó có trong công thức tư thế; ≤ 3 s; lớn lên 900 ms như cq-grow', async () => {
    const { MOVES, GROW_MS, movedParts } = await import('../src/ui/mascots');
    for (const who of ['lily', 'boon'] as const) {
      for (const [pose, m] of Object.entries(MOVES)) {
        expect(m.ms, pose).toBeLessThanOrEqual(3000);
        const parts = movedParts(who, pose as keyof typeof MOVES);
        expect(parts.body.length, `${who} ${pose}`).toBeGreaterThan(3);
        expect(parts.body).not.toContain('shadow'); // L115: the shadow stays on the ground
        expect(parts.body).not.toContain('laptop'); // her laptop too
        expect(parts.head.length, `${who} ${pose}`).toBeGreaterThan(1);
        for (const p of [...parts.body, ...parts.head, ...parts.extra]) expect(RIG[who][pose as keyof typeof MOVES]).toContain(p);
      }
    }
    expect(movedParts('lily', 'cheer').extra).toEqual(['tail']);
    expect(movedParts('boon', 'point').extra).toEqual(['arm-point']);
    expect(movedParts('boon', 'think').extra).toEqual(['arm-chin']);
    expect(GROW_MS).toBe(2400); // L132 ceremony, ≤ 3 s
    expect(css).toContain(`animation: cq-grow ${GROW_MS}ms`);
    for (const n of [1, 2, 3, 4, 5]) expect(css).toContain(`:root[data-lily="${n}"] svg[data-mascot=lily].grow > g { animation: cq-grow${n} ${GROW_MS}ms`);
  });

  it('L132: điểm xoay theo độ nâng thân của giai đoạn (cổ, tay chỉ); chân và gốc đuôi ở đất', async () => {
    const { pivotOf, PIVOT } = await import('../src/ui/mascots');
    const { LOOK } = await import('../src/lily');
    expect(pivotOf('lily', 0)).toEqual(PIVOT.lily);
    expect(pivotOf('lily', LOOK[2].lift)).toEqual({ feet: '60 112', neck: '60 64', tail: '80 106', 'arm-point': '72 80' });
    // L134: the seasoned chest-out posture raises the neck, not the pointing paw; the newborn sits lower
    expect(pivotOf('lily', LOOK[4].lift, LOOK[4].perk)).toEqual({ feet: '60 112', neck: '60 64', tail: '80 106', 'arm-point': '72 82' });
    expect(pivotOf('lily', LOOK[0].lift, LOOK[0].perk).neck).toBe('60 75');
    expect(pivotOf('boon', 6)).toEqual(PIVOT.boon);
  });
});
