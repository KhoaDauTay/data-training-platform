// v47 (L1060–L1079; tools/v47/content-gaps.md §5 E5): the sixth Engine card, "Streaming & CDC", lessons `e-sm-l<n>-NN`
// whose labs run on PostgreSQL (PGlite). Kafka, Debezium and Flink are concepts (their config in ```text); every runnable
// block is PostgreSQL. A mirror of tests/engineStack.test.ts: concept = Mở bài · Ý chính · Ví dụ · Lỗi hay gặp · Tóm tắt (+ a
// short lab, so the "runs" chip is honest); lab and capstone = all seven body sections, ≥ 3 steps. ≥ 2 questions, ≥ 1 trap.
// Every code line ≤ 40 characters (L542). Runs: one fresh lab database per lesson: setup, then every ```sql block of Ví dụ and
// Lỗi hay gặp in order. Lab steps: the Solution passes its own check, `SELECT 1` never does, and the step's `wrong:`-style
// trap (listed in WRONG below, the answer a learner would really write) is refused too.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, ENGINE_XP, engineXp, lessonIdFor, lessonProblems, onPg, parseEngineLesson, parseModules, SECTIONS, treeOf, type EngineLesson, type SectionId } from '../src/engine/content';
import { gradable, honestOf, LAB_RUNNERS } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { PREREQS } from '../src/engine/tracks';
import { compareResults, grade } from '../src/grader';
import { badges, BADGE_ENGINES, levelsOf } from '../src/mastery';
import { engineHash, engineRouteOf, enginePlayOf } from '../src/route';
import { ENGINE_ID, isWorkId } from '../src/save';

const files = import.meta.glob<string>('../content/engine/stream/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/stream/modules.yml', { query: '?raw', import: 'default', eager: true });
const others = import.meta.glob<string>('../content/engine/{postgres,mongodb,dynamodb,design,stack}/L*/*.md', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));
const otherIds = new Set(Object.values(others).map((r) => /^id:\s*(\S+)/m.exec(r)?.[1]).filter((x): x is string => !!x));

