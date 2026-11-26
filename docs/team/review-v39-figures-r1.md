# Figure review R1 (eye pass): the v39 figures and Batch 0

2026-11-26. One reviewer looked at every v39 figure and the old diagrams that Batch 0 put into figure slots (build a44200e,
`vite preview`, headless Edge, reduced motion, returning-player save): 1280 light VI on every page and step with the text
alternative open, 375 dark VI, 320 light VI on the General pages, and 1280 light EN on four pages. 218 screenshots; the report
and the shots are kept outside the repo, with the coordinator. This file sums them up and records what the fix round changed
(decision log L625–L629).

## Summary of the report

- **P1:** none. No page scrolled sideways at any width; no text on text; every red/green meaning also has a word.
- **P2 (11):**
  - E1: the LEFT JOIN result drew 5 store rows with extra order ids as headerless cells, against an "8 rows" badge.
  - E2: in `sql-join-family` the targets were a subset of the sales, so LEFT equalled INNER and FULL had NULLs on one side only.
  - E3: the three join tables were centred vertically, so their titles and captions sat at three heights.
  - E4, E5: the pair lines of `sql-inner-join-pairs` and `sql-clause-order` crossed in a gap of about 30 px at 1280.
  - E6: the clause-order caption described the phone layout (and was wrong at 375).
  - E7: the count sample showed 8 cells but the results were for the whole 300-row table.
  - E8: the anti-join page kept the "ON or WHERE" title.
  - E9: `pg-tenancy-models` at 375: six stacked `tenant_id` strips touched, labels ran into their borders. The overlap checker had
    reported 0.
  - E10: two arrowheads landed 8 px apart on Ha Minh and read as one double arrow.
  - E11: the text alternative was a mechanical dump ("(hộp)", tables flattened, stepped figures described step 1 only).
- **P3 (15):** E12–E26 (title and caption on one line, per-variant titles, labels wrapping with room to spare, figures and old
  diagrams left-aligned, ragged count rows, header styling in the truth tables, a note far from its row at 320, the figure's place
  after Bẫy 2, clipped Vietnamese, the NULL note with no link to Ha Minh, "Công vận hành", tight old-diagram gaps, AV/AF never
  spelled out, a fixed empty band under the step sentence).

## Fixed in this round

| Finding | Fix |
|---|---|
| E1 | One result row per store and order pair (8 rows); step 2 strikes the two NULL rows, step 3 keeps only them. |
| E2 | Real lab data with strays on both sides: stores with orders on 23 Oct (1 2 3 5) and 24 Oct (1 2 3 4), checked on PGlite. INNER 3, LEFT 4, FULL 5 with NULL on both sides. |
| E3 | A row made only of tables or charts is top-aligned (one title line); other rows stay centred. |
| E4, E5 | Linked tables wrap at a 32 gap, then widen toward `linkGap(lines)` = min(120, 24 + 18·lines) from the room left. Tested: the gap reaches `linkGap` or the row is full, and the lines are still drawn at 335. |
| E6 | Caption: "Bạn viết SELECT đầu tiên, Postgres chạy nó gần cuối; số thứ tự là thứ tự chạy." |
| E7 | The big numbers count the 8 sample rows (8 / 6 / 5); each box adds "cả bảng: 300 / 283 / 5"; the caption says so. |
| E8, E13 | Variants have their own `title` and `caption` (the field was declared but never read before): "Anti-join: giữ dòng không có cặp", "SELECT cắt cột", "WHERE cắt dòng". |
| E9 | Checker false negative found and fixed (below); the diagram now has 4 strips 20 high on a 24 pitch. |
| E10 | Arrows into one side of a box spread to ⅓, ⅔ … when each can drop straight, else they join one bus with a single arrowhead (Ha Minh, Ta Vy). Tested: tips into one box coincide or are ≥ 16 apart. |
| E11 | Sentences instead of a dump: no kind tags, tables read row by row ("Ta Vy, manager_id: 3"), every later step described ("Bước 2: …"), a step variant describes its own step. Optional hand-written `alt` per figure, step or variant wins; all 10 figures have one. |
| E12 | The caption sits on its own line under the bold title. |
| E14 | A note, and a table's or chart's title and sub, keep one line up to 32 characters when the figure is ≥ 480 wide; a row of notes sits 16 above the row it heads. |
| E15, E22, E24 (centring) | Every svg is centred in its frame (`mx-auto`), new figures and old diagrams alike. |
| E16 | `align: true` lines the three count rows up as columns at every width; "bỏ ô NULL". |
| E18 | The Son Tra note is the stores table's own sub line. |
| E20 | "lọc ngày trong ON" / "lọc ngày ở WHERE". |
| E21 | A dashed line joins the "manager_id NULL" note to Ha Minh. |
| E22 | "Công sức vận hành"; 6 units under the arrowheads. |
| E25 | Legend "AV = all-visible · AF = all-frozen" and "AV/AF nét đứt = bit chưa bật"; the map labels sit 4 above their boxes. |

