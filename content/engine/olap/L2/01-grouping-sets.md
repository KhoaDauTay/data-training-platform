---
id: e-ol-l2-01
engine: olap
level: L2
module: pganalytics
title: "GROUPING SETS, ROLLUP và CUBE"
title_en: "GROUPING SETS, ROLLUP and CUBE"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-rollup, at: idea }]
objectives:
  - vi: Tính tổng chi tiết, tổng phụ và tổng chung trong một câu lệnh bằng `ROLLUP`.
    en: Compute detail totals, subtotals and the grand total in one query with `ROLLUP`.
  - vi: Chọn đúng những nhóm cần bằng `GROUPING SETS`, và mọi tổ hợp bằng `CUBE`.
    en: Pick exactly the groupings you need with `GROUPING SETS`, and every combination with `CUBE`.
  - vi: Phân biệt NULL của dòng tổng phụ với NULL thật trong dữ liệu bằng `GROUPING()`.
    en: Tell a subtotal row's NULL from a real NULL in the data with `GROUPING()`.
requires: [e-ol-l1-03]
sources:
  - { url: "https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-GROUPING-SETS", title: "PostgreSQL 18 docs: GROUPING SETS, CUBE, and ROLLUP" }
  - { url: "https://www.postgresql.org/docs/18/functions-aggregate.html#FUNCTIONS-GROUPING-TABLE", title: "PostgreSQL 18 docs: Grouping Operations" }
lab:
  setup: |
    CREATE TABLE moves (
      port text, mode text, teu int
    );
    INSERT INTO moves
    SELECT (ARRAY['VNDAD','VNSGN'])
        [1 + i % 2],
      CASE WHEN i % 15 = 0 THEN NULL
        ELSE (ARRAY['sea','air'])
          [1 + i % 3 % 2] END,
      1 + i % 4
    FROM generate_series(1, 200) AS i;
  steps:
    - task:
        vi: "TEU theo cảng và phương thức, kèm tổng phụ mỗi cảng và tổng chung, trong một câu: `port`, `mode`, `teu`."
        en: "TEU by port and mode, with a subtotal per port and a grand total, in one query: `port`, `mode`, `teu`."
      solution: |
        SELECT port, mode, sum(teu) AS teu
        FROM moves
        GROUP BY ROLLUP (port, mode);
      check: rows
      hint:
        vi: "`GROUP BY ROLLUP (port, mode)`."
        en: "`GROUP BY ROLLUP (port, mode)`."
    - task:
        vi: "Mọi tổ hợp của cảng và phương thức, cùng cột `lvl` cho biết dòng gộp những cột nào: `port`, `mode`, `lvl`, `teu`."
        en: "Every combination of port and mode, with a column `lvl` telling which columns a row rolls up: `port`, `mode`, `lvl`, `teu`."
      solution: |
        SELECT port, mode,
          GROUPING(port, mode) AS lvl,
          sum(teu) AS teu
        FROM moves
        GROUP BY CUBE (port, mode);
      check: rows
      hint:
        vi: "`GROUP BY CUBE (port, mode)` và `GROUPING(port, mode) AS lvl`."
        en: "`GROUP BY CUBE (port, mode)` and `GROUPING(port, mode) AS lvl`."
    - task:
        vi: "Chỉ hai bảng tổng: theo cảng, và theo phương thức (không tổng chung): `port`, `mode`, `teu`."
        en: "Only two totals: by port, and by mode (no grand total): `port`, `mode`, `teu`."
      solution: |
        SELECT port, mode, sum(teu) AS teu
        FROM moves
        GROUP BY GROUPING SETS
          ((port), (mode));
      check: rows
      hint:
        vi: "`GROUP BY GROUPING SETS ((port), (mode))`."
        en: "`GROUP BY GROUPING SETS ((port), (mode))`."
