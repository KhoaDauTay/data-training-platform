---
id: e-ol-l4-04
engine: olap
level: L4
module: chtuning
title: "JOIN trong ClickHouse: dictionary, Join engine và vì sao JOIN lớn tốn"
title_en: "Joins in ClickHouse: dictionaries, the Join engine and why big joins hurt"
kind: lab
runtime: browser
minutes: 35
figures: [{ name: ol-join-dict, at: idea }]
objectives:
  - vi: Giải thích hash join dựng bảng bên phải trong bộ nhớ, nên cỡ bảng phải quyết định JOIN có tốn hay không.
    en: Explain that a hash join builds the right table in memory, so the right table's size decides whether a join is costly.
  - vi: Biết khi nào dùng dictionary (`dictGet`), Join engine hoặc phi chuẩn hóa thay cho JOIN.
    en: Know when to use a dictionary (`dictGet`), the Join engine or denormalization instead of a join.
  - vi: Tránh nhân dòng do khóa trùng ở bảng chiều, và gộp trước khi nối.
    en: Avoid multiplying rows through duplicate keys in a dimension table, and aggregate before joining.
requires: [e-ol-l1-03]
sources:
  - { url: "https://clickhouse.com/docs/best-practices/minimize-optimize-joins", title: "ClickHouse docs: Minimize and optimize JOINs" }
  - { url: "https://clickhouse.com/docs/dictionary", title: "ClickHouse docs: Dictionary" }
  - { url: "https://clickhouse.com/docs/engines/table-engines/special/join", title: "ClickHouse docs: Join table engine" }
  - { url: "https://www.postgresql.org/docs/18/planner-optimizer.html", title: "PostgreSQL 18 docs: Planner/Optimizer (join methods)" }
