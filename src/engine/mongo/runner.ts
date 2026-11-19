// Integration (L247): ENG-CORE's LabRunner for MongoDB lessons and the NoSQL path's drills, on ENG-MONGO's MongoLabClient.
// Lazy chunk (LAB_RUNNERS.mongodb); only types from main modules. `lab.setup` = inline lab data (`{"collections": …}`,
// dates as `{"$date": …}`) or a dataset id (`shop`, `path`). A write is graded on the collection as it left it (the worker
// returns it, kind 'write'), on a copy thrown away afterwards like BEGIN … ROLLBACK.
import type { Lab, LabStep } from '../content';
import type { LabEnv, LabOutput, LabRunner, LabVerdict } from '../labs';
import { docsToTable, DEFAULT_DATASET, MongoLabClient } from './client';
import { gradeMongo, type DocGrade } from './grade';
import { LabFailedError, LabTimeoutError, MongoSyntaxError, type MongoResult } from './types';

const TEXT = {
  vi: { timeout: 'Lệnh chạy quá {s} giây nên đã dừng.', failed: 'Không khởi động được MongoDB trong trình duyệt: {d}', at: ' (dòng {l}, cột {c})' },
  en: { timeout: 'The command ran longer than {s} seconds and was stopped.', failed: 'Could not start MongoDB in the browser: {d}', at: ' (line {l}, column {c})' },
};

/** A step's grading extras (the path's covered drills grade `_id` too). */
export interface MongoCheckOpts { strictId?: boolean }
export type MongoLabRunner = LabRunner & {
  check(lab: Lab, step: LabStep, code: string, opts?: MongoCheckOpts): Promise<LabVerdict>;
  exec(lab: Pick<Lab, 'setup'>, code: string): Promise<MongoResult>;
};

const why = (g: DocGrade): LabVerdict => ({ ok: false, reason: 'wrong', why: g.reason ?? 'docs' });

export function mongoRunner(env: Pick<LabEnv, 'lang'>, client: Pick<MongoLabClient, 'exec'> = new MongoLabClient()): MongoLabRunner {
  const exec = async (lab: Pick<Lab, 'setup'>, code: string): Promise<MongoResult> => {
    try {
      return await client.exec(code, lab.setup?.trim() || DEFAULT_DATASET);
    } catch (e) {
      const t = TEXT[env.lang()];
      if (e instanceof MongoSyntaxError) throw new Error(`${e.message}${t.at.replace('{l}', String(e.line)).replace('{c}', String(e.column))}`);
      if (e instanceof LabTimeoutError) throw new Error(t.timeout.replace('{s}', String(e.timeoutMs / 1000)));
      if (e instanceof LabFailedError) throw new Error(t.failed.replace('{d}', e.detail));
      throw e; // MongoRunError: mingo's own message, shown unchanged
    }
  };
  return {
    exec,
    prepare: async (lab) => void (await exec(lab, 'db.x.countDocuments()')),
    run: async (lab, code): Promise<LabOutput> => {
      const r = await exec(lab, code);
      return { ...docsToTable(r), meta: { table: r.collection, count: r.value !== undefined && typeof r.value === 'number' ? r.value : r.docs.length } };
    },
    check: async (lab: Lab, step: LabStep, code: string, opts: MongoCheckOpts = {}): Promise<LabVerdict> => {
      if (step.check !== 'doc') return { ok: false, reason: 'unsupported' };
      const want = await exec(lab, step.solution);
      let got: MongoResult;
      try {
        got = await exec(lab, code);
      } catch (e) {
        return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
      }
      if (want.kind === 'write' && got.kind !== 'write') return { ok: false, reason: 'wrong', why: 'notWrite' };
      if (want.collection !== got.collection) return { ok: false, reason: 'wrong', why: 'collection', params: { want: want.collection } };
      const g = gradeMongo(want, got, { ordered: step.ordered, strictId: opts.strictId });
      return g.ok ? (g.tip ? { ok: true, tip: g.tip } : { ok: true }) : why(g);
    },
  };
}
