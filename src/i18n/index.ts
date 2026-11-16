import { readJson, writeJson } from '../storage';
import type { Lang } from '../tickets';
import { en } from './en';
import { vi } from './vi';

export type { Lang };
export type Params = Record<string, string | number>;
/** A function message gets the raw params (EN plurals); a string message gets {x} replaced, numbers in the UI locale. */
export type Msg = string | ((p: Params) => string);
export type Key = keyof typeof vi;

/** Device preference, not progress: never part of Save. */
export const PREFS_KEY = 'cargo-query/prefs';

const DICT: Record<Lang, Record<Key, Msg>> = { vi, en };

function initialLang(): Lang {
  const saved = readJson<{ lang?: unknown }>(PREFS_KEY)?.lang;
  if (saved === 'vi' || saved === 'en') return saved;
  const nav = typeof navigator === 'undefined' ? '' : navigator.language;
  return nav.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

interface NavLike { platform?: string; userAgentData?: { platform?: string } }

/** Apple keyboards: CodeMirror's `Mod` is Cmd there, and Alt is labelled Option. */
export function isMacPlatform(nav: NavLike | undefined): boolean {
  return /mac|iphone|ipad|ipod/i.test(nav?.userAgentData?.platform || nav?.platform || '');
}

export const keyLabels = (mac: boolean): { mod: string; alt: string } => (mac ? { mod: '⌘', alt: '⌥' } : { mod: 'Ctrl', alt: 'Alt' });

/** {mod} and {alt} are filled into every message, so shortcut labels follow the OS. */
const KEYS = keyLabels(isMacPlatform(typeof navigator === 'undefined' ? undefined : (navigator as NavLike)));

let lang: Lang | undefined;
export const getLang = (): Lang => (lang ??= initialLang());
export const locale = (): string => (getLang() === 'vi' ? 'vi-VN' : 'en-US');

export function t(key: Key, params: Params = {}): string {
  const msg = DICT[getLang()][key];
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
  document.documentElement.lang = getLang();
}

export function setLang(l: Lang): void {
  lang = l;
  writeJson(PREFS_KEY, { ...readJson<object>(PREFS_KEY), lang: l });
  applyStatic();
}
