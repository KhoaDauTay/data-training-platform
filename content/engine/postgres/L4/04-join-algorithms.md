---
id: e-pg-l4-04
engine: postgres
level: L4
module: joins
title: "Thuật toán nối: Nested Loop, Hash Join, Merge Join"
title_en: "Join algorithms: Nested Loop, Hash Join, Merge Join"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Nói được khi nào planner chọn Nested Loop, Hash Join, Merge Join", en: "Say when the planner picks a Nested Loop, a Hash Join or a Merge Join" }
  - { vi: "Viết câu làm planner chọn từng thuật toán trên cùng dữ liệu", en: "Write queries that make the planner pick each algorithm on the same data" }
  - { vi: "Đọc phía trong/phía ngoài và `Hash Cond`/`Merge Cond` trong kế hoạch", en: "Read the inner/outer side and `Hash Cond`/`Merge Cond` in a plan" }
requires: [e-pg-l4-02]
sources:
  - https://www.postgresql.org/docs/18/planner-optimizer.html
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/runtime-config-query.html
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
    - task: { vi: "Tổng tiền đơn hàng theo vùng của khách (hai cột: region, tổng amount). Mọi đơn đều phải đọc, nên planner băm bảng nhỏ.", en: "Total order amount per customer region (two columns: region, sum of amount). Every order must be read, so the planner hashes the small table." }
      solution: "SELECT c.region, sum(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.region"
      check: plan
      hint: { vi: "JOIN `customers` với `orders` theo mã khách rồi GROUP BY vùng.", en: "JOIN `customers` to `orders` on the customer id, then GROUP BY region." }
    - task: { vi: "Mã và số tiền các đơn của đúng khách số 42. Một dòng ở phía ngoài, mỗi lần tra index phía trong.", en: "Id and amount of the orders of customer 42 only. One row on the outer side, one index probe on the inner side." }
      solution: "SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42"
      check: plan
      hint: { vi: "Lọc khách bằng khóa chính, JOIN sang `orders`.", en: "Filter the customer by primary key, JOIN to `orders`." }
    - task: { vi: "Mã đơn và ghi chú của mọi đơn (bảng `order_notes`, cột `order_id` và `note`), sắp theo mã đơn. Cả hai bảng đã có index theo đúng khóa nối.", en: "Order id and note of every order (table `order_notes`, columns `order_id` and `note`), sorted by order id. Both tables already have an index on the join key." }
      solution: "SELECT o.id, n.note FROM orders o JOIN order_notes n ON n.order_id = o.id ORDER BY o.id"
      check: plan
      hint: { vi: "Hai dòng chảy đã có thứ tự thì trộn như khóa kéo, khỏi băm, khỏi sắp.", en: "Two already-sorted streams are zipped together: no hashing, no sorting." }
