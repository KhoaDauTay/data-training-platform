---
id: e-pg-l2-24
engine: postgres
level: L2
module: triggers
title: Trigger, ràng buộc hay cột generated?
title_en: Trigger, constraint or generated column?
kind: quiz
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Chọn ràng buộc (CHECK, khóa ngoại, UNIQUE, EXCLUDE), cột generated hay trigger cho một quy tắc dữ liệu, và nói được vì sao.
    en: Choose a constraint (CHECK, foreign key, UNIQUE, EXCLUDE), a generated column or a trigger for a data rule, and say why.
  - vi: Phân biệt cột generated STORED và VIRTUAL trong PostgreSQL 18.
    en: Tell STORED from VIRTUAL generated columns in PostgreSQL 18.
requires: [e-pg-l2-23]
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/ddl-generated-columns.html
  - https://www.postgresql.org/docs/18/trigger-definition.html
  - https://www.postgresql.org/docs/18/sql-createtable.html
lab:
  setup: |
    CREATE TABLE customers (
      id int PRIMARY KEY,
      name text NOT NULL,
      order_count int NOT NULL DEFAULT 0
    );
    CREATE TABLE orders (
      id int PRIMARY KEY,
      customer_id int NOT NULL REFERENCES customers (id),
      qty int NOT NULL,
      unit_price numeric(10,2) NOT NULL
    );
    CREATE TABLE bookings (
      id int PRIMARY KEY,
      during tstzrange NOT NULL
    );
    INSERT INTO customers VALUES (1, 'An', 2), (2, 'Binh', 1);
    INSERT INTO orders VALUES (1, 1, 2, 10.00), (2, 1, 1, 99.00), (3, 2, 5, 4.00);
    INSERT INTO bookings VALUES (1, '[2026-11-24 09:00+00, 2026-11-24 10:00+00)');
  steps:
    - task:
        vi: "Số lượng trong đơn phải lớn hơn 0. Thêm ràng buộc `orders_qty_positive` cho bảng `orders`."
        en: "The quantity of an order must be greater than 0. Add constraint `orders_qty_positive` to table `orders`."
      solution: ALTER TABLE orders ADD CONSTRAINT orders_qty_positive CHECK (qty > 0)
      check: catalog
      hint:
        vi: "`ALTER TABLE t ADD CONSTRAINT name CHECK (condition)`."
        en: "`ALTER TABLE t ADD CONSTRAINT name CHECK (condition)`."
    - task:
        vi: "Thêm cột `total` kiểu `numeric(12,2)` luôn bằng `qty * unit_price`, tính lúc ghi và lưu trên đĩa."
        en: "Add column `total` of type `numeric(12,2)` that always equals `qty * unit_price`, computed on write and stored on disk."
      solution: ALTER TABLE orders ADD COLUMN total numeric(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED
      check: catalog
      after: SELECT o.id, o.total, a.attgenerated FROM orders o JOIN pg_attribute a ON a.attrelid = 'orders'::regclass AND a.attname = 'total' ORDER BY o.id
      hint:
        vi: "`GENERATED ALWAYS AS (expression) STORED`; bỏ `STORED` thì PostgreSQL 18 tạo cột VIRTUAL."
        en: "`GENERATED ALWAYS AS (expression) STORED`; without `STORED` PostgreSQL 18 creates a VIRTUAL column."
    - task:
        vi: "Phòng họp chỉ có một: hai lịch đặt trong `bookings` không được chồng giờ nhau. Thêm ràng buộc `bookings_no_overlap`."
        en: "There is only one meeting room: two bookings in `bookings` may not overlap. Add constraint `bookings_no_overlap`."
      solution: ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (during WITH &&)
      check: catalog
      hint:
        vi: "`EXCLUDE USING gist (column WITH &&)`: `&&` là phép chồng nhau của hai khoảng."
        en: "`EXCLUDE USING gist (column WITH &&)`: `&&` is the overlap operator for two ranges."
quiz:
  - q:
      vi: "Quy tắc: giá trong `orders` không được âm. Chọn cách nào?"
      en: "Rule: the price in `orders` may not be negative. Which way?"
    options:
      - { vi: "Trigger `BEFORE INSERT OR UPDATE` báo lỗi khi giá âm", en: "A `BEFORE INSERT OR UPDATE` trigger that raises an error on a negative price" }
      - { vi: "Ràng buộc `CHECK (unit_price >= 0)`", en: "A `CHECK (unit_price >= 0)` constraint" }
      - { vi: "Kiểm trong code ứng dụng", en: "Check it in the application code" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì trigger cũng chặn được dòng sai, nhưng quy tắc chỉ nhìn một dòng thì `CHECK` là đủ: khai báo một dòng, áp cả cho dữ liệu cũ khi thêm, không bị tắt bằng `DISABLE TRIGGER`, không phụ thuộc thứ tự trigger, và planner đọc được nó. Code ứng dụng thì bị bỏ qua bởi mọi câu SQL viết tay."
      en: "It sounds right because a trigger can block bad rows too, but a rule that looks at one row only needs `CHECK`: one declarative line, checked against existing data when added, never switched off by `DISABLE TRIGGER`, independent of trigger order, and the planner can read it. Application code is skipped by every hand-written SQL statement."
  - q:
      vi: "Phòng họp không được đặt chồng giờ. Một bạn viết trigger `BEFORE INSERT` tìm lịch chồng giờ rồi báo lỗi. Hai người đặt cùng lúc trong hai transaction. Chuyện gì có thể xảy ra?"
      en: "A meeting room may not be double booked. Someone writes a `BEFORE INSERT` trigger that looks for an overlapping booking and raises an error. Two people book at the same moment in two transactions. What can happen?"
    options:
      - { vi: "Không sao, trigger luôn thấy lịch của transaction kia", en: "Nothing bad, the trigger always sees the other transaction's booking" }
      - { vi: "Cả hai lịch cùng được lưu, vì mỗi trigger không thấy dòng chưa commit của bên kia", en: "Both bookings are stored, because each trigger cannot see the other side's uncommitted row" }
      - { vi: "Database tự đổi trigger thành ràng buộc", en: "The database turns the trigger into a constraint by itself" }
    answer: 1
    trap: 0
    why:
      vi: "Trigger chạy cho mọi dòng, nhưng ở mức cô lập (isolation level) mặc định READ COMMITTED, mỗi transaction chỉ thấy dữ liệu đã commit. Lịch của bên kia chưa commit, nên cả hai trigger cùng không thấy xung đột và cả hai lịch được lưu. Postgres không tự đổi trigger thành ràng buộc; bạn phải khai báo `EXCLUDE USING gist (during WITH &&)`. Ràng buộc này kiểm qua index, thấy cả dòng chưa commit, nên transaction sau phải chờ và bị từ chối."
      en: "The trigger runs for every row, but at the default isolation level, READ COMMITTED, each transaction sees only committed data. The other booking is not committed yet, so neither trigger sees the conflict and both bookings are stored. Postgres never turns a trigger into a constraint by itself; you must declare `EXCLUDE USING gist (during WITH &&)`. That constraint checks through an index, which sees uncommitted rows too, so the second transaction waits and is refused."
  - q:
      vi: "Trong PostgreSQL 18 bạn viết `line_tax numeric(12,2) GENERATED ALWAYS AS (qty * unit_price * 0.1)`, không ghi gì thêm. Điều gì đúng?"
      en: "In PostgreSQL 18 you write `line_tax numeric(12,2) GENERATED ALWAYS AS (qty * unit_price * 0.1)` with nothing after it. What is true?"
    options:
      - { vi: "Đó là cột VIRTUAL: tính lúc đọc, không chiếm chỗ trên đĩa, không tạo index được", en: "It is a VIRTUAL column: computed on read, no disk space, cannot be indexed" }
      - { vi: "Đó là cột STORED, như ở PostgreSQL 17", en: "It is a STORED column, as in PostgreSQL 17" }
      - { vi: "Báo lỗi vì thiếu chữ STORED", en: "An error because the word STORED is missing" }
    answer: 0
    why:
      vi: "PostgreSQL 18 thêm cột generated VIRTUAL và lấy nó làm mặc định khi không ghi gì, nên không có lỗi. Bản 17 trở về trước chỉ có STORED và bắt buộc ghi chữ đó; đó là lý do nhiều người nhớ là STORED. Cần index trên cột thì ghi `STORED`."
      en: "PostgreSQL 18 added VIRTUAL generated columns and made them the default when nothing is written, so there is no error. Version 17 and earlier had only STORED and required the word; that is why many people remember STORED. If you need an index on the column, write `STORED`."
  - q:
      vi: "`customers.order_count` phải luôn bằng số đơn của khách trong `orders`. Cái nào làm được?"
      en: "`customers.order_count` must always equal the customer's number of orders in `orders`. Which one can do it?"
    options:
      - { vi: "Cột generated `GENERATED ALWAYS AS ((SELECT count(*) FROM orders ...)) STORED`", en: "A generated column `GENERATED ALWAYS AS ((SELECT count(*) FROM orders ...)) STORED`" }
      - { vi: "Ràng buộc `CHECK` đếm đơn", en: "A `CHECK` constraint that counts orders" }
      - { vi: "Trigger trên `orders` cập nhật `customers`, hoặc không lưu cột này mà đếm lúc đọc", en: "A trigger on `orders` that updates `customers`, or not storing the column and counting on read" }
    answer: 2
    why:
      vi: "Cột generated và `CHECK` chỉ được nhìn dòng của chính nó, không được chứa truy vấn con (subquery), nên cả hai bị từ chối ngay lúc tạo. Dữ liệu dẫn xuất nằm ở bảng khác là việc của trigger, hoặc đơn giản hơn là đếm lúc đọc."
      en: "A generated column and a `CHECK` may only look at their own row and cannot hold a subquery, so both are refused at creation. Derived data in another table is a job for a trigger, or more simply, count on read."
---
## Mở bài

Bạn vừa học trigger và thấy nó làm được mọi thứ: chặn giá âm, tính tổng tiền, đếm đơn. Nhưng một trigger có thể bị tắt, chạy sai thứ tự, hoặc bỏ sót khi hai người ghi cùng lúc. Bài này giúp chọn công cụ nhẹ nhất mà vẫn đủ.

## Ý chính

Hỏi theo thứ tự. Quy tắc chỉ nhìn một dòng (giá không âm, ngày kết thúc sau ngày bắt đầu)? Dùng `CHECK`. Giá trị phải tồn tại ở bảng khác? Khóa ngoại. Không được trùng? `UNIQUE`. Không được chồng nhau (giờ đặt phòng)? `EXCLUDE`.

Nhiều người nghĩ trigger và ràng buộc bảo vệ dữ liệu như nhau. Thật ra ràng buộc là khai báo: `CHECK` và `UNIQUE` không bị tắt bằng `DISABLE TRIGGER`, ràng buộc không phụ thuộc thứ tự chạy, được kiểm cả trên dữ liệu cũ khi thêm vào, và an toàn khi hai transaction ghi cùng lúc vì `UNIQUE`, `EXCLUDE` dựa trên index. Planner còn dùng được chúng: khóa chính cho phép bỏ một `LEFT JOIN` thừa.

Giá trị tính được từ chính dòng đó (thành tiền = số lượng × đơn giá) là cột generated. `STORED` tính lúc ghi, lưu trên đĩa, tạo index được. `VIRTUAL` tính lúc đọc, không tốn chỗ, không có index; từ PostgreSQL 18 đây là mặc định khi không ghi gì. Biểu thức phải immutable và chỉ đọc dòng hiện tại.

Chỉ trigger làm được khi quy tắc vượt khỏi một dòng: ghi audit, cập nhật dữ liệu dẫn xuất ở bảng khác, hay quy tắc nhìn nhiều bảng mà không ràng buộc nào diễn đạt được.

## Ví dụ

Ràng buộc: khai báo một dòng, đọc lại từ catalog:

```sql
ALTER TABLE orders ADD CONSTRAINT orders_price_positive CHECK (unit_price > 0);
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'orders'::regclass
ORDER BY conname;
```

```sql
-- ERROR 23514: new row for relation "orders" violates check constraint "orders_price_positive"
INSERT INTO orders VALUES (4, 1, 1, 0);
```

Cột generated, một `STORED` và một mặc định:

```sql
ALTER TABLE orders
  ADD COLUMN line_total numeric(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  ADD COLUMN line_tax numeric(12,2) GENERATED ALWAYS AS (qty * unit_price * 0.1);
SELECT o.id, o.line_total, o.line_tax, a.attgenerated
FROM orders o JOIN pg_attribute a ON a.attrelid = 'orders'::regclass AND a.attname = 'line_tax'
ORDER BY o.id;
```

`attgenerated` là `v`: cột không ghi gì là VIRTUAL. Cột `line_total` có `attgenerated` là `s`.

Trigger cho dữ liệu dẫn xuất ở bảng khác:

```sql
CREATE FUNCTION count_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE customers SET order_count = order_count + 1 WHERE id = NEW.customer_id;
  RETURN NULL;
END $$;
CREATE TRIGGER orders_count AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION count_order();
INSERT INTO orders (id, customer_id, qty, unit_price) VALUES (4, 2, 1, 15.00);
SELECT c.id, c.order_count, count(o.id) AS real_count
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id ORDER BY c.id;
```

Hai cột khớp nhau, nhưng chỉ khi trigger chưa từng bị tắt và chưa ai sửa `order_count` bằng tay.

Planner dùng khóa chính để bỏ một phép nối:

```sql
EXPLAIN (COSTS OFF)
SELECT o.id, o.qty FROM orders o LEFT JOIN customers c ON c.id = o.customer_id;
```

Kế hoạch chỉ còn `Seq Scan on orders o`: `customers.id` là duy nhất và không cột nào của `customers` được dùng, nên phép nối không đổi kết quả.

## Lỗi hay gặp

```sql
-- ERROR 42P17: generation expression is not immutable
ALTER TABLE orders ADD COLUMN created_on date GENERATED ALWAYS AS (now()::date) STORED;
```

Biểu thức của cột generated phải cho cùng kết quả mỗi lần tính. Ngày tạo dòng là việc của `DEFAULT now()`.

```sql
-- ERROR 0A000: indexes on virtual generated columns are not supported
CREATE INDEX ON orders (line_tax);
```

Cần index thì khai báo cột là `STORED`, hoặc tạo index trên chính biểu thức.

## Thực hành

Ba bước: thêm một `CHECK`, một cột generated `STORED` và một ràng buộc `EXCLUDE`; sau đó là bốn câu hỏi chọn công cụ.

## Tóm tắt

- Quy tắc một dòng: `CHECK`; tham chiếu: khóa ngoại; không trùng: `UNIQUE`; không chồng nhau: `EXCLUDE`.
- Ràng buộc là khai báo, `CHECK` không tắt được bằng `DISABLE TRIGGER`, an toàn khi ghi đồng thời và planner dùng được.
- Giá trị tính từ chính dòng: cột generated; PostgreSQL 18 mặc định `VIRTUAL`, cần index thì `STORED`.
- Trigger để dành cho audit, dữ liệu ở bảng khác và quy tắc nhiều bảng.

# EN

## Opening

You have just learned triggers and they seem to do everything: block negative prices, compute totals, count orders. But a trigger can be switched off, run in the wrong order, or miss a conflict when two people write at once. This lesson helps you pick the lightest tool that is still enough.

## Key idea

Ask in order. Does the rule look at one row only (price not negative, end date after start date)? Use `CHECK`. Must the value exist in another table? A foreign key. No duplicates? `UNIQUE`. No overlaps (room booking times)? `EXCLUDE`.

Many people think triggers and constraints protect data equally well. In fact a constraint is declarative: `CHECK` and `UNIQUE` cannot be switched off with `DISABLE TRIGGER`, a constraint does not depend on firing order, is checked against existing data when it is added, and stays safe when two transactions write at once because `UNIQUE` and `EXCLUDE` work through an index. The planner can use them too: a primary key lets it drop a needless `LEFT JOIN`.

A value computed from the row itself (line total = quantity × unit price) is a generated column. `STORED` computes it on write, keeps it on disk and can be indexed. `VIRTUAL` computes it on read, takes no space and has no index; since PostgreSQL 18 it is the default when you write neither. The expression must be immutable and may only read the current row.

Only a trigger can do the job when the rule goes beyond one row: writing an audit, updating derived data in another table, or a rule across tables that no constraint can express.

## Example

A constraint: one declarative line, read back from the catalog:

```sql
ALTER TABLE orders ADD CONSTRAINT orders_price_positive CHECK (unit_price > 0);
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'orders'::regclass
ORDER BY conname;
```

```sql
-- ERROR 23514: new row for relation "orders" violates check constraint "orders_price_positive"
INSERT INTO orders VALUES (4, 1, 1, 0);
```

Generated columns, one `STORED` and one default:

```sql
ALTER TABLE orders
  ADD COLUMN line_total numeric(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  ADD COLUMN line_tax numeric(12,2) GENERATED ALWAYS AS (qty * unit_price * 0.1);
SELECT o.id, o.line_total, o.line_tax, a.attgenerated
FROM orders o JOIN pg_attribute a ON a.attrelid = 'orders'::regclass AND a.attname = 'line_tax'
ORDER BY o.id;
```

`attgenerated` is `v`: the column with no keyword is VIRTUAL. Column `line_total` has `attgenerated` `s`.

A trigger for derived data in another table:

```sql
CREATE FUNCTION count_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE customers SET order_count = order_count + 1 WHERE id = NEW.customer_id;
  RETURN NULL;
END $$;
CREATE TRIGGER orders_count AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION count_order();
INSERT INTO orders (id, customer_id, qty, unit_price) VALUES (4, 2, 1, 15.00);
SELECT c.id, c.order_count, count(o.id) AS real_count
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id ORDER BY c.id;
```

The two columns match, but only as long as the trigger was never switched off and nobody changed `order_count` by hand.

The planner uses a primary key to drop a join:

```sql
EXPLAIN (COSTS OFF)
SELECT o.id, o.qty FROM orders o LEFT JOIN customers c ON c.id = o.customer_id;
```

The plan is just `Seq Scan on orders o`: `customers.id` is unique and no column of `customers` is used, so the join cannot change the result.

## Common mistakes

```sql
-- ERROR 42P17: generation expression is not immutable
ALTER TABLE orders ADD COLUMN created_on date GENERATED ALWAYS AS (now()::date) STORED;
```

A generated column's expression must give the same result every time. The creation date of a row is a job for `DEFAULT now()`.

```sql
-- ERROR 0A000: indexes on virtual generated columns are not supported
CREATE INDEX ON orders (line_tax);
```

If you need an index, declare the column `STORED`, or index the expression itself.

## Practice

Three steps: add a `CHECK`, a `STORED` generated column and an `EXCLUDE` constraint; then four questions on choosing the tool.

## Recap

- One-row rule: `CHECK`; reference: foreign key; no duplicates: `UNIQUE`; no overlaps: `EXCLUDE`.
- Constraints are declarative, a `CHECK` cannot be switched off with `DISABLE TRIGGER`, they are safe under concurrent writes and the planner can use them.
- A value computed from the row: a generated column; PostgreSQL 18 defaults to `VIRTUAL`, use `STORED` when you need an index.
- Keep triggers for audit, data in another table and rules across tables.
