// v47 R1 (L1015–L1016): ENG-CORE's LabRunner for the search track's Elasticsearch-style labs, on BoonData's interpreter (./es).
// Lazy chunk `esLab` (from LAB_RUNNERS.search when the lab's data is a JSON index), main thread, no worker: reads only, every
// request is O(documents × terms) on lesson-sized data. Only types from main modules.
// A step is `check: rows`: the player's request and the Solution run on the same index; hits are compared by `_id` and `_score`
// (4 decimals), buckets by key and counts, `_analyze` by token and position, `_mapping` by field and type; a multiset unless
// `ordered`. A fuzzy request is compared by its documents only (the simulator's fuzzy scores are not Lucene's).
import type { Lab, LabStep } from '../content';
import type { LabOutput, LabRunner, LabVerdict } from '../labs';
import type { ScriptResult, ScriptStep, StepResult } from '../pglab/script';
import { buildIndex, EsError, run, type EsIndex, type EsResult } from './es';

const TEXT = {
  vi: {
    empty: 'Chưa có request nào để chấm.',
    kind: 'Bước này cần {want}, còn request của bạn trả {got}.',
    count: 'Request chạy được nhưng trả {got} dòng; bước này cần {want}.',
    docs: 'Request chạy được nhưng danh sách tài liệu chưa đúng: có `{id}` không đúng chỗ.',
    scores: 'Đúng các tài liệu, nhưng điểm `_score` khác lời giải (ví dụ `{id}`: {got} thay vì {want}). Xem lại phần nào tính điểm, phần nào chỉ lọc.',
    order: 'Đúng các dòng, nhưng thứ tự chưa đúng.',
    rows: 'Request chạy được nhưng kết quả khác lời giải ở dòng `{row}`.',
    error: 'Request bị từ chối: {code}: {msg}',
    kinds: { hits: 'danh sách tài liệu (hits)', aggs: 'bảng nhóm (aggregation)', tokens: 'danh sách token (_analyze)', mapping: 'mapping (_mapping)' },
  },
  en: {
    empty: 'There is no request to grade yet.',
    kind: 'This step needs {want}, but your request returns {got}.',
    count: 'The request runs but returns {got} rows; this step needs {want}.',
    docs: 'The request runs but the list of documents is not right yet: `{id}` is not where it should be.',
    scores: 'The right documents, but `_score` differs from the solution (for example `{id}`: {got} instead of {want}). Check which part scores and which part only filters.',
    order: 'The right rows, but not in the right order.',
    rows: 'The request runs but its result differs from the solution at row `{row}`.',
    error: 'The request was refused: {code}: {msg}',
    kinds: { hits: 'a list of documents (hits)', aggs: 'a bucket table (aggregation)', tokens: 'a token list (_analyze)', mapping: 'a mapping (_mapping)' },
  },
};
const fill = (s: string, p: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (_, k: string) => String(p[k] ?? ''));

/** One index per setup text (requests never write, so a lab's index is built once). */
const built = new Map<string, EsIndex>();
export const indexOf = (setup: string | undefined): EsIndex => {
  const k = setup ?? '';
  let ix = built.get(k);
  if (!ix) built.set(k, ix = buildIndex(k));
  return ix;
};

export const toOutput = (r: EsResult, ms = 0): LabOutput => ({ columns: r.columns, types: [], rows: r.rows, ms });
/** "Tables used" asks the lab for information_schema (engineView TABLES_SQL); here the answer is the index and its fields. */
const TABLES = /^SELECT c\.table_name::text AS t\b/;

