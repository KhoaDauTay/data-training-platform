import { getLang, t, type Lang } from '../i18n';
import { DOMAINS } from '../domains';
import { readTour, startTour, TOUR_STEPS, welcomeNeeded, type BootPick } from '../onboarding';
import { actions, app, done } from '../state';
import { writeJson } from '../storage';
import { BTN_GO, cx } from '../theme';
import { COACH_KEY, coachDone, tourText } from './coach';
import { byId, h, NO_LIGHT_DISMISS } from './dom';
import { domainBadge } from './icons';
import { relabelScene, teachScene } from './teachScene';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;
const LOOP = ['welcome.loop1', 'welcome.loop2', 'welcome.loop3', 'welcome.loop4'] as const;
/**
 * ui-ux-v7 O1 (L148, D-U11): the steps of this open. First visit: language → domain (big cards; picking one moves on)
 * → the loop + "new / I know SQL". A player whose domain is already known skips the domain step; the ⋯ replay is the
 * static language → loop → tour list (V10). In memory only.
 */
type Step = 'lang' | 'domain' | 'start' | 'loop' | 'tour';
let steps: Step[] = ['lang', 'start'];
let panel = 0;
let replay = false;
/**
 * v12.0 P2 (D10-6): a first visitor with nothing remembered picks where to start before anything is seeded. `entering`
 * covers the wait for the picked domain's content, so "Begin" and "I know SQL" cannot open the other domain's ticket 1.
 */
let picking = false;
let entering = false;
/** L87: Boon teaching Lily, built once per open so a progress redraw keeps its loops and the board's highlight. */
let frame: { root: HTMLElement; scene: HTMLElement; body: HTMLElement; db: HTMLElement; foot: HTMLElement } | undefined;

const dialog = (): HTMLDialogElement => byId('welcome-dialog') as HTMLDialogElement;
const title = (text: string) => h('h2', { id: 'welcome-title', tabindex: '-1', class: 'm-0 text-heading' }, text);

/** v4 §B.2 step 3: a beginner gets the tour on ticket 1; "I know SQL" gets no tour, collapsed lessons and every tab (v4 §C.6, V9). */
function choose(knows: boolean): void {
  startTour(knows);
  if (knows) writeJson(COACH_KEY, true);
  dialog().close();
  actions.selectTicket(app.tickets[0].id);
  actions.showTab('columns'); // same ticket id, so setTicket() does not relabel the tabs: hide the ones not open yet (D-O4)
}

