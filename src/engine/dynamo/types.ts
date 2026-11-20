// ENG-DYNAMO: types shared by the DynamoDB lab's client, worker, engine and grader. No value import from main modules
// (Plan 6 U3: it would split main into shared chunks), so the error classes live here.

/** DynamoDB-JSON attribute value (`{ S: 'x' }`, `{ N: '1' }`, `{ M: { … } }` …), exactly what the engine speaks. */
export type AttributeValue = Record<string, unknown>;
export type Item = Record<string, AttributeValue>;

/** Operations a player (or a lab's solution) may send. Anything else is refused before it reaches the engine. */
export const DYNAMO_OPS = [
  'GetItem', 'PutItem', 'UpdateItem', 'DeleteItem', 'Query', 'Scan', 'BatchGetItem', 'BatchWriteItem', 'CreateTable',
  'DescribeTable', 'ExecuteStatement', 'TransactGetItems', 'ExecuteTransaction',
] as const;
export type DynamoOp = (typeof DYNAMO_OPS)[number];

/** One request: the op and its input, the same shape as the AWS SDK's `<Op>Command` input. */
export interface DynamoRequest {
  op: DynamoOp;
  input: Record<string, unknown>;
}

/**
 * A lab's data (`{ tables: [CreateTable input], items: { <table>: [items] } }`). Keep it small: the engine loads about
 * 1 ms per item (spike-nosql-browser §3.2), so ≤ 2,000 items per lab (`MAX_LAB_ITEMS`).
 */
export interface DynamoLab {
  tables: Record<string, unknown>[];
  items?: Record<string, Item[]>;
}

/**
 * What one Run returns, normalised over the ops:
 * - `Items`: Query/Scan/ExecuteStatement items, `[Item]` for GetItem (empty when not found), every table's Responses
 *   for BatchGetItem, `[Attributes]` for a write with ReturnValues; `[]` otherwise.
 * - `Count`/`ScannedCount`: the engine's, or `Items.length` for Count when the op has none. `ScannedCount` exists only
 *   for Query and Scan (PartiQL reports none, so a scan check does not apply to it).
 * - `ConsumedCapacity`: the engine's (requests default to `ReturnConsumedCapacity: 'TOTAL'`).
 * - `raw`: the whole engine response (DescribeTable, CreateTable, UnprocessedItems…).
 * - `after`: items of the optional follow-up request (e.g. a Scan after a PutItem: what a write lab grades).
 */
export interface DynamoResult {
  op: DynamoOp;
  Items: Item[];
  Count: number;
  ScannedCount?: number;
  ConsumedCapacity?: unknown;
  LastEvaluatedKey?: Item;
  raw: unknown;
  after?: Item[];
  ms: number;
}

/**
 * Engine-neutral lab runner, the shape ENG-MONGO uses (`src/engine/mongo/types.ts`): ENG-CORE had no `src/engine/lab.ts`
 * with a runner when this was written, so it is declared here; move it there when one exists. `dataset` names the lab
 * data a run starts from; every run starts from that pristine data.
 */
export interface LabRunner<R = unknown> {
  readonly engine: string;
  run(src: string, opts: { dataset: string }): Promise<R>;
  /** Stops the worker; later runs reject with LabFailedError. */
  dispose(): void;
}

/** The editor text is not a request. `code` is stable (the UI translates it, `inputText()`); `detail` is English. */
export class DynamoInputError extends Error {
  name = 'DynamoInputError';
  constructor(readonly code: InputCode, readonly detail = '', readonly line?: number, readonly column?: number) {
    super(detail || code);
  }
}
export type InputCode = 'empty' | 'tooLong' | 'json' | 'shape' | 'op' | 'input' | 'untyped' | 'unsupported';
/** Real DynamoDB operations dynoxide 1.5.0 answers with UnsupportedOperation (spike ES3, L254): refused with a clear line. */
export const BROWSER_UNSUPPORTED = ['TransactWriteItems', 'UpdateTimeToLive', 'DescribeTimeToLive', 'ListStreams', 'DescribeStream', 'GetShardIterator', 'GetRecords'] as const;

/**
 * DynamoDB refused the request. `type` is the short exception name (`ValidationException`,
 * `ConditionalCheckFailedException`, `ResourceNotFoundException`, `UnsupportedOperation`…); `message` is the engine's
 * own text, shown unchanged like a Postgres message.
 */
export class DynamoError extends Error {
  name = 'DynamoError';
  constructor(readonly type: string, message: string) {
    super(message);
  }
}
export class LabTimeoutError extends Error {
  name = 'LabTimeoutError';
  constructor(readonly timeoutMs: number) {
    super();
  }
}
/** The worker or engine could not start, crashed, the lab data is broken, or the runner was disposed. */
export class LabFailedError extends Error {
  name = 'LabFailedError';
  constructor(readonly detail: string) {
    super(detail);
  }
}

/** Plain data for an error crossing postMessage (classes do not survive it). */
export type DynamoErrorInfo =
  | { kind: 'dynamo'; type: string; message: string }
  | { kind: 'input'; code: InputCode; detail: string; line?: number; column?: number }
  | { kind: 'failed'; message: string };

export type DynamoWorkerBody =
  | { kind: 'setup'; dataset: string; lab: DynamoLab }
  | { kind: 'run'; req: DynamoRequest; after?: DynamoRequest };
export type DynamoWorkerRequest = DynamoWorkerBody & { id: number };
export type DynamoWorkerReply =
  | { id: number; ok: true; result?: DynamoResult; ms?: number }
  | { id: number; ok: false; error: DynamoErrorInfo };
