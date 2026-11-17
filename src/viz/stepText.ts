export type StepKey = 'from' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit';
export type StepsFailure = 'syntax' | 'multi' | 'notSelect' | 'withUnion' | 'window';

/** Clause names are SQL keywords, the same in both languages (the help text is in src/i18n: steps.help.*). */
export const STEP_LABELS: Record<StepKey, string> = {
  from: 'FROM + JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING',
  select: 'SELECT', distinct: 'DISTINCT', order: 'ORDER BY', limit: 'LIMIT',
};

/**
 * Steps the Execution order tab draws: clauses the query does not use get no card (ui-ux-v4 §1).
 * Here, not in steps.ts: stepsView is in the main chunk and steps.ts pulls in the lazy SQL parser.
 */
export const shownSteps = <S extends { skipped: boolean }>(steps: S[]): S[] => steps.filter((s) => !s.skipped);
