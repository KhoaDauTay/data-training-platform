---
id: e-pg-l4-05
engine: postgres
level: L4
module: joins
title: "Thứ tự nối, giới hạn gộp và GEQO"
title_en: "Join order, collapse limits and GEQO"
kind: predict
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Biết planner tự sắp lại thứ tự JOIN, không theo thứ tự bạn viết", en: "Know that the planner reorders JOINs instead of following the written order" }
  - { vi: "Giải thích `join_collapse_limit`, `from_collapse_limit` và `geqo_threshold`", en: "Explain `join_collapse_limit`, `from_collapse_limit` and `geqo_threshold`" }
  - { vi: "Nhận ra khi nào một câu nhiều bảng có thể nhận kế hoạch kém vì không còn tìm kiếm vét cạn", en: "Recognise when a many-table query can get a weaker plan because the search is no longer exhaustive" }
requires: [e-pg-l4-04]
sources:
  - https://www.postgresql.org/docs/18/explicit-joins.html
  - https://www.postgresql.org/docs/18/runtime-config-query.html
  - https://www.postgresql.org/docs/18/geqo.html
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS order_notes, orders, customers CASCADE;
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
  sql: "SELECT count(*) FROM order_notes n JOIN orders o ON o.id = n.order_id JOIN customers c ON c.id = o.customer_id WHERE c.region = 1 AND c.id < 20"
  q: { vi: "Câu viết `order_notes` đầu tiên. Bảng nào nằm ở nút lá đầu tiên (phía ngoài cùng) của kế hoạch?", en: "The query lists `order_notes` first. Which table is at the first leaf (the outermost side) of the plan?" }
  options:
    - { vi: "`order_notes`, vì nó được viết đầu tiên", en: "`order_notes`, because it is written first" }
    - { vi: "`customers`, vì bộ lọc làm nó chỉ còn vài dòng", en: "`customers`, because the filter leaves only a few rows" }
    - { vi: "`orders`, vì nó nằm giữa", en: "`orders`, because it sits in the middle" }
  answer: 1
  trap: 0
  why: { vi: "`order_notes` đứng đầu câu, nhưng với JOIN trong, thứ tự viết không đổi kết quả nên không ràng buộc planner. Với 3 bảng (dưới `join_collapse_limit` = 8), planner xét mọi thứ tự và bắt đầu từ phía ít dòng nhất sau lọc: khách vùng 1 có mã dưới 20 chỉ là 4 khách (1, 6, 11, 16), lấy bằng Index Scan trên `customers`. Từ 4 dòng đó, Nested Loop tra index sang `orders` rồi `order_notes`. `orders` nằm giữa câu cũng không quyết định gì: nó có 20.000 dòng và không có bộ lọc riêng.", en: "`order_notes` comes first in the query, but with inner JOINs the written order does not change the result, so it does not bind the planner. With 3 tables (below `join_collapse_limit` = 8) the planner tries every order and starts from the side with the fewest rows after filtering: region-1 customers with an id below 20 are just 4 (1, 6, 11, 16), read with an Index Scan on `customers`. From those 4 rows, Nested Loops probe the indexes of `orders`, then `order_notes`. Sitting in the middle decides nothing for `orders` either: it has 20,000 rows and no filter of its own." }
  expect: { node: Index Scan, table: customers, index: customers_pkey }
quiz:
  - q: { vi: "Một câu nối 14 bảng bằng JOIN tường minh, cấu hình mặc định. Điều gì đúng?", en: "A query joins 14 tables with explicit JOINs, default settings. What is true?" }
    options:
      - { vi: "Planner vẫn thử mọi thứ tự nối", en: "The planner still tries every join order" }
      - { vi: "Vượt `join_collapse_limit` (8) nên một phần thứ tự viết được giữ; và từ 12 mục FROM trở lên, GEQO (tìm kiếm di truyền) thay tìm kiếm vét cạn", en: "It is over `join_collapse_limit` (8), so part of the written order is kept; and from 12 FROM items on, GEQO (a genetic search) replaces the exhaustive search" }
      - { vi: "Postgres báo lỗi quá nhiều bảng", en: "Postgres raises a too-many-tables error" }
    answer: 1
    trap: 0
    why: { vi: "\"Thử mọi thứ tự\" đúng với ít bảng, nhưng không mở rộng được: số thứ tự nối tăng theo giai thừa, 14 bảng là 14! ≈ 87 tỉ cách sắp. Vì vậy Postgres chỉ gộp tối đa `join_collapse_limit` = 8 mục JOIN để sắp lại; phần vượt quá giữ thứ tự viết. Từ `geqo_threshold` = 12 mục FROM, nó dùng GEQO (Genetic Query Optimizer, tìm kiếm di truyền): nhanh hơn nhưng có thể bỏ lỡ kế hoạch tốt nhất. Postgres không báo lỗi vì nhiều bảng; nó chỉ tìm kém kỹ hơn.", en: "\"Every order\" holds for a few tables but does not scale: join orders grow factorially, and 14 tables give 14! ≈ 87 billion orderings. So Postgres only merges up to `join_collapse_limit` = 8 JOIN items for reordering; beyond that the written order is kept. From `geqo_threshold` = 12 FROM items it uses GEQO (the Genetic Query Optimizer, a genetic search): faster, but it may miss the best plan. Postgres raises no error for many tables; it just searches less thoroughly." }