quiz:
  - q:
      vi: "`ROLLUP (port, mode)` trên 2 cảng và 3 giá trị phương thức (sea, air, NULL thật) trả bao nhiêu dòng?"
      en: "How many rows does `ROLLUP (port, mode)` return over 2 ports and 3 mode values (sea, air, a real NULL)?"
    options:
      - { vi: "6 dòng chi tiết", en: "6 detail rows" }
      - { vi: "9 dòng", en: "9 rows" }
      - { vi: "12 dòng, như CUBE", en: "12 rows, like CUBE" }
    answer: 1
    trap: 0
    why:
      vi: "6 dòng chi tiết (2 cảng × 3 phương thức) chỉ là tầng đầu. `ROLLUP (port, mode)` thêm tổng phụ mỗi cảng (2 dòng) và một tổng chung: 6 + 2 + 1 = 9. `CUBE` còn thêm tổng theo phương thức (3 dòng) nên ra 12; `ROLLUP` không có tầng đó."
      en: "6 detail rows (2 ports × 3 modes) are only the first level. `ROLLUP (port, mode)` adds a subtotal per port (2 rows) and one grand total: 6 + 2 + 1 = 9. `CUBE` also adds totals by mode (3 rows), giving 12; `ROLLUP` has no such level."
  - q:
      vi: "Một dòng kết quả có `mode` là NULL. Làm sao biết đó là tổng phụ hay dữ liệu thiếu phương thức?"
      en: "A result row has `mode` NULL. How do you tell a subtotal from data with no mode?"
    options:
      - { vi: "Thêm `coalesce(mode, 'tất cả')`", en: "Add `coalesce(mode, 'tất cả')`" }
      - { vi: "Xem `GROUPING(mode)`: 1 là tổng phụ", en: "Check `GROUPING(mode)`: 1 is a subtotal" }
      - { vi: "Xem dòng đó có nằm cuối không", en: "See whether the row comes last" }
    answer: 1
    trap: 0
    why:
      vi: "`coalesce` đổi mọi NULL thành `'tất cả'`, kể cả các lô thật sự thiếu phương thức, nên hai loại vẫn lẫn vào nhau. `GROUPING(mode)` trả 1 chỉ khi dòng gộp qua cột `mode`, và 0 khi NULL đến từ dữ liệu. Thứ tự dòng không được bảo đảm nếu không có `ORDER BY`, nên vị trí không nói gì."
      en: "`coalesce` turns every NULL into `'tất cả'`, including shipments that really have no mode, so the two kinds stay mixed. `GROUPING(mode)` returns 1 only when the row rolls up over `mode`, and 0 when the NULL comes from the data. Row order is not guaranteed without `ORDER BY`, so position tells nothing."
---
## Mở bài

Bảng điều hành của Cargo Query cần TEU theo cảng và phương thức, cộng tổng mỗi cảng và tổng chung. Viết ba câu rồi `UNION ALL` thì dài và quét bảng ba lần; PostgreSQL làm được trong một câu.

## Ý chính

**`GROUPING SETS`** liệt kê các nhóm cần tính trong một câu: `GROUPING SETS ((port), (mode), ())` cho tổng theo cảng, theo phương thức và tổng chung (nhóm rỗng `()`). Cột không có trong một nhóm thì là NULL ở các dòng của nhóm đó.

**`ROLLUP (port, mode)`** là cách viết tắt cho các tầng từ chi tiết lên tổng: `(port, mode)`, `(port)`, `()`. **`CUBE (port, mode)`** là mọi tổ hợp: thêm cả `(mode)`. Đây là các phép toán của một khối dữ liệu (cube) trong OLAP.

Vì dòng tổng phụ dùng NULL, một NULL thật trong dữ liệu trông giống hệt. **`GROUPING(col)`** trả 1 khi dòng đã gộp qua cột đó, 0 khi không; với nhiều cột nó trả một số nhị phân, cột đầu là bit cao.

## Cú pháp

```sql
SELECT port, mode, sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode);
```

- `GROUPING SETS ((a), (b), ())`: đúng những nhóm liệt kê.
- `ROLLUP (a, b)` = `(a, b)`, `(a)`, `()`; `CUBE (a, b)` thêm `(b)`.
- `GROUPING(a, b)`: 0 là dòng chi tiết, 3 là tổng chung.

## Ví dụ

Tổng phụ mỗi cảng và tổng chung, xếp tổng xuống cuối.

```sql
SELECT port, mode, sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode)
ORDER BY port NULLS LAST,
  mode NULLS LAST;
```

Viết tay hai tầng tổng bằng `UNION ALL`: mỗi tầng là thêm một lần quét bảng.

```sql
SELECT port, NULL AS mode,
  sum(teu) AS teu
FROM moves GROUP BY port
UNION ALL
SELECT NULL, NULL, sum(teu)
FROM moves;
```

