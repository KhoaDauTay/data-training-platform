import { getLang, t, type Lang } from '../i18n';
import { readTour, startTour, TOUR_STEPS, welcomeNeeded } from '../onboarding';
import { actions, app, done } from '../state';
import { writeJson } from '../storage';
import { BTN_GO, cx } from '../theme';
import { COACH_KEY, coachDone, tourText } from './coach';
import { byId, h } from './dom';
import { relabelScene, teachScene } from './teachScene';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;
const LOOP = ['welcome.loop1', 'welcome.loop2', 'welcome.loop3', 'welcome.loop4'] as const;
/** Panel shown (0–2) and whether this is the static replay from the ⋯ menu (V10). In memory only. */
let panel = 0;
let replay = false;
/** L87: Boon teaching Lily, built once per open so a progress redraw keeps its loops and the board's highlight. */
let scene: HTMLElement | undefined;

const dialog = (): HTMLDialogElement => byId('welcome-dialog') as HTMLDialogElement;
const title = (text: string) => h('h2', { id: 'welcome-title', tabindex: '-1', class: 'm-0 text-xl font-extrabold' }, text);

/** v4 §B.2 step 3: a beginner gets the tour on ticket 1; "I know SQL" gets no tour, collapsed lessons and every tab (v4 §C.6, V9). */
function choose(knows: boolean): void {
  startTour(knows);
  if (knows) writeJson(COACH_KEY, true);
  dialog().close();
  actions.selectTicket(app.tickets[0].id);
  actions.showTab('columns'); // same ticket id, so setTicket() does not relabel the tabs: hide the ones not open yet (D-O4)
}

function go(to: number): void {
  panel = to;
  draw();
  byId('welcome-title').focus();
}

function draw(): void {
  const d = dialog();
  const was = document.activeElement as HTMLElement | null;
  const keep = was?.id === 'welcome-title' ? 'title' : was?.dataset?.w; // progress redraws often: keep the focused button or title
  const ready = app.dbStatus === 'ready';
  const p = app.loadProgress;
  scene ??= teachScene('lg');
  relabelScene(scene);
  const db = ready ? t('welcome.dbReady') : p ? t('welcome.dbLoading', { mb: mb(p.loaded) }) : t('db.loading');
  const body = panel === 0
    ? [title(t('welcome.title')), h('p', {}, t('welcome.p1')),
      h('div', { class: 'flex gap-2', role: 'group', 'aria-label': t('top.lang') }, ...(['vi', 'en'] as Lang[]).map((l) => h('button', {
        type: 'button', 'data-w': l, 'aria-pressed': String(getLang() === l), class: 'rounded-full px-4 aria-pressed:bg-accent-soft aria-pressed:font-bold',
        onclick: () => actions.switchLang(l),
      }, l.toUpperCase())))]
    : panel === 1
      ? [title(t('welcome.loopTitle')), h('ol', { class: 'space-y-1' }, ...LOOP.map((k) => h('li', {}, t(k)))), h('p', { class: 'mb-0 text-muted' }, t('welcome.loopNote'))]
      : replay
        ? [title(t('welcome.tourTitle')), h('ol', { class: 'space-y-1 text-sm' }, ...Array.from({ length: TOUR_STEPS }, (_, i) => h('li', {}, tourText(i + 1))))]
        : [title(t('welcome.ask')), h('div', { class: 'flex flex-col gap-2' },
          h('button', { type: 'button', 'data-w': 'begin', class: cx(BTN_GO, 'px-4 py-2'), disabled: !ready, onclick: () => choose(false) }, t(ready ? 'welcome.begin' : 'welcome.preparing')),
          h('button', { type: 'button', 'data-w': 'knows', class: 'rounded-full px-4 py-2', onclick: () => choose(true) }, t('welcome.knows')))];
  d.replaceChildren(h('div', { class: 'grid gap-4' },
    h('div', { class: 'flex flex-col items-center gap-1' }, scene, h('p', { class: 'm-0 text-center text-xs text-muted' }, db)),
    h('div', { class: 'min-w-0' }, ...body,
      h('div', { class: 'mt-4 flex items-center gap-2' },
        panel > 0 ? h('button', { type: 'button', 'data-w': 'back', onclick: () => go(panel - 1) }, t('welcome.back')) : null,
        h('span', { class: 'flex-1 text-center text-sm text-muted' }, t('welcome.page', { i: panel + 1, n: 3 })),
        panel < 2 ? h('button', { type: 'button', 'data-w': 'next', class: 'primary', onclick: () => go(panel + 1) }, t('welcome.next'))
          : replay ? h('button', { type: 'button', 'data-w': 'close', class: 'primary', onclick: () => d.close() }, t('app.close')) : null))));
  if (keep === 'title') byId('welcome-title').focus();
  else if (keep) d.querySelector<HTMLElement>(`[data-w="${keep}"]`)?.focus();
}

/** First visit, or the ⋯ menu's "Replay the tour" (a static list, V10). Boon greets and teaches Lily (L87); the sprite's idle loops run only while this is open (V4). */
export function openWelcome(asReplay: boolean): void {
  replay = asReplay;
  panel = 0;
  scene = undefined;
  draw();
  const d = dialog();
  if (!d.open) d.showModal();
  byId('welcome-title').focus(); // not the first mascot button of the scene
  byId('mascot-sprite').classList.add('live');
}

/** Once, after the first route is shown: the welcome screen covers the DB download for a new player (v4 §B.2 layer 1). */
export function initWelcome(): void {
  const d = dialog();
  d.addEventListener('close', () => byId('mascot-sprite').classList.remove('live'));
  // Esc on the first visit = skip the tour (v4 §B.4); the progressive disclosure still applies (V9).
  d.addEventListener('cancel', () => {
    if (replay) return;
    startTour(false);
    writeJson(COACH_KEY, true);
    actions.rerender(); // sidebar locks (D-O3)
    actions.showTab('columns'); // and the tabs not open yet (D-O4)
  });
  if (welcomeNeeded(done().size, readTour(), coachDone())) openWelcome(false);
}

/** rerender(), DB status and download progress: language, the download line and the "preparing" button follow. */
export function relabelWelcome(): void {
  if (dialog().open) draw();
}
