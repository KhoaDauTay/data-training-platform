---
id: e-pg-l1-11
engine: postgres
level: L1
module: first-index
title: Index giúp cả ORDER BY ... LIMIT
title_en: An index also serves ORDER BY ... LIMIT
kind: predict
runtime: browser
minutes: 9
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-index-order-limit, at: idea }]
objectives:
  - vi: Nhận ra một index B-tree đã có sẵn thứ tự, nên "N dòng mới nhất" không cần sắp xếp cả bảng.
    en: Recognise that a B-tree index is already sorted, so "the N newest rows" needs no full-table sort.
  - vi: Đọc nút `Limit` và `Index Scan Backward` trong `EXPLAIN`.
    en: Read the `Limit` and `Index Scan Backward` nodes in `EXPLAIN`.
  - vi: Viết `ORDER BY` trên chính cột có index, không sắp theo một biểu thức mà index không có.
    en: Write `ORDER BY` on the indexed column itself, not on an expression the index does not hold.
requires: [e-pg-l1-10]
sources:
  - { url: https://www.postgresql.org/docs/18/indexes-ordering.html, title_vi: "Index và ORDER BY" }
  - { url: https://www.postgresql.org/docs/18/using-explain.html, title_vi: "Dùng EXPLAIN" }
  - { url: https://www.postgresql.org/docs/18/queries-limit.html, title_vi: "LIMIT và OFFSET" }
lab:
  setup: |
    CREATE TABLE orders (
      id bigint PRIMARY KEY,
      created_at timestamptz NOT NULL,
      amount numeric(10,2) NOT NULL
    );
    INSERT INTO orders
    SELECT g, timestamptz '2026-01-01 00:00+00' + g * interval '7 minutes', (g % 300) + 0.5
    FROM generate_series(1, 20000) AS g;
    CREATE INDEX orders_created_idx ON orders (created_at);
    ANALYZE orders;
  steps:
    - task:
        vi: Lấy `id` của 3 đơn cũ nhất (theo `created_at`, cũ trước).
        en: Return the `id` of the 3 oldest orders (by `created_at`, oldest first).
      solution: SELECT id FROM orders ORDER BY created_at LIMIT 3
      check: plan
      ordered: true
      hint:
        vi: "Index `orders_created_idx` đã xếp sẵn `created_at` từ cũ tới mới: sắp theo đúng cột đó rồi giới hạn 3 dòng, Postgres đọc index theo chiều xuôi."
        en: "Index `orders_created_idx` already holds `created_at` from oldest to newest: sort by that column and limit to 3 rows, and Postgres reads the index forwards."
    - task:
        vi: "Trang \"đơn gần đây\" cần 10 đơn mới nhất: `id`, `amount`, `created_at`, mới trước (mỗi đơn có `created_at` riêng, không trùng). Bài chấm cả tốc độ: đúng mà phải sắp xếp cả bảng là chưa đạt."
        en: "The \"recent orders\" page needs the 10 newest orders: `id`, `amount`, `created_at`, newest first (each order has its own `created_at`, no ties). Speed is graded too: a right answer that sorts the whole table does not pass."
      solution: SELECT id, amount, created_at FROM orders ORDER BY created_at DESC LIMIT 10
      check: rows
      ordered: true
      perf: { table: orders }
      slow: SELECT id, amount, created_at FROM orders ORDER BY extract(epoch FROM created_at) DESC LIMIT 10
      hint:
        vi: "`ORDER BY created_at DESC LIMIT 10`, sắp theo chính cột có index."
        en: "`ORDER BY created_at DESC LIMIT 10`, sorting by the indexed column itself."
quiz:
  - q:
      vi: "Index `orders_created_idx` trên `created_at` tạo theo chiều tăng dần. Câu `ORDER BY created_at DESC LIMIT 5` cần gì để không phải sắp xếp?"
      en: "Index `orders_created_idx` on `created_at` was built ascending. What does `ORDER BY created_at DESC LIMIT 5` need to avoid a sort?"
    options:
      - { vi: "Một index thứ hai `(created_at DESC)`", en: "A second index `(created_at DESC)`" }
      - { vi: "Không cần gì thêm: Postgres đọc index đó theo chiều ngược", en: "Nothing more: Postgres reads that index backwards" }
      - { vi: "Bỏ `LIMIT`", en: "Remove the `LIMIT`" }
    answer: 1
    trap: 0
    why:
      vi: "Index thứ hai `(created_at DESC)` nghe hợp lý vì index xếp tăng còn câu hỏi muốn giảm, nhưng các trang lá (leaf page, tầng dưới cùng giữ giá trị) của B-tree nối với nhau theo cả hai chiều. Vì thế với một cột, một index tăng dần phục vụ được cả `ORDER BY created_at` lẫn `ORDER BY created_at DESC`: Postgres đọc từ cuối về đầu. Bỏ `LIMIT` không giúp gì, chỉ bắt đọc hết. Chiều `DESC` trong index chỉ quan trọng khi trộn chiều giữa nhiều cột."
      en: "A second index `(created_at DESC)` sounds right because the index is ascending and the query wants descending, but the B-tree leaf pages (the bottom level that holds the values) are linked in both directions. So for one column, a single ascending index serves both `ORDER BY created_at` and `ORDER BY created_at DESC`: Postgres reads it from the end. Removing `LIMIT` does not help, it only forces reading everything. A `DESC` index only matters when several columns mix directions."
predict:
  sql: SELECT id, created_at FROM orders ORDER BY created_at DESC LIMIT 5
  expect: { node: Index Scan, table: orders, index: orders_created_idx }
  q:
    vi: "Bảng `orders` có 20.000 dòng và index `orders_created_idx` trên `created_at`. Lấy 5 đơn mới nhất thì kế hoạch là gì?"
    en: "Table `orders` has 20,000 rows and an index `orders_created_idx` on `created_at`. What is the plan for the 5 newest orders?"
  options:
    - { vi: "Seq Scan, rồi Sort cả 20.000 dòng, rồi Limit", en: "Seq Scan, then Sort all 20,000 rows, then Limit" }
    - { vi: "Limit trên Index Scan Backward dùng `orders_created_idx`, không có Sort", en: "Limit over an Index Scan Backward using `orders_created_idx`, no Sort" }
    - { vi: "Bitmap Heap Scan, rồi Sort", en: "Bitmap Heap Scan, then Sort" }
  answer: 1
  trap: 0
  why:
    vi: "Seq Scan rồi Sort nghe hợp lý vì index xếp tăng dần còn câu hỏi `DESC`, như thể index không phục vụ được chiều ngược; nhưng trang lá của B-tree đã xếp theo `created_at` và nối với nhau theo cả hai chiều. Postgres đọc từ cuối index ngược lại, dừng sau 5 dòng (nút `Limit`), nên không cần đọc hay sắp xếp phần còn lại."
    en: "A Seq Scan then a Sort sounds right because the index is ascending while the query asks for `DESC`, as if the index could not serve the reverse order, but the B-tree leaves are already ordered by `created_at` and linked in both directions. Postgres reads from the end of the index backwards and stops after 5 rows (the `Limit` node), so it never reads or sorts the rest."
---
## Mở bài

Trang "đơn gần đây" chỉ cần 10 đơn mới nhất, nhưng bảng có 20.000 đơn. Postgres có phải sắp xếp cả 20.000 dòng chỉ để lấy 10 dòng đầu không?

## Ý chính

Index B-tree lưu khóa theo thứ tự. Vì vậy ngoài việc tìm nhanh, nó còn trả dòng đã sắp xếp sẵn. Với `ORDER BY col LIMIT n`, nếu `col` có index, Postgres đọc n mục đầu (hoặc cuối) của index rồi dừng, thay vì đọc cả bảng và sắp xếp. Nút `Limit` nằm trên cùng và cắt dòng chảy ngay khi đủ n dòng.

- `ORDER BY created_at`: `Index Scan` đọc xuôi.
- `ORDER BY created_at DESC`: `Index Scan Backward` đọc ngược. Một index tăng dần dùng được cho cả hai chiều.
- Không có index phù hợp: `Seq Scan` + `Sort` (thường là `top-N heapsort` khi có `LIMIT`).

Nhiều người nghĩ cần một index `DESC` riêng cho câu "mới nhất trước". Thật ra với một cột, Postgres đọc index tăng dần theo chiều ngược mà không tốn gì thêm.

Index chỉ giúp khi `ORDER BY` dùng đúng thứ tự mà index giữ. Sắp theo một biểu thức trên cột, như `created_at::date` hay `extract(epoch FROM created_at)`, là một thứ tự khác mà index không lưu, nên planner quay về đọc cả bảng rồi sắp xếp. Đây cũng là lý do các trang "mới nhất trước" (feed, lịch sử đơn) luôn cần index trên cột thời gian và câu sắp theo chính cột đó.

Hình từng bước ở cuối mục này cho thấy `Index Scan Backward` đọc ngược đúng 5 mục cuối của `orders_created_idx` rồi `Limit` dừng, so với cách đọc hết 20 000 dòng rồi sắp xếp.

## Ví dụ

Sắp theo một cột không có index:

```sql
EXPLAIN SELECT id FROM orders ORDER BY amount DESC LIMIT 5;
```

`amount` không có index, nên kế hoạch có `Sort` trên toàn bộ `Seq Scan`, chi phí khoảng 660.

```sql
EXPLAIN SELECT id FROM orders WHERE created_at >= timestamptz '2026-03-01 00:00+00' ORDER BY created_at LIMIT 5;
```

Một điều kiện khoảng và `ORDER BY` trên cùng cột dùng chung một `Index Scan`: tìm tới ngày 1/3 rồi đọc xuôi 5 mục, chi phí dưới 1.

```sql
EXPLAIN SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 5;
```

Thêm `id` vào sau, index vẫn giúp: kế hoạch có `Incremental Sort` với `Presorted Key: created_at`, chỉ sắp lại trong từng nhóm cùng `created_at`.

## Lỗi hay gặp

Sắp theo một biểu thức thay vì chính cột:

```sql
-- WRONG: the index holds created_at, not its date part
EXPLAIN SELECT id, created_at FROM orders ORDER BY created_at::date DESC LIMIT 5;
```

```sql
-- FIX: sort by the indexed column itself
EXPLAIN SELECT id, created_at FROM orders ORDER BY created_at DESC LIMIT 5;
```

Bản sai đọc cả bảng và sắp xếp (chi phí hơn 700), lại còn trả 5 đơn bất kỳ trong ngày cuối vì nhiều đơn cùng một ngày. Bản sửa dừng sau 5 mục của index.

## Thực hành

Đoán kế hoạch cho 5 đơn mới nhất, xem kế hoạch thật, rồi viết câu lấy 3 đơn cũ nhất đi qua cùng index. Bước cuối được chấm cả tốc độ.

## Tóm tắt

- B-tree giữ khóa theo thứ tự, nên `ORDER BY col LIMIT n` đọc n mục của index rồi dừng.
- Một index tăng dần phục vụ cả hai chiều: `Index Scan` và `Index Scan Backward`.
- Không có index phù hợp thì kế hoạch là `Seq Scan` + `Sort` trên cả bảng.
- Sắp theo biểu thức trên cột (ép kiểu, hàm) làm mất lợi thế của index.

# EN

## Opening

The "recent orders" page only needs the 10 newest orders, but the table holds 20,000. Does Postgres have to sort all 20,000 rows just to get the first 10?

## Key idea

A B-tree index stores keys in order. So besides finding values fast, it returns rows already sorted. For `ORDER BY col LIMIT n`, if `col` is indexed, Postgres reads the first (or last) n entries of the index and stops, instead of reading the whole table and sorting it. The `Limit` node sits on top and cuts the flow as soon as it has n rows.

- `ORDER BY created_at`: an `Index Scan` reads forwards.
- `ORDER BY created_at DESC`: an `Index Scan Backward` reads backwards. One ascending index serves both directions.
- No suitable index: `Seq Scan` + `Sort` (usually a `top-N heapsort` when there is a `LIMIT`).

Many people think "newest first" needs its own `DESC` index. In fact, for one column Postgres reads the ascending index backwards at no extra cost.

The index only helps when `ORDER BY` uses exactly the order the index keeps. Sorting by an expression on the column, such as `created_at::date` or `extract(epoch FROM created_at)`, is a different order the index does not store, so the planner goes back to reading the whole table and sorting. This is also why "newest first" pages (feeds, order history) always need an index on the time column and a query that sorts by that column itself.

The step-through figure at the end of this section shows `Index Scan Backward` reading exactly the last 5 entries of `orders_created_idx` before `Limit` stops, next to reading all 20,000 rows and sorting.

## Example

Sorting by a column with no index:

```sql
EXPLAIN SELECT id FROM orders ORDER BY amount DESC LIMIT 5;
```

`amount` has no index, so the plan has a `Sort` over a full `Seq Scan`, costing about 660.

```sql
EXPLAIN SELECT id FROM orders WHERE created_at >= timestamptz '2026-03-01 00:00+00' ORDER BY created_at LIMIT 5;
```

A range filter and an `ORDER BY` on the same column share one `Index Scan`: it seeks to March 1st and reads 5 entries forwards, costing under 1.

```sql
EXPLAIN SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 5;
```

With `id` added after it, the index still helps: the plan has an `Incremental Sort` with `Presorted Key: created_at`, re-sorting only within each group sharing a `created_at`.

## Common mistakes

Sorting by an expression instead of the column itself:

```sql
-- WRONG: the index holds created_at, not its date part
EXPLAIN SELECT id, created_at FROM orders ORDER BY created_at::date DESC LIMIT 5;
```

```sql
-- FIX: sort by the indexed column itself
EXPLAIN SELECT id, created_at FROM orders ORDER BY created_at DESC LIMIT 5;
```

The wrong version reads the whole table and sorts it (cost over 700), and it even returns any 5 orders of the last day, because many orders share one date. The fix stops after 5 index entries.

## Practice

Guess the plan for the 5 newest orders, see the real plan, then write the query for the 3 oldest orders through the same index. The last step is graded on speed too.

## Recap

- A B-tree keeps keys in order, so `ORDER BY col LIMIT n` reads n index entries and stops.
- One ascending index serves both directions: `Index Scan` and `Index Scan Backward`.
- With no suitable index the plan is `Seq Scan` + `Sort` over the whole table.
- Sorting by an expression on the column (a cast, a function) loses the index's advantage.
