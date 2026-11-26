---
id: having
title: "HAVING: lọc các nhóm sau khi gom nhóm"
title_en: "HAVING: filter groups after aggregating"
minutes: 20
figures: [{ name: sql-clause-order, at: idea }, { name: sql-where-vs-having, at: pitfalls }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Giữ chỉ những nhóm có số đếm, tổng hay trung bình thỏa một điều kiện.
    en: Keep only the groups whose count, sum or average passes a condition.
  - vi: "Chọn đúng chỗ cho mỗi điều kiện: `WHERE` cho dòng, `HAVING` cho nhóm."
    en: "Put each condition in the right place: `WHERE` for rows, `HAVING` for groups."
  - vi: Dùng `HAVING count(*) > 1` để tìm giá trị bị lặp.
    en: Use `HAVING count(*) > 1` to find values that repeat.
syntax: |-
  SELECT group_column, aggregate(column)
  FROM table_name
  [WHERE row_condition]
  GROUP BY group_column
  HAVING group_condition
options:
  - { code: "WHERE", vi: "lọc từng dòng, trước khi chia nhóm; không dùng được hàm gộp", en: "filters single rows, before grouping; cannot use aggregates" }
  - { code: "HAVING", vi: "lọc cả nhóm, sau khi gom nhóm; thường chứa hàm gộp", en: "filters whole groups, after aggregating; usually holds an aggregate" }
  - { code: "HAVING count(*) > 1", vi: "nhóm có nhiều hơn một dòng: tìm trùng", en: "groups with more than one row: finding duplicates" }
  - { code: "HAVING ... AND ...", vi: "kết hợp nhiều điều kiện nhóm như ở `WHERE`", en: "combine group conditions as in `WHERE`" }
examples:
  - title: { vi: "Nhóm hàng có giá trung bình trên 50.000", en: "Categories averaging over 50,000" }
    sql: |-
      SELECT category, avg(price_vnd)
      FROM products
      GROUP BY category
      HAVING avg(price_vnd) > 50000
    read:
      vi: "3 trong 5 nhóm hàng: chăm sóc cá nhân, đồ gia dụng, văn phòng phẩm. Đồ uống và đồ ăn vặt bị loại vì trung bình của chúng thấp hơn mức."
      en: "3 of the 5 categories: personal care, household, stationery. Drinks and snacks are dropped because their average is below the bar."
  - title: { vi: "Thành phố có ít nhất 30 khách", en: "Cities with at least 30 customers" }
    sql: |-
      SELECT city, count(*) AS customers
      FROM customers
      GROUP BY city
      HAVING count(*) >= 30
    read:
      vi: "4 thành phố. Huế (29 khách) và nhóm chưa có thành phố (17) không qua. Điều kiện nhìn vào số đếm của cả nhóm, không vào một khách nào."
      en: "4 cities. Hue (29 customers) and the group with no city (17) do not make it. The condition looks at the whole group's count, not at any one customer."
  - title: { vi: "Tìm mã đơn bị thanh toán hai lần", en: "Finding orders paid twice" }
    sql: |-
      SELECT order_id, count(*) AS rows
      FROM payments
      GROUP BY order_id
      HAVING count(*) > 1
      ORDER BY order_id
    read:
      vi: "51 đơn có hơn một dòng trong `payments`, bắt đầu từ đơn 97. Đây là cách kiểm tra trùng kinh điển: gom nhóm theo cột lẽ ra phải là duy nhất, giữ nhóm có nhiều hơn một dòng."
      en: "51 orders have more than one row in `payments`, starting with order 97. This is the classic duplicate check: group by the column that should be unique, keep the groups with more than one row."
  - title: { vi: "WHERE và HAVING trong cùng một câu", en: "WHERE and HAVING in one query" }
    sql: |-
      SELECT category, count(*)
      FROM products
      WHERE price_vnd < 50000
      GROUP BY category
      HAVING count(*) >= 4
    read:
      vi: "`WHERE` bỏ món từ 50.000 đồng trở lên trước, rồi `HAVING` giữ nhóm còn ít nhất 4 món: 4 nhóm, đồ uống đủ cả 6 món. Chăm sóc cá nhân chỉ còn 3 món rẻ nên bị loại."
      en: "`WHERE` first drops the items at 50,000 VND or more, then `HAVING` keeps the categories that still have at least 4 items: 4 categories, drinks with all 6. Personal care has only 3 cheap items left, so it goes."
pitfalls:
  - title: { vi: "Hàm gộp trong WHERE", en: "An aggregate inside WHERE" }
    wrong: "SELECT category, count(*) FROM products WHERE count(*) >= 6 GROUP BY category"
    fix: "SELECT category, count(*) FROM products GROUP BY category HAVING count(*) >= 6"
    why:
      vi: "`WHERE` xét từng dòng trước khi có nhóm, nên lúc đó chưa có số đếm nào: lỗi 42803 \"aggregate functions are not allowed in WHERE\". Điều kiện về nhóm đặt ở `HAVING`. Hình cuối mục này vẽ hai lần lọc, `WHERE` rồi `HAVING`, trên câu đúng."
      en: "`WHERE` looks at single rows before any group exists, so there is no count yet: error 42803 \"aggregate functions are not allowed in WHERE\". Conditions about groups go in `HAVING`. The figure at the end of this section draws the two filters, `WHERE` then `HAVING`, on the right query."
  - title: { vi: "Điều kiện từng dòng đặt trong HAVING", en: "A row condition inside HAVING" }
    wrong: "SELECT category, count(*) FROM products GROUP BY category HAVING count(*) >= 4 AND price_vnd < 50000"
    fix: "SELECT category, count(*) FROM products WHERE price_vnd < 50000 GROUP BY category HAVING count(*) >= 4"
    why:
      vi: "Sau khi gom nhóm, một nhóm có 6 giá khác nhau, nên `price_vnd` không còn một giá trị để so: lỗi 42803. Điều kiện trên từng dòng thuộc về `WHERE`, đặt trước `GROUP BY`."
      en: "After grouping, a category holds 6 different prices, so `price_vnd` has no single value to compare: error 42803. A condition on single rows belongs in `WHERE`, before `GROUP BY`."
quiz:
  - q:
      vi: "Nên viết `WHERE category <> 'Drinks'` hay `HAVING category <> 'Drinks'` trong một câu `GROUP BY category`?"
      en: "In a `GROUP BY category` query, should you write `WHERE category <> 'Drinks'` or `HAVING category <> 'Drinks'`?"
    options:
      - { vi: "`HAVING`, vì mọi điều kiện trong câu có `GROUP BY` phải nằm ở `HAVING`", en: "`HAVING`, because every condition in a `GROUP BY` query must go in `HAVING`" }
      - { vi: "`WHERE`: điều kiện không cần hàm gộp thì lọc dòng trước, rõ nghĩa hơn", en: "`WHERE`: a condition that needs no aggregate filters rows first and reads more clearly" }
      - { vi: "Chỉ `HAVING` chạy được", en: "Only `HAVING` runs" }
    answer: 1
    trap: 0
    why:
      vi: "Cả hai đều chạy và ra cùng kết quả, nên nhiều người dồn hết vào `HAVING`. Quy tắc dễ nhớ: điều kiện không có hàm gộp đặt ở `WHERE`, để người đọc thấy ngay nó lọc dòng; `HAVING` dành cho điều kiện về nhóm."
      en: "Both run and give the same result, so many people pile everything into `HAVING`. An easy rule: a condition without an aggregate goes in `WHERE`, so a reader sees at once that it filters rows; `HAVING` is for conditions about groups."
  - q:
      vi: "Trong câu có cả hai, cái nào chạy trước: `WHERE` hay `HAVING`?"
      en: "In a query with both, which runs first: `WHERE` or `HAVING`?"
    options:
      - { vi: "`HAVING`, vì nó đọc kết quả gộp", en: "`HAVING`, because it reads the aggregated result" }
      - { vi: "`WHERE` lọc dòng, rồi `GROUP BY` chia nhóm, rồi `HAVING` lọc nhóm", en: "`WHERE` filters rows, then `GROUP BY` groups, then `HAVING` filters groups" }
      - { vi: "Thứ tự tùy vị trí viết", en: "It depends on where you write them" }
    answer: 1
    trap: 0
    why:
      vi: "Vì `HAVING` gần với hàm gộp, có người đoán nó chạy trước để \"chuẩn bị\". Thứ tự logic luôn là `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY`."
      en: "Because `HAVING` sits close to the aggregates, some guess it runs first to \"prepare\" them. The logical order is always `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY`."
  - q:
      vi: "Muốn tìm email bị trùng trong một bảng, câu nào đúng ý?"
      en: "Which query finds emails that appear more than once?"
    options:
      - { vi: "`GROUP BY email HAVING count(*) > 1`", en: "`GROUP BY email HAVING count(*) > 1`" }
      - { vi: "`SELECT DISTINCT email`", en: "`SELECT DISTINCT email`" }
      - { vi: "`WHERE count(email) > 1`", en: "`WHERE count(email) > 1`" }
    answer: 0
    why:
      vi: "`DISTINCT` cho mỗi email một lần, che mất chuyện trùng; `WHERE` không nhận hàm gộp. Gom nhóm theo cột lẽ ra phải là duy nhất rồi giữ nhóm có hơn một dòng."
      en: "`DISTINCT` shows each email once and hides the repeats; `WHERE` refuses aggregates. Group by the column that should be unique and keep the groups with more than one row."
recap:
  - vi: "`WHERE` lọc dòng trước khi gom nhóm; `HAVING` lọc nhóm sau khi gom nhóm."
    en: "`WHERE` filters rows before grouping; `HAVING` filters groups after."
  - vi: "Hàm gộp trong `WHERE` là lỗi 42803; cột thường trong `HAVING` cũng vậy."
    en: "An aggregate in `WHERE` is error 42803; so is a plain column in `HAVING`."
  - vi: "`HAVING count(*) > 1` là cách tìm giá trị bị lặp."
    en: "`HAVING count(*) > 1` is how you find repeated values."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP
  - https://www.postgresql.org/docs/current/sql-select.html#SQL-HAVING
---
## Mở bài

Kế toán nghi có đơn bị thanh toán hai lần. Bạn đã biết đếm số khoản cho mỗi đơn; giờ chỉ cần giữ lại những đơn có **hơn một** khoản. Đó là một điều kiện trên kết quả gộp, không trên từng dòng.

## Ý chính

`HAVING` là `WHERE` của các nhóm. Nó chạy sau `GROUP BY`, nên điều kiện của nó dùng được hàm gộp như `count(*)` hay `avg(price_vnd)`, và nó giữ hoặc bỏ cả một nhóm. `WHERE` thì chạy trước khi có nhóm và chỉ nhìn từng dòng.

Nhiều người nghĩ **`HAVING` chỉ là một cách viết khác của `WHERE`**. Thật ra hai cái chạy ở hai thời điểm: lúc `WHERE` chạy chưa có số đếm nào, và lúc `HAVING` chạy thì từng dòng đã được gom vào nhóm. Vì vậy hàm gộp không vào được `WHERE`, và cột thường (không nằm trong `GROUP BY`) không vào được `HAVING`.

Hình từng bước ở cuối mục này đặt thứ tự viết cạnh thứ tự chạy: `FROM`, `WHERE`, `GROUP BY`, `HAVING` chạy trước `SELECT`, rồi mới đến `ORDER BY` và `LIMIT`.

## Cú pháp

`HAVING` đứng ngay sau `GROUP BY`.

# EN

## Opening

Accounting suspects that some orders were paid twice. You already know how to count the payments of each order; now you only need to keep the orders with **more than one** payment. That is a condition on the aggregated result, not on single rows.

## Key idea

`HAVING` is the `WHERE` of groups. It runs after `GROUP BY`, so its condition can use aggregates such as `count(*)` or `avg(price_vnd)`, and it keeps or drops a whole group. `WHERE` runs before any group exists and only sees single rows.

Many people think **`HAVING` is just another way to write `WHERE`**. In fact the two run at different moments: when `WHERE` runs there is no count yet, and when `HAVING` runs the rows are already folded into groups. That is why an aggregate cannot go in `WHERE`, and a plain column (not in the `GROUP BY`) cannot go in `HAVING`.

The step-through figure at the end of this section puts the written order beside the run order: `FROM`, `WHERE`, `GROUP BY`, `HAVING` run before `SELECT`, then come `ORDER BY` and `LIMIT`.

## Syntax

`HAVING` comes right after `GROUP BY`.
