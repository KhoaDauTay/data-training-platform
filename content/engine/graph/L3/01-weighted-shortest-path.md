---
id: e-gr-l3-01
engine: graph
level: L3
module: algorithms
title: Đường ngắn nhất có trọng số
title_en: Weighted shortest paths
kind: lab
runtime: browser
minutes: 22
figures: [{ name: gr-weighted-path, at: idea }]
objectives:
  - vi: Cộng trọng số (số ngày đi biển) dọc mỗi đường đi và giữ đường nhỏ nhất cho từng cảng.
    en: Sum a weight (sea days) along each route and keep the smallest route per port.
  - vi: Giải thích vì sao ít chặng nhất không phải ít ngày nhất.
    en: Explain why the fewest legs is not the fewest days.
  - vi: Nói rõ cách SQL này khác thuật toán Dijkstra, và chặn số chặng để giới hạn việc phải làm.
    en: Say how this SQL differs from Dijkstra's algorithm, and cap the legs to bound the work.
requires: [e-gr-l2-02, e-gr-l2-03]
sources:
  - https://www.postgresql.org/docs/18/queries-with.html
  - { url: "https://neo4j.com/docs/graph-data-science/current/algorithms/dijkstra-source-target/", title: "Neo4j GDS docs: Dijkstra Source-Target" }
  - { url: "https://neo4j.com/docs/cypher-manual/current/patterns/shortest-paths/", title: "Cypher Manual: Shortest paths" }
lab:
  setup: |
    CREATE TABLE ports (code text PRIMARY KEY);
    INSERT INTO ports VALUES
      ('VNDAD'), ('VNSGN'), ('HKHKG'), ('SGSIN'),
      ('KRPUS'), ('NLRTM'), ('AUSYD'), ('USLAX');
    CREATE TABLE legs (
      src text REFERENCES ports,
      dst text REFERENCES ports,
      days numeric(4, 1) NOT NULL,
      PRIMARY KEY (src, dst)
    );
    INSERT INTO legs VALUES
      ('VNDAD', 'SGSIN', 6.0), ('VNDAD', 'HKHKG', 2.5),
      ('HKHKG', 'SGSIN', 2.0), ('HKHKG', 'KRPUS', 2.9),
      ('VNSGN', 'SGSIN', 2.2), ('SGSIN', 'NLRTM', 27.0),
      ('SGSIN', 'AUSYD', 12.4), ('KRPUS', 'USLAX', 14.0),
      ('USLAX', 'VNDAD', 18.0), ('KRPUS', 'NLRTM', 36.0);
  steps:
    - name: { vi: Mọi đường, en: Every route }
      task:
        vi: "Mọi đường đi từ Đà Nẵng (`VNDAD`) tới Rotterdam (`NLRTM`) không qua cảng nào hai lần, kèm tổng số ngày: trả `route` (các mã nối bằng `>`) và `days`. Mạng có vòng: dùng `CYCLE`."
        en: "Every route from Da Nang (`VNDAD`) to Rotterdam (`NLRTM`) that visits no port twice, with its total days: return `route` (the codes joined with `>`) and `days`. The network has a loop: use `CYCLE`."
      solution: |
        WITH RECURSIVE r(code, route, days)
        AS (
          SELECT 'VNDAD'::text, 'VNDAD',
            0.0
          UNION ALL
          SELECT l.dst,
            r.route || '>' || l.dst,
            r.days + l.days
          FROM r JOIN legs l
            ON l.src = r.code
        ) CYCLE code SET is_cycle
          USING path
        SELECT route, days FROM r
        WHERE code = 'NLRTM'
          AND NOT is_cycle
      check: rows
      hint:
        vi: "Mang thêm cột `days` và cộng `l.days` ở phần đệ quy; `CYCLE code SET is_cycle USING path` sau CTE, rồi lọc `code = 'NLRTM'`."
        en: "Carry a `days` column and add `l.days` in the recursive part; `CYCLE code SET is_cycle USING path` after the CTE, then filter `code = 'NLRTM'`."
    - name: { vi: Ít ngày nhất, en: Fewest days }
      task:
        vi: "Từ `VNDAD`, mỗi cảng khác tới được với ít ngày đi biển nhất là bao nhiêu? Trả `code`, `days`."
        en: "From `VNDAD`, what is the fewest sea days to each other port it can reach? Return `code`, `days`."
      solution: |
        WITH RECURSIVE r(code, days) AS (
          SELECT 'VNDAD'::text, 0.0
          UNION ALL
          SELECT l.dst, r.days + l.days
          FROM r JOIN legs l
            ON l.src = r.code
        ) CYCLE code SET is_cycle
          USING path
        SELECT code, min(days) AS days
        FROM r
        WHERE NOT is_cycle
          AND code <> 'VNDAD'
        GROUP BY code
      check: rows
      hint:
        vi: "Cùng CTE như bước 1, bỏ cột `route`; rồi `min(days)` theo `code`, bỏ dòng `is_cycle` và chính `VNDAD`."
        en: "The same CTE as step 1 without `route`; then `min(days)` per `code`, dropping the `is_cycle` rows and `VNDAD` itself."
    - name: { vi: "≤ 2 chặng", en: "≤ 2 legs" }
      task:
        vi: "Khách chỉ chấp nhận tối đa 2 chặng. Với giới hạn đó, mỗi cảng tới được từ `VNDAD` mất ít ngày nhất là bao nhiêu? Trả `code`, `days`."
        en: "The customer accepts at most 2 legs. Under that limit, what is the fewest days from `VNDAD` to each port it can reach? Return `code`, `days`."
      solution: |
        WITH RECURSIVE r(code, n, days) AS (
          SELECT 'VNDAD'::text, 0, 0.0
          UNION ALL
          SELECT l.dst, r.n + 1,
            r.days + l.days
          FROM r JOIN legs l
            ON l.src = r.code
          WHERE r.n < 2
        )
        SELECT code, min(days) AS days
        FROM r
        WHERE n > 0
        GROUP BY code
      check: rows
      hint:
        vi: "Thêm cột đếm chặng `n` và `WHERE r.n < 2` ở phần đệ quy; độ sâu bị chặn nên câu tự dừng, không cần `CYCLE`."
        en: "Add a leg counter `n` and `WHERE r.n < 2` in the recursive part; the capped depth stops the query, so no `CYCLE` is needed."
