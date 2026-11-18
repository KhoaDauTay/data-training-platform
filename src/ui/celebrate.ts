import { type GsapArt, loadedGsap, loadGsap } from '../art/load';
import type { Timeline } from '../art/gsap';
import { reducedMotion } from './dom';
import { GROW_MS, type Mascot, type Move, MOVES, movedParts, PIVOT, type Pose } from './mascots';

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
 * ui-ux-v5 §1: one reaction of the mascot `host` is or holds (style.css picks the keyframe by its data-pose; `grow` = A1). Call at the
 * event, after its rerender(), never while drawing: a later redraw makes a new <svg> without the class, so nothing replays.
 * v6 M1: once the GSAP chunk is in (loadedGsap()), the rig parts move instead (rigReact); until then the v5 CSS runs and the chunk is fetched.
 * The classes go once every animation on the <svg> has ended (react + grow run side by side), at once if none started. Reduced motion: nothing to do.
 */
export function react(host: Element | null | undefined, grow?: boolean): void {
  const svg = host?.matches?.('svg[data-mascot]') ? host as SVGSVGElement : host?.querySelector<SVGSVGElement>('svg[data-mascot]');
  if (!svg || reducedMotion()) return;
  grow ??= svg.dataset.mascot === 'lily' && grewLately(); // A1: Lily just grew (syncLily, src/ui/homeView.ts)
  const g = loadedGsap();
  if (g) {
    if (svg.getClientRects().length) rigReact(g, svg, grow); // hidden (a phone pane, the dock below sm): nothing, like the CSS below
    return;
  }
  loadGsap();
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

const ATTRS = ['style', 'transform', 'data-svg-origin'];
const playing = new WeakMap<SVGSVGElement, Timeline>();
const SIZE = [0.8, 0.9, 1, 1]; // --lily-size per stage (style.css, L87)
const DOT = 'M60 77.3a1.9 1.9 0 1 1 0 3.8a1.9 1.9 0 1 1 0-3.8z'; // the badge star starts as a dot (MorphSVG)

/**
 * v6 M1: one GSAP reaction on this <svg>'s own part <g>s (never the outer <g>, which holds Lily's stage scale in CSS, never the
 * shared sprite). A part with its own move (tail, pointing wing) turns its <use>, so two moves never share one transform. Every
 * move ends where it began and the timeline is reverted at the end: the DOM is a plain mascot() again (no inline style left).
 */
function rigReact({ timeline }: GsapArt, svg: SVGSVGElement, grow: boolean): void {
  playing.get(svg)?.eventCallback('onComplete')?.();
  const kept: [Element, string, string | null][] = [];
  const keep = (root: Element) => {
    for (const el of [root, ...root.querySelectorAll('*')]) for (const k of ATTRS) kept.push([el, k, el.getAttribute(k)]);
  };
  keep(svg);
  const who = svg.dataset.mascot as Mascot;
  const pose = svg.dataset.pose as Pose;
  const part = (p: string) => svg.querySelector<SVGGElement>(`[data-part="${p}"]`);
  const all = (ps: string[]) => ps.map(part).filter((x) => x !== null);
  const at = PIVOT[who];
  const tl = timeline();
  if (pose in MOVES) {
    const m = movedParts(who, pose as Move);
    const extra = all(m.extra).map((g) => g.firstElementChild ?? g);
    const s = (ms: number) => ms / 1000;
    if (pose === 'cheer') { // squash, jump 10 px, land with a bounce; Lily wags her tail 3 times
      tl.to(all(m.body), { keyframes: [
        { scaleY: 0.96, svgOrigin: at.feet, duration: s(100), ease: 'power1.in' },
        { scaleY: 1, y: -10, duration: s(220), ease: 'power2.out' },
        { y: 0, duration: s(380), ease: 'bounce.out' }] }, 0);
      if (extra.length) tl.to(extra, { keyframes: { rotation: [0, 14, -14, 14, -14, 14, 0] }, svgOrigin: at.tail, duration: s(600), ease: 'sine.inOut' }, 0);
    } else if (pose === 'think') { // head tilts, the wing comes up to the chin
      tl.to(all(m.head), { keyframes: [
        { rotation: -6, svgOrigin: at.neck, duration: s(140), ease: 'power2.out' },
        { rotation: -6, duration: s(100) },
        { rotation: 0, duration: s(160), ease: 'sine.inOut' }] }, 0);
      // Boon's wing swings up from its root; Lily's chin paw is one part with her other arm, so it only lifts a little
      const lift = at['arm-chin'] ? { rotation: 28, svgOrigin: at['arm-chin'] } : { y: 4 };
      if (extra.length) tl.from(extra, { ...lift, duration: s(300), ease: 'back.out(2)' }, 0);
    } else if (pose === 'oops') { // shake ±4 px three times
      tl.to(all(m.body), { keyframes: { x: [0, -4, 4, -4, 4, -4, 4, 0] }, duration: s(360), ease: 'none' }, 0);
    } else if (extra.length) { // point: the wing points twice
      const beat = [{ rotation: -12, svgOrigin: at['arm-point'], duration: s(80), ease: 'power1.in' }, { rotation: 0, duration: s(160), ease: 'back.out(2)' }];
      tl.to(extra, { keyframes: [...beat, ...beat] }, 0);
    }
  }
  if (grow && who === 'lily') growLily(tl, svg, part, keep);
  const end = () => {
    tl.revert();
    // revert() leaves GSAP's identity transforms (matrix(1,0,0,1,0,0), translate3d(0,0,0)): put every attribute back as drawn
    for (const [el, k, v] of kept) {
      if (v === null) el.removeAttribute(k);
      else el.setAttribute(k, v);
    }
    playing.delete(svg);
  };
  tl.eventCallback('onComplete', end);
  if (!tl.duration()) return end();
  playing.set(svg, tl);
  tl.play();
}

/**
 * v5 A1 on the rig: Lily bounces and grows to her new size, and the new accessory arrives: the scarf is drawn then filled (stage 1,
 * DrawSVG), the star morphs from a dot (2, MorphSVG), the laptop slides in (3). DrawSVG/MorphSVG cannot reach inside a <use>, so
 * the scarf or star is copied from the sprite into this instance's part (same picture, so it stays after the revert).
 */
function growLily(tl: Timeline, svg: SVGSVGElement, part: (p: string) => SVGGElement | null, keep: (el: Element) => void): void {
  const stage = Number(document.documentElement.dataset.lily ?? 0);
  const s = GROW_MS / 1000;
  tl.to(svg, { keyframes: { scale: [1, 1.18, 0.96, 1] }, transformOrigin: '50% 100%', duration: s, ease: 'power1.out' }, 0);
  if (SIZE[stage - 1] !== SIZE[stage]) tl.fromTo(svg, { '--lily-size': SIZE[stage - 1] }, { '--lily-size': SIZE[stage], duration: s * 0.6, ease: 'back.out(1.6)' }, s * 0.3);
  const inline = (name: string): SVGGElement | undefined => {
    const g = part(name);
    const src = document.getElementById(`lily-${name}`);
    if (!g || !src) return undefined;
    const c = src.cloneNode(true) as SVGGElement;
    c.removeAttribute('id');
    g.replaceChildren(c);
    keep(c);
    return c;
  };
  if (stage === 1) {
    const [shape, line] = inline('scarf')?.querySelectorAll('path') ?? [];
    if (!shape) return;
    tl.fromTo(shape, { drawSVG: '0%', fillOpacity: 0 }, { drawSVG: '100%', duration: s * 0.45, ease: 'power1.inOut' }, s * 0.2)
      .to(shape, { fillOpacity: 1, duration: s * 0.25 }, s * 0.65);
    if (line) tl.from(line, { opacity: 0, duration: s * 0.25 }, s * 0.65);
  } else if (stage === 2) {
    const star = inline('badge')?.querySelector('path');
    if (star) tl.from(star, { morphSVG: DOT, duration: s * 0.5, ease: 'back.out(1.7)' }, s * 0.35);
  } else if (stage === 3) {
    const laptop = part('laptop');
    if (laptop) tl.from(laptop, { x: -24, opacity: 0, duration: s * 0.5, ease: 'power2.out' }, s * 0.35);
  }
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
