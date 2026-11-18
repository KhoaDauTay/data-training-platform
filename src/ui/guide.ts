import { GUIDES_KEY, guideFor, guideRegion, parseGuides, withSeen, type GuidesPref } from '../guides';
import { learnText, type LearnKey } from '../i18n/learn';
import type * as I18n from '../i18n';
import type * as Coach from './coach';
import type * as Dom from './dom';
import type * as Onboarding from '../onboarding';
import type * as PaneTabs from './paneTabs';
import type * as State from '../state';
import type * as Storage from '../storage';

/**
 * v13 (product-design-v8 §2.1): the engine of Boon's guides in the General area. Lives in the learnui chunk (imported by
 * drillBrief.ts); main only draws empty `data-guide-slot`s (coach.ts guideSlot) and calls guideHooks. Main values come in
 * through `initGuides` (Plan 6 U3). Pages offer guides with `offerGuides`; at most one shows at a time.
 */
export interface GuideDeps {
  h: typeof Dom.h; announce: typeof Dom.announce; getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  actions: typeof State.actions; readJson: typeof Storage.readJson; writeJson: typeof Storage.writeJson; readTour: typeof Onboarding.readTour;
  boonMark: typeof Coach.boonMark; escOwned: typeof Coach.escOwned; guideHooks: typeof Coach.guideHooks; guideSlot: typeof Coach.guideSlot;
  showPane: typeof PaneTabs.showPane;
}
export interface GuideStep {
  /** The `data-guide-slot` the mark goes in (v8 §2.3). */
  slot: string;
  text: () => string;
  /** A button before Next/Done, e.g. "Open Module 1". */
  action?: { label: () => string; run: () => void };
  /** false: no Boon in the mark (the learning path's first step speaks from the teaching scene, v8 §2.1). */
  mascot?: boolean;
}
export interface Guide {
  id: string; steps: GuideStep[];
  /** Ids also marked seen when this one ends (a module's full intro covers that module's short one). */
  also?: string[];
  /** After Done on the last step (the learning path: Lily cheers, v8 G1). */
  done?: () => void;
}
/** What the open page offers now, from app state (never from the DOM: boonRegion() asks while the page is being drawn). */
export type GuideProvider = () => Guide[];

let d$: GuideDeps;
const lt = (key: LearnKey, params?: I18n.Params): string => learnText(d$.getLang(), d$.locale(), key, params);
const providers: GuideProvider[] = [];
/** The last focus went into a guide mark: a page redraw that rebuilt it gives focus to the new one (never <body>). */
let held = false;
export const offerGuides = (p: GuideProvider): void => void providers.push(p);

/** The guide on screen and its step. Memory only: leaving the page drops it, and it starts again from step 1 next time. */
let active: { guide: Guide; step: number } | undefined;
/** The step whose mark was last scrolled into view, so a plain redraw never scrolls again. */
let revealed: string | undefined;
/** The next mark takes focus (Next, "Boon chỉ mình"); a mark that shows by itself is only announced. */
let focusNext = false;

const pref = (): GuidesPref | undefined => parseGuides(d$.readJson<unknown>(GUIDES_KEY));

function current(): typeof active {
  const list = providers.flatMap((p) => p());
  const same = active && list.find((g) => g.id === active!.guide.id);
  if (active && !same) revealed = undefined; // left the page: the guide starts over, and is revealed again, next time
  if (active) active = same ? { guide: same, step: Math.min(active.step, same.steps.length - 1) } : undefined;
  if (!active) {
    const id = guideFor({ offered: list.map((g) => g.id), knows: d$.readTour()?.knows === true, tour: tourMarkShown() }, pref());
    const g = list.find((x) => x.id === id);
    if (g?.steps.length) active = { guide: g, step: 0 };
  }
  return active;
}

