---
id: cte
title: "CTE (WITH): đặt tên cho một bước trung gian"
title_en: "CTEs (WITH): name an intermediate step"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: sql-cte-steps, at: idea }]
objectives:
  - vi: Tách một câu dài thành bước có tên bằng `WITH tên AS (…)`.
    en: Split a long query into named steps with `WITH name AS (…)`.
  - vi: Lọc và nối trên kết quả đã gộp của một bước trước.
    en: Filter and join on the aggregated result of an earlier step.
  - vi: Đặt tên cho mọi cột tính ra trong CTE để bước sau dùng được.
    en: Name every computed column in a CTE so the next step can use it.
syntax: |-
  WITH step_name AS (
    SELECT key, aggregate(column) AS total
    FROM table_name
    GROUP BY key
  )
  SELECT key, total
  FROM step_name
  WHERE total > 100
options:
  - { code: "WITH name AS (…)", vi: "một kết quả tạm có tên, chỉ sống trong câu này", en: "a named temporary result that lives only inside this query" }
  - { code: "AS total", vi: "tên cột của CTE; bước sau gọi cột bằng tên này", en: "the CTE's column name; the next step calls the column by it" }
  - { code: "FROM name", vi: "dùng CTE như một bảng: lọc, nối, gộp tiếp", en: "use the CTE like a table: filter, join, aggregate again" }
  - { code: "WITH … SELECT …", vi: "`WITH` và `SELECT` chính là một câu, không có dấu `;` ở giữa", en: "`WITH` and the main `SELECT` are one statement, with no `;` between them" }
examples:
  - title: { vi: "Gộp trước, nối tên sau", en: "Aggregate first, attach names after" }
    sql: |-
      WITH oct AS (
        SELECT store_id, count(*) AS orders
        FROM orders
        WHERE order_date >= '2026-10-01'
        GROUP BY store_id
      )
      SELECT s.name, oct.orders
      FROM oct
      JOIN stores s ON s.id = oct.store_id
      ORDER BY oct.orders DESC
    read:
      vi: "5 cửa hàng, Ben Thanh 76 đơn. Bước `oct` chỉ có 5 dòng (một mỗi cửa hàng), nên phép nối với `stores` gọn và không nhân dòng."
      en: "5 stores, Ben Thanh with 76 orders. The `oct` step has only 5 rows (one per store), so the join with `stores` is tidy and multiplies nothing."
  - title: { vi: "Gộp hai lần: phân bố số đơn mỗi khách", en: "Aggregating twice: orders per customer, then the spread" }
    sql: |-
      WITH per_customer AS (
        SELECT customer_id, count(*) AS n
        FROM orders
        WHERE customer_id IS NOT NULL AND order_date >= '2026-07-01'
        GROUP BY customer_id
      )
      SELECT n, count(*) AS customers
      FROM per_customer
      GROUP BY n
      ORDER BY n
    read:
      vi: "Từ tháng 7: 82 khách đặt 1 đơn, 70 khách đặt 4 đơn. Một `GROUP BY` không làm được việc này: bước đầu đếm theo khách, bước sau đếm theo số đơn."
      en: "Since July: 82 customers placed 1 order, 70 placed 4. One `GROUP BY` cannot do this: the first step counts per customer, the second counts per order count."
  - title: { vi: "Lọc trên một tổng đã tính", en: "Filtering on a computed total" }
    sql: |-
      WITH sales AS (
        SELECT o.store_id, sum(i.qty * i.unit_price_vnd) AS total
        FROM orders o
        JOIN order_items i ON i.order_id = o.id
        WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01'
        GROUP BY o.store_id
      )
      SELECT store_id, total
      FROM sales
      WHERE total > 20000000
    read:
      vi: "Cửa hàng 1 và 3 vượt 20 triệu đồng trong tháng 10. Câu ngoài đọc `total` như một cột bình thường; không cần `HAVING`, dù vẫn có thể dùng nó."
      en: "Stores 1 and 3 passed 20 million VND in October. The outer query reads `total` like any column; no `HAVING` is needed, though it would also work."
  - title: { vi: "Một tập con có tên rồi nối tiếp", en: "A named subset, then a join" }
    sql: |-
      WITH expensive AS (
        SELECT id, name
        FROM products
        WHERE price_vnd >= 100000
      )
      SELECT e.name, sum(i.qty) AS units
      FROM expensive e
      JOIN order_items i ON i.product_id = e.id
      GROUP BY e.name
      ORDER BY units DESC
    read:
      vi: "4 món đắt nhất và số lượng đã bán, dầu gội dẫn đầu với 494. Đặt tên `expensive` làm câu đọc như lời: \"các món đắt, mỗi món bán được bao nhiêu\"."
      en: "The 4 priciest items and the units sold, shampoo leading with 494. The name `expensive` makes the query read like words: \"the expensive items, how many of each sold\"."
