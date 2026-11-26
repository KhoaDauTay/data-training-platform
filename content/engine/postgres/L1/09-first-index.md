---
id: e-pg-l1-09
engine: postgres
level: L1
module: first-index
title: Index B-tree đầu tiên
title_en: Your first B-tree index
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-btree
objectives:
  - vi: Tạo một index B-tree cho cột hay lọc và kiểm tra bằng `EXPLAIN` rằng Postgres dùng nó.
    en: Create a B-tree index on a column you filter often and check with `EXPLAIN` that Postgres uses it.
  - vi: Viết điều kiện để index dùng được, không bọc cột trong hàm hay phép ép kiểu.
    en: Write filters the index can use, without wrapping the column in a function or a cast.
  - vi: Biết index tăng tốc đọc nhưng làm mỗi lần ghi tốn thêm việc.
    en: Know that an index speeds up reads but adds work to every write.
requires: [e-pg-l1-08]
sources:
  - https://www.postgresql.org/docs/18/indexes-intro.html
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
  - https://www.postgresql.org/docs/18/indexes-expressional.html
  - https://www.postgresql.org/docs/18/using-explain.html
lab:
  setup: |
    SELECT setseed(0.42);
    CREATE TABLE orders (
      id bigint PRIMARY KEY,
      customer_id int NOT NULL,
      amount numeric(10,2) NOT NULL,
      created_at date NOT NULL
    );
    INSERT INTO orders
    SELECT g, 1 + (g * 7919) % 500, round((10 + random() * 990)::numeric, 2), date '2026-01-01' + (g % 300)
    FROM generate_series(1, 20000) AS g;
    ANALYZE orders;
  steps:
    - task:
        vi: Tạo index B-tree tên `orders_customer_idx` trên cột `customer_id` của bảng `orders`.
        en: Create a B-tree index named `orders_customer_idx` on column `customer_id` of table `orders`.
      solution: CREATE INDEX orders_customer_idx ON orders (customer_id)
      check: catalog
      hint:
        vi: "Cú pháp: `CREATE INDEX name ON table (column)`. B-tree là kiểu mặc định nên không cần `USING`."
        en: "Syntax: `CREATE INDEX name ON table (column)`. B-tree is the default type, so `USING` is optional."
    - task:
        vi: Lấy mọi đơn (`id`, `amount`) của khách `customer_id = 42`. Kế hoạch phải đọc bảng qua index vừa tạo.
        en: Return every order (`id`, `amount`) of customer `customer_id = 42`. The plan must read the table through the new index.
      solution: SELECT id, amount FROM orders WHERE customer_id = 42
      check: plan
      hint:
        vi: Một điều kiện bằng trên cột đã có index là đủ. Thử thêm `EXPLAIN` phía trước để xem kế hoạch.
        en: An equality filter on the indexed column is enough. Put `EXPLAIN` in front to see the plan.
    - task:
        vi: "Đếm số đơn và tổng tiền của khách 42 (hai cột, một dòng). Bài chấm cả tốc độ: đúng mà không dùng được index là chưa đạt."
        en: "Count the orders of customer 42 and sum their amounts (two columns, one row). Speed is graded too: a right answer that cannot use the index does not pass."
      solution: SELECT count(*), sum(amount) FROM orders WHERE customer_id = 42
      check: rows
      perf: { table: orders }
      slow: SELECT count(*), sum(amount) FROM orders WHERE customer_id + 0 = 42
      hint:
        vi: Dùng `count(*)` và `sum(amount)` với cùng điều kiện, để nguyên cột `customer_id` ở một vế.
        en: Use `count(*)` and `sum(amount)` with the same filter, leaving column `customer_id` bare on one side.
