---
id: multi_join
title: "Nối nhiều bảng: đi theo chuỗi khóa"
title_en: "Joining several tables: follow the chain of keys"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Nối ba, bốn bảng bằng cách đi theo khóa từ bảng này sang bảng kia.
    en: Join three or four tables by following the keys from one table to the next.
  - vi: Biết bảng nào quyết định "một dòng là gì" (độ chi tiết) sau khi nối.
    en: Know which table decides "what one row is" (the grain) after the joins.
  - vi: Đếm đúng khi phép nối nhân dòng.
    en: Count correctly when joins multiply rows.
syntax: |-
  SELECT ...
  FROM order_items i
  JOIN orders o   ON o.id = i.order_id
  JOIN products p ON p.id = i.product_id
  JOIN stores s   ON s.id = o.store_id
options:
  - { code: "JOIN … ON", vi: "mỗi `JOIN` thêm một bảng và một điều kiện khóa", en: "every `JOIN` adds one table and one key condition" }
  - { code: "ON s.id = o.store_id", vi: "bảng mới nối với bất kỳ bảng nào đã có ở trên", en: "the new table joins to any table already above it" }
  - { code: "FROM order_items i", vi: "bảng chi tiết nhất (dòng hàng) quyết định một dòng kết quả là gì", en: "the most detailed table (order lines) decides what one result row is" }
  - { code: "count(DISTINCT o.id)", vi: "đếm đơn sau khi nối với dòng hàng", en: "counts orders after joining to their lines" }
examples:
  - title: { vi: "Đơn, khách và cửa hàng", en: "Order, customer and store" }
    sql: |-
      SELECT o.id, c.name AS customer, s.name AS store
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_date = '2026-10-30'
    read:
      vi: "11 đơn ngày 30/10, mỗi đơn có tên khách và tên cửa hàng. Cả hai bảng phụ đều nối vào `orders`, bảng ở giữa."
      en: "11 orders on 30 October, each with a customer name and a store name. Both lookup tables join to `orders`, the table in the middle."
  - title: { vi: "Bốn bảng: dòng hàng, đơn, sản phẩm, cửa hàng", en: "Four tables: lines, orders, products, stores" }
    sql: |-
      SELECT o.id, p.name, i.qty, s.name AS store
      FROM order_items i
      JOIN orders o ON o.id = i.order_id
      JOIN products p ON p.id = i.product_id
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_date = '2026-10-31'
    read:
      vi: "15 dòng = 5 đơn × 3 dòng hàng mỗi đơn. Bảng `stores` không nối thẳng vào `order_items`: đi qua `orders`, nơi có `store_id`."
      en: "15 rows = 5 orders × 3 lines each. The `stores` table does not join straight to `order_items`: it goes through `orders`, which holds `store_id`."
  - title: { vi: "Số món bán theo cửa hàng và nhóm hàng", en: "Units sold per store and category" }
    sql: |-
      SELECT s.name, p.category, sum(i.qty) AS units
      FROM order_items i
      JOIN orders o ON o.id = i.order_id
      JOIN products p ON p.id = i.product_id
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_date >= '2026-10-01'
      GROUP BY s.name, p.category
      ORDER BY s.name, units DESC
    read:
      vi: "25 dòng = 5 cửa hàng × 5 nhóm hàng. Ở Ben Thanh, văn phòng phẩm bán nhiều nhất (148 món). Nối đủ bảng trước, rồi gom nhóm theo cột của hai bảng khác nhau."
      en: "25 rows = 5 stores × 5 categories. At Ben Thanh, stationery sells the most (148 units). Join every table first, then group by columns from two different tables."
  - title: { vi: "Doanh số và số đơn cùng lúc", en: "Sales and order count together" }
    sql: |-
      SELECT s.name, sum(i.qty * i.unit_price_vnd) AS sales, count(DISTINCT o.id) AS orders
      FROM orders o
      JOIN order_items i ON i.order_id = o.id
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_date >= '2026-10-01' AND o.status = 'PAID'
      GROUP BY s.name
      ORDER BY sales DESC
    read:
      vi: "Ben Thanh: hơn 30 triệu đồng từ 71 đơn đã trả. Sau khi nối với dòng hàng, mỗi đơn có nhiều dòng; `sum` cần đủ các dòng đó, còn đếm đơn thì phải bỏ trùng."
      en: "Ben Thanh: over 30 million VND from 71 paid orders. After joining the lines, each order has several rows; `sum` needs all of them, while counting orders needs repeats removed."
pitfalls:
  - title: { vi: "Đếm dòng sau khi nối với dòng hàng", en: "Counting rows after joining the lines" }
    wrong: "SELECT s.name, count(*) AS orders FROM orders o JOIN order_items i ON i.order_id = o.id JOIN stores s ON s.id = o.store_id WHERE o.order_date >= '2026-10-01' GROUP BY s.name"
    fix: "SELECT s.name, count(DISTINCT o.id) AS orders FROM orders o JOIN order_items i ON i.order_id = o.id JOIN stores s ON s.id = o.store_id WHERE o.order_date >= '2026-10-01' GROUP BY s.name"
    why:
      vi: "Một đơn có vài dòng hàng, nên sau khi nối nó xuất hiện vài lần: Ben Thanh ra 228 \"đơn\" thay vì 76. `count(*)` đếm dòng của kết quả nối, không đếm đơn."
      en: "An order has several lines, so after the join it appears several times: Ben Thanh shows 228 \"orders\" instead of 76. `count(*)` counts the rows of the joined result, not orders."
  - title: { vi: "Nối bảng vào nhầm cột", en: "Joining a table to the wrong column" }
    wrong: "SELECT o.id, p.name FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.order_id WHERE o.order_date = '2026-10-31'"
    fix: "SELECT o.id, p.name FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.order_date = '2026-10-31'"
    why:
      vi: "Sao chép dòng `JOIN` trên rồi quên sửa cột: sản phẩm bị nối với mã đơn. Mã đơn ngày 31/10 (1416 trở lên) không trùng mã sản phẩm nào (1–30), nên ra 0 dòng. Đọc lại mỗi `ON`: khóa bên phải phải là khóa ngoại trỏ tới bảng mới."
      en: "Copying the `JOIN` line above and forgetting to change the column: products are joined to the order id. The order ids of 31 October (1416 and up) match no product id (1–30), so 0 rows. Reread every `ON`: the right-hand key must be the foreign key pointing at the new table."
