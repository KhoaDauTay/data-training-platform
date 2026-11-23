// Mongo lab worker: a thin message loop. mingo, the shell parser and the datasets load lazily (chunk `engineMongo`),
// so this file stays tiny; the build names it worker-*.js, beside PGlite's worker.
import { MongoRunError, MongoSyntaxError, type MongoErrorInfo, type MongoReply, type MongoRequest } from './types';

type Engine = typeof import('./engineMongo');
let engine: Promise<Engine> | undefined;
/** A failed chunk load is dropped, so the next run tries again. */
const load = () =>
  (engine ??= import('./engineMongo').catch((e: unknown) => {
    engine = undefined;
    throw e;
  }));
const post = (m: MongoReply) => postMessage(m);

onmessage = async ({ data }: MessageEvent<MongoRequest>) => {
  try {
    const result = await (await load()).runOnDataset(data.dataset, data.src, data.stages);
    post({ type: 'result', id: data.id, result });
  } catch (e) {
    const error: MongoErrorInfo =
      e instanceof MongoSyntaxError
        ? { type: 'syntax', code: e.code, message: e.message, position: e.position, line: e.line, column: e.column }
        : { type: 'run', code: e instanceof MongoRunError ? e.code : 'worker', message: (e as Error)?.message ?? String(e) };
    post({ type: 'error', id: data.id, error });
  }
};
// The client starts a run's timer only after this, so the chunk download never counts against the time limit.
load().finally(() => post({ type: 'ready' })).catch(() => undefined);
