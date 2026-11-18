import { t } from '../i18n';
import { cx } from '../theme';
import { h } from './dom';
import { rig } from './mascots';
import { s } from './svg';

/**
 * L87: Boon (the teacher) points at a small board; Lily (the learner, at her growth stage) sits on the other side and listens.
 * One illustration (counts as one mascot for the "one per region" rule). Built from the sprite's parts (rig()) so only this scene's
 * pieces move (style.css `.teach-scene`): Boon's pointer taps, Lily nods and wags, only while on screen (IntersectionObserver);
 * reduced motion = still frame. Lily and Boon are buttons: Lily cheers for 600 ms, Boon taps twice and moves the board's
 * highlight to the next line. No reward, nothing saved.
 */
const fig = (vb: string, cls: string, ...kids: SVGElement[]) =>
  s('svg', { viewBox: vb, class: cx('overflow-visible', cls), 'aria-hidden': 'true', focusable: 'false' }, ...kids);
const BTN = 'shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** SQL-looking strokes only (no words): three lines, one highlighted. */
const LINES = [[[10, 14, 'var(--syn-keyword)'], [28, 30, 'var(--muted)']], [[10, 12, 'var(--syn-keyword)'], [26, 22, 'var(--syn-property)']], [[10, 16, 'var(--syn-keyword)'], [30, 8, 'var(--syn-number)'], [42, 14, 'var(--muted)']]] as const;

export function teachScene(size: 'md' | 'lg' = 'md'): HTMLElement {
  let line = 0;
  const marks = LINES.map((_, i) => s('rect', { x: 6, y: 9 + i * 15, width: 66, height: 11, rx: 3, fill: 'var(--accent-soft)', class: 'tb-line', opacity: i ? 0 : 1 }));
  const board = fig('0 0 80 72', size === 'lg' ? 'w-28' : 'w-24',
    s('rect', { x: 1, y: 1, width: 78, height: 54, rx: 6, fill: 'var(--panel)', stroke: 'var(--wood-dark)', 'stroke-width': 3 }),
    ...marks,
    ...LINES.flatMap((ln, i) => ln.map(([x, w, c]) => s('path', { d: `M${x} ${14.5 + i * 15} h${w}`, stroke: c, 'stroke-width': 4, 'stroke-linecap': 'round' }))),
    s('path', { d: 'M24 56 l-6 14 M56 56 l6 14', stroke: 'var(--wood-dark)', 'stroke-width': 3, 'stroke-linecap': 'round' }));

  // v6 M1: the same parts as mascot() (rig()); the scene's loops go on single parts: Lily's tail, her head parts, Boon's pointing wing.
  const listen = rig('lily', 'idle');
  const mark = (g: SVGGElement, cls: string, parts: string[]) => {
    for (const p of parts) g.querySelector(`[data-part="${p}"]`)?.classList.add(cls);
  };
  mark(listen, 'tb-tail', ['tail']);
  mark(listen, 'tb-nod', ['ear-l', 'ear-r', 'head', 'eyes-open', 'mouth-smile']);
  const cheer = rig('lily', 'cheer');
  cheer.style.display = 'none';
  const big = size === 'lg' ? 'size-24 sm:size-28' : 'size-20 sm:size-24';
  const lilySvg = fig('0 0 120 120', big, listen, cheer);
  lilySvg.dataset.mascot = 'lily'; // growth stage (style.css)
  const point = rig('boon', 'point');
  mark(point, 'tb-tap', ['arm-point']);
  const boonSvg = fig('0 0 120 120', big, point);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const lily = h('button', { type: 'button', class: BTN, 'aria-label': t('teach.lily'), onclick: () => {
    listen.style.display = 'none';
    cheer.style.display = '';
    clearTimeout(timer);
    timer = setTimeout(() => { listen.style.display = ''; cheer.style.display = 'none'; }, 600);
  } }, lilySvg);
  let tap: ReturnType<typeof setTimeout> | undefined;
  const scene = h('div', { class: 'teach-scene mx-auto flex w-fit items-end', role: 'group', 'aria-label': t('teach.scene') });
  const boon = h('button', { type: 'button', class: cx(BTN, '-ml-1'), 'aria-label': t('teach.boon'), onclick: () => {
    marks[line].setAttribute('opacity', '0');
    line = (line + 1) % LINES.length;
    marks[line].setAttribute('opacity', '1');
    scene.removeAttribute('data-tap');
    void scene.offsetWidth; // restart the tap
    scene.setAttribute('data-tap', '');
    clearTimeout(tap);
    tap = setTimeout(() => scene.removeAttribute('data-tap'), 600);
  } }, boonSvg);
  scene.append(lily, boon, h('div', { class: '-ml-3 mb-6 shrink-0' }, board));

  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) scene.setAttribute('data-live', '');
      else {
        scene.removeAttribute('data-live');
        if (!scene.isConnected) io.disconnect();
      }
    });
    io.observe(scene);
  }
  return scene;
}

/** Language switch: the buttons' names follow without rebuilding the scene (its animation and highlight stay). */
export function relabelScene(scene: HTMLElement): void {
  scene.setAttribute('aria-label', t('teach.scene'));
  const [lily, boon] = scene.querySelectorAll('button');
  lily?.setAttribute('aria-label', t('teach.lily'));
  boon?.setAttribute('aria-label', t('teach.boon'));
}
