import { loadedGsap, loadGsap } from '../art/load';
import { activeDomain, domainText, type DomainId } from '../domains';
import { getLang, t } from '../i18n';
import { rankOf } from '../progress';
import { app, done } from '../state';
import { chapterColor, cx } from '../theme';
import { h } from './dom';
import { s } from './svg';

/**
 * The picture chunk of each domain other than Logistics (Plan 9, product-design-v9 §5.3): both modules export the same
 * functions (scene, map, items and the dock's build/play/ms), so one type and one loader cover both. One promise per
 * domain; a failed load is dropped so the next call retries.
 */
type Art = Pick<typeof import('../art/ecommerce'), 'initArt' | 'scene' | 'map' | 'items' | 'build' | 'play' | 'ms'>;
type ArtDomain = Exclude<DomainId, 'logistics'>;
const LOAD: Record<ArtDomain, () => Promise<Art>> = {
  ecommerce: () => import('../art/ecommerce'),
  finance: () => import('../art/finance'),
};
const loaded: Partial<Record<ArtDomain, Promise<Art>>> = {};
export function loadDomainArt(d: ArtDomain): Promise<Art> {
  loaded[d] ??= LOAD[d]().then((m) => {
    m.initArt({ t, chapterColor, s, h, getLang, loadedGsap, loadGsap }); // ui-ux-v6 S3: the dock runs on main's GSAP chunk
    return m;
  }).catch((e: unknown) => {
    delete loaded[d];
    throw e;
  });
  return loaded[d];
}

/**
 * The open domain's art slots (Plan 9 D9-13): the Overview scene, the Map page and the task bar's map dialog. A frame of
 * the picture's size is drawn at once and replaced by the SVG when the chunk is in; the key lines show as HTML below lg
 * (the SVG text hides there, L35). A failed load keeps the frame and the HTML line. Never called in Logistics.
 */
export function domainArt(kind: 'scene' | 'map'): HTMLElement {
  const dom = activeDomain() as ArtDomain;
  const d = done();
  const st = { passed: new Set(rankOf(app.tickets, d).passed), done: app.tickets.filter((x) => d.has(x.id)).length };
  const frame = h('div', { class: cx('w-full bg-accent-soft', kind === 'scene' ? 'aspect-[1100/400] max-h-60' : 'aspect-[980/300] rounded-(--r-ctl)'), 'aria-hidden': 'true' });
  const legend = h('div', { class: 'px-4 py-3 text-body-sm text-muted' }, h('p', { class: 'm-0' }, t(domainText(dom)?.callout ?? 'ecom.scene.callout')));
  void loadDomainArt(dom).then((a) => {
    if (!frame.isConnected) return; // redrawn meanwhile
    frame.replaceWith(kind === 'scene' ? a.scene(st) : a.map(st));
    if (kind === 'map') legend.replaceChildren(h('ul', { class: 'm-0 list-none space-y-0.5 p-0 lg:hidden', 'aria-hidden': 'true' }, ...a.items(st).map((x) => h('li', {}, x))));
  }, () => {});
  // v11 UX #2: the scene stays under ~240 px high so the overview's content starts above the fold; the street bleeds
  // past its viewBox on a wide card (ui-ux-v6 S3), clipped here.
  return h('div', { class: kind === 'scene' ? 'overflow-hidden [&>svg]:max-h-60' : '' }, frame, legend);
}
