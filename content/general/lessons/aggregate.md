---
id: aggregate
title: "Hàm gộp: gói nhiều dòng thành một con số"
title_en: "Aggregates: fold many rows into one number"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đếm, cộng, lấy trung bình, nhỏ nhất và lớn nhất của cả một bảng hay một phần đã lọc.
    en: Count, sum, average, and take the smallest and largest value of a whole table or a filtered part of it.
  - vi: Phân biệt `count(*)`, `count(cột)` và `count(DISTINCT cột)`.
    en: Tell `count(*)`, `count(column)` and `count(DISTINCT column)` apart.
  - vi: Biết hàm gộp xử lý ô trống (NULL) thế nào.
    en: Know how aggregates treat empty cells (NULL).
syntax: |-
  SELECT count(*), sum(column), avg(column), min(column), max(column)
  FROM table_name
  [WHERE condition]
options:
  - { code: "count(*)", vi: "số dòng, tính cả dòng có ô trống", en: "the number of rows, including rows with empty cells" }
  - { code: "count(column)", vi: "số dòng mà cột đó có giá trị (bỏ NULL)", en: "the number of rows where that column has a value (NULL skipped)" }
  - { code: "count(DISTINCT column)", vi: "số giá trị khác nhau của cột", en: "the number of different values in the column" }
  - { code: "sum / avg", vi: "tổng và trung bình, chỉ trên các ô có giá trị", en: "total and average, over non-empty cells only" }
  - { code: "min / max", vi: "nhỏ nhất và lớn nhất; dùng được cho số, chữ và ngày", en: "smallest and largest; works on numbers, text and dates" }
  - { code: "round(x, n)", vi: "làm tròn một kết quả tới n chữ số thập phân", en: "rounds a result to n decimal places" }
examples:
  - title: { vi: "Đếm và tìm hai đầu của một cột ngày", en: "Count, and find both ends of a date column" }
    sql: |-
      SELECT count(*) AS orders, min(order_date) AS first_day, max(order_date) AS last_day
      FROM orders
    read:
      vi: "Một dòng duy nhất: 1428 đơn, đơn đầu ngày 01/01/2025 và đơn cuối ngày 31/10/2026. Hàm gộp biến cả bảng thành một dòng tóm tắt."
      en: "A single row: 1428 orders, the first on 1 January 2025 and the last on 31 October 2026. Aggregates turn the whole table into one summary row."
  - title: { vi: "Tổng và trung bình tiền thu", en: "Total and average money received" }
    sql: |-
      SELECT sum(amount_vnd) AS total, avg(amount_vnd) AS average
      FROM payments
    read:
      vi: "Tổng 627.192.600 đồng, trung bình 449.600,43 đồng mỗi khoản. `avg` trả số thập phân dài: khi báo cáo thì làm tròn."
      en: "A total of 627,192,600 VND, an average of 449,600.43 VND per payment. `avg` returns a long decimal: round it for a report."
  - title: { vi: "Ba cách đếm trên cùng một cột", en: "Three ways to count on one column" }
    sql: |-
      SELECT count(*) AS all_rows, count(customer_id) AS with_customer, count(DISTINCT customer_id) AS customers
      FROM orders
    read:
      vi: "1428 dòng, nhưng chỉ 1200 đơn có mã khách (đơn khách vãng lai để trống), và 300 khách khác nhau. Ba con số trả lời ba câu hỏi khác nhau."
      en: "1428 rows, but only 1200 orders carry a customer id (walk-in orders leave it empty), and 300 different customers. Three numbers for three different questions."
  - title: { vi: "Gộp sau khi lọc", en: "Aggregating after a filter" }
    sql: |-
      SELECT sum(qty * unit_price_vnd) AS revenue
      FROM order_items
      WHERE product_id = 30
    read:
      vi: "Đèn bàn (sản phẩm 30) mang về 111.473.600 đồng. `WHERE` chạy trước, nên `sum` chỉ cộng các dòng của sản phẩm này; bên trong hàm gộp có thể là một phép tính."
      en: "The desk lamp (product 30) brought in 111,473,600 VND. `WHERE` runs first, so `sum` only adds this product's lines; the inside of an aggregate can be a calculation."
  - title: { vi: "Làm tròn và trừ hai hàm gộp", en: "Rounding, and subtracting two aggregates" }
    sql: |-
      SELECT round(avg(price_vnd)) AS avg_price, max(price_vnd) - min(price_vnd) AS spread
      FROM products
    read:
      vi: "Giá trung bình khoảng 52.833 đồng; món đắt nhất hơn món rẻ nhất 251.000 đồng. Kết quả của hàm gộp dùng tiếp trong phép tính như một số bình thường."
      en: "The average price is about 52,833 VND; the priciest item costs 251,000 VND more than the cheapest. An aggregate's result works in further arithmetic like any number."
