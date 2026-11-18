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
 * The classes go once every animation on the <svg> has ended (react + grow run side by side). Reduced motion: nothing to do.
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
  svg.addEventListener('animationend', done, { once: true });
}