/** A tour mark is on screen (not merely a tour step pending on ticket 1 while the player is on the learning path). */
const tourMarkShown = (): boolean => [...document.querySelectorAll<HTMLElement>('[data-tour-mark]')].some((e) => e.offsetParent !== null);

/** The guide on screen points into the lesson dialog. */
const inDialog = (): boolean => !!active && guideRegion(active.guide.steps[active.step].slot) === 'dialog';

/** `dialog`: the guide lives in the lesson dialog, whose card swaps Boon by CSS: refill the slots only. A page rerender would rebuild the button that opened the dialog, and focus could not return to it. */
function redraw(focus: boolean, dialog = false): void {
  focusNext = focus;
  if (dialog) refresh();
  else d$.actions.rerender(); // mascots elsewhere follow boonRegion(); rerender() ends with refreshGuides()
}

/** Done, Skip, Esc or the lesson dialog closed (D-G3): seen. A failed write only shows the guide again next time. */
function finish(id: string, off = false): void {
  if (active?.guide.id !== id) return;
  const also = active.guide.also ?? [];
  const dialog = inDialog();
  active = undefined;
  const seen = [id, ...also].reduce<GuidesPref | undefined>((p, x) => withSeen(p, x), pref());
  d$.writeJson(GUIDES_KEY, { ...seen, ...(off ? { off } : {}) });
  redraw(!!document.activeElement?.closest('[data-guide-mark]'), dialog); // focus was in the mark: the next mark, or the page title, takes it
}

function next(): void {
  if (!active) return;
  if (active.step + 1 >= active.guide.steps.length) {
    const done = active.guide.done;
    finish(active.guide.id);
    return done?.();
  }
  active.step++;
  redraw(true, inDialog());
}

/** "Boon chỉ mình": the page's guide again from step 1, even when seen, turned off or "I know SQL" (D-G1). Nothing is saved until it ends. */
export function replayGuide(id: string): void {
  const g = providers.flatMap((p) => p()).find((x) => x.id === id);
  if (!g?.steps.length) return;
  active = { guide: g, step: 0 };
  redraw(true, inDialog());
}

function markOf(a: NonNullable<typeof active>, key: string): HTMLElement {
  const { h } = d$;
  const { guide, step } = a;
  const s = guide.steps[step];
  const n = guide.steps.length;
  const last = step + 1 >= n;
  return d$.boonMark({
    label: lt('guide.label', { i: step + 1, n }), aria: lt('guide.aria', { i: step + 1, n }), text: s.text(), mascot: s.mascot,
    data: { 'data-guide-mark': key },
    buttons: [
      s.action ? h('button', { type: 'button', class: 'primary', onclick: () => { finish(guide.id); s.action!.run(); } }, s.action.label()) : null,
      h('button', { type: 'button', class: s.action ? '' : 'primary', onclick: () => next() }, lt(last ? 'guide.done' : 'guide.next')),
      h('button', { type: 'button', onclick: () => finish(guide.id) }, lt('guide.skip')),
      h('button', { type: 'button', class: 'min-h-6 border-0 bg-transparent px-1 text-sm text-sun-ink underline shadow-none', onclick: () => finish(guide.id, true) }, lt('guide.off')),
    ],
  });
}

/** Laid out, or in a workspace pane a phone hides (one pane at a time below 768 px): the mark goes there and its pane is shown. */
const shown = (slot: HTMLElement): boolean =>
  slot.offsetParent !== null || (!!slot.closest('#ticket, #work, #panel') && document.getElementById('shell')?.hidden === false);