/** content-gaps §5 E5 + the user's brief (13 lessons): the log, delivery and CDC, stream processing and the capstone. */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['concept', 'lab', 'lab', 'lab'],
  L2: ['concept', 'lab', 'lab', 'lab', 'lab'],
  L3: ['lab', 'lab', 'concept', 'capstone'],
};
const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: Partial<Record<EngineLesson['kind'], SectionId[]>> = {
  concept: ['open', 'idea', 'example', 'pitfalls', 'recap'],
  lab: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
  capstone: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
};
/** Official docs only (the brief): Kafka, Debezium, PostgreSQL. */
const OFFICIAL = /^https:\/\/(kafka\.apache\.org|debezium\.io|www\.postgresql\.org)\//;
/** One plausible wrong answer per lab step (the non-idempotent, naive or order-blind version): it must be refused. */
const WRONG: Record<string, string[]> = {
  'e-sm-l2-04#1': ["INSERT INTO change_log (op, row_key) VALUES ('c', 'SHP-104') RETURNING lsn"],
  'e-sm-l2-04#2': ["UPDATE shipments SET status = 'delivered' RETURNING shipment_id, status"],
  'e-sm-l2-04#3': ["UPDATE shipments SET status = 'cancelled' WHERE shipment_id = 'SHP-103' RETURNING shipment_id"],
  'e-sm-l2-05#1': ["SELECT lsn, after->>'shipment_id' AS shipment_id FROM change_log WHERE op = 'd'"],
  'e-sm-l2-05#2': ["SELECT lsn, after->>'shipment_id' AS shipment_id, before->>'status' AS old_status, after->>'status' AS new_status FROM change_log WHERE op = 'u'"],
  'e-sm-l2-05#3': ["SELECT DISTINCT ON (coalesce(after, before)->>'shipment_id') coalesce(after, before)->>'shipment_id' AS shipment_id, after->>'status' AS status FROM change_log WHERE op <> 'd' ORDER BY coalesce(after, before)->>'shipment_id', lsn DESC"],  'e-sm-l2-01#1': ['SELECT consumer, msg_offset, count(*) AS times FROM deliveries GROUP BY consumer, msg_offset', 'SELECT min(consumer) AS consumer, msg_offset, count(*) AS times FROM deliveries GROUP BY msg_offset HAVING count(*) > 1'],
  'e-sm-l2-01#2': ["SELECT e.msg_offset FROM events e LEFT JOIN deliveries d ON d.msg_offset = e.msg_offset WHERE d.consumer = 'at_most_once'"],
  'e-sm-l2-02#1': ['SELECT b.event_id FROM inbox_batch b WHERE NOT EXISTS (SELECT 1 FROM processed_events p WHERE p.event_id = b.event_id)', 'SELECT DISTINCT event_id FROM inbox_batch'],
  'e-sm-l2-02#2': ['INSERT INTO charges (event_id, shipment_id, fee_vnd) SELECT event_id, shipment_id, fee_vnd FROM inbox_batch RETURNING event_id'],
  'e-sm-l2-02#3': ['INSERT INTO shipment_status AS s SELECT DISTINCT ON (shipment_id) shipment_id, status, version FROM inbox_batch ORDER BY shipment_id, version DESC ON CONFLICT (shipment_id) DO UPDATE SET status = EXCLUDED.status, version = EXCLUDED.version RETURNING shipment_id, status', 'INSERT INTO shipment_status AS s SELECT DISTINCT ON (shipment_id) shipment_id, status, version FROM inbox_batch ORDER BY shipment_id, seq DESC ON CONFLICT (shipment_id) DO UPDATE SET status = EXCLUDED.status, version = EXCLUDED.version RETURNING shipment_id, status'],
  'e-sm-l2-03#1': ["UPDATE shipments SET status = 'delivered' WHERE shipment_id = 'SHP-102' RETURNING shipment_id, status"],
  'e-sm-l2-03#2': ["SELECT id, aggregateid AS message_key, type, payload->>'status' AS status FROM outbox ORDER BY id"],
  'e-sm-l2-03#3': ['UPDATE outbox SET published = true WHERE id = 3 RETURNING id'],  'e-sm-l1-03#1': ["SELECT hashtext('SHP-105') % 3 AS partition_id"],
  'e-sm-l1-03#2': ['SELECT shipment_id, count(partition_id) AS partitions FROM topic_log GROUP BY shipment_id'],
  'e-sm-l1-03#3': ["SELECT c.partition_id, (SELECT max(msg_offset) + 1 FROM topic_log) - c.next_offset AS lag FROM consumer_offsets c WHERE c.group_id = 'tracking'"],
  'e-sm-l1-04#1': ['SELECT DISTINCT ON (shipment_id) msg_offset, shipment_id, status FROM status_log ORDER BY shipment_id, msg_offset'],
  'e-sm-l1-04#2': ['SELECT DISTINCT ON (shipment_id) shipment_id, status FROM status_log WHERE status IS NOT NULL ORDER BY shipment_id, msg_offset DESC'],
  'e-sm-l1-04#3': ['DELETE FROM status_log WHERE status IS NULL RETURNING msg_offset', 'DELETE FROM status_log l WHERE EXISTS (SELECT 1 FROM status_log n WHERE n.shipment_id = l.shipment_id AND n.msg_offset < l.msg_offset) RETURNING l.msg_offset'],  'e-sm-l1-01#1': ['SELECT shipment_id, max(status) AS status FROM shipment_events GROUP BY shipment_id'],
  'e-sm-l1-01#2': ['SELECT shipment_id, count(*) AS changes FROM shipments GROUP BY shipment_id'],
  'e-sm-l1-02#1': ["SELECT e.msg_offset, e.shipment_id, e.status FROM events e JOIN consumer_offsets c ON c.group_id = 'billing' WHERE e.msg_offset > c.next_offset ORDER BY e.msg_offset LIMIT 3"],
  'e-sm-l1-02#2': ['SELECT c.group_id, (SELECT max(msg_offset) FROM events) - c.next_offset AS lag FROM consumer_offsets c'],
  'e-sm-l1-02#3': ["UPDATE consumer_offsets SET next_offset = 5 WHERE group_id = 'billing' RETURNING group_id, next_offset"],
};

const text = (l: EngineLesson, id: SectionId): { vi: string; en: string } | undefined => l.sections.find((s) => s.id === id)?.text;
const sqlBlocks = (t: string | undefined): string[] => (t ? blocksOf(t).flatMap((b) => (b.kind === 'code' && b.lang === 'sql' ? [b.code] : [])) : []);
const ERR = /^--\s*ERROR\s+([0-9A-Z]{5})\b/m;
const isErr = (b: string): boolean => /^--\s*ERROR\b/m.test(b);
const wordCountOf = (s: string): number => s.split(/\s+/).filter(Boolean).length;

