import { cx } from '../theme';
import { s } from './svg';

/**
 * Every UI and skill icon (ui-ux-v3 §0, §e): path data on a 24 grid, 2px stroke in currentColor, no text, no emoji.
 * An entry is the stroked `d`, plus an optional second `d` that is also filled: translucent by default (the picked
 * column, the dots of DISTINCT), or SOLID where a 16 px icon must be told apart by its fill (the JOIN family, L43).
 */
type Entry = string | readonly [stroke: string, fill: string, opacity?: number];
const SOLID = 1;

const CIRCLE = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
/** Two r=6 circles at x=9 and x=15 meet at (12, 6.8) and (12, 17.2). */
const VENN = `${CIRCLE(9, 12, 6)} ${CIRCLE(15, 12, 6)}`;
const LENS = 'M12 6.8A6 6 0 0 1 12 17.2A6 6 0 0 1 12 6.8z';
const LEFT_MOON = 'M12 6.8A6 6 0 1 0 12 17.2A6 6 0 0 1 12 6.8z';
const CALENDAR = 'M4 5h16v15H4z M4 9h16 M8 3v4 M16 3v4';
/** Three open-top buckets in the lower half (GROUP BY / HAVING). */
const BUCKETS = 'M2.5 12v9h5v-9 M9.5 12v9h5v-9 M16.5 12v9h5v-9';
/** Three r=5 circles at x=6, 12, 18 (multi JOIN); neighbours meet at x=9 and x=15, y=8 and 16. */
const LENS3 = (x: number): string => `M${x} 8A5 5 0 0 1 ${x} 16A5 5 0 0 1 ${x} 8z`;
const LENS_GLASS = `${CIRCLE(10, 10, 7)} M21 21l-6-6`;
const DOTS = `${CIRCLE(5, 7, 1.5)} ${CIRCLE(5, 17, 1.5)} ${CIRCLE(19, 12, 2)}`;
const BOOK = 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5';

