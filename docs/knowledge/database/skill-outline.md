# Outline: a Claude Code "SQL skill" for BoonData

Input for the next step. The skill is not created here. Proposed location: `.claude/skills/sql/SKILL.md` (next to the project skills `web-games`, `level-design`, `save-systems`), with this folder as its reference material.

## 1. Purpose

Help an agent write and review SQL and database content in this repo correctly the first time: PostgreSQL 18 as PGlite 0.5.16 runs it, BoonData's content rules, and the MongoDB/DynamoDB lab runtimes. It is a checklist and a pointer map, not a textbook: the textbook is this folder.

## 2. Triggers (description line for the skill)

Use when:

- writing or editing a ticket Solution, `wrong:` answer, drill (`content/general/sql.yml`, `adv.yml`), quick lesson (`content/lessons.yml`), Engine lesson or lab (`content/engine/**`), Best Practice card (`content/engine/best/**`), seed SQL (`src/db/**/seed.sql`, `lab.sql`);
- reviewing player-facing SQL text, hints or explanations;
- changing SQL-running code (`src/db/*`, `src/grader.ts`, `src/planCheck.ts`, `src/viz/*`, `src/engine/**`);
- answering "is this SQL right / portable / fast";
- planning new database lessons (gap map).

Not for: UI work, i18n wording, save/migration code.

## 3. Sections the SKILL.md should have

1. **Ground truth first.** PGlite 0.5.16 = PostgreSQL 18.6; link `/docs/18/`. Run every example before shipping it: in a test (Vitest + PGlite in Node) or with the block runner `bd-wt/research-db/run.mjs`. Never claim a result you did not run; mark "not verified" otherwise.
2. **Correctness checklist** (from [sql-core.md](sql-core.md) and catalogue Q/A items): NULL logic (`IS NULL`, `NOT EXISTS` not `NOT IN`, `count(*)` vs `count(col)`, `COALESCE` sums), LEFT JOIN filters in `ON`, fan-out before aggregating, integer division, half-open date ranges, ORDER BY with a full tiebreaker for every `ordered: true`/top-N, `ROWS` frames for running totals, rank ties stated in words.
3. **BoonData content rules** (quote CLAUDE.md, do not restate): literal dates (today 2026-10-31, no `now()`), tables listed and unlocked, columns labelled by `columns:`, prompts without SQL keywords/table names, results language-neutral (numbers/booleans), VI = EN code spans, `___` blanks only in faded starters, `wrong:` must run and differ in every variant, Logistics ch7 no CTE / windows from ch10, money conversion rules.
4. **Dialect guard** ([mysql-sqlite-differences.md](mysql-sqlite-differences.md)): reject `TOP`, `IFNULL`, backticks, `DIV`, bare GROUP BY columns; when a player habit is likely, extend `src/ui/sqlErrors.ts`.
5. **Performance and plans** ([performance.md](performance.md), [postgresql.md §11, §16](postgresql.md#11-indexes)): sargable predicates, composite index order, `EXPLAIN` read through a helper (EXPLAIN is not a subquery), chapter 11 grades node types and cost, never milliseconds.
6. **Security** ([security.md](security.md)): parameters not concatenation, `format('%I %L')` for dynamic SQL, every player query inside `runSandboxed` (`BEGIN … ROLLBACK`), schema names only from `SCHEMAS`, identifiers through `ident()`.
7. **Engine labs**: Postgres labs with `setup` run on `pgScriptRunner` (fresh DB + setup + replayed earlier steps; extensions preloaded via `extensionsOf`); MongoDB on mingo (no indexes/explain: predict lessons are content facts); DynamoDB on dynoxide (no `TransactWriteItems`, TTL, Streams). Link [nosql-mongodb.md](nosql-mongodb.md), [nosql-dynamodb.md](nosql-dynamodb.md).
8. **Where things already live**: the "How this maps" table of [README.md](README.md); the gap map for "is this already taught?".
9. **Verification commands**: `npx vitest run tests/content.test.ts` (ticket rules), `tests/general.test.ts`, `tests/engineContent.test.ts`, `tests/engineIntegration.test.ts`, `tests/planCheck.test.ts`, `tests/sqlErrors.test.ts`; `npx tsc --noEmit` for code changes.

## 4. Files the skill should tell the agent to read (in order, only as needed)

1. `CLAUDE.md` sections "Content and seed rules", "General area", "Database Engine area".
2. This folder's [README.md](README.md), then the one area file the task touches.
3. `docs/team/best-practice-catalogue.md` for the item code being applied.
4. `docs/team/db-engine-knowledge.md` §1 for what PGlite can and cannot do.
5. The nearest existing content file of the same kind (a sibling ticket, drill or lesson) as a template; `content/TEMPLATE.md` for tickets.
6. For planning: [boondata-gap-map.md](boondata-gap-map.md).

## 5. Bundled helpers worth shipping with the skill

- The block runner (`run.mjs`) moved into the repo as a dev script (e.g. `scripts/sql-doc-check.mjs`) so the knowledge files can be re-verified by anyone; optionally a Vitest test that runs it over `docs/knowledge/database/*.md`.
- The `plan_text(q)` / `plan_json(q)` helper functions as a snippet.

## 6. Open questions for the user

- Should the skill also cover MongoDB/DynamoDB content, or should those get their own skills (`nosql-mongodb`, `nosql-dynamodb`)?
- Should the runner become a repo test (keeps the docs honest, adds ~5 s to `npm test`)?
- Language of the skill: English (matches CLAUDE.md) or Vietnamese (matches team docs)?
