/**
 * L17 colours as whole Tailwind class names. Tailwind's scanner only sees complete literals, so never build a
 * class from pieces (bg- + colour + -500): pick from these maps and join whole names with cx().
 * WCAG AA (>= 4.5:1): chips are -800 on -100 (light) and -200 on -950 (dark); white text only on -700 or darker.
 */
import { PREFS_KEY, type Key } from './i18n';
import { readJson, writeJson, type KV } from './storage';
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
 * chip: label colours · shirt/backdrop: portrait colours (decorative, avatar.ts) · thanks: four thank-you lines, one per ticket by thanksKey (brief.ts).
 */
export interface Dept { chip: string; shirt: string; backdrop: string; thanks: readonly [Key, Key, Key, Key] }
export const DEPT: Record<string, Dept> = {
  Ops: { chip: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200', shirt: '#1d4ed8', backdrop: '#dbeafe', thanks: ['chat.thanksOps', 'chat.thanksOps2', 'chat.thanksOps3', 'chat.thanksOps4'] },
  Sales: { chip: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200', shirt: '#be185d', backdrop: '#fce7f3', thanks: ['chat.thanksSales', 'chat.thanksSales2', 'chat.thanksSales3', 'chat.thanksSales4'] },
  Finance: { chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', shirt: '#047857', backdrop: '#d1fae5', thanks: ['chat.thanksFinance', 'chat.thanksFinance2', 'chat.thanksFinance3', 'chat.thanksFinance4'] },
  Customs: { chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', shirt: '#b45309', backdrop: '#fef3c7', thanks: ['chat.thanksCustoms', 'chat.thanksCustoms2', 'chat.thanksCustoms3', 'chat.thanksCustoms4'] },
  CS: { chip: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200', shirt: '#0f766e', backdrop: '#ccfbf1', thanks: ['chat.thanksCS', 'chat.thanksCS2', 'chat.thanksCS3', 'chat.thanksCS4'] },
  Management: { chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200', shirt: '#5b21b6', backdrop: '#ede9fe', thanks: ['chat.thanksManagement', 'chat.thanksManagement2', 'chat.thanksManagement3', 'chat.thanksManagement4'] },
  Marketing: { chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200', shirt: '#c2410c', backdrop: '#ffedd5', thanks: ['chat.thanksMarketing', 'chat.thanksMarketing2', 'chat.thanksMarketing3', 'chat.thanksMarketing4'] },
  Category: { chip: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200', shirt: '#4d7c0f', backdrop: '#ecfccb', thanks: ['chat.thanksCategory', 'chat.thanksCategory2', 'chat.thanksCategory3', 'chat.thanksCategory4'] },
  IT: { chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200', shirt: '#0e7490', backdrop: '#cffafe', thanks: ['chat.thanksIT', 'chat.thanksIT2', 'chat.thanksIT3', 'chat.thanksIT4'] },
};
const NEUTRAL_DEPT: Dept = { chip: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', shirt: '#475569', backdrop: '#e2e8f0', thanks: ['chat.thanksOps', 'chat.thanksOps2', 'chat.thanksOps3', 'chat.thanksOps4'] };
export const deptOf = (dept: string): Dept => DEPT[dept] ?? NEUTRAL_DEPT;
/**
 * L1 (v12.0): one of the sender's department's four thank-you lines, fixed per ticket. Index = number + 2 × chapter
 * (D10-20 said chapter + number, which repeats from a 6-ticket chapter's last ticket to the next chapter's first);
 * consecutive tickets differ, also across chapters of 3 to 6 tickets. Other ids (lanes) use a string hash.
 */
export function thanksKey(dept: string, ticketId: string): Key {
  const m = /ch(\d+)-(\d+)$/.exec(ticketId);
  const i = m ? Number(m[2]) + 2 * Number(m[1]) : [...ticketId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
  return deptOf(dept).thanks[i % 4];
}
export const deptColor = (dept: string): string => deptOf(dept).chip;

export const CARD = 'rounded-(--r-card) bg-panel ring-1 ring-line';
export const PILL = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold';
export const DEPT_CHIP = 'rounded-md px-2 py-0.5 text-xs font-bold uppercase';
/** Teal call to action, a pill (v6 §2.1): --on-accent on --accent = 5.5:1 light, 8.9:1 dark. Hover never uses filter/transform: they make the
 * pill the containing block of a stretched row's ::after (L88), so the cover shrank under the pointer and the click missed (L93). */
export const BTN_GO = 'rounded-full border-0 bg-accent font-bold text-on-accent shadow-sm hover:bg-accent/90 hover:shadow-md';
/** Green Submit (L17): white on emerald-700 = 5.5:1 (the mockup's emerald-600 is 3.8:1). */
export const BTN_SUBMIT = 'ml-auto rounded-full border-0 bg-emerald-700 px-4 font-bold text-white shadow-sm hover:bg-emerald-800 disabled:bg-code disabled:text-disabled';
/** Controls on the top bar (V17: --panel, no gradient): --text on --code. */
export const TOP_BTN = 'rounded-full border-0 bg-code text-ink hover:bg-accent-soft';
/** Level-1 nav (v6 §3.1): --muted on --panel 6.2:1; the current page is a --accent-soft pill with --text, so not colour alone (bold too). */
export const NAV_LINK = 'rounded-full px-3 py-1.5 font-bold whitespace-nowrap text-muted no-underline hover:bg-code hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-ink';
/** "Done"/"current" status badge (colour only on small badges, L23): emerald-800 on -100, -200 on -950. */
export const DONE_PILL = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';

/** Clickable card (ui-ux-v3 §d): lift, shadow and an accent ring on hover and keyboard focus. Static cards stay CARD. */
export const CARD_ACTION = 'rounded-(--r-card) bg-panel ring-1 ring-line transition hover:-translate-y-0.5 hover:bg-panel hover:shadow-md hover:ring-2 hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Light / Dark / follow the OS (L42). Stored as `theme` in the device prefs (PREFS_KEY, next to `lang`), never in the Save.
 * The resolved value is always written to <html data-theme>; style.css keys its tokens and the `dark:` variant on it.
 * index.html repeats the read in an inline <head> script so the first paint already has the right theme.
 */
export type ThemePref = 'light' | 'dark' | 'system';
export const THEME_PREFS: readonly ThemePref[] = ['light', 'system', 'dark'];
export const THEME_EVENT = 'cq-theme';
const OS_DARK = '(prefers-color-scheme: dark)';

/** Anything but 'light' / 'dark' (missing, junk, unreadable storage) means follow the OS. */
export const parseThemePref = (v: unknown): ThemePref => (v === 'light' || v === 'dark' ? v : 'system');
export const getTheme = (storage?: KV): ThemePref => parseThemePref(readJson<{ theme?: unknown }>(PREFS_KEY, storage)?.theme);
export const resolveTheme = (pref: ThemePref, osDark: boolean): 'light' | 'dark' => (pref === 'system' ? (osDark ? 'dark' : 'light') : pref);

const osDark = (): boolean => typeof window !== 'undefined' && window.matchMedia(OS_DARK).matches;
/** True when the page currently shows the dark theme (Mermaid and anything else that bakes colours in). */
export const isDark = (): boolean => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';

function applyTheme(pref: ThemePref): void {
  const next = resolveTheme(pref, osDark());
  const root = document.documentElement;
  const changed = root.dataset.theme !== next;
  root.dataset.theme = next;
  if (changed) document.dispatchEvent(new Event(THEME_EVENT));
}

/** Merges into the prefs object, so `lang` survives (setLang merges the same way). */
export function setTheme(pref: ThemePref, storage?: KV): void {
  writeJson(PREFS_KEY, { ...readJson<object>(PREFS_KEY, storage), theme: pref }, storage);
  if (typeof document !== 'undefined') applyTheme(pref);
}

/** Once at startup: re-applies the stored choice and follows OS changes while the choice is 'system'. */
export function initTheme(): void {
  applyTheme(getTheme());
  window.matchMedia(OS_DARK).addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system');
  });
}
