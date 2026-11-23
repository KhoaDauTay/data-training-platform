// Integration (L248): ENG-CORE's LabRunner for DynamoDB lessons on ENG-DYNAMO's client. Lazy chunk (LAB_RUNNERS.dynamodb);
// only types from main modules. A lesson's `lab.setup` is `{ "tables": [CreateTable input], "items": { table: [plain JSON] } }`:
// the engine speaks typed DynamoDB JSON only (plain JSON is a SerializationException), so items are marshalled here.
import type { Lab, LabStep } from '../content';
import type { LabEnv, LabOutput, LabRunner, LabVerdict } from '../labs';
import { DynamoClient } from './client';
import { capacityOf, itemBytes, wcuOne } from './cost';
import { gradeItems, readCost } from './grade';
import { inputText, parseRequest } from './request';
import { DynamoError, DynamoInputError, LabFailedError, LabTimeoutError, type AttributeValue, type DynamoLab, type DynamoRequest, type DynamoResult, type Item } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

const TYPED: Record<string, (x: unknown) => boolean> = {
  S: (x) => typeof x === 'string', N: (x) => typeof x === 'string', B: (x) => typeof x === 'string', BOOL: (x) => typeof x === 'boolean',
  NULL: (x) => x === true, M: isObj, L: Array.isArray,
  SS: (x) => Array.isArray(x) && x.every((e) => typeof e === 'string'), NS: (x) => Array.isArray(x) && x.every((e) => typeof e === 'string'),
  BS: (x) => Array.isArray(x) && x.every((e) => typeof e === 'string'),
};
/** Already DynamoDB JSON: one type key with a value of that type's shape (`{ "N": "5" }`, `{ "SS": ["a"] }`). */
export const isTyped = (v: unknown): v is AttributeValue => {
  if (!isObj(v)) return false;
  const keys = Object.keys(v);
  return keys.length === 1 && Object.hasOwn(TYPED, keys[0]) && TYPED[keys[0]](v[keys[0]]);
};

/**
 * Plain JSON → DynamoDB JSON: string S, number N, boolean BOOL, null NULL, array L, object M (a set needs its own tag).
 * Idempotent: a value already typed (content may write `{ "SS": [...] }` or a whole typed item) is kept as it is.
 */
export function marshal(v: unknown): AttributeValue {
  if (isTyped(v)) return v;
  if (v === null || v === undefined) return { NULL: true };
  if (typeof v === 'string') return { S: v };
  if (typeof v === 'number') return { N: String(v) };
  if (typeof v === 'boolean') return { BOOL: v };
  if (Array.isArray(v)) return { L: v.map(marshal) };
  if (isObj(v)) return { M: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, marshal(x)])) };
  throw new Error(`cannot marshal ${typeof v}`);
}
/** DynamoDB JSON → plain values for the Result table (N as a number, sets as sorted arrays). */
export function unmarshal(av: AttributeValue): unknown {
  const [t] = Object.keys(av);
  const x = av[t];
  switch (t) {
    case 'S': case 'BOOL': case 'B': return x;
    case 'N': return Number(x);
    case 'NULL': return null;
    case 'SS': case 'BS': return [...(x as string[])].sort();
    case 'NS': return (x as string[]).map(Number).sort((a, b) => a - b);
    case 'L': return (x as AttributeValue[]).map(unmarshal);
    case 'M': return Object.fromEntries(Object.entries(x as Record<string, AttributeValue>).map(([k, y]) => [k, unmarshal(y)]));
    default: return av;
  }
}

/** A lesson's setup → the lab data (no setup: no tables, e.g. a CreateTable lab). Throws on broken JSON (content error). */
export function labOf(setup: string): DynamoLab {
  if (!setup.trim()) return { tables: [] };
  const j = JSON.parse(setup) as { tables?: Record<string, unknown>[]; items?: Record<string, Record<string, unknown>[]> };
  const items = Object.fromEntries(Object.entries(j.items ?? {}).map(([t, list]) =>
    [t, list.map((it) => Object.fromEntries(Object.entries(it).map(([k, v]) => [k, marshal(v)])) as Item)]));
  return { tables: j.tables ?? [], items };
}

