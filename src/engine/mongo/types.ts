// Types shared by the Mongo lab's client, worker and grader. No runtime code from main modules (Plan 6 U3: a value
// import from main would split main into shared chunks), so the error classes live here, not in src/db/client.ts.

/** A value the shell parser can produce: JSON plus Date and RegExp (both survive postMessage). */
export type MongoValue = null | boolean | number | string | Date | RegExp | MongoValue[] | MongoDoc;
export interface MongoDoc {
  [key: string]: MongoValue;
}

/**
 * What one Run returns. Writes run on a copy of the collection that is thrown away afterwards (like `runSandboxed`'s
 * BEGIN … ROLLBACK), so `docs` holds the collection as the write left it: that is what a write lab grades.
 * - `docs`: find/findOne/aggregate output, or the post-write collection (`write`), or the indexes (`index`).
 * - `value`: countDocuments (number) or distinct (sorted array).
 * - `ack`: the write's acknowledgement, as mongosh prints it.
 */
export interface MongoResult {
  kind: 'docs' | 'value' | 'write' | 'index';
  collection: string;
  docs: MongoDoc[];
  value?: number | MongoValue[];
  ack?: MongoDoc;
  /** More than MAX_DOCS documents: the rest were cut. */
  truncated: boolean;
  /** The collection does not exist in the dataset (MongoDB answers with nothing, not an error). */
  unknownCollection?: boolean;
  ms: number;
}

// Structural copies of ENG-CORE's lab contract (`src/engine/labs.ts` + `content.ts` on its branch, commit a33ae40, not
// on main yet). Once it lands, import the real types instead; these are kept assignable to them.
// For a MongoDB lab, `lab.setup` names the dataset (DATASET_IDS, default 'shop') and steps use `check: 'doc'`.
export interface LabStepLike {
  solution: string;
  check: string;
  ordered: boolean;
}
export interface LabLike {
  setup?: string;
  steps: LabStepLike[];
}
/** QueryResult-shaped table for the Result view; `types` is empty (a document engine has no OIDs). */
export interface LabOutput {
  columns: string[];
  types: number[];
  rows: unknown[][];
  truncated?: true;
  ms?: number;
}
/** ENG-CORE's LabVerdict plus two optional fields: `tip` on a pass, `grade` (why it failed) on a miss. */
export type LabVerdict =
  | { ok: true; tip?: 'extraId' }
  | { ok: false; reason: 'wrong' | 'error' | 'unsupported'; message?: string; grade?: import('./grade').DocGrade };
export interface LabRunner {
  prepare(lab: LabLike): Promise<void>;
  run(lab: LabLike, code: string): Promise<LabOutput>;
  check(lab: LabLike, step: LabStepLike, code: string): Promise<LabVerdict>;
}

/** Syntax error in the player's shell text. `code` is stable (the UI translates it), `message` is English detail like Postgres'. */
export class MongoSyntaxError extends Error {
  name = 'MongoSyntaxError';
  constructor(readonly code: string, message: string, readonly position: number, readonly line: number, readonly column: number) {
    super(message);
  }
}
/** The query parsed but MongoDB (mingo) refused it, e.g. an unknown operator or a duplicate _id. `message` is mingo's text. */
export class MongoRunError extends Error {
  name = 'MongoRunError';
  constructor(readonly code: string, message: string) {
    super(message);
  }
}
export class LabTimeoutError extends Error {
  name = 'LabTimeoutError';
  constructor(readonly timeoutMs: number) {
    super();
  }
}
/** The worker could not start, crashed, or the runner was disposed. */
export class LabFailedError extends Error {
  name = 'LabFailedError';
  constructor(readonly detail: string) {
    super(detail);
  }
}

/** Plain data for an error crossing postMessage (classes do not survive it). */
export type MongoErrorInfo =
  | { type: 'syntax'; code: string; message: string; position: number; line: number; column: number }
  | { type: 'run'; code: string; message: string };

export type MongoRequest = { id: number; src: string; dataset: string };
export type MongoReply =
  | { type: 'ready' }
  | { type: 'result'; id: number; result: MongoResult }
  | { type: 'error'; id: number; error: MongoErrorInfo };
