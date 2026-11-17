import { cx } from '../theme';
import { s } from './svg';

/**
 * Every UI and skill icon (ui-ux-v3 §0, §e): path data on a 24 grid, 2px stroke in currentColor, no text, no emoji.
 * An entry is the stroked `d`, plus an optional second `d` that is also filled (translucent): the shaded part
 * of a Venn diagram, the picked column, the dots of DISTINCT.
 */
type Entry = string | readonly [stroke: string, fill: string];

const CIRCLE = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
/** Two r=6 circles at x=9 and x=15 meet at (12, 6.8) and (12, 17.2). */
const VENN = `${CIRCLE(9, 12, 6)} ${CIRCLE(15, 12, 6)}`;
const LENS = 'M12 6.8A6 6 0 0 1 12 17.2A6 6 0 0 1 12 6.8z';
const LEFT_MOON = 'M12 6.8A6 6 0 1 0 12 17.2A6 6 0 0 1 12 6.8z';
const CALENDAR = 'M4 5h16v15H4z M4 9h16 M8 3v4 M16 3v4';
const BUCKETS = 'M2.5 9v10h5V9 M9.5 9v10h5V9 M16.5 9v10h5V9';
const LENS_GLASS = `${CIRCLE(10, 10, 7)} M21 21l-6-6`;
const DOTS = `${CIRCLE(5, 7, 1.5)} ${CIRCLE(5, 17, 1.5)} ${CIRCLE(19, 12, 2)}`;
const BOOK = 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5';

const P = {
  // ---- interface ----
  anchor: `${CIRCLE(12, 5, 2)} M12 7v15 M5 12H2a10 10 0 0 0 20 0h-3 M8 10h8`,
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
  groupBy: `${BUCKETS} M5 15h.01 M12 13h.01 M12 16h.01 M19 14h.01 M19 17h.01`,
  having: `${BUCKETS} M5 15h.01 M12 13h.01 M12 16h.01 M17.5 11.5l3 4 M20.5 11.5l-3 4`,
  join: [VENN, LENS],
  multiJoin: `${CIRCLE(5, 12, 4)} ${CIRCLE(12, 12, 4)} ${CIRCLE(19, 12, 4)}`,
  leftJoin: [VENN, CIRCLE(9, 12, 6)],
  antiJoin: [VENN, LEFT_MOON],
  selfJoin: `${CIRCLE(10, 14, 6)} M13.5 9.2C15 4 22 4 20.5 10.5c-.6 2-2.3 3-4.3 3.3 M16.2 11.3l0 2.5 2.4.6`,
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
  fullJoin: [VENN, `${CIRCLE(9, 12, 6)} ${CIRCLE(15, 12, 6)}`],
  plan: `${LENS_GLASS} M10 7v3 M7 13l3-3 3 3`,
  bookIndex: 'M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z M18 7h3v3h-3 M18 12h3v3h-3',
} as const satisfies Record<string, Entry>;

export type IconName = keyof typeof P;
export const isIconName = (name: string): name is IconName => Object.hasOwn(P, name);

/** Skill id (content/skills.yml) → icon. tests/icons.test.ts checks every id in skills.yml is here. */
export const SKILL_ICON: Record<string, IconName> = {
  select: 'select', where: 'where', order_by: 'orderBy', limit: 'limit', aggregate: 'sigma', group_by: 'groupBy', having: 'having',
  join: 'join', multi_join: 'multiJoin', left_join: 'leftJoin', anti_join: 'antiJoin', self_join: 'selfJoin',
  date_math: 'dateMath', date_bucket: 'dateBucket', null_logic: 'emptySet', case_when: 'branch', conditional_agg: 'sigmaCheck',
  coalesce: 'fallback', string_fn: 'text', pattern_match: 'pattern', distinct: 'distinct', cast: 'cast',
  // Planned (curriculum.md): mapped now so a new skill gets its picture the day it is added.
  in_subquery: 'nested', scalar_subquery: 'nested', correlated_value: 'nested', exists: 'nestedCheck',
  cte: 'steps', multi_cte: 'steps', window_agg: 'window', window_lag: 'windowLag', window_rank: 'windowRank',
  union: 'stack', except: 'minus', full_join: 'fullJoin', distinct_on: 'distinct', explain_read: 'plan', index_design: 'bookIndex',
};
export const skillIconName = (id: string): IconName => SKILL_ICON[id] ?? 'puzzle';

/** Decorative: always next to visible text, or inside a control that has an aria-label. */
export function icon(name: IconName, cls = 'size-5'): SVGSVGElement {
  const e: Entry = P[name];
  const [stroke, fill] = typeof e === 'string' ? [e, undefined] : e;
  return s('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false', class: cx('shrink-0', cls),
  },
  fill ? s('path', { d: fill, fill: 'currentColor', 'fill-opacity': 0.35, stroke: 'none' }) : null,
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
