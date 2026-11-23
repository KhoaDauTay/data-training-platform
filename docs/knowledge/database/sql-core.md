# SQL core: statements, queries and their semantics

Status: verified (examples ran on PGlite with asserted results; prose is sourced from the linked PostgreSQL 18 pages, link-checked, see [README.md](README.md#verification-levels)). Sections are ordered by query semantics, not by the tutorial's order; [boondata-gap-map.md](boondata-gap-map.md) gives the tutorial order and links each route point to its section here. Route points: tutorialspoint SQL tutorial sections "SQL Queries", "SQL Views", "SQL Operators and Clauses", "SQL Joins", "SQL Keys", "Advanced SQL" and the matching PostgreSQL, MySQL and SQLite chapters ([tutorial-routes.md](tutorial-routes.md#sql); per-chapter links in [boondata-gap-map.md](boondata-gap-map.md)). New route points get a new `## N.` section with its own Status line; existing headings stay stable because the gap map links to them.

Standard SQL as PostgreSQL 18 runs it. Dialect differences (TOP, `SHOW TABLES`, `||` in MySQL, clustered indexes…) live in [mysql-sqlite-differences.md](mysql-sqlite-differences.md). Every ```` ```sql ```` block in this file runs in order on one fresh PGlite 0.5.16 database (PostgreSQL 18.6) and `-- expect:` lines are asserted; see [README.md](README.md#verification).

Primary reference for the whole file: PostgreSQL 18 manual, Part II "The SQL Language" (https://www.postgresql.org/docs/18/sql.html).

## 0. Sample data used below

```sql
CREATE TABLE customers (
  id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    text NOT NULL,
  city    text            -- NULL = unknown
);
CREATE TABLE orders (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id integer REFERENCES customers (id),
  placed_on   date    NOT NULL,
  amount      numeric(12,2) NOT NULL CHECK (amount >= 0)
);
INSERT INTO customers (name, city) VALUES ('An', 'Da Nang'), ('Binh', 'Hue'), ('Chi', NULL), ('Dung', 'Da Nang');
INSERT INTO orders (customer_id, placed_on, amount) VALUES
  (1, '2026-10-01', 100), (1, '2026-10-15', 250), (2, '2026-10-02', 80),
  (4, '2026-10-20', 250), (NULL, '2026-10-21', 40);
```

## 1. Statement families

Status: verified on PGlite 0.5.16.

| Family | Statements | Notes |
|---|---|---|
| DDL | `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `COMMENT` | In PostgreSQL DDL is transactional: a `ROLLBACK` undoes a `CREATE TABLE` (https://www.postgresql.org/docs/18/sql-commands.html). |
| DML | `INSERT`, `UPDATE`, `DELETE`, `MERGE` | `RETURNING` gives back the changed rows (https://www.postgresql.org/docs/18/dml-returning.html). |
| Query | `SELECT`, `VALUES`, `TABLE t` | `TABLE t` = `SELECT * FROM t`. |
| DCL | `GRANT`, `REVOKE` | See [security.md](security.md). |
| TCL | `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` | See §14. |

`TRUNCATE` empties a table without scanning it and does not fire `ON DELETE` triggers; `DELETE` without `WHERE` removes rows one by one (https://www.postgresql.org/docs/18/sql-truncate.html).

```sql
-- expect: [["5","1"]]
WITH ins AS (INSERT INTO customers (name) VALUES ('Em') RETURNING id)
SELECT id, (SELECT count(*) FROM ins) FROM ins;
```

```sql
DELETE FROM customers WHERE name = 'Em';
```

Values pair with the column list by position, not by name: swapping two columns of the same type in the list writes the data into the wrong columns with no error. Always write the column list; leave generated columns (`id`) out. `INSERT … SELECT` takes its rows from a query; `CREATE TABLE t AS SELECT …` makes a new table from a result (columns and data only: no keys, constraints or indexes; https://www.postgresql.org/docs/18/sql-createtableas.html). Postgres also accepts `SELECT … INTO t FROM …`, but its manual recommends `CREATE TABLE AS`.

A condition from another table: `UPDATE t SET … FROM other o WHERE o.id = t.other_id` and `DELETE FROM t USING other o WHERE …` (Postgres syntax; a subquery in `WHERE` is the standard form). Without the join condition every target row pairs with every `other` row and the whole table is hit (https://www.postgresql.org/docs/18/sql-update.html). Delete duplicates by pairing the table with itself and deleting one side only: `DELETE FROM p USING p q WHERE … AND p.id > q.id` (`<>` deletes both copies). Verified on PGlite 0.5.16 against `lab` for the v26 R2 lessons `content/general/lessons/insert_select.md`, `update_join.md`.

Upsert is `INSERT … ON CONFLICT (key) DO UPDATE SET col = EXCLUDED.col` (https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT). `MERGE` is the standard form and since PostgreSQL 17 also supports `RETURNING` (https://www.postgresql.org/docs/18/sql-merge.html).

## 2. Logical order of a SELECT

Status: verified on PGlite 0.5.16.

A query is written `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT` but is evaluated as:

`FROM`/`JOIN` → `WHERE` → `GROUP BY` → aggregates → `HAVING` → window functions → `SELECT` list → `DISTINCT` → set operations → `ORDER BY` → `LIMIT/OFFSET` (https://www.postgresql.org/docs/18/sql-select.html, section "Description").

Consequences:

- A `SELECT` alias cannot be used in `WHERE` (not computed yet), but can be used in `ORDER BY`.
- Aggregates cannot appear in `WHERE`; filter groups in `HAVING`.
- Window functions cannot appear in `WHERE` or `HAVING`; filter their result in an outer query.

```sql
-- expect: error 42703
SELECT amount * 2 AS doubled FROM orders WHERE doubled > 200;
```

```sql
-- expect: [["500.00"],["500.00"]]
SELECT amount * 2 AS doubled FROM orders WHERE amount * 2 > 400 ORDER BY doubled;
```

BoonData: the "Thứ tự thực thi" tab (`src/viz/steps.ts`) shows exactly this order per clause.

## 3. NULL and three-valued logic

Status: verified on PGlite 0.5.16.

`NULL` means unknown. Any comparison with `NULL` (`=`, `<>`, `<`) yields `NULL`, and `WHERE` keeps only rows where the condition is `true` (https://www.postgresql.org/docs/18/functions-comparison.html).

- Test with `IS NULL` / `IS NOT NULL`, never `= NULL`.
- `IS DISTINCT FROM` is the null-safe `<>`.
- `NOT IN (subquery)` returns no rows at all if the subquery yields a `NULL` (https://www.postgresql.org/docs/18/functions-subquery.html#FUNCTIONS-SUBQUERY-NOTIN). Use `NOT EXISTS`.
- `count(*)` counts rows; `count(col)` counts non-null values; `sum` of zero rows is `NULL`, not 0 (https://www.postgresql.org/docs/18/functions-aggregate.html).
- `COALESCE(a, b)` returns the first non-null argument.
- `ORDER BY` puts `NULL`s last ascending, first descending, unless `NULLS FIRST/LAST` is given.

```sql
-- expect: [["0"]]
SELECT count(*) FROM customers WHERE city = NULL;
```

```sql
-- expect: [["1"]]
SELECT count(*) FROM customers WHERE city IS NULL;
```

```sql
-- expect: [["0"]]
-- the orders.customer_id NULL makes NOT IN unknown for every customer
SELECT count(*) FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);
```

```sql
-- expect: [["1"]]
SELECT count(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

```sql
-- expect: [["5","4",null,"0"]]
SELECT count(*), count(customer_id),
       (SELECT sum(amount) FROM orders WHERE false),
       COALESCE((SELECT sum(amount) FROM orders WHERE false), 0)
FROM orders;
```

```sql
-- expect: [["true","false"]]
SELECT NULL IS DISTINCT FROM 1, NULL IS DISTINCT FROM NULL;
```

BoonData skills: `null_logic`, `coalesce`, `anti_join` (`content/skills.yml`); catalogue Q01–Q05.

## 4. Filtering and expressions

Status: verified on PGlite 0.5.16.

- `BETWEEN a AND b` is inclusive at both ends. For timestamps use a half-open range `>= start AND < next_start` (catalogue Q12).
- `LIKE` patterns: `%` any run, `_` one character; `ILIKE` is PostgreSQL's case-insensitive form; regular expressions use `~` (https://www.postgresql.org/docs/18/functions-matching.html).
- `IN (list)`, `= ANY (array)`, `<> ALL (...)` (https://www.postgresql.org/docs/18/functions-comparisons.html).
- `CASE WHEN … THEN … ELSE … END` returns `NULL` when no branch matches and there is no `ELSE` (https://www.postgresql.org/docs/18/functions-conditional.html).
- Integer division truncates: `7 / 2 = 3`. Cast one side first (catalogue Q13).

```sql
-- expect: [["3","3.5000000000000000"]]
SELECT 7 / 2, 7::numeric / 2;
```

```sql
-- expect: [["2"]]
SELECT count(*) FROM orders WHERE placed_on >= '2026-10-01' AND placed_on < '2026-10-03';
```

## 5. Joins

Status: verified on PGlite 0.5.16.

| Join | Keeps |
|---|---|
| `INNER JOIN … ON` | pairs that match |
| `LEFT JOIN` | every left row; right columns `NULL` when no match |
| `RIGHT JOIN` | mirror of `LEFT` |
| `FULL JOIN` | every row of both sides |
| `CROSS JOIN` | every pair (Cartesian product) |
| self join | a table joined to itself under two aliases |

Source: https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-JOIN

Pitfalls:

- A condition on the right table of a `LEFT JOIN` placed in `WHERE` turns it into an inner join; put it in `ON` (catalogue Q06).
- Joining two child tables to one parent multiplies rows (fan-out). Aggregate each child first (catalogue Q07).
- `USING (col)` merges the column into one; `NATURAL JOIN` joins on every same-named column and breaks silently when a column is added. Avoid `NATURAL`.

```sql
-- expect: [["An","2"],["Binh","1"],["Chi","0"],["Dung","1"]]
SELECT c.name, count(o.id)
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name ORDER BY c.name;
```

```sql
-- expect: [["An","1"],["Binh","0"],["Chi","0"],["Dung","1"]]
-- filter on the right table stays in ON, so customers without big orders are kept
SELECT c.name, count(o.id)
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.amount >= 200
GROUP BY c.name ORDER BY c.name;
```

```sql
-- expect: [["6"]]
-- FULL JOIN: 4 customers (Chi unmatched) + the order with no customer
SELECT count(*) FROM customers c FULL JOIN orders o ON o.customer_id = c.id;
```

UPDATE/DELETE with a join use `UPDATE … FROM` and `DELETE … USING` in PostgreSQL (https://www.postgresql.org/docs/18/sql-update.html, https://www.postgresql.org/docs/18/sql-delete.html); MySQL writes `UPDATE t1 JOIN t2 …` instead.

BoonData skills: `join`, `multi_join`, `left_join`, `self_join`, `full_join`, `anti_join`.

## 6. Grouping and aggregates

Status: verified on PGlite 0.5.16.

- Every non-aggregated column in the `SELECT` list must be in `GROUP BY` or functionally dependent on a grouped primary key (https://www.postgresql.org/docs/18/sql-select.html#SQL-GROUPBY).
- `WHERE` filters rows before grouping, `HAVING` filters groups after.
- `agg(x) FILTER (WHERE cond)` aggregates a subset in the same pass (https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-AGGREGATES).
- `count(DISTINCT x)` is not additive: per-day distinct counts do not sum to a monthly distinct count (catalogue A21).
- `GROUPING SETS`, `ROLLUP`, `CUBE` produce several grouping levels in one query; `GROUPING(col)` tells a subtotal `NULL` from a data `NULL` (https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-GROUPING-SETS).

```sql
-- expect: [["Da Nang","600.00","3"],["Hue","80.00","0"]]
SELECT c.city, sum(o.amount), count(*) FILTER (WHERE o.amount >= 100)
FROM orders o JOIN customers c ON c.id = o.customer_id
GROUP BY c.city HAVING sum(o.amount) > 50 ORDER BY c.city;
```

```sql
-- expect: [["Da Nang","600.00"],["Hue","80.00"],[null,"680.00"]]
SELECT c.city, sum(o.amount)
FROM orders o JOIN customers c ON c.id = o.customer_id
GROUP BY ROLLUP (c.city) ORDER BY c.city NULLS LAST;
```

BoonData skills: `aggregate`, `group_by`, `having`, `conditional_agg`, `distinct`, `distinct_on`.

## 7. Subqueries

Status: verified on PGlite 0.5.16.

| Form | Returns | Typical use |
|---|---|---|
| scalar `(SELECT …)` | one value (error if more than one row; `NULL` if none) | compare to an overall figure |
| `IN (SELECT …)` / `= ANY` | membership | semi join |
| `EXISTS (SELECT …)` | true/false, stops at the first row | semi/anti join, NULL-safe |
| correlated | re-evaluated per outer row (logically) | per-row comparisons |
| derived table `FROM (SELECT …) AS x` | a relation | pre-aggregate before joining |
| `LATERAL` | derived table that may reference earlier FROM items | top-N per group |

Source: https://www.postgresql.org/docs/18/functions-subquery.html, https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-LATERAL

```sql
-- expect: [["An","250.00"],["Binh","80.00"],["Dung","250.00"]]
SELECT c.name, big.amount
FROM customers c
CROSS JOIN LATERAL (SELECT amount FROM orders o WHERE o.customer_id = c.id ORDER BY amount DESC LIMIT 1) big
ORDER BY c.name;
```

```sql
-- expect: error 21000
-- a scalar subquery that returns more than one row is an error
SELECT (SELECT amount FROM orders);
```

BoonData skills: `scalar_subquery`, `in_subquery`, `exists`, `correlated_value`.

## 8. Common table expressions

Status: verified on PGlite 0.5.16.

- `WITH name AS (…)` names a step; several CTEs are comma-separated (https://www.postgresql.org/docs/18/queries-with.html).
- Since PostgreSQL 12 a CTE referenced once and free of side effects is inlined into the outer query; `MATERIALIZED` / `NOT MATERIALIZED` override that.
- Data-modifying statements in `WITH` all run against the same snapshot and cannot see each other's changes.
- `WITH RECURSIVE` = a non-recursive term `UNION [ALL]` a recursive term; it stops when an iteration yields no rows. Use `UNION` (or the `CYCLE` clause) to guard against cycles.

```sql
-- expect: [["1"],["2"],["3"],["4"],["5"]]
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5)
SELECT i FROM n;
```

```sql
-- expect: [["2026-10-01","100.00"],["2026-10-02","80.00"],["2026-10-03","0"]]
-- date spine: days without orders still appear (catalogue A01)
WITH days AS (SELECT d::date AS day FROM generate_series('2026-10-01'::date, '2026-10-03', '1 day') d)
SELECT days.day::text, COALESCE(sum(o.amount), 0)
FROM days LEFT JOIN orders o ON o.placed_on = days.day
GROUP BY days.day ORDER BY days.day;
```

BoonData skills: `cte`, `multi_cte`.

## 9. Window functions

Status: verified on PGlite 0.5.16.

`f(...) OVER (PARTITION BY … ORDER BY … frame)` computes over related rows without collapsing them (https://www.postgresql.org/docs/18/tutorial-window.html, https://www.postgresql.org/docs/18/functions-window.html).

- Ranking: `row_number()` (unique), `rank()` (ties share, gaps after), `dense_rank()` (ties share, no gaps).
- Offset: `lag(x, n, default)`, `lead`, `first_value`, `last_value`, `nth_value`.
- Aggregates as windows: `sum(x) OVER (…)`.
- Default frame with `ORDER BY` is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: peers (equal sort keys) are summed together. Write `ROWS` for a per-row running total (catalogue Q18). `last_value` with the default frame returns the current row's peer group end, not the partition's last row (catalogue A15).

```sql
-- expect: [["100.00","1","1","1"],["250.00","2","2","2"],["250.00","2","2","3"]]
SELECT amount,
       rank()       OVER (ORDER BY amount),
       dense_rank() OVER (ORDER BY amount),
       row_number() OVER (ORDER BY amount, id)
FROM orders WHERE customer_id IN (1, 4) ORDER BY amount, id;
```

```sql
-- expect: [["100.00","100.00","100.00"],["250.00","600.00","350.00"],["250.00","600.00","600.00"]]
-- RANGE (default) sums peers together; ROWS gives a true running total
SELECT amount,
       sum(amount) OVER (ORDER BY amount),
       sum(amount) OVER (ORDER BY amount, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
FROM orders WHERE customer_id IN (1, 4) ORDER BY amount, id;
```

```sql
-- expect: [["1","100.00",null],["1","250.00","100.00"]]
SELECT customer_id, amount, lag(amount) OVER (PARTITION BY customer_id ORDER BY placed_on)
FROM orders WHERE customer_id = 1 ORDER BY placed_on;
```

Filter on a window result in an outer query (catalogue Q19):

```sql
-- expect: [["1","250.00"],["2","80.00"],["4","250.00"]]
SELECT customer_id, amount FROM (
  SELECT customer_id, amount, row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC, id) AS rn
  FROM orders WHERE customer_id IS NOT NULL
) t WHERE rn = 1 ORDER BY customer_id;
```

BoonData skills: `window_rank`, `window_lag`, `window_agg` (Logistics chapter 10).

## 10. Set operations

Status: verified on PGlite 0.5.16.

`UNION` (removes duplicates), `UNION ALL` (keeps them, cheaper), `INTERSECT`, `EXCEPT`; the `ALL` forms keep multiplicity. Both sides need the same number of columns with compatible types; `ORDER BY` applies to the whole result (https://www.postgresql.org/docs/18/queries-union.html).

```sql
-- expect: [["Da Nang"],["Hue"]]
SELECT city FROM customers WHERE city IS NOT NULL
INTERSECT SELECT 'Hue' UNION SELECT 'Da Nang' ORDER BY 1;
```

```sql
-- expect: [["5","3"]]
-- 4 customer cities (one NULL) + one more NULL: UNION ALL keeps 5 rows; UNION keeps Da Nang, Hue, NULL
SELECT (SELECT count(*) FROM (SELECT city FROM customers UNION ALL SELECT NULL) a),
       (SELECT count(*) FROM (SELECT city FROM customers UNION SELECT NULL) b);
```

Set operations compare rows as "not distinct", so two `NULL`s count as duplicates even though `NULL = NULL` is not true.

BoonData skills: `union`, `except`.

## 11. Sorting and limiting

Status: verified on PGlite 0.5.16.

- Without `ORDER BY` row order is unspecified, even if it looks stable.
- `LIMIT n` / `OFFSET m` (standard: `OFFSET m ROWS FETCH FIRST n ROWS ONLY`; `FETCH FIRST n ROWS WITH TIES` keeps ties) (https://www.postgresql.org/docs/18/sql-select.html#SQL-LIMIT).
- Top-N needs a complete tiebreaker (catalogue Q10). Deep `OFFSET` reads and throws away rows; use keyset pagination (`WHERE (k1, k2) > (last1, last2) ORDER BY k1, k2 LIMIT n`, catalogue Q21).

```sql
-- expect: [["250.00"],["250.00"]]
SELECT amount FROM orders ORDER BY amount DESC FETCH FIRST 1 ROWS WITH TIES;
```

## 12. Constraints

Status: verified on PGlite 0.5.16.

`NOT NULL`, `CHECK`, `UNIQUE`, `PRIMARY KEY` (= `UNIQUE` + `NOT NULL`), `FOREIGN KEY … REFERENCES` with `ON DELETE {NO ACTION | RESTRICT | CASCADE | SET NULL | SET DEFAULT}`, `EXCLUDE` (https://www.postgresql.org/docs/18/ddl-constraints.html).

- A `CHECK` passes when it evaluates to `NULL`, so `CHECK (amount >= 0)` accepts `NULL`; add `NOT NULL` too.
- `UNIQUE` treats `NULL`s as distinct by default; `UNIQUE NULLS NOT DISTINCT` (PostgreSQL 15+) allows only one `NULL` (catalogue S07).
- PostgreSQL does not create an index on the referencing side of a foreign key; create one if you join or delete by it (catalogue I06).
- `DEFERRABLE INITIALLY DEFERRED` checks a constraint at commit instead of per statement.

```sql
-- expect: error 23503
INSERT INTO orders (customer_id, placed_on, amount) VALUES (99, '2026-10-22', 5);
```

```sql
-- expect: error 23514
INSERT INTO orders (customer_id, placed_on, amount) VALUES (1, '2026-10-22', -5);
```

```sql
-- expect: [["2"]]
CREATE TABLE tags (code text UNIQUE);
INSERT INTO tags VALUES (NULL), (NULL);
SELECT count(*) FROM tags;
```

```sql
-- expect: error 23505
CREATE TABLE tags2 (code text UNIQUE NULLS NOT DISTINCT);
INSERT INTO tags2 VALUES (NULL), (NULL);
```

## 13. Views

Status: verified on PGlite 0.5.16.

- A view is a stored query; it holds no data (https://www.postgresql.org/docs/18/sql-createview.html).
- Simple views (one table, no aggregates/DISTINCT/set ops) are automatically updatable; `WITH CHECK OPTION` rejects writes the view could not see.
- A materialized view stores the result; `REFRESH MATERIALIZED VIEW [CONCURRENTLY]` recomputes it (`CONCURRENTLY` needs a unique index) (https://www.postgresql.org/docs/18/rules-materializedviews.html).

```sql
-- expect: [["2"]]
CREATE VIEW danang AS SELECT id, name, city FROM customers WHERE city = 'Da Nang' WITH CHECK OPTION;
UPDATE danang SET name = 'An N.' WHERE id = 1;
CREATE MATERIALIZED VIEW city_sales AS
  SELECT c.city, sum(o.amount) AS total FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY c.city;
SELECT count(*) FROM city_sales;
```

```sql
-- expect: error 44000
INSERT INTO danang (name, city) VALUES ('Giang', 'Hue');
```

## 14. Transactions

Status: verified on PGlite 0.5.16. Two-session cases not verified.

- `BEGIN; … COMMIT;` makes a group of statements atomic; `ROLLBACK` undoes them; `SAVEPOINT s` / `ROLLBACK TO s` undo part (https://www.postgresql.org/docs/18/tutorial-transactions.html).
- After an error inside a transaction block, PostgreSQL rejects every further statement until `ROLLBACK` (or `ROLLBACK TO` a savepoint).
- Isolation levels: PostgreSQL's default is Read Committed; Repeatable Read gives one snapshot per transaction; Serializable adds checks that abort a transaction whose result could not happen in some serial order (SQLSTATE `40001`, retry). Read Uncommitted behaves as Read Committed: PostgreSQL never shows dirty reads (https://www.postgresql.org/docs/18/transaction-iso.html).
- Concurrency anomalies (dirty read, non-repeatable read, phantom, serialization anomaly) are defined per level in that page's table 13.1. Theory: [dbms-theory.md](dbms-theory.md#4-transactions-and-concurrency-control).

```sql
-- expect: [["4"]]
BEGIN;
SAVEPOINT s;
DELETE FROM orders WHERE amount < 100;
ROLLBACK TO s;
DELETE FROM orders WHERE customer_id IS NULL;
COMMIT;
SELECT count(*) FROM orders;
```

Not verified (needs two sessions, PGlite has one connection): lost-update and write-skew demonstrations under Read Committed vs Serializable.

BoonData: every player query runs inside `BEGIN … ROLLBACK` (`runSandboxed`, `src/db/run.ts`), so DML in a ticket never persists.

## 15. Data types you meet in queries

Status: verified on PGlite 0.5.16.

Short list; details in [postgresql.md](postgresql.md#1-data-types).

- Exact numbers: `integer`, `bigint`, `numeric(p,s)` (money). Approximate: `real`, `double precision` (never for money, catalogue S03).
- Text: `text` = `varchar` without limit; `char(n)` pads with spaces. Prefer `text` + `CHECK (length(x) <= n)` (catalogue S02).
- Time: `date`, `timestamp` (no zone), `timestamptz` (an instant, shown in the session zone; catalogue S01), `interval`.
- Casting: `CAST(x AS type)` (standard) or `x::type` (PostgreSQL).

```sql
-- expect: [["0.30000000000000004","0.3"]]
SELECT (0.1::float8 + 0.2::float8)::text, (0.1::numeric + 0.2::numeric)::text;
```

## Sources

- PostgreSQL 18 manual: SELECT https://www.postgresql.org/docs/18/sql-select.html · Queries https://www.postgresql.org/docs/18/queries.html · Constraints https://www.postgresql.org/docs/18/ddl-constraints.html · Window functions https://www.postgresql.org/docs/18/functions-window.html · WITH https://www.postgresql.org/docs/18/queries-with.html · Isolation https://www.postgresql.org/docs/18/transaction-iso.html · Subquery expressions https://www.postgresql.org/docs/18/functions-subquery.html · Aggregates https://www.postgresql.org/docs/18/functions-aggregate.html
- SQL standard: ISO/IEC 9075-2 (Foundation). Not freely available; PostgreSQL's conformance list is https://www.postgresql.org/docs/18/features.html.
- Coverage suggested by tutorialspoint "SQL" and "PostgreSQL" tutorial tables of contents (https://www.tutorialspoint.com/sql/index.htm, https://www.tutorialspoint.com/postgresql/index.htm); no text taken from them.
