---
id: e-gr-l3-03
engine: graph
level: L3
module: algorithms
title: PageRank với số vòng cố định
title_en: PageRank with a fixed number of rounds
kind: lab
runtime: browser
minutes: 25
figures: [{ name: gr-pagerank, at: idea }]
objectives:
  - vi: Chia điểm của mỗi nút đều cho các cạnh ra của nó và tính một vòng PageRank có hệ số tắt dần 0,85.
    en: Split each node's score evenly over its outgoing edges and compute one PageRank round with damping 0.85.
  - vi: Lặp 20 vòng bằng CTE đệ quy có cột đếm vòng, không để nút nào rơi mất.
    en: Repeat 20 rounds with a recursive CTE that counts rounds, without losing any node.
  - vi: Giải thích vì sao bậc vào cao nhất không chắc có PageRank cao nhất.
    en: Explain why the highest in-degree does not guarantee the highest PageRank.
requires: [e-gr-l2-04, e-gr-l2-01]
sources:
  - https://www.postgresql.org/docs/18/queries-with.html
  - https://www.postgresql.org/docs/18/tutorial-window.html
  - { url: "https://neo4j.com/docs/graph-data-science/current/algorithms/page-rank/", title: "Neo4j GDS docs: PageRank" }
lab:
  setup: |
    CREATE TABLE ports (code text PRIMARY KEY);
    INSERT INTO ports VALUES
      ('VNDAD'), ('VNSGN'), ('SGSIN'),
      ('HKHKG'), ('KRPUS');
    CREATE TABLE legs (
      src text REFERENCES ports,
      dst text REFERENCES ports,
      PRIMARY KEY (src, dst)
    );
    INSERT INTO legs VALUES
      ('VNDAD', 'SGSIN'), ('VNDAD', 'HKHKG'),
      ('VNSGN', 'SGSIN'), ('SGSIN', 'HKHKG'),
      ('HKHKG', 'SGSIN'), ('HKHKG', 'KRPUS'),
      ('KRPUS', 'VNDAD');
  steps:
    - name: { vi: Trọng số cạnh, en: Edge weights }
      task:
        vi: "Tạo view `wlegs(src, dst, w)`: mỗi cạnh của `legs` kèm `w` = 1 chia cho số cạnh ra của `src`. Lab chấm bằng `SELECT src, dst, w FROM wlegs`."
        en: "Create the view `wlegs(src, dst, w)`: each edge of `legs` with `w` = 1 divided by the number of outgoing edges of `src`. The lab grades it with `SELECT src, dst, w FROM wlegs`."
      solution: |
        CREATE VIEW wlegs AS
          SELECT src, dst,
            1.0 / count(*) OVER (
              PARTITION BY src) AS w
          FROM legs
      after: SELECT src, dst, w FROM wlegs
      check: rows
      hint:
        vi: "`count(*) OVER (PARTITION BY src)` là số cạnh ra của `src` trên từng dòng; viết `1.0 /` để ra số thập phân."
        en: "`count(*) OVER (PARTITION BY src)` is the out-degree of `src` on every row; write `1.0 /` to get a decimal."
    - name: { vi: Một vòng, en: One round }
      task:
        vi: "Mọi cảng bắt đầu với điểm 0,2 (5 cảng). Tính một vòng: điểm mới = 0,15 / 5 + 0,85 × tổng (0,2 × `w`) trên các cạnh đi vào cảng đó. Cảng không có cạnh vào vẫn có dòng. Trả `code`, `rank` làm tròn 3 chữ số."
        en: "Every port starts with score 0.2 (5 ports). Compute one round: new score = 0.15 / 5 + 0.85 × the sum of (0.2 × `w`) over the edges coming into that port. A port with no incoming edge still gets a row. Return `code`, `rank` rounded to 3 decimals."
      solution: |
        SELECT p.code,
          round(0.15 / 5 + 0.85 *
            coalesce(sum(0.2 * l.w), 0),
            3) AS rank
        FROM ports p
        LEFT JOIN wlegs l
          ON l.dst = p.code
        GROUP BY p.code
      check: rows
      hint:
        vi: "`ports LEFT JOIN wlegs ON l.dst = p.code`, rồi `coalesce(sum(...), 0)` để cảng không có cạnh vào được 0,03."
        en: "`ports LEFT JOIN wlegs ON l.dst = p.code`, then `coalesce(sum(...), 0)` so a port with no incoming edge gets 0.03."
    - name: { vi: "20 vòng", en: "20 rounds" }
      task:
        vi: "Lặp đúng 20 vòng bằng `WITH RECURSIVE` (cột `round` từ 0 tới 20) và trả điểm ở vòng 20: `code`, `rank` làm tròn 3 chữ số. Mỗi vòng phải giữ đủ 5 cảng."
        en: "Repeat exactly 20 rounds with `WITH RECURSIVE` (column `round` from 0 to 20) and return the scores at round 20: `code`, `rank` rounded to 3 decimals. Every round must keep all 5 ports."
      solution: |
        WITH RECURSIVE e AS (
          SELECT src, dst, w FROM wlegs
          UNION ALL
          SELECT code, code, 0 FROM ports
        ), r(round, code, rank) AS (
          SELECT 0, code, 0.2 FROM ports
          UNION ALL
          SELECT DISTINCT r.round + 1,
            e.dst, 0.15 / 5 + 0.85 *
              sum(r.rank * e.w) OVER (
                PARTITION BY e.dst)
          FROM r JOIN e
            ON e.src = r.code
          WHERE r.round < 20
        )
        SELECT code,
          round(rank, 3) AS rank
        FROM r WHERE round = 20
      check: rows
      hint:
        vi: "Hàm gộp bị cấm trong phần đệ quy, nhưng hàm cửa sổ `sum(...) OVER (PARTITION BY e.dst)` cùng `DISTINCT` thì được. Thêm cạnh tự trỏ trọng số 0 (`SELECT code, code, 0 FROM ports`) để cảng không có cạnh vào không rơi mất."
        en: "Aggregates are banned in the recursive term, but the window function `sum(...) OVER (PARTITION BY e.dst)` with `DISTINCT` is allowed. Add a self-edge of weight 0 (`SELECT code, code, 0 FROM ports`) so a port with no incoming edge is not lost."
