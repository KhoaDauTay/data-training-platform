---
id: e-pg-l1-04
engine: postgres
level: L1
module: constraints
title: Ràng buộc và khóa
title_en: Constraints and keys
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Thêm `CHECK`, khóa ngoại và `UNIQUE` vào bảng đã có dữ liệu, để database tự chặn dữ liệu sai.
    en: Add `CHECK`, foreign key and `UNIQUE` constraints to a table that already holds data, so the database itself rejects bad data.
  - vi: Biết `UNIQUE` mặc định cho phép nhiều NULL, và `NULLS NOT DISTINCT` đổi điều đó.
    en: Know that `UNIQUE` allows several NULLs by default, and that `NULLS NOT DISTINCT` changes this.
  - vi: Chọn hành vi khi xóa dòng cha (`ON DELETE CASCADE` hay chặn) và đọc ràng buộc từ `pg_constraint`.
    en: Choose what happens when a parent row is deleted (`ON DELETE CASCADE` or block) and read constraints from `pg_constraint`.
requires: [e-pg-l1-03]
figures: [{ name: pg-constraint-gates, at: idea }]
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/catalog-pg-constraint.html
  - https://www.postgresql.org/docs/18/release-18.html
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, email text);
    INSERT INTO customers VALUES (1, 'an@example.com'), (2, 'binh@example.com'), (3, NULL);
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL, qty int NOT NULL);
    INSERT INTO orders VALUES (10, 1, 2), (11, 1, 1), (12, 2, 5), (13, 3, 1);
  steps:
    - task:
        vi: Thêm ràng buộc tên `orders_qty_positive` bắt `qty` của `orders` phải lớn hơn 0.
        en: Add a constraint named `orders_qty_positive` requiring `qty` in `orders` to be greater than 0.
      solution: ALTER TABLE orders ADD CONSTRAINT orders_qty_positive CHECK (qty > 0)
      check: catalog
      hint:
        vi: "`ALTER TABLE table ADD CONSTRAINT name CHECK (condition)`."
        en: "`ALTER TABLE table ADD CONSTRAINT name CHECK (condition)`."
    - task:
        vi: Thêm khóa ngoại tên `orders_customer_fk` để `orders.customer_id` phải trỏ tới một `customers.id` có thật.
        en: Add a foreign key named `orders_customer_fk` so that `orders.customer_id` must point to an existing `customers.id`.
      solution: ALTER TABLE orders ADD CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id)
      check: catalog
      hint:
        vi: "`... ADD CONSTRAINT name FOREIGN KEY (col) REFERENCES parent (col)`."
        en: "`... ADD CONSTRAINT name FOREIGN KEY (col) REFERENCES parent (col)`."
    - task:
        vi: Thêm ràng buộc tên `customers_email_key` để `email` không trùng, và chỉ cho phép tối đa một khách không có email.
        en: Add a constraint named `customers_email_key` so `email` is never duplicated and at most one customer may have no email.
      solution: ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE NULLS NOT DISTINCT (email)
      check: catalog
      hint:
        vi: "`UNIQUE` thường coi mọi NULL là khác nhau. Thêm `NULLS NOT DISTINCT` ngay sau `UNIQUE`."
        en: "Plain `UNIQUE` treats every NULL as different. Add `NULLS NOT DISTINCT` right after `UNIQUE`."
    - task:
        vi: Liệt kê tên và loại (`contype`) của mọi ràng buộc trên bảng `orders`, sắp theo tên.
        en: List the name and type (`contype`) of every constraint on table `orders`, ordered by name.
      solution: SELECT conname, contype FROM pg_constraint WHERE conrelid = 'orders'::regclass ORDER BY conname
      check: rows
      ordered: true
      hint:
        vi: "Bảng catalog `pg_constraint`, lọc `conrelid = 'orders'::regclass`."
        en: "Catalog table `pg_constraint`, filter `conrelid = 'orders'::regclass`."