pitfalls:
  - title: { vi: "Dùng tên CTE ở một câu khác", en: "Using a CTE's name in another statement" }
    wrong: "SELECT store_id, orders FROM oct"
    fix: "WITH oct AS (SELECT store_id, count(*) AS orders FROM orders WHERE order_date >= '2026-10-01' GROUP BY store_id) SELECT store_id, orders FROM oct"
    why:
      vi: "Một CTE chỉ sống trong câu lệnh có `WITH` của nó. Chạy riêng `SELECT … FROM oct`, Postgres không tìm thấy bảng nào tên `oct`: lỗi 42P01. Muốn dùng lại nhiều lần thì cần một view (Engine PostgreSQL)."
      en: "A CTE only lives inside the statement that holds its `WITH`. Run `SELECT … FROM oct` on its own and Postgres finds no table called `oct`: error 42P01. To reuse it across queries you need a view (Engine PostgreSQL)."
  - title: { vi: "Cột tính ra không có tên", en: "A computed column with no name" }
    wrong: "WITH oct AS (SELECT store_id, count(*) FROM orders WHERE order_date >= '2026-10-01' GROUP BY store_id) SELECT store_id, orders FROM oct"
    fix: "WITH oct AS (SELECT store_id, count(*) AS orders FROM orders WHERE order_date >= '2026-10-01' GROUP BY store_id) SELECT store_id, orders FROM oct WHERE orders > 30"
    why:
      vi: "Không có `AS orders`, Postgres tự đặt tên cột là `count`, nên câu ngoài tìm `orders` không thấy: lỗi 42703. Đặt tên cho mọi cột tính ra trong CTE."
      en: "Without `AS orders`, Postgres names the column `count` by itself, so the outer query cannot find `orders`: error 42703. Name every computed column in a CTE."
  - title: { vi: "Dấu chấm phẩy sau CTE", en: "A semicolon after the CTE" }
    wrong: "WITH sales AS (SELECT o.store_id, sum(i.qty * i.unit_price_vnd) AS total FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY o.store_id); SELECT * FROM sales"
    fix: "WITH sales AS (SELECT o.store_id, sum(i.qty * i.unit_price_vnd) AS total FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY o.store_id) SELECT * FROM sales"
    why:
      vi: "`;` kết thúc câu lệnh, nên `WITH …` đứng một mình không phải câu hoàn chỉnh: lỗi cú pháp 42601. CTE và câu chính là một câu duy nhất."
      en: "`;` ends a statement, so `WITH …` standing alone is not a full statement: syntax error 42601. The CTE and the main query are one single statement."