const WRITE = new Set(['PutItem', 'UpdateItem', 'DeleteItem', 'BatchWriteItem', 'ExecuteTransaction']);
const statementsOf = (req: DynamoRequest): string[] => req.op === 'ExecuteStatement' ? [String(req.input.Statement ?? '')]
  : req.op === 'ExecuteTransaction' ? ((req.input.TransactStatements ?? []) as { Statement?: string }[]).map((s) => String(s.Statement ?? '')) : [];
export const isWrite = (req: DynamoRequest): boolean =>
  WRITE.has(req.op) || (req.op === 'ExecuteStatement' && !/^\s*select\b/i.test(statementsOf(req)[0]))
  || (req.op === 'ExecuteTransaction' && statementsOf(req).some((s) => !/^\s*select\b/i.test(s)));

/** The table a write changed (its Scan is what a write step grades). */
export function tableOf(req: DynamoRequest, lab: DynamoLab): string | undefined {
  const i = req.input as Record<string, unknown>;
  if (typeof i.TableName === 'string') return i.TableName;
  if (isObj(i.RequestItems)) return Object.keys(i.RequestItems)[0];
  for (const s of statementsOf(req)) {
    const m = /\b(?:INTO|UPDATE|FROM)\s+"?([\w.-]+)"?/i.exec(s);
    if (m) return m[1];
  }
  return lab.tables[0]?.TableName as string | undefined;
}

/** CreateTable is graded on the table it made: key schema, attribute types and index keys (order-free). */
function tableShape(r: DynamoResult): string {
  const d = ((r.raw as Record<string, unknown>)?.TableDescription ?? {}) as Record<string, unknown>;
  const keys = (v: unknown) => JSON.stringify(((v ?? []) as { AttributeName: string; KeyType: string }[]).map((k) => `${k.AttributeName}:${k.KeyType}`));
  const idx = (v: unknown) => ((v ?? []) as { IndexName: string; KeySchema: unknown; Projection?: { ProjectionType?: string } }[])
    .map((g) => `${g.IndexName}=${keys(g.KeySchema)}/${g.Projection?.ProjectionType ?? ''}`).sort().join(',');
  const attrs = ((d.AttributeDefinitions ?? []) as { AttributeName: string; AttributeType: string }[]).map((a) => `${a.AttributeName}:${a.AttributeType}`).sort().join(',');
  return [d.TableName, keys(d.KeySchema), attrs, idx(d.GlobalSecondaryIndexes), idx(d.LocalSecondaryIndexes)].join('|');
}

const TEXT = {
  vi: {
    timeout: 'Request chạy quá {s} giây nên đã dừng.', failed: 'Không khởi động được DynamoDB trong trình duyệt: {d}',
    scan: 'Đúng item, nhưng bằng `Scan`: đọc {got} item để trả {count}, lời giải chỉ đọc {sol}. Bước này có thanh chi phí: đọc bằng khóa (`Query` hoặc `GetItem`).',
    scanned: 'Đúng item, nhưng đọc {got} item (`ScannedCount`) trong khi lời giải chỉ đọc {sol}. Đưa điều kiện vào khóa thay vì vào bộ lọc.',
    rcu: 'Đúng item, nhưng tốn {got} RCU trong khi lời giải chỉ tốn {sol}. Câu này đọc nhiều hơn cần: đọc bằng khóa.',
    measured: ' (Đo bằng `ScannedCount` và `ConsumedCapacity` thật của bộ máy trong trình duyệt.)',
    noError: 'Request này chạy được. Bước này cần thấy DynamoDB từ chối nó với lỗi `{c}`.',
    otherError: 'DynamoDB báo lỗi `{got}`, nhưng bước này cần lỗi `{c}`.',
    estWrite: 'AWS vẫn tính phí cho lần ghi bị từ chối: khoảng {n} WCU (ước tính theo luật: cỡ item đang có làm tròn lên 1 KB, tối thiểu 1). Bộ máy trong trình duyệt không trả số này.',
    estTx: 'AWS vẫn tính phí cho transaction bị hủy: mỗi item đã thử tốn 2 × (cỡ làm tròn lên 1 KB) WCU, với {n} câu lệnh là ít nhất {w} WCU (ước tính theo luật). Bộ máy trong trình duyệt không trả số này.',
  },
  en: {
    timeout: 'The request ran longer than {s} seconds and was stopped.', failed: 'Could not start DynamoDB in the browser: {d}',
    scan: 'The right items, but with a `Scan`: it read {got} items to return {count}, while the solution reads only {sol}. This step has a cost bar: read through the key (`Query` or `GetItem`).',
    scanned: 'The right items, but it read {got} items (`ScannedCount`) while the solution reads only {sol}. Put the condition on the key instead of the filter.',
    rcu: 'The right items, but it used {got} RCU while the solution uses only {sol}. This request reads more than it needs: read through the key.',
    measured: ' (Measured with the real `ScannedCount` and `ConsumedCapacity` of the in-browser engine.)',
    noError: 'This request runs. This step wants to see DynamoDB refuse it with the error `{c}`.',
    otherError: 'DynamoDB answered with the error `{got}`, but this step wants `{c}`.',
    estWrite: 'AWS still charges for a refused write: about {n} WCU (estimated by the rule: the existing item\'s size rounded up to 1 KB, at least 1). The in-browser engine does not report this number.',
    estTx: 'AWS still charges for a cancelled transaction: each item it tried costs 2 × (size rounded up to 1 KB) WCU, so with {n} statements at least {w} WCU (estimated by the rule). The in-browser engine does not report this number.',
  },
};
const fill = (s: string, p: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => (p[k] === undefined ? m : String(p[k])));