quiz:
  - q:
      vi: "Sau một vòng, `SGSIN` có điểm cao nhất (0,370). Sau 20 vòng thì sao?"
      en: "After one round, `SGSIN` has the top score (0.370). What about after 20 rounds?"
    options:
      - { vi: "`SGSIN` vẫn đứng đầu, vì vòng 1 đã đủ", en: "`SGSIN` stays on top, one round is enough" }
      - { vi: "`HKHKG` đứng đầu (0,341), `SGSIN` thứ hai", en: "`HKHKG` leads (0.341), `SGSIN` second" }
      - { vi: "Mọi cảng về lại 0,2", en: "Every port goes back to 0.2" }
    answer: 1
    trap: 0
    why:
      vi: "Một vòng chỉ chuyển điểm ban đầu đi một bước, nên nó gần với đếm bậc vào. Các vòng sau dồn điểm theo cấu trúc cả mạng: `SGSIN` chuyển toàn bộ điểm của nó cho `HKHKG`, nên `HKHKG` vượt lên từ vòng 2 và đứng ở 0,341 từ khoảng vòng 10. Tài liệu Neo4j GDS mặc định chạy tối đa 20 vòng và dừng sớm khi mọi điểm đổi ít hơn ngưỡng `tolerance`."
      en: "One round only moves the starting scores one step, so it is close to counting in-degree. Later rounds pour scores along the structure of the whole network: `SGSIN` passes all of its score to `HKHKG`, so `HKHKG` pulls ahead from round 2 and sits at 0.341 from about round 10. The Neo4j GDS docs default to at most 20 iterations and stop early when every score changes less than the `tolerance` threshold."
  - q:
      vi: "Bỏ các cạnh tự trỏ trọng số 0 khỏi `e` ở bước 3. Điều gì xảy ra với `VNSGN`, cảng không có cạnh vào?"
      en: "Remove the weight-0 self-edges from `e` in step 3. What happens to `VNSGN`, the port with no incoming edge?"
    options:
      - { vi: "Nó giữ 0,03 như trước", en: "It keeps 0.03 as before" }
      - { vi: "Nó mất khỏi kết quả từ vòng 1", en: "It disappears from round 1 on" }
      - { vi: "Câu báo lỗi 42P19", en: "The query fails with 42P19" }
    answer: 1
    trap: 0
    why:
      vi: "Phần đệ quy chỉ sinh dòng cho `e.dst`, tức là cho cảng có cạnh đi vào. `VNSGN` không là `dst` của cạnh nào, nên từ vòng 1 nó không có dòng, và điểm 0,03 không còn ai mang. Cạnh tự trỏ trọng số 0 cho mỗi cảng một dòng mỗi vòng mà không đổi tổng. Không có lỗi 42P19 vì câu không dùng hàm gộp."
      en: "The recursive part produces rows only for `e.dst`, that is, for ports with an incoming edge. `VNSGN` is the `dst` of no edge, so from round 1 it has no row and nobody carries its 0.03. A weight-0 self-edge gives every port a row each round without changing the total. There is no 42P19 error because the query uses no aggregate."
