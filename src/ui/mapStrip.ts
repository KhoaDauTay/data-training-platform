import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle } from '../progress';
import { derive, ROUTES } from '../scene';
import { actions } from '../state';
import { BTN_GO, cx } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { navTargets } from '../viz/progressDots';
import { byId, h } from './dom';
import { icon } from './icons';
import { routeItems, routeMap } from './routeMap';

export interface StripView { tickets: Ticket[]; completed: Set<string>; selectedId: string }
type TaskState = 'done' | 'current' | 'locked';
const STATE_KEY: Record<Exclude<TaskState, 'locked'>, Key> = { done: 'map.beat.done', current: 'map.beat.current' };
const ARROW = 'grid size-10 shrink-0 place-items-center p-0 sm:size-8';

/**
 * #map under the top bar (index.html), shown only in story mode on #/play by main.ts (ui-ux-v4 §2, replaces L35/L37):
 * chapter select, ‹ ›, one button per task of the open ticket's chapter, "continue", lane count and the map dialog (§3).
 * Redrawn whole on every update (cheap, never touches the editor); focus inside it is put back by `data-nav`.
 */
export function createMapStrip(host: HTMLElement): { update(view: StripView): void } {
  const dialog = byId('map-dialog') as HTMLDialogElement;
  let last: StripView | undefined;
  // The opener lives outside update() so the dialog's native focus return still finds it after a redraw.
  const mapBtn = h('button', { type: 'button', 'data-nav': 'map', class: 'flex shrink-0 items-center gap-1.5 px-2.5 py-1 max-sm:size-10 max-sm:justify-center max-sm:p-0', onclick: () => {
    if (last) fill(last);
    dialog.showModal();
  } });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // the backdrop (the content box has its own padding)

  function fill({ tickets, completed }: StripView): void {
    const harbor = derive(tickets, completed);
    dialog.replaceChildren(h('div', { class: 'p-5' },
      h('h2', { id: 'map-dialog-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
      h('p', { class: 'mt-1 mb-3 text-sm text-muted' }, t('routes.subtitle')),
      routeMap(harbor).svg,
      // Always shown: the SVG labels hide below lg, and this is the readable version.
      h('ul', { class: 'mt-3 mb-0 list-none space-y-0.5 p-0 text-sm' }, ...routeItems(harbor).map((x) => h('li', {}, x))),
      h('p', { class: 'my-2 text-sm text-muted' }, t('map.lanes', { n: harbor.open.size, total: ROUTES.length })),
      h('form', { method: 'dialog', class: 'flex justify-end' }, h('button', {}, t('app.close')))));
  }

  return {
    update(view) {
      last = view;
      const { tickets, completed, selectedId } = view;
      const lang = getLang();
      const open = tickets.find((x) => x.id === selectedId);
      const first = tickets.find((x) => !completed.has(x.id));
      const chapter = open?.chapter ?? first?.chapter ?? 1;
      const nav = navTargets(tickets, completed, selectedId);
      const title = (id: string) => textOf(tickets.find((x) => x.id === id)!, lang).title;
      const go = (id: string) => { if (id !== selectedId) actions.selectTicket(id); };
      const focused = host.contains(document.activeElement) ? document.activeElement?.getAttribute('data-nav') : null;

      const select = h('select', {
        'data-nav': 'chapter',
        class: 'min-w-0 max-w-[16rem] truncate rounded-lg border border-line bg-panel px-2 py-1 text-ink max-sm:max-w-none max-sm:flex-1',
        'aria-label': t('nav.chapter'),
        onchange: () => {
          const c = Number(select.value);
          const id = first?.chapter === c ? first.id : tickets.find((x) => x.chapter === c && completed.has(x.id))?.id;
          if (id) go(id);
        },
      }, ...CHAPTERS.map((c) => {
        const own = tickets.filter((x) => x.chapter === c.chapter);
        const reachable = own.some((x) => completed.has(x.id) || x === first);
        const allDone = own.length > 0 && own.every((x) => completed.has(x.id));
        return h('option', { value: String(c.chapter), disabled: !reachable, selected: c.chapter === chapter },
          t('nav.chapterOption', { n: c.chapter, title: chapterTitle(c.chapter, lang) }) + (allDone ? ' ✓' : reachable ? '' : ` ${t('nav.chapterLocked')}`));
      }));

      const arrow = (dir: 'prev' | 'next') => {
        const id = nav[dir];
        return h('button', {
          type: 'button', 'data-nav': dir, class: ARROW, disabled: !id,
          'aria-label': id ? t(dir === 'prev' ? 'nav.prev' : 'nav.next', { title: title(id) }) : t(dir === 'prev' ? 'nav.prevNone' : 'nav.nextNone'),
          onclick: () => id && go(id),
        }, dir === 'prev' ? '‹' : '›');
      };

      const tasks = tickets.filter((x) => x.chapter === chapter).map((x, i) => {
        const state: TaskState = completed.has(x.id) ? 'done' : x === first ? 'current' : 'locked';
        const n = i + 1;
        // A locked task never shows its title (no spoilers): only "{n}. Locked".
        const label = state === 'locked' ? `${n}. ${t('nav.taskLocked')}` : t('nav.task', { n, title: textOf(x, lang).title, state: t(STATE_KEY[state]) });
        const here = x.id === selectedId;
        return h('button', {
          type: 'button', 'data-nav': `t:${x.id}`, title: label, 'aria-label': label, disabled: state === 'locked',
          'aria-current': here ? 'page' : false,
          class: cx('relative grid size-10 shrink-0 place-items-center p-0 text-sm font-semibold tabular-nums sm:size-8',
            state === 'done' && 'text-good', state === 'current' && 'ring-2 ring-accent', state === 'locked' && 'text-muted',
            here && 'border-b-4 border-b-accent bg-accent-soft'),
          onclick: () => go(x.id),
        },
          state === 'locked' ? icon('lock', 'size-3.5') : x.beat === 'boss' ? icon('badge', 'size-4') : String(n),
          state === 'done' ? h('span', { class: 'absolute -top-1 -right-1 grid size-3.5 place-items-center rounded-full bg-panel ring-1 ring-line', 'aria-hidden': 'true' }, icon('check', 'size-2.5')) : null);
      });

      // Right after a correct answer the next ticket is the very next one: the main button. Reviewing an older one: a quiet way back.
      const resume = nav.resume;
      const cont = resume
        ? h('button', {
            type: 'button', 'data-nav': 'continue', onclick: () => go(resume),
            class: cx('shrink-0 px-3 py-1 max-sm:w-full', nav.next === resume && BTN_GO),
          }, t(nav.next === resume ? 'nav.continueNext' : 'nav.continueBack'))
        : null;

      mapBtn.replaceChildren(icon('map', 'size-4'), h('span', { class: 'max-sm:sr-only' }, t('map.see')));
      host.replaceChildren(h('nav', { class: 'flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-1.5 text-sm', 'aria-label': t('nav.tasks') },
        select,
        h('div', { class: 'flex shrink-0 items-center gap-1 max-sm:order-3 max-sm:w-full max-sm:flex-wrap max-sm:justify-center' }, arrow('prev'), ...tasks, arrow('next')),
        cont ? h('div', { class: 'shrink-0 max-sm:order-4 max-sm:w-full' }, cont) : null,
        h('div', { class: 'ml-auto flex shrink-0 items-center gap-2 text-muted max-sm:order-2' },
          h('span', { class: 'max-sm:hidden' }, t('map.lanes', { n: derive(tickets, completed).open.size, total: ROUTES.length })),
          mapBtn)));
      if (focused) host.querySelector<HTMLElement>(`[data-nav="${CSS.escape(focused)}"]`)?.focus();
      if (dialog.open) fill(view); // language or progress changed while the map is open
    },
  };
}
