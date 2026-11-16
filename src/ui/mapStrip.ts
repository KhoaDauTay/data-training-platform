import { t, type Key } from '../i18n';
import { hashOf } from '../route';
import { derive, ROUTES } from '../scene';
import { cx } from '../theme';
import type { Ticket } from '../tickets';
import type { BeatState, ChapterDot } from '../viz/progressDots';
import { h } from './dom';

const BEAT_KEY: Record<BeatState, Key> = { done: 'map.beat.done', current: 'map.beat.current', todo: 'map.beat.todo' };
const BEAT_SYMBOL: Record<BeatState, string> = { done: '●', current: '◐', todo: '○' };
/** Colour only on the small dots (L23). */
const BEAT_CLASS: Record<BeatState, string> = { done: 'text-good', current: 'text-accent', todo: 'text-muted' };

export interface StripView { chapter: number; dots: ChapterDot[]; tickets: Ticket[]; completed: Set<string> }

/**
 * #map under the top bar (index.html), shown only on #/play by main.ts. One line (L35): the chapter's dots,
 * the open-lane count (derive().open, L32) and a link to the Tien Sa map on Home. No map is drawn here.
 */
export function createMapStrip(host: HTMLElement): { update(view: StripView): void } {
  const progress = h('span', { class: 'text-ink', role: 'img' });
  const caption = h('span', { class: 'mr-auto' });
  const link = h('a', { href: hashOf('home'), class: 'text-accent' });
  host.replaceChildren(h('div', { class: 'flex min-h-7 flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-0.5 text-sm text-muted' }, progress, caption, link));

  return {
    update({ chapter, dots, tickets, completed }) {
      progress.setAttribute('aria-label', t('map.progress', { done: dots.filter((d) => d.state === 'done').length, total: dots.length }));
      progress.replaceChildren(t('map.chapter', { n: chapter }), ...dots.map((d) =>
        h('span', {
          class: cx('ml-1', BEAT_CLASS[d.state]),
          title: `${d.id}: ${t(BEAT_KEY[d.state])}${d.review ? ` · ${t('beat.boss')}` : ''}`,
          'aria-hidden': 'true',
        }, d.review ? '◆' : BEAT_SYMBOL[d.state])));
      caption.textContent = t('map.lanes', { n: derive(tickets, completed).open.size, total: ROUTES.length });
      link.textContent = t('map.toHome');
    },
  };
}
