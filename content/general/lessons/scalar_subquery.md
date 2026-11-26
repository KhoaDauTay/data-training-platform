---
id: scalar_subquery
title: "Truy vấn con một giá trị: so với một con số tính ra"
title_en: "Scalar subqueries: compare with a computed number"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: sql-scalar-subquery, at: idea }]
objectives:
  - vi: "Đặt một câu `SELECT` trả đúng một giá trị vào trong câu khác, như \"giá trung bình\"."
    en: "Put a `SELECT` that returns exactly one value inside another query, such as \"the average price\"."
  - vi: Dùng giá trị đó trong `WHERE`, trong `SELECT` và trong phép tính.
    en: Use that value in `WHERE`, in `SELECT` and in arithmetic.
  - vi: Biết vì sao truy vấn con trả nhiều dòng thì lỗi, và trả không dòng nào thì ra NULL.
    en: Know why a subquery returning several rows fails, and one returning no row gives NULL.
syntax: |-
  SELECT column, column - (SELECT avg(column) FROM table_name) AS diff
  FROM table_name
  WHERE column > (SELECT avg(column) FROM table_name)
options:
  - { code: "(SELECT …)", vi: "luôn nằm trong ngoặc; chạy trước, cho một giá trị", en: "always in brackets; runs first and gives one value" }
  - { code: "(SELECT avg(price_vnd) FROM products)", vi: "một dòng, một cột: dùng được như một con số", en: "one row, one column: usable as a plain number" }
  - { code: "> (SELECT max(…))", vi: "hàm gộp không `GROUP BY` luôn trả đúng một dòng", en: "an aggregate with no `GROUP BY` always returns exactly one row" }
  - { code: "21000", vi: "truy vấn con trả hơn một dòng", en: "the subquery returned more than one row" }
  - { code: "NULL", vi: "truy vấn con không trả dòng nào", en: "the subquery returned no row" }
