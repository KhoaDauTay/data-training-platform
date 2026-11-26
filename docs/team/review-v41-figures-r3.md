# v41 figures: R3 eye review and fixes

The fixes respond to the R3 pass by eye (`tools/v39/r3-eye.md`, findings E1–E26) on the v41 build. That pass found two P1s, both at 320 and both caused by phone stacking, plus eleven P2s and thirteen P3s. This round fixes:
- both P1s, in the builder, so every spec benefits;
- every P2;
- the cheap P3s.

Decisions: L670–L679 (`decision-log.md`). Overlap report: `tools/v39/overlap-v41fix.md`.

## Fixes

| # | Sev | Figure | What changed |
|---|---|---|---|
| E1 | P1 | `pg-memory-two-kinds` at 320 | Stacked, read and checkpoint now take lanes beside the stacked pills, inside the "bộ nhớ chung" frame. Read goes up the left, checkpoint down the right. The lanes leave and land 16 in from that side of each box, so they never meet head to head and never run in parallel. The figure is centred again, because no side lane is reserved. |
| E2 | P1 | `dy-query-vs-scan` at 320 | Query and Scan are never shown together, so they share one slot. That removes the empty band; inside the frame C-02…C-30 sits under the C-01 table at 320. Scan has one arrow into the table's frame "Orders: 120 item" (the bracket), instead of two edges. Arrows stop 8 clear of a table's title. |
| E3 | P2 | `pg-index-only-scan` step 2 | The plan reads Index Only Scan · Heap Fetches: 0, and every heap page reads "bỏ qua". The edge label is "bit quyết định". |
| E4 | P2 | `pg-namespace-tree` | The caption and the drawing both show the default search_path "$user", public. Step 1 lights the postgres database. |
| E5 | P2 | `pg-index-order-limit` step 3 | Seq Scan + Sort sits in its own frame, "Kế hoạch khác", under the index. The frame is hidden in steps 1–2. |
| E6 | P2 | `pg-trigger-timing` | Arrows run BEFORE STATEMENT → into the BEFORE ROW frame → pen → book → bag → out to AFTER ROW ×3. |
| E7 | P2 | `dy-read-pipeline` | KeyCondition, Filter and Projection are boxes in order, each with its count in words ("đọc 4 · tính tiền", "còn 3, bỏ 1 đã đọc", "3 item, chỉ total"). |
| E8 | P2 | `dy-conditional-write` | Each result sits on its desk's path: desk → "3 ≥ 2: ghi" / "1 ≥ 2: từ chối, vẫn tốn WCU" → item. The refused path is dashed. In step 3, PutItem with no condition writes onto the item ("ghi đè 3 → 1"), and the item reads "bán 4, còn 1". |
| E9 | P2 | `mg-array-positional` | `$[l]` is now `$[elem]` (`elem.sku = p4`), in the figure and in e-mg-l2-01's code and hint. |
| E10 | P2 | `mg-embed-vs-reference` | Order 1 is a table whose rows are its embedded lines. "trần 16 MiB" sits on the embed side. p6 reads "3 review mới nhất". |
| E11 | P2 | `pg-vacuum-flow` (old diagram) | The legend reads "Free space map: phần tô = chỗ trống". The step-5 note "Index Only Scan đọc AV trước" sits under the maps. The 9–10 px labels at 320 are kept under the R3-04 waiver: the old diagram has a fixed viewBox, and no cheap fix exists. |
| E12 | P2 | e-pg-l3-18 | New figure `pg-buffer-hit-read` with two paths: Seq Scan trips (shared hit=163) → "hit: có sẵn" → shared_buffers, and file bảng → "read: nạp từ đĩa" → shared_buffers. It has no work_mem. The `hit` variant of `pg-memory-two-kinds` is gone. |
| E13 | P2 | `pg-savepoint-timeline` | The timeline turns back under itself. ROLLBACK TO points back up to SAVEPOINT (dashed, "về mốc"). "dùng lại được" labels the arrow to COMMIT. On phones the figure is one column (`phone:` rows), and the back arrow takes a lane beside the fee box. |
| E14 | P3 | `pg-memory-two-kinds` | The dirty page is the tinted p0 cell, named in the sub "p0: trang bẩn", so cells keep their width. The sub says "minh họa 6 trang". |
| E15 | P3 | `mg-elemmatch`, `mg-array-positional` | "Ô được tô màu là…". |
| E16 | P3 | all pills | A two-line key is a rounded rectangle (corner 14), not an egg. The REFRESH arrowhead keeps 8 clear of "có thể có index". |
| E17 | P3 | `pg-toast-pointer` | Heap rows are listed by id 1, 2, 3 and fill in as the steps reach them. The table is named `pg_toast_<oid>`. The note reads "ngưỡng TOAST ~2 kB". |
| E18 | P3 | `dy-query-vs-scan` | C-01's rows stay highlighted in step 2, with "4 item trả về". |
| E19 | P3 | `dy-capacity-rounding` | Every row ends in RCU (12 KB → "1,5 RCU, đọc cuối"). Numbers are written "1 500". |
| E20 | P3 | `dy-pagination` | The full key appears once: "LEK = C-01 + 2026-08-28#O-102". |
| E21 | P3 | `mg-lookup-unwind` | Dung's cell reads "không ra tài liệu", with no strike-through. |
| E22 | P3 | `pg-namespace-tree` | template0, template1 and the roles key share one row under postgres. |
| E24 | P3 | e-pg-l3-17 | Only `pg-vacuum-flow` is left (the `vm` variant was dropped). AV keeps one colour. |
| E25 | P3 | `mg-array-positional` | The `$inc` arrowhead stops 8 clear of "đơn 5" (builder rule). |
| E26 | P3 | `pg-privilege-gates` | The text alternative starts "Vai trò linh…". |

