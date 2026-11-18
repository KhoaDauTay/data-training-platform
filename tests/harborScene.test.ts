import { describe, expect, it } from 'vitest';
import { bayBox, CRANE, TRUCK_LOOP, TRUCK_PLAN } from '../src/art/logistics';

// ui-ux-v6 S1 (T7): the Tien Sa scene was redrawn; the geometry the completion scenes (A2) rely on stays, and Home's
// ambient truck runs a fixed 18 s schedule that never drives through a closed barrier or shutter. Vitest has no DOM,
// so the schedule is checked as data; GSAP only plays it.
const RAW = import.meta.glob(['../src/art/logistics.ts', '../src/style.css'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('scene geometry kept for the completion scenes', () => {
  it('crane home', () => expect(CRANE).toEqual({ x: 555, y: 170 }));
  it('yard bays', () => {
    expect(bayBox(1, 0)).toEqual({ x: 790, y: 303, w: 32, h: 9, base: 312 });
    expect(bayBox(6, 2)).toEqual({ x: 970, y: 285, w: 32, h: 9, base: 312 });
    expect(bayBox(7, 0)).toEqual({ x: 800, y: 262, w: 30, h: 8, base: 270 });
    expect(bayBox(12, 5)).toEqual({ x: 980, y: 222, w: 30, h: 8, base: 270 });
  });
});

type Part = (typeof TRUCK_PLAN)[number]['part'];
const segs = (part: Part) => TRUCK_PLAN.filter((s) => s.part === part).sort((a, b) => a.at - b.at);
/** Settled value of `part` at `t`, or NaN while it moves. */
function valueAt(part: Part, t: number): number {
  const list = segs(part);
  if (list.some((s) => t > s.at && t < s.at + s.dur)) return NaN;
  const before = list.filter((s) => s.at + s.dur <= t);
  return before.length ? before[before.length - 1].to : list[list.length - 1].to;
}
const overlaps = (a: { at: number; dur: number }, b: { at: number; dur: number }) => a.at < b.at + b.dur && b.at < a.at + a.dur;
/** Truck x where its body (76 units) is under the barrier arm (x 858–906) or inside the shutter's frame (x ≥ 1026). */
const underArm = (x: number) => x > 858 - 76 && x < 906;
const atShutter = (x: number) => x + 76 > 1026;
const reaches = (s: { from: number; to: number }, f: (x: number) => boolean) => {
  for (let k = 0; k <= 50; k++) if (f(s.from + ((s.to - s.from) * k) / 50)) return true;
  return false;
};

describe('Home ambient truck (S1: in and out of the gate, 18 s a loop)', () => {
  it('loop is 18 s and every segment fits in it', () => {
    expect(TRUCK_LOOP).toBe(18);
    for (const s of TRUCK_PLAN) {
      expect(s.at).toBeGreaterThanOrEqual(0);
      expect(s.dur).toBeGreaterThan(0);
      expect(s.at + s.dur).toBeLessThanOrEqual(TRUCK_LOOP);
    }
  });
  it('each part chains without overlap and ends where it starts (seamless loop)', () => {
    for (const part of ['truck', 'barrier', 'shutter'] as const) {
      const list = segs(part);
      expect(list.length).toBeGreaterThan(0);
      for (let i = 1; i < list.length; i++) {
        expect(list[i].from).toBe(list[i - 1].to);
        expect(list[i].at).toBeGreaterThanOrEqual(list[i - 1].at + list[i - 1].dur);
      }
      expect(list[list.length - 1].to).toBe(list[0].from);
    }
  });
  it('starts and ends off the road edge, invisible (x 640)', () => expect(segs('truck')[0].from).toBe(640));
  it('the barrier is up the whole time the truck is under the arm', () => {
    for (const s of segs('truck').filter((s) => reaches(s, underArm))) {
      expect(valueAt('barrier', s.at)).toBe(80);
      expect(valueAt('barrier', s.at + s.dur)).toBe(80);
      expect(segs('barrier').some((b) => overlaps(b, s))).toBe(false);
    }
  });
  it('the shutter is open the whole time the truck is in its frame', () => {
    for (const s of segs('truck').filter((s) => reaches(s, atShutter))) {
      const end = s.to > s.from ? s.at + s.dur : s.at; // driving in: open by the end; backing out: open from the start
      expect(valueAt('shutter', end)).toBe(1);
    }
    // never moves onto the truck: while the shutter moves, the truck stays clear of its frame
    for (const sh of segs('shutter')) for (const tr of segs('truck').filter((t) => overlaps(t, sh))) {
      expect(reaches(tr, atShutter)).toBe(false);
    }
  });
});

describe('ambient loops moved from CSS to GSAP', () => {
  it('no CSS keyframe loop is left for the scene', () => {
    for (const cls of ['cq-wave', 'cq-cloud', 'cq-beacon', 'cq-trolley', 'cq-hoist', 'cq-ship-out', 'cq-smoke', 'cq-glint']) {
      expect(RAW['../src/style.css']).not.toContain(cls);
      expect(RAW['../src/art/logistics.ts']).not.toContain(cls);
    }
  });
});
