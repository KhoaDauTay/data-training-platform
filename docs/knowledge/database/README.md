# Database knowledge base

A developer's reference for SQL, PostgreSQL, MySQL/SQLite differences, design, performance, security, MongoDB, DynamoDB and DBMS theory, written for work on BoonData and as input for a future Claude Code "SQL skill" ([skill-outline.md](skill-outline.md)). English, like CLAUDE.md, so a skill can load it as is.

## Files

| File | What it holds | Verified |
|---|---|---|
| [sql-core.md](sql-core.md) | statement families, logical SELECT order, NULL logic, joins, grouping, subqueries, CTEs, window functions, set operations, constraints, views, transactions | 37 blocks on PGlite (prose link-checked) |
| [postgresql.md](postgresql.md) | PostgreSQL 18 specifics in the order of the PostgreSQL tutorial, then EXPLAIN, MVCC/VACUUM, JSONB, full-text, extensions, partitioning, PL/pgSQL | 44 blocks on PGlite (prose link-checked) |
| [performance.md](performance.md) | method, sargable predicates, index shape, fan-out, pagination, statistics, maintenance | 9 blocks on PGlite (prose link-checked) |
| [security.md](security.md) | injection, roles and privileges, row-level security | 9 blocks on PGlite (prose link-checked) |
| [design-normalization.md](design-normalization.md) | ER modelling, keys, functional dependencies, normal forms | 3 blocks on PGlite; theory link-checked |
| [dbms-theory.md](dbms-theory.md) | architecture, relational model, algebra/calculus, transactions and concurrency control, storage and indexes, query processing, recovery | 3 blocks on PGlite; theory link-checked |
| [mysql-sqlite-differences.md](mysql-sqlite-differences.md) | dialect table PostgreSQL / MySQL 8.4 / SQLite / T-SQL, types, grouping, DDL, isolation, a portable-SQL checklist | not run (no runtime); 11 MySQL, 5 SQLite and 1 SQL Server pages read, rest link-checked |
| [nosql-mongodb.md](nosql-mongodb.md) | data model, CRUD, aggregation, indexes, consistency, operations | 8 behaviours run on mingo 7.2.6; rest link-checked |
| [nosql-dynamodb.md](nosql-dynamodb.md) | data model, item operations, Query/Scan, indexes, modelling, capacity, operations | quotas/limits pages read; rest link-checked; not run here |
| [tutorial-routes.md](tutorial-routes.md) + [.json](tutorial-routes.json) | route inventory: 36 tutorials, 1,430 chapters, structure only | crawl 2026-11-23 |
| [boondata-gap-map.md](boondata-gap-map.md) | every route point of the 7 in-scope tutorials mapped to Engine / General coverage, a proposed route and UI/UX consequences | generated, rules reviewed by hand |
| [skill-outline.md](skill-outline.md) | what the SQL skill should contain | — |

