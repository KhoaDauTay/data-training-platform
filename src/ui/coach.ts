import { getLang, t, type Key } from '../i18n';
import { loadLessonPrefs } from '../lessons';
import { ackTour, readTour, TOUR_SLOT, TOUR_STEPS, tourEscSkips, tourStep, type TourFacts, type TourSlot } from '../onboarding';
import { SKILLS } from '../progress';
import { isStory } from '../session';
import { app, done } from '../state';
import { localStore, readJson, writeJson, type KV } from '../storage';
import { h } from './dom';
import { mascot } from './mascots';
import { showPane, type Pane } from './paneTabs';
import { go } from './router';

export const COACH_KEY = 'cargo-query/coach-done';
/** Only a stored `true` means "skipped"; anything else (missing, corrupt, other JSON) shows the coach. */
export const coachDone = (storage: KV | undefined = localStore()): boolean => readJson<unknown>(COACH_KEY, storage) === true;

// ---- Ticket 2's hint mark (v4 §B.5). The marks of ticket 1 became the tour below. ----

export type CoachSpot = 'hints';
const dismissed = new Set<CoachSpot>();

function spotNow(): CoachSpot | undefined {
  if (coachDone()) return undefined;
  const second = app.tickets[1];
  return second && app.selectedId === second.id && !done().has(second.id) ? 'hints' : undefined;
}

/** A coach mark placed inside its region (no floating popover), or null. */
export function coach(spot: CoachSpot): HTMLElement | null {
  if (spotNow() !== spot || dismissed.has(spot)) return null;
  const close = (e: Event) => {
    (e.currentTarget as HTMLElement).closest('.coach')?.remove();
    (document.querySelector<HTMLElement>('.hints button') ?? document.getElementById('brief-title'))?.focus();
  };
  return h('aside', { class: 'coach my-3 rounded-xl bg-accent-soft p-3 ring-1 ring-accent', role: 'note' },
    h('p', { class: 'mt-0 mb-2' }, t('coach.hints')),
    h('button', { type: 'button', class: 'mr-1.5', onclick: (e) => { dismissed.add(spot); close(e); } }, t('coach.ok')),
    h('button', { type: 'button', onclick: (e) => { writeJson(COACH_KEY, true); close(e); } }, t('coach.skip')));
}

// ---- The 8-step tour on the real ticket 1 (v4 §B.2 layer 2), led by Boon (L57, V8) ----

/** Tabs the player opened by hand this session (tabs.ts): the Columns tab shown on its own at start does not count. */
const openedTabs = new Set<string>();
/** Quick lessons whose "Run the example" finished this session (lessonCard.ts). */
const examplesRun = new Set<string>();
export function markTabOpened(id: string): void {
  openedTabs.add(id);
  refreshTour();
}
export function markExampleRan(skill: string): void {
  examplesRun.add(skill);
  refreshTour();
}

function facts(): TourFacts {
  const first = app.tickets[0];
  const run = app.lastRun?.result;
  const want = first?.steps[0]?.columns?.length;
  const lesson = first?.grants[0];
  return {
    onFirst: !!first && isStory() && app.selectedId === first.id,
    skipped: coachDone(),
    tour: readTour(),
    ran: app.lastRun !== undefined,
    exampleRan: !lesson || examplesRun.has(lesson) || loadLessonPrefs().seen.includes(lesson),
    columnsSeen: openedTabs.has('columns'),
    shapeOk: !!run && want !== undefined && run.columns.length === want,
    solved: !!first && done().has(first.id),
  };
}

const TEXT: Record<number, Key> = { 1: 'tour.1', 2: 'tour.2', 3: 'tour.3', 4: 'tour.4', 5: 'tour.5', 6: 'tour.6', 7: 'tour.7', 8: 'tour.8' };
const skillLabel = (id: string | undefined): string => SKILLS.find((s) => s.id === id)?.label[getLang()] ?? '';
/** A step's words, with ticket 1's sender and skills filled in (also listed by the welcome screen's replay, V10). */
export function tourText(step: number): string {
  const [first, second] = app.tickets;
  return t(TEXT[step], { name: first?.from.name ?? '', skill: skillLabel(first?.grants[0]), next: skillLabel(second?.grants[0]) });
}

function skip(): void {
  writeJson(COACH_KEY, true);
  refreshTour();
  document.getElementById('brief-title')?.focus();
}

