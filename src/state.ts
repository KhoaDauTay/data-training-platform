import type { SQLNamespace } from '@codemirror/lang-sql';
import type { DbStatus } from './db/client';
import type { LoadProgress } from './db/loadProgress';
import type { QueryResult } from './db/run';
import type { Key, Params } from './i18n';
import { currentChapter, tablesUnlocked } from './progress';
import { emptySave, writeSave } from './save';
import { shapeOf, type Shape } from './shape';
import { localStore } from './storage';
import type { Ticket } from './tickets';

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
  /** Ticket closed just now: its Recap heading takes focus once. */
  justCompleted: '',
  notice: undefined as Notice | undefined,
  /** Runs one statement in the sandbox; main.ts points it at DbClient.run. */
  run: (_sql: string): Promise<QueryResult> => Promise.reject(new Error('DB not started')),
};

/** Implemented in main.ts; UI modules call these instead of importing main. */
export const actions = {
  rerender(): void {},
  selectTicket(_id: string): void {},
  complete(_ticket: Ticket): void {},
  retryDb(): void {},
};

export const done = (): Set<string> => new Set(app.save.completed);
export const selected = (): Ticket => app.tickets.find((x) => x.id === app.selectedId)!;
export const draftKey = (): string => `${app.selectedId}#${app.stepIndex}`;
export const stepKey = (ticket: Ticket, stepIndex: number): string => `${ticket.id}#${stepIndex}`;
export const unlockedTables = (): string[] => tablesUnlocked(currentChapter(app.tickets, done()));

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

/** Autocomplete: only unlocked tables (spec §4), with column types as detail. */
export function editorSchema(): SQLNamespace {
  const out: Record<string, SQLNamespace> = {};
  for (const table of unlockedTables()) {
    const cols = app.columns[table];
    if (cols) {
      out[table] = {
        self: { label: table, type: 'type', detail: 'table' },
        children: cols.map((c) => ({ label: c.name, type: 'property', detail: c.type })),
      };
    }
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
