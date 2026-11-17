import { DbFailedError, DbRestartError } from '../db/client';
import type { ImportedTable, ImportRequest } from '../db/import';
import type { QueryResult } from '../db/run';
import { GAME_SCHEMA } from '../domains';
import { inspectCsv, type ImportProblem } from './csv';
import type { ImportStore, StoredImport } from './store';

/** The part of DbClient that "My data" needs (a PGlite adapter in tests). */
export interface ImportDb {
  run(sql: string): Promise<QueryResult>;
  importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable>;
  dropImport(table?: string): Promise<void>;
}

export type AddOutcome =
  | { ok: true; table: ImportedTable; persisted: boolean }
  | { ok: false; problem: ImportProblem }
  | { ok: false; error: unknown };

/** Rows × columns over every imported table: the memory warning's measure (I3). */
export const importedCells = (tables: ImportedTable[]): number => tables.reduce((n, x) => n + x.rows * x.columns.length, 0);

/** A restart already forgot the table (DbClient drops it from the replay list before sending). */
function ignoreRestart(e: unknown): void {
  if (!(e instanceof DbRestartError)) throw e;
}

const GAME_TABLES_SQL = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${GAME_SCHEMA}'`;

/**
 * Owns the list of imported tables: inspect → import in the worker → keep the original file in the store.
 * `onChange` gets the new list after every change (add, remove, clear, restore, a table lost on replay).
 */
export class MyData {
  tables: ImportedTable[] = [];
  /** add/remove/clear wait for it: mid-restore, `tables` is partial (a 6th table would pass the limit, a cleared table would come back). */
  private restoring: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly db: ImportDb,
    private readonly store: ImportStore,
    private readonly onChange: (tables: ImportedTable[]) => void,
  ) {}

  private set(tables: ImportedTable[]): void {
    this.tables = tables;
    this.onChange(tables);
  }

  private async gameTables(): Promise<Set<string>> {
    return new Set((await this.db.run(GAME_TABLES_SQL)).rows.map((r) => String(r[0])));
  }

  /**
   * Page load: replays the stored files one by one (sequentially, so a timeout restart cannot
   * reject the ones after it). A file that fails, or whose name is now a game table (I7), is removed
   * from the store; one that only hit a restart or a failed boot stays stored for the next page load.
   */
  restore(): Promise<{ table: string; error: unknown }[]> {
    const p = this.replayStored();
    this.restoring = p;
    return p;
  }

  private async settled(): Promise<void> {
    await this.restoring.catch(() => {});
  }

  private async replayStored(): Promise<{ table: string; error: unknown }[]> {
    const failed: { table: string; error: unknown }[] = [];
    const stored = await this.store.list();
    if (stored.length === 0) return failed;
    let game: Set<string>;
    try {
      game = await this.gameTables();
    } catch (error) {
      return stored.map((r) => ({ table: r.table, error })); // DB not usable: keep every record
    }
    for (const r of stored) {
      try {
        if (game.has(r.table)) throw new Error(`name taken by a game table: ${r.table}`);
        const t = await this.db.importCsv({ table: r.table, columns: r.columns, delimiter: r.delimiter, types: r.types }, r.file);
        // Incremental, so a file the player adds while restore is still running is not wiped from the list.
        this.set([...this.tables.filter((x) => x.table !== t.table), t]);
      } catch (error) {
        if (!(error instanceof DbRestartError || error instanceof DbFailedError)) await this.store.remove(r.table);
        failed.push({ table: r.table, error });
      }
    }
    return failed;
  }

  async add(file: Blob, fileName: string): Promise<AddOutcome> {
    await this.settled();
    let imported: ImportedTable;
    let record: StoredImport;
    try {
      const inspection = await inspectCsv(file, fileName, await this.gameTables(), this.tables.map((t) => t.table));
      if (!inspection.ok) return inspection;
      const { table, columns, delimiter } = inspection.spec;
      imported = await this.db.importCsv({ table, columns, delimiter }, file);
      record = { table, fileName, delimiter, columns, types: imported.columns.map((c) => c.type), rows: imported.rows, file };
    } catch (error) {
      return { ok: false, error };
    }
    const persisted = await this.store.put(record);
    this.set([...this.tables.filter((t) => t.table !== imported.table), imported]);
    return { ok: true, table: imported, persisted };
  }

  /** Store first: the delete must survive a reload even if the worker is restarting right now. */
  async remove(table: string): Promise<void> {
    await this.settled();
    await this.store.remove(table);
    this.set(this.tables.filter((t) => t.table !== table));
    await this.db.dropImport(table).catch(ignoreRestart);
  }

  async clear(): Promise<void> {
    await this.settled();
    await this.store.clear();
    this.set([]);
    await this.db.dropImport().catch(ignoreRestart);
  }

  /** DbClient.onImportDropped: the worker lost this table on a replay after restart. */
  async dropped(table: string): Promise<void> {
    await this.store.remove(table);
    this.set(this.tables.filter((t) => t.table !== table));
  }
}
