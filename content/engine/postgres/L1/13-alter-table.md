---
id: e-pg-l1-13
engine: postgres
level: L1
module: ddl
title: Sửa bảng an toàn
title_en: Altering tables safely
kind: lab
runtime: browser
minutes: 15
figures: [{ name: pg-alter-table-rewrite, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Thêm, đổi tên, xóa cột và thêm ràng buộc cho một bảng đang có dữ liệu bằng `ALTER TABLE`.
    en: Add, rename and drop columns and add constraints on a table that already holds data with `ALTER TABLE`.
  - vi: Đổi kiểu một cột bằng `USING` và biết thay đổi nào ghi lại cả bảng, thay đổi nào không.
    en: Change a column's type with `USING` and know which changes rewrite the whole table and which do not.
  - vi: Sửa một cột lưu sai kiểu để index lại dùng được cho câu lọc tự nhiên.
    en: Fix a column stored with the wrong type so its index works again for the natural filter.
requires: [e-pg-l1-03]
sources:
  - https://www.postgresql.org/docs/18/ddl-alter.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/functions-admin.html
  - https://www.postgresql.org/docs/18/indexes-types.html
lab:
  setup: |
    CREATE TABLE customers (
      id bigint PRIMARY KEY,
      name text NOT NULL
    );
    INSERT INTO customers SELECT g, 'Customer ' || g FROM generate_series(1, 500) AS g;
    -- wrong on purpose: customer_ref holds numbers but is text
    CREATE TABLE orders (
      id bigint PRIMARY KEY,
      customer_ref text NOT NULL,
      amount numeric(10,2) NOT NULL,
      note varchar(40)
    );
    INSERT INTO orders
    SELECT g, (1 + (g * 7919) % 500)::text, (g % 97) + 0.5, NULL
    FROM generate_series(1, 20000) AS g;
    CREATE INDEX orders_customer_idx ON orders (customer_ref);
    CREATE TABLE imports (
      id bigint PRIMARY KEY,
      qty text NOT NULL
    );
    INSERT INTO imports VALUES (1, '3'), (2, '12'), (3, 'n/a');
    ANALYZE;
  steps:
    - task:
        vi: "Thêm cột `status` kiểu `text` vào `orders`: không bao giờ trống, đơn cũ và đơn mới mặc định là `'new'`."
        en: "Add a column `status` of type `text` to `orders`: never empty, old and new orders default to `'new'`."
      solution: ALTER TABLE orders ADD COLUMN status text NOT NULL DEFAULT 'new'
      check: catalog
      hint:
        vi: "`ADD COLUMN name type NOT NULL DEFAULT value`. Có DEFAULT thì dòng cũ nhận giá trị đó, nên NOT NULL không lỗi."
        en: "`ADD COLUMN name type NOT NULL DEFAULT value`. With a DEFAULT the old rows get that value, so NOT NULL does not fail."
    - task:
        vi: Đổi tên cột `note` của `orders` thành `memo`.
        en: Rename column `note` of `orders` to `memo`.
      solution: ALTER TABLE orders RENAME COLUMN note TO memo
      check: catalog
      hint:
        vi: "`ALTER TABLE table RENAME COLUMN old TO new`."
        en: "`ALTER TABLE table RENAME COLUMN old TO new`."
    - task:
        vi: "Cột `customer_ref` đang là `text` dù chỉ chứa số. Đổi nó sang `bigint`, cùng kiểu với `customers.id`."
        en: "Column `customer_ref` is `text` although it only holds numbers. Change it to `bigint`, the type of `customers.id`."
      solution: ALTER TABLE orders ALTER COLUMN customer_ref TYPE bigint USING customer_ref::bigint
      check: catalog
      hint:
        vi: "Từ `text` sang số không ép tự động: thêm `USING customer_ref::bigint`."
        en: "`text` to a number is not cast automatically: add `USING customer_ref::bigint`."
    - task:
        vi: "Giờ hai cột cùng kiểu: thêm khóa ngoại tên `orders_customer_fk` từ `orders.customer_ref` tới `customers.id`."
        en: "Now both columns share a type: add a foreign key named `orders_customer_fk` from `orders.customer_ref` to `customers.id`."
      solution: ALTER TABLE orders ADD CONSTRAINT orders_customer_fk FOREIGN KEY (customer_ref) REFERENCES customers (id)
      check: catalog
      hint:
        vi: "`ADD CONSTRAINT name FOREIGN KEY (column) REFERENCES table (column)`."
        en: "`ADD CONSTRAINT name FOREIGN KEY (column) REFERENCES table (column)`."
    - task:
        vi: "Đếm số đơn và tổng tiền của khách 42 (hai cột, một dòng). Bài chấm cả tốc độ: câu phải đọc `orders` qua index của `customer_ref`."
        en: "Count the orders of customer 42 and sum their amounts (two columns, one row). Speed is graded too: the query must read `orders` through the index on `customer_ref`."
      solution: SELECT count(*), sum(amount) FROM orders WHERE customer_ref = 42
      check: rows
      perf: { table: orders }
      slow: SELECT count(*), sum(amount) FROM orders WHERE customer_ref::text = '42'
      hint:
        vi: So sánh cột trần với một số. Ép cột về chữ thì index (giờ xếp theo số) không dùng được.
        en: Compare the bare column with a number. Casting the column to text hides the index, which is now ordered by number.
quiz:
  - q:
      vi: "Bảng `events` có 50 triệu dòng. Bạn chạy `ALTER TABLE events ADD COLUMN source text NOT NULL DEFAULT 'app'`. Điều gì xảy ra?"
      en: "Table `events` has 50 million rows. You run `ALTER TABLE events ADD COLUMN source text NOT NULL DEFAULT 'app'`. What happens?"
    options:
      - { vi: "Postgres ghi lại cả 50 triệu dòng để chép giá trị `'app'` vào từng dòng", en: "Postgres rewrites all 50 million rows to copy `'app'` into each one" }
      - { vi: "Giá trị hằng được lưu một lần trong catalog; dòng cũ đọc ra `'app'` mà không bị ghi lại", en: "The constant is stored once in the catalog; old rows read back `'app'` without being rewritten" }
      - { vi: "Lỗi, vì dòng cũ chưa có giá trị cho cột NOT NULL", en: "An error, because the old rows have no value for a NOT NULL column" }
    answer: 1
    trap: 0
    why:
      vi: "\"Ghi lại cả 50 triệu dòng\" nghe hợp lý vì mỗi dòng phải có giá trị của cột mới, nhưng từ Postgres 11 một DEFAULT hằng (như `'app'`) được lưu một lần trong catalog (bảng hệ thống mô tả bảng của bạn) và trả về cho dòng cũ khi đọc, nên lệnh chạy gần như tức thì. Cũng không lỗi `NOT NULL`, vì mọi dòng cũ đều đọc ra `'app'`. DEFAULT đổi giá trị mỗi lần gọi như `random()` thì khác: bảng bị ghi lại."
      en: "\"Rewrites all 50 million rows\" sounds right because every row needs a value for the new column, but since Postgres 11 a constant DEFAULT (such as `'app'`) is stored once in the catalog (the system tables that describe your tables) and returned for old rows on read, so the command is almost instant. There is no `NOT NULL` error either, because every old row reads back `'app'`. A DEFAULT that changes on every call, such as `random()`, is different: the table is rewritten."
  - q:
      vi: "Thay đổi nào ghi lại toàn bộ bảng?"
      en: "Which change rewrites the whole table?"
    options:
      - { vi: "`varchar(20)` thành `varchar(50)`", en: "`varchar(20)` to `varchar(50)`" }
      - { vi: "`int` thành `bigint`", en: "`int` to `bigint`" }
      - { vi: "`DROP COLUMN`", en: "`DROP COLUMN`" }
    answer: 1
    why:
      vi: "`bigint` chiếm 8 byte thay vì 4, nên mọi dòng phải ghi lại (và mọi index của bảng được dựng lại). Nới `varchar` không đổi cách lưu; `DROP COLUMN` chỉ ẩn cột, chỗ trống được lấy lại khi dòng được ghi lại sau này."
      en: "`bigint` takes 8 bytes instead of 4, so every row is rewritten (and every index of the table rebuilt). Widening `varchar` does not change the stored bytes; `DROP COLUMN` only hides the column, and the space comes back as rows are rewritten later."
---
## Mở bài

Bảng `orders` đã có 20.000 dòng thì sếp muốn thêm trạng thái đơn, đổi tên một cột và sửa một cột lỡ khai báo sai kiểu. Bạn không thể xóa bảng làm lại. Câu hỏi là lệnh nào chạy tức thì, lệnh nào bắt Postgres ghi lại cả bảng.

## Ý chính

`ALTER TABLE` sửa một bảng đang có dữ liệu: thêm, xóa, đổi tên cột, đổi kiểu, thêm hoặc bỏ ràng buộc, đổi tên bảng. Phần lớn các dạng này giữ lock mạnh nhất trên bảng (chặn cả người đọc) trong lúc chạy, nên lệnh nhanh hay chậm quyết định bảng bị đứng bao lâu.

Nhiều người nghĩ thêm cột có DEFAULT là phải ghi lại mọi dòng. Thật ra với giá trị hằng, Postgres lưu DEFAULT một lần trong catalog và trả nó cho dòng cũ khi đọc. Chỉ DEFAULT không ổn định như `random()` mới làm bảng bị ghi lại. `DROP COLUMN` cũng không ghi lại: cột chỉ bị ẩn.

Đổi kiểu thì tùy. Nới `varchar(20)` thành `varchar(50)` hay `varchar` thành `text` không đổi cách lưu nên không ghi lại. `int` thành `bigint` hay `text` thành số thì có: mọi dòng được ghi sang một file mới và mọi index được dựng lại. Bạn thấy được điều đó qua `pg_relation_filenode`, số hiệu file đang chứa bảng.

Từ `text` sang số không có phép ép tự động, nên phải ghi `USING expression` (biểu thức tính giá trị mới). Một dòng không ép được là cả lệnh hỏng và bảng giữ nguyên. Cột lưu sai kiểu còn làm hỏng tốc độ: so sánh phải ép kiểu cột, và index thường trên cột không còn dùng được.

Hình từng bước ở cuối mục này đặt ba lệnh của phần Ví dụ cạnh nhau: hai lệnh chỉ sửa catalog, một lệnh ghi cả bảng sang file mới.

## Cú pháp

```sql
ALTER TABLE [ IF EXISTS ] table_name
  ADD COLUMN column_name data_type [ NOT NULL ] [ DEFAULT value ]
| DROP COLUMN [ IF EXISTS ] column_name [ RESTRICT | CASCADE ]
| RENAME COLUMN old_name TO new_name
| ALTER COLUMN column_name TYPE data_type [ USING expression ]
| ALTER COLUMN column_name { SET | DROP } NOT NULL
| ADD CONSTRAINT constraint_name constraint_definition
| RENAME TO new_table_name;
```

- `USING`: cách tính giá trị mới từ giá trị cũ khi đổi kiểu.
- `CASCADE`: xóa luôn đối tượng phụ thuộc cột (view, ràng buộc).
- `SET NOT NULL`: đọc cả bảng để kiểm, không ghi lại.
- `IF EXISTS`: không lỗi khi bảng hoặc cột không có.

## Ví dụ

Chụp số hiệu file của `orders`, thêm một cột có DEFAULT hằng rồi so lại:

```sql
CREATE TABLE file_before AS SELECT pg_relation_filenode('orders') AS node;
ALTER TABLE orders ADD COLUMN channel text NOT NULL DEFAULT 'web';
SELECT pg_relation_filenode('orders') = node AS same_file FROM file_before;
```

Kết quả `true`: bảng vẫn ở file cũ, không dòng nào bị ghi lại. Giờ đổi `customer_ref` sang `bigint`:

```sql
ALTER TABLE orders ALTER COLUMN customer_ref TYPE bigint USING customer_ref::bigint;
SELECT pg_relation_filenode('orders') = node AS same_file FROM file_before;
```

Kết quả `false`: Postgres đã ghi cả bảng sang file mới. Nới một `varchar` thì không:

```sql
UPDATE file_before SET node = pg_relation_filenode('orders');
ALTER TABLE orders ALTER COLUMN note TYPE varchar(80);
SELECT pg_relation_filenode('orders') = node AS same_file FROM file_before;
```

Thêm ràng buộc và đổi tên bảng là thay đổi trong catalog:

```sql
ALTER TABLE orders ADD CONSTRAINT orders_amount_pos CHECK (amount > 0);
ALTER TABLE customers RENAME TO clients;
SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass AND contype = 'c';
```

## Lỗi hay gặp

Đổi `text` sang số mà quên `USING`:

```sql
-- ERROR 42804: column "qty" cannot be cast automatically to type integer
ALTER TABLE imports ALTER COLUMN qty TYPE int;
```

Có `USING` nhưng dữ liệu cũ có giá trị không phải số:

```sql
-- ERROR 22P02: invalid input syntax for type integer: "n/a"
ALTER TABLE imports ALTER COLUMN qty TYPE int USING qty::int;
```

Cả lệnh hỏng vì một dòng `'n/a'`, bảng giữ nguyên. Hãy tìm dòng xấu trước, rồi quyết định nó thành gì, ví dụ NULL:

```sql
ALTER TABLE imports ALTER COLUMN qty DROP NOT NULL;
ALTER TABLE imports ALTER COLUMN qty TYPE int USING CASE WHEN qty ~ '^[0-9]+$' THEN qty::int END;
SELECT id, qty FROM imports ORDER BY id;
```

Xóa một cột mà view còn dùng:

```sql
CREATE VIEW order_notes AS SELECT id, note FROM orders;
-- ERROR 2BP01: cannot drop column note of table orders because other objects depend on it
ALTER TABLE orders DROP COLUMN note;
```

Mặc định là `RESTRICT`, nên Postgres từ chối. `DROP COLUMN note CASCADE` xóa luôn view `order_notes`; chỉ dùng khi bạn biết view đó không còn ai cần. Đổi kiểu một cột mà view dùng cũng bị chặn (mã `0A000`): xóa view, đổi kiểu, rồi tạo lại view.

## Thực hành

Bảng `orders` có 20.000 dòng và cột `customer_ref` cố ý lưu số dưới dạng `text`, có sẵn index. Thêm cột, đổi tên cột, sửa kiểu `customer_ref`, nối khóa ngoại, rồi viết một câu đọc dùng được index sau khi sửa. Sau đó là 2 câu hỏi.

## Tóm tắt

- Thêm cột với DEFAULT hằng, `DROP COLUMN`, đổi tên và nới `varchar` không ghi lại bảng.
- `int` sang `bigint` hay `text` sang số ghi lại cả bảng và dựng lại index; xem bằng `pg_relation_filenode`.
- Đổi kiểu không ép tự động cần `USING`; một dòng hỏng làm cả lệnh hỏng.
- Cột hoặc view phụ thuộc chặn `DROP COLUMN`; `CASCADE` xóa cả chúng.
- Cột đúng kiểu thì so sánh trần dùng được index; ép kiểu cột thì mất index.

# EN

## Opening

Table `orders` already has 20,000 rows when your manager wants an order status, a renamed column and a fix for a column declared with the wrong type. You cannot drop the table and start again. The question is which command runs instantly and which makes Postgres rewrite the whole table.

## Key idea

`ALTER TABLE` changes a table that already holds data: add, drop or rename columns, change a type, add or remove constraints, rename the table. Most of these forms take the strongest lock on the table while they run, so how fast the command is decides how long the table is blocked.

Many people think adding a column with a DEFAULT must rewrite every row. In fact with a constant value Postgres stores the DEFAULT once in the catalog and returns it for old rows on read. Only a volatile DEFAULT such as `random()` rewrites the table. `DROP COLUMN` does not rewrite either: the column is only hidden.

Changing a type depends. Widening `varchar(20)` to `varchar(50)` or `varchar` to `text` keeps the stored bytes, so there is no rewrite. `int` to `bigint` or `text` to a number does rewrite: every row goes to a new file and every index is rebuilt. You can see it with `pg_relation_filenode`, the number of the file that holds the table.

There is no automatic cast from `text` to a number, so you must write `USING expression`. One row that cannot be cast fails the whole command and the table stays as it was. A column stored with the wrong type also hurts speed: comparisons must cast the column, and a plain index on it no longer helps.

The step-through figure at the end of this section puts the three commands of the Example side by side: two only change the catalog, one writes the whole table to a new file.

## Syntax

```sql
ALTER TABLE [ IF EXISTS ] table_name
  ADD COLUMN column_name data_type [ NOT NULL ] [ DEFAULT value ]
| DROP COLUMN [ IF EXISTS ] column_name [ RESTRICT | CASCADE ]
| RENAME COLUMN old_name TO new_name
| ALTER COLUMN column_name TYPE data_type [ USING expression ]
| ALTER COLUMN column_name { SET | DROP } NOT NULL
| ADD CONSTRAINT constraint_name constraint_definition
| RENAME TO new_table_name;
```

- `USING`: how to compute the new value from the old one when the type changes.
- `CASCADE`: also drops the objects that depend on the column (views, constraints).
- `SET NOT NULL`: reads the whole table to check, does not rewrite it.
- `IF EXISTS`: no error when the table or column is missing.

## Example

Record the file number of `orders`, add a column with a constant DEFAULT, then compare:

```sql
CREATE TABLE file_before AS SELECT pg_relation_filenode('orders') AS node;
ALTER TABLE orders ADD COLUMN channel text NOT NULL DEFAULT 'web';
SELECT pg_relation_filenode('orders') = node AS same_file FROM file_before;
```

The result is `true`: the table is still in its old file, no row was rewritten. Now change `customer_ref` to `bigint`:

```sql
ALTER TABLE orders ALTER COLUMN customer_ref TYPE bigint USING customer_ref::bigint;
SELECT pg_relation_filenode('orders') = node AS same_file FROM file_before;
```

The result is `false`: Postgres wrote the whole table to a new file. Widening a `varchar` does not:

```sql
UPDATE file_before SET node = pg_relation_filenode('orders');
ALTER TABLE orders ALTER COLUMN note TYPE varchar(80);
SELECT pg_relation_filenode('orders') = node AS same_file FROM file_before;
```

Adding a constraint and renaming a table are catalog changes:

```sql
ALTER TABLE orders ADD CONSTRAINT orders_amount_pos CHECK (amount > 0);
ALTER TABLE customers RENAME TO clients;
SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass AND contype = 'c';
```

## Common mistakes

Changing `text` to a number without `USING`:

```sql
-- ERROR 42804: column "qty" cannot be cast automatically to type integer
ALTER TABLE imports ALTER COLUMN qty TYPE int;
```

With `USING`, but the old data holds a value that is not a number:

```sql
-- ERROR 22P02: invalid input syntax for type integer: "n/a"
ALTER TABLE imports ALTER COLUMN qty TYPE int USING qty::int;
```

The whole command fails because of one `'n/a'` row and the table is unchanged. Find the bad rows first, then decide what they become, for example NULL:

```sql
ALTER TABLE imports ALTER COLUMN qty DROP NOT NULL;
ALTER TABLE imports ALTER COLUMN qty TYPE int USING CASE WHEN qty ~ '^[0-9]+$' THEN qty::int END;
SELECT id, qty FROM imports ORDER BY id;
```

Dropping a column a view still uses:

```sql
CREATE VIEW order_notes AS SELECT id, note FROM orders;
-- ERROR 2BP01: cannot drop column note of table orders because other objects depend on it
ALTER TABLE orders DROP COLUMN note;
```

The default is `RESTRICT`, so Postgres refuses. `DROP COLUMN note CASCADE` also drops view `order_notes`; use it only when you know nobody needs that view. Changing the type of a column a view uses is blocked too (code `0A000`): drop the view, change the type, then create the view again.

## Practice

Table `orders` has 20,000 rows and column `customer_ref` stores numbers as `text` on purpose, with an index already on it. Add a column, rename a column, fix the type of `customer_ref`, add the foreign key, then write a read that can use the index after the fix. Then 2 questions.

## Recap

- Adding a column with a constant DEFAULT, `DROP COLUMN`, renaming and widening `varchar` do not rewrite the table.
- `int` to `bigint` or `text` to a number rewrites the whole table and rebuilds its indexes; check with `pg_relation_filenode`.
- A type change with no automatic cast needs `USING`; one bad row fails the whole command.
- A dependent column or view blocks `DROP COLUMN`; `CASCADE` drops them as well.
- With the right type a bare comparison uses the index; casting the column loses it.
