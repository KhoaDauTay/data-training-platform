import { readJson, writeJson } from '../storage';

export const LAYOUT_KEY = 'cargo-query/layout';
/** Percent: ticket column width, bottom panel height. */
interface Layout { col: number; row: number }
type Part = keyof Layout;

const DEFAULT: Layout = { col: 40, row: 40 };
const LIMITS: Record<Part, [number, number]> = { col: [25, 60], row: [20, 70] };
const clamp = (part: Part, v: number) => Math.min(LIMITS[part][1], Math.max(LIMITS[part][0], Math.round(v)));

/**
 * Two keyboard-operable separators for the ≥ 1024×700 app shell. CSS reads --col/--row from `shell`.
 * ←/→ (column) and ↑/↓ (panel) move 5%, Home/End jump to the limits, double-click resets.
 */
export function initLayout(shell: HTMLElement, handles: Record<Part, HTMLElement>): void {
  const saved = readJson<Partial<Layout>>(LAYOUT_KEY) ?? {};
  const layout: Layout = { col: clamp('col', saved.col ?? DEFAULT.col), row: clamp('row', saved.row ?? DEFAULT.row) };

  const set = (part: Part, v: number, save = true) => {
    layout[part] = clamp(part, v);
    shell.style.setProperty(`--${part}`, `${layout[part]}%`);
    handles[part].setAttribute('aria-valuenow', String(layout[part]));
    if (save) writeJson(LAYOUT_KEY, layout);
  };

  for (const part of ['col', 'row'] as const) {
    const el = handles[part];
    el.setAttribute('role', 'separator');
    el.setAttribute('aria-orientation', part === 'col' ? 'vertical' : 'horizontal');
    el.setAttribute('aria-valuemin', String(LIMITS[part][0]));
    el.setAttribute('aria-valuemax', String(LIMITS[part][1]));
    el.tabIndex = 0;
    el.addEventListener('keydown', (e) => {
      const keys: Record<string, number> = part === 'col'
        ? { ArrowLeft: layout.col - 5, ArrowRight: layout.col + 5, Home: LIMITS.col[0], End: LIMITS.col[1] }
        : { ArrowDown: layout.row - 5, ArrowUp: layout.row + 5, Home: LIMITS.row[0], End: LIMITS.row[1] };
      if (!(e.key in keys)) return;
      e.preventDefault();
      set(part, keys[e.key]);
    });
    el.addEventListener('dblclick', () => set(part, DEFAULT[part]));
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const r = shell.getBoundingClientRect();
        set(part, part === 'col' ? ((ev.clientX - r.left) / r.width) * 100 : ((r.bottom - ev.clientY) / r.height) * 100, false);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', () => {
        el.removeEventListener('pointermove', move);
        writeJson(LAYOUT_KEY, layout);
      }, { once: true });
    });
    set(part, layout[part], false);
  }
}