---
## Mở bài

Bậc vào đếm số cạnh trỏ tới một cảng, nhưng không hỏi các cạnh đó đến từ đâu. PageRank cho điểm cao cho nút được các nút có điểm cao trỏ tới. Bài này tính PageRank bằng SQL với số vòng cố định.

## Ý chính

**Một vòng.** Mỗi nút chia điểm của nó đều cho các cạnh ra (`w` = 1 / bậc ra). Điểm mới của một nút = (1 − d) / N + d × tổng điểm nhận được, với d là hệ số tắt dần. Tài liệu Neo4j GDS dùng mặc định `dampingFactor` 0,85 và `maxIterations` 20.

**Nhiều vòng bằng CTE đệ quy.** Mỗi vòng đọc điểm của vòng trước, nên một cột `round` và `WHERE r.round < 20` làm câu dừng sau đúng 20 vòng. Hàm gộp bị từ chối trong phần đệ quy (42P19), nhưng hàm cửa sổ `sum(...) OVER (PARTITION BY dst)` kèm `DISTINCT` cho đúng một dòng mỗi nút. GDS còn dừng sớm khi mọi điểm đổi ít hơn `tolerance`; câu SQL ở đây luôn chạy đủ số vòng.

**Không để nút rơi mất.** Phần đệ quy chỉ sinh dòng cho nút có cạnh vào. Một cạnh tự trỏ trọng số 0 cho mỗi nút một dòng mỗi vòng mà không đổi điểm. Nút cụt (không có cạnh ra) thì làm thất thoát điểm; tài liệu GDS gọi chúng là dead-end. Lab này không có nút cụt.

**Bậc ≠ PageRank.** `SGSIN` có bậc vào cao nhất (3) và dẫn đầu sau vòng 1, nhưng nó chuyển hết điểm cho `HKHKG`, nên sau 20 vòng `HKHKG` đứng đầu.

## Cú pháp

```sql
CREATE VIEW wlegs AS
  SELECT src, dst,
    1.0 / count(*) OVER (
      PARTITION BY src) AS w
  FROM legs;
-- one row per node per round
SELECT DISTINCT r.round + 1, e.dst,
  0.03 + 0.85 * sum(r.rank * e.w)
    OVER (PARTITION BY e.dst)
FROM r JOIN e ON e.src = r.code
WHERE r.round < 20
```

- `0.15 / 5` = 0,03: phần mỗi nút luôn nhận, với N = 5.
- `e` = `wlegs` `UNION ALL` một cạnh tự trỏ trọng số 0 cho mỗi nút.

## Ví dụ

Bậc ra và trọng số của từng cạnh:

```sql
SELECT src, dst,
  round(1.0 / count(*) OVER (
    PARTITION BY src), 2) AS w
FROM legs
ORDER BY src, dst;
```

Bậc vào, để so với PageRank:

```sql
SELECT p.code, count(l.src) AS in_deg
FROM ports p
LEFT JOIN legs l ON l.dst = p.code
GROUP BY p.code
ORDER BY in_deg DESC, p.code;
```

Điểm của `HKHKG` qua từng vòng:

