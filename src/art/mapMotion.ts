// Plan 8b Task 3: the living route map. Ships sail the open lanes (shared ambient loop; GSAP MotionPath since ui-ux-v6
// S2, the module handed in, never imported), a newly opened lane draws itself in once per device, and (Task 4) the overview scene's pointer parallax. Art chunk: no runtime import from main.
import { ambient } from './ambient';
import type { Harbor } from '../scene';
import type { MapParts } from './logistics';

type Gsap = typeof import('./gsap');

const NS = 'http://www.w3.org/2000/svg';
const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/**
 * S2: up to 4 small ships run there and back on the open lanes (most recently opened first), 14–36 s a round trip by
 * lane length, out of phase. Each is a paused GSAP MotionPath timeline (autoRotate) scrubbed by the shared ambient()
 * clock, so a hidden tab or an off-screen map stops it and resumes without a jump. The outer <g> takes GSAP's transform;
 * the inner one is the mirror (heading left = upright, never upside down) and the 0.7 scale. Returns stop.
 */
export function sailFleet(g: Gsap, p: MapParts, h: Harbor, order: string[]): () => void {
  if (reduced()) return () => {};
  const lanes = order.filter((port) => h.open.has(port)).slice(0, 4);
  if (!lanes.length) return () => {};
  const fleet = lanes.map((port, i) => {
    const path = p.routes[port];
    const ship = p.ship.cloneNode(true) as SVGGElement;
    const mirror = ship.firstElementChild as SVGGElement;
    const bob = document.createElementNS(NS, 'g');
    bob.setAttribute('class', 'cq-ship-bob');
    bob.append(...mirror.childNodes);
    mirror.append(bob);
    ship.setAttribute('opacity', '1');
    p.ship.before(ship);
    const period = clamp(path.getTotalLength() / 40, 14, 36);
    const leg = (start: number, end: number): object => ({
      duration: period / 2, ease: 'sine.inOut',
      motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true, start, end },
      onUpdate: () => {
        const deg = Number(g.gsap.getProperty(ship, 'rotation'));
        mirror.setAttribute('transform', Math.cos((deg * Math.PI) / 180) < 0 ? 'scale(0.7,-0.7)' : 'scale(0.7)');
      },
    });
    const tl = g.timeline().to(ship, leg(0.04, 0.96)).to(ship, leg(0.96, 0.04));
    return { ship, tl, period, phase: i * 0.27 * period };
  });
  const stop = ambient(p.svg, (ms) => {
    if (!p.svg.isConnected) return end(); // the page redrew without calling stop: never animate a detached map
    for (const f of fleet) f.tl.time((ms / 1000 + f.phase) % f.period);
  });
  function end(): void {
    stop();
    for (const f of fleet) { f.tl.kill(); f.ship.remove(); }
  }
  return end;
}

/** Delay between new lanes (ms): half a lane, less when many, so the last pin pop (0.9 ms + 300) ends by 3 s. */
export const staggerGap = (n: number, ms: number): number => (n > 1 ? Math.max(0, Math.min(ms / 2, (3000 - Math.max(ms, 0.9 * ms + 300)) / (n - 1))) : 0);

/**
 * Draws each lane of `draw` in (stroke-dashoffset, `ms`), then pops its pin; several new lanes draw one after another
 * (S2 stagger), all within 3 s. The dash pattern goes through WAAPI style
 * only and is removed when the animation ends or is cancelled, so paintRoutes() (attributes) always wins: a locked
 * lane keeps its "6 6" dashes (D8b-5). Reduced motion: nothing, the lane is simply there.
 */
export function drawNewRoutes(p: MapParts, draw: string[], ms = 1200): Promise<void> {
  if (reduced() || !draw.length) return Promise.resolve();
  const gap = staggerGap(draw.length, ms);
  return Promise.all(draw.map((port, i) => {
    const path = p.routes[port];
    const pin = p.pins[port];
    if (!path || !pin || typeof path.animate !== 'function') return undefined;
    const len = path.getTotalLength();
    const dash = `${len} ${len}`;
    const line = path.animate([{ strokeDasharray: dash, strokeDashoffset: len }, { strokeDasharray: dash, strokeDashoffset: 0 }], { duration: ms, delay: i * gap, easing: 'ease-out', fill: 'backwards' });
    pin.style.transformBox = 'fill-box';
    pin.style.transformOrigin = 'center';
    const dot = pin.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 300, delay: i * gap + ms * 0.9, fill: 'backwards' });
    const clear = (): void => {
      path.style.removeProperty('stroke-dasharray');
      path.style.removeProperty('stroke-dashoffset');
    };
    return Promise.all([line.finished, dot.finished]).then(clear, clear);
  })).then(() => undefined);
}

/** A ring that grows and fades once at (x, y) of the map: the ship has arrived (Task 5). */
export function arrivalPulse(p: MapParts, x: number, y: number, cls: string, ms = 250): void {
  if (reduced()) return;
  const c = document.createElementNS(NS, 'circle');
  for (const [k, v] of Object.entries({ cx: x, cy: y, r: 6, fill: 'none', 'stroke-width': 2, class: cls })) c.setAttribute(k, String(v));
  c.style.transformBox = 'fill-box';
  c.style.transformOrigin = 'center';
  p.rings.append(c);
  c.animate([{ transform: 'scale(1)', opacity: 0.8 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: ms, easing: 'ease-out' }).finished.then(() => c.remove(), () => c.remove());
}

/**
 * D8b-7: the overview scene's far layer moves ±6/±3 units and the mid layer ±3/±1.5 with a fine pointer, easing back
 * to 0 when it leaves. Never on touch screens or under reduced motion. Returns stop.
 */
export function parallax(svg: SVGSVGElement): () => void {
  if (reduced() || !window.matchMedia('(pointer: fine)').matches) return () => {};
  const layers: [Element[], number, number][] = [
    [[...svg.querySelectorAll('[data-layer="far"]')], 6, 3],
    [[...svg.querySelectorAll('[data-layer="mid"]')], 3, 1.5],
  ];
  const goal = { x: 0, y: 0 };
  const now = { x: 0, y: 0 };
  const move = (e: PointerEvent): void => {
    const r = svg.getBoundingClientRect();
    goal.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    goal.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  };
  const leave = (): void => { goal.x = 0; goal.y = 0; };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerleave', leave);
  let last = '';
  const stop = ambient(svg, () => {
    if (!svg.isConnected) return end();
    now.x += (goal.x - now.x) * 0.08;
    now.y += (goal.y - now.y) * 0.08;
    const key = `${now.x.toFixed(3)},${now.y.toFixed(3)}`;
    if (key === last) return; // at rest: no DOM writes
    last = key;
    for (const [els, ax, ay] of layers) for (const el of els) el.setAttribute('transform', `translate(${(-now.x * ax).toFixed(2)},${(-now.y * ay).toFixed(2)})`);
  });
  function end(): void {
    stop();
    svg.removeEventListener('pointermove', move);
    svg.removeEventListener('pointerleave', leave);
  }
  return end;
}
