# PostgreSQL 18 specifics

Status: verified. Every ```` ```sql ```` block below ran in order on one fresh PGlite 0.5.16 (PostgreSQL 18.6) database with `pg_trgm`, `pgcrypto` and `citext` loaded, and its `-- expect:` lines were asserted (see [README.md](README.md#verification)). A section's `Status: verified` means its examples ran with asserted results; prose statements are sourced from the linked manual page (see [README.md](README.md#verification-levels) for which pages were read during this work and which were only link-checked).

Sections follow the order of tutorialspoint's PostgreSQL table of contents ([tutorial-routes.md](tutorial-routes.md#postgresql)), then add the topics that the tutorial leaves out but the app needs (§16 onwards). Generic SQL (SELECT, joins, grouping, CTE, windows) is in [sql-core.md](sql-core.md) and is not repeated here.

## 1. Data types

Status: verified.

| Need | Use | Avoid | Source |
|---|---|---|---|
| Surrogate key | `bigint GENERATED ALWAYS AS IDENTITY` | `serial` (legacy, catalogue S04) | https://www.postgresql.org/docs/18/sql-createtable.html |
| Random/global key | `uuid` from `gen_random_uuid()` (v4) or `uuidv7()` (time-ordered, new in 18) | text UUIDs | https://www.postgresql.org/docs/18/functions-uuid.html |
| Money | `numeric(p,s)` | `float8`, the `money` type | https://www.postgresql.org/docs/18/datatype-numeric.html |
| Text | `text` (+ `CHECK` on length) | `char(n)` | https://www.postgresql.org/docs/18/datatype-character.html |
| Instant | `timestamptz` | `timestamp` for events | https://www.postgresql.org/docs/18/datatype-datetime.html |
| Flag | `boolean` | 'Y'/'N' text | https://www.postgresql.org/docs/18/datatype-boolean.html |
| Closed set | `CHECK (x IN (...))` or a lookup table | an `ENUM` you will need to reorder | https://www.postgresql.org/docs/18/datatype-enum.html |
| Semi-structured | `jsonb` | `json` (keeps text, no indexing) | https://www.postgresql.org/docs/18/datatype-json.html |
| List of values | `type[]` arrays, when never joined on | arrays as a substitute for a child table | https://www.postgresql.org/docs/18/arrays.html |
| Range/period | `daterange`, `tstzrange` (+ `EXCLUDE` for no-overlap) | two columns with no constraint | https://www.postgresql.org/docs/18/rangetypes.html |

```sql
-- expect: [["36","7"]]
SELECT length(gen_random_uuid()::text), substr(uuidv7()::text, 15, 1);
```

`timestamptz` stores an instant (UTC internally) and displays it in the session `TimeZone`:

```sql
-- expect: [["2026-10-31 07:00:00+07"]]
SET TimeZone = 'Asia/Ho_Chi_Minh';
SELECT '2026-10-31 00:00:00+00'::timestamptz::text;
```

Generated columns (`GENERATED ALWAYS AS (expr) STORED`, and since 18 also `VIRTUAL`, the new default) are computed from other columns of the row (https://www.postgresql.org/docs/18/ddl-generated-columns.html):

```sql
-- expect: [["10","3","30"]]
CREATE TABLE lines (qty int, price int, total int GENERATED ALWAYS AS (qty * price) STORED);
INSERT INTO lines (qty, price) VALUES (10, 3);
SELECT * FROM lines;
```

```sql
-- expect: [["v","s"]]
-- without STORED/VIRTUAL, PostgreSQL 18 makes a virtual generated column ('v'); 's' = stored
CREATE TABLE lines2 (qty int, price int, total int GENERATED ALWAYS AS (qty * price));
SELECT (SELECT attgenerated::text FROM pg_attribute WHERE attrelid = 'lines2'::regclass AND attname = 'total'),
       (SELECT attgenerated::text FROM pg_attribute WHERE attrelid = 'lines'::regclass AND attname = 'total');
