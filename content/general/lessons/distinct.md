---
id: distinct
title: "DISTINCT: mỗi giá trị một lần"
title_en: "DISTINCT: each value once"
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: sql-distinct-rows, at: idea }]
objectives:
  - vi: Liệt kê các giá trị khác nhau của một cột hay một tổ hợp cột.
    en: List the different values of one column or of a combination of columns.
  - vi: Đếm số giá trị khác nhau bằng `count(DISTINCT ...)`.
    en: Count different values with `count(DISTINCT ...)`.
  - vi: Biết `DISTINCT` áp lên cả dòng, không lên riêng một cột.
    en: Know that `DISTINCT` applies to the whole row, not to one column.
syntax: |-
  SELECT DISTINCT column_1 [, column_2]
  FROM table_name

  SELECT count(DISTINCT column)
  FROM table_name
options:
  - { code: "SELECT DISTINCT a", vi: "mỗi giá trị của `a` một dòng", en: "one row per value of `a`" }
  - { code: "SELECT DISTINCT a, b", vi: "mỗi cặp (a, b) khác nhau một dòng; không phải mỗi `a` một dòng", en: "one row per different (a, b) pair; not one row per `a`" }
  - { code: "count(DISTINCT a)", vi: "số giá trị khác nhau của `a`, không tính NULL", en: "how many different values `a` has, NULL not counted" }
  - { code: "NULL", vi: "với `DISTINCT`, mọi ô trống là cùng một giá trị", en: "for `DISTINCT`, all empty cells are the same value" }
examples:
  - title: { vi: "Các thành phố có khách", en: "The cities customers live in" }
    sql: |-
      SELECT DISTINCT city
      FROM customers
      ORDER BY city
    read:
      vi: "6 dòng từ 300 khách: 5 thành phố và một dòng trống (NULL nằm cuối khi xếp tăng dần). Các ô trống gom thành một dòng."
      en: "6 rows from 300 customers: 5 cities and one empty row (NULL sorts last going up). The empty cells collapse into one row."
  - title: { vi: "Tổ hợp hai cột", en: "A two-column combination" }
    sql: |-
      SELECT DISTINCT store_id, channel
      FROM orders
      ORDER BY store_id, channel
    read:
      vi: "10 cặp cửa hàng–kênh: mỗi cửa hàng bán cả online lẫn tại quầy. `DISTINCT` bỏ trùng trên cặp, nên mỗi cửa hàng xuất hiện hai lần."
      en: "10 store–channel pairs: every store sells both online and in store. `DISTINCT` removes repeats of the pair, so each store shows up twice."
  - title: { vi: "Đếm khách khác nhau", en: "Counting different customers" }
    sql: |-
      SELECT count(DISTINCT customer_id)
      FROM orders
      WHERE order_date >= '2026-10-01'
    read:
      vi: "126 khách đã đặt hàng trong tháng 10/2026, dù họ đặt 206 đơn có mã khách. Đơn của khách vãng lai (mã trống) không được đếm."
      en: "126 customers ordered in October 2026, although they placed 206 orders with a customer id. Walk-in orders (empty id) are not counted."
  - title: { vi: "Hai con số khác nhau trên cùng một bảng", en: "Two different counts on one table" }
    sql: |-
      SELECT count(DISTINCT session_id) AS sessions, count(DISTINCT user_id) AS users
      FROM app_events
    read:
      vi: "900 phiên dùng ứng dụng của 300 người: trung bình mỗi người 3 phiên. Mỗi `count(DISTINCT ...)` bỏ trùng trên cột của riêng nó."
      en: "900 app sessions from 300 people: 3 sessions per person on average. Each `count(DISTINCT ...)` removes repeats on its own column."
