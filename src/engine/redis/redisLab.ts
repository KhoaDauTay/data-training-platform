// v47 R1 (L952–L955): ENG-CORE's LabRunner for Redis lessons, on the pure-TS interpreter (./interpreter, Valkey 8.1 wording).
// Lazy chunk `redisLab` (LAB_RUNNERS.redis), main thread, no worker: no Lua, no blocking, every command is O(n) on lesson-sized
// data. Only types from main modules.
// Every run = a fresh keyspace at the in-game clock + `lab.setup` + the earlier steps' Solutions (like replayOf on Postgres).
// Script lines: redis-cli lines; blank lines and `#` comment lines are skipped; `@advance <ms>` moves the virtual clock and
// `@client <n>` switches the client that sends the next lines (WATCH races). Directives are read in setup, Solutions and the
// lesson's examples; typed in a lab editor they go to the server like any line, which answers "unknown command".
import type { Lab, LabStep } from '../content';
import type { LabOutput, LabRunner, LabVerdict } from '../labs';
import { format, RedisSim, type Reply } from './interpreter';
import { parseLine } from './parse';

const TEXT = {
  vi: {
    empty: 'Chưa có lệnh nào để chấm.',
    reply: 'Câu trả lời của dòng cuối chưa đúng: máy trả `{got}`.',
    after: 'Lệnh chạy được, nhưng dữ liệu sau đó chưa đúng: `{after}` trả `{got}`.',
    ttl: 'Thời gian sống chưa đúng: sau {s} giây nữa, `{cmd}` trả {got}, bước này cần {want}.',
    noError: 'Lệnh này chạy được. Bước này muốn thấy Redis từ chối nó với lỗi `{c}`.',
    otherError: 'Redis báo lỗi `{got}`, còn bước này muốn lỗi `{c}`.',
    errorLast: 'Dòng cuối báo lỗi: {got}',
  },
  en: {
    empty: 'There is no command to grade yet.',
    reply: 'The last line\'s reply is not right yet: the server answered `{got}`.',
    after: 'The commands ran, but the data afterwards is not right yet: `{after}` answers `{got}`.',
    ttl: 'The time to live is not right yet: {s} seconds later, `{cmd}` answers {got}, this step needs {want}.',
    noError: 'This command runs. This step wants to see Redis refuse it with the error `{c}`.',
    otherError: 'Redis answered with the error `{got}`, but this step wants `{c}`.',
    errorLast: 'The last line failed: {got}',
  },
};
const fill = (s: string, p: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (_, k: string) => String(p[k] ?? ''));

export interface Line { cmd: string; reply: Reply; client: number }
/** One script on `db`: replies in order. `directives` = read `@advance`/`@client` (setup, Solutions, examples). */
export function runScript(db: RedisSim, text: string, directives = true): Line[] {
  const out: Line[] = [];
  let client = 0;
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const d = directives ? /^@(advance|client)\s+(\d+)$/.exec(line) : null;
    if (d) {
      if (d[1] === 'advance') db.advance(Number(d[2]));
      else client = Number(d[2]);
      continue;
    }
    out.push({ cmd: line, reply: db.exec(line, client), client });
  }
  return out;
}

/** The keyspace a step starts from: setup + the Solutions of the steps before `step`. */
export function freshFor(lab: Pick<Lab, 'setup' | 'steps'>, step = 0): RedisSim {
  const db = new RedisSim();
  runScript(db, lab.setup ?? '');
  for (const s of lab.steps.slice(0, step)) runScript(db, s.solution);
  return db;
}

/** Commands whose array reply has no defined order in Redis (hash/set iteration order): graded as a multiset. */
const UNORDERED = new Set(['keys', 'smembers', 'sinter', 'sunion', 'sdiff', 'hkeys', 'hvals', 'hgetall', 'scan']);
const nameOf = (cmd: string): string => (parseLine(cmd)?.[0] ?? '').toLowerCase();
/** A reply as a comparable string; `free` = array elements as a multiset (HGETALL as field/value pairs). */
function key(r: Reply, free = false, pairs = false): string {
  if (r.t !== 'arr' || !free) return format(r);
  const parts = pairs ? r.v.flatMap((x, i) => (i % 2 ? [] : [`${format(x)}=${format(r.v[i + 1])}`])) : r.v.map((x) => format(x));
  return `[${parts.sort().join('|')}]`;
}
/** `like` = the Solution's line: its command decides the order rule, so both sides are compared the same way. */
const replyKey = (l: Line, ordered: boolean, like: Line = l): string => {
  const n = nameOf(like.cmd);
  return key(l.reply, !ordered && UNORDERED.has(n), n === 'hgetall');
};

