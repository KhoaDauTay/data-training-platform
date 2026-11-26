---
id: e-gr-l2-05
engine: graph
level: L2
module: choose
title: Khi nào cần CSDL đồ thị, khi nào PostgreSQL là đủ
title_en: When you need a graph database, and when PostgreSQL is enough
kind: concept
runtime: browser
minutes: 15
figures: [{ name: gr-pick-store, at: idea }]
objectives:
  - vi: Nhận ra câu hỏi đồ thị có độ sâu cố định, giải được bằng vài JOIN thường.
    en: Recognise a graph question of fixed depth that a few plain JOINs answer.
  - vi: Kể những dấu hiệu cho thấy một CSDL đồ thị đáng dùng.
    en: Name the signs that a graph database is worth using.
  - vi: Viết câu gợi ý "khách giống bạn còn đặt gì" bằng SQL.
    en: Write the "what else do similar customers book" suggestion in SQL.
requires: [e-gr-l2-02, e-gr-l1-03]
sources:
  - { url: "https://neo4j.com/docs/getting-started/graph-database/", title: "Neo4j docs: What is a graph database" }
  - { url: "https://neo4j.com/docs/cypher-manual/current/patterns/shortest-paths/", title: "Cypher Manual: Shortest paths" }
  - https://www.postgresql.org/docs/18/queries-with.html
lab:
  setup: |
    CREATE TABLE bookings (
      customer text NOT NULL,
      lane text NOT NULL,
      PRIMARY KEY (customer, lane)
    );
    INSERT INTO bookings VALUES
      ('C1', 'DAD-SIN'), ('C1', 'DAD-HKG'),
      ('C2', 'DAD-SIN'), ('C2', 'DAD-PUS'),
      ('C3', 'DAD-HKG'), ('C3', 'SIN-RTM'),
      ('C4', 'SGN-SIN');
  steps:
    - task:
        vi: "Những khách nào (khác `C1`) đặt chung ít nhất một tuyến với `C1`? Trả `customer`, mỗi khách một lần."
        en: "Which customers (other than `C1`) book at least one lane in common with `C1`? Return `customer`, each customer once."
      solution: |
        SELECT DISTINCT o.customer
        FROM bookings c
        JOIN bookings o ON o.lane = c.lane
        WHERE c.customer = 'C1'
          AND o.customer <> 'C1'
      check: rows
      hint:
        vi: "Nối `bookings` với chính nó qua `lane`, giữ `c.customer = 'C1'` và `o.customer <> 'C1'`."
        en: "Join `bookings` to itself on `lane`, keeping `c.customer = 'C1'` and `o.customer <> 'C1'`."
    - task:
        vi: "Gợi ý cho `C1`: các tuyến mà những khách ở bước 1 đặt nhưng `C1` chưa đặt. Trả `lane`, mỗi tuyến một lần."
        en: "Suggestions for `C1`: the lanes that the customers of step 1 book but `C1` does not. Return `lane`, each lane once."
      solution: |
        SELECT DISTINCT r.lane
        FROM bookings c
        JOIN bookings o ON o.lane = c.lane
        JOIN bookings r
          ON r.customer = o.customer
        WHERE c.customer = 'C1'
          AND o.customer <> 'C1'
          AND NOT EXISTS (
            SELECT 1 FROM bookings x
            WHERE x.customer = 'C1'
              AND x.lane = r.lane
          )
      check: rows
      hint:
        vi: "Thêm một lần nối `bookings r` theo `r.customer = o.customer`, rồi `NOT EXISTS` các tuyến `C1` đã có."
        en: "Join `bookings r` once more on `r.customer = o.customer`, then `NOT EXISTS` for the lanes `C1` already has."
