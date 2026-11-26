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
  for (const n of [...V.NOSQL_VIZ, ...V.PG_FLOW_VIZ, ...V.TENANT_VIZ]) expect(await V.loadViz(n)).toBeTypeOf('function');
});

const POSTGRES = ['pg-heap-page', 'pg-mvcc-timeline', 'pg-hot-chain', 'pg-vacuum-flow', 'pg-btree', 'pg-wal-flow', 'pg-gin-postings', 'pg-brin-ranges', 'pg-gist-boxes', 'pg-plan-tree', 'pg-lock-matrix', 'pg-isolation-anomalies', 'pg-query-path', 'pg-partition-prune', 'pg-replication', ...V.TENANT_VIZ];
const NOSQL = V.NOSQL_VIZ;

/** Checks one drawn frame: finite numbers, shapes and (estimated) labels inside the viewBox. */
function checkFrame(svg: SVGSVGElement, name: string, step: number): string[] {
  const [, , w, hh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
  const bad: string[] = [];
  const boxes: { s: string; x0: number; x1: number; y0: number; y1: number }[] = [];
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
    if (tag === 'text' && Number(el.getAttribute('opacity') ?? 1) > 0.05) {
      const size = Number(/font-size:([\d.]+)px/.exec(el.getAttribute('style') ?? '')?.[1] ?? 0);
      // v31 F5 (L510): ≥ 12.5 of 340 units = ≥ 12 px once the svg is ≥ 327 px wide (a 375 px phone)
      if (size * 327 / w < 12) bad.push(`${name}#${step} label under 12 px at 375 "${el.textContent}" ${size}`);
      const len = (el.textContent ?? '').length * size * (/monospace/.test(el.getAttribute('style') ?? '') ? 0.6 : /700/.test(el.getAttribute('style') ?? '') ? 0.56 : 0.52);
      const anchor = el.getAttribute('text-anchor');
      const x0 = anchor === 'middle' ? at(el, 'x') - len / 2 : anchor === 'end' ? at(el, 'x') - len : at(el, 'x');
      boxes.push({ s: el.textContent ?? '', x0, x1: x0 + len, y0: at(el, 'y') - size * 0.42, y1: at(el, 'y') + size * 0.42 });
    }
    if (tag === 'line' && [at(el, 'x1'), at(el, 'x2')].some((x) => x < -1 || x > w + 1)) bad.push(`${name}#${step} line out of bounds`);
    if (tag === 'circle' && (at(el, 'cx') < 0 || at(el, 'cx') > w || at(el, 'cy') < 0 || at(el, 'cy') > hh)) bad.push(`${name}#${step} circle out of bounds`);
  }
  // v31 F5: no two visible labels overlap (estimated extents, 1 unit of slack)
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const p = boxes[i], q = boxes[j];
    if (Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0) > 1 && Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0) > 1) bad.push(`${name}#${step} labels overlap "${p.s}" / "${q.s}"`);
  }
  return bad;
}