examples:
  - title: { vi: "Sản phẩm đắt hơn mức trung bình", en: "Products above the average price" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      WHERE price_vnd > (SELECT avg(price_vnd) FROM products)
    read:
      vi: "8 sản phẩm. Truy vấn trong ngoặc tính giá trung bình (khoảng 52.833 đồng) một lần, rồi câu ngoài so từng sản phẩm với con số đó."
      en: "8 products. The query in brackets computes the average price (about 52,833 VND) once, then the outer query compares every product with that number."
  - title: { vi: "Chênh lệch so với trung bình", en: "Distance from the average" }
    sql: |-
      SELECT name, price_vnd, price_vnd - (SELECT avg(price_vnd) FROM products)::int AS vs_avg
      FROM products
      WHERE category = 'Drinks'
    read:
      vi: "6 đồ uống, đều rẻ hơn trung bình (số âm). Truy vấn con dùng được trong `SELECT` như một hằng số; `::int` làm tròn để dễ đọc."
      en: "6 drinks, all cheaper than average (negative numbers). The subquery works in `SELECT` like a constant; `::int` rounds it to read easily."
  - title: { vi: "Các đơn của ngày mới nhất", en: "The orders of the latest day" }
    sql: |-
      SELECT id, store_id, order_date
      FROM orders
      WHERE order_date = (SELECT max(order_date) FROM orders)
    read:
      vi: "5 đơn ngày 31/10/2026. Không cần biết trước ngày cuối là ngày nào: câu vẫn đúng khi dữ liệu có thêm ngày mới."
      en: "5 orders of 31 October 2026. You do not need to know the last date in advance: the query stays right as new days arrive."
  - title: { vi: "Món đắt nhất của một nhóm", en: "The priciest item of a category" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      WHERE price_vnd = (SELECT max(price_vnd) FROM products WHERE category = 'Snacks')
    read:
      vi: "Hạt điều, 89.000 đồng. Truy vấn con có `WHERE` riêng; điều kiện của nó không ảnh hưởng tới câu ngoài."
      en: "The cashew nuts, at 89,000 VND. The subquery has its own `WHERE`; its condition does not affect the outer query."
  - title: { vi: "Tỉ lệ trên tổng", en: "A share of the total" }
    sql: |-
      SELECT category, round(100.0 * count(*) / (SELECT count(*) FROM products), 1) AS pct
      FROM products
      GROUP BY category
    read:
      vi: "Mỗi nhóm hàng 20% số sản phẩm. Mẫu số là tổng của cả bảng, nằm ngoài các nhóm của `GROUP BY`, nên lấy bằng truy vấn con."
      en: "Each category holds 20% of the products. The denominator is the whole table's total, outside the `GROUP BY` groups, so it comes from a subquery."
pitfalls:
  - title: { vi: "Truy vấn con trả nhiều dòng", en: "A subquery that returns several rows" }
    wrong: "SELECT name FROM products WHERE price_vnd = (SELECT price_vnd FROM products WHERE category = 'Snacks')"
    fix: "SELECT name FROM products WHERE price_vnd = (SELECT max(price_vnd) FROM products WHERE category = 'Snacks')"
    why:
      vi: "Nhóm `Snacks` có 6 giá, mà dấu `=` chỉ so được với một giá trị: lỗi 21000. Hoặc gộp về một giá trị (`max`, `avg`), hoặc dùng `IN` khi bạn thật sự muốn cả danh sách (bài \"IN với truy vấn con: lọc theo một danh sách tính ra\")."
      en: "The `Snacks` category has 6 prices, and `=` can only compare with one value: error 21000. Either fold them into one value (`max`, `avg`) or use `IN` when you really want the whole list (lesson \"IN with a subquery: filter by a computed list\")."
  - title: { vi: "Hàm gộp thẳng trong WHERE", en: "An aggregate straight in WHERE" }
    wrong: "SELECT name, price_vnd FROM products WHERE price_vnd > avg(price_vnd)"
    fix: "SELECT name, price_vnd FROM products WHERE price_vnd > (SELECT avg(price_vnd) FROM products)"
    why:
      vi: "`WHERE` xét từng dòng, nên chưa có trung bình nào để so: lỗi 42803. Gói phép gộp vào một truy vấn con để nó được tính riêng trên cả bảng."
      en: "`WHERE` looks at one row at a time, so there is no average yet: error 42803. Wrap the aggregate in a subquery so it is computed separately over the whole table."
quiz:
  - q:
      vi: "`WHERE id = (SELECT store_id FROM orders WHERE order_date = '2030-01-01')` (không có đơn nào ngày đó) trả gì?"
      en: "What does `WHERE id = (SELECT store_id FROM orders WHERE order_date = '2030-01-01')` (no order that day) return?"
    options:
      - { vi: "Lỗi vì truy vấn con rỗng", en: "An error, because the subquery is empty" }
      - { vi: "0 dòng: truy vấn con rỗng cho NULL, và `= NULL` không bao giờ đúng", en: "0 rows: an empty subquery gives NULL, and `= NULL` is never true" }
      - { vi: "Mọi dòng", en: "Every row" }
    answer: 1
    trap: 0
    why:
      vi: "Vì truy vấn con nhiều dòng thì báo lỗi, người ta đoán truy vấn con rỗng cũng vậy. Nhưng không có dòng nào thì Postgres coi giá trị là NULL, và câu chạy êm với 0 dòng."
      en: "Since a multi-row subquery fails, people guess an empty one fails too. But with no row Postgres treats the value as NULL, and the query runs quietly with 0 rows."
  - q:
      vi: "Trong ví dụ 1, Postgres tính giá trung bình bao nhiêu lần?"
      en: "In example 1, how many times does Postgres compute the average price?"
    options:
      - { vi: "30 lần, mỗi sản phẩm một lần", en: "30 times, once per product" }
      - { vi: "Một lần, vì truy vấn con không phụ thuộc dòng nào của câu ngoài", en: "Once, because the subquery depends on no row of the outer query" }
      - { vi: "Không lần nào, nó lấy từ thống kê", en: "Never, it reads it from statistics" }
    answer: 1
    trap: 0
    why:
      vi: "Truy vấn con nằm trong `WHERE`, nơi xét từng dòng, nên dễ nghĩ nó chạy lại cho mỗi dòng. Nó không nhắc tới cột nào của câu ngoài, nên Postgres tính một lần rồi dùng lại. Truy vấn con tương quan (cuối Phần 6) thì khác."
      en: "The subquery sits in `WHERE`, which works row by row, so it is easy to think it reruns for each row. It names no column of the outer query, so Postgres computes it once and reuses it. A correlated subquery (end of Part 6) is different."
recap:
  - vi: "Truy vấn con một giá trị = một câu `SELECT` trong ngoặc, trả một dòng một cột."
    en: "A scalar subquery = a `SELECT` in brackets that returns one row, one column."
  - vi: "Nhiều dòng là lỗi 21000; không dòng nào là NULL."
    en: "Several rows is error 21000; no row is NULL."
  - vi: "Hàm gộp cần so trong `WHERE` thì đặt vào truy vấn con."
    en: "An aggregate you need in `WHERE` goes inside a subquery."
sources:
  - https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES
---
## Mở bài

Phòng mua hàng hỏi: "Món nào đắt hơn mức giá trung bình của cả cửa hàng?" Bạn biết tính trung bình, và biết lọc theo một con số. Cái khó là con số đó phải được tính ra trước, ngay trong cùng câu hỏi.

## Ý chính

Một truy vấn con là một câu `SELECT` đặt trong ngoặc bên trong câu khác. Khi nó trả đúng **một dòng một cột**, bạn dùng nó ở bất kỳ đâu một con số được phép: trong `WHERE`, trong `SELECT`, trong phép tính. Postgres chạy truy vấn con, lấy giá trị, rồi chạy câu ngoài như thể bạn đã gõ con số đó.

Nhiều người nghĩ **có thể viết hàm gộp thẳng trong `WHERE`** (`price_vnd > avg(price_vnd)`). Thật ra `WHERE` xét từng dòng trước khi có phép gộp nào, nên câu đó báo lỗi. Truy vấn con tách phép gộp ra thành một bước riêng.

## Cú pháp

Truy vấn con luôn nằm trong ngoặc tròn.

# EN

## Opening

Purchasing asks: "Which items cost more than the shop's average price?" You know how to compute an average, and how to filter by a number. The hard part is that the number has to be computed first, inside the same question.

## Key idea

A subquery is a `SELECT` in brackets inside another query. When it returns exactly **one row, one column**, you can use it anywhere a number is allowed: in `WHERE`, in `SELECT`, in arithmetic. Postgres runs the subquery, takes the value, then runs the outer query as if you had typed that number.

Many people think **an aggregate can go straight into `WHERE`** (`price_vnd > avg(price_vnd)`). In fact `WHERE` looks at rows one at a time before any aggregation, so that query fails. A subquery splits the aggregate off into a step of its own.

## Syntax

A subquery always sits in round brackets.