```sql
WITH RECURSIVE w AS (
  SELECT src, dst, 1.0 / count(*)
    OVER (PARTITION BY src) AS w
  FROM legs
), e AS (
  SELECT * FROM w
  UNION ALL
  SELECT code, code, 0 FROM ports
), r(round, code, rank) AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT DISTINCT r.round + 1,
    e.dst, 0.03 + 0.85 *
      sum(r.rank * e.w) OVER (
        PARTITION BY e.dst)
  FROM r JOIN e ON e.src = r.code
  WHERE r.round < 5
)
SELECT round,
  round(rank, 3) AS score
FROM r WHERE code = 'HKHKG'
ORDER BY round;
```

## Lỗi hay gặp

Thiếu cạnh tự trỏ thì cảng không có cạnh vào rơi khỏi kết quả:

```sql
-- WRONG: VNSGN lost after round 0
WITH RECURSIVE w AS (
  SELECT src, dst, 1.0 / count(*)
    OVER (PARTITION BY src) AS w
  FROM legs
), r(round, code, rank) AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT DISTINCT r.round + 1,
    w.dst, 0.03 + 0.85 *
      sum(r.rank * w.w) OVER (
        PARTITION BY w.dst)
  FROM r JOIN w ON w.src = r.code
  WHERE r.round < 3
)
SELECT code FROM r WHERE round = 3;
```

```sql
-- FIX: weight-0 self-edges
WITH RECURSIVE w AS (
  SELECT src, dst, 1.0 / count(*)
    OVER (PARTITION BY src) AS w
  FROM legs
  UNION ALL
  SELECT code, code, 0 FROM ports
), r(round, code, rank) AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT DISTINCT r.round + 1,
    w.dst, 0.03 + 0.85 *
      sum(r.rank * w.w) OVER (
        PARTITION BY w.dst)
  FROM r JOIN w ON w.src = r.code
  WHERE r.round < 3
)
SELECT code FROM r WHERE round = 3;
```

Dùng `sum ... GROUP BY` trong phần đệ quy bị từ chối:

```sql
-- ERROR 42P19
WITH RECURSIVE r(round, code, rank)
AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT r.round + 1, l.dst,
    0.03 + 0.85 * sum(r.rank)
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.round < 3
  GROUP BY r.round, l.dst
)
SELECT * FROM r;
```

## Thực hành

Ba bước: trọng số mỗi cạnh, một vòng PageRank cho đủ 5 cảng, và 20 vòng bằng CTE đệ quy.

## Tóm tắt

- PageRank: mỗi nút chia điểm đều cho cạnh ra; điểm mới = (1 − d) / N + d × tổng nhận được, d = 0,85.
- Số vòng cố định: cột `round` và `WHERE r.round < k`; GDS mặc định tối đa 20 vòng và có `tolerance`.
- Trong phần đệ quy dùng hàm cửa sổ + `DISTINCT`, không dùng hàm gộp (42P19).
- Cạnh tự trỏ trọng số 0 giữ mọi nút; bậc vào cao nhất không chắc có PageRank cao nhất.

# EN

## Opening

In-degree counts the edges pointing at a port, but never asks where those edges come from. PageRank gives a high score to a node that high-scoring nodes point to. This lesson computes PageRank in SQL with a fixed number of rounds.

## Key idea

**One round.** Each node splits its score evenly over its outgoing edges (`w` = 1 / out-degree). A node's new score = (1 − d) / N + d × the sum of the scores it receives, where d is the damping factor. The Neo4j GDS docs default to `dampingFactor` 0.85 and `maxIterations` 20.

**Many rounds with a recursive CTE.** Each round reads the previous round's scores, so a `round` column and `WHERE r.round < 20` stop the query after exactly 20 rounds. Aggregates are refused in the recursive term (42P19), but the window function `sum(...) OVER (PARTITION BY dst)` with `DISTINCT` gives exactly one row per node. GDS also stops early when every score changes less than `tolerance`; the SQL here always runs every round.

**Do not lose nodes.** The recursive part produces rows only for nodes with an incoming edge. A weight-0 self-edge gives every node a row each round without changing its score. A node with no outgoing edge leaks score; the GDS docs call such nodes dead-ends. This lab has none.

