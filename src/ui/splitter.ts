import { readJson, writeJson } from '../storage';

export const LAYOUT_KEY = 'cargo-query/layout';
/** Percent: ticket column width, bottom panel height. */
interface Layout { col: number; row: number }
type Part = keyof Layout;

// v21 U5/U10: 45 % (was 40): the editor now grows with its text from 4 lines (style.css), so the panel gets the room it gave up.
const DEFAULT: Layout = { col: 40, row: 45 };
/** v21 U5: a picture tab (chart, steps, plan, ER) needs this much of the shell; see growPanel. */
export const PICTURE_ROW = 55;
const LIMITS: Record<Part, [number, number]> = { col: [25, 60], row: [20, 70] };
const clamp = (part: Part, v: number) => Math.min(LIMITS[part][1], Math.max(LIMITS[part][0], Math.round(v)));

/** Stored sizes are user-editable: anything but a finite number falls back to the default, then is clamped. */
export function parseLayout(saved: unknown): Layout {
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};
  const num = (part: Part) => (typeof s[part] === 'number' && Number.isFinite(s[part]) ? (s[part] as number) : DEFAULT[part]);
  return { col: clamp('col', num('col')), row: clamp('row', num('row')) };
}

/**
 * Two keyboard-operable separators for the ≥ 1024×700 app shell. CSS reads --col/--row from `shell`.
 * ←/→ (column) and ↑/↓ (panel) move 5%, Home/End jump to the limits, double-click resets.
 */
let grow: ((row: number) => void) | undefined;
let grown = false;
/**
 * v21 U5: the first picture tab opened in a session raises the default bottom panel to `row` % (never a height the player stored,
 * never lowers it, not saved by itself; once: a panel the player drags back down afterwards stays where they put it).
 */
export function growPanel(row = PICTURE_ROW): void {
  if (grown || !grow) return;
  grown = true;
  grow(row);
}

export function initLayout(shell: HTMLElement, handles: Record<Part, HTMLElement>): void {
  const saved = readJson<unknown>(LAYOUT_KEY);
  const layout = parseLayout(saved);
  // v21 R21-U2: only the parts the player moved are stored (a column drag no longer stores a row), so a stored row = a height
  // the player set, in this session or before, and growPanel never overrides it.
  const stored: Partial<Layout> = {};
  if (saved && typeof saved === 'object') for (const part of ['col', 'row'] as const) if (Number.isFinite((saved as Record<string, unknown>)[part])) stored[part] = layout[part];
  grow = (row) => { if (stored.row === undefined && layout.row < row) set('row', row, false); };
  const keep = (part: Part) => {
    stored[part] = layout[part];
    writeJson(LAYOUT_KEY, stored);
  };

  const set = (part: Part, v: number, save = true) => {
    layout[part] = clamp(part, v);
    shell.style.setProperty(`--${part}`, `${layout[part]}%`);
    handles[part].setAttribute('aria-valuenow', String(layout[part]));
    if (save) keep(part);
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
        keep(part);
      }, { once: true });
    });
    set(part, layout[part], false);
  }
}
