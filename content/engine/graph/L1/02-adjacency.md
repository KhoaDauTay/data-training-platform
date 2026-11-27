---
id: e-gr-l1-02
engine: graph
level: L1
module: model
title: Danh sách kề và ma trận kề
title_en: Adjacency list and adjacency matrix
kind: lab
runtime: browser
minutes: 18
figures: [{ name: gr-adjacency, at: idea }]
objectives:
  - vi: Dựng danh sách kề của từng nút từ bảng cạnh bằng `string_agg`.
    en: Build each node's adjacency list from the edge table with `string_agg`.
  - vi: Dựng ma trận kề bằng `CROSS JOIN` hai lần bảng nút, giữ cả ô trống.
    en: Build the adjacency matrix with a `CROSS JOIN` of the node table with itself, keeping the empty cells.
  - vi: Biết vì sao đồ thị thưa nên lưu theo cạnh, không lưu theo ma trận.
    en: Know why a sparse graph is stored as edges, not as a matrix.
requires: [e-gr-l1-01]
sources:
  - { url: https://www.postgresql.org/docs/18/functions-aggregate.html, title_vi: "Hàm gộp" }
  - { url: https://www.postgresql.org/docs/18/queries-table-expressions.html, title_vi: "Biểu thức bảng" }
  - { url: "https://neo4j.com/docs/getting-started/graph-database/", title: "Neo4j docs: What is a graph database", title_vi: "Tài liệu Neo4j: cơ sở dữ liệu đồ thị là gì" }
lab:
  setup: |
    CREATE TABLE ports (
      code text PRIMARY KEY,
      city text NOT NULL
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Da Nang'), ('VNSGN', 'Ho Chi Minh City'),
      ('VNHPH', 'Hai Phong'), ('SGSIN', 'Singapore'),
      ('HKHKG', 'Hong Kong'), ('KRPUS', 'Busan');
    CREATE TABLE legs (
      src text REFERENCES ports,
      dst text REFERENCES ports,
      days numeric(4, 1) NOT NULL,
      PRIMARY KEY (src, dst)
    );
    INSERT INTO legs VALUES
      ('VNDAD', 'SGSIN', 3.2), ('VNDAD', 'HKHKG', 2.5),
      ('VNSGN', 'SGSIN', 2.2), ('VNHPH', 'HKHKG', 1.8),
      ('HKHKG', 'KRPUS', 2.9), ('SGSIN', 'HKHKG', 3.5);
  steps:
    - task:
        vi: "Danh sách kề: với mỗi cảng có cạnh đi ra, trả `src` và `next_ports` là các cảng kế tiếp nối bằng dấu phẩy, xếp theo mã."
        en: "The adjacency list: for each port with outgoing edges, return `src` and `next_ports`, the next ports joined with commas, sorted by code."
      solution: |
        SELECT src,
          string_agg(dst, ',' ORDER BY dst)
            AS next_ports
        FROM legs
        GROUP BY src
      check: rows
      hint:
        vi: "`string_agg(dst, ',' ORDER BY dst)` với `GROUP BY src`."
        en: "`string_agg(dst, ',' ORDER BY dst)` with `GROUP BY src`."
    - task:
        vi: "Số cạnh đi ra của mọi cảng, kể cả cảng không có cạnh nào (ghi 0): trả `code`, `out_legs`."
        en: "The number of outgoing edges of every port, including ports with none (as 0): return `code`, `out_legs`."
      solution: |
        SELECT p.code,
          count(l.dst) AS out_legs
        FROM ports p
        LEFT JOIN legs l ON l.src = p.code
        GROUP BY p.code
      check: rows
      hint:
        vi: "`LEFT JOIN legs` để giữ cảng không có cạnh, rồi `count(l.dst)` (không phải `count(*)`)."
        en: "`LEFT JOIN legs` to keep ports without edges, then `count(l.dst)` (not `count(*)`)."
    - task:
        vi: "Một hàng của ma trận kề: với mọi cảng, Đà Nẵng (`VNDAD`) có cạnh đi thẳng tới đó không? Trả `code`, `has_leg` (boolean)."
        en: "One row of the adjacency matrix: for every port, does Da Nang (`VNDAD`) have a direct edge to it? Return `code`, `has_leg` (boolean)."
      solution: |
        SELECT p.code,
          EXISTS (
            SELECT 1 FROM legs l
            WHERE l.src = 'VNDAD'
              AND l.dst = p.code
          ) AS has_leg
        FROM ports p
      check: rows
      hint:
        vi: "Mỗi cảng một dòng từ `ports`, và `EXISTS (...)` hỏi có dòng (`VNDAD`, cảng đó) trong `legs` không."
        en: "One row per port from `ports`, and `EXISTS (...)` asks whether `legs` has the row (`VNDAD`, that port)."
    - task:
        vi: "Ma trận kề đầy đủ có bao nhiêu ô, và bao nhiêu ô có cạnh? Trả `cells`, `edges`."
        en: "How many cells does the full adjacency matrix have, and how many of them hold an edge? Return `cells`, `edges`."
      solution: |
        SELECT count(*) AS cells,
          count(l.src) AS edges
        FROM ports a
        CROSS JOIN ports b
        LEFT JOIN legs l
          ON l.src = a.code
         AND l.dst = b.code
      check: rows
      hint:
        vi: "`ports a CROSS JOIN ports b` cho mọi cặp (một ô), rồi `LEFT JOIN legs` và `count(l.src)` đếm ô có cạnh."
        en: "`ports a CROSS JOIN ports b` gives every pair (one cell), then `LEFT JOIN legs` and `count(l.src)` counts the cells with an edge."
quiz:
  - q:
      vi: "Mạng có 6 cảng và 6 chặng. Ma trận kề có bao nhiêu ô, và bao nhiêu ô trống?"
      en: "The network has 6 ports and 6 legs. How many cells does the adjacency matrix have, and how many are empty?"
    options:
      - { vi: "12 ô, 6 ô trống", en: "12 cells, 6 empty" }
      - { vi: "36 ô, 30 ô trống", en: "36 cells, 30 empty" }
      - { vi: "36 ô, 6 ô trống", en: "36 cells, 6 empty" }
    answer: 1
    trap: 2
    why:
      vi: "Con số 6 dễ bị lấy làm số ô trống vì đề có hai chữ 6, nhưng 6 là số ô có cạnh. Ma trận có một ô cho mỗi cặp (cảng đi, cảng đến): 6 × 6 = 36 ô, trừ 6 ô có cạnh còn 30 ô trống. Đồ thị thưa như vậy lưu theo danh sách cạnh thì chỉ cần 6 dòng."
      en: "The 6 is easy to take as the empty count because the question has two sixes, but 6 is the number of cells with an edge. The matrix has one cell per (from port, to port) pair: 6 × 6 = 36 cells, minus the 6 with an edge leaves 30 empty. A sparse graph like this stored as an edge list needs only 6 rows."
  - q:
      vi: "Đếm cạnh đi ra bằng `LEFT JOIN legs` rồi `count(*)`. `KRPUS` không có cạnh nào ra. Kết quả của `KRPUS` là gì?"
      en: "You count outgoing edges with `LEFT JOIN legs`, then `count(*)`. `KRPUS` has no outgoing edge. What does `KRPUS` get?"
    options:
      - { vi: "0, vì không có cạnh nào khớp", en: "0, because no edge matches" }
      - { vi: "1, dòng của LEFT JOIN được đếm", en: "1, the LEFT JOIN row is counted" }
      - { vi: "Không có dòng nào cho `KRPUS`", en: "No row at all for `KRPUS`" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như phải là 0, nhưng `LEFT JOIN` vẫn giữ một dòng cho `KRPUS` với các cột của `legs` là NULL, và `count(*)` đếm dòng đó thành 1. Dùng `count(l.dst)` thì NULL không được đếm và `KRPUS` có 0. Mất hẳn dòng là chuyện của `JOIN` thường, không phải `LEFT JOIN`."
      en: "It sounds like it must be 0, but the `LEFT JOIN` still keeps one row for `KRPUS` with NULLs in the `legs` columns, and `count(*)` counts that row as 1. With `count(l.dst)` the NULL is not counted and `KRPUS` gets 0. Losing the row entirely is what a plain `JOIN` does, not a `LEFT JOIN`."
---
## Mở bài

Cùng một mạng tuyến có thể viết thành danh sách kề (mỗi cảng kèm các cảng kế tiếp) hoặc ma trận kề (bảng ô vuông có/không). Bài này dựng cả hai từ bảng cạnh và xem cái nào tốn chỗ.

## Ý chính

**Danh sách kề.** Danh sách kề (adjacency list) ghi, cho mỗi nút, các nút nó nối tới. Trong SQL đó chỉ là bảng cạnh gom theo `src`: `string_agg(dst, ',')` ra một dòng mỗi cảng. Bảng `legs` của bài trước đã là dạng lưu của danh sách kề, chỉ chưa gom lại.

**Ma trận kề.** Ma trận kề (adjacency matrix) có một hàng và một cột cho mỗi nút; ô (hàng a, cột b) đánh dấu có cạnh từ a tới b hay không. Trong SQL, `ports a CROSS JOIN ports b` sinh đủ các ô, và `LEFT JOIN legs` cho biết ô nào có cạnh. Với n nút, ma trận luôn có n × n ô, dù có bao nhiêu cạnh.

**Thưa hay dày.** Mạng cảng là đồ thị thưa: 6 cảng, 6 chặng, nhưng 36 ô. Lưu theo cạnh chỉ tốn chỗ cho cạnh có thật; ma trận tốn chỗ cho cả ô trống. Ma trận hợp khi đồ thị nhỏ và dày, hoặc khi cần trả lời "a nối b không" trong một bước. Tài liệu Neo4j nói CSDL đồ thị lưu quan hệ ngay cạnh nút, tức là gần với danh sách kề hơn là ma trận.

## Cú pháp

```sql
-- adjacency list
SELECT src, string_agg(dst, ','
         ORDER BY dst) AS next_ports
FROM legs GROUP BY src;
-- adjacency matrix: every cell
SELECT a.code, b.code,
  l.src IS NOT NULL AS has_leg
FROM ports a CROSS JOIN ports b
LEFT JOIN legs l
  ON l.src = a.code
 AND l.dst = b.code;
```

- `count(l.dst)` bỏ qua NULL; `count(*)` đếm cả dòng NULL do `LEFT JOIN` giữ lại.
- `FILTER (WHERE ...)` biến một hàng của ma trận thành các cột.

## Ví dụ

Danh sách kề của các cảng có cạnh đi ra:

```sql
SELECT src, string_agg(dst, ','
         ORDER BY dst) AS next_ports
FROM legs
GROUP BY src
ORDER BY src;
```

Ba cột đầu của ma trận kề, một hàng cho mỗi cảng:

```sql
SELECT a.code,
  count(*) FILTER (
    WHERE l.dst = 'HKHKG') AS hkhkg,
  count(*) FILTER (
    WHERE l.dst = 'KRPUS') AS krpus,
  count(*) FILTER (
    WHERE l.dst = 'SGSIN') AS sgsin
FROM ports a
LEFT JOIN legs l ON l.src = a.code
GROUP BY a.code
ORDER BY a.code;
```

Số ô của ma trận so với số cạnh:

```sql
SELECT count(*) AS cells,
  count(l.src) AS edges
FROM ports a
CROSS JOIN ports b
LEFT JOIN legs l
  ON l.src = a.code
 AND l.dst = b.code;
```

## Lỗi hay gặp

`JOIN` thường làm mất cảng không có cạnh đi ra:

```sql
-- WRONG: KRPUS disappears
SELECT p.code, count(*) AS out_legs
FROM ports p
JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

```sql
-- FIX: keep every port
SELECT p.code,
  count(l.dst) AS out_legs
FROM ports p
LEFT JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

`LEFT JOIN` với `count(*)` cho cảng không có cạnh số 1:

```sql
-- WRONG: KRPUS gets 1
SELECT p.code, count(*) AS out_legs
FROM ports p
LEFT JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

```sql
-- FIX: count the edge column
SELECT p.code,
  count(l.dst) AS out_legs
FROM ports p
LEFT JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

## Thực hành

Bốn câu hỏi: danh sách kề, số cạnh đi ra của mọi cảng, một hàng của ma trận kề, và số ô của ma trận.

## Tóm tắt

- Danh sách kề = bảng cạnh gom theo `src`; bảng `legs` đã là dạng lưu của nó.
- Ma trận kề = `CROSS JOIN` bảng nút với chính nó, `LEFT JOIN` bảng cạnh.
- n nút cho n × n ô; đồ thị thưa thì phần lớn ô trống.
- Đếm cạnh sau `LEFT JOIN` bằng cột của cạnh, như `count(l.dst)`, không bằng `count(*)`.

# EN

## Opening

The same route network can be written as an adjacency list (each port with its next ports) or an adjacency matrix (a square grid of yes/no). This lesson builds both from the edge table and checks which one takes room.

## Key idea

**Adjacency list.** An adjacency list records, for each node, the nodes it connects to. In SQL it is just the edge table grouped by `src`: `string_agg(dst, ',')` gives one row per port. The `legs` table of the previous lesson already is the stored form of an adjacency list, only not grouped yet.

**Adjacency matrix.** An adjacency matrix has one row and one column per node; cell (row a, column b) marks whether there is an edge from a to b. In SQL, `ports a CROSS JOIN ports b` produces every cell, and `LEFT JOIN legs` says which cells hold an edge. With n nodes the matrix always has n × n cells, however many edges there are.

**Sparse or dense.** The port network is a sparse graph: 6 ports, 6 legs, but 36 cells. Storing edges only spends room on edges that exist; the matrix spends room on empty cells too. A matrix fits a small, dense graph, or a need to answer "is a joined to b" in one step. The Neo4j docs say a graph database stores relationships right next to the nodes, which is closer to an adjacency list than to a matrix.

## Syntax

```sql
-- adjacency list
SELECT src, string_agg(dst, ','
         ORDER BY dst) AS next_ports
FROM legs GROUP BY src;
-- adjacency matrix: every cell
SELECT a.code, b.code,
  l.src IS NOT NULL AS has_leg
FROM ports a CROSS JOIN ports b
LEFT JOIN legs l
  ON l.src = a.code
 AND l.dst = b.code;
```

- `count(l.dst)` skips NULLs; `count(*)` also counts the NULL row that a `LEFT JOIN` keeps.
- `FILTER (WHERE ...)` turns one row of the matrix into columns.

## Example

The adjacency list of ports with outgoing edges:

```sql
SELECT src, string_agg(dst, ','
         ORDER BY dst) AS next_ports
FROM legs
GROUP BY src
ORDER BY src;
```

The first three columns of the adjacency matrix, one row per port:

```sql
SELECT a.code,
  count(*) FILTER (
    WHERE l.dst = 'HKHKG') AS hkhkg,
  count(*) FILTER (
    WHERE l.dst = 'KRPUS') AS krpus,
  count(*) FILTER (
    WHERE l.dst = 'SGSIN') AS sgsin
FROM ports a
LEFT JOIN legs l ON l.src = a.code
GROUP BY a.code
ORDER BY a.code;
```

Matrix cells against edges:

```sql
SELECT count(*) AS cells,
  count(l.src) AS edges
FROM ports a
CROSS JOIN ports b
LEFT JOIN legs l
  ON l.src = a.code
 AND l.dst = b.code;
```

## Common mistakes

A plain `JOIN` loses ports without outgoing edges:

```sql
-- WRONG: KRPUS disappears
SELECT p.code, count(*) AS out_legs
FROM ports p
JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

```sql
-- FIX: keep every port
SELECT p.code,
  count(l.dst) AS out_legs
FROM ports p
LEFT JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

A `LEFT JOIN` with `count(*)` gives a port without edges the number 1:

```sql
-- WRONG: KRPUS gets 1
SELECT p.code, count(*) AS out_legs
FROM ports p
LEFT JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

```sql
-- FIX: count the edge column
SELECT p.code,
  count(l.dst) AS out_legs
FROM ports p
LEFT JOIN legs l ON l.src = p.code
GROUP BY p.code;
```

## Practice

Four questions: the adjacency list, the outgoing edges of every port, one row of the adjacency matrix, and the matrix's cell count.

## Recap

- Adjacency list = the edge table grouped by `src`; the `legs` table already is its stored form.
- Adjacency matrix = a `CROSS JOIN` of the node table with itself, `LEFT JOIN` the edge table.
- n nodes give n × n cells; in a sparse graph most of them are empty.
- Count edges after a `LEFT JOIN` with an edge column, as in `count(l.dst)`, never with `count(*)`.
