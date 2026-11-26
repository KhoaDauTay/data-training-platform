import type { Deps } from './viz/engineVizCore';
import type { FigMounted, FigRef } from './viz/figure';

/**
 * v39 (F1/P4, L600, L605): a lesson's `figures: [{ name, at, variant?, step? }]` (Engine lessons and General full lessons).
 * `at` = a section id of that lesson; the page puts the figure at the end of that section. Parsed here for both parsers
 * (src/engine/content.ts, src/fullLesson.ts) and drawn through figureSlot(), shared by the two lazy page chunks
 * (engineFull, lessonPage); the builder itself is the lazy chunk `engineFigure` (src/engine/viz/figure.ts).
 */
export type { FigRef } from './viz/figure';

export function parseFigures(v: unknown, sections: readonly string[], fail: (msg: string) => never): FigRef[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) fail('figures phải là danh sách');
  return (v as Record<string, unknown>[]).map((f, i) => {
    const name = String(f?.name ?? '');
    const at = String(f?.at ?? '');
    if (!/^[a-z0-9-]+$/.test(name)) fail(`figures[${i}].name phải là [a-z0-9-]+`);
    if (!sections.includes(at)) fail(`figures[${i}].at "${at}": bài không có mục này (${sections.join(', ')})`);
    if (f.step !== undefined && !(Number.isInteger(f.step) && (f.step as number) >= 0)) fail(`figures[${i}].step phải là số nguyên ≥ 0`);
    return { name, at, ...(typeof f.variant === 'string' ? { variant: f.variant } : {}), ...(typeof f.step === 'number' ? { step: f.step } : {}) };
  });
}

/** One host per figure, kept across redraws (rerender never replays it); a language change remounts it on the same step. */
const slots = new Map<string, { key: string; host: HTMLElement; m?: FigMounted }>();
export function figureSlot(slot: string, ref: FigRef, deps: Deps, engine: string): HTMLElement {
  const lang = deps.getLang();
  const old = slots.get(slot);
  if (old?.key === lang) return old.host;
  const step = old?.m?.index;
  old?.m?.destroy();
  const e: { key: string; host: HTMLElement; m?: FigMounted } = { key: lang, host: deps.h('div', { class: 'min-w-0', 'data-fig-slot': ref.name }) };
  slots.set(slot, e);
  void import('./viz/figure').then((f) => f.mountFigure(e.host, ref, deps, engine, lang, step)).then((m) => {
    if (slots.get(slot) === e) e.m = m;
    else m?.destroy();
  }, () => { slots.delete(slot); }); // a failed chunk leaves the slot empty; the next draw tries again
  return e.host;
}
