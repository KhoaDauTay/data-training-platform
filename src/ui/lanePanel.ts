import { loadLanes } from '../content';
import { getLang, t } from '../i18n';
import { LANE_XP, laneLabel, laneTaskState, shown, type LaneTaskState } from '../lanes';
import type { MapParts } from '../art/logistics';
import { ROUTES, type Harbor, type RouteInfo } from '../scene';
import { app } from '../state';
import { BTN_GO, cx, DONE_PILL, PILL } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { h, nodes } from './dom';
import { icon } from './icons';

/** Lane briefs and side tasks in the map dialog and the lane task bar (mockup v6 screens C–E, L49). */

export const tasksOf = (port: string): Ticket[] => loadLanes().tasks.filter((x) => x.lane === port);
export const stateOf = (task: Ticket, harbor: Harbor): LaneTaskState => laneTaskState(task, harbor.open, harbor.passed, app.save.lanes);

/** "~30 ngày · 1/3 bài tuyến", "~5 ngày · đợt sau" (no content yet, L49), "mở sau đánh giá ch. 5" (lane closed). */
export function laneInfo(r: RouteInfo, harbor: Harbor): string {
  if (!harbor.open.has(r.port)) return t('lane.lockedAt', { n: r.opens });
  const tasks = tasksOf(r.port);
  const days = t('lane.days', { n: r.days });
  return tasks.length ? `${days} · ${t('lane.count', { done: tasks.filter((x) => app.save.lanes.includes(x.id)).length, total: tasks.length })}` : `${days} · ${t('lane.later')}`;
}

/** One side task in the brief's list: done (✓, review it), open (do it) or locked (title and when it opens, L49). */
function taskRow(task: Ticket, harbor: Harbor, start: (task: Ticket) => void): HTMLElement {
  const lang = getLang();
  const state = stateOf(task, harbor);
  return h('li', { class: 'flex flex-wrap items-center gap-2 rounded-(--r-inset) p-2 ring-1 ring-line' },
    h('span', { class: cx(PILL, state === 'done' ? DONE_PILL : 'bg-code text-ink') }, state === 'done' ? icon('check', 'size-3.5') : state === 'locked' ? icon('lock', 'size-3.5') : null, laneLabel(task)),
    h('b', { class: cx('min-w-0 flex-1', state === 'locked' && 'text-muted') }, textOf(task, lang).title),
    state === 'locked'
      ? h('span', { class: 'text-body-sm text-muted' }, t('lane.taskAt', { n: task.chapter, xp: LANE_XP }))
      : h('button', { type: 'button', class: cx('px-3 py-1 text-body-sm', state === 'open' && BTN_GO), onclick: () => start(task) },
        t(state === 'done' ? 'lane.review' : 'lane.start')));
}

/** The brief of one lane. A closed lane shows two lines of preview and when it opens (product-design-v3 §13). */
export function lanePanel(port: string, harbor: Harbor, start: (task: Ticket) => void): HTMLElement {
  const lang = getLang();
  const r = ROUTES.find((x) => x.port === port)!;
  const brief = loadLanes().briefs.find((b) => b.port === port);
  const title = h('h3', { id: 'lane-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, [r.name, brief?.country[lang], port].filter(Boolean).join(' · '));
  const head = h('p', { class: 'm-0 text-body-sm font-semibold text-muted' }, t('lane.brief'));
  if (!harbor.open.has(port) || !brief) {
    return h('div', { class: 'space-y-2' }, head, title,
      brief ? h('p', { class: 'm-0 line-clamp-2' }, brief.intro[lang]) : null,
      h('p', { class: 'm-0 text-body-sm text-muted' }, harbor.open.has(port) ? t('lane.laterLong') : t('lane.lockedLong', { n: r.opens })));
  }
  const passed = harbor.passed;
  const tasks = tasksOf(port);
  const doneN = tasks.filter((x) => app.save.lanes.includes(x.id)).length;
  return h('div', { class: 'space-y-3' },
    head, title,
    h('p', { class: 'm-0' }, brief.intro[lang]),
    h('div', { class: 'grid grid-cols-3 gap-2 text-center' }, ...brief.numbers.filter((x) => shown(x, passed)).map((x) =>
      h('div', { class: 'rounded-(--r-ctl) bg-code p-2' }, h('b', { class: 'block text-xl tabular-nums' }, x.value ?? ''), h('span', { class: 'text-caption text-muted' }, x.text[lang])))),
    h('dl', { class: 'm-0 space-y-1.5 text-body-sm' }, ...brief.facts.filter((x) => shown(x, passed)).map((x) =>
      h('div', {}, h('dt', { class: 'inline font-semibold' }, `${x.label?.[lang] ?? ''}: `), h('dd', { class: 'inline' }, x.text[lang])))),
    h('p', { class: 'm-0 rounded-(--r-inset) border-l-4 border-accent bg-accent-soft p-2 text-body-sm' }, h('b', {}, t('lane.asked')), ' ', brief.asked[lang]),
    h('p', { class: 'm-0 flex items-center gap-1.5 text-caption text-muted' }, icon('info', 'size-3.5'), t('lane.illustrative')),
    h('h4', { class: 'm-0 flex items-center gap-2' }, icon('route', 'size-4'), t('lane.tasks', { done: doneN, total: tasks.length })),
    h('ul', { class: 'm-0 list-none space-y-1.5 p-0' }, ...tasks.map((x) => taskRow(x, harbor, start))),
    h('p', { class: 'm-0 text-caption text-muted' }, t('lane.rules', { xp: LANE_XP })));
}

/** Under the brief in the workspace: the side task is optional and outside the chapter (mockup v6 screen D). */
export function laneNote(task: Ticket, openBrief: (port: string) => void): HTMLElement {
  const r = ROUTES.find((x) => x.port === task.lane)!;
  return h('div', { class: 'my-3 space-y-2 rounded-(--r-inset) bg-code p-3 text-body-sm' }, ...nodes(
    h('p', { class: 'm-0 flex items-start gap-1.5' }, icon('info', 'mt-0.5 size-4 shrink-0'), t('lane.rules', { xp: LANE_XP })),
    h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1', onclick: () => openBrief(r.port) }, icon('map', 'size-4'), t('lane.seeBrief', { name: r.name }))));
}

/**
 * Map pins as buttons (map dialog and the Map page, v12.0 U4): a one-line tooltip each (D-B6: days and side tasks, never
 * shipment counts); `pick` opens that lane's brief. The HTML lane list says the same in text (L34).
 */
export function wirePins(parts: Pick<MapParts, 'svg' | 'pins'>, harbor: Harbor, pick: (port: string) => void): void {
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
  parts.svg.removeAttribute('role'); // the pins inside are controls now
}
