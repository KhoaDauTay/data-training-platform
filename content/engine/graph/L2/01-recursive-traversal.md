---
id: e-gr-l2-01
engine: graph
level: L2
module: traverse
title: Duyệt đồ thị bằng CTE đệ quy
title_en: Traversing a graph with a recursive CTE
kind: lab
runtime: browser
minutes: 22
figures: [{ name: gr-recursive-rounds, at: idea }]
objectives:
  - vi: Viết `WITH RECURSIVE` đi từ một nút qua mọi cạnh tới khi hết đường.
    en: Write a `WITH RECURSIVE` that walks from one node along every edge until no path is left.
  - vi: Đếm số chặng và giữ đường đi dạng chữ trong từng vòng lặp.
    en: Count legs and keep the route as text on each round.
  - vi: Đi ngược chiều cạnh và giới hạn độ sâu.
    en: Walk against the edge direction and cap the depth.
requires: [e-gr-l1-02]
sources:
  - https://www.postgresql.org/docs/18/queries-with.html
  - { url: "https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-patterns/", title: "Cypher Manual: Variable-length patterns" }
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
        vi: "Mọi cảng tàu đi được tới từ Đà Nẵng (`VNDAD`), qua bao nhiêu chặng cũng được, mỗi cảng một lần, không tính `VNDAD`: trả `code`."
        en: "Every port a ship can reach from Da Nang (`VNDAD`), over any number of legs, each port once, `VNDAD` itself left out: return `code`."
      solution: |
        WITH RECURSIVE r(code) AS (
          SELECT 'VNDAD'::text
          UNION
          SELECT l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        )
        SELECT code FROM r
        WHERE code <> 'VNDAD'
      check: rows
      hint:
        vi: "Phần neo là `SELECT 'VNDAD'::text`; phần đệ quy nối `r` với `legs` qua `l.src = r.code`; `UNION` bỏ cảng đã gặp."
        en: "The anchor is `SELECT 'VNDAD'::text`; the recursive part joins `r` to `legs` on `l.src = r.code`; `UNION` drops ports already seen."
    - task:
        vi: "Với mỗi cảng tới được từ `VNDAD`, ít chặng nhất là bao nhiêu? Trả `code`, `hops` (không tính `VNDAD`)."
        en: "For each port reachable from `VNDAD`, what is the fewest number of legs? Return `code`, `hops` (`VNDAD` left out)."
      solution: |
        WITH RECURSIVE r(code, hops) AS (
          SELECT 'VNDAD'::text, 0
          UNION ALL
          SELECT l.dst, r.hops + 1
          FROM r JOIN legs l
            ON l.src = r.code
        )
        SELECT code, min(hops) AS hops
        FROM r
        WHERE code <> 'VNDAD'
        GROUP BY code
      check: rows
      hint:
        vi: "Mang cột `hops` qua từng vòng (`r.hops + 1`), rồi `min(hops)` theo `code` ở câu ngoài."
        en: "Carry a `hops` column through each round (`r.hops + 1`), then `min(hops)` per `code` in the outer query."
    - task:
        vi: "Ngược chiều: những cảng nào có đường tới Rotterdam (`NLRTM`)? Trả `code`, không tính `NLRTM`."
        en: "The other way round: which ports have a route to Rotterdam (`NLRTM`)? Return `code`, `NLRTM` left out."
      solution: |
        WITH RECURSIVE r(code) AS (
          SELECT 'NLRTM'::text
          UNION
          SELECT l.src
          FROM r JOIN legs l
            ON l.dst = r.code
        )
        SELECT code FROM r
        WHERE code <> 'NLRTM'
      check: rows
      hint:
        vi: "Đổi vai hai cột: nối `l.dst = r.code` và lấy `l.src`."
        en: "Swap the columns' roles: join on `l.dst = r.code` and take `l.src`."
    - task:
        vi: "Những cảng tới được từ `VNDAD` trong tối đa 2 chặng, mỗi cảng một lần: trả `code`."
        en: "The ports reachable from `VNDAD` in at most 2 legs, each port once: return `code`."
      solution: |
        WITH RECURSIVE r(code, hops) AS (
          SELECT 'VNDAD'::text, 0
          UNION ALL
          SELECT l.dst, r.hops + 1
          FROM r JOIN legs l
            ON l.src = r.code
          WHERE r.hops < 2
        )
        SELECT DISTINCT code FROM r
        WHERE hops > 0
      check: rows
      hint:
        vi: "Chặn ở phần đệ quy: `WHERE r.hops < 2`, rồi `DISTINCT` ở câu ngoài."
        en: "Stop in the recursive part: `WHERE r.hops < 2`, then `DISTINCT` in the outer query."
