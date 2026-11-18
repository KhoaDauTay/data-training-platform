import { getLang, t, type Lang } from '../i18n';
import { DOMAINS } from '../domains';
import { readTour, startTour, TOUR_STEPS, welcomeNeeded, type BootPick } from '../onboarding';
import { actions, app, done } from '../state';
import { writeJson } from '../storage';
import { BTN_GO, cx } from '../theme';
import { COACH_KEY, coachDone, tourText } from './coach';
import { byId, h } from './dom';
import { icon } from './icons';
import { relabelScene, teachScene } from './teachScene';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;
const LOOP = ['welcome.loop1', 'welcome.loop2', 'welcome.loop3', 'welcome.loop4'] as const;
/** Panel shown (0–2) and whether this is the static replay from the ⋯ menu (V10). In memory only. */
let panel = 0;
let replay = false;
/**
 * v12.0 P2 (D10-6): a first visitor with nothing remembered picks where to start before anything is seeded. `entering`
 * covers the wait for the picked domain's content, so Next and "I know SQL" cannot open the other domain's ticket 1.
 */
let picking = false;
let entering = false;
/** L87: Boon teaching Lily, built once per open so a progress redraw keeps its loops and the board's highlight. */
let frame: { root: HTMLElement; scene: HTMLElement; db: HTMLElement; rest: HTMLElement } | undefined;

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

/** Every live domain (Logistics, Finance, E-commerce) and "Chỉ học SQL" (lab only). */
function pickList(): HTMLElement {
  const live = DOMAINS.filter((d) => d.live).map((d) => ({ id: d.id as BootPick, icon: d.icon, name: t(d.name), desc: t(d.desc) }));
  const all = [...live, { id: 'general' as BootPick, icon: 'route' as const, name: t('welcome.pickSql'), desc: t('welcome.pickSqlDesc') }];
  return h('div', { class: 'flex flex-col gap-2', role: 'group', 'aria-label': t('welcome.pickLabel') }, ...all.map((p) => h('button', {
    type: 'button', 'data-w': `pick-${p.id}`, disabled: entering, class: 'flex items-start gap-3 rounded-(--r-ctl) px-4 py-3 text-left',
    onclick: () => void pick(p.id),
  }, icon(p.icon, 'mt-0.5 size-5 shrink-0'), h('span', { class: 'min-w-0' }, h('b', { class: 'block' }, p.name), h('span', { class: 'block text-sm text-muted' }, p.desc)))));
}

