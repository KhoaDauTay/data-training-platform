---
id: e-tm-l2-04
engine: telemetry
level: L2
module: query
title: "Trace: dựng cây span bằng CTE đệ quy"
title_en: "Traces: rebuilding the span tree with a recursive CTE"
kind: lab
runtime: browser
minutes: 35
figures: [{ name: tm-span-tree, at: idea }]
objectives:
  - vi: Dựng lại cây span của một trace từ `parent_id` bằng `WITH RECURSIVE`.
    en: Rebuild a trace's span tree from `parent_id` with `WITH RECURSIVE`.
  - vi: Lần đường găng theo luật "đi theo span con chạy lâu nhất".
    en: Walk the critical path by the rule "follow the longest-running child span".
  - vi: Tính thời gian riêng (self time) để tìm bước thật sự tốn thời gian.
    en: Compute self time to find the step that really costs the time.
requires: [e-tm-l1-01]
sources:
  - { url: "https://opentelemetry.io/docs/concepts/signals/traces/", title: "OpenTelemetry: Traces (spans, parent span id)", title_vi: "OpenTelemetry: trace (span, id của span cha)" }
  - { url: "https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-RECURSIVE", title: "PostgreSQL: Recursive queries", title_vi: "Truy vấn đệ quy" }
lab:
  setup: |
    CREATE TABLE spans (
      trace_id text, span_id text PRIMARY KEY,
      parent_id text, name text,
      start_ms int, dur_ms int
    );
    INSERT INTO spans VALUES
      ('a1', 's1', NULL, 'GET /track', 0, 900),
      ('a1', 's2', 's1', 'auth', 10, 50),
      ('a1', 's3', 's1', 'load shipment', 70, 780),
      ('a1', 's4', 's3', 'db: shipments', 80, 120),
      ('a1', 's5', 's3', 'call carrier API', 210, 630),
      ('a1', 's6', 's5', 'http POST carrier', 220, 610),
      ('a1', 's7', 's1', 'render', 855, 35),
      ('b2', 's8', NULL, 'GET /quote', 0, 120),
      ('b2', 's9', 's8', 'db: rates', 10, 90);
  steps:
    - task:
        vi: "Span gốc của mỗi trace: trace nào, tên gì, mất bao lâu? Trả `trace_id`, `name`, `dur_ms`."
        en: "Each trace's root span: which trace, what name, how long? Return `trace_id`, `name`, `dur_ms`."
      solution: |
        SELECT trace_id, name, dur_ms
        FROM spans
        WHERE parent_id IS NULL
      check: rows
      hint:
        vi: "Span gốc không có cha: `WHERE parent_id IS NULL`."
        en: "A root span has no parent: `WHERE parent_id IS NULL`."
    - task:
        vi: "Dựng cây của trace `a1`: mỗi span và độ sâu của nó (gốc là 1). Trả `span_id`, `name`, `depth`."
        en: "Build trace `a1`'s tree: each span and its depth (the root is 1). Return `span_id`, `name`, `depth`."
      solution: |
        WITH RECURSIVE t AS (
          SELECT span_id, name, 1 AS depth
          FROM spans
          WHERE trace_id = 'a1'
            AND parent_id IS NULL
          UNION ALL
          SELECT s.span_id, s.name, t.depth + 1
          FROM spans s
          JOIN t ON s.parent_id = t.span_id)
        SELECT span_id, name, depth FROM t
      check: rows
      hint:
        vi: "Phần neo chọn span gốc của `a1` với `depth` 1; phần đệ quy nối `spans s JOIN t ON s.parent_id = t.span_id` và tăng `depth`."
        en: "The anchor picks `a1`'s root with `depth` 1; the recursive part joins `spans s JOIN t ON s.parent_id = t.span_id` and adds 1 to `depth`."
    - task:
        vi: "Đường găng của `a1`: từ gốc, mỗi bước đi theo span con có `dur_ms` lớn nhất (bằng nhau thì `span_id` nhỏ hơn), tới khi hết con. Trả `step` (gốc là 1), `name`, theo `step`."
        en: "`a1`'s critical path: from the root, each step follows the child span with the largest `dur_ms` (on a tie, the smaller `span_id`), until there is no child. Return `step` (the root is 1), `name`, by `step`."
      solution: |
        WITH RECURSIVE cp AS (
          SELECT span_id, name, 1 AS step
          FROM spans
          WHERE trace_id = 'a1'
            AND parent_id IS NULL
          UNION ALL
          SELECT c.span_id, c.name, cp.step + 1
          FROM cp
          CROSS JOIN LATERAL (
            SELECT s.span_id, s.name
            FROM spans s
            WHERE s.parent_id = cp.span_id
            ORDER BY s.dur_ms DESC, s.span_id
            LIMIT 1) c)
        SELECT step, name FROM cp
        ORDER BY step
      check: rows
      ordered: true
      hint:
        vi: "Phần đệ quy: `FROM cp CROSS JOIN LATERAL (SELECT … FROM spans s WHERE s.parent_id = cp.span_id ORDER BY s.dur_ms DESC, s.span_id LIMIT 1) c`."
        en: "The recursive part: `FROM cp CROSS JOIN LATERAL (SELECT … FROM spans s WHERE s.parent_id = cp.span_id ORDER BY s.dur_ms DESC, s.span_id LIMIT 1) c`."
    - task:
        vi: "Thời gian riêng của một span = `dur_ms` của nó trừ tổng `dur_ms` của các span con (ở đây con không chạy chồng nhau). Span nào của `a1` có thời gian riêng lớn nhất? Trả `name`, `self_ms`, một dòng."
        en: "A span's self time = its `dur_ms` minus the total `dur_ms` of its children (here children never overlap). Which span of `a1` has the most self time? Return `name`, `self_ms`, one row."
      solution: |
        SELECT p.name,
          p.dur_ms - coalesce(sum(c.dur_ms), 0)
            AS self_ms
        FROM spans p
        LEFT JOIN spans c
          ON c.parent_id = p.span_id
        WHERE p.trace_id = 'a1'
        GROUP BY p.span_id, p.name, p.dur_ms
        ORDER BY self_ms DESC
        LIMIT 1
      check: rows
      ordered: true
      hint:
        vi: "`spans p LEFT JOIN spans c ON c.parent_id = p.span_id`, `p.dur_ms - coalesce(sum(c.dur_ms), 0)`, gom theo span cha, lấy dòng lớn nhất."
        en: "`spans p LEFT JOIN spans c ON c.parent_id = p.span_id`, `p.dur_ms - coalesce(sum(c.dur_ms), 0)`, group by the parent span, take the largest."
