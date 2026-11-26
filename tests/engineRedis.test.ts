// v47 R1 (L950–L969): the Redis track, `e-rd-l<n>-NN`, labs on BoonData's interpreter (src/engine/redis/, Valkey 8.1 wording).
// Anatomy as the NoSQL L1–L2 lessons (tests/engineAnatomy.test.ts R6) and the data stack (tests/engineStack.test.ts):
// concept = Mở bài · Ý chính · Ví dụ · Lỗi hay gặp · Tóm tắt; lab/capstone = + Cú pháp · Thực hành, 3–6 steps; ≥ 2 questions,
// ≥ 1 trap; VI length concept ≥ 500 / lab ≥ 350 words; code lines ≤ 40 characters; lesson data ASCII only (redis-cli prints
// other bytes as \xHH). Runs: every ```redis block of Ví dụ and Lỗi hay gặp on a fresh keyspace after the setup (or
// demo_setup), `# ERROR <code>` must end with that error, `# WRONG` needs a `# FIX` right after with another output.
// Lab steps: the Solution passes its own check, `PING` (a no-op) never does; a Solution that ends in a write is graded on an
// `after:` read or on `expect: { ttl | pttl }`, never on its OK alone.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, lessonProblems, parseEngineLesson, parseModules, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { demoBlocks, demoSetup, errCode, type DemoBlock } from '../src/engine/demo';
import { gradable, honestOf, honestRow, LAB_RUNNERS } from '../src/engine/labs';
import { format, RedisSim } from '../src/engine/redis/interpreter';
import { redisRunner, runScript } from '../src/engine/redis/redisLab';
import { engineHash, enginePlayOf, engineRouteOf } from '../src/route';
import { ENGINE_ID } from '../src/save';
import { badges, levelsOf } from '../src/mastery';

const files = import.meta.glob<string>('../content/engine/redis/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/redis/modules.yml', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));
const runner = redisRunner({ lang: () => 'vi' });

/** R1 plan (tools/v47 content-gaps §E1, cut to L1–L2 by the coordinator): 7 + 6 lessons. */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['lab', 'lab', 'lab', 'lab', 'lab', 'lab', 'lab'],
  L2: ['lab', 'lab', 'lab', 'lab', 'concept', 'capstone'],
};
const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: Partial<Record<EngineLesson['kind'], SectionId[]>> = {
  concept: ['open', 'idea', 'example', 'pitfalls', 'recap'],
  lab: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
  capstone: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
};
/** Commands that only read: a Solution ending in anything else is a write and needs `after:` or a ttl/pttl expectation. */
const READS = new Set(['get', 'mget', 'strlen', 'exists', 'ttl', 'pttl', 'type', 'keys', 'scan', 'dbsize', 'hget', 'hgetall', 'hkeys', 'hvals', 'hlen',
  'hexists', 'llen', 'lrange', 'smembers', 'sismember', 'scard', 'sinter', 'sunion', 'zrange', 'zrevrange', 'zrank', 'zrevrank', 'zscore', 'zcard',
  'zrangebyscore', 'ping', 'echo', 'exec']);
