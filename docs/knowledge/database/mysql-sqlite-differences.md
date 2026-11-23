# Dialect differences: PostgreSQL vs MySQL vs SQLite (and a few SQL Server terms)

Status: to-verify by execution. Nothing in this file was run: the repo has no MySQL or SQLite runtime. Each claim was checked against the primary page cited next to it (MySQL 8.4 Reference Manual, sqlite.org, PostgreSQL 18 manual) on 2026-11-23. PostgreSQL columns are the behaviour verified elsewhere in this folder.

Why this file exists: BoonData teaches PostgreSQL only, but tutorialspoint's SQL tutorial mixes dialects (TOP, SHOW TABLES, clustered indexes, BIT) and learners arrive with MySQL or SQLite habits. When writing content or reviewing player SQL, these are the differences that make "valid SQL" fail or behave differently in PGlite. Route points: SQL, MySQL and SQLite tutorials ([tutorial-routes.md](tutorial-routes.md)).

## 1. Syntax and catalogue commands

Status: to-verify (docs checked).

| Task | PostgreSQL | MySQL 8.4 | SQLite | SQL Server (T-SQL) |
|---|---|---|---|---|
| Top N | `LIMIT n` / `FETCH FIRST n ROWS ONLY` | `LIMIT n` | `LIMIT n` | `TOP (n)` / `OFFSET … FETCH` |
| List tables | `\dt` (psql) or `information_schema.tables` | `SHOW TABLES` | `.tables` (CLI) or `sqlite_schema` | `sys.tables` |
| Describe table | `\d t` or `information_schema.columns` | `DESCRIBE t` | `PRAGMA table_info(t)` | `sp_help` |
| Switch database | reconnect (`\c db`) | `USE db` | `ATTACH DATABASE 'f' AS x` | `USE db` |
| Identifier quote | `"name"` | `` `name` `` (or `"` with `ANSI_QUOTES`) | `"name"` (also accepts `` ` `` and `[ ]`) | `[name]` |
| String concat | `a \|\| b` | `CONCAT(a, b)`; `\|\|` means `OR` unless `PIPES_AS_CONCAT` | `a \|\| b` | `a + b` / `CONCAT` |
| Case-insensitive LIKE | `ILIKE` | `LIKE` is case-insensitive under the default collations | `LIKE` is case-insensitive for ASCII only; `GLOB` is case-sensitive | depends on collation |
| Regex | `~`, `regexp_replace` | `REGEXP`, `RLIKE`, `REGEXP_LIKE` | `REGEXP` only if a function is registered | none built in |
| Upsert | `ON CONFLICT … DO UPDATE`, `MERGE` | `ON DUPLICATE KEY UPDATE`, `REPLACE`, `INSERT IGNORE` | `ON CONFLICT … DO UPDATE` | `MERGE` |
| Auto id | `GENERATED … AS IDENTITY` | `AUTO_INCREMENT` | `INTEGER PRIMARY KEY` (rowid alias), optional `AUTOINCREMENT` | `IDENTITY(1,1)` |
| Copy a table | `CREATE TABLE b AS SELECT …` / `(LIKE a INCLUDING ALL)` | `CREATE TABLE b LIKE a` / `AS SELECT` | `CREATE TABLE b AS SELECT …` | `SELECT … INTO b` |
| Set difference | `EXCEPT`, `INTERSECT` | `EXCEPT`, `INTERSECT` (no `MINUS`) | `EXCEPT`, `INTERSECT` | `EXCEPT`, `INTERSECT` |
| Full outer join | yes | no: emulate with `LEFT JOIN … UNION … RIGHT JOIN` | yes since 3.39.0 | yes |
| Update with join | `UPDATE t SET … FROM s WHERE …` | `UPDATE t JOIN s ON … SET …` | `UPDATE … FROM` | `UPDATE t SET … FROM t JOIN s …` |

Sources: MySQL SQL modes https://dev.mysql.com/doc/refman/8.4/en/sql-mode.html · MySQL JOIN https://dev.mysql.com/doc/refman/8.4/en/join.html · MySQL INTERSECT https://dev.mysql.com/doc/refman/8.4/en/intersect.html · MySQL INSERT … ON DUPLICATE KEY https://dev.mysql.com/doc/refman/8.4/en/insert-on-duplicate.html · SQLite SELECT https://www.sqlite.org/lang_select.html · SQLite 3.39.0 release https://www.sqlite.org/releaselog/3_39_0.html · SQLite UPSERT https://www.sqlite.org/lang_upsert.html · SQLite UPDATE FROM https://www.sqlite.org/lang_update.html · T-SQL TOP https://learn.microsoft.com/en-us/sql/t-sql/queries/top-transact-sql.

## 2. Types

Status: to-verify (docs checked).

- **SQLite is dynamically typed.** A column's declared type only gives it an *affinity* (INTEGER, TEXT, BLOB, REAL, NUMERIC, chosen by substring rules: a type containing "INT" gets INTEGER, so `VARCHAR(10)` gets TEXT and `BOOLEAN`/`DATE`/`DECIMAL` get NUMERIC). Any column except `INTEGER PRIMARY KEY` can hold any value; `STRICT` tables (3.37.0+) enforce types (https://www.sqlite.org/datatype3.html, https://www.sqlite.org/stricttables.html).
- SQLite has no boolean or date type: booleans are 0/1, dates are ISO text, Julian-day reals or Unix-time integers handled by `date()`, `strftime()` (https://www.sqlite.org/lang_datefunc.html).
- MySQL `BOOLEAN` is `TINYINT(1)`; `ENUM` and `SET` are column types; `DATETIME` has no zone while `TIMESTAMP` converts to UTC and back using the session zone (https://dev.mysql.com/doc/refman/8.4/en/datetime.html).
- PostgreSQL has a real `boolean`, `timestamptz`, `numeric`, arrays, ranges, `jsonb`, `uuid`, and rejects implicit text→number comparisons that MySQL and SQLite accept (`WHERE id = '7'` works in all three because `'7'` is an untyped literal in PostgreSQL, but `WHERE id = name` with mismatched column types fails only in PostgreSQL).

## 3. Grouping, NULLs and comparisons

Status: to-verify (docs checked).

- MySQL's default `sql_mode` includes `ONLY_FULL_GROUP_BY`, which rejects selecting non-aggregated columns that are not grouped or functionally dependent; with it turned off MySQL returns an arbitrary value. PostgreSQL always rejects the query, except for columns of a table whose primary key is grouped. SQLite accepts it and picks a value from an arbitrary row (with `min()`/`max()` it takes the row holding the extreme) (https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html, https://www.sqlite.org/lang_select.html#bare_columns_in_an_aggregate_query).
- Integer division: `7 / 2` is `3` in PostgreSQL and SQLite, `3.5000` in MySQL (`/` always returns a decimal; `DIV` is integer division) (https://dev.mysql.com/doc/refman/8.4/en/arithmetic-functions.html).
- Division by zero: error in PostgreSQL; `NULL` in SQLite and in a MySQL `SELECT` (in MySQL, strict mode plus `ERROR_FOR_DIVISION_BY_ZERO`, both in the default `sql_mode`, turn it into an error for `INSERT`/`UPDATE`; https://dev.mysql.com/doc/refman/8.4/en/sql-mode.html).
- String comparison: PostgreSQL compares by the column's collation and is case-sensitive by default; MySQL's default collation (`utf8mb4_0900_ai_ci`) is accent- and case-insensitive, so `'a' = 'A'` is true there.
- Empty string vs NULL: distinct in all three (Oracle is the one that treats `''` as `NULL`).
- Null-safe equality: `IS NOT DISTINCT FROM` (PostgreSQL, SQLite via `IS`), `<=>` (MySQL).

## 4. DDL and constraints

Status: to-verify (docs checked).

- PostgreSQL DDL is transactional; MySQL commits implicitly before and after most DDL statements (https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html); SQLite DDL is transactional.
- MySQL 8.4 enforces `CHECK` constraints; older versions parsed and ignored them (the 8.4 page does not name the version; to-verify) (https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html).
- SQLite does not enforce foreign keys unless each connection runs `PRAGMA foreign_keys = ON` (https://www.sqlite.org/foreignkeys.html).
- SQLite `ALTER TABLE` supports rename table, rename/add/drop column (and, since 3.53.0, set/drop NOT NULL); changing a type or adding a constraint needs the "create new table, copy, rename" procedure (https://www.sqlite.org/lang_altertable.html).
- "Clustered index" (SQL Server, MySQL InnoDB) means the table itself is stored in index order; InnoDB clusters on the primary key (or, without one, the first all-NOT-NULL unique index, else a hidden row id) and secondary index entries store the primary key. PostgreSQL tables are heaps; `CLUSTER t USING idx` reorders once and is not maintained (https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html, https://www.postgresql.org/docs/18/sql-cluster.html).
- MySQL "storage engines" (InnoDB, MyISAM, MEMORY) have no PostgreSQL equivalent; table access methods exist but only `heap` ships.

## 5. Transactions and concurrency

Status: to-verify (docs checked).

- Default isolation: PostgreSQL Read Committed, MySQL InnoDB Repeatable Read (https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html), SQLite serializable (one writer at a time per database file; WAL mode lets readers continue during a write, https://www.sqlite.org/wal.html).
- InnoDB Repeatable Read uses next-key (gap) locks for locking reads to block phantoms; PostgreSQL Repeatable Read is snapshot isolation without gap locks.

## 6. Portable-SQL checklist for BoonData content

Status: rule set (derived from the above).

- Write `LIMIT`, `COALESCE`, `CASE`, `EXISTS`, `||`… as PostgreSQL does; never `TOP`, `IFNULL`, `ISNULL`, backticks, `DIV`.
- Cast before dividing integers (`::numeric`), round only at the end (catalogue Q13, A08).
- Group by every non-aggregated column; do not rely on MySQL/SQLite bare columns.
- Expect case-sensitive text comparison; normalise with `lower()` when the task means "ignore case".
- `src/ui/sqlErrors.ts` already maps the SQLSTATEs that MySQL habits trigger (`42601` syntax, `42883` undefined function such as `IFNULL`, `42803` grouping error) to Boon's teaching notes; extend it there, not in content.

## Sources

Cited per section. Coverage suggested by https://www.tutorialspoint.com/sql/index.htm, https://www.tutorialspoint.com/mysql/index.htm, https://www.tutorialspoint.com/sqlite/index.htm, https://www.tutorialspoint.com/t_sql/index.htm (no text taken).