/** Ops that report ConsumedCapacity: the lab always asks for the INDEXES split, so a player's NONE never hides the cost bar. */
const CAP_OPS = new Set(['GetItem', 'PutItem', 'UpdateItem', 'DeleteItem', 'Query', 'Scan', 'BatchGetItem', 'BatchWriteItem', 'ExecuteStatement', 'TransactGetItems', 'ExecuteTransaction']);
const withCapacity = (req: DynamoRequest): DynamoRequest =>
  (CAP_OPS.has(req.op) ? { op: req.op, input: { ...req.input, ReturnConsumedCapacity: 'INDEXES' } } : req);

/**
 * A step's cost bar, taken from the Solution's own run (route R5, L381): no Scan, no more items read than it (`ScannedCount`),
 * and for PartiQL (no `ScannedCount`: a hidden scan shows only in capacity) no more RCU, counted at the player's consistency so
 * `ConsistentRead: true` is never "slow". A GetItem Solution needs only `noScan`.
 */
export function barOf(want: DynamoResult, strong = false): { noScan: boolean; maxScanned?: number; maxRcu?: number } {
  const c = readCost(want);
  return { noScan: want.op !== 'Scan', ...(want.ScannedCount !== undefined ? { maxScanned: want.ScannedCount }
    : want.op === 'ExecuteStatement' && c.rcu !== undefined ? { maxRcu: c.rcu * (strong ? 2 : 1) } : {}) };
}

type KeyDef = { AttributeName: string; KeyType: string };
/** The partition key of the table (or of the index `IndexName`) a request reads, from the lab's CreateTable inputs. */
function pkOf(req: DynamoRequest, lab: DynamoLab): string | undefined {
  const name = tableOf(req, lab);
  const t = lab.tables.find((x) => x.TableName === name) as { KeySchema?: KeyDef[]; GlobalSecondaryIndexes?: { IndexName: string; KeySchema: KeyDef[] }[]; LocalSecondaryIndexes?: { IndexName: string; KeySchema: KeyDef[] }[] } | undefined;
  const idx = typeof req.input.IndexName === 'string' ? [...(t?.GlobalSecondaryIndexes ?? []), ...(t?.LocalSecondaryIndexes ?? [])].find((g) => g.IndexName === req.input.IndexName) : undefined;
  return (idx ?? t)?.KeySchema?.find((k) => k.KeyType === 'HASH')?.AttributeName;
}

