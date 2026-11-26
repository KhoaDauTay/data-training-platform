import { blocksOf, onPg, type EngineId, type EngineLesson, type SectionId } from './content';
import type { LabOutput } from './labs';
import { splitSql } from './pglab/split';
import type { ScriptResult, ScriptStep } from './pglab/script';

/**
 * v30.1 (F01, L480): the runnable code blocks of an Engine lesson's "Ví dụ" and "Lỗi hay gặp" sections, one grammar for the
 * page (src/ui/engineFull.ts) and for tests/engineAnatomy.test.ts, so the two cannot drift.
 * - Runnable fences: PostgreSQL/design ```sql, MongoDB ```javascript/```js (one mongosh command), DynamoDB ```json (one
 *   `{ op, input }` request) or ```partiql (one statement). ```text and every other fence are shown, never run.
 * - Markers: PostgreSQL `-- ERROR <SQLSTATE>` / `-- WRONG` / `-- FIX` on any line (they are SQL comments and run with the block);
 *   MongoDB/DynamoDB read only the leading `//` or `--` lines (`// ERROR <code>`, `// WRONG`, `// FIX`), stripped before the run.
 * - Data: the lab's `setup`, else frontmatter `demo_setup`, else MongoDB's `shop` dataset (PostgreSQL: an empty database).
 */
export interface DemoBlock {
  sec: SectionId;
  /** The block as written (shown). */
  code: string;
  /** What runs: the whole block (PostgreSQL) or the block without its leading marker lines (MongoDB/DynamoDB). */
  run: string;
  runs: boolean;
  /** `ERROR <code>`: the error the block must end with (SQLSTATE, MongoDB code or DynamoDB exception name). */
  error?: string;
  mark?: 'error' | 'wrong' | 'fix';
}

export const RUN_LANG: Record<EngineId, readonly string[]> = { postgres: ['sql'], design: ['sql'], stack: ['sql'], olap: ['sql'], telemetry: ['sql'], mongodb: ['javascript', 'js'], dynamodb: ['json', 'partiql'], redis: ['redis'] };
export const DEMO_SECS: readonly SectionId[] = ['example', 'pitfalls'];

/** One block of section text, classified (`lang` = the fence's info string). */
export function demoBlock(engine: EngineId, sec: SectionId, lang: string, code: string): DemoBlock {
  const runs = RUN_LANG[engine].includes(lang);
  if (onPg(engine)) {
    const error = /^--\s*ERROR\s+([0-9A-Z]{5})\b/m.exec(code)?.[1];
    const mark = /^--\s*ERROR\b/m.test(code) ? 'error' : /^--\s*WRONG\b/m.test(code) ? 'wrong' : /^--\s*FIX\b/m.test(code) ? 'fix' : undefined;
    return { sec, code, run: code, runs, ...(error !== undefined ? { error } : {}), ...(mark ? { mark } : {}) };
  }
  const lines = code.split('\n');
  let n = 0;
  // v47 (L953): Redis blocks (```redis, several redis-cli lines) mark with a leading `# ERROR <code>` / `# WRONG` / `# FIX`
  while (n < lines.length && /^\s*(\/\/|--|#)/.test(lines[n])) n++;
  const marks = lines.slice(0, n).map((x) => x.replace(/^\s*(\/\/|--|#)\s*/, ''));
  const markOf = (m: string): string | undefined => marks.map((x) => new RegExp(`^${m}\\b\\s*:?\\s*([A-Za-z_0-9]*)`).exec(x)).find(Boolean)?.[1];
  const error = markOf('ERROR');
  const mark = error !== undefined ? 'error' : markOf('WRONG') !== undefined ? 'wrong' : markOf('FIX') !== undefined ? 'fix' : undefined;
  return { sec, code, run: lines.slice(n).join('\n').trim(), runs, ...(error !== undefined ? { error } : {}), ...(mark ? { mark } : {}) };
}

/** The code blocks of "Ví dụ" then "Lỗi hay gặp", in page order (code is identical in VI and EN: lessonProblems). */
export const demoBlocks = (l: EngineLesson, lang: 'vi' | 'en' = 'vi'): DemoBlock[] =>
  l.sections.filter((s) => DEMO_SECS.includes(s.id)).flatMap((s) => blocksOf(s.text[lang]).flatMap((b) => (b.kind === 'code' ? [demoBlock(l.engine, s.id, b.lang, b.code)] : [])));

/** The data a lesson's examples run on (undefined: PostgreSQL's empty database, or DynamoDB with no tables). */
export const demoSetup = (l: Pick<EngineLesson, 'engine' | 'lab' | 'demoSetup'>): string | undefined =>
  l.lab?.setup ?? l.demoSetup ?? (l.engine === 'mongodb' ? 'shop' : undefined);

/** A WRONG block and the FIX right after it run (and show) together: the indexes of `i`'s pair, or `[i]`. */
export const pairOf = (bs: readonly DemoBlock[], i: number): number[] =>
  bs[i].mark === 'wrong' && bs[i + 1]?.mark === 'fix' ? [i, i + 1] : bs[i].mark === 'fix' && bs[i - 1]?.mark === 'wrong' ? [i - 1, i] : [i];

/**
 * PostgreSQL: one fresh database runs every runnable block up to `upto`, statement by statement (an earlier block may create
 * what a later one reads), the last statement of an ERROR block expecting its SQLSTATE, like tests/engineAnatomy.test.ts.
 * `span[i]` = block i's statements in `steps`.
 */
export function pgDemoScript(bs: readonly DemoBlock[], upto: number): { steps: ScriptStep[]; span: [number, number][] } {
  const steps: ScriptStep[] = [];
  const span: [number, number][] = [];
  bs.slice(0, upto + 1).forEach((b, i) => {
    if (!b.runs) return;
    const stmts = splitSql(b.run);
    stmts.forEach((s, j) => steps.push(b.error && j === stmts.length - 1 ? { sql: s, expectError: b.error } : s));
    span[i] = [steps.length - stmts.length, steps.length];
  });
  return { steps, span };
}

export type DemoOut = { result: LabOutput } | { error: unknown };
const err = (e: { message: string }): Error => Object.assign(new Error(e.message), e); // like pgScriptRunner: errorView reads the SQLSTATE
/** Block i's outcome in a script run: the setup's or an unexpected error, its own error (ERROR blocks), else its last result set. */
export function pgDemoOut(r: ScriptResult, span: [number, number]): DemoOut {
  if (r.setupError) return { error: err(r.setupError) };
  const [a, b] = span;
  if (r.failedStep !== undefined && r.failedStep < b) {
    const s = r.steps[r.failedStep];
    return s.error ? { error: err(s.error) } : { result: { columns: s.columns, types: s.types, rows: s.rows, ms: s.ms } }; // an ERROR block that ran: its rows
  }
  const last = r.steps[b - 1];
  if (last?.error) return { error: err(last.error) };
  const s = r.steps.slice(a, b).filter((x) => x.columns.length).at(-1) ?? last;
  return { result: { columns: s.columns, types: s.types, rows: s.rows, ms: s.ms } };
}

/** The code an engine error carries: a SQLSTATE, a MongoDB code or a DynamoDB exception name. */
export const errCode = (e: unknown): string | undefined => {
  const x = e as { code?: unknown; type?: unknown; cause?: { code?: unknown } } | undefined;
  const c = x?.code ?? x?.type ?? x?.cause?.code;
  return typeof c === 'string' || typeof c === 'number' ? String(c) : undefined;
};