---
## Mở bài

Bạn viết câu nối ba bảng, bắt đầu bằng bảng lớn nhất. Postgres có đọc theo đúng thứ tự đó không? Đoán trước, rồi xem kế hoạch thật.

## Ý chính

Với JOIN trong (`INNER JOIN` hoặc dấu phẩy trong FROM), kết quả không phụ thuộc thứ tự viết, nên planner được phép sắp lại và chọn thứ tự rẻ nhất. Nó thường bắt đầu từ phía còn ít dòng nhất sau khi lọc, rồi nối dần sang các bảng lớn qua index.

Nhiều người nghĩ thứ tự viết trong FROM là thứ tự Postgres đọc bảng. Thật ra với vài bảng, planner thử mọi thứ tự và bỏ qua cách bạn viết.

Việc thử mọi thứ tự có giới hạn, vì số cách sắp tăng theo giai thừa. Planner chỉ làm phẳng các JOIN tường minh thành một danh sách để sắp lại khi danh sách đó không quá `join_collapse_limit` (mặc định 8) mục; truy vấn con trong FROM được kéo lên tới `from_collapse_limit` (8). Vượt giới hạn, một phần thứ tự viết được giữ nguyên. Từ `geqo_threshold` (12) mục FROM trở lên, planner chuyển sang GEQO, một tìm kiếm di truyền: nhanh hơn nhưng không bảo đảm tìm ra thứ tự tốt nhất.

`OUTER JOIN` bị ràng buộc hơn: không phải cặp nào cũng đổi chỗ được mà giữ đúng kết quả. Đặt `join_collapse_limit = 1` buộc planner theo đúng thứ tự viết; đó là công cụ cuối cùng khi bạn chắc chắn hiểu dữ liệu hơn planner, không phải mặc định.

## Cú pháp

```sql
SET join_collapse_limit = n;
SET from_collapse_limit = n;
SET geqo_threshold = n;
EXPLAIN [ ( COSTS OFF ) ] SELECT ... FROM a JOIN b ON ... JOIN c ON ...;
```

- `join_collapse_limit`: số mục tối đa mà các JOIN tường minh được gộp lại để sắp xếp; 1 = giữ thứ tự viết.
- `from_collapse_limit`: như trên, cho truy vấn con trong FROM.
- `geqo_threshold`: từ số mục FROM này trở lên thì dùng GEQO.

## Ví dụ

Cùng một phép nối, viết theo hai thứ tự:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM customers c JOIN orders o ON o.customer_id = c.id;
```

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders o JOIN customers c ON o.customer_id = c.id;
```

Hai kế hoạch giống hệt: `orders` (20.000 dòng) ở phía ngoài để dò, `customers` (500 dòng) được băm. Các giới hạn đang dùng:

```sql
SELECT name, setting FROM pg_settings
WHERE name IN ('join_collapse_limit', 'from_collapse_limit', 'geqo', 'geqo_threshold')
ORDER BY name;
```

## Lỗi hay gặp

Ép thứ tự viết khi thứ tự đó tệ:

```sql
-- WRONG: join_collapse_limit = 1 keeps the written order, largest table first
SET join_collapse_limit = 1;
EXPLAIN SELECT count(*) FROM order_notes n
JOIN orders o ON o.id = n.order_id JOIN customers c ON c.id = o.customer_id
WHERE c.region = 2 AND c.id < 30;
```

```sql
-- FIX: let the planner reorder the joins
RESET join_collapse_limit;
EXPLAIN SELECT count(*) FROM order_notes n
JOIN orders o ON o.id = n.order_id JOIN customers c ON c.id = o.customer_id
WHERE c.region = 2 AND c.id < 30;
```

