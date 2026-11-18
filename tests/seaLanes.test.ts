import { describe, expect, it } from 'vitest';
import { COAST, LAND } from '../src/art/coast';
import { HUB, LANE_GEO, laneCurve, lanePath, xy, type Pt } from '../src/art/seaLanes';
import { ROUTES } from '../src/scene';
import { staggerGap } from '../src/art/mapMotion';

/** The generated LAND path (M x y, then relative l dx dy, z) back into polygons. */
function landRings(): Pt[][] {
  return LAND.split('M').filter(Boolean).map((ring) => {
    const [head, ...rest] = ring.replace('z', '').split('l');
    const pts: Pt[] = [head.trim().split(' ').map(Number) as Pt];
    for (const step of rest) {
      const [dx, dy] = step.match(/-?\d+/g)!.map(Number);
      const [x, y] = pts[pts.length - 1];
      pts.push([x + dx, y + dy]);
    }
    return pts;
  });
}
const rings = landRings();
/** Even-odd over every ring, like fill-rule evenodd. */
const onLand = ([x, y]: Pt): boolean => rings.reduce((inside, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c ? !inside : inside;
}, false);
const segDist = ([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt): number => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const toCoast = (p: Pt): number => Math.min(...rings.flatMap((r) => r.map((a, i) => segDist(p, a, r[(i + 1) % r.length]))));
const cubic = ([a, b, c, d]: [Pt, Pt, Pt, Pt], t: number): Pt => {
  const u = 1 - t;
  const f = (k: 0 | 1): number => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k];
  return [f(0), f(1)];
};

describe('route map geography (ui-ux-v6 S2)', () => {
  it('the land is real coastline data inside the frame', () => {
    expect(rings.length).toBeGreaterThan(30);
    expect(LAND.length).toBeLessThan(12_000); // ≈ 3–5 KB gz (budget group art)
    expect(onLand(xy([100, 45]))).toBe(true); // Mongolia
    expect(onLand(xy([135, -25]))).toBe(true); // Australia
    expect(onLand(xy([50, 42]))).toBe(false); // the Caspian is a hole
    expect(onLand(xy([180, 20]))).toBe(false); // mid-Pacific
  });

  it('every lane of ROUTES has geometry and nothing else does', () => {
    expect(Object.keys(LANE_GEO).sort()).toEqual(ROUTES.map((r) => r.port).sort());
  });

  it('the hub and every port sit on the sea, inside the frame', () => {
    for (const p of [HUB, ...Object.values(LANE_GEO).map((g) => g.port)]) {
      const [x, y] = xy(p);
      expect(onLand([x, y]), `${p}`).toBe(false);
      expect(x > 10 && x < COAST.w - 10 && y > 10 && y < COAST.h - 10, `${p}`).toBe(true);
    }
  });

  it('every lane stays at sea: no sample of the drawn curve lies deeper than 3 units inland (straits, Suez)', () => {
    for (const port of Object.keys(LANE_GEO)) {
      const deep = laneCurve(port).flatMap((seg) => [0, 0.1, 0.3, 0.5, 0.7, 0.9].map((t) => cubic(seg, t)))
        .filter((p) => onLand(p) && toCoast(p) > 3);
      expect(deep.map((p) => p.map(Math.round).join(',')), port).toEqual([]);
    }
  });

  it('lanePath starts at the hub and ends at the port', () => {
    for (const port of Object.keys(LANE_GEO)) {
      const d = lanePath(port);
      expect(d.startsWith(`M${xy(HUB).join(' ')}`)).toBe(true);
      expect(d.endsWith(xy(LANE_GEO[port].port).join(' '))).toBe(true);
    }
  });

  it('new lanes draw one after another and the last pin pops by 3 s', () => {
    for (let n = 1; n <= ROUTES.length; n++) {
      const gap = staggerGap(n, 1200);
      expect(gap).toBeGreaterThanOrEqual(0);
      expect((n - 1) * gap + Math.max(1200, 0.9 * 1200 + 300)).toBeLessThanOrEqual(3000);
      if (n > 1) expect(gap).toBeGreaterThan(0);
    }
  });
});
