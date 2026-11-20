// The Mongo lab engine (lazy chunk `engineMongo`): parses mongosh text as data (parse.ts) and runs it on mingo over
// in-memory collections. Pure apart from the dataset imports, so Vitest runs it in Node without a worker.
import { aggregate, find, update, updateMany, updateOne } from 'mingo';
import { parseShell, type Call } from './parse';
import { MongoRunError, type MongoDoc, type MongoResult, type MongoValue } from './types';

/** Same cut as the SQL worker's MAX_ROWS_WORKER. */
export const MAX_DOCS = 50_000;

export type Collections = Record<string, MongoDoc[]>;
export interface Dataset {
  collections: Collections;
  /** createIndex metadata only: mingo has no indexes, a find is always a full scan. */
  indexes: Record<string, MongoDoc[]>;
}

/** Seed data per lab, one lazy JSON chunk each (`mongoSeed*`). Add a lab's data here. */
const DATASETS: Record<string, () => Promise<Dataset>> = {
  shop: () => import('./data/mongoSeedShop.json').then((m) => datasetOf(m.default)),
  // Integration (L248): the MongoDB path's shared dataset (content/engine/mongodb/path, dates as ISO strings + _meta).
  path: () => Promise.all([import('../../../content/engine/mongodb/path/dataset.json'), import('./pathDataset')]).then(([m, p]) => p.pathDataset(m.default)),
};
export const DATASET_IDS = Object.keys(DATASETS);

const loaded = new Map<string, Promise<Dataset>>();
/** Inline lab data (a lesson's `setup`: `{"collections": {…}}`, dates as `{"$date": …}`), parsed once per text. */
const INLINE_MAX = 32;

export function loadDataset(id: string): Promise<Dataset> {
  const inline = id.trimStart().startsWith('{');
  if (!inline && !Object.hasOwn(DATASETS, id)) return Promise.reject(new MongoRunError('unknown_dataset', `Unknown dataset "${id}"`));
  let p = loaded.get(id);
  if (!p) {
    if (inline && loaded.size > INLINE_MAX) loaded.clear();
    p = inline ? Promise.resolve().then(() => {
      let json: { collections?: unknown };
      try {
        json = JSON.parse(id) as { collections?: unknown };
      } catch (e) {
        throw new MongoRunError('bad_dataset', `Lab data is not JSON: ${(e as Error).message}`);
      }
      return datasetOf(json.collections ?? json);
    }) : DATASETS[id]();
    p.catch(() => loaded.delete(id)); // a failed chunk load is retried next time
    loaded.set(id, p);
  }
  return p;
}

/** JSON has no Date: seed files write `{ "$date": "<ISO>" }`, revived here (else date filters match nothing). */
export function revive(v: unknown): MongoValue {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === '$date' && typeof o.$date === 'string') return new Date(o.$date);
    const out: MongoDoc = {};
    for (const k of keys) out[k] = revive(o[k]);
    return out;
  }
  return v as MongoValue;
}

export function datasetOf(json: unknown): Dataset {
  const collections = revive(json) as unknown as Collections;
  const indexes: Record<string, MongoDoc[]> = {};
  for (const name of Object.keys(collections)) indexes[name] = [{ v: 2, key: { _id: 1 }, name: '_id_' }];
  return { collections, indexes };
}

const isDoc = (v: unknown): v is MongoDoc => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof RegExp);

function arg<T>(c: Call, i: number, ok: (v: unknown) => boolean, what: string, optional = false): T {
  const v = c.args[i];
  if (v === undefined && optional) return v as T;
  if (!ok(v)) throw new MongoRunError('bad_argument', `${c.name}(): argument ${i + 1} must be ${what}`);
  return v as T;
}
const argCount = (c: Call, max: number) => {
  if (c.args.length > max) throw new MongoRunError('bad_argument', `${c.name}() takes at most ${max} argument${max === 1 ? '' : 's'}`);
};
const options = (c: Call, i: number, allowed: string[]): MongoDoc => {
  const o = arg<MongoDoc | undefined>(c, i, isDoc, 'an options object', true) ?? {};
  const bad = Object.keys(o).find((k) => !allowed.includes(k));
  if (bad) throw new MongoRunError('bad_option', `${c.name}(): option "${bad}" is not supported here`);
  return o;
};
const count = (v: unknown, name: string): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new MongoRunError('bad_argument', `${name}() needs a whole number ≥ 0`);
  return v;
};

