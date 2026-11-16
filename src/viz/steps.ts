import type { PGlite } from '@electric-sql/pglite';

export type StepsResult = { ok: false; reason: string; detail?: string };
export async function runSteps(_db: PGlite, _sql: string): Promise<StepsResult> {
  return { ok: false, reason: 'notSelect' };
}
