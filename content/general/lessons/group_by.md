---
id: group_by
title: "GROUP BY: một con số cho mỗi nhóm"
title_en: "GROUP BY: one number per group"
minutes: 25
figures: [{ name: sql-group-fold, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Chia dòng thành nhóm theo một hay nhiều cột và tính hàm gộp cho từng nhóm.
    en: Split rows into groups by one or more columns and compute an aggregate for each group.
  - vi: Áp quy tắc "mọi cột thường trong SELECT phải nằm trong GROUP BY".
    en: Apply the rule "every plain column in the SELECT must be in the GROUP BY".
  - vi: Chọn đúng độ chi tiết của nhóm, không thừa không thiếu cột.
    en: Pick the right grain for the groups, with no extra and no missing columns.
syntax: |-
  SELECT group_column, aggregate(column)
  FROM table_name
  [WHERE condition]
  GROUP BY group_column [, another_column]
  [ORDER BY ...]
options:
  - { code: "GROUP BY a", vi: "một nhóm cho mỗi giá trị khác nhau của `a`", en: "one group per different value of `a`" }
  - { code: "GROUP BY a, b", vi: "một nhóm cho mỗi cặp (a, b) có trong dữ liệu", en: "one group per (a, b) pair found in the data" }
  - { code: "count(*), sum(...)", vi: "tính riêng trong từng nhóm", en: "computed separately inside each group" }
  - { code: "GROUP BY 1", vi: "gom nhóm theo cột thứ nhất của SELECT (gọn, nhưng dễ lệch khi sửa câu)", en: "group by the first SELECT column (short, but easy to break when the query changes)" }
  - { code: "NULL", vi: "các ô trống gom thành một nhóm riêng", en: "empty cells are gathered into one group of their own" }
examples:
  - title: { vi: "Mỗi nhóm hàng: số món và giá trung bình", en: "Per category: item count and average price" }
    sql: |-
      SELECT category, count(*) AS items, round(avg(price_vnd)) AS avg_price
      FROM products
      GROUP BY category
      ORDER BY category
    read:
      vi: "5 dòng, mỗi nhóm hàng một dòng, mỗi nhóm 6 món. Đồ uống rẻ nhất (khoảng 20.167 đồng), đồ chăm sóc cá nhân đắt nhất (khoảng 85.333)."
      en: "5 rows, one per category, with 6 items each. Drinks are the cheapest on average (about 20,167 VND), personal care the most expensive (about 85,333)."
  - title: { vi: "Đếm theo trạng thái", en: "Counting by status" }
    sql: |-
      SELECT status, count(*)
      FROM orders
      GROUP BY status
    read:
      vi: "3 dòng: 1298 đơn `PAID`, 92 đơn `CANCELLED`, 38 đơn `REFUNDED`. Cộng lại là 1428, đúng bằng số đơn: mỗi dòng của bảng rơi vào đúng một nhóm."
      en: "3 rows: 1298 `PAID` orders, 92 `CANCELLED`, 38 `REFUNDED`. They add up to 1428, the number of orders: every row of the table lands in exactly one group."
  - title: { vi: "Gom nhóm theo hai cột", en: "Grouping by two columns" }
    sql: |-
      SELECT store_id, channel, count(*) AS orders
      FROM orders
      WHERE order_date >= '2026-10-01'
      GROUP BY store_id, channel
      ORDER BY store_id, channel
    read:
      vi: "10 dòng = 5 cửa hàng × 2 kênh. Cửa hàng 1 có 18 đơn online và 33 đơn tại quầy trong tháng 10. `WHERE` lọc trước, rồi mới chia nhóm."
      en: "10 rows = 5 stores × 2 channels. Store 1 had 18 online orders and 33 in-store orders in October. `WHERE` filters first, then the groups are made."
  - title: { vi: "Ô trống thành một nhóm", en: "Empty cells form a group" }
    sql: |-
      SELECT city, count(*) AS customers
      FROM customers
      GROUP BY city
      ORDER BY customers DESC
    read:
      vi: "6 dòng: 5 thành phố và một dòng `city` trống với 17 khách. `GROUP BY` coi mọi NULL là cùng một nhóm, khác với phép so `=`."
      en: "6 rows: 5 cities and one row with an empty `city` holding 17 customers. `GROUP BY` treats every NULL as the same group, unlike the `=` comparison."
  - title: { vi: "Tổng chỉ tiêu mỗi cửa hàng", en: "Total target per store" }
    sql: |-
      SELECT store_id, sum(target_vnd) AS target
      FROM store_targets
      WHERE month >= '2026-07-01'
      GROUP BY store_id
      ORDER BY store_id
    read:
      vi: "5 dòng, cửa hàng 3 có chỉ tiêu lớn nhất (90.000.000 đồng từ tháng 7). Mỗi cửa hàng có nhiều tháng; `sum` cộng chúng trong nhóm của cửa hàng đó."
      en: "5 rows; store 3 has the largest target (90,000,000 VND from July). Each store has several months; `sum` adds them inside that store's group."
pitfalls:
  - title: { vi: "Cột thường không nằm trong GROUP BY", en: "A plain column missing from GROUP BY" }
    wrong: "SELECT store_id, channel, count(*) FROM orders GROUP BY store_id"
    fix: "SELECT store_id, channel, count(*) FROM orders GROUP BY store_id, channel"
    why:
      vi: "Mỗi cửa hàng có hai kênh, nên một dòng nhóm theo `store_id` không biết ghi `channel` nào: lỗi 42803. Mọi cột thường trong `SELECT` phải nằm trong `GROUP BY` (hoặc nằm trong hàm gộp)."
      en: "Each store has two channels, so a row grouped by `store_id` cannot tell which `channel` to show: error 42803. Every plain column in the `SELECT` must be in the `GROUP BY` (or inside an aggregate)."
  - title: { vi: "Thêm cột vào GROUP BY làm nhóm vỡ nhỏ", en: "An extra GROUP BY column splits the groups" }
    wrong: "SELECT store_id, channel, count(*) FROM orders WHERE order_date >= '2026-10-01' GROUP BY store_id, channel, status"
    fix: "SELECT store_id, channel, count(*) FROM orders WHERE order_date >= '2026-10-01' GROUP BY store_id, channel"
    why:
      vi: "Thêm `status` để \"cho chắc\" chia mỗi cặp cửa hàng–kênh thành tới 3 nhóm: 21 dòng thay vì 10, cùng một cặp lặp lại với số đếm nhỏ hơn. Chỉ gom nhóm theo đúng các cột câu hỏi cần."
      en: "Adding `status` \"to be safe\" splits each store–channel pair into up to 3 groups: 21 rows instead of 10, with the same pair repeated and smaller counts. Group by exactly the columns the question needs."
quiz:
  - q:
      vi: "`GROUP BY status` có xếp kết quả theo `status` không?"
      en: "Does `GROUP BY status` sort the result by `status`?"
    options:
      - { vi: "Có, nhóm thì phải xếp", en: "Yes, grouping implies sorting" }
      - { vi: "Không chắc; muốn thứ tự thì thêm `ORDER BY`", en: "Not reliably; add `ORDER BY` for an order" }
      - { vi: "Có, nhưng chỉ giảm dần", en: "Yes, but only descending" }
    answer: 1
    trap: 0
    why:
      vi: "Một số cách gom nhóm bên trong Postgres có sắp xếp dữ liệu, nên kết quả đôi khi trông như đã xếp và người ta tin đó là luật. Postgres thường gom nhóm bằng bảng băm, và thứ tự ra là bất kỳ (ví dụ \"Đếm theo trạng thái\" cho `PAID` ở cuối). Chỉ `ORDER BY` hứa thứ tự."
      en: "Some grouping methods sort the data inside, so a result can look sorted and people take that as the rule. Postgres often groups with a hash table and the output order is arbitrary (the example \"Counting by status\" shows `PAID` last). Only `ORDER BY` promises an order."
  - q:
      vi: "Bảng có 1428 đơn. `SELECT status, count(*) … GROUP BY status` cộng các số đếm lại được bao nhiêu?"
      en: "The table has 1428 orders. What do the counts of `SELECT status, count(*) … GROUP BY status` add up to?"
    options:
      - { vi: "1428: mỗi dòng ở đúng một nhóm", en: "1428: every row is in exactly one group" }
      - { vi: "Ít hơn 1428, vì dòng trùng bị gộp", en: "Less than 1428, because duplicate rows are merged" }
      - { vi: "3, vì có 3 nhóm", en: "3, because there are 3 groups" }
    answer: 0
    trap: 1
    why:
      vi: "\"Gom nhóm\" nghe như bỏ trùng, nhưng `GROUP BY` không vứt dòng nào: nó chỉ chia dòng vào các nhóm. Đây là cách kiểm tra nhanh: tổng các nhóm phải bằng số dòng đã lọc."
      en: "\"Group\" sounds like removing duplicates, but `GROUP BY` throws no row away: it only puts rows into groups. That gives a quick check: the groups must add up to the filtered row count."
  - q:
      vi: "Vì sao `GROUP BY 1` có thể nguy hiểm khi sửa câu?"
      en: "Why can `GROUP BY 1` be risky when you edit the query?"
    options:
      - { vi: "Vì số 1 trỏ vào vị trí cột, nên thêm cột vào đầu `SELECT` là đổi nhóm", en: "Because 1 points at a column position, so adding a column at the start of the `SELECT` changes the groups" }
      - { vi: "Vì Postgres nhóm theo hằng số 1, mọi dòng một nhóm", en: "Because Postgres groups by the constant 1, putting every row in one group" }
      - { vi: "Vì nó chậm hơn ghi tên cột", en: "Because it is slower than naming the column" }
    answer: 0
    trap: 1
    why:
      vi: "Trông như hằng số, nhưng trong `GROUP BY` một số nguyên là vị trí cột của `SELECT`. Câu vẫn chạy sau khi bạn thêm cột, chỉ là nhóm theo cột khác. Ghi tên cột thì an toàn hơn."
      en: "It looks like a constant, but in `GROUP BY` a whole number is a position in the `SELECT`. The query still runs after you add a column, it just groups by another one. Naming the column is safer."
recap:
  - vi: "`GROUP BY` chia dòng thành nhóm; hàm gộp tính trong từng nhóm, mỗi nhóm một dòng."
    en: "`GROUP BY` splits rows into groups; aggregates run inside each group, one row per group."
  - vi: "Cột thường trong `SELECT` phải có trong `GROUP BY`, không thì lỗi 42803."
    en: "Plain columns in the `SELECT` must be in the `GROUP BY`, or you get error 42803."
  - vi: "Cột trong `GROUP BY` quyết định độ chi tiết: thừa một cột là nhóm vỡ nhỏ."
    en: "The `GROUP BY` columns set the grain: one extra column splits the groups."
  - vi: "`GROUP BY` không hứa thứ tự; thêm `ORDER BY`."
    en: "`GROUP BY` promises no order; add `ORDER BY`."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP
  - https://www.postgresql.org/docs/current/tutorial-agg.html
---
## Mở bài

Phòng mua hàng không muốn một con số cho cả cửa hàng nữa: "Mỗi nhóm hàng có bao nhiêu món, giá trung bình mỗi nhóm là bao nhiêu?" Hàm gộp cho một con số; giờ bạn cần một con số **cho từng nhóm**.

## Ý chính

`GROUP BY` chia các dòng (đã qua `WHERE`) thành nhóm, mỗi giá trị khác nhau của cột nhóm là một nhóm. Hàm gộp chạy riêng trong từng nhóm, và kết quả có đúng một dòng cho mỗi nhóm. Gom nhóm theo hai cột thì mỗi cặp giá trị là một nhóm.

Nhiều người nghĩ **có thể đưa bất kỳ cột nào vào `SELECT` cạnh hàm gộp**. Thật ra mỗi dòng kết quả đại diện cho cả một nhóm, nên chỉ những cột có một giá trị duy nhất trong nhóm (chính là cột nhóm) mới hiện được. Cột khác thì phải nằm trong hàm gộp, hoặc được thêm vào `GROUP BY`, và thêm vào thì nhóm nhỏ đi.

Hình từng bước ở cuối mục này gộp đơn hàng theo `status`: 1428 đơn thành ba dòng, PAID 1298, CANCELLED 92, REFUNDED 38. Thứ tự các mệnh đề chạy được vẽ ở bài `HAVING`.

## Cú pháp

`GROUP BY` đứng sau `WHERE` và trước `ORDER BY`.

# EN

## Opening

Purchasing no longer wants one number for the whole shop: "How many items does each category have, and what is each category's average price?" An aggregate gives one number; now you need one number **per group**.

## Key idea

`GROUP BY` splits the rows (those left after `WHERE`) into groups, one group per different value of the grouping column. Aggregates run separately inside each group, and the result has exactly one row per group. Grouping by two columns makes one group per pair of values.

Many people think **any column can go in the `SELECT` next to an aggregate**. In fact each result row stands for a whole group, so only columns with a single value inside the group (the grouping columns) can show. Any other column must sit inside an aggregate, or be added to the `GROUP BY`, and adding it makes the groups smaller.

The step-through figure at the end of this section groups orders by `status`: 1428 orders become three rows, PAID 1298, CANCELLED 92, REFUNDED 38. The order the clauses run in is drawn in the `HAVING` lesson.

## Syntax

`GROUP BY` comes after `WHERE` and before `ORDER BY`.