quiz:
  - q:
      vi: "Trong `WITH RECURSIVE`, PostgreSQL dừng vòng lặp khi nào?"
      en: "In a `WITH RECURSIVE`, when does PostgreSQL stop the loop?"
    options:
      - { vi: "Khi bảng làm việc rỗng", en: "When the working table is empty" }
      - { vi: "Sau đúng 100 vòng lặp", en: "After exactly 100 rounds" }
      - { vi: "Khi phần neo hết dòng", en: "When the anchor runs out of rows" }
    answer: 0
    trap: 2
    why:
      vi: "Phần neo (non-recursive term) chỉ chạy một lần ở đầu, nên nó không quyết định lúc dừng. Tài liệu PostgreSQL mô tả: mỗi vòng chạy phần đệ quy trên bảng làm việc (working table) là các dòng mới của vòng trước, và lặp lại chừng nào bảng đó còn dòng. Không có giới hạn 100 vòng: đồ thị có vòng mà không chặn thì câu chạy mãi."
      en: "The anchor (the non-recursive term) runs only once at the start, so it does not decide when to stop. The PostgreSQL docs describe it: each round runs the recursive term over the working table, the new rows of the previous round, and repeats as long as that table has rows. There is no 100-round limit: a graph with a loop and no guard runs forever."
  - q:
      vi: "`SGSIN` tới được từ `VNDAD` theo hai đường (đi thẳng, và qua `HKHKG`). Câu đệ quy dùng `UNION ALL`, chỉ có cột `code`. `SGSIN` xuất hiện mấy lần?"
      en: "`SGSIN` is reachable from `VNDAD` two ways (directly, and through `HKHKG`). The recursive query uses `UNION ALL` with only a `code` column. How many times does `SGSIN` appear?"
    options:
      - { vi: "Một lần, vì CTE tự bỏ trùng", en: "Once, the CTE removes duplicates" }
      - { vi: "Hai lần, một cho mỗi đường", en: "Twice, once per route" }
      - { vi: "Không lần nào", en: "Not at all" }
    answer: 1
    trap: 0
    why:
      vi: "CTE không tự bỏ trùng: chỉ `UNION` mới bỏ các dòng đã có. Với `UNION ALL`, mỗi đường tới `SGSIN` sinh một dòng, nên `SGSIN` có hai dòng, và mọi cảng sau nó (`NLRTM`, `AUSYD`) cũng bị lặp. Dùng `UNION`, hoặc gom lại ở câu ngoài, khi chỉ cần mỗi cảng một lần."
      en: "A CTE does not remove duplicates on its own: only `UNION` discards rows already produced. With `UNION ALL`, each route to `SGSIN` makes one row, so `SGSIN` has two rows, and every port after it (`NLRTM`, `AUSYD`) repeats too. Use `UNION`, or group in the outer query, when each port is wanted once."
---
## Mở bài

Hỏi "từ Đà Nẵng đi tới đâu được" là hỏi một chuỗi chặng không biết trước dài bao nhiêu. JOIN thường chỉ đi được số bước cố định; `WITH RECURSIVE` đi tới khi hết đường.

## Ý chính

