---
id: e-pg-l4-19
engine: postgres
level: L4
module: analytic-plans
title: "Đoán trước: CTE được gộp vào câu ngoài hay tính riêng?"
title_en: "Predict: is a CTE folded into the outer query or computed apart?"
kind: predict
runtime: browser
minutes: 15
figures: [{ name: pg-cte-inline, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đọc trong kế hoạch một CTE đã được gộp vào câu ngoài hay được tính riêng (`CTE Scan`)
    en: Read in a plan whether a CTE was folded into the outer query or computed apart (`CTE Scan`)
  - vi: Chọn giữa `MATERIALIZED` và `NOT MATERIALIZED` bằng cost, không theo thói quen
    en: Choose between `MATERIALIZED` and `NOT MATERIALIZED` by cost, not by habit
requires: [e-pg-l4-17]
sources:
  - { url: https://www.postgresql.org/docs/18/queries-with.html, title_vi: "Truy vấn WITH (CTE)" }
  - { url: https://www.postgresql.org/docs/release/12.0/, title_vi: "Ghi chú phát hành PostgreSQL 12" }
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, region int NOT NULL);
    INSERT INTO customers SELECT g, g % 5 FROM generate_series(1, 600) g;
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int REFERENCES customers, created_on date NOT NULL, amount int NOT NULL);
    INSERT INTO orders SELECT g, (g * 37) % 500 + 1, date '2026-01-01' + (g * 7) % 300, g % 997 FROM generate_series(1, 20000) g;
    CREATE INDEX orders_customer_idx ON orders (customer_id);
    CREATE FUNCTION nodes_of(q text) RETURNS TABLE (node text) LANGUAGE plpgsql AS $$ DECLARE j json; BEGIN EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j; RETURN QUERY WITH RECURSIVE t(p) AS (SELECT j->0->'Plan' UNION ALL SELECT c FROM t, json_array_elements(t.p->'Plans') AS c) SELECT (t.p->>'Node Type') || coalesce(' (' || (t.p->>'Join Type') || ')', '') FROM t; END $$;
    CREATE FUNCTION top_cost(q text) RETURNS numeric LANGUAGE plpgsql AS $$ DECLARE j json; BEGIN EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j; RETURN (j->0->'Plan'->>'Total Cost')::numeric; END $$;
    ANALYZE customers, orders;
  steps:
    - task:
        vi: "Tổng `amount` của khách 42, viết qua một CTE tên `t` (chọn `customer_id, amount` từ `orders`) và buộc CTE được tính riêng bằng `MATERIALIZED`. Một cột, đặt tên tùy ý."
        en: "The total `amount` of customer 42, written through a CTE named `t` (selecting `customer_id, amount` from `orders`) and forced to be computed apart with `MATERIALIZED`. One column, any name."
      solution: WITH t AS MATERIALIZED (SELECT customer_id, amount FROM orders) SELECT sum(amount) FROM t WHERE customer_id = 42
      check: plan
      hint:
        vi: "`WITH t AS MATERIALIZED (SELECT …) SELECT sum(amount) FROM t WHERE …`."
        en: "`WITH t AS MATERIALIZED (SELECT …) SELECT sum(amount) FROM t WHERE …`."
      fact:
        vi: "Kế hoạch tính cả CTE bằng `Seq Scan` trên `orders`, rồi `CTE Scan` lọc khách 42 trên kết quả đó: cost 759.11, so với 84.24 khi CTE được gộp và dùng `orders_customer_idx`. Điều kiện ở câu ngoài không xuống được tới bảng."
        en: "The plan computes the whole CTE with a `Seq Scan` on `orders`, then a `CTE Scan` filters customer 42 out of that: cost 759.11, against 84.24 when the CTE is folded in and uses `orders_customer_idx`. The outer condition cannot reach the table."
        probe: "SELECT (SELECT count(*) FROM nodes_of('WITH t AS MATERIALIZED (SELECT customer_id, amount FROM orders) SELECT sum(amount) FROM t WHERE customer_id = 42') WHERE node = 'CTE Scan'), top_cost('WITH t AS MATERIALIZED (SELECT customer_id, amount FROM orders) SELECT sum(amount) FROM t WHERE customer_id = 42'), top_cost('WITH t AS (SELECT customer_id, amount FROM orders) SELECT sum(amount) FROM t WHERE customer_id = 42')"
        expect: [[1, 759.11, 84.24]]
    - task:
        vi: "CTE `w` là mọi cột của `orders` và được dùng hai lần: lấy cặp mã đơn `w1.id`, `w2.id` với `w1.id = w2.id + 1` và `w2.customer_id = 42`. Viết không có `MATERIALIZED`."
        en: "CTE `w` is every column of `orders` and is used twice: return the order id pairs `w1.id`, `w2.id` with `w1.id = w2.id + 1` and `w2.customer_id = 42`. Write it without `MATERIALIZED`."
      solution: WITH w AS (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42
      check: plan
      hint:
        vi: "`FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1`."
        en: "`FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1`."
      fact:
        vi: "Dùng hai lần nên mặc định CTE được tính riêng một lần: hai nút `CTE Scan`, cost 1409.9. Index `orders_customer_idx` có đó mà không được dùng."
        en: "Used twice, so by default the CTE is computed apart once: two `CTE Scan` nodes, cost 1409.9. The index `orders_customer_idx` is there but unused."
        probe: "SELECT (SELECT count(*) FROM nodes_of('WITH w AS (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42') WHERE node = 'CTE Scan'), top_cost('WITH w AS (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42')"
        expect: [[2, 1409.9]]
    - task:
        vi: "Cùng câu bước 2, nhưng buộc CTE được gộp vào câu ngoài bằng `NOT MATERIALIZED`."
        en: "The same query as step 2, but force the CTE to be folded into the outer query with `NOT MATERIALIZED`."
      solution: WITH w AS NOT MATERIALIZED (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42
      check: plan
      hint:
        vi: "`WITH w AS NOT MATERIALIZED (…)`."
        en: "`WITH w AS NOT MATERIALIZED (…)`."
      fact:
        vi: "Gộp vào thì điều kiện `customer_id = 42` xuống được `orders_customer_idx` (`Bitmap Heap Scan`), rồi mỗi dòng tra khóa chính: không còn `CTE Scan`, cost 352.43. Cùng 40 cặp kết quả."
        en: "Folded in, the condition `customer_id = 42` reaches `orders_customer_idx` (`Bitmap Heap Scan`), then each row probes the primary key: no `CTE Scan` left, cost 352.43. The same 40 result pairs."
        probe: "SELECT (SELECT count(*) FROM nodes_of('WITH w AS NOT MATERIALIZED (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42') WHERE node = 'CTE Scan'), top_cost('WITH w AS NOT MATERIALIZED (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42'), (SELECT count(*) FROM (WITH w AS NOT MATERIALIZED (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42) x)"
        expect: [[0, 352.43, 40]]
predict:
  sql: WITH t AS (SELECT customer_id, amount FROM orders) SELECT sum(amount) FROM t WHERE customer_id = 42
  q:
    vi: "CTE `t` chỉ được dùng một lần, không có `MATERIALIZED`, và `orders` có index `orders_customer_idx`. Kế hoạch có nút `CTE Scan` không?"
    en: "CTE `t` is used once, with no `MATERIALIZED`, and `orders` has the index `orders_customer_idx`. Does the plan hold a `CTE Scan` node?"
  options:
    - { vi: "Không: CTE được gộp vào câu ngoài, điều kiện xuống tới `orders_customer_idx` (`Bitmap Heap Scan`)", en: "No: the CTE is folded into the outer query and the condition reaches `orders_customer_idx` (`Bitmap Heap Scan`)" }
    - { vi: "Có: CTE luôn được tính hết trước, rồi mới lọc", en: "Yes: a CTE is always computed in full first, then filtered" }
    - { vi: "Không, nhưng vẫn `Seq Scan` cả bảng `orders`", en: "No, but it still runs a `Seq Scan` over the whole of `orders`" }
  answer: 0
  trap: 1
  why:
    vi: "\"CTE là hàng rào, luôn được tính trước\" nghe hợp lý vì nó đúng tới PostgreSQL 11. Từ bản 12, CTE không đệ quy, không có tác dụng phụ và chỉ được dùng một lần sẽ được gộp vào câu ngoài, nên điều kiện đi xuống tới index. Không có index thì câu gộp vào sẽ là `Seq Scan`; ở đây index có sẵn."
    en: "\"A CTE is a fence, always computed first\" sounds right because it was true up to PostgreSQL 11. Since version 12, a CTE that is not recursive, has no side effects and is used once is folded into the outer query, so the condition reaches the index. Without the index the folded query would be a `Seq Scan`; here the index exists."
  expect: { node: Bitmap Heap Scan, table: orders }
quiz:
  - q:
      vi: "CTE `t` gom tổng tiền mỗi khách bằng `GROUP BY customer_id` và được dùng hai lần (khách 42 so với khách 43). Thêm `NOT MATERIALIZED` có làm câu rẻ hơn không?"
      en: "CTE `t` sums each customer's amount with `GROUP BY customer_id` and is used twice (customer 42 against customer 43). Does adding `NOT MATERIALIZED` make the query cheaper?"
    options:
      - { vi: "Không: gộp vào nghĩa là chép thân CTE vào mỗi chỗ dùng, nên phép gom chạy hai lần và cost tăng", en: "No: folding in copies the CTE body into each use, so the grouping runs twice and the cost goes up" }
      - { vi: "Có: CTE dùng hai lần thì luôn nên thêm `NOT MATERIALIZED`", en: "Yes: a CTE used twice should always get `NOT MATERIALIZED`" }
      - { vi: "Không đổi: planner bỏ qua `NOT MATERIALIZED` khi có `GROUP BY`", en: "No change: the planner ignores `NOT MATERIALIZED` when there is a `GROUP BY`" }
    answer: 0
    why:
      vi: "\"Dùng hai lần thì thêm `NOT MATERIALIZED`\" nghe hợp lý sau bước 3, nơi nó giúp nhiều. Nhưng ở bước 3, gộp vào cho điều kiện cắt bớt phần phải đọc. Ở đây thân CTE là một phép gom trên cả bảng: gộp vào thì một chỗ dùng vẫn phải gom cả bảng, chỗ kia gom lại lần nữa, và kế hoạch đắt hơn. Planner không bỏ qua `NOT MATERIALIZED` vì có `GROUP BY`; nó làm đúng điều bạn bảo, nên mới đắt hơn. Gộp chỉ có lợi khi điều kiện bên ngoài cắt được nhiều hơn phần phải làm lại."
      en: "\"Used twice, so add `NOT MATERIALIZED`\" sounds right after step 3, where it helped a lot. But in step 3 folding let the condition cut what had to be read. Here the CTE body groups the whole table: folded in, one use still groups the whole table and the other groups again, so the plan costs more. The planner does not ignore `NOT MATERIALIZED` because of a `GROUP BY`; it does exactly what you asked, which is why it costs more. Folding pays only when the outer condition cuts more than the work that is repeated."
---

## Mở bài

Viết `WITH` cho dễ đọc là thói quen tốt, nhưng nó có thể đổi kế hoạch. Có lúc CTE được gộp vào câu ngoài, có lúc nó được tính riêng một lần. Bài này cho bạn đoán trường hợp nào xảy ra.

## Ý chính

Từ PostgreSQL 12, một CTE (`WITH`) không đệ quy, không có tác dụng phụ và chỉ được dùng một lần sẽ được **gộp** vào câu ngoài, như một câu con: điều kiện của câu ngoài đi xuống tới bảng và index. Khi CTE được **tính riêng** (dùng từ hai lần, có hàm volatile, hoặc viết `MATERIALIZED`), kết quả của nó được tính hết một lần rồi đọc lại bằng nút `CTE Scan`, và điều kiện bên ngoài chỉ còn là một `Filter` trên đó.

- `MATERIALIZED` buộc tính riêng; `NOT MATERIALIZED` buộc gộp vào.
- Gộp vào nghĩa là chép thân CTE vào mỗi chỗ dùng. Có lợi khi điều kiện bên ngoài cắt được nhiều; có hại khi thân CTE là việc nặng bị làm lại.

Hình từng bước ở cuối mục này vẽ hai cây kế hoạch của cùng một câu: CTE được gộp vào, rồi viết `MATERIALIZED`.

## Ví dụ

```sql
WITH t AS (SELECT customer_id, amount FROM orders)
SELECT sum(amount) FROM t WHERE customer_id = 42;
```

## Thực hành

Chọn đáp án trước, rồi bấm "Xem thật" để thấy kế hoạch thật. Ba bước sau so một CTE bị buộc tính riêng, một CTE dùng hai lần, và cùng CTE đó khi được gộp vào. Hàm `nodes_of(q)` trả một dòng cho mỗi nút trong kế hoạch của câu `q`, và `top_cost(q)` trả cost của nút trên cùng.

Sau bài này bạn đọc được `CTE Scan` trong kế hoạch, và chọn `MATERIALIZED` hay `NOT MATERIALIZED` bằng cost đo được.

## Tóm tắt

- CTE không đệ quy, không tác dụng phụ, dùng một lần thì được gộp vào câu ngoài (từ PostgreSQL 12).
- Dùng từ hai lần, có hàm volatile hoặc viết `MATERIALIZED` thì được tính riêng và đọc lại qua `CTE Scan`.
- `MATERIALIZED` / `NOT MATERIALIZED` cho bạn chọn; gộp vào có lợi khi điều kiện ngoài cắt được nhiều.

# EN

## Opening

Writing `WITH` for readability is a good habit, but it can change the plan. Sometimes the CTE is folded into the outer query, sometimes it is computed apart once. This lesson has you guess which one happens.

## Key idea

Since PostgreSQL 12, a CTE (`WITH`) that is not recursive, has no side effects and is used once is **folded** into the outer query like a subquery: the outer query's conditions reach the table and its indexes. When a CTE is **computed apart** (used twice or more, holding a volatile function, or written `MATERIALIZED`), its result is computed in full once and read back through a `CTE Scan` node, and the outer condition is only a `Filter` on top.

- `MATERIALIZED` forces it apart; `NOT MATERIALIZED` forces it in.
- Folding in copies the CTE body into each use. It helps when the outer condition cuts a lot; it hurts when the body is heavy work done again.

The step-through figure at the end of this section draws two plan trees for the same query: the CTE folded in, then written `MATERIALIZED`.

## Example

```sql
WITH t AS (SELECT customer_id, amount FROM orders)
SELECT sum(amount) FROM t WHERE customer_id = 42;
```

## Practice

Pick an answer first, then press "See the real plan" to see the real plan. The three steps then compare a CTE forced apart, a CTE used twice, and that same CTE folded in. The function `nodes_of(q)` returns one row per node in the plan of query `q`, and `top_cost(q)` returns the cost of the top node.

After this lesson you can read a `CTE Scan` in a plan, and choose `MATERIALIZED` or `NOT MATERIALIZED` by measured cost.

## Recap

- A non-recursive CTE with no side effects used once is folded into the outer query (since PostgreSQL 12).
- Used twice or more, holding a volatile function or written `MATERIALIZED`, it is computed apart and read back through `CTE Scan`.
- `MATERIALIZED` / `NOT MATERIALIZED` let you choose; folding in helps when the outer condition cuts a lot.