quiz:
  - q:
      vi: "Cột `created_at` (kiểu `date`) có index B-tree. Câu nào dùng được index đó?"
      en: "Column `created_at` (type `date`) has a B-tree index. Which filter can use that index?"
    options:
      - { vi: "`WHERE created_at::text = '2026-03-01'`", en: "`WHERE created_at::text = '2026-03-01'`" }
      - { vi: "`WHERE created_at = date '2026-03-01'`", en: "`WHERE created_at = date '2026-03-01'`" }
      - { vi: "`WHERE created_at + 0 = date '2026-03-01'`", en: "`WHERE created_at + 0 = date '2026-03-01'`" }
    answer: 1
    trap: 0
    why:
      vi: "Câu ép sang chữ nghe hợp lý vì ba câu đều ra cùng các dòng, và chữ `'2026-03-01'` trông y hệt ngày trong bảng; nhưng index lưu giá trị của chính cột `created_at`, không lưu `created_at::text` hay `created_at + 0`. Khi cột bị bọc trong phép ép kiểu hay phép tính, planner (bộ lập kế hoạch) không tra index được và phải Seq Scan: đọc lần lượt mọi dòng của bảng. Chỉ câu so cột trần với một giá trị `date` mới tra được index."
      en: "The text cast sounds right because all three return the same rows, and `'2026-03-01'` looks exactly like the date in the table, but the index stores the values of column `created_at` itself, not `created_at::text` or `created_at + 0`. Once the column is wrapped in a cast or arithmetic, the planner cannot look it up in the index and must use a Seq Scan: read every row of the table in turn. Only the filter comparing the bare column with a `date` value can use the index."
  - q:
      vi: "Bảng có 5 index. Thêm một index thứ 6 thì việc gì chậm đi?"
      en: "A table has 5 indexes. Adding a 6th one slows down what?"
    options:
      - { vi: "Không gì cả: index chỉ làm đọc nhanh hơn", en: "Nothing: an index only makes reads faster" }
      - { vi: "Mỗi `INSERT`, và mỗi `UPDATE` đổi cột được index, vì phải ghi thêm vào index", en: "Every `INSERT`, and every `UPDATE` of an indexed column, because it must also write to the index" }
      - { vi: "Mọi câu `SELECT` trên bảng", en: "Every `SELECT` on the table" }
    answer: 1
    trap: 0
    why:
      vi: "\"Không gì cả\" nghe hợp lý vì ta thường chỉ nhìn index từ phía câu đọc, nhưng index là một cấu trúc riêng phải được giữ khớp với bảng. Với 6 index, mỗi `INSERT` ghi một dòng vào bảng cộng 6 mục index, nên ghi chậm đi. Câu `SELECT` thì không chậm đi: planner chỉ dùng index nào có ích, còn lại bỏ qua. Index còn chiếm chỗ trên đĩa và trong bộ nhớ đệm."
      en: "\"Nothing\" sounds right because we usually look at an index from the reading side, but an index is a separate structure that must be kept in step with the table. With 6 indexes, each `INSERT` writes one table row plus 6 index entries, so writes slow down. A `SELECT` does not get slower: the planner uses only the indexes that help and ignores the rest. Indexes also take space on disk and in the cache."
---
## Mở bài

Bảng `orders` có 20.000 đơn, và màn hình "đơn của tôi" lọc theo khách mỗi lần có người mở. Không có gì giúp, Postgres phải đọc cả 20.000 dòng chỉ để tìm 40 dòng của một khách.

## Ý chính

Không có index, cách duy nhất để tìm dòng là đọc mọi trang của bảng (Seq Scan). Index B-tree giữ các giá trị của một cột theo thứ tự, mỗi giá trị kèm địa chỉ của dòng trong bảng. Tìm một giá trị chỉ cần đi từ gốc xuống lá, vài trang, rồi nhảy thẳng tới các dòng khớp.

B-tree là kiểu mặc định của `CREATE INDEX`. Nó dùng được cho `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL` và cho `ORDER BY`. Khi số dòng khớp vừa phải, kế hoạch thường là Bitmap Index Scan rồi Bitmap Heap Scan: gom địa chỉ từ index, sắp theo trang, rồi đọc mỗi trang một lần.

