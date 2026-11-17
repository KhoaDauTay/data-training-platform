import { t } from '../i18n';
import { cx } from '../theme';
import { h } from './dom';

/**
 * E-commerce art slots (Plan 9 D9-13/D9-20): the Overview scene, the Map page and the task bar's map dialog. A frame of the
 * picture's size and the key line as HTML (below lg the SVG text hides, L35); never the Logistics harbour or lanes.
 */
export function ecomArt(kind: 'scene' | 'map'): HTMLElement {
  const frame = h('div', { class: cx('w-full bg-accent-soft', kind === 'scene' ? 'aspect-[1100/400]' : 'aspect-[980/300] rounded-xl'), 'aria-hidden': 'true' });
  return h('div', {}, frame, h('p', { class: 'm-0 px-4 py-3 text-sm text-muted' }, t('ecom.scene.callout')));
}