quiz:
  - q:
      vi: "Từ `VNDAD`, `SGSIN` có một chặng thẳng 6,0 ngày và một đường hai chặng qua `HKHKG` (2,5 + 2,0). Câu hỏi \"ít ngày nhất\" trả gì cho `SGSIN`?"
      en: "From `VNDAD`, `SGSIN` has a direct leg of 6.0 days and a two-leg route through `HKHKG` (2.5 + 2.0). What does the \"fewest days\" question return for `SGSIN`?"
    options:
      - { vi: "6,0, vì đường thẳng ít chặng hơn", en: "6.0, the direct leg has fewer legs" }
      - { vi: "4,5, đường qua `HKHKG`", en: "4.5, the route through `HKHKG`" }
      - { vi: "10,5, cộng cả hai đường", en: "10.5, both routes added" }
    answer: 1
    trap: 0
    why:
      vi: "Ít chặng nhất là câu hỏi của BFS ở bài trước; ở đây thứ được tối thiểu là tổng `days`. Đường qua `HKHKG` có hai chặng nhưng chỉ 4,5 ngày, nên `min(days)` chọn nó. Hai đường không bao giờ được cộng với nhau: mỗi đường là một dòng riêng của CTE."
      en: "Fewest legs is the BFS question of the earlier lesson; here the thing minimised is the total `days`. The route through `HKHKG` has two legs but only 4.5 days, so `min(days)` picks it. Two routes are never added together: each route is its own row of the CTE."
  - q:
      vi: "Câu ở bước 2 khác thuật toán Dijkstra (thư viện Neo4j GDS có sẵn) ở điểm nào?"
      en: "How does the step 2 query differ from Dijkstra's algorithm (built into the Neo4j GDS library)?"
    options:
      - { vi: "Nó cho kết quả sai khi đồ thị có vòng", en: "It gives a wrong result on a graph with a loop" }
      - { vi: "Nó liệt kê mọi đường rồi mới lấy nhỏ nhất", en: "It lists every route, then takes the smallest" }
      - { vi: "Nó chỉ đúng khi mọi chặng bằng ngày nhau", en: "It is right only when all legs take equal days" }
    answer: 1
    trap: 0
    why:
      vi: "Với `CYCLE`, câu vẫn đúng trên đồ thị có vòng: nó bỏ các đường quay lại cảng cũ, nên lựa chọn đầu là bẫy. Khác biệt là cách làm: CTE đệ quy sinh mọi đường đơn (không lặp cảng) rồi `min(days)` mới chọn, nên việc phải làm tăng theo số đường. Dijkstra chốt từng nút một lần theo thứ tự khoảng cách, và tài liệu GDS nói nó dùng cho đồ thị có trọng số dương."
      en: "With `CYCLE` the query stays right on a graph with a loop: it drops routes that come back to a port, so the first option is the trap. The difference is the method: the recursive CTE produces every simple route (no port repeated) and only then does `min(days)` choose, so the work grows with the number of routes. Dijkstra settles each node once in order of distance, and the GDS docs say it works on graphs with positive weights."