/** The output table: one row per printed line (redis-cli text), the command beside its first line. */
export function toTable(lines: Line[]): LabOutput {
  const rows = lines.flatMap((l) => format(l.reply).split('\n').map((t, i) => [i ? '' : `${l.client ? `[${l.client}] ` : ''}${l.cmd}`, t.replace(/^ +/, (s) => ' '.repeat(s.length))]));
  return { columns: ['command', 'reply'], types: [], rows };
}

/** An error reply's code, the word redis-cli prints after `(error)` (ERR, WRONGTYPE, EXECABORT…). */
const codeOf = (r: Reply): string | undefined => (r.t === 'err' && !r.cli ? r.v.split(' ')[0] : undefined);

export function redisRunner(env: { lang(): 'vi' | 'en' }): LabRunner {
  const t = () => TEXT[env.lang()];
  return {
    prepare: async (lab) => {
      const bad = runScript(new RedisSim(), lab.setup ?? '').find((l) => l.reply.t === 'err');
      if (bad) throw new Error(`setup: ${bad.cmd} → ${format(bad.reply)}`);
    },
    // `step` undefined = a lesson example (directives allowed, fresh setup); a lab editor passes its step index.
    run: async (lab, code, step) => {
      const lines = runScript(freshFor(lab, step ?? 0), code, step === undefined);
      const last = lines.at(-1);
      if (last && last.reply.t === 'err') {
        // redis-cli keeps going after an error; the page shows a failed last line as an error (the expected-error examples need its code)
        throw Object.assign(new Error(lines.map((l) => `> ${l.cmd}\n${format(l.reply)}`).join('\n')), { code: codeOf(last.reply) ?? 'ERR' });
      }
      return toTable(lines);
    },
    check: async (lab, step: LabStep, code): Promise<LabVerdict> => {
      if (step.check !== 'doc') return { ok: false, reason: 'unsupported' };
      const i = Math.max(0, lab.steps.indexOf(step));
      const mine = freshFor(lab, i);
      const got = runScript(mine, code, false);
      const last = got.at(-1);
      if (!last) return { ok: false, reason: 'wrong', message: t().empty };
      if (step.error) {
        const c = codeOf(last.reply);
        if (!c) return { ok: false, reason: 'wrong', message: fill(t().noError, { c: step.error }) };
        return c === step.error ? { ok: true } : { ok: false, reason: 'wrong', message: fill(t().otherError, { got: c, c: step.error }) };
      }
      const ref = freshFor(lab, i);
      const want = runScript(ref, step.solution).at(-1)!;
      if (replyKey(last, step.ordered, want) !== replyKey(want, step.ordered)) {
        const msg = last.reply.t === 'err' ? fill(t().errorLast, { got: format(last.reply) }) : fill(t().reply, { got: format(last.reply).split('\n')[0] });
        return { ok: false, reason: 'wrong', message: msg };
      }
      const adv = step.expect?.advance ?? 0;
      if (adv) { mine.advance(adv); ref.advance(adv); }
      if (step.after) {
        const a = runScript(mine, step.after, false), b = runScript(ref, step.after, false);
        const bad = a.findIndex((x, k) => replyKey(x, step.ordered, b[k]) !== replyKey(b[k], step.ordered));
        if (bad >= 0) return { ok: false, reason: 'wrong', message: fill(t().after, { after: a[bad].cmd, got: format(a[bad].reply).split('\n')[0] }) };
      }
      for (const unit of ['ttl', 'pttl'] as const) {
        const w = step.expect?.[unit];
        if (w === undefined) continue;
        const cmd = `${unit.toUpperCase()} ${step.target ?? ''}`;
        const r = mine.exec(cmd);
        if (r.t !== 'int' || r.v !== w) return { ok: false, reason: 'wrong', message: fill(t().ttl, { s: adv / 1000, cmd, got: format(r), want: `(integer) ${w}` }) };
      }
      return { ok: true };
    },
  };
}
