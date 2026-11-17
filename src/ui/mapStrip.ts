import { getLang, t, type Key } from '../i18n';
import { LANE_XP, laneLabel } from '../lanes';
import { activeDomain } from '../domains';
import { chaptersOf, chapterTitle } from '../progress';
import { ecomArt } from './ecomArt';
import { derive, ROUTES, type Harbor } from '../scene';
import { artSlot } from '../art/load';
import { fleetOrder, takeNewRoutes } from '../routesSeen';
import { actions, app } from '../state';
import { BTN_GO, cx } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { navTargets } from '../viz/progressDots';
import { byId, h } from './dom';
import { icon } from './icons';
import { laneInfo, lanePanel, stateOf, tasksOf } from './lanePanel';
import { startLane, toCurrentTask } from './modes';

/** `lane`: the lane side task open in the workspace (Plan 5); the bar then shows that lane's tasks instead of the chapter's. */
export interface StripView { tickets: Ticket[]; completed: Set<string>; selectedId: string; lane?: Ticket }
type TaskState = 'done' | 'current' | 'locked';
const STATE_KEY: Record<Exclude<TaskState, 'locked'>, Key> = { done: 'map.beat.done', current: 'map.beat.current' };
const ARROW = 'grid size-10 shrink-0 place-items-center p-0 sm:size-8';

/**
 * #map under the top bar (index.html), shown only in story mode on #/play by main.ts (ui-ux-v4 §2, replaces L35/L37):
 * chapter select, ‹ ›, one button per task of the open ticket's chapter, "continue", lane count and the map dialog (§3).
 * Redrawn whole on every update (cheap, never touches the editor); focus inside it is put back by `data-nav`.
 */
