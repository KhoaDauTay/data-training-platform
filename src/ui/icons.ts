import { cx } from '../theme';
import { h } from './dom';
import { s } from './svg';
import { ICON_DATA, type IconPart } from './iconData';

/**
 * Every UI and skill icon (ui-ux-v3 §0, §e; ui-ux-v6 I1): Phosphor duotone paths on a 256 grid, generated into
 * iconData.ts by scripts/icons.mjs (never edit it by hand), in currentColor, no text, no emoji. Icons Phosphor lacks
 * (the JOIN family, GROUP BY/HAVING, DISTINCT, check) are drawn in the same grammar in scripts/icon-custom.json.
 */
const P = ICON_DATA;
type Entry = readonly IconPart[];

export type IconName = keyof typeof P;
/** Path data of one icon, for tests/icons.test.ts (no two skill icons may draw the same thing). */
export const iconPaths = (name: IconName): Entry => P[name];
export const isIconName = (name: string): name is IconName => Object.hasOwn(P, name);
export const ICON_NAMES = Object.keys(P) as IconName[];

/**
 * v12.0 U2: one icon per navigation destination (rail, drawer, bottom bar, top nav). Every registerNav reads this table;
 * tests/icons.test.ts keeps the values unique and apart from the domain icons (DOMAINS), which only name a domain.
 */
export const NAV_ICON = {
  home: 'home', learn: 'route', practice: 'repeat', overview: 'overview', play: 'code', sandbox: 'flask', data: 'database', dashboard: 'chart', map: 'map', me: 'user', engine: 'engine',
} as const satisfies Record<string, IconName>;

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
  const parts: Entry = P[name];
  return s('svg', { viewBox: '0 0 256 256', fill: 'currentColor', 'aria-hidden': 'true', focusable: 'false', class: cx('shrink-0', cls) },
    ...parts.map((p) => p.s
      // pathLength 1: CSS draws a stroke in without knowing its length (.cq-ck, style.css).
      ? s('path', { d: p.d, fill: 'none', stroke: 'currentColor', 'stroke-width': 16, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 })
      : s('path', p.o === undefined ? { d: p.d } : { d: p.d, opacity: p.o })));
}

export const skillIcon = (id: string, cls?: string): SVGSVGElement => icon(skillIconName(id), cls);

/** Static markup (index.html) marks icon slots with data-icon="name"; filled once at startup. */
export function fillIcons(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    const name = el.dataset.icon ?? '';
    el.replaceWith(icon(isIconName(name) ? name : 'puzzle', el.dataset.iconClass ?? 'size-5'));
  }
}

/** One label style for the parts of a brief or a quick lesson (Task, Expected result, Example…): icon + small caps above its body, so the parts read apart (e7dd585, L140). */
export const partHead = (name: IconName, label: string, tag: 'h3' | 'h4' = 'h3'): HTMLElement =>
  h(tag, { class: 'm-0 mb-2 flex items-center gap-1.5 text-caption font-bold uppercase tracking-wide text-muted' }, icon(name, 'size-4'), label);

/** ui-ux-v7 I1 (L148): each domain's identity colour as whole literal classes (tokens --dom-*, both themes). `general` = SQL only (accent). */
const DOMAIN_TINT = {
  logistics: 'bg-dom-logistics-soft text-dom-logistics ring-dom-logistics/40',
  ecommerce: 'bg-dom-ecommerce-soft text-dom-ecommerce ring-dom-ecommerce/40',
  finance: 'bg-dom-finance-soft text-dom-finance ring-dom-finance/40',
  general: 'bg-accent-soft text-accent ring-accent/40',
} as const;
/** A domain's badge: its Phosphor icon on a round tile in the domain colour. Decorative (the domain name is always beside it). */
export const domainBadge = (d: keyof typeof DOMAIN_TINT, name: IconName, size: 'md' | 'lg' = 'md'): HTMLElement =>
  h('span', { class: cx('grid shrink-0 place-items-center rounded-full ring-1', DOMAIN_TINT[d], size === 'lg' ? 'size-14' : 'size-10'), 'aria-hidden': 'true' },
    icon(name, size === 'lg' ? 'size-8' : 'size-6'));
