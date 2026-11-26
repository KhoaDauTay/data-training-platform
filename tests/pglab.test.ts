import { describe, expect, it } from 'vitest';
import type { LabScript, StepResult } from '../src/engine/pglab/script';
import { runCheck } from '../src/engine/pglab/check';
import { EXTENSIONS, runLabScript, splitSql } from '../src/engine/pglab/session';
import { extensionsOf, pgScriptRunner } from '../src/engine/pglab/runner';
import { grade } from '../src/grader';
import type { QueryResult } from '../src/db/run';
import type { Lab, LabStep } from '../src/engine/content';

// ENG-PGLAB (L230): the lab runtime on real PGlite (the worker shell only forwards to runLabScript).

/** No @types/node in this repo. */
const rss = () => (globalThis as unknown as { process: { memoryUsage(): { rss: number } } }).process.memoryUsage().rss;
const okSteps = (r: { steps: StepResult[] }) => r.steps.map((s) => [s.sql.slice(0, 40), s.status, s.error?.message]);

describe('pglab runtime', () => {
  it('mọi extension đã hứa đều nạp và gọi được một hàm thật', async () => {
    const r = await runLabScript({
      extensions: Object.keys(EXTENSIONS) as LabScript['extensions'],
      steps: [
        'CREATE TABLE t (id int PRIMARY KEY, s text)',
        "INSERT INTO t SELECT g, 'k' || g FROM generate_series(1, 200) g",
        "SELECT count(*) FROM heap_page_items(get_raw_page('t', 0))", // pageinspect
        "SELECT count(*) FROM pg_visibility_map('t')", // pg_visibility
        "SELECT bt_index_check('t_pkey')", // amcheck
        'SELECT count(*) FROM pg_get_wal_records_info((SELECT redo_lsn FROM pg_control_checkpoint()), pg_current_wal_lsn())', // pg_walinspect
        'SELECT count(*) FROM pg_buffercache', // pg_buffercache
        "SELECT count(*) FROM pg_freespace('t')", // pg_freespacemap
        'CREATE INDEX t_bloom ON t USING bloom (id)', // bloom
        'CREATE INDEX t_gin ON t USING gin (id)', // btree_gin
        'CREATE INDEX t_gist ON t USING gist (id)', // btree_gist
        "SELECT similarity('postgres', 'postgis')", // pg_trgm
        'SELECT count(*) FROM pg_stat_statements', // pg_stat_statements
        "SELECT 'a.b.c'::ltree", // ltree
        "SELECT encode(digest('x', 'sha256'), 'hex')", // pgcrypto
        "SELECT 'A@b.VN'::citext = 'a@B.vn'", // citext (v43)
        "SELECT levenshtein('VNDAD', 'VNDDA')", // fuzzystrmatch
        "SELECT unaccent('Hội An')", // unaccent
        "SELECT uuid_generate_v5(uuid_ns_url(), 'VNDAD')", // uuid-ossp
        "SELECT 'color=>do'::hstore -> 'color'", // hstore
        "SELECT count(*) FROM normal_rand(3, 0, 1)", // tablefunc
        "SELECT '[1,2]'::vector <-> '[1,3]'::vector", // vector
      ],
      checks: [{ kind: 'rows', step: 3, rows: [[1]] }],
    });
    expect(okSteps(r).filter(([, s]) => s !== 'ok')).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('L711: PostGIS nạp được và tính khoảng cách địa lý thật (Đà Nẵng – TP.HCM ≈ 608 km)', async () => {
    const r = await runLabScript({
      extensions: ['postgis'],
      steps: [
        'CREATE EXTENSION IF NOT EXISTS postgis',
        "SELECT round(ST_Distance('SRID=4326;POINT(108.2208 16.0544)'::geography, 'SRID=4326;POINT(106.7009 10.7769)'::geography) / 1000) AS km",
        "SELECT ST_AsText(ST_Buffer('POINT(0 0)'::geometry, 1, 1)) LIKE 'POLYGON%' AS poly",
      ],
      checks: [],
    }, );
    expect(okSteps(r).filter(([, s]) => s !== 'ok')).toEqual([]);
    const km = Number(r.steps[1].rows[0][0]);
    expect(km).toBeGreaterThan(590);
    expect(km).toBeLessThan(625);
    expect(r.steps[2].rows[0][0]).toBe(true);
  }, 120_000);

  it('v43 (L724): pgvector tìm láng giềng gần nhất thật (L2 và cosine), có index HNSW', async () => {
    const r = await runLabScript({
      extensions: ['vector'],
      steps: [
        'CREATE TABLE items (id int PRIMARY KEY, v vector(3))',
        "INSERT INTO items VALUES (1, '[1,0,0]'), (2, '[0,1,0]'), (3, '[0.9,0.1,0]'), (4, '[0,0,1]')",
        'CREATE INDEX ON items USING hnsw (v vector_l2_ops)',
        "SELECT id FROM items ORDER BY v <-> '[1,0.05,0]' LIMIT 2",
        "SELECT id FROM items ORDER BY v <=> '[0,0,2]' LIMIT 1",
        "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
      ],
    });
    expect(okSteps(r).filter(([, s]) => s !== 'ok')).toEqual([]);
    expect(r.steps[3].rows).toEqual([[1], [3]]);
    expect(r.steps[4].rows).toEqual([[4]]);
    expect(String(r.steps[5].rows[0][0])).toMatch(/^\d+\.\d+/);
  }, 60_000);

  it('v43 (L723): unaccent bỏ dấu tiếng Việt, gồm cả đ → d', async () => {
    const r = await runLabScript({ extensions: ['unaccent'], steps: ["SELECT unaccent('Đèn lồng Hội An')"] });
    expect(r.steps[0].rows).toEqual([['Den long Hoi An']]);
  });

  it('v43 (L725): CREATE EXTENSION trong một bước (không IF NOT EXISTS) tự chạy được, kể cả "uuid-ossp"', async () => {
    const r = await runLabScript({
      extensions: ['citext', 'uuid-ossp'],
      steps: ['CREATE EXTENSION citext', 'CREATE EXTENSION "uuid-ossp"', "SELECT 'A'::citext = 'a'", "SELECT uuid_generate_v5(uuid_ns_url(), 'VNDAD') = uuid_generate_v5(uuid_ns_url(), 'VNDAD')"],
    });
    expect(okSteps(r).filter(([, s]) => s !== 'ok')).toEqual([]);
    expect([r.steps[2].rows, r.steps[3].rows]).toEqual([[[true]], [[true]]]);
  });

  it('extensionsOf nhận PostGIS từ CREATE EXTENSION và từ hàm ST_*', () => {
    expect(extensionsOf('CREATE EXTENSION postgis')).toEqual(['postgis']);
    expect(extensionsOf("SELECT ST_Distance(a, b) FROM t")).toEqual(['postgis']);
  });

  it('kịch bản HOT + VACUUM + pageinspect + visibility map cho đúng sự thật catalog', async () => {
    const r = await runLabScript({
      extensions: ['pageinspect', 'pg_visibility'],
      steps: [
        'CREATE TABLE t (id int PRIMARY KEY, v text) WITH (fillfactor = 70)',
        "INSERT INTO t SELECT g, 'x' FROM generate_series(1, 100) g",
        "UPDATE t SET v = 'y' WHERE id <= 3",
        "SELECT lp, (t_infomask2 & 16384) <> 0 AS hot_updated FROM heap_page_items(get_raw_page('t', 0))", // 3
        'SELECT pg_stat_force_next_flush()',
        "SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 't'", // 5
        'BEGIN',
        { sql: 'VACUUM t', expectError: '25001' },
        'ROLLBACK',
        { sql: 'VACUUM (VERBOSE) t' }, // 9
        "SELECT lp, lp_flags FROM heap_page_items(get_raw_page('t', 0))", // 10
        "SELECT all_visible, all_frozen FROM pg_visibility_map('t')", // 11
        'SET enable_seqscan = off',
        'EXPLAIN (ANALYZE, FORMAT JSON) SELECT id FROM t WHERE id < 50', // 13
        'CHECKPOINT',
        'ANALYZE t',
      ],
      checks: [
        { kind: 'catalog', step: 3, where: { hot_updated: true }, count: 3 },
        { kind: 'rows', step: 5, rows: [[3, 3]] },
        { kind: 'catalog', step: 10, where: { lp_flags: 2 }, count: 3 }, // HOT redirects after prune
        { kind: 'catalog', step: 11, where: { all_visible: true }, all: true },
        { kind: 'plan', step: 13, node: 'Index Only Scan', relation: 't', detail: { 'Heap Fetches': 0 } },
        { kind: 'plan', step: 13, node: 'Seq Scan', absent: true },
      ],
    });
    expect(okSteps(r).filter(([, s]) => s === 'skipped')).toEqual([]);
    expect(r.steps[7].error?.code).toBe('25001');
    expect(r.steps[9].notices.some((n) => n.severity === 'INFO' && /vacuuming/.test(n.message))).toBe(true);
    expect(r.checks).toEqual(r.checks.map(() => ({ ok: true })));
    expect(r.ok).toBe(true);
  });

  it('pg_walinspect thấy bản ghi Heap của một INSERT', async () => {
    const r = await runLabScript({
      extensions: ['pg_walinspect'],
      steps: [
        'CREATE TABLE t (id int)',
        'CREATE TABLE mark AS SELECT pg_current_wal_lsn() AS lsn',
        'INSERT INTO t VALUES (1)',
        'SELECT resource_manager, record_type FROM pg_get_wal_records_info((SELECT lsn FROM mark), pg_current_wal_lsn())',
      ],
      checks: [{ kind: 'catalog', step: 3, where: { resource_manager: 'Heap' }, min: 1 }],
    });
    expect(r.ok).toBe(true);
  });

  it('cách ly: không thấy schema của game, mỗi lab là một DB mới', async () => {
    const a = await runLabScript({ steps: ['CREATE TABLE leftover (x int)', 'SELECT txid_current()'] });
    const b = await runLabScript({
      steps: [
        "SELECT count(*) FROM pg_namespace WHERE nspname IN ('logistics', 'lab', 'ecom', 'finance', 'sandbox')",
        "SELECT to_regclass('leftover') IS NULL",
        'SELECT txid_current()',
      ],
      checks: [{ kind: 'rows', step: 0, rows: [[0]] }, { kind: 'rows', step: 1, rows: [[true]] }],
    });
    expect(b.ok).toBe(true);
    // Same template, nothing carried over: lab b's first xid is the one lab a's CREATE TABLE used.
    expect(String(b.steps[2].rows[0][0])).toBe(String(Number(a.steps[1].rows[0][0]) - 1));
  });

  it('lỗi Postgres là kết quả của bước (SQLSTATE), các bước sau bị bỏ, check trên bước bỏ = skipped', async () => {
    const r = await runLabScript({ steps: ['SELECT 1', 'SELECT * FROM nope', 'SELECT 2'], checks: [{ kind: 'rows', step: 2, rows: [[2]] }] });
    expect(r.steps.map((s) => s.status)).toEqual(['ok', 'error', 'skipped']);
    expect(r.steps[1].error?.code).toBe('42P01');
    expect(r.failedStep).toBe(1);
    expect(r.checks).toEqual([{ ok: false, why: 'skipped' }]);
    expect(r.ok).toBe(false);
  });

  it('expectError mà câu lại chạy được = bước hỏng', async () => {
    const r = await runLabScript({ steps: [{ sql: 'SELECT 1', expectError: '25001' }] });
    expect(r.failedStep).toBe(0);
    expect(r.ok).toBe(false);
  });

  it('extension lạ bị từ chối trước khi chạy', async () => {
    await expect(runLabScript({ extensions: ['plpython3u' as 'ltree'], steps: [] })).rejects.toThrow(/unknown extension/);
  });

  it('15 lab liên tiếp không làm phình bộ nhớ', async () => {
    const before = rss();
    for (let i = 0; i < 15; i++) await runLabScript({ extensions: ['pageinspect'], steps: ['CREATE TABLE t (id int)', 'INSERT INTO t VALUES (1)'] });
    const grownMb = (rss() - before) / 2 ** 20;
    console.log(`pglab: rss +${grownMb.toFixed(0)} MB after 15 labs`); // 30 labs: +23 MB (2026-11-20)
    expect(grownMb).toBeLessThan(300);
  });
});

describe('pglab checks', () => {
  const step = (columns: string[], rows: unknown[][]): StepResult => ({ sql: '', status: 'ok', columns, types: [], rows, notices: [], ms: 0 });

  it('rows dùng compareResults (thứ tự, làm tròn)', () => {
    const s = step(['a'], [[1], [2]]);
    expect(runCheck({ kind: 'rows', step: 0, rows: [['2.001'], [1]] }, [s])).toEqual({ ok: true });
    expect(runCheck({ kind: 'rows', step: 0, rows: [[2], [1]], ordered: true }, [s])).toMatchObject({ ok: false, why: 'rows', grade: { reason: 'order' } });
  });

  it('catalog: cột không có, count, min/max, all', () => {
    const s = step(['lp', 'lp_flags'], [[1, 2], [2, 1], [3, 2]]);
    expect(runCheck({ kind: 'catalog', step: 0, where: { nope: 1 } }, [s])).toEqual({ ok: false, why: 'column' });
    expect(runCheck({ kind: 'catalog', step: 0, where: { lp_flags: '2' }, count: 2 }, [s])).toEqual({ ok: true });
    expect(runCheck({ kind: 'catalog', step: 0, where: { lp_flags: 2 }, max: 1 }, [s])).toEqual({ ok: false, why: 'count', matched: 2 });
    expect(runCheck({ kind: 'catalog', step: 0, where: { lp_flags: 2 }, all: true }, [s])).toEqual({ ok: false, why: 'count', matched: 2 });
    expect(runCheck({ kind: 'catalog', step: 0, count: 3 }, [s])).toEqual({ ok: true });
  });

  it('plan: bước không phải EXPLAIN', () => {
    expect(runCheck({ kind: 'plan', step: 0, node: 'Seq Scan' }, [step(['x'], [[1]])])).toEqual({ ok: false, why: 'notPlan' });
  });
});

describe('pglab setup + ENG-CORE runner', () => {
  it('splitSql tách câu, bỏ qua ; trong chuỗi, comment, $$', () => {
    expect(splitSql("SELECT ';'; -- a;b\nSELECT $x$ ; $x$ ; /* ; /* ; */ */ SELECT 3;\n-- only\n")).toEqual([
      "SELECT ';'", '-- a;b\nSELECT $x$ ; $x$', '/* ; /* ; */ */ SELECT 3',
    ]);
  });

  it('setup chạy từng câu (VACUUM được), CREATE EXTENSION của extension đã nạp bị bỏ qua, lỗi setup = setupError', async () => {
    const r = await runLabScript({
      extensions: ['pageinspect'],
      setup: "CREATE EXTENSION pageinspect;\nCREATE TABLE t (id int PRIMARY KEY, v text);\nINSERT INTO t SELECT g, 'x' FROM generate_series(1, 50) g;\nUPDATE t SET v = 'y' WHERE id = 1;\nVACUUM t;",
      steps: ["SELECT count(*) FROM heap_page_items(get_raw_page('t', 0)) WHERE lp_flags = 2"],
      checks: [{ kind: 'rows', step: 0, rows: [[1]] }],
    });
    expect(r.setupError).toBeUndefined();
    expect(r.ok).toBe(true);
    const bad = await runLabScript({ setup: 'CREATE TABLE t (id int); SELECT * FROM nope;', steps: ['SELECT 1'] });
    expect(bad.setupError).toMatchObject({ code: '42P01', sql: 'SELECT * FROM nope' });
    expect(bad.steps[0].status).toBe('skipped');
    expect(bad.ok).toBe(false);
  });

  it('pgScriptRunner (LabRunner của ENG-CORE): rows qua env.grade, plan so hình dạng, doc = unsupported', async () => {
    const env = {
      grade: (run: (s: string) => Promise<QueryResult>, sol: string, player: string, ordered: boolean) => grade(run, sol, player, ordered),
      verdict: (g: { reason: string }) => g.reason,
    };
    const lab = pgScriptRunner(env, { run: runLabScript, reset: () => undefined });
    const L = { setup: "CREATE TABLE t (id int PRIMARY KEY, v text);\nINSERT INTO t SELECT g, 'x' FROM generate_series(1, 1000) g;\nANALYZE t;", steps: [] } as unknown as Lab;
    await lab.prepare(L);
    expect((await lab.run(L, 'SELECT count(*) FROM t')).rows).toEqual([[1000]]);
    await expect(lab.run(L, 'SELECT * FROM nope')).rejects.toMatchObject({ code: '42P01' });
    const step = { solution: 'SELECT id FROM t WHERE id < 3', check: 'rows' as const, ordered: false } as LabStep;
    expect(await lab.check(L, step, 'SELECT id FROM t WHERE id <= 2')).toEqual({ ok: true });
    expect(await lab.check(L, step, 'SELECT id FROM t WHERE id <= 3')).toMatchObject({ ok: false, reason: 'wrong' });
    const plan = { solution: 'SELECT v FROM t WHERE id = 5', check: 'plan' as const, ordered: false } as LabStep;
    expect(await lab.check(L, plan, 'SELECT v FROM t WHERE 5 = id')).toEqual({ ok: true });
    // L248: a right plan with the wrong rows is still wrong
    expect(await lab.check(L, plan, 'SELECT v || id FROM t WHERE id = 7')).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await lab.check(L, plan, "SELECT v FROM t WHERE v = 'x'")).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await lab.check(L, { ...step, check: 'doc' }, '')).toEqual({ ok: false, reason: 'unsupported' });
    await expect(lab.prepare({ setup: 'CREATE EXTENSION plpython3u;', steps: [] } as unknown as Lab)).rejects.toThrow();
  });

  it('L249: a DDL catalog step is graded on the catalog, and a later step sees the earlier DDL', async () => {
    const env = {
      grade: (run: (s: string) => Promise<QueryResult>, sol: string, player: string, ordered: boolean) => grade(run, sol, player, ordered),
      verdict: (g: { reason: string }) => g.reason,
    };
    const lab = pgScriptRunner(env, { run: runLabScript, reset: () => undefined });
    const ddl = { solution: 'CREATE INDEX t_v_idx ON t (v)', check: 'catalog', ordered: false } as LabStep;
    const plan = { solution: "SELECT id FROM t WHERE v = 'x5'", check: 'plan', ordered: false } as LabStep;
    const L = { setup: "CREATE TABLE t (id int PRIMARY KEY, v text);\nINSERT INTO t SELECT g, 'x' || g FROM generate_series(1, 5000) g;\nANALYZE t;", steps: [ddl, plan] } as unknown as Lab;
    expect(await lab.check(L, ddl, 'CREATE INDEX t_v_idx ON t (v)')).toEqual({ ok: true });
    expect(await lab.check(L, ddl, 'CREATE INDEX wrong_name ON t (v)')).toMatchObject({ ok: false, reason: 'wrong', why: 'catalog' });
    expect(await lab.check(L, ddl, 'CREATE INDEX t_v_idx ON t (id)')).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await lab.check(L, plan, "SELECT id FROM t WHERE v = 'x5'")).toEqual({ ok: true });
    expect(await lab.check(L, plan, "SELECT id FROM t WHERE v || '' = 'x5'")).toMatchObject({ ok: false, reason: 'wrong', why: 'plan' });
  });
});
