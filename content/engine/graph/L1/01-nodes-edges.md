---
id: e-gr-l1-01
engine: graph
level: L1
module: model
title: Nút và cạnh, có hướng và vô hướng
title_en: Nodes and edges, directed and undirected
kind: lab
runtime: browser
minutes: 15
figures: [{ name: gr-edge-list, at: idea }]
objectives:
  - vi: Lưu một đồ thị trong PostgreSQL bằng một bảng nút và một bảng cạnh.
    en: Store a graph in PostgreSQL as one table of nodes and one table of edges.
  - vi: Đọc cạnh có hướng theo chiều đi và chiều đến.
    en: Read directed edges by their outgoing and incoming side.
  - vi: Lưu cạnh vô hướng một lần và đọc được cả hai đầu.
    en: Store an undirected edge once and read it from both ends.
requires: []
sources:
  - { url: "https://neo4j.com/docs/getting-started/graph-database/", title: "Neo4j docs: What is a graph database" }
  - { url: "https://neo4j.com/docs/cypher-manual/current/patterns/fixed-length-patterns/", title: "Cypher Manual: Fixed-length patterns" }
  - https://www.postgresql.org/docs/18/ddl-constraints.html
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
    CREATE TABLE partners (
      a text REFERENCES ports,
      b text REFERENCES ports,
      PRIMARY KEY (a, b),
      CHECK (a < b)
    );
    INSERT INTO partners VALUES
      ('HKHKG', 'VNDAD'), ('SGSIN', 'VNDAD'),
      ('SGSIN', 'VNSGN');
  steps:
    - task:
        vi: "Từ Đà Nẵng (`VNDAD`) tàu đi thẳng được tới cảng nào? Trả `dst`, `days`."
        en: "Which ports can a ship reach directly from Da Nang (`VNDAD`)? Return `dst`, `days`."
      solution: |
        SELECT dst, days
        FROM legs
        WHERE src = 'VNDAD'
      check: rows
      hint:
        vi: "Cạnh đi ra khỏi một nút: lọc theo cột đầu `src`."
        en: "Edges leaving a node: filter on the start column `src`."
    - task:
        vi: "Những cảng nào có chuyến đi thẳng tới Hong Kong (`HKHKG`)? Trả `src`."
        en: "Which ports have a direct leg into Hong Kong (`HKHKG`)? Return `src`."
      solution: |
        SELECT src
        FROM legs
        WHERE dst = 'HKHKG'
      check: rows
      hint:
        vi: "Cạnh đi vào một nút: lọc theo cột cuối `dst`."
        en: "Edges coming into a node: filter on the end column `dst`."
    - task:
        vi: "Quan hệ đối tác giữa hai cảng là vô hướng và bảng `partners` lưu mỗi cặp một lần (`a < b`). Liệt kê đối tác của `VNDAD`: trả một cột `partner`."
        en: "A partnership between two ports is undirected, and table `partners` stores each pair once (`a < b`). List the partners of `VNDAD`: return one column `partner`."
      solution: |
        SELECT b AS partner FROM partners
        WHERE a = 'VNDAD'
        UNION ALL
        SELECT a FROM partners
        WHERE b = 'VNDAD'
      check: rows
      hint:
        vi: "`VNDAD` có thể nằm ở cột `a` hoặc cột `b`: đọc cả hai rồi ghép bằng `UNION ALL`."
        en: "`VNDAD` can sit in column `a` or in column `b`: read both and combine them with `UNION ALL`."
    - task:
        vi: "Cảng nào không có cạnh nào đi ra (tàu tới đó rồi không đi tiếp được trong đồ thị này)? Trả `code`."
        en: "Which ports have no outgoing edge (a ship that arrives cannot go on in this graph)? Return `code`."
      solution: |
        SELECT p.code
        FROM ports p
        WHERE NOT EXISTS (
          SELECT 1 FROM legs l
          WHERE l.src = p.code
        )
      check: rows
      hint:
        vi: "`NOT EXISTS` trên `legs` với `l.src = p.code`."
        en: "`NOT EXISTS` on `legs` with `l.src = p.code`."
