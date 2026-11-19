import { personOf, type Look } from '../people';
import { cx, deptOf } from '../theme';
import { s } from './svg';

/*
 * ui-ux-v7 X1 (D-U7, L164): colleague portraits in the mascot grammar: a big head with a 1.6 outline (--pp-line), a top-left
 * light and a lower shade laid over the flat colours (shared gradients #pp-shine / #pp-shade in index.html's sprite, so one
 * pair serves every skin and shirt), eyes with a highlight, cheeks at .45, six hair styles, larger accessories that still read
 * at 28 px. Skin, hair, outline and mouth are theme tokens in style.css (--pp-*); department colours stay DEPT (theme.ts).
 */
const SKIN: Record<Look['skin'], string> = { light: 'var(--pp-skin-light)', medium: 'var(--pp-skin-medium)', tan: 'var(--pp-skin-tan)', deep: 'var(--pp-skin-deep)' };
const HAIR: Record<Look['hair'], string> = { black: 'var(--pp-hair-black)', brown: 'var(--pp-hair-brown)', grey: 'var(--pp-hair-grey)' };
const SIZE = { sm: 'size-7', md: 'size-10', lg: 'size-12' } as const;
const DEFAULT: Look = { skin: 'medium', hair: 'black', style: 'short', accessory: 'none' };
const INK = '#0c0a09'; // eyes and glasses: ≥ 3:1 on every skin token in both themes (tests/theme.test.ts)
const LINE = { stroke: 'var(--pp-line)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' } as const;
const SHINE = 'url(#pp-shine)';

/** Hair that falls behind the head (long, ponytail, bun knot), drawn before the face. */
function hairBack(l: Look): SVGElement[] {
  const c = HAIR[l.hair];
  if (l.style === 'long') return [s('path', { d: 'M10.6 20 Q10 5.6 24 5.6 Q38 5.6 37.4 20 L38.6 35 Q33.5 37.4 30.5 34.6 L17.5 34.6 Q14.5 37.4 9.4 35 Z', fill: c, ...LINE })];
  if (l.style === 'ponytail') return [s('path', { d: 'M33 11.5 Q43.5 12.5 41.6 27.5 Q40.4 32.6 37.4 33.4 Q39.2 25 34.6 19.6 Z', fill: c, ...LINE })];
  if (l.style === 'bun') return [s('circle', { cx: 24, cy: 6.2, r: 4.6, fill: c, ...LINE })];
  return [];
}

/** The hair over the forehead; under a hard hat only the sides show. */
function hairFront(l: Look): SVGElement[] {
  const c = HAIR[l.hair];
  if (l.accessory === 'helmet') return [s('path', { d: 'M12.4 17 Q12.2 22 13.6 24.4 L15.4 24 Q14.8 20.6 15.4 17 Z M35.6 17 Q35.8 22 34.4 24.4 L32.6 24 Q33.2 20.6 32.6 17 Z', fill: c })];
  const shine = s('path', { d: 'M15.6 12.6 Q19.6 8.6 25.4 8.6', fill: 'none', stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.4 });
  switch (l.style) {
    case 'curly': // a crown of curls
      return [s('path', { d: 'M12.4 20.6 Q9.6 17 12.2 13.8 Q11.6 9.6 15.6 8.6 Q17.4 5 21.4 6.2 Q24 3.8 27 6 Q31 5 32.6 8.6 Q36.6 9.8 35.8 13.8 Q38.4 17 35.6 20.6 Q34.6 16.4 31.6 15.4 Q29 17 26.4 15.6 Q24 17.2 21.6 15.6 Q19 17 16.4 15.4 Q13.4 16.4 12.4 20.6 Z', fill: c, ...LINE }), shine];
    case 'side': // a side part sweeping across the forehead
      return [s('path', { d: 'M12.6 19.6 Q11.6 7 24 6.8 Q36.4 7 35.6 22 Q34.2 17.4 30.6 17.6 Q24.4 17.2 19.6 11.6 Q16.8 14.8 12.6 19.6 Z', fill: c, ...LINE }), shine];
    case 'long': // a centre part over the back hair
      return [s('path', { d: 'M12.4 21 Q11.6 7 24 7 Q36.4 7 35.6 21 Q34 13.6 24 11.4 Q14 13.6 12.4 21 Z', fill: c, ...LINE }), shine];
    case 'ponytail': // pulled back: a smooth cap, tied on the right
      return [s('path', { d: 'M12.6 19 Q12 7 24 7 Q36 7 35.4 19 Q32 11.6 24 11.6 Q16 11.6 12.6 19 Z', fill: c, ...LINE }), s('circle', { cx: 34.6, cy: 12.6, r: 1.8, fill: 'var(--pp-tie)' }), shine];
    default: // short and bun: a cap with a soft fringe
      return [s('path', { d: 'M12.6 19.4 Q11.8 7 24 7 Q36.2 7 35.4 19.4 Q33.4 13.2 28.4 12.6 Q25.6 14.8 20.2 13.8 Q15 14 12.6 19.4 Z', fill: c, ...LINE }), shine];
  }
}