Nhiều người nghĩ đã có index thì câu nào lọc trên cột đó cũng nhanh. Thật ra index chỉ giúp khi điều kiện so sánh chính cột đó với một giá trị. Bọc cột trong hàm hay phép ép kiểu (`customer_id + 0`, `created_at::text`) làm planner không tra được index, dù kết quả vẫn đúng.

Index không miễn phí: mỗi `INSERT` và mỗi `UPDATE` cột được index đều phải ghi thêm vào index (`DELETE` để lại mục cũ cho VACUUM dọn sau). Chỉ tạo index cho câu hỏi bạn thật sự chạy thường xuyên.

## Cú pháp

```sql
CREATE [ UNIQUE ] INDEX [ IF NOT EXISTS ] index_name
  ON table_name [ USING btree ] ( column [ DESC ] [, ...] );
EXPLAIN select_query;
DROP INDEX [ IF EXISTS ] index_name;
```

- `UNIQUE`: cấm hai dòng trùng giá trị khóa.
- `IF NOT EXISTS`: bỏ qua, không báo lỗi, nếu tên đã có.
- `USING btree`: kiểu mặc định, có thể bỏ.
- `EXPLAIN`: in kế hoạch mà không chạy câu.

## Ví dụ

Chưa có index trên `customer_id`, nên tìm một khách phải đọc cả bảng:

```sql
EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
```

Kế hoạch là `Seq Scan on orders` với `Filter: (customer_id = 42)`: đọc 20.000 dòng để giữ khoảng 40.

```sql
CREATE INDEX orders_day_idx ON orders (created_at);
EXPLAIN SELECT id FROM orders WHERE created_at = date '2026-03-01';
```

Giờ kế hoạch là Bitmap Heap Scan trên Bitmap Index Scan, và dòng có chữ `orders_day_idx` cho biết planner đã chọn index.

```sql
EXPLAIN SELECT id FROM orders WHERE created_at BETWEEN date '2026-03-01' AND date '2026-03-03';
```

Một khoảng ngày cũng đi qua cùng index, vì B-tree giữ giá trị theo thứ tự.

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders' ORDER BY indexname;
```

Bảng có hai index: `orders_pkey`, tự tạo cho khóa chính, và `orders_day_idx` vừa tạo.

## Lỗi hay gặp

Ép kiểu cột để so với một chuỗi:

```sql
-- WRONG: the cast hides the column from the index
EXPLAIN SELECT id FROM orders WHERE created_at::text = '2026-03-01';
```

```sql
-- FIX: compare the bare column with a date
EXPLAIN SELECT id FROM orders WHERE created_at = date '2026-03-01';
```

Bản sai ra `Seq Scan` dù kết quả đúng; bản sửa dùng `orders_day_idx`. Phép tính như `created_at + 0` cũng gây ra đúng chuyện này.

Tạo trùng tên index:

```sql
-- ERROR 42P07: relation "orders_day_idx" already exists
CREATE INDEX orders_day_idx ON orders (created_at);
```

Index là một quan hệ (relation) trong schema, nên tên không được trùng với bảng hay index khác. Dùng `IF NOT EXISTS` khi chạy lại một script.

## Thực hành

Bảng `orders` có 20.000 dòng, 500 khách. Tạo index cho `customer_id`, xem câu lọc theo khách đổi kế hoạch thế nào, rồi viết một câu tổng hợp đủ nhanh; sau đó trả lời hai câu hỏi.

## Tóm tắt

- Không có index, Postgres đọc cả bảng (Seq Scan) để tìm vài dòng.
- B-tree giữ giá trị theo thứ tự: dùng cho `=`, khoảng, `IN` và `ORDER BY`.
- Để nguyên cột ở một vế điều kiện; hàm hay phép ép kiểu trên cột làm mất index.
- Mỗi index làm `INSERT` và `UPDATE` chậm thêm: chỉ tạo cho câu hỏi chạy thường xuyên.

# EN

## Opening

Table `orders` has 20,000 orders, and the "my orders" screen filters by customer every time someone opens it. With nothing to help, Postgres has to read all 20,000 rows just to find one customer's 40.

## Key idea

Without an index, the only way to find rows is to read every page of the table (Seq Scan). A B-tree index keeps a column's values in order, each with the address of its row in the table. Looking up a value walks from the root down to a leaf, a few pages, and then jumps straight to the matching rows.

B-tree is the default type of `CREATE INDEX`. It serves `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL` and `ORDER BY`. When a moderate number of rows match, the plan is often a Bitmap Index Scan then a Bitmap Heap Scan: collect addresses from the index, sort them by page, then read each page once.

Many people think that once a column has an index, any filter on it is fast. In fact the index only helps when the filter compares the column itself with a value. Wrapping the column in a function or a cast (`customer_id + 0`, `created_at::text`) stops the planner from using the index, even though the result is still right.

An index is not free: every `INSERT` and every `UPDATE` of an indexed column must also write to the index (`DELETE` leaves the old entry for VACUUM to clean up later). Only index what you really query often.

## Syntax

```sql
CREATE [ UNIQUE ] INDEX [ IF NOT EXISTS ] index_name
  ON table_name [ USING btree ] ( column [ DESC ] [, ...] );
