# BoonData gap map against the tutorialspoint database route

Plan only: no content or app change. Scope (user, 2026-11-23): the **Engine area** (`content/engine/**`, including the MongoDB NoSQL path and the Best Practice cards in `content/engine/best/`) and the **learning path / General area** (`content/skills.yml`, `content/lessons.yml`, `content/general/sql.yml`, `content/general/adv.yml`, `content/general/interview.yml`). The domains (Logistics, E-commerce, Finance tickets) are left out of both the mapping and the proposal.

Inputs: [tutorial-routes.md](tutorial-routes.md) ({{TOTAL}}, structure only) and the repo on `main` at the time of writing. Generator: `npm run kb:gen` (`scripts/kb/gen-gap-map.mjs`; keyword rules per tutorial in `scripts/kb/rules.mjs`, each rule reviewed by hand against the chapter titles; the script prints any unmapped title). Re-run it after a crawl or content changes and review the diff.

## How to read the status column

| Status | Meaning |
|---|---|
| covered | an Engine lesson, a General skill (lesson + 4 drills) or an adv node teaches it; the reference names it |
| partial | practised or explained inside another lesson, a Best Practice card or an app feature, but not taught as its own point; a passing mention (a word in a list) does not count |
| missing | nothing in Engine or General teaches it |
| n/a | not a learning point for BoonData: intro/reference pages, installation, client drivers, admin of products BoonData does not run, deprecated features |

Coverage was judged from lesson titles, `after:`/objective lines and keyword greps over `content/engine/**` and `content/general/*.yml` (false positives such as the English verb "truncate" in hints were opened and discarded); lesson bodies were not audited line by line, so a "covered" row means "a lesson is about this", not "every sub-point is taught".

"General skill `x`" means the skill id in `content/skills.yml`, its quick lesson in `content/lessons.yml` and its drills `g-x-1…4` in `content/general/sql.yml`. "adv `a7`" is a node in `content/general/adv.yml`. "best …" is a Best Practice card.

## Summary

Per-chapter rows for the seven tutorials in scope:

{{COUNTS}}
The other 29 tutorials on the index are products, drivers or tools BoonData does not teach; one line each:

{{OTHER}}
## Proposed BoonData route (follows the tutorial order)

The route keeps BoonData's two tracks and adds only what the gap rows say is missing or partial. Priorities: **P1** = a gap in what a developer or analyst meets in the first weeks (the SQL and PostgreSQL tutorials' own order); **P2** = design and theory that explain why the P1 rules exist; **P3** = completeness, operations, rarely-used features. IDs below are proposals, not existing ids.

### Track A: learning path / General (SQL as analysts and developers write it)

The General path was read-only SQL (38 skills, `select` → `index_design`) until v26 R2 added Part 9, writing data (A1 below). The SQL tutorial's order puts data definition and modification before querying; BoonData deliberately starts with SELECT, so the proposal adds a **write-side module after the joins module** rather than reordering.

