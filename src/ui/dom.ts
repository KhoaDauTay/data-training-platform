import { locale } from '../i18n';

type Child = Node | string | null | undefined | false;
type Attr = string | boolean | ((e: Event) => void);

/** Tiny element builder. Text always goes through append(), never innerHTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Attr> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
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
export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Number in the current UI language with at most `digits` decimals: 25677 → "25.677" (vi) / "25,677" (en); 0.125 → "0,13" / "0.13". */
export const fmt = (n: number, digits = 2): string => n.toLocaleString(locale(), { maximumFractionDigits: digits });
