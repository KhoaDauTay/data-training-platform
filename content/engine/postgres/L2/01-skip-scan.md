---
id: e-pg-l2-01
engine: postgres
level: L2
module: btree-multi
title: "Index nhiều cột: luật cột đầu và skip scan"
title_en: "Multicolumn indexes: the leading-column rule and skip scan"
kind: predict
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-btree
objectives:
  - vi: Đặt thứ tự cột của index nhiều cột theo cách câu hỏi lọc dữ liệu.
    en: Order the columns of a multicolumn index the way your queries filter.
  - vi: Biết Postgres 18 có skip scan, dùng được index khi thiếu điều kiện trên cột đầu nếu cột đó ít giá trị.
    en: Know that Postgres 18 has skip scan, which can use an index without a condition on the leading column when that column has few values.
requires: [e-pg-l1-12]
sources:
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
  - https://www.postgresql.org/docs/18/release-18.html
lab:
  setup: |
    CREATE TABLE events (
      id int PRIMARY KEY,
      region int NOT NULL,
      day date NOT NULL,
      amount int NOT NULL
    );
    INSERT INTO events
    SELECT g, 1 + g % 4, date '2026-01-01' + (g % 365), g % 1000
    FROM generate_series(1, 30000) AS g;
    CREATE INDEX events_region_day_idx ON events (region, day);
    ANALYZE events;
  steps:
    - task:
        vi: "Lấy `id, day` của các sự kiện vùng 2 từ 2026-06-01 tới 2026-06-07, sắp theo `day`. Kế hoạch phải dùng `events_region_day_idx`."
        en: "Return `id, day` of region 2 events from 2026-06-01 to 2026-06-07, ordered by `day`. The plan must use `events_region_day_idx`."
      solution: SELECT id, day FROM events WHERE region = 2 AND day BETWEEN date '2026-06-01' AND date '2026-06-07' ORDER BY day
      check: plan
      ordered: true
      hint:
        vi: "Điều kiện bằng trên cột đầu (`region = 2`), điều kiện khoảng trên cột thứ hai: đúng kiểu index này phục vụ tốt nhất."
        en: "An equality on the leading column (`region = 2`) and a range on the second: exactly what this index serves best."
predict:
  sql: SELECT id, amount FROM events WHERE day = date '2026-06-15'
  expect: { node: Bitmap Index Scan, index: events_region_day_idx }
  q:
    vi: "Index là `(region, day)`, nhưng câu chỉ lọc theo `day`. `region` chỉ có 4 giá trị. Postgres 18 làm gì?"
    en: "The index is `(region, day)`, but the query filters only on `day`. `region` has just 4 values. What does Postgres 18 do?"
  options:
    - { vi: "Seq Scan: thiếu điều kiện trên cột đầu thì index vô dụng", en: "Seq Scan: without a condition on the leading column the index is useless" }
    - { vi: "Dùng `events_region_day_idx`, nhảy qua từng giá trị của `region` (skip scan)", en: "Uses `events_region_day_idx`, skipping through each value of `region` (skip scan)" }
    - { vi: "Index Only Scan", en: "Index Only Scan" }
  answer: 1
  why:
    vi: "Từ Postgres 18, B-tree có skip scan: với mỗi giá trị của `region` (chỉ 4), nó tra `region = N AND day = ...` rồi nhảy sang giá trị kế. Kế hoạch là Bitmap Heap Scan với `Index Cond: (day = ...)` trên `events_region_day_idx`. Nếu `region` có hàng nghìn giá trị thì cách này không còn rẻ và planner quay về Seq Scan."
    en: "Since Postgres 18, B-tree has skip scan: for each value of `region` (only 4) it looks up `region = N AND day = ...` and then jumps to the next value. The plan is a Bitmap Heap Scan with `Index Cond: (day = ...)` on `events_region_day_idx`. If `region` had thousands of values this would no longer be cheap and the planner would fall back to a Seq Scan."
---
## Ý chính

Index (chỉ mục) nhiều cột `(a, b)` xếp khóa theo `a` trước, rồi theo `b` trong cùng một `a`, như danh bạ xếp theo họ rồi tên. Docs chính thức ghi: các điều kiện bằng trên những cột đầu, cộng với điều kiện khoảng trên cột đầu tiên không có điều kiện bằng, sẽ giới hạn phần index phải quét.

- `WHERE a = 1 AND b > 5`: tốt nhất, quét một đoạn liền.
- `WHERE a > 1 AND b = 5`: chỉ `a > 1` giới hạn đoạn quét; `b = 5` được kiểm trong index.
- `WHERE b = 5`: trước Postgres 18 thường phải quét cả index hoặc cả bảng.

Postgres 18 thêm skip scan: nếu cột đầu có ít giá trị, B-tree tra lặp lại `a = N AND b = 5` cho từng N và bỏ qua phần lá không thể khớp.

## Ví dụ

```sql
EXPLAIN SELECT id FROM events WHERE region = 2 AND day = date '2026-06-15';
```

Cả hai cột đều có điều kiện bằng, nên `Index Cond` chứa cả `region` và `day`.

## Thực hành

Quy tắc thiết kế vẫn giữ: cột lọc bằng đặt trước, cột lọc khoảng hoặc sắp xếp đặt sau. Đoán kế hoạch khi thiếu điều kiện trên cột đầu, xem kế hoạch thật, rồi viết một câu dùng đúng thứ tự cột.

# EN

## Key idea

A multicolumn index `(a, b)` orders keys by `a` first, then by `b` within the same `a`, like a phone book sorted by surname then first name. The official docs state: equality conditions on the leading columns, plus a range condition on the first column without an equality, limit the part of the index that is scanned.

- `WHERE a = 1 AND b > 5`: best case, one contiguous range is scanned.
- `WHERE a > 1 AND b = 5`: only `a > 1` limits the scan; `b = 5` is checked inside the index.
- `WHERE b = 5`: before Postgres 18 this usually meant scanning the whole index or the whole table.

Postgres 18 adds skip scan: if the leading column has few values, the B-tree repeats the lookup `a = N AND b = 5` for each N and skips leaf pages that cannot match.

## Example

```sql
EXPLAIN SELECT id FROM events WHERE region = 2 AND day = date '2026-06-15';
```

Both columns have an equality, so the `Index Cond` holds both `region` and `day`.

## Practice

The design rule still holds: equality columns first, range or sort columns after. Guess the plan when the leading column has no condition, see the real plan, then write a query that uses the columns in the right order.
