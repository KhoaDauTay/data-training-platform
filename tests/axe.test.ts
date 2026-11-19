// @vitest-environment jsdom
// v15 Q10 (v7 A8, L141): axe-core over the real app. index.html's markup + main.ts boot in jsdom with a worker that
// never answers (the DB stays "loading"), so every page and dialog is checked as a new player sees it before the data is in.
// Off: color-contrast (jsdom computes no layout or colours; tests/theme.test.ts checks every text pair in both themes).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import html from '../index.html?raw';
import { activeDomain } from '../src/domains';
import { domainOfHash, parseRoute } from '../src/route';

class SilentWorker { onmessage = null; onerror = null; postMessage() {} terminate() {} }
const byId = (id: string): HTMLElement => document.getElementById(id)!;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** The open modal: a browser makes everything else inert, so axe checks only it (jsdom has no top layer). */
let modal: HTMLDialogElement | undefined;

beforeAll(async () => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const noScripts = (s: string): string => s.replace(/<script[\s\S]*?<\/script>/g, '');
  document.documentElement.lang = 'vi';
  document.documentElement.dataset.theme = 'light';
  document.head.innerHTML = noScripts(doc.head.innerHTML);
  document.body.innerHTML = noScripts(doc.body.innerHTML);
  // What jsdom lacks and the app touches on the way (layout, observers, SVG geometry, <dialog>).
  vi.stubGlobal('Worker', SilentWorker);
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} } as DOMRect;
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => rect;
  Element.prototype.scrollIntoView = () => {};
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
});

/**
 * Violations and "incomplete" results as "rule: count first targets", so a failure names what to fix. Incomplete counts too:
 * jsdom gaps (no elementsFromPoint) turned real violations into "incomplete" before, which an empty violation list hid.
 */
async function problems(): Promise<string[]> {
  const r = await axe.run(modal ?? document, { elementRef: true, rules: { 'color-contrast': { enabled: false } } });
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
async function visit(hash: string): Promise<void> {
  location.hash = hash;
  const route = parseRoute(hash);
  const main = route === 'play' ? 'shell' : route === 'data' || route === 'dashboard' ? route : 'home';
  const domain = domainOfHash(hash);
  await vi.waitFor(() => {
    expect(document.body.dataset.route).toBe(route);
    expect(byId(main).hidden).toBe(false);
    if (domain) expect(activeDomain()).toBe(domain);
    expect(byId(main).querySelector('h1')).not.toBeNull();
    if (hash === '#/learn/interview') expect(document.getElementById('iv-sets')).not.toBeNull(); // v17: the lazy list, not its loading line
  }, { timeout: 10_000, interval: 50 });
  await wait(100); // the redraws that follow (sidebar, chips)
}

const PAGES = ['#/', '#/learn', '#/learn/sql/1', '#/learn/skill/select', '#/learn/adv/a2', '#/learn/interview', '#/practice',
  '#/d/logistics', '#/d/logistics/play', '#/d/logistics/data/ports', '#/d/logistics/dashboard', '#/d/logistics/map',
  '#/d/ecommerce', '#/d/ecommerce/play', '#/d/ecommerce/data', '#/d/ecommerce/dashboard', '#/d/ecommerce/map',
  '#/d/finance', '#/d/finance/play', '#/d/finance/data', '#/d/finance/dashboard', '#/d/finance/map'];

// Dialogs over the Logistics workspace, opened the way the player opens them.
const next = (): void => document.querySelector<HTMLElement>('#welcome-dialog [data-w=next]')!.click();
const DIALOGS: [string, () => unknown][] = [
  ['inbox', () => byId('inbox-btn').click()],
  ['notebook (non-modal: the whole page)', () => byId('notebook-btn').click()],
  ['map', () => document.querySelector<HTMLElement>('#map [data-nav=map]')!.click()],
  ['side drawer', () => byId('side-btn').click()],
  ['lesson', async () => (await import('../src/ui/lessonCard')).openLesson('select')],
  ['welcome replay 1/3', () => byId('replay-btn').click()],
  ['welcome replay 2/3', next],
  ['welcome replay 3/3', next],
];

describe('axe-core (v15 Q10)', () => {
  it('first visit: the welcome dialog with the domain picker', async () => {
    await wait(300);
    expect(modal?.id).toBe('welcome-dialog');
    const v = await problems();
    modal!.dispatchEvent(new Event('cancel', { cancelable: true })); // Esc: Logistics, tour skipped
    modal!.close();
    expect(v).toEqual([]);
  });

  it.each(PAGES)('page %s', async (hash) => {
    await visit(hash);
    expect(modal).toBeUndefined();
    expect(await problems()).toEqual([]);
  });

  it.each(DIALOGS)('dialog: %s', async (name, open) => {
    if (location.hash !== '#/d/logistics/play') await visit('#/d/logistics/play');
    await open();
    await wait(100);
    expect(document.querySelector('dialog[open]')).not.toBeNull();
    const v = await problems();
    if (!name.startsWith('welcome') || name.endsWith('3/3')) for (const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) d.close();
    expect(v).toEqual([]);
  });
});
