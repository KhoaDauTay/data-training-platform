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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-btree
objectives:
  - vi: Đặt thứ tự cột của index nhiều cột theo cách câu hỏi lọc dữ liệu.
    en: Order the columns of a multicolumn index the way your queries filter.
  - vi: Biết Postgres 18 có skip scan, dùng được index khi thiếu điều kiện trên cột đầu nếu cột đó ít giá trị.
    en: Know that Postgres 18 has skip scan, which can use an index without a condition on the leading column when that column has few values.
  - vi: Đọc `Index Searches` trong `EXPLAIN ANALYZE` để biết index được tra bao nhiêu lần.
    en: Read `Index Searches` in `EXPLAIN ANALYZE` to see how many times the index was searched.
requires: [e-pg-l1-12]
sources:
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
  - https://www.postgresql.org/docs/18/using-explain.html
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
        vi: "Lấy `id, day` của các sự kiện vùng 2 từ 2026-06-01 tới 2026-06-07, chỉ sắp theo `day` (trong cùng một ngày, thứ tự nào cũng được). Kế hoạch phải dùng `events_region_day_idx`."
        en: "Return `id, day` of region 2 events from 2026-06-01 to 2026-06-07, ordered by `day` only (within one day, any order is fine). The plan must use `events_region_day_idx`."
      solution: SELECT id, day FROM events WHERE region = 2 AND day BETWEEN date '2026-06-01' AND date '2026-06-07' ORDER BY day
      check: plan
      ordered: true
      hint:
        vi: "Điều kiện bằng trên cột đầu (`region = 2`), điều kiện khoảng trên cột thứ hai: đúng kiểu index này phục vụ tốt nhất."
        en: "An equality on the leading column (`region = 2`) and a range on the second: exactly what this index serves best."
quiz:
  - q:
      vi: "Một bảng khác có index `(customer_id, day)`, và `customer_id` có 5.000 giá trị khác nhau. Câu chỉ lọc `WHERE day = date '2026-06-15'`. Postgres 18 thường làm gì?"
      en: "Another table has an index on `(customer_id, day)`, and `customer_id` has 5,000 distinct values. A query filters only `WHERE day = date '2026-06-15'`. What does Postgres 18 usually do?"
    options:
      - { vi: "Skip scan qua index: từ bản 18, thiếu cột đầu không còn là vấn đề", en: "A skip scan through the index: since version 18 a missing leading column is no problem" }
      - { vi: "Seq Scan: phải tra index 5.000 lần, đắt hơn đọc cả bảng", en: "A Seq Scan: searching the index 5,000 times costs more than reading the table" }
      - { vi: "Báo lỗi vì thiếu điều kiện trên cột đầu", en: "An error, because the leading column has no condition" }
    answer: 1
    trap: 0
    why:
      vi: "Skip scan nghe hợp lý vì nó là điểm mới của Postgres 18, nhưng mỗi giá trị của cột đầu `customer_id` là một lần tra từ gốc xuống lá: 5.000 giá trị là 5.000 lần tra, nên planner tính Seq Scan rẻ hơn. Skip scan chỉ rẻ khi cột đầu có ít giá trị, như 4 vùng trong bài này. Câu cũng không báo lỗi: index chỉ là một đường đọc tùy chọn, planner luôn còn cách quét cả bảng."
      en: "Skip scan sounds right because it is new in Postgres 18, but each value of the leading column `customer_id` is one descent from the root to a leaf: 5,000 values means 5,000 searches, so the planner finds a Seq Scan cheaper. Skip scan is only cheap when the leading column has few values, like the 4 regions in this lesson. The query does not fail either: an index is only an optional way to read, and the planner can always scan the whole table."
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
  trap: 0
  why:
    vi: "Seq Scan nghe hợp lý vì quy tắc quen của B-tree: thiếu điều kiện trên cột đầu thì index gần như vô dụng. Nhưng từ Postgres 18, B-tree có skip scan: với mỗi giá trị của `region` (chỉ 4), nó tra `region = N AND day = ...` rồi nhảy sang giá trị kế, nên vài lần tra thay cho việc đọc cả 30.000 dòng. Kế hoạch là Bitmap Index Scan trên `events_region_day_idx` với `Index Cond: (day = ...)`; `EXPLAIN ANALYZE` ghi `Index Searches: 6`, tức 4 vùng cộng vài lần tra để tìm giá trị `region` kế tiếp. Không có Index Only Scan vì câu cần `amount`, cột này không nằm trong index."
    en: "A Seq Scan sounds right because of the familiar B-tree rule: without a condition on the leading column the index is nearly useless. But since Postgres 18, B-tree has skip scan: for each value of `region` (only 4) it looks up `region = N AND day = ...` and then jumps to the next value, so a few searches replace reading all 30,000 rows. The plan is a Bitmap Index Scan on `events_region_day_idx` with `Index Cond: (day = ...)`; `EXPLAIN ANALYZE` reports `Index Searches: 6`, that is the 4 regions plus a few searches to find the next `region` value. There is no Index Only Scan because the query needs `amount`, which is not in the index."
