import { reducedMotion } from './dom';

/** One short "pop" on `el` when the player gets something right. motion-safe: skips it under prefers-reduced-motion. */
export function celebrate(el: HTMLElement): void {
  el.classList.remove('motion-safe:animate-pop');
  void el.offsetWidth; // restart the animation if it is still running
  el.classList.add('motion-safe:animate-pop');
}

/**
 * ui-ux-v5 §1: one reaction of the first mascot in `host` (style.css picks the keyframe by its data-pose; `grow` = A1). Call at the
 * event, after its rerender(), never while drawing: a later redraw makes a new <svg> without the class, so nothing replays.
 * The classes go once every animation on the <svg> has ended (react + grow run side by side), at once if none started. Reduced motion: nothing to do.
 */
export function react(host: Element | null | undefined, grow = false): void {
  const svg = host?.querySelector<SVGSVGElement>('svg[data-mascot]');
  if (!svg || reducedMotion()) return;
  svg.classList.remove('react', 'grow');
  void svg.getBoundingClientRect(); // restart if it is still running
  svg.classList.add('react');
  if (grow) svg.classList.add('grow');
  const done = (): void => {
    if (svg.getAnimations().every((a) => a.playState === 'finished')) svg.classList.remove('react', 'grow');
    else svg.addEventListener('animationend', done, { once: true });
  };
  done(); // nothing started (hidden host, a pose without a keyframe): drop the class now, so it never plays later
}

/** ui-ux-v5 A3: XP gained since the pill was last drawn; 0 on the first draw and after an import (a new save object, page not reloaded). */
export function xpGain(mark: { save: object; xp: number } | undefined, save: object, xp: number): number {
  return mark?.save === save ? Math.max(0, xp - mark.xp) : 0;
}