/** Grades `mine` against the Solution's result `want`: undefined = the same. */
export function compare(want: EsResult, mine: EsResult, ordered: boolean, lang: 'vi' | 'en'): string | undefined {
  const t = TEXT[lang];
  if (want.kind !== mine.kind) return fill(t.kind, { want: t.kinds[want.kind], got: t.kinds[mine.kind] });
  const approx = want.approx || mine.approx;
  const keyOf = (r: EsResult, i: number): string => (approx && r.kind === 'hits' ? String(r.rows[i][0]) : r.keys[i]);
  const a = want.rows.map((_, i) => keyOf(want, i)), b = mine.rows.map((_, i) => keyOf(mine, i));
  if (a.length !== b.length) return fill(t.count, { got: b.length, want: a.length });
  if (a.join('\n') === b.join('\n')) return undefined;
  const sa = [...a].sort().join('\n'), sb = [...b].sort().join('\n');
  if (sa === sb) return ordered ? t.order : undefined;
  if (want.kind === 'hits') {
    const ids = (r: EsResult) => r.rows.map((x) => String(x[0]));
    const wi = ids(want), mi = ids(mine);
    const stray = mi.find((x, i) => (ordered ? wi[i] !== x : !wi.includes(x)));
    if (stray === undefined || [...wi].sort().join() === [...mi].sort().join()) {
      const id = wi.find((x) => want.rows.find((r) => r[0] === x)?.[1] !== mine.rows.find((r) => r[0] === x)?.[1]) ?? wi[0];
      return fill(t.scores, { id, got: String(mine.rows.find((r) => r[0] === id)?.[1]), want: String(want.rows.find((r) => r[0] === id)?.[1]) });
    }
    return fill(t.docs, { id: stray });
  }
  return fill(t.rows, { row: (ordered ? b.find((x, i) => x !== a[i]) : b.find((x) => !a.includes(x))) ?? b[0] });
}

const errInfo = (e: unknown): { message: string; code?: string } => (e instanceof EsError ? { message: e.message, code: e.code } : { message: String((e as Error)?.message ?? e) });

export function esRunner(env: { lang(): 'vi' | 'en' }): LabRunner {
  const t = () => TEXT[env.lang()];
  const exec = (lab: Pick<Lab, 'setup'>, code: string): EsResult => run(indexOf(lab.setup), code);
  return {
    prepare: async (lab) => { indexOf(lab.setup); },
    run: async (lab, code) => {
      const t0 = performance.now();
      if (TABLES.test(code.trim())) {
        const ix = indexOf(lab.setup);
        return { columns: ['t', 'cols'], types: [], rows: [[ix.name, [...ix.fields.values()].map((x) => `${x.def.path} ${x.def.type}`).join(', ')]] };
      }
      return toOutput(exec(lab, code), Math.round(performance.now() - t0));
    },
    demo: async (setup, steps: ScriptStep[]): Promise<ScriptResult> => {
      const out: StepResult[] = [];
      let failedStep: number | undefined;
      for (const [i, st] of steps.entries()) {
        const sql = typeof st === 'string' ? st : st.sql;
        const expectError = typeof st === 'string' ? undefined : st.expectError;
        const base = { sql, notices: [], ms: 0, columns: [] as string[], types: [] as number[], rows: [] as unknown[][] };
        try {
          const r = exec({ setup }, sql);
          out.push({ ...base, status: 'ok', columns: r.columns, rows: r.rows });
          if (expectError && failedStep === undefined) failedStep = i;
        } catch (e) {
          const error = errInfo(e);
          out.push({ ...base, status: 'error', error });
          if ((!expectError || error.code !== expectError) && failedStep === undefined) failedStep = i;
        }
      }
      return { steps: out, checks: [], ok: failedStep === undefined, failedStep, bootMs: 0, ms: 0 };
    },
    check: async (lab, step: LabStep, code): Promise<LabVerdict> => {
      if (step.check !== 'rows') return { ok: false, reason: 'unsupported' };
      if (!code.trim()) return { ok: false, reason: 'wrong', message: t().empty };
      const want = exec(lab, step.solution);
      let mine: EsResult;
      try {
        mine = exec(lab, code);
      } catch (e) {
        const x = errInfo(e);
        return { ok: false, reason: 'error', message: fill(t().error, { code: x.code ?? 'error', msg: x.message }) };
      }
      const msg = compare(want, mine, step.ordered, env.lang());
      return msg ? { ok: false, reason: 'wrong', message: msg } : { ok: true };
    },
  };
}
