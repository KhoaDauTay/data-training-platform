---
id: conditional_agg
title: "Gộp có điều kiện: FILTER và SUM(CASE …)"
title_en: "Conditional aggregates: FILTER and SUM(CASE …)"
minutes: 25
figures: [{ name: sql-case-buckets, at: idea, variant: filter }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đếm hay cộng nhiều nhóm con trong cùng một dòng kết quả, như số đơn online và tại quầy.
    en: Count or sum several sub-groups on one result row, such as online and in-store orders.
  - vi: Tính tỉ lệ phần trăm từ hai số đếm mà không bị cắt phần lẻ.
    en: Compute a percentage from two counts without losing the fraction.
  - vi: Giữ đủ mọi nhóm, kể cả nhóm có số đếm bằng 0.
    en: Keep every group, including those whose count is 0.
syntax: |-
  SELECT group_column,
         count(*) FILTER (WHERE condition) AS matching,
         sum(CASE WHEN condition THEN 1 ELSE 0 END) AS same_thing,
         count(*) AS total
  FROM table_name
  GROUP BY group_column
options:
  - { code: "count(*) FILTER (WHERE c)", vi: "đếm chỉ những dòng thỏa c (riêng Postgres, gọn nhất)", en: "counts only the rows passing c (Postgres, the shortest)" }
  - { code: "sum(CASE WHEN c THEN 1 ELSE 0 END)", vi: "cùng kết quả, chạy trên mọi hệ SQL", en: "the same result, works on every SQL system" }
  - { code: "sum(x) FILTER (WHERE c)", vi: "cộng `x` chỉ trên dòng thỏa c", en: "sums `x` only over the rows passing c" }
  - { code: "100.0 * a / b", vi: "tỉ lệ phần trăm; `100.0` tránh chia số nguyên", en: "a percentage; `100.0` avoids integer division" }
examples:
  - title: { vi: "Đơn hủy trên tổng số đơn", en: "Cancelled orders out of all orders" }
    sql: |-
      SELECT count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled, count(*) AS total
      FROM orders
      WHERE order_date >= '2026-10-01'
    read:
      vi: "10 đơn hủy trong 217 đơn tháng 10, trên cùng một dòng. Một `WHERE` cho cả câu, và một `FILTER` riêng cho từng cột."
      en: "10 cancelled out of 217 October orders, on one row. One `WHERE` for the whole query, and a `FILTER` of its own for each column."
  - title: { vi: "Hai kênh thành hai cột", en: "Two channels as two columns" }
    sql: |-
      SELECT store_id,
             count(*) FILTER (WHERE channel = 'ONLINE') AS online,
             count(*) FILTER (WHERE channel = 'STORE') AS in_store
      FROM orders
      WHERE order_date >= '2026-10-01'
      GROUP BY store_id
      ORDER BY store_id
    read:
      vi: "5 dòng, mỗi cửa hàng một dòng với hai cột: cửa hàng 3 có 24 đơn online và 52 đơn tại quầy. So với `GROUP BY store_id, channel` (10 dòng), bảng này dễ đọc ngang hơn."
      en: "5 rows, one per store, with two columns: store 3 had 24 online and 52 in-store orders. Compared with `GROUP BY store_id, channel` (10 rows), this reads across more easily."
  - title: { vi: "Tỉ lệ hủy mỗi cửa hàng", en: "Cancellation rate per store" }
    sql: |-
      SELECT store_id,
             round(100.0 * count(*) FILTER (WHERE status = 'CANCELLED') / count(*), 1) AS cancel_pct
      FROM orders
      GROUP BY store_id
      ORDER BY store_id
    read:
      vi: "Từ 5,4% (cửa hàng 3) tới 7,9% (cửa hàng 2). Nhân với `100.0` trước khi chia để phép chia giữ phần lẻ, rồi làm tròn một chữ số."
      en: "From 5.4% (store 3) to 7.9% (store 2). Multiply by `100.0` before dividing so the division keeps the fraction, then round to one decimal."
  - title: { vi: "Cách viết chạy ở mọi hệ", en: "The spelling that runs everywhere" }
    sql: |-
      SELECT sum(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid,
             sum(CASE WHEN status = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded
      FROM orders
      WHERE order_date >= '2026-10-01'
    read:
      vi: "200 đơn đã trả, 7 đơn hoàn tiền. `CASE` cho 1 hoặc 0 mỗi dòng, `sum` cộng chúng lại: cùng ý với `FILTER`."
      en: "200 paid orders, 7 refunded. `CASE` gives 1 or 0 per row and `sum` adds them up: the same idea as `FILTER`."
  - title: { vi: "Đếm người khác nhau có điều kiện", en: "Counting different people with a condition" }
    sql: |-
      SELECT event, count(DISTINCT user_id) FILTER (WHERE ts >= '2026-10-01') AS users_oct
      FROM app_events
      GROUP BY event
      ORDER BY 2 DESC
    read:
      vi: "Tháng 10: 200 người xem hàng, 118 cho vào giỏ, 76 tới bước thanh toán, 64 trả tiền. `FILTER` gắn được vào mọi hàm gộp, kể cả `count(DISTINCT …)`."
      en: "October: 200 people viewed, 118 added to cart, 76 reached checkout, 64 paid. `FILTER` attaches to any aggregate, `count(DISTINCT …)` included."
pitfalls:
  - title: { vi: "Tỉ lệ bằng phép chia số nguyên", en: "A ratio by integer division" }
    wrong: "SELECT store_id, 100 * count(*) FILTER (WHERE status = 'CANCELLED') / count(*) AS cancel_pct FROM orders GROUP BY store_id ORDER BY store_id"
    fix: "SELECT store_id, round(100.0 * count(*) FILTER (WHERE status = 'CANCELLED') / count(*), 1) AS cancel_pct FROM orders GROUP BY store_id ORDER BY store_id"
    why:
      vi: "`count` trả số nguyên, nên `100 * … / …` cắt phần lẻ: 7,9% thành 7, và hai cửa hàng khác nhau trông như bằng nhau. Dùng `100.0`."
      en: "`count` returns whole numbers, so `100 * … / …` drops the fraction: 7.9% becomes 7, and two different stores look equal. Use `100.0`."
  - title: { vi: "count(CASE …) đếm cả số 0", en: "count(CASE …) counts the zeros too" }
    wrong: "SELECT count(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid FROM orders WHERE order_date >= '2026-10-01'"
    fix: "SELECT count(*) FILTER (WHERE status = 'PAID') AS paid FROM orders WHERE order_date >= '2026-10-01'"
    why:
      vi: "`count` đếm mọi giá trị không NULL, và 0 không phải NULL: câu sai ra 217 (mọi đơn) thay vì 200. Với 1/0 thì dùng `sum`; với `count` thì bỏ `ELSE` (để thành NULL), hoặc dùng `FILTER`."
      en: "`count` counts every non-NULL value, and 0 is not NULL: the wrong query gives 217 (every order) instead of 200. With 1/0 use `sum`; with `count` drop the `ELSE` (so it becomes NULL), or use `FILTER`."
  - title: { vi: "Lọc bằng WHERE làm mất nhóm bằng 0", en: "Filtering in WHERE loses the zero groups" }
    wrong: "SELECT store_id, count(*) AS cancelled FROM orders WHERE order_date >= '2026-10-01' AND status = 'CANCELLED' GROUP BY store_id"
    fix: "SELECT store_id, count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled FROM orders WHERE order_date >= '2026-10-01' GROUP BY store_id"
    why:
      vi: "Một cửa hàng không có đơn hủy nào trong tháng 10, nên sau `WHERE` nó không còn dòng nào và biến khỏi kết quả (4 dòng). Với `FILTER`, nó vẫn có mặt với số 0 (5 dòng)."
      en: "One store had no cancelled order in October, so after `WHERE` it has no rows left and vanishes from the result (4 rows). With `FILTER` it stays, with a 0 (5 rows)."
quiz:
  - q:
      vi: "`count(CASE WHEN x THEN 1 END)` (không có `ELSE`) đếm gì?"
      en: "What does `count(CASE WHEN x THEN 1 END)` (no `ELSE`) count?"
    options:
      - { vi: "Mọi dòng", en: "Every row" }
      - { vi: "Chỉ dòng thỏa x, vì dòng khác ra NULL và `count` bỏ NULL", en: "Only the rows passing x, because the others give NULL and `count` skips NULL" }
      - { vi: "Báo lỗi vì thiếu `ELSE`", en: "An error, because the `ELSE` is missing" }
    answer: 1
    trap: 0
    why:
      vi: "Sau bẫy `count(CASE … ELSE 0 END)`, dễ nghĩ mọi `count(CASE …)` đều đếm hết. Điểm mấu chốt là NULL: không có `ELSE`, dòng không thỏa cho NULL, và `count` không đếm NULL."
      en: "After the `count(CASE … ELSE 0 END)` trap, it is easy to think every `count(CASE …)` counts everything. The key is NULL: with no `ELSE`, failing rows give NULL, and `count` does not count NULL."
  - q:
      vi: "Khác nhau giữa `WHERE status = 'PAID'` và `count(*) FILTER (WHERE status = 'PAID')` là gì?"
      en: "What is the difference between `WHERE status = 'PAID'` and `count(*) FILTER (WHERE status = 'PAID')`?"
    options:
      - { vi: "Không khác: `FILTER` chỉ là cách viết khác của `WHERE`", en: "None: `FILTER` is just another way to write `WHERE`" }
      - { vi: "`WHERE` bỏ dòng khỏi mọi cột và mọi nhóm; `FILTER` chỉ áp cho một hàm gộp", en: "`WHERE` removes rows from every column and group; `FILTER` only applies to one aggregate" }
      - { vi: "`FILTER` chạy trước `WHERE`", en: "`FILTER` runs before `WHERE`" }
    answer: 1
    trap: 0
    why:
      vi: "Cả hai đều chứa chữ `WHERE` nên trông như một. Nhưng `WHERE` của câu loại dòng trước khi gộp (và có thể làm mất cả nhóm), còn `FILTER` chỉ quyết định dòng nào được đếm trong một cột."
      en: "Both contain the word `WHERE`, so they look the same. But the query's `WHERE` removes rows before grouping (and can make whole groups vanish), while `FILTER` only decides which rows count in one column."
recap:
  - vi: "`FILTER (WHERE …)` hay `sum(CASE … 1 ELSE 0 END)`: nhiều số đếm có điều kiện trên một dòng."
    en: "`FILTER (WHERE …)` or `sum(CASE … 1 ELSE 0 END)`: several conditional counts on one row."
  - vi: "`count` đếm cả số 0; 1/0 thì dùng `sum`."
    en: "`count` counts zeros too; with 1/0 use `sum`."
  - vi: "Tỉ lệ: `100.0 * a / b`, rồi `round`."
    en: "Ratios: `100.0 * a / b`, then `round`."
  - vi: "Điều kiện của một cột đặt ở `FILTER`, không ở `WHERE`, để nhóm bằng 0 vẫn hiện."
    en: "Put a column's condition in `FILTER`, not `WHERE`, so zero groups still show."
sources:
  - https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES
  - https://www.postgresql.org/docs/current/functions-aggregate.html
---
## Mở bài

Giám đốc vận hành muốn một bảng: mỗi cửa hàng một dòng, có số đơn, số đơn hủy và tỉ lệ hủy. Đếm "số đơn hủy" thì cần lọc, nhưng lọc ở `WHERE` sẽ làm mất các đơn còn lại mà cột tổng cần.

## Ý chính

Hàm gộp có điều kiện đếm hay cộng chỉ một phần dòng **bên trong** một nhóm, trong khi các cột khác vẫn thấy cả nhóm. Postgres có `FILTER (WHERE …)` gắn sau hàm gộp; cách viết chạy ở mọi hệ là `sum(CASE WHEN … THEN 1 ELSE 0 END)`. Nhờ vậy một dòng kết quả mang được nhiều số đếm khác nhau.

Nhiều người nghĩ **muốn đếm một loại thì lọc ở `WHERE`**. Làm vậy thì tổng số và các loại khác mất theo, và nhóm không có dòng nào thỏa sẽ biến mất thay vì hiện số 0. Điều kiện chỉ dành cho một cột thì đặt vào chính cột đó.

Hình cuối mục này đếm ba hạng giá trong một dòng kết quả, mỗi hạng một `FILTER`.

## Cú pháp

`FILTER` đứng ngay sau ngoặc đóng của hàm gộp.

# EN

## Opening

The operations director wants a table: one row per store, with the number of orders, the number cancelled and the cancellation rate. Counting "cancelled" needs a filter, but filtering in `WHERE` would remove the other orders the total needs.

## Key idea

A conditional aggregate counts or sums only part of the rows **inside** a group, while the other columns still see the whole group. Postgres has `FILTER (WHERE …)` after the aggregate; the spelling that runs everywhere is `sum(CASE WHEN … THEN 1 ELSE 0 END)`. That way one result row carries several different counts.

Many people think **to count one kind of row you filter in `WHERE`**. Then the total and the other kinds disappear too, and a group with no matching row vanishes instead of showing 0. A condition meant for one column belongs in that column.

The figure at the end of this section counts three price tiers in one result row, one `FILTER` each.

## Syntax

`FILTER` comes right after the aggregate's closing bracket.
