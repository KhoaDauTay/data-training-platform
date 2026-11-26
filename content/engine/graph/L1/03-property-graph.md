---
id: e-gr-l1-03
engine: graph
level: L1
module: model
title: Đồ thị thuộc tính và mô hình quan hệ
title_en: The property graph and the relational model
kind: concept
runtime: browser
minutes: 15
figures: [{ name: gr-property-graph, at: idea }]
objectives:
  - vi: "Kể bốn thành phần của đồ thị thuộc tính theo tài liệu Neo4j: nút, quan hệ, nhãn, thuộc tính."
    en: "Name the four parts of the property graph as the Neo4j docs define them: nodes, relationships, labels, properties."
  - vi: Đọc một mẫu Cypher ngắn và viết câu SQL tương đương trên bảng nút và bảng cạnh.
    en: Read a short Cypher pattern and write the equivalent SQL over a node table and an edge table.
  - vi: Biết khi nào thuộc tính nên là cột thật thay vì nằm trong `jsonb`.
    en: Know when a property should be a real column rather than live inside `jsonb`.
requires: [e-gr-l1-01]
sources:
  - { url: "https://neo4j.com/docs/getting-started/graph-database/", title: "Neo4j docs: What is a graph database" }
  - { url: "https://neo4j.com/docs/cypher-manual/current/patterns/fixed-length-patterns/", title: "Cypher Manual: Fixed-length patterns" }
  - https://www.postgresql.org/docs/18/functions-json.html
lab:
  setup: |
    CREATE TABLE nodes (
      id int PRIMARY KEY,
      label text NOT NULL,
      props jsonb NOT NULL
    );
    INSERT INTO nodes VALUES
      (1, 'Port', '{"code": "VNDAD"}'),
      (2, 'Port', '{"code": "SGSIN"}'),
      (3, 'Port', '{"code": "HKHKG"}'),
      (4, 'Port', '{"code": "KRPUS"}'),
      (5, 'Port', '{"code": "AUSYD"}'),
      (6, 'Carrier', '{"name": "Lantern Line"}');
    CREATE TABLE edges (
      src int REFERENCES nodes,
      dst int REFERENCES nodes,
      type text NOT NULL,
      props jsonb NOT NULL DEFAULT '{}'
    );
    INSERT INTO edges VALUES
      (1, 2, 'LEG', '{"days": 3.2}'),
      (1, 3, 'LEG', '{"days": 2.5}'),
      (3, 4, 'LEG', '{"days": 2.9}'),
      (2, 5, 'LEG', '{"days": 12.4}'),
      (6, 1, 'CALLS_AT', '{}'),
      (6, 3, 'CALLS_AT', '{}');
  steps:
    - task:
        vi: "Câu Cypher `MATCH (a:Port {code: 'VNDAD'})-[l:LEG]->(b:Port) RETURN b.code, l.days` viết bằng SQL: trả `code` (chữ) và `days` (số)."
        en: "The Cypher query `MATCH (a:Port {code: 'VNDAD'})-[l:LEG]->(b:Port) RETURN b.code, l.days` written in SQL: return `code` (text) and `days` (a number)."
      solution: |
        SELECT b.props->>'code' AS code,
          (e.props->>'days')::numeric
            AS days
        FROM nodes a
        JOIN edges e
          ON e.src = a.id AND e.type = 'LEG'
        JOIN nodes b ON b.id = e.dst
        WHERE a.label = 'Port'
          AND a.props->>'code' = 'VNDAD'
      check: rows
      hint:
        vi: "Nút đầu, cạnh, nút cuối là ba bảng trong `FROM`: `nodes a JOIN edges e JOIN nodes b`; `->>` lấy thuộc tính ra dạng chữ."
        en: "Start node, edge, end node are three tables in `FROM`: `nodes a JOIN edges e JOIN nodes b`; `->>` reads a property as text."
    - task:
        vi: "Đếm quan hệ theo kiểu: trả `type`, `n`."
        en: "Count relationships by type: return `type`, `n`."
      solution: |
        SELECT type, count(*) AS n
        FROM edges
        GROUP BY type
      check: rows
      hint:
        vi: "`GROUP BY type` trên `edges`."
        en: "`GROUP BY type` on `edges`."
    - task:
        vi: "Hãng tàu `Lantern Line` ghé những cảng nào (quan hệ `CALLS_AT`)? Trả `code`."
        en: "Which ports does the carrier `Lantern Line` call at (relationship `CALLS_AT`)? Return `code`."
      solution: |
        SELECT p.props->>'code' AS code
        FROM nodes c
        JOIN edges e ON e.src = c.id
          AND e.type = 'CALLS_AT'
        JOIN nodes p ON p.id = e.dst
        WHERE c.label = 'Carrier'
          AND c.props->>'name'
            = 'Lantern Line'
      check: rows
      hint:
        vi: "Như bước 1, với `c.label = 'Carrier'` và `e.type = 'CALLS_AT'`."
        en: "As in step 1, with `c.label = 'Carrier'` and `e.type = 'CALLS_AT'`."
