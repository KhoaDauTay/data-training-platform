// ENG-VIZ (L235, L238): entry of the lazy `engineViz` chunk (budget group engineViz). Named engineViz, not index, so its
// file never matches the main bundle's `index-*.js`. Usage: `const v = await import('./engine/viz/engineViz');
// const mount = await v.vizMount('pg-heap-page', deps); const d = mount(host, { lang, reducedMotion, step });`.
import './pgStorage';
import './pgIndex';
import './pgPlan';
import { type Deps, init } from './engineVizCore';
import { aliasOf, type Lang, vizFor, type VizFactory, vizNames, type VizStep } from './registry';

export { init } from './engineVizCore';
export type { Deps } from './engineVizCore';
export { aliasOf, registerViz, vizFor, vizNames } from './registry';
export type { Lang, VizFactory, VizHandle, VizStep } from './registry';
export type { HeapModel, HeapRow, HotModel, MvccModel, VacuumModel, WalModel } from './pgStorage';
export type { PruneModel, QueryPathModel, ReplicationModel, ReplicationSlot } from './engineVizPgFlow';
export type { BrinModel, BtreeModel, GinModel, GistModel } from './pgIndex';
export { LOCK_CONFLICTS, LOCK_MODES } from './pgPlan';
export type { LockModel } from './pgPlan';
export { planNodesOf, rawPlanOf, slimPlan } from './engineVizPlanJson';
export type { PlanVizNode, RawPlan } from './engineVizPlanJson';

/** MongoDB and DynamoDB diagrams: their own lazy chunk (engineVizNosql), registered on first use. */
export const NOSQL_VIZ = ['mg-bson-doc', 'mg-compound-index-esr', 'mg-aggregation-pipeline', 'mg-replica-set-oplog', 'mg-shard-chunks', 'dy-partitions-hash', 'dy-gsi-projection', 'dy-single-table-items'];
/** v23 PG-VIZ (L263): query path, partition pruning and replication, the lazy chunk engineVizPgFlow (budget engineVizPg). */
export const PG_FLOW_VIZ = ['pg-query-path', 'pg-partition-prune', 'pg-replication'];
/** v34 (L544) + v35 (L553): the multi-tenant diagrams, the lazy chunk engineVizTenant (budget engineVizTenant). */
export const TENANT_VIZ = ['pg-tenancy-models', 'pg-rls-path', 'pg-tenant-placement'];
const LAZY: [string[], () => Promise<unknown>][] = [[NOSQL_VIZ, () => import('./engineVizNosql')], [PG_FLOW_VIZ, () => import('./engineVizPgFlow')],
  [TENANT_VIZ, () => import('./engineVizTenant')]];
const lazy = new Map<string[], Promise<unknown>>();
/** vizFor() that also fetches the chunk holding the name (or old alias) when it is a lazy diagram; a failed load retries next call. */
export async function loadViz(name: string): Promise<VizFactory | undefined> {
  const hit = vizFor(name) ? undefined : LAZY.find(([names]) => names.some((n) => n === name || aliasOf(n) === name));
  if (hit) {
    const [names, load] = hit;
    if (!lazy.has(names)) lazy.set(names, load().catch((e: unknown) => { lazy.delete(names); throw e; }));
    await lazy.get(names);
  }
  return vizFor(name);
}

/**
 * Integration (L248): names lesson content uses for a diagram with a different name here. Bare names get the lesson
 * engine's prefix first (`btree` → `pg-btree`), and a prefix of exactly one diagram resolves to it (`pg-gin` →
 * `pg-gin-postings`), so this table holds only the names neither rule finds.
 */
export const VIZ_ALIAS: Record<string, string> = {
  'pg-btree-split': 'pg-btree',
  'pg-locks': 'pg-lock-matrix',
  'pg-vacuum-vm': 'pg-vacuum-flow',
  'mg-pipeline': 'mg-aggregation-pipeline',
  'mg-esr': 'mg-compound-index-esr',
  'mg-replica-election': 'mg-replica-set-oplog',
  'mg-sharding': 'mg-shard-chunks',
};
/**
 * The registered diagram a lesson's `viz:` name means, or undefined (draw nothing). `engine` = `pg` | `mg` | `dy` | `ds` |
 * `sql` (v39 P2, L606: `sql-`/`ds-` are prefixes too; a Design lesson's bare name also tries `pg-`, the diagrams it borrows).
 */
export function resolveViz(name: string, engine: string): string | undefined {
  const known = [...new Set([...vizNames(), ...NOSQL_VIZ, ...PG_FLOW_VIZ, ...TENANT_VIZ])];
  const bare = /^(pg|mg|dy|ds|st|ol|ts|sql)-/.test(name) ? [name] : [name, `${engine}-${name}`, ...(engine === 'ds' || engine === 'st' || engine === 'ol' || engine === 'ts' ? [`pg-${name}`] : [])];
  for (const c of bare.flatMap((x) => [x, VIZ_ALIAS[x]]).filter((x): x is string => !!x)) {
    if (known.includes(c)) return c;
    const longer = known.filter((k) => k.startsWith(`${c}-`));
    if (longer.length === 1) return longer[0];
  }
  return known.find((k) => aliasOf(k) === name);
}

export interface VizCtx { lang: Lang; reducedMotion: boolean; dark?: boolean; step?: number }
/** What a mount returns (engine-ux-spec Q-V1): the step sentences, go(i) and teardown. */
export interface VizMounted { steps: VizStep[]; readonly index: number; go(i: number, animate?: boolean): void; destroy(): void }
export type VizMount = (host: HTMLElement, ctx: VizCtx) => VizMounted;

/**
 * ENG-CORE's slot (src/engine/vizRegistry.ts): one line per diagram,
 * `VIZ['pg-heap-page'] = () => import('./viz/engineViz').then((m) => m.vizMount('pg-heap-page', deps))`. `ctx.step` is the
 * step to open (keep `index` before a theme/language remount); `ctx.reducedMotion` adds to the OS setting; a lab passes
 * its catalog rows as `model`. An unknown name mounts nothing and returns no steps.
 */
export async function vizMount(name: string, deps: Deps, model?: unknown): Promise<VizMount> {
  const f = await loadViz(name);
  return (host, ctx) => {
    init({ ...deps, reducedMotion: () => ctx.reducedMotion || deps.reducedMotion() });
    const v = f?.(host, { lang: ctx.lang, model, start: ctx.step });
    return { steps: v?.steps ?? [], get index() { return v?.index ?? 0; }, go: (i, a) => v?.go(i, a), destroy: () => v?.destroy() };
  };
}