Every section carries a `Status:` line (`verified`, `to-verify`, or `concept`); see [Verification levels](#verification-levels). New route points get a new section with its own Status line; existing headings are not renamed, because the gap map links to them.

## Scope and method

- **Coverage map, not a copy.** The topic list comes from the tables of contents of tutorialspoint's database tutorials (https://www.tutorialspoint.com/database_tutorials.htm). The site was readable: the index returned 200 and listed 35 tutorials; the DBMS tutorial is not on that index but its page was readable and was added because the user named it. Only titles, URLs and order were recorded. The crawl was sequential, 3 s apart, with the identifying user agent `Claude-User`, no retries, and nothing was blocked. The site's robots.txt disallows everything for three named AI crawlers (`GPTBot`, `ChatGPT-User`, `CCBot`) and a few paths for everyone; `Claude-User` is not named, so the `User-agent: *` rules applied, and they allow the tutorial pages. [tutorial-routes.md](tutorial-routes.md) records this so you can judge whether it fits the site's intent. No tutorial text was copied or paraphrased; every fact here was written from primary sources.
- **Primary sources**: PostgreSQL 18 manual (postgresql.org/docs/18), MySQL 8.4 Reference Manual (dev.mysql.com), sqlite.org, MongoDB Manual (mongodb.com/docs/manual), Amazon DynamoDB Developer Guide (docs.aws.amazon.com), OWASP, and the original papers for theory (Codd 1970, Chen 1976, Kent 1983, ARIES 1992, SSI 2012). Each section cites its pages. There are no direct quotations beyond single terms.
- **Version**: the repo's PGlite 0.5.16 reports `PostgreSQL 18.6`, so PostgreSQL links point to `/docs/18/` and examples avoid PostgreSQL 19 features.
- **Out of scope**: installation and environment chapters, client drivers (Java/PHP/Perl/Python/C), GUI tools, and the 29 products on the index that BoonData does not teach (listed with reasons in the gap map).

## Verification

Every ```` ```sql ```` block in the PostgreSQL-dialect files runs in file order on one fresh PGlite 0.5.16 per file (`pg_trgm`, `pgcrypto`, `citext` loaded). A block with `-- expect: [[…]]` must return exactly those rows (values as strings, `null` for NULL); a block with `-- expect: error XXXXX` must fail with that SQLSTATE; other blocks are setup and must succeed. Result of the last run (2026-11-23):

| File | Blocks | Asserted rows | Expected errors (SQLSTATE checked) | Failed |
|---|---|---|---|---|
| sql-core.md | 37 | 29 | 6 | 0 |
| postgresql.md | 44 | 31 | 4 | 0 |
| performance.md | 9 | 6 | 0 | 0 |
| security.md | 9 | 4 | 1 | 0 |
| design-normalization.md | 3 | 3 | 0 | 0 |
| dbms-theory.md | 3 | 3 | 0 | 0 |
| **Total** | **105** | **76** | **11** | **0** |

Plus 8 MongoDB query/aggregation behaviours asserted on mingo 7.2.6 ([nosql-mongodb.md](nosql-mongodb.md)).

Not verified, and marked so where it appears: two-session behaviour (locks, isolation anomalies; PGlite has one connection), `CREATE DATABASE`, extensions not preloaded (`btree_gist`), timing claims, all MySQL/SQLite/SQL Server/DynamoDB snippets.

### Verification levels

| Level | Meaning | Where |
|---|---|---|
| **ran** | the statement was executed and its result or SQLSTATE asserted | the 105 PGlite blocks and 8 mingo checks above |
| **page read** | the cited primary page was fetched and read during this work (2026-11-23) | MySQL 8.4: `sql-mode`, `intersect`, `innodb-transaction-isolation-levels`, `join`, `arithmetic-functions`, `create-table-check-constraints`, `explain`, `group-by-handling`, `implicit-commit`, `datetime`, `innodb-index-types`; SQLite: `datatype3`, `lang_select` (join syntax only), `releaselog/3_39_0`, `lang_altertable`, `foreignkeys`; MongoDB: `core/map-reduce`; AWS: DynamoDB `ServiceQuotas`, `Constraints`, Data Pipeline "What is"; Microsoft: T-SQL `REGEXP_LIKE` |
| **link-checked** | the URL answered HTTP 200 to a scripted request (dev.mysql.com and doi.org refuse scripted requests with 403, so those links were not re-checked), and the statement rests on the author's knowledge of that page | every other citation, including all postgresql.org pages: PostgreSQL prose that no example exercises (for example lock-mode tables, autovacuum behaviour) is at this level |

Where a page that was read did not state a version (MySQL `CHECK` enforcement, `EXPLAIN ANALYZE`), the text avoids the version or says to-verify.

Scripts live outside the repo in `C:/Users/khoa.huynh/Documents/study/bd-wt/research-db/`: `run.mjs` (the block runner; `node run.mjs <file.md>…`), `mingo-check.mjs`, `crawl.mjs` (route crawl), `gen.py` (writes the two route files and the gap map from `crawl/routes.json`, `gap-head.md`, `gap-tail.md`). Two runner limits worth knowing: `EXPLAIN` cannot be a subquery, so examples read plans through a `plan_text()` helper function; `VACUUM` and `CREATE INDEX CONCURRENTLY` must be blocks of their own.

## How this maps to BoonData's existing material (read those, this folder does not repeat them)

| Existing source | What it already holds | Relation to this folder |
|---|---|---|
| `content/skills.yml`, `content/lessons.yml`, `content/general/sql.yml` | the 38 General skills, their quick lessons and 4 drills each | sql-core.md sections name the skill ids they explain |
| `content/general/adv.yml` | 28 advanced nodes (window frames, percentiles, date spine, ROLLUP, pivot, recursive CTE, JSON, regex, LATERAL, analytics) | linked where relevant (`a1`…`d8`) |
| `content/engine/postgres|mongodb|dynamodb/L1…L5/` | ~200 Engine lessons, labs on PGlite, mingo, dynoxide | each knowledge section points to the lessons that teach it; gap map lists them per route point |
| `content/engine/mongodb/path/` | the NoSQL path (12 parts, drills) | nosql-mongodb.md points to it |
| `content/engine/best/` + `docs/team/best-practice-catalogue.md` | 192 best-practice items (Q/A SQL, S/I/P/X PostgreSQL, M MongoDB, D DynamoDB), 130 cards, all examples run | this folder cites item codes (Q07, S10…) instead of restating them |
| `docs/team/db-engine-knowledge.md` | measured PGlite capabilities, engine knowledge map L1–L5, sources `[Sn]` | used as the source list for engine internals |
| `content/engine/glossary.yml` | Engine glossary terms (VI/EN) | terms here use the same English names |
| `src/ui/sqlErrors.ts` | SQLSTATE → Boon's teaching notes | security.md / postgresql.md §15 point to it |

## Mapping to tutorialspoint's list

Seven tutorials are mapped chapter by chapter in [boondata-gap-map.md](boondata-gap-map.md): SQL (122 chapters), PostgreSQL (90), MySQL (186), SQLite (54), MongoDB (61), DynamoDB (38), DBMS (91). Each knowledge file says which of their sections it covers; the gap map links every chapter to a knowledge-file anchor.

## Global SQL skill

The Claude Code skill `sql` (user-level, `~/.claude/skills/sql/`, works in any project) is built from this folder: `SKILL.md` = review checklist, `references/` = copies of the area files and `tutorial-routes.md`, `scripts/run.mjs` = the block runner (PGlite from the current project, or `PGLITE_DIST`). This folder stays the source of truth: after editing a file here, copy it to `~/.claude/skills/sql/references/`.