**Hai phần.** Một CTE đệ quy gồm phần neo (non-recursive term), chạy một lần để lấy điểm xuất phát, và phần đệ quy (recursive term), nối kết quả vòng trước với bảng cạnh để đi thêm một chặng. Hai phần ghép bằng `UNION` hoặc `UNION ALL`.

**Vòng lặp chạy ra sao.** Tài liệu PostgreSQL mô tả: kết quả phần neo vào bảng làm việc (working table). Chừng nào bảng làm việc còn dòng, PostgreSQL chạy phần đệ quy với bảng đó thay cho tên CTE, đưa dòng mới vào kết quả và làm chúng thành bảng làm việc của vòng sau. Với `UNION`, dòng trùng với dòng đã có bị bỏ; với `UNION ALL` thì không.

**Mang thông tin theo.** Thêm cột vào CTE để mang số chặng (`hops + 1`) hay đường đi dạng chữ (`route || '>' || dst`). Muốn đi ngược chiều cạnh, đổi vai `src` và `dst`. Muốn chặn độ sâu, thêm `WHERE hops < n` vào phần đệ quy.

**Dừng.** Tài liệu cảnh báo: phần đệ quy phải tới lúc không trả dòng nào, nếu không câu sẽ lặp mãi. Đồ thị bài này không có vòng nên luôn dừng; bài về chu trình xử lý trường hợp có vòng.

Trong Cypher, một mẫu có độ dài thay đổi viết bằng lượng từ sau quan hệ:

```text
MATCH (a:Port {code: 'VNDAD'})
      -[:LEG]->{1,10}(b:Port)
RETURN DISTINCT b.code
```

## Cú pháp

```sql
WITH RECURSIVE r(code, hops) AS (
  SELECT 'VNDAD'::text, 0  -- anchor
  UNION ALL
  SELECT l.dst, r.hops + 1 -- one leg
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.hops < 5         -- cap
)
SELECT * FROM r;
```

- `UNION`: bỏ dòng trùng với dòng đã có; `UNION ALL`: giữ hết.
- Kiểu cột lấy từ phần neo: viết `'VNDAD'::text` cho rõ.

## Ví dụ

Mọi cảng tới được từ `VNDAD`, mỗi cảng một lần:

```sql
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r ORDER BY code;
```

Mọi đường đi từ `VNDAD`, kèm số chặng:

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
ORDER BY hops, route;
```

Ngược chiều: các cảng có đường tới `USLAX`:

```sql
WITH RECURSIVE r(code) AS (
  SELECT 'USLAX'::text
  UNION
  SELECT l.src
  FROM r JOIN legs l
    ON l.dst = r.code
)
SELECT code FROM r ORDER BY code;
```

## Lỗi hay gặp

`UNION ALL` không bỏ trùng: `SGSIN` và các cảng sau nó ra hai lần.

```sql
-- WRONG: SGSIN, NLRTM, AUSYD twice
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION ALL
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r;
```

```sql
-- FIX: UNION keeps each port once
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r;
```

Thiếu chữ `RECURSIVE` thì CTE không được tự nhắc tên mình:

```sql
-- ERROR 42P01
WITH r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r;
```

Hàm gộp không được nằm trong phần đệ quy; gộp ở câu ngoài:

```sql
-- ERROR 42P19
WITH RECURSIVE r(code, n) AS (
  SELECT 'VNDAD'::text, 0::bigint
  UNION ALL
  SELECT l.dst, count(*)
  FROM r JOIN legs l
    ON l.src = r.code
  GROUP BY l.dst
)
SELECT * FROM r;
```

## Thực hành

Bốn câu hỏi: mọi cảng tới được, ít chặng nhất tới từng cảng, đi ngược chiều tới Rotterdam, và giới hạn 2 chặng.

## Tóm tắt

- `WITH RECURSIVE` = phần neo chạy một lần + phần đệ quy đi thêm một cạnh mỗi vòng.
- Vòng lặp dừng khi bảng làm việc rỗng; đồ thị có vòng cần được chặn.
- `UNION` bỏ dòng đã có; `UNION ALL` giữ mọi đường, kể cả trùng.
- Mang `hops` và `route` theo từng vòng; đổi `src`/`dst` để đi ngược chiều.

# EN

## Opening

Asking "where can a ship get to from Da Nang" asks for a chain of legs of unknown length. A plain JOIN walks a fixed number of steps; `WITH RECURSIVE` walks until no path is left.

## Key idea

**Two parts.** A recursive CTE has a non-recursive term (the anchor), run once to get the starting point, and a recursive term, which joins the previous round's result to the edge table to go one leg further. The two parts are combined with `UNION` or `UNION ALL`.

**How the loop runs.** The PostgreSQL docs describe it: the anchor's rows go into a working table. As long as the working table has rows, PostgreSQL runs the recursive term with that table in place of the CTE's name, adds the new rows to the result and makes them the working table of the next round. With `UNION`, rows that duplicate a row already produced are discarded; with `UNION ALL` they are not.

**Carrying information along.** Add columns to the CTE to carry a leg count (`hops + 1`) or the route as text (`route || '>' || dst`). To walk against the edge direction, swap the roles of `src` and `dst`. To cap the depth, add `WHERE hops < n` to the recursive term.

**Stopping.** The docs warn that the recursive part must eventually return no rows, or the query loops forever. This lesson's graph has no loop, so it always stops; the lesson on cycles handles graphs that have one.

In Cypher, a variable-length pattern is written with a quantifier after the relationship:

```text
MATCH (a:Port {code: 'VNDAD'})
      -[:LEG]->{1,10}(b:Port)
