# v40 figures: R2 eye review and fixes

Source: the R2 visual pass by eye (`tools/v39/r2-eye.md`, findings E-01…E-17) on the v40 build. It found no P1, five P2 and twelve P3.
This round fixes every P2 and the P3s the brief named. Decisions: L648, L649, L649a (`decision-log.md`).

## Fixes

| # | Sev | Figure | What changed |
|---|---|---|---|
| E-01 | P2 | `ds-2nf-split` | The split is shown with solid arrows into a dashed frame, "tách thành 2 bảng". The foreign key is a dashed arrow labelled "khóa ngoại". The arrow to ex_course is `near`: on phones, where the two tables stack, it is not drawn, so there is no side lane, bus or double arrowhead. Arrows leave a table 8 units below its text. |
| E-02 | P2 | `ds-relation-anatomy` | dept_id is now the last column. The lines are anchored `staff#r.3` → `dept#r.0`, so they leave the dept_id cells and end on the id cells. Two lines into one row end 8 apart. The caption no longer says the four words point at parts of the table: it was reworded instead of drawing leader lines. |
| E-03 | P2 | `ds-cardinality` | Real crow's-foot marks are drawn at both line ends (bar, circle, three-prong foot), and they turn with the line when it stacks. The ASCII pills and the unexplained tint are gone. A legend row shows the four marks. |
| E-04 | P2 | `ds-er-to-tables` step 2 | order_items has three sample rows (the lab table starts empty). Its two key columns are tinted and the sub reads "PK (order_id, product_id)". The caption now says "tô màu". |
| E-05 | P2 | `ds-three-levels` | A pill sits in each gap: "độc lập logic" between the external and conceptual levels, "độc lập vật lý" between the conceptual and internal levels. Each lights on its own step. Step 3 keeps "+ stock". |
| E-07 | P3 | `sql-not-in-null` on `exists` | The NOT IN trap moved to the end of Lỗi hay gặp (it is now trap 3), so the figure sits right under it. Figures are placed per section, not per trap, so the figure could not go inside trap 2 as the brief asked. |
| E-08 | P3 | `sql-upsert-flow` | DO NOTHING stands beside DO UPDATE on a dashed "hoặc" link. On phones it wraps under DO UPDATE and the link turns vertical. EN uses "8M" / "9.5M". Two arrows leaving one box now leave at ⅓ and ⅔ of it, so the "chưa" elbow no longer runs through the "có" label. |
| E-09 | P3 | `sql-set-ops` | The subtitle now reads "…khác với phép nối, vốn thêm cột". |
| E-07, E-11 | P3 | `sql-not-in-null`, `sql-sargable-index` | A no-break space (` ` in YAML) keeps "5 dòng" and "hằng số" together. |
| E-11 | P3 | `sql-sargable-index` | With `align: true`, both result chips stack below their strips on phones. |
| E-12 | P3 | `sql-rank-ties` | "sinh từ năm 1998 trở đi" in the caption and alt, and "đồng hạng" throughout. The ROW_NUMBER note reads "3 và 4, tùy thứ tự" / "3 and 4, any order". |
| E-13 | P3 | all boxes | Text in box, key, table and doc shapes is centred in the box's height, which is fixed by the tallest step. |
| E-16 | P3 | every stepped figure | The text alternative is the figure, then one entry per step. The step list shows those entries: each step's own alt, else its sentence plus what changed. Nothing is read twice, and no "Bước n:" label is written into the text. The hand-written alts of `ds-anomalies` and `ds-er-to-tables` were swept, and the step-1 sentence moved from the figure alt into `steps[0].alt` in `sql-correlated-loop`, `sql-window-vs-group` and `ds-closure-rounds`. |
| extra | — | `sql-inner-join-pairs`, `ds-relation-anatomy` | The inner-join links use cell anchors, so the lines reach the cells instead of stopping at the edge of a wider frame. The relation-anatomy caption names the dept_id column instead of the lines, because at 320 the tables stack and no line is drawn. The lesson sentence for e-ds-l1-02 now says the words sit "beside" the table. |

Not in this round: E-06, E-10, E-14, E-15, E-17, the rest of E-07 ("NOT EXISTS xét từng cặp" as the box's second line), the rest of E-08 (the store label), the rest of E-09 (one-line pill, operator first on phones), the rest of E-12 (legend gaps at 320), and the rest of E-13 (the Mermaid syntax and the duplicate title box).

## Builder (`src/engine/viz/figure.ts`)

New spec fields:
- edge `ends: [from, to]` with `one | zero-one | many | zero-many`
- node `card:` (a legend pill)
- link end `grid#row.col`
- edge `near: true`

New functions: `cellOf`, `anchorX`, `crowEnds`, `crowMark`, `mid`, and in `layout()` the closures `dropped`, `out` and `leave`.

Changed functions: the `layout()` body (routes, `side`, the lane-reserve count, the frame loop), `WORDS` (`step` removed), the types `FigEdge`, `FigNode` and `Card`, `anchorY`, `laneRoute`, `size`, `pageShapes`, `draw`, `altText`, `mountFigure`, `fold`, and `gapOf` / `labelled` in `placeRows`.

Outside the builder:
- The core `mount` takes `FigOpts.steps` and puts the text alternative before the step list.
- The checker's `analyze` no longer guesses a group frame (`g:`) as an arrow's end.

## Checks

- `tsc`.
- Each touched test file alone:

  | Test file | Result |
  |---|---|
  | `figures` | 291, with new tests for edge kinds, cell anchors, crow's-foot marks and the stepped alt |
  | `theme` | 26 |
  | `fullLesson` | 130 |
  | `engineContent` | 600 |
  | `engineDesign` | 105, filtered to the touched lessons, PLAN and modules |
  | `engineCore` | 33 |
  | `engineViz` | 65 |
  | `axe` | 44 |
  | `engineAxe` | 14 |
  | `engineDesignAxe` | 14 |

- Build and `check-budget`: `engineFigure` is 9,212 B gz against a 9,216 B (9 KB) cap, so any addition breaks it.
- `node scripts/overlap-check.mjs --selftest` passes.
- The overlap checker on 36 routes (VI 6 configs, EN 3) found 0 in (a)–(g).
- Shots of every step of the fixed figures were checked by eye at 1280 light, 375 dark and 320.
- No e2e, full vitest or smoke run.
