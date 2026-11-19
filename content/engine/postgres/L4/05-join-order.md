---
id: e-pg-l4-05
engine: postgres
level: L4
module: planner
title_en: "Join order, collapse limits and GEQO"
kind: predict
minutes: 12
objectives:
  - { vi: "Biết planner tự sắp lại thứ tự JOIN, không theo thứ tự bạn viết", en: "Know that the planner reorders JOINs instead of following the written order" }
  - { vi: "Giải thích `join_collapse_limit`, `from_collapse_limit` và `geqo_threshold`", en: "Explain `join_collapse_limit`, `from_collapse_limit` and `geqo_threshold`" }
  - { vi: "Nhận ra khi nào một câu nhiều bảng có thể nhận kế hoạch kém vì không còn tìm kiếm vét cạn", en: "Recognise when a many-table query can get a weaker plan because the search is no longer exhaustive" }
requires: [e-pg-l4-04]
sources:
  - https://www.postgresql.org/docs/18/explicit-joins.html
  - https://www.postgresql.org/docs/18/runtime-config-query.html
  - https://www.postgresql.org/docs/18/geqo.html
viz: planTree
lab:
  setup: |
    DROP TABLE IF EXISTS order_notes, orders, customers;
    CREATE TABLE customers (id int PRIMARY KEY, region int NOT NULL);
    INSERT INTO customers SELECT g, g % 5 FROM generate_series(1, 500) g;
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers, amount int NOT NULL);
    INSERT INTO orders SELECT g, (g * 37) % 500 + 1, g % 997 FROM generate_series(1, 20000) g;
    CREATE INDEX orders_customer_idx ON orders (customer_id);
    CREATE TABLE order_notes (order_id int PRIMARY KEY, note text NOT NULL);
    INSERT INTO order_notes SELECT g, 'n' || g FROM generate_series(1, 20000) g;
    ANALYZE customers, orders, order_notes;
  steps:
    - task: { vi: "Đếm số ghi chú của các đơn thuộc khách vùng 1 có mã dưới 20. Viết FROM bắt đầu bằng `order_notes` (bảng lớn nhất), rồi nối `orders`, rồi `customers`.", en: "Count the notes of orders from region-1 customers with an id below 20. Write the FROM starting with `order_notes` (the largest table), then join `orders`, then `customers`." }
      solution: "SELECT count(*) FROM order_notes n JOIN orders o ON o.id = n.order_id JOIN customers c ON c.id = o.customer_id WHERE c.region = 1 AND c.id < 20"
      check: plan
      hint: { vi: "Viết theo đúng thứ tự đề nêu. Planner sẽ tự bắt đầu từ `customers`.", en: "Write the tables in the order given. The planner will start from `customers` on its own." }
predict:
  sql: "EXPLAIN (COSTS OFF) SELECT count(*) FROM order_notes n JOIN orders o ON o.id = n.order_id JOIN customers c ON c.id = o.customer_id WHERE c.region = 1 AND c.id < 20"
  q: { vi: "Câu viết `order_notes` đầu tiên. Bảng nào nằm ở nút lá đầu tiên (phía ngoài cùng) của kế hoạch?", en: "The query lists `order_notes` first. Which table is at the first leaf (the outermost side) of the plan?" }
  options:
    - { vi: "`order_notes`, vì nó được viết đầu tiên", en: "`order_notes`, because it is written first" }
    - { vi: "`customers`, vì bộ lọc làm nó chỉ còn vài dòng", en: "`customers`, because the filter leaves only a few rows" }
    - { vi: "`orders`, vì nó nằm giữa", en: "`orders`, because it sits in the middle" }
  answer: 1
  why: { vi: "Với 3 bảng (dưới `join_collapse_limit` = 8), planner xét mọi thứ tự và bắt đầu từ phía nhỏ nhất sau lọc: Index Scan trên `customers`, rồi Nested Loop sang `orders` và `order_notes`.", en: "With 3 tables (below `join_collapse_limit` = 8) the planner tries every order and starts from the smallest side after filtering: an Index Scan on `customers`, then Nested Loops into `orders` and `order_notes`." }
