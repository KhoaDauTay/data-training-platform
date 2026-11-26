---
id: left_join
title: "LEFT JOIN và RIGHT JOIN: giữ cả dòng không có cặp"
title_en: "LEFT JOIN and RIGHT JOIN: keep the rows without a match"
minutes: 25
figures: [{ name: sql-left-join-on-vs-where, at: pitfalls }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Giữ mọi dòng của một bảng khi nối, kể cả dòng không có cặp ở bảng kia.
    en: Keep every row of one table in a join, including rows with no partner in the other.
  - vi: Đặt điều kiện trên bảng bên phải vào `ON`, không vào `WHERE`.
    en: Put conditions on the right-hand table in `ON`, not in `WHERE`.
  - vi: Đếm đúng nhóm rỗng bằng `count(cột của bảng phải)`, và đọc được `RIGHT JOIN`.
    en: Count empty groups correctly with `count(right-hand column)`, and read a `RIGHT JOIN`.
syntax: |-
  SELECT l.column, r.column
  FROM left_table l
  LEFT [OUTER] JOIN right_table r ON r.key = l.key [AND condition_on_r]
  [WHERE condition_on_l]
options:
  - { code: "LEFT JOIN", vi: "giữ mọi dòng của bảng bên trái; thiếu cặp thì cột bên phải là NULL", en: "keeps every left-hand row; with no match the right-hand columns are NULL" }
  - { code: "RIGHT JOIN", vi: "giống hệt, nhưng giữ bảng bên phải; đổi chỗ hai bảng là ra `LEFT JOIN`", en: "the same, keeping the right-hand table; swap the tables to get a `LEFT JOIN`" }
  - { code: "OUTER", vi: "chữ tùy chọn, không đổi nghĩa", en: "an optional word, no change in meaning" }
  - { code: "ON … AND r.x = …", vi: "điều kiện trên bảng phải: chọn cặp mà không bỏ dòng bên trái", en: "a condition on the right table: picks partners without dropping left rows" }
  - { code: "count(r.id)", vi: "đếm cặp thật; dòng không có cặp được 0", en: "counts real partners; a row with no partner gets 0" }
examples:
  - title: { vi: "Mọi cửa hàng và đơn của một ngày", en: "Every store and its orders on one day" }
    sql: |-
      SELECT s.name, o.id
      FROM stores s
      LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-26'
    read:
      vi: "8 dòng: 6 đơn của ngày 26/10, cộng Ben Thanh và Hoan Kiem không bán được đơn nào nên mỗi nơi một dòng với `id` trống. Điều kiện ngày nằm trong `ON`."
      en: "8 rows: the 6 orders of 26 October, plus Ben Thanh and Hoan Kiem, which sold nothing, with one row each and an empty `id`. The date condition sits in `ON`."
  - title: { vi: "Nhân viên văn phòng không thuộc cửa hàng nào", en: "Office staff who belong to no store" }
    sql: |-
      SELECT e.name, s.name AS store
      FROM staff e
      LEFT JOIN stores s ON s.id = e.store_id
    read:
      vi: "Đủ 20 nhân viên. 5 người ở văn phòng (CEO, quản lý vùng, chuyên viên phân tích) có `store` trống. Với `JOIN` thường, họ sẽ biến mất."
      en: "All 20 staff. The 5 office people (the CEO, the regional managers, the analysts) have an empty `store`. With a plain `JOIN`, they would vanish."
  - title: { vi: "Đếm, kể cả số 0", en: "Counting, zeros included" }
    sql: |-
      SELECT s.name, count(o.id) AS orders
      FROM stores s
      LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-29'
      GROUP BY s.name
      ORDER BY s.name
    read:
      vi: "5 cửa hàng, Hoan Kiem và Son Tra có 0 đơn ngày 29/10. `count(o.id)` bỏ ô trống của dòng không có cặp, nên ra 0 đúng như thật."
      en: "5 stores; Hoan Kiem and Son Tra had 0 orders on 29 October. `count(o.id)` skips the empty cell of a row with no partner, so it truly shows 0."
  - title: { vi: "Cùng câu hỏi, viết bằng RIGHT JOIN", en: "The same question as a RIGHT JOIN" }
    sql: |-
      SELECT s.name, o.id
      FROM orders o
      RIGHT JOIN stores s ON o.store_id = s.id AND o.order_date = '2026-10-26'
    read:
      vi: "Ra đúng 8 dòng như ví dụ 1: `RIGHT JOIN` giữ bảng bên phải (`stores`). Mọi `RIGHT JOIN` đều viết lại được thành `LEFT JOIN` bằng cách đổi chỗ hai bảng, và đa số đội chọn luôn viết `LEFT JOIN`."
      en: "Exactly the 8 rows of example 1: `RIGHT JOIN` keeps the right-hand table (`stores`). Every `RIGHT JOIN` can be rewritten as a `LEFT JOIN` by swapping the tables, and most teams always write `LEFT JOIN`."
  - title: { vi: "Mục tiêu tháng 2, cửa hàng chưa có mục tiêu vẫn hiện", en: "February targets, stores without one still shown" }
    sql: |-
      SELECT s.name, t.target_vnd
      FROM stores s
      LEFT JOIN store_targets t ON t.store_id = s.id AND t.month = '2026-02-01'
    read:
      vi: "5 dòng; Thao Dien chưa có mục tiêu tới tháng 3/2026 nên ô `target_vnd` trống. Một báo cáo \"mọi cửa hàng\" phải bắt đầu từ `stores`."
      en: "5 rows; Thao Dien has no target until March 2026, so its `target_vnd` is empty. An \"every store\" report has to start from `stores`."
pitfalls:
  - title: { vi: "Điều kiện bảng phải đặt ở WHERE", en: "A right-hand condition placed in WHERE" }
    wrong: "SELECT s.name, o.id FROM stores s LEFT JOIN orders o ON o.store_id = s.id WHERE o.order_date = '2026-10-26'"
    fix: "SELECT s.name, o.id FROM stores s LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-26'"
    why:
      vi: "`WHERE` chạy sau phép nối. Dòng không có cặp có `order_date` là NULL, không thỏa điều kiện nên bị loại: `LEFT JOIN` thành nối thường, ra 6 dòng thay vì 8. Hình từng bước ở cuối mục này cho thấy hai dòng biến mất."
      en: "`WHERE` runs after the join. A row with no partner has a NULL `order_date`, fails the condition and is dropped: the `LEFT JOIN` becomes a plain join, 6 rows instead of 8. The step-through figure at the end of this section shows the two rows vanish."
  - title: { vi: "count(*) đếm cả dòng không có cặp", en: "count(*) counts the unmatched row too" }
    wrong: "SELECT s.name, count(*) AS orders FROM stores s LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-29' GROUP BY s.name ORDER BY s.name"
    fix: "SELECT s.name, count(o.id) AS orders FROM stores s LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-29' GROUP BY s.name ORDER BY s.name"
    why:
      vi: "Cửa hàng không có đơn vẫn có một dòng (với cột đơn trống), và `count(*)` đếm dòng đó: Hoan Kiem và Son Tra ra 1 thay vì 0. Đếm một cột của bảng bên phải."
      en: "A store with no order still has one row (with empty order columns), and `count(*)` counts it: Hoan Kiem and Son Tra show 1 instead of 0. Count a column of the right-hand table."
quiz:
  - q:
      vi: "`stores s LEFT JOIN orders o … WHERE o.status = 'PAID'`: cửa hàng không có đơn nào có trong kết quả không?"
      en: "`stores s LEFT JOIN orders o … WHERE o.status = 'PAID'`: do stores with no order appear in the result?"
    options:
      - { vi: "Có, `LEFT JOIN` luôn giữ mọi cửa hàng", en: "Yes, `LEFT JOIN` always keeps every store" }
      - { vi: "Không: `WHERE` chạy sau và bỏ dòng có `status` trống", en: "No: `WHERE` runs afterwards and drops rows with an empty `status`" }
      - { vi: "Chỉ khi thêm `OUTER`", en: "Only if you add `OUTER`" }
    answer: 1
    trap: 0
    why:
      vi: "`LEFT JOIN` hứa giữ bảng trái, nên người ta nghĩ lời hứa đó đi tới cuối câu. Nó chỉ giữ ở bước nối; `WHERE` sau đó lọc như bình thường, và NULL không bằng `PAID`. Chuyển điều kiện vào `ON`."
      en: "`LEFT JOIN` promises to keep the left table, so people expect the promise to last to the end of the query. It only holds at the join step; the `WHERE` after it filters as usual, and NULL is not `PAID`. Move the condition into `ON`."
  - q:
      vi: "`a RIGHT JOIN b` giống câu nào?"
      en: "Which query is `a RIGHT JOIN b` the same as?"
    options:
      - { vi: "`a LEFT JOIN b`", en: "`a LEFT JOIN b`" }
      - { vi: "`b LEFT JOIN a`", en: "`b LEFT JOIN a`" }
      - { vi: "`a JOIN b`", en: "`a JOIN b`" }
    answer: 1
    trap: 0
    why:
      vi: "Chỉ đổi một chữ trông như đủ, nhưng `RIGHT` giữ bảng bên phải, tức `b`. Viết `b` trước rồi `LEFT JOIN a` là cùng kết quả (cột có thể theo thứ tự khác)."
      en: "Changing one word looks enough, but `RIGHT` keeps the right-hand table, `b`. Writing `b` first and then `LEFT JOIN a` gives the same result (the columns may come in another order)."
recap:
  - vi: "`LEFT JOIN` giữ mọi dòng bên trái; thiếu cặp thì cột bên phải là NULL."
    en: "`LEFT JOIN` keeps every left-hand row; without a partner the right-hand columns are NULL."
  - vi: "Điều kiện trên bảng phải đặt trong `ON`; trong `WHERE` nó biến phép nối thành nối thường."
    en: "Conditions on the right-hand table go in `ON`; in `WHERE` they turn it back into a plain join."
  - vi: "Đếm cột của bảng phải (`count(o.id)`), không `count(*)`."
    en: "Count a right-hand column (`count(o.id)`), not `count(*)`."
  - vi: "`RIGHT JOIN` = `LEFT JOIN` với hai bảng đổi chỗ."
    en: "`RIGHT JOIN` = `LEFT JOIN` with the tables swapped."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
  - https://www.postgresql.org/docs/current/tutorial-join.html
---
## Mở bài

Giám đốc hỏi: "Hôm 26/10 mỗi cửa hàng bán những đơn nào? Cửa hàng không bán được gì cũng phải có trong danh sách." Với `JOIN` thường, cửa hàng không có đơn biến mất, mà đó lại là cửa hàng đáng hỏi nhất.

## Ý chính

`LEFT JOIN` nối như `JOIN`, nhưng giữ **mọi** dòng của bảng bên trái. Dòng không tìm được cặp vẫn ra một dòng, các cột của bảng bên phải để trống (NULL). `RIGHT JOIN` giữ bảng bên phải; đổi chỗ hai bảng là thành `LEFT JOIN`, nên thường chỉ cần một loại.

Nhiều người nghĩ **đặt điều kiện ở `ON` hay `WHERE` là như nhau**. Với `LEFT JOIN` thì khác hẳn: trong `ON`, điều kiện chọn cặp nào được ghép; trong `WHERE`, nó lọc sau khi ghép và loại luôn những dòng trống mà bạn muốn giữ.

## Cú pháp

Bảng cần giữ đủ viết ở `FROM`; bảng có thể thiếu viết sau `LEFT JOIN`.

# EN

## Opening

The director asks: "Which orders did each store sell on 26 October? Stores that sold nothing must be on the list too." With a plain `JOIN`, a store with no order disappears, and that is exactly the store worth asking about.

## Key idea

`LEFT JOIN` joins like `JOIN`, but keeps **every** row of the left-hand table. A row with no partner still produces one row, with the right-hand columns empty (NULL). `RIGHT JOIN` keeps the right-hand table; swapping the tables turns it into a `LEFT JOIN`, so one kind is usually enough.

Many people think **putting a condition in `ON` or in `WHERE` is the same**. With `LEFT JOIN` it is very different: in `ON`, the condition chooses which partners are paired; in `WHERE`, it filters after the join and removes the empty rows you wanted to keep.

## Syntax

The table you must keep whole goes in `FROM`; the table that may be missing goes after `LEFT JOIN`.