## Why the checker missed E9, and the fix

`getBBox()` ignores strokes. The strips were 15 high on a 16 pitch, so their geometric gap was 1.0. Rule c needed an overlap above
`boxGap` (1), so it stayed silent, although two 1.2-wide strokes overlapped by 0.2. The labels' estimated ink (from the text box Edge reports) ran from 0.2
inside to 0.4 outside the strip's geometric edge (375/320 and 1280), so it sat on the 0.6-wide half stroke, and rule b only fired
on a crossing above 0.5. Rule a saw the touching line boxes but filed them as info.

`analyze()` now gets each box's stroke width (`sw`, read from CSS in the page; 1.2 / 2.2 in the Vitest model) and has two more
checks:

- c "nearly touch": two boxes that share one axis and are not flush (more than 0.5 apart) need at least 0.5 of background between
  their strokes.
- b "hugs": a text's ink must stay inside the stroke of the box it belongs to.

The thresholds come from the first run over all 90 lessons: grids with 2-unit gaps (0.8 of background) stay clean. The `--selftest`
page has the pool-strip case, and `tests/figures.test.ts` has a pure one. The checker also takes `--port` and `--prefix`.

The first run with the new rules also found `pg-lock-matrix` (bold cells merged), `mg-bson-doc` (byte-strip segments 1 apart, type
labels on their box edge), `mg-compound-index-esr` (the `stage` box) and `pg-replication` (INSERT/UPDATE/DELETE on its edge at 375).
All four are fixed.

## Checks

- `tsc`.
- Test files run one at a time: `figures`, `engineViz`, `enginePgViz`, `theme`, `fullLesson`, `engineContent`, `engineDesign`
  (filtered), `axe`, `engineAxe`.
- Build and `check-budget`: `engineFigure` 6.6 of 7 KB gz (5.6 before this round), figure specs 0.7–1.5 of 2 KB each.
- The new checker on the 20 v39 pages (VI in 6 configs, EN in 3) and the 90 `viz:` lessons (VI in 6, EN in 3): 0 P1–P3 in (a)–(e)
  and (g). The new figures have no finding of any tier. (f) W is the recorded 10.3 px waiver for old diagrams at 320.
- Re-shot at 1280 light and 375 dark, and read by eye.

## Left open

- E17: the truth tables' first column is not styled as a header.
- E19: the left-join figure still follows the collapsed Bẫy 2 card; the caption now says "Bẫy 1".
- E23, E24: the tight old gaps in `pg-mvcc-timeline`, `pg-wal-flow` and `mg-pipeline`, and the thin pipeline bars.
- E26: the reserved band under the step sentence.
- What the new thresholds let through on purpose (cells with 0.8–1.8 of background between strokes, text exactly on a stroke's
  inner edge in `mg-replica-election`) is listed in the overlap report kept with the coordinator; each was looked at by eye.