/** The last point of an absolute M/L/H/V/Q/C path and the point its last segment comes from (control point for Q/C). */
function pathEnd(d: string): [number, number, number, number] {
  const tok = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6 };
  let cmd = '', x = 0, y = 0, px = 0, py = 0;
  for (let i = 0; i < tok.length;) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    const n = ARGS[cmd];
    if (!n) throw new Error(`path command ${cmd} not handled: ${d}`);
    const a = tok.slice(i, i + n).map(Number);
    i += n;
    [px, py] = cmd === 'Q' ? [a[0], a[1]] : cmd === 'C' ? [a[2], a[3]] : [x, y];
    [x, y] = cmd === 'H' ? [a[0], y] : cmd === 'V' ? [x, a[0]] : [a[n - 2], a[n - 1]];
  }
  return [px, py, x, y];
}
/** v39 F3 (L623): every arrowhead's tip (0.75·w past the line's end) stays ≥ 2 units outside every box it does not start in. */
function arrowTips(svg: SVGSVGElement, name: string, step: number): string[] {
  const at = (el: Element, a: string) => Number(el.getAttribute(a));
  const seen = (el: Element) => !el.closest('defs') && Number(el.getAttribute('opacity') ?? 1) > 0.05;
  const boxes = [
    ...[...svg.querySelectorAll('rect')].filter(seen).map((r) => ({ k: r.getAttribute('data-k'), x: at(r, 'x'), y: at(r, 'y'), w: at(r, 'width'), h: at(r, 'height') })),
    ...[...svg.querySelectorAll('circle')].filter((c) => seen(c) && at(c, 'r') >= 4).map((c) => ({ k: c.getAttribute('data-k'), x: at(c, 'cx') - at(c, 'r'), y: at(c, 'cy') - at(c, 'r'), w: 2 * at(c, 'r'), h: 2 * at(c, 'r') })),
  ];
  const dist = (x: number, y: number, b: (typeof boxes)[number]) => {
    const dx = Math.max(b.x - x, 0, x - (b.x + b.w)), dy = Math.max(b.y - y, 0, y - (b.y + b.h));
    return dx || dy ? Math.hypot(dx, dy) : -Math.min(x - b.x, b.x + b.w - x, y - b.y, b.y + b.h - y);
  };
  const bad: string[] = [];
  for (const el of svg.querySelectorAll('line[marker-end], path[marker-end]')) {
    if (!seen(el)) continue;
    const w = Number(/stroke-width:([\d.]+)/.exec(el.getAttribute('style') ?? '')?.[1] ?? 1);
    const [px, py, x, y] = el.tagName === 'line' ? [at(el, 'x1'), at(el, 'y1'), at(el, 'x2'), at(el, 'y2')] : pathEnd(el.getAttribute('d')!);
    const [sx, sy] = el.tagName === 'line' ? [px, py] : pathEnd(el.getAttribute('d')!.replace(/^(M[^A-Za-z]*).*$/, '$1')).slice(2);
    const len = Math.hypot(x - px, y - py) || 1;
    const tx = x + ((x - px) / len) * 0.75 * w, ty = y + ((y - py) / len) * 0.75 * w;
    for (const b of boxes) {
      if (dist(sx, sy, b) < 0) continue; // a box the arrow starts inside holds it (a panel), it is not its target
      const g = dist(tx, ty, b);
      if (g < 2) bad.push(`${name}#${step + 1} ${el.getAttribute('data-k')} tip ${g.toFixed(1)} from ${b.k}`);
    }
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
          bad.push(...checkFrame(svg, name, i), ...arrowTips(svg, name, i));
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
    const v = V.vizFor('pg-heap-page')!(host, { lang: 'en' });
    const [back, play, next] = [...host.querySelectorAll('button')];
    expect(back.getAttribute('aria-disabled')).toBe('true');
    next.click();
    expect(v.index).toBe(1);
    host.querySelector('figure')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(v.index).toBe(v.count - 1);
    expect(next.getAttribute('aria-disabled')).toBe('true');
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
      const v = V.vizFor('pg-heap-page')!(host, { lang: 'vi', start: i - 1 });
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
    // v23 PG-VIZ: the same for the three new diagrams, every step
    for (const name of ['pg-query-path', 'pg-partition-prune', 'pg-replication', ...V.TENANT_VIZ]) {
      const at = (motion: boolean, i: number): string => {
        reduced = !motion;
        const host = document.createElement('div');
        document.body.append(host);
        const v = V.vizFor(name)!(host, { lang: 'en', start: i - 1 });
        v.go(i, true);
        gsapMod!.gsap.globalTimeline.getChildren().forEach((c) => c.progress(1));
        const out = host.querySelector('svg')!.outerHTML.replace(/ev\d+-/g, 'ev-');
        v.destroy();
        return out;
      };
      const n = (() => { const h0 = document.createElement('div'); const v = V.vizFor(name)!(h0, { lang: 'en' }); const c = v.count; v.destroy(); return c; })();
      for (let i = 1; i < n; i++) expect(at(true, i), `${name}#${i}`).toBe(at(false, i));
    }
  });

  it('v23 PG-VIZ: live models (EXPLAIN text, numeric strings, NULLs, 6 partitions, no slots) draw inside the box', () => {
    reduced = true;
    const plan = JSON.stringify([{ Plan: { 'Node Type': 'Hash Join', 'Total Cost': '96.2', 'Plan Rows': '480', Plans: [
      { 'Node Type': 'Seq Scan', 'Relation Name': 'a_rather_long_relation_name_here', 'Total Cost': 41, 'Plan Rows': 2000 },
      { 'Node Type': 'Hash', Plans: [{ 'Node Type': 'Index Only Scan', 'Index Name': 'customers_pkey_with_a_long_name', 'Plan Rows': null }] }] } }]);
    const parts = Array.from({ length: 6 }, (_, i) => ({ name: `measurements_y2026_m0${i + 1}_long`, bound: i === 5 ? 'DEFAULT' : `FOR VALUES FROM ('2026-0${i + 1}-01 00:00:00') TO ('2026-0${i + 2}-01 00:00:00')` }));
    const models: [string, unknown][] = [
      ['pg-query-path', { sql: "SELECT c.name, sum(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.created_on > now() - interval '7 days' GROUP BY c.name ORDER BY 2 DESC LIMIT 10", plan }],
      ['pg-query-path', plan],
      ['pg-plan-tree', plan],
      ['pg-partition-prune', { table: 'measurements', key: 'RANGE (logdate)', parts, cases: [{ sql: 'SELECT * FROM measurements', plan }, { sql: "SELECT 1 FROM measurements WHERE logdate = $1", plan: '[{"Plan":{"Node Type":"Append","Subplans Removed":"4","Plans":[]}}]' }] }],
      ['pg-replication', { slots: [] }],
      ['pg-replication', { slots: [{ slot_name: 'a_very_long_slot_name_for_testing', wal_status: 'lost', has_restart_lsn: 't' }, { slot_name: 'b' }, { slot_name: 'c' }] }],
    ];
    for (const [name, model] of models) {
      const host = document.createElement('div');
      const v = V.vizFor(name)!(host, { lang: 'vi', model });
      const svg = host.querySelector('svg')!;
      expect(v.count).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < v.count; i++) {
        v.go(i);
        expect(checkFrame(svg, `${name}(live)`, i)).toEqual([]);
      }
      v.destroy();
    }
  });

  it('v23 PG-VIZ: replication says it is an illustration on every step', () => {
    reduced = true;
    for (const lang of ['vi', 'en'] as const) {
      const host = document.createElement('div');
      const v = V.vizFor('pg-replication')!(host, { lang });
      expect(host.querySelector('figcaption')!.textContent).toMatch(lang === 'vi' ? /minh họa/ : /illustration/);
      for (let i = 0; i < v.count; i++) {
        v.go(i);
        expect(host.querySelector('svg [data-k=note]')!.textContent).toMatch(lang === 'vi' ? /Minh họa/ : /Illustration/);
      }
      expect(v.texts[0]).toMatch(lang === 'vi' ? /không chạy thật/ : /does not really run/);
      v.destroy();
    }
  });

  it('v34 pg-tenancy-models: 5 steps, tenants named by letter, other columns ghosted in steps 2–4, a model relabels it', () => {
    reduced = true;
    for (const lang of ['vi', 'en'] as const) {
      const host = document.createElement('div');
      const v = V.vizFor('pg-tenancy-models')!(host, { lang });
      expect(v.count).toBe(5);
      const svg = host.querySelector('svg')!;
      const words = () => [...svg.querySelectorAll('text')].map((t) => t.textContent);
      expect(words()).toEqual(expect.arrayContaining(['DB A', 'DB B', 'DB C', 'schema a', 'schema b', 'schema c', 'invoices', 'tenant_id A', 'Silo', 'Bridge', 'Pool']));
      const dashed = (k: string) => /stroke-dasharray/.test(svg.querySelector(`rect[data-k="${k}"]`)!.getAttribute('style') ?? '');
      for (const [step, focus] of [[1, 'silo0'], [2, 'sch0'], [3, 'ps0']] as const) {
        v.go(step);
        expect(dashed(focus), `${lang} step ${step + 1} focus`).toBe(false);
        expect(['silo0', 'sch0', 'ps0'].filter((k) => k !== focus).every(dashed), `${lang} step ${step + 1} others ghosted`).toBe(true);
      }
      v.go(0);
      expect(['silo0', 'sch0', 'ps0'].some(dashed)).toBe(false);
      v.destroy();
    }
    const host = document.createElement('div');
    const v = V.vizFor('pg-tenancy-models')!(host, { lang: 'en', model: { tenants: ['X', 'Y'], table: 'seller_orders_with_a_long_name' } });
    const svg = host.querySelector('svg')!;
    const words = [...svg.querySelectorAll('text')].map((t) => t.textContent);
    expect(words).toEqual(expect.arrayContaining(['DB X', 'DB Y', 'DB C', 'schema x']));
    expect(v.texts[0]).toContain('X, Y and C');
    for (let i = 0; i < v.count; i++) {
      v.go(i);
      expect(checkFrame(svg, 'tenancy(model)', i)).toEqual([]);
    }
    v.destroy();
  });

  it('v37 pg-tenant-placement: an illustration on every step, tenants by catalog id, the hot shard said in words, arrows clear of boxes', () => {
    reduced = true;
    for (const lang of ['vi', 'en'] as const) {
      const host = document.createElement('div');
      const v = V.vizFor('pg-tenant-placement')!(host, { lang });
      expect(v.count).toBe(6);
      expect(host.querySelector('figcaption')!.textContent).toMatch(lang === 'vi' ? /Minh họa/ : /Illustration/);
      const svg = host.querySelector('svg')!;
      const words = () => [...svg.querySelectorAll('text')].map((t) => t.textContent);
      const at = (el: Element, a: string) => Number(el.getAttribute(a));
      for (let i = 0; i < v.count; i++) {
        v.go(i);
        expect(svg.querySelector('[data-k=note]')!.textContent).toMatch(lang === 'vi' ? /Minh họa/ : /Illustration/);
        // R1 E04: an arrow's ends stay ≥ 2 units outside every box
        const rects = [...svg.querySelectorAll('rect')].filter((r) => !r.closest('defs') && Number(r.getAttribute('opacity') ?? 1) > 0.05);
        for (const l of svg.querySelectorAll('line')) for (const [x, y] of [[at(l, 'x1'), at(l, 'y1')], [at(l, 'x2'), at(l, 'y2')]]) for (const r of rects) {
          const inside = x > at(r, 'x') - 2 && x < at(r, 'x') + at(r, 'width') + 2 && y > at(r, 'y') - 2 && y < at(r, 'y') + at(r, 'height') + 2;
          expect(inside, `${lang} step ${i + 1}: arrow end ${x},${y} touches ${r.getAttribute('data-k')}`).toBe(false);
        }
      }
      expect(words()).toEqual(expect.arrayContaining(['t-04', 's4']));
      // R2 E06 (L578c): every tenant cell sits ≥ 3 units inside its shard, ≥ 3 units from its neighbour; step 6 cuts no key
      for (let i = 0; i < v.count; i++) {
        v.go(i);
        const shards = [0, 1, 2, 3].map((s) => svg.querySelector(`rect[data-k="sh${s}"]`)!);
        const cells = [...svg.querySelectorAll('rect[data-k^="ct-"]')];
        expect(cells.length).toBe(6);
        for (const c of cells) {
          const [x, y, w, hh] = ['x', 'y', 'width', 'height'].map((a) => at(c, a));
          const sh = shards.find((s) => x >= at(s, 'x') && x < at(s, 'x') + at(s, 'width'))!;
          expect(x - at(sh, 'x'), `step ${i + 1} ${c.getAttribute('data-k')}`).toBeGreaterThanOrEqual(3);
          expect(at(sh, 'x') + at(sh, 'width') - (x + w)).toBeGreaterThanOrEqual(3);
          expect(at(sh, 'y') + at(sh, 'height') - (y + hh)).toBeGreaterThanOrEqual(3);
          expect(w).toBeGreaterThanOrEqual(34);
          for (const o of cells) if (o !== c && at(o, 'y') === y && at(o, 'x') > x) expect(at(o, 'x') - (x + w)).toBeGreaterThanOrEqual(3);
        }
      }
      v.go(5);
      expect(words().some((w) => w === 'Dynamo  TENANT#t-04')).toBe(true);
      expect(words().some((w) => /#…/.test(w ?? ''))).toBe(false);
      v.go(3);
      expect(words()).toContain(lang === 'vi' ? 'quá tải' : 'overloaded');
      v.go(4);
      expect(svg.querySelector('[data-k=mv]')).not.toBeNull();
      expect(v.texts[4]).toMatch(/t-04/);
      v.destroy();
    }
  });

  it('a lab model with NULL pointer columns and numeric strings draws without NaN', () => {
    reduced = true;
    const host = document.createElement('div');
    const rows = [
      { lp: '1', lp_off: '2', lp_len: '0', lp_flags: '2', t_xmin: null, t_xmax: null, t_ctid: null },
      { lp: '2', lp_off: '8150', lp_len: '41', lp_flags: '1', t_xmin: '9', t_xmax: '0', t_ctid: '(0,2)' },
      ...Array.from({ length: 9 }, (_, i) => ({ lp: String(i + 3), lp_off: String(8100 - i * 40), lp_len: '40', lp_flags: '1', t_xmin: '9', t_xmax: '0', t_ctid: `(0,${i + 3})` })),
    ];
    const v = V.vizFor('pg-heap-page')!(host, { lang: 'en', model: rows });
    const svg = host.querySelector('svg')!;
    for (let i = 0; i < v.count; i++) {
      v.go(i);
      expect(checkFrame(svg, 'heapPage(lab)', i)).toEqual([]);
    }
    expect(v.texts.join(' ')).toContain('redirect');
  });
});

