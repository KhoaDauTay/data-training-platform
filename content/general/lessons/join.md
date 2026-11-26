---
id: join
title: "JOIN: nối hai bảng theo một khóa"
title_en: "JOIN: combine two tables on a key"
minutes: 25
figures: [{ name: sql-inner-join-pairs, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Nối một bảng với bảng nó trỏ tới qua khóa ngoại, như đơn hàng với cửa hàng.
    en: Join a table with the table it points to through a foreign key, such as orders with stores.
  - vi: Dùng alias bảng và ghi rõ cột thuộc bảng nào.
    en: Use table aliases and say which table every column comes from.
  - vi: Kiểm tra số dòng sau khi nối để bắt lỗi khóa sai hay dòng bị mất.
    en: Check the row count after a join to catch a wrong key or lost rows.
syntax: |-
  SELECT a.column_1, b.column_2
  FROM table_a a
  [INNER] JOIN table_b b ON b.key = a.foreign_key
  [WHERE ...]
options:
  - { code: "JOIN … ON", vi: "nối mỗi dòng của a với mọi dòng của b thỏa điều kiện `ON`", en: "pairs every row of a with every row of b that passes the `ON` condition" }
  - { code: "INNER JOIN", vi: "cùng nghĩa với `JOIN`; dòng không có cặp bị bỏ", en: "same as `JOIN`; rows without a partner are dropped" }
  - { code: "orders o", vi: "alias: đặt tên ngắn cho bảng", en: "an alias: a short name for the table" }
  - { code: "o.id", vi: "cột `id` của bảng có alias `o`", en: "the `id` column of the table aliased `o`" }
  - { code: "ON b.id = a.b_id", vi: "khóa chính của bảng này bằng khóa ngoại của bảng kia", en: "this table's primary key equals the other table's foreign key" }
examples:
  - title: { vi: "Tên cửa hàng của mỗi đơn", en: "The store name of each order" }
    sql: |-
      SELECT o.id, o.order_date, s.name AS store
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_date = '2026-10-31'
    read:
      vi: "5 đơn ngày 31/10, mỗi đơn mang tên cửa hàng bán nó. Bảng `orders` chỉ có mã `store_id`; tên nằm ở `stores`, và `ON` nói hai bảng khớp nhau ở đâu."
      en: "5 orders of 31 October, each with the name of the store that sold it. The `orders` table only holds `store_id`; the name lives in `stores`, and `ON` says where the two tables meet."
  - title: { vi: "Các dòng hàng với tên sản phẩm", en: "Order lines with product names" }
    sql: |-
      SELECT i.order_id, p.name, i.qty
      FROM order_items i
      JOIN products p ON p.id = i.product_id
      WHERE i.order_id = 100
    read:
      vi: "3 dòng hàng của đơn 100. Khăn giấy xuất hiện hai lần vì đơn có hai dòng cùng món: phép nối giữ đủ dòng của bảng chi tiết."
      en: "3 lines of order 100. Paper towels show up twice because the order has two lines for that item: the join keeps every row of the detail table."
  - title: { vi: "Nối rồi gom nhóm theo tên", en: "Join, then group by name" }
    sql: |-
      SELECT s.name, count(*) AS orders
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_date >= '2026-10-01'
      GROUP BY s.name
      ORDER BY orders DESC
    read:
      vi: "Ben Thanh dẫn đầu tháng 10 với 76 đơn, Son Tra cuối với 22. Nối trước để có tên, rồi `GROUP BY` như trên một bảng."
      en: "Ben Thanh leads October with 76 orders, Son Tra is last with 22. Join first to get the name, then `GROUP BY` as on a single table."
  - title: { vi: "Khách của các đơn trong ngày", en: "The customers behind a day's orders" }
    sql: |-
      SELECT c.name, c.city, o.id
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.order_date = '2026-10-31'
    read:
      vi: "5 dòng. Nếu hôm đó có đơn của khách vãng lai (`customer_id` trống), đơn đó sẽ không có cặp ở `customers` và bị bỏ: `JOIN` chỉ giữ dòng có cặp."
      en: "5 rows. Had a walk-in order (empty `customer_id`) been placed that day, it would have no partner in `customers` and be dropped: `JOIN` keeps only matched rows."
  - title: { vi: "Doanh thu theo nhóm hàng", en: "Revenue by category" }
    sql: |-
      SELECT p.category, sum(i.qty * i.unit_price_vnd) AS revenue
      FROM order_items i
      JOIN products p ON p.id = i.product_id
      GROUP BY p.category
      ORDER BY revenue DESC
    read:
      vi: "Chăm sóc cá nhân mang về nhiều nhất (hơn 234 triệu đồng), đồ uống ít nhất. Giá bán lấy từ dòng hàng, nhóm hàng lấy từ sản phẩm."
      en: "Personal care brings in the most (over 234 million VND), drinks the least. The selling price comes from the order line, the category from the product."
pitfalls:
  - title: { vi: "Nối sai cột khóa", en: "Joining on the wrong column" }
    wrong: "SELECT o.id, s.name FROM orders o JOIN stores s ON s.id = o.customer_id WHERE o.order_date = '2026-10-31'"
    fix: "SELECT o.id, s.name FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.order_date = '2026-10-31'"
    why:
      vi: "Hai cột đều là số nên Postgres không phản đối: nó nối mã khách với mã cửa hàng. Chỉ đơn có mã khách tình cờ từ 1 tới 5 mới tìm được \"cặp\", và cặp đó không mang nghĩa gì. Câu sai ra 1 dòng thay vì 5; luôn nối khóa ngoại với đúng bảng nó trỏ tới."
      en: "Both columns are numbers, so Postgres does not object: it matches customer ids with store ids. Only orders whose customer id happens to be 1 to 5 find a \"partner\", and that pairing means nothing. The wrong query returns 1 row instead of 5; always join a foreign key to the table it points to."
  - title: { vi: "Tên cột có ở cả hai bảng", en: "A column name found in both tables" }
    wrong: "SELECT id, name FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.order_date = '2026-10-31'"
    fix: "SELECT o.id, s.name FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.order_date = '2026-10-31' ORDER BY o.id"
    why:
      vi: "Cả `orders` và `stores` đều có cột `id`, nên Postgres không biết bạn muốn cột nào: lỗi 42702 (tên mơ hồ). Ghi alias trước mọi cột khi câu có hơn một bảng."
      en: "Both `orders` and `stores` have an `id` column, so Postgres cannot tell which you mean: error 42702 (ambiguous name). Put the alias in front of every column once a query has more than one table."
  - title: { vi: "JOIN lặng lẽ bỏ dòng không có cặp", en: "JOIN silently drops unmatched rows" }
    wrong: "SELECT count(*) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.order_date >= '2026-10-01'"
    fix: "SELECT count(*) FROM orders o WHERE o.order_date >= '2026-10-01'"
    why:
      vi: "Câu hỏi là số đơn tháng 10. Nối với `customers` chỉ để \"cho đủ\" làm mất 11 đơn của khách vãng lai: 206 thay vì 217. Chỉ nối khi cần cột của bảng kia, và so số dòng trước và sau khi nối."
      en: "The question is how many orders October had. Joining `customers` \"just in case\" drops the 11 walk-in orders: 206 instead of 217. Only join when you need a column from the other table, and compare the row count before and after."
quiz:
  - q:
      vi: "`orders` có 217 đơn tháng 10, 11 đơn không có mã khách. `JOIN customers` trả bao nhiêu dòng?"
      en: "`orders` has 217 October orders, 11 without a customer id. How many rows does `JOIN customers` return?"
    options:
      - { vi: "217, vì `JOIN` giữ mọi dòng của bảng đầu", en: "217, because `JOIN` keeps every row of the first table" }
      - { vi: "206, vì dòng không có cặp bị bỏ", en: "206, because unmatched rows are dropped" }
      - { vi: "300, một dòng mỗi khách", en: "300, one per customer" }
    answer: 1
    trap: 0
    why:
      vi: "Bảng viết trước trông như bảng \"chính\", nên dễ tin nó được giữ nguyên. `JOIN` (nối trong) không có bảng chính: chỉ cặp khớp mới ra. Giữ mọi dòng của một bên là việc của `LEFT JOIN`."
      en: "The table written first looks like the \"main\" one, so it is easy to believe it is kept whole. A `JOIN` (inner join) has no main table: only matched pairs come out. Keeping every row of one side is the job of `LEFT JOIN`."
  - q:
      vi: "Mỗi đơn có nhiều dòng hàng. Nối `orders` với `order_items` rồi `count(*)` đếm gì?"
      en: "Each order has several lines. After joining `orders` with `order_items`, what does `count(*)` count?"
    options:
      - { vi: "Số đơn", en: "The orders" }
      - { vi: "Số dòng hàng: mỗi đơn lặp lại một lần cho mỗi dòng hàng của nó", en: "The lines: each order repeats once per line it has" }
      - { vi: "Số sản phẩm khác nhau", en: "The different products" }
    answer: 1
    trap: 0
    why:
      vi: "Vì câu hỏi nói về đơn, người ta mong đếm ra số đơn. Nhưng phép nối tạo một dòng cho mỗi cặp khớp, nên một đơn ba dòng hàng thành ba dòng. Đếm đơn thì dùng `count(DISTINCT o.id)` (bài \"DISTINCT: mỗi giá trị một lần\")."
      en: "Since the question is about orders, people expect the order count. But a join makes one row per matched pair, so an order with three lines becomes three rows. To count orders, use `count(DISTINCT o.id)` (lesson \"DISTINCT: each value once\")."
recap:
  - vi: "`JOIN … ON` nối dòng theo điều kiện khóa; dòng không có cặp bị bỏ."
    en: "`JOIN … ON` pairs rows on a key condition; unmatched rows are dropped."
  - vi: "Nối khóa ngoại với đúng bảng nó trỏ tới; kiểu số giống nhau không có nghĩa là đúng khóa."
    en: "Join a foreign key to the table it points to; matching number types do not mean the right key."
  - vi: "Có hơn một bảng thì ghi alias trước mọi cột."
    en: "With more than one table, prefix every column with its alias."
  - vi: "So số dòng trước và sau khi nối."
    en: "Compare row counts before and after a join."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
  - https://www.postgresql.org/docs/current/tutorial-join.html
---
## Mở bài

Bảng đơn hàng chỉ ghi `store_id = 3`, nhưng giám đốc muốn đọc "Ben Thanh". Tên cửa hàng nằm ở một bảng khác. Bạn cần đặt hai bảng cạnh nhau, dòng nào khớp với dòng nào.

## Ý chính

Dữ liệu được chia ra nhiều bảng để mỗi điều chỉ ghi một lần: tên cửa hàng ở `stores`, đơn chỉ giữ mã cửa hàng (khóa ngoại). `JOIN … ON` nối lại: với mỗi dòng của bảng này, Postgres tìm các dòng của bảng kia thỏa điều kiện `ON` và tạo một dòng mới chứa cột của cả hai.

Nhiều người nghĩ **`JOIN` giữ nguyên số dòng của bảng đầu tiên**. Thật ra nó tạo **một dòng cho mỗi cặp khớp**: dòng không có cặp bị bỏ, và dòng có nhiều cặp bị nhân lên. Vì thế sau mỗi phép nối, hãy đếm lại số dòng.

Hình cuối mục này ghép năm đơn ngày 31/10 với `stores`: mỗi đơn nối tới cửa hàng có `id` bằng `store_id` của nó, còn Son Tra không có đơn nào nên không có mặt trong kết quả.

## Cú pháp

`JOIN` viết sau `FROM`; điều kiện nối nằm trong `ON`, điều kiện lọc nằm trong `WHERE`.

# EN

## Opening

The orders table only says `store_id = 3`, but the director wants to read "Ben Thanh". Store names live in another table. You need to put the two tables side by side, each row next to its match.

## Key idea

Data is split across tables so each fact is written once: the store's name lives in `stores`, an order only keeps the store's id (a foreign key). `JOIN … ON` puts them back together: for each row of one table, Postgres finds the rows of the other that pass the `ON` condition and builds a new row with the columns of both.

Many people think **`JOIN` keeps the row count of the first table**. In fact it makes **one row per matched pair**: a row with no match is dropped, and a row with several matches is multiplied. So after every join, count the rows again.

The figure at the end of this section joins the five orders of 31 Oct to `stores`: each order links to the store whose `id` equals its `store_id`, and Son Tra, with no order that day, is missing from the result.

## Syntax

`JOIN` comes after `FROM`; the join condition goes in `ON`, filters go in `WHERE`.
