import type * as EngineViz from './viz/engineViz';

/**
 * ENG-CORE (L221) + integration (L248): diagrams named by a lesson's `viz:` frontmatter, drawn by ENG-VIZ's lazy chunk
 * `engineViz` (src/engine/viz/engineViz.ts), reached only through import() here: it is no longer a second Vite entry.
 *
 * A name is resolved in that chunk (`resolveViz`: exact, the content alias table, the lesson engine's `pg-`/`mg-`/`dy-`
 * prefix, a unique longer name, the old camelCase alias). A name that resolves to nothing draws nothing (the slot stays
 * empty); tests/engineIntegration.test.ts lists every content name and its diagram.
 *
 * Contract (L238): `mount` draws into an empty `host` once and returns `{ steps, index, go, destroy }`. The page keeps one
 * host per lesson and remounts only when the language or theme changes (destroy first, `ctx.step` = the old index), so a
 * redraw never replays it. Under `ctx.reducedMotion` it shows each step's end frame only.
 */
export type VizDeps = EngineViz.Deps;
export type VizCtx = EngineViz.VizCtx;
export type VizMounted = EngineViz.VizMounted;
export type VizMount = EngineViz.VizMount;

let chunk: Promise<typeof EngineViz> | undefined;
const load = (): Promise<typeof EngineViz> => (chunk ??= import('./viz/engineViz').catch((e: unknown) => { chunk = undefined; throw e; }));

/** The mount of a lesson's diagram (`model`: catalog rows from a lab, e.g. heap_page_items for `pg-heap-page`), or undefined when the name has none. */
export async function vizMountFor(name: string, engine: 'pg' | 'mg' | 'dy' | 'ds' | 'sql', deps: VizDeps, model?: unknown): Promise<VizMount | undefined> {
  const m = await load();
  const real = m.resolveViz(name, engine);
  return real ? m.vizMount(real, deps, model) : undefined;
}
