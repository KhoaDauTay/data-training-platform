// @vitest-environment jsdom
// v10 Track A (L154–L156): the sqlMotion chunk. Every picture is drawn in its end state; build() makes a paused timeline
// whose last frame (progress 1) is exactly that static DOM; one-shots stay ≤ 3 s; nothing plays while drawing.
import axe from 'axe-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { GsapArt } from '../src/art/load';
import * as M from '../src/art/sqlMotion';
import { getLang } from '../src/i18n';
import type { StepsResult } from '../src/viz/steps';
import { fmt, h } from '../src/ui/dom';
import { s } from '../src/ui/svg';

let gsapMod: GsapArt;
let reduced = false;
beforeAll(async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduced, media: q, addEventListener() {}, removeEventListener() {} }));
  gsapMod = await import('../src/art/gsap');
  M.init({ h, s, fmt, getLang, loadedGsap: () => gsapMod, loadGsap: () => {}, reducedMotion: () => reduced });
});

const FILM: M.FilmStep[] = [
  { label: 'FROM', count: 25677, groups: false }, { label: 'JOIN', count: 25677, groups: false },
  { label: 'WHERE', count: 3167, groups: false }, { label: 'GROUP BY', count: 6, groups: true },
  { label: 'HAVING', count: 5, groups: true }, { label: 'SELECT', count: 5, groups: false },
  { label: 'ORDER BY', count: 5, groups: false }, { label: 'LIMIT', count: 3, groups: false },
];
const LEFT = { kind: 'left' as const, left: 'o.customer_id', right: 'c.id', pairs: [{ l: '7', r: '7' }, { l: '7', r: '7' }, { l: '9', r: '9' }, { l: 'NULL', r: null }] };
const GROUPS = [{ key: 'ONLINE · DELIVERED', n: 812 }, { key: 'STORE · DONE', n: 2 }, { key: 'ONLINE · SHIPPED', n: 40 }];

/** Builds, checks the timeline is paused and short, and that its last frame is the drawing it started from. */
function endsOnBase(el: Element, build: () => M.Shot['build'] extends () => infer T ? T : never, max: number): void {
  document.body.replaceChildren(el);
  const base = el.outerHTML;
  const tl = build()!;
  expect(tl.paused()).toBe(true);
  expect(tl.duration()).toBeLessThanOrEqual(max);
  expect(el.outerHTML).not.toBe(base); // the first frame differs: something moves
  tl.progress(0.4);
  tl.progress(1);
  expect(el.outerHTML).toBe(base);
  tl.kill();
}

describe('sqlMotion: khung cuối là bản vẽ tĩnh, ≤ 3 s', () => {
  it('phim (A1): timeline paused, ≤ 3 s, progress(1) = DOM tĩnh, báo từng bước', () => {
    const f = M.film(FILM);
    const seen: number[] = [];
    endsOnBase(f.el, () => f.build((i) => seen.push(i)), 3);
    expect(seen.at(-1)).toBe(FILM.length - 1);
    expect(f.el.querySelector('svg')!.getAttribute('aria-label')).toContain('WHERE 3.167');
  });

  it('phim nhiều bước (JOIN tách bước) vẫn ≤ 3 s', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ label: i ? 'JOIN' : 'FROM', count: 100 - i, groups: false }));
    const tl = M.film(many).build(() => {})!;
    expect(tl.duration()).toBeLessThanOrEqual(3);
  });

  it('GROUP BY gộp (A2): ≤ 2,5 s, khung cuối đúng, số dòng là số thật', () => {
    const f = M.fold(GROUPS);
    endsOnBase(f.el, f.build, 2.5);
    expect(f.el.textContent).toContain('ONLINE · DE… · 812 dòng');
    expect(f.el.getAttribute('aria-label')).toContain('ONLINE · DELIVERED: 812 dòng thành 1');
  });

  it('JOIN ghép (A3): LEFT có ∅, INNER không có ∅ mà ghi "bị loại"', () => {
    const left = M.joinPairs(LEFT, 'LEFT JOIN');
    endsOnBase(left.el, left.build, 2.5);
    expect(left.el.textContent).toContain('∅');
    expect(left.el.querySelectorAll('path').length).toBe(3);
    const inner = M.joinPairs({ ...LEFT, kind: 'inner' }, 'JOIN');
    endsOnBase(inner.el, inner.build, 2.5);
    expect(inner.el.textContent).not.toContain('∅');
    expect(inner.el.textContent).toContain('bị loại');
  });

  it('giảm chuyển động: play() không đổi DOM', () => {
    reduced = true;
    try {
      const f = M.fold(GROUPS);
      document.body.replaceChildren(f.el);
      const base = f.el.outerHTML;
      f.play();
      expect(f.el.outerHTML).toBe(base);
      expect(M.canPlay()).toBe(false);
    } finally {
      reduced = false;
    }
  });

  it('mọi thời lượng ≤ 3000 ms', () => {
    for (const [k, v] of Object.entries(M.MS)) expect(v, k).toBeLessThanOrEqual(3000);
  });
});

