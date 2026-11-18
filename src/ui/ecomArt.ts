import { loadedGsap, loadGsap } from '../art/load';
import { getLang, t } from '../i18n';
import { rankOf } from '../progress';
import { app, done } from '../state';
import { chapterColor, cx } from '../theme';
import { h } from './dom';
import { s } from './svg';

type EcommerceArt = typeof import('../art/ecommerce');
let art: Promise<EcommerceArt> | undefined;
/** The Lantern Market scene and delivery map (Plan 9): one lazy chunk. A failed load is dropped so the next call retries. */
export function loadEcomArt(): Promise<EcommerceArt> {
  art ??= import('../art/ecommerce').then((m) => {
    m.initArt({ t, chapterColor, s, h, getLang, loadedGsap, loadGsap }); // ui-ux-v6 S3: the dock runs on main's GSAP chunk
    return m;
  }).catch((e: unknown) => {
    art = undefined;
    throw e;
  });
  return art;
}

/**
 * E-commerce art slots (Plan 9 D9-13): the Overview scene, the Map page and the task bar's map dialog. A frame of the
 * picture's size is drawn at once and replaced by the SVG when the chunk is in; the key lines show as HTML below lg
 * (the SVG text hides there, L35). A failed load keeps the frame and the HTML line.
 */
export function ecomArt(kind: 'scene' | 'map'): HTMLElement {
  const d = done();
  const st = { passed: new Set(rankOf(app.tickets, d).passed), done: app.tickets.filter((x) => d.has(x.id)).length };
  const frame = h('div', { class: cx('w-full bg-accent-soft', kind === 'scene' ? 'aspect-[1100/400]' : 'aspect-[980/300] rounded-xl'), 'aria-hidden': 'true' });
  const legend = h('div', { class: 'px-4 py-3 text-sm text-muted' }, h('p', { class: 'm-0' }, t('ecom.scene.callout')));
  void loadEcomArt().then((a) => {
    if (!frame.isConnected) return; // redrawn meanwhile
    frame.replaceWith(kind === 'scene' ? a.storeScene(st) : a.deliveryMap(st));
    if (kind === 'map') legend.replaceChildren(h('ul', { class: 'm-0 list-none space-y-0.5 p-0 lg:hidden', 'aria-hidden': 'true' }, ...a.deliveryItems(st).map((x) => h('li', {}, x))));
  }, () => {});
  // v11 UX #2: the shop scene stays under ~240 px high so the overview's content starts above the fold; the street
  // bleeds past its viewBox on a wide card (ui-ux-v6 S3), clipped here.
  return h('div', { class: kind === 'scene' ? 'overflow-hidden [&>svg]:max-h-60' : '' }, frame, legend);
}
