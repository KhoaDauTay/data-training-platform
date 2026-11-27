---
id: e-gr-l2-03
engine: graph
level: L2
module: traverse
title: Chu trình và mệnh đề CYCLE
title_en: Cycles and the CYCLE clause
kind: lab
runtime: browser
minutes: 22
figures: [{ name: gr-cycle, at: idea }]
objectives:
  - vi: Biết vì sao CTE đệ quy lặp mãi trên đồ thị có chu trình.
    en: Know why a recursive CTE loops forever on a graph with a cycle.
  - vi: Dùng `CYCLE ... SET ... USING ...` để đánh dấu và dừng đường đi quay lại nút cũ.
    en: Use `CYCLE ... SET ... USING ...` to mark and stop a route that comes back to a node it visited.
  - vi: Tìm các vòng quay về đúng cảng xuất phát.
    en: Find the loops that return to their own starting port.
requires: [e-gr-l2-01]
sources:
  - { url: https://www.postgresql.org/docs/18/queries-with.html, title_vi: "Truy vấn WITH (CTE)" }
  - { url: "https://www.postgresql.org/docs/release/14.0/", title: "PostgreSQL 14 release notes: SEARCH and CYCLE", title_vi: "Ghi chú phát hành PostgreSQL 14: SEARCH và CYCLE" }
  - { url: https://www.postgresql.org/docs/18/sql-select.html, title_vi: "SELECT" }
lab:
  setup: |
    CREATE TABLE ports (code text PRIMARY KEY);
    INSERT INTO ports VALUES
      ('VNDAD'), ('HKHKG'), ('SGSIN'),
      ('KRPUS'), ('NLRTM');
    CREATE TABLE legs (
      src text REFERENCES ports,
      dst text REFERENCES ports,
      days numeric(4, 1) NOT NULL,
      PRIMARY KEY (src, dst)
    );
    INSERT INTO legs VALUES
      ('VNDAD', 'HKHKG', 2.5), ('HKHKG', 'SGSIN', 3.5),
      ('SGSIN', 'VNDAD', 3.2), ('SGSIN', 'NLRTM', 27.0),
      ('HKHKG', 'KRPUS', 2.9);
  steps:
    - task:
        vi: "Mọi đường đi từ Đà Nẵng (`VNDAD`), dừng khi một cảng lặp lại: trả `route` (các mã nối bằng `>`) và `is_cycle` (đường có quay lại cảng đã qua không)."
        en: "Every route from Da Nang (`VNDAD`), stopping when a port repeats: return `route` (the codes joined with `>`) and `is_cycle` (whether the route came back to a port it passed)."
      solution: |
        WITH RECURSIVE r(code, route) AS (
          SELECT 'VNDAD'::text, 'VNDAD'
          UNION ALL
          SELECT l.dst,
            r.route || '>' || l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        ) CYCLE code SET is_cycle
          USING path
        SELECT route, is_cycle FROM r
      check: rows
      hint:
        vi: "Sau dấu `)` của CTE: `CYCLE code SET is_cycle USING path`, rồi chọn `route, is_cycle`."
        en: "After the CTE's closing `)`: `CYCLE code SET is_cycle USING path`, then select `route, is_cycle`."
    - task:
        vi: "Với mỗi cảng, vòng nào đưa tàu quay về đúng cảng đó? Trả `start`, `route` (đường bắt đầu và kết thúc ở `start`)."
        en: "For each port, which loop brings a ship back to that same port? Return `start`, `route` (a route that begins and ends at `start`)."
      solution: |
        WITH RECURSIVE r(start, code, route)
        AS (
          SELECT code, code, code
          FROM ports
          UNION ALL
          SELECT r.start, l.dst,
            r.route || '>' || l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        ) CYCLE code SET is_cycle
          USING path
        SELECT start, route FROM r
        WHERE is_cycle
          AND code = start
      check: rows
      hint:
        vi: "Phần neo lấy mọi cảng làm `start`; giữ dòng có `is_cycle` và `code = start`."
        en: "The anchor takes every port as `start`; keep the rows with `is_cycle` and `code = start`."
    - task:
        vi: "Từ `VNDAD` có bao nhiêu đường không đi qua cảng nào hai lần (kể cả đường chỉ có `VNDAD`)? Trả một cột `n`."
        en: "How many routes from `VNDAD` pass no port twice (the route made of `VNDAD` alone included)? Return one column `n`."
      solution: |
        WITH RECURSIVE r(code) AS (
          SELECT 'VNDAD'::text
          UNION ALL
          SELECT l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        ) CYCLE code SET is_cycle
          USING path
        SELECT count(*) AS n FROM r
        WHERE NOT is_cycle
      check: rows
      hint:
        vi: "Như bước 1, rồi `count(*)` các dòng `WHERE NOT is_cycle`."
        en: "As in step 1, then `count(*)` the rows `WHERE NOT is_cycle`."
quiz:
  - q:
      vi: "Đồ thị có vòng `VNDAD>HKHKG>SGSIN>VNDAD`. Câu đệ quy dùng `UNION ALL`, mang cột `route`, không có `CYCLE` và không chặn độ sâu. Điều gì xảy ra?"
      en: "The graph has the loop `VNDAD>HKHKG>SGSIN>VNDAD`. A recursive query uses `UNION ALL`, carries a `route` column, has no `CYCLE` and no depth cap. What happens?"
    options:
      - { vi: "Dừng sau một vòng quanh chu trình", en: "It stops after one trip round the loop" }
      - { vi: "PostgreSQL tự phát hiện và báo lỗi", en: "PostgreSQL detects it and raises an error" }
      - { vi: "Chạy mãi, mỗi vòng lại có dòng mới", en: "It runs forever, each round adds new rows" }
    answer: 2
    trap: 1
    why:
      vi: "PostgreSQL không tự tìm chu trình và không báo lỗi; nó chỉ dừng khi một vòng không cho dòng nào. Ở đây mỗi lần đi quanh vòng, `route` dài thêm nên dòng luôn mới, và câu chạy mãi. Đổi sang `UNION` cũng không cứu được, vì `route` khác nhau nên không có dòng trùng. Cần `CYCLE` (hoặc tự giữ mảng đường đi) để dừng."
      en: "PostgreSQL does not look for cycles and raises no error; it stops only when a round produces no rows. Here each trip round the loop makes `route` longer, so every row is new and the query runs forever. Switching to `UNION` does not help either, because the `route` values differ and no row is a duplicate. You need `CYCLE` (or your own path array) to stop it."
  - q:
      vi: "`CYCLE code SET is_cycle USING path` đánh dấu dòng nào là `true`?"
      en: "`CYCLE code SET is_cycle USING path` marks which row as `true`?"
    options:
      - { vi: "Dòng có `code` đã nằm trong `path`", en: "The row whose `code` is already in `path`" }
      - { vi: "Mọi dòng thuộc một chu trình", en: "Every row that belongs to a cycle" }
      - { vi: "Dòng đầu tiên của đường đi", en: "The first row of the route" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe như mọi cảng trong vòng đều được đánh dấu, nhưng `HKHKG` và `SGSIN` trên đường đi vẫn có `is_cycle` là `false`. Chỉ dòng mà `code` mới đã có trong mảng `path` (danh sách cảng đã qua) mới là `true`, và đường đó không được đi tiếp. Tài liệu PostgreSQL viết dạng tay tương đương là `g.id = ANY(path)`."
      en: "It sounds as if every port on the loop gets marked, but `HKHKG` and `SGSIN` on the route still have `is_cycle` set to `false`. Only the row whose new `code` is already in the `path` array (the list of ports passed) is `true`, and that route is not extended. The PostgreSQL docs write the hand-made equivalent as `g.id = ANY(path)`."
---
## Mở bài

Tàu chạy vòng Đà Nẵng, Hong Kong, Singapore rồi về Đà Nẵng. Trên đồ thị có vòng như vậy, câu đệ quy của các bài trước không bao giờ dừng; bài này dùng mệnh đề `CYCLE` để chặn nó.

## Ý chính

**Vì sao lặp mãi.** Tài liệu PostgreSQL nhắc: phần đệ quy phải tới lúc không trả dòng nào, nếu không câu lặp vô hạn. Trên một chu trình (cycle), đường đi luôn có thêm một chặng để đi, nên mỗi vòng lại có dòng mới. `UNION` chỉ cứu được khi dòng giống hệt nhau; một cột `route` hay `hops` làm mọi dòng khác nhau.

**CYCLE.** Từ PostgreSQL 14, `CYCLE code SET is_cycle USING path` đặt sau CTE. Tài liệu nói nó theo dõi cột `code`, thêm cột đánh dấu `is_cycle` và cột `path` giữ các giá trị đã qua. Dòng nào có `code` đã nằm trong `path` được đánh dấu và không được đi tiếp. Dạng viết tay tương đương là một mảng `ARRAY[code]`, nối thêm `path || code`, và điều kiện `code = ANY(path)`.

**Tìm vòng.** Lấy mọi cảng làm điểm xuất phát, rồi giữ các dòng đã đánh dấu có `code` bằng điểm xuất phát: đó là các vòng quay về đúng cảng đó. Một dòng đánh dấu mà `code` khác điểm xuất phát là đường đã đi vào một vòng ở giữa.

**Chặn độ sâu không thay được CYCLE.** `WHERE hops < n` làm câu dừng, nhưng vẫn ra các đường đi quanh vòng nhiều lần và không cho biết đâu là vòng. Câu dưới đây chạy mãi trên lab này, nên chỉ được xem, không chạy:

```text
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.route || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT * FROM r;  -- never ends
```

## Cú pháp

```sql
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, is_cycle FROM r;
```

- `CYCLE` có thể đi cùng `SEARCH` trong cùng một câu.
- Tên cột đánh dấu và tên cột đường đi phải khác nhau và khác các cột của CTE.

## Ví dụ

Mọi đường từ `VNDAD`, đường quay lại được đánh dấu:

```sql
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, is_cycle FROM r;
```

Cùng việc đó viết tay, bằng một mảng các cảng đã qua:

```sql
WITH RECURSIVE r(code, seen, loop)
AS (
  SELECT 'VNDAD'::text,
    ARRAY['VNDAD'], false
  UNION ALL
  SELECT l.dst, r.seen || l.dst,
    l.dst = ANY(r.seen)
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE NOT r.loop
)
SELECT code, loop FROM r;
```

## Lỗi hay gặp

Chặn độ sâu thay cho `CYCLE`: câu dừng, nhưng có đường đi quanh vòng hai lần.

```sql
-- WRONG: the loop is walked again
WITH RECURSIVE r(code, n, route)
AS (
  SELECT 'VNDAD'::text, 0, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.n + 1,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.n < 4
)
SELECT route FROM r;
```

```sql
-- FIX: stop where a port repeats
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route FROM r;
```

Cột đánh dấu và cột đường đi trùng tên:

```sql
-- ERROR 42601
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION ALL
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET p USING p
SELECT code FROM r;
```

## Thực hành

Ba câu hỏi: mọi đường từ `VNDAD` với dấu chu trình, vòng quay về từng cảng, và số đường không lặp cảng.

## Tóm tắt

- Trên đồ thị có vòng, phần đệ quy luôn có dòng mới: câu lặp mãi nếu không chặn.
- `CYCLE code SET is_cycle USING path` (PostgreSQL 14+) đánh dấu và dừng đường quay lại cảng đã qua.
- Vòng về đúng điểm xuất phát: `is_cycle` và `code = start`.
- Chặn độ sâu chỉ làm câu dừng; nó không cho biết đâu là vòng.

# EN

## Opening

A ship runs a loop: Da Nang, Hong Kong, Singapore and back to Da Nang. On a graph with a loop like that, the recursive queries of the earlier lessons never stop; this lesson uses the `CYCLE` clause to stop them.

## Key idea

**Why it loops forever.** The PostgreSQL docs warn that the recursive part must eventually return no rows, or the query loops indefinitely. On a cycle a route always has one more leg to take, so every round yields new rows. `UNION` only helps when rows are identical; a `route` or `hops` column makes every row different.

**CYCLE.** Since PostgreSQL 14, `CYCLE code SET is_cycle USING path` goes after the CTE. The docs say it tracks column `code`, adds a mark column `is_cycle` and a column `path` that holds the values passed. A row whose `code` is already in `path` is marked and not extended. The hand-written equivalent is an array `ARRAY[code]`, extended with `path || code`, and the condition `code = ANY(path)`.

**Finding loops.** Take every port as a starting point, then keep the marked rows whose `code` equals the starting point: those are the loops back to that port. A marked row whose `code` differs from the start is a route that ran into a loop partway.

**A depth cap does not replace CYCLE.** `WHERE hops < n` makes the query stop, but it still returns routes that go round the loop several times and does not tell you which one is a loop. The query below runs forever on this lab, so it is for reading only, not for running:

```text
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.route || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT * FROM r;  -- never ends
```

## Syntax

```sql
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, is_cycle FROM r;
```

- `CYCLE` can go together with `SEARCH` in the same query.
- The mark column and the path column need two different names, both different from the CTE's columns.

## Example

Every route from `VNDAD`, the route that comes back marked:

```sql
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, is_cycle FROM r;
```

The same by hand, with an array of the ports passed:

```sql
WITH RECURSIVE r(code, seen, loop)
AS (
  SELECT 'VNDAD'::text,
    ARRAY['VNDAD'], false
  UNION ALL
  SELECT l.dst, r.seen || l.dst,
    l.dst = ANY(r.seen)
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE NOT r.loop
)
SELECT code, loop FROM r;
```

## Common mistakes

A depth cap instead of `CYCLE`: the query stops, but some routes walk the loop twice.

```sql
-- WRONG: the loop is walked again
WITH RECURSIVE r(code, n, route)
AS (
  SELECT 'VNDAD'::text, 0, 'VNDAD'
  UNION ALL
  SELECT l.dst, r.n + 1,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.n < 4
)
SELECT route FROM r;
```

```sql
-- FIX: stop where a port repeats
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route FROM r;
```

The mark column and the path column share a name:

```sql
-- ERROR 42601
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION ALL
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET p USING p
SELECT code FROM r;
```

## Practice

Three questions: every route from `VNDAD` with its cycle mark, the loop back to each port, and the number of routes that repeat no port.

## Recap

- On a graph with a loop the recursive term always has new rows: the query loops forever without a guard.
- `CYCLE code SET is_cycle USING path` (PostgreSQL 14+) marks and stops a route that returns to a port it passed.
- A loop back to the start: `is_cycle` and `code = start`.
- A depth cap only makes the query stop; it does not tell you which route is a loop.
