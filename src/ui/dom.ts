import { locale } from '../i18n';
import { s } from './svg';

type Child = Node | string | null | undefined | false;
type Attr = string | boolean | ((e: Event) => void);

/** Tiny element builder. Text always goes through append(), never innerHTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Attr> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if ((tag === 'code' || tag === 'pre') && !('lang' in attrs)) el.lang = 'en'; // v12.0 A5: SQL and table names read in English
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  el.append(...nodes(...children));
  return el;
}

/** Drops null/undefined/false so conditional children can be written inline. */
export const nodes = (...children: Child[]): (Node | string)[] =>
  children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false);

/** Ticket text: blank line = new paragraph, `backticks` = inline code. Nothing else is interpreted. */
export function richText(text: string): HTMLElement {
  const wrap = h('div', { class: 'rich' });
  for (const para of text.trim().split(/\n\s*\n/)) {
    const p = h('p');
    for (const part of para.split(/(`[^`]+`)/)) {
      if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) p.append(h('code', {}, part.slice(1, -1)));
      else p.append(part.replace(/\s*\n\s*/g, ' '));
    }
    wrap.append(p);
  }
  return wrap;
}

export const byId = (id: string): HTMLElement => document.getElementById(id)!;

/** `<animateMotion>` and JS tweens ignore the CSS reduced-motion rule in style.css, so they check this (flowView, stage). */
/** v12.0 A1: one polite sentence for screen readers (#announce is aria-live). Cleared first so the same sentence twice is read twice. */
export function announce(text: string): void {
  const el = typeof document === 'undefined' ? null : document.getElementById('announce');
  if (!el) return; // test harnesses without the page (tests/workRace.test.ts)
  el.textContent = '';
  setTimeout(() => {
    el.textContent = text;
  }, 50);
}

/** ui-ux-v5 A4: the shared loader (sprite symbol #cq-load), put before an existing waiting text. Decorative. */
export const loader = (): SVGSVGElement =>
  s('svg', { class: 'inline-block size-6 shrink-0 align-middle', 'aria-hidden': 'true', focusable: 'false' }, s('use', { href: '#cq-load' }));

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Number in the current UI language with at most `digits` decimals: 25677 → "25.677" (vi) / "25,677" (en); 0.125 → "0,13" / "0.13". */
export const fmt = (n: number, digits = 2): string => n.toLocaleString(locale(), { maximumFractionDigits: digits });

type Box = { left: number; top: number; right: number; bottom: number };
/** L140: a point outside the dialog's box. Clicks on the dialog's own padding or scrollbar land on the dialog too, inside its box. */
export const outsideBox = (r: Box, x: number, y: number): boolean => x < r.left || x > r.right || y < r.top || y > r.bottom;

/**
 * L140 (Track H): every modal <dialog> closes on a click on its backdrop, through the Esc path (a cancelable `cancel`, then
 * close()), so each dialog's own cancel/close handlers run and focus returns as with Esc. Both the press and the release must
 * be on the backdrop: a drag or a text selection that starts inside and ends outside never closes. The non-modal notebook is
 * left out on purpose (it stays open while the player types in the editor); popovers light-dismiss natively. Once, at startup.
 */
export function initLightDismiss(): void {
  const backdropOf = (e: MouseEvent): HTMLDialogElement | null => {
    const d = e.target;
    return d instanceof HTMLDialogElement && d.matches(':modal') && outsideBox(d.getBoundingClientRect(), e.clientX, e.clientY) ? d : null;
  };
  let down: HTMLDialogElement | null = null;
  document.addEventListener('pointerdown', (e) => (down = backdropOf(e)), true);
  document.addEventListener('click', (e) => {
    const d = backdropOf(e);
    const ok = d && d === down;
    down = null;
    if (!ok) return;
    if (d.dispatchEvent(new Event('cancel', { cancelable: true }))) d.close();
  }, true);
}