Câu bị ép phải nối 20.000 ghi chú với 20.000 đơn trước, rồi mới lọc theo khách, nên chi phí ước lượng hơn gấp đôi câu để planner tự chọn (khoảng 982 so với 437). Chỉ dùng `join_collapse_limit = 1` cho một câu cụ thể đã đo, và đặt lại ngay sau đó.

## Thực hành

Đoán bảng nằm ở lá đầu tiên, xem kế hoạch thật, rồi tự viết câu đó theo đúng thứ tự đề nêu. Sau đó là một câu hỏi về câu nối nhiều bảng.

## Tóm tắt

- Với JOIN trong, thứ tự viết không quyết định thứ tự nối; planner chọn thứ tự rẻ nhất.
- Planner sắp lại tới `join_collapse_limit` và `from_collapse_limit` (8) mục; vượt đó, một phần thứ tự viết được giữ.
- Từ `geqo_threshold` (12) mục FROM, GEQO thay tìm kiếm vét cạn và có thể bỏ lỡ kế hoạch tốt nhất.
- `join_collapse_limit = 1` ép thứ tự viết: công cụ cuối cùng, không phải mặc định.

# EN

## Opening

You write a three-table join that starts with the largest table. Does Postgres read the tables in that order? Guess first, then look at the real plan.

## Key idea

For inner joins (`INNER JOIN` or commas in FROM) the result does not depend on the written order, so the planner may reorder them and pick the cheapest order. It usually starts from the side with the fewest rows left after filtering, then joins its way into the large tables through indexes.

Many people think the written order in FROM is the order Postgres reads the tables. In fact, with a few tables, the planner tries every order and ignores how you wrote it.

Trying every order has a limit, because the number of orders grows factorially. The planner only flattens explicit JOINs into one list it can reorder while that list stays within `join_collapse_limit` (8 by default) items; sub-queries in FROM are pulled up within `from_collapse_limit` (8). Past the limit, part of the written order is kept. From `geqo_threshold` (12) FROM items on, the planner switches to GEQO, a genetic search: faster, but with no guarantee of finding the best order.

`OUTER JOIN` is more constrained: not every pair can swap places and keep the result right. Setting `join_collapse_limit = 1` forces the written order; it is a last resort for when you are sure you know the data better than the planner, not a default.

## Syntax

```sql
SET join_collapse_limit = n;
SET from_collapse_limit = n;
SET geqo_threshold = n;
EXPLAIN [ ( COSTS OFF ) ] SELECT ... FROM a JOIN b ON ... JOIN c ON ...;
```

- `join_collapse_limit`: the maximum number of items explicit JOINs are merged into for reordering; 1 = keep the written order.
- `from_collapse_limit`: the same, for sub-queries in FROM.
- `geqo_threshold`: from this many FROM items on, GEQO is used.

## Example

The same join, written in two orders:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM customers c JOIN orders o ON o.customer_id = c.id;
```

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders o JOIN customers c ON o.customer_id = c.id;
```

Both plans are identical: `orders` (20,000 rows) on the outer, probing side, `customers` (500 rows) hashed. The limits in use:

```sql
SELECT name, setting FROM pg_settings
WHERE name IN ('join_collapse_limit', 'from_collapse_limit', 'geqo', 'geqo_threshold')
ORDER BY name;
```

## Common mistakes

Forcing the written order when that order is bad:

```sql
-- WRONG: join_collapse_limit = 1 keeps the written order, largest table first
SET join_collapse_limit = 1;
EXPLAIN SELECT count(*) FROM order_notes n
JOIN orders o ON o.id = n.order_id JOIN customers c ON c.id = o.customer_id
WHERE c.region = 2 AND c.id < 30;
```

```sql
-- FIX: let the planner reorder the joins
RESET join_collapse_limit;
EXPLAIN SELECT count(*) FROM order_notes n
JOIN orders o ON o.id = n.order_id JOIN customers c ON c.id = o.customer_id
WHERE c.region = 2 AND c.id < 30;
```

The forced query must join 20,000 notes with 20,000 orders first and only then filter by customer, so its estimated cost is more than double that of the query the planner orders itself (about 982 against 437). Use `join_collapse_limit = 1` only for one specific, measured query, and reset it right after.

## Practice

Guess which table sits at the first leaf, see the real plan, then write the query yourself in the order given. Then one question about a many-table join.

## Recap

- With inner joins, the written order does not decide the join order; the planner picks the cheapest.
- The planner reorders up to `join_collapse_limit` and `from_collapse_limit` (8) items; past that, part of the written order is kept.
- From `geqo_threshold` (12) FROM items, GEQO replaces the exhaustive search and may miss the best plan.
- `join_collapse_limit = 1` forces the written order: a last resort, not a default.