export function dynamoRunner(env: Pick<LabEnv, 'lang'>, client = new DynamoClient(labOf)): LabRunner {
  const t = () => TEXT[env.lang()];
  const raw = async (lab: Lab, req: DynamoRequest): Promise<DynamoResult> => {
    const after = isWrite(req) ? tableOf(req, labOf(lab.setup ?? '')) : undefined;
    return client.request(req, { dataset: lab.setup ?? '', after: after ? { op: 'Scan', input: { TableName: after } } : undefined });
  };
  /** A refused conditional write or a cancelled transaction: the engine reports no capacity, AWS charges some (research §3.2). */
  const estimate = async (lab: Lab, req: DynamoRequest, e: DynamoError): Promise<string | undefined> => {
    if (e.type === 'TransactionCanceledException') {
      const n = ((req.input.TransactStatements ?? []) as unknown[]).length;
      return n ? fill(t().estTx, { n, w: 2 * n }) : undefined;
    }
    if (e.type !== 'ConditionalCheckFailedException' || !['PutItem', 'UpdateItem', 'DeleteItem'].includes(req.op)) return undefined;
    const data = labOf(lab.setup ?? '');
    const name = tableOf(req, data);
    const keys = ((data.tables.find((x) => x.TableName === name)?.KeySchema ?? []) as KeyDef[]).map((k) => k.AttributeName);
    const src = (req.input.Key ?? req.input.Item ?? {}) as Item;
    if (!name || !keys.length || !keys.every((k) => src[k])) return undefined;
    try {
      const old = await client.request({ op: 'GetItem', input: { TableName: name, Key: Object.fromEntries(keys.map((k) => [k, src[k]])) } }, { dataset: lab.setup ?? '' });
      return fill(t().estWrite, { n: old.Items[0] ? wcuOne(itemBytes(old.Items[0])) : 1 });
    } catch {
      return undefined;
    }
  };
  const exec = async (lab: Lab, code: string): Promise<{ req: DynamoRequest; r: DynamoResult }> => {
    let req: DynamoRequest | undefined;
    try {
      req = withCapacity(parseRequest(code));
      return { req, r: await raw(lab, req) };
    } catch (e) {
      if (e instanceof DynamoInputError) throw new Error(inputText(e, env.lang()), { cause: e });
      if (e instanceof LabTimeoutError) throw new Error(t().timeout.replace('{s}', String(e.timeoutMs / 1000)), { cause: e });
      if (e instanceof LabFailedError) throw new Error(t().failed.replace('{d}', e.detail), { cause: e });
      if (e instanceof DynamoError && req) {
        const est = await estimate(lab, req, e);
        if (est) throw new DynamoError(e.type, `${e.type}: ${e.message}\n${est}`);
      }
      throw e; // DynamoError: the engine's own message, shown unchanged like a Postgres error
    }
  };
  return {
    prepare: async (lab) => {
      await client.request({ op: 'DescribeTable', input: { TableName: '__none__' } }, { dataset: lab.setup ?? '' }).catch((e: unknown) => {
        if (e instanceof LabFailedError || e instanceof LabTimeoutError) throw e; // ResourceNotFound is the expected answer
      });
    },
    run: async (lab, code) => output(await exec(lab, code), labOf(lab.setup ?? '')),
    check: async (lab: Lab, step: LabStep, code: string): Promise<LabVerdict> => {
      if (step.error) {
        // "mong lỗi" (v26, like MongoDB's v25 steps): the step passes when DynamoDB refuses the request with this exception.
        let req: DynamoRequest;
        try {
          req = withCapacity(parseRequest(code));
        } catch (e) {
          return { ok: false, reason: 'error', message: e instanceof DynamoInputError ? inputText(e, env.lang()) : String(e) };
        }
        try {
          await raw(lab, req);
        } catch (e) {
          const got = e instanceof DynamoError ? e.type : undefined;
          return got === step.error ? { ok: true } : { ok: false, reason: 'wrong', message: fill(t().otherError, { got: got ?? '?', c: step.error }) };
        }
        return { ok: false, reason: 'wrong', message: fill(t().noError, { c: step.error }) };
      }
      const want = await exec(lab, step.solution);
      let got: { req: DynamoRequest; r: DynamoResult };
      try {
        got = await exec(lab, code);
      } catch (e) {
        return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
      }
      if (want.req.op === 'CreateTable' || got.req.op === 'CreateTable') {
        if (tableShape(want.r) !== tableShape(got.r)) return { ok: false, reason: 'wrong', why: 'table' };
      } else {
        const g = gradeItems(got.r, want.r, { ordered: step.ordered });
        if (!g.ok) return { ok: false, reason: 'wrong', why: g.why === 'count' ? 'count' : g.why === 'order' ? 'order' : 'items', params: g.why === 'count' ? { want: g.expected, got: g.actual } : undefined };
        // The cost bar comes before `expect`, so a Scan is refused by the bar and says why (route R5: right but slow = not passed).
        if (step.perf) {
          const w = gradeItems(got.r, want.r, { ordered: step.ordered, ...barOf(want.r, got.req.input.ConsistentRead === true && want.req.input.ConsistentRead !== true) });
          if (w.ok && w.weak) {
            const [c, s] = [readCost(got.r), readCost(want.r)];
            const p: Record<string, number> = w.weak === 'rcu' ? { got: c.rcu ?? 0, sol: s.rcu ?? 0 } : { got: c.scanned ?? c.count, sol: s.scanned ?? s.count, count: c.count };
            return { ok: false, reason: 'wrong', why: 'slow', message: fill(t()[w.weak], p) + t().measured };
          }
        }
      }
      for (const [k, n] of Object.entries(step.expect ?? {})) {
        // `CapacityUnits` / `ReadCapacityUnits` / `WriteCapacityUnits` (v26): the summed ConsumedCapacity the request must show.
        const cap = capacityOf(got.r.ConsumedCapacity);
        const v = k === 'CapacityUnits' ? cap?.total : k === 'ReadCapacityUnits' ? cap?.read : k === 'WriteCapacityUnits' ? cap?.write
          : (got.r as unknown as Record<string, unknown>)[k];
        if (v !== n) return { ok: false, reason: 'wrong', why: 'expect', params: { key: k, want: n, got: v === undefined ? '–' : String(v) } };
      }
      return { ok: true };
    },
  };
}