EXPLAIN select_query;
DROP INDEX [ IF EXISTS ] index_name;
```

- `UNIQUE`: forbids two rows with the same key value.
- `IF NOT EXISTS`: skips, without an error, when the name is taken.
- `USING btree`: the default type, may be left out.
- `EXPLAIN`: prints the plan without running the query.

## Example

There is no index on `customer_id` yet, so finding one customer reads the whole table:

```sql
EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
```

The plan is `Seq Scan on orders` with `Filter: (customer_id = 42)`: it reads 20,000 rows to keep about 40.

```sql
CREATE INDEX orders_day_idx ON orders (created_at);
EXPLAIN SELECT id FROM orders WHERE created_at = date '2026-03-01';
```

Now the plan is a Bitmap Heap Scan over a Bitmap Index Scan, and the line mentioning `orders_day_idx` shows the planner chose the index.

```sql
EXPLAIN SELECT id FROM orders WHERE created_at BETWEEN date '2026-03-01' AND date '2026-03-03';
```

A date range goes through the same index too, because a B-tree keeps values in order.

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders' ORDER BY indexname;
```

The table has two indexes: `orders_pkey`, created automatically for the primary key, and the new `orders_day_idx`.

## Common mistakes

Casting the column to compare it with a string:

```sql
-- WRONG: the cast hides the column from the index
EXPLAIN SELECT id FROM orders WHERE created_at::text = '2026-03-01';
```

```sql
-- FIX: compare the bare column with a date
EXPLAIN SELECT id FROM orders WHERE created_at = date '2026-03-01';
```

The wrong version gets a `Seq Scan` even though its result is right; the fix uses `orders_day_idx`. Arithmetic such as `created_at + 0` causes exactly the same thing.

Creating an index with a name that is taken:

```sql
-- ERROR 42P07: relation "orders_day_idx" already exists
CREATE INDEX orders_day_idx ON orders (created_at);
```

An index is a relation in the schema, so its name cannot clash with another table or index. Use `IF NOT EXISTS` when a script may run again.

## Practice

Table `orders` has 20,000 rows and 500 customers. Index `customer_id`, see how the plan of a per-customer query changes, then write a summary query that is fast enough; after that, answer two questions.

## Recap

- Without an index, Postgres reads the whole table (Seq Scan) to find a few rows.
- A B-tree keeps values in order: it serves `=`, ranges, `IN` and `ORDER BY`.
- Keep the column bare on one side of the filter; a function or cast on it loses the index.
- Every index slows `INSERT` and `UPDATE` a little: create one only for queries you run often.