describe('sqlMotion: số chấm và đoán trước (N5)', () => {
  it('24 chấm ở bước đầu, giảm theo tỉ lệ, GROUP BY không quá số nhóm, 0 dòng = 0 chấm', () => {
    expect(M.dotCounts(FILM)).toEqual([24, 24, 3, 3, 3, 3, 3, 2]);
    expect(M.dotCounts([{ label: 'FROM', count: 10, groups: false }, { label: 'WHERE', count: 0, groups: false }])).toEqual([24, 0]);
    expect(M.dotCounts([{ label: 'FROM', count: 100, groups: false }, { label: 'GROUP BY', count: 2, groups: true }])).toEqual([24, 2]);
  });

  it('dải đoán: dưới 10 %, 10–50 %, trên 50 %', () => {
    expect(M.guessBand(25677, 3167)).toBe(1);
    expect(M.guessBand(1000, 50)).toBe(0);
    expect(M.guessBand(1000, 900)).toBe(2);
  });

  it('chọn một đáp án: khóa nút, chạy phim, rồi Boon nói một câu', () => {
    let started = 0;
    const box = M.guessBox(25677, 3167, (then) => { started++; then(); });
    document.body.replaceChildren(box);
    const buttons = box.querySelectorAll('button');
    buttons[2].click();
    expect(started).toBe(1);
    expect([...buttons].every((b) => b.disabled)).toBe(true);
    expect(box.querySelector('[role=status]')!.textContent).toMatch(/^Boon: Chưa đúng. WHERE giữ 12,3 %/);
  });
});

describe('sqlMotion: chữ VI/EN trong chunk', () => {
  it('cùng khóa, cùng chỗ trống, EN không dấu tiếng Việt', () => {
    const { vi: v, en } = M.SQLM_TEXT;
    expect(Object.keys(en)).toEqual(Object.keys(v));
    const holes = (x: string) => [...x.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(v) as (keyof typeof v)[]) {
      expect(holes(en[k]), k).toEqual(holes(v[k]));
      expect(en[k], k).not.toMatch(/[ăâđêôơưĂÂĐÊÔƠƯàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/);
    }
  });
});

describe('luật chuyển động (A9, L156)', () => {
  const UI = import.meta.glob('../src/ui/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  it('không vòng lặp vô hạn trong src/ui (repeatCount indefinite)', () => {
    for (const [file, code] of Object.entries(UI)) expect(/repeatCount\s*:\s*['"]indefinite/.test(code), file).toBe(false);
  });
});

describe('tab Thứ tự thực thi trong jsdom', () => {
  const RESULT: StepsResult = {
    ok: true,
    ranges: { where: [40, 60] },
    steps: [
      { key: 'from', skipped: false, count: 500, label: 'FROM', range: [0, 14] },
      { key: 'join', skipped: false, count: 480, label: 'LEFT JOIN', range: [15, 39], match: LEFT },
      { key: 'where', skipped: false, count: 120 },
      { key: 'group', skipped: false, count: 3, groups: GROUPS },
      { key: 'having', skipped: true },
      { key: 'select', skipped: false, count: 3 },
    ],
  };
  const SQL = 'FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE x GROUP BY 1';

  it('vẽ phim, hộp đoán, hình JOIN khi mở bước; không chạy gì lúc vẽ; qua axe', async () => {
    const { renderSteps } = await import('../src/ui/stepsView');
    const host = h('div');
    document.body.replaceChildren(host);
    renderSteps(host, SQL, RESULT, () => {});
    await vi.waitFor(() => expect(host.querySelector('fieldset')).not.toBeNull());
    expect(host.querySelector('[role=img][aria-label^="Các bước chạy"]')).not.toBeNull();
    expect(host.querySelector('h3')!.textContent).toBe('Bước 2 · LEFT JOIN');
    expect(host.textContent).toContain('∅');
    const before = host.innerHTML;
    await new Promise((r) => setTimeout(r, 50));
    expect(host.innerHTML).toBe(before); // drawing never starts an animation
    const groupBtn = [...host.querySelectorAll('[role=group] button')].find((b) => b.textContent!.startsWith('GROUP BY')) as HTMLButtonElement;
    groupBtn.click();
    expect(host.querySelector('h3')!.textContent).toBe('Bước 4 · GROUP BY');
    const r = await axe.run(host, { rules: { 'color-contrast': { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
  });
});