/** guideHooks.refresh, after every rerender(): the mark goes in the first visible slot its step names; every other slot is emptied. */
function refresh(): void {
  const a = current();
  const key = a ? `${a.guide.id}#${a.step}` : '';
  let placed: HTMLElement | undefined;
  for (const slot of document.querySelectorAll<HTMLElement>('[data-guide-slot]')) {
    const here = !!a && !placed && slot.dataset.guideSlot === a.guide.steps[a.step].slot && shown(slot);
    if (!here) {
      slot.replaceChildren();
      continue;
    }
    placed = slot.firstElementChild?.getAttribute('data-guide-mark') === key ? slot.firstElementChild as HTMLElement : undefined;
    if (!placed) {
      slot.replaceChildren(placed = markOf(a!, key)); // unchanged marks stay, so focus stays inside them
      if (held && !document.activeElement?.closest('[data-guide-mark]') && revealed === key) focusNext = true; // the page rebuilt the mark that held focus
    }
  }
  if (!placed || !a) {
    if (focusNext) pageTitle()?.focus(); // the mark that held focus is gone: never drop focus on <body>
    focusNext = false;
    return;
  }
  const mark = placed;
  const dialog = mark.closest('dialog');
  if (dialog) dialog.addEventListener('close', () => finish(a.guide.id), { once: true }); // D-G3: closing the lesson = seen
  if (focusNext) {
    focusNext = false;
    revealed = key;
    const pane = mark.closest('#ticket, #work, #panel')?.id;
    if (pane) d$.showPane(pane as PaneTabs.Pane);
    mark.focus();
  } else if (revealed !== key) {
    revealed = key;
    requestAnimationFrame(() => {
      const pane = mark.closest('#ticket, #work, #panel')?.id;
      if (pane) d$.showPane(pane as PaneTabs.Pane); // phone: the pane holding Boon's mark
      if (mark.isConnected) mark.scrollIntoView({ block: 'nearest' }); // scroll only: focus stays where the player is
    });
    d$.announce(a.guide.steps[a.step].text());
  }
}

/** The workspace's task title, else the visible page's first heading (made focusable, like #brief-title). */
function pageTitle(): HTMLElement | undefined {
  const modal = document.querySelector('dialog:modal');
  const el = modal ? modal.querySelector<HTMLElement>('h1, h2, h3') ?? undefined // focus stays inside an open modal (the lesson's title)
    : [...document.querySelectorAll<HTMLElement>('#brief-title, main:not([hidden]) h1, main:not([hidden]) h2')].find((e) => e.offsetParent !== null);
  if (el && !el.hasAttribute('tabindex')) el.tabIndex = -1;
  return el;
}

/** Called once by drillBrief.ts initDrill. */
export function initGuides(deps: GuideDeps): void {
  if (d$) return;
  d$ = deps;
  deps.guideHooks.refresh = refresh;
  deps.guideHooks.replay = replayGuide;
  deps.guideHooks.ran = () => {
    if (active?.guide.steps[active.step].slot === 'lesson-example') next(); // G4: the example ran, on to step 2
  };
  // Any dialog closed (lesson, welcome): the page's guide may show again, once the dialog's own `close` listeners ran (D-G3 first,
  // and lessonCard's onclose clears guideHooks.lesson). A task, not a microtask: a browser-fired event runs microtasks between
  // listeners, so a microtask from this capture listener would run before those and see the lesson still open.
  document.addEventListener('close', () => setTimeout(refresh), true);
  document.addEventListener('pointerdown', (e) => { if (!(e.target instanceof Element && e.target.closest('[data-guide-mark]'))) held = false; }); // a click on blank page moves focus to <body> without focusin
  document.addEventListener('focusin', (e) => { held = e.target instanceof Element && !!e.target.closest('[data-guide-mark]'); });
  deps.guideHooks.region = () => {
    const a = current();
    return a && guideRegion(a.guide.steps[a.step].slot);
  };
  // Esc skips the guide while its mark is laid out and nothing else owns Esc (same rule as the tour). Inside the lesson
  // dialog the modal owns Esc: it closes the dialog, and the dialog's `close` marks the guide seen.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !active) return;
    const mark = document.querySelector<HTMLElement>('[data-guide-mark]');
    if (mark && mark.offsetParent !== null && !d$.escOwned(e.target)) finish(active.guide.id);
  });
}