describe('engineViz ENG-CORE slot', () => {
  it('names are pg-/mg-/dy- kebab case and the old camelCase names still resolve', () => {
    for (const n of [...POSTGRES, ...NOSQL]) {
      expect(n).toMatch(/^(pg|mg|dy)-[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(V.vizFor(V.aliasOf(n))).toBe(V.vizFor(n));
    }
    expect(V.aliasOf('pg-heap-page')).toBe('heapPage');
    expect(V.aliasOf('mg-compound-index-esr')).toBe('compoundIndexESR');
  });
  it('vizMount draws into the host and its cleanup removes it', async () => {
    const mount = await V.vizMount('partitionsHash', { h, s, getLang, reducedMotion: () => false, loadedGsap: () => gsapMod, loadGsap: () => {} });
    const host = document.createElement('div');
    const d = mount(host, { lang: 'en', reducedMotion: true, step: 2 });
    expect(host.querySelector('figure svg')).not.toBeNull();
    expect(d.steps.length).toBeGreaterThanOrEqual(3);
    expect(d.index).toBe(2);
    expect(host.querySelector('[role=status]')!.textContent).toBe(d.steps[2].text);
    d.go(0);
    expect(d.index).toBe(0);
    d.destroy();
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
    // v39 (L604): the core paints with the --eng-* aliases, defined once on :root as var(--v7 token); the dark theme
    // redefines the token they point at
    const alias = (t: string): string => new RegExp(`${t}:\\s*var\\((--[a-z0-9-]+)\\)`).exec(light)?.[1] ?? t;
    for (const t of used) {
      expect(light, t).toContain(`${t}:`);
      expect(dark, `${t} → ${alias(t)}`).toContain(`${alias(t)}:`);
    }
  });
});
