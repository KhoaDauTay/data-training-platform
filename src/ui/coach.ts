import { getLang, t, type Key } from '../i18n';
import { loadLessonPrefs } from '../lessons';
import { ackTour, readTour, TOUR_SLOT, TOUR_STEPS, tourEscSkips, tourLeft, tourStep, type TourFacts, type TourSlot } from '../onboarding';
import { SKILLS } from '../progress';
import { isStory } from '../session';
import { app, done } from '../state';
import { localStore, readJson, writeJson, type KV } from '../storage';
import { once } from './celebrate';
import { h, reducedMotion } from './dom';
import { mascot } from './mascots';
import { showPane, type Pane } from './paneTabs';
import { go } from './router';

export const COACH_KEY = 'cargo-query/coach-done';
/** Only a stored `true` means "skipped"; anything else (missing, corrupt, other JSON) shows the coach. */
export const coachDone = (storage: KV | undefined = localStore()): boolean => readJson<unknown>(COACH_KEY, storage) === true;
/** src/guides.ts GUIDES_KEY, spelled out so main never imports the guide modules (v13). */
export const GUIDES_PREF = 'cargo-query/guides';
/**
 * L318 (feedback #11): "Skip all guides" on a tour or guide mark: the tour is skipped and Boon's guides are off everywhere
 * (the seen list is kept). ⋯ "Bật lại hướng dẫn của Boon" undoes both.
 */
export function skipAllGuides(storage?: KV): void {
  const g = readJson<{ seen?: unknown }>(GUIDES_PREF, storage);
  writeJson(COACH_KEY, true, storage);
  writeJson(GUIDES_PREF, { seen: Array.isArray(g?.seen) ? g.seen : [], off: true }, storage);
}
/** ⋯ "Bật lại hướng dẫn của Boon": every guide shows again once, and a tour skipped before its end comes back. */
export function restoreGuides(storage?: KV): void {
  writeJson(GUIDES_PREF, { seen: [], off: false }, storage);
  writeJson(COACH_KEY, false, storage);
}

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
  return h('aside', { class: 'coach my-3 rounded-(--r-ctl) bg-accent-soft p-3 ring-1 ring-accent', role: 'note' },
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
/** Every skill a ticket teaches, as one list ("SELECT and WHERE"): Finance's ticket 1 teaches two (L152). */
const skillLabels = (ids: readonly string[] = []): string => {
  const lang = getLang();
  const labels = ids.map((id) => SKILLS.find((s) => s.id === id)?.label[lang]).filter((l): l is string => !!l);
  return new Intl.ListFormat(lang, { type: 'conjunction' }).format(labels);
};
/** A step's words, with ticket 1's sender and skills filled in (also listed by the welcome screen's replay, V10). */
export function tourText(step: number): string {
  const [first, second] = app.tickets;
  return t(TEXT[step], { name: first?.from.name ?? '', skill: skillLabels(first?.grants), next: skillLabels(second?.grants) });
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
    enterMark(el); // laid out for the first time at this step: a redraw of the same step never replays it
    el.scrollIntoView({ block: 'nearest' }); // scroll only: focus stays where the player is typing
    if (step !== 1) return;
    // L152 (v10 F2): step 1 talks about the Expected result card right under it: bring that card into view too, never the mark out of it
    el.closest('[data-tour-slot]')?.nextElementSibling?.scrollIntoView({ block: 'nearest' });
    const box = el.closest('#ticket')?.getBoundingClientRect();
    if (box && el.getBoundingClientRect().top < box.top) el.scrollIntoView({ block: 'start' });
  });
}

/** The region the tour's mark is in now: that region shows no other mascot (v6 §1.4 rule 1, code review v10 #2). */
export function tourRegion(): TourSlot | undefined {
  const step = tourStep(facts());
  return step === undefined ? undefined : TOUR_SLOT[step];
}

/** Boon's mark (tour and guides, v8 §2.1): --sun-ink on --sun (8.3:1), a label, the words and its buttons. */
export function boonMark(o: { label: string; aria: string; text: string; buttons: (HTMLElement | null)[]; mascot?: boolean; compact?: boolean; data: Record<string, string> }): HTMLElement {
  // L152: one line (label, the words cut with an ellipsis, the buttons), so it no longer pushes the Expected result card down
  if (o.compact) return h('aside', { class: 'tour my-2 flex items-center gap-2 rounded-(--r-card) bg-sun px-3 py-1.5 text-sun-ink', role: 'note', tabindex: '-1', 'aria-label': o.aria, ...o.data },
    h('p', { class: 'm-0 min-w-0 flex-1 truncate', title: o.text }, h('span', { class: 'text-caption font-bold tracking-wider uppercase' }, o.label), ' · ', o.text),
    ...o.buttons);
  return h('aside', { class: 'tour my-3 flex items-start gap-3 rounded-(--r-card) bg-sun p-3 text-sun-ink', role: 'note', tabindex: '-1', 'aria-label': o.aria, ...o.data },
    o.mascot === false ? null : mascot('boon', 'point', 'size-12'),
    h('div', { class: 'min-w-0 flex-1' },
      h('p', { class: 'm-0 text-caption font-bold tracking-wider uppercase' }, o.label),
      h('p', { class: 'mt-1 mb-2' }, o.text),
      h('div', { class: 'flex flex-wrap gap-2' }, ...o.buttons)));
}