lab:
  setup: |
    CREATE TABLE ports (
      port_code text, name text,
      valid_from date
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Tien Sa', '2020-01-01'),
      ('VNHPH', 'Hai Phong', '2020-01-01'),
      ('VNSGN', 'Sai Gon', '2020-01-01'),
      ('VNSGN', 'Cat Lai', '2025-06-01');
    CREATE TABLE arrivals (
      id int, port_code text, teu int
    );
    INSERT INTO arrivals
    SELECT g,
      (ARRAY['VNDAD', 'VNHPH', 'VNSGN',
        'VNQNH'])[1 + g % 4],
      1 + g % 3
    FROM generate_series(1, 20000) AS g;
    ANALYZE ports;
    ANALYZE arrivals;
  steps:
    - task:
        vi: "Nối thẳng `arrivals` với `ports` làm tổng TEU đổi bao nhiêu? Trả `raw_teu` (chỉ `arrivals`) và `joined_teu` (sau JOIN)."
        en: "How much does a plain join of `arrivals` with `ports` change the TEU total? Return `raw_teu` (`arrivals` alone) and `joined_teu` (after the join)."
      solution: |
        SELECT (SELECT sum(teu)
            FROM arrivals) AS raw_teu,
          (SELECT sum(a.teu)
            FROM arrivals a
            JOIN ports p
              USING (port_code))
            AS joined_teu;
      check: rows
      hint:
        vi: "Hai câu con: `sum(teu)` trên `arrivals`, và `sum(a.teu)` sau `JOIN ports p USING (port_code)`."
        en: "Two subqueries: `sum(teu)` on `arrivals`, and `sum(a.teu)` after `JOIN ports p USING (port_code)`."
    - task:
        vi: "Dựng bảng tra kiểu dictionary `port_dict`: mỗi `port_code` một dòng, `name` của bản có `valid_from` mới nhất."
        en: "Build a dictionary-style lookup table `port_dict`: one row per `port_code`, the `name` of the row with the latest `valid_from`."
      solution: |
        CREATE TABLE port_dict AS
        SELECT DISTINCT ON (port_code)
          port_code, name
        FROM ports
        ORDER BY port_code,
          valid_from DESC;
      after: SELECT port_code, name FROM port_dict
      check: rows
      hint:
        vi: "`DISTINCT ON (port_code)` với `ORDER BY port_code, valid_from DESC`."
        en: "`DISTINCT ON (port_code)` with `ORDER BY port_code, valid_from DESC`."
    - task:
        vi: "Tổng TEU theo tên cảng qua `port_dict`, giữ cả cảng không có trong bảng tra: `name`, `teu`."
        en: "Total TEU by port name through `port_dict`, keeping ports missing from the lookup table: `name`, `teu`."
      solution: |
        SELECT d.name,
          sum(a.teu) AS teu
        FROM arrivals a
        LEFT JOIN port_dict d
          USING (port_code)
        GROUP BY d.name;
      check: rows
      hint:
        vi: "`LEFT JOIN port_dict d USING (port_code)`, rồi `GROUP BY d.name`."
        en: "`LEFT JOIN port_dict d USING (port_code)`, then `GROUP BY d.name`."
    - task:
        vi: "Giảm cả hai phía trước khi nối: gộp `arrivals` theo `port_code` trong một câu con, rồi mới nối với `port_dict`: `name`, `teu` (chỉ cảng có tên)."
        en: "Reduce both sides before the join: aggregate `arrivals` by `port_code` in a subquery, then join `port_dict`: `name`, `teu` (named ports only)."
      solution: |
        SELECT d.name, s.teu
        FROM (SELECT port_code,
            sum(teu) AS teu
          FROM arrivals
          GROUP BY port_code) s
        JOIN port_dict d
          USING (port_code);
      check: rows
      hint:
        vi: "Câu con `SELECT port_code, sum(teu) AS teu FROM arrivals GROUP BY port_code`, rồi `JOIN port_dict`."
        en: "Subquery `SELECT port_code, sum(teu) AS teu FROM arrivals GROUP BY port_code`, then `JOIN port_dict`."
quiz:
  - q:
      vi: "Một hash join trong ClickHouse dựng bảng băm từ phía nào?"
      en: "Which side does a ClickHouse hash join build its hash table from?"
    options:
      - { vi: "Bảng bên phải", en: "The right table" }
      - { vi: "Bảng bên trái", en: "The left table" }
      - { vi: "Cả hai, sắp xếp đủ", en: "Both, fully sorted" }
    answer: 0
    trap: 1
    why:
      vi: "Bảng bên trái chỉ được đọc qua từng khối để dò vào bảng băm, nên nó to cũng không sao. Bảng băm được dựng từ bảng bên phải; tài liệu ghi nếu bảng phải vừa bộ nhớ thì dùng thuật toán hash, còn không thì có thể chuyển sang grace hash ghi ra đĩa. Sắp xếp cả hai phía là cách của full sorting merge, một thuật toán khác."
      en: "The left table is only streamed through to probe the hash table, so its size is not the problem. The hash table is built from the right table; the docs say to use the hash algorithm if the right table fits in memory, and otherwise it can switch to grace hash, which spills to disk. Sorting both sides is what full sorting merge does, a different algorithm."
  - q:
      vi: "Bảng `Join(ANY, LEFT, port_code)` được dùng trong một câu `ALL INNER JOIN`. Điều gì xảy ra?"
      en: "A `Join(ANY, LEFT, port_code)` table is used in an `ALL INNER JOIN` query. What happens?"
    options:
      - { vi: "ClickHouse báo lỗi ngay", en: "ClickHouse raises an error" }
      - { vi: "Không lỗi, có thể sai dữ liệu", en: "No error, maybe wrong data" }
      - { vi: "ClickHouse tự đổi kiểu JOIN", en: "ClickHouse adapts the join" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý nếu ClickHouse báo lỗi khi kiểu không khớp, nhưng tài liệu Join engine ghi rõ: nếu strictness và kiểu JOIN của bảng không khớp với câu dùng nó, ClickHouse không ném lỗi và có thể trả dữ liệu sai. Nó cũng không tự đổi gì. Vì vậy khai `Join(...)` phải đúng như câu JOIN sẽ dùng."
      en: "It sounds reasonable for ClickHouse to raise an error on a mismatch, but the Join engine docs are clear: if the table's strictness and join type do not match the query using it, ClickHouse throws no exception and may return incorrect data. Nor does it adapt anything. So the `Join(...)` declaration must match the join that will use it."
  - q:
      vi: "Bảng 300 cảng được tra trong mọi câu của dashboard. Theo tài liệu, cách nào thường nhanh nhất?"
      en: "A 300-port table is looked up in every dashboard query. According to the docs, which way is usually fastest?"
    options:
      - { vi: "Dictionary nằm sẵn trong bộ nhớ", en: "A dictionary already in memory" }
      - { vi: "JOIN dựng lại mỗi câu", en: "A join rebuilt per query" }
      - { vi: "Chỉ mục bỏ qua trên mã cảng", en: "A skip index on the port code" }
    answer: 0
    trap: 1
    why:
      vi: "JOIN thường phải dựng bảng băm của bảng phải trong mỗi câu, dù bảng đó không đổi. Dictionary được nạp vào bộ nhớ trước, theo `LIFETIME`, nên `dictGet` chỉ tra khóa; tài liệu gọi kiểu tra này là thuật toán JOIN nhanh nhất của ClickHouse. Chỉ mục bỏ qua chỉ giúp bỏ khối khi lọc, không thay được việc nối."
      en: "A plain join usually builds the right table's hash table in every query, even though that table never changes. A dictionary is loaded into memory beforehand, refreshed by `LIFETIME`, so `dictGet` only looks up a key; the docs call this ClickHouse's fastest join algorithm. A skip index only helps skip blocks when filtering; it cannot replace a join."
---
## Mở bài

Dashboard của Cargo Query nối bảng cập bến hàng chục triệu dòng với bảng cảng chỉ vài dòng, và một ngày tổng TEU tự tăng lên. Bài này cho thấy JOIN tốn ở đâu trong ClickHouse, các cách tránh nó, và cái bẫy khóa trùng làm nhân dòng; mọi phép thử chạy trên PostgreSQL.

## Ý chính

Tài liệu ClickHouse ghi JOIN vốn tốn hơn đọc một bảng đã **phi chuẩn hóa** (denormalized), và khuyên mạnh phi chuẩn hóa cho các câu phân tích cần nhanh. Khi vẫn phải nối, thuật toán hash dựng **bảng băm từ bảng bên phải** trong bộ nhớ; nếu bảng phải không vừa, nó có thể chuyển sang grace hash ghi ra đĩa, chậm hơn. Tài liệu cũng khuyên giảm cả hai phía trước khi nối (lọc, gộp trong câu con).

Với bảng tra nhỏ đọc liên tục, có hai cách dựng sẵn. **Dictionary** là kho khóa và giá trị trong bộ nhớ, nạp từ một nguồn và làm mới theo `LIFETIME`; đọc bằng `dictGet`. **Join engine** giữ sẵn cấu trúc cho JOIN trong RAM, đọc bằng JOIN hoặc `joinGet`; khai strictness và kiểu sai thì không có lỗi nhưng dữ liệu có thể sai.

JOIN thường (ALL) trả mọi cặp khớp, nên một khóa trùng ở bảng chiều làm nhân dòng của bảng sự kiện. `LEFT ANY JOIN` chỉ lấy một dòng khớp; trên PostgreSQL, bạn tự làm một bảng tra mỗi khóa một dòng bằng `DISTINCT ON`.

## Cú pháp

```text
-- ClickHouse (read only)
CREATE DICTIONARY port_dict (
  port_code String,
  name String
)
PRIMARY KEY port_code
SOURCE(CLICKHOUSE(TABLE 'ports'))
LAYOUT(HASHED())
LIFETIME(MIN 600 MAX 900);

SELECT dictGet('port_dict',
  'name', port_code) AS name
FROM arrivals;
```

```sql
SELECT DISTINCT ON (port_code)
  port_code, name
FROM ports
ORDER BY port_code,
  valid_from DESC;
```

- Bảng tra: mỗi khóa đúng một dòng, nên nối không nhân dòng.
- `LEFT JOIN` giữ dòng có khóa không có trong bảng tra.

## Ví dụ

Kế hoạch của PostgreSQL: bảng nhỏ `ports` là phía được băm.

```sql
EXPLAIN (COSTS OFF)
SELECT p.name, a.teu
FROM arrivals a
JOIN ports p USING (port_code);
```

Khóa nào trùng trong bảng chiều.

```sql
SELECT port_code,
  count(*) AS entries
FROM ports
GROUP BY port_code
HAVING count(*) > 1;
```

Tra một giá trị mỗi khóa, như `dictGet`.

```sql
SELECT a.id, a.port_code,
  (SELECT p.name FROM ports p
   WHERE p.port_code = a.port_code
   ORDER BY p.valid_from DESC
   LIMIT 1) AS name
FROM arrivals a
WHERE a.id <= 4;
```

## Lỗi hay gặp

Nối với bảng chiều có khóa trùng: mỗi dòng VNSGN khớp hai tên, nên TEU bị nhân đôi.

```sql
-- WRONG: duplicate key doubles rows
SELECT sum(a.teu) AS teu
FROM arrivals a
JOIN ports p USING (port_code)
WHERE port_code = 'VNSGN';
```

```sql
-- FIX: one row per key first
SELECT sum(a.teu) AS teu
FROM arrivals a
JOIN (SELECT DISTINCT ON
    (port_code) port_code, name
  FROM ports
  ORDER BY port_code,
    valid_from DESC) p
  USING (port_code)
WHERE port_code = 'VNSGN';
```

Đặt điều kiện của bảng phải vào `WHERE` sau `LEFT JOIN`: dòng không khớp có `NULL` và bị lọc mất.

```sql
-- WRONG: WHERE drops the NULL rows
SELECT count(*) AS arrivals
FROM arrivals a
LEFT JOIN ports p
  USING (port_code)
WHERE p.valid_from < '2025-01-01';
```

```sql
-- FIX: the condition in ON
SELECT count(*) AS arrivals
FROM arrivals a
LEFT JOIN ports p
  ON p.port_code = a.port_code
  AND p.valid_from < '2025-01-01';
```

## Thực hành

Bốn bước: đo JOIN thẳng làm tổng TEU đổi bao nhiêu, dựng bảng tra `port_dict`, tổng TEU theo tên cảng qua `LEFT JOIN`, rồi gộp trước khi nối.

## Tóm tắt

- JOIN tốn hơn đọc một bảng phi chuẩn hóa; hash join dựng bảng phải trong bộ nhớ.
- Giảm cả hai phía trước khi nối: lọc và gộp trong câu con.
- Bảng tra nhỏ đọc liên tục: dictionary (`dictGet`) hoặc Join engine.
- Khóa trùng ở bảng chiều nhân dòng; dựng bảng tra mỗi khóa một dòng.

# EN

## Opening

Cargo Query's dashboard joins an arrivals table of tens of millions of rows with a port table of a few rows, and one day the TEU total jumps by itself. This lesson shows where joins cost in ClickHouse, the ways around them, and the duplicate-key trap that multiplies rows; every test runs on PostgreSQL.

## Key idea

The ClickHouse docs say joins are inherently more expensive than reading one **denormalized** table, and strongly recommend denormalization for analytical queries that must be fast. When you still join, the hash algorithm builds a **hash table from the right table** in memory; if the right table does not fit, it can switch to grace hash, which spills to disk and is slower. The docs also advise reducing both sides before the join (filter, aggregate in a subquery).

For a small lookup table read all the time, there are two prebuilt options. A **dictionary** is an in-memory key-value store, loaded from a source and refreshed by `LIFETIME`; it is read with `dictGet`. The **Join engine** keeps a prepared join structure in RAM, read by a join or `joinGet`; declaring the wrong strictness or type gives no error, but the data may be wrong.

A regular (ALL) join returns every matching pair, so a duplicate key in a dimension table multiplies the fact table's rows. `LEFT ANY JOIN` takes only one matching row; on PostgreSQL, you build a lookup table with one row per key yourself using `DISTINCT ON`.

## Syntax

```text
-- ClickHouse (read only)
CREATE DICTIONARY port_dict (
  port_code String,
  name String
)
PRIMARY KEY port_code
SOURCE(CLICKHOUSE(TABLE 'ports'))
LAYOUT(HASHED())
LIFETIME(MIN 600 MAX 900);

SELECT dictGet('port_dict',
  'name', port_code) AS name
FROM arrivals;
```

```sql
SELECT DISTINCT ON (port_code)
  port_code, name
FROM ports
ORDER BY port_code,
  valid_from DESC;
```

- The lookup table: exactly one row per key, so the join multiplies nothing.
- `LEFT JOIN` keeps rows whose key is missing from the lookup table.

## Example

PostgreSQL's plan: the small table `ports` is the side that gets hashed.

```sql
EXPLAIN (COSTS OFF)
SELECT p.name, a.teu
FROM arrivals a
JOIN ports p USING (port_code);
```

Which keys are duplicated in the dimension table.

```sql
SELECT port_code,
  count(*) AS entries
FROM ports
GROUP BY port_code
HAVING count(*) > 1;
```

Looking up one value per key, as `dictGet` does.

```sql
SELECT a.id, a.port_code,
  (SELECT p.name FROM ports p
   WHERE p.port_code = a.port_code
   ORDER BY p.valid_from DESC
   LIMIT 1) AS name
FROM arrivals a
WHERE a.id <= 4;
```

## Common mistakes

Joining a dimension table with a duplicate key: each VNSGN row matches two names, so the TEU is doubled.

```sql
-- WRONG: duplicate key doubles rows
SELECT sum(a.teu) AS teu
FROM arrivals a
JOIN ports p USING (port_code)
WHERE port_code = 'VNSGN';
```

```sql
-- FIX: one row per key first
SELECT sum(a.teu) AS teu
FROM arrivals a
JOIN (SELECT DISTINCT ON
    (port_code) port_code, name
  FROM ports
  ORDER BY port_code,
    valid_from DESC) p
  USING (port_code)
WHERE port_code = 'VNSGN';
```

Putting a right-table condition in `WHERE` after a `LEFT JOIN`: unmatched rows have `NULL` and are filtered out.

```sql
-- WRONG: WHERE drops the NULL rows
SELECT count(*) AS arrivals
FROM arrivals a
LEFT JOIN ports p
  USING (port_code)
WHERE p.valid_from < '2025-01-01';
```

```sql
-- FIX: the condition in ON
SELECT count(*) AS arrivals
FROM arrivals a
LEFT JOIN ports p
  ON p.port_code = a.port_code
  AND p.valid_from < '2025-01-01';
```

## Practice

Four steps: measure how much a plain join changes the TEU total, build the lookup table `port_dict`, total TEU by port name through a `LEFT JOIN`, then aggregate before joining.

## Recap

- A join costs more than reading one denormalized table; a hash join builds the right table in memory.
- Reduce both sides before the join: filter and aggregate in a subquery.
- A small lookup table read all the time: a dictionary (`dictGet`) or the Join engine.
- A duplicate key in a dimension table multiplies rows; build a lookup table with one row per key.