quiz:
  - q:
      vi: "Span `load shipment` mất 780 ms. Có phải chính nó tốn 780 ms đó?"
      en: "Span `load shipment` took 780 ms. Did it spend those 780 ms itself?"
    options:
      - { vi: "Có, `dur_ms` là thời gian của nó", en: "Yes, `dur_ms` is its own time" }
      - { vi: "Không, phần lớn là của span con", en: "No, most of it is its child spans" }
      - { vi: "Không, nó chỉ là span gốc", en: "No, it is only the root span" }
    answer: 1
    trap: 0
    why:
      vi: "`dur_ms` của một span tính từ lúc bắt đầu tới lúc kết thúc, gồm cả thời gian chờ các span con. `load shipment` có hai con: `db: shipments` 120 ms và `call carrier API` 630 ms, nên thời gian riêng chỉ là 780 - 750 = 30 ms. Bước tốn thời gian thật là `http POST carrier` (610 ms, không có con). Nó cũng không phải span gốc: gốc là `GET /track`."
      en: "A span's `dur_ms` runs from its start to its end, including the time spent waiting for its children. `load shipment` has two children: `db: shipments` 120 ms and `call carrier API` 630 ms, so its self time is only 780 - 750 = 30 ms. The step that really costs the time is `http POST carrier` (610 ms, no children). It is not the root either: the root is `GET /track`."
  - q:
      vi: "Trong OpenTelemetry, làm sao biết một span là span gốc của trace?"
      en: "In OpenTelemetry, how do you know a span is the root of its trace?"
    options:
      - { vi: "Nó có `dur_ms` lớn nhất", en: "It has the largest `dur_ms`" }
      - { vi: "Nó bắt đầu sớm nhất", en: "It starts the earliest" }
      - { vi: "Nó không có `parent_id`", en: "It has no `parent_id`" }
    answer: 2
    why:
      vi: "Tài liệu OpenTelemetry ghi: span gốc có parent span ID rỗng, đó là cách nhận ra nó. Span gốc thường dài nhất và bắt đầu sớm nhất, nhưng đó là hệ quả chứ không phải định nghĩa; một span con có thể ghi giờ lệch do đồng hồ hai máy khác nhau."
      en: "The OpenTelemetry docs say a root span has an empty parent span ID; that is how you recognise it. A root span is usually the longest and starts first, but that is a consequence, not the definition; a child span can record a skewed time because two machines' clocks differ."