pitfalls:
  - title: { vi: "Đếm dòng khi câu hỏi là \"bao nhiêu khách\"", en: "Counting rows when the question is \"how many customers\"" }
    wrong: "SELECT count(customer_id) FROM orders WHERE order_date >= '2026-10-01'"
    fix: "SELECT count(DISTINCT customer_id) FROM orders WHERE order_date >= '2026-10-01'"
    why:
      vi: "`count(customer_id)` đếm mỗi đơn một lần, nên khách đặt ba đơn được đếm ba lần: 206 thay vì 126. Đếm \"bao nhiêu khách\" thì bỏ trùng."
      en: "`count(customer_id)` counts every order, so a customer with three orders is counted three times: 206 instead of 126. To count \"how many customers\", remove repeats."
  - title: { vi: "Thêm một cột làm DISTINCT mất tác dụng", en: "One more column cancels DISTINCT" }
    wrong: "SELECT DISTINCT city, name FROM customers"
    fix: "SELECT DISTINCT city FROM customers"
    why:
      vi: "Câu hỏi là danh sách thành phố. Thêm `name` thì `DISTINCT` bỏ trùng trên cặp thành phố–tên, nên ra 92 dòng, gần như không bỏ được gì. `DISTINCT` luôn áp lên cả dòng."
      en: "The question is a list of cities. Adding `name` makes `DISTINCT` remove repeats of the city–name pair, so it returns 92 rows and removes almost nothing. `DISTINCT` always applies to the whole row."
  - title: { vi: "Ngoặc không giới hạn DISTINCT", en: "Brackets do not limit DISTINCT" }
    wrong: "SELECT DISTINCT (birth_year), city FROM customers WHERE city = 'Hue'"
    fix: "SELECT DISTINCT birth_year FROM customers WHERE city = 'Hue'"
    why:
      vi: "Ngoặc quanh `birth_year` chỉ là ngoặc của một biểu thức; `DISTINCT` vẫn áp lên cả hai cột. Ở đây số dòng tình cờ bằng nhau vì mọi dòng cùng là Huế, nhưng kết quả thừa một cột; với cột khác, năm sẽ lặp. Muốn \"mỗi năm một dòng\", chỉ chọn năm."
      en: "The brackets around `birth_year` are just brackets around an expression; `DISTINCT` still covers both columns. Here the row count happens to match because every row is Hue, but the result has an extra column; with another column the years would repeat. For \"one row per year\", select only the year."
quiz:
  - q:
      vi: "`SELECT DISTINCT store_id, channel FROM orders` trả bao nhiêu dòng cho cửa hàng 1?"
      en: "How many rows does `SELECT DISTINCT store_id, channel FROM orders` return for store 1?"
    options:
      - { vi: "1, vì `DISTINCT` đứng ngay trước `store_id`", en: "1, because `DISTINCT` stands right before `store_id`" }
      - { vi: "2, một cho mỗi kênh của cửa hàng 1", en: "2, one for each channel of store 1" }
      - { vi: "Bằng số đơn của cửa hàng 1", en: "As many as store 1's orders" }
    answer: 1
    trap: 0
    why:
      vi: "Vị trí của từ khóa làm người ta tưởng nó chỉ áp cho cột đầu. `DISTINCT` áp lên cả dòng: cửa hàng 1 có hai cặp khác nhau (online và tại quầy) nên có hai dòng."
      en: "The keyword's position makes it look as if it only covers the first column. `DISTINCT` covers the whole row: store 1 has two different pairs (online and in store), so it gets two rows."
  - q:
      vi: "Cột có các giá trị A, NULL, A, NULL. `count(DISTINCT cột)` là bao nhiêu?"
      en: "A column holds A, NULL, A, NULL. What is `count(DISTINCT column)`?"
    options:
      - { vi: "1", en: "1" }
      - { vi: "2, vì NULL cũng là một giá trị khác", en: "2, because NULL is another value too" }
      - { vi: "4", en: "4" }
    answer: 0
    trap: 1
    why:
      vi: "`SELECT DISTINCT` trả cả dòng NULL nên dễ nghĩ nó cũng được đếm. Nhưng `count(...)` không bao giờ đếm NULL: chỉ còn A."
      en: "`SELECT DISTINCT` does return a NULL row, so it is easy to think NULL is counted too. But `count(...)` never counts NULL: only A is left."
  - q:
      vi: "Kết quả có dòng lặp sau khi nối hai bảng. Thêm `DISTINCT` có phải cách sửa tốt không?"
      en: "A result shows repeated rows after joining two tables. Is adding `DISTINCT` a good fix?"
    options:
      - { vi: "Có, DISTINCT luôn là cách bỏ trùng an toàn", en: "Yes, DISTINCT is always a safe way to remove repeats" }
      - { vi: "Thường là không: hãy tìm vì sao dòng bị nhân lên trước, DISTINCT có thể che lỗi và tốn công", en: "Usually not: find out why rows multiplied first; DISTINCT can hide the bug and costs work" }
      - { vi: "Không, DISTINCT không dùng được sau phép nối", en: "No, DISTINCT does not work after a join" }
    answer: 1
    trap: 0
    why:
      vi: "Bỏ trùng nghe vô hại, nên nhiều người thêm `DISTINCT` cho tới khi số liệu \"đẹp\". Nếu dòng lặp vì nối sai khóa, `DISTINCT` chỉ che đi, và tổng tính trên đó vẫn sai. Phần 5 dạy cách nối đúng."
      en: "Removing repeats sounds harmless, so many people add `DISTINCT` until the numbers \"look right\". If rows repeat because of a wrong join key, `DISTINCT` only hides it, and sums built on it stay wrong. Part 5 shows how to join correctly."
