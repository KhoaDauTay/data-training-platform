# PostgreSQL lessons (ENGINE-CONTENT-V1)

L1 and L2 follow ENGINE-CONTENT-V1 as parsed by `src/engine/content.ts` (commit a33ae40). Notes for ENG-PGLAB and reviewers:

- `predict` has no setup field, so a predict lesson keeps its tables in `lab.setup`. The parser needs at least one lab step, so every predict lesson also carries one follow-up step (the "now do it" part).
- `lab.setup` is a multi-statement script (run with `exec`). It loads its own extensions with `CREATE EXTENSION IF NOT EXISTS` (`bloom`, `btree_gist`, `pg_trgm`, `cube` + `earthdistance`); the runtime must offer them. No setup runs `VACUUM` (it cannot run inside a multi-statement script), so lessons never claim `Heap Fetches: 0` on lab data.
- Each step solution is one statement. Steps run in order on the same database. A later step depends only on setup and on earlier DDL (`catalog`) steps, never on rows written by an earlier step, so a runtime may roll back DML.
- `rows` steps never return identity values, `uuidv7()` or anything else that changes between runs. Tables with a graded `ANALYZE` have at most 30,000 rows, so `ANALYZE` reads every row and estimates are stable.
- Optional extras from the product design (ADD-2/ADD-4), ignored by the V1 parser: `verified` on every lesson; `predict.expect` (`node`, `table`, `index`, `rows`), checked against real `EXPLAIN (FORMAT JSON)` on PGlite 0.5.16; `lab.steps[].target`, the query a `CREATE INDEX` step is for.
- A code block with a `-- ERROR` comment contains one statement that is meant to fail.
- `viz` names come from the product-design §5 catalog (`pg-btree-split`, `pg-gin`...).
- Lesson ids follow the task (`e-pg-l1-01`), not the older `e-pg-l-…` pattern of product design §1.4.