---
## Mở bài

Trace `a1` của request `GET /track` mất 900 ms và có bảy span. Trong bảng, chúng chỉ là bảy dòng phẳng với cột `parent_id`. Bài này dựng lại cây từ các dòng đó bằng SQL và tìm bước thật sự làm request chậm.

## Ý chính

Một trace là cây span: mỗi span là một đơn vị công việc có `span_id`, `parent_id` trỏ tới span cha (span gốc có `parent_id` rỗng), thời điểm bắt đầu và thời lượng. Trong bảng, cây là danh sách cạnh cha - con, và `WITH RECURSIVE` đi cây đó: phần neo chọn span gốc, phần đệ quy nối các span có `parent_id` bằng span vừa tìm, lặp tới khi không còn dòng mới.

**Đường găng** (critical path) là chuỗi span quyết định thời lượng của request. Bài này dùng một luật đơn giản: từ gốc, mỗi bước đi theo span con chạy lâu nhất. Luật này đúng khi các con chạy nối tiếp; khi chúng chạy song song, công cụ trace thật phải xét cả thời điểm kết thúc. **Thời gian riêng** (self time) = thời lượng của span trừ thời gian của các con: span cha dài chưa chắc tốn thời gian, nó có thể chỉ đang chờ. Hình cuối mục vẽ cây `a1` và đường găng.

## Cú pháp

```sql
WITH RECURSIVE t AS (
  SELECT span_id, 1 AS depth
  FROM spans WHERE parent_id IS NULL
  UNION ALL
  SELECT s.span_id, t.depth + 1
  FROM spans s
  JOIN t ON s.parent_id = t.span_id)
SELECT * FROM t;
```

- Phần neo: span gốc. Phần đệ quy: con của các span vừa tìm.
- Đường găng (luật đơn giản): mỗi bước `LATERAL (… ORDER BY dur_ms DESC LIMIT 1)`.
- Thời gian riêng = `dur_ms` - tổng `dur_ms` của con.

## Ví dụ

Các span của `a1`, theo thời điểm bắt đầu.

```sql
SELECT span_id, parent_id, name,
  start_ms, dur_ms
FROM spans
WHERE trace_id = 'a1'
ORDER BY start_ms;
```

Mỗi span cha và số con của nó.

```sql
SELECT p.name, count(c.span_id) AS kids
FROM spans p
LEFT JOIN spans c
  ON c.parent_id = p.span_id
WHERE p.trace_id = 'a1'
GROUP BY p.span_id, p.name
ORDER BY p.span_id;
```

## Lỗi hay gặp

Tìm span chậm nhất theo `dur_ms`: ra span gốc, vì nó chứa mọi span khác.

```sql
-- WRONG: the root always wins
SELECT name, dur_ms FROM spans
WHERE trace_id = 'a1'
ORDER BY dur_ms DESC LIMIT 1;
```

```sql
-- FIX: the slowest span with no child
SELECT s.name, s.dur_ms FROM spans s
WHERE s.trace_id = 'a1'
  AND NOT EXISTS (SELECT 1 FROM spans c
    WHERE c.parent_id = s.span_id)
ORDER BY s.dur_ms DESC LIMIT 1;
```

Nối span với chính nó một lần: chỉ ra cha và con trực tiếp, mất các tầng sâu hơn.

```sql
-- WRONG: one join = one level
SELECT c.name
FROM spans p
JOIN spans c ON c.parent_id = p.span_id
WHERE p.span_id = 's3'
ORDER BY c.name;
```

```sql
-- FIX: recurse to every level
WITH RECURSIVE t AS (
  SELECT span_id, name FROM spans
  WHERE parent_id = 's3'
  UNION ALL
  SELECT s.span_id, s.name FROM spans s
  JOIN t ON s.parent_id = t.span_id)
SELECT name FROM t ORDER BY name;
```

## Thực hành