quiz:
  - q:
      vi: "Câu hỏi \"khách đặt chung tuyến với C1 còn đặt tuyến nào\" đi đúng 3 bước trong đồ thị. Trên PostgreSQL cần gì?"
      en: "The question \"what other lanes do customers who share a lane with C1 book\" walks exactly 3 steps in the graph. What does it need on PostgreSQL?"
    options:
      - { vi: "Phải dùng `WITH RECURSIVE`", en: "It must use `WITH RECURSIVE`" }
      - { vi: "Ba lần nối bảng `bookings`", en: "Three joins of table `bookings`" }
      - { vi: "Phải chuyển sang CSDL đồ thị", en: "It must move to a graph database" }
    answer: 1
    trap: 0
    why:
      vi: "`WITH RECURSIVE` dành cho số bước không biết trước; ở đây số bước cố định là 3 nên ba lần nối `bookings` là đủ, như bước 2 của lab. Độ sâu cố định và nhỏ là lý do yếu để đổi sang CSDL đồ thị. Lý do mạnh hơn là khi phần lớn câu hỏi đi nhiều bước với độ sâu thay đổi."
      en: "`WITH RECURSIVE` is for an unknown number of steps; here the step count is fixed at 3, so three joins of `bookings` are enough, as in step 2 of the lab. A small, fixed depth is a weak reason to switch to a graph database. A stronger reason is when most questions walk many steps of varying depth."
  - q:
      vi: "Dấu hiệu nào cho thấy CSDL đồ thị đáng dùng nhất?"
      en: "Which sign best shows that a graph database is worth using?"
    options:
      - { vi: "Dữ liệu có nhiều bảng và khóa ngoại", en: "The data has many tables and foreign keys" }
      - { vi: "Báo cáo cần tổng doanh thu theo tháng", en: "Reports need monthly revenue totals" }
      - { vi: "Câu hỏi chính là đi đường nhiều bước", en: "The main questions walk many-step paths" }
    answer: 2
    trap: 0
    why:
      vi: "Khóa ngoại cũng là quan hệ, nên nghe như dấu hiệu của đồ thị; nhưng mô hình quan hệ sinh ra để lưu chúng, và JOIN vài bậc là việc thường ngày của PostgreSQL. Tổng theo tháng là việc gộp, không phải đi đường. Khi câu hỏi chính là duyệt nhiều bước, độ sâu thay đổi, hay cần thuật toán đồ thị như đường ngắn nhất có trọng số, CSDL đồ thị mới đáng cân nhắc."
      en: "Foreign keys are relationships too, so they sound like a graph sign; but the relational model was built to store them, and a few levels of JOINs are everyday work for PostgreSQL. Monthly totals are aggregation, not path walking. A graph database is worth weighing when the main questions traverse many steps of varying depth, or need graph algorithms such as a weighted shortest path."
---
## Mở bài

Có mạng tuyến không có nghĩa là phải có CSDL đồ thị. Bài này đặt các câu hỏi đồ thị thường gặp cạnh hai lựa chọn, PostgreSQL và một CSDL đồ thị như Neo4j.

## Ý chính

**Độ sâu cố định: JOIN là đủ.** "Khách đặt chung tuyến với C1 còn đặt gì" luôn đi 3 bước: khách, tuyến, khách khác, tuyến khác. Đó là ba lần nối cùng một bảng, mỗi lần nối là một bước. Không cần đệ quy.

**Độ sâu thay đổi: CTE đệ quy, trên đồ thị vừa phải.** "Đi tới đâu được", "đường ít chặng nhất", "có vòng không" cần `WITH RECURSIVE`, `SEARCH` và `CYCLE` như các bài trước. Cách liệt kê mọi đường hợp với đồ thị nhỏ; số đường tăng rất nhanh khi đồ thị lớn và nhiều nhánh.

**Khi nào CSDL đồ thị đáng dùng.** Tài liệu Neo4j nói CSDL đồ thị lưu quan hệ ngay cạnh nút và không dùng JOIN để đi theo quan hệ, nên duyệt nhiều bước là việc chính của nó. Cypher viết một mẫu nhiều bước gọn trong một dòng, và có sẵn `SHORTEST` cho đường ít bước nhảy nhất; đường có trọng số dùng thư viện GDS (Graph Data Science). Dấu hiệu nên cân nhắc: phần lớn câu hỏi là đi đường với độ sâu thay đổi, nhiều kiểu quan hệ đan nhau, cần thuật toán đồ thị.

**Khi nào ở lại PostgreSQL.** Đồ thị chỉ là một phần nhỏ của dữ liệu quan hệ, cần ràng buộc và giao dịch chung với các bảng khác, hoặc độ sâu nhỏ và biết trước. Thêm một hệ thống nữa là thêm việc đồng bộ dữ liệu giữa hai nơi.

Cùng câu gợi ý tuyến viết bằng Cypher:

```text
MATCH (c:Customer {id: 'C1'})
  -[:BOOKS]->(l)<-[:BOOKS]-(o)
MATCH (o)-[:BOOKS]-(rec:Lane)
WHERE NOT EXISTS { (c)-[:BOOKS]-(rec) }
RETURN DISTINCT rec
```

## Ví dụ

Khách đặt chung tuyến với `C1`, kèm tuyến chung:

```sql
SELECT o.customer, o.lane
FROM bookings c
JOIN bookings o ON o.lane = c.lane
WHERE c.customer = 'C1'
  AND o.customer <> 'C1'
ORDER BY o.customer;
```

Mỗi tuyến được bao nhiêu khách đặt:

```sql
SELECT lane, count(*) AS customers
FROM bookings
GROUP BY lane
ORDER BY customers DESC, lane;
```

## Lỗi hay gặp

Quên loại tuyến `C1` đã đặt, nên gợi ý lại chính tuyến của `C1`:

```sql
-- WRONG: suggests C1's own lanes
SELECT DISTINCT r.lane
FROM bookings c
JOIN bookings o ON o.lane = c.lane
JOIN bookings r
  ON r.customer = o.customer
WHERE c.customer = 'C1'
  AND o.customer <> 'C1';
```

