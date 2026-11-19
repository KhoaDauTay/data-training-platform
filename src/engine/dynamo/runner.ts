// Integration (L247): ENG-CORE's LabRunner for DynamoDB lessons on ENG-DYNAMO's client. Lazy chunk (LAB_RUNNERS.dynamodb);
// only types from main modules. A lesson's `lab.setup` is `{ "tables": [CreateTable input], "items": { table: [plain JSON] } }`:
// the engine speaks typed DynamoDB JSON only (plain JSON is a SerializationException), so items are marshalled here.
import type { Lab, LabStep } from '../content';
import type { LabEnv, LabOutput, LabRunner, LabVerdict } from '../labs';
import { DynamoClient } from './client';
import { gradeItems } from './grade';
import { inputText, parseRequest } from './request';
import { DynamoInputError, LabFailedError, LabTimeoutError, type AttributeValue, type DynamoLab, type DynamoRequest, type DynamoResult, type Item } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Plain JSON → DynamoDB JSON: string S, number N, boolean BOOL, null NULL, array L, object M (a set needs its own tag). */
export function marshal(v: unknown): AttributeValue {
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

const WRITE = new Set(['PutItem', 'UpdateItem', 'DeleteItem', 'BatchWriteItem', 'TransactWriteItems', 'ExecuteTransaction']);
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
  if (Array.isArray(i.TransactItems)) {
    for (const a of i.TransactItems as Record<string, { TableName?: string }>[]) for (const x of Object.values(a ?? {})) if (x?.TableName) return x.TableName;
  }
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
  vi: { timeout: 'Request chạy quá {s} giây nên đã dừng.', failed: 'Không khởi động được DynamoDB trong trình duyệt: {d}' },
  en: { timeout: 'The request ran longer than {s} seconds and was stopped.', failed: 'Could not start DynamoDB in the browser: {d}' },
};

export function dynamoRunner(env: Pick<LabEnv, 'lang'>, client = new DynamoClient(labOf)): LabRunner {
  const exec = async (lab: Lab, code: string): Promise<{ req: DynamoRequest; r: DynamoResult }> => {
    try {
      const req = parseRequest(code);
      const after = isWrite(req) ? tableOf(req, labOf(lab.setup ?? '')) : undefined;
      return { req, r: await client.request(req, { dataset: lab.setup ?? '', after: after ? { op: 'Scan', input: { TableName: after } } : undefined }) };
    } catch (e) {
      const t = TEXT[env.lang()];
      if (e instanceof DynamoInputError) throw new Error(inputText(e, env.lang()));
      if (e instanceof LabTimeoutError) throw new Error(t.timeout.replace('{s}', String(e.timeoutMs / 1000)));
      if (e instanceof LabFailedError) throw new Error(t.failed.replace('{d}', e.detail));
      throw e; // DynamoError: the engine's own message, shown unchanged like a Postgres error
    }
  };
  return {
    prepare: async (lab) => {
      await client.request({ op: 'DescribeTable', input: { TableName: '__none__' } }, { dataset: lab.setup ?? '' }).catch((e: unknown) => {
        if (e instanceof LabFailedError || e instanceof LabTimeoutError) throw e; // ResourceNotFound is the expected answer
      });
    },
    run: async (lab, code) => output(await exec(lab, code)),
    check: async (lab: Lab, step: LabStep, code: string): Promise<LabVerdict> => {
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
      }
      for (const [k, n] of Object.entries(step.expect ?? {})) {
        const v = (got.r as unknown as Record<string, unknown>)[k];
        if (v !== n) return { ok: false, reason: 'wrong', why: 'expect', params: { key: k, want: n, got: v === undefined ? '–' : String(v) } };
      }
      return { ok: true };
    },
  };
}

/** Items (or, after a write, the table it changed) as a table; the engine's numbers as LabMeta. */
function output({ req, r }: { req: DynamoRequest; r: DynamoResult }): LabOutput {
  const items = r.after ?? r.Items;
  const columns = [...new Set(items.flatMap((i) => Object.keys(i)))];
  const base = items.length || !r.raw || !isObj(r.raw) || 'Items' in r.raw || 'Item' in r.raw || 'Responses' in r.raw
    ? { columns, types: [], rows: items.map((i) => columns.map((c) => (i[c] ? cell(unmarshal(i[c])) : undefined))) }
    : { columns: ['response'], types: [], rows: [[JSON.stringify(r.raw, null, 1)]] };
  const cc = r.ConsumedCapacity === undefined ? undefined : ([] as unknown[]).concat(r.ConsumedCapacity)
    .reduce<number>((s, c) => s + (Number((c as { CapacityUnits?: number })?.CapacityUnits) || 0), 0);
  const table = typeof req.input.TableName === 'string' ? req.input.TableName : undefined;
  return { ...base, ms: r.ms, meta: { ...(table ? { table } : {}), ...(r.ScannedCount !== undefined ? { scannedCount: r.ScannedCount } : {}), count: r.Count, ...(cc !== undefined ? { consumedCapacity: cc } : {}) } };
}
const cell = (v: unknown): unknown => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