const P = {
  // ---- interface ----
  anchor: `${CIRCLE(12, 5, 2)} M12 7v15 M5 12H2a10 10 0 0 0 20 0h-3 M8 10h8`,
  home: 'M3 11 12 4l9 7 M5 10v10h5v-6h4v6h5V10',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  panelLeft: 'M3 4h18v16H3z M9 4v16',
  overview: 'M4 4h7v7H4z M13 4h7v4h-7z M13 10h7v10h-7z M4 13h7v7H4z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14',
  badge: `${CIRCLE(12, 9, 6)} M8.5 14 7 22l5-3 5 3-1.5-8`,
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2 M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  repeat: 'M17 2l4 4-4 4 M3 11V9a3 3 0 0 1 3-3h15 M7 22l-4-4 4-4 M21 13v2a3 3 0 0 1-3 3H3',
  book: BOOK,
  sun: `${CIRCLE(12, 12, 4)} M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4`,
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  monitor: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M8 20h8 M12 16v4',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  check: 'M20 6 9 17l-5-5',
  arrowRight: 'M5 12h14 M13 6l6 6-6 6',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  flask: 'M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3 M7 15h10',
  folder: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  puzzle: 'M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z',
  // ---- dashboard and lanes (Plan 5, mockup v6) ----
  table: 'M3 4h18v16H3z M3 9h18 M3 14h18 M9 9v11',
  lineChart: 'M3 3v18h18 M6 15l4-5 4 3 6-7',
  pin: 'M9 4h6 M10 4v6l-3 4h10l-3-4V4 M12 14v7',
  unpin: 'M9 4h6 M10 4v6l-3 4h10l-3-4V4 M12 14v7 M3 3l18 18',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5',
  up: 'M12 19V5 M6 11l6-6 6 6',
  down: 'M12 5v14 M6 13l6 6 6-6',
  x: 'M6 6l12 12 M18 6 6 18',
  alert: 'M12 3 2 20h20z M12 10v4 M12 17h.01',
  eye: `M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z ${CIRCLE(12, 12, 3)}`,
  eyeOff: 'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9 M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  route: `${CIRCLE(6, 19, 2)} ${CIRCLE(18, 5, 2)} M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7`,
  fuel: 'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16 M3 21h12 M4 10h10 M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3',
  calendar: CALENDAR,
  info: `${CIRCLE(12, 12, 9)} M12 11v6 M12 7.5h.01`,
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  // ---- KPI tiles ----
  hash: 'M4 9h16 M4 15h16 M10 3 8 21 M16 3l-2 18',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  chart: 'M3 3v18h18 M7 16h4 M7 11h10 M7 6h7',
  box: 'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
  scale: 'M12 3v18 M7 21h10 M5 7h14 M5 7l-3 7a3 3 0 0 0 6 0z M19 7l-3 7a3 3 0 0 0 6 0z',
  ship: 'M2 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0 M4 17l-1-5h18l-2 5 M6 12V8h12v4 M12 8V4',
  container: 'M3 6h18v12H3z M7.5 9v6 M12 9v6 M16.5 9v6',
  clockOff: `${CIRCLE(12, 12, 9)} M12 7v5l3 2 M4 4l16 16`,
  trophy: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M7 6H4v1a3 3 0 0 0 3 3 M17 6h3v1a3 3 0 0 1-3 3',
  clockAlert: 'M11 21a9 9 0 1 1 9-9 M11 7v5l3 2 M20 15v3 M20 21h.01',
  stamp: 'M5 21h14 M5 17h14v-3a2 2 0 0 0-2-2h-3V9a3 3 0 1 0-4 0v3H7a2 2 0 0 0-2 2z',
  copy: 'M9 9h11v11H9z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  percent: `M19 5 5 19 ${CIRCLE(7, 7, 2)} ${CIRCLE(17, 17, 2)}`,
  // ---- skills (content/skills.yml) ----
  select: ['M3 9h18v12H3z M9 9v12 M15 9v12 M12 6V2 M10 4l2-2 2 2', 'M9 9h6v12H9z'],
  where: 'M3 4h18l-7 8v7l-4 2v-9z',
  orderBy: 'M7 4v16 M4 7l3-3 3 3 M4 17l3 3 3-3 M13 6h8 M13 12h6 M13 18h4',
  limit: 'M4 4h16 M4 9h16 M4 14h16 M4 20h2 M9 20h2 M14 20h2 M19 20h1',
  sigma: 'M18 5H6l6 7-6 7h12',
  // GROUP BY: one stream forks into three buckets, each holding some rows.
  groupBy: [`M12 3v4 M12 7 5 10.5 M12 7l7 3.5 M12 7v3.5 ${BUCKETS}`, 'M2.5 17h5v4h-5z M9.5 15h5v6h-5z M16.5 18h5v3h-5z'],
  // HAVING: the groups already exist; a check keeps only the middle bucket (solid), the others stay empty.
  having: [`M8 5.5l3 3 5-6 ${BUCKETS}`, 'M9.5 12h5v9h-5z', SOLID],
  // JOIN family (L43): same two circles, told apart by a SOLID fill — lens / whole left / left crescent / both.
  join: [VENN, LENS, SOLID],
  multiJoin: [`${CIRCLE(6, 12, 5)} ${CIRCLE(12, 12, 5)} ${CIRCLE(18, 12, 5)}`, `${LENS3(9)} ${LENS3(15)}`, SOLID],
  leftJoin: [VENN, CIRCLE(9, 12, 6), SOLID],
  antiJoin: [VENN, LEFT_MOON, SOLID],
  // SELF JOIN: one table, an arrow leaves it and loops back into it.
  selfJoin: [`${CIRCLE(9, 15, 6)} M9 9V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3 M17.5 12.5 15 15l2.5 2.5`, CIRCLE(9, 15, 6)],
  dateMath: `${CALENDAR} M7 14.5h3 M8.5 13v3 M14 14.5h3`,
  dateBucket: `${CALENDAR} M4 14.5h16 M12 9v11`,
  emptySet: `${CIRCLE(12, 12, 8)} M5 21 19 3`,
  branch: 'M3 12h5 M8 12l5-6h7 M8 12h12 M8 12l5 6h7',
  sigmaCheck: 'M14 5H4l5 7-5 7h10 M15 15l2.5 2.5L22 12',
  fallback: 'M3 12h5 M16 12h5 M8 12c0-6 8-6 8 0 M18 10l3 2-3 2',
  text: 'M4 5h10 M9 5v12 M17 4v12 M15.5 4h3 M15.5 16h3 M4 20h16',
  pattern: `${LENS_GLASS} M10 7v6 M7.4 8.5l5.2 3 M7.4 11.5l5.2-3`,
  distinct: [`M8 7c4 0 4 5 8 5 M8 17c4 0 4-5 8-5 ${DOTS}`, DOTS],
  cast: `M3 3h7v7H3z ${CIRCLE(17.5, 17.5, 3.5)} M14 6h4a2 2 0 0 1 2 2v3 M10 18H6a2 2 0 0 1-2-2v-3 M18 9l2 2 2-2 M2 15l2-2 2 2`,
  // ---- skills planned in the curriculum (ids settle when they reach skills.yml) ----
  nested: 'M3 3h18v18H3z M8 8h8v8H8z',
  nestedCheck: 'M3 3h18v18H3z M8 12l3 3 5-6',
  steps: 'M7 3h10v4H7z M7 10h10v4H7z M7 17h10v4H7z M12 7v3 M12 14v3',
  window: 'M3 5h18 M3 10h18 M3 15h18 M3 20h18 M2 8h20v9H2z',
  windowLag: 'M4 6h16 M4 18h16 M20 12H6 M9 9l-3 3 3 3',
  windowRank: 'M3 20h5v-5h5v-5h5V5h3',
  stack: 'M4 4h16v7H4z M4 13h16v7H4z',
  minus: 'M2 7h7v10H2z M11 12h3 M16 7h6v10h-6z',
  fullJoin: [VENN, `${CIRCLE(9, 12, 6)} ${CIRCLE(15, 12, 6)}`, SOLID],
  // IN (SELECT …): a value goes into a parenthesised list.
  inList: 'M2 12h7 M6 9l3 3-3 3 M13.5 4c-2.5 2.5-2.5 13.5 0 16 M19.5 4c2.5 2.5 2.5 13.5 0 16 M15 9h3 M15 12h3 M15 15h3',
  // Correlated subquery: the current outer row (filled) feeds a small inner query.
  correlated: ['M2 4h7v16H2z M2 9.3h7 M2 14.7h7 M9 12h5 M12 10l2 2-2 2 M15 8h7v8h-7z', 'M2 9.3h7v5.4H2z'],
  // Several CTEs: two WITH blocks feed the final query.
  stepsMerge: 'M3 3h7v5H3z M14 3h7v5h-7z M8.5 16h7v5h-7z M6.5 8v4h11V8 M12 12v4',
  // DISTINCT ON: two groups of rows; only the first row of each (filled) is kept.
  firstPerGroup: ['M3 3h18v4H3z M6 10.5h12 M3 14h18v4H3z M6 21h12', 'M3 3h18v4H3z M3 14h18v4H3z'],
  plan: `${LENS_GLASS} M10 7v3 M7 13l3-3 3 3`,
  bookIndex: 'M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z M18 7h3v3h-3 M18 12h3v3h-3',
  // Index-friendly condition: the bare column (bar) goes straight to the index (arrow), nothing wrapped around it.
  sargable: 'M4 4v16 M8 12h12 M16 8l4 4-4 4',
} as const satisfies Record<string, Entry>;