quiz:
  - q:
      vi: "Nối `orders` (217 đơn tháng 10) với `order_items`. Kết quả có bao nhiêu dòng?"
      en: "Join `orders` (217 October orders) with `order_items`. How many rows does the result have?"
    options:
      - { vi: "217, phép nối không đổi số dòng", en: "217, a join does not change the row count" }
      - { vi: "Bằng số dòng hàng của các đơn đó (nhiều hơn 217)", en: "As many as those orders' lines (more than 217)" }
      - { vi: "Bằng số sản phẩm", en: "As many as there are products" }
    answer: 1
    trap: 0
    why:
      vi: "Với bảng tra cứu như `stores`, số dòng không đổi, nên dễ nghĩ mọi phép nối đều vậy. Nối xuống bảng chi tiết (một đơn, nhiều dòng hàng) thì số dòng bằng số dòng chi tiết."
      en: "With a lookup table such as `stores` the count stays the same, so it is easy to think every join behaves that way. Joining down to a detail table (one order, many lines) gives as many rows as there are detail rows."
  - q:
      vi: "Thứ tự các dòng `JOIN` (nối thường) có đổi kết quả không?"
      en: "Does the order of the (inner) `JOIN` lines change the result?"
    options:
      - { vi: "Có, bảng nối trước được giữ nhiều dòng hơn", en: "Yes, the table joined first keeps more rows" }
      - { vi: "Không đổi tập dòng, miễn mỗi `ON` chỉ nhắc tới bảng đã có ở trên", en: "Not the set of rows, as long as each `ON` only names tables already above it" }
      - { vi: "Có, Postgres chạy đúng thứ tự bạn viết", en: "Yes, Postgres runs them in the order you wrote" }
    answer: 1
    trap: 2
    why:
      vi: "Câu SQL đọc từ trên xuống nên trông như một chuỗi bước. Với nối thường, kết quả là tập cặp khớp, không phụ thuộc thứ tự; Postgres còn tự chọn thứ tự chạy rẻ nhất. (Với `LEFT JOIN` thì thứ tự có ý nghĩa.)"
      en: "SQL reads top to bottom, so it looks like a chain of steps. With inner joins the result is the set of matched pairs, whatever the order; Postgres even picks the cheapest order to run them. (With `LEFT JOIN` the order does matter.)"
recap:
  - vi: "Mỗi `JOIN` thêm một bảng và một điều kiện khóa; đi theo khóa ngoại từng bước."
    en: "Each `JOIN` adds one table and one key condition; follow the foreign keys step by step."
  - vi: "Bảng chi tiết nhất quyết định một dòng kết quả là gì."
    en: "The most detailed table decides what one result row is."
  - vi: "Đếm thực thể cha sau khi nối xuống bảng con: `count(DISTINCT o.id)`."
    en: "Count parent entities after joining down to a child table: `count(DISTINCT o.id)`."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
---
## Mở bài

Câu hỏi giờ dài hơn: "Ở mỗi cửa hàng, nhóm hàng nào bán được nhiều món nhất?" Số lượng nằm ở `order_items`, nhóm hàng ở `products`, cửa hàng ở `stores`, và chỉ `orders` biết đơn thuộc cửa hàng nào. Bốn bảng, một câu trả lời.

## Ý chính

Mỗi `JOIN` thêm một bảng vào kết quả, với một điều kiện khóa nối nó vào một bảng đã có. Hãy vẽ đường đi: `order_items` → `orders` (qua `order_id`) → `stores` (qua `store_id`), và `order_items` → `products` (qua `product_id`). Bảng mới có thể nối vào bất kỳ bảng nào ở trên nó.

Nhiều người nghĩ **sau khi nối, mỗi dòng vẫn là một đơn**. Thật ra một dòng là một tổ hợp ở mức chi tiết nhất: nối tới dòng hàng thì mỗi dòng là một dòng hàng, và mỗi đơn lặp lại. `sum` trên dòng hàng là đúng; đếm đơn thì phải `count(DISTINCT …)`.

## Cú pháp

Có thể viết bao nhiêu `JOIN` tùy ý; mỗi cái một dòng, cùng thụt lề, dễ đọc lại.

# EN

## Opening

The question is longer now: "At each store, which category sold the most units?" The quantities live in `order_items`, the category in `products`, the store in `stores`, and only `orders` knows which store an order belongs to. Four tables, one answer.

## Key idea

Each `JOIN` adds one table to the result, with a key condition linking it to a table already there. Draw the path: `order_items` → `orders` (via `order_id`) → `stores` (via `store_id`), and `order_items` → `products` (via `product_id`). A new table may join to any table above it.

Many people think **after the joins, each row is still one order**. In fact a row is a combination at the most detailed level: join down to the lines and each row is one line, with every order repeated. `sum` over lines is right; counting orders needs `count(DISTINCT …)`.

## Syntax

Write as many `JOIN`s as you need; one per line, indented alike, so it is easy to reread.
