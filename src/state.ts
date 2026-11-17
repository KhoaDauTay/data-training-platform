import type { SQLNamespace } from '@codemirror/lang-sql';
import type { DbStatus } from './db/client';
import type { DiagnosticKind } from './diagnostics';
import type { LoadProgress } from './db/loadProgress';
import type { QueryResult } from './db/run';
import type { Key, Params } from './i18n';
import { laneTables } from './lanes';
import { currentChapter, tablesUnlocked } from './progress';
import { derive } from './scene';
import { emptySave, stepKey, writeSave } from './save';
import { shapeOf, type Shape } from './shape';
import { localStore } from './storage';
import type { Ticket } from './tickets';
import { distinctValuesSql, loadErMetadata, TEXT_TYPES, toDistinctValues } from './viz/erd';
import { memoByKey } from './viz/memo';

export interface LastRun {
  /** stepKey of the ticket step it was run for ('' outside a ticket); the shape card compares only matching runs. */
  key: string;
  sql: string;
  /** Where `sql` starts in the editor (run selection), to place the error underline. */
  offset: number;
  result?: QueryResult;
  /** The thrown error, kept raw so it is translated when drawn (SqlError, QueryTimeoutError…). */
  error?: unknown;
  /** Row of `result` the grader reported as not matching (highlighted in the Result tab). */
  mark?: unknown[];
}

/** A banner under the top bar. Stored as a key so a language switch re-translates it. */
export interface Notice { key: Key; params?: Params; reload?: boolean }

export interface Column { name: string; type: string }

export const app = {
  tickets: [] as Ticket[],
  save: emptySave(),
  selectedId: '',
  stepIndex: 0,
  dbStatus: 'loading' as DbStatus,
  loadProgress: undefined as LoadProgress | undefined,
  columns: {} as Record<string, Column[]>,
  lastRun: undefined as LastRun | undefined,
  /** Boss whose steps are all solved and whose conclusion is open. Not saved: a reload repeats the last step. */
  conclusionFor: '',
  notice: undefined as Notice | undefined,
  /** Last app/DB fault (never a player's SQL error): shows the "Copy diagnostics" button. */
  problem: undefined as { kind: DiagnosticKind; error?: unknown } | undefined,
  /** ER and Columns tabs: tables related to the open task, or every unlocked table (ui-ux-v4 §4). Not saved. */
  schemaScope: 'task' as 'task' | 'all',
  /** Runs one statement in the sandbox; main.ts points it at DbClient.run. */
  run: (_sql: string): Promise<QueryResult> => Promise.reject(new Error('DB not started')),
};

/** Implemented in main.ts; UI modules call these instead of importing main. */
export const actions = {
  rerender(): void {},
  selectTicket(_id: string): void {},
  complete(_ticket: Ticket): void {},
  retryDb(): void {},
  copyDiagnostics(): void {},
  /** Replaces the editor text ("Use this example" on a worked ticket). */
  useSql(_sql: string): void {},
  /** Opens a bottom-panel tab (Panel.show). */
  showTab(_id: string): void {},
  /** Opens the map dialog on a lane's brief (Plan 5). */
  openLane(_port: string): void {},
};

/** Columns and keys per schema, shared by the ER and Columns tabs, the brief and the Data page. Keyed by schema ('sandbox' for imports). */
export const erMeta = memoByKey((schema) => loadErMetadata((sql) => app.run(sql), schema));

/**
 * Values of the short text columns of a game table (product-design-v4 §C.4-4: look at the data before filtering), for the
 * Columns tab and the Data page. One query per table, once per session (memoByKey drops a failure so it is retried).
 * Holds every table: the "all tables" Columns tab asks for each one per render, and more than MEMO_MAX would thrash.
 */
export const textValues = memoByKey((table) => erMeta('public').then((m) => {
  const cols = m.cols.filter((c) => c.table === table && TEXT_TYPES.has(c.type)).map((c) => c.name);
  return cols.length ? app.run(distinctValuesSql(table, cols)).then(toDistinctValues) : {};
}), 100);

export const done = (): Set<string> => new Set(app.save.completed);
export const selected = (): Ticket => app.tickets.find((x) => x.id === app.selectedId)!;
export { stepKey };
export const draftKey = (): string => stepKey(app.selectedId, app.stepIndex);

/** Editor text for a step: the draft, or the ticket's starter when the draft is missing or blank. */
export const initialDoc = (draft: string | undefined, starter: string | undefined): string =>
  (draft?.trim() ? draft : starter ?? draft ?? '');
/** Chapter tables plus the tables of the open lanes (Plan 5 D-B4: `lane_profiles`, `bunker_prices`). */
export const unlockedTables = (): string[] =>
  [...tablesUnlocked(currentChapter(app.tickets, done())), ...laneTables(derive(app.tickets, done()).open)];

let persistTimer: ReturnType<typeof setTimeout> | undefined;
export function persist(now = false): void {
  clearTimeout(persistTimer);
  const write = () => {
    if (writeSave(localStore(), app.save)) return;
    app.notice = { key: 'save.writeFailed' };
    actions.rerender();
  };
  if (now) write();
  else persistTimer = setTimeout(write, 500);
}

/** Plan Import: imported tables for autocomplete, set by initMyData; returns {} outside Sandbox (I1). */
export const schemaHooks: { extra?: () => Record<string, Column[]> } = {};

/** Autocomplete: only unlocked tables (spec §4), with column types as detail, plus imported tables in Sandbox. */
export function editorSchema(): SQLNamespace {
  const tables: Record<string, Column[]> = {};
  for (const table of unlockedTables()) {
    const cols = app.columns[table];
    if (cols) tables[table] = cols;
  }
  Object.assign(tables, schemaHooks.extra?.()); // imported names never clash with game tables (`_my`)
  const out: Record<string, SQLNamespace> = {};
  for (const [table, cols] of Object.entries(tables)) {
    out[table] = {
      self: { label: table, type: 'type', detail: 'table' },
      children: cols.map((c) => ({ label: c.name, type: 'property', detail: c.type })),
    };
  }
  return out;
}

// Keyed by Solution SQL, not ticket id: Plan 1c variants reuse ids with different SQL.
const shapes = new Map<string, Promise<Shape>>();
export function expectedShape(solution: string): Promise<Shape> {
  let p = shapes.get(solution);
  if (!p) {
    p = app.run(solution).then(shapeOf);
    shapes.set(solution, p);
    p.catch(() => shapes.delete(solution)); // timeout/restart: try again on the next render
  }
  return p;
}