quiz:
  - q:
      vi: "Bảng `partners` lưu mỗi cặp một lần với `CHECK (a < b)`. Câu nào tìm đủ đối tác của `VNDAD`?"
      en: "Table `partners` stores each pair once with `CHECK (a < b)`. Which query finds all partners of `VNDAD`?"
    options:
      - { vi: "Chỉ lọc `WHERE a = 'VNDAD'`", en: "Filter only `WHERE a = 'VNDAD'`" }
      - { vi: "Chỉ lọc `WHERE b = 'VNDAD'`", en: "Filter only `WHERE b = 'VNDAD'`" }
      - { vi: "Đọc cả hai cột rồi `UNION ALL`", en: "Read both columns, then `UNION ALL`" }
    answer: 2
    trap: 0
    why:
      vi: "Lọc theo cột `a` nghe tự nhiên vì `a` là cột đầu, nhưng `CHECK (a < b)` đặt mã nhỏ hơn vào `a`: `HKHKG` và `SGSIN` đều nhỏ hơn `VNDAD`, nên `VNDAD` luôn nằm ở cột `b` và câu chỉ lọc `a` ra 0 dòng. Một cạnh vô hướng lưu một lần thì phải đọc từ cả hai đầu, ghép hai nửa bằng `UNION ALL`."
      en: "Filtering on `a` feels natural because `a` is the first column, but `CHECK (a < b)` puts the smaller code in `a`: `HKHKG` and `SGSIN` are both smaller than `VNDAD`, so `VNDAD` always sits in `b` and the `a`-only query returns 0 rows. An undirected edge stored once must be read from both ends, the two halves joined with `UNION ALL`."
  - q:
      vi: "Bảng `legs` có dòng (`VNDAD`, `SGSIN`). Dòng đó cho biết gì?"
      en: "Table `legs` has the row (`VNDAD`, `SGSIN`). What does it tell you?"
    options:
      - { vi: "Tàu đi được cả từ `SGSIN` về `VNDAD`", en: "Ships also sail from `SGSIN` back to `VNDAD`" }
      - { vi: "Chỉ có chuyến từ `VNDAD` tới `SGSIN`", en: "Only that a leg runs from `VNDAD` to `SGSIN`" }
      - { vi: "`VNDAD` và `SGSIN` là cùng một nút", en: "`VNDAD` and `SGSIN` are the same node" }
    answer: 1
    trap: 0
    why:
      vi: "Nghĩ rằng có đi thì có về là thói quen đời thường, nhưng `legs` là cạnh có hướng (directed edge): mỗi dòng chỉ nói một chiều, từ `src` tới `dst`. Chiều ngược chỉ có khi bảng có thêm dòng (`SGSIN`, `VNDAD`), và trong lab này không có dòng đó. Hai mã khác nhau là hai nút khác nhau."
      en: "Assuming a way back is an everyday habit, but `legs` holds directed edges: each row states one direction only, from `src` to `dst`. The reverse exists only if the table also has the row (`SGSIN`, `VNDAD`), and this lab has no such row. Two different codes are two different nodes."
---
## Mở bài

Mạng tuyến của Cargo Query là một đồ thị: mỗi cảng là một nút, mỗi chặng tàu chạy là một cạnh. Bài này lưu đồ thị đó bằng hai bảng thường và đọc nó theo cả hai chiều.

## Ý chính

**Nút và cạnh.** Một đồ thị gồm nút (node) và cạnh (edge) nối hai nút. Trong PostgreSQL, cách lưu đơn giản nhất là một bảng nút (`ports`) và một bảng cạnh (`legs`) có hai cột khóa ngoại trỏ về bảng nút, gọi là danh sách cạnh (edge list).

**Có hướng.** Chặng tàu là cạnh có hướng (directed): dòng (`VNDAD`, `SGSIN`) nói có chuyến từ Đà Nẵng đi Singapore, không nói gì về chiều về. Cạnh đi ra khỏi một nút là các dòng có `src` bằng nút đó; cạnh đi vào là các dòng có `dst` bằng nút đó.

**Vô hướng.** Quan hệ đối tác giữa hai cảng là vô hướng (undirected): không có chiều đi, chiều về. Có hai cách lưu: hai dòng cho mỗi cặp (một dòng mỗi chiều), hoặc một dòng với quy ước `a < b` như bảng `partners`. Cách một dòng không bao giờ lệch giữa hai chiều, nhưng khi đọc phải xem cả hai cột.

**Trong CSDL đồ thị.** Tài liệu Neo4j định nghĩa một quan hệ (relationship) luôn có nút đầu, nút cuối, đúng một kiểu, và luôn có hướng. Khi truy vấn, Cypher bỏ qua hướng nếu mẫu không có dấu `<` hay `>`, tương tự câu `UNION ALL` hai cột ở trên.

## Cú pháp

```sql
-- edges leaving a node
SELECT dst FROM legs
WHERE src = 'VNDAD';
-- edges coming into a node
SELECT src FROM legs
WHERE dst = 'HKHKG';
-- an undirected pair stored once
SELECT b FROM partners WHERE a = $1
UNION ALL
SELECT a FROM partners WHERE b = $1;
```

- `REFERENCES ports`: cạnh chỉ nối được hai nút có thật.
- `CHECK (a < b)`: mỗi cặp vô hướng chỉ có một cách viết.

## Ví dụ

Danh sách cạnh, kèm tên thành phố ở hai đầu:

```sql
SELECT l.src, a.city, l.dst, b.city
FROM legs l
JOIN ports a ON a.code = l.src
JOIN ports b ON b.code = l.dst
ORDER BY l.src, l.dst;
```

Số cạnh đi ra của mỗi cảng có cạnh:

```sql
SELECT src, count(*) AS out_legs
FROM legs
GROUP BY src
ORDER BY src;
```

Đối tác của `VNDAD`, đọc từ cả hai cột:

```sql
SELECT b AS partner FROM partners
WHERE a = 'VNDAD'
UNION ALL
SELECT a FROM partners
WHERE b = 'VNDAD';
```