```

## 2. Operators and expressions

Status: verified.

PostgreSQL-only operators worth knowing (https://www.postgresql.org/docs/18/functions.html): `||` string/array concatenation, `~ ~* !~` regex, `ILIKE`, `@>` / `<@` containment (arrays, ranges, jsonb), `&&` overlap, `->` / `->>` / `#>>` JSON access, `::` cast, `IS [NOT] DISTINCT FROM`.

```sql
-- expect: [["true","true","true","b"]]
SELECT ARRAY[1,2,3] @> ARRAY[2], 'Da Nang' ~* '^da', daterange('2026-10-01','2026-10-31') && daterange('2026-10-30','2026-11-02'),
       '{"a":{"b":"b"}}'::jsonb #>> '{a,b}';
```

## 3. Databases and schemas

Status: verified. `CREATE DATABASE` runs on PGlite 0.5.16 (a new row in `pg_database`; the connection stays in `postgres`); opening a second database was not tested.

- A cluster holds databases; a database holds schemas; a schema holds tables, views, functions. Queries cannot join across databases without an extension such as `postgres_fdw`; they can join across schemas (https://www.postgresql.org/docs/18/ddl-schemas.html).
- `search_path` decides where an unqualified name is looked up and where `CREATE` puts new objects. Since PostgreSQL 15 ordinary users cannot create objects in `public` by default.
- `CREATE DATABASE` cannot run inside a transaction block (25001), and so not inside a multi-statement string sent as one query either (an implicit transaction). A three-part name `db.schema.table` that names another database fails with 0A000.

```sql
-- expect: [["shop","42"]]
CREATE SCHEMA shop;
CREATE TABLE shop.items (id int);
INSERT INTO shop.items VALUES (42);
SET search_path = shop, public;
SELECT current_schema(), id FROM items;
```

```sql
RESET search_path;
```

BoonData: every domain lives in its own schema (`logistics`, `ecom`, `finance`, `lab`, `sandbox`); names come only from `SCHEMAS` in `src/domains.ts`, and each request runs `SET LOCAL search_path` after `BEGIN` (CLAUDE.md "General area").

## 4. Table operations (CREATE, ALTER, DROP, TRUNCATE, upsert)

Status: verified.

- `ALTER TABLE … ADD COLUMN c type DEFAULT v` is instant for a constant default (no table rewrite); changing a column type usually rewrites the table (https://www.postgresql.org/docs/18/sql-altertable.html).
- `ADD CONSTRAINT … NOT VALID` then `VALIDATE CONSTRAINT` checks old rows without blocking writes for long (catalogue P06).
- `DROP TABLE t CASCADE` also drops dependent views and foreign keys; read what it will drop first.
- `ON CONFLICT DO NOTHING` with no target skips a row that violates any unique constraint; on a table whose only key is a generated `id` it therefore never fires and duplicates get in. Two source rows with the same key in one `INSERT … ON CONFLICT DO UPDATE` fail with 21000 (the statement would update the same row twice); reduce the source to one row per key first. `DO UPDATE … WHERE cond` updates only when `cond` holds; in `SET`, the table name (or alias) is the existing row, `EXCLUDED` the proposed one. With no suitable unique key, `MERGE … ON <condition>` is the way. Verified on PGlite 0.5.16 against `lab` for the v26 R2 lesson `content/general/lessons/upsert.md`.
- Upsert: `INSERT … ON CONFLICT (cols) DO UPDATE SET c = EXCLUDED.c` or `DO NOTHING`. The conflict target needs a unique index or constraint on exactly those columns (https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT).

```sql
-- expect: [["A","5"],["B","1"]]
CREATE TABLE stock (sku text PRIMARY KEY, qty int NOT NULL);
INSERT INTO stock VALUES ('A', 2), ('B', 1);
INSERT INTO stock VALUES ('A', 3) ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty;
SELECT * FROM stock ORDER BY sku;
```

```sql
-- expect: error 42P10
-- no unique constraint on qty, so it cannot be a conflict target
INSERT INTO stock VALUES ('C', 1) ON CONFLICT (qty) DO NOTHING;
```

```sql
-- expect: [["A","5","kept"],["B","1","kept"],["C","4","new"]]
MERGE INTO stock s
USING (VALUES ('A', 0), ('C', 4)) AS v(sku, qty) ON s.sku = v.sku
WHEN MATCHED AND v.qty = 0 THEN DO NOTHING
WHEN NOT MATCHED THEN INSERT VALUES (v.sku, v.qty);
SELECT sku, qty, CASE WHEN sku = 'C' THEN 'new' ELSE 'kept' END FROM stock ORDER BY sku;
```

```sql
-- expect: [["INSERT","E"]]
-- MERGE … RETURNING (PostgreSQL 17+) with merge_action()
MERGE INTO stock s
USING (VALUES ('E', 7)) AS v(sku, qty) ON s.sku = v.sku
WHEN NOT MATCHED THEN INSERT VALUES (v.sku, v.qty)
RETURNING merge_action(), s.sku;
```

```sql
DELETE FROM stock WHERE sku = 'E';
```

## 5. Constraints, transactions, views

Status: verified. Generic rules are in [sql-core.md §12–14](sql-core.md#12-constraints); PostgreSQL-specific additions:

- `EXCLUDE USING gist (room WITH =, during WITH &&)` forbids overlapping bookings; it needs `btree_gist` for the `=` part on scalar columns (https://www.postgresql.org/docs/18/sql-createtable.html#SQL-CREATETABLE-EXCLUDE). Not run here (extension not loaded in the runner).
- Since PostgreSQL 18, a primary key or unique constraint can be `WITHOUT OVERLAPS` on a range column (temporal key), and foreign keys can use `PERIOD` (https://www.postgresql.org/docs/18/sql-createtable.html). Not run.
- DDL is transactional: a failed migration inside `BEGIN … COMMIT` leaves nothing behind.

```sql
-- expect: [["0"]]
BEGIN;
CREATE TABLE temp_audit (x int);
ROLLBACK;
SELECT count(*) FROM pg_class WHERE relname = 'temp_audit';
```

## 6. Built-in functions (aggregate, string, array, numeric, date/time)

Status: verified.

Function chapters: https://www.postgresql.org/docs/18/functions.html. The ones analysts use most:

- Aggregates: `count`, `sum`, `avg`, `min`, `max`, `string_agg(x, ',' ORDER BY x)`, `array_agg`, `bool_and/bool_or`, `percentile_cont(0.5) WITHIN GROUP (ORDER BY x)` (median, catalogue A09), `mode()`.
- Strings: `lower/upper`, `trim`, `split_part`, `substr`, `replace`, `concat_ws`, `format('%I %L', ident, literal)`, `regexp_replace`, `left/right`, `lpad`.
- Numbers: `round(numeric, n)` (`round(float8, n)` does not exist), `trunc`, `ceil/floor`, `abs`, `greatest/least`, `div`, `mod`.
- Arrays: `unnest`, `array_length(a, 1)`, `cardinality`, `array_position`, `ANY(a)`.
- Date/time: `date_trunc('month', ts)`, `extract(dow FROM d)`, `age`, `make_date`, `d + interval '1 month'`, `date - date` = integer days, `generate_series(start, stop, step)`, `to_char(ts, 'YYYY-MM')`, `AT TIME ZONE`.

```sql
-- expect: [["2.5","a,b,c","2","2026-10-01","30"]]
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY x)::text,
       (SELECT string_agg(v, ',' ORDER BY v) FROM unnest(ARRAY['c','a','b']) v),
       split_part('VNDAD-VNSGN-2', '-', 3),
       date_trunc('month', date '2026-10-31')::date::text,
       date '2026-10-31' - date '2026-10-01'
FROM unnest(ARRAY[1,2,3,4]) x;
```

```sql
-- expect: error 42883
-- round(double precision, integer) does not exist
SELECT round(2.345::float8, 2);
```

```sql
-- expect: [["2026-11-30","2026-02-28"]]
-- month arithmetic clamps to the last day of the month
SELECT (date '2026-10-31' + interval '1 month')::date::text, (date '2026-01-31' + interval '1 month')::date::text;
```

BoonData skills: `date_math`, `date_bucket`, `string_fn`, `pattern_match`, `cast` (`content/skills.yml`). In-game "today" is 2026-10-31 and Solutions use literal dates, never `now()` (CLAUDE.md "Content and seed rules").

## 7. Set and subquery operators (UNION, EXCEPT, ANY, ALL, EXISTS)

Status: verified, in [sql-core.md §7 and §10](sql-core.md#7-subqueries). PostgreSQL addition: `= ANY(array)` takes an array value, which is how a driver passes a list as one parameter (`WHERE id = ANY($1)`).

```sql
-- expect: [["2"]]
SELECT count(*) FROM unnest(ARRAY[1,2,3]) id WHERE id = ANY(ARRAY[2,3]);
```

`x op ALL (list)` is true over an empty list and never true when the list holds a NULL (that comparison is unknown); `x op ANY (empty)` is false. Verified on PGlite 0.5.16 against `lab` while writing the v25 R1 lesson `content/general/lessons/any_all.md` (https://www.postgresql.org/docs/18/functions-subquery.html#FUNCTIONS-SUBQUERY-ALL).

## 8. Client interfaces

Status: not covered on purpose. The tutorial's C/Java/PHP/Perl/Python chapters are driver tutorials. Rule that matters for any driver: send values as bind parameters (`$1`), never by string concatenation (see [security.md](security.md#1-sql-injection)). BoonData has no backend; the browser talks to PGlite through `src/db/worker.ts`.

## 9. NULL values

Status: verified, in [sql-core.md §3](sql-core.md#3-null-and-three-valued-logic).

## 10. Triggers

Status: verified.

- A trigger runs a function `BEFORE`, `AFTER` or `INSTEAD OF` (views only) an `INSERT/UPDATE/DELETE/TRUNCATE`, `FOR EACH ROW` or `FOR EACH STATEMENT` (https://www.postgresql.org/docs/18/trigger-definition.html).
- A `BEFORE ROW` trigger can change `NEW` or return `NULL` to skip the row. `AFTER` triggers see the final row.
- Trigger functions are written in PL/pgSQL (https://www.postgresql.org/docs/18/plpgsql-trigger.html). Prefer a constraint or a generated column when one can express the rule.

```sql
-- expect: [["2"]]
CREATE TABLE audit (tbl text, op text);
CREATE FUNCTION log_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit VALUES (TG_TABLE_NAME, TG_OP);
  RETURN NULL;  -- ignored for AFTER triggers
END $$;
CREATE TRIGGER stock_audit AFTER INSERT OR UPDATE ON stock FOR EACH ROW EXECUTE FUNCTION log_change();
INSERT INTO stock VALUES ('D', 1);
UPDATE stock SET qty = 2 WHERE sku = 'D';
SELECT count(*) FROM audit;
```

## 11. Indexes

Status: verified (creation, plan choice, skip scan, `CONCURRENTLY` as a single statement).

| Type | Answers | Source |
|---|---|---|
| B-tree (default) | `= < > BETWEEN IN`, `IS NULL`, sorting, `LIKE 'abc%'` with `text_pattern_ops` or C collation | https://www.postgresql.org/docs/18/btree.html |
| Hash | `=` only | https://www.postgresql.org/docs/18/indexes-types.html |
| GIN | containment in arrays/jsonb, full text, trigram (`pg_trgm`) | https://www.postgresql.org/docs/18/gin.html |
| GiST / SP-GiST | ranges, geometry, nearest neighbour, exclusion constraints | https://www.postgresql.org/docs/18/gist.html |
| BRIN | very large tables whose order follows a column (append-only time series) | https://www.postgresql.org/docs/18/brin.html |

Rules (https://www.postgresql.org/docs/18/indexes.html):

- Multicolumn B-tree: most useful when the leading column is constrained; since PostgreSQL 18 a "skip scan" can use later columns when the leading one has few distinct values (https://www.postgresql.org/docs/18/indexes-multicolumn.html). Order equality columns first, then range (catalogue I02).
- Partial index `WHERE status = 'open'` indexes only the rows queries ask for (I03). Expression index `ON t (lower(email))` serves `WHERE lower(email) = …` (I05). `INCLUDE (cols)` enables index-only scans (I04).
- A unique index enforces uniqueness; a unique constraint creates one.
- Every index slows writes and takes space; drop unused ones (`pg_stat_user_indexes.idx_scan = 0`, I09).
- `CREATE INDEX CONCURRENTLY` avoids blocking writes on a live table but cannot run inside a transaction block (P05).

`EXPLAIN` cannot be used as a subquery, so the examples read plans through a small helper:

```sql
CREATE FUNCTION plan_text(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text; o text := '';
BEGIN
  FOR r IN EXECUTE 'EXPLAIN ' || q LOOP o := o || r || ' '; END LOOP;
  RETURN o;
END $$;
CREATE FUNCTION plan_json(q text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE j json;
BEGIN
  EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j;
  RETURN j::jsonb;
END $$;
```

```sql
-- expect: [["true"]]
CREATE TABLE events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind text, at date);
INSERT INTO events (kind, at) SELECT CASE WHEN g % 100 = 0 THEN 'error' ELSE 'ok' END, date '2026-01-01' + g % 300 FROM generate_series(1, 20000) g;
CREATE INDEX events_error_at ON events (at) WHERE kind = 'error';
ANALYZE events;
SELECT plan_text($q$SELECT * FROM events WHERE kind = 'error' AND at = '2026-05-01'$q$) LIKE '%events_error_at%';
```

```sql
-- expect: [["true"]]
-- trigram GIN index answers LIKE '%…%' (pg_trgm, https://www.postgresql.org/docs/18/pgtrgm.html)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE names (n text);
INSERT INTO names SELECT 'customer ' || g FROM generate_series(1, 20000) g;
CREATE INDEX names_trgm ON names USING gin (n gin_trgm_ops);
ANALYZE names;
SET enable_seqscan = off;
SELECT plan_text($q$SELECT * FROM names WHERE n LIKE '%omer 1234%'$q$) LIKE '%names_trgm%';
```

```sql
RESET enable_seqscan;
```

`CREATE INDEX CONCURRENTLY` runs only as a statement of its own, outside a transaction block:

```sql
CREATE INDEX CONCURRENTLY events_kind_at ON events (kind, at);
```

```sql
-- expect: error 25001
BEGIN;
CREATE INDEX CONCURRENTLY events_at_c ON events (at);
```

Skip scan (PostgreSQL 18): the `(kind, at)` index answers a filter on `at` alone, because `kind` has only two values:

```sql
-- expect: [["true"]]
ANALYZE events;
SELECT plan_text($q$SELECT * FROM events WHERE at = '2026-05-01'$q$) LIKE '%events_kind_at%';
```

BoonData: Logistics chapter 11 is the index lab (`isCreateIndex`, `runLab`; `container_events` deliberately has no index on `container_id`); skills `explain_read`, `sargable`, `index_design`; Engine L2 "indexes" lessons (`content/engine/postgres/L2/`).

## 12. Locks

Status: syntax verified; blocking behaviour not verified (needs two sessions).

- Row locks: `SELECT … FOR UPDATE` (exclusive), `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`; `NOWAIT` errors instead of waiting, `SKIP LOCKED` skips locked rows (job queues) (https://www.postgresql.org/docs/18/sql-select.html#SQL-FOR-UPDATE-SHARE).
- Table locks: eight modes from `ACCESS SHARE` (plain SELECT) to `ACCESS EXCLUSIVE` (most `ALTER TABLE`, `DROP`, `TRUNCATE`, `VACUUM FULL`); conflict table at https://www.postgresql.org/docs/18/explicit-locking.html.
- Readers never block writers and writers never block readers (MVCC, §14); writers block writers on the same row.
- Set `lock_timeout` before DDL on a busy table so a waiting `ACCESS EXCLUSIVE` request does not queue every later query behind it (catalogue P13).
- Deadlocks are detected after `deadlock_timeout` (1 s default) and one transaction is aborted with SQLSTATE `40P01`.

```sql
-- expect: [["A"]]
BEGIN;
SET LOCAL lock_timeout = '2s';
SELECT sku FROM stock WHERE sku = 'A' FOR UPDATE SKIP LOCKED;
```

```sql
COMMIT;
```

## 13. Auto increment and sequences

Status: verified.

- `GENERATED ALWAYS AS IDENTITY` is the standard form; it owns a sequence. `serial` is older shorthand for `integer DEFAULT nextval(...)`.
- Sequences are not transactional: a rolled-back insert still consumes a value, so gaps are normal (https://www.postgresql.org/docs/18/functions-sequence.html). Never use identity values as a gap-free invoice number.

```sql
CREATE TABLE tickets (id int GENERATED ALWAYS AS IDENTITY, t text);
INSERT INTO tickets (t) VALUES ('a');
```

```sql
BEGIN;
INSERT INTO tickets (t) VALUES ('b');
ROLLBACK;
```

```sql
-- expect: [["3"]]
INSERT INTO tickets (t) VALUES ('c');
-- run after the three statements above: 'b' was rolled back but kept id 2
SELECT max(id) FROM tickets;
```

## 14. Privileges

Status: summary; examples are in [security.md](security.md#2-roles-and-privileges).

## 15. Errors and messages, RAISE and ASSERT

Status: verified.

- Every error has a five-character SQLSTATE (`23505` unique violation, `23503` foreign key, `23514` check, `42P01` undefined table, `42703` undefined column, `22012` division by zero, `40001` serialization failure, `40P01` deadlock) (https://www.postgresql.org/docs/18/errcodes-appendix.html). Code should branch on SQLSTATE, never on message text.
- PL/pgSQL: `RAISE NOTICE/WARNING/EXCEPTION 'text %', value USING ERRCODE = '…', HINT = '…'`; `ASSERT cond, 'message'` raises `P0004` when false and can be turned off with `plpgsql.check_asserts` (https://www.postgresql.org/docs/18/plpgsql-errors-and-messages.html).
- Block-level `EXCEPTION WHEN unique_violation THEN …` catches errors; each such block sets up a subtransaction, which costs something.

```sql
-- expect: [["caught 23505"]]
DO $$
BEGIN
  INSERT INTO stock VALUES ('A', 1);
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'dup';
  CREATE TEMP TABLE r AS SELECT 'caught ' || SQLSTATE AS msg;
END $$;
SELECT msg FROM r;
```

```sql
-- expect: error P0004
DO $$ BEGIN ASSERT (SELECT count(*) FROM stock) > 100, 'stock too small'; END $$;
```

BoonData: `SqlError` carries `code`/`position`/`hint`, and `src/ui/sqlErrors.ts` maps SQLSTATE to Boon's teaching notes.

## 16. EXPLAIN and the planner

Status: verified.

- `EXPLAIN` shows the plan with estimated cost (`startup..total`, in arbitrary units), rows and width; `EXPLAIN ANALYZE` runs the query and adds actual time and rows; `BUFFERS` (on by default with `ANALYZE` since 18) adds pages read (https://www.postgresql.org/docs/18/using-explain.html).
- Read bottom-up/inside-out. Big gaps between estimated and actual rows point to stale or missing statistics (`ANALYZE`, extended statistics `CREATE STATISTICS`) (catalogue P01).
- Scan nodes: Seq Scan, Index Scan, Index Only Scan (needs the visibility map to be current), Bitmap Heap/Index Scan. Joins: Nested Loop, Hash Join, Merge Join.
- `EXPLAIN ANALYZE` on `INSERT/UPDATE/DELETE` really writes; wrap it in `BEGIN … ROLLBACK`.

```sql
-- expect: [["Index Scan"]]
SELECT plan_json('SELECT * FROM events WHERE id = 5') -> 0 -> 'Plan' ->> 'Node Type';
```

```sql
-- expect: [["true"]]
-- PostgreSQL 18: EXPLAIN ANALYZE prints Buffers without asking for BUFFERS
SELECT plan_text('(ANALYZE) SELECT count(*) FROM events') LIKE '%Buffers:%';
```

BoonData: the EXPLAIN tab uses `EXPLAIN (ANALYZE, FORMAT JSON)` inside `BEGIN … ROLLBACK`; chapter 11 grades plans on node types and planner cost, never milliseconds (`src/planCheck.ts`).

## 17. MVCC, VACUUM and ANALYZE

Status: verified (new row version on UPDATE; VACUUM sets the visibility map). Page-level internals are taught by the Engine L3 labs (`content/engine/postgres/L3/`).

- An `UPDATE` writes a new row version and marks the old one dead (`xmax`); a `DELETE` only marks it. Each transaction sees the versions committed before its snapshot (https://www.postgresql.org/docs/18/mvcc-intro.html).
- `VACUUM` makes dead space reusable and updates the visibility map; it does not shrink the file (`VACUUM FULL` rewrites the table under an `ACCESS EXCLUSIVE` lock). Autovacuum does both `VACUUM` and `ANALYZE` in the background; keep it on (catalogue P03) (https://www.postgresql.org/docs/18/routine-vacuuming.html).
- Transaction IDs are 32-bit; freezing old rows prevents wraparound.
- HOT updates (no indexed column changed, room on the page) avoid new index entries (https://www.postgresql.org/docs/18/storage-hot.html).

```sql
-- expect: [["true"]]
-- an UPDATE gives the row a new physical location (ctid)
CREATE TABLE v (id int, x int);
INSERT INTO v VALUES (1, 1);
CREATE TEMP TABLE before AS SELECT ctid AS c FROM v;
UPDATE v SET x = 2;
SELECT (SELECT ctid FROM v) <> (SELECT c FROM before);
```

`VACUUM` cannot run inside a transaction block, so it is a block of its own:

```sql
VACUUM v;
```

```sql
-- expect: [["1"]]
-- the table's only page is now marked all-visible (index-only scans can skip it)
SELECT relallvisible FROM pg_class WHERE relname = 'v';
```

## 18. JSONB

Status: verified.

- `->` returns jsonb, `->>` returns text; `@>` containment, `?` key exists, `jsonb_path_query` (SQL/JSON path), `jsonb_set`, `||` merge, `-` delete key (https://www.postgresql.org/docs/18/functions-json.html).
- PostgreSQL 17 added SQL-standard `JSON_TABLE`, `JSON_VALUE`, `JSON_QUERY`, `JSON_EXISTS`.
- A GIN index on a jsonb column (`jsonb_ops`, or `jsonb_path_ops` for `@>` only) serves containment queries.
- Model fields you filter, join or constrain on as real columns; keep jsonb for the variable part.

```sql
-- expect: [["Hue","2"]]
CREATE TABLE docs (d jsonb);
INSERT INTO docs VALUES ('{"city":"Hue","tags":["a","b"]}'), ('{"city":"Da Nang","tags":[]}');
SELECT d ->> 'city', jsonb_array_length(d -> 'tags') FROM docs WHERE d @> '{"city":"Hue"}';
```

```sql
-- expect: [["Hue","a"],["Hue","b"]]
SELECT jt.* FROM docs, JSON_TABLE(d, '$' COLUMNS (city text PATH '$.city', NESTED PATH '$.tags[*]' COLUMNS (tag text PATH '$'))) jt
WHERE jt.tag IS NOT NULL ORDER BY 2;
```

## 19. Full-text search

Status: verified.

- `to_tsvector(config, text)` normalises words into lexemes; `to_tsquery`/`plainto_tsquery`/`websearch_to_tsquery` build queries; `@@` matches; `ts_rank` ranks; index with GIN on the tsvector (often a stored generated column) (https://www.postgresql.org/docs/18/textsearch-intro.html).
- The `simple` config does no stemming; `english` stems ("ships" → "ship"). There is no built-in Vietnamese stemmer; `simple` (+ `unaccent`) is the usual choice.
- For substring/fuzzy matching use `pg_trgm` instead (§11).

```sql
-- expect: [["true","false"]]
SELECT to_tsvector('english', 'Ships delayed at the port') @@ to_tsquery('english', 'ship & port'),
       to_tsvector('simple', 'Ships delayed at the port') @@ to_tsquery('simple', 'ship');
```

## 20. Extensions

Status: verified for `pg_trgm`, `pgcrypto`, `citext` (loaded at PGlite construction).

- `CREATE EXTENSION name` installs a packaged set of types/functions/operators into the current database (https://www.postgresql.org/docs/18/sql-createextension.html). Contrib list: https://www.postgresql.org/docs/18/contrib.html.
- In PGlite an extension must also be passed to the `PGlite` constructor before `CREATE EXTENSION` works; the measured list for 0.5.16 is in `docs/team/db-engine-knowledge.md` §1.2, and `src/engine/pglab/runner.ts` (`extensionsOf`) preloads them per lab.

```sql
-- expect: [["true","60"]]
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT 'An'::citext = 'AN'::citext, length(crypt('secret', gen_salt('bf')));
```

## 21. Partitioning

Status: verified.

- Declarative partitioning: `PARTITION BY RANGE | LIST | HASH`; each partition is a table; rows are routed on insert; queries with a filter on the key skip other partitions (pruning) (https://www.postgresql.org/docs/18/ddl-partitioning.html).
- Primary keys and unique constraints on a partitioned table must include the partition key.
- Worth it for retention (drop a whole month) and very large tables, not as a general speed-up (catalogue P17).

```sql
-- expect: [["p2026_10","1"]]
CREATE TABLE readings (at date NOT NULL, v int) PARTITION BY RANGE (at);
CREATE TABLE p2026_10 PARTITION OF readings FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE p2026_11 PARTITION OF readings FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
INSERT INTO readings VALUES ('2026-10-05', 1), ('2026-11-05', 2);
SELECT tableoid::regclass::text, count(*) FROM readings WHERE at < '2026-11-01' GROUP BY 1;
```

```sql
-- expect: [["false"]]
-- pruning: the plan never mentions the November partition
SELECT plan_text($q$SELECT * FROM readings WHERE at = '2026-10-05'$q$) LIKE '%p2026_11%';
```

## 22. Row-level security

Status: verified (policy with a non-superuser role). Full rules in [security.md §3](security.md#3-row-level-security).

## 23. PL/pgSQL functions and procedures

Status: verified.

- `CREATE FUNCTION … LANGUAGE sql` for one expression or query; `LANGUAGE plpgsql` for control flow (https://www.postgresql.org/docs/18/plpgsql.html).
- Volatility (`IMMUTABLE`, `STABLE`, `VOLATILE`) tells the planner what it may cache or inline. Index expressions must be immutable: a PL/pgSQL function not marked `IMMUTABLE` is refused (42P17), but a simple `LANGUAGE sql` function is inlined first, so its body is checked instead of its label (a `VOLATILE` `SELECT i + 1` is accepted). Mark functions honestly anyway.
- `CREATE PROCEDURE` + `CALL` can `COMMIT` inside its body only when the `CALL` itself is not inside a transaction block (else 2D000); functions never can (2D000).
- `SECURITY DEFINER` functions run with the owner's rights; set `search_path` on them (security.md).

```sql
-- expect: [["165"]]
CREATE FUNCTION add_vat(x numeric) RETURNS numeric LANGUAGE sql IMMUTABLE RETURN round(x * 1.10, 0);  -- 10 % VAT
SELECT add_vat(150);
```

## Sources

PostgreSQL 18 manual (https://www.postgresql.org/docs/18/), pages cited inline. PGlite: https://pglite.dev/docs/ and https://pglite.dev/extensions/. Coverage suggested by https://www.tutorialspoint.com/postgresql/index.htm (no text taken).
