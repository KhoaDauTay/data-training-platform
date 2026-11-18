import type { BootPick } from './onboarding';
import type { SQLNamespace } from '@codemirror/lang-sql';
import { activeDomain, domainSchemaId, SCHEMAS, type SchemaId } from './domains';
import type { DbStatus } from './db/client';
import type { DiagnosticKind } from './diagnostics';
import type { LoadProgress } from './db/loadProgress';
import type { QueryResult, RunOpts } from './db/run';
import type { Key, Lang, Params } from './i18n';
import { laneTables } from './lanes';
import { currentChapter, tablesUnlocked } from './progress';
import { derive } from './scene';
import { emptySave, stepKey, writeSave } from './save';
import { markDay } from './lily';
import { localDay } from './practice';
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
  /** Set for a run on `lab` (a drill), so EXPLAIN and the execution steps of this run use the same schema (Plan 8a). */
  schema?: SchemaId;
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
  /** Runs one statement in the sandbox; main.ts points it at DbClient.run. `schema` absent = the game schema (Plan 8a). */
  run: (_sql: string, _opts?: RunOpts): Promise<QueryResult> => Promise.reject(new Error('DB not started')),
  /** Seeds a lazily seeded schema (`lab`) before its first query; main.ts points it at DbClient.ensure (a no-op once seeded). */
  ensure: (_schema: SchemaId): Promise<void> => Promise.resolve(),
};

/** Implemented in main.ts; UI modules call these instead of importing main. */
export const actions = {
  rerender(): void {},
  selectTicket(_id: string): void {},
  complete(_ticket: Ticket): void {},
  retryDb(): void {},
  /** v12.0 P2: the welcome picker's first-visit choice; main.ts seeds only that data. False = the domain did not load (D10-6). */
  startWith(_c: BootPick): Promise<boolean> { return Promise.resolve(true); },
  copyDiagnostics(): void {},
  /** Replaces the editor text ("Use this example" on a worked ticket). */
  useSql(_sql: string): void {},
  /** Opens a bottom-panel tab (Panel.show). */
  showTab(_id: string): void {},
  /** Opens the map dialog on a lane's brief (Plan 5). */
  openLane(_port: string): void {},
  /** Opens a General drill in the workspace (Plan 8a); seeds `lab` first. */
  startDrill(_id: string): void {},
  /** Language switch from UI built after startup (the welcome screen); the top bar's VI|EN buttons do the same. */
  switchLang(_lang: Lang): void {},
};

/** Columns and keys per schema, shared by the ER and Columns tabs, the brief and the Data page. Keyed by schema ('sandbox' for imports). */
export const erMeta = memoByKey((schema) => loadErMetadata((sql) => app.run(sql), schema));

/**
 * Values of the short text columns of a game table (product-design-v4 §C.4-4: look at the data before filtering), for the
 * Columns tab and the Data page. One query per table, once per session (memoByKey drops a failure so it is retried).
 * Holds every table: the "all tables" Columns tab asks for each one per render, and more than MEMO_MAX would thrash.
 */
const valuesOf = memoByKey((key) => {
  const [schema, table] = key.split('|') as [SchemaId, string];
  return erMeta(SCHEMAS[schema]).then((m) => {
    const cols = m.cols.filter((c) => c.table === table && TEXT_TYPES.has(c.type)).map((c) => c.name);
    return cols.length ? app.run(distinctValuesSql(table, cols), { schema }).then(toDistinctValues) : {};
  });
}, 100);
/** `schema`: 'lab' for the drill workspace (Plan 8a). */
export const textValues = (table: string, schema: SchemaId = domainSchemaId()) => valuesOf(`${schema}|${table}`);

export const done = (): Set<string> => new Set(app.save.completed);
export const selected = (): Ticket => app.tickets.find((x) => x.id === app.selectedId)!;
export { stepKey };
export const draftKey = (): string => stepKey(app.selectedId, app.stepIndex);

/** Editor text for a step: the draft, or the ticket's starter when the draft is missing or blank. */
export const initialDoc = (draft: string | undefined, starter: string | undefined): string =>
  (draft?.trim() ? draft : starter ?? draft ?? '');
/** Chapter tables plus the tables of the open lanes (Plan 5 D-B4: `lane_profiles`, `bunker_prices`; Logistics only, Plan 9 D9-14). */
export const unlockedTables = (): string[] => [
  ...tablesUnlocked(currentChapter(app.tickets, done())),
  ...(activeDomain() === 'logistics' ? laneTables(derive(app.tickets, done()).open) : []),
];

let persistTimer: ReturnType<typeof setTimeout> | undefined;
export function persist(now = false): void {
  clearTimeout(persistTimer);
  const write = () => {
    markDay(localDay(new Date())); // L87: a day with a save write counts toward "Day N with Lily" (device pref)
    if (writeSave(localStore(), app.save)) return;
    app.notice = { key: 'save.writeFailed' };
    actions.rerender();
  };
  if (now) write();
  else persistTimer = setTimeout(write, 500);
}

/** Plan Import: imported tables for autocomplete, set by initMyData; returns {} outside Sandbox (I1). */
export const schemaHooks: {
  extra?: () => Record<string, Column[]>;
  /** Plan 8a: in the drill workspace, the `lab` tables replace the game tables (set by src/ui/drillBrief.ts). */
  only?: () => Record<string, Column[]> | undefined;
} = {};

/** Autocomplete: only unlocked tables (spec §4), with column types as detail, plus imported tables in Sandbox. */
export function editorSchema(): SQLNamespace {
  const only = schemaHooks.only?.();
  const tables: Record<string, Column[]> = { ...only };
  if (!only) for (const table of unlockedTables()) {
    const cols = app.columns[table];
    if (cols) tables[table] = cols;
  }
  if (!only) Object.assign(tables, schemaHooks.extra?.()); // imported names never clash with game tables (`_my`)
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
const expected = new Map<string, Promise<QueryResult>>();
/** The Solution's result, run once per session (shape card, and the L84 expected-result preview of lessons and drills). */
export function expectedResult(solution: string, schema: SchemaId = domainSchemaId()): Promise<QueryResult> {
  const k = `${schema}|${solution}`;
  let p = expected.get(k);
  if (!p) {
    // A named run seeds its schema (v12.0 D10-3) and respects a failed seed; an explicit ensure() would clear that and
    // start another seed on every brief redraw. Only `lab` keeps it: lessons and drills have no Retry button of their own.
    p = schema === 'lab' ? app.ensure(schema).then(() => app.run(solution, { schema })) : app.run(solution, { schema });
    expected.set(k, p);
    p.catch(() => expected.delete(k)); // timeout/restart: try again on the next render
  }
  return p;
}
export const expectedShape = (solution: string, schema: SchemaId = domainSchemaId()): Promise<Shape> => expectedResult(solution, schema).then(shapeOf);