export type IconName = keyof typeof P;
/** Path data of one icon, for tests/icons.test.ts (no two skill icons may draw the same thing). */
export const iconPaths = (name: IconName): Entry => P[name];
export const isIconName = (name: string): name is IconName => Object.hasOwn(P, name);
export const ICON_NAMES = Object.keys(P) as IconName[];

/** Skill id (content/skills.yml) → icon. tests/icons.test.ts checks every id in skills.yml is here. */
export const SKILL_ICON: Record<string, IconName> = {
  select: 'select', where: 'where', order_by: 'orderBy', limit: 'limit', aggregate: 'sigma', group_by: 'groupBy', having: 'having',
  join: 'join', multi_join: 'multiJoin', left_join: 'leftJoin', anti_join: 'antiJoin', self_join: 'selfJoin',
  date_math: 'dateMath', date_bucket: 'dateBucket', null_logic: 'emptySet', case_when: 'branch', conditional_agg: 'sigmaCheck',
  coalesce: 'fallback', string_fn: 'text', pattern_match: 'pattern', distinct: 'distinct', cast: 'cast',
  // Planned (curriculum.md): mapped now so a new skill gets its picture the day it is added.
  in_subquery: 'inList', scalar_subquery: 'nested', correlated_value: 'correlated', exists: 'nestedCheck',
  cte: 'steps', multi_cte: 'stepsMerge', window_agg: 'window', window_lag: 'windowLag', window_rank: 'windowRank',
  union: 'stack', except: 'minus', full_join: 'fullJoin', distinct_on: 'firstPerGroup', explain_read: 'plan', index_design: 'bookIndex', sargable: 'sargable',
};
export const skillIconName = (id: string): IconName => SKILL_ICON[id] ?? 'puzzle';

/** Decorative: always next to visible text, or inside a control that has an aria-label. */
export function icon(name: IconName, cls = 'size-5'): SVGSVGElement {
  const e: Entry = P[name];
  const [stroke, fill, opacity = 0.35] = typeof e === 'string' ? [e] : e;
  return s('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false', class: cx('shrink-0', cls),
  },
  fill ? s('path', { d: fill, fill: 'currentColor', 'fill-opacity': opacity, stroke: 'none' }) : null,
  s('path', { d: stroke }));
}

export const skillIcon = (id: string, cls?: string): SVGSVGElement => icon(skillIconName(id), cls);

/** Static markup (index.html) marks icon slots with data-icon="name"; filled once at startup. */
export function fillIcons(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    const name = el.dataset.icon ?? '';
    el.replaceWith(icon(isIconName(name) ? name : 'puzzle', el.dataset.iconClass ?? 'size-5'));
  }
}
