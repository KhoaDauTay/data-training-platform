// ENG-DYNAMO: drives @dynoxide/wasm-engine (DynamoDB emulator, Rust + SQLite → wasm) inside the current global scope:
// the lab worker in the browser (worker.ts), Node in tests. No DOM.
//
// The package ships its engine as a Worker script that sets `self.onmessage` and answers through `self.postMessage`.
// Instead of nesting a second worker, `hook()` loads that script into this scope with `postMessage` swapped for an
// internal router, then takes its handler off `onmessage`, so it never sees or answers the page's messages. Callers that
// talk to the page (worker.ts) must keep the real `postMessage` from before `DynamoEngine.open()`.
import {
  DynamoError, LabFailedError, type DynamoLab, type DynamoOp, type DynamoRequest, type DynamoResult, type Item,
} from './types';

/** The engine loads ~1 ms per item (spike §3.2): a lab stays small so a reset takes ≤ ~2 s. */
export const MAX_LAB_ITEMS = 2_000;
export const MAX_LAB_TABLES = 10;
/** dynoxide's message-envelope version (its CONTRACT_VERSION); `open` fails loudly on a mismatch. */
const CONTRACT_VERSION = 1;

type Call = (op: string, payload: unknown) => Promise<string>;
type Load = () => Promise<unknown>;
type Scope = { postMessage: (m: unknown) => void; onmessage: unknown };

/** Ops that change data: the next run re-seeds the lab first, so every run starts from pristine data. */
const WRITES = new Set<DynamoOp>(['PutItem', 'UpdateItem', 'DeleteItem', 'BatchWriteItem', 'CreateTable']);
/** Ops that report ConsumedCapacity when asked; a request that does not say gets 'TOTAL' (the Query-vs-Scan lesson). */
const CAPACITY = new Set<DynamoOp>(['GetItem', 'PutItem', 'UpdateItem', 'DeleteItem', 'Query', 'Scan', 'BatchGetItem', 'BatchWriteItem', 'ExecuteStatement']);

async function hook(load: Load): Promise<Call> {
  const g = globalThis as unknown as Scope;
  const waiting = new Map<string, { resolve: (s: string) => void; reject: (e: unknown) => void }>();
  g.postMessage = (m: unknown) => {
    const { id, ok, result, error } = (m ?? {}) as { id?: string; ok?: boolean; result?: string; error?: string };
    const w = id === undefined ? undefined : waiting.get(id);
    if (!w) return;
    waiting.delete(id!);
    if (ok) w.resolve(result!);
    else w.reject(error);
  };
  await load();
  const handler = g.onmessage;
  g.onmessage = null;
  if (typeof handler !== 'function') throw new LabFailedError('dynoxide worker did not install its handler');
  let n = 0;
  return (op, payload) =>
    new Promise((resolve, reject) => {
      const id = `dy${++n}`;
      waiting.set(id, { resolve, reject });
      void handler({ data: { id, op, payload, contractVersion: CONTRACT_VERSION } });
    });
}

/** The engine's error envelope (`{"__type":"com.amazon…#ValidationException","message":…}`) as a DynamoError. */
function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  try {
    const p = JSON.parse(String(e)) as { __type?: string; message?: string; Message?: string };
    return new DynamoError((p.__type ?? 'EngineError').split('#').pop()!, p.message ?? p.Message ?? '');
  } catch {
    return new DynamoError('EngineError', String(e));
  }
}

function normalize(op: DynamoOp, raw: Record<string, unknown>, ms: number): DynamoResult {
  const r = raw as { Items?: Item[]; Item?: Item; Responses?: Record<string, Item[]>; Attributes?: Item; Count?: number; ScannedCount?: number; ConsumedCapacity?: unknown; LastEvaluatedKey?: Item };
  const Items = r.Items ?? (r.Item ? [r.Item] : r.Responses ? Object.values(r.Responses).flat() : r.Attributes ? [r.Attributes] : []);
  const out: DynamoResult = { op, Items, Count: r.Count ?? Items.length, raw, ms };
  if (r.ScannedCount !== undefined) out.ScannedCount = r.ScannedCount;
  if (r.ConsumedCapacity !== undefined) out.ConsumedCapacity = r.ConsumedCapacity;
  if (r.LastEvaluatedKey !== undefined) out.LastEvaluatedKey = r.LastEvaluatedKey;
  return out;
}

