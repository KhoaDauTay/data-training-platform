// ENG-VIZ (L235): the diagram registry, the slot ENG-CORE reads. No ENG-CORE `src/engine/vizRegistry.ts` existed when this
// was written, so it lives here and imports nothing. It is part of the lazy `engineViz` chunk: main never imports it as a
// value (Plan 6 U3); a caller gets it from `await import('./engine/viz/engineViz')`, after init(deps).

export type Lang = 'vi' | 'en';

/** A mounted diagram: step-through state, its accessible text and teardown. */
export interface VizHandle {
  readonly el: HTMLElement;
  /** Step count and the open step (0-based). */
  readonly count: number;
  readonly index: number;
  /** One sentence per step, the text a screen reader hears (also the visible caption). */
  readonly texts: string[];
  /** Shows step i; `animate` tweens from the step on screen (never under reduced motion or before the gsap chunk). */
  go(i: number, animate?: boolean): void;
  /** Stops any running tween or Play and removes the diagram. */
  destroy(): void;
}

/**
 * Draws a diagram into `host`. `model` is the diagram's own input (e.g. `heap_page_items` rows from a lab); without one
 * it draws its built-in sample. `lang` defaults to the app language.
 */
export type VizFactory = (host: HTMLElement, opts?: { model?: unknown; lang?: Lang; start?: number }) => VizHandle;

const REG = new Map<string, VizFactory>();
export const registerViz = (name: string, factory: VizFactory): void => void REG.set(name, factory);
export const vizFor = (name: string): VizFactory | undefined => REG.get(name);
export const vizNames = (): string[] => [...REG.keys()];