---
## Mở bài

Hàng đi Rotterdam cần tới sớm nhất, không phải ít lần chuyển tàu nhất. Bài trước đếm chặng bằng BFS; bài này cộng số ngày đi biển dọc mỗi đường và giữ đường nhỏ nhất. Đồng thời bài nói thật về giá của cách làm này trong SQL.

## Ý chính

**Trọng số đi theo đường.** Mỗi chặng có `days`. Phần neo bắt đầu ở 0, phần đệ quy cộng `l.days` vào cột mang theo. Mỗi dòng của CTE là một đường đi cùng tổng ngày của nó; `min(days)` theo cảng cho đường nhanh nhất.

**Ít chặng ≠ ít ngày.** Từ `VNDAD`, `SGSIN` có chặng thẳng 6,0 ngày, nhưng đi qua `HKHKG` chỉ 4,5 ngày. Tới `NLRTM`, đường ba chặng 31,5 ngày nhanh hơn đường hai chặng 33,0 ngày.

**Đây không phải Dijkstra.** Thuật toán Dijkstra (trong thư viện Neo4j GDS, cho đồ thị có trọng số dương) chốt từng nút một lần, nút gần nhất trước. CTE đệ quy không làm được vậy: mỗi vòng chỉ thấy các dòng mới của vòng trước, và PostgreSQL từ chối hàm gộp trong phần đệ quy (lỗi 42P19). Vì vậy câu SQL liệt kê mọi đường đơn (`CYCLE` bỏ đường lặp cảng) rồi mới lấy nhỏ nhất. Kết quả đúng, nhưng số đường tăng rất nhanh khi mạng dày.

**Chặn để giới hạn việc.** Một điều kiện nghiệp vụ như "tối đa 2 chặng" (`WHERE r.n < 2`) vừa đúng yêu cầu khách, vừa chặn số đường phải sinh, và làm câu tự dừng mà không cần `CYCLE`.

## Cú pháp

```sql
WITH RECURSIVE r(code, days) AS (
  SELECT 'VNDAD'::text, 0.0
  UNION ALL
  SELECT l.dst, r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT code, min(days) FROM r
WHERE NOT is_cycle
GROUP BY code;
```

- `0.0` ở phần neo cho cột `days` kiểu `numeric`, khớp với `l.days`.
- Chặn độ sâu bằng cột đếm `n` và `WHERE r.n < k` ở phần đệ quy.

## Ví dụ

Các chặng, nhanh nhất trước:

```sql
SELECT src, dst, days FROM legs
ORDER BY days, src;
```

Mọi đường đơn từ `VNDAD` và tổng ngày:

```sql
WITH RECURSIVE r(code, route, days)
AS (
  SELECT 'VNDAD'::text, 'VNDAD', 0.0
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst,
    r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, days FROM r
WHERE NOT is_cycle
ORDER BY days;
```

Đường nhanh nhất tới `NLRTM`:

```sql
WITH RECURSIVE r(code, route, days)
AS (
  SELECT 'VNDAD'::text, 'VNDAD', 0.0
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst,
    r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, days FROM r
WHERE code = 'NLRTM'
  AND NOT is_cycle
ORDER BY days
LIMIT 1;
```

## Lỗi hay gặp

Chọn đường ít chặng nhất rồi coi là nhanh nhất:

```sql
-- WRONG: fewest legs, SGSIN = 6.0
SELECT dst AS code, days
FROM legs
WHERE src = 'VNDAD';
```

```sql
-- FIX: sum days over every route
WITH RECURSIVE r(code, days) AS (
  SELECT 'VNDAD'::text, 0.0
  UNION ALL
  SELECT l.dst, r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.days < 10
)
SELECT code, min(days) AS days
FROM r
WHERE code IN ('SGSIN', 'HKHKG')
GROUP BY code;
```

Gộp ngay trong phần đệ quy để giữ một dòng mỗi cảng bị từ chối:

```sql
-- ERROR 42P19
WITH RECURSIVE r(code, days) AS (
  SELECT 'VNDAD'::text, 0.0
  UNION ALL
  SELECT l.dst, min(r.days + l.days)
  FROM r JOIN legs l
    ON l.src = r.code
  GROUP BY l.dst
)
SELECT * FROM r;
```

## Thực hành

Ba bước: mọi đường tới `NLRTM` kèm số ngày, ít ngày nhất tới từng cảng, và ít ngày nhất khi chỉ được đi tối đa 2 chặng.

