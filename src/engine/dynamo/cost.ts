// v26 (DynamoDB đủ, L380–L381): capacity arithmetic from the AWS rules (research-nosql-v25-v26 §3.1). Pure, no DOM, no value
// import from main modules: the runner uses it for the labelled estimate of a refused write, the engineDynamo chunk for the
// "Partition / Chi phí" panel. A measured number always comes from the engine's ConsumedCapacity; these functions only
// explain it, or estimate what the in-browser engine does not report (and the page says so).
import type { AttributeValue, Item } from './types';

const utf8 = (s: string): number => new TextEncoder().encode(s).length;
/** A Number's size: 1 byte per two significant digits + 1 (leading and trailing zeros trimmed), as the AWS docs approximate it. */
const numBytes = (n: string): number => {
  const digits = n.replace(/^[-+]/, '').replace(/e.*$/i, '').replace('.', '').replace(/^0+/, '').replace(/0+$/, '');
  return Math.ceil(Math.max(digits.length, 1) / 2) + 1;
};
const binBytes = (b: string): number => Math.floor((b.replace(/=+$/, '').length * 3) / 4);

/** One value's size without its name (L2/08: List/Map 3 bytes + elements, each element +1; sets add no overhead). */
export function valueBytes(v: AttributeValue): number {
  const [t] = Object.keys(v);
  const x = v[t];
  switch (t) {
    case 'S': return utf8(String(x));
    case 'N': return numBytes(String(x));
    case 'B': return binBytes(String(x));
    case 'BOOL': case 'NULL': return 1;
    case 'SS': return (x as string[]).reduce((s, e) => s + utf8(e), 0);
    case 'NS': return (x as string[]).reduce((s, e) => s + numBytes(e), 0);
    case 'BS': return (x as string[]).reduce((s, e) => s + binBytes(e), 0);
    case 'L': return 3 + (x as AttributeValue[]).reduce((s, e) => s + valueBytes(e) + 1, 0);
    case 'M': return 3 + Object.entries(x as Record<string, AttributeValue>).reduce((s, [k, e]) => s + utf8(k) + valueBytes(e) + 1, 0);
    default: return 0;
  }
}
/** An item's size: every attribute's name + value (the 100-byte storage overhead is not part of capacity). */
export const itemBytes = (item: Item): number => Object.entries(item).reduce((s, [k, v]) => s + utf8(k) + valueBytes(v), 0);

/** Read factor per 4 KB: eventually consistent 0.5, strongly consistent 1, transactional 2. */
export type ReadMode = 'eventual' | 'strong' | 'tx';
export const READ_K: Record<ReadMode, number> = { eventual: 0.5, strong: 1, tx: 2 };
/** GetItem / one item: rounded up to 4 KB, times the factor. */
export const rcuOne = (bytes: number, mode: ReadMode): number => Math.max(1, Math.ceil(bytes / 4096)) * READ_K[mode];
/** Query / Scan: the sizes of every item read are added first, then rounded up once. */
export const rcuSum = (bytes: number[], mode: ReadMode): number => Math.max(1, Math.ceil(bytes.reduce((s, b) => s + b, 0) / 4096)) * READ_K[mode];
/** One write: rounded up to 1 KB (the larger of before and after for an overwrite or update), doubled in a transaction. */
export const wcuOne = (bytes: number, tx = false): number => Math.max(1, Math.ceil(bytes / 1024)) * (tx ? 2 : 1);

/** What the engine reported in ConsumedCapacity (ReturnConsumedCapacity INDEXES): the total and its split. */
export interface Capacity { total: number; read?: number; write?: number; table?: number; indexes?: Record<string, number> }
export function capacityOf(cc: unknown): Capacity | undefined {
  if (cc === undefined || cc === null) return undefined;
  const list = ([] as unknown[]).concat(cc) as Record<string, unknown>[];
  const n = (v: unknown): number => (typeof v === 'number' ? v : 0);
  const out: Capacity = { total: 0 };
  let read = 0;
  let write = 0;
  let table = 0;
  const indexes: Record<string, number> = {};
  for (const c of list) {
    out.total += n(c?.CapacityUnits);
    read += n(c?.ReadCapacityUnits);
    write += n(c?.WriteCapacityUnits);
    table += n((c?.Table as Record<string, unknown> | undefined)?.CapacityUnits);
    for (const key of ['GlobalSecondaryIndexes', 'LocalSecondaryIndexes']) {
      for (const [name, v] of Object.entries((c?.[key] ?? {}) as Record<string, Record<string, unknown>>)) indexes[name] = (indexes[name] ?? 0) + n(v?.CapacityUnits);
    }
  }
  if (read) out.read = read;
  if (write) out.write = write;
  if (table) out.table = table;
  if (Object.keys(indexes).length) out.indexes = indexes;
  return out;
}