---
## Mở bài

Báo cáo lọc sự kiện theo vùng rồi theo ngày, và bảng đã có index `(region, day)`. Hôm nay có người hỏi chỉ theo ngày, không nhắc tới vùng. Index cũ còn giúp được gì không, hay phải tạo thêm một index nữa?

## Ý chính

Index (chỉ mục) nhiều cột `(a, b)` xếp khóa theo `a` trước, rồi theo `b` trong cùng một `a`, như danh bạ xếp theo họ rồi tên. Điều kiện bằng trên các cột đầu, cộng với điều kiện khoảng trên cột đầu tiên không có điều kiện bằng, giới hạn đoạn index phải đọc. Điều kiện trên các cột sau đó vẫn được kiểm ngay trong index, nên tiết kiệm lần ghé bảng, nhưng không chắc thu hẹp được đoạn đọc.

Vì vậy quy tắc thiết kế là: cột lọc bằng đặt trước, cột lọc khoảng hoặc cột sắp xếp đặt sau. `WHERE a = 1 AND b > 5` là trường hợp đẹp nhất: một đoạn liền. Trước Postgres 18, `WHERE b = 5` một mình thường buộc phải đọc cả index hoặc cả bảng.

Nhiều người nghĩ thiếu điều kiện trên cột đầu thì index vô dụng. Thật ra Postgres 18 thêm skip scan: nếu cột đầu có ít giá trị, B-tree tự sinh điều kiện `a = N` cho từng N, tra `a = N AND b = 5`, rồi nhảy sang giá trị kế, bỏ qua phần lá không thể khớp. Cách này cũng áp dụng khi cột đầu chỉ có điều kiện khoảng, như `a > 1 AND b = 5`.

Skip scan không miễn phí: mỗi giá trị của cột đầu là một lần tra từ gốc. Cột đầu có hàng nghìn giá trị thì planner quay về Seq Scan. `EXPLAIN ANALYZE` cho thấy số lần tra ở dòng `Index Searches`.

## Ví dụ

Cả hai cột đều có điều kiện bằng:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id FROM events WHERE region = 2 AND day = date '2026-06-15';
```

`Index Cond` chứa cả `region` và `day`, và `Index Searches: 1`: một lần đi từ gốc xuống lá là đủ.

## Thực hành

Đoán kế hoạch khi thiếu điều kiện trên cột đầu, bấm xem kế hoạch thật, rồi viết một câu dùng đúng thứ tự cột: bằng trên `region`, khoảng trên `day`.

## Tóm tắt

- Index `(a, b)` xếp theo `a` trước, rồi `b` trong cùng `a`.
- Đặt cột lọc bằng trước, cột khoảng hoặc sắp xếp sau.
- Postgres 18 có skip scan: thiếu điều kiện trên cột đầu vẫn dùng được index nếu cột đó ít giá trị.
- Cột đầu nhiều giá trị thì skip scan đắt, planner chọn Seq Scan; xem `Index Searches` để biết.

# EN

## Opening

A report filters events by region and then by day, and the table already has an index on `(region, day)`. Today someone asks by day only, with no region. Can the old index still help, or do you need another one?

## Key idea

A multicolumn index `(a, b)` orders keys by `a` first, then by `b` within the same `a`, like a phone book sorted by surname then first name. Equality conditions on the leading columns, plus a range condition on the first column without an equality, limit the part of the index that is read. Conditions on later columns are still checked inside the index, which saves visits to the table, but they do not necessarily narrow the part that is read.

So the design rule is: equality columns first, range or sort columns after. `WHERE a = 1 AND b > 5` is the best case: one contiguous stretch. Before Postgres 18, `WHERE b = 5` alone usually meant reading the whole index or the whole table.

Many people think an index is useless without a condition on its leading column. In fact Postgres 18 adds skip scan: if the leading column has few values, the B-tree generates a condition `a = N` for each N, looks up `a = N AND b = 5`, then jumps to the next value, skipping leaf pages that cannot match. This also works when the leading column only has a range, such as `a > 1 AND b = 5`.

Skip scan is not free: each value of the leading column is one more search from the root. With thousands of values in the leading column, the planner falls back to a Seq Scan. `EXPLAIN ANALYZE` shows the number of searches on the `Index Searches` line.

## Example

Both columns have an equality:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id FROM events WHERE region = 2 AND day = date '2026-06-15';
```

The `Index Cond` holds both `region` and `day`, and `Index Searches: 1`: one trip from the root to a leaf is enough.

## Practice

Guess the plan when the leading column has no condition, look at the real plan, then write a query that uses the columns in the right order: equality on `region`, range on `day`.

## Recap

- An index on `(a, b)` sorts by `a` first, then by `b` within the same `a`.
- Put equality columns first, range or sort columns after.
- Postgres 18 has skip scan: the index still works without a condition on the leading column if that column has few values.
- With many values in the leading column skip scan is costly and the planner picks a Seq Scan; check `Index Searches`.
