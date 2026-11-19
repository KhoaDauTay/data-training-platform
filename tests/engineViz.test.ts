// @vitest-environment jsdom
// ENG-VIZ (L235): every registered Database Engine diagram renders its sample in both languages, every step is a
// finite drawing inside its viewBox with one sentence for screen readers, the controls work from the keyboard, a tween
// ends exactly on the static frame, and the chunk uses colour tokens only.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { GsapArt } from '../src/art/load';
import * as V from '../src/engine/viz/engineViz';
import { getLang } from '../src/i18n';
import { h } from '../src/ui/dom';
import { s } from '../src/ui/svg';
import css from '../src/style.css?raw';

let gsapMod: GsapArt | undefined;
let reduced = false;
beforeAll(async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduced, media: q, addEventListener() {}, removeEventListener() {} }));
  const g = await import('../src/art/gsap');
  V.init({ h, s, getLang, reducedMotion: () => reduced, loadedGsap: () => gsapMod, loadGsap: () => void (gsapMod = g) });
  gsapMod = g;
  for (const n of V.NOSQL_VIZ) expect(await V.loadViz(n)).toBeTypeOf('function');
});

const POSTGRES = ['heapPage', 'mvccTimeline', 'hotChain', 'vacuumFlow', 'btree', 'walFlow', 'ginPostings', 'brinRanges', 'gistBoxes', 'planTree', 'lockMatrix', 'isolationAnomalies'];
const NOSQL = V.NOSQL_VIZ;

