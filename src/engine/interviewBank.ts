import type { Bi, EngineId } from './content';

/**
 * v27 (L411, design-v27 §2): the Database Engine interview bank (content/engine/iv-<engine>.yml, one lazy chunk per engine),
 * pure: parsing, sets and self-scoring. Answers are written and self-graded against a model answer and a rubric: nothing
 * here grades a query, and `calc.expr` strings are never evaluated by the app (only tests/engineInterview.test.ts runs them).
 */
export const BANDS = ['junior', 'mid', 'senior', 'staff'] as const;
export type Band = (typeof BANDS)[number];
export type IvKind = 'concept' | 'diagnose' | 'design';
export type ExhibitSource = 'pglite-0.5.16' | 'mongodb-docs' | 'illustrative' | 'aws-rules';
export interface Exhibit { label: Bi; source: ExhibitSource; shown: string; fixture?: string; setup?: string; sql?: string; url?: string; calc?: { expr: string; expect: number }[] }
export interface IvQuestion { id: string; engine: EngineId; band: Band; kind: IvKind; set: string; q: Bi; answer: Bi; rubric: Bi[]; exhibits: Exhibit[]; tradeoffs: Bi[]; doc: string }
export interface TakeHome { id: string; engine: EngineId; band: Band; title: Bi; brief: Bi; fixture?: string; queries: string[]; deliverables: Bi[]; model: Bi; rubric: Bi[]; doc: string }
export interface Bank { fixtures: Record<string, string>; questions: IvQuestion[]; takeHomes: TakeHome[] }

export const CODE: Record<EngineId, 'pg' | 'mg' | 'dy'> = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy' };
const ENGINE_OF: Record<string, EngineId> = { pg: 'postgres', mg: 'mongodb', dy: 'dynamodb' };
/** Sets per engine and band (design-v27 Q6: 3 × 5 questions; tests/engineInterview.test.ts checks the YAML has exactly these). */
export const SETS_PER_BAND = 3;
/** Suggested minutes per set, by band (a constant, not a YAML field: design-v27 §2.2). */
export const SET_MINUTES: Record<Band, number> = { junior: 15, mid: 20, senior: 25, staff: 30 };
/** A question scored below this share of its rubric comes back for review (design-v27 Q9). */
export const PASS = 0.6;

export const setsOf = (e: EngineId, b: Band): string[] => Array.from({ length: SETS_PER_BAND }, (_, i) => `${CODE[e]}-${b}-${i + 1}`);
export const ALL_SETS: string[] = (['postgres', 'mongodb', 'dynamodb'] as const).flatMap((e) => BANDS.flatMap((b) => setsOf(e, b)));
/** `pg-mid-2` → its engine and band; undefined for anything else. */
export function setOf(id: string): { engine: EngineId; band: Band; n: number } | undefined {
  const m = /^(pg|mg|dy)-(junior|mid|senior|staff)-([1-9])$/.exec(id);
  return m && +m[3] <= SETS_PER_BAND ? { engine: ENGINE_OF[m[1]], band: m[2] as Band, n: +m[3] } : undefined;
}
/** The engine of a question or take-home id (`e-iv-pg-…`). */
export const engineOfId = (id: string): EngineId | undefined => ENGINE_OF[/^e-iv-(pg|mg|dy)-/.exec(id)?.[1] ?? ''];

const bi = (x: unknown, what: string): Bi => {
  const o = x as Bi;
  if (!o || typeof o.vi !== 'string' || typeof o.en !== 'string') throw new Error(`interview bank: ${what}`);
  return { vi: o.vi, en: o.en };
};
const list = <T>(x: unknown, f: (y: unknown, i: number) => T): T[] => (Array.isArray(x) ? x.map(f) : []);

/** One engine's YAML; throws on a broken entry (the page shows its load failure and Retry). */
export function parseBank(raw: unknown): Bank {
  const r = raw as Record<string, unknown>;
  if (!r || !Array.isArray(r.questions)) throw new Error('interview bank: no questions');
  const questions = r.questions.map((x: Record<string, unknown>): IvQuestion => {
    const id = String(x.id);
    if (!/^e-iv-(pg|mg|dy)-(junior|mid|senior|staff)-\d\d$/.test(id) || !setOf(String(x.set))) throw new Error(`interview bank: ${id}`);
    return {
      id, engine: x.engine as EngineId, band: x.band as Band, kind: x.kind as IvKind, set: String(x.set),
      q: bi(x.q, `${id} q`), answer: bi(x.answer, `${id} answer`), rubric: list(x.rubric, (y) => bi(y, `${id} rubric`)), doc: String(x.doc ?? ''),
      tradeoffs: list(x.tradeoffs, (y) => bi(y, `${id} tradeoffs`)),
      exhibits: list(x.exhibits, (y) => {
        const e = y as Record<string, unknown>;
        return {
          label: bi(e.label, `${id} exhibit`), source: e.source as ExhibitSource, shown: String(e.shown ?? ''),
          ...(typeof e.fixture === 'string' ? { fixture: e.fixture } : {}), ...(typeof e.setup === 'string' ? { setup: e.setup } : {}),
          ...(typeof e.sql === 'string' ? { sql: e.sql } : {}), ...(typeof e.url === 'string' ? { url: e.url } : {}),
          ...(Array.isArray(e.calc) ? { calc: (e.calc as { expr: unknown; expect: unknown }[]).map((c) => ({ expr: String(c.expr), expect: Number(c.expect) })) } : {}),
        };
      }),
    };
  });
  const takeHomes = list(r.takeHomes, (y): TakeHome => {
    const x = y as Record<string, unknown>;
    const id = String(x.id);
    if (!/^e-iv-(pg|mg|dy)-th-\d$/.test(id)) throw new Error(`interview bank: ${id}`);
    return {
      id, engine: x.engine as EngineId, band: x.band as Band, title: bi(x.title, `${id} title`), brief: bi(x.brief, `${id} brief`),
      ...(typeof x.fixture === 'string' ? { fixture: x.fixture } : {}), queries: list(x.queries, String),
      deliverables: list(x.deliverables, (z) => bi(z, `${id} deliverable`)), model: bi(x.model, `${id} model`),
      rubric: list(x.rubric, (z) => bi(z, `${id} rubric`)), doc: String(x.doc ?? ''),
    };
  });
  const fixtures = r.fixtures && typeof r.fixtures === 'object' ? (r.fixtures as Record<string, string>) : {};
  return { fixtures, questions, takeHomes };
}

/** A set's questions in bank order. */
export const setQuestions = (bank: Bank, set: string): IvQuestion[] => bank.questions.filter((q) => q.set === set);
/** The SQL a `pglite-0.5.16` exhibit runs on a fresh database: the fixture, its setup (split on `;` by the runner), then `sql`. */
export const exhibitScript = (bank: Bank, x: Exhibit): { setup: string; sql: string } | undefined =>
  x.source === 'pglite-0.5.16' && x.fixture && x.sql && bank.fixtures[x.fixture] !== undefined
    ? { setup: `${bank.fixtures[x.fixture]}\n${x.setup ?? ''}`, sql: x.sql } : undefined;
