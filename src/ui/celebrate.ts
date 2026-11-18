import { reducedMotion } from './dom';

/** One short "pop" on `el` when the player gets something right. motion-safe: skips it under prefers-reduced-motion. */
export function celebrate(el: HTMLElement): void {
  el.classList.remove('motion-safe:animate-pop');
  void el.offsetWidth; // restart the animation if it is still running
  el.classList.add('motion-safe:animate-pop');
  once(el, 'motion-safe:animate-pop');
}

const ENDS = ['animationend', 'animationcancel']; // cancel: `el` was hidden mid-way (a phone pane), which would replay the class once shown
/** Drops a one-shot class when `el`'s own animation ends (not a child's), so a later display change never replays it (ui-ux-v5 §1). */
export function once(el: Element, cls: string): void {
  const end = (e: Event): void => {
    if (e.target !== el) return;
    el.classList.remove(cls);
    for (const n of ENDS) el.removeEventListener(n, end);
  };
  for (const n of ENDS) el.addEventListener(n, end);
}

/**
 * ui-ux-v5 §1: one reaction of the first mascot in `host` (style.css picks the keyframe by its data-pose; `grow` = A1). Call at the
 * event, after its rerender(), never while drawing: a later redraw makes a new <svg> without the class, so nothing replays.
 * The classes go once every animation on the <svg> has ended (react + grow run side by side), at once if none started. Reduced motion: nothing to do.
 */
export function react(host: Element | null | undefined, grow?: boolean): void {
  const svg = host?.querySelector<SVGSVGElement>('svg[data-mascot]');
  if (!svg || reducedMotion()) return;
  grow ??= svg.dataset.mascot === 'lily' && grewLately(); // A1: Lily just grew (syncLily, src/ui/homeView.ts)
  svg.classList.remove('react', 'grow');
  void svg.getBoundingClientRect(); // restart if it is still running
  svg.classList.add('react');
  if (grow) svg.classList.add('grow');
  const done = (): void => {
    if (svg.getAnimations().every((a) => a.playState === 'finished')) svg.classList.remove('react', 'grow');
    else for (const e of ENDS) svg.addEventListener(e, done, { once: true });
  };
  done(); // nothing started (hidden host, a pose without a keyframe): drop the class now, so it never plays later
}

/** ui-ux-v5 A3 (XP) and A1 (Lily's stage): rise since the last mark; 0 on the first call and after an import (a new save object, page not reloaded). */
export function gainSince(mark: { save: object; n: number } | undefined, save: object, n: number): number {
  return mark?.save === save ? Math.max(0, n - mark.n) : 0;
}

let grewAt = -Infinity;
/** A1: syncLily() saw Lily's stage rise (session memory only, D-M2). */
export const markGrew = (): void => { grewAt = Date.now(); };
/** A1: Lily grows in the next reaction or dock entrance for 4 s after that (both attach at an event, never while drawing). */
export const grewLately = (): boolean => Date.now() - grewAt <= 4000;
