# Review R1: multi-tenant content of v34 + v35 (UI/UX)

2026-11-25. Repo copy of the two R1 reports, written by fresh agents that did not build the work: a pass by eye (findings `E01`–`E18`) and a measuring pass (findings `T1-<check>-<n>`). The full reports, screenshots and capture scripts stay outside the repo; this page keeps the findings, their severity and what happened to them.

Status "not in the R1 fix commits" means the fix commits and decision log rows do not mention it; it was not re-checked on the page.

Severity: **P1** blocks learning or is unreadable · **P2** clearly hurts · **P3** polish. Fixes landed in `397c96b`, `1ee2ee9`, `51d8e9c` and `e489907` (decision log L558, L558a, L558b, L559).

## How it was measured

- Build of the `v35-pg` branch after the v34 merge, served by `vite preview` on its own port, one headless Edge, `tests/fixtures/save-v5.json`, tour and guides off.
- Pages: Design `e-ds-l2-06`, `-l2-07`, `-l4-08` … `-l4-11`; PostgreSQL `e-pg-l1-19`, `-l2-26`, `-l4-20`, `-l5-10`, `-l5-19` … `-l5-22`; the level pages Design L4 and PostgreSQL L5; the BP card `e-bp-x08`.
- Widths: 1280 light, 1024 light, 375 dark, 320 light, all VI, plus 1280 EN on the diagram pages.
- Tools: a scoped `npm run ux-audit` (`UX_PAGES`, 17 pages); a throwaway driver for code-block overflow, line-height, every diagram step by keyboard, and Play timing; a link walk over all 79 `#/engine…` links on those pages.
- Not measured: SVG text contrast (the core paints through theme tokens), text inside its own diagram box, results after a submit, axe (CI smoke).

Clean results: contrast of HTML text 0 findings; one `h1` per page, no skipped heading levels; 79/79 links land on the right page; diagram labels ≥ 12.5 units on every frame (12.3 px at 375, 10.3 px at 320, the documented L510 exception); diagram keyboard, `role=status` sentences and Play (no loop, reduced motion holds 4 s) all pass.

## Findings

