// ENG-VIZ (L235): entry of the lazy `engineViz` chunk (budget group engineViz). Named engineViz, not index, so its file
// never matches the main bundle's `index-*.js`. Usage: `const v = await import('./engine/viz/engineViz'); v.init(deps);
// v.vizFor('heapPage')?.(host, { model, lang })`.
import './pgStorage';
import './pgIndex';
import './pgPlan';
import { type Deps, init } from './engineVizCore';
import { type Lang, vizFor, type VizFactory } from './registry';

export { init } from './engineVizCore';
export type { Deps } from './engineVizCore';
export { registerViz, vizFor, vizNames } from './registry';

/** MongoDB and DynamoDB diagrams: their own lazy chunk (engineVizNosql), registered on first use. */
export const NOSQL_VIZ = ['bsonDoc', 'compoundIndexESR', 'aggregationPipeline', 'replicaSetOplog', 'shardChunks', 'partitionsHash', 'gsiProjection', 'singleTableItems'];
let nosql: Promise<unknown> | undefined;
/** vizFor() that also fetches the NoSQL chunk when the name is one of its diagrams (a failed load is retried next call). */
export async function loadViz(name: string): Promise<VizFactory | undefined> {
  if (!vizFor(name) && NOSQL_VIZ.includes(name)) {
    nosql ??= import('./engineVizNosql').catch((e: unknown) => { nosql = undefined; throw e; });
    await nosql;
  }
  return vizFor(name);
}
export type { Lang, VizFactory, VizHandle } from './registry';
export type { HeapModel, HeapRow, HotModel, MvccModel, VacuumModel, WalModel } from './pgStorage';
export type { BrinModel, BtreeModel, GinModel, GistModel } from './pgIndex';
export { LOCK_CONFLICTS, LOCK_MODES } from './pgPlan';
export type { LockModel, PlanVizNode } from './pgPlan';


/**
 * ENG-CORE's slot (src/engine/vizRegistry.ts on the ENG-CORE branch, L218: `VizMount = (host, ctx) => cleanup`). One line
 * per diagram fills it: `VIZ.heapPage = () => import('./viz/engineViz').then((m) => m.vizMount('heapPage', deps))`.
 * `ctx.reducedMotion` overrides the OS setting; a lab passes its rows through `model`.
 */
export async function vizMount(name: string, deps: Deps, model?: unknown): Promise<(host: HTMLElement, ctx: { lang: Lang; reducedMotion: boolean }) => () => void> {
  const f = await loadViz(name);
  return (host, ctx) => {
    init({ ...deps, reducedMotion: () => ctx.reducedMotion || deps.reducedMotion() });
    const v = f?.(host, { lang: ctx.lang, model });
    return () => v?.destroy();
  };
}