---
id: e-gr-l2-04
engine: graph
level: L2
module: traverse
title: Bậc và độ trung tâm cơ bản
title_en: Degree and basic centrality
kind: lab
runtime: browser
minutes: 18
figures: [{ name: gr-degree, at: idea }]
objectives:
  - vi: Tính bậc ra, bậc vào và tổng bậc của mọi nút, kể cả nút bậc 0.
    en: Compute the out-degree, in-degree and total degree of every node, nodes of degree 0 included.
  - vi: Xếp hạng nút theo độ trung tâm bậc để tìm cảng trung chuyển.
    en: Rank nodes by degree centrality to find the hub ports.
  - vi: Đếm số nút tới được trong 2 bước, một thước đo tầm với đơn giản.
    en: Count the nodes reachable in 2 steps, a simple measure of reach.
requires: [e-gr-l2-01]
sources:
  - { url: "https://neo4j.com/docs/graph-data-science/current/algorithms/degree-centrality/", title: "Neo4j GDS docs: Degree Centrality", title_vi: "Tài liệu Neo4j GDS: độ trung tâm theo bậc (degree centrality)" }
  - { url: https://www.postgresql.org/docs/18/functions-aggregate.html, title_vi: "Hàm gộp" }
  - { url: https://www.postgresql.org/docs/18/queries-union.html, title_vi: "Gộp kết quả truy vấn (UNION, INTERSECT, EXCEPT)" }
lab:
  setup: |
    CREATE TABLE ports (code text PRIMARY KEY);
    INSERT INTO ports VALUES
      ('VNDAD'), ('VNSGN'), ('VNHPH'), ('SGSIN'),
      ('HKHKG'), ('KRPUS'), ('NLRTM'), ('AUSYD'),
      ('USLAX');
    CREATE TABLE legs (
      src text REFERENCES ports,
      dst text REFERENCES ports,
      days numeric(4, 1) NOT NULL,
      PRIMARY KEY (src, dst)
    );
    INSERT INTO legs VALUES
      ('VNDAD', 'SGSIN', 3.2), ('VNDAD', 'HKHKG', 2.5),
      ('VNSGN', 'SGSIN', 2.2), ('VNHPH', 'HKHKG', 1.8),
      ('HKHKG', 'KRPUS', 2.9), ('HKHKG', 'SGSIN', 3.5),
      ('SGSIN', 'NLRTM', 27.0), ('SGSIN', 'AUSYD', 12.4),
      ('KRPUS', 'USLAX', 14.0);
  steps:
    - task:
        vi: "Bậc ra và bậc vào của mọi cảng, cảng không có cạnh ghi 0: trả `code`, `out_deg`, `in_deg`."
        en: "The out-degree and in-degree of every port, 0 for a port with no edge: return `code`, `out_deg`, `in_deg`."
      solution: |
        SELECT p.code,
          (SELECT count(*) FROM legs
           WHERE src = p.code) AS out_deg,
          (SELECT count(*) FROM legs
           WHERE dst = p.code) AS in_deg
        FROM ports p
      check: rows
      hint:
        vi: "Hai truy vấn con đếm riêng: một theo `src`, một theo `dst`."
        en: "Two separate counting subqueries: one on `src`, one on `dst`."
    - task:
        vi: "Ba cảng có tổng bậc (vào cộng ra) cao nhất, bằng nhau thì mã nhỏ trước: trả `code`, `degree`, xếp từ cao xuống."
        en: "The three ports with the highest total degree (in plus out), ties broken by the smaller code first: return `code`, `degree`, from highest down."
      solution: |
        SELECT code, count(*) AS degree
        FROM (
          SELECT src AS code FROM legs
          UNION ALL
          SELECT dst FROM legs
        ) e
        GROUP BY code
        ORDER BY degree DESC, code
        LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "Mỗi cạnh cho hai đầu: `SELECT src ... UNION ALL SELECT dst ...`, rồi đếm theo mã, `ORDER BY degree DESC, code LIMIT 3`."
        en: "Each edge gives two ends: `SELECT src ... UNION ALL SELECT dst ...`, then count per code, `ORDER BY degree DESC, code LIMIT 3`."
    - task:
        vi: "Mỗi cảng tới được bao nhiêu cảng khác trong tối đa 2 chặng (theo chiều cạnh)? Trả `code`, `reach_2`, kể cả cảng ra 0."
        en: "How many other ports can each port reach in at most 2 legs (along the edge direction)? Return `code`, `reach_2`, including ports with 0."
      solution: |
        SELECT p.code,
          count(DISTINCT r.dst) AS reach_2
        FROM ports p
        LEFT JOIN (
          SELECT src, dst FROM legs
          UNION
          SELECT a.src, b.dst
          FROM legs a
          JOIN legs b ON b.src = a.dst
        ) r ON r.src = p.code
        GROUP BY p.code
      check: rows
      hint:
        vi: "Cạnh một chặng `UNION` cặp hai chặng (`legs a JOIN legs b ON b.src = a.dst`), rồi `count(DISTINCT r.dst)` sau `LEFT JOIN`."
        en: "One-leg edges `UNION` two-leg pairs (`legs a JOIN legs b ON b.src = a.dst`), then `count(DISTINCT r.dst)` after a `LEFT JOIN`."
quiz:
  - q:
      vi: "`SGSIN` có 2 cạnh ra và 3 cạnh vào. Câu `ports LEFT JOIN legs o ON o.src = code LEFT JOIN legs i ON i.dst = code` rồi `count(o.dst)` cho `SGSIN` bao nhiêu?"
      en: "`SGSIN` has 2 outgoing and 3 incoming edges. The query `ports LEFT JOIN legs o ON o.src = code LEFT JOIN legs i ON i.dst = code`, then `count(o.dst)`, gives `SGSIN` what?"
    options:
      - { vi: "2, đúng bằng bậc ra của nó", en: "2, its right out-degree" }
      - { vi: "5, tức là tổng bậc của nó", en: "5, its total degree" }
      - { vi: "6, vì hai phép nối nhân dòng", en: "6, the two joins multiply rows" }
    answer: 2
    trap: 0
    why:
      vi: "Trông như `count(o.dst)` chỉ đếm cạnh ra nên phải là 2, nhưng phép nối thứ hai ghép mỗi cạnh ra với từng cạnh vào: 2 × 3 = 6 dòng, và `o.dst` có giá trị trên cả 6 dòng. Đếm bậc ra và bậc vào trong hai truy vấn con riêng thì không có phép nhân này."
      en: "It looks as if `count(o.dst)` counts only outgoing edges and must be 2, but the second join pairs each outgoing edge with every incoming edge: 2 × 3 = 6 rows, and `o.dst` has a value on all 6. Counting out-degree and in-degree in two separate subqueries avoids that multiplication."
  - q:
      vi: "Theo tài liệu Neo4j GDS (Graph Data Science), độ trung tâm bậc (degree centrality) với hướng `NATURAL` (mặc định) đếm gì?"
      en: "According to the Neo4j GDS (Graph Data Science) docs, what does degree centrality count with orientation `NATURAL` (the default)?"
    options:
      - { vi: "Bậc vào của mỗi nút", en: "Each node's in-degree" }
      - { vi: "Bậc ra của mỗi nút", en: "Each node's out-degree" }
      - { vi: "Tổng bậc vào và bậc ra", en: "In-degree plus out-degree" }
    answer: 1
    trap: 2
    why:
      vi: "Tổng hai chiều là hướng `UNDIRECTED`, không phải mặc định. Tài liệu GDS nói `NATURAL` tính bậc ra, `REVERSE` tính bậc vào, `UNDIRECTED` cộng cả hai. Trong SQL, đó lần lượt là đếm theo `src`, theo `dst`, hoặc `UNION ALL` hai cột."
      en: "Both directions summed is orientation `UNDIRECTED`, not the default. The GDS docs say `NATURAL` computes the out-degree, `REVERSE` the in-degree, and `UNDIRECTED` sums both. In SQL that is counting by `src`, by `dst`, or a `UNION ALL` of the two columns."
---
## Mở bài

Cảng nào là đầu mối của mạng tuyến? Câu hỏi đơn giản nhất là đếm xem mỗi cảng nối với bao nhiêu chặng. Bài này tính bậc và một thước đo tầm với hai chặng bằng SQL thường.

## Ý chính

**Bậc.** Bậc (degree) của một nút là số cạnh chạm vào nó. Với đồ thị có hướng, bậc ra (out-degree) đếm cạnh có `src` là nút đó, bậc vào (in-degree) đếm cạnh có `dst` là nút đó. Tài liệu Neo4j GDS (Graph Data Science) định nghĩa độ trung tâm bậc (degree centrality) đúng như vậy: hướng `NATURAL` là bậc ra, `REVERSE` là bậc vào, `UNDIRECTED` cộng cả hai.

**Tổng bậc bằng UNION ALL.** Mỗi cạnh có hai đầu. Lấy cột `src` `UNION ALL` cột `dst` rồi đếm theo mã là ra tổng bậc. Phải là `UNION ALL`: `UNION` bỏ trùng nên mỗi cảng chỉ còn một dòng.

**Đừng nối hai lần.** Nối `legs` hai lần vào `ports` (một lần cho cạnh ra, một lần cho cạnh vào) làm nhân dòng: 2 cạnh ra × 3 cạnh vào thành 6 dòng. Đếm từng chiều trong một truy vấn con riêng.

**Tầm với.** Bậc chỉ nhìn một bước. Đếm số cảng tới được trong 2 chặng cho biết cảng nào mở ra nhiều nơi: ghép cạnh một chặng với cặp hai chặng rồi đếm `DISTINCT`. Ở lab này `SGSIN` có tổng bậc cao nhất, nhưng tầm với 2 chặng lớn nhất thuộc về `VNDAD` và `HKHKG`.

## Cú pháp

```sql
-- out- and in-degree, 0 included
SELECT p.code,
  (SELECT count(*) FROM legs
   WHERE src = p.code) AS out_deg,
  (SELECT count(*) FROM legs
   WHERE dst = p.code) AS in_deg
FROM ports p;
-- total degree
SELECT code, count(*) FROM (
  SELECT src AS code FROM legs
  UNION ALL
  SELECT dst FROM legs) e
GROUP BY code;
```

- Truy vấn con trong `SELECT` trả 0 cho cảng không có cạnh, không cần `LEFT JOIN`.
- `count(DISTINCT ...)` để một cảng tới được bằng hai đường chỉ tính một lần.

## Ví dụ

Tổng bậc của từng cảng có cạnh:

```sql
SELECT code, count(*) AS degree
FROM (
  SELECT src AS code FROM legs
  UNION ALL
  SELECT dst FROM legs
) e
GROUP BY code
ORDER BY degree DESC, code;
```

Bậc ra và bậc vào, kể cả cảng không có cạnh:

```sql
SELECT p.code,
  (SELECT count(*) FROM legs
   WHERE src = p.code) AS out_deg,
  (SELECT count(*) FROM legs
   WHERE dst = p.code) AS in_deg
FROM ports p
ORDER BY p.code;
```

Các cặp đi được bằng đúng 2 chặng:

```sql
SELECT a.src, a.dst AS via, b.dst
FROM legs a
JOIN legs b ON b.src = a.dst
ORDER BY a.src, b.dst;
```

## Lỗi hay gặp

Nối cạnh ra và cạnh vào trong cùng một câu làm nhân dòng:

```sql
-- WRONG: SGSIN gets 6 and 6
SELECT p.code,
  count(o.dst) AS out_deg,
  count(i.src) AS in_deg
FROM ports p
LEFT JOIN legs o ON o.src = p.code
LEFT JOIN legs i ON i.dst = p.code
GROUP BY p.code;
```

```sql
-- FIX: one subquery per direction
SELECT p.code,
  (SELECT count(*) FROM legs
   WHERE src = p.code) AS out_deg,
  (SELECT count(*) FROM legs
   WHERE dst = p.code) AS in_deg
FROM ports p;
```

`UNION` bỏ trùng nên mỗi cảng chỉ còn bậc 1:

```sql
-- WRONG: UNION drops repeated ends
SELECT code, count(*) AS degree
FROM (
  SELECT src AS code FROM legs
  UNION
  SELECT dst FROM legs
) e
GROUP BY code;
```

```sql
-- FIX: UNION ALL keeps every end
SELECT code, count(*) AS degree
FROM (
  SELECT src AS code FROM legs
  UNION ALL
  SELECT dst FROM legs
) e
GROUP BY code;
```

## Thực hành

Ba câu hỏi: bậc ra và bậc vào, ba cảng có tổng bậc cao nhất, và tầm với 2 chặng.

## Tóm tắt

- Bậc ra đếm theo `src`, bậc vào theo `dst`; tổng bậc là `UNION ALL` hai cột.
- Đếm mỗi chiều trong một truy vấn con riêng, không nối `legs` hai lần.
- Độ trung tâm bậc của Neo4j GDS: `NATURAL` = bậc ra, `REVERSE` = bậc vào, `UNDIRECTED` = cả hai.
- Tầm với 2 chặng: một chặng `UNION` hai chặng, rồi `count(DISTINCT ...)`.

# EN

## Opening

Which port is the hub of the route network? The simplest question is how many legs touch each port. This lesson computes degree and a two-leg measure of reach in plain SQL.

## Key idea

**Degree.** A node's degree is the number of edges touching it. In a directed graph, the out-degree counts the edges whose `src` is that node, and the in-degree counts the edges whose `dst` is that node. The Neo4j GDS (Graph Data Science) docs define degree centrality exactly this way: orientation `NATURAL` is the out-degree, `REVERSE` the in-degree, `UNDIRECTED` the sum of both.

**Total degree with UNION ALL.** Each edge has two ends. Take column `src` `UNION ALL` column `dst` and count per code to get the total degree. It must be `UNION ALL`: `UNION` drops duplicates, so each port would keep a single row.

**Do not join twice.** Joining `legs` to `ports` twice (once for outgoing edges, once for incoming) multiplies rows: 2 outgoing × 3 incoming edges become 6 rows. Count each direction in its own subquery.

**Reach.** Degree looks only one step away. Counting the ports reachable in 2 legs tells which port opens up the most places: combine one-leg edges with two-leg pairs, then count `DISTINCT`. In this lab `SGSIN` has the highest total degree, but the largest 2-leg reach belongs to `VNDAD` and `HKHKG`.

## Syntax

```sql
-- out- and in-degree, 0 included
SELECT p.code,
  (SELECT count(*) FROM legs
   WHERE src = p.code) AS out_deg,
  (SELECT count(*) FROM legs
   WHERE dst = p.code) AS in_deg
FROM ports p;
-- total degree
SELECT code, count(*) FROM (
  SELECT src AS code FROM legs
  UNION ALL
  SELECT dst FROM legs) e
GROUP BY code;
```

- A subquery in `SELECT` returns 0 for a port without edges, with no `LEFT JOIN` needed.
- `count(DISTINCT ...)` so a port reachable by two routes counts once.

## Example

The total degree of each port that has edges:

```sql
SELECT code, count(*) AS degree
FROM (
  SELECT src AS code FROM legs
  UNION ALL
  SELECT dst FROM legs
) e
GROUP BY code
ORDER BY degree DESC, code;
```

Out-degree and in-degree, ports without edges included:

```sql
SELECT p.code,
  (SELECT count(*) FROM legs
   WHERE src = p.code) AS out_deg,
  (SELECT count(*) FROM legs
   WHERE dst = p.code) AS in_deg
FROM ports p
ORDER BY p.code;
```

The pairs joined by exactly 2 legs:

```sql
SELECT a.src, a.dst AS via, b.dst
FROM legs a
JOIN legs b ON b.src = a.dst
ORDER BY a.src, b.dst;
```

## Common mistakes

Joining outgoing and incoming edges in one query multiplies rows:

```sql
-- WRONG: SGSIN gets 6 and 6
SELECT p.code,
  count(o.dst) AS out_deg,
  count(i.src) AS in_deg
FROM ports p
LEFT JOIN legs o ON o.src = p.code
LEFT JOIN legs i ON i.dst = p.code
GROUP BY p.code;
```

```sql
-- FIX: one subquery per direction
SELECT p.code,
  (SELECT count(*) FROM legs
   WHERE src = p.code) AS out_deg,
  (SELECT count(*) FROM legs
   WHERE dst = p.code) AS in_deg
FROM ports p;
```

`UNION` drops duplicates, so every port is left with degree 1:

```sql
-- WRONG: UNION drops repeated ends
SELECT code, count(*) AS degree
FROM (
  SELECT src AS code FROM legs
  UNION
  SELECT dst FROM legs
) e
GROUP BY code;
```

```sql
-- FIX: UNION ALL keeps every end
SELECT code, count(*) AS degree
FROM (
  SELECT src AS code FROM legs
  UNION ALL
  SELECT dst FROM legs
) e
GROUP BY code;
```

## Practice

Three questions: out-degree and in-degree, the three ports with the highest total degree, and the 2-leg reach.

## Recap

- Out-degree counts by `src`, in-degree by `dst`; total degree is a `UNION ALL` of the two columns.
- Count each direction in its own subquery; never join `legs` twice.
- Neo4j GDS degree centrality: `NATURAL` = out-degree, `REVERSE` = in-degree, `UNDIRECTED` = both.
- 2-leg reach: one leg `UNION` two legs, then `count(DISTINCT ...)`.
