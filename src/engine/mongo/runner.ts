// Integration (L248): ENG-CORE's LabRunner for MongoDB lessons and the NoSQL path's drills, on ENG-MONGO's MongoLabClient.
// Lazy chunk (LAB_RUNNERS.mongodb); only types from main modules. `lab.setup` = inline lab data (`{"collections": …}`,
// dates as `{"$date": …}`) or a dataset id (`shop`, `path`). A write is graded on the collection as it left it (the worker
// returns it, kind 'write'), on a copy thrown away afterwards like BEGIN … ROLLBACK.
// v25 (route R5): a step's `rule` (esr | covered | match-first) is a bar graded by rule, never measured (mingo has no index or
// explain): a right result that breaks the rule does not pass. A step's `error` expects MongoDB to refuse the command with
// that code (MongoRunError/MongoSyntaxError `code`, e.g. `duplicate_key`).
import type { Lab, LabStep } from '../content';
import type { LabEnv, LabOutput, LabRunner, LabVerdict } from '../labs';
import { docsToTable, DEFAULT_DATASET, MongoLabClient } from './client';
import { gradeMongo, type DocGrade } from './grade';
import { followsEsr, isCovered, matchFirst } from './path';
import { LabFailedError, LabTimeoutError, MongoSyntaxError, type MongoResult } from './types';

const RULE = { vi: ' (Chấm theo quy tắc, không đo trên MongoDB thật.)', en: ' (Graded by rule, not measured on a real MongoDB.)' };
const TEXT = {
  vi: {
    timeout: 'Lệnh chạy quá {s} giây nên đã dừng.', failed: 'Không khởi động được MongoDB trong trình duyệt: {d}', at: ' (dòng {l}, cột {c})',
    esr: 'Thứ tự khóa của index chưa theo quy tắc ESR: trường so bằng trước, rồi trường sắp xếp, rồi trường lọc theo khoảng.',
    covered: 'Đúng kết quả, nhưng index chưa phủ được truy vấn: mọi trường lọc và trường trả về phải nằm trong index, và bỏ `_id`.',
    'match-first': 'Đúng kết quả, nhưng `$match` phải đứng trước `$unwind`, `$lookup` và `$group` để các stage nặng đọc ít tài liệu hơn.',
    noError: 'Lệnh này chạy được. Bước này muốn thấy MongoDB từ chối nó với lỗi `{c}`.',
    otherError: 'MongoDB báo lỗi `{got}`, còn bước này muốn lỗi `{c}`.',
  },
  en: {
    timeout: 'The command ran longer than {s} seconds and was stopped.', failed: 'Could not start MongoDB in the browser: {d}', at: ' (line {l}, column {c})',
    esr: 'The index keys do not follow the ESR rule: equality fields first, then sort fields, then range fields.',
    covered: 'The result is right, but the index does not cover the query: every filtered and returned field must be in the index, and `_id` must be dropped.',
    'match-first': 'The result is right, but `$match` must come before `$unwind`, `$lookup` and `$group`, so the heavy stages read fewer documents.',
    noError: 'This command runs. This step wants to see MongoDB refuse it with the error `{c}`.',
    otherError: 'MongoDB answered with the error `{got}`, but this step wants `{c}`.',
  },
};

/** A step's grading extras (the path's covered drills grade `_id` too). */
export interface MongoCheckOpts { strictId?: boolean }
export type MongoLabRunner = LabRunner & {
  check(lab: Lab, step: LabStep, code: string, opts?: MongoCheckOpts): Promise<LabVerdict>;
  exec(lab: Pick<Lab, 'setup'>, code: string, stages?: boolean): Promise<MongoResult>;
};

const why = (g: DocGrade): LabVerdict => ({ ok: false, reason: 'wrong', why: g.reason ?? 'docs' });
/** Whether code follows a step's rule (the Solution must; tests/engineIntegration.test.ts also proves each `slow:` breaks it). */
export function followsRule(step: Pick<LabStep, 'rule' | 'target' | 'index'>, code: string): boolean {
  try {
    if (step.rule === 'esr') return followsEsr(step.target ?? '', code);
    if (step.rule === 'covered') return isCovered(code, step.index ?? '{}');
    if (step.rule === 'match-first') return matchFirst(code);
  } catch {
    return false;
  }
  return true;
}

export function mongoRunner(env: Pick<LabEnv, 'lang'>, client: Pick<MongoLabClient, 'exec'> = new MongoLabClient()): MongoLabRunner {
  const exec = async (lab: Pick<Lab, 'setup'>, code: string, stages?: boolean): Promise<MongoResult> => {
    try {
      return await client.exec(code, lab.setup?.trim() || DEFAULT_DATASET, stages);
    } catch (e) {
      const t = TEXT[env.lang()];
      if (e instanceof MongoSyntaxError) throw Object.assign(new Error(`${e.message}${t.at.replace('{l}', String(e.line)).replace('{c}', String(e.column))}`), { code: e.code });
      if (e instanceof LabTimeoutError) throw new Error(t.timeout.replace('{s}', String(e.timeoutMs / 1000)));
      if (e instanceof LabFailedError) throw new Error(t.failed.replace('{d}', e.detail));
      throw e; // MongoRunError: mingo's own message, shown unchanged
    }
  };
  return {
    exec,
    prepare: async (lab) => void (await exec(lab, 'db.x.countDocuments()')),
    run: async (lab, code): Promise<LabOutput> => {
      const r = await exec(lab, code, true);
      return {
        ...docsToTable(r),
        meta: { table: r.collection, count: r.value !== undefined && typeof r.value === 'number' ? r.value : r.docs.length, ...(r.stages ? { pipeline: r.stages } : {}) },
      };
    },
    check: async (lab: Lab, step: LabStep, code: string, opts: MongoCheckOpts = {}): Promise<LabVerdict> => {
      if (step.check !== 'doc') return { ok: false, reason: 'unsupported' };
      const t = TEXT[env.lang()];
      if (step.error) {
        try {
          await exec(lab, code);
        } catch (e) {
          const got = (e as { code?: unknown }).code;
          return got === step.error ? { ok: true } : { ok: false, reason: 'wrong', message: t.otherError.replace('{got}', String(got ?? '?')).replace('{c}', step.error) };
        }
        return { ok: false, reason: 'wrong', message: t.noError.replace('{c}', step.error) };
      }
      const ruleFail: LabVerdict = { ok: false, reason: 'wrong', message: t[step.rule as 'esr'] + RULE[env.lang()] };
      // ESR grades the key order alone: any order inside a group is right, so comparing index lists would refuse a valid answer.
      if (step.rule === 'esr') return followsRule(step, code) ? { ok: true } : ruleFail;
      const want = await exec(lab, step.solution);
      let got: MongoResult;
      try {
        got = await exec(lab, code);
      } catch (e) {
        return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
      }
      if (want.kind === 'write' && got.kind !== 'write') return { ok: false, reason: 'wrong', why: 'notWrite' };
      if (want.collection !== got.collection) return { ok: false, reason: 'wrong', why: 'collection', params: { want: want.collection } };
      // covered: an extra `_id` is the usual miss; the rule (not a doc mismatch) refuses it, so the learner reads why.
      const g = gradeMongo(want, got, { ordered: step.ordered, strictId: opts.strictId });
      if (!g.ok) return why(g);
      if (step.rule && !followsRule(step, code)) return ruleFail;
      return g.tip ? { ok: true, tip: g.tip } : { ok: true };
    },
  };
}