## Lỗi hay gặp

Đổi NULL thành chữ bằng `coalesce`: các lô thiếu phương thức cũng bị gọi là tổng.

```sql
-- WRONG: real NULLs look like totals
SELECT port,
  coalesce(mode, 'all') AS mode,
  sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode);
```

```sql
-- FIX: GROUPING() marks the totals
SELECT port,
  CASE WHEN GROUPING(mode) = 1
    THEN 'all'
    ELSE coalesce(mode, '?')
  END AS mode,
  sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode);
```

Chọn một cột không nằm trong nhóm nào.

```sql
-- ERROR 42803: mode not grouped
SELECT port, mode, sum(teu)
FROM moves
GROUP BY ROLLUP (port);
```

## Thực hành

Ba bước: `ROLLUP` theo cảng rồi phương thức, `CUBE` có cột `lvl`, rồi `GROUPING SETS` chỉ hai bảng tổng.

## Tóm tắt

- `GROUPING SETS` tính nhiều nhóm trong một câu, quét bảng một lần.
- `ROLLUP` đi từ chi tiết lên tổng chung; `CUBE` lấy mọi tổ hợp.
- Dòng tổng phụ có NULL ở cột đã gộp; `GROUPING()` phân biệt nó với NULL thật.
- Thêm `ORDER BY` nếu cần tổng nằm cuối.

# EN

## Opening

Cargo Query's operations board needs TEU by port and mode, plus a total per port and a grand total. Writing three queries and a `UNION ALL` is long and scans the table three times; PostgreSQL does it in one query.

## Key idea

**`GROUPING SETS`** lists the groupings to compute in one query: `GROUPING SETS ((port), (mode), ())` gives totals by port, by mode and the grand total (the empty grouping `()`). A column missing from a grouping is NULL in that grouping's rows.

**`ROLLUP (port, mode)`** is shorthand for the levels from detail up to total: `(port, mode)`, `(port)`, `()`. **`CUBE (port, mode)`** is every combination: it adds `(mode)` too. These are the operations of a data cube in OLAP.

Since subtotal rows use NULL, a real NULL in the data looks the same. **`GROUPING(col)`** returns 1 when the row has rolled up over that column, 0 when not; with several columns it returns a binary number, the first column being the high bit.

## Syntax

```sql
SELECT port, mode, sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode);
```

- `GROUPING SETS ((a), (b), ())`: exactly the groupings listed.
- `ROLLUP (a, b)` = `(a, b)`, `(a)`, `()`; `CUBE (a, b)` adds `(b)`.
- `GROUPING(a, b)`: 0 is a detail row, 3 is the grand total.

## Example

A subtotal per port and the grand total, totals sorted last.

```sql
SELECT port, mode, sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode)
ORDER BY port NULLS LAST,
  mode NULLS LAST;
```

Two total levels written by hand with `UNION ALL`: each level is one more scan of the table.

```sql
SELECT port, NULL AS mode,
  sum(teu) AS teu
FROM moves GROUP BY port
UNION ALL
SELECT NULL, NULL, sum(teu)
FROM moves;
```

## Common mistakes

Turning NULL into text with `coalesce`: shipments with no mode are called totals too.

```sql
-- WRONG: real NULLs look like totals
SELECT port,
  coalesce(mode, 'all') AS mode,
  sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode);
```

```sql
-- FIX: GROUPING() marks the totals
SELECT port,
  CASE WHEN GROUPING(mode) = 1
    THEN 'all'
    ELSE coalesce(mode, '?')
  END AS mode,
  sum(teu) AS teu
FROM moves
GROUP BY ROLLUP (port, mode);
```

Selecting a column that is in no grouping.

```sql
-- ERROR 42803: mode not grouped
SELECT port, mode, sum(teu)
FROM moves
GROUP BY ROLLUP (port);
```

## Practice

Three steps: `ROLLUP` by port then mode, `CUBE` with a `lvl` column, then `GROUPING SETS` with only two totals.

## Recap

- `GROUPING SETS` computes several groupings in one query, scanning the table once.
- `ROLLUP` goes from detail up to the grand total; `CUBE` takes every combination.
- A subtotal row has NULL in the rolled-up column; `GROUPING()` tells it from a real NULL.
- Add `ORDER BY` if the totals must come last.