quiz:
  - q:
      vi: "Cột `email` có ràng buộc `UNIQUE` thường. Hai khách cùng không có email (NULL) thì sao?"
      en: "Column `email` has a plain `UNIQUE` constraint. What happens when two customers both have no email (NULL)?"
    options:
      - { vi: "Bị từ chối: `UNIQUE` cấm mọi giá trị trùng, kể cả NULL", en: "Rejected: `UNIQUE` forbids every duplicate, NULL included" }
      - { vi: "Được nhận: mặc định hai NULL được coi là khác nhau", en: "Accepted: by default two NULLs count as different" }
      - { vi: "NULL thứ hai bị đổi thành chuỗi rỗng", en: "The second NULL is turned into an empty string" }
    answer: 1
    trap: 0
    why:
      vi: "\"Bị từ chối\" nghe hợp lý vì hai NULL trông giống hệt nhau, nhưng NULL nghĩa là \"không biết\", và hai giá trị không biết không được coi là bằng nhau. Vì thế `UNIQUE` thường không thấy hai NULL là trùng và nhận bao nhiêu NULL cũng được; Postgres cũng không bao giờ tự đổi NULL thành chuỗi rỗng. Muốn chỉ cho một NULL thì viết `UNIQUE NULLS NOT DISTINCT` (từ Postgres 15), như bước 3 của lab."
      en: "\"Rejected\" sounds right because two NULLs look identical, but NULL means \"unknown\", and two unknowns are not treated as equal. So a plain `UNIQUE` does not see two NULLs as duplicates and accepts any number of them; Postgres never turns a NULL into an empty string either. To allow only one NULL, write `UNIQUE NULLS NOT DISTINCT` (since Postgres 15), as in step 3 of the lab."
  - q:
      vi: "Bảng đã có một dòng `qty = 0`. Bạn chạy `ALTER TABLE ... ADD CHECK (qty > 0)`. Chuyện gì xảy ra?"
      en: "The table already has a row with `qty = 0`. You run `ALTER TABLE ... ADD CHECK (qty > 0)`. What happens?"
    options:
      - { vi: "Ràng buộc được thêm và chỉ áp cho dòng ghi sau này", en: "The constraint is added and applies only to rows written later" }
      - { vi: "Cả lệnh thất bại, không có ràng buộc nào được thêm", en: "The whole command fails, no constraint is added" }
      - { vi: "Dòng vi phạm bị xóa", en: "The violating row is deleted" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chỉ áp cho dòng sau này\" nghe hợp lý vì luật mới thường có hiệu lực từ nay về sau, nhưng `ADD CONSTRAINT` kiểm mọi dòng hiện có trước khi thêm. Dòng `qty = 0` vi phạm, nên cả lệnh lỗi với mã 23514 (vi phạm `CHECK`) và không có ràng buộc nào được thêm. Postgres không bao giờ tự xóa dữ liệu của bạn. Muốn bỏ qua dòng cũ thì thêm `NOT VALID`, sửa dữ liệu, rồi `VALIDATE CONSTRAINT`."
      en: "\"Only rows written later\" sounds right because a new rule usually applies from now on, but `ADD CONSTRAINT` checks every existing row before adding. The `qty = 0` row breaks it, so the whole command fails with code 23514 (a `CHECK` violation) and no constraint is added. Postgres never deletes your data on its own. To skip old rows, add `NOT VALID`, fix the data, then `VALIDATE CONSTRAINT`."
---
## Mở bài

Ứng dụng web kiểm số lượng phải lớn hơn 0, nhưng một đoạn script nhập liệu ban đêm thì quên kiểm, và sáng ra kho có đơn số lượng âm. Luật chỉ nằm trong code ứng dụng thì mỗi đường ghi mới lại phải nhớ nó. Bài này đặt luật vào chính database.

## Ý chính

Ràng buộc (constraint) là luật database tự kiểm ở mỗi lần ghi, nên dữ liệu sai không lọt vào dù ứng dụng nào ghi. `NOT NULL` bắt cột phải có giá trị. `CHECK (condition)` bắt điều kiện đúng với mỗi dòng. `UNIQUE` cấm hai dòng trùng và được kiểm bằng một index (chỉ mục) unique. `PRIMARY KEY` là `UNIQUE` cộng `NOT NULL`, mỗi bảng tối đa một. Khóa ngoại (`FOREIGN KEY ... REFERENCES`) bắt giá trị phải có sẵn ở bảng cha.

Nhiều người nghĩ `CHECK (qty > 0)` chặn luôn NULL. Thật ra `CHECK` chỉ từ chối khi điều kiện là false; với NULL, điều kiện ra NULL nên dòng được nhận. Cấm NULL thì thêm `NOT NULL`. Tương tự, `UNIQUE` thường coi hai NULL là khác nhau nên nhận nhiều NULL; từ Postgres 15, `UNIQUE NULLS NOT DISTINCT` chỉ cho một.

Khóa ngoại còn quyết định chuyện gì xảy ra khi xóa dòng cha. Mặc định Postgres chặn việc xóa khi còn dòng con; `ON DELETE CASCADE` xóa luôn các dòng con; `ON DELETE SET NULL` để trống cột tham chiếu. Chọn theo nghĩa nghiệp vụ: xóa giỏ hàng thì xóa món trong giỏ, nhưng xóa khách thì không nên xóa hóa đơn.

`ALTER TABLE ... ADD CONSTRAINT` kiểm mọi dòng đang có; một dòng vi phạm là cả lệnh thất bại. Với `CHECK` và khóa ngoại có thể thêm `NOT VALID` để bỏ qua dòng cũ, sửa dữ liệu, rồi chạy `VALIDATE CONSTRAINT`. Ràng buộc nằm trong catalog `pg_constraint`: `contype` là `c` (check), `f` (khóa ngoại), `p` (khóa chính), `u` (unique), và từ Postgres 18 có thêm `n` cho mỗi `NOT NULL`.

Hình từng bước ở cuối mục này cho ba dòng đi qua các ràng buộc của bảng `stock`, kể cả dòng NULL lọt qua `CHECK`.

## Cú pháp

```sql
ALTER TABLE table_name ADD CONSTRAINT constraint_name
  { CHECK ( condition )
  | UNIQUE [ NULLS NOT DISTINCT ] ( column [, ...] )
  | FOREIGN KEY ( column ) REFERENCES parent ( column )
      [ ON DELETE { NO ACTION | CASCADE | SET NULL } ] }
  [ NOT VALID ];
ALTER TABLE table_name VALIDATE CONSTRAINT constraint_name;
```

- `NULLS NOT DISTINCT`: coi mọi NULL là bằng nhau, nên chỉ một dòng được NULL.
- `ON DELETE CASCADE`: xóa dòng cha thì xóa luôn dòng con; mặc định là chặn.
- `NOT VALID`: chỉ kiểm dòng ghi mới (cho `CHECK` và khóa ngoại); `VALIDATE` kiểm nốt dòng cũ.

## Ví dụ

Ràng buộc của bảng `customers` lúc ban đầu:

```sql
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'customers'::regclass ORDER BY conname;
```

Hai dòng: `customers_id_not_null` loại `n` và `customers_pkey` loại `p`. Ở Postgres 18, khóa chính cũng tạo một ràng buộc `NOT NULL` có tên riêng.

```sql
CREATE TABLE u (code text UNIQUE);
INSERT INTO u VALUES (NULL), (NULL);
SELECT count(*) FROM u;
```

Kết quả là 2: hai NULL cùng nằm trong cột `UNIQUE` thường.

```sql
CREATE TABLE carts (id int PRIMARY KEY);
CREATE TABLE cart_items (id int PRIMARY KEY, cart_id int NOT NULL REFERENCES carts (id) ON DELETE CASCADE);
INSERT INTO carts VALUES (1), (2);
INSERT INTO cart_items VALUES (1, 1), (2, 1), (3, 2);
DELETE FROM carts WHERE id = 1;
SELECT count(*) AS items_left FROM cart_items;
```

Còn 1 món: xóa giỏ 1 kéo theo hai món của nó nhờ `ON DELETE CASCADE`.

## Lỗi hay gặp

Ghi số âm vào cột có `CHECK`:

```sql
CREATE TABLE stock (id int PRIMARY KEY, qty int CHECK (qty >= 0));
-- ERROR 23514: new row for relation "stock" violates check constraint "stock_qty_check"
INSERT INTO stock VALUES (1, -3);
```

Tên `stock_qty_check` do Postgres tự đặt; đặt tên rõ bằng `CONSTRAINT name` thì thông báo lỗi dễ đọc hơn.

Món hàng trỏ tới giỏ không tồn tại:

```sql
-- ERROR 23503: insert or update on table "cart_items" violates foreign key constraint "cart_items_cart_id_fkey"
INSERT INTO cart_items VALUES (9, 99);
```

Tạo dòng cha trước, rồi mới ghi dòng con.

Thêm luật khi dữ liệu cũ đã sai:

```sql
-- ERROR 23514: check constraint "orders_qty_max" of relation "orders" is violated by some row
ALTER TABLE orders ADD CONSTRAINT orders_qty_max CHECK (qty <= 4);
```

```sql
ALTER TABLE orders ADD CONSTRAINT orders_qty_max CHECK (qty <= 4) NOT VALID;
SELECT conname, convalidated FROM pg_constraint WHERE conname = 'orders_qty_max';
```

Đơn 12 có `qty = 5` nên lệnh đầu thất bại. Với `NOT VALID`, ràng buộc được thêm với `convalidated` là false: dòng mới bị kiểm, dòng cũ chờ bạn sửa rồi `VALIDATE CONSTRAINT`.

Tin rằng `CHECK` chặn NULL:

```sql
-- WRONG: CHECK (qty >= 0) is NULL for a NULL qty, so the row gets in
INSERT INTO stock VALUES (2, NULL);
SELECT count(*) AS null_qty FROM stock WHERE qty IS NULL;
```

```sql
-- FIX: clean up, then forbid NULL with NOT NULL
DELETE FROM stock WHERE qty IS NULL;
ALTER TABLE stock ALTER COLUMN qty SET NOT NULL;
SELECT count(*) AS null_qty FROM stock WHERE qty IS NULL;
```

Câu sai để lọt một dòng NULL; sau khi sửa, `NOT NULL` chặn mọi NULL về sau và kết quả là 0.

## Thực hành

Bảng `customers` và `orders` đã có dữ liệu hợp lệ, nhưng chưa có luật nào ngoài khóa chính và `NOT NULL`. Thêm ba ràng buộc, đọc chúng từ catalog, rồi trả lời hai câu hỏi.

## Tóm tắt

- Ràng buộc là luật database tự kiểm ở mỗi lần ghi, bất kể ứng dụng nào ghi.
- `CHECK` chỉ chặn khi điều kiện là false; NULL lọt qua, nên cần thêm `NOT NULL`.
- `UNIQUE` thường nhận nhiều NULL; `UNIQUE NULLS NOT DISTINCT` chỉ nhận một.
- Khóa ngoại mặc định chặn xóa dòng cha còn dòng con; `ON DELETE CASCADE` xóa theo.
- `ADD CONSTRAINT` kiểm mọi dòng cũ; dùng `NOT VALID` rồi `VALIDATE CONSTRAINT` khi phải sửa dữ liệu trước.

# EN

## Opening

The web app checks that a quantity is above 0, but a nightly import script forgets to, and by morning the warehouse has orders with negative quantities. A rule that lives only in application code must be remembered by every new write path. This lesson puts the rule into the database itself.

## Key idea

Constraints are rules the database checks itself on every write, so bad data cannot get in no matter which application writes it. `NOT NULL` requires a value. `CHECK (condition)` requires the condition to hold for each row. `UNIQUE` forbids two equal rows and is enforced with a unique index. `PRIMARY KEY` is `UNIQUE` plus `NOT NULL`, at most one per table. A foreign key (`FOREIGN KEY ... REFERENCES`) requires the value to exist in the parent table.

Many people think `CHECK (qty > 0)` also blocks NULL. In fact `CHECK` only rejects a row when the condition is false; with NULL the condition is NULL, so the row is accepted. To forbid NULL add `NOT NULL`. Likewise, a plain `UNIQUE` treats two NULLs as different and accepts many; since Postgres 15, `UNIQUE NULLS NOT DISTINCT` allows only one.

A foreign key also decides what happens when a parent row is deleted. By default Postgres blocks the delete while child rows exist; `ON DELETE CASCADE` deletes the child rows too; `ON DELETE SET NULL` empties the referencing column. Choose by business meaning: deleting a cart may delete its items, but deleting a customer should not delete their invoices.

`ALTER TABLE ... ADD CONSTRAINT` checks every existing row; one violating row makes the whole command fail. For `CHECK` and foreign keys you can add `NOT VALID` to skip the old rows, fix the data, then run `VALIDATE CONSTRAINT`. Constraints live in the catalog `pg_constraint`: `contype` is `c` (check), `f` (foreign key), `p` (primary key), `u` (unique), and since Postgres 18 also `n` for each `NOT NULL`.

The step-through figure at the end of this section sends three rows through the constraints of table `stock`, including the NULL row that slips past `CHECK`.

## Syntax

```sql
ALTER TABLE table_name ADD CONSTRAINT constraint_name
  { CHECK ( condition )
  | UNIQUE [ NULLS NOT DISTINCT ] ( column [, ...] )
  | FOREIGN KEY ( column ) REFERENCES parent ( column )
      [ ON DELETE { NO ACTION | CASCADE | SET NULL } ] }
  [ NOT VALID ];
ALTER TABLE table_name VALIDATE CONSTRAINT constraint_name;
```

- `NULLS NOT DISTINCT`: treats all NULLs as equal, so only one row may be NULL.
- `ON DELETE CASCADE`: deleting a parent row deletes its children; the default is to block.
- `NOT VALID`: checks only newly written rows (for `CHECK` and foreign keys); `VALIDATE` checks the old rows later.

## Example

The constraints of table `customers` at the start:

```sql
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'customers'::regclass ORDER BY conname;
```

Two rows: `customers_id_not_null` of type `n` and `customers_pkey` of type `p`. In Postgres 18 a primary key also creates a named `NOT NULL` constraint.

```sql
CREATE TABLE u (code text UNIQUE);
INSERT INTO u VALUES (NULL), (NULL);
SELECT count(*) FROM u;
```

The result is 2: both NULLs sit in the plain `UNIQUE` column.

```sql
CREATE TABLE carts (id int PRIMARY KEY);
CREATE TABLE cart_items (id int PRIMARY KEY, cart_id int NOT NULL REFERENCES carts (id) ON DELETE CASCADE);
INSERT INTO carts VALUES (1), (2);
INSERT INTO cart_items VALUES (1, 1), (2, 1), (3, 2);
DELETE FROM carts WHERE id = 1;
SELECT count(*) AS items_left FROM cart_items;
```

One item is left: deleting cart 1 took its two items with it, thanks to `ON DELETE CASCADE`.

## Common mistakes

Writing a negative number into a column with a `CHECK`:

```sql
CREATE TABLE stock (id int PRIMARY KEY, qty int CHECK (qty >= 0));
-- ERROR 23514: new row for relation "stock" violates check constraint "stock_qty_check"
INSERT INTO stock VALUES (1, -3);
```

Postgres made up the name `stock_qty_check`; name it yourself with `CONSTRAINT name` and the error message reads better.

An item pointing to a cart that does not exist:

```sql
-- ERROR 23503: insert or update on table "cart_items" violates foreign key constraint "cart_items_cart_id_fkey"
INSERT INTO cart_items VALUES (9, 99);
```

Create the parent row first, then the child row.

Adding a rule when old data already breaks it:

```sql
-- ERROR 23514: check constraint "orders_qty_max" of relation "orders" is violated by some row
ALTER TABLE orders ADD CONSTRAINT orders_qty_max CHECK (qty <= 4);
```

```sql
ALTER TABLE orders ADD CONSTRAINT orders_qty_max CHECK (qty <= 4) NOT VALID;
SELECT conname, convalidated FROM pg_constraint WHERE conname = 'orders_qty_max';
```

Order 12 has `qty = 5`, so the first command fails. With `NOT VALID` the constraint is added with `convalidated` = false: new rows are checked, old rows wait until you fix them and run `VALIDATE CONSTRAINT`.

Believing that `CHECK` blocks NULL:

```sql
-- WRONG: CHECK (qty >= 0) is NULL for a NULL qty, so the row gets in
INSERT INTO stock VALUES (2, NULL);
SELECT count(*) AS null_qty FROM stock WHERE qty IS NULL;
```

```sql
-- FIX: clean up, then forbid NULL with NOT NULL
DELETE FROM stock WHERE qty IS NULL;
ALTER TABLE stock ALTER COLUMN qty SET NOT NULL;
SELECT count(*) AS null_qty FROM stock WHERE qty IS NULL;
```

The wrong version lets one NULL row in; after the fix, `NOT NULL` blocks every future NULL and the result is 0.

## Practice

Tables `customers` and `orders` already hold valid data but have no rules besides their primary keys and `NOT NULL`. Add three constraints, read them from the catalog, then answer two questions.

## Recap

- Constraints are rules the database checks on every write, whichever application writes.
- `CHECK` only blocks when the condition is false; NULL gets through, so add `NOT NULL`.
- A plain `UNIQUE` accepts many NULLs; `UNIQUE NULLS NOT DISTINCT` accepts one.
- A foreign key blocks deleting a parent that still has children by default; `ON DELETE CASCADE` deletes them too.
- `ADD CONSTRAINT` checks every old row; use `NOT VALID` then `VALIDATE CONSTRAINT` when the data must be fixed first.