| ID | Sev. | Where | Finding | Status |
|---|---|---|---|---|
| E01 | P1 | every lesson, worst on the hub `e-ds-l4-09` | Lesson and card links looked like body text (no colour, no underline); the hub's map was one 15-link paragraph | **Fixed** (L558): `xref()` style (accent ink, solid underline, arrow); the hub map became a 5-row list in Ý chính |
| T1-C8-01 | P1 | `e-pg-l5-20` at 320 | Page scrolled sideways (328 px): an unbreakable inline code span in a quiz `fieldset` with min-content width | **Fixed** (L559): inline code wraps anywhere, the quiz `fieldset` gets `min-w-0`, the long spans were shortened |
| E02 | P2 | `e-ds-l2-06`, `e-ds-l4-09`, `e-pg-l5-10`, `e-ds-l4-11` | The right quiz option was always the long one that explains itself | **Fixed** (L558a): options of equal length, reasons moved to `why`; the display order is shuffled by `optionOrder`. v36 and v37 lessons also vary the `answer` index |
| E03 / T1-C8-02 | P2 | `e-pg-l5-10` (375, 320, one line at 1280), `e-ds-l4-08` at 320 | Point lines (the `WITH CHECK` policy line, the `-- ERROR 42501` comment, the target tenant) cut off behind sideways scroll | **Fixed** (L558a, `51d8e9c`, `e489907`): blocks wrapped to ≤ 39 characters, short `-- ERROR` lines. The suggested edge fade on overflowing `pre` was not built |
| E04 | P2 | `pg-tenancy-models`, `pg-rls-path` at 320/375 | Diagram labels looked tiny; arrows touched box edges | **Partly fixed** (L558a): rows and steps 46 units apart, arrows clear of boxes. Measured label size at 375 is 12.3 px, not 7–8 px, so no stacked phone layout was built. v37's `pg-tenant-placement` has a test that every arrow end stays ≥ 2 units outside every box |
| E05 | P2 | `e-ds-l4-08` | The diagram sat far below the sentence that announced it; ratings had no good/bad cue; labels crowded | **Fixed** (L558a): the rating words say good or bad (mạnh/yếu, đắt/rẻ, nhiều/ít) and tones only repeat them; Mở bài says the diagram is at the end, after Lỗi hay gặp. The SVG still stops at 480 px on wide screens (core) |
| E06 | P2 | `e-pg-l5-10`, `e-pg-l5-19`, `e-pg-l5-20` | The pool / `SET LOCAL` diagram was on the wrong lessons and missing from the pooling lesson | **Fixed** (L558a): `pg-rls-path` moved to `e-pg-l5-20`, kept on `e-pg-l5-10`, removed from `e-pg-l5-19` |
| E07 | P2 | BP card `e-bp-x08` | The Không nên / Nên pair differed only by the view name; the level chip was wrong | **Fixed** (L558b): each side shows its view definition, level L5 |
| E08 | P2 | PostgreSQL tenancy lessons | One fictional company under three names; English sentences in code comments of VI pages | **Fixed in part** (L558a, L564): VI says "Chợ Lồng Đèn" everywhere; comments stay English because code must be identical in VI and EN (`lessonProblems`), and from v36 they are bare markers (`-- WRONG`, `-- FIX`, `-- ERROR <code>`) with the explanation in the VI sentence above |
| E09 | P2 | glossary popovers, Đọc thêm | "Official docs" of a Postgres lesson opened MongoDB or DynamoDB pages; an AWS SaaS page was labelled DynamoDB | **Fixed** (L558b): `docFor(term, engine)` picks the lesson's engine or shows no link; AWS pages outside DynamoDB are labelled "AWS" / "AWS SaaS Lens" |
| T1-C3-01 | P2 | capstone `e-ds-l4-11` at 1280 | Step names truncated with no `title` | **Fixed** (L558b): `title` on the step bar, two names shortened. v37's capstone keeps names ≤ 16 characters |
| E10 | P3 | all lessons | "Đọc thêm" labels are raw URL slugs | Not in the R1 fix commits (only the AWS labels changed) |
| E11 | P3 | level pages Design L4, PostgreSQL L5 | Level blurbs do not mention the multi-tenant modules; module names differ between tracks | Not in the R1 fix commits (not re-checked) |
| E12 | P3 | every lab | Every later step says "Làm sau bước 1" | Not in the R1 fix commits (not re-checked) |
| E13 | P3 | hub example run | Result caption squeezed; a `WRONG` block shows a green check | Not in the R1 fix commits (not re-checked) |
| E14 | P3 | `e-ds-l4-11` step 5 | A date splits inside an inline code chip | Not in the R1 fix commits (L559 made inline code wrap anywhere, which fixes overflow but can still split a value) |
| E15 | P3 | `e-ds-l4-09`, `e-ds-l4-08`, `e-ds-l2-06` | Walls of text where a list would scan better | Fixed for the hub (L558); not in the R1 fix commits elsewhere |
| E16 | P3 | `e-ds-l2-06`, `e-pg-l5-10`, hub EN | Translated-sounding VI phrases; "theme map" in EN | EN "topic map" fixed (L558); the VI phrasing notes are not in the R1 fix commits |
| E17 | P3 | `e-ds-l4-08` at 1280 | The on-page table of contents stayed on "Mở bài" after a programmatic scroll | Not in the R1 fix commits; needs a manual check |
| E18 | P3 | `e-pg-l5-19` | Long stacks of example cards with an empty header strip | Not in the R1 fix commits (not re-checked) |
| T1-C5-01 | P3 | all 17 pages | 20 px tall targets: breadcrumb, source links, a lesson link in a quiz legend | No change: shared components, the inline-link exception of WCAG 2.5.8 |
| T1-C8-04 | P3 | 9 lessons at 375 | A demo `pre` holds 39 characters, so exactly-40-character lines scroll a few px | Rule not changed; new content since v35 keeps every code line ≤ 39 |
| T1-C7-01 | P3 | diagram pages at 320 | Labels 10.3 px | Accepted (L510) |
| T1-C9-01 | P3 | `pg-tenancy-models` step 5 at 375/320 | Rating headings sat 2–3 px under the previous row | **Fixed** (L558a): 14 units between a row's cells and the next heading |
| T1-C7-02 | P3 | diagram pages at 1280 | SVG stops at 480 px in a ~720 px card; label line boxes touch (no ink overlap) | Accepted (core) |

v38 (L580–L589): E10 (titled sources, L582) and E12 (the step before, L583) are fixed; E15 is fixed for the hub and the other tenancy lessons got new paragraphs, not lists; E16's VI phrasing was rewritten only where R2 named it (L584). E11, E13 (caption), E14, E17 and E18 stay open.

## What reads well (keep)

- Design-track code wrapped short reads fine at 375; the Sai / Sửa / Lỗi mong đợi chips are clear in both themes.
- Diagram stepping: dimmed dashed boxes out of focus, one sentence per step, the "Mô tả từng bước" text alternative.
- Wrong-answer feedback in quizzes; the capstone step bar and "Chấm bằng" box.

## Carried into v36–v37 authoring

- Every code line ≤ 39 characters; markers bare, the explanation in the sentence above.
- Quiz options of equal length, the right one short, reasons in `why`, the answer index varied.
- A lesson with a diagram says where it is (at the end, after Lỗi hay gặp, for a concept lesson).
- Diagrams keep arrows clear of boxes and say "Minh họa" / "Illustration" when nothing runs in the browser.
- Docs links only to the lesson's own engine.
