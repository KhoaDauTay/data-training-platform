import { cx } from '../theme';
import { s } from './svg';

/**
 * Lily (Dalmatian): the learner, i.e. the player's own avatar; she reacts (cheer, sleep, idle) and never teaches. Boon (duck): the
 * teacher and guide (welcome, tour, hints, lessons, error notes) and speaks in the first person. L57, L83, L87.
 */
export type Mascot = 'lily' | 'boon';
export const POSES = ['idle', 'point', 'cheer', 'think', 'oops', 'sleep'] as const;
export type Pose = (typeof POSES)[number];

/**
 * v6 M1: a pose is a recipe of sprite parts (<g id="<mascot>-<part>"> in index.html's #mascot-sprite), painted in this order
 * (tests/mascots.test.ts). Lily's collar, scarf, badge, harness and laptop are parts whose opacity follows her growth stage, and
 * every part reads her stage's proportions (lift, head, ears, paws…) from inherited CSS variables (style.css, L132).
 * The top-bar logo is the sprite's own <symbol id="boon-idle">, which repeats boon.idle.
 */
export const RIG = {
  lily: {
    idle: ['shadow', 'tail', 'body', 'arm-down', 'harness', 'collar', 'scarf', 'badge', 'ear-l', 'ear-r', 'head', 'eyes-open', 'mouth-smile', 'laptop'],
    point: ['shadow', 'tail', 'body', 'arm-point', 'harness', 'collar', 'scarf', 'badge', 'ear-l', 'ear-r', 'head', 'eyes-open', 'mouth-smile', 'laptop'],
    cheer: ['shadow', 'tail', 'body', 'harness', 'collar', 'scarf', 'badge', 'ear-l', 'ear-r', 'head', 'eyes-happy', 'mouth-open', 'arm-up', 'fx-sparkle', 'laptop'],
    think: ['shadow', 'tail', 'body', 'harness', 'collar', 'scarf', 'badge', 'ear-l', 'ear-r', 'head', 'eyes-open', 'mouth-flat', 'arm-chin', 'fx-question', 'laptop'],
    oops: ['shadow', 'tail', 'body', 'arm-down', 'harness', 'collar', 'scarf', 'badge', 'ear-l', 'ear-r', 'head', 'eyes-dizzy', 'mouth-wavy', 'fx-sweat', 'laptop'],
    sleep: ['sleep', 'zz'],
  },
  boon: {
    idle: ['shadow', 'feet', 'body', 'badge', 'tablet', 'wing-l', 'wing-r', 'plume', 'head', 'eyes-open', 'glasses', 'mouth-smile'],
    point: ['shadow', 'feet', 'body', 'badge', 'wing-l', 'arm-point', 'plume', 'head', 'eyes-open', 'glasses', 'mouth-smile'],
    cheer: ['shadow', 'feet', 'body', 'badge', 'arm-up', 'plume', 'head', 'eyes-happy', 'glasses', 'mouth-open', 'fx-sparkle'],
    think: ['shadow', 'feet', 'body', 'badge', 'wing-l', 'plume', 'head', 'eyes-up', 'glasses', 'mouth-flat', 'arm-chin', 'fx-dots'],
    oops: ['shadow', 'feet', 'body', 'badge', 'wing-l', 'wing-r', 'plume', 'head', 'eyes-dizzy', 'glasses-tilt', 'mouth-wavy', 'fx-sweat'],
    sleep: ['sleep', 'zz'],
  },
} as const satisfies Record<Mascot, Record<Pose, readonly string[]>>;

/**
 * v6 M1 (T5): the GSAP reactions of react() (src/ui/celebrate.ts) on the rig parts. `ms` is the whole reaction; `extra` is the
 * part with its own move (tail wag, pointing wing, wing to the chin), skipped when the mascot has none (Boon has no tail).
 * Pivots are viewBox units: `feet` for the jump, `neck` for the head tilt, then each extra part's joint.
 */
