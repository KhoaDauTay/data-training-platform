import { type GsapArt, loadedGsap, loadGsap } from '../art/load';
import type { Timeline } from '../art/gsap';
import { reducedMotion } from './dom';
import { LAST_STAGE, LOOK, type LilyStage, stageOf } from '../lily';
import { type Mascot, type Move, MOVES, movedParts, pivotOf, type Pose } from './mascots';

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
const grows = new WeakSet<SVGSVGElement>(); // the playing timeline is a grow ceremony (L134: a click on Lily skips it)
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
  const stage = stageOf(svg.dataset.stage ?? document.documentElement.dataset.lily);
  const at = who === 'lily' ? pivotOf(who, LOOK[stage].lift, LOOK[stage].perk) : pivotOf(who); // L132: her neck sits higher on longer legs
  const tl = timeline();
  if (pose in MOVES) {
    const m = movedParts(who, pose as Move);
    const extra = all(m.extra).map((g) => g.firstElementChild ?? g);
    const s = (f: number) => (f * MOVES[pose as Move].ms) / 1000; // a share of the reaction's length (≤ 3 s, tests/mascots.test.ts)
    if (pose === 'cheer') { // squash, jump 10 px, land with a bounce; Lily wags her tail 3 times
      tl.to(all(m.body), { keyframes: [
        { scaleY: 0.96, svgOrigin: at.feet, duration: s(0.14), ease: 'power1.in' },
        { scaleY: 1, y: -10, duration: s(0.32), ease: 'power2.out' },
        { y: 0, duration: s(0.54), ease: 'bounce.out' }] }, 0);
      if (extra.length) tl.to(extra, { keyframes: { rotation: [0, 14, -14, 14, -14, 14, 0] }, svgOrigin: at.tail, duration: s(0.86), ease: 'sine.inOut' }, 0);
    } else if (pose === 'think') { // head tilts, the wing comes up to the chin
      tl.to(all(m.head), { keyframes: [
        { rotation: -6, svgOrigin: at.neck, duration: s(0.35), ease: 'power2.out' },
        { rotation: -6, duration: s(0.25) },
        { rotation: 0, duration: s(0.4), ease: 'sine.inOut' }] }, 0);
      // Boon's wing swings up from its root; Lily's chin paw is one part with her other arm, so it only lifts a little
      const lift = at['arm-chin'] ? { rotation: 28, svgOrigin: at['arm-chin'] } : { y: 4 };
      if (extra.length) tl.from(extra, { ...lift, duration: s(0.75), ease: 'back.out(2)' }, 0);
    } else if (pose === 'oops') { // shake ±4 px three times
      tl.to(all(m.body), { keyframes: { x: [0, -4, 4, -4, 4, -4, 4, 0] }, duration: s(1), ease: 'none' }, 0);
    } else if (extra.length) { // point: the wing points twice
      const beat = [{ rotation: -12, svgOrigin: at['arm-point'], duration: s(1 / 6), ease: 'power1.in' }, { rotation: 0, duration: s(1 / 3), ease: 'back.out(2)' }];
      tl.to(extra, { keyframes: [...beat, ...beat] }, 0);
    }
  }
  if (grow && who === 'lily') {
    growLily(tl, svg, stage, part, keep);
    grows.add(svg);
  }
  const end = () => {
    grows.delete(svg);
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

/** The CSS variables of one stage's look (src/lily.ts LOOK), for GSAP (registered with @property, so they tween as numbers). */
const vars = (stage: LilyStage, keys: readonly string[]): Record<string, number> =>
  Object.fromEntries(keys.map((k) => [`--lily-${k}`, LOOK[stage][k as keyof (typeof LOOK)[number]]]));
const SHAPE = ['size', 'head', 'lift', 'perk', 'paw', 'ears', 'ear-tilt', 'tail', 'chest', 'shut', 'eye'];
const GEAR = ['collar-on', 'scarf-on', 'badge-on', 'harness-on', 'prop-on'];

/**
 * L132 grow ceremony on the rig (2.4 s = GROW_MS, docs/team/lily-growth.md §3.1), from the stage she had (markGrew) to the one she
 * has now, in one go however many stages she jumped: 0–0.3 s she crouches; 0.3–1.5 s every proportion eases to the new stage;
 * 0.6–1.6 s the new spots come in tier by tier; 1.2–2.0 s the accessories change and the newest one arrives (collar drawn, scarf drawn
 * then filled, star morphed from a dot, harness drawn, laptop slides in); 2.0–2.4 s a hop. The variables are tweened inline on this
 * <svg> and reverted at the end, where the stage rule of style.css already shows the same end frame. DrawSVG/MorphSVG cannot reach
 * inside a <use>, so the arriving part is copied from the sprite into this instance (same picture, so it stays after the revert).
 */
function growLily(tl: Timeline, svg: SVGSVGElement, to: LilyStage, part: (p: string) => SVGGElement | null, keep: (el: Element) => void): void {
  const from = Math.min(grewFrom, to - 1) as LilyStage;
  if (to < 1) return;
  tl.to(svg, { keyframes: [{ scale: 0.94, duration: 0.3, ease: 'power1.in' }, { scale: 1, duration: 0.4, ease: 'back.out(2)' }], transformOrigin: '50% 100%' }, 0);
  tl.fromTo(svg, vars(from, SHAPE), { ...vars(to, SHAPE), duration: 1.2, ease: 'back.out(1.4)' }, 0.3);
  ['spot1', 'spot2', 'spot3'].forEach((k, i) => {
    if (LOOK[from][k as 'spot1'] !== LOOK[to][k as 'spot1']) tl.fromTo(svg, vars(from, [k]), { ...vars(to, [k]), duration: 0.4 }, 0.6 + i * 0.3);
  });
  tl.fromTo(svg, vars(from, GEAR), { ...vars(to, GEAR), duration: 0.8, ease: 'power1.inOut' }, 1.2);
  tl.to(svg, { keyframes: [{ y: -8, duration: 0.2, ease: 'power2.out' }, { y: 0, duration: 0.2, ease: 'bounce.out' }] }, 2.0);
  const sparkle = part('fx-sparkle');
  if (sparkle) tl.from(sparkle, { opacity: 0, scale: 0.6, svgOrigin: '60 60', duration: 0.4 }, 2.0);
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
  const draw = (name: string, at: number): void => { // a band is drawn along its path (the coloured stroke, the last path)
    const band = [...inline(name)?.querySelectorAll('path') ?? []].at(-1);
    if (band) tl.fromTo(band, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power1.inOut' }, at);
  };
  if (to === 1) draw('collar', 1.2);
  else if (to === 2) {
    const [shape, line] = inline('scarf')?.querySelectorAll('path') ?? [];
    if (!shape) return;
    tl.fromTo(shape, { drawSVG: '0%', fillOpacity: 0 }, { drawSVG: '100%', duration: 0.5, ease: 'power1.inOut' }, 1.2)
      .to(shape, { fillOpacity: 1, duration: 0.3 }, 1.7);
    if (line) tl.from(line, { opacity: 0, duration: 0.3 }, 1.7);
  } else if (to === 3) {
    const star = inline('badge')?.querySelector('path');
    if (star) tl.from(star, { morphSVG: DOT, duration: 0.6, ease: 'back.out(1.7)' }, 1.3);
  } else if (to === 4) draw('harness', 1.2);
  else if (to === LAST_STAGE) {
    const laptop = part('laptop');
    if (laptop) tl.from(laptop, { x: -24, duration: 0.6, ease: 'power2.out' }, 1.3);
  }
}

/**
 * L132: a grow ceremony that is playing on this <svg> (or the one inside `host`) jumps to its end frame (Skip, Esc, a click on Lily,
 * L134); the CSS fallback just drops its classes (the base style is the end frame). True when a ceremony was cut short.
 */
export function settle(host: Element | null | undefined): void {
  const svg = host?.matches?.('svg[data-mascot]') ? host as SVGSVGElement : host?.querySelector<SVGSVGElement>('svg[data-mascot]');
  if (!svg) return;
  playing.get(svg)?.progress(1);
  svg.classList.remove('grow');
}
/** L134: a grow ceremony is playing on this <svg> (the GSAP rig or the CSS fallback). */
export const growing = (svg: SVGSVGElement): boolean => grows.has(svg) || svg.classList.contains('grow');

/** ui-ux-v5 A3 (XP) and A1 (Lily's stage): rise since the last mark; 0 on the first call and after an import (a new save object, page not reloaded). */
export function gainSince(mark: { save: object; n: number } | undefined, save: object, n: number): number {
  return mark?.save === save ? Math.max(0, n - mark.n) : 0;
}

let grewAt = -Infinity;
let grewFrom = 0;
/** A1: syncLily() saw Lily's stage rise from `from` (session memory only, D-M2); the ceremony plays from there (L132). */
export const markGrew = (from = 0): void => { grewAt = Date.now(); grewFrom = from; };
/** A1: Lily grows in the next reaction or dock entrance for 4 s after that (both attach at an event, never while drawing). */
export const grewLately = (): boolean => Date.now() - grewAt <= 4000;