async function pick(c: BootPick): Promise<void> {
  if (c === 'general') { // D10-8: like Esc, no tour; the learning path opens
    picking = false;
    writeJson(COACH_KEY, true);
    dialog().close();
    void actions.startWith('general');
    return;
  }
  entering = true;
  draw();
  const ok = await actions.startWith(c);
  entering = false;
  if (ok) picking = false; // else the domain's content did not load (banner shown): the picker stays
  if (!dialog().open) return;
  if (ok) go(0); // focus the title: the picked button is gone
  else {
    draw();
    dialog().querySelector<HTMLElement>(`[data-w="pick-${c}"]`)?.focus();
  }
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
  if (!frame) {
    const scene = teachScene('lg');
    const db = h('p', { class: 'm-0 text-center text-xs text-muted' });
    const rest = h('div', { class: 'min-w-0' });
    frame = { root: h('div', { class: 'grid gap-4' }, h('div', { class: 'flex flex-col items-center gap-1' }, scene, db), rest), scene, db, rest };
  }
  relabelScene(frame.scene);
  const db = picking ? '' : ready ? t('welcome.dbReady') : p ? t('welcome.dbLoading', { mb: mb(p.loaded) }) : t('db.loading');
  const body = panel === 0
    ? [title(t('welcome.title')), h('p', {}, t('welcome.p1')),
      h('div', { class: 'flex gap-2', role: 'group', 'aria-label': t('top.lang') }, ...(['vi', 'en'] as Lang[]).map((l) => h('button', {
        type: 'button', 'data-w': l, 'aria-pressed': String(getLang() === l), class: 'rounded-full px-4 aria-pressed:bg-accent-soft aria-pressed:font-bold',
        onclick: () => actions.switchLang(l),
      }, l.toUpperCase()))),
      ...(picking ? [h('p', { class: 'mb-0 mt-4' }, t('welcome.pickIntro')), pickList()] : [])]
    : panel === 1
      ? [title(t('welcome.loopTitle')), h('ol', { class: 'space-y-1' }, ...LOOP.map((k) => h('li', {}, t(k)))), h('p', { class: 'mb-0 text-muted' }, t('welcome.loopNote'))]
      : replay
        ? [title(t('welcome.tourTitle')), h('ol', { class: 'space-y-1 text-sm' }, ...Array.from({ length: TOUR_STEPS }, (_, i) => h('li', {}, tourText(i + 1))))]
        : [title(t('welcome.ask')), h('div', { class: 'flex flex-col gap-2' },
          h('button', { type: 'button', 'data-w': 'begin', class: cx(BTN_GO, 'px-4 py-2'), disabled: !ready, onclick: () => choose(false) }, t(ready ? 'welcome.begin' : 'welcome.preparing')),
          h('button', { type: 'button', 'data-w': 'knows', class: 'rounded-full px-4 py-2', disabled: entering, onclick: () => choose(true) }, t('welcome.knows')))];
  // The scene stays in place across redraws (its loops and a focused Lily/Boon button survive a progress tick).
  if (frame.root.parentNode !== d) d.replaceChildren(frame.root);
  frame.db.textContent = db;
  frame.rest.replaceChildren(...body,
      h('div', { class: 'mt-4 flex items-center gap-2' },
        panel > 0 ? h('button', { type: 'button', 'data-w': 'back', onclick: () => go(panel - 1) }, t('welcome.back')) : null,
        h('span', { class: 'flex-1 text-center text-sm text-muted' }, t('welcome.page', { i: panel + 1, n: 3 })),
        panel < 2 ? h('button', { type: 'button', 'data-w': 'next', class: 'primary', disabled: picking || entering, onclick: () => go(panel + 1) }, t('welcome.next'))
          : replay ? h('button', { type: 'button', 'data-w': 'close', class: 'primary', onclick: () => d.close() }, t('app.close')) : null));
  if (keep === 'title') byId('welcome-title').focus();
  else if (keep) d.querySelector<HTMLElement>(`[data-w="${keep}"]`)?.focus();
}

/** First visit, or the ⋯ menu's "Replay the tour" (a static list, V10). Boon greets and teaches Lily (L87); the sprite's idle loops run only while this is open (V4). */
export function openWelcome(asReplay: boolean): void {
  replay = asReplay;
  panel = 0;
  frame = undefined;
  draw();
  const d = dialog();
  if (!d.open) d.showModal();
  byId('welcome-title').focus(); // not the first mascot button of the scene
  byId('mascot-sprite').classList.add('live');
}

/** Once, after the first route is shown: the welcome screen covers the DB download for a new player (v4 §B.2 layer 1). */
export function initWelcome(needPick: boolean): void {
  const d = dialog();
  d.addEventListener('close', () => byId('mascot-sprite').classList.remove('live'));
  // Esc on the first visit = skip the tour (v4 §B.4); the progressive disclosure still applies (V9).
  d.addEventListener('cancel', (e) => {
    if (replay) return;
    if (entering) { // the picked domain is still loading: Esc would race it with the Logistics fallback
      e.preventDefault();
      return;
    }
    if (picking) { // D10-6: Esc on the picker = the old default, Logistics
      picking = false;
      void actions.startWith('logistics');
    }
    startTour(false);
    writeJson(COACH_KEY, true);
    actions.rerender(); // sidebar locks (D-O3)
    actions.showTab('columns'); // and the tabs not open yet (D-O4)
  });
  picking = needPick;
  if (needPick || welcomeNeeded(done().size, readTour(), coachDone())) openWelcome(false);
}

/** rerender(), DB status and download progress: language, the download line and the "preparing" button follow. */
export function relabelWelcome(): void {
  if (dialog().open) draw();
}
