import { activeDomain, type DomainId } from '../domains';
import type { Ctx, Run } from '../art/logistics';
import { loadArt } from '../art/load';
import { getLang, t, type Key } from '../i18n';
import { rankOf } from '../progress';
import { derive, durationOf, ROUTES, sceneOf, type Lane } from '../scene';
import { takeNewRoutes } from '../routesSeen';
import { app } from '../state';
import { textOf, type Ticket } from '../tickets';
import { byId, reducedMotion } from './dom';
import { loadEcomArt } from './ecomArt';
import { grewLately, once } from './celebrate';
import { mascot } from './mascots';
import { stageEsc } from './shortcuts';

// Plan 8b D8b-2: the pictures and scene bodies live in the lazy art chunk (src/art/logistics.ts). This file keeps the
// dock, Skip/Close, Esc, the announced sentence and the queue, so a completion is announced and closable before the chunk arrives.

/**
 * ui-ux-v5 B3: the completion picture per domain, each a lazy chunk with the art/logistics contract (`run.fast` = end state
 * only; `ms` = length, default durationOf). A domain not listed only gets the sentence. Finance adds one line here.
 */
interface DockArt { build(c: Ctx): void; play(c: Ctx): Promise<void>; ms?(c: Ctx): number }
const DOCK: Partial<Record<DomainId, () => Promise<DockArt>>> = { logistics: loadArt, ecommerce: loadEcomArt };
let dock: () => Promise<DockArt> = loadArt;

let current: Run = { fast: true, done: true };
let queue: Promise<void> = Promise.resolve();
let hideTimer = 0;
/** The completion on screen, so relabelStage() can rebuild its sentence in the new language. */
let shown: Ctx | undefined;
/** Where focus came from when it entered the stage (the Skip button): hide() hands it back there. */
let returnFocus: HTMLElement | null = null;

const portName = (code: string): string => ROUTES.find((r) => r.port === code)?.name ?? code;
const titleOf = (c: Ctx): string => textOf(c.tk, getLang()).title;
/** Lanes this completion opened (L32: the chapter's lane and/or the lane its ship sailed), as port names. */
const openedNames = (c: Ctx): string[] => ROUTES.filter((r) => c.after.open.has(r.port) && !c.before.open.has(r.port)).map((r) => r.name);
/** Lane names for the sentence (the art chunk has the same keys beside its stamp colours). */
const LANE_KEY: Record<Lane, Key> = { green: 'anim.laneGreen', yellow: 'anim.laneYellow', red: 'anim.laneRed' };

/** §6: the same sentence for screen readers and on screen, built from the ticket title (no made-up numbers). */
const DONE_KEY: Record<'truck' | 'quote' | 'ledger' | 'chat', Key> = {
  truck: 'anim.doneTruck', quote: 'anim.doneQuote', ledger: 'anim.doneLedger', chat: 'anim.doneChat',
};
function sentence(c: Ctx): string {
  const lang = getLang();
  const title = titleOf(c);
  if (activeDomain() !== 'logistics') { // Plan 9: E-commerce's own sentences
    return c.tk.beat === 'boss' ? t('ecom.promoted', { rank: (c.rankAfter.career ?? c.rankAfter.tier)?.[lang] ?? t('career.intern') }) : t('ecom.done', { title });
  }
  const { kind, to, lane } = c.scene;
  if (kind === 'ship') return to ? t('anim.doneShip', { title, port: portName(to) }) : t('anim.doneShipNoPort', { title });
  if (kind === 'yard') {
    const total = app.tickets.filter((x) => x.chapter === c.tk.chapter).length;
    return t('anim.doneYard', { title, n: c.tk.chapter, k: c.after.bays[c.tk.chapter] ?? 0, total });
  }
  if (kind === 'customs') return t('anim.doneCustoms', { title, lane: t(LANE_KEY[lane ?? 'green']) });
  if (kind === 'promotion') {
    const rank = c.rankAfter.career?.[lang] ?? '';
    const opened = openedNames(c);
    const base = opened.length ? t('anim.donePromotion', { rank, port: opened.join(', ') }) : t('anim.donePromotionNoRoute', { rank });
    return to && !opened.includes(portName(to)) ? `${base} ${t('anim.alsoSailed', { port: portName(to) })}` : base; // L32: ch1-05's ship opens Rotterdam
  }
  return t(DONE_KEY[kind], { title });
}

function hide(): void {
  const stage = byId('stage');
  const had = stage.contains(document.activeElement);
  stage.hidden = true;
  shown = undefined;
  if (!had) return;
  // The first candidate that really takes focus (a removed or hidden one does not): where focus came from, the editor, the page heading.
  for (const el of [returnFocus, byId('work').querySelector<HTMLElement>('.cm-content'), document.getElementById('brief-title'), document.getElementById('home-title')]) {
    el?.focus();
    if (el && document.activeElement === el) return;
  }
}
function setSkipLabel(key: Key): void {
  const b = byId('stage-skip');
  b.dataset.i18n = key; // applyStatic() relabels it on a language switch
  b.textContent = t(key);
}
/**
 * rerender() calls this: the open dock follows a language switch (the Skip/Close label follows data-i18n). The sentence
 * changes at once; the art (labels, aria-labels, cards) is redrawn as its end state once a running animation has finished.
 */
