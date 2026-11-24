# UI/UX review R2: multi-tenant content v36 (NoSQL) + v37 (platform)

2026-11-25. Two fresh reviewers looked at a preview build of v37-platform (HEAD a017e33):

- an **eye pass**, which read the pages the way a learner would at 1280, 375 dark and 320;
- a **measuring pass**, which ran a scoped `npm run ux-audit` (17 pages, exit 0), probes, a link check (120/120 links correct) and static readers.

Their reports and screenshots are kept outside the repo, with the coordinator. This file sums them up and records what was fixed (decision log L578a–L578f).

## Summary of the reports

- **P1:** none.
- **Measured clean:**
  - HTML contrast;
  - one h1 per page, with no skipped heading levels;
  - no horizontal page scroll at 375 or 320;
  - every diagram label ≥ 12.5 units, and every arrow stops 2.0–2.6 units short of its box;
  - all 120 `#/engine…` links land on the right page;
  - glossary docs links stay on the lesson's own engine site;
  - quiz answers cannot be guessed by length, except `e-pg-l5-10` q3.
- **R1 regressions:** T1-C8-01 (P1, scroll at 320) and T1-C8-02 (P2, cut lines at 375) are fixed and stay fixed.
- **P2 found:**
  - E01, E02, E03, E05, E06 and E07 (eye pass);
  - T2-P-01 and T2-C8-01 (measuring pass).
- **P3 found:**
  - E04, E08–E23 (eye pass);
  - T2-C5-01/02, T2-C7-01/02/03, T2-C8-02, T2-Q-01 and T2-C12-01 (measuring pass).

## Fixed in this round

| Id | Level | Fix | Check |
|---|---|---|---|
| E01 | P2 | The `runtime: docs` notice now depends on the engine (`docsNoteKey`). MongoDB: "needs a real MongoDB cluster (mongos, config servers, shards); mingo does not have one". DynamoDB: "needs the real AWS service (IAM, CloudWatch, billing); dynoxide does not have it". The same fix covers `e-dy-l5-08`. | engineContent test; shots at 375 and 320 |
| E02 | P2 | The cause was bold text wrapping a code span (`**`LeadingKeys` …**`), not a stray space: the inline renderer splits code spans first. Fixed in dy-l5-09 and dy-l2-14. A content test now fails on any literal `**` left over. | engineContent test; shot of Ý chính |
| E03 | P2 | Postgres and design `perf:` steps draw `pgBar()`: plan cost from `EXPLAIN`, index on the table. Previously they could show the NoSQL chunk's `ScannedCount` text, which stays loaded after a NoSQL lesson. "Chấm bằng" now lists the cost bar on step 6. | engineNosql test; shots |
| E05 | P2 | The hub topic map is now 5 labelled groups with one link per line. The renderer has no nested lists, so each group is a label paragraph followed by its own list. | engineDesign, engineDesignAxe tests; shot at 375 |
| E06 | P2 | The tenant cells are now 34 units wide, sit ≥ 3 units inside their shard and ≥ 3 units from each other (the shards are 78 wide). Step 6 reads `Dynamo  TENANT#t-04`: the old "…" was literal text that looked like truncation. Label size is unchanged (documented exception). | engineViz test (arrows plus the new cell test); shots at 375 and 320 |
| E07 | P2 | DynamoDB columns are ordered keys first (table keys, then index keys, then the other attributes by name), in the runner, because the engine returns attributes in no fixed order. When scanned > returned, the number is shown in bold red with a sentence below it. A WRONG block that runs gets a red "it runs, but it is the wrong way" line instead of a green ✓, for every engine. The lesson text puts "đã quét 15 item để trả về 4" in bold. | dynamoColumns test; shot of the WRONG/FIX pair |
| T2-P-01 | P2 | `TENANCY_PAGES` (e-ds-l4-09, e-ds-l5-10, e-mg-l3-19, e-dy-l3-14, e-bp-m39) is added to `scripts/ux-audit.mjs` `ALL_PAGES` and to the `scripts/smoke.mjs` page list. The smoke waits for `#engine-page` on these pages. | `node --check` on both scripts; the smoke was not run |
| T2-C8-01 | P2 | The two interview exhibits now have one field per line, each ≤ 39 characters. | engineInterview test |
| E16 | P3 | A checked wrong option turns red with ✕; a right one turns green. | shot |
| E13 | P3 | The last lesson of an engine track offers "Về trang <engine>". | shot (ds-l5-11, mg-l5-12) |
| E15, T2-Q-01 | P3 | Quiz options rebalanced: mg-l3-19 Q1/Q2, ds-l5-10 Q1, pg-l5-10 q3. | engineContent test |
| T2-C8-02 | P3 | ds-l4-09 `-- ERROR 23503` line shortened to 39 characters. | engineDesign test |

## Left for R3 / v38

- **Diagrams:**
  - E04: the shared NoSQL diagrams use generic key names;
  - E14: step 6 of the placement diagram still leaves blank space in the directory box;
  - T2-C7-02/03: arrow and label touch points in older diagrams;
  - T2-C12-01: the "Minh họa" note repeats the title.
- **Links and code blocks:**
  - E08: "Đọc thêm" titles are URL slugs;
  - E09: English inside VI code comments;
  - E10/E11: the mg-l5-12 and dy-l5-09 pitfall blocks have no Sai/Sửa chips, and the changed line is not marked.
- **Text and words:**
  - E12: "Làm sau bước 1";
  - E17/E18: mixed terms and anglicised Vietnamese;
  - E19: code spans break mid-token.
- **Layout:**
  - E20: the "Thực hành" and "Lab" headings;
  - E21: the term sheet sits over the bottom nav;
  - E22: small items;
  - E23: no bottom padding at 1280.
- **Targets:** T2-C5-01/02 (term button and breadcrumb targets are 20 px tall).
- **Not checked:** the interview question views were not rendered, because they need Start.

## Checks run

- `npx tsc --noEmit`.
- Each test file alone (`--no-file-parallelism`): engineContent, engineViz, engineCore, engineInterview, bestContent, theme, i18n, engineNosql, engineQuizWhy, engineIntegration, engineAxe, engineDesignAxe, engineV27Axe, the new dynamoColumns, and engineDesign and engineAnatomy filtered to the touched ids.
- `npm run build` and `node scripts/check-budget.mjs`: all groups within budget.
- No e2e, no full vitest run, no smoke.
