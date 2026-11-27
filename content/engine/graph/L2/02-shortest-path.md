---
id: e-gr-l2-02
engine: graph
level: L2
module: traverse
title: "Đường ngắn nhất: BFS theo độ sâu"
title_en: "Shortest path: breadth-first by depth"
kind: lab
runtime: browser
minutes: 22
figures: [{ name: gr-bfs-layers, at: idea }]
objectives:
  - vi: Tìm đường ít chặng nhất bằng cách đi theo từng lớp độ sâu.
    en: Find the route with the fewest legs by walking one depth layer at a time.
  - vi: Dùng `SEARCH BREADTH FIRST` để xếp kết quả theo độ sâu.
    en: Use `SEARCH BREADTH FIRST` to order the result by depth.
  - vi: Phân biệt ít chặng nhất với ít ngày nhất (đường có trọng số).
    en: Tell the fewest legs apart from the fewest days (a weighted route).
requires: [e-gr-l2-01]
sources:
  - { url: https://www.postgresql.org/docs/18/queries-with.html, title_vi: "Truy vấn WITH (CTE)" }
  - { url: "https://www.postgresql.org/docs/release/14.0/", title: "PostgreSQL 14 release notes: SEARCH and CYCLE", title_vi: "Ghi chú phát hành PostgreSQL 14: SEARCH và CYCLE" }
  - { url: "https://neo4j.com/docs/cypher-manual/current/patterns/shortest-paths/", title: "Cypher Manual: Shortest paths", title_vi: "Cypher Manual: đường đi ngắn nhất" }
lab:
  setup: |
    CREATE TABLE ports (code text PRIMARY KEY);
    INSERT INTO ports VALUES
      ('VNDAD'), ('SGSIN'), ('HKHKG'), ('KRPUS'),
      ('NLRTM'), ('AUSYD'), ('USLAX');
    CREATE TABLE legs (
      src text REFERENCES ports,
      dst text REFERENCES ports,
      days numeric(4, 1) NOT NULL,
      PRIMARY KEY (src, dst)
    );
    INSERT INTO legs VALUES
      ('VNDAD', 'SGSIN', 3.2), ('VNDAD', 'HKHKG', 2.5),
      ('VNDAD', 'KRPUS', 5.8), ('HKHKG', 'KRPUS', 2.9),
      ('HKHKG', 'SGSIN', 3.5), ('SGSIN', 'NLRTM', 27.0),
      ('SGSIN', 'AUSYD', 12.4), ('KRPUS', 'USLAX', 14.0);
  steps:
    - task:
        vi: "Đường ít chặng nhất từ Đà Nẵng (`VNDAD`) tới Los Angeles (`USLAX`): trả `route` (các mã nối bằng `>`, ví dụ `VNDAD>SGSIN`) và `hops`."
        en: "The route with the fewest legs from Da Nang (`VNDAD`) to Los Angeles (`USLAX`): return `route` (the codes joined with `>`, e.g. `VNDAD>SGSIN`) and `hops`."
      solution: |
        WITH RECURSIVE r(code, hops, route)
        AS (
          SELECT 'VNDAD'::text, 0, 'VNDAD'
          UNION ALL
          SELECT l.dst, r.hops + 1,
            r.route || '>' || l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        )
        SELECT route, hops FROM r
        WHERE code = 'USLAX'
        ORDER BY hops
        LIMIT 1
      check: rows
      hint:
        vi: "Mang `hops` và `route` qua từng vòng, lọc `code = 'USLAX'`, rồi `ORDER BY hops LIMIT 1`."
        en: "Carry `hops` and `route` through the rounds, filter `code = 'USLAX'`, then `ORDER BY hops LIMIT 1`."
    - task:
        vi: "Liệt kê mọi điểm đến của các đường đi từ `VNDAD` theo thứ tự duyệt theo chiều rộng: trả `code`, `depth` (0 cho `VNDAD`), xếp theo `depth` rồi `code`."
        en: "List every route end from `VNDAD` in breadth-first order: return `code`, `depth` (0 for `VNDAD`), sorted by `depth`, then `code`."
      solution: |
        WITH RECURSIVE r(code, depth) AS (
          SELECT 'VNDAD'::text, 0
          UNION ALL
          SELECT l.dst, r.depth + 1
          FROM r JOIN legs l
            ON l.src = r.code
        ) SEARCH BREADTH FIRST BY code
          SET ord
        SELECT code, depth FROM r
        ORDER BY ord
      check: rows
      ordered: true
      hint:
        vi: "Sau dấu `)` của CTE: `SEARCH BREADTH FIRST BY code SET ord`, rồi `ORDER BY ord`."
        en: "After the CTE's closing `)`: `SEARCH BREADTH FIRST BY code SET ord`, then `ORDER BY ord`."
    - task:
        vi: "Đường ít ngày đi biển nhất từ `VNDAD` tới `USLAX` (cộng `days` của từng chặng): trả `route`, `days`."
        en: "The route with the fewest sea days from `VNDAD` to `USLAX` (adding up each leg's `days`): return `route`, `days`."
      solution: |
        WITH RECURSIVE r(code, days, route)
        AS (
          SELECT 'VNDAD'::text, 0::numeric,
            'VNDAD'
          UNION ALL
          SELECT l.dst, r.days + l.days,
            r.route || '>' || l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        )
        SELECT route, days FROM r
        WHERE code = 'USLAX'
        ORDER BY days
        LIMIT 1
      check: rows
      hint:
        vi: "Như bước 1 nhưng cộng `r.days + l.days` và xếp `ORDER BY days`. Phần neo cần `0::numeric` để cùng kiểu với `days`."
        en: "As in step 1, but add `r.days + l.days` and sort `ORDER BY days`. The anchor needs `0::numeric` to match the type of `days`."
quiz:
  - q:
      vi: "Duyệt theo chiều rộng (BFS) từ `VNDAD`, lần đầu gặp `USLAX` ở độ sâu 2. Điều đó cho biết gì?"
      en: "Walking breadth-first (BFS) from `VNDAD`, `USLAX` is first met at depth 2. What does that tell you?"
    options:
      - { vi: "Đó là đường ít ngày đi biển nhất", en: "It is the route with the fewest sea days" }
      - { vi: "Không có đường nào tới với ít hơn 2 chặng", en: "No route reaches it in fewer than 2 legs" }
      - { vi: "Chỉ có đúng một đường tới `USLAX`", en: "There is exactly one route to `USLAX`" }
    answer: 1
    trap: 0
    why:
      vi: "Ít chặng không có nghĩa là ít ngày: ở lab này, đường 2 chặng qua `KRPUS` mất 19.8 ngày, còn đường 3 chặng qua `HKHKG` chỉ 19.4. BFS xét hết độ sâu 0, rồi 1, rồi 2, nên lần đầu gặp ở độ sâu 2 chỉ chứng minh không có đường nào ngắn hơn về số chặng. Đường dài hơn vẫn có thể có, như đường 3 chặng kia."
      en: "Fewest legs does not mean fewest days: in this lab the 2-leg route through `KRPUS` takes 19.8 days, while the 3-leg route through `HKHKG` takes only 19.4. BFS covers depth 0, then 1, then 2, so meeting it first at depth 2 only proves that no route is shorter in legs. Longer routes may still exist, like that 3-leg one."
  - q:
      vi: "Theo tài liệu Cypher, từ khóa `SHORTEST` đo độ dài đường đi bằng gì?"
      en: "According to the Cypher docs, what does the `SHORTEST` keyword measure a path's length by?"
    options:
      - { vi: "Tổng một thuộc tính số trên quan hệ", en: "The sum of a numeric relationship property" }
      - { vi: "Số nút có nhãn khác nhau", en: "The number of distinct node labels" }
      - { vi: "Số quan hệ (số bước nhảy)", en: "The number of relationships (hops)" }
    answer: 2
    trap: 0
    why:
      vi: "Cộng một thuộc tính như `days` là đường ngắn nhất có trọng số, và tài liệu Cypher nói việc đó cần thư viện GDS (Graph Data Science). `SHORTEST` chỉ đếm số quan hệ trên đường, giống BFS theo độ sâu. Trong PostgreSQL, muốn theo trọng số thì cộng dồn `days` rồi `ORDER BY days`, như bước 3 của lab."
      en: "Adding up a property such as `days` is a weighted shortest path, and the Cypher docs say that needs the GDS (Graph Data Science) library. `SHORTEST` only counts the relationships on the path, like breadth-first search by depth. In PostgreSQL, to go by weight you add up `days` and `ORDER BY days`, as in step 3 of the lab."
---
## Mở bài

"Đi tới Los Angeles qua ít chặng nhất" là bài toán đường ngắn nhất. Với đồ thị nhỏ, đi theo từng lớp độ sâu là đủ; bài này làm bằng CTE đệ quy và mệnh đề `SEARCH`.

## Ý chính

**BFS.** Duyệt theo chiều rộng (breadth-first search, BFS) xét mọi nút ở độ sâu 0, rồi mọi nút ở độ sâu 1, rồi 2. Nút đích gặp lần đầu ở độ sâu d nghĩa là đường ngắn nhất có d cạnh. CTE đệ quy tự đi theo lớp: vòng k cho các đường dài k chặng. Lọc đích rồi `ORDER BY hops LIMIT 1` là ra đường ít chặng nhất.

**SEARCH.** PostgreSQL 14 trở lên có mệnh đề `SEARCH BREADTH FIRST BY code SET ord` đặt sau CTE. Tài liệu nói nó thêm một cột `ord` vào kết quả, dùng để `ORDER BY ord`; với chiều rộng, nó tương đương một bộ đếm độ sâu viết tay. `SEARCH DEPTH FIRST` cho thứ tự theo chiều sâu.

**Ít chặng hay ít ngày.** Ít chặng nhất chưa chắc ít ngày nhất. Đường `VNDAD>KRPUS>USLAX` có 2 chặng, 19.8 ngày; đường `VNDAD>HKHKG>KRPUS>USLAX` có 3 chặng, 19.4 ngày. Muốn theo trọng số thì cộng dồn `days` trong CTE rồi xếp theo tổng. Cách liệt kê mọi đường chỉ hợp với đồ thị nhỏ: số đường tăng rất nhanh khi đồ thị lớn.

**Trong Cypher.** Tài liệu Cypher nói `SHORTEST k` giữ k đường ngắn nhất theo số bước nhảy, và đường ngắn nhất có trọng số cần thư viện GDS (Graph Data Science):

```text
MATCH p = SHORTEST 1
  (a:Port {code: 'VNDAD'})
  -[:LEG]->+(b:Port {code: 'USLAX'})
RETURN length(p)
```

## Cú pháp

```sql
WITH RECURSIVE r(code, depth) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.depth + 1
  FROM r JOIN legs l
    ON l.src = r.code
) SEARCH BREADTH FIRST BY code
  SET ord
SELECT code, depth FROM r
ORDER BY ord;
```

- Cột sau `BY` phải có trong danh sách cột của CTE.
- `ord` là cột thêm vào để xếp, không cần trả ra.

## Ví dụ

Mọi đường tới `USLAX`, ngắn trước:

```sql
WITH RECURSIVE r(code, hops, route)
AS (
  SELECT 'VNDAD'::text, 0, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.hops + 1,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT route, hops FROM r
WHERE code = 'USLAX'
ORDER BY hops;
```

Thứ tự theo chiều rộng bằng `SEARCH`:

```sql
WITH RECURSIVE r(code, depth) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.depth + 1
  FROM r JOIN legs l
    ON l.src = r.code
) SEARCH BREADTH FIRST BY code
  SET ord
SELECT code, depth FROM r
ORDER BY ord;
```

Độ sâu nhỏ nhất của từng cảng, một dòng mỗi cảng:

```sql
WITH RECURSIVE r(code, depth) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.depth + 1
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code, min(depth) AS depth
FROM r GROUP BY code
ORDER BY depth, code;
```

## Lỗi hay gặp

Lấy đường ít chặng nhất làm đường nhanh nhất:

```sql
-- WRONG: fewest legs, not fewest days
WITH RECURSIVE r(code, n, d, route)
AS (
  SELECT 'VNDAD'::text, 0,
    0::numeric, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.n + 1, r.d + l.days,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT route, d AS days FROM r
WHERE code = 'USLAX'
ORDER BY n LIMIT 1;
```

```sql
-- FIX: order by the summed days
WITH RECURSIVE r(code, n, d, route)
AS (
  SELECT 'VNDAD'::text, 0,
    0::numeric, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.n + 1, r.d + l.days,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT route, d AS days FROM r
WHERE code = 'USLAX'
ORDER BY d LIMIT 1;
```

Cột của `SEARCH` phải là cột của CTE, không phải cột của `legs`:

```sql
-- ERROR 42601
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION ALL
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) SEARCH BREADTH FIRST BY dst
  SET ord
SELECT code FROM r;
```

## Thực hành

Ba câu hỏi: đường ít chặng nhất tới `USLAX`, thứ tự duyệt theo chiều rộng, và đường ít ngày nhất.

## Tóm tắt

- BFS xét hết độ sâu d trước độ sâu d + 1: gặp đích lần đầu = ít cạnh nhất.
- `SEARCH BREADTH FIRST BY code SET ord` (PostgreSQL 14+) thêm cột `ord` để `ORDER BY`.
- Ít chặng chưa chắc ít ngày: muốn theo trọng số thì cộng dồn rồi xếp theo tổng.
- Cypher `SHORTEST` đếm bước nhảy; liệt kê mọi đường chỉ hợp với đồ thị nhỏ.

# EN

## Opening

"Reach Los Angeles in the fewest legs" is a shortest-path problem. For a small graph, walking one depth layer at a time is enough; this lesson does it with a recursive CTE and the `SEARCH` clause.

## Key idea

**BFS.** Breadth-first search (BFS) visits every node at depth 0, then every node at depth 1, then 2. A target first met at depth d means the shortest path has d edges. A recursive CTE walks in layers by itself: round k gives the routes of k legs. Filter the target, then `ORDER BY hops LIMIT 1`, and you have the route with the fewest legs.

**SEARCH.** PostgreSQL 14 and later have the clause `SEARCH BREADTH FIRST BY code SET ord` after the CTE. The docs say it adds a column `ord` to the output, used to `ORDER BY ord`; for breadth-first it is equivalent to a hand-written depth counter. `SEARCH DEPTH FIRST` gives depth-first order.

**Fewest legs or fewest days.** The fewest legs is not always the fewest days. Route `VNDAD>KRPUS>USLAX` has 2 legs and 19.8 days; route `VNDAD>HKHKG>KRPUS>USLAX` has 3 legs and 19.4 days. To go by weight, add up `days` in the CTE and sort by the total. Listing every route only suits small graphs: the number of routes grows very fast as a graph grows.

**In Cypher.** The Cypher docs say `SHORTEST k` keeps the k shortest paths by number of hops, and a weighted shortest path needs the GDS (Graph Data Science) library:

```text
MATCH p = SHORTEST 1
  (a:Port {code: 'VNDAD'})
  -[:LEG]->+(b:Port {code: 'USLAX'})
RETURN length(p)
```

## Syntax

```sql
WITH RECURSIVE r(code, depth) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.depth + 1
  FROM r JOIN legs l
    ON l.src = r.code
) SEARCH BREADTH FIRST BY code
  SET ord
SELECT code, depth FROM r
ORDER BY ord;
```

- The column after `BY` must be in the CTE's column list.
- `ord` is an added column for sorting; it need not be returned.

## Example

Every route to `USLAX`, shortest first:

```sql
WITH RECURSIVE r(code, hops, route)
AS (
  SELECT 'VNDAD'::text, 0, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.hops + 1,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT route, hops FROM r
WHERE code = 'USLAX'
ORDER BY hops;
```

Breadth-first order with `SEARCH`:

```sql
WITH RECURSIVE r(code, depth) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.depth + 1
  FROM r JOIN legs l
    ON l.src = r.code
) SEARCH BREADTH FIRST BY code
  SET ord
SELECT code, depth FROM r
ORDER BY ord;
```

The smallest depth of each port, one row per port:

```sql
WITH RECURSIVE r(code, depth) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.depth + 1
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code, min(depth) AS depth
FROM r GROUP BY code
ORDER BY depth, code;
```

## Common mistakes

Taking the route with the fewest legs as the fastest one:

```sql
-- WRONG: fewest legs, not fewest days
WITH RECURSIVE r(code, n, d, route)
AS (
  SELECT 'VNDAD'::text, 0,
    0::numeric, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.n + 1, r.d + l.days,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT route, d AS days FROM r
WHERE code = 'USLAX'
ORDER BY n LIMIT 1;
```

```sql
-- FIX: order by the summed days
WITH RECURSIVE r(code, n, d, route)
AS (
  SELECT 'VNDAD'::text, 0,
    0::numeric, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.n + 1, r.d + l.days,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT route, d AS days FROM r
WHERE code = 'USLAX'
ORDER BY d LIMIT 1;
```

The `SEARCH` column must be a column of the CTE, not of `legs`:

```sql
-- ERROR 42601
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION ALL
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) SEARCH BREADTH FIRST BY dst
  SET ord
SELECT code FROM r;
```

## Practice

Three questions: the route with the fewest legs to `USLAX`, the breadth-first order, and the route with the fewest days.

## Recap

- BFS covers all of depth d before depth d + 1: the first meeting with the target = the fewest edges.
- `SEARCH BREADTH FIRST BY code SET ord` (PostgreSQL 14+) adds a column `ord` to `ORDER BY`.
- The fewest legs is not always the fewest days: to go by weight, add up and sort by the total.
- Cypher's `SHORTEST` counts hops; listing every route only suits small graphs.
