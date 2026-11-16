import type { Delimiter } from '../db/import';

export const IMPORT_LIMITS = { maxBytes: 20 * 1024 * 1024, maxRows: 200_000, maxColumns: 50, maxTables: 5 } as const;

/**
 * Imported rows × columns from which the My data panel warns about memory (L5, I3). The D3 limits stay:
 * the spike measured +137 MB for 10M cells and +364–463 MB for 50M cells, over the 400 MB tab budget with the seed.
 */
export const MEMORY_WARN_CELLS = 20_000_000;

/**
 * Postgres 18 keywords that cannot be a bare column name (pg_get_keywords() catcode R and T).
 * A sanitised name in this set gets a trailing `_` so players never have to quote it.
 */
export const RESERVED = new Set(('all analyse analyze and any array as asc asymmetric authorization binary both case cast check ' +
  'collate collation column concurrently constraint create cross current_catalog current_date current_role current_schema ' +
  'current_time current_timestamp current_user default deferrable desc distinct do else end except false fetch for foreign ' +
  'freeze from full grant group having ilike in initially inner intersect into is isnull join lateral leading left like limit ' +
  'localtime localtimestamp natural not notnull null offset on only or order outer overlaps placing primary references ' +
  'returning right select session_user similar some symmetric system_user table tablesample then to trailing true union ' +
  'unique user using variadic verbose when where window with').split(' '));

const MAX_IDENT = 63;

/** Appends a suffix, cutting the base so the result stays within Postgres' 63-byte identifier limit. */
export const withSuffix = (base: string, suffix: string): string => base.slice(0, MAX_IDENT - suffix.length) + suffix;

/** "Mã Lô (VNĐ)" → "ma_lo_vnd". Output always matches /^[a-z_][a-z0-9_]{0,62}$/. */
export function sanitizeIdent(raw: string, fallback: string): string {
  let s = raw.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `c_${s}`;
  s = s.slice(0, MAX_IDENT);
  return RESERVED.has(s) ? `${s}_` : s;
}

/** Duplicates get _2, _3, … in order of appearance. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.map((n) => {
    let out = n;
    for (let i = 2; seen.has(out); i++) out = withSuffix(n, `_${i}`);
    seen.add(out);
    return out;
  });
}

/** "Đơn hàng 2026.csv" → "don_hang_2026"; a game table name gets the `_my` suffix. */
export function tableNameFor(fileName: string, gameTables: ReadonlySet<string>): string {
  let s = sanitizeIdent(fileName.replace(/\.[^.]*$/, ''), 'my_data');
  while (gameTables.has(s)) s = withSuffix(s, '_my');
  return s;
}

export const detectDelimiter = (header: string): Delimiter =>
  header.split(';').length > header.split(',').length ? ';' : ',';

/** Splits one CSV line (RFC 4180 quoting, `""` inside quotes). Used for the header only. */
export function splitCsvLine(line: string, delimiter: Delimiter): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch !== '"') cur += ch;
      else if (line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Records in the file (header included) and where the header ends. Newlines inside quotes do not count. */
export function scanRecords(bytes: Uint8Array): { records: number; headerEnd: number } {
  let records = 0;
  let headerEnd = -1;
  let quoted = false;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x22) quoted = !quoted;
    else if (b === 0x0a && !quoted) {
      if (headerEnd < 0) headerEnd = i;
      records++;
    }
  }
  if (bytes.length > 0 && bytes[bytes.length - 1] !== 0x0a) records++;
  return { records, headerEnd: headerEnd < 0 ? bytes.length : headerEnd };
}

export interface ImportSpec {
  table: string;
  fileName: string;
  delimiter: Delimiter;
  /** Original header cells, for display. */
  headers: string[];
  /** Sanitised, unique column names, same order as `headers`. */
  columns: string[];
  rows: number;
  bytes: number;
}

export type ImportProblem =
  | { kind: 'empty' }
  | { kind: 'tooLarge'; bytes: number }
  | { kind: 'tooManyRows'; rows: number }
  | { kind: 'tooManyColumns'; columns: number }
  | { kind: 'tooManyTables' };

export type CsvInspection = { ok: true; spec: ImportSpec } | { ok: false; problem: ImportProblem };

/**
 * Every D3 limit is checked here, on the main thread, before anything reaches the worker.
 * Importing a file whose table name already exists replaces that table (it does not count as a new one).
 */
export async function inspectCsv(file: Blob, fileName: string, gameTables: ReadonlySet<string>, imported: readonly string[]): Promise<CsvInspection> {
  if (file.size > IMPORT_LIMITS.maxBytes) return { ok: false, problem: { kind: 'tooLarge', bytes: file.size } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { records, headerEnd } = scanRecords(bytes);
  const header = new TextDecoder().decode(bytes.subarray(0, headerEnd)).replace(/^\uFEFF/, '').replace(/\r$/, '');
  const rows = records - 1;
  if (!header.trim() || rows < 1) return { ok: false, problem: { kind: 'empty' } };
  if (rows > IMPORT_LIMITS.maxRows) return { ok: false, problem: { kind: 'tooManyRows', rows } };
  const delimiter = detectDelimiter(header);
  const headers = splitCsvLine(header, delimiter);
  if (headers.length > IMPORT_LIMITS.maxColumns) return { ok: false, problem: { kind: 'tooManyColumns', columns: headers.length } };
  const table = tableNameFor(fileName, gameTables);
  if (!imported.includes(table) && imported.length >= IMPORT_LIMITS.maxTables) return { ok: false, problem: { kind: 'tooManyTables' } };
  const columns = uniqueNames(headers.map((h, i) => sanitizeIdent(h, `col_${i + 1}`)));
  return { ok: true, spec: { table, fileName, delimiter, headers, columns, rows, bytes: file.size } };
}
