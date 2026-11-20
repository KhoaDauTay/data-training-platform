// v23 PG-VIZ: the built-in samples of pg-query-path, pg-partition-prune and pg-replication are real PGlite output.
// Each is re-run here on a fresh lab database (runLabScript) and must equal the stored sample (slimPlan: no timings).
// The DDL is a copy of lessons e-pg-l1-10, e-pg-l4-07 and e-pg-l5-13 (not read from content/, which other tracks edit).
import { describe, expect, it } from 'vitest';
import { runLabScript } from '../src/engine/pglab/session';
import { planNodesOf, slimPlan } from '../src/engine/viz/engineViz';
import { PRUNE_SAMPLE, QUERY_PATH_SAMPLE, REPLICATION_SAMPLE } from '../src/engine/viz/engineVizPgFlow';

const ORDERS = `CREATE TABLE orders (id bigint PRIMARY KEY, status text NOT NULL, amount numeric(10,2) NOT NULL);
INSERT INTO orders SELECT g, CASE g % 20 WHEN 0 THEN 'cancelled' WHEN 1 THEN 'new' ELSE 'paid' END, (g % 500) + 0.99 FROM generate_series(1, 20000) AS g;
CREATE INDEX orders_status_idx ON orders (status);
ANALYZE orders;`;
const EVENTS = `CREATE TABLE events (id int NOT NULL, tenant_id int NOT NULL, created_on date NOT NULL, kind text NOT NULL) PARTITION BY RANGE (created_on);
CREATE TABLE events_2026_08 PARTITION OF events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE events_2026_09 PARTITION OF events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE events_default PARTITION OF events DEFAULT;
INSERT INTO events SELECT g, g % 50 + 1, DATE '2026-08-01' + (g % 92), CASE WHEN g % 3 = 0 THEN 'scan' ELSE 'view' END FROM generate_series(1, 9200) g;
ANALYZE events;`;
const ANALYZE = 'EXPLAIN (ANALYZE, TIMING OFF, BUFFERS OFF, FORMAT JSON) ';
const PLAN = 'EXPLAIN (FORMAT JSON) ';
const ok = (r: Awaited<ReturnType<typeof runLabScript>>) => expect(r.steps.map((s) => [s.sql.slice(0, 50), s.status, s.error?.message]).filter(([, st]) => st !== 'ok')).toEqual([]);

describe('PG-VIZ samples = PGlite', () => {
  it('pg-query-path: the orders plan (EXPLAIN ANALYZE, row counts, costs)', async () => {
    const r = await runLabScript({ setup: ORDERS, steps: [ANALYZE + QUERY_PATH_SAMPLE.sql!] });
    ok(r);
    expect(slimPlan(r.steps[0].rows[0][0])).toEqual(QUERY_PATH_SAMPLE.plan);
  });

  it('pg-partition-prune: bounds, key and every case plan on the events table', async () => {
    const cases = PRUNE_SAMPLE.cases.map((c, i) => (i === PRUNE_SAMPLE.cases.length - 1 ? ANALYZE : PLAN) + c.sql);
    const r = await runLabScript({ setup: EVENTS, steps: [
      "SELECT c.relname::text AS name, pg_get_expr(c.relpartbound, c.oid) AS bound FROM pg_partition_tree('events') t JOIN pg_class c ON c.oid = t.relid WHERE t.isleaf ORDER BY c.relname",
      "SELECT pg_get_partkeydef('events'::regclass)",
      ...cases,
    ] });
    ok(r);
    expect(r.steps[0].rows.map(([name, bound]) => ({ name, bound }))).toEqual(PRUNE_SAMPLE.parts);
    expect(r.steps[1].rows[0][0]).toBe(PRUNE_SAMPLE.key);
    PRUNE_SAMPLE.cases.forEach((c, i) => expect(slimPlan(r.steps[i + 2].rows[0][0]), c.sql).toEqual(c.plan));
    // the run-time case: four partitions in the plan, three never executed, the InitPlan's own scan not counted
    const last = planNodesOf(PRUNE_SAMPLE.cases[4].plan).filter((n) => n.relation && !n.initPlan);
    expect(last.map((n) => n.loops)).toEqual([0, 1, 0, 0]);
  });

  it('pg-replication: the lesson slots and wal_level', async () => {
    const r = await runLabScript({
      setup: "SELECT pg_create_physical_replication_slot('standby_lazy'); SELECT pg_create_physical_replication_slot('standby_reserved', true);",
      steps: [
        'SELECT slot_name::text, slot_type, active, restart_lsn IS NOT NULL AS has_restart_lsn, wal_status FROM pg_replication_slots ORDER BY slot_name',
        "SELECT setting FROM pg_settings WHERE name = 'wal_level'",
      ],
    });
    ok(r);
    expect(r.steps[0].rows.map(([slot_name, slot_type, active, has_restart_lsn, wal_status]) => ({ slot_name, slot_type, active, has_restart_lsn, wal_status }))).toEqual(REPLICATION_SAMPLE.slots);
    expect(r.steps[1].rows[0][0]).toBe(REPLICATION_SAMPLE.wal_level);
  });
});
