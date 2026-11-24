# Query and database performance (PostgreSQL first)

Status: verified (examples; prose link-checked, see [README.md](README.md#verification-levels)). ```` ```sql ```` blocks ran in order on PGlite 0.5.16 (PostgreSQL 18.6) with asserted results. PGlite has no parallel query, JIT or real disk I/O, so timing claims are not verified here; plan shapes and row estimates are.

Route points: tutorialspoint SQL "Database Tuning", "Indexes" section; MySQL "Explain", "Indexes"; SQLite "EXPLAIN", "VACUUM", "INDEXED BY"; DBMS "Query Processing" ([tutorial-routes.md](tutorial-routes.md)). The full best-practice list is `docs/team/best-practice-catalogue.md` (Q, I, P items); this file keeps the rules a developer checks first.

## 1. Method: measure, then change one thing

Status: concept.

1. Find the costly queries: `pg_stat_statements` (total time × calls), not the one that feels slow (catalogue P25; https://www.postgresql.org/docs/18/pgstatstatements.html).
2. Read `EXPLAIN (ANALYZE, BUFFERS)`: where do estimated and actual rows diverge, which node reads the most buffers? ([postgresql.md §16](postgresql.md#16-explain-and-the-planner)).
3. Fix the cause: missing/unused index, non-sargable predicate, stale statistics, fan-out join, too little `work_mem` for a sort/hash.
4. Re-measure with the same parameters.

BoonData: the whole loop (EXPLAIN → index → `ANALYZE` / `n_distinct` → `work_mem`, two steps graded by plan) is Engine lesson `content/engine/postgres/L5/18-tuning-loop.md` (v32).

## 2. Write predicates the index can use (sargable)

Status: verified.

- Wrapping the column in a function or cast hides it from a plain index: `WHERE date(created_at) = …`, `WHERE lower(email) = …`, `WHERE amount + 0 > …`. Rewrite as a range on the bare column, or create an expression index (catalogue Q11, I05; https://www.postgresql.org/docs/18/indexes-expressional.html).
- Leading-wildcard `LIKE '%x'` cannot use a B-tree; use `pg_trgm` ([postgresql.md §11](postgresql.md#11-indexes)).
- `OR` across different columns often becomes a BitmapOr or a Seq Scan; `UNION ALL` of two indexed queries can be faster.

```sql
CREATE FUNCTION plan_text(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text; o text := '';
BEGIN FOR r IN EXECUTE 'EXPLAIN ' || q LOOP o := o || r || ' '; END LOOP; RETURN o; END $$;
CREATE TABLE ev (id int PRIMARY KEY, at timestamptz NOT NULL, payload text);
INSERT INTO ev SELECT g, timestamptz '2026-01-01 00:00+00' + g * interval '10 minutes', 'x' FROM generate_series(1, 50000) g;
CREATE INDEX ev_at ON ev (at);
ANALYZE ev;
```

```sql
-- expect: [["false","true"]]
SELECT plan_text($q$SELECT * FROM ev WHERE date(at AT TIME ZONE 'UTC') = '2026-03-01'$q$) LIKE '%ev_at%',
       plan_text($q$SELECT * FROM ev WHERE at >= '2026-03-01 00:00+00' AND at < '2026-03-02 00:00+00'$q$) LIKE '%ev_at%';
```

## 3. Choose and shape indexes

Status: verified (composite order, index-only scan).

- Index the columns of selective `WHERE`, `JOIN` and `ORDER BY … LIMIT` clauses; a low-selectivity column (a boolean) alone rarely helps (catalogue I08).
- Composite: equality columns first, then the range or sort column (I02). One index on `(a, b)` serves `WHERE a = ?` and `WHERE a = ? ORDER BY b`.
- Index foreign-key columns you join or cascade-delete on (I06).
- `INCLUDE` extra columns to get an Index Only Scan (I04); it only skips the heap for pages marked all-visible, so it depends on `VACUUM`.
- Remove redundant indexes (`(a)` when `(a, b)` exists) and unused ones (I09).

```sql
CREATE TABLE sales (store int, day date, amount int);
INSERT INTO sales SELECT g % 50, date '2026-01-01' + (g % 300), g % 97 FROM generate_series(1, 60000) g;
CREATE INDEX sales_store_day ON sales (store, day) INCLUDE (amount);
```

```sql
VACUUM ANALYZE sales;
```

```sql
-- expect: [["true"]]
SELECT plan_text('SELECT day, amount FROM sales WHERE store = 7 ORDER BY day LIMIT 5') LIKE '%Index Only Scan%';
```

## 4. Joins and aggregation

Status: verified (fan-out).

- Aggregate child tables before joining them to the parent, or totals multiply (catalogue Q07).
- `EXISTS` for "has any", not `JOIN` + `DISTINCT` (Q20).
- Check the grain (one row per what?) before joining (A04).

```sql
-- expect: [["300","100"]]
CREATE TABLE o (id int PRIMARY KEY, total int);
CREATE TABLE pay (order_id int, amt int);
CREATE TABLE ship (order_id int, box int);
INSERT INTO o VALUES (1, 100);
INSERT INTO pay VALUES (1, 60), (1, 40);
INSERT INTO ship VALUES (1, 1), (1, 2), (1, 3);
SELECT (SELECT sum(p.amt) FROM o JOIN pay p ON p.order_id = o.id JOIN ship s ON s.order_id = o.id),
       (SELECT sum(amt) FROM pay WHERE order_id = 1);
```

## 5. Pagination and limits

Status: verified.

- `OFFSET n` reads and discards n rows; keyset pagination (`WHERE (k) > (last) ORDER BY k LIMIT n`) reads only the page (catalogue Q21).
- `count(*)` on a large table is a full scan in PostgreSQL (no stored row count); show "about N" from `pg_class.reltuples` when an estimate is enough.

```sql
-- expect: [["1001"],["1002"],["1003"]]
SELECT id FROM ev WHERE id > 1000 ORDER BY id LIMIT 3;
```

```sql
-- expect: [["true"]]
SELECT reltuples BETWEEN 45000 AND 55000 FROM pg_class WHERE relname = 'ev';
```

## 6. Statistics and the planner

Status: verified (examples here and in postgresql.md §16).

- `ANALYZE` samples each column (MCV list, histogram, n_distinct, correlation) into `pg_stats` (https://www.postgresql.org/docs/18/planner-stats.html). Autovacuum runs it after enough changes; run it yourself after a bulk load.
- `ALTER TABLE t ALTER COLUMN c SET (n_distinct = v)` overrides the sampled estimate (positive = a count, `-1`…`0` = a ratio of the row count) and `SET STATISTICS n` samples more; both are column options that reach `pg_stats` only at the next `ANALYZE` (https://www.postgresql.org/docs/18/sql-altertable.html).
- Correlated columns (city and postcode) fool the independence assumption; `CREATE STATISTICS … (dependencies, ndistinct, mcv)` fixes estimates (https://www.postgresql.org/docs/18/planner-stats.html#PLANNER-STATS-EXTENDED).

```sql
-- expect: [["50"]]
SELECT n_distinct::int FROM pg_stats WHERE tablename = 'sales' AND attname = 'store';
```

```sql
-- expect: [["1000","5000"]]
-- the override is stored at once but applied by the next ANALYZE
CREATE TABLE nd AS SELECT g % 1000 AS k FROM generate_series(1, 20000) g;
ANALYZE nd;
CREATE TEMP TABLE nd_before AS SELECT n_distinct::int AS v FROM pg_stats WHERE tablename = 'nd';
ALTER TABLE nd ALTER COLUMN k SET (n_distinct = 5000);
ANALYZE nd;
SELECT (SELECT v FROM nd_before), n_distinct::int FROM pg_stats WHERE tablename = 'nd';
```

Three planner facts the Engine L4 lessons rely on (all asserted below or in [postgresql.md §16](postgresql.md#16-explain-and-the-planner)):

- A table that was never analyzed is not planned as empty or as a fixed default: the planner scales a rows-per-page guess by the table's real page count. That is why a freshly loaded table often gets a sane row estimate but bad selectivity: the column statistics are still missing until `ANALYZE` (https://www.postgresql.org/docs/18/planner-stats.html).
- `SET enable_seqscan = off` (or any `enable_*`) is a diagnostic, not a fix. In PostgreSQL 18 it no longer adds a huge cost; the planner avoids disabled nodes when it can, uses one when there is no other path, and `EXPLAIN` prints `Disabled: true` on it. A plan that still shows the disabled node means no usable index exists (https://www.postgresql.org/docs/18/runtime-config-query.html#RUNTIME-CONFIG-QUERY-ENABLE).
- Prepared statements (and PL/pgSQL queries) switch from custom to generic plans after five executions when the generic plan is not clearly costlier. A query that is fast for common values and slow for a rare one may be a generic-plan problem; `plan_cache_mode = force_custom_plan` for that session or function is the targeted fix (https://www.postgresql.org/docs/18/sql-prepare.html, https://www.postgresql.org/docs/18/runtime-config-query.html#GUC-PLAN-CACHE-MODE).

```sql
-- expect: [["true"]]
-- `pay` has no index, so the disabled Seq Scan stays, marked rather than priced out
SET enable_seqscan = off;
SELECT plan_text('SELECT * FROM pay WHERE amt = 5') LIKE '%Seq Scan on pay%Disabled: true%';
```

```sql
RESET enable_seqscan;
```

## 7. Writes, maintenance and memory

Status: concept (not timed on PGlite).

- Batch writes: multi-row `INSERT`, `COPY`, one transaction per batch, and update large tables in chunks (catalogue P08).
- Keep autovacuum on; tune it per table for hot tables rather than turning it off (P03).
- `work_mem` is per sort/hash node per query; raise it for one report with `SET LOCAL`, not globally (P30; https://www.postgresql.org/docs/18/runtime-config-resource.html).
- Long transactions hold back `VACUUM` (old snapshots keep dead rows alive) and hold locks.
- Connection pooling matters on a real server (one process per connection); not relevant to PGlite.

## 8. Other engines in one line each

Status: summary, see the engine files.

- MySQL: `EXPLAIN ANALYZE` exists (8.4 manual); InnoDB tables are clustered on the primary key, so a short, increasing primary key matters more than in PostgreSQL (https://dev.mysql.com/doc/refman/8.4/en/explain.html, https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html).
- SQLite: `EXPLAIN QUERY PLAN`, `ANALYZE` fills `sqlite_stat1`, `VACUUM` rebuilds the file (https://www.sqlite.org/eqp.html).
- MongoDB: `explain("executionStats")`, the ESR rule ([nosql-mongodb.md §4](nosql-mongodb.md#4-indexes-and-explain)).
- DynamoDB: design keys so every read is a `Query`/`GetItem`, never a `Scan` ([nosql-dynamodb.md §3](nosql-dynamodb.md#3-query-and-scan)).

BoonData: General skills `explain_read`, `sargable`, `index_design`; Logistics chapter 11 grades plans; Engine L2 (indexes), L4 (planner, joins), L5 (`pg_stat_statements`, memory tuning, unused indexes).

## 9. Random samples

Status: verified.

- `ORDER BY random() LIMIT n` gives a uniform sample but reads and sorts every row, and every run differs (`setseed()` repeats it only inside one session) (https://www.postgresql.org/docs/18/functions-math.html#FUNCTIONS-MATH-RANDOM-TABLE).
- `FROM t TABLESAMPLE SYSTEM (p)` keeps whole pages (fast, rows come in clumps); `BERNOULLI (p)` keeps each row with probability p % (reads every page). Both take a percentage, so the sample size is only close to p %; `REPEATABLE (seed)` returns the same sample while the table does not change (https://www.postgresql.org/docs/18/sql-select.html#SQL-FROM).
- An estimate for the whole table scales the sample by 100 / p; `tsm_system_rows` (an extension, not in PGlite's preload) samples a fixed number of rows.

```sql
-- expect: [["true","true"]]
CREATE TABLE smp AS SELECT g AS id FROM generate_series(1, 20000) g;
SELECT (SELECT count(*) FROM smp TABLESAMPLE BERNOULLI (10) REPEATABLE (7)) = (SELECT count(*) FROM smp TABLESAMPLE BERNOULLI (10) REPEATABLE (7)),
       (SELECT count(*) FROM smp TABLESAMPLE BERNOULLI (10) REPEATABLE (7)) BETWEEN 1500 AND 2500;
```

BoonData: adv node `a11` (`content/general/adv.yml`, v32), drills graded on rows thanks to `REPEATABLE`.

## Sources

PostgreSQL 18: Performance Tips https://www.postgresql.org/docs/18/performance-tips.html · Indexes https://www.postgresql.org/docs/18/indexes.html · Using EXPLAIN https://www.postgresql.org/docs/18/using-explain.html. Others inline. Coverage suggested by tutorialspoint SQL/MySQL/SQLite/DBMS tables of contents (no text taken).
