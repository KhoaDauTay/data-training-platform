import { getLang, t } from '../i18n';
import { durationOf, GATE_WAIT, routeOpenedBy, ROUTES, STEPS } from '../scene';
import { CHAPTER_COLOR, chapterColor, cx, DONE_PILL, PILL } from '../theme';
import { textOf } from '../tickets';
import { avatar } from '../ui/avatar';
import { h, nodes, reducedMotion } from '../ui/dom';
import { mascot } from '../ui/mascots';
import { callout, routeItems } from '../ui/routeText';
import { s } from '../ui/svg';
import type * as Illustrations from './illustrations';
import type * as Logistics from './logistics';

export type LogisticsArt = typeof Logistics;
let art: Promise<LogisticsArt> | undefined;
let ready: LogisticsArt | undefined;

/** The Logistics scene, map and completion scenes: one lazy chunk (Plan 8b D8b-2). A failed load is dropped so the next call retries. */
export function loadArt(): Promise<LogisticsArt> {
  art ??= import('./logistics').then((m) => {
    m.init({
      t, getLang, textOf, ROUTES, STEPS, GATE_WAIT, routeOpenedBy, durationOf, CHAPTER_COLOR, chapterColor, cx, PILL, DONE_PILL,
      h, s, nodes, reducedMotion, avatar, mascot, callout, routeItems,
    });
    return (ready = m);
  }, (e: unknown) => { art = undefined; throw e; });
  return art;
}
/** The chunk if it has already arrived: a redraw (rerender) then draws at once instead of flashing the placeholder. */
export const loadedArt = (): LogisticsArt | undefined => ready;

/** Start the download once the first screen is drawn, so the first completion never waits for it. */
export const prefetchArt = (): void => {
  const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 200));
  idle(() => void loadArt().then((m) => idle(() => { m.prefetchGsap(); loadGsap(); }), () => {})); // ui-ux-v6 §2.1: GSAP on the next idle
};

export type GsapArt = typeof import('./gsap');
let gsapMod: Promise<GsapArt> | undefined;
let gsapReady: GsapArt | undefined;
/** ui-ux-v6 §2.1 for main (the mascot rig, src/ui/celebrate.ts): the same lazy `gsap-*` chunk; a failed load is dropped so the next call retries. */
export const loadGsap = (): void => {
  gsapMod ??= import('./gsap').then((m) => (gsapReady = m), (e: unknown) => { gsapMod = undefined; throw e; });
  gsapMod.catch(() => {});
};
/** The GSAP chunk if it has already arrived: react() then animates the rig, else the v5 CSS keyframes run (M1). */
export const loadedGsap = (): GsapArt | undefined => gsapReady;

/**
 * A picture from the art chunk: drawn at once when the chunk is in, else a placeholder of the same aspect ratio (no
 * layout shift) that is swapped for the picture when the chunk arrives, if it is still in the page. A failed load keeps the placeholder.
 */
export function artSlot(aspect: string, draw: (a: LogisticsArt) => Element): Element {
  const a = loadedArt();
  if (a) return draw(a);
  const slot = h('div', { class: cx('block w-full bg-accent-soft', aspect), 'aria-hidden': 'true' });
  loadArt().then((m) => { if (slot.isConnected) slot.replaceWith(draw(m)); }, () => {});
  return slot;
}

export type IllustrationArt = typeof Illustrations;
let ill: Promise<IllustrationArt> | undefined;
let illReady: IllustrationArt | undefined;
/** Drawn illustrations (Plan 8b Task 6): their own lazy chunk, fetched the first time a page shows one. */
export function loadIllustrations(): Promise<IllustrationArt> {
  ill ??= import('./illustrations').then((m) => (illReady = m), (e: unknown) => { ill = undefined; throw e; });
  return ill;
}
/** Like artSlot(): drawn at once when the chunk is in, else a same-aspect placeholder swapped in place (no layout shift). */
export function illustration(aspect: string, draw: (il: IllustrationArt) => Element): Element {
  if (illReady) return draw(illReady);
  const slot = h('div', { class: cx('block w-full rounded-2xl bg-accent-soft', aspect), 'aria-hidden': 'true' });
  loadIllustrations().then((m) => { if (slot.isConnected) slot.replaceWith(draw(m)); }, () => {});
  return slot;
}