describe('Streaming & CDC (v47): engine, routes, Save, XP, badges', () => {
  it('engine stream / sm on the PostgreSQL runtime', () => {
    expect(onPg('stream')).toBe(true);
    expect(LAB_RUNNERS.stream).toBe(LAB_RUNNERS.postgres);
    expect(lessonIdFor('stream', 'L2', '03')).toBe('e-sm-l2-03');
    expect(PREREQS.stream?.length).toBeGreaterThan(0);
  });
  it('routes and ids', () => {
    expect(engineRouteOf('#/engine/stream')).toEqual({ engine: 'stream', level: undefined, lesson: undefined });
    expect(engineRouteOf('#/engine/stream/l2/e-sm-l2-03')).toEqual({ engine: 'stream', level: 'L2', lesson: 'e-sm-l2-03' });
    expect(engineHash('stream', 'L2', 'e-sm-l2-03')).toBe('#/engine/stream/L2/e-sm-l2-03');
    expect(enginePlayOf('#/engine/play/e-sm-l3-04')).toBe('#/engine/stream/L3/e-sm-l3-04');
    expect(ENGINE_ID.test('e-sm-l1-02')).toBe(true);
    expect(isWorkId(new Set(), 'e-sm-l1-02')).toBe(true);
  });
  it('XP like every engine; badges L1–L3 only (43 in all)', () => {
    const capstone = all.find((x) => x.l.kind === 'capstone')!.l;
    expect(engineXp(capstone, false)).toBe(ENGINE_XP.capstone);
    expect(BADGE_ENGINES).toContain('stream');
    expect(levelsOf('stream')).toEqual(['L1', 'L2', 'L3']);
    const tree = treeOf('stream', all.map((x) => x.l), parseModules(Object.values(moduleRaw)[0], 'modules.yml', parse));
    expect(tree.levels.filter((lv) => lv.modules.length).map((lv) => lv.level)).toEqual(['L1', 'L2', 'L3']);
    const levels = [{ level: 'L1', k: 4, n: 4, started: true, done: true }, { level: 'L2', k: 0, n: 5, started: false, done: false }];
    const b = badges({ parts: [], levels: new Map(), foundation: [], perf: [], completed: new Set(), engines: { stream: levels }, domains: [] });
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'stream').map((x) => [x.id, x.have])).toEqual([['stream-L1', true], ['stream-L2', false], ['stream-L3', false]]);
  });
});

describe('Streaming & CDC: bài, mô-đun, luật nội dung', () => {
  it('13 bài, đúng loại từng cấp, id e-sm-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-sm-l[1-3]-\d\d$/.test(x.l.id) && x.l.engine === 'stream')).toBe(true);
  });
  it('modules.yml: mỗi mô-đun có VI/EN và được dùng', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: luật nội dung, nhãn chạy thật, một hình sm-, nguồn chính thức', (_, l) => {
    expect(lessonProblems(l, new Set([...ids, ...l.requires.filter((r) => otherIds.has(r))]))).toEqual([]);
    expect(l.runtime).toBe('browser');
    expect(l.lab, 'mọi bài có lab (nhãn "chạy thật" trung thực)').toBeDefined();
    expect(honestOf(l)).toBe('pg');
    for (const s of l.lab?.steps ?? []) expect(gradable(l, s)).toBe(true);
    expect((l.figures ?? []).filter((f) => f.name.startsWith('sm-')).length).toBe(1);
    expect(l.sources.length).toBeGreaterThanOrEqual(2);
    expect(l.sources.filter((s) => OFFICIAL.test(s)).length, 'nguồn chính thức').toBeGreaterThanOrEqual(1);
    expect(l.sources.filter((s) => !OFFICIAL.test(s))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.raw] as const))('%s: mọi dòng code ≤ 40 ký tự (L542)', (_, raw) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const long = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n')).filter((x) => [...x].length > 40);
    expect(long).toEqual([]);
  });
  it('trung thực về CDC: bài WAL nói PGlite không chạy replication slot, và cho thấy lỗi 55000 thật', () => {
    const cdc = all.find((x) => x.l.id === 'e-sm-l2-04')!.l;
    expect(text(cdc, 'pitfalls')!.vi).toMatch(/-- ERROR 55000/);
    expect(text(cdc, 'idea')!.vi).toMatch(/PGlite/);
    expect(text(cdc, 'idea')!.en).toMatch(/PGlite/);
  });
});