pitfalls:
  - title: { vi: "Một cột thường cạnh hàm gộp", en: "A plain column next to an aggregate" }
    wrong: "SELECT name, max(price_vnd) FROM products"
    fix: "SELECT max(price_vnd) FROM products"
    why:
      vi: "Hàm gộp trả một dòng, còn `name` có 30 giá trị: Postgres không biết lấy tên nào và báo lỗi 42803. Muốn tên của món đắt nhất thì xếp và lấy một dòng (`ORDER BY price_vnd DESC LIMIT 1`), hoặc dùng truy vấn con ở Phần 6."
      en: "An aggregate returns one row while `name` has 30 values: Postgres cannot tell which name to show and stops with error 42803. For the name of the priciest item, sort and take one row (`ORDER BY price_vnd DESC LIMIT 1`), or use a subquery from Part 6."
  - title: { vi: "Tự chia tổng cho count(*)", en: "Dividing the sum by count(*) yourself" }
    wrong: "SELECT sum(birth_year) / count(*) FROM customers"
    fix: "SELECT avg(birth_year) FROM customers"
    why:
      vi: "`count(*)` đếm cả 27 khách không có năm sinh, nhưng `sum` thì bỏ họ, và phép chia hai số nguyên còn cắt phần lẻ: ra 1804, một năm sinh vô lý. `avg` chia đúng cho số ô có giá trị (khoảng 1982,93)."
      en: "`count(*)` counts the 27 customers with no birth year too, but `sum` skips them, and dividing two integers also drops the fraction: 1804, an absurd birth year. `avg` divides by the number of non-empty cells (about 1982.93)."
  - title: { vi: "Đếm một cột có ô trống khi muốn đếm dòng", en: "Counting a column with gaps when you meant rows" }
    wrong: "SELECT count(email) FROM customers"
    fix: "SELECT count(*) FROM customers"
    why:
      vi: "Câu hỏi là \"có bao nhiêu khách\". `count(email)` bỏ 13 khách chưa có email nên ra 287, không phải 300. Đếm dòng thì dùng `count(*)`; đếm cột khi bạn thật sự muốn \"bao nhiêu dòng có giá trị\"."
      en: "The question is \"how many customers\". `count(email)` skips the 13 customers with no email and gives 287, not 300. Count rows with `count(*)`; count a column only when you mean \"how many rows have a value\"."
quiz:
  - q:
      vi: "Một cột có các giá trị 10, NULL, 20. `avg` của cột là bao nhiêu?"
      en: "A column holds 10, NULL and 20. What is its `avg`?"
    options:
      - { vi: "10, vì NULL được tính là 0", en: "10, because NULL counts as 0" }
      - { vi: "15, vì NULL bị bỏ qua", en: "15, because NULL is skipped" }
      - { vi: "NULL, vì có một ô trống", en: "NULL, because one cell is empty" }
    answer: 1
    trap: 0
    why:
      vi: "Trong bảng tính, ô trống đôi khi được coi như 0, nên dễ đoán 10. Hàm gộp của SQL bỏ hẳn NULL: (10 + 20) / 2 = 15. Muốn coi ô trống là 0 thì phải nói rõ (Phần 4, `COALESCE`)."
      en: "In a spreadsheet a blank cell is sometimes treated as 0, so 10 is a tempting guess. SQL aggregates skip NULL entirely: (10 + 20) / 2 = 15. To treat blanks as 0 you must say so (Part 4, `COALESCE`)."
  - q:
      vi: "`count(customer_id)` trên `orders` trả 1200, `count(*)` trả 1428. Vì sao?"
      en: "`count(customer_id)` on `orders` gives 1200 and `count(*)` gives 1428. Why?"
    options:
      - { vi: "Có 228 đơn không có mã khách", en: "228 orders have no customer id" }
      - { vi: "Có 228 khách bị trùng", en: "228 customers are duplicated" }
      - { vi: "`count(*)` đếm cả cột, nên lớn hơn", en: "`count(*)` counts the columns too, so it is larger" }
    answer: 0
    trap: 1
    why:
      vi: "Dễ nghĩ chênh lệch là do trùng, nhưng `count(cột)` không bỏ trùng; nó chỉ bỏ ô trống. Bỏ trùng là việc của `count(DISTINCT cột)`."
      en: "It is easy to blame duplicates, but `count(column)` does not remove duplicates; it only skips empty cells. Removing duplicates is the job of `count(DISTINCT column)`."
  - q:
      vi: "`SELECT max(order_date) FROM orders WHERE store_id = 9` (không có cửa hàng 9) trả gì?"
      en: "What does `SELECT max(order_date) FROM orders WHERE store_id = 9` (there is no store 9) return?"
    options:
      - { vi: "Không dòng nào", en: "No rows" }
      - { vi: "Một dòng với giá trị NULL", en: "One row holding NULL" }
      - { vi: "Lỗi", en: "An error" }
    answer: 1
    why:
      vi: "Một câu chỉ có hàm gộp (không `GROUP BY`) luôn trả đúng một dòng. Không có dòng nào để gộp thì `max` là NULL, còn `count(*)` là 0."
      en: "A query with only aggregates (no `GROUP BY`) always returns exactly one row. With nothing to fold, `max` is NULL while `count(*)` is 0."