/** The step whose mark was last scrolled into view: each step scrolls once, never on a plain redraw (UI/UX review v10 #1). */
let scrolled: number | undefined;
function reveal(el: HTMLElement, step: number): void {
  if (scrolled === step) return;
  requestAnimationFrame(() => {
    const pane = el.closest('#ticket, #work, #panel')?.id;
    if (pane && el.isConnected) showPane(pane as Pane); // phone: the pane holding Boon's mark (v10 critic #2)
    if (!el.isConnected || el.offsetParent === null || document.getElementById('shell')?.hidden) return; // drawn in a hidden view: try on the next draw
    scrolled = step;
    el.scrollIntoView({ block: 'nearest' }); // scroll only: focus stays where the player is typing
  });
}

/** The region the tour's mark is in now: that region shows no other mascot (v6 §1.4 rule 1, code review v10 #2). */
export function tourRegion(): TourSlot | undefined {
  const step = tourStep(facts());
  return step === undefined ? undefined : TOUR_SLOT[step];
}

/** Boon's mark: --sun-ink on --sun (8.3:1), a step counter, the words, its button(s) and "Skip the tour (Esc)". */
function mark(step: number): HTMLElement {
  const after = (n: number, toPath = false) => () => {
    ackTour(n);
    refreshTour();
    if (toPath) go('learn');
    else document.querySelector<HTMLElement>('[data-tour-mark]')?.focus(); // the next step's mark, wherever it now sits
  };
  const el = h('aside', {
    class: 'tour my-3 flex items-start gap-3 rounded-(--r-card) bg-sun p-3 text-sun-ink', role: 'note', tabindex: '-1',
    'data-tour-mark': String(step), 'aria-label': t('tour.label', { i: step, n: TOUR_STEPS }),
  },
    mascot('boon', 'point', 'size-12'),
    h('div', { class: 'min-w-0 flex-1' },
      h('p', { class: 'm-0 text-xs font-bold tracking-wider uppercase' }, t('tour.label', { i: step, n: TOUR_STEPS })),
      h('p', { class: 'mt-1 mb-2' }, tourText(step)),
      h('div', { class: 'flex flex-wrap gap-2' },
        step === 1 || step === 3 ? h('button', { type: 'button', class: 'primary', onclick: after(step) }, t('tour.next')) : null,
        step === 8 ? h('button', { type: 'button', class: 'primary', onclick: after(8) }, t('tour.done')) : null,
        step === 8 ? h('button', { type: 'button', onclick: after(8, true) }, t('tour.seePath')) : null,
        h('button', { type: 'button', onclick: () => skip() }, t('tour.skip')))));
  reveal(el, step);
  return el;
}

/** A region's placeholder (brief, lesson, work, panel, recap): holds the mark when the current step points there. */
export function tourSlot(slot: TourSlot): HTMLElement {
  const el = h('div', { 'data-tour-slot': slot });
  const step = tourStep(facts());
  if (step !== undefined && TOUR_SLOT[step] === slot) el.append(mark(step));
  return el;
}

/** After anything that may move the tour (rerender, a tab opened, an example run): refill every slot on the page. */
export function refreshTour(): void {
  const step = tourStep(facts());
  if (step !== undefined && step > 1) ackTour(step - 1); // passed steps survive a reload (app.lastRun does not)
  for (const slot of document.querySelectorAll<HTMLElement>('[data-tour-slot]')) {
    const here = step !== undefined && TOUR_SLOT[step] === slot.dataset.tourSlot;
    if (here && slot.firstElementChild?.getAttribute('data-tour-mark') === String(step)) continue; // unchanged: keep focus inside
    slot.replaceChildren(...(here ? [mark(step)] : []));
  }
}

/** `:popover-open` throws in browsers without the Popover API (their menus are display:none, style.css). */
function popoverOpen(): boolean {
  try {
    return !!document.querySelector(':popover-open');
  } catch {
    return false;
  }
}

/** Esc skips the tour (v4 §B.4) unless the mark is out of sight or something else owns Esc (tourEscSkips). */
export function initTour(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const mark = document.querySelector<HTMLElement>('[data-tour-mark]');
    const target = e.target instanceof Element ? e.target : null;
    const owned = !!document.querySelector('dialog:modal, dialog#notebook-dialog[open]') || popoverOpen()
      || document.getElementById('stage')?.hidden === false
      || !!target?.closest('.cm-editor');
    const markVisible = !!mark && !document.getElementById('shell')?.hidden && mark.offsetParent !== null;
    if (tourEscSkips({ markVisible, owned })) skip();
  });
}
