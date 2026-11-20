export type StepKey = 'from' | 'join' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit';
/**
 * V19-A (L162): a `steps` request whose SQL starts with this only parses and returns `words` (no sub-query), so the
 * line under the editor never runs the per-clause counts. A control character: no typed SQL starts with it.
 */
export const WORDS_ONLY = '\u0001words\u0001';
/** V22-B (L206): a `steps` request `WHY` + JSON `{ sql, row }` explains one result row (src/viz/why.ts), nothing else. */
export const WHY = '\u0001why\u0001';
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
/**
 * The `steps` request text for row `row` of a result of `sql`. PGlite reads `timestamp` (OID 1114) as local time and
 * `date`/`timestamptz` as UTC, so a timestamp goes back as its local wall clock, the rest as ISO text; bigints as text.
 */
export const whyRequest = (sql: string, row: unknown[], types: number[]): string => WHY + JSON.stringify({
  sql,
  row: row.map((v, i) => (!(v instanceof Date) ? (typeof v === 'bigint' ? String(v) : v) : types[i] !== 1114 ? v.toISOString()
    : `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}.${pad(v.getMilliseconds(), 3)}`)),
});
export type StepsFailure = 'syntax' | 'multi' | 'notSelect' | 'withUnion' | 'window';

/** Clause names are SQL keywords, the same in both languages (the help text is in src/i18n: steps.help.*). */
export const STEP_LABELS: Record<StepKey, string> = {
  from: 'FROM + JOIN', join: 'JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING',
  select: 'SELECT', distinct: 'DISTINCT', order: 'ORDER BY', limit: 'LIMIT',
};

/**
 * v10 N2 (L155): sample rows of one JOIN, keys only. `l` is the left key, `r` the right key it matched, null when the
 * left row found no partner (LEFT JOIN keeps it with NULLs, INNER JOIN drops it). Values are display strings.
 */
export interface JoinMatch { kind: 'inner' | 'left'; left: string; right: string; pairs: { l: string; r: string | null }[] }
/** v10 N1 (L155): up to 3 groups of the GROUP BY step, each with its key (columns joined by " · ") and its real row count. */
export interface GroupSample { key: string; n: number }

/**
 * Steps the Execution order tab draws: clauses the query does not use get no card (ui-ux-v4 §1).
 * Here, not in steps.ts: stepsView is in the main chunk and steps.ts pulls in the lazy SQL parser.
 */
export const shownSteps = <S extends { skipped: boolean }>(steps: S[]): S[] => steps.filter((s) => !s.skipped);