quiz:
  - q: { vi: "Bỏ `ORDER BY o.id` khỏi bước 3. Kế hoạch thật trên PGlite đổi thành gì?", en: "Drop `ORDER BY o.id` from step 3. What does the real plan on PGlite become?" }
    options:
      - { vi: "Vẫn Merge Join", en: "Still a Merge Join" }
      - { vi: "Hash Join trên hai Seq Scan", en: "A Hash Join over two Seq Scans" }
      - { vi: "Nested Loop 20.000 lần", en: "A Nested Loop running 20,000 times" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì phép nối không đổi, nhưng ở bước 3 Merge Join thắng là nhờ `ORDER BY` dùng lại thứ tự của nó. Không cần thứ tự nữa, hai lần đọc tuần tự cộng một bảng băm rẻ hơn hai lần đi index. Merge Join chỉ thắng khi thứ tự có sẵn hoặc được dùng lại.", en: "It sounds right because the join itself is unchanged, but in step 3 the Merge Join won only because the `ORDER BY` reused its order. Once no order is needed, two sequential reads plus one hash table beat two index walks. A Merge Join only wins when the order is free or reused." }
  - q: { vi: "Câu lấy đơn của đúng khách 42 chạy bằng Nested Loop. Đồng nghiệp đề nghị đặt `enable_nestloop = off` cho cả server vì \"Nested Loop luôn chậm\". Bạn trả lời sao?", en: "The query for customer 42's orders runs as a Nested Loop. A colleague suggests `enable_nestloop = off` for the whole server because \"Nested Loop is always slow\". What do you answer?" }
    options:
      - { vi: "Đồng ý: Nested Loop là thuật toán chậm nhất, nên cấm hẳn", en: "Agree: Nested Loop is the slowest algorithm, so ban it" }
      - { vi: "Không: với một dòng phía ngoài và index phía trong, Nested Loop là cách rẻ nhất; nó chỉ chậm khi số dòng phía ngoài bị đoán thấp", en: "No: with one outer row and an index on the inner side, a Nested Loop is the cheapest way; it is only slow when the outer row count is underestimated" }
      - { vi: "Không cần: tham số đó không tồn tại", en: "No need: that parameter does not exist" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì Nested Loop chậm là thứ hay thấy trong các câu tệ, nhưng thủ phạm thường là ước lượng sai: planner tưởng phía ngoài có 10 dòng, thật ra có 10.000. Với đúng một khách, một lần tra index là không thể nhanh hơn. Các tham số `enable_*` cũng không cấm hẳn: PostgreSQL 18 chỉ ưu tiên kế hoạch có ít nút bị tắt nhất, và vẫn dùng nút bị tắt khi không có cách khác, ghi `Disabled: true`.", en: "It sounds right because a slow Nested Loop is common in bad queries, but the culprit is usually a wrong estimate: the planner expected 10 outer rows and got 10,000. For exactly one customer, one index probe cannot be beaten. The `enable_*` settings do not ban anything either: PostgreSQL 18 only prefers the plan with the fewest disabled nodes, and still uses a disabled node when there is no other way, marking it `Disabled: true`." }
---
## Mở bài

Hai bảng cần nối: 500 khách và 20.000 đơn. Postgres có ba cách làm, và cùng một cặp bảng có thể nhận cả ba tùy câu hỏi. Bài này cho bạn thấy cả ba và lý do planner chọn từng cách.

## Ý chính

Nested Loop: với mỗi dòng phía ngoài, tìm các dòng khớp ở phía trong, thường bằng một lần tra index. Rẻ nhất khi phía ngoài có rất ít dòng. Đây cũng là thuật toán duy nhất chạy được với mọi điều kiện nối, kể cả `<` hay `BETWEEN`.

Hash Join: đọc phía nhỏ hơn, dựng bảng băm trong bộ nhớ theo khóa nối, rồi quét phía lớn và tra bảng băm cho từng dòng. Thắng khi nối bằng dấu bằng trên nhiều dòng và không cần thứ tự. Bảng băm vượt `work_mem` × `hash_mem_multiplier` (mặc định 4 MB × 2) thì bị chia lô và ghi ra đĩa tạm: `EXPLAIN ANALYZE` hiện `Batches:` lớn hơn 1.

Merge Join: hai phía đã sắp theo khóa nối được đi song song như khóa kéo. Thắng khi cả hai phía có sẵn thứ tự (từ index) hoặc kết quả cần đúng thứ tự đó, vì `ORDER BY` khỏi phải sắp lại.

Trong kế hoạch, nút con đầu tiên là phía ngoài. Với Hash Join, nút con có tên `Hash` là phía được băm.

Nhiều người nghĩ Nested Loop là thuật toán chậm, cần tránh. Thật ra nó chỉ chậm khi planner đoán sai số dòng phía ngoài. Planner chọn theo chi phí, nên ước lượng sai (bài trước) là nguyên nhân số một của thuật toán nối sai; sửa ước lượng, đừng tắt thuật toán.

## Cú pháp

```sql
EXPLAIN [ ( ANALYZE [, COSTS OFF ] [, TIMING OFF ] [, SUMMARY OFF ] ) ]
SELECT ... FROM a JOIN b ON a.key = b.key [ WHERE ... ] [ ORDER BY a.key ];
SET { enable_nestloop | enable_hashjoin | enable_mergejoin } = { on | off };
SET work_mem = 'size';
```

- `Hash Cond` / `Merge Cond` / `Join Filter`: điều kiện nối mà từng thuật toán dùng.
- `Batches:` trên nút `Hash`: 1 = bảng băm nằm gọn trong bộ nhớ.
- `enable_*`: chỉ để thử nghiệm trong phiên; không dùng cho cả server.

## Ví dụ

Hash Join: băm 100 khách của vùng 2, quét 20.000 đơn:

```sql
EXPLAIN (COSTS OFF)
SELECT c.id, count(*) FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.region = 2 GROUP BY c.id;
```

Điều kiện nối không phải dấu bằng thì chỉ còn Nested Loop:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM customers a JOIN customers b ON b.id < a.id WHERE a.id < 5;
```

Điều kiện nằm ở `Join Filter`, được kiểm cho từng cặp dòng; `Materialize` giữ phía trong trong bộ nhớ để khỏi đọc lại.

Kích thước bảng băm thật:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT count(*) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.region = 2;
```

Nút `Hash` ghi `Batches: 1` và vài kB bộ nhớ. Giờ ép bảng băm lớn hơn vào `work_mem` rất nhỏ:

```sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT count(n.note) FROM orders o JOIN order_notes n ON n.order_id = o.id WHERE o.amount < 500;
RESET work_mem;
```

Khoảng 10.000 đơn không vừa 64 kB: `Batches: 4` và dòng `temp read/written` cho thấy dữ liệu đã tràn ra đĩa tạm. Với `work_mem` mặc định, cùng câu chỉ cần một lô.

## Lỗi hay gặp

`FULL JOIN` với điều kiện không phải dấu bằng:

```sql
-- ERROR 0A000: FULL JOIN is only supported with merge-joinable or hash-joinable join conditions
SELECT count(*) FROM customers a FULL JOIN customers b ON b.id < a.id;
```

Nested Loop không giữ được dòng không khớp của cả hai phía, nên `FULL JOIN` cần Hash Join hoặc Merge Join, tức là cần dấu bằng. Viết lại bằng `LEFT JOIN` cộng `UNION ALL` các dòng còn thiếu.

Nối hai cột khác kiểu, ví dụ một bên lưu mã khách dạng text:

```sql
-- WRONG: casting both keys hides the indexes and the cheap hash plan
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders o JOIN customers c ON o.customer_id::text = c.id::text;
```

```sql
-- FIX: join columns of the same type
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders o JOIN customers c ON o.customer_id = c.id;
```

Câu sai phải tính biểu thức cho từng dòng rồi sắp cả hai phía để Merge Join; câu đúng là một Hash Join gọn. Hãy cho khóa ngoại cùng kiểu với khóa chính mà nó trỏ tới.

Tắt một thuật toán để "sửa" câu chậm:

```sql
-- WRONG: enable_nestloop = off discourages the Nested Loop, it does not forbid it
SET enable_nestloop = off;
EXPLAIN (COSTS OFF)
SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42;
```

```sql
-- FIX: put the setting back and fix the estimate instead
RESET enable_nestloop;
EXPLAIN (COSTS OFF)
SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42;
```

Kế hoạch vẫn là Nested Loop, chỉ thêm dòng `Disabled: true`: vì `c.id = 42` kéo theo `o.customer_id = 42`, không còn điều kiện nối nào cho Hash Join dùng. Ở các câu khác, tắt thuật toán sẽ đẩy planner sang cách tệ hơn.

## Thực hành

Ba câu, ba thuật toán, cùng dữ liệu: tổng theo vùng (Hash Join), đơn của một khách (Nested Loop), mọi ghi chú theo thứ tự mã đơn (Merge Join). Sau đó là hai câu hỏi.

## Tóm tắt

- Nested Loop: ít dòng phía ngoài, có index phía trong, hoặc điều kiện nối không phải dấu bằng.
- Hash Join: nối bằng dấu bằng trên nhiều dòng; vượt `work_mem` thì chia lô và tràn đĩa.
- Merge Join: hai phía có sẵn thứ tự, hoặc kết quả cần đúng thứ tự đó.
- Thuật toán sai thường do ước lượng sai hoặc khóa nối khác kiểu; `enable_*` chỉ để thử nghiệm.

# EN

## Opening

Two tables to join: 500 customers and 20,000 orders. Postgres has three ways to do it, and the same pair of tables can get all three depending on the question. This lesson shows you all three and why the planner picks each one.

## Key idea

Nested Loop: for each outer row, find the matching inner rows, usually with one index probe. It is the cheapest when the outer side has very few rows. It is also the only algorithm that works with any join condition, including `<` or `BETWEEN`.

Hash Join: read the smaller side, build an in-memory hash table on the join key, then scan the larger side and probe the hash table for each row. It wins for equality joins over many rows when no order is needed. When the hash table goes over `work_mem` × `hash_mem_multiplier` (4 MB × 2 by default), it is split into batches written to temporary files: `EXPLAIN ANALYZE` shows `Batches:` above 1.

Merge Join: both sides, sorted on the join key, are walked side by side like a zip. It wins when both sides are already ordered (from an index) or when the result needs that very order, since the `ORDER BY` then needs no extra sort.

In a plan, the first child node is the outer side. In a Hash Join, the child named `Hash` is the side being hashed.

Many people think a Nested Loop is the slow algorithm to avoid. In fact it is only slow when the planner misjudges the outer row count. The planner chooses by cost, so a wrong estimate (previous lesson) is the number one cause of a wrong join algorithm; fix the estimate, do not switch the algorithm off.

## Syntax

```sql
EXPLAIN [ ( ANALYZE [, COSTS OFF ] [, TIMING OFF ] [, SUMMARY OFF ] ) ]
SELECT ... FROM a JOIN b ON a.key = b.key [ WHERE ... ] [ ORDER BY a.key ];
SET { enable_nestloop | enable_hashjoin | enable_mergejoin } = { on | off };
SET work_mem = 'size';
```

- `Hash Cond` / `Merge Cond` / `Join Filter`: the join condition each algorithm uses.
- `Batches:` on the `Hash` node: 1 = the hash table fits in memory.
- `enable_*`: only for experiments in a session; never for the whole server.

## Example

Hash Join: hash the 100 customers of region 2, scan the 20,000 orders:

```sql
EXPLAIN (COSTS OFF)
SELECT c.id, count(*) FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.region = 2 GROUP BY c.id;
```

When the join condition is not an equality, only the Nested Loop is left:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM customers a JOIN customers b ON b.id < a.id WHERE a.id < 5;
```

The condition sits in `Join Filter` and is checked for each pair of rows; `Materialize` keeps the inner side in memory so it is not read again.

The real size of the hash table:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT count(*) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.region = 2;
```

The `Hash` node shows `Batches: 1` and a few kB of memory. Now squeeze a bigger hash table into a tiny `work_mem`:

```sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT count(n.note) FROM orders o JOIN order_notes n ON n.order_id = o.id WHERE o.amount < 500;
RESET work_mem;
```

About 10,000 orders do not fit in 64 kB: `Batches: 4` and a `temp read/written` line show the data spilled to temporary files. With the default `work_mem`, the same query needs a single batch.

## Common mistakes

A `FULL JOIN` on a condition that is not an equality:

```sql
-- ERROR 0A000: FULL JOIN is only supported with merge-joinable or hash-joinable join conditions
SELECT count(*) FROM customers a FULL JOIN customers b ON b.id < a.id;
```

A Nested Loop cannot keep the unmatched rows of both sides, so a `FULL JOIN` needs a Hash Join or a Merge Join, which means an equality. Rewrite it as a `LEFT JOIN` plus a `UNION ALL` of the missing rows.

Joining two columns of different types, for example when one side stores the customer id as text:

```sql
-- WRONG: casting both keys hides the indexes and the cheap hash plan
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders o JOIN customers c ON o.customer_id::text = c.id::text;
```

```sql
-- FIX: join columns of the same type
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders o JOIN customers c ON o.customer_id = c.id;
```

The wrong query computes an expression for every row and then sorts both sides for a Merge Join; the right one is a lean Hash Join. Give a foreign key the same type as the primary key it points to.

Switching an algorithm off to "fix" a slow query:

```sql
-- WRONG: enable_nestloop = off discourages the Nested Loop, it does not forbid it
SET enable_nestloop = off;
EXPLAIN (COSTS OFF)
SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42;
```

```sql
-- FIX: put the setting back and fix the estimate instead
RESET enable_nestloop;
EXPLAIN (COSTS OFF)
SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42;
```

The plan is still a Nested Loop, now with a `Disabled: true` line: since `c.id = 42` implies `o.customer_id = 42`, no join condition is left for a Hash Join to use. On other queries, switching an algorithm off pushes the planner to something worse.

## Practice

Three queries, three algorithms, same data: totals per region (Hash Join), one customer's orders (Nested Loop), every note in order id order (Merge Join). Then two questions.

## Recap

- Nested Loop: few outer rows, an index on the inner side, or a join condition that is not an equality.
- Hash Join: equality joins over many rows; past `work_mem` it splits into batches and spills to disk.
- Merge Join: both sides already ordered, or the result needs that very order.
- A wrong algorithm usually comes from a wrong estimate or join keys of different types; `enable_*` is only for experiments.
