---
id: e-pg-l4-04
engine: postgres
level: L4
module: joins
title: "Thuật toán nối: Nested Loop, Hash Join, Merge Join"
title_en: "Join algorithms: Nested Loop, Hash Join, Merge Join"
kind: lab
minutes: 20
objectives:
  - { vi: "Nói được khi nào planner chọn Nested Loop, Hash Join, Merge Join", en: "Say when the planner picks a Nested Loop, a Hash Join or a Merge Join" }
  - { vi: "Viết câu làm planner chọn từng thuật toán trên cùng dữ liệu", en: "Write queries that make the planner pick each algorithm on the same data" }
  - { vi: "Đọc phía trong/phía ngoài và `Hash Cond`/`Merge Cond` trong kế hoạch", en: "Read the inner/outer side and `Hash Cond`/`Merge Cond` in a plan" }
requires: [e-pg-l4-02]
sources:
  - https://www.postgresql.org/docs/18/planner-optimizer.html
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/runtime-config-query.html
viz: plan-tree
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
    - task: { vi: "Tổng tiền đơn hàng theo vùng của khách (hai cột: region, tổng amount). Mọi đơn đều phải đọc, nên planner băm bảng nhỏ.", en: "Total order amount per customer region (two columns: region, sum of amount). Every order must be read, so the planner hashes the small table." }
      solution: "SELECT c.region, sum(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.region"
      check: plan
      hint: { vi: "JOIN `customers` với `orders` theo mã khách rồi GROUP BY vùng.", en: "JOIN `customers` to `orders` on the customer id, then GROUP BY region." }
    - task: { vi: "Mã và số tiền các đơn của đúng khách số 42. Một dòng ở phía ngoài, mỗi lần tra index phía trong.", en: "Id and amount of the orders of customer 42 only. One row on the outer side, one index probe on the inner side." }
      solution: "SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42"
      check: plan
      hint: { vi: "Lọc khách bằng khóa chính, JOIN sang `orders`.", en: "Filter the customer by primary key, JOIN to `orders`." }
    - task: { vi: "Mã đơn và ghi chú của mọi đơn, sắp theo mã đơn. Cả hai bảng đã có index theo đúng khóa nối.", en: "Order id and note of every order, sorted by order id. Both tables already have an index on the join key." }
      solution: "SELECT o.id, n.note FROM orders o JOIN order_notes n ON n.order_id = o.id ORDER BY o.id"
      check: plan
      hint: { vi: "Hai dòng chảy đã có thứ tự thì trộn như khóa kéo, khỏi băm, khỏi sắp.", en: "Two already-sorted streams are zipped together: no hashing, no sorting." }
quiz:
  - q: { vi: "Bỏ `ORDER BY o.id` khỏi bước 3. Kế hoạch thật trên PGlite đổi thành gì?", en: "Drop `ORDER BY o.id` from step 3. What does the real plan on PGlite become?" }
    options:
      - { vi: "Vẫn Merge Join", en: "Still a Merge Join" }
      - { vi: "Hash Join trên hai Seq Scan", en: "A Hash Join over two Seq Scans" }
      - { vi: "Nested Loop 20000 lần", en: "A Nested Loop running 20000 times" }
    answer: 1
    why: { vi: "Không cần thứ tự nữa, hai lần đọc tuần tự + một bảng băm rẻ hơn hai lần đi index. Merge Join chỉ thắng khi thứ tự có sẵn hoặc được dùng lại.", en: "Once no order is needed, two sequential reads plus one hash table beat two index walks. A Merge Join only wins when the order is free or reused." }
---

## Ý chính

- Nested Loop — cách làm: với mỗi dòng phía ngoài, tìm dòng khớp phía trong (thường qua index); thắng khi: phía ngoài rất ít dòng; điều kiện nối không phải dấu bằng
- Hash Join — cách làm: băm phía nhỏ hơn vào bộ nhớ, quét phía lớn và tra bảng băm; thắng khi: nối bằng dấu bằng trên nhiều dòng, không cần thứ tự
- Merge Join — cách làm: hai phía đã sắp theo khóa nối, đi song song như khóa kéo; thắng khi: cả hai phía có sẵn thứ tự (index) hoặc kết quả cần thứ tự đó

- Hash Join chỉ dùng cho điều kiện bằng. Bảng băm vượt `work_mem` × `hash_mem_multiplier` (mặc định 4MB × 2) thì chia lô và tràn đĩa (`Batches:` > 1 trong `EXPLAIN ANALYZE`).
- Trong kế hoạch, nút con đầu tiên là phía ngoài; với Hash Join, nút `Hash` là phía được băm.
- Planner chọn theo chi phí, nên số dòng ước lượng sai (bài trước) là nguyên nhân số một của thuật toán nối sai.

## Ví dụ

Ba kế hoạch thật trên PGlite (`COSTS OFF`):

```text
HashAggregate
  Group Key: c.region
  ->  Hash Join
        Hash Cond: (o.customer_id = c.id)
        ->  Seq Scan on orders o
        ->  Hash
              ->  Seq Scan on customers c

Nested Loop
  ->  Index Only Scan using customers_pkey on customers c
        Index Cond: (id = 42)
  ->  Bitmap Heap Scan on orders o
        Recheck Cond: (customer_id = 42)
        ->  Bitmap Index Scan on orders_customer_idx

Merge Join
  Merge Cond: (o.id = n.order_id)
  ->  Index Only Scan using orders_pkey on orders o
  ->  Index Scan using order_notes_pkey on order_notes n
```

## Thực hành

Ba câu, ba thuật toán, cùng dữ liệu. Kỹ năng chuyên gia: đọc một kế hoạch và nói ngay vì sao thuật toán nối đó được chọn, rồi biết sửa ước lượng hay index nào để đổi nó.

# EN

## Key idea

- Nested Loop — how it works: for each outer row, find matching inner rows (usually through an index); wins when: the outer side has very few rows; the join condition is not an equality
- Hash Join — how it works: hash the smaller side into memory, scan the larger side and probe the hash table; wins when: equality join over many rows, no order needed
- Merge Join — how it works: both sides sorted on the join key, walked side by side like a zip; wins when: both sides are already ordered (index) or the result needs that order

- A Hash Join only works for equality conditions. When the hash table goes over `work_mem` × `hash_mem_multiplier` (default 4MB × 2), it splits into batches and spills to disk (`Batches:` > 1 in `EXPLAIN ANALYZE`).
- In a plan, the first child node is the outer side; in a Hash Join, the `Hash` node is the side being hashed.
- The planner chooses by cost, so a wrong row estimate (previous lesson) is the number one cause of a wrong join algorithm.

## Example

Three real plans from PGlite (`COSTS OFF`):

```text
HashAggregate
  Group Key: c.region
  ->  Hash Join
        Hash Cond: (o.customer_id = c.id)
        ->  Seq Scan on orders o
        ->  Hash
              ->  Seq Scan on customers c

Nested Loop
  ->  Index Only Scan using customers_pkey on customers c
        Index Cond: (id = 42)
  ->  Bitmap Heap Scan on orders o
        Recheck Cond: (customer_id = 42)
        ->  Bitmap Index Scan on orders_customer_idx

Merge Join
  Merge Cond: (o.id = n.order_id)
  ->  Index Only Scan using orders_pkey on orders o
  ->  Index Scan using order_notes_pkey on order_notes n
```

## Practice

Three queries, three algorithms, same data. Expert skill: read a plan and say at once why that join algorithm was chosen, then know which estimate or index to fix to change it.