| Order | Proposal | Tutorial route points it closes | Area | Priority |
|---|---|---|---|---|
| A1 | Module "Changing data": new General skills `insert_select` (INSERT … SELECT, RETURNING), `update_join` (UPDATE … FROM / DELETE … USING), `upsert` (ON CONFLICT, MERGE), each with a lesson + 4 drills on `lab`, graded by reading the table after the statement inside the rollback (**done, v26 R2**: `check:` on the drill, `runSandboxed` runs it after the write in the same `BEGIN … ROLLBACK`) | SQL "Insert/Update/Delete Query", "Insert Into Select", "Update Join", "Delete Join"; MySQL "Upsert", "Replace Query", "Insert Ignore"; PostgreSQL "Upsert" | General (`skills.yml`, `lessons.yml`, `sql.yml`); needs a write-then-read grader for drills (the Engine's replay/catalog pattern in `src/engine/pglab/runner.ts` is the model) | P1 |
| A2 | Skill `any_all`: `= ANY(array)`, `> ALL (subquery)` | SQL "ANY, ALL Operators"; PostgreSQL "ANY/ALL Operator" | General | P2 |
| A3 | Skill `cross_join` (calendar × store grids; ties into adv a3 date spine) and a RIGHT JOIN note in `left_join`'s lesson | SQL "Cross Join", "Right Join", "Left Join vs Right Join" | General | P2 |
| A4 | Skill or adv node `sampling`: `ORDER BY random() LIMIT`, `TABLESAMPLE`, why it is non-deterministic (grade the shape, not the rows) | MySQL "Select Random Records" | General (adv node if grading is awkward; **done, v32: adv `a11`**, graded on rows with `REPEATABLE` seeds, since `ORDER BY random()` cannot be graded) | P3 |
| A5 | adv node "Portable SQL": the dialect table of [mysql-sqlite-differences.md](mysql-sqlite-differences.md) as a reading + drills that fix MySQL/T-SQL habits (`TOP`, `IFNULL`, backticks, bare GROUP BY columns) | SQL "Top Clause", "Clustered/Non-Clustered Index"; MySQL/SQLite syntax chapters | General `adv.yml` (status `partial`: reading + drills) | P2 |

### Track B: Engine, PostgreSQL (follows the PostgreSQL tutorial's section order)

| Order | Proposal | Route points | Where | Priority |
|---|---|---|---|---|
| B1 | L1 lesson "Changing a table safely": ALTER TABLE add/drop/rename column, change type (rewrite vs instant), DROP … CASCADE, TRUNCATE vs DELETE, `CREATE TABLE … AS / LIKE`, TEMP tables | PostgreSQL "ALTER TABLE Command", "DROP TABLE", "TRUNCATE TABLE Command"; SQL "Clone Tables", "Temporary Tables", "Select Into"; MySQL "Add/Delete Columns", "Rename Columns", "Change Column Type" | `content/engine/postgres/L1/` (module `types` or a new module `ddl`) | P1 |
| B2 | L1 lesson "Upsert and MERGE" (lab: `ON CONFLICT` targets, `EXCLUDED`, MERGE with RETURNING) | PostgreSQL "Upsert"; MySQL upsert chapters | `L1/` after `07-transactions.md` | P1 |
| B3 | Module "Roles and privileges": CREATE/ALTER/DROP ROLE, GRANT/REVOKE, schema USAGE, default privileges, role membership; RLS stays in `L5/10` | PostgreSQL "Role & Permission" section, "Privileges"; MySQL "Users" section | new module in L2, before `L5/10-row-level-security.md` | P1 |
| B4 | Module "Functions and procedures": SQL vs PL/pgSQL functions, volatility, overloading, DROP FUNCTION, procedures + CALL, RAISE/ASSERT, EXCEPTION blocks and SQLSTATE | PostgreSQL "Functions", "Function Overloading", "DROP FUNCTION", "Error and Message", "Assert"; SQL "Stored Procedures", "Cursors"; MySQL "Stored Functions", "Signal", "Resignal", "Cursor" | `content/engine/postgres/L2/` new module | P2 |
| B5 | Lesson "Triggers": BEFORE/AFTER, ROW/STATEMENT, NEW/OLD, audit-table lab; when a constraint or generated column is the better tool | PostgreSQL/SQL/MySQL/SQLite "Triggers" (10 MySQL route points) | `L2/` after B4 | P2 |
| B6 | Quiz "Databases vs schemas in a cluster" (why PGlite has one database; `CREATE DATABASE` outside transactions) | PostgreSQL "PostgreSQL Database" section (7 points); SQL "SQL Database" section | extension of `L1/06-schemas.md` | P3 |

### Track C: Engine, MongoDB and DynamoDB

| Order | Proposal | Route points | Where | Priority |
|---|---|---|---|---|
| C1 | MongoDB L1 concept "Databases and collections" (implicit creation, drop, capped and time-series collections as kinds) | MongoDB "Create/Drop Database", "Create/Drop Collection", "Capped Collections" | `content/engine/mongodb/L1/` | P3 |
| C2 | MongoDB L4 lab "Counters and sequences" (`findOneAndUpdate` + `$inc` with upsert; hot-document trade-off) | MongoDB "Auto-Increment Sequence" | `L4/` patterns | P3 |
| C3 | MongoDB L5 concept "Backups and GridFS" (`runtime: docs`) | MongoDB "Create Backup", "GridFS" | `L5/` | P3 |
| C4 | DynamoDB L2 lesson "Counting and summing without Scan" (counters, Streams-maintained aggregates, `Select: COUNT` cost) | DynamoDB "Aggregation" | `content/engine/dynamodb/L2/` | P2 |
| C5 | DynamoDB L5 concept "IAM, errors and monitoring" (LeadingKeys, retries with backoff, CloudWatch throttling, Contributor Insights, deletion protection), `runtime: docs` | DynamoDB "Access Control", "Permissions API", "Error Handling", "Monitoring", "Table Activity", "Delete Table" | `L5/` | P2 |

### Track D: design and theory (DBMS tutorial order)

BoonData has no place for design theory yet. Two options; the first is preferred because it reuses the Engine lesson format (concept + quiz + lab on PGlite):

| Order | Proposal | Route points | Where | Priority |
|---|---|---|---|---|
| D1 | A fourth Engine card "Database design" with modules: ER modelling (entities, cardinality, weak entities, EER → tables; lab: build the junction table), keys and functional dependencies (lab: test an FD with GROUP BY/HAVING), normal forms 1NF → BCNF (lab: split a table and watch the update anomaly disappear), 4NF/5NF as reading | DBMS "Entity Relationship Model" (10), "Relational Database Design" (10), "Normalization in Database Designing" (6) | `content/engine/design/` (new engine id: `ENGINE_ID` pattern, route, overview card) or adv nodes in `adv.yml` | P2 |
| D2 | Theory readings with quizzes: relational algebra ↔ SQL (division as double NOT EXISTS), DBMS architecture and data independence, schedules and serializability (precedence-graph quiz), recovery: ARIES vs PostgreSQL's redo-only WAL | DBMS overview group (9), "Relational Algebra" and "Relational Calculus" (9), "Transaction and Concurrency" (12; practice already in Engine L4), "Backup and Recovery" (2) | the D1 card, or adv nodes | P3 |

### Out of the route on purpose

Installation, environment and GUI tools; client drivers (Java/PHP/Perl/Python/C, mysqli, SQLAlchemy); hosting (Amazon RDS); the other products on the index; deprecated features (MongoDB map-reduce, AWS Data Pipeline, Rockmongo). Each is `n/a` in the tables below with the reason.

## Lesson pages will need a UI/UX redesign for longer content

The proposals make lessons longer and denser than today's Engine and General pages were designed for. What gets longer, and what a redesign has to handle:

- **Lesson body length**: design/theory lessons (D1, D2, B4) carry several prose sections with tables (normal-form table, operator ↔ SQL table, privilege matrix); today's lesson page is one column of short cards. Needs in-page section navigation, tables that read at 320 px, collapsible "deeper" parts.
- **More steps per lab**: write-side labs (A1, B1, B2, B5) need setup → statement → "read the table after" in one step and before/after comparisons; the step list and result area must show two results without pushing the editor off screen.
- **Diagrams**: ER diagrams (D1), precedence graphs (D2), role graphs (B3) need a diagram slot like `viz:` with a text alternative; the Mermaid ER renderer (`src/ui/erdView.ts`) could be reused.
- **Quizzes with longer stems**: theory quizzes (closure, normal-form identification) need multi-line stems and code or tables inside options.
- **Docs-only lessons** (B6, C3, C5) are reading pages with no runnable step; the "chưa chạy trong trình duyệt" notice and the completion rule need a design that does not look broken.
- **General drills that write** (A1): the drill brief, the expected-result preview (`tryPreview`) and the diff view assume a SELECT result; they need a "table after your statement" mode. Done in v26 R2: the expected result, shape card and grade read the drill's `check:` after the write.
- **Dialect reading** (A5): side-by-side PostgreSQL/MySQL/SQLite columns, like D5's SQL-vs-pandas readings (`advPage`), wider than `--w-read`.
- **Budgets**: every Engine lesson is its own lazy chunk (`engineLesson` 8 KB each); longer theory lessons may exceed it and need a split or a higher per-file budget.

## Per-chapter mapping

{{TABLES}}