// ui-ux-v6 §2: the only module that imports GSAP (tests/gsapChunk.test.ts). Always loaded with import('./gsap'), so it
// is its own lazy chunk `gsap-*` (budget group gsap). GSAP is under its Standard "no charge" licence, not MIT: the
// @license comments stay in the built chunk (assets/THIRD_PARTY.md).
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import type { Run } from './logistics';

gsap.registerPlugin(CustomEase, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, Physics2DPlugin);
// v6 A2: the crane trolley's inertia (speeds up over the first quarter, runs at an even speed, brakes over the last
// quarter). Named here because the art chunks may not import GSAP: they use it as ease: 'cq-crane'.
CustomEase.create('cq-crane', 'M0,0 C0.12,0 0.18,0.06 0.25,0.16 C0.4167,0.3867 0.5833,0.6133 0.75,0.84 C0.82,0.94 0.88,1 1,1');

export { gsap };
export type Timeline = gsap.core.Timeline;

/** A paused timeline: only play() runs it, so a build() that runs again on every redraw never replays an animation. */
export const timeline = (): Timeline => gsap.timeline({ paused: true });

/** Jumps to the end state (every onUpdate/call fires once with its final values) and frees the timeline. */
export function still(tl: Timeline): void {
  tl.progress(1);
  tl.kill();
}

/**
 * §2.3: plays `tl` for this completion. A fast run (reduced motion, or skipped while the chunk loaded) draws the end
 * state at once; run.skip (Skip, Esc, hashchange in ui/stage.ts) jumps there mid-way. Resolves once, at the end either way.
 */
export function play(tl: Timeline, run: Run): Promise<void> {
  if (run.fast) {
    still(tl);
    return Promise.resolve();
  }
  return new Promise((done) => {
    const end = (): void => {
      run.skip = undefined;
      done();
    };
    tl.eventCallback('onComplete', end);
    run.skip = () => {
      tl.eventCallback('onComplete', null);
      still(tl);
      end();
    };
    tl.play();
  });
}
