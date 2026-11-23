// V22-A (L203): which result columns the map understands (map-research.md option A). Pure, no text, no DOM: imported only by
// the lazy `mapTeach` chunk (src/ui/mapTeach.ts) and by tests.
import type { QueryResult } from '../db/run';

/**
 * Every `ports.code` of the Logistics seed: [lon, lat, ports.name]. Airports sit on their city. Longitudes east of 180 stay
 * > 180 (the Americas on the Pacific side), like src/art/seaLanes.ts. New York (−74) is west of the map's frame (lon −12…254.7):
 * it is drawn as an arrow at the left edge (D-M3, L200), so the frame of L119 stays.
 */
export const PORTS: Record<string, readonly [number, number, string]> = {
  VNSGN: [106.8, 10.75, 'Ho Chi Minh (Cat Lai)'], VNHPH: [106.7, 20.85, 'Hai Phong'], VNDAD: [108.6, 16.1, 'Da Nang'],
  CNSHA: [122.6, 30.7, 'Shanghai'], CNNGB: [121.9, 29.9, 'Ningbo'], SGSIN: [104.2, 1.2, 'Singapore'], KRPUS: [129.3, 34.9, 'Busan'],
  JPTYO: [139.8, 35.6, 'Tokyo'], THLCH: [100.7, 12.9, 'Laem Chabang'], INNSA: [72.9, 18.95, 'Nhava Sheva'],
  NLRTM: [3.8, 52.1, 'Rotterdam'], DEHAM: [9.9, 53.5, 'Hamburg'], BEANR: [4.4, 51.25, 'Antwerp'], USLAX: [241.4, 33.5, 'Los Angeles'],
  USNYC: [-74, 40.7, 'New York'], AUSYD: [151.6, -33.9, 'Sydney'], SGN: [106.65, 10.8, 'Tan Son Nhat Airport'],
  HAN: [105.8, 21.2, 'Noi Bai Airport'], PVG: [121.8, 31.15, 'Shanghai Pudong Airport'], ICN: [126.45, 37.46, 'Incheon Airport'],
  NRT: [140.4, 35.8, 'Narita Airport'], FRA: [8.57, 50.03, 'Frankfurt Airport'], LAX: [241.6, 33.94, 'Los Angeles Airport'],
  SYD: [151.18, -33.94, 'Sydney Airport'],
};
/** Port code of a code or a `ports.name` (both are keys a player's GROUP BY may return). */
export const portOf = (v: string): string | undefined =>
  PORTS[v] ? v : Object.keys(PORTS).find((c) => PORTS[c][2] === v);

/** Postgres type OIDs read as numbers (PGlite returns numeric as strings) and as dates. */
const NUM = new Set([20, 21, 23, 700, 701, 1700]);
const DATE = new Set([1082, 1114, 1184]);

export interface GeoSpec {
  /** Column of the place key; `key2` a second place column (pol, pod): the map draws a line per row. */
  key: number;
  key2?: number;
  /** Numeric columns the map can draw (the first one by default; a <select> switches). */
  values: number[];
  /** Column that splits rows sharing a place into frames (a date first): the time slider. */
  frame?: number;
}

