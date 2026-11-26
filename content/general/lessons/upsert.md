---
id: upsert
title: "Thêm hoặc sửa: ON CONFLICT và MERGE"
title_en: "Insert or update: ON CONFLICT and MERGE"
minutes: 25
figures: [{ name: sql-upsert-flow, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Viết upsert bằng `INSERT … ON CONFLICT … DO NOTHING | DO UPDATE` theo một khóa.
    en: Write an upsert with `INSERT … ON CONFLICT … DO NOTHING | DO UPDATE` on a key.
  - vi: Dùng `EXCLUDED` để lấy giá trị đề nghị, và một `WHERE` để chỉ sửa khi cần.
    en: Use `EXCLUDED` for the proposed value, and a `WHERE` to update only when needed.
  - vi: Biết khi nào phải dùng `MERGE` vì không có ràng buộc duy nhất phù hợp.
    en: Know when you must use `MERGE` because no suitable unique constraint exists.
syntax: |-
  INSERT INTO table_name (columns...) VALUES (...) | SELECT ...
  ON CONFLICT (key_column, ...)
    { DO NOTHING
    | DO UPDATE SET column = EXCLUDED.column [, ...] [ WHERE condition ] }
  [ RETURNING ... ]

  MERGE INTO target t
  USING source s ON t.key = s.key
  WHEN MATCHED THEN UPDATE SET ...
  WHEN NOT MATCHED THEN INSERT (columns...) VALUES (...)
options:
  - { code: "ON CONFLICT (cols)", vi: "đích xung đột: phải khớp đúng một ràng buộc duy nhất hay khóa chính", en: "the conflict target: must match exactly one unique constraint or primary key" }
  - { code: "DO NOTHING", vi: "dòng đụng khóa thì bỏ qua lặng lẽ", en: "a row that hits the key is quietly skipped" }
  - { code: "DO UPDATE SET …", vi: "dòng đụng khóa thì sửa dòng đang có", en: "a row that hits the key updates the existing row" }
  - { code: "EXCLUDED.col", vi: "giá trị của dòng đề nghị (dòng bị từ chối)", en: "the value of the proposed (rejected) row" }
  - { code: "table.col", vi: "trong `DO UPDATE`: giá trị cũ của dòng đang có", en: "inside `DO UPDATE`: the existing row's old value" }
  - { code: "DO UPDATE … WHERE", vi: "chỉ sửa khi điều kiện đúng; không đúng thì giữ nguyên", en: "update only when the condition holds; otherwise keep the row" }
  - { code: "MERGE … WHEN [NOT] MATCHED", vi: "so khớp theo điều kiện tự viết, không cần ràng buộc duy nhất", en: "matches on a condition you write, no unique constraint needed" }
examples:
  - title: { vi: "Chỉ thêm tháng còn thiếu", en: "Adding only the missing months" }
    sql: |-
      INSERT INTO store_targets (store_id, month, target_vnd)
      VALUES (4, '2026-01-01', 5000000), (4, '2026-03-01', 5000000)
      ON CONFLICT (store_id, month) DO NOTHING
      RETURNING store_id, month, target_vnd
    read:
      vi: "Chỉ 1 dòng trở về: tháng 01/2026 được thêm. Tháng 3 đã có chỉ tiêu, đụng khóa chính `(store_id, month)` nên bị bỏ qua, và `RETURNING` không liệt kê dòng bị bỏ qua."
      en: "Only 1 row comes back: January 2026 is added. March already has a target, hits the `(store_id, month)` primary key and is skipped, and `RETURNING` does not list skipped rows."
  - title: { vi: "Có thì ghi đè, chưa có thì thêm", en: "Overwrite if present, add if not" }
    sql: |-
      INSERT INTO store_targets (store_id, month, target_vnd)
      VALUES (5, '2026-06-01', 8000000), (5, '2026-12-01', 9500000)
      ON CONFLICT (store_id, month)
      DO UPDATE SET target_vnd = EXCLUDED.target_vnd
      RETURNING store_id, month, target_vnd
    read:
      vi: "2 dòng: tháng 6 của cửa hàng 5 chưa có nên được thêm; tháng 12 đã có (9 triệu) nên được sửa thành 9,5 triệu. `EXCLUDED.target_vnd` là số trong dòng đề nghị."
      en: "2 rows: store 5's June is missing, so it is added; December exists (9 million), so it is updated to 9.5 million. `EXCLUDED.target_vnd` is the number in the proposed row."
  - title: { vi: "Chỉ sửa khi số mới lớn hơn", en: "Updating only when the new number is bigger" }
    sql: |-
      INSERT INTO store_targets (store_id, month, target_vnd)
      VALUES (1, '2026-12-01', 8000000), (3, '2026-12-01', 18000000)
      ON CONFLICT (store_id, month)
      DO UPDATE SET target_vnd = EXCLUDED.target_vnd
      WHERE EXCLUDED.target_vnd > store_targets.target_vnd
      RETURNING store_id, target_vnd
    read:
      vi: "1 dòng: cửa hàng 3 lên 18 triệu. Cửa hàng 1 đang có 10 triệu, số đề nghị 8 triệu không lớn hơn nên dòng giữ nguyên và không có trong `RETURNING`. `store_targets.target_vnd` là giá trị cũ."
      en: "1 row: store 3 goes up to 18 million. Store 1 has 10 million; the proposed 8 million is not bigger, so the row stays and is not in `RETURNING`. `store_targets.target_vnd` is the old value."
  - title: { vi: "Không có khóa duy nhất: MERGE", en: "No unique key: MERGE" }
    sql: |-
      MERGE INTO products p
      USING (VALUES ('Gel pen', 'Stationery', 9000),
                    ('Glue stick', 'Stationery', 12000)) AS v (name, category, price_vnd)
      ON p.name = v.name
      WHEN MATCHED THEN UPDATE SET price_vnd = v.price_vnd
      WHEN NOT MATCHED THEN INSERT (name, category, price_vnd) VALUES (v.name, v.category, v.price_vnd)
      RETURNING merge_action(), p.name, p.price_vnd
    read:
      vi: "2 dòng: `Gel pen` khớp theo tên nên được sửa (UPDATE), `Glue stick` chưa có nên được thêm (INSERT). Cột `name` không có ràng buộc duy nhất, nên `ON CONFLICT (name)` không dùng được; `MERGE` so khớp bằng điều kiện bạn tự viết."
      en: "2 rows: `Gel pen` matches by name and is updated (UPDATE), `Glue stick` is new and is inserted (INSERT). The `name` column has no unique constraint, so `ON CONFLICT (name)` cannot be used; `MERGE` matches on a condition you write."
pitfalls:
  - title: { vi: "Đích xung đột không khớp ràng buộc nào", en: "A conflict target that matches no constraint" }
    wrong: "INSERT INTO store_targets (store_id, month, target_vnd) VALUES (5, '2026-06-01', 8000000) ON CONFLICT (month) DO UPDATE SET target_vnd = EXCLUDED.target_vnd RETURNING store_id, month, target_vnd"
    fix: "INSERT INTO store_targets (store_id, month, target_vnd) VALUES (5, '2026-06-01', 8000000) ON CONFLICT (store_id, month) DO UPDATE SET target_vnd = EXCLUDED.target_vnd RETURNING store_id, month, target_vnd"
    why:
      vi: "Khóa chính là hai cột `(store_id, month)`; không ràng buộc nào chỉ trên `month`, nên Postgres báo 42P10 ngay lúc lập kế hoạch. Đích phải nêu đúng các cột của một ràng buộc duy nhất có thật."
      en: "The primary key is the two columns `(store_id, month)`; no constraint is on `month` alone, so Postgres raises 42P10 while planning. The target must name exactly the columns of a real unique constraint."
  - title: { vi: "Một khóa hai lần trong cùng một câu", en: "The same key twice in one statement" }
    wrong: "INSERT INTO store_targets (store_id, month, target_vnd) VALUES (2, '2026-12-01', 6000000), (2, '2026-12-01', 7000000) ON CONFLICT (store_id, month) DO UPDATE SET target_vnd = EXCLUDED.target_vnd RETURNING store_id, target_vnd"
    fix: "INSERT INTO store_targets (store_id, month, target_vnd) VALUES (2, '2026-12-01', 7000000) ON CONFLICT (store_id, month) DO UPDATE SET target_vnd = EXCLUDED.target_vnd RETURNING store_id, target_vnd"
    why:
      vi: "Hai dòng đề nghị cùng `(2, 2026-12-01)`: dòng sau sẽ sửa lại dòng mà chính câu này vừa sửa, nên Postgres báo 21000 thay vì đoán bạn muốn số nào. Gộp nguồn để mỗi khóa chỉ còn một dòng trước khi upsert."
      en: "Two proposed rows share `(2, 2026-12-01)`: the second would update the row this very statement just updated, so Postgres raises 21000 instead of guessing which number you meant. Reduce the source to one row per key before the upsert."
  - title: { vi: "DO NOTHING không đích trên bảng chỉ có id tự sinh", en: "DO NOTHING with no target on a table keyed by a generated id" }
    wrong: "INSERT INTO products (name, category, price_vnd) VALUES ('Gel pen', 'Stationery', 9000) ON CONFLICT DO NOTHING RETURNING name, price_vnd"
    fix: "MERGE INTO products p USING (VALUES ('Gel pen', 'Stationery', 9000)) AS v (name, category, price_vnd) ON p.name = v.name WHEN MATCHED THEN UPDATE SET price_vnd = v.price_vnd WHEN NOT MATCHED THEN INSERT (name, category, price_vnd) VALUES (v.name, v.category, v.price_vnd) RETURNING merge_action(), p.name, p.price_vnd"
    why:
      vi: "Câu sai chạy êm và trả `Gel pen`, nhưng đó là dòng thứ hai: ràng buộc duy nhất duy nhất là `id`, vừa tự sinh nên không bao giờ đụng, và giá cũ vẫn nằm ở dòng đầu. `MERGE` cho thấy nó đã sửa (UPDATE) dòng có sẵn."
      en: "The wrong query runs fine and returns `Gel pen`, but that is a second row: the only unique constraint is `id`, freshly generated so it never clashes, and the old price is still on the first row. `MERGE` shows it updated (UPDATE) the existing row."
quiz:
  - q:
      vi: "Bảng `products` không có ràng buộc duy nhất trên `name`. `INSERT … ON CONFLICT (name) DO NOTHING` làm gì?"
      en: "The `products` table has no unique constraint on `name`. What does `INSERT … ON CONFLICT (name) DO NOTHING` do?"
    options:
      - { vi: "Bỏ qua dòng nếu đã có món cùng tên", en: "Skips the row if an item with that name exists" }
      - { vi: "Báo lỗi 42P10: không có ràng buộc nào khớp đích `(name)`", en: "Fails with 42P10: no constraint matches the `(name)` target" }
      - { vi: "Luôn thêm dòng, như không có `ON CONFLICT`", en: "Always adds the row, as if there were no `ON CONFLICT`" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như `ON CONFLICT (name)` tự kiểm tra trùng tên. Thật ra nó chỉ dựa vào một ràng buộc duy nhất có thật để phát hiện xung đột; không có ràng buộc thì câu không chạy. Thêm `UNIQUE (name)` nếu tên thật sự là khóa, hoặc dùng `MERGE`."
      en: "It sounds like `ON CONFLICT (name)` checks for duplicate names itself. In fact it relies on a real unique constraint to detect a clash; with no constraint the statement does not run. Add `UNIQUE (name)` if the name really is a key, or use `MERGE`."
  - q:
      vi: "Trong `DO UPDATE SET target_vnd = store_targets.target_vnd + EXCLUDED.target_vnd`, hai giá trị là gì?"
      en: "In `DO UPDATE SET target_vnd = store_targets.target_vnd + EXCLUDED.target_vnd`, what are the two values?"
    options:
      - { vi: "Cả hai đều là giá trị mới vừa đề nghị", en: "Both are the newly proposed value" }
      - { vi: "`store_targets.target_vnd` là giá trị cũ trong bảng, `EXCLUDED.target_vnd` là giá trị đề nghị", en: "`store_targets.target_vnd` is the old value in the table, `EXCLUDED.target_vnd` is the proposed value" }
      - { vi: "`EXCLUDED.target_vnd` là giá trị cũ đã bị loại", en: "`EXCLUDED.target_vnd` is the old value that was thrown out" }
    answer: 1
    trap: 2
    why:
      vi: "\"Excluded\" nghe như giá trị cũ bị loại, nhưng ngược lại: đó là dòng bạn đề nghị mà bị từ chối vì đụng khóa. Tên bảng (hay bí danh) chỉ dòng đang nằm trong bảng. Cộng hai số là kiểu \"tích lũy\"."
      en: "\"Excluded\" sounds like the old value thrown out, but it is the other way round: it is the row you proposed, rejected because it hit the key. The table name (or alias) means the row already in the table. Adding the two is the \"accumulate\" pattern."
recap:
  - vi: "`ON CONFLICT … DO NOTHING` bỏ qua, `DO UPDATE SET … = EXCLUDED.…` ghi đè; đích phải khớp một ràng buộc duy nhất."
    en: "`ON CONFLICT … DO NOTHING` skips, `DO UPDATE SET … = EXCLUDED.…` overwrites; the target must match a unique constraint."
  - vi: "`EXCLUDED` là dòng đề nghị, tên bảng là dòng cũ; `DO UPDATE … WHERE` chỉ sửa khi cần."
    en: "`EXCLUDED` is the proposed row, the table name is the old row; `DO UPDATE … WHERE` updates only when needed."
  - vi: "Không có khóa duy nhất phù hợp: dùng `MERGE`, và mỗi khóa chỉ một dòng trong nguồn."
    en: "No suitable unique key: use `MERGE`, and keep one source row per key."
sources:
  - https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT
  - https://www.postgresql.org/docs/current/sql-merge.html
  - https://www.postgresql.org/docs/current/dml-returning.html
---
## Mở bài

Kế toán gửi bảng chỉ tiêu mới: có tháng đã nằm trong bảng, có tháng chưa. Chạy `INSERT` thì đụng khóa chính, chạy `UPDATE` thì bỏ sót tháng mới. Cần một câu làm cả hai.

## Ý chính

Upsert là "thêm, nếu đã có thì sửa". Ở Postgres, `INSERT … ON CONFLICT` kèm các cột khóa thử thêm; dòng nào đụng ràng buộc duy nhất nêu trong ngoặc thì rẽ sang `DO NOTHING` (bỏ qua) hoặc `DO UPDATE` (sửa dòng đang có). Trong `DO UPDATE`, `EXCLUDED` là dòng bạn đề nghị, còn tên bảng là dòng cũ.

Nhiều người nghĩ **`ON CONFLICT` tự tìm dòng trùng theo các cột bạn nêu**. Thật ra nó cần một ràng buộc duy nhất có thật đúng trên các cột ấy; không có thì báo lỗi, còn bỏ trống đích thì chỉ canh các ràng buộc đang có (thường là `id` tự sinh, không bao giờ đụng). Khi không có khóa phù hợp, `MERGE` so khớp theo điều kiện bạn viết.

Hình cuối mục này đi theo ví dụ thứ hai: tháng 6 của cửa hàng 5 chưa có nên được thêm, tháng 12 đã có nên được sửa từ 9 lên 9,5 triệu.

## Cú pháp

`MERGE` có từ PostgreSQL 15; `RETURNING` cùng `merge_action()` có từ PostgreSQL 17.

# EN

## Opening

Accounting sends a new target sheet: some months are already in the table, some are not. An `INSERT` hits the primary key, an `UPDATE` misses the new months. You need one statement that does both.

## Key idea

An upsert is "insert, and if it is already there, update". In Postgres, `INSERT … ON CONFLICT` with the key columns tries to insert; a row that hits the unique constraint named in brackets turns to `DO NOTHING` (skip) or `DO UPDATE` (change the existing row). Inside `DO UPDATE`, `EXCLUDED` is the row you proposed and the table name is the old row.

Many people think **`ON CONFLICT` looks for duplicates on the columns you name by itself**. In fact it needs a real unique constraint on exactly those columns; without one it fails, and with no target it only watches the constraints that exist (often a generated `id`, which never clashes). When no suitable key exists, `MERGE` matches on a condition you write.

The figure at the end of this section follows the second example: store 5's June is missing, so it is added; December exists, so it goes from 9 to 9.5 million.

## Syntax

`MERGE` exists since PostgreSQL 15; `RETURNING` with `merge_action()` since PostgreSQL 17.