const isWrite = (req: DynamoRequest) =>
  WRITES.has(req.op) || (req.op === 'ExecuteStatement' && !/^\s*select\b/i.test(String(req.input.Statement ?? '')));

/** Checks a lab's data before it reaches the engine (it comes from content, but a broken file must fail clearly). */
export function labProblem(lab: DynamoLab): string | undefined {
  if (!Array.isArray(lab?.tables) || lab.tables.length === 0 || lab.tables.length > MAX_LAB_TABLES) return `tables: 1..${MAX_LAB_TABLES}`;
  const items = Object.values(lab.items ?? {});
  if (!items.every(Array.isArray)) return 'items: { <table>: [item] }';
  const n = items.reduce((s, a) => s + a.length, 0);
  return n > MAX_LAB_ITEMS ? `items: ${n} > ${MAX_LAB_ITEMS}` : undefined;
}

let engine: Promise<Call> | undefined;

/** One emulator per global scope (the package's worker script runs once per scope). In-memory, never OPFS. */
export class DynamoEngine {
  private lab?: { dataset: string; lab: DynamoLab };
  private dirty = true;

  private constructor(private readonly call: Call) {}

  /** `load` evaluates the package's worker script in this scope (worker.ts: its asset URL; tests: the package). */
  static async open(load: Load): Promise<DynamoEngine> {
    engine ??= hook(load).then(async (call) => {
      await call('open', { name: 'lab', ephemeral: true });
      return call;
    });
    engine.catch(() => (engine = undefined));
    return new DynamoEngine(await engine.catch((e) => Promise.reject(toError(e))));
  }

  /** One raw engine call (also DeleteTable/ListTables, which players cannot send). */
  async exec(op: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      return JSON.parse(await this.call('execute', { op, request: input })) as Record<string, unknown>;
    } catch (e) {
      throw toError(e);
    }
  }

  /** Remembers the lab; it is loaded before the next run (at once when it differs from the loaded one). */
  async setup(dataset: string, lab: DynamoLab): Promise<void> {
    const bad = labProblem(lab);
    if (bad) throw new LabFailedError(`lab ${dataset}: ${bad}`);
    if (this.lab?.dataset === dataset && !this.dirty) return;
    this.lab = { dataset, lab };
    await this.seed();
  }

  /** Drops every table, creates the lab's, loads its items 25 per BatchWriteItem (the API limit). */
  private async seed(): Promise<void> {
    if (!this.lab) throw new LabFailedError('no lab set up');
    const { dataset, lab } = this.lab;
    try {
      for (const t of ((await this.exec('ListTables', {})).TableNames ?? []) as string[]) await this.exec('DeleteTable', { TableName: t });
      for (const t of lab.tables) await this.exec('CreateTable', t);
      for (const [table, items] of Object.entries(lab.items ?? {})) {
        for (let i = 0; i < items.length; i += 25) {
          let req: unknown = { [table]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) };
          for (let tries = 0; req && Object.keys(req).length; tries++) {
            if (tries === 5) throw new Error('UnprocessedItems after 5 tries');
            req = (await this.exec('BatchWriteItem', { RequestItems: req })).UnprocessedItems;
          }
        }
      }
    } catch (e) {
      this.lab = undefined;
      this.dirty = true;
      throw new LabFailedError(`lab ${dataset}: ${e instanceof Error ? `${e.name} ${e.message}` : String(e)}`);
    }
    this.dirty = false;
  }

  /** Runs one request on the pristine lab, then `after` (a read, e.g. a Scan that shows what a write did). */
  async run(req: DynamoRequest, after?: DynamoRequest): Promise<DynamoResult> {
    if (this.dirty) await this.seed();
    const input = CAPACITY.has(req.op) && req.input.ReturnConsumedCapacity === undefined ? { ...req.input, ReturnConsumedCapacity: 'TOTAL' } : req.input;
    this.dirty ||= isWrite(req) || (!!after && isWrite(after));
    const t = performance.now();
    const result = normalize(req.op, await this.exec(req.op, input), 0);
    result.ms = performance.now() - t;
    if (after) result.after = normalize(after.op, await this.exec(after.op, after.input), 0).Items;
    return result;
  }
}
