// ENG-VIZ (L235): entry of the lazy `engineViz` chunk (budget group engineViz). Named engineViz, not index, so its file
// never matches the main bundle's `index-*.js`. Usage: `const v = await import('./engine/viz/engineViz'); v.init(deps);
// v.vizFor('heapPage')?.(host, { model, lang })`.
import './pgStorage';
import './pgIndex';
import './pgPlan';

export { init } from './core';
export { registerViz, vizFor, vizNames } from './registry';
export type { Lang, VizFactory, VizHandle } from './registry';
export type { HeapModel, HeapRow, HotModel, MvccModel, VacuumModel, WalModel } from './pgStorage';
export type { BrinModel, BtreeModel, GinModel, GistModel } from './pgIndex';
export { LOCK_CONFLICTS, LOCK_MODES } from './pgPlan';
export type { LockModel, PlanVizNode } from './pgPlan';