describe('Streaming & CDC: giải phẫu 8 mục', () => {
  it.each(all.map((x) => [x.l.id, x] as const))('%s: mục, thứ tự, câu hỏi có bẫy, lựa chọn cân', (_, { l, fm }) => {
    const sec = l.sections.map((s) => s.id);
    expect(sec, 'thứ tự mục').toEqual([...sec].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect((NEED[l.kind] ?? []).filter((k) => !sec.includes(k)), 'thiếu mục').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 câu').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(wordCountOf(p), `Ý chính: đoạn > 150 từ: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    const syntax = text(l, 'syntax');
    if (syntax) expect(blocksOf(syntax.vi)[0]?.kind, 'Cú pháp mở bằng một khối code').toBe('code');
    for (const lang of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lang]);
      expect(recap.map((b) => b.kind), 'Tóm tắt = một danh sách').toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 dòng (${n})`).toBe(true);
    }
    const ex = sqlBlocks(text(l, 'example')?.vi).filter((b) => !isErr(b));
    expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 khối chạy ra dòng (${ex.length})`).toBe(true);
    const pit = sqlBlocks(text(l, 'pitfalls')?.vi).filter((b) => isErr(b) || /^--\s*WRONG\b/m.test(b));
    expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 bẫy (${pit.length})`).toBe(true);
    if (l.kind === 'lab' || l.kind === 'capstone') expect(l.lab!.steps.length, 'lab 3–6 bước').toBeGreaterThanOrEqual(3);
    const qs = [...((fm.quiz as Record<string, unknown>[] | undefined) ?? []), ...(fm.predict ? [fm.predict as Record<string, unknown>] : [])];
    expect(qs.length, 'số câu hỏi').toBeGreaterThanOrEqual(2);
    for (const q of qs) if (q.trap !== undefined) {
      const n = (q.options as unknown[]).length;
      expect(typeof q.trap === 'number' && q.trap !== q.answer && q.trap >= 0 && q.trap < n, 'trap = một lựa chọn sai').toBe(true);
    }
    expect(qs.some((q) => q.trap !== undefined), '≥ 1 câu có trap').toBe(true);
    for (const q of l.quiz ?? []) {
      const len = q.options.map((o) => o.vi.length);
      expect(len[q.answer], `${q.q.vi.slice(0, 40)}: đáp án dài hơn hẳn`).toBeLessThanOrEqual(Math.max(...len.filter((_, i) => i !== q.answer)) * 1.6);
    }
  });
  it('vị trí đáp án đổi (không cùng một chỉ số cho mọi câu)', () => {
    const answers = all.flatMap(({ l }) => (l.quiz ?? []).map((q) => q.answer));
    expect(new Set(answers).size).toBeGreaterThanOrEqual(3);
  });

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật sau setup', async (_, l) => {
    const blocks = [...sqlBlocks(text(l, 'example')?.vi), ...sqlBlocks(text(l, 'pitfalls')?.vi)];
    const steps: ScriptStep[] = [];
    const span: [number, number][] = [];
    for (const b of blocks) {
      const stmts = splitSql(b);
      const code = ERR.exec(b)?.[1];
      if (isErr(b)) expect(code, `-- ERROR cần SQLSTATE: ${b.slice(0, 60)}`).toBeDefined();
      stmts.forEach((s, i) => steps.push(code && i === stmts.length - 1 ? { sql: s, expectError: code } : s));
      span.push([steps.length - stmts.length, steps.length]);
    }
    const setup = l.lab?.setup ?? l.demoSetup;
    const r = await runLabScript({ setup, extensions: extensionsOf(setup, ...blocks), steps });
    expect(r.setupError).toBeUndefined();
    const bad = r.failedStep === undefined ? undefined : r.steps[r.failedStep];
    expect(bad && [bad.sql.slice(0, 120), bad.error?.code, bad.error?.message]).toBeUndefined();
    const result = (i: number) => r.steps.slice(...span[i]).filter((x) => x.columns.length).at(-1) ?? r.steps[span[i][1] - 1];
    blocks.forEach((b, i) => {
      if (isErr(b)) return;
      if (/^--\s*WRONG\b/m.test(b)) {
        expect(/^--\s*FIX\b/m.test(blocks[i + 1] ?? ''), `-- WRONG cần -- FIX ngay sau: ${b.slice(0, 60)}`).toBe(true);
        expect(compareResults(result(i + 1), result(i), false).ok, `WRONG ra cùng dòng với FIX: ${b.slice(0, 60)}`).toBe(false);
        return;
      }
      expect(result(i).rows.length, `khối không ra dòng: ${b.slice(0, 80)}`).toBeGreaterThan(0);
    });
  }, 120_000);
});

describe('Streaming & CDC: mọi bước lab qua bằng lời giải, không qua khi không làm gì hay làm kiểu ngây thơ', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  const steps = all.filter(({ l }) => l.lab).flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1} (${s.after ? 'after' : s.check})`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
    const wrong = WRONG[`${l.id}#${i + 1}`];
    expect(wrong, `${l.id} bước ${i + 1}: cần một câu sai điển hình trong WRONG`).toBeDefined();
    for (const w of wrong ?? []) expect(await runner.check(l.lab!, s, w), w).toMatchObject({ ok: false });
    if (s.check === 'rows' && !s.after) {
      const r = await runLabScript({ setup: l.lab!.setup, steps: [...replayOf(l.lab!, i), s.solution] });
      expect(r.steps.at(-1)!.rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      if (s.ordered) expect(s.solution).toMatch(/ORDER BY/i);
    }
  }, 120_000);
});