## Tóm tắt

- Mang tổng trọng số trong một cột và cộng ở phần đệ quy; `min()` theo cảng ở câu ngoài.
- Ít chặng nhất và ít ngày nhất là hai câu hỏi khác nhau.
- CTE đệ quy liệt kê mọi đường đơn rồi mới chọn; Dijkstra (Neo4j GDS) chốt mỗi nút một lần.
- Hàm gộp không được dùng trong phần đệ quy (42P19); chặn số chặng để giới hạn việc phải làm.

# EN

## Opening

Cargo for Rotterdam must arrive soonest, not with the fewest ship changes. The earlier lesson counted legs with BFS; this one sums the sea days along each route and keeps the smallest. It is also honest about what this method costs in SQL.

## Key idea

**The weight travels with the route.** Each leg has `days`. The anchor starts at 0 and the recursive part adds `l.days` to the carried column. Each row of the CTE is one route with its total days; `min(days)` per port gives the fastest route.

**Fewest legs ≠ fewest days.** From `VNDAD`, `SGSIN` has a direct leg of 6.0 days, but going through `HKHKG` takes only 4.5 days. To `NLRTM`, the three-leg route of 31.5 days beats the two-leg route of 33.0 days.

**This is not Dijkstra.** Dijkstra's algorithm (in the Neo4j GDS library, for graphs with positive weights) settles each node once, nearest first. A recursive CTE cannot do that: each round sees only the previous round's new rows, and PostgreSQL refuses aggregate functions in the recursive term (error 42P19). So the SQL lists every simple route (`CYCLE` drops routes that repeat a port) and only then takes the smallest. The result is right, but the number of routes grows very fast as the network gets denser.

**Cap to bound the work.** A business rule such as "at most 2 legs" (`WHERE r.n < 2`) matches what the customer asked, caps the number of routes to produce, and makes the query stop without `CYCLE`.

## Syntax

```sql
WITH RECURSIVE r(code, days) AS (
  SELECT 'VNDAD'::text, 0.0
  UNION ALL
  SELECT l.dst, r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT code, min(days) FROM r
WHERE NOT is_cycle
GROUP BY code;
```

- `0.0` in the anchor makes column `days` a `numeric`, matching `l.days`.
- Cap the depth with a counter `n` and `WHERE r.n < k` in the recursive part.

## Example

The legs, fastest first:

```sql
SELECT src, dst, days FROM legs
ORDER BY days, src;
```

Every simple route from `VNDAD` and its total days:

```sql
WITH RECURSIVE r(code, route, days)
AS (
  SELECT 'VNDAD'::text, 'VNDAD', 0.0
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst,
    r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, days FROM r
WHERE NOT is_cycle
ORDER BY days;
```

The fastest route to `NLRTM`:

```sql
WITH RECURSIVE r(code, route, days)
AS (
  SELECT 'VNDAD'::text, 'VNDAD', 0.0
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst,
    r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, days FROM r
WHERE code = 'NLRTM'
  AND NOT is_cycle
ORDER BY days
LIMIT 1;
```

## Common mistakes

Taking the route with the fewest legs as the fastest:

```sql
-- WRONG: fewest legs, SGSIN = 6.0
SELECT dst AS code, days
FROM legs
WHERE src = 'VNDAD';
```

```sql
-- FIX: sum days over every route
WITH RECURSIVE r(code, days) AS (
  SELECT 'VNDAD'::text, 0.0
  UNION ALL
  SELECT l.dst, r.days + l.days
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.days < 10
)
SELECT code, min(days) AS days
FROM r
WHERE code IN ('SGSIN', 'HKHKG')
GROUP BY code;
```

Aggregating inside the recursive part to keep one row per port is refused:

```sql
-- ERROR 42P19
WITH RECURSIVE r(code, days) AS (
  SELECT 'VNDAD'::text, 0.0
  UNION ALL
  SELECT l.dst, min(r.days + l.days)
  FROM r JOIN legs l
    ON l.src = r.code
  GROUP BY l.dst
)
SELECT * FROM r;
```

## Practice

Three steps: every route to `NLRTM` with its days, the fewest days to each port, and the fewest days when at most 2 legs are allowed.

## Recap

- Carry the total weight in a column and add to it in the recursive part; `min()` per port in the outer query.
- Fewest legs and fewest days are two different questions.
- A recursive CTE lists every simple route and only then chooses; Dijkstra (Neo4j GDS) settles each node once.
- Aggregates are not allowed in the recursive term (42P19); cap the legs to bound the work.