Bốn bước: span gốc của mỗi trace, cây của `a1` với độ sâu, đường găng theo luật span con lâu nhất, rồi span có thời gian riêng lớn nhất.

## Tóm tắt

- Trace là cây span; span gốc có `parent_id` rỗng.
- `WITH RECURSIVE`: phần neo chọn gốc, phần đệ quy nối con theo `parent_id`.
- Đường găng (luật đơn giản): mỗi bước đi theo con chạy lâu nhất; luật này chỉ đúng khi các con chạy nối tiếp.
- Thời gian riêng = thời lượng trừ thời gian của con; span cha dài có thể chỉ đang chờ.

# EN

## Opening

Trace `a1` of a `GET /track` request took 900 ms and has seven spans. In the table they are just seven flat rows with a `parent_id` column. This lesson rebuilds the tree from those rows with SQL and finds the step that really slowed the request.

## Key idea

A trace is a tree of spans: each span is a unit of work with a `span_id`, a `parent_id` pointing at its parent span (a root span has an empty `parent_id`), a start time and a duration. In a table, the tree is a list of parent-child edges, and `WITH RECURSIVE` walks it: the anchor picks the root span, the recursive part joins the spans whose `parent_id` is a span just found, repeating until no new row appears.

The **critical path** is the chain of spans that decides the request's duration. This lesson uses a simple rule: from the root, each step follows the longest-running child span. The rule holds when children run one after another; when they run in parallel, real tracing tools must also look at end times. **Self time** = a span's duration minus its children's time: a long parent span does not necessarily cost time, it may just be waiting. The figure at the end of this section draws the `a1` tree and its critical path.

## Syntax

```sql
WITH RECURSIVE t AS (
  SELECT span_id, 1 AS depth
  FROM spans WHERE parent_id IS NULL
  UNION ALL
  SELECT s.span_id, t.depth + 1
  FROM spans s
  JOIN t ON s.parent_id = t.span_id)
SELECT * FROM t;
```

- Anchor: the root span. Recursive part: the children of the spans just found.
- Critical path (simple rule): each step `LATERAL (… ORDER BY dur_ms DESC LIMIT 1)`.
- Self time = `dur_ms` - the total `dur_ms` of the children.

## Example

The spans of `a1`, by start time.

```sql
SELECT span_id, parent_id, name,
  start_ms, dur_ms
FROM spans
WHERE trace_id = 'a1'
ORDER BY start_ms;
```

Each parent span and its number of children.

```sql
SELECT p.name, count(c.span_id) AS kids
FROM spans p
LEFT JOIN spans c
  ON c.parent_id = p.span_id
WHERE p.trace_id = 'a1'
GROUP BY p.span_id, p.name
ORDER BY p.span_id;
```

## Common mistakes

Finding the slowest span by `dur_ms`: you get the root, because it contains every other span.

```sql
-- WRONG: the root always wins
SELECT name, dur_ms FROM spans
WHERE trace_id = 'a1'
ORDER BY dur_ms DESC LIMIT 1;
```

```sql
-- FIX: the slowest span with no child
SELECT s.name, s.dur_ms FROM spans s
WHERE s.trace_id = 'a1'
  AND NOT EXISTS (SELECT 1 FROM spans c
    WHERE c.parent_id = s.span_id)
ORDER BY s.dur_ms DESC LIMIT 1;
```

Joining spans to themselves once: you get only direct children and lose the deeper levels.

```sql
-- WRONG: one join = one level
SELECT c.name
FROM spans p
JOIN spans c ON c.parent_id = p.span_id
WHERE p.span_id = 's3'
ORDER BY c.name;
```

```sql
-- FIX: recurse to every level
WITH RECURSIVE t AS (
  SELECT span_id, name FROM spans
  WHERE parent_id = 's3'
  UNION ALL
  SELECT s.span_id, s.name FROM spans s
  JOIN t ON s.parent_id = t.span_id)
SELECT name FROM t ORDER BY name;
```

## Practice

Four steps: each trace's root span, the `a1` tree with depths, the critical path by the longest-child rule, then the span with the most self time.

## Recap

- A trace is a tree of spans; a root span has an empty `parent_id`.
- `WITH RECURSIVE`: the anchor picks the root, the recursive part joins children by `parent_id`.
- Critical path (simple rule): each step follows the longest child; it only holds when children run one after another.
- Self time = duration minus the children's time; a long parent span may just be waiting.
