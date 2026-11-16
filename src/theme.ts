/**
 * L17 colours as whole Tailwind class names. Tailwind's scanner only sees complete literals, so never build a
 * class from pieces (bg- + colour + -500): pick from these maps and join whole names with cx().
 * WCAG AA (>= 4.5:1): chips are -800 on -100 (light) and -200 on -950 (dark); white text only on -700 or darker.
 */
import type { Key } from './i18n';
export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');

export interface ChapterColor {
  /** Top stripe, progress fill, skill bars. */
  bar: string;
  /** "CHƯƠNG n" pill and skill icon tile. */
  chip: string;
  /** Outline of the chapter being played. */
  ring: string;
  /** Coloured text on the panel background (small labels only, L23). */
  text: string;
  /** SVG fill: this chapter's containers in the Tien Sa yard. */
  fill: string;
  /** SVG stroke: lanes on the route map opened by this chapter. */
  stroke: string;
  /** Same colour as `stroke`, as sRGB hex for places that take no Tailwind class (Mermaid `style`). */
  hex: string;
}

/** Chapters 1–7: L17. Chapters 8–12: curriculum.md §7.2 (teal, orange, cyan, lime, pink). */
export const CHAPTER_COLOR: Record<number, ChapterColor> = {
  1: { bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200', ring: 'ring-2 ring-sky-500', text: 'text-sky-800 dark:text-sky-300', fill: 'fill-sky-600', stroke: 'stroke-sky-600', hex: '#0284c7' },
  2: { bar: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200', ring: 'ring-2 ring-violet-500', text: 'text-violet-800 dark:text-violet-300', fill: 'fill-violet-600', stroke: 'stroke-violet-600', hex: '#7c3aed' },
  3: { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', ring: 'ring-2 ring-amber-500', text: 'text-amber-800 dark:text-amber-300', fill: 'fill-amber-600', stroke: 'stroke-amber-600', hex: '#d97706' },
  4: { bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200', ring: 'ring-2 ring-rose-500', text: 'text-rose-800 dark:text-rose-300', fill: 'fill-rose-600', stroke: 'stroke-rose-600', hex: '#e11d48' },
  5: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', ring: 'ring-2 ring-emerald-500', text: 'text-emerald-800 dark:text-emerald-300', fill: 'fill-emerald-600', stroke: 'stroke-emerald-600', hex: '#059669' },
  6: { bar: 'bg-indigo-500', chip: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200', ring: 'ring-2 ring-indigo-500', text: 'text-indigo-800 dark:text-indigo-300', fill: 'fill-indigo-600', stroke: 'stroke-indigo-600', hex: '#4f46e5' },
  7: { bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200', ring: 'ring-2 ring-fuchsia-500', text: 'text-fuchsia-800 dark:text-fuchsia-300', fill: 'fill-fuchsia-600', stroke: 'stroke-fuchsia-600', hex: '#c026d3' },
  8: { bar: 'bg-teal-500', chip: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200', ring: 'ring-2 ring-teal-500', text: 'text-teal-800 dark:text-teal-300', fill: 'fill-teal-600', stroke: 'stroke-teal-600', hex: '#0d9488' },
  9: { bar: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200', ring: 'ring-2 ring-orange-500', text: 'text-orange-800 dark:text-orange-300', fill: 'fill-orange-600', stroke: 'stroke-orange-600', hex: '#ea580c' },
  10: { bar: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200', ring: 'ring-2 ring-cyan-500', text: 'text-cyan-800 dark:text-cyan-300', fill: 'fill-cyan-600', stroke: 'stroke-cyan-600', hex: '#0891b2' },
  11: { bar: 'bg-lime-500', chip: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200', ring: 'ring-2 ring-lime-500', text: 'text-lime-800 dark:text-lime-300', fill: 'fill-lime-600', stroke: 'stroke-lime-600', hex: '#65a30d' },
  12: { bar: 'bg-pink-500', chip: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200', ring: 'ring-2 ring-pink-500', text: 'text-pink-800 dark:text-pink-300', fill: 'fill-pink-600', stroke: 'stroke-pink-600', hex: '#db2777' },
};
const NEUTRAL_CHAPTER: ChapterColor = {
  bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', ring: 'ring-2 ring-slate-500', text: 'text-slate-700 dark:text-slate-300', fill: 'fill-slate-500', stroke: 'stroke-slate-500', hex: '#64748b',
};
export const chapterColor = (n: number): ChapterColor => CHAPTER_COLOR[n] ?? NEUTRAL_CHAPTER;

/**
 * Everything keyed by department. Department names are never translated, so the key is the raw `from.dept`.
 * chip: label colours · shirt/backdrop: portrait colours (decorative, avatar.ts) · thanks: the sender's thank-you (brief.ts).
 */
export interface Dept { chip: string; shirt: string; backdrop: string; thanks: Key }
export const DEPT: Record<string, Dept> = {
  Ops: { chip: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200', shirt: '#1d4ed8', backdrop: '#dbeafe', thanks: 'chat.thanksOps' },
  Sales: { chip: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200', shirt: '#be185d', backdrop: '#fce7f3', thanks: 'chat.thanksSales' },
  Finance: { chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', shirt: '#047857', backdrop: '#d1fae5', thanks: 'chat.thanksFinance' },
  Customs: { chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', shirt: '#b45309', backdrop: '#fef3c7', thanks: 'chat.thanksCustoms' },
  CS: { chip: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200', shirt: '#0f766e', backdrop: '#ccfbf1', thanks: 'chat.thanksCS' },
  Management: { chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200', shirt: '#5b21b6', backdrop: '#ede9fe', thanks: 'chat.thanksManagement' },
  IT: { chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200', shirt: '#0e7490', backdrop: '#cffafe', thanks: 'chat.thanksIT' },
};
const NEUTRAL_DEPT: Dept = { chip: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', shirt: '#475569', backdrop: '#e2e8f0', thanks: 'chat.thanksOps' };
export const deptOf = (dept: string): Dept => DEPT[dept] ?? NEUTRAL_DEPT;
export const deptColor = (dept: string): string => deptOf(dept).chip;

export const CARD = 'rounded-2xl bg-panel ring-1 ring-line';
export const PILL = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold';
export const DEPT_CHIP = 'rounded-md px-2 py-0.5 text-xs font-bold uppercase';
/** Blue call to action: white on blue-700 = 6.7:1, on blue-600 (dark theme) = 5.2:1. */
export const BTN_GO = 'border-0 bg-blue-700 font-semibold text-white shadow-sm hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700';
/** Green Submit (L17): white on emerald-700 = 5.5:1 (the mockup's emerald-600 is 3.8:1). */
export const BTN_SUBMIT = 'ml-auto border-0 bg-emerald-700 px-4 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:bg-code disabled:text-disabled';
/** Controls on the gradient top bar: darkening keeps white text >= 4.5:1 at the cyan end. */
export const TOP_BTN = 'border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30';
/** Darkening overlays (like TOP_BTN): the nav wraps and can sit over the cyan end, where lightening drops white text under 4.5:1. */
export const NAV_LINK = 'rounded-lg px-3 py-1.5 text-white no-underline hover:bg-black/20 aria-[current=page]:bg-black/30 aria-[current=page]:font-semibold aria-[current=page]:ring-1 aria-[current=page]:ring-white/60';
/** "Done"/"current" status badge (colour only on small badges, L23): emerald-800 on -100, -200 on -950. */
export const DONE_PILL = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