RETURN DISTINCT b.code
```

## Syntax

```sql
WITH RECURSIVE r(code, hops) AS (
  SELECT 'VNDAD'::text, 0  -- anchor
  UNION ALL
  SELECT l.dst, r.hops + 1 -- one leg
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.hops < 5         -- cap
)
SELECT * FROM r;
```

- `UNION`: drops rows that repeat a row already produced; `UNION ALL`: keeps them all.
- Column types come from the anchor: write `'VNDAD'::text` to be explicit.

## Example

Every port reachable from `VNDAD`, each once:

```sql
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r ORDER BY code;
```

Every route from `VNDAD`, with its leg count:

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
ORDER BY hops, route;
```

The other way round: the ports with a route to `USLAX`:

```sql
WITH RECURSIVE r(code) AS (
  SELECT 'USLAX'::text
  UNION
  SELECT l.src
  FROM r JOIN legs l
    ON l.dst = r.code
)
SELECT code FROM r ORDER BY code;
```

## Common mistakes

`UNION ALL` does not remove duplicates: `SGSIN` and the ports after it come out twice.

```sql
-- WRONG: SGSIN, NLRTM, AUSYD twice
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION ALL
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r;
```

```sql
-- FIX: UNION keeps each port once
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r;
```

Without the word `RECURSIVE`, a CTE cannot refer to its own name:

```sql
-- ERROR 42P01
WITH r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT l.dst
  FROM r JOIN legs l
    ON l.src = r.code
)
SELECT code FROM r;
```

An aggregate may not sit in the recursive term; aggregate in the outer query:

```sql
-- ERROR 42P19
WITH RECURSIVE r(code, n) AS (
  SELECT 'VNDAD'::text, 0::bigint
  UNION ALL
  SELECT l.dst, count(*)
  FROM r JOIN legs l
    ON l.src = r.code
  GROUP BY l.dst
)
SELECT * FROM r;
```

## Practice

Four questions: every reachable port, the fewest legs to each port, walking back to Rotterdam, and a cap of 2 legs.

## Recap

- `WITH RECURSIVE` = an anchor run once + a recursive term that goes one edge further each round.
- The loop stops when the working table is empty; a graph with a loop needs a guard.
- `UNION` drops rows already produced; `UNION ALL` keeps every route, duplicates included.
- Carry `hops` and `route` through the rounds; swap `src`/`dst` to walk backwards.
