---
id: e-pg-l4-18
engine: postgres
level: L4
module: analytic-plans
title: "Đoán trước: ba cách viết \"không có\", ba kế hoạch"
title_en: "Predict: three ways to write \"has none\", three plans"
kind: predict
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Nhận ra anti join trong kế hoạch, và biết cách viết nào planner đổi được thành anti join
    en: Spot an anti join in a plan, and know which way of writing it the planner can turn into one
  - vi: Giải thích vì sao `NOT IN` trả rỗng khi bên phải có một NULL
    en: Explain why `NOT IN` returns nothing when the right side holds one NULL
requires: [e-pg-l4-04, e-pg-l1-05]
sources:
  - https://www.postgresql.org/docs/18/functions-subquery.html
  - https://www.postgresql.org/docs/18/using-explain.html
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, region int NOT NULL);
    INSERT INTO customers SELECT g, g % 5 FROM generate_series(1, 600) g;
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int REFERENCES customers, created_on date NOT NULL, amount int NOT NULL);
    INSERT INTO orders SELECT g, (g * 37) % 500 + 1, date '2026-01-01' + (g * 7) % 300, g % 997 FROM generate_series(1, 20000) g;
    INSERT INTO orders VALUES (20001, NULL, date '2026-10-31', 100);
    CREATE FUNCTION nodes_of(q text) RETURNS TABLE (node text) LANGUAGE plpgsql AS $$ DECLARE j json; BEGIN EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j; RETURN QUERY WITH RECURSIVE t(p) AS (SELECT j->0->'Plan' UNION ALL SELECT c FROM t, json_array_elements(t.p->'Plans') AS c) SELECT (t.p->>'Node Type') || coalesce(' (' || (t.p->>'Join Type') || ')', '') FROM t; END $$;
    CREATE FUNCTION top_rows(q text) RETURNS numeric LANGUAGE plpgsql AS $$ DECLARE j json; BEGIN EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j; RETURN (j->0->'Plan'->>'Plan Rows')::numeric; END $$;
    ANALYZE customers, orders;
  steps:
    - task:
        vi: "Mã các khách chưa từng đặt đơn nào, tăng dần. Bảng `orders` có một đơn của khách vãng lai, `customer_id` là NULL."
        en: "The ids of the customers who never placed an order, ascending. Table `orders` holds one order from a walk-in customer, with a NULL `customer_id`."
      solution: SELECT c.id FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) ORDER BY c.id
      check: rows
      ordered: true
      hint:
        vi: "`WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`."
        en: "`WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`."
      fact:
        vi: "Có 100 khách như vậy. Viết `c.id NOT IN (SELECT customer_id FROM orders)` thì ra 0 dòng: so với một NULL thì `NOT IN` cho NULL, không phải true, nên `WHERE` bỏ mọi khách."
        en: "There are 100 such customers. Writing `c.id NOT IN (SELECT customer_id FROM orders)` gives 0 rows: against a NULL, `NOT IN` yields NULL, not true, so the `WHERE` drops every customer."
        probe: SELECT (SELECT count(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)), (SELECT count(*) FROM customers c WHERE c.id NOT IN (SELECT customer_id FROM orders))
        expect: [[100, 0]]
    - task:
        vi: "Hàm `nodes_of(q)` trả một dòng cho mỗi nút trong kế hoạch của câu `q`, kèm kiểu nối trong ngoặc. Lấy nút nối của cách viết `LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL` (chọn `c.id` từ `customers c`): chỉ giữ dòng có chữ `Join`."
        en: "The function `nodes_of(q)` returns one row per node in the plan of query `q`, with the join type in brackets. Get the join node of the form `LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL` (selecting `c.id` from `customers c`): keep only the row containing `Join`."
      solution: "SELECT node FROM nodes_of('SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL') WHERE node LIKE '%Join%'"
      check: rows
      hint:
        vi: "Truyền cả câu vào `nodes_of('…')` rồi `WHERE node LIKE '%Join%'`."
        en: "Pass the whole query to `nodes_of('…')`, then `WHERE node LIKE '%Join%'`."
      fact:
        vi: "Ra `Hash Join (Right)`: một phép nối ngoài thường, rồi một `Filter` bỏ các dòng có đơn. Planner không nhận ra đây là anti join, nên ước lượng chỉ 1 dòng dù thật có 100."
        en: "It is `Hash Join (Right)`: a plain outer join, then a `Filter` dropping the rows that found an order. The planner does not see an anti join here, so it estimates 1 row although there are really 100."
        probe: "SELECT (SELECT node FROM nodes_of('SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL') WHERE node LIKE '%Join%'), top_rows('SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL'), (SELECT count(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL)"
        expect: [["Hash Join (Right)", 1, 100]]
    - task:
        vi: "Như bước 2, nhưng kiểm NULL trên cột của điều kiện nối: `WHERE o.customer_id IS NULL`. Lấy dòng có chữ `Join`."
        en: "As in step 2, but test for NULL on the join condition's column: `WHERE o.customer_id IS NULL`. Get the row containing `Join`."
      solution: "SELECT node FROM nodes_of('SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.customer_id IS NULL') WHERE node LIKE '%Join%'"
      check: rows
      hint:
        vi: "Chỉ đổi `o.id` thành `o.customer_id` trong câu của bước 2."
        en: "Only change `o.id` to `o.customer_id` in the step 2 query."
      fact:
        vi: "Giờ là `Hash Join (Right Anti)`, đúng kế hoạch của `NOT EXISTS`, và ước lượng là 100 dòng. Cột của điều kiện nối chỉ NULL khi không có cặp, nên planner chứng minh được đây là anti join."
        en: "Now it is `Hash Join (Right Anti)`, the same plan as `NOT EXISTS`, and the estimate is 100 rows. The join condition's column is NULL only when there is no match, so the planner can prove this is an anti join."
        probe: "SELECT (SELECT node FROM nodes_of('SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.customer_id IS NULL') WHERE node LIKE '%Join%'), top_rows('SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.customer_id IS NULL')"
        expect: [["Hash Join (Right Anti)", 100]]