/** Items (or, after a write, the table it changed) as a table; the engine's numbers as LabMeta (v26: + the cost panel's data). */
function output({ req, r }: { req: DynamoRequest; r: DynamoResult }, lab: DynamoLab): LabOutput {
  const items = r.after ?? r.Items;
  const columns = [...new Set(items.flatMap((i) => Object.keys(i)))];
  const base = items.length || !r.raw || !isObj(r.raw) || 'Items' in r.raw || 'Item' in r.raw || 'Responses' in r.raw
    ? { columns, types: [], rows: items.map((i) => columns.map((c) => (i[c] ? cell(unmarshal(i[c])) : undefined))) }
    : { columns: ['response'], types: [], rows: [[JSON.stringify(r.raw, null, 1)]] };
  const capacity = capacityOf(r.ConsumedCapacity);
  const table = typeof req.input.TableName === 'string' ? req.input.TableName : undefined;
  const pk = pkOf(req, lab);
  const dynamo: NonNullable<LabOutput['meta']>['dynamo'] = {
    // bytes only when the items returned are whole (a projection or `Select` would make the rule's sum look cheaper than the read)
    op: req.op, write: isWrite(req), bytes: req.input.ProjectionExpression || req.input.Select || /^\s*select\s+(?!\*)/i.test(String(req.input.Statement ?? '')) ? [] : r.Items.map(itemBytes),
    mode: req.op === 'TransactGetItems' || req.op === 'ExecuteTransaction' ? 'tx' : req.input.ConsistentRead === true ? 'strong' : 'eventual',
    ...(capacity ? { capacity } : {}), ...(r.ScannedCount !== undefined ? { scanned: r.ScannedCount } : {}), ...(pk ? { pk } : {}),
    ...(typeof req.input.IndexName === 'string' ? { index: req.input.IndexName } : {}),
    ...(r.LastEvaluatedKey ? { lastKey: Object.fromEntries(Object.entries(r.LastEvaluatedKey).map(([k, v]) => [k, unmarshal(v)])) } : {}),
  };
  return { ...base, ms: r.ms, meta: { ...(table ? { table } : {}), ...(r.ScannedCount !== undefined ? { scannedCount: r.ScannedCount } : {}), count: r.Count,
    ...(capacity ? { consumedCapacity: capacity.total } : {}), dynamo } };
}
const cell = (v: unknown): unknown => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