const text = (l: EngineLesson, id: SectionId) => l.sections.find((s) => s.id === id)?.text;
const words = (l: EngineLesson): number => l.sections.map((s) => s.text.vi.replace(/```[\s\S]*?```/g, '')).join(' ').split(/\s+/).filter(Boolean).length;
const isTrap = (b: DemoBlock): boolean => b.mark === 'error' || b.mark === 'wrong';
const lastCmd = (sol: string): string => sol.split('\n').map((x) => x.trim()).filter((x) => x && !/^[#@]/.test(x)).at(-1)!.split(/\s+/)[0].toLowerCase();

describe('Redis R1: wiring (ids, routes, Save, badges, runner)', () => {
  it('ids e-rd-…, routes, ENGINE_ID, #/engine/play, badges L1–L2 only', () => {
    expect(engineRouteOf('#/engine/redis/l2/e-rd-l2-01')).toEqual({ engine: 'redis', level: 'L2', lesson: 'e-rd-l2-01' });
    expect(engineHash('redis', 'L1', 'e-rd-l1-01')).toBe('#/engine/redis/L1/e-rd-l1-01');
    expect(enginePlayOf('#/engine/play/e-rd-l1-03')).toBe('#/engine/redis/L1/e-rd-l1-03');
    expect(ENGINE_ID.test('e-rd-l1-01')).toBe(true);
    expect(levelsOf('redis')).toEqual(['L1', 'L2']);
    const b = badges({ parts: [], levels: new Map(), foundation: [], perf: [], completed: new Set(), engines: {}, domains: [] });
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'redis').map((x) => x.id)).toEqual(['redis-L1', 'redis-L2']);
    expect(LAB_RUNNERS.redis).toBeTypeOf('function');
  });
  it('the runner: replay, directives only outside the editor, an error last line throws with its code', async () => {
    const lab = { setup: 'SET n 1\n@advance 1000\n# a comment', steps: [{ solution: 'INCR n' }, { solution: 'GET n' }] } as unknown as EngineLesson['lab'] & object;
    expect((await runner.run(lab, 'GET n', 1)).rows).toEqual([['GET n', '"2"']]);
    expect((await runner.run(lab, '@advance 5\nPING', 0)).rows[0][1]).toBe("(error) ERR unknown command '@advance', with args beginning with: '5' ");
    await expect(runner.run(lab, 'LPUSH n x')).rejects.toMatchObject({ code: 'WRONGTYPE' });
    const db = new RedisSim();
    expect(runScript(db, 'SET k v\n@client 1\nGET k').map((l) => [l.client, format(l.reply)])).toEqual([[0, 'OK'], [1, '"v"']]);
  });
});

describe('Redis R1: lessons, modules, content rules', () => {
  it('13 lessons of the plan, ids e-rd-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-rd-l[12]-\d\d$/.test(x.l.id) && x.l.engine === 'redis')).toBe(true);
  });
  it('modules.yml: every module named VI/EN and used', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: content rules, honest chip, one rd- figure', (_, l) => {
    expect(lessonProblems(l, ids)).toEqual([]);
    expect(honestRow(l)).toBe(honestOf(l));
    if (l.runtime === 'docs') expect(l.lab).toBeUndefined();
    else {
      expect(honestOf(l)).toBe('redis');
      for (const s of l.lab!.steps) expect(gradable(l, s)).toBe(true);
    }
    expect((l.figures ?? []).filter((f) => f.name.startsWith('rd-')).length).toBe(1);
  });
  it.each(all.map((x) => [x.l.id, x.raw, x.l] as const))('%s: code lines ≤ 40 characters, lesson data ASCII only', (_, raw, l) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const code = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n'));
    expect(code.filter((x) => [...x].length > 40)).toEqual([]);
    const data = [...code, l.lab?.setup ?? '', l.demoSetup ?? '', ...(l.lab?.steps ?? []).flatMap((s) => [s.solution, s.after ?? ''])].join('\n');
    expect(data.match(/[^\x20-\x7e\n]/g) ?? []).toEqual([]);
  });
});

