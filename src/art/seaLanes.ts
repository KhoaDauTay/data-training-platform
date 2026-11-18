// ui-ux-v6 S2: the route map's lanes on the real coastline of src/art/coast.ts. Each lane runs from Tien Sa through sea
// waypoints (straits, Suez, the Pacific great circle) to its port; the curve is a Catmull-Rom spline through them.
// tests/seaLanes.test.ts keeps every port and every lane at sea. Longitudes east of 180 stay > 180 (the Americas).
import { COAST } from './coast';

export type Pt = [number, number];
export type LonLat = readonly [number, number];
const r1 = (v: number): number => Math.round(v * 10) / 10;
export const xy = ([lon, lat]: LonLat): Pt => [r1((lon - COAST.lon0) * COAST.k), r1((COAST.lat0 - lat) * COAST.k)];

/** Tien Sa, just off Da Nang. */
export const HUB: LonLat = [108.6, 16.1];
export interface LaneGeo {
  port: LonLat;
  via: LonLat[];
  /** Label offset from the pin (map units) and its text-anchor. */
  label: [number, number, 'start' | 'middle' | 'end'];
}
const SOUTH: LonLat[] = [[110, 12.5], [107.5, 6.5]];
const NORTH: LonLat[] = [[111.5, 17.5], [115.5, 20], [119.6, 23.6], [122.8, 28.3]];
export const LANE_GEO: Record<string, LaneGeo> = {
  CNSHA: { port: [122.6, 30.7], via: NORTH, label: [-10, -6, 'end'] },
  THLCH: { port: [100.7, 12.9], via: [[109.8, 12.5], [106.5, 8.2], [103, 10]], label: [-10, -8, 'end'] },
  SGSIN: { port: [104.2, 1.2], via: [...SOUTH, [105, 2.8]], label: [-10, 16, 'end'] },
  NLRTM: {
    port: [3.8, 52.1],
    via: [...SOUTH, [104.5, 1.6], [101.5, 2.6], [97.5, 6], [88, 5.6], [80.5, 5], [70, 10], [57, 13.5], [49, 12.4], [43.4, 12.6],
      [39, 19.5], [34.4, 27.4], [32.5, 30.4], [31.5, 33], [25, 34.2], [16, 36], [11.8, 37.8], [5, 37.6], [-1, 36.4], [-5.6, 35.95],
      [-10, 37], [-10, 43.5], [-5.5, 48.2], [-0.5, 50.1], [2.3, 51.3]],
    label: [12, -8, 'start'],
  },
  KRPUS: { port: [129.3, 34.9], via: [...NORTH, [125.8, 32.3]], label: [10, -8, 'start'] },
  USLAX: {
    port: [241.4, 33.5],
    via: [[111.5, 17.5], [116, 19.6], [121.2, 21], [126, 24], [134, 29], [145, 34.5], [160, 40], [180, 43.5], [200, 43], [220, 39], [234, 35.2]],
    label: [-10, 20, 'end'],
  },
  AUSYD: {
    port: [151.6, -33.9],
    via: [[110, 12.5], [109.2, 6], [108.6, 1], [108.8, -2.6], [112, -5.2], [117, -6.3], [121, -7.3], [126, -7], [131, -9.3], [137, -10.2],
      [142.3, -10.2], [146.5, -13], [152, -20], [154.5, -27], [153, -31.5]],
    label: [12, 5, 'start'],
  },
};

/** Cubic segments [p0, c1, c2, p3] of the Catmull-Rom spline through hub → waypoints → port. */
export function laneCurve(port: string): [Pt, Pt, Pt, Pt][] {
  const g = LANE_GEO[port];
  const p = [HUB, ...g.via, g.port].map(xy);
  return p.slice(0, -1).map((a, i) => {
    const b = p[i + 1];
    const prev = p[i - 1] ?? a;
    const next = p[i + 2] ?? b;
    return [a, [r1(a[0] + (b[0] - prev[0]) / 6), r1(a[1] + (b[1] - prev[1]) / 6)], [r1(b[0] - (next[0] - a[0]) / 6), r1(b[1] - (next[1] - a[1]) / 6)], b];
  });
}
export const lanePath = (port: string): string => {
  const segs = laneCurve(port);
  return `M${segs[0][0].join(' ')}` + segs.map(([, c1, c2, b]) => `C${c1.join(' ')} ${c2.join(' ')} ${b.join(' ')}`).join('');
};