quiz:
  - q:
      vi: "Theo tài liệu Neo4j, một quan hệ (relationship) trong đồ thị thuộc tính có gì?"
      en: "According to the Neo4j docs, what does a relationship in a property graph have?"
    options:
      - { vi: "Nút đầu, nút cuối, đúng một kiểu, hướng", en: "A start node, an end node, one type, a direction" }
      - { vi: "Hai nút, không hướng, nhiều nhãn", en: "Two nodes, no direction, several labels" }
      - { vi: "Chỉ một khóa ngoại tới một nút", en: "Just one foreign key to one node" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều nhãn là đặc điểm của nút, không phải của quan hệ: một nút có thể có không hay nhiều nhãn. Quan hệ luôn có nút đầu, nút cuối, đúng một kiểu (như `LEG`) và một hướng; nó cũng có thể có thuộc tính như `days`. Trong bảng `edges`, đó là `src`, `dst`, `type` và `props`."
      en: "Several labels is a feature of nodes, not of relationships: a node can have zero or more labels. A relationship always has a start node, an end node, exactly one type (such as `LEG`) and a direction; it can also hold properties such as `days`. In table `edges` these are `src`, `dst`, `type` and `props`."
  - q:
      vi: "`props->>'days'` trả chữ. Lọc chặng dài hơn 3 ngày bằng `props->>'days' > '3'` thì chặng `12.4` ngày ra sao?"
      en: "`props->>'days'` returns text. Filtering legs longer than 3 days with `props->>'days' > '3'`, what happens to the `12.4`-day leg?"
    options:
      - { vi: "Được giữ, vì 12.4 lớn hơn 3", en: "Kept, because 12.4 is more than 3" }
      - { vi: "Báo lỗi kiểu dữ liệu", en: "A data type error" }
      - { vi: "Bị bỏ, vì so sánh theo chữ", en: "Dropped, because text is compared" }
    answer: 2
    trap: 0
    why:
      vi: "Về số thì 12.4 lớn hơn 3, nhưng hai vế ở đây là chữ, nên PostgreSQL so từng ký tự: '1' đứng trước '3', vậy '12.4' < '3' và chặng bị bỏ. Không có lỗi vì so chữ với chữ là hợp lệ. Ép kiểu `(props->>'days')::numeric > 3` mới so theo số."
      en: "As numbers 12.4 is more than 3, but both sides here are text, so PostgreSQL compares character by character: '1' sorts before '3', so '12.4' < '3' and the leg is dropped. There is no error because comparing text with text is valid. Casting, `(props->>'days')::numeric > 3`, compares numbers."
---
## Mở bài

CSDL đồ thị như Neo4j dùng mô hình đồ thị thuộc tính (property graph) và ngôn ngữ Cypher. Bài này đặt một mẫu Cypher cạnh câu SQL làm cùng việc trên hai bảng thường.

## Ý chính

**Bốn thành phần.** Theo tài liệu Neo4j: nút (node) là một thực thể; nhãn (label) xếp nút vào một nhóm có tên, một nút có không hay nhiều nhãn; quan hệ (relationship) nối nút đầu với nút cuối, luôn có hướng và đúng một kiểu; thuộc tính (property) là cặp khóa-giá trị đặt trên nút hoặc quan hệ.

**Cùng mô hình trên PostgreSQL.** Bảng `nodes` giữ `label` và thuộc tính trong `props jsonb`; bảng `edges` giữ `src`, `dst`, `type` và `props`. Một mẫu Cypher nút-cạnh-nút trở thành ba bảng nối nhau trong `FROM`. Đây là dạng tổng quát, chứa được mọi nhãn trong hai bảng.

**Khi nào dùng cột thật.** Với dữ liệu ổn định như mạng cảng, bảng riêng (`ports`, `legs` như các bài trước) tốt hơn: cột có kiểu, có khóa ngoại, có index. Thuộc tính trong `jsonb` linh hoạt nhưng là chữ khi đọc bằng `->>`, nên phải ép kiểu trước khi so sánh số.

**Lưu trữ.** Tài liệu Neo4j nói quan hệ được lưu ngay cạnh nút và CSDL đồ thị không dùng JOIN để đi theo quan hệ. Trong PostgreSQL, mỗi bước đi theo cạnh là một JOIN.

Một mẫu Cypher và câu SQL tương đương:

```text
MATCH (a:Port {code: 'VNDAD'})
      -[l:LEG]->(b:Port)
RETURN b.code, l.days
```

## Ví dụ

Các nút và nhãn của chúng:

```sql
SELECT id, label, props
FROM nodes
ORDER BY id;
```

Mẫu `(a:Port)-[:LEG]->(b:Port)` từ `VNDAD`, viết bằng SQL:

```sql
SELECT b.props->>'code' AS code,
  (e.props->>'days')::numeric AS days
FROM nodes a
JOIN edges e
  ON e.src = a.id AND e.type = 'LEG'
JOIN nodes b ON b.id = e.dst
WHERE a.props->>'code' = 'VNDAD';
```

Số nút theo nhãn:

```sql
SELECT label, count(*) AS n
FROM nodes
GROUP BY label
ORDER BY label;
```

## Lỗi hay gặp

`->` trả `jsonb`, không so được với số:

```sql
-- ERROR 42883
SELECT * FROM edges
WHERE props->'days' > 3;
```

`->>` trả chữ, nên so chữ bỏ mất chặng 12.4 ngày:

```sql
-- WRONG: '12.4' < '3' as text
SELECT src, dst FROM edges
WHERE props->>'days' > '3';
```

```sql
-- FIX: cast to a number
SELECT src, dst FROM edges
WHERE (props->>'days')::numeric > 3;
```

## Tóm tắt

- Đồ thị thuộc tính: nút có nhãn, quan hệ có hướng và một kiểu, cả hai mang thuộc tính.
- Trên PostgreSQL: bảng `nodes` và `edges`; mỗi bước nút-cạnh-nút là hai JOIN.
- Thuộc tính `jsonb` đọc bằng `->>` là chữ: ép kiểu trước khi so số.
- Dữ liệu ổn định thì dùng bảng và cột thật, có kiểu, khóa ngoại và index.

# EN

## Opening

Graph databases such as Neo4j use the property graph model and the Cypher language. This lesson puts a Cypher pattern next to the SQL that does the same over two ordinary tables.

## Key idea

**Four parts.** In the Neo4j docs: a node is an entity; a label puts a node into a named group, and a node has zero or more labels; a relationship joins a start node to an end node, always has a direction and exactly one type; a property is a key-value pair on a node or a relationship.

**The same model on PostgreSQL.** Table `nodes` holds the `label` and the properties in `props jsonb`; table `edges` holds `src`, `dst`, `type` and `props`. A node-edge-node Cypher pattern becomes three tables joined in `FROM`. This is the general form, holding every label in two tables.

**When to use real columns.** For stable data such as the port network, dedicated tables (`ports`, `legs` as in the earlier lessons) work better: typed columns, foreign keys, indexes. Properties in `jsonb` are flexible but come back as text when read with `->>`, so they must be cast before a numeric comparison.

**Storage.** The Neo4j docs say relationships are stored right next to the nodes and a graph database does not use JOINs to follow them. In PostgreSQL, each step along an edge is a JOIN.

A Cypher pattern and its SQL equivalent:

```text
MATCH (a:Port {code: 'VNDAD'})
      -[l:LEG]->(b:Port)
RETURN b.code, l.days
```

## Example

The nodes and their labels:

```sql
SELECT id, label, props
FROM nodes
ORDER BY id;
```

The pattern `(a:Port)-[:LEG]->(b:Port)` from `VNDAD`, in SQL:

```sql
SELECT b.props->>'code' AS code,
  (e.props->>'days')::numeric AS days
FROM nodes a
JOIN edges e
  ON e.src = a.id AND e.type = 'LEG'
JOIN nodes b ON b.id = e.dst
WHERE a.props->>'code' = 'VNDAD';
```

Nodes per label:

```sql
SELECT label, count(*) AS n
FROM nodes
GROUP BY label
ORDER BY label;
```

## Common mistakes

`->` returns `jsonb`, which cannot be compared with a number:

```sql
-- ERROR 42883
SELECT * FROM edges
WHERE props->'days' > 3;
```

`->>` returns text, so a text comparison drops the 12.4-day leg:

```sql
-- WRONG: '12.4' < '3' as text
SELECT src, dst FROM edges
WHERE props->>'days' > '3';
```

```sql
-- FIX: cast to a number
SELECT src, dst FROM edges
WHERE (props->>'days')::numeric > 3;
```

## Recap

- Property graph: nodes have labels, relationships have a direction and one type, both carry properties.
- On PostgreSQL: tables `nodes` and `edges`; each node-edge-node step is two JOINs.
- A `jsonb` property read with `->>` is text: cast it before comparing numbers.
- For stable data use real tables and columns, with types, foreign keys and indexes.
