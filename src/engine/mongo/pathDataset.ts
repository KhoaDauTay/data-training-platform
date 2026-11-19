// The MongoDB path dataset (content/engine/mongodb/path/dataset.json) → mingo collections. Pure: no import of mingo
// or of the JSON, so the caller decides how the file is loaded (lazy chunk in the app, fs in tests).
// The file keeps dates as ISO strings; `_meta.dateFields` names them per collection. A date-only string
// ("2026-05-01") becomes a Date at 00:00 UTC, a full timestamp keeps its time; null stays null, a missing field stays missing.
import type { Dataset } from './engineMongo';
import type { MongoDoc } from './types';

export interface PathMeta {
  dateFields: Record<string, string[]>;
  today?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

/** One ISO string → Date (UTC). Anything else is a broken dataset: throw, never guess. */
export function isoDate(s: string): Date {
  if (DATE_ONLY.test(s)) return new Date(`${s}T00:00:00Z`);
  if (TIMESTAMP.test(s)) return new Date(s);
  throw new Error(`Not an ISO date: ${JSON.stringify(s)}`);
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function pathDataset(json: unknown): Dataset & { meta: PathMeta } {
  if (!isObj(json) || !isObj(json._meta) || !isObj(json._meta.dateFields)) throw new Error('Path dataset: missing _meta.dateFields');
  const meta = json._meta as unknown as PathMeta;
  const collections: Record<string, MongoDoc[]> = {};
  const indexes: Record<string, MongoDoc[]> = {};
  for (const [name, docs] of Object.entries(json)) {
    if (name === '_meta') continue;
    if (!Array.isArray(docs)) throw new Error(`Path dataset: "${name}" is not an array`);
    const fields = meta.dateFields[name] ?? [];
    collections[name] = docs.map((d: MongoDoc) => {
      const out: MongoDoc = { ...d };
      for (const f of fields) {
        const v = out[f];
        if (typeof v === 'string') out[f] = isoDate(v);
        else if (v !== null && v !== undefined) throw new Error(`Path dataset: ${name}.${f} is not a string`);
      }
      return out;
    });
    indexes[name] = [{ v: 2, key: { _id: 1 }, name: '_id_' }];
  }
  return { collections, indexes, meta };
}
