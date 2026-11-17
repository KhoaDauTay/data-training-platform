import { cx } from '../theme';
import { s } from './svg';

/** Lily (dog): the player's buddy, mirrors how the work goes. Boon (duck): the guide (tour, hints, error notes). L57, v6 §1. */
export type Mascot = 'lily' | 'boon';
/** One <symbol id="<mascot>-<pose>"> each in index.html's #mascot-sprite (tests/mascots.test.ts). New pose: a symbol there + a name here. */
export const POSES = ['idle', 'point', 'cheer', 'think', 'oops', 'sleep'] as const;
export type Pose = (typeof POSES)[number];

/**
 * A mascot from the sprite: a <use>, so no artwork is shipped in JS (Plan 7 V3). Decorative by default (aria-hidden: the words
 * sit next to it, v6 §1.4 rule 2); pass `label` only for a picture that stands alone (the welcome screen).
 * Sizes (rule 4): size-12 in a line, size-16 on a card, size-24 to size-28 beside a bubble.
 */
export function mascot(who: Mascot, pose: Pose, cls = 'size-12', label?: string): SVGSVGElement {
  const a11y: Record<string, string> = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' };
  return s('svg', { viewBox: '0 0 120 120', class: cx('shrink-0 overflow-visible', cls), ...a11y }, s('use', { href: `#${who}-${pose}` }));
}
