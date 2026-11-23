---
id: e-pg-l1-14
engine: postgres
level: L1
module: ddl
title: Xóa, làm rỗng, sao chép bảng
title_en: Dropping, emptying and copying tables
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Sao chép một bảng bằng `CREATE TABLE … AS` hoặc `LIKE … INCLUDING ALL` và biết mỗi cách chép những gì.
    en: Copy a table with `CREATE TABLE … AS` or `LIKE … INCLUDING ALL` and know what each one copies.
  - vi: Chọn giữa `DELETE` và `TRUNCATE`, kể cả `RESTART IDENTITY` và bảng bị khóa ngoại trỏ tới.
    en: Choose between `DELETE` and `TRUNCATE`, including `RESTART IDENTITY` and tables a foreign key points to.
  - vi: Xóa bảng có view phụ thuộc bằng `CASCADE` khi biết nó sẽ xóa thêm gì.
    en: Drop a table that has a dependent view with `CASCADE`, knowing what else it removes.
requires: [e-pg-l1-13]
sources:
  - https://www.postgresql.org/docs/18/sql-droptable.html
  - https://www.postgresql.org/docs/18/sql-truncate.html
  - https://www.postgresql.org/docs/18/sql-delete.html
  - https://www.postgresql.org/docs/18/sql-createtableas.html
  - https://www.postgresql.org/docs/18/sql-createtable.html
  - https://www.postgresql.org/docs/18/ddl-depend.html
lab:
  setup: |
    CREATE TABLE customers (
      id bigint PRIMARY KEY,
      name text NOT NULL
    );
    CREATE TABLE orders (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer_id bigint NOT NULL REFERENCES customers (id),
      status text NOT NULL CHECK (status IN ('paid', 'cancelled')),
      amount numeric(10,2) NOT NULL CHECK (amount > 0),
      ordered_on date NOT NULL
    );
    CREATE INDEX orders_day_idx ON orders (ordered_on);
    CREATE TABLE import_rows (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      raw text NOT NULL
    );
    CREATE TABLE old_report (
      id bigint PRIMARY KEY,
      total numeric(12,2) NOT NULL
    );
    CREATE VIEW old_report_view AS SELECT id, total FROM old_report;
    INSERT INTO customers VALUES (1, 'An'), (2, 'Binh'), (3, 'Chi');
    INSERT INTO orders (customer_id, status, amount, ordered_on) VALUES
      (1, 'paid', 120.00, '2025-11-20'), (2, 'cancelled', 40.00, '2025-12-02'),
      (3, 'paid', 75.50, '2025-12-28'), (1, 'paid', 210.00, '2026-01-04'),
      (2, 'cancelled', 15.00, '2026-01-09'), (3, 'paid', 99.00, '2026-02-11');
    INSERT INTO import_rows (raw) VALUES ('a;1'), ('b;2'), ('c;3'), ('d;4');
    INSERT INTO old_report VALUES (1, 500.00), (2, 320.00);
  steps:
    - task:
        vi: "Tạo bảng `orders_2025` chứa mọi đơn đặt trước ngày 2026-01-01, chép từ `orders` bằng một câu."
        en: "Create table `orders_2025` holding every order placed before 2026-01-01, copied from `orders` in one statement."
      solution: CREATE TABLE orders_2025 AS SELECT * FROM orders WHERE ordered_on < date '2026-01-01'
      check: catalog
      after: SELECT count(*) AS n, sum(amount) AS total FROM orders_2025
      hint:
        vi: "`CREATE TABLE new AS SELECT … FROM … WHERE …`."
        en: "`CREATE TABLE new AS SELECT … FROM … WHERE …`."
    - task:
        vi: "Tạo bảng rỗng `orders_copy` có cùng cột, mặc định, ràng buộc CHECK, khóa chính và index như `orders`."
        en: "Create an empty table `orders_copy` with the same columns, defaults, CHECK constraints, primary key and indexes as `orders`."
      solution: CREATE TABLE orders_copy (LIKE orders INCLUDING ALL)
      check: catalog
      hint:
        vi: "`CREATE TABLE new (LIKE old INCLUDING ALL)`. `AS SELECT` không chép ràng buộc hay index."
        en: "`CREATE TABLE new (LIKE old INCLUDING ALL)`. `AS SELECT` copies no constraints or indexes."
    - task:
        vi: Xóa các đơn đã hủy khỏi `orders`, giữ nguyên các đơn đã trả.
        en: Delete the cancelled orders from `orders` and keep the paid ones.
      solution: DELETE FROM orders WHERE status = 'cancelled'
      check: rows
      after: SELECT status, count(*) AS n FROM orders GROUP BY status ORDER BY status
      hint:
        vi: "Chỉ `DELETE` có `WHERE`; `TRUNCATE` luôn xóa cả bảng."
        en: "Only `DELETE` takes a `WHERE`; `TRUNCATE` always empties the whole table."
    - task:
        vi: "Làm rỗng `import_rows` để nhập lại từ đầu, và cho mã `id` bắt đầu lại từ 1."
        en: "Empty `import_rows` for a fresh import, and make its `id` numbers start again at 1."
      solution: TRUNCATE import_rows RESTART IDENTITY
      check: catalog
      after: SELECT count(*) AS rows_left, pg_sequence_last_value('import_rows_id_seq') IS NULL AS id_restarted FROM import_rows
      hint:
        vi: "`TRUNCATE` một mình giữ bộ đếm identity; thêm `RESTART IDENTITY`."
        en: "`TRUNCATE` alone keeps the identity counter; add `RESTART IDENTITY`."
    - task:
        vi: "Bảng `old_report` không còn dùng. Xóa nó cùng view `old_report_view` đang dựa vào nó, bằng một lệnh."
        en: "Table `old_report` is no longer used. Drop it together with view `old_report_view` that depends on it, in one command."
      solution: DROP TABLE old_report CASCADE
      check: catalog
      hint:
        vi: "`DROP TABLE` mặc định là `RESTRICT`; `CASCADE` xóa cả đối tượng phụ thuộc."
        en: "`DROP TABLE` defaults to `RESTRICT`; `CASCADE` also drops the dependent objects."