predict:
  sql: SELECT c.id FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)
  q:
    vi: "Khách chưa từng đặt đơn, viết bằng `NOT EXISTS`. Bảng chỉ có index khóa chính. Kế hoạch trông thế nào?"
    en: "Customers who never ordered, written with `NOT EXISTS`. The tables only have their primary key indexes. What does the plan look like?"
  options:
    - { vi: "Một `Hash Join` kiểu anti: băm `customers`, quét `orders` một lần, giữ khách không có cặp", en: "One anti `Hash Join`: hash `customers`, scan `orders` once, keep the customers with no match" }
    - { vi: "`Seq Scan` trên `customers`, và câu con chạy lại cho từng khách", en: "A `Seq Scan` on `customers`, with the subquery run again for each customer" }
    - { vi: "Một `Nested Loop`: với mỗi khách, tra `orders` một lần", en: "A `Nested Loop`: for each customer, one lookup into `orders`" }
  answer: 0
  trap: 1
  why:
    vi: "\"Câu con tương quan chạy lại cho từng dòng\" nghe hợp lý vì nó nhắc tới `c.id` của câu ngoài. Nhưng planner đổi `NOT EXISTS` thành một phép nối anti: băm bảng nhỏ, quét bảng lớn một lần, chỉ giữ dòng bên trái không có cặp. Không có index trên `orders.customer_id`, mỗi lần tra trong `Nested Loop` sẽ là một lần quét cả bảng, nên planner chọn băm."
    en: "\"A correlated subquery runs again for every row\" sounds right because it mentions the outer `c.id`. But the planner turns `NOT EXISTS` into an anti join: hash the small table, scan the big one once, keep only left rows with no match. With no index on `orders.customer_id`, each lookup in a `Nested Loop` would scan the whole table, so the planner hashes."
  expect: { node: Hash Join }
