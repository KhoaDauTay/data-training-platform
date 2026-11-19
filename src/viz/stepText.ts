export type StepKey = 'from' | 'join' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit';
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