/** Draws the picture of `c` and plays it; a fast run only draws the end state. No art chunk (offline, failed load): the dock keeps its sentence and Close. */
async function drawAndPlay(c: Ctx, owner: Ctx = c): Promise<void> {
  let art;
  try {
    art = await dock();
  } catch (e) {
    console.warn('Completion art unavailable:', e);
    c.art.replaceChildren();
    return;
  }
  if (shown !== owner) return; // hidden (route change) or a newer completion took the dock while the chunk loaded
  art.build(c);
  // D8b-6: Lily cheers in the dock's corner for every kind, popping in beside the last step (no extra time). Decorative
  // (the sentence says it all), never takes a click; hidden below sm where the cards fill the dock's width.
  const lily = mascot('lily', 'cheer', 'pointer-events-none absolute right-2 bottom-2 size-14 max-sm:hidden');
  c.art.append(lily);
  if (c.run.fast) {
    await art.play(c);
    return;
  }
  lily.style.opacity = '0';
  // ui-ux-v5 A1: Lily just grew (read here, after complete()'s rerender ran syncLily): her CSS grow (900 ms, accessory fades in)
  // replaces the 300 ms pop and starts earlier, so it still ends with the scene (≤ 3.0 s, promotion included).
  const grow = grewLately();
  const pop = window.setTimeout(() => {
    lily.style.opacity = '1';
    if (c.run.fast) return;
    if (grow) {
      lily.classList.add('grow');
      if (lily.getAnimations().length) once(lily, 'grow');
      else lily.classList.remove('grow'); // hidden (below sm): never left to replay once shown
    } else lily.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.3,1.6,.6,1)' });
  }, Math.max(0, (art.ms?.(c) ?? durationOf(c.scene)) - (grow ? 900 : 300)));
  try {
    await art.play(c);
  } finally {
    window.clearTimeout(pop);
    lily.style.opacity = '1';
  }
}

/**
 * rerender() calls this: the open dock follows a language switch (the Skip/Close label follows data-i18n). The sentence
 * changes at once; the art (labels, aria-labels, cards) is redrawn as its end state once a running animation has finished.
 */
export function relabelStage(): void {
  const c = shown;
  if (!c || byId('stage').hidden) return;
  byId('stage-text').textContent = sentence(c);
  if (c.lang === getLang()) return;
  c.lang = getLang();
  queue = queue
    .then(async () => {
      if (shown !== c) return; // hidden, or a newer completion took the dock
      await drawAndPlay({ ...c, run: { fast: true, done: true } }, c); // end state only, no replay
    })
    .catch((e: unknown) => console.warn('Completion redraw failed:', e));
}
/** Jumps `run` to its end state: `fast` for the rAF scenes, `skip` for a GSAP timeline that is playing (ui-ux-v6 §2.3). */
function finish(run: Run): void {
  run.fast = true;
  run.skip?.();
}
function skip(): void {
  if (!current.done) finish(current); // jump to the end state; the sentence was already announced
  else hide();
}

/** Skip button and Esc (see stageEsc). */
export function initStage(): void {
  const stage = byId('stage');
  byId('stage-skip').addEventListener('click', skip);
  stage.addEventListener('focusin', (e) => {
    const from = e.relatedTarget;
    if (!(from instanceof Node && stage.contains(from))) returnFocus = from instanceof HTMLElement ? from : null; // never a stale target
  });
  document.addEventListener('keydown', (e) => {
    if (stageEsc(e, !stage.hidden, Boolean(document.querySelector('dialog:modal')))) skip(); // the non-modal notebook never blocks it
  });
  // Leaving the page closes the dock: it belongs to the task just solved and would cover the next page (UI/UX review v10 #10).
  window.addEventListener('hashchange', () => {
    if (stage.hidden) return;
    finish(current);
    hide();
  });
}

/**
 * First completion of `tk` (main.ts complete(); never for practice, retry or review, §1.4). Announces at once, then plays
 * sceneOf(tk) for ≤ 3 s without blocking input. An animation still running jumps to its end state first (no queue of
 * animations). Reduced motion: end state only, and the dock stays until Close or the next completion.
 */
export function playCompletion(tk: Ticket, before: Set<string>, after: Set<string>): void {
  const load = DOCK[activeDomain()];
  const run: Run = { fast: reducedMotion(), done: false };
  const c: Ctx = {
    run, tk, scene: sceneOf(tk), art: byId('stage-art'), lang: getLang(),
    before: derive(app.tickets, before), after: derive(app.tickets, after),
    rankBefore: rankOf(app.tickets, before), rankAfter: rankOf(app.tickets, after),
  };
  const text = sentence(c);
  byId('announce').textContent = text; // read now, not after the animation (§6)
  if (!load) return;
  finish(current);
  current = run;
  dock = load;
  if (load === loadArt) takeNewRoutes(c.after.open); // a lane this completion opens is drawn here, so the map page does not draw it again (D8b-5)
  queue = queue
    .then(async () => {
      if (current !== run) return; // a newer completion already replaced this one
      window.clearTimeout(hideTimer);
      c.art.replaceChildren();
      shown = c;
      byId('stage-text').textContent = text;
      setSkipLabel(run.fast ? 'app.close' : 'anim.skip');
      byId('stage').hidden = false;
      try {
        await drawAndPlay(c);
      } finally {
        run.done = true;
      }
      if (current !== run) return;
      setSkipLabel('app.close');
      // A promotion carries the new title: it stays ≥ 8 s so it can be read (v10 critic #3); reduced motion stays until Close.
      if (!reducedMotion()) hideTimer = window.setTimeout(hide, c.scene.kind === 'promotion' ? 8000 : 4000);
    })
    .catch((e: unknown) => console.warn('Completion animation failed:', e));
}