export const MOVES = {
  cheer: { ms: 700, extra: ['tail'] },
  think: { ms: 400, extra: ['arm-chin'] },
  oops: { ms: 360, extra: [] },
  point: { ms: 480, extra: ['arm-point'] },
} as const;
export type Move = keyof typeof MOVES;
export const PIVOT: Record<Mascot, Record<string, string>> = {
  lily: { feet: '60 112', neck: '60 72', tail: '80 106', 'arm-point': '72 88' },
  boon: { feet: '60 112', neck: '60 62', 'arm-point': '84 76', 'arm-chin': '84 80' },
};
/**
 * Lily's stage lifts her body, legs and head by LOOK[stage].lift units (src/lily.ts), and her chest and head by .perk more (L134):
 * her neck and pointing paw sit that much higher than PIVOT says (feet and tail root stay on the ground), so a head tilt still
 * turns around the neck (L132).
 */
export function pivotOf(who: Mascot, lift = 0, perk = 0): Record<string, string> {
  if (who !== 'lily' || (!lift && !perk)) return PIVOT[who];
  const up = (v: string, by: number) => v.replace(/ ([\d.]+)$/, (_, y: string) => ` ${Number(y) - by}`);
  return { ...PIVOT.lily, neck: up(PIVOT.lily.neck, lift + perk), 'arm-point': up(PIVOT.lily['arm-point'], lift) };
}
/** Lily grows (v5 A1, L132 ceremony) in 2.4 s, like cq-grow in style.css. */
export const GROW_MS = 2400;
const GROUND = new Set(['shadow', 'laptop']); // stay on the floor while she jumps or shakes
const HEAD = /^(head|ear-|eyes-|mouth-|glasses|plume)/;
export function movedParts(who: Mascot, pose: Move): { body: string[]; head: string[]; extra: string[] } {
  const parts: readonly string[] = RIG[who][pose];
  const extra: readonly string[] = MOVES[pose].extra;
  return { body: parts.filter((p) => !GROUND.has(p)), head: parts.filter((p) => HEAD.test(p)), extra: extra.filter((p) => parts.includes(p)) };
}

/** One pose as a <g> of <g data-part="…"><use/></g>: real elements a later rig can move one by one (v6 M1); the outer <g> carries Lily's stage scale. */
export function rig(who: Mascot, pose: Pose): SVGGElement {
  return s('g', {}, ...RIG[who][pose].map((p) => s('g', { 'data-part': p }, s('use', { href: `#${who}-${p}` }))));
}

/**
 * A mascot built from sprite parts (rig()), so no artwork is shipped in JS (Plan 7 V3). Decorative by default (aria-hidden: the words
 * sit next to it, v6 §1.4 rule 2); pass `label` only for a picture that stands alone (the welcome screen).
 * Sizes (rule 4): size-12 in a line, size-16 on a card, size-24 to size-28 beside a bubble.
 */
export function mascot(who: Mascot, pose: Pose, cls = 'size-12', label?: string, stage?: number): SVGSVGElement {
  const a11y: Record<string, string> = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' };
  // data-mascot: Lily's growth stage (L87, <html data-lily> + style.css) reaches every Lily drawn here, never the top-bar logo.
  // data-pose: picks the one-shot reaction keyframe of react() (src/ui/celebrate.ts, ui-ux-v5 §1).
  // data-stage: this one Lily at another growth stage than the player's (the next-stage silhouette, L132).
  const at: Record<string, string> = stage === undefined ? {} : { 'data-stage': String(stage) };
  return s('svg', { viewBox: '0 0 120 120', class: cx('shrink-0 overflow-visible', cls), 'data-mascot': who, 'data-pose': pose, ...at, ...a11y }, rig(who, pose));
}

/** rerender(): Lily's stage on <html data-lily> (0–5, src/lily.ts) and her accessory colour on data-lily-acc (none = default, L134). */
export function setLilyStage(stage: number, acc?: number): void {
  const d = document.documentElement.dataset;
  d.lily = String(stage);
  if (acc === undefined) delete d.lilyAcc;
  else d.lilyAcc = String(acc);
}