export function createMapStrip(host: HTMLElement): { update(view: StripView): void; openLane(port: string): void } {
  const dialog = byId('map-dialog') as HTMLDialogElement;
  let last: StripView | undefined;
  /** Lane whose brief is open in the dialog (mockup v6 screen C); undefined = the lane list. */
  let lanePort: string | undefined;
  // The opener lives outside update() so the dialog's native focus return still finds it after a redraw.
  const mapBtn = h('button', { type: 'button', 'data-nav': 'map', class: 'flex shrink-0 items-center gap-1.5 px-2.5 py-1 max-sm:size-10 max-sm:justify-center max-sm:p-0', onclick: () => {
    if (last) fill(last);
    dialog.showModal();
  } });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // the backdrop (the content box has its own padding)

  const start = (task: Ticket): void => {
    dialog.close();
    startLane(task);
  };
  const pick = (port: string | undefined): void => {
    lanePort = port;
    if (last) fill(last);
    dialog.querySelector<HTMLElement>(port ? '#lane-title' : `[data-lane]`)?.focus();
  };

  /**
   * Lane map + lane list + the brief of the picked lane (side panel from lg, the same sheet below it with "‹ Tất cả tuyến").
   * Pins are buttons with a one-line tooltip (D-B6: days and side tasks, never shipment counts); the HTML list is the
   * readable version and the way in when the SVG labels hide (L34).
   */
  let stopMap: (() => void) | undefined;
  function fill({ tickets, completed }: StripView): void {
    if (activeDomain() !== 'logistics') { // Plan 9 D9-14: the delivery map, no lanes
      dialog.replaceChildren(h('div', { class: 'p-5' },
        h('div', { class: 'mb-3 flex items-start gap-2' },
          h('h2', { id: 'map-dialog-title', class: 'm-0 flex-1 text-lg font-bold' }, t('ecom.map.title')),
          h('form', { method: 'dialog' }, h('button', { class: 'flex items-center gap-1 px-2 py-1 text-sm' }, icon('x', 'size-4'), t('app.close')))),
        ecomArt('map')));
      return;
    }
    const harbor = derive(tickets, completed);
    const map = artSlot('aspect-[980/260] rounded-xl', (art) => {
      const parts = art.routeMap(harbor);
      for (const r of ROUTES) {
        const pin = parts.pins[r.port];
        const tip = `${r.name} · ${laneInfo(r, harbor)}`;
        pin.setAttribute('r', '9'); // a bigger target than the 6-unit dot
        pin.setAttribute('role', 'button');
        pin.setAttribute('tabindex', '0');
        pin.setAttribute('aria-label', tip);
        pin.setAttribute('class', `${pin.getAttribute('class') ?? ''} cursor-pointer`);
        pin.replaceChildren(document.createElementNS('http://www.w3.org/2000/svg', 'title'));
        pin.firstChild!.textContent = tip;
        pin.addEventListener('click', () => pick(r.port));
        pin.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r.port); } });
      }
      parts.svg.removeAttribute('role'); // the pins inside are controls now; the list below says the same in text
      stopMap?.(); // the dialog is refilled on every rerender: one fleet at a time, and it only sails while the dialog is open (on screen)
      stopMap = art.liveMap(parts, harbor, takeNewRoutes(harbor.open), fleetOrder());
      return parts.svg;
    });
    const list = h('ul', { class: 'mt-3 mb-0 grid list-none gap-1.5 p-0 text-sm sm:grid-cols-2' }, ...ROUTES.map((r) =>
      h('li', {}, h('button', {
        type: 'button', 'data-lane': r.port, 'aria-current': r.port === lanePort ? 'true' : false,
        class: cx('flex w-full items-center gap-2 px-3 py-1.5 text-left', r.port === lanePort && 'ring-2 ring-accent', !harbor.open.has(r.port) && 'text-muted'),
        onclick: () => pick(r.port),
      }, icon(harbor.open.has(r.port) ? 'route' : 'lock', 'size-4'), h('b', {}, r.name), h('span', { class: 'ml-auto text-muted' }, laneInfo(r, harbor))))));
    const panel = lanePort
      ? h('div', { class: 'rounded-xl p-4 ring-1 ring-line' },
        h('button', { type: 'button', class: 'mb-2 flex items-center gap-1 px-2 py-1 text-sm lg:hidden', onclick: () => pick(undefined) }, icon('chevronLeft', 'size-4'), t('lane.all')),
        lanePanel(lanePort, harbor, start))
      : h('p', { class: 'm-0 self-start rounded-xl bg-code p-4 text-sm text-muted max-lg:hidden' }, t('lane.pick'));
    dialog.replaceChildren(h('div', { class: 'p-5' },
      h('div', { class: 'flex items-start gap-2' },
        h('div', { class: 'flex-1' },
          h('h2', { id: 'map-dialog-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
          h('p', { class: 'mt-1 mb-3 text-sm text-muted' }, t('map.lanes', { n: harbor.open.size, total: ROUTES.length }), ' · ', t('lane.pickShort'))),
        h('form', { method: 'dialog' }, h('button', { class: 'flex items-center gap-1 px-2 py-1 text-sm' }, icon('x', 'size-4'), t('app.close')))),
      h('div', { class: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' },
        h('div', { class: cx('min-w-0', lanePort && 'max-lg:hidden') }, map, list),
        panel)));
  }

  /** Lane mode of the task bar (mockup v6 screen D): back to the story, the lane's badge and its side tasks. */
  function laneBar(lane: Ticket, harbor: Harbor): HTMLElement {
    const lang = getLang();
    const r = ROUTES.find((x) => x.port === lane.lane)!;
    const tasks = tasksOf(r.port).map((x) => {
      const state = stateOf(x, harbor);
      const label = `${laneLabel(x)} · ${textOf(x, lang).title} · ${t(state === 'done' ? 'map.beat.done' : state === 'open' ? 'lane.stateOpen' : 'nav.taskLocked')}`;
      const here = x.id === lane.id;
      return h('button', {
        type: 'button', 'data-nav': `l:${x.id}`, title: label, 'aria-label': label, disabled: state === 'locked', 'aria-current': here ? 'page' : false,
        class: cx('relative grid h-10 shrink-0 place-items-center px-2 text-sm font-semibold sm:h-8', state === 'done' && 'text-good', state === 'locked' && 'text-muted',
          here && 'border-b-4 border-b-accent bg-accent-soft'),
        onclick: () => { if (!here) startLane(x); },
      }, state === 'locked' ? icon('lock', 'size-3.5') : laneLabel(x),
        state === 'done' ? h('span', { class: 'absolute -top-1 -right-1 grid size-3.5 place-items-center rounded-full bg-panel ring-1 ring-line', 'aria-hidden': 'true' }, icon('check', 'size-2.5')) : null);
    });
    return h('nav', { class: 'flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-1.5 text-sm', 'aria-label': t('nav.tasks') },
      h('button', { type: 'button', 'data-nav': 'back', class: 'flex shrink-0 items-center gap-1 px-3 py-1', onclick: () => toCurrentTask() }, icon('chevronLeft', 'size-4'), t('lane.back')),
      h('span', { class: 'flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-soft px-2 py-1 font-semibold' }, icon('route', 'size-4'), t('lane.badge', { name: r.name })),
      h('div', { class: 'flex shrink-0 items-center gap-1' }, ...tasks),
      h('span', { class: 'text-muted max-sm:hidden' }, t('lane.optional', { xp: LANE_XP })),
      h('div', { class: 'ml-auto flex shrink-0 items-center gap-2 text-muted' },
        h('span', { class: 'max-sm:hidden' }, t('map.lanes', { n: harbor.open.size, total: ROUTES.length })),
        mapBtn));
  }

  return {
    openLane(port) {
      lanePort = port;
      if (last) fill(last);
      dialog.showModal();
      dialog.querySelector<HTMLElement>('#lane-title')?.focus();
    },
    update(view) {
      last = view;
      const { tickets, completed, selectedId } = view;
      if (view.lane) {
        const focusedLane = host.contains(document.activeElement) ? document.activeElement?.getAttribute('data-nav') : null;
        mapBtn.replaceChildren(icon('map', 'size-4'), h('span', { class: 'max-sm:sr-only' }, t('map.see')));
        host.replaceChildren(laneBar(view.lane, derive(tickets, completed)));
        if (focusedLane) host.querySelector<HTMLElement>(`[data-nav="${CSS.escape(focusedLane)}"]`)?.focus();
        if (dialog.open) fill(view);
        return;
      }
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
      }, ...chaptersOf().map((c) => {
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
          activeDomain() === 'logistics' ? h('span', { class: 'max-sm:hidden' }, t('map.lanes', { n: derive(tickets, completed).open.size, total: ROUTES.length })) : null,
          mapBtn)));
      if (focused) host.querySelector<HTMLElement>(`[data-nav="${CSS.escape(focused)}"]`)?.focus();
      if (dialog.open) fill(view); // language or progress changed while the map is open
    },
  };
}