/** Checks one drawn frame: finite numbers, shapes and (estimated) labels inside the viewBox. */
function checkFrame(svg: SVGSVGElement, name: string, step: number): string[] {
  const [, , w, hh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
  const bad: string[] = [];
  const at = (el: Element, a: string) => Number(el.getAttribute(a));
  for (const el of svg.querySelectorAll('rect, text, line, circle, path')) {
    if (el.closest('defs')) continue;
    for (const a of ['x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'opacity', 'd']) {
      const v = el.getAttribute(a);
      if (v !== null && /NaN|Infinity|undefined/.test(v)) bad.push(`${name}#${step} ${el.tagName} ${a}=${v}`);
    }
    const tag = el.tagName;
    if (tag === 'rect' && (at(el, 'x') < -0.5 || at(el, 'y') < -0.5 || at(el, 'x') + at(el, 'width') > w + 0.5 || at(el, 'y') + at(el, 'height') > hh + 0.5 || at(el, 'width') < 0 || at(el, 'height') < 0))
      bad.push(`${name}#${step} rect out of bounds ${el.outerHTML.slice(0, 80)}`);
    if (tag === 'text') {
      const size = Number(/font-size:([\d.]+)px/.exec(el.getAttribute('style') ?? '')?.[1] ?? 11);
      const len = (el.textContent ?? '').length * size * (/monospace/.test(el.getAttribute('style') ?? '') ? 0.6 : 0.53);
      const anchor = el.getAttribute('text-anchor');
      const x0 = anchor === 'middle' ? at(el, 'x') - len / 2 : anchor === 'end' ? at(el, 'x') - len : at(el, 'x');
      if (x0 < -1 || x0 + len > w + 1 || at(el, 'y') < size / 2 - 1 || at(el, 'y') > hh - size / 2 + 1) bad.push(`${name}#${step} text out of bounds "${el.textContent}" x0=${x0.toFixed(0)} len=${len.toFixed(0)} w=${w}`);
    }
    const k = el.getAttribute('data-k') ?? '';
    const owner = /\.[ts]$/.test(k) && tag === 'text' ? svg.querySelector(`rect[data-k="${k.slice(0, -2)}"]`) : null;
    if (owner) {
      const size = Number(/font-size:([\d.]+)px/.exec(el.getAttribute('style') ?? '')?.[1] ?? 11);
      const len = (el.textContent ?? '').length * size * (/monospace/.test(el.getAttribute('style') ?? '') ? 0.6 : /700/.test(el.getAttribute('style') ?? '') ? 0.56 : 0.52);
      if (len > at(owner, 'width') - 2) bad.push(`${name}#${step} label wider than its box "${el.textContent}" ${len.toFixed(0)} > ${at(owner, 'width')}`);
    }
    if (tag === 'line' && [at(el, 'x1'), at(el, 'x2')].some((x) => x < -1 || x > w + 1)) bad.push(`${name}#${step} line out of bounds`);
    if (tag === 'circle' && (at(el, 'cx') < 0 || at(el, 'cx') > w || at(el, 'cy') < 0 || at(el, 'cy') > hh)) bad.push(`${name}#${step} circle out of bounds`);
  }
  return bad;
}

describe('engineViz registry', () => {
  it('registers every Postgres diagram (and the NoSQL ones done so far)', () => {
    expect(V.vizNames()).toEqual(expect.arrayContaining([...POSTGRES, ...NOSQL]));
  });

  for (const name of [...POSTGRES, ...NOSQL]) {
    for (const lang of ['vi', 'en'] as const) {
      it(`${name} (${lang}): every step draws a finite frame inside its box, with one sentence`, () => {
        reduced = true;
        const host = document.createElement('div');
        document.body.append(host);
        const v = V.vizFor(name)!(host, { lang });
        expect(v.count).toBeGreaterThanOrEqual(3);
        expect(v.count).toBeLessThanOrEqual(12);
        expect(v.texts).toHaveLength(v.count);
        expect(new Set(v.texts).size).toBe(v.count);
        const fig = host.querySelector('figure')!;
        expect(fig.getAttribute('aria-label')).toBeTruthy();
        expect(fig.querySelectorAll('ol > li')).toHaveLength(v.count);
        const status = fig.querySelector('[role=status]')!;
        const svg = fig.querySelector('svg')!;
        const bad: string[] = [];
        for (let i = 0; i < v.count; i++) {
          v.go(i);
          expect(v.index).toBe(i);
          expect(status.textContent).toBe(v.texts[i]);
          expect(svg.getAttribute('aria-label')).toContain(v.texts[i]);
          expect(fig.querySelector('li[aria-current=step]')?.textContent).toBe(v.texts[i]);
          expect(v.texts[i].length).toBeLessThan(420);
          if (lang === 'en') expect(v.texts[i]).not.toMatch(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i);
          bad.push(...checkFrame(svg, name, i));
        }
        expect(bad).toEqual([]);
        v.destroy();
        expect(host.childElementCount).toBe(0);
      });
    }
  }
});

describe('engineViz shell', () => {
  it('Back/Next/keyboard step through, ends are disabled, Play stops at the last step', () => {
    vi.useFakeTimers();
    reduced = true;
    const host = document.createElement('div');
    document.body.append(host);
    const v = V.vizFor('heapPage')!(host, { lang: 'en' });
    const [back, play, next] = [...host.querySelectorAll('button')];
    expect(back.disabled).toBe(true);
    next.click();
    expect(v.index).toBe(1);
    host.querySelector('figure')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(v.index).toBe(v.count - 1);
    expect(next.disabled).toBe(true);
    host.querySelector('figure')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(v.index).toBe(0);
    host.querySelector('figure')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(v.index).toBe(1);
    play.click();
    expect(play.getAttribute('aria-pressed')).toBe('true');
    vi.advanceTimersByTime(60_000);
    expect(v.index).toBe(v.count - 1);
    expect(play.getAttribute('aria-pressed')).toBe('false');
    v.destroy();
    vi.useRealTimers();
  });

  it('a tween ends exactly on the static frame; reduced motion draws it at once', () => {
    const draw = (motion: boolean, i: number): string => {
      reduced = !motion;
      const host = document.createElement('div');
      document.body.append(host);
      const v = V.vizFor('heapPage')!(host, { lang: 'vi', start: i - 1 });
      v.go(i, true);
      const svg = host.querySelector('svg')!;
      if (motion) expect(svg.outerHTML).not.toBe(''); // mid-tween now
      gsapMod!.gsap.globalTimeline.progress(1);
      gsapMod!.gsap.globalTimeline.getChildren().forEach((c) => c.progress(1));
      const out = svg.outerHTML.replace(/ev\d+-/g, 'ev-');
      v.destroy();
      return out;
    };
    for (let i = 1; i < 4; i++) expect(draw(true, i)).toBe(draw(false, i));
  });

  it('a lab model with NULL pointer columns and numeric strings draws without NaN', () => {
    reduced = true;
    const host = document.createElement('div');
    const rows = [
      { lp: '1', lp_off: '2', lp_len: '0', lp_flags: '2', t_xmin: null, t_xmax: null, t_ctid: null },
      { lp: '2', lp_off: '8150', lp_len: '41', lp_flags: '1', t_xmin: '9', t_xmax: '0', t_ctid: '(0,2)' },
      ...Array.from({ length: 9 }, (_, i) => ({ lp: String(i + 3), lp_off: String(8100 - i * 40), lp_len: '40', lp_flags: '1', t_xmin: '9', t_xmax: '0', t_ctid: `(0,${i + 3})` })),
    ];
    const v = V.vizFor('heapPage')!(host, { lang: 'en', model: rows });
    const svg = host.querySelector('svg')!;
    for (let i = 0; i < v.count; i++) {
      v.go(i);
      expect(checkFrame(svg, 'heapPage(lab)', i)).toEqual([]);
    }
    expect(v.texts.join(' ')).toContain('redirect');
  });
});

describe('engineViz ENG-CORE slot', () => {
  it('vizMount draws into the host and its cleanup removes it', async () => {
    const mount = await V.vizMount('partitionsHash', { h, s, getLang, reducedMotion: () => false, loadedGsap: () => gsapMod, loadGsap: () => {} });
    const host = document.createElement('div');
    const stop = mount(host, { lang: 'en', reducedMotion: true });
    expect(host.querySelector('figure svg')).not.toBeNull();
    stop();
    expect(host.childElementCount).toBe(0);
  });
});

describe('engineViz facts', () => {
  it('lock conflict table is symmetric and matches the documented anchors', () => {
    const C = V.LOCK_CONFLICTS;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) expect(C[i][j], `${i},${j}`).toBe(C[j][i]);
    const at = (a: string, b: string) => C[V.LOCK_MODES.indexOf(a)][V.LOCK_MODES.indexOf(b)];
    expect(at('ACCESS SHARE', 'ACCESS EXCLUSIVE')).toBe('1');
    expect(at('ACCESS SHARE', 'EXCLUSIVE')).toBe('0');
    expect(at('ROW EXCLUSIVE', 'SHARE')).toBe('1');
    expect(at('SHARE', 'SHARE')).toBe('0');
    expect(at('SHARE UPDATE EXCLUSIVE', 'SHARE UPDATE EXCLUSIVE')).toBe('1');
    expect(at('ROW SHARE', 'ROW EXCLUSIVE')).toBe('0');
  });
});

describe('engineViz colours', () => {
  it('the chunk uses tokens only: no raw colour in src/engine/viz', () => {
    const sources = import.meta.glob<string>('../src/engine/viz/**/*.ts', { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(sources).length).toBeGreaterThan(2);
    const bad = Object.entries(sources).flatMap(([f, src]) => src.split('\n').map((l, i) => `${f}:${i + 1}: ${l.trim()}`)
      .filter((l) => /(fill|stroke|color|background)[^;'"]*#[0-9a-fA-F]{3,8}\b|['"]#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?['"]|rgba?\(|hsla?\(|oklch\(|\b(bg|text|fill|stroke|ring|border)-(red|green|blue|emerald|rose|amber|slate|sky|teal|indigo)-\d+/.test(l)));
    expect(bad).toEqual([]);
  });
  it('every token the diagrams read exists in both themes', () => {
    const sources = import.meta.glob<string>('../src/engine/viz/**/*.ts', { query: '?raw', import: 'default', eager: true });
    const used = new Set(Object.values(sources).flatMap((src) => [...src.matchAll(/'(--[a-z0-9-]+)'/g)].map((m) => m[1])));
    const light = css.split(':root {')[1].split('}')[0];
    const dark = css.split(':root[data-theme=dark] {')[1].split('}')[0];
    for (const t of used) {
      expect(light, t).toContain(`${t}:`);
      expect(dark, t).toContain(`${t}:`);
    }
  });
});