quiz:
  - q:
      vi: "Bạn chạy `CREATE TABLE backup AS SELECT * FROM orders`. Bảng `backup` có gì?"
      en: "You run `CREATE TABLE backup AS SELECT * FROM orders`. What does `backup` have?"
    options:
      - { vi: "Mọi dòng, cùng khóa chính, index và ràng buộc của `orders`", en: "Every row, plus the primary key, indexes and constraints of `orders`" }
      - { vi: "Mọi dòng và tên, kiểu cột; không khóa chính, không index, không NOT NULL", en: "Every row and the column names and types; no primary key, no index, no NOT NULL" }
      - { vi: "Chỉ cấu trúc, không có dòng nào", en: "Only the structure, no rows" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì chữ 'sao chép bảng' gợi một bản y hệt, nhưng `AS SELECT` chỉ lưu kết quả của câu SELECT: cột và dòng. Muốn có ràng buộc và index thì tạo bảng bằng `LIKE … INCLUDING ALL` rồi `INSERT … SELECT`."
      en: "It sounds right because 'copy a table' suggests an exact twin, but `AS SELECT` only stores the result of the SELECT: columns and rows. For constraints and indexes, create the table with `LIKE … INCLUDING ALL` then `INSERT … SELECT`."
  - q:
      vi: "Cần xóa 2 triệu dòng log cũ hơn 90 ngày trong bảng 5 triệu dòng. Dùng gì?"
      en: "You must remove 2 million log rows older than 90 days from a 5 million row table. What do you use?"
    options:
      - { vi: "`TRUNCATE`, vì nó nhanh hơn", en: "`TRUNCATE`, because it is faster" }
      - { vi: "`DELETE … WHERE`, vì `TRUNCATE` không có điều kiện", en: "`DELETE … WHERE`, because `TRUNCATE` takes no condition" }
      - { vi: "`DROP TABLE` rồi tạo lại", en: "`DROP TABLE` then create it again" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `TRUNCATE` nhanh hơn nhiều, nhưng nó luôn làm rỗng cả bảng, kể cả 3 triệu dòng cần giữ. Chỉ `DELETE` lọc được dòng; với bảng rất lớn, người ta xóa theo từng đợt hoặc chia bảng theo thời gian (partition) để bỏ cả một phần."
      en: "It sounds right because `TRUNCATE` is much faster, but it always empties the whole table, including the 3 million rows to keep. Only `DELETE` can filter rows; on a very big table people delete in batches or partition the table by time and drop a whole partition."
---
## Mở bài

Cuối năm, bạn cần một bản sao đơn hàng năm cũ, làm rỗng một bảng nhập liệu tạm và bỏ một bảng báo cáo không ai dùng. Ba việc nghe giống nhau nhưng mỗi lệnh xóa hoặc chép một thứ khác. Chọn nhầm là mất dữ liệu hoặc mất ràng buộc mà không hay.

## Ý chính

`DELETE` xóa từng dòng, có `WHERE`, trả được dòng đã xóa bằng `RETURNING`, và chạy trigger theo dòng. `TRUNCATE` bỏ toàn bộ dữ liệu một lần bằng cách thay file của bảng, nên rất nhanh với bảng lớn, nhưng không có `WHERE`. Cả hai đều nằm trong transaction và hoàn tác được bằng `ROLLBACK`.

Nhiều người nghĩ làm rỗng bảng là reset luôn số thứ tự. Thật ra `TRUNCATE` giữ bộ đếm identity; phải ghi `RESTART IDENTITY`. Nếu bảng khác có khóa ngoại trỏ tới bảng này, `TRUNCATE` bị từ chối, trừ khi thêm `CASCADE`, và khi đó các bảng kia cũng bị làm rỗng.

`DROP TABLE` xóa cả bảng lẫn định nghĩa. Mặc định `RESTRICT` từ chối khi còn view hay khóa ngoại phụ thuộc; `CASCADE` xóa view phụ thuộc và gỡ khóa ngoại ở bảng khác. `IF EXISTS` biến lỗi "không có bảng" thành một thông báo.

Sao chép có hai cách. `CREATE TABLE … AS SELECT` chép cột và dòng, không chép khóa chính, NOT NULL, CHECK hay index. `CREATE TABLE … (LIKE table INCLUDING ALL)` chép cấu trúc gồm mặc định, CHECK, khóa chính và index, nhưng không chép dòng và không chép khóa ngoại. `CREATE TEMP TABLE` tạo bảng chỉ sống trong phiên hiện tại.

## Cú pháp

```sql
DROP TABLE [ IF EXISTS ] table_name [, ...] [ CASCADE | RESTRICT ];
TRUNCATE [ TABLE ] table_name [, ...] [ RESTART IDENTITY | CONTINUE IDENTITY ] [ CASCADE | RESTRICT ];
DELETE FROM table_name [ WHERE condition ] [ RETURNING output ];
CREATE [ TEMP ] TABLE new_table AS query [ WITH [ NO ] DATA ];
CREATE [ TEMP ] TABLE new_table ( LIKE source_table [ INCLUDING ALL ] );
```

- `CASCADE`: xử lý luôn đối tượng phụ thuộc (view bị xóa, bảng con bị làm rỗng).
- `RESTART IDENTITY`: đưa bộ đếm identity của bảng về đầu.
- `WITH NO DATA`: chỉ tạo cột, không chép dòng.
- `INCLUDING ALL`: chép mặc định, ràng buộc CHECK và NOT NULL, khóa chính, index, chú thích.
- `TEMP`: bảng biến mất khi phiên kết thúc.

## Ví dụ

Chép các đơn đã trả bằng `AS SELECT`, rồi đếm dòng và index của bản sao:

```sql
CREATE TABLE paid_copy AS SELECT * FROM orders WHERE status = 'paid';
SELECT (SELECT count(*) FROM paid_copy) AS copied_rows,
       (SELECT count(*) FROM pg_indexes WHERE tablename = 'paid_copy') AS indexes;
```

Có 4 dòng nhưng 0 index. Còn `LIKE … INCLUDING ALL` chép cấu trúc:

```sql
CREATE TABLE orders_shape (LIKE orders INCLUDING ALL);
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'orders_shape'::regclass AND contype <> 'n'
ORDER BY conname;
```

Bản sao có khóa chính (`p`) và hai CHECK (`c`), nhưng không có khóa ngoại (`f`).

Làm rỗng và đánh số lại từ đầu:

```sql
TRUNCATE import_rows RESTART IDENTITY;
INSERT INTO import_rows (raw) VALUES ('fresh') RETURNING id;
```

Bảng tạm chỉ thấy trong phiên này (`relpersistence` là `t`):

```sql
CREATE TEMP TABLE big_orders AS SELECT id, amount FROM orders WHERE amount > 100;
SELECT relpersistence, (SELECT count(*) FROM big_orders) AS n FROM pg_class WHERE relname = 'big_orders';
```

`IF EXISTS` cho phép chạy lại một script dọn dẹp mà không lỗi:

```sql
DROP TABLE IF EXISTS paid_copy;
DROP TABLE IF EXISTS paid_copy;
SELECT to_regclass('paid_copy') IS NULL AS gone;
```

## Lỗi hay gặp

Xóa bảng còn view dựa vào:

```sql
-- ERROR 2BP01: cannot drop table old_report because other objects depend on it
DROP TABLE old_report;
```

Đọc phần chi tiết của lỗi để biết những gì phụ thuộc, rồi mới chọn `CASCADE` hay xóa view trước.

Làm rỗng bảng mà khóa ngoại trỏ tới:

```sql
-- ERROR 0A000: cannot truncate a table referenced in a foreign key constraint
TRUNCATE customers;
```

`TRUNCATE customers CASCADE` chạy được nhưng làm rỗng luôn `orders`. Nếu chỉ muốn bỏ vài khách, dùng `DELETE … WHERE`.

Tưởng `TRUNCATE` reset số thứ tự:

```sql
-- WRONG: TRUNCATE alone keeps the identity counter
INSERT INTO import_rows (raw) VALUES ('x'), ('y');
TRUNCATE import_rows;
INSERT INTO import_rows (raw) VALUES ('z') RETURNING id;
```

```sql
-- FIX: add RESTART IDENTITY
TRUNCATE import_rows RESTART IDENTITY;
INSERT INTO import_rows (raw) VALUES ('z') RETURNING id;
```

Câu sai trả `id` 4, câu sửa trả 1. Nếu bảng khác giữ các số cũ, đừng đánh số lại: số mới sẽ trùng số cũ.

## Thực hành

Có bảng `orders`, `customers`, bảng nhập tạm `import_rows` và bảng `old_report` có một view dựa vào. Sao chép theo hai cách, xóa có điều kiện, làm rỗng có đánh số lại, rồi xóa bảng cũ cùng view của nó. Sau đó là 2 câu hỏi.

## Tóm tắt

- `DELETE` lọc được bằng `WHERE`; `TRUNCATE` làm rỗng cả bảng rất nhanh nhưng không lọc.
- `TRUNCATE` giữ bộ đếm identity trừ khi có `RESTART IDENTITY`, và bị chặn khi có khóa ngoại trỏ tới.
- `DROP TABLE` mặc định từ chối khi có phụ thuộc; `CASCADE` xóa cả view phụ thuộc.
- `AS SELECT` chép dòng, không chép ràng buộc hay index; `LIKE … INCLUDING ALL` chép cấu trúc trừ khóa ngoại.
- `CREATE TEMP TABLE` chỉ sống trong phiên hiện tại.

# EN

## Opening

At year end you need a copy of last year's orders, an empty scratch import table and the removal of a report table nobody uses. The three jobs sound alike but each command removes or copies something different. Pick the wrong one and you lose data or constraints without noticing.

## Key idea

`DELETE` removes rows one by one, takes a `WHERE`, can return the removed rows with `RETURNING`, and fires row triggers. `TRUNCATE` drops all the data at once by swapping the table's file, so it is very fast on big tables, but it has no `WHERE`. Both are transactional and can be undone with `ROLLBACK`.

Many people think emptying a table also resets its numbering. In fact `TRUNCATE` keeps the identity counter; you must write `RESTART IDENTITY`. If another table has a foreign key pointing at this one, `TRUNCATE` is refused unless you add `CASCADE`, and then those tables are emptied too.

`DROP TABLE` removes the table and its definition. The default `RESTRICT` refuses while views or foreign keys depend on it; `CASCADE` drops the dependent views and removes the foreign keys on other tables. `IF EXISTS` turns the "no such table" error into a notice.

There are two ways to copy. `CREATE TABLE … AS SELECT` copies columns and rows, not the primary key, NOT NULL, CHECK or indexes. `CREATE TABLE … (LIKE table INCLUDING ALL)` copies the structure with defaults, CHECK, primary key and indexes, but no rows and no foreign keys. `CREATE TEMP TABLE` makes a table that lives only in the current session.

## Syntax

```sql
DROP TABLE [ IF EXISTS ] table_name [, ...] [ CASCADE | RESTRICT ];
TRUNCATE [ TABLE ] table_name [, ...] [ RESTART IDENTITY | CONTINUE IDENTITY ] [ CASCADE | RESTRICT ];
DELETE FROM table_name [ WHERE condition ] [ RETURNING output ];
CREATE [ TEMP ] TABLE new_table AS query [ WITH [ NO ] DATA ];
CREATE [ TEMP ] TABLE new_table ( LIKE source_table [ INCLUDING ALL ] );
```

- `CASCADE`: also handles dependent objects (views dropped, child tables emptied).
- `RESTART IDENTITY`: puts the table's identity counter back to the start.
- `WITH NO DATA`: creates the columns only, copies no rows.
- `INCLUDING ALL`: copies defaults, CHECK and NOT NULL constraints, primary key, indexes, comments.
- `TEMP`: the table disappears when the session ends.

## Example

Copy the paid orders with `AS SELECT`, then count the rows and indexes of the copy:

```sql
CREATE TABLE paid_copy AS SELECT * FROM orders WHERE status = 'paid';
SELECT (SELECT count(*) FROM paid_copy) AS copied_rows,
       (SELECT count(*) FROM pg_indexes WHERE tablename = 'paid_copy') AS indexes;
```

It has 4 rows but 0 indexes. `LIKE … INCLUDING ALL` copies the structure instead:

```sql
CREATE TABLE orders_shape (LIKE orders INCLUDING ALL);
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'orders_shape'::regclass AND contype <> 'n'
ORDER BY conname;
```

The copy has the primary key (`p`) and two CHECKs (`c`), but no foreign key (`f`).

Empty the table and number from the start again:

```sql
TRUNCATE import_rows RESTART IDENTITY;
INSERT INTO import_rows (raw) VALUES ('fresh') RETURNING id;
```

A temporary table is visible only in this session (`relpersistence` is `t`):

```sql
CREATE TEMP TABLE big_orders AS SELECT id, amount FROM orders WHERE amount > 100;
SELECT relpersistence, (SELECT count(*) FROM big_orders) AS n FROM pg_class WHERE relname = 'big_orders';
```

`IF EXISTS` lets a cleanup script run again without errors:

```sql
DROP TABLE IF EXISTS paid_copy;
DROP TABLE IF EXISTS paid_copy;
SELECT to_regclass('paid_copy') IS NULL AS gone;
```

## Common mistakes

Dropping a table a view still depends on:

```sql
-- ERROR 2BP01: cannot drop table old_report because other objects depend on it
DROP TABLE old_report;
```

Read the error's detail to see what depends on it, then choose `CASCADE` or drop the view first.

Emptying a table a foreign key points to:

```sql
-- ERROR 0A000: cannot truncate a table referenced in a foreign key constraint
TRUNCATE customers;
```

`TRUNCATE customers CASCADE` works but also empties `orders`. To remove only a few customers, use `DELETE … WHERE`.

Assuming `TRUNCATE` resets the numbering:

```sql
-- WRONG: TRUNCATE alone keeps the identity counter
INSERT INTO import_rows (raw) VALUES ('x'), ('y');
TRUNCATE import_rows;
INSERT INTO import_rows (raw) VALUES ('z') RETURNING id;
```

```sql
-- FIX: add RESTART IDENTITY
TRUNCATE import_rows RESTART IDENTITY;
INSERT INTO import_rows (raw) VALUES ('z') RETURNING id;
```

The wrong version returns `id` 4, the fix returns 1. If another table still holds the old numbers, do not restart: new numbers would clash with old ones.

## Practice

There are tables `orders`, `customers`, a scratch import table `import_rows` and a table `old_report` with a view on it. Copy in both ways, delete with a condition, empty with renumbering, then drop the old table with its view. Then 2 questions.

## Recap

- `DELETE` can filter with `WHERE`; `TRUNCATE` empties the whole table very fast but cannot filter.
- `TRUNCATE` keeps the identity counter unless you write `RESTART IDENTITY`, and is blocked while a foreign key points at the table.
- `DROP TABLE` refuses by default when something depends on it; `CASCADE` also drops dependent views.
- `AS SELECT` copies rows, not constraints or indexes; `LIKE … INCLUDING ALL` copies the structure except foreign keys.
- `CREATE TEMP TABLE` lives only in the current session.
