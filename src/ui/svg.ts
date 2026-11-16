const NS = 'http://www.w3.org/2000/svg';
type SvgChild = SVGElement | string | null | undefined | false;

/**
 * SVG twin of h(): SVG needs createElementNS (createElement makes unknown HTML elements that never render).
 * Values go through setAttribute/append, never markup. `false` drops an attribute or child, so it can be written inline.
 */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | false> = {},
  ...children: SvgChild[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false) el.setAttribute(k, String(v));
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}