**Degree ≠ PageRank.** `SGSIN` has the highest in-degree (3) and leads after round 1, but it passes all of its score to `HKHKG`, so after 20 rounds `HKHKG` is on top.

## Syntax

```sql
CREATE VIEW wlegs AS
  SELECT src, dst,
    1.0 / count(*) OVER (
      PARTITION BY src) AS w
  FROM legs;
-- one row per node per round
SELECT DISTINCT r.round + 1, e.dst,
  0.03 + 0.85 * sum(r.rank * e.w)
    OVER (PARTITION BY e.dst)
FROM r JOIN e ON e.src = r.code
WHERE r.round < 20
```

- `0.15 / 5` = 0.03: the share every node always gets, with N = 5.
- `e` = `wlegs` `UNION ALL` a weight-0 self-edge for each node.

## Example

The out-degree weight of each edge:

```sql
SELECT src, dst,
  round(1.0 / count(*) OVER (
    PARTITION BY src), 2) AS w
FROM legs
ORDER BY src, dst;
```

In-degree, to compare with PageRank:

```sql
SELECT p.code, count(l.src) AS in_deg
FROM ports p
LEFT JOIN legs l ON l.dst = p.code
GROUP BY p.code
ORDER BY in_deg DESC, p.code;
```

The score of `HKHKG` round by round:

```sql
WITH RECURSIVE w AS (
  SELECT src, dst, 1.0 / count(*)
    OVER (PARTITION BY src) AS w
  FROM legs
), e AS (
  SELECT * FROM w
  UNION ALL
  SELECT code, code, 0 FROM ports
), r(round, code, rank) AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT DISTINCT r.round + 1,
    e.dst, 0.03 + 0.85 *
      sum(r.rank * e.w) OVER (
        PARTITION BY e.dst)
  FROM r JOIN e ON e.src = r.code
  WHERE r.round < 5
)
SELECT round,
  round(rank, 3) AS score
FROM r WHERE code = 'HKHKG'
ORDER BY round;
```

## Common mistakes

Without self-edges, the port with no incoming edge drops out of the result:

```sql
-- WRONG: VNSGN lost after round 0
WITH RECURSIVE w AS (
  SELECT src, dst, 1.0 / count(*)
    OVER (PARTITION BY src) AS w
  FROM legs
), r(round, code, rank) AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT DISTINCT r.round + 1,
    w.dst, 0.03 + 0.85 *
      sum(r.rank * w.w) OVER (
        PARTITION BY w.dst)
  FROM r JOIN w ON w.src = r.code
  WHERE r.round < 3
)
SELECT code FROM r WHERE round = 3;
```

```sql
-- FIX: weight-0 self-edges
WITH RECURSIVE w AS (
  SELECT src, dst, 1.0 / count(*)
    OVER (PARTITION BY src) AS w
  FROM legs
  UNION ALL
  SELECT code, code, 0 FROM ports
), r(round, code, rank) AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT DISTINCT r.round + 1,
    w.dst, 0.03 + 0.85 *
      sum(r.rank * w.w) OVER (
        PARTITION BY w.dst)
  FROM r JOIN w ON w.src = r.code
  WHERE r.round < 3
)
SELECT code FROM r WHERE round = 3;
```

Using `sum ... GROUP BY` in the recursive part is refused:

```sql
-- ERROR 42P19
WITH RECURSIVE r(round, code, rank)
AS (
  SELECT 0, code, 0.2 FROM ports
  UNION ALL
  SELECT r.round + 1, l.dst,
    0.03 + 0.85 * sum(r.rank)
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.round < 3
  GROUP BY r.round, l.dst
)
SELECT * FROM r;
```

## Practice

Three steps: the weight of each edge, one PageRank round for all 5 ports, and 20 rounds with a recursive CTE.

## Recap

- PageRank: each node splits its score evenly over its outgoing edges; new score = (1 − d) / N + d × the sum received, d = 0.85.
- A fixed number of rounds: a `round` column and `WHERE r.round < k`; GDS defaults to at most 20 iterations and has `tolerance`.
- In the recursive term use a window function + `DISTINCT`, never an aggregate (42P19).
- Weight-0 self-edges keep every node; the highest in-degree does not guarantee the highest PageRank.