Not in this round:
- E23: heap column widths still change between steps.
- The rest of E16: the INSERT step and the view and matview sharing one query.

## Builder (`src/engine/viz/figure.ts`)

- **Shared slot.** When a row wraps, a node that is never shown together with the node it would wrap under takes the same slot.
- **Lanes beside stacked rows.** An edge between rows that are not neighbours takes a lane right beside the rows in between: up on the left, down on the right, 16 in from that side of each box. It never runs through a group that neither end belongs to. Links, and lanes that do not fit, keep the old side lane. A lane beside the rows can carry a label.
- **8 clear of a table.** An arrow into a grid or bars stops 8 clear of its title or sub.
- **Group edge ends.** An edge end may be a group id: the arrow lands on or leaves its frame. The checker reads `g:<id>`.
- **Frames hide when empty.** A group frame with no member shown in a frame is hidden in that frame.
- **Two-line pills.** A two-line key is a rounded rectangle.
- **`phone: { rows }`.** Used instead of `rows` when the default rows wrap.
- **Budget.** `engineFigure` is 10 644 B, against a ceiling raised to 11 KB (L679).

## Checker (`scripts/overlap-check.mjs`)

- **(h)** Two arrows run parallel ≤ 8 apart for more than 12 units. A bus is exempt.
- **(i)** An arrowhead (the last 10 units, plus the tip) comes within 5 of any text.
- **(j)** Two arrowheads meet head to head: the tips are ≤ 12 apart and point at each other, or the last legs lie on one line in opposite directions.

All three have `--selftest` cases and pure cases in `tests/figures.test.ts`. Before the fix they found 101 cases in 12 specs. After it, they find 0 in all 46 specs (66 routes × VI 6 configs + EN 3, and 90 viz lessons).

In the old registry diagrams, (i) finds arrowheads close to labels in:
- `mg-aggregation-pipeline` / `mg-pipeline`
- `pg-mvcc-timeline`
- `pg-btree`
- `pg-rls-path`
- `pg-query-path`
- `pg-replication`

These are listed for a later pass.
