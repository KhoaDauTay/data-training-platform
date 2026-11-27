---
id: e-pg-l4-17
engine: postgres
level: L4
module: analytic-plans
title: "Đoán trước: hàm cửa sổ cần dữ liệu đã sắp"
title_en: "Predict: window functions need sorted input"
kind: predict
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Chỉ ra nút nào đưa dòng đã sắp cho `WindowAgg` (Sort hay một index)
    en: Point at the node that feeds `WindowAgg` its sorted rows (a Sort or an index)
  - vi: Tạo index bỏ được bước sắp cho một hàm cửa sổ, và biết khi nào planner vẫn chọn sắp
    en: Create an index that removes the sort for a window function, and know when the planner still prefers to sort
requires: [e-pg-l4-04, e-pg-l2-02]
sources:
  - { url: https://www.postgresql.org/docs/18/queries-table-expressions.html, title_vi: "Biểu thức bảng" }
  - { url: https://www.postgresql.org/docs/18/tutorial-window.html, title_vi: "Hướng dẫn › hàm cửa sổ" }
  - { url: https://www.postgresql.org/docs/18/using-explain.html, title_vi: "Dùng EXPLAIN" }
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, region int NOT NULL);
    INSERT INTO customers SELECT g, g % 5 FROM generate_series(1, 600) g;
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int REFERENCES customers, created_on date NOT NULL, amount int NOT NULL);
    INSERT INTO orders SELECT g, (g * 37) % 500 + 1, date '2026-01-01' + (g * 7) % 300, g % 997 FROM generate_series(1, 20000) g;
    CREATE FUNCTION nodes_of(q text) RETURNS TABLE (node text) LANGUAGE plpgsql AS $$ DECLARE j json; BEGIN EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j; RETURN QUERY WITH RECURSIVE t(p) AS (SELECT j->0->'Plan' UNION ALL SELECT c FROM t, json_array_elements(t.p->'Plans') AS c) SELECT (t.p->>'Node Type') || coalesce(' (' || (t.p->>'Join Type') || ')', '') FROM t; END $$;
    CREATE FUNCTION top_cost(q text) RETURNS numeric LANGUAGE plpgsql AS $$ DECLARE j json; BEGIN EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j; RETURN (j->0->'Plan'->>'Total Cost')::numeric; END $$;
    ANALYZE customers, orders;
  steps:
    - task:
        vi: "Tổng tiền cộng dồn của từng khách: các cột `customer_id`, `created_on`, `amount` và `running` = tổng `amount` của khách đó, cộng theo ngày rồi theo mã đơn. Chưa có index nào ngoài khóa chính."
        en: "A running total per customer: columns `customer_id`, `created_on`, `amount` and `running` = the sum of that customer's `amount`, added up by day and then by order id. There is no index but the primary key yet."
      solution: SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders
      check: plan
      hint:
        vi: "`sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id)`."
        en: "`sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id)`."
      fact:
        vi: "Kế hoạch là `WindowAgg` trên một `Sort` (theo `customer_id, created_on, id`) trên `Seq Scan`: một nút Sort, tổng cost 2187.77. Nút cửa sổ chỉ đọc dòng theo thứ tự nó được đưa; việc sắp là của nút con."
        en: "The plan is `WindowAgg` over a `Sort` (on `customer_id, created_on, id`) over a `Seq Scan`: one Sort node, total cost 2187.77. The window node only reads rows in the order it is given; sorting is its child's job."
        probe: "SELECT (SELECT count(*) FROM nodes_of('SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders') WHERE node = 'Sort'), top_cost('SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders')"
        expect: [[1, 2187.77]]
    - task:
        vi: "Tạo index tên `orders_cust_day` có sẵn đúng thứ tự mà cửa sổ ở bước 1 cần."
        en: "Create an index named `orders_cust_day` that already holds the exact order the window in step 1 needs."
      solution: CREATE INDEX orders_cust_day ON orders (customer_id, created_on, id)
      target: SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders
      check: catalog
      hint:
        vi: "Cột của `PARTITION BY` trước, rồi các cột của `ORDER BY`, đúng thứ tự."
        en: "The `PARTITION BY` column first, then the `ORDER BY` columns, in order."
      fact:
        vi: "Chạy lại câu bước 1: `WindowAgg` đọc thẳng `Index Scan using orders_cust_day`, không còn nút Sort, cost giảm từ 2187.77 xuống 1452.29. Thiếu `id` ở cuối index thì chỉ có sẵn phần đầu của thứ tự."
        en: "Rerun the step 1 query: `WindowAgg` reads straight from `Index Scan using orders_cust_day`, no Sort node left, and the cost drops from 2187.77 to 1452.29. Without `id` at the end, the index would only hold the start of the order."
        probe: "SELECT (SELECT count(*) FROM nodes_of('SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders') WHERE node = 'Sort'), top_cost('SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders')"
        expect: [[0, 1452.29]]
    - task:
        vi: "Giờ chỉ khách 42: các cột `created_on`, `amount` và `running` = tổng `amount` cộng dồn theo ngày rồi theo mã đơn. Index `orders_cust_day` vẫn còn."
        en: "Now customer 42 only: columns `created_on`, `amount` and `running` = the running sum of `amount` by day and then by order id. The index `orders_cust_day` is still there."
      solution: SELECT created_on, amount, sum(amount) OVER (ORDER BY created_on, id) AS running FROM orders WHERE customer_id = 42
      check: plan
      hint:
        vi: "Lọc `WHERE customer_id = 42`; cửa sổ chỉ còn `ORDER BY created_on, id`."
        en: "Filter `WHERE customer_id = 42`; the window keeps only `ORDER BY created_on, id`."
      fact:
        vi: "Bất ngờ: vẫn có Sort. Planner đọc 40 dòng của khách bằng `Bitmap Heap Scan` (đọc theo trang, mất thứ tự) rồi sắp 40 dòng đó, tổng cost 85.99. Sắp 40 dòng rẻ hơn đi index theo thứ tự từng dòng một. Có index đúng thứ tự không có nghĩa là luôn bỏ Sort."
        en: "A surprise: there is still a Sort. The planner reads the customer's 40 rows with a `Bitmap Heap Scan` (page order, no row order) and then sorts those 40 rows, total cost 85.99. Sorting 40 rows is cheaper than walking the index row by row in order. An index in the right order does not mean the Sort always goes."
        probe: "SELECT (SELECT count(*) FROM nodes_of('SELECT created_on, amount, sum(amount) OVER (ORDER BY created_on, id) AS running FROM orders WHERE customer_id = 42') WHERE node IN ('Sort', 'Bitmap Heap Scan')), top_cost('SELECT created_on, amount, sum(amount) OVER (ORDER BY created_on, id) AS running FROM orders WHERE customer_id = 42'), (SELECT count(*) FROM orders WHERE customer_id = 42)"
        expect: [[2, 85.99, 40]]
    - task:
        vi: "Một câu có hai cửa sổ khác thứ tự: cộng dồn theo khách (như bước 1) và `rank() OVER (ORDER BY amount DESC)`. Đếm số nút `Sort` trong kế hoạch của nó bằng hàm `nodes_of(q)` (trả một dòng cho mỗi nút)."
        en: "A query with two windows in different orders: the running total per customer (as in step 1) and `rank() OVER (ORDER BY amount DESC)`. Count the `Sort` nodes in its plan with the function `nodes_of(q)` (one row per node)."
      solution: "SELECT count(*) FROM nodes_of('SELECT customer_id, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running, rank() OVER (ORDER BY amount DESC) AS r FROM orders') WHERE node = 'Sort'"
      check: rows
      hint:
        vi: "Truyền cả câu vào `nodes_of('…')` rồi `WHERE node = 'Sort'`."
        en: "Pass the whole query to `nodes_of('…')`, then `WHERE node = 'Sort'`."
      fact:
        vi: "Hai nút Sort, kể cả khi đã có `orders_cust_day`: mỗi thứ tự cửa sổ cần một lần sắp, và sau khi sắp theo `amount` thì thứ tự của index đã mất. Các hàm dùng cùng một cửa sổ thì dùng chung một lần sắp."
        en: "Two Sort nodes, even with `orders_cust_day` in place: each window order needs its own sort, and once rows are sorted by `amount` the index order is gone. Functions sharing one window share one sort."
        probe: "SELECT count(*) FROM nodes_of('SELECT customer_id, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running, rank() OVER (ORDER BY amount DESC) AS r FROM orders') WHERE node = 'Sort'"
        expect: [[2]]
predict:
  sql: SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders
  q:
    vi: "Câu cộng dồn theo khách, theo ngày rồi mã đơn. Bảng chỉ có index khóa chính `orders_pkey` (trên `id`). Nút nào nằm ngay dưới `WindowAgg`?"
    en: "The running total per customer, by day and then order id. The table only has the primary key index `orders_pkey` (on `id`). Which node sits right under `WindowAgg`?"
  options:
    - { vi: "Một `Sort` theo `customer_id, created_on, id`, trên `Seq Scan`", en: "A `Sort` on `customer_id, created_on, id`, over a `Seq Scan`" }
    - { vi: "Không có gì: `WindowAgg` tự sắp trong bộ nhớ", en: "Nothing: `WindowAgg` sorts in memory by itself" }
    - { vi: "`Index Scan using orders_pkey`, vì khóa chính có `id`", en: "`Index Scan using orders_pkey`, because the primary key holds `id`" }
  answer: 0
  trap: 1
  why:
    vi: "\"Hàm cửa sổ tự lo thứ tự\" nghe hợp lý vì `ORDER BY` nằm ngay trong `OVER (...)`. Nhưng tài liệu nói hàm cửa sổ luôn cần dữ liệu đã sắp sẵn: `WindowAgg` chỉ đọc dòng theo thứ tự nút con đưa lên. `orders_pkey` sắp theo `id`, không theo khách, nên planner phải thêm một nút `Sort` trên `Seq Scan`."
    en: "\"The window function handles the order itself\" sounds right because the `ORDER BY` sits inside `OVER (...)`. But the docs say window functions always need presorted input: `WindowAgg` only reads rows in the order its child hands them up. `orders_pkey` is ordered by `id`, not by customer, so the planner adds a `Sort` node over a `Seq Scan`."
  expect: { node: Sort }
quiz:
  - q:
      vi: "Câu \"3 đơn lớn nhất mỗi khách\" dùng `row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC, id)` rồi lọc `rn <= 3` ở câu ngoài. Bộ lọc đó có làm planner đọc ít dòng hơn không?"
      en: "The query \"each customer's 3 largest orders\" uses `row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC, id)`, then filters `rn <= 3` outside. Does that filter make the planner read fewer rows?"
    options:
      - { vi: "Không: vẫn đọc và sắp mọi đơn; điều kiện chỉ giúp dừng tính trong từng nhóm", en: "No: it still reads and sorts every order; the condition only stops the work inside each group" }
      - { vi: "Có: planner chỉ đọc 3 đơn của mỗi khách", en: "Yes: the planner reads only 3 orders per customer" }
      - { vi: "Có, nhưng chỉ khi đã có index theo `customer_id`", en: "Yes, but only once there is an index on `customer_id`" }
    answer: 0
    why:
      vi: "\"Chỉ cần 3 dòng mỗi nhóm thì chỉ đọc 3 dòng\" nghe hợp lý. Nhưng muốn biết đơn nào lớn nhất thì phải xem hết đơn của khách đó: kế hoạch vẫn là `WindowAgg` trên `Sort` trên `Seq Scan` cả bảng. Postgres đẩy điều kiện vào `WindowAgg` (dòng `Run Condition`) để thôi tính thêm số thứ tự trong nhóm, không để đọc ít hơn. Index chỉ trên `customer_id` cũng không đổi điều đó: nó không có thứ tự theo `amount`, và câu vẫn cần mọi đơn của mọi khách."
      en: "\"Only 3 rows per group are needed, so only 3 rows are read\" sounds right. But to know which orders are largest, every order of that customer must be seen: the plan is still `WindowAgg` over `Sort` over a full `Seq Scan`. Postgres pushes the condition into `WindowAgg` (the `Run Condition` line) to stop numbering inside a group, not to read less. An index on `customer_id` alone changes nothing either: it holds no order by `amount`, and the query still needs every order of every customer."
---

## Mở bài

Một báo cáo xếp hạng chạy chậm dù bảng có index. Thủ phạm thường là một lần sắp ẩn ngay dưới hàm cửa sổ. Bài này cho bạn đoán nút đó trước khi xem kế hoạch thật.

## Ý chính

Hàm cửa sổ (`OVER (...)`) chạy trong nút `WindowAgg`. Nút này không tự sắp: nó đọc dòng theo đúng thứ tự nút con đưa lên, và cần thứ tự đó khớp `PARTITION BY` rồi `ORDER BY` của cửa sổ. Thứ tự đến từ một trong ba chỗ:

- một nút `Sort` ngay dưới nó;
- một index có sẵn đúng thứ tự đó;
- một `Incremental Sort` khi index có sẵn phần đầu của thứ tự.

Các hàm dùng cùng một cửa sổ dùng chung một lần sắp. Hai cửa sổ khác thứ tự thì cần hai lần sắp.

## Ví dụ

```sql
SELECT customer_id, created_on, amount,
       sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running
FROM orders;
```

## Thực hành

Chọn đáp án trước, rồi bấm "Xem thật" để thấy kế hoạch thật. Bốn bước sau đi từ câu cửa sổ có Sort, tới index bỏ được Sort, tới chỗ planner vẫn chọn sắp dù index có sẵn thứ tự. Hàm `nodes_of(q)` trả một dòng cho mỗi nút trong kế hoạch của câu `q`, và `top_cost(q)` trả cost của nút trên cùng.

Sau bài này bạn đọc được kế hoạch của một câu có hàm cửa sổ, chỉ ra nút sắp đến từ đâu, và biết khi nào một index bỏ được nó.

## Tóm tắt

- `WindowAgg` không tự sắp: nó cần dòng đến đúng thứ tự `PARTITION BY` rồi `ORDER BY`.
- Thứ tự đến từ một `Sort`, một index đúng thứ tự, hoặc một `Incremental Sort`.
- Các hàm dùng chung một cửa sổ dùng chung một lần sắp; hai cửa sổ khác thứ tự cần hai lần sắp.

# EN

## Opening

A ranking report runs slowly even though the table has indexes. The usual culprit is a hidden sort right under the window function. This lesson has you guess that node before you see the real plan.

## Key idea

Window functions (`OVER (...)`) run in a `WindowAgg` node. That node does not sort: it reads rows in the exact order its child hands them up, and needs that order to match the window's `PARTITION BY` and then its `ORDER BY`. The order comes from one of three places:

- a `Sort` node right under it;
- an index that already holds that order;
- an `Incremental Sort` when an index holds the start of the order.

Functions that share one window share one sort. Two windows in different orders need two sorts.

## Example

```sql
SELECT customer_id, created_on, amount,
       sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running
FROM orders;
```

## Practice

Pick an answer first, then press "See the real plan" to see the real plan. The four steps then go from a window query with a Sort, to an index that removes the Sort, to a case where the planner still sorts although the index holds the order. The function `nodes_of(q)` returns one row per node in the plan of query `q`, and `top_cost(q)` returns the cost of the top node.

After this lesson you can read the plan of a query with a window function, say where its sort comes from, and know when an index removes it.

## Recap

- `WindowAgg` does not sort: it needs rows in `PARTITION BY` then `ORDER BY` order.
- That order comes from a `Sort`, an index in that order, or an `Incremental Sort`.
- Functions sharing one window share one sort; two windows in different orders need two sorts.