describe('Redis R1: anatomy', () => {
  it.each(all.map((x) => [x.l.id, x] as const))('%s: sections, order, questions with a trap, balanced options', (_, { l, fm }) => {
    const sec = l.sections.map((s) => s.id);
    expect(sec).toEqual([...sec].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect((NEED[l.kind] ?? []).filter((k) => !sec.includes(k)), 'missing section').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 sentences').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(p.split(/\s+/).filter(Boolean).length, `Ý chính > 150 words: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    const syntax = text(l, 'syntax');
    if (syntax) expect(blocksOf(syntax.vi)[0]?.kind, 'Cú pháp opens with a code block').toBe('code');
    for (const lang of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lang]);
      expect(recap.map((b) => b.kind)).toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 items (${n})`).toBe(true);
    }
    const bs = demoBlocks(l);
    const ex = bs.filter((b) => b.sec === 'example' && b.runs && !isTrap(b));
    expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 runnable blocks (${ex.length})`).toBe(true);
    const pit = bs.filter((b) => b.sec === 'pitfalls' && isTrap(b));
    expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 traps (${pit.length})`).toBe(true);
    if (l.lab) expect(l.lab.steps.length >= 3 && l.lab.steps.length <= 6, 'lab 3–6 steps').toBe(true);
    const qs = [...((fm.quiz as Record<string, unknown>[] | undefined) ?? []), ...(fm.predict ? [fm.predict as Record<string, unknown>] : [])];
    expect(qs.length).toBeGreaterThanOrEqual(2);
    for (const q of qs) if (q.trap !== undefined) {
      expect(typeof q.trap === 'number' && q.trap !== q.answer && q.trap >= 0 && q.trap < (q.options as unknown[]).length, 'trap = a wrong option').toBe(true);
    }
    expect(qs.some((q) => q.trap !== undefined), '≥ 1 trap').toBe(true);
    for (const q of l.quiz ?? []) {
      const len = q.options.map((o) => o.vi.length);
      expect(len[q.answer], `${q.q.vi.slice(0, 40)}: the answer is much longer`).toBeLessThanOrEqual(Math.max(...len.filter((_, i) => i !== q.answer)) * 1.6);
    }
  });
  it('answer positions vary', () => {
    expect(new Set(all.flatMap(({ l }) => (l.quiz ?? []).map((q) => q.answer))).size).toBeGreaterThanOrEqual(3);
  });
  it('VI length: concept ≥ 500 words, lab ≥ 350 (NoSQL L1–L2 rule)', () => {
    expect(all.map(({ l }) => [l.id, l.kind, words(l)] as const).filter(([, k, n]) => (k === 'concept' ? n < 500 : n < 350))).toEqual([]);
  });

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: every Ví dụ / Lỗi hay gặp block runs on the interpreter', async (_, l) => {
    const bs = demoBlocks(l);
    const setup = demoSetup(l);
    const out = await Promise.all(bs.map(async (b) => {
      if (!b.runs) return undefined;
      try {
        return { rows: (await runner.run({ setup, steps: [] }, b.run)).rows };
      } catch (e) {
        return { error: errCode(e), message: (e as Error).message };
      }
    }));
    bs.forEach((b, i) => {
      const o = out[i];
      if (!b.runs || !o) return;
      if (b.mark === 'error') {
        expect(o, `# ERROR needs a code: ${b.code.slice(0, 60)}`).toMatchObject({ error: b.error });
        return;
      }
      expect('error' in o ? o : undefined, `block fails: ${b.code.slice(0, 80)}`).toBeUndefined();
      if (b.mark === 'wrong') {
        expect(bs[i + 1]?.mark, `# WRONG needs # FIX right after: ${b.code.slice(0, 60)}`).toBe('fix');
        expect(JSON.stringify(out[i + 1]), `WRONG and FIX print the same: ${b.code.slice(0, 60)}`).not.toBe(JSON.stringify(o));
      }
      expect((o as { rows: unknown[] }).rows.length).toBeGreaterThan(0);
    });
  });
});

describe('Redis R1: every lab step passes with its Solution and fails with a no-op', () => {
  const steps = all.filter(({ l }) => l.lab).flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1}`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toEqual({ ok: true });
    expect(await runner.check(l.lab!, s, 'PING')).toMatchObject({ ok: false });
    const cmd = lastCmd(s.solution);
    if (!s.error && !READS.has(cmd)) expect(!!s.after || s.expect?.ttl !== undefined || s.expect?.pttl !== undefined, `${cmd} is a write: needs after or ttl`).toBe(true);
    if (s.expect?.ttl !== undefined || s.expect?.pttl !== undefined) expect(s.target, 'ttl/pttl need target').toBeTruthy();
    for (const k of Object.keys(s.expect ?? {})) expect(['advance', 'ttl', 'pttl']).toContain(k);
    if (s.error) expect(s.solution).not.toMatch(/^@/m);
    expect(s.solution, 'directives stay in setup').not.toMatch(/^\s*@/m);
  });
});