/** Every live domain (Logistics, Finance, E-commerce) and "Chỉ học SQL" (lab only): one big card each, badge + name + one line. */
function pickList(): HTMLElement {
  const live = DOMAINS.filter((d) => d.live).map((d) => ({ id: d.id as BootPick, icon: d.icon, name: t(d.name) }));
  const all = [...live, { id: 'general' as BootPick, icon: 'route' as const, name: t('welcome.pickSql') }];
  return h('div', { class: 'grid gap-3 sm:grid-cols-2', role: 'group', 'aria-label': t('welcome.pickLabel') }, ...all.map((p) => h('button', {
    type: 'button', 'data-w': `pick-${p.id}`, disabled: entering,
    class: 'flex items-center gap-3 rounded-(--r-card) px-4 py-4 text-left hover:ring-2 hover:ring-accent',
    onclick: () => void pick(p.id),
  }, domainBadge(p.id, p.icon, 'lg'),
  h('span', { class: 'min-w-0' }, h('b', { class: 'block text-title' }, p.name), h('span', { class: 'block text-body-sm text-muted' }, t(`welcome.short.${p.id}`))))));
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
  if (ok) go(steps.indexOf('start')); // straight on (no redraw of the old step): the title takes focus
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
    const body = h('div', { class: 'min-w-0 space-y-3' });
    const db = h('p', { class: 'm-0 truncate text-center text-caption text-muted' });
    const foot = h('div', { class: 'flex flex-wrap items-center gap-2' });
    frame = {
      // O1 (Q8): the body scrolls, the footer (Back · step n/N · main button, the download line) sticks to the dialog's bottom.
      root: h('div', {}, h('div', { class: 'space-y-4 p-5' }, h('div', { class: 'flex justify-center' }, scene), body),
        h('div', { class: 'sticky bottom-0 space-y-1 border-t border-line bg-panel px-5 py-3' }, foot, db)),
      scene, body, db, foot,
    };
  }
  const step = steps[panel];
  frame.scene.parentElement!.hidden = step !== 'lang';
  relabelScene(frame.scene);
  const db = entering ? t('welcome.entering') : picking || replay ? '' : ready ? t('welcome.dbReady') : p ? t('welcome.dbLoading', { mb: mb(p.loaded) }) : t('db.loading');
  const loop = () => [title(t('welcome.loopTitle')), h('ol', { class: 'm-0 space-y-1' }, ...LOOP.map((k) => h('li', {}, t(k)))), h('p', { class: 'm-0 text-muted' }, t('welcome.loopNote'))];
  const body = step === 'lang'
    ? [title(t('welcome.title')), h('p', { class: 'm-0' }, t('welcome.p1')),
      h('div', { class: 'flex gap-2', role: 'group', 'aria-label': t('top.lang') }, ...(['vi', 'en'] as Lang[]).map((l) => h('button', {
        type: 'button', 'data-w': l, 'aria-pressed': String(getLang() === l), class: 'rounded-full px-4 aria-pressed:bg-accent-soft aria-pressed:font-bold',
        onclick: () => actions.switchLang(l),
      }, l.toUpperCase())))]
    : step === 'domain' ? [title(t('welcome.pickTitle')), h('p', { class: 'm-0 text-muted' }, t('welcome.pickIntro')), pickList()]
      : step === 'loop' ? loop()
        : step === 'tour' ? [title(t('welcome.tourTitle')), h('ol', { class: 'm-0 space-y-1 text-body-sm' }, ...Array.from({ length: TOUR_STEPS }, (_, i) => h('li', {}, tourText(i + 1))))]
          : [...loop(), h('p', { class: 'm-0 pt-2 text-title' }, t('welcome.ask'))];
  // The scene stays in place across redraws (its loops and a focused Lily/Boon button survive a progress tick).
  if (frame.root.parentNode !== d) d.replaceChildren(frame.root);
  frame.body.replaceChildren(...body);
  frame.db.textContent = db;
  frame.db.hidden = !db;
  const last = panel === steps.length - 1;
  const main = (attrs: Record<string, unknown>, text: string) =>
    h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), 'aria-describedby': 'welcome-step', ...attrs }, text);
  frame.foot.replaceChildren(
    panel > 0 && !entering ? h('button', { type: 'button', 'data-w': 'back', class: 'whitespace-nowrap', onclick: () => go(panel - 1) }, t('welcome.back')) : '',
    h('span', { id: 'welcome-step', class: 'flex-1 text-center text-body-sm whitespace-nowrap text-muted' }, t('welcome.page', { i: panel + 1, n: steps.length })),
    // the domain step has no Next: a card is the answer (Esc keeps D10-6, Logistics)
    step === 'domain' ? ''
      : !last ? main({ 'data-w': 'next', onclick: () => go(panel + 1) }, t('welcome.next'))
        : replay ? main({ 'data-w': 'close', onclick: () => d.close() }, t('app.close'))
          : h('span', { class: 'flex flex-wrap justify-end gap-2 max-sm:basis-full max-sm:flex-col-reverse' },
            h('button', { type: 'button', 'data-w': 'knows', class: 'rounded-full px-4 py-2', disabled: entering, onclick: () => choose(true) }, t('welcome.knows')),
            // V22 BOOT (L247): open as soon as the domain is entered; the seed goes on behind ticket 1 (its "preparing"
            // banner, the top bar dot, Run queued with work.queued), so reading the task never waits for the data.
            main({ 'data-w': 'begin', disabled: entering, onclick: () => choose(false) }, t('welcome.begin'))));
  if (keep === 'title') byId('welcome-title').focus();
  else if (keep) d.querySelector<HTMLElement>(`[data-w="${keep}"]`)?.focus();
}

/** First visit, or the ⋯ menu's "Replay the tour" (a static list, V10). Boon greets and teaches Lily (L87); the sprite's idle loops run only while this is open (V4). */
export function openWelcome(asReplay: boolean): void {
  replay = asReplay;
  steps = asReplay ? ['lang', 'loop', 'tour'] : picking ? ['lang', 'domain', 'start'] : ['lang', 'start'];
  panel = 0;
  frame = undefined;
  draw();
  const d = dialog();
  // L148: a stray click beside the first-run welcome must not pick Logistics and skip the tour for good (Esc still does,
  // deliberately: D10-6, v4 §B.4); the ⋯ replay closes on an outside click like every other modal (L140).
  d.toggleAttribute(NO_LIGHT_DISMISS, !asReplay);
  if (!d.open) d.showModal();
  byId('welcome-title').focus(); // not the first mascot button of the scene
  byId('mascot-sprite').classList.add('live');
}

/** Once, after the first route is shown: the welcome screen covers the DB download for a new player (v4 §B.2 layer 1). */
export function initWelcome(needPick: boolean): void {
  const d = dialog();
  // O1: no padding on the dialog itself, so the footer sticks flush to its bottom edge while the body scrolls.
  d.classList.add('p-0', 'max-h-[calc(100dvh-2rem)]', 'overflow-auto');
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

/** rerender(), DB status and download progress: language and the download line follow. */
export function relabelWelcome(): void {
  if (dialog().open) draw();
}