recap:
  - vi: "Hàm gộp biến nhiều dòng thành một dòng; không trộn với cột thường (lỗi 42803)."
    en: "Aggregates turn many rows into one; do not mix them with plain columns (error 42803)."
  - vi: "`count(*)` đếm dòng, `count(email)` bỏ NULL, `count(DISTINCT city)` bỏ trùng."
    en: "`count(*)` counts rows, `count(email)` skips NULL, `count(DISTINCT city)` removes duplicates."
  - vi: "`sum`, `avg`, `min`, `max` bỏ qua NULL; dùng `avg` thay vì tự chia."
    en: "`sum`, `avg`, `min`, `max` skip NULL; use `avg` rather than dividing yourself."
  - vi: "`WHERE` lọc trước, hàm gộp tính sau."
    en: "`WHERE` filters first, the aggregate runs after."
sources:
  - https://www.postgresql.org/docs/current/functions-aggregate.html
  - https://www.postgresql.org/docs/current/tutorial-agg.html
---
## Mở bài

Kế toán hỏi: "Tổng tiền đã thu là bao nhiêu, mỗi khoản trung bình bao nhiêu?" Bảng `payments` có hàng trăm dòng, nhưng câu trả lời chỉ là hai con số. Bạn cần cách gói cả bảng lại thay vì đọc từng dòng.

## Ý chính

Hàm gộp (`count`, `sum`, `avg`, `min`, `max`) nhận cả một cột của nhiều dòng và trả một giá trị. Khi `SELECT` chỉ chứa hàm gộp, kết quả là đúng một dòng. `WHERE` vẫn chạy trước, nên bạn gộp đúng phần đã lọc.

Nhiều người nghĩ **ô trống (NULL) được tính là 0**. Thật ra mọi hàm gộp trừ `count(*)` bỏ hẳn ô trống: trung bình chỉ chia cho các ô có giá trị, và `count(email)` không đếm khách chưa có email. Vì vậy cùng một bảng, `count(*)` và `count(email)` có thể khác nhau, và cả hai đều đúng cho câu hỏi của mình.

## Cú pháp

Hàm gộp đứng trong `SELECT`; mỗi hàm có thể có tên riêng bằng `AS`.

# EN

## Opening

Accounting asks: "How much money have we received in total, and what is the average payment?" The `payments` table has hundreds of rows, but the answer is just two numbers. You need a way to fold the whole table instead of reading every row.

## Key idea

An aggregate (`count`, `sum`, `avg`, `min`, `max`) takes a whole column over many rows and returns one value. When the `SELECT` holds only aggregates, the result is exactly one row. `WHERE` still runs first, so you fold exactly the filtered part.

Many people think **an empty cell (NULL) counts as 0**. In fact every aggregate except `count(*)` skips empty cells: an average divides only by the cells that have a value, and `count(email)` does not count customers with no email. So on the same table `count(*)` and `count(email)` can differ, and both are right for their own question.

## Syntax

Aggregates go in the `SELECT`; each can get its own name with `AS`.