quiz:
  - q:
      vi: "CTE có lưu bảng vào cơ sở dữ liệu để lần sau dùng lại không?"
      en: "Does a CTE save a table in the database for later?"
    options:
      - { vi: "Có, như một bảng tạm tới khi đóng phiên", en: "Yes, like a temporary table until the session ends" }
      - { vi: "Không, nó chỉ tồn tại trong một câu lệnh", en: "No, it only exists inside one statement" }
      - { vi: "Có, nếu đặt tên bằng chữ hoa", en: "Yes, if the name is in capitals" }
    answer: 1
    trap: 0
    why:
      vi: "Chữ \"bảng tạm\" hay được dùng để giải thích CTE, nên dễ nghĩ nó còn lại sau câu. Nó biến mất khi câu chạy xong; muốn lưu thì cần `CREATE VIEW` hay `CREATE TABLE`."
      en: "\"Temporary table\" is often used to explain a CTE, so it is easy to think it survives the query. It is gone when the query finishes; to keep it you need `CREATE VIEW` or `CREATE TABLE`."
  - q:
      vi: "Viết lại một truy vấn con thành CTE có làm đổi kết quả không?"
      en: "Does rewriting a subquery as a CTE change the result?"
    options:
      - { vi: "Không: cùng dữ liệu, chỉ dễ đọc hơn", en: "No: same data, just easier to read" }
      - { vi: "Có, CTE luôn chậm hơn", en: "Yes, a CTE is always slower" }
      - { vi: "Có, CTE bỏ dòng trùng", en: "Yes, a CTE removes duplicates" }
    answer: 0
    trap: 1
    why:
      vi: "Ở các bản Postgres cũ, CTE luôn được tính riêng và có thể chậm, nên tiếng \"CTE chậm\" còn lưu truyền. Từ Postgres 12, CTE chỉ dùng một lần được Postgres đưa thẳng vào câu chính như một truy vấn con. Kết quả luôn như nhau."
      en: "In old Postgres versions a CTE was always computed separately and could be slow, so the \"CTEs are slow\" rumour lives on. Since Postgres 12, a CTE used once is folded into the query like a subquery. The result is always the same."
recap:
  - vi: "`WITH sales AS (…)` đặt tên cho một bước; câu chính dùng nó như một bảng."
    en: "`WITH sales AS (…)` names a step; the main query uses it like a table."
  - vi: "Đặt tên mọi cột tính ra trong CTE."
    en: "Name every computed column in a CTE."
  - vi: "CTE chỉ sống trong câu lệnh của nó; không có `;` giữa `WITH` và câu chính."
    en: "A CTE lives only in its statement; no `;` between `WITH` and the main query."
sources:
  - https://www.postgresql.org/docs/current/queries-with.html
---
## Mở bài

Câu hỏi: "Cửa hàng nào có doanh số tháng 10 trên 20 triệu?" Bạn phải nối, lọc, gộp, rồi mới lọc trên tổng. Viết hết trong một khối thì chạy được, nhưng ba tuần sau đọc lại sẽ rất khó.

## Ý chính

`WITH sales AS (…)` đặt tên cho một bước trung gian. Câu chính phía sau dùng tên đó như một bảng: chọn cột, lọc, nối, gộp tiếp. Mỗi CTE là một ý ("doanh số mỗi cửa hàng"), nên câu đọc từ trên xuống như một chuỗi bước.

Nhiều người nghĩ **CTE là một bảng được lưu lại**. Thật ra nó chỉ là một tên trong một câu lệnh: hết câu là hết. Nó cũng không làm câu đúng hơn hay sai hơn truy vấn con; nó làm câu dễ đọc và dễ kiểm tra từng bước.

## Cú pháp

Mỗi CTE có tên, `AS`, và truy vấn trong ngoặc; câu chính đứng ngay sau, không có dấu `;` ở giữa.

# EN

## Opening

The question: "Which stores sold more than 20 million in October?" You have to join, filter, aggregate, and only then filter on the total. Written as one block it runs, but reading it again three weeks later is hard.

## Key idea

`WITH sales AS (…)` names an intermediate step. The main query after it uses that name like a table: select columns, filter, join, aggregate again. Each CTE is one idea ("sales per store"), so the query reads top to bottom as a chain of steps.

Many people think **a CTE is a stored table**. It is only a name inside one statement: when the statement ends, so does the name. It also makes a query no more and no less correct than a subquery; it makes it easier to read and to check step by step.

## Syntax

Each CTE has a name, `AS`, and a query in brackets; the main query follows right after, with no `;` between them.
