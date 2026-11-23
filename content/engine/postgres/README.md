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

## v27 R3: the eight-section anatomy (product-route-v24 §2.2)

L1–L2 lessons follow it and `tests/engineAnatomy.test.ts` checks them (R6 extends the scope to L3–L5):

- Body sections, in this order (VI / EN headings): `Mở bài` / `Opening` (≤ 3 sentences, drawn above the objectives), `Ý chính` / `Key idea` (paragraphs ≤ 150 words), `Cú pháp` / `Syntax` (starts with a ```sql template, never run), `Ví dụ` / `Example`, `Lỗi hay gặp` / `Common mistakes`, `Thực hành` / `Practice`, `Tóm tắt` / `Recap` (only a 3–5 line list, drawn after the questions).
- Required per kind: concept and lab all but Thực hành (lab needs it, and ≥ 3 steps); quiz = Mở bài, Ý chính, Ví dụ, Tóm tắt; predict = Mở bài, Ý chính, Tóm tắt; capstone = Mở bài, Thực hành, Tóm tắt. Questions (quiz items + the predict) ≥ 2, capstone ≥ 1; outside capstones ≥ 1 carries `trap: <option index>` (the misconception's pick; frontmatter only, the page does not read it).
- Runs: one fresh lab database per lesson: setup, then every ```sql block of Ví dụ and Lỗi hay gặp in page order, one statement at a time. A normal block's result (its last statement with a result set) has rows. `-- ERROR <SQLSTATE>: …` = the block's last statement fails with that code. `-- WRONG: …` = runs and returns other rows than the next block, which says `-- FIX: …`.
- Grading: a step with `after: <read>` is graded on that read (Solution vs player), for statements whose own result says nothing (GRANT, CALL, DO, TRUNCATE, a write without RETURNING). The catalog probe (`CATALOG_PROBE`, src/engine/pglab/runner.ts) covers every non-system schema and also schemas and their ACL, functions and procedures (full definition + ACL), triggers, table and column ACLs, roles, memberships and default privileges. Every catalog/`after` step must fail when the player does nothing (`SELECT 1`). Never `SET ROLE` in a step: it would be replayed into every later step.
