import { readJson, writeJson } from '../storage';
import type { Lang } from '../tickets';
import { vi } from './vi';

export type { Lang };
export type Params = Record<string, string | number>;
/** A function message gets the raw params (EN plurals); a string message gets {x} replaced, numbers in the UI locale. */
export type Msg = string | ((p: Params) => string);
export type Key = keyof typeof vi;

/** Device preference, not progress: never part of Save. */
export const PREFS_KEY = 'cargo-query/prefs';

const DICT: Partial<Record<Lang, Record<Key, Msg>>> = { vi };

/**
 * The EN dictionary is a lazy chunk (Plan 5 T3: room in the main bundle, L40): main.ts and tests/setup.ts await
 * loadLang() before the first render, setLang() before a switch. Until it is in, t() reads VI.
 */
export async function loadLang(l: Lang = getLang()): Promise<void> {
  if (l === 'en' && !DICT.en) DICT.en = (await import('./en')).en;
}

/** L93: VI unless the player picked EN (prefs). The browser's language is not asked: an English-locale browser opened in EN. */
export const pickLang = (saved: unknown): Lang => (saved === 'en' ? 'en' : 'vi');
const initialLang = (): Lang => pickLang(readJson<{ lang?: unknown }>(PREFS_KEY)?.lang);

interface NavLike { platform?: string; userAgentData?: { platform?: string } }

/** Apple keyboards: CodeMirror's `Mod` is Cmd there, and Alt is labelled Option. */
export function isMacPlatform(nav: NavLike | undefined): boolean {
  return /mac|iphone|ipad|ipod/i.test(nav?.userAgentData?.platform || nav?.platform || '');
}

export const keyLabels = (mac: boolean): { mod: string; alt: string } => (mac ? { mod: '⌘', alt: '⌥' } : { mod: 'Ctrl', alt: 'Alt' });

/** {mod} and {alt} are filled into every message, so shortcut labels follow the OS. */
export const isMac = isMacPlatform(typeof navigator === 'undefined' ? undefined : (navigator as NavLike));
const KEYS = keyLabels(isMac);

let lang: Lang | undefined;
export const getLang = (): Lang => (lang ??= initialLang());
export const locale = (): string => (getLang() === 'vi' ? 'vi-VN' : 'en-US');

export function t(key: Key, params: Params = {}): string {
  const msg = (DICT[getLang()] ?? vi)[key];
  const p: Params = { ...KEYS, ...params };
  if (typeof msg === 'function') return msg(p);
  return msg.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = p[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale()) : v;
  });
}

/** Static markup: [data-i18n] → textContent, [data-i18n-aria] → aria-label. */
export function applyStatic(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = t(el.dataset.i18n as Key);
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria as Key));
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle as Key); // tooltip for icon-only buttons
  document.documentElement.lang = getLang();
}

/** The last language asked for: an EN chunk that arrives after the player picked VI again must not switch back. */
let wanted: Lang | undefined;
export async function setLang(l: Lang): Promise<void> {
  wanted = l;
  await loadLang(l);
  if (wanted !== l) return;
  lang = l;
  writeJson(PREFS_KEY, { ...readJson<object>(PREFS_KEY), lang: l });
  applyStatic();
}