```sql
-- FIX: drop lanes C1 already books
SELECT DISTINCT r.lane
FROM bookings c
JOIN bookings o ON o.lane = c.lane
JOIN bookings r
  ON r.customer = o.customer
WHERE c.customer = 'C1'
  AND o.customer <> 'C1'
  AND r.lane NOT IN (
    SELECT lane FROM bookings
    WHERE customer = 'C1');
```

Quên loại chính `C1` khỏi danh sách khách giống mình:

```sql
-- WRONG: C1 is similar to itself
SELECT DISTINCT o.customer
FROM bookings c
JOIN bookings o ON o.lane = c.lane
WHERE c.customer = 'C1';
```

```sql
-- FIX: other customers only
SELECT DISTINCT o.customer
FROM bookings c
JOIN bookings o ON o.lane = c.lane
WHERE c.customer = 'C1'
  AND o.customer <> 'C1';
```

## Tóm tắt

- Độ sâu cố định và nhỏ: vài JOIN thường trên PostgreSQL là đủ.
- Độ sâu thay đổi trên đồ thị vừa phải: `WITH RECURSIVE` với `SEARCH` và `CYCLE`.
- CSDL đồ thị đáng cân nhắc khi duyệt nhiều bước là việc chính hoặc cần thuật toán đồ thị.
- Thêm một hệ thống là thêm việc đồng bộ dữ liệu giữa hai nơi.

# EN

## Opening

Having a route network does not mean you need a graph database. This lesson sets common graph questions against two choices, PostgreSQL and a graph database such as Neo4j.

## Key idea

**Fixed depth: JOINs are enough.** "What else do customers who share a lane with C1 book" always walks 3 steps: customer, lane, other customer, other lane. That is three joins of the same table, one join per step. No recursion is needed.

**Varying depth: a recursive CTE, on a moderate graph.** "Where can I get to", "the route with the fewest legs", "is there a loop" need `WITH RECURSIVE`, `SEARCH` and `CYCLE` as in the earlier lessons. Listing every route suits small graphs; the number of routes grows very fast when a graph is large and branches a lot.

**When a graph database is worth it.** The Neo4j docs say a graph database stores relationships right next to the nodes and does not use JOINs to follow them, so many-step traversal is its main job. Cypher writes a many-step pattern on one line, and has `SHORTEST` built in for the path with the fewest hops; weighted paths use the GDS (Graph Data Science) library. Signs to weigh it: most questions walk paths of varying depth, many relationship types interweave, graph algorithms are needed.

**When to stay on PostgreSQL.** The graph is a small part of relational data, it needs constraints and transactions shared with other tables, or the depth is small and known in advance. Adding another system means keeping data in sync between two places.

The same lane suggestion written in Cypher:

```text
MATCH (c:Customer {id: 'C1'})
  -[:BOOKS]->(l)<-[:BOOKS]-(o)
MATCH (o)-[:BOOKS]-(rec:Lane)
WHERE NOT EXISTS { (c)-[:BOOKS]-(rec) }
RETURN DISTINCT rec
```

## Example

Customers who share a lane with `C1`, with the shared lane:

```sql
SELECT o.customer, o.lane
FROM bookings c
JOIN bookings o ON o.lane = c.lane
WHERE c.customer = 'C1'
  AND o.customer <> 'C1'
ORDER BY o.customer;
```

How many customers book each lane:

```sql
SELECT lane, count(*) AS customers
FROM bookings
GROUP BY lane
ORDER BY customers DESC, lane;
```

## Common mistakes

Forgetting to remove the lanes `C1` already books, so the suggestion repeats `C1`'s own lanes:

```sql
-- WRONG: suggests C1's own lanes
SELECT DISTINCT r.lane
FROM bookings c
JOIN bookings o ON o.lane = c.lane
JOIN bookings r
  ON r.customer = o.customer
WHERE c.customer = 'C1'
  AND o.customer <> 'C1';
```

```sql
-- FIX: drop lanes C1 already books
SELECT DISTINCT r.lane
FROM bookings c
JOIN bookings o ON o.lane = c.lane
JOIN bookings r
  ON r.customer = o.customer
WHERE c.customer = 'C1'
  AND o.customer <> 'C1'
  AND r.lane NOT IN (
    SELECT lane FROM bookings
    WHERE customer = 'C1');
```

Forgetting to remove `C1` itself from the similar customers:

```sql
-- WRONG: C1 is similar to itself
SELECT DISTINCT o.customer
FROM bookings c
JOIN bookings o ON o.lane = c.lane
WHERE c.customer = 'C1';
```

```sql
-- FIX: other customers only
SELECT DISTINCT o.customer
FROM bookings c
JOIN bookings o ON o.lane = c.lane
WHERE c.customer = 'C1'
  AND o.customer <> 'C1';
```

## Recap

- Small, fixed depth: a few plain JOINs on PostgreSQL are enough.
- Varying depth on a moderate graph: `WITH RECURSIVE` with `SEARCH` and `CYCLE`.
- A graph database is worth weighing when many-step traversal is the main job or graph algorithms are needed.
- Adding a system means keeping data in sync between two places.
