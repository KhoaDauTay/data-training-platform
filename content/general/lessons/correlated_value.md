---
id: correlated_value
title: "Truy vấn con tương quan: một giá trị cho từng dòng"
title_en: "Correlated subqueries: one value per row"
minutes: 25
figures: [{ name: sql-correlated-loop, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tính cho mỗi dòng một giá trị từ bảng khác, như ngày đặt gần nhất của từng cửa hàng.
    en: Compute, for each row, a value from another table, such as each store's latest order date.
  - vi: So một dòng với nhóm của chính nó, như món đắt hơn trung bình nhóm hàng của nó.
    en: Compare a row with its own group, such as items priced above their category's average.
  - vi: Bảo đảm truy vấn con trả đúng một giá trị cho mỗi dòng.
    en: Make sure the subquery returns exactly one value for each row.
syntax: |-
  SELECT o.column,
         (SELECT agg(x.column) FROM other_table x WHERE x.key = o.key) AS per_row
  FROM outer_table o
options:
  - { code: "x.key = o.key", vi: "điều kiện nhắc tới dòng ngoài: truy vấn con chạy lại cho mỗi dòng", en: "a condition naming the outer row: the subquery reruns for every row" }
  - { code: "(SELECT max(…) …)", vi: "gộp lại để chắc chỉ một giá trị", en: "aggregate so there is only one value" }
  - { code: "products x … products p", vi: "cùng một bảng hai alias: so dòng với nhóm của nó", en: "one table, two aliases: compare a row with its group" }
  - { code: "NULL", vi: "khi không có dòng nào khớp (với `count`, ra 0)", en: "when no row matches (with `count`, 0)" }
examples:
  - title: { vi: "Ngày có đơn gần nhất của mỗi cửa hàng", en: "Each store's latest order date" }
    sql: |-
      SELECT s.name, (SELECT max(o.order_date) FROM orders o WHERE o.store_id = s.id) AS last_order
      FROM stores s
    read:
      vi: "5 dòng; Son Tra có đơn cuối ngày 30/10, các cửa hàng khác ngày 31/10. Với mỗi cửa hàng, truy vấn con chạy với `s.id` của cửa hàng đó."
      en: "5 rows; Son Tra's last order was on 30 October, every other store's on 31 October. For each store, the subquery runs with that store's `s.id`."
  - title: { vi: "Số đơn của từng khách", en: "Each customer's order count" }
    sql: |-
      SELECT c.name, (SELECT count(*) FROM orders o WHERE o.customer_id = c.id) AS orders
      FROM customers c
      WHERE c.city = 'Can Tho'
      ORDER BY c.id
      LIMIT 6
    read:
      vi: "Mỗi khách thành viên trong lab có đúng 4 đơn. Khác với `JOIN` + `GROUP BY`, cách này giữ khách có 0 đơn mà không cần `LEFT JOIN`: `count` trên tập rỗng là 0."
      en: "Every member customer in the lab has exactly 4 orders. Unlike `JOIN` + `GROUP BY`, this keeps customers with 0 orders without a `LEFT JOIN`: `count` over an empty set is 0."
  - title: { vi: "Đắt hơn trung bình của nhóm mình", en: "Above the average of its own category" }
    sql: |-
      SELECT p.name, p.price_vnd
      FROM products p
      WHERE p.price_vnd > (SELECT avg(x.price_vnd) FROM products x WHERE x.category = p.category)
    read:
      vi: "11 món, có cả nước cam 35.000 đồng: rẻ so với cả cửa hàng nhưng đắt so với đồ uống. Alias `x` là \"các món cùng nhóm với `p`\"."
      en: "11 items, the orange juice at 35,000 VND among them: cheap for the whole shop but pricey for a drink. The alias `x` means \"the items in the same category as `p`\"."
  - title: { vi: "Đơn mới nhất của từng khách", en: "Each customer's latest order" }
    sql: |-
      SELECT o.id, o.customer_id, o.order_date
      FROM orders o
      WHERE o.customer_id BETWEEN 1 AND 5
        AND o.order_date = (SELECT max(x.order_date) FROM orders x WHERE x.customer_id = o.customer_id)
    read:
      vi: "5 đơn, mỗi khách một đơn. Nếu một khách có hai đơn cùng ngày cuối, cả hai sẽ ra; bài \"DISTINCT ON: dòng đầu tiên của mỗi nhóm\" (Phần 7) chọn đúng một."
      en: "5 orders, one per customer. If a customer had two orders on the last day, both would show; the lesson \"DISTINCT ON: the first row of each group\" (Part 7) picks exactly one."
  - title: { vi: "Tra chỉ tiêu tháng 10 cho từng cửa hàng", en: "Looking up each store's October target" }
    sql: |-
      SELECT s.name, (SELECT t.target_vnd FROM store_targets t WHERE t.store_id = s.id AND t.month = '2026-10-01') AS target
      FROM stores s
    read:
      vi: "5 dòng, từ 5 triệu (Son Tra) tới 15 triệu (Ben Thanh). Không cần hàm gộp vì mỗi cửa hàng có đúng một chỉ tiêu mỗi tháng (khóa của bảng bảo đảm)."
      en: "5 rows, from 5 million (Son Tra) to 15 million (Ben Thanh). No aggregate is needed because each store has exactly one target per month (the table's key guarantees it)."
pitfalls:
  - title: { vi: "Quên nối truy vấn con với dòng ngoài", en: "Forgetting to tie the subquery to the outer row" }
    wrong: "SELECT p.name, p.price_vnd FROM products p WHERE p.price_vnd > (SELECT avg(x.price_vnd) FROM products x)"
    fix: "SELECT p.name, p.price_vnd FROM products p WHERE p.price_vnd > (SELECT avg(x.price_vnd) FROM products x WHERE x.category = p.category)"
    why:
      vi: "Thiếu `x.category = p.category`, truy vấn con tính trung bình của cả cửa hàng, giống nhau cho mọi dòng: 8 món thay vì 11, và nước cam biến mất. Câu chạy êm, chỉ trả lời một câu hỏi khác."
      en: "Without `x.category = p.category` the subquery computes the whole shop's average, the same for every row: 8 items instead of 11, and the orange juice is gone. The query runs fine; it just answers another question."
  - title: { vi: "Truy vấn con trả nhiều dòng cho một dòng ngoài", en: "Several rows for one outer row" }
    wrong: "SELECT s.name, (SELECT o.id FROM orders o WHERE o.store_id = s.id AND o.order_date = '2026-10-31') AS order_id FROM stores s"
    fix: "SELECT s.name, (SELECT max(o.id) FROM orders o WHERE o.store_id = s.id AND o.order_date = '2026-10-31') AS order_id FROM stores s"
    why:
      vi: "Ben Thanh có hai đơn ngày 31/10, nên truy vấn con của nó trả hai giá trị: lỗi 21000. Lỗi chỉ hiện khi dữ liệu có một dòng như vậy, nên câu chạy đúng hôm qua có thể hỏng hôm nay. Gộp lại (`max`) hoặc nói rõ lấy đơn nào."
      en: "Ben Thanh had two orders on 31 October, so its subquery returns two values: error 21000. The error only shows when the data has such a row, so a query that worked yesterday can break today. Aggregate (`max`) or say which order you want."
quiz:
  - q:
      vi: "Vì sao truy vấn con trong ví dụ 1 được gọi là \"tương quan\"?"
      en: "Why is the subquery in example 1 called \"correlated\"?"
    options:
      - { vi: "Vì nó nhắc tới `s.id`, một cột của câu ngoài, nên giá trị đổi theo từng dòng", en: "Because it names `s.id`, a column of the outer query, so its value changes with each row" }
      - { vi: "Vì nó dùng hàm `max`", en: "Because it uses `max`" }
      - { vi: "Vì nó nằm trong `SELECT` chứ không trong `WHERE`", en: "Because it sits in `SELECT` rather than `WHERE`" }
    answer: 0
    trap: 2
    why:
      vi: "Vị trí trong câu dễ gây nhầm, nhưng một truy vấn con trong `SELECT` vẫn có thể độc lập (như trung bình cả bảng ở bài \"Truy vấn con một giá trị: so với một con số tính ra\"). \"Tương quan\" nghĩa là nó phụ thuộc vào dòng ngoài đang xét."
      en: "Its position is misleading: a subquery in `SELECT` can still be independent (like the table-wide average in the lesson \"Scalar subqueries: compare with a computed number\"). \"Correlated\" means it depends on the outer row being checked."
  - q:
      vi: "Truy vấn con tương quan chạy lại cho mỗi dòng ngoài. Điều đó có nghĩa gì với tốc độ?"
      en: "A correlated subquery reruns for each outer row. What does that mean for speed?"
    options:
      - { vi: "Không sao, Postgres luôn tối ưu được", en: "Nothing, Postgres can always optimise it" }
      - { vi: "Ổn khi cột nối có chỉ mục; không có chỉ mục thì mỗi dòng ngoài là một lần đọc cả bảng trong", en: "Fine when the joined column has an index; without one, every outer row means a full read of the inner table" }
      - { vi: "Luôn chậm hơn JOIN, không nên dùng", en: "Always slower than a JOIN, never use it" }
    answer: 1
    trap: 2
    why:
      vi: "Vì nó \"chạy lại\", nhiều người cấm hẳn. Với chỉ mục trên cột nối (như `orders(customer_id)`), mỗi lần chỉ đọc vài dòng và rất nhanh. Nhưng nếu điều kiện làm mất chỉ mục, chi phí nhân theo số dòng ngoài: kế hoạch có thể đắt hơn hàng trăm lần."
      en: "Because it \"reruns\", many people ban it outright. With an index on the joined column (such as `orders(customer_id)`), each run reads a few rows and is fast. But if the condition loses the index, the cost multiplies by the number of outer rows: the plan can cost hundreds of times more."
recap:
  - vi: "Truy vấn con tương quan nhắc tới dòng ngoài, nên cho một giá trị riêng mỗi dòng."
    en: "A correlated subquery names the outer row, so it gives a separate value per row."
  - vi: "Mỗi dòng ngoài phải nhận đúng một giá trị: gộp (`max`, `count`) khi có thể có nhiều."
    en: "Each outer row must get exactly one value: aggregate (`max`, `count`) when there could be several."
  - vi: "Thiếu điều kiện tương quan thì câu vẫn chạy, nhưng trả lời câu hỏi khác."
    en: "Without the correlation the query still runs, but answers another question."
sources:
  - https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES
  - https://www.postgresql.org/docs/current/functions-subquery.html
---
## Mở bài

Quản lý vùng hỏi: "Mỗi cửa hàng có đơn gần nhất vào ngày nào?" Đó là một con số **cho từng cửa hàng**, lấy từ bảng `orders`. Truy vấn con một giá trị (bài liền trước trong Phần 6) cho một số cho cả bảng; giờ bạn cần nó đổi theo từng dòng.

## Ý chính

Truy vấn con tương quan nhắc tới một cột của câu ngoài, như `o.store_id = s.id`. Vì thế Postgres tính nó riêng cho mỗi dòng ngoài, với giá trị của dòng đó. Bạn dùng nó trong `SELECT` để thêm một cột tra cứu, hoặc trong `WHERE` để so một dòng với nhóm của chính nó.

Nhiều người nghĩ **truy vấn con nào nằm trong một câu lớn cũng là tương quan**. Thật ra chỉ khi nó nhắc tới dòng ngoài. Thiếu điều kiện đó, nó thành truy vấn con độc lập, cho cùng một giá trị cho mọi dòng, và câu vẫn chạy với một ý nghĩa khác.

Hình cuối mục này chạy câu ví dụ đầu từng dòng một: với mỗi cửa hàng, truy vấn con chạy lại với `s.id` của cửa hàng đó, tổng cộng 5 lần.

## Cú pháp

Đặt alias khác nhau cho bảng ngoài và bảng trong, kể cả khi là cùng một bảng.

# EN

## Opening

The regional manager asks: "What is the latest order date of each store?" That is one number **per store**, taken from the `orders` table. A scalar subquery (the lesson just before this one in Part 6) gives one number for the whole table; now you need it to change with each row.

## Key idea

A correlated subquery names a column of the outer query, such as `o.store_id = s.id`. So Postgres computes it separately for each outer row, with that row's value. Use it in `SELECT` to add a lookup column, or in `WHERE` to compare a row with its own group.

Many people think **any subquery inside a bigger query is correlated**. Only when it names the outer row. Without that condition it is an independent subquery that gives the same value for every row, and the query still runs with a different meaning.

The figure at the end of this section runs the first example row by row: for each store the subquery runs again with that store's `s.id`, 5 times in all.

## Syntax

Give the outer and inner tables different aliases, even when they are the same table.
