// ENG-VIZ (L235, L238): the diagram registry. Lives in the lazy `engineViz` chunk and imports nothing: main never imports it
// as a value (Plan 6 U3); a caller gets it from `await import('./engine/viz/engineViz')`, after init(deps). ENG-CORE's
// `src/engine/vizRegistry.ts` (its branch) fills its VIZ slot through engineViz's vizMount().

export type Lang = 'vi' | 'en';
/** One step of a diagram, the sentence the page shows and a screen reader hears. */
export interface VizStep { text: string }

/** A mounted diagram: step-through state, its accessible text and teardown. */
export interface VizHandle {
  readonly el: HTMLElement;
  /** Step count and the open step (0-based). */
  readonly count: number;
  readonly index: number;
  readonly steps: VizStep[];
  /** One sentence per step (= steps[i].text). */
  readonly texts: string[];
  /** Shows step i; `animate` tweens from the step on screen (never under reduced motion or before the gsap chunk). */
  go(i: number, animate?: boolean): void;
  /** Stops any running tween or Play and removes the diagram. */
  destroy(): void;
}

/**
 * Draws a diagram into `host`. `model` is the diagram's own input (e.g. `heap_page_items` rows from a lab); without one
 * it draws its built-in sample. `lang` defaults to the app language; `start` is the step shown first (kept across remounts).
 */
export type VizFactory = (host: HTMLElement, opts?: { model?: unknown; lang?: Lang; start?: number }) => VizHandle;

const REG = new Map<string, VizFactory>();
/** Names are `pg-…`, `mg-…`, `dy-…` (lowercase, hyphens; engine-ux-spec Q-V3). */
export const registerViz = (name: string, factory: VizFactory): void => void REG.set(name, factory);
/** The old camelCase name of a diagram (`pg-heap-page` → `heapPage`), kept as an alias for content written before L238. */
export const aliasOf = (name: string): string => name.slice(3).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/Esr$/, 'ESR');
/** A diagram by its name or its old alias. */
export const vizFor = (name: string): VizFactory | undefined => REG.get(name) ?? [...REG].find(([n]) => aliasOf(n) === name)?.[1];
export const vizNames = (): string[] => [...REG.keys()];
