// Shared by tests/axe.test.ts and tests/axeProgress.test.ts (both `@vitest-environment jsdom`): index.html's markup + the real
// main.ts in jsdom, then axe-core per page or dialog. Off: color-contrast (jsdom computes no layout or colours;
// tests/theme.test.ts checks every text pair in both themes).
import { expect, vi } from 'vitest';
import axe from 'axe-core';
import html from '../index.html?raw';
import { activeDomain } from '../src/domains';
import { domainOfHash, parseRoute } from '../src/route';

export const byId = (id: string): HTMLElement => document.getElementById(id)!;
export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** The open modal: a browser makes everything else inert, so axe checks only it (jsdom has no top layer). */
let modal: HTMLDialogElement | undefined;
export const openModal = (): HTMLDialogElement | undefined => modal;

/** A DB that is ready at once and answers every request: `ensure` with nothing, queries with no rows. */
export class EmptyWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror = null;
  constructor() {
    setTimeout(() => this.onmessage?.({ data: { type: 'ready', timings: {} } }), 0);
  }
  postMessage(m: { id: number; kind: string }) {
    const result = m.kind === 'ensure' || m.kind === 'parser' ? null : { columns: [], types: [], rows: [] };
    setTimeout(() => this.onmessage?.({ data: { type: 'result', id: m.id, result } }), 0);
  }
  terminate() {}
}

export interface BootOptions {
  /** The Worker stand-in (the DB never answers, or answers everything empty). */
  worker: new () => unknown;
  theme?: 'light' | 'dark';
  /**
   * Viewport width for the JS that reads it (`innerWidth`, `matchMedia` min/max-width: sidebar rail/overlay, phone panes, the
   * Data page's <select>). jsdom applies no CSS media queries and does no layout, so only those JS branches change. Unset:
   * every media query is false (the first axe suite's setting).
   */
  width?: number;
  /** localStorage set before main.ts boots (a save, prefs). */
  storage?: Record<string, string>;
}

/** `(min-width: 1024px)`, `(max-width: 767.98px)` and `and` of them against `width`; anything else (reduced motion, dark, pointer) is false. */
const mediaMatches = (q: string, width: number): boolean => {
  const parts = [...q.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)];
  return parts.length > 0 && parts.every((m) => (m[1] === 'min' ? width >= Number(m[2]) : width <= Number(m[2])));
};

export async function boot(o: BootOptions): Promise<void> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const noScripts = (s: string): string => s.replace(/<script[\s\S]*?<\/script>/g, '');
  for (const [k, v] of Object.entries(o.storage ?? {})) localStorage.setItem(k, v);
  document.documentElement.lang = 'vi';
  document.documentElement.dataset.theme = o.theme ?? 'light'; // index.html's head script, which noScripts drops
  document.head.innerHTML = noScripts(doc.head.innerHTML);
  document.body.innerHTML = noScripts(doc.body.innerHTML);
  const width = o.width;
  if (width) Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  // What jsdom lacks and the app touches on the way (layout, observers, SVG geometry, <dialog>).
  vi.stubGlobal('Worker', o.worker);
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: width !== undefined && mediaMatches(q, width), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} } as DOMRect;
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => rect;
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = () => {};
  document.elementsFromPoint = () => []; // axe's "is a modal open" probe
  Object.assign(SVGElement.prototype, { getComputedTextLength: () => 0, getTotalLength: () => 0 });
  const D = HTMLDialogElement.prototype;
  D.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); modal = this; };
  D.show ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  D.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    if (modal === this) modal = undefined;
    this.dispatchEvent(new Event('close'));
  };
  await import('../src/main');
}

/**
 * Violations and "incomplete" results as "rule: count first targets", so a failure names what to fix. Incomplete counts too:
 * jsdom gaps (no elementsFromPoint) turned real violations into "incomplete" before, which an empty violation list hid.
 */
export async function problems(): Promise<string[]> {
  const run = () => axe.run(modal ?? document, { elementRef: true, rules: { 'color-contrast': { enabled: false } } });
  let r = await run();
  // heading-order is computed from a cache axe fills while walking the page: a redraw that lands mid-run (a DB answer, a
  // sidebar refresh) makes it flaky under load. While it is reported, settle and run again (at most twice), and take only
  // heading-order from the new run: every other finding of the first run stays, and a real heading problem is still
  // there on the last run (v23 QA, L278; the old re-check ran only when heading-order was the sole finding).
  const ho = (x: { id: string }) => x.id === 'heading-order';
  for (let i = 0; i < 2 && [...r.violations, ...r.incomplete].some(ho); i++) {
    await settle();
    const again = await run();
    r = { ...r, violations: [...r.violations.filter((x) => !ho(x)), ...again.violations.filter(ho)], incomplete: [...r.incomplete.filter((x) => !ho(x)), ...again.incomplete.filter(ho)] };
  }
  const incomplete = r.incomplete
    .map((x) => ({ ...x, id: `incomplete ${x.id}`, nodes: x.nodes.filter((n) => !reviewed(x.id, n.element)) }))
    .filter((x) => x.nodes.length > 0);
  return [...r.violations, ...incomplete]
    .map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join(' | ')}`);
}
/**
 * "Needs review" results checked by hand. label-content-name-mismatch on the top-bar logo link: axe measures the visible
 * text with a canvas, which jsdom lacks, so it cannot tell whether "BoonData" is readable text; the visible "BoonData" is
 * the start of its name "BoonData, về Trang chủ" / "BoonData, go to Home" (WCAG 2.5.3 holds).
 */
const reviewed = (rule: string, el: Element | undefined): boolean =>
  rule === 'label-content-name-mismatch' && el?.matches('header a[href="#/"]') === true && el.textContent === 'BoonData';

/** Waits until the router has drawn `hash` (its <main> shown, its domain entered), so axe never checks the page before. */
export async function visit(hash: string, ready?: () => void): Promise<void> {
  location.hash = hash;
  const route = parseRoute(hash);
  const main = route === 'play' ? 'shell' : route === 'data' || route === 'dashboard' ? route : 'home';
  const domain = domainOfHash(hash);
  await vi.waitFor(() => {
    expect(document.body.dataset.route).toBe(route);
    expect(byId(main).hidden).toBe(false);
    if (domain) expect(activeDomain()).toBe(domain);
    expect(byId(main).querySelector('h1')).not.toBeNull();
    if (route === 'me') expect(document.getElementById('me-name')).not.toBeNull(); // v16: the lazy page drawn, not its loading line
    if (route === 'engine') expect(document.getElementById('engine-page')).not.toBeNull(); // ENG-CORE (L220): the lazy page drawn
    if (hash === '#/learn/interview') expect(document.getElementById('iv-sets')).not.toBeNull(); // v17: the lazy list, not its loading line
    ready?.();
  }, { timeout: 10_000, interval: 50 });
  await settle(); // the redraws that follow (sidebar, chips, a DB answer): axe caches heading order, a redraw mid-run confuses it
}

/** Resolves once the DOM has not changed for `quiet` ms (at most `max` ms). */
export function settle(quiet = 200, max = 5_000): Promise<void> {
  return new Promise((resolve) => {
    let timer = setTimeout(done, quiet);
    const cap = setTimeout(done, max);
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(done, quiet);
    });
    mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
    function done() {
      mo.disconnect();
      clearTimeout(timer);
      clearTimeout(cap);
      resolve();
    }
  });
}
