---
id: e-pg-l1-16
engine: postgres
level: L1
module: write
title: Upsert và MERGE
title_en: Upsert and MERGE
kind: lab
runtime: browser
minutes: 15
figures: [{ name: sql-upsert-flow, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Thêm-hoặc-sửa một dòng theo khóa bằng `INSERT ... ON CONFLICT`, dùng `EXCLUDED`, `DO NOTHING` và `DO UPDATE ... WHERE`.
    en: Insert-or-update a row by key with `INSERT ... ON CONFLICT`, using `EXCLUDED`, `DO NOTHING` and `DO UPDATE ... WHERE`.
  - vi: Giải thích vì sao đích xung đột cần một index hay ràng buộc duy nhất, và vì sao một câu không được đụng một dòng hai lần.
    en: Explain why the conflict target needs a unique index or constraint, and why one statement may not touch a row twice.
  - vi: Đồng bộ một bảng từ bảng nguồn bằng `MERGE` và đọc `merge_action()` trong `RETURNING`; biết khi nào chọn cách nào.
    en: Sync a table from a source with `MERGE` and read `merge_action()` in `RETURNING`; know when to pick which.
requires: [e-pg-l1-15]
sources:
  - { url: https://www.postgresql.org/docs/18/sql-insert.html, title_vi: "INSERT" }
  - { url: https://www.postgresql.org/docs/18/sql-merge.html, title_vi: "MERGE" }
  - { url: https://www.postgresql.org/docs/18/dml-returning.html, title_vi: "Lấy lại dữ liệu từ dòng vừa ghi (RETURNING)" }
lab:
  setup: |
    CREATE TABLE stock (sku text PRIMARY KEY, qty int NOT NULL CHECK (qty >= 0), updated_on date NOT NULL);
    INSERT INTO stock VALUES ('A1', 10, '2026-11-01'), ('B2', 4, '2026-11-01'), ('C3', 0, '2026-10-15');
    CREATE TABLE delivery (sku text PRIMARY KEY, qty int NOT NULL CHECK (qty > 0), arrived_on date NOT NULL);
    INSERT INTO delivery VALUES ('A1', 5, '2026-11-20'), ('D4', 7, '2026-11-20');
    CREATE TABLE prices (sku text PRIMARY KEY, price numeric(10,2) NOT NULL, valid_from date NOT NULL);
    INSERT INTO prices VALUES ('A1', 2.00, '2026-11-01'), ('B2', 8.00, '2026-11-01');
    CREATE TABLE count_sheet (sku text PRIMARY KEY, counted int NOT NULL);
    INSERT INTO count_sheet VALUES ('A1', 14), ('B2', 10), ('E5', 3);
    CREATE TABLE suppliers (id int PRIMARY KEY, email text NOT NULL, name text NOT NULL);
    CREATE INDEX suppliers_email_idx ON suppliers (email);
    INSERT INTO suppliers VALUES (1, 'sales@north.example', 'North Paper'), (2, 'hi@inkworks.example', 'Inkworks');
  steps:
    - task:
        vi: "Hàng về: 6 cái `B2` ngày 2026-11-24. Bằng một câu, thêm dòng nếu chưa có, nếu có rồi thì cộng vào số tồn và đổi ngày cập nhật. Trả về `sku, qty, updated_on`."
        en: "Goods in: 6 units of `B2` on 2026-11-24. In one statement, insert the row if it is missing, otherwise add to the stock and change the update date. Return `sku, qty, updated_on`."
      solution: INSERT INTO stock (sku, qty, updated_on) VALUES ('B2', 6, '2026-11-24') ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty, updated_on = EXCLUDED.updated_on RETURNING sku, qty, updated_on
      check: rows
      hint:
        vi: "`ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty, ...`: `stock.qty` là dòng đang có, `EXCLUDED.qty` là dòng bạn định thêm."
        en: "`ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty, ...`: `stock.qty` is the row already there, `EXCLUDED.qty` the row you tried to insert."
    - task:
        vi: "Nhập cả phiếu `delivery` vào `stock` theo cùng luật (cộng số lượng, ngày cập nhật = `arrived_on`). Trả về `sku, qty`."
        en: "Book the whole `delivery` sheet into `stock` with the same rule (add the quantity, update date = `arrived_on`). Return `sku, qty`."
      solution: INSERT INTO stock (sku, qty, updated_on) SELECT sku, qty, arrived_on FROM delivery ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty, updated_on = EXCLUDED.updated_on RETURNING sku, qty
      check: rows
      hint:
        vi: "`INSERT ... SELECT` cũng nhận `ON CONFLICT`."
        en: "`INSERT ... SELECT` takes `ON CONFLICT` too."
    - task:
        vi: "Ghi hai giá: `A1` 2.50 từ 2026-11-20 và `B2` 9.00 từ 2026-10-01. Một giá chỉ được thay giá đang có khi ngày hiệu lực của nó mới hơn."
        en: "Write two prices: `A1` 2.50 from 2026-11-20 and `B2` 9.00 from 2026-10-01. A price may replace the current one only when its start date is later."
      solution: INSERT INTO prices (sku, price, valid_from) VALUES ('A1', 2.50, '2026-11-20'), ('B2', 9.00, '2026-10-01') ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, valid_from = EXCLUDED.valid_from WHERE EXCLUDED.valid_from > prices.valid_from
      after: SELECT sku, price, valid_from FROM prices ORDER BY sku
      check: rows
      hint:
        vi: "`DO UPDATE SET ... WHERE EXCLUDED.valid_from > prices.valid_from`: dòng không thỏa `WHERE` được giữ nguyên."
        en: "`DO UPDATE SET ... WHERE EXCLUDED.valid_from > prices.valid_from`: a row that fails the `WHERE` is left as it is."
    - task:
        vi: "Đối chiếu kiểm kê `count_sheet` vào `stock` bằng `MERGE`: mã khớp mà số khác thì sửa `qty` và đặt ngày 2026-11-24; mã chưa có thì thêm (ngày 2026-11-24); mã không có trong phiếu mà tồn 0 thì xóa. Trả về `merge_action()` tên `action`, cùng `sku, qty` của bảng đích."
        en: "Reconcile the stock count `count_sheet` into `stock` with `MERGE`: a matching code with a different count updates `qty` and sets the date 2026-11-24; a missing code is inserted (date 2026-11-24); a code missing from the sheet with stock 0 is deleted. Return `merge_action()` named `action`, plus `sku, qty` of the target table."
      solution: MERGE INTO stock t USING count_sheet c ON t.sku = c.sku WHEN MATCHED AND t.qty <> c.counted THEN UPDATE SET qty = c.counted, updated_on = '2026-11-24' WHEN NOT MATCHED THEN INSERT (sku, qty, updated_on) VALUES (c.sku, c.counted, '2026-11-24') WHEN NOT MATCHED BY SOURCE AND t.qty = 0 THEN DELETE RETURNING merge_action() AS action, t.sku, t.qty
      check: rows
      hint:
        vi: "Ba nhánh `WHEN MATCHED AND ...`, `WHEN NOT MATCHED`, `WHEN NOT MATCHED BY SOURCE AND ...`; trong `RETURNING` ghi `t.sku` vì cả hai bảng đều có `sku`."
        en: "Three branches `WHEN MATCHED AND ...`, `WHEN NOT MATCHED`, `WHEN NOT MATCHED BY SOURCE AND ...`; in `RETURNING` write `t.sku` since both tables have `sku`."
quiz:
  - q:
      vi: "Bảng `suppliers` có index thường (không duy nhất) trên `email`. Câu `INSERT ... ON CONFLICT (email) DO NOTHING` sẽ thế nào?"
      en: "Table `suppliers` has a plain (non-unique) index on `email`. What does `INSERT ... ON CONFLICT (email) DO NOTHING` do?"
    options:
      - { vi: "Chạy được, vì đã có index trên `email`", en: "It works, because `email` already has an index" }
      - { vi: "Báo lỗi `42P10`: cần index hay ràng buộc duy nhất trên đúng cột đó", en: "It fails with `42P10`: it needs a unique index or constraint on exactly that column" }
      - { vi: "Chạy được nhưng thêm cả dòng trùng", en: "It runs but inserts the duplicate too" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chạy được vì đã có index\" nghe hợp lý vì index giúp tìm dòng trùng nhanh, nhưng \"xung đột\" chỉ có nghĩa khi database cấm trùng. `ON CONFLICT (email)` cần một index hay ràng buộc duy nhất trên đúng `email` để biết dòng mới đụng dòng nào; index thường không cấm trùng gì, nên Postgres không tìm được thứ đó và từ chối cả câu với lỗi `42P10`, không thêm dòng nào."
      en: "\"It works, because there is an index\" sounds right because an index finds duplicates quickly, but a \"conflict\" only means something when the database forbids duplicates. `ON CONFLICT (email)` needs a unique index or constraint on exactly `email` to know which row the new one clashes with; a plain index forbids no duplicates, so Postgres finds no such thing and refuses the whole statement with `42P10`, inserting nothing."
  - q:
      vi: "Hai phiên cùng lúc thêm một mã hàng mới chưa có. Câu nào bảo đảm mỗi phiên hoặc thêm hoặc sửa, không bao giờ vấp lỗi trùng khóa?"
      en: "Two sessions add the same new code at the same moment. Which statement guarantees each one either inserts or updates, never hitting a duplicate-key error?"
    options:
      - { vi: "`INSERT ... ON CONFLICT DO UPDATE`", en: "`INSERT ... ON CONFLICT DO UPDATE`" }
      - { vi: "`MERGE ... WHEN NOT MATCHED THEN INSERT`", en: "`MERGE ... WHEN NOT MATCHED THEN INSERT`" }
      - { vi: "Cả hai như nhau", en: "Both, equally" }
    answer: 0
    trap: 2
    why:
      vi: "\"Cả hai như nhau\" nghe hợp lý vì hai câu cho cùng kết quả khi chạy một mình, nhưng `MERGE` quyết định thêm hay sửa từ dữ liệu nó thấy lúc bắt đầu; nếu phiên kia vừa thêm cùng khóa, câu `INSERT` của nó vấp lỗi trùng. `ON CONFLICT` được làm riêng cho trường hợp này: gặp dòng vừa được thêm, nó chuyển sang sửa."
      en: "\"Both, equally\" sounds right because both give the same result when run alone, but `MERGE` decides insert or update from what it sees when it starts; if the other session just inserted the same key, its `INSERT` hits a duplicate error. `ON CONFLICT` is built for this case: when it meets the row just inserted, it switches to the update."
---
## Mở bài

Hàng về kho mỗi ngày: có mã đã có, có mã mới, và phiếu kiểm kê cuối tháng còn báo cả hàng đã hết. Viết `SELECT` rồi mới quyết định `INSERT` hay `UPDATE` vừa dài vừa dễ vấp khi hai người nhập cùng lúc.

## Ý chính

Upsert là "thêm, nếu trùng khóa thì sửa" trong một câu: `INSERT ... ON CONFLICT`. Đích xung đột là cột (hay ràng buộc) mà một dòng trùng sẽ vi phạm. Trong `DO UPDATE`, tên bảng chỉ dòng đang có, còn `EXCLUDED` chỉ dòng bạn định thêm. Thêm `WHERE` sau `SET` để chỉ sửa khi có lý do; `DO NOTHING` thì bỏ qua dòng trùng. `RETURNING` chỉ trả về dòng thật sự được thêm hay sửa.

Nhiều người nghĩ một index bất kỳ trên cột là đủ làm đích xung đột. Thật ra cần một index hay ràng buộc duy nhất trên đúng các cột đó, vì "xung đột" chỉ có khi database cấm trùng. Một câu upsert cũng không được sửa một dòng hai lần: nguồn phải có một dòng cho mỗi khóa.

`MERGE` nối một bảng nguồn với bảng đích rồi chạy nhánh `WHEN` đầu tiên khớp cho từng cặp: `MATCHED` (có ở cả hai), `NOT MATCHED` (chỉ có ở nguồn) và, từ Postgres 17, `NOT MATCHED BY SOURCE` (chỉ có ở đích). `RETURNING merge_action()` cho biết dòng nào bị `INSERT`, `UPDATE` hay `DELETE`.

Chọn cách nào: upsert theo khóa, nhất là khi nhiều phiên ghi cùng lúc, dùng `ON CONFLICT`, vì nó gặp dòng vừa được thêm thì chuyển sang sửa. Đồng bộ cả một bảng, có cả xóa, dùng `MERGE`, và chấp nhận rằng `MERGE` có thể vấp lỗi trùng khóa nếu phiên khác thêm cùng khóa cùng lúc.

Hình cuối mục này vẽ `ON CONFLICT` quyết định từng dòng: dòng chưa có khóa thì thêm, dòng đã có thì sửa, hoặc bỏ qua với `DO NOTHING`.

## Cú pháp

```sql
INSERT INTO table [ ( column [, ...] ) ] { VALUES ( ... ) | query }
  ON CONFLICT [ ( column [, ...] ) | ON CONSTRAINT constraint_name ]
  { DO NOTHING | DO UPDATE SET column = expression [, ...] [ WHERE condition ] }
  [ RETURNING output [, ...] ];
MERGE INTO target [ alias ] USING source [ alias ] ON join_condition
  WHEN MATCHED [ AND condition ] THEN { UPDATE SET ... | DELETE | DO NOTHING }
  WHEN NOT MATCHED [ BY TARGET ] [ AND condition ] THEN { INSERT ( ... ) VALUES ( ... ) | DO NOTHING }
  WHEN NOT MATCHED BY SOURCE [ AND condition ] THEN { UPDATE SET ... | DELETE | DO NOTHING }
  [ RETURNING merge_action(), output [, ...] ];
```

- `EXCLUDED`: dòng định thêm mà bị xung đột.
- `ON CONSTRAINT`: gọi tên ràng buộc thay cho danh sách cột.
- `DO UPDATE ... WHERE`: dòng không thỏa điều kiện được giữ nguyên.
- `merge_action()`: `INSERT`, `UPDATE` hay `DELETE` cho từng dòng trả về.

## Ví dụ

`DO NOTHING`: `A1` đã có nên bị bỏ qua, `RETURNING` chỉ trả về `F6`:

```sql
INSERT INTO stock (sku, qty, updated_on)
VALUES ('A1', 99, '2026-11-24'), ('F6', 2, '2026-11-24')
ON CONFLICT (sku) DO NOTHING
RETURNING sku, qty;
```

`DO UPDATE` cộng dồn; `old.qty` rỗng (NULL) cho biết dòng vừa được thêm:

```sql
INSERT INTO stock (sku, qty, updated_on)
VALUES ('A1', 1, '2026-11-24'), ('G7', 5, '2026-11-24')
ON CONFLICT (sku) DO UPDATE
  SET qty = stock.qty + EXCLUDED.qty, updated_on = EXCLUDED.updated_on
RETURNING sku, old.qty AS qty_before, new.qty AS qty_after;
```

`MERGE` từ một danh sách giá:

```sql
MERGE INTO prices p
USING (VALUES ('A1', 2.20), ('H8', 1.00)) AS v (sku, price) ON p.sku = v.sku
WHEN MATCHED THEN UPDATE SET price = v.price
WHEN NOT MATCHED THEN INSERT (sku, price, valid_from) VALUES (v.sku, v.price, '2026-11-24')
RETURNING merge_action() AS action, p.sku, p.price;
```

`A1` đi từ 10 lên 11; `G7` có `qty_before` rỗng. Câu `MERGE` trả về một dòng `UPDATE` cho `A1` và một dòng `INSERT` cho `H8`.

## Lỗi hay gặp

Đích xung đột chỉ có index thường:

```sql
-- ERROR 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
INSERT INTO suppliers (id, email, name) VALUES (3, 'sales@north.example', 'North Paper Co')
ON CONFLICT (email) DO NOTHING;
```

```sql
CREATE UNIQUE INDEX suppliers_email_key ON suppliers (email);
INSERT INTO suppliers (id, email, name) VALUES (3, 'sales@north.example', 'North Paper Co')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id, email, name;
```

Có index duy nhất rồi, dòng trùng `email` sửa tên của nhà cung cấp 1 thay vì thêm nhà cung cấp 3.

Nguồn có hai dòng cùng khóa:

```sql
-- ERROR 21000: ON CONFLICT DO UPDATE command cannot affect row a second time
INSERT INTO stock (sku, qty, updated_on)
VALUES ('B2', 1, '2026-11-24'), ('B2', 2, '2026-11-24')
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty;
```

```sql
INSERT INTO stock (sku, qty, updated_on)
SELECT sku, sum(qty), date '2026-11-24'
FROM (VALUES ('B2', 1), ('B2', 2)) AS v (sku, qty) GROUP BY sku
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty
RETURNING sku, qty;
```

Gộp nguồn về một dòng cho mỗi khóa bằng `GROUP BY` trước khi upsert. `MERGE` cũng báo `21000` trong trường hợp này.

Ghi đè thay vì cộng dồn:

```sql
-- WRONG: EXCLUDED.qty replaces the stock instead of adding to it
BEGIN;
INSERT INTO stock (sku, qty, updated_on) VALUES ('A1', 5, '2026-11-24')
ON CONFLICT (sku) DO UPDATE SET qty = EXCLUDED.qty
RETURNING sku, qty;
ROLLBACK;
```

```sql
-- FIX: add to the row already in the table
INSERT INTO stock (sku, qty, updated_on) VALUES ('A1', 5, '2026-11-24')
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty
RETURNING sku, qty;
```

`EXCLUDED.qty` chỉ là 5 cái vừa về; tồn cũ nằm ở `stock.qty`. Câu sai làm mất 11 cái đang có.

## Thực hành

Bốn bước trên kho: upsert một lần nhập hàng, upsert cả một phiếu giao, ghi giá chỉ khi mới hơn, rồi đối chiếu kiểm kê bằng `MERGE`. Sau đó là hai câu hỏi.

## Tóm tắt

- `INSERT ... ON CONFLICT` thêm hoặc sửa theo khóa trong một câu; `EXCLUDED` là dòng định thêm.
- Đích xung đột cần index hay ràng buộc duy nhất trên đúng các cột, nếu không là lỗi `42P10`.
- Một câu không được đụng một dòng hai lần (`21000`): gộp nguồn theo khóa trước.
- `MERGE` đồng bộ cả bảng với `MATCHED`, `NOT MATCHED` và `NOT MATCHED BY SOURCE`; `merge_action()` cho biết việc đã làm.
- Nhiều phiên cùng upsert theo khóa: chọn `ON CONFLICT`.

# EN

## Opening

Goods reach the warehouse every day: some codes exist, some are new, and the month-end stock count also reports items that ran out. Writing a `SELECT` and then deciding between `INSERT` and `UPDATE` is long and breaks when two people book goods at the same time.

## Key idea

An upsert is "insert, and if the key exists, update" in one statement: `INSERT ... ON CONFLICT`. The conflict target is the column (or constraint) a duplicate row would violate. Inside `DO UPDATE`, the table name means the row already there and `EXCLUDED` means the row you tried to insert. Add a `WHERE` after `SET` to update only when there is a reason; `DO NOTHING` skips the duplicate. `RETURNING` returns only the rows really inserted or updated.

Many people think any index on the column is enough for a conflict target. In fact it needs a unique index or constraint on exactly those columns, because a "conflict" only exists when the database forbids duplicates. An upsert may also not update one row twice: the source must have one row per key.

`MERGE` joins a source to the target and runs the first matching `WHEN` branch for each pair: `MATCHED` (in both), `NOT MATCHED` (only in the source) and, since Postgres 17, `NOT MATCHED BY SOURCE` (only in the target). `RETURNING merge_action()` tells which rows got an `INSERT`, `UPDATE` or `DELETE`.

Which to pick: for an upsert by key, above all when several sessions write at once, use `ON CONFLICT`, because when it meets a row that was just inserted it switches to the update. To sync a whole table, deletes included, use `MERGE`, and accept that `MERGE` can hit a duplicate-key error when another session inserts the same key at the same time.

The figure at the end of this section draws `ON CONFLICT` deciding row by row: a row whose key is missing is inserted, one whose key exists is updated, or skipped with `DO NOTHING`.

## Syntax

```sql
INSERT INTO table [ ( column [, ...] ) ] { VALUES ( ... ) | query }
  ON CONFLICT [ ( column [, ...] ) | ON CONSTRAINT constraint_name ]
  { DO NOTHING | DO UPDATE SET column = expression [, ...] [ WHERE condition ] }
  [ RETURNING output [, ...] ];
MERGE INTO target [ alias ] USING source [ alias ] ON join_condition
  WHEN MATCHED [ AND condition ] THEN { UPDATE SET ... | DELETE | DO NOTHING }
  WHEN NOT MATCHED [ BY TARGET ] [ AND condition ] THEN { INSERT ( ... ) VALUES ( ... ) | DO NOTHING }
  WHEN NOT MATCHED BY SOURCE [ AND condition ] THEN { UPDATE SET ... | DELETE | DO NOTHING }
  [ RETURNING merge_action(), output [, ...] ];
```

- `EXCLUDED`: the row you tried to insert that hit the conflict.
- `ON CONSTRAINT`: names the constraint instead of listing columns.
- `DO UPDATE ... WHERE`: a row that fails the condition is left as it is.
- `merge_action()`: `INSERT`, `UPDATE` or `DELETE` for each returned row.

## Example

`DO NOTHING`: `A1` exists so it is skipped, and `RETURNING` returns only `F6`:

```sql
INSERT INTO stock (sku, qty, updated_on)
VALUES ('A1', 99, '2026-11-24'), ('F6', 2, '2026-11-24')
ON CONFLICT (sku) DO NOTHING
RETURNING sku, qty;
```

`DO UPDATE` adds up; an empty `old.qty` (NULL) tells you the row was just inserted:

```sql
INSERT INTO stock (sku, qty, updated_on)
VALUES ('A1', 1, '2026-11-24'), ('G7', 5, '2026-11-24')
ON CONFLICT (sku) DO UPDATE
  SET qty = stock.qty + EXCLUDED.qty, updated_on = EXCLUDED.updated_on
RETURNING sku, old.qty AS qty_before, new.qty AS qty_after;
```

`MERGE` from a price list:

```sql
MERGE INTO prices p
USING (VALUES ('A1', 2.20), ('H8', 1.00)) AS v (sku, price) ON p.sku = v.sku
WHEN MATCHED THEN UPDATE SET price = v.price
WHEN NOT MATCHED THEN INSERT (sku, price, valid_from) VALUES (v.sku, v.price, '2026-11-24')
RETURNING merge_action() AS action, p.sku, p.price;
```

`A1` goes from 10 to 11; `G7` has an empty `qty_before`. The `MERGE` returns one `UPDATE` row for `A1` and one `INSERT` row for `H8`.

## Common mistakes

A conflict target with only a plain index:

```sql
-- ERROR 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
INSERT INTO suppliers (id, email, name) VALUES (3, 'sales@north.example', 'North Paper Co')
ON CONFLICT (email) DO NOTHING;
```

```sql
CREATE UNIQUE INDEX suppliers_email_key ON suppliers (email);
INSERT INTO suppliers (id, email, name) VALUES (3, 'sales@north.example', 'North Paper Co')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id, email, name;
```

With the unique index in place, the duplicate `email` renames supplier 1 instead of adding supplier 3.

A source with two rows for one key:

```sql
-- ERROR 21000: ON CONFLICT DO UPDATE command cannot affect row a second time
INSERT INTO stock (sku, qty, updated_on)
VALUES ('B2', 1, '2026-11-24'), ('B2', 2, '2026-11-24')
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty;
```

```sql
INSERT INTO stock (sku, qty, updated_on)
SELECT sku, sum(qty), date '2026-11-24'
FROM (VALUES ('B2', 1), ('B2', 2)) AS v (sku, qty) GROUP BY sku
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty
RETURNING sku, qty;
```

Reduce the source to one row per key with `GROUP BY` before the upsert. `MERGE` also fails with `21000` in this case.

Overwriting instead of adding up:

```sql
-- WRONG: EXCLUDED.qty replaces the stock instead of adding to it
BEGIN;
INSERT INTO stock (sku, qty, updated_on) VALUES ('A1', 5, '2026-11-24')
ON CONFLICT (sku) DO UPDATE SET qty = EXCLUDED.qty
RETURNING sku, qty;
ROLLBACK;
```

```sql
-- FIX: add to the row already in the table
INSERT INTO stock (sku, qty, updated_on) VALUES ('A1', 5, '2026-11-24')
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty
RETURNING sku, qty;
```

`EXCLUDED.qty` is only the 5 units that just arrived; the old stock is in `stock.qty`. The wrong version loses the 11 units on hand.

## Practice

Four steps on the warehouse: upsert one goods-in, upsert a whole delivery sheet, write prices only when newer, then reconcile the stock count with `MERGE`. Then two questions.

## Recap

- `INSERT ... ON CONFLICT` inserts or updates by key in one statement; `EXCLUDED` is the row you tried to insert.
- The conflict target needs a unique index or constraint on exactly those columns, otherwise error `42P10`.
- One statement may not touch a row twice (`21000`): group the source by key first.
- `MERGE` syncs a whole table with `MATCHED`, `NOT MATCHED` and `NOT MATCHED BY SOURCE`; `merge_action()` tells what it did.
- Several sessions upserting by key: pick `ON CONFLICT`.