/** Worn on the head or face (drawn after the face). */
function headGear(l: Look): SVGElement[] {
  switch (l.accessory) {
    case 'helmet':
      return [
        s('path', { d: 'M11.2 18 Q11.2 3.8 24 3.8 Q36.8 3.8 36.8 18 Z', fill: '#facc15', ...LINE }),
        s('path', { d: 'M24 4.4 V17.6', stroke: '#ca8a04', 'stroke-width': 1.6 }),
        s('path', { d: 'M15.6 9.6 Q18.6 6.4 22 6', fill: 'none', stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.6 }),
        s('rect', { x: 8.4, y: 16.6, width: 31.2, height: 3.6, rx: 1.8, fill: '#eab308', ...LINE }),
      ];
    case 'glasses':
      return [
        s('circle', { cx: 19.4, cy: 21, r: 3.7, fill: '#fff', 'fill-opacity': 0.25, stroke: INK, 'stroke-width': 1.7 }),
        s('circle', { cx: 28.6, cy: 21, r: 3.7, fill: '#fff', 'fill-opacity': 0.25, stroke: INK, 'stroke-width': 1.7 }),
        s('path', { d: 'M23.1 20.6 Q24 19.8 24.9 20.6 M15.7 20.4 H12.6 M32.3 20.4 H35.4', fill: 'none', stroke: INK, 'stroke-width': 1.7, 'stroke-linecap': 'round' }),
      ];
    case 'headset':
      return [
        s('path', { d: 'M11.6 22 Q11 6.2 24 6.2 Q37 6.2 36.4 22', fill: 'none', stroke: '#1f2937', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
        s('rect', { x: 9, y: 18.6, width: 5.4, height: 7.6, rx: 2.4, fill: '#374151', stroke: '#111827', 'stroke-width': 1.2 }),
        s('path', { d: 'M12 26 Q13.6 30.4 19.4 29.4', fill: 'none', stroke: '#1f2937', 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
        s('circle', { cx: 20, cy: 29.3, r: 1.4, fill: '#1f2937' }),
      ];
    default:
      return [];
  }
}

/** Worn on the shirt. */
function bodyGear(l: Look): SVGElement[] {
  switch (l.accessory) {
    case 'tie':
      return [
        s('path', { d: 'M18.4 33.6 L24 37.4 L21.6 40.6 Z M29.6 33.6 L24 37.4 L26.4 40.6 Z', fill: '#f8fafc', ...LINE, 'stroke-width': 1 }),
        s('path', { d: 'M22.4 37.2 L25.6 37.2 L26.6 45.6 L24 48.4 L21.4 45.6 Z', fill: '#dc2626', ...LINE, 'stroke-width': 1.2 }),
      ];
    case 'scarf':
      return [
        s('path', { d: 'M16 31 Q24 36.6 32 31 L32.6 35 Q24 40.6 15.4 35 Z', fill: '#f59e0b', ...LINE, 'stroke-width': 1.2 }),
        s('path', { d: 'M27 35.6 L30.6 44.4 L27.2 45 L25 36.4 Z', fill: '#d97706', ...LINE, 'stroke-width': 1.2 }),
      ];
    case 'lanyard':
      return [
        s('path', { d: 'M18.6 33.4 L24 41 L29.4 33.4', fill: 'none', stroke: '#2563eb', 'stroke-width': 1.6 }),
        s('rect', { x: 20.6, y: 40, width: 6.8, height: 7.6, rx: 1.2, fill: '#f8fafc', stroke: '#1d4ed8', 'stroke-width': 1.1 }),
        s('rect', { x: 22.2, y: 42.2, width: 3.6, height: 1.4, rx: 0.7, fill: '#2563eb' }),
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
  const blush = look.skin === 'deep' || look.skin === 'tan' ? 0.3 : 0.45; // rosy cheeks only show as a hint on darker skin
  const eye = (x: number) => [s('ellipse', { cx: x, cy: 21, rx: 1.55, ry: 1.95, fill: INK }), s('circle', { cx: x + 0.55, cy: 20.25, r: 0.7, fill: '#fff' })];
  return s('svg', { viewBox: '0 0 48 48', class: cx('shrink-0 rounded-full', SIZE[size]), 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { width: 48, height: 48, fill: backdrop }),
    ...hairBack(look),
    s('path', { d: 'M6.6 49 Q6.6 33.6 24 33.2 Q41.4 33.6 41.4 49 Z', fill: shirt, ...LINE }),
    s('path', { d: 'M6.6 49 Q6.6 33.6 24 33.2 Q41.4 33.6 41.4 49 Z', fill: 'url(#pp-shade)' }),
    s('path', { d: 'M20.4 27 L20.4 33.6 Q24 37.4 27.6 33.6 L27.6 27 Z', fill: skin, ...LINE, 'stroke-width': 1.2 }),
    s('path', { d: 'M20.4 29 Q24 31.6 27.6 29 L27.6 27 L20.4 27 Z', fill: '#000', opacity: 0.14 }),
    ...bodyGear(look),
    s('circle', { cx: 12.6, cy: 21.6, r: 2.6, fill: skin, ...LINE, 'stroke-width': 1.2 }),
    s('circle', { cx: 35.4, cy: 21.6, r: 2.6, fill: skin, ...LINE, 'stroke-width': 1.2 }),
    s('ellipse', { cx: 24, cy: 19.6, rx: 11.6, ry: 11.8, fill: skin, ...LINE }),
    s('ellipse', { cx: 24, cy: 19.6, rx: 11.6, ry: 11.8, fill: SHINE }),
    ...hairFront(look),
    s('ellipse', { cx: 16.6, cy: 24.8, rx: 2.1, ry: 1.25, fill: 'var(--cheek)', opacity: blush }),
    s('ellipse', { cx: 31.4, cy: 24.8, rx: 2.1, ry: 1.25, fill: 'var(--cheek)', opacity: blush }),
    ...eye(19.4), ...eye(28.6),
    s('path', { d: 'M21.6 26 Q24 28.2 26.4 26', fill: 'none', stroke: 'var(--pp-mouth)', 'stroke-width': 1.2, 'stroke-linecap': 'round' }),
    ...headGear(look));
}