const text = (v: unknown): string | undefined => (v === null || v === undefined ? undefined : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

/**
 * The first column whose every non-null value is a place of the domain (`isPlace`), a second one for lines, the numeric
 * columns, and a frame column when a place repeats. undefined: nothing to draw (the tab says what it needs).
 */
export function geoSpec(r: QueryResult, isPlace: (v: string) => boolean): GeoSpec | undefined {
  const placeCols = r.columns.map((_, c) => c).filter((c) => {
    if (NUM.has(r.types[c])) return false;
    const vals = r.rows.map((row) => text(row[c])).filter((v): v is string => v !== undefined);
    return vals.length > 0 && vals.every(isPlace);
  });
  const values = r.columns.map((_, c) => c).filter((c) => NUM.has(r.types[c]) && r.rows.some((row) => row[c] !== null));
  if (!placeCols.length || !values.length) return undefined;
  const [key, key2] = placeCols;
  const spec: GeoSpec = { key, values, ...(key2 === undefined ? {} : { key2 }) };
  const id = (row: unknown[]) => `${text(row[key])}|${key2 === undefined ? '' : text(row[key2])}`;
  if (new Set(r.rows.map(id)).size < r.rows.length) {
    const rest = r.columns.map((_, c) => c).filter((c) => c !== key && c !== key2 && !NUM.has(r.types[c]));
    const frame = rest.find((c) => DATE.has(r.types[c])) ?? rest[0];
    if (frame !== undefined) spec.frame = frame;
  }
  return spec;
}

export interface GeoRow { key: string; key2?: string; v: number; row: number }

/** Distinct values of the frame column in result order (empty without one). */
export const framesOf = (r: QueryResult, s: GeoSpec): string[] =>
  s.frame === undefined ? [] : [...new Set(r.rows.map((row) => text(row[s.frame!]) ?? ''))];

/** Rows of one frame (all rows without one) with a value; a place repeated inside a frame keeps its first row. */
export function geoRows(r: QueryResult, s: GeoSpec, value: number, frame?: string): GeoRow[] {
  const seen = new Set<string>();
  const out: GeoRow[] = [];
  r.rows.forEach((row, i) => {
    const key = text(row[s.key]);
    const key2 = s.key2 === undefined ? undefined : text(row[s.key2]);
    const v = row[value] === null ? NaN : Number(row[value]);
    if (key === undefined || (s.key2 !== undefined && key2 === undefined) || !Number.isFinite(v)) return;
    if (frame !== undefined && s.frame !== undefined && (text(row[s.frame]) ?? '') !== frame) return;
    const id = `${key}|${key2 ?? ''}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ key, ...(key2 === undefined ? {} : { key2 }), v, row: i });
  });
  return out;
}

/** Counts and sums (every value whole) are drawn as sizes; rates and averages as five colour steps (map-research §4 A). */
export const isCount = (r: QueryResult, value: number): boolean => r.rows.every((row) => row[value] === null || Number.isInteger(Number(row[value])));
/** Colour step 0..4 of v between lo and hi (equal intervals). */
export const step5 = (v: number, lo: number, hi: number): number => (hi === lo ? 4 : Math.min(4, Math.floor(((v - lo) / (hi - lo)) * 5)));

/** An axis-aligned box in map units. */
export interface Box { x: number; y: number; w: number; h: number }
const hits = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export type Anchor = 'start' | 'middle' | 'end';
/**
 * The box of one line of SVG text at (x, baseline y), halo included (measured with getBBox on the Map page: ~0.6 em per
 * digit, 1.4 em tall from 1.05 em above the baseline). ponytail: no font metrics; widen if a font change makes labels touch.
 */
export function textBox(x: number, y: number, anchor: Anchor, text: string, size: number): Box {
  const w = text.length * size * 0.62 + 2;
  return { x: anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x, y: y - size * 1.05, w, h: size * 1.4 };
}
/**
 * L311: a value label beside each symbol (centre x/y, radius r) that covers neither the map's own labels (`taken`), another
 * symbol nor another value: the first free spot of right, left, above, below, in the order given (most important first).
 * undefined = no free spot: the value is left off the map (the list by value under it still has every row).
 */
export function placeLabels(items: { x: number; y: number; r: number; text: string }[], taken: Box[], size: number): ({ x: number; y: number; anchor: Anchor } | undefined)[] {
  const busy = [...taken, ...items.map((i) => ({ x: i.x - i.r, y: i.y - i.r, w: 2 * i.r, h: 2 * i.r }))];
  return items.map(({ x, y, r, text }) => {
    const spots: { x: number; y: number; anchor: Anchor }[] = [
      { x: x + r + 3, y: y + size * 0.3, anchor: 'start' }, { x: x - r - 3, y: y + size * 0.3, anchor: 'end' },
      { x, y: y - r - size * 0.4, anchor: 'middle' }, { x, y: y + r + size * 1.1, anchor: 'middle' },
    ];
    const spot = spots.find((s) => !busy.some((b) => hits(textBox(s.x, s.y, s.anchor, text, size), b)));
    if (spot) busy.push(textBox(spot.x, spot.y, spot.anchor, text, size));
    return spot;
  });
}