quiz:
  - q: { vi: "Một câu nối 14 bảng bằng JOIN tường minh, cấu hình mặc định. Điều gì đúng?", en: "A query joins 14 tables with explicit JOINs, default settings. What is true?" }
    options:
      - { vi: "Planner vẫn thử mọi thứ tự nối", en: "The planner still tries every join order" }
      - { vi: "Vượt `join_collapse_limit` (8) nên một phần thứ tự viết được giữ; và từ 12 mục FROM trở lên, GEQO (tìm kiếm di truyền) thay tìm kiếm vét cạn", en: "It is over `join_collapse_limit` (8), so part of the written order is kept; and from 12 FROM items on, GEQO (a genetic search) replaces the exhaustive search" }
      - { vi: "Postgres báo lỗi quá nhiều bảng", en: "Postgres raises a too-many-tables error" }
    answer: 1
    why: { vi: "Số thứ tự nối tăng theo giai thừa. Postgres giới hạn bằng `join_collapse_limit`/`from_collapse_limit` (8) và chuyển sang GEQO khi số mục FROM ≥ `geqo_threshold` (12). Kế hoạch khi đó có thể không tối ưu.", en: "The number of join orders grows factorially. Postgres caps it with `join_collapse_limit`/`from_collapse_limit` (8) and switches to GEQO when the FROM items reach `geqo_threshold` (12). The plan may then not be optimal." }
---

## Ý chính

- Với JOIN trong (`INNER JOIN` hoặc dấu phẩy), kết quả không phụ thuộc thứ tự viết, nên planner được phép **sắp lại** và chọn thứ tự rẻ nhất.
- Planner làm phẳng các JOIN tường minh thành danh sách để sắp lại, nhưng chỉ tới `join_collapse_limit` (mặc định 8) mục. Truy vấn con trong FROM được kéo lên tới `from_collapse_limit` (8).
- Đặt `join_collapse_limit = 1` buộc planner theo đúng thứ tự viết. Đây là công cụ cuối cùng khi bạn biết rõ hơn planner, không phải mặc định.
- Từ `geqo_threshold` (12) mục FROM trở lên, planner dùng **GEQO**, một thuật toán di truyền: nhanh hơn nhưng không bảo đảm tìm ra thứ tự tốt nhất.
- OUTER JOIN bị ràng buộc hơn: không phải mọi cặp đều đổi chỗ được.

## Ví dụ

Kế hoạch thật trên PGlite cho câu viết `order_notes` trước:

```text
Aggregate
  ->  Nested Loop
        ->  Nested Loop
              ->  Index Scan using customers_pkey on customers c
                    Index Cond: (id < 20)
                    Filter: (region = 1)
              ->  Bitmap Heap Scan on orders o
                    Recheck Cond: (customer_id = c.id)
                    ->  Bitmap Index Scan on orders_customer_idx
        ->  Index Only Scan using order_notes_pkey on order_notes n
              Index Cond: (order_id = o.id)
```

## Thực hành

Đoán bảng nằm ở lá đầu tiên, xem kế hoạch thật, rồi tự viết câu đó. Kỹ năng chuyên gia: biết khi nào thứ tự viết có ý nghĩa (quá giới hạn, OUTER JOIN, GEQO) và khi nào không.

# EN

## Key ideas

- For inner JOINs (`INNER JOIN` or commas) the result does not depend on the written order, so the planner may **reorder** them and pick the cheapest order.
- The planner flattens explicit JOINs into a list it can reorder, but only up to `join_collapse_limit` (default 8) items. Sub-queries in FROM are pulled up to `from_collapse_limit` (8).
- Setting `join_collapse_limit = 1` forces the written order. It is a last resort for when you know better than the planner, not a default.
- From `geqo_threshold` (12) FROM items on, the planner uses **GEQO**, a genetic algorithm: faster, but with no guarantee of the best order.
- OUTER JOINs are more constrained: not every pair can swap.

## Example

Real PGlite plan for the query that lists `order_notes` first:

```text
Aggregate
  ->  Nested Loop
        ->  Nested Loop
              ->  Index Scan using customers_pkey on customers c
                    Index Cond: (id < 20)
                    Filter: (region = 1)
              ->  Bitmap Heap Scan on orders o
                    Recheck Cond: (customer_id = c.id)
                    ->  Bitmap Index Scan on orders_customer_idx
        ->  Index Only Scan using order_notes_pkey on order_notes n
              Index Cond: (order_id = o.id)
```

## Practice

Guess which table sits at the first leaf, see the real plan, then write the query yourself. Expert skill: know when the written order matters (over the limits, OUTER JOINs, GEQO) and when it does not.