quiz:
  - q:
      vi: "Vì sao `c.id NOT IN (SELECT customer_id FROM orders)` trả 0 khách khi `orders` có một dòng `customer_id` NULL?"
      en: "Why does `c.id NOT IN (SELECT customer_id FROM orders)` return 0 customers when `orders` holds one row with a NULL `customer_id`?"
    options:
      - { vi: "Với một khách không có đơn, phép so với NULL không trả lời được, nên cả biểu thức là NULL chứ không phải true", en: "For a customer with no order, the comparison with NULL has no answer, so the whole expression is NULL, not true" }
      - { vi: "Thống kê đã cũ; chạy `ANALYZE` lại là đúng", en: "The statistics are stale; running `ANALYZE` again fixes it" }
      - { vi: "`NOT IN` bỏ qua mọi dòng của câu con khi gặp NULL", en: "`NOT IN` ignores every row of the subquery once it meets a NULL" }
    answer: 0
    why:
      vi: "\"Thống kê cũ\" nghe hợp lý vì một dòng mới vừa được thêm, nhưng đây là đáp số chứ không phải kế hoạch, và thống kê không bao giờ đổi đáp số. `x NOT IN (a, b, NULL)` nghĩa là `x <> a AND x <> b AND x <> NULL`; vế cuối là NULL, nên cả biểu thức không bao giờ là true, và `WHERE` chỉ giữ dòng true. `NOT IN` không bỏ qua dòng nào của câu con; chính việc nó so với cả dòng NULL mới gây ra kết quả rỗng. Viết `NOT EXISTS`, hoặc lọc `customer_id IS NOT NULL` trong câu con."
      en: "\"Stale statistics\" sounds right because a row was just added, but this is a result, not a plan, and statistics never change a result. `x NOT IN (a, b, NULL)` means `x <> a AND x <> b AND x <> NULL`; the last part is NULL, so the whole expression is never true, and `WHERE` keeps only true rows. `NOT IN` ignores no row of the subquery; comparing against the NULL row too is exactly what empties the result. Write `NOT EXISTS`, or filter `customer_id IS NOT NULL` in the subquery."
---

## Mở bài

"Khách chưa có đơn" là câu hỏi rất hay gặp. Ba cách viết quen thuộc cho ra kế hoạch khác nhau, và một cách còn trả sai khi có NULL. Bài này cho bạn đoán kế hoạch của từng cách.

## Ý chính

"Khách chưa có đơn" có ba cách viết hay gặp: `NOT EXISTS`, `LEFT JOIN … IS NULL` và `NOT IN (...)`. Chúng không phải ba cách viết của cùng một câu:

- `NOT EXISTS` thành **anti join**: một nút nối chỉ giữ dòng bên trái không có cặp.
- `LEFT JOIN … IS NULL` chỉ thành anti join khi cột được kiểm NULL là cột của điều kiện nối. Kiểm một cột khác thì planner thấy một phép nối ngoài rồi một bộ lọc, và ước lượng số dòng sai.
- `NOT IN (...)` không thành anti join, và trả rỗng ngay khi câu con có một NULL.

## Ví dụ

```sql
SELECT c.id FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

## Thực hành

Chọn đáp án trước, rồi bấm "Xem thật" để thấy kế hoạch thật. Ba bước sau so đáp số và kế hoạch của các cách viết, trên dữ liệu có sẵn một đơn mang `customer_id` NULL.

Sau bài này bạn chọn được cách viết "không có" đúng cả khi có NULL, và đọc được trong kế hoạch là planner có nhận ra anti join hay không.

## Tóm tắt

- `NOT EXISTS` thành anti join: giữ dòng bên trái không có cặp.
- `LEFT JOIN … IS NULL` chỉ thành anti join khi kiểm NULL trên cột của điều kiện nối.
- `NOT IN (...)` không thành anti join và trả rỗng khi câu con có một NULL: dùng `NOT EXISTS`.

# EN

## Opening

"Customers with no orders" is a very common question. Three familiar ways to write it produce different plans, and one of them even goes wrong when a NULL appears. This lesson has you guess the plan of each.

## Key idea

"Customers with no orders" has three common forms: `NOT EXISTS`, `LEFT JOIN … IS NULL` and `NOT IN (...)`. They are not three spellings of one query:

- `NOT EXISTS` becomes an **anti join**: a join node that keeps only the left rows with no match.
- `LEFT JOIN … IS NULL` becomes an anti join only when the column tested for NULL is the join condition's column. Test another column and the planner sees an outer join followed by a filter, and misestimates the row count.
- `NOT IN (...)` never becomes an anti join, and returns nothing as soon as the subquery holds a NULL.

## Example

```sql
SELECT c.id FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

## Practice

Pick an answer first, then press "See the real plan" to see the real plan. The three steps then compare the results and plans of the forms, on data that already holds one order with a NULL `customer_id`.

After this lesson you can pick a "has none" form that stays right with NULLs, and read in a plan whether the planner recognised an anti join.

## Recap

- `NOT EXISTS` becomes an anti join: it keeps the left rows with no match.
- `LEFT JOIN … IS NULL` becomes an anti join only when the NULL test is on the join column.
- `NOT IN (...)` never becomes an anti join and returns nothing when the subquery holds a NULL: use `NOT EXISTS`.
