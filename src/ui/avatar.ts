import { personOf, type Look } from '../people';
import { cx, deptOf } from '../theme';
import { s } from './svg';

const SKIN: Record<Look['skin'], string> = { light: '#f5d0b0', medium: '#e0a878', tan: '#c08050', deep: '#8a5a3c' };
const HAIR: Record<Look['hair'], string> = { black: '#1f1b18', brown: '#6b4226', grey: '#a3a3a3' };
const SIZE = { sm: 'size-7', md: 'size-10', lg: 'size-12' } as const;
const DEFAULT: Look = { skin: 'medium', hair: 'black', style: 'short', accessory: 'none' };
const INK = '#0c0a09'; // eyes and glasses: ≥ 3:1 on every skin tone, the deep one included (FIX-1, tests/theme.test.ts)

/** Long hair falls behind the head, so it is drawn before the face. */
const hairBack = (l: Look): SVGElement[] =>
  l.style === 'long' ? [s('path', { d: 'M13 20 Q12 7 24 7 Q36 7 35 20 L36 34 L12 34 Z', fill: HAIR[l.hair] })] : [];

function hairFront(l: Look): SVGElement[] {
  if (l.accessory === 'helmet') return []; // the hard hat covers it
  const c = HAIR[l.hair];
  const cap = s('path', { d: 'M14 19 Q14 8 24 8 Q34 8 34 19 Q30 13 24 13 Q18 13 14 19 Z', fill: c });
  if (l.style === 'bun') return [s('circle', { cx: 24, cy: 6.5, r: 4, fill: c }), cap];
  if (l.style === 'side') return [cap, s('path', { d: 'M14 17 Q19 9 33 12 Q25 12 17 19 Z', fill: c })];
  return [cap];
}

function accessory(l: Look): SVGElement[] {
  switch (l.accessory) {
    case 'helmet':
      return [s('path', { d: 'M12 18 Q12 5 24 5 Q36 5 36 18 Z', fill: '#facc15' }), s('rect', { x: 10, y: 17, width: 28, height: 3, rx: 1.5, fill: '#eab308' })];
    case 'glasses':
      return [
        s('circle', { cx: 20.5, cy: 20, r: 3, fill: 'none', stroke: INK, 'stroke-width': 1.2 }),
        s('circle', { cx: 27.5, cy: 20, r: 3, fill: 'none', stroke: INK, 'stroke-width': 1.2 }),
        s('line', { x1: 23.5, y1: 20, x2: 24.5, y2: 20, stroke: INK, 'stroke-width': 1.2 }),
      ];
    case 'headset':
      return [
        s('path', { d: 'M13.5 21 Q13.5 8.5 24 8.5 Q34.5 8.5 34.5 21', fill: 'none', stroke: '#111827', 'stroke-width': 2 }),
        s('rect', { x: 11.5, y: 18, width: 4, height: 6, rx: 1.5, fill: '#111827' }),
        s('path', { d: 'M14 24 Q16 29 21 28', fill: 'none', stroke: '#111827', 'stroke-width': 1.2 }),
      ];
    case 'tie':
      return [s('path', { d: 'M22.5 32 L25.5 32 L26.5 41 L24 44 L21.5 41 Z', fill: '#dc2626' })];
    case 'scarf':
      return [s('path', { d: 'M17 30 Q24 35 31 30 L31 33 Q24 38 17 33 Z', fill: '#f59e0b' })];
    case 'lanyard':
      return [
        s('path', { d: 'M19 31 L24 39 L29 31', fill: 'none', stroke: '#2563eb', 'stroke-width': 1.2 }),
        s('rect', { x: 21.5, y: 38, width: 5, height: 6, rx: 1, fill: '#f8fafc', stroke: '#2563eb', 'stroke-width': 0.8 }),
      ];
    default:
      return [];
  }
}

/**
 * Code-drawn portrait of a colleague from content/people.yml (L18 ★1): original art, no images, no library.
 * Decorative (aria-hidden): the name and role are always written next to it.
 */
export function avatar(from: { name: string; dept: string }, size: keyof typeof SIZE = 'sm'): SVGSVGElement {
  const look = personOf(from.name)?.look ?? DEFAULT;
  const { shirt, backdrop } = deptOf(from.dept); // decorative: the department chip next to the portrait carries the meaning
  const skin = SKIN[look.skin];
  return s('svg', { viewBox: '0 0 48 48', class: cx('shrink-0 rounded-full', SIZE[size]), 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { width: 48, height: 48, fill: backdrop }),
    ...hairBack(look),
    s('path', { d: 'M8 48 Q8 31 24 31 Q40 31 40 48 Z', fill: shirt }),
    s('rect', { x: 21, y: 26, width: 6, height: 6, fill: skin }),
    s('circle', { cx: 24, cy: 19, r: 10, fill: skin }),
    ...hairFront(look),
    s('circle', { cx: 20.5, cy: 20, r: 1.1, fill: INK }),
    s('circle', { cx: 27.5, cy: 20, r: 1.1, fill: INK }),
    s('path', { d: 'M21 24.5 Q24 27 27 24.5', fill: 'none', stroke: '#7c2d12', 'stroke-width': 1.1, 'stroke-linecap': 'round' }),
    ...accessory(look));
}
