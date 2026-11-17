import type { PGlite } from '@electric-sql/pglite';
import { GAME_SCHEMA } from '../domains';

/** Run once per session at init: imported tables live in `sandbox`; game tables win on name clashes. */
export const SANDBOX_SETUP_SQL = `CREATE SCHEMA IF NOT EXISTS sandbox; SET search_path = ${GAME_SCHEMA}, sandbox;`;

export type Delimiter = ',' | ';';
export type ColumnType = 'bigint' | 'numeric' | 'date' | 'timestamp' | 'boolean' | 'text';
/** Every type inference can produce; the only type names ever inlined into SQL. */
export const COLUMN_TYPES: readonly ColumnType[] = ['bigint', 'numeric', 'date', 'timestamp', 'boolean', 'text'];

export interface ImportRequest {
  table: string;
  columns: string[];
  delimiter: Delimiter;
  /** Known types (replay from IndexedDB): skips inference. */
  types?: ColumnType[];
}

export interface ImportedTable {
  table: string;
  columns: { name: string; type: ColumnType }[];
  rows: number;
}

const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;

/** Names are sanitised on the main thread; this is the second line of defence before inlining. */
function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`invalid identifier: ${name}`);
  return `"${name}"`;
}

// Bit flags per non-empty cell; bit_and over the column keeps the types every value fits.
// 18 digits always fit in bigint; leading zeros ('007', phone numbers) stay text.
const classify = (c: string) => `bit_and(CASE
  WHEN ${c} ~ '^-?(0|[1-9][0-9]{0,17})$' THEN 3
  WHEN ${c} ~ '^-?(0|[1-9][0-9]*)([.][0-9]+)?$' THEN 2
  WHEN ${c} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 4
  WHEN ${c} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2}([.][0-9]+)?)?$' THEN 8
  WHEN lower(${c}) IN ('true', 'false') THEN 16
  ELSE 0 END) FILTER (WHERE ${c} <> '')`;

const TYPE_OF_MASK = (m: number | null): ColumnType =>
  m === null ? 'text' : m & 1 ? 'bigint' : m & 2 ? 'numeric' : m & 4 ? 'date' : m & 8 ? 'timestamp' : m & 16 ? 'boolean' : 'text';

/** One scan classifies every column; date/timestamp candidates are then checked for real (2026-02-30). */
export async function inferTypes(db: PGlite, table: string, columns: string[]): Promise<ColumnType[]> {
  const from = `sandbox.${ident(table)}`;
  const masks = (await db.query<(number | null)[]>(`SELECT ${columns.map((c) => classify(ident(c))).join(', ')} FROM ${from}`, [], { rowMode: 'array' })).rows[0];
  const types = masks.map(TYPE_OF_MASK);
  const temporal = types.flatMap((ty, i) => (ty === 'date' || ty === 'timestamp' ? [i] : []));
  if (temporal.length) {
    const checks = temporal.map((i) => `bool_and(pg_input_is_valid(${ident(columns[i])}, '${types[i]}')) FILTER (WHERE ${ident(columns[i])} <> '')`);
    const ok = (await db.query<boolean[]>(`SELECT ${checks.join(', ')} FROM ${from}`, [], { rowMode: 'array' })).rows[0];
    temporal.forEach((i, k) => {
      if (!ok[k]) types[i] = 'text';
    });
  }
  return types;
}

/**
 * CSV → sandbox.<table>, outside the player's BEGIN … ROLLBACK and atomic: on any error nothing is left behind.
 * A table with the same name is replaced. UNLOGGED: no WAL, about half the memory (spike).
 */
export async function importCsv(db: PGlite, req: ImportRequest, file: Blob): Promise<ImportedTable> {
  const table = `sandbox.${ident(req.table)}`;
  const cols = req.columns.map(ident);
  if (req.types && (req.types.length !== cols.length || !req.types.every((ty) => COLUMN_TYPES.includes(ty)))) {
    throw new Error('invalid column types');
  }
  const delimiter = req.delimiter === ';' ? ';' : ',';
  await db.exec('BEGIN');
  try {
    await db.exec(`DROP TABLE IF EXISTS ${table}; CREATE UNLOGGED TABLE ${table} (${cols.map((c) => `${c} text`).join(', ')})`);
    const copied = await db.query(`COPY ${table} FROM '/dev/blob' WITH (FORMAT csv, HEADER true, DELIMITER '${delimiter}')`, [], { blob: file });
    const types = req.types ?? (await inferTypes(db, req.table, req.columns));
    const alters = cols.flatMap((c, i) => (types[i] === 'text' ? [] : [`ALTER COLUMN ${c} TYPE ${types[i]} USING NULLIF(${c}, '')::${types[i]}`]));
    if (alters.length) await db.exec(`ALTER TABLE ${table} ${alters.join(', ')}`);
    await db.exec('COMMIT');
    return { table: req.table, columns: req.columns.map((name, i) => ({ name, type: types[i] })), rows: copied.affectedRows ?? 0 };
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

/** Drops one imported table, or every imported table when `table` is omitted. */
export async function dropImport(db: PGlite, table?: string): Promise<void> {
  await db.exec(table === undefined
    ? 'DROP SCHEMA IF EXISTS sandbox CASCADE; CREATE SCHEMA sandbox;'
    : `DROP TABLE IF EXISTS sandbox.${ident(table)}`);
}