/** ui-ux-v5 B4: a mark of a new step slides in once (style.css): the aside fades, Boon hops. Call only when the step key changes. */
export function enterMark(el: HTMLElement): void {
  if (reducedMotion()) return;
  el.classList.add('cq-fade');
  once(el, 'cq-fade');
  const boon = el.querySelector('svg[data-mascot]');
  if (boon) { boon.classList.add('cq-hop'); once(boon, 'cq-hop'); }
}

/** Step 1 shrinks to one line once the player has run something (L152, v10 F2): they are past reading the brief. */
const compactNow = (step: number): boolean => step === 1 && app.lastRun !== undefined;

function mark(step: number): HTMLElement {
  const after = (n: number, toPath = false) => () => {
    ackTour(n);
    refreshTour();
    if (toPath) go('learn');
    else document.querySelector<HTMLElement>('[data-tour-mark]')?.focus(); // the next step's mark, wherever it now sits
  };
  const label = t('tour.label', { i: step, n: TOUR_STEPS });
  const compact = compactNow(step);
  const el = boonMark({ label, aria: label, text: tourText(step), compact, data: { 'data-tour-mark': String(step), ...(compact ? { 'data-tour-compact': '' } : {}) }, buttons: [
    step === 1 || step === 3 ? h('button', { type: 'button', class: 'primary', onclick: after(step) }, t('tour.next')) : null,
    step === 8 ? h('button', { type: 'button', class: 'primary', onclick: after(8) }, t('tour.done')) : null,
    step === 8 ? h('button', { type: 'button', onclick: after(8, true) }, t('tour.seePath')) : null,
    h('button', { type: 'button', onclick: () => skip() }, t('tour.skip')),
    h('button', { type: 'button', 'data-skip-all': '', class: 'min-h-6 border-0 bg-transparent px-1 text-body-sm text-sun-ink underline shadow-none', onclick: () => { skipAllGuides(); skip(); } }, t('guide.skipAll')),
  ] });
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
  const f = facts();
  if (tourLeft(f)) ackTour(TOUR_STEPS); // L152: step 8 was shown and the player moved on: the tour is over, here and in every domain
  const step = tourStep(f);
  if (step !== undefined && step > 1) ackTour(step - 1); // passed steps survive a reload (app.lastRun does not)
  for (const slot of document.querySelectorAll<HTMLElement>('[data-tour-slot]')) {
    const here = step !== undefined && TOUR_SLOT[step] === slot.dataset.tourSlot;
    const old = slot.firstElementChild;
    if (here && old?.getAttribute('data-tour-mark') === String(step) && old.hasAttribute('data-tour-compact') === compactNow(step)) continue; // unchanged: keep focus inside
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

/** Something else closes on this Esc: a modal, the open notebook, a popover, the completion dock, or focus in CodeMirror. */
export function escOwned(target: EventTarget | null): boolean {
  return !!document.querySelector('dialog:modal, dialog#notebook-dialog[open]') || popoverOpen()
    || document.getElementById('stage')?.hidden === false
    || (target instanceof Element && !!target.closest('.cm-editor'));
}

/** Esc skips the tour (v4 §B.4) unless the mark is out of sight or something else owns Esc (tourEscSkips). */
export function initTour(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const mark = document.querySelector<HTMLElement>('[data-tour-mark]');
    const markVisible = !!mark && !document.getElementById('shell')?.hidden && mark.offsetParent !== null;
    if (tourEscSkips({ markVisible, owned: escOwned(e.target) })) skip();
  });
}

// ---- Boon's guides in the General area (v13, product-design-v8 §2): the engine lives in the learnui chunk (ui/guide.ts) ----

/** Filled by ui/guide.ts when the learnui chunk loads; until then no guide shows and boonRegion() is the tour's alone. */
export const guideHooks: {
  refresh?: () => void; region?: () => string | undefined;
  /** "Boon chỉ mình" (v8 §2.1): the guide `id` again from step 1. */
  replay?: (id: string) => void;
  /** The "Boon chỉ mình" button of guide `id` (its text lives in the learnui chunk). */
  replayBtn?: (id: string) => HTMLElement;
  /** A lesson's example ran (G4 moves on). */
  ran?: () => void;
  /** Set by lessonCard.ts while the lesson dialog is open from the General area; `diff`: its Try box shows the diff. */
  lesson?: { diff: () => boolean };
  /** Set by work.ts: the work pane shows the diff of a wrong drill submit. */
  diff?: () => boolean;
} = {};
/** An empty placeholder a page draws where a guide step may point (`data-guide-slot`, beside the tour's slots, never inside them). */
export const guideSlot = (slot: string): HTMLElement => h('div', { 'data-guide-slot': slot });
/** After rerender(): refill every guide slot on the page. */
export const refreshGuides = (): void => guideHooks.refresh?.();
/** The region Boon's tour or guide mark is in now ('brief', 'lesson', 'work', 'panel', 'recap', 'dialog', 'page'): no other mascot there. */
export const boonRegion = (): string | undefined => tourRegion() ?? guideHooks.region?.();