recap:
  - vi: "`DISTINCT` bỏ dòng trùng trên toàn bộ các cột đã chọn."
    en: "`DISTINCT` removes rows that repeat across all the selected columns."
  - vi: "`count(DISTINCT a)` đếm giá trị khác nhau và bỏ NULL."
    en: "`count(DISTINCT a)` counts different values and skips NULL."
  - vi: "Thấy dòng lặp, tìm nguyên nhân trước khi thêm `DISTINCT`."
    en: "When rows repeat, find the cause before adding `DISTINCT`."
sources:
  - https://www.postgresql.org/docs/current/queries-select-lists.html#QUERIES-DISTINCT
  - https://www.postgresql.org/docs/current/functions-aggregate.html
---
## Mở bài

Nhóm marketing hỏi: "Tháng 10 có bao nhiêu khách đã mua hàng?" Bảng `orders` có một dòng cho mỗi đơn, và một khách có thể đặt nhiều đơn. Đếm dòng sẽ đếm một người nhiều lần.

## Ý chính

`SELECT DISTINCT` giữ mỗi dòng kết quả một lần: các dòng giống nhau ở mọi cột đã chọn chỉ còn một. `count(DISTINCT customer_id)` làm điều tương tự bên trong hàm đếm: nó đếm số giá trị khác nhau thay vì số dòng.

Nhiều người nghĩ **`DISTINCT` gắn với cột đứng ngay sau nó**. Thật ra nó áp lên cả dòng: chọn thêm một cột là phép bỏ trùng xét thêm cột đó, và dòng chỉ trùng khi giống nhau ở mọi cột. Nếu bạn muốn "mỗi khách một dòng" thì chỉ chọn cột định danh khách.

## Cú pháp

`DISTINCT` đứng ngay sau `SELECT`, hoặc bên trong hàm đếm.

# EN

## Opening

The marketing team asks: "How many customers bought something in October?" The `orders` table has one row per order, and one customer can place many orders. Counting rows would count one person several times.

## Key idea

`SELECT DISTINCT` keeps each result row once: rows that are equal on every selected column collapse into one. `count(DISTINCT customer_id)` does the same inside a count: it counts different values instead of rows.

Many people think **`DISTINCT` belongs to the column right after it**. In fact it covers the whole row: selecting one more column means the repeat check looks at that column too, and rows only repeat when they match on every column. If you want "one row per customer", select only the column that identifies the customer.

## Syntax

`DISTINCT` comes right after `SELECT`, or inside a count.