let idCounter = 0;
/** A fresh 24-hex ObjectId-like string (mongosh would make an ObjectId). Deterministic per run: no clock, no random. */
const newId = () => (++idCounter).toString(16).padStart(24, '0');

/** Equality fields of a filter, the starting document of an upsert. */
function upsertBase(filter: MongoDoc): MongoDoc {
  const doc: MongoDoc = {};
  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith('$') || k.includes('.')) continue;
    if (isDoc(v) && Object.keys(v).some((x) => x.startsWith('$'))) {
      if (Object.hasOwn(v, '$eq')) doc[k] = v.$eq;
      continue;
    }
    doc[k] = v;
  }
  return doc;
}

/** Runs one shell command against a dataset. Writes and createIndex touch copies only: the dataset stays pristine. */
export function runMongo(ds: Dataset, src: string): MongoResult {
  const start = performance.now();
  idCounter = 0; // per run: the Solution's and the player's identical insert get identical ids, so they grade equal
  const cmd = parseShell(src);
  const name = cmd.collection;
  const known = Object.hasOwn(ds.collections, name);
  // This run's own collections: each is a deep copy of the seed (structuredClone keeps Date/RegExp), made on first use,
  // so neither a write, a `$lookup` nor an `$out`/`$merge` can touch the cached dataset (ES2, L254).
  // ponytail: cheap at lab sizes (~100 docs, < 1 ms); copy-on-write if a lab ever holds 100k documents.
  const run = new Map<string, MongoDoc[]>();
  const coll = (n: string): MongoDoc[] => {
    let c = run.get(n);
    if (!c) run.set(n, (c = Object.hasOwn(ds.collections, n) ? structuredClone(ds.collections[n]) : []));
    return c;
  };
  const docs = coll(name);
  // scriptEnabled stays on: mingo's own $setWindowFields uses $function internally. Player text cannot reach script:
  // the parser refuses $where/$function/$accumulator and can only build literals, never a function.
  const opts = { scriptEnabled: true, collectionResolver: coll };
  const m = cmd.method;
  const out = (kind: MongoResult['kind'], list: MongoDoc[], extra: Partial<MongoResult> = {}): MongoResult => ({
    kind,
    collection: name,
    docs: list.length > MAX_DOCS ? list.slice(0, MAX_DOCS) : list,
    truncated: list.length > MAX_DOCS,
    ...(known ? {} : { unknownCollection: true }),
    ...extra,
    ms: performance.now() - start,
  });
  const filterArg = (i: number) => arg<MongoDoc | undefined>(m, i, isDoc, 'a filter object', true) ?? {};
  const scratch = () => docs; // already this run's own copy
  const lastChain = (n: string) => [...cmd.chain].reverse().find((c) => c.name === n);

  try {
    switch (m.name) {
      case 'find':
      case 'findOne': {
        argCount(m, 2);
        const proj = arg<MongoDoc | undefined>(m, 1, isDoc, 'a projection object', true);
        let cur = find(docs, filterArg(0), proj, opts);
        if (m.name === 'findOne') return out('docs', cur.limit(1).all() as MongoDoc[]);
        // mongosh applies sort, then skip, then limit, whatever order the chain is written in.
        const sort = lastChain('sort');
        const skip = lastChain('skip');
        const limit = lastChain('limit');
        if (sort) cur = cur.sort(arg<MongoDoc>(sort, 0, isDoc, 'a sort object like { field: 1 }') as Record<string, 1 | -1>);
        if (skip) cur = cur.skip(count(skip.args[0], 'skip'));
        if (limit && limit.args[0] !== 0) cur = cur.limit(count(limit.args[0], 'limit'));
        return out('docs', cur.all() as MongoDoc[]);
      }
      case 'countDocuments': {
        argCount(m, 2);
        const o = options(m, 1, ['limit', 'skip']);
        let n = find(docs, filterArg(0), undefined, opts).all().length;
        if (o.skip !== undefined) n = Math.max(0, n - count(o.skip, 'skip'));
        if (o.limit) n = Math.min(n, count(o.limit, 'limit'));
        return out('value', [], { value: n });
      }
      case 'distinct': {
        argCount(m, 2);
        const field = arg<string>(m, 0, (v) => typeof v === 'string' && v !== '', 'a field name in quotes');
        const [row] = aggregate(docs, [{ $match: filterArg(1) }, { $unwind: { path: `$${field}` } }, { $group: { _id: null, v: { $addToSet: `$${field}` } } }], opts) as { v: MongoValue[] }[];
        const values = (row?.v ?? []).slice().sort(compareValues);
        return out('value', [], { value: values });
      }
      case 'aggregate': {
        argCount(m, 2);
        const pipeline = arg<MongoDoc[]>(m, 0, (v) => Array.isArray(v) && v.every(isDoc), 'an array of stages like [{ $match: … }]');
        options(m, 1, ['allowDiskUse']);
        const at = pipeline.findIndex((st) => Object.hasOwn(st, '$out') || Object.hasOwn(st, '$merge'));
        if (at === -1) return out('docs', aggregate(docs, pipeline, opts) as MongoDoc[]);
        const stage = Object.keys(pipeline[at])[0];
        if (at !== pipeline.length - 1) throw new MongoRunError('bad_stage', `${stage} can only be the final stage in the pipeline`);
        // The head runs to a finished array first: mingo's $out/$merge push into the target while reading the source,
        // and the target may be the source itself.
        const head = aggregate(docs, pipeline.slice(0, -1), opts) as MongoDoc[];
        const spec = pipeline[at][stage];
        const into = stage === '$out' ? spec : isDoc(spec) ? spec.into : undefined;
        const target = typeof into === 'string' ? into : isDoc(into) && typeof into.coll === 'string' ? into.coll : '';
        if (!target) throw new MongoRunError('bad_argument', `${stage} needs a target collection name`);
        if (stage === '$out') run.set(target, structuredClone(head)); // MongoDB replaces the whole target collection
        else aggregate(head, [{ $merge: { ...(spec as MongoDoc), into: target } }], opts); // defaults: merge / insert
        return { ...out('write', run.get(target) ?? []), collection: target, unknownCollection: undefined };
      }
      case 'insertOne':
      case 'insertMany': {
        argCount(m, 2);
        const many = m.name === 'insertMany';
        const input = many
          ? arg<MongoDoc[]>(m, 0, (v) => Array.isArray(v) && v.length > 0 && v.every(isDoc), 'a non-empty array of documents')
          : [arg<MongoDoc>(m, 0, isDoc, 'a document')];
        options(m, 1, many ? ['ordered'] : []);
        const coll = scratch();
        const ids = new Set(coll.map((d) => JSON.stringify(d._id)));
        const insertedIds: MongoValue[] = [];
        for (const d of input) {
          const doc: MongoDoc = Object.hasOwn(d, '_id') ? structuredClone(d) : { _id: newId(), ...structuredClone(d) };
          const key = JSON.stringify(doc._id);
          if (ids.has(key)) throw new MongoRunError('duplicate_key', `E11000 duplicate key error collection: ${name} index: _id_ dup key: { _id: ${key} }`);
          ids.add(key);
          coll.push(doc);
          insertedIds.push(doc._id);
        }
        const ack: MongoDoc = many ? { acknowledged: true, insertedIds } : { acknowledged: true, insertedId: insertedIds[0] };
        return out('write', coll, { ack });
      }
      case 'updateOne':
      case 'updateMany': {
        argCount(m, 3);
        const filter = arg<MongoDoc>(m, 0, isDoc, 'a filter object');
        const upd = arg<MongoDoc | MongoDoc[]>(m, 1, (v) => isDoc(v) || (Array.isArray(v) && v.every(isDoc)), 'an update like { $set: … } or a pipeline [ … ]');
        if (isDoc(upd) && !Object.keys(upd).every((k) => k.startsWith('$')))
          throw new MongoRunError('bad_update', 'Update document requires atomic operators (use $set, $inc, …; replaceOne is not supported)');
        const o = options(m, 2, ['upsert', 'arrayFilters']);
        const config = { arrayFilters: o.arrayFilters as MongoDoc[] | undefined, cloneMode: 'none' as const };
        const coll = scratch();
        const fn = m.name === 'updateOne' ? updateOne : updateMany;
        const r = fn(coll, filter, upd as never, config, opts);
        const ack: MongoDoc = { acknowledged: true, matchedCount: r.matchedCount, modifiedCount: r.modifiedCount, upsertedCount: 0 };
        if (r.matchedCount === 0 && o.upsert === true) {
          let doc = upsertBase(filter);
          if (Array.isArray(upd)) doc = aggregate([doc], upd, opts)[0] as MongoDoc;
          else update(doc, upd as never, config.arrayFilters, undefined, { cloneMode: 'none', queryOptions: opts });
          if (!Object.hasOwn(doc, '_id')) doc = { _id: newId(), ...doc };
          coll.push(doc);
          Object.assign(ack, { upsertedCount: 1, upsertedId: doc._id });
        }
        return out('write', coll, { ack });
      }
      case 'deleteOne':
      case 'deleteMany': {
        argCount(m, 2);
        const filter = arg<MongoDoc>(m, 0, isDoc, 'a filter object');
        options(m, 1, []);
        const coll = scratch();
        const hit = new Set(find(coll, filter, undefined, opts).all());
        let deletedCount = 0;
        const kept = coll.filter((d) => {
          if (!hit.has(d) || (m.name === 'deleteOne' && deletedCount === 1)) return true;
          deletedCount++;
          return false;
        });
        return out('write', kept, { ack: { acknowledged: true, deletedCount } });
      }
      case 'createIndex': {
        argCount(m, 2);
        const keys = arg<MongoDoc>(m, 0, (v) => isDoc(v) && Object.keys(v).length > 0, 'an index key object like { city: 1 }');
        const o = options(m, 1, ['name', 'unique', 'sparse', 'partialFilterExpression', 'expireAfterSeconds', 'hidden']);
        for (const [k, v] of Object.entries(keys))
          if (!(v === 1 || v === -1 || v === 'text' || v === 'hashed' || v === '2dsphere'))
            throw new MongoRunError('bad_index', `Index key "${k}" must be 1, -1, "text", "hashed" or "2dsphere"`);
        const indexName = typeof o.name === 'string' ? o.name : Object.entries(keys).map(([k, v]) => `${k}_${v}`).join('_');
        const list = [...(ds.indexes[name] ?? [{ v: 2, key: { _id: 1 }, name: '_id_' }])];
        if (!list.some((ix) => ix.name === indexName)) list.push({ v: 2, key: keys, name: indexName, ...o });
        return out('index', list, { ack: { createdIndex: indexName } });
      }
      case 'getIndexes':
        argCount(m, 0);
        return out('index', ds.indexes[name] ?? []);
    }
  } catch (e) {
    if (e instanceof MongoRunError) throw e;
    throw new MongoRunError('mingo', (e as Error).message ?? String(e)); // mingo's own text, like Postgres' message
  }
  throw new MongoRunError('unknown_method', m.name);
}

/** MongoDB's BSON comparison order is complex; this is enough to make distinct's output stable. */
function compareValues(a: MongoValue, b: MongoValue): number {
  const rank = (v: MongoValue) => (v === null ? 0 : typeof v === 'number' ? 1 : typeof v === 'string' ? 2 : typeof v === 'boolean' ? 4 : v instanceof Date ? 5 : 3);
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  const sa = typeof a === 'string' ? a : JSON.stringify(a);
  const sb = typeof b === 'string' ? b : JSON.stringify(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** The worker's whole job: load the lab's data, run, return. */
export async function runOnDataset(dataset: string, src: string): Promise<MongoResult> {
  return runMongo(await loadDataset(dataset), src);
}
