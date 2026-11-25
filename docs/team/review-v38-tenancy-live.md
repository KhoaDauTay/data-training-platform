# UI/UX review R3 (live): the multi-tenant theme, v34–v38

2026-11-25. Two fresh reviewers looked at the live site (deployment df42970, service worker cache `cq-f53528a6f0d55a37`):

- an **eye pass**, which walked `#/engine` → Design L4 → the hub `e-ds-l4-09` → seven spokes → Best Practice X08 the way a learner would, at 1280 light, 375 dark and 320, with a returning-player save;
- a **measuring pass**, which ran a scoped `npm run ux-audit` against the live URL (27 pages × 4 widths, exit 0), opened all 157 `#/engine…` links on those pages (157/157 correct), and read the quiz options and the sources statically.

Their reports and screenshots are kept outside the repo, with the coordinator. This file sums them up and records what the fix round changed (decision log L590–L599).

## Summary of the reports

- **P1:** none. The CI live smoke for df42970 said `SMOKE OK` with an empty axe report on the tenancy pages.
- **Measured clean:** HTML contrast; one h1 per page with no skipped levels; no horizontal page scroll at 375 or 320; every diagram label ≥ 12.5 units; glossary docs links on the lesson's own engine site; the v38 claims (bottom padding, phone term sheet above the bottom bar, 28 px term button, titled "Đọc thêm" links, Sai/Sửa read-only cards, VI unit words) all confirmed on the live page.
- **P2:**
  - R3-01: the theme is hard to find from `#/engine` and Design L4; L4's subtitle named only normal forms; the hub looked like any concept lesson.
  - R3-02: the `pg-rls-path` diagram, step 4, drew `current_setting('app.tenant_id')::int`, the unsafe form the lesson teaches against.
  - R3-03: `e-ds-l5-10` example 3 said "run it again, nothing changes", but every Run starts from fresh data, so a second click moved the row again.
  - R3-05: the hub's topic map named three Best Practice cards by bare codes and showed no progress.
  - T3-C8-01: the hub's ERROR line was 41 characters, so its point ("9") was cut at 375 (R2's note said 39).
- **P3:** R3-04, R3-06 to R3-13 (eye pass); T3-C8-02, T3-C13-01, T3-Q-01, T3-C5-01, T3-C7-01/02 (measuring pass).

## Fixed in this round

| Finding | Fix |
|---|---|
| R3-02 | Step 4 now draws the fail-closed form in five lines (`tenant_id = NULLIF(` / `current_setting(` / `'app.tenant_id',` / `true), '')::int` / `AND NOT archived`), and the step sentence states the whole expression. The diagram's pinned setup uses the same policy, so the PGlite test still proves 30 / 10 / 8. The data stays the diagram's own sample (tickets, tenant 2), which `e-pg-l5-10` also uses; `e-pg-l5-20` already says so in its Practice section. |
| R3-03 | The block runs both guarded UPDATEs (one to `s1`, a competing one to `s3`) in one Run, then reads the row: `t-05 | s1 | 2`. The text says each Run starts from fresh data and why the second move matches no row. |
| R3-01 | `ladder.design.L4` / `L5` name the multi-tenant modules. `#/engine` has one "Chủ đề / Topics" row (the NoSQL path row's look) that opens the hub. On the L4 level page the hub's row carries a "Bản đồ chủ đề / Topic map" chip. engineui 18.98 → 19.36 KB gz of 20. |
| R3-05 | The hub writes each card's title beside its id (VI and EN). Lesson and card links in lesson text show the done tick, with the sr-only word "Đã xong", once completed (read from the save the page already has). |
| T3-C8-01 | `-- ERROR 23503: no invoice 9 (seller 1)` (39 characters), and the INSERT names its columns (R3-13). New `tests/tenancyCodeLines.test.ts` reads the 23 lessons and 3 cards and fails on any code line over 40 characters. |
| T3-C13-01 | EN result lines say "1 row", "1 document", "1 item" (the EN plural minus its "s"; VI has no plural). |
| T3-Q-01 | 13 options rewritten in 8 files (pg-l4-20 ×3, pg-l5-19, pg-l5-22 ×2, pg-l2-26, ds-l2-06, ds-l2-07, ds-l4-10 ×2, x08): no answer is the longest option by ≥ 1.25× and ≥ 10 characters any more (a check script, before 13 flagged, after 0). Weak distractors became believable ones (x08 "Lỗi quyền" → "Lỗi 42501: app không được đọc bảng gốc"). |
| R3-06 | "Đọc thêm" links on lessons and cards use the link style (accent ink, underline) and one marker, the external icon, no bullet. |
| R3-10 (part) | Cards X08 and M39 end their "Vì sao / Why" list with a link to the hub; card prose now links lesson ids by title. |
| — | The X08 pair's setup policy uses the fail-closed form too (same 4 / 2 result). |

Checked on a local preview (port 5253) at 1280 light, 375 dark and 1280 EN: the topic row, the L4 module with the chip, the hub map with three ticks, the 39-character ERROR block (no sideways scroll), diagram step 4, example 3 after Run (`t-05 | s1 | 2`, "1 dòng" / "1 row"), X08's link back.

## Left open

- R3-04 diagram text at 320 (see waivers), cramped tenant chips; R3-07 the two generic spoke diagrams (`mg-esr`, `dy-single-table`) without the tenant key; R3-08 quiz options that quote the lesson (the length check covers only the 8 measured files); R3-09 the 8 → 9 sentence in `e-pg-l5-19`; R3-10 prev/next without titles and the left-aligned "Thẻ trước"; R3-11 inline code breaking inside an identifier (L559 chose wrap-anywhere); R3-13 the rest (jargon line, "Thực hành"/"Lab" names, owner_sees not code-styled, repeated rule caption, capstone step label, X08 Sai/Sửa highlight).
- T3-C8-02: 19 lines of exactly 40 characters meet the rule; their last character is visible at 375.
- T3-C7-01/02: line boxes touching without ink overlap; empty frame under `pg-partition-prune` step 1.

## Waivers on record

- 20 px breadcrumb, "Đọc thêm" and "Liên quan" links (T3-C5-01): text-like links, P3 by the R1–R3 practice.
- 10.3 px diagram labels at 320 (R3-04): the documented exception; "Mô tả từng bước" carries every step in text.
- English comments in VI code blocks (R3-12): code must be identical in VI and EN, and the Sai/Sửa chips say it in Vietnamese.
