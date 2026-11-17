// Plan 8b Task 3: the living route map. Ships sail the open lanes (shared ambient loop), a newly opened lane draws
// itself in once per device, and (Task 4) the overview scene's pointer parallax. Art chunk: no runtime import from main.
import { ambient } from './ambient';
import type { Harbor } from '../scene';
import type { MapParts } from './logistics';

const NS = 'http://www.w3.org/2000/svg';
const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** Places `ship` at fraction `x` of `path`, nose along the lane (mirrored when heading left, like sail()). */
export function placeOnPath(ship: SVGGElement, path: SVGPathElement, len: number, x: number, back = false, scale = 1): void {
  const a = path.getPointAtLength(x * len);
  const b = path.getPointAtLength(clamp(x * len + (back ? -1 : 1), 0, len));
  const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const flip = Math.abs(deg) > 90;
  ship.setAttribute('transform', `translate(${a.x},${a.y}) rotate(${flip ? deg + 180 : deg}) scale(${(flip ? -1 : 1) * scale},${scale})`);
}

/**
 * Up to 4 small ships run there and back on the open lanes (most recently opened first), 14–22 s a round trip by lane
 * length, out of phase. Positions come from the frame time, so a hidden tab resumes without a jump. Returns stop.
 */
export function sailFleet(p: MapParts, h: Harbor, order: string[]): () => void {
  if (reduced()) return () => {};
  const lanes = order.filter((port) => h.open.has(port)).slice(0, 4);
  if (!lanes.length) return () => {};
  const fleet = lanes.map((port, i) => {
    const path = p.routes[port];
    const len = path.getTotalLength();
    const ship = p.ship.cloneNode(true) as SVGGElement;
    const bob = document.createElementNS(NS, 'g');
    bob.setAttribute('class', 'cq-ship-bob');
    bob.append(...ship.childNodes);
    ship.append(bob);
    ship.setAttribute('opacity', '1');
    p.ship.before(ship);
    return { ship, path, len, period: clamp(len / 40, 14, 22) * 1000, phase: i * 0.27 };
  });
  const stop = ambient(p.svg, (ms) => {
    if (!p.svg.isConnected) return end(); // the page redrew without calling stop: never animate a detached map
    for (const f of fleet) {
      const k = (ms / f.period + f.phase) % 1;
      const back = k >= 0.5;
      const x = back ? 2 - 2 * k : 2 * k;
      placeOnPath(f.ship, f.path, f.len, 0.04 + 0.92 * x, back, 0.7);
    }
  });
  function end(): void {
    stop();
    fleet.forEach((f) => f.ship.remove());
  }
  return end;
}

/**
 * Draws each lane of `draw` in (stroke-dashoffset, `ms`), then pops its pin. The dash pattern goes through WAAPI style
 * only and is removed when the animation ends or is cancelled, so paintRoutes() (attributes) always wins: a locked
 * lane keeps its "6 6" dashes (D8b-5). Reduced motion: nothing, the lane is simply there.
 */
export function drawNewRoutes(p: MapParts, draw: string[], ms = 1200): Promise<void> {
  if (reduced() || !draw.length) return Promise.resolve();
  return Promise.all(draw.map((port) => {
    const path = p.routes[port];
    const pin = p.pins[port];
    if (!path || !pin || typeof path.animate !== 'function') return undefined;
    const len = path.getTotalLength();
    const dash = `${len} ${len}`;
    const line = path.animate([{ strokeDasharray: dash, strokeDashoffset: len }, { strokeDasharray: dash, strokeDashoffset: 0 }], { duration: ms, easing: 'ease-out' });
    pin.style.transformBox = 'fill-box';
    pin.style.transformOrigin = 'center';
    const dot = pin.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 300, delay: ms * 0.9, fill: 'backwards' });
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

/** The map on a reading page or the open map dialog: draw new lanes once, then the fleet sails. Returns stop. */
export function liveMap(p: MapParts, h: Harbor, draw: string[], order: string[]): () => void {
  void drawNewRoutes(p, draw);
  return sailFleet(p, h, order);
}
