---
id: e-pg-l1-11
engine: postgres
level: L1
module: first-index
title: Index giúp cả ORDER BY ... LIMIT
title_en: An index also serves ORDER BY ... LIMIT
kind: predict
runtime: browser
minutes: 7
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Nhận ra một index B-tree đã có sẵn thứ tự, nên "N dòng mới nhất" không cần sắp xếp cả bảng.
    en: Recognise that a B-tree index is already sorted, so "the N newest rows" needs no full-table sort.
  - vi: Đọc nút `Limit` và `Index Scan Backward` trong `EXPLAIN`.
    en: Read the `Limit` and `Index Scan Backward` nodes in `EXPLAIN`.
requires: [e-pg-l1-10]
sources:
  - https://www.postgresql.org/docs/18/indexes-ordering.html
  - https://www.postgresql.org/docs/18/using-explain.html
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
        vi: Cùng index, lần này đọc theo chiều xuôi.
        en: Same index, read forwards this time.
predict:
  sql: SELECT id, created_at FROM orders ORDER BY created_at DESC LIMIT 5
  expect: { node: Index Scan, table: orders, index: orders_created_idx }
  q:
    vi: "Bảng `orders` có 20 000 dòng và index `orders_created_idx` trên `created_at`. Lấy 5 đơn mới nhất thì kế hoạch là gì?"
    en: "Table `orders` has 20,000 rows and an index `orders_created_idx` on `created_at`. What is the plan for the 5 newest orders?"
  options:
    - { vi: "Seq Scan, rồi Sort cả 20 000 dòng, rồi Limit", en: "Seq Scan, then Sort all 20,000 rows, then Limit" }
    - { vi: "Limit trên Index Scan Backward dùng `orders_created_idx`, không có Sort", en: "Limit over an Index Scan Backward using `orders_created_idx`, no Sort" }
    - { vi: "Bitmap Heap Scan, rồi Sort", en: "Bitmap Heap Scan, then Sort" }
  answer: 1
  why:
    vi: "Lá của B-tree đã xếp theo `created_at` và nối với nhau theo cả hai chiều. Postgres đọc từ cuối index ngược lại, dừng sau 5 dòng (nút `Limit`), nên không cần đọc hay sắp xếp phần còn lại."
    en: "The B-tree leaves are already ordered by `created_at` and linked in both directions. Postgres reads from the end of the index backwards and stops after 5 rows (the `Limit` node), so it never reads or sorts the rest."
---
## Ý chính

Index B-tree lưu khóa theo thứ tự. Vì vậy ngoài việc tìm nhanh, nó còn trả dòng đã sắp xếp sẵn. Với `ORDER BY col LIMIT n`, nếu `col` có index, Postgres đọc n mục đầu (hoặc cuối) của index rồi dừng, thay vì đọc cả bảng và sắp xếp.

- `ORDER BY created_at`: `Index Scan` đọc xuôi.
- `ORDER BY created_at DESC`: `Index Scan Backward` đọc ngược. Một index tăng dần dùng được cho cả hai chiều.
- Không có index phù hợp: `Seq Scan` + `Sort` (thường là `top-N heapsort` khi có `LIMIT`).

Đây là lý do các trang "mới nhất trước" (feed, lịch sử đơn) luôn cần index trên cột thời gian.

## Ví dụ

```sql
EXPLAIN SELECT id FROM orders ORDER BY amount DESC LIMIT 5;
```

`amount` không có index, nên kế hoạch có `Sort` trên toàn bộ `Seq Scan`.

## Thực hành

Đoán kế hoạch cho 5 đơn mới nhất, xem kế hoạch thật, rồi viết câu lấy 3 đơn cũ nhất đi qua cùng index.

# EN

## Key idea

A B-tree index stores keys in order. So besides finding values fast, it returns rows already sorted. For `ORDER BY col LIMIT n`, if `col` is indexed, Postgres reads the first (or last) n entries of the index and stops, instead of reading the whole table and sorting it.

- `ORDER BY created_at`: an `Index Scan` reads forwards.
- `ORDER BY created_at DESC`: an `Index Scan Backward` reads backwards. One ascending index serves both directions.
- No suitable index: `Seq Scan` + `Sort` (usually a `top-N heapsort` when there is a `LIMIT`).

This is why "newest first" pages (feeds, order history) always need an index on the time column.

## Example

```sql
EXPLAIN SELECT id FROM orders ORDER BY amount DESC LIMIT 5;
```

`amount` has no index, so the plan has a `Sort` over a full `Seq Scan`.

## Practice

Guess the plan for the 5 newest orders, see the real plan, then write the query for the 3 oldest orders through the same index.