## Lỗi hay gặp

Chỉ đọc một cột của cặp vô hướng thì mất đối tác:

```sql
-- WRONG: VNDAD never sits in column a
SELECT b AS partner FROM partners
WHERE a = 'VNDAD';
```

```sql
-- FIX: read both ends
SELECT b AS partner FROM partners
WHERE a = 'VNDAD'
UNION ALL
SELECT a FROM partners
WHERE b = 'VNDAD';
```

Ghi cặp theo chiều ngược bị `CHECK` từ chối, nên không có hai bản của cùng một cặp:

```sql
-- ERROR 23514
INSERT INTO partners
VALUES ('VNDAD', 'HKHKG');
```

Một cạnh tới cảng không có trong bảng nút bị khóa ngoại chặn:

```sql
-- ERROR 23503
INSERT INTO legs
VALUES ('VNDAD', 'XXABC', 1.0);
```

## Thực hành

Bốn câu hỏi: cạnh đi ra, cạnh đi vào, đối tác vô hướng, và cảng không có cạnh đi ra.

## Tóm tắt

- Đồ thị trong PostgreSQL: một bảng nút và một bảng cạnh với hai khóa ngoại.
- Cạnh có hướng: lọc `src` để lấy cạnh đi ra, `dst` để lấy cạnh đi vào.
- Cạnh vô hướng lưu một lần với `a < b`, rồi đọc cả hai cột.
- Neo4j luôn lưu quan hệ có hướng; Cypher bỏ qua hướng khi mẫu không có `<` hay `>`.

# EN

## Opening

Cargo Query's route network is a graph: each port is a node, each leg a ship sails is an edge. This lesson stores that graph in two ordinary tables and reads it in both directions.

## Key idea

**Nodes and edges.** A graph is made of nodes and edges that join two nodes. In PostgreSQL the simplest storage is one node table (`ports`) and one edge table (`legs`) with two foreign keys back to the node table, called an edge list.

**Directed.** A leg is a directed edge: the row (`VNDAD`, `SGSIN`) says a leg runs from Da Nang to Singapore and says nothing about the way back. The edges leaving a node are the rows whose `src` is that node; the edges coming in are the rows whose `dst` is that node.

**Undirected.** A partnership between two ports is undirected: it has no outbound or return side. There are two ways to store it: two rows per pair (one per direction), or one row with the rule `a < b`, as table `partners` does. One row can never disagree with itself, but a read must look at both columns.

**In a graph database.** The Neo4j docs define a relationship as always having a start node, an end node, exactly one type, and a direction. When querying, Cypher ignores the direction if the pattern has no `<` or `>`, much like the two-column `UNION ALL` above.

## Syntax

```sql
-- edges leaving a node
SELECT dst FROM legs
WHERE src = 'VNDAD';
-- edges coming into a node
SELECT src FROM legs
WHERE dst = 'HKHKG';
-- an undirected pair stored once
SELECT b FROM partners WHERE a = $1
UNION ALL
SELECT a FROM partners WHERE b = $1;
```

- `REFERENCES ports`: an edge can only join two nodes that exist.
- `CHECK (a < b)`: each undirected pair has a single way to be written.

## Example

The edge list, with the city at both ends:

```sql
SELECT l.src, a.city, l.dst, b.city
FROM legs l
JOIN ports a ON a.code = l.src
JOIN ports b ON b.code = l.dst
ORDER BY l.src, l.dst;
```

Outgoing edges per port that has any:

```sql
SELECT src, count(*) AS out_legs
FROM legs
GROUP BY src
ORDER BY src;
```

The partners of `VNDAD`, read from both columns:

```sql
SELECT b AS partner FROM partners
WHERE a = 'VNDAD'
UNION ALL
SELECT a FROM partners
WHERE b = 'VNDAD';
```

## Common mistakes

Reading only one column of an undirected pair loses partners:

```sql
-- WRONG: VNDAD never sits in column a
SELECT b AS partner FROM partners
WHERE a = 'VNDAD';
```

```sql
-- FIX: read both ends
SELECT b AS partner FROM partners
WHERE a = 'VNDAD'
UNION ALL
SELECT a FROM partners
WHERE b = 'VNDAD';
```

Writing the pair the other way round is refused by the `CHECK`, so a pair never has two copies:

```sql
-- ERROR 23514
INSERT INTO partners
VALUES ('VNDAD', 'HKHKG');
```

An edge to a port missing from the node table is stopped by the foreign key:

```sql
-- ERROR 23503
INSERT INTO legs
VALUES ('VNDAD', 'XXABC', 1.0);
```

## Practice

Four questions: outgoing edges, incoming edges, undirected partners, and ports with no outgoing edge.

## Recap

- A graph in PostgreSQL: one node table and one edge table with two foreign keys.
- Directed edges: filter `src` for outgoing edges, `dst` for incoming ones.
- Store an undirected edge once with `a < b`, then read both columns.
- Neo4j always stores relationships with a direction; Cypher ignores it when the pattern has no `<` or `>`.
