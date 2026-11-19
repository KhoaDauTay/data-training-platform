---
id: e-pg-l2-09
engine: postgres
level: L2
module: index-types
title: Bloom cho lọc tổ hợp cột bất kỳ
title_en: Bloom for filters on any combination of columns
kind: lab
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Dùng một index bloom thay cho nhiều B-tree khi người dùng lọc bằng dấu bằng trên tổ hợp cột bất kỳ.
    en: Use one bloom index instead of many B-trees when users filter by equality on any combination of columns.
  - vi: Biết bloom là index "thô" (có dương tính giả), chỉ phục vụ `=` và không làm unique.
    en: Know bloom is lossy (false positives), serves only `=` and cannot enforce uniqueness.
requires: [e-pg-l2-08]
sources:
  - https://www.postgresql.org/docs/18/bloom.html
  - https://www.postgresql.org/docs/18/indexes-types.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS bloom;
    CREATE TABLE items (
      id int PRIMARY KEY,
      a int NOT NULL, b int NOT NULL, c int NOT NULL,
      d int NOT NULL, e int NOT NULL, f int NOT NULL
    );
    SELECT setseed(0.3);
    INSERT INTO items
    SELECT g, (random() * 99)::int, (random() * 99)::int, (random() * 99)::int,
              (random() * 99)::int, (random() * 99)::int, (random() * 99)::int
    FROM generate_series(1, 30000) AS g;
    ANALYZE items;
  steps:
    - task:
        vi: "Tạo index bloom tên `items_bloom_idx` trên cả sáu cột `a, b, c, d, e, f`."
        en: "Create a bloom index named `items_bloom_idx` on all six columns `a, b, c, d, e, f`."
      solution: CREATE INDEX items_bloom_idx ON items USING bloom (a, b, c, d, e, f)
      target: SELECT id FROM items WHERE c = 7 AND e = 3
      check: catalog
      hint:
        vi: "`USING bloom (a, b, c, d, e, f)`; extension `bloom` đã được bật."
        en: "`USING bloom (a, b, c, d, e, f)`; the `bloom` extension is already enabled."
    - task:
        vi: "Lấy `id` các dòng có `b = 50` và `f = 20`. Kế hoạch phải dùng `items_bloom_idx`."
        en: "Return the `id` of rows with `b = 50` and `f = 20`. The plan must use `items_bloom_idx`."
      solution: SELECT id FROM items WHERE b = 50 AND f = 20
      check: plan
      hint:
        vi: Hai điều kiện bằng nối bằng `AND`, trên hai cột bất kỳ của index.
        en: Two equalities joined by `AND`, on any two columns of the index.
---
## Ý chính

Bảng có sáu cột và người dùng lọc theo bất kỳ tổ hợp nào (`c = 7 AND e = 3`, `b = 50 AND f = 20`...). Phủ mọi tổ hợp bằng B-tree nhiều cột cần rất nhiều index, và mỗi index làm mọi lần ghi chậm thêm.

Index bloom (extension `bloom`) lưu cho mỗi dòng một "chữ ký" bit: mỗi cột bật vài bit (mặc định chữ ký 80 bit, 2 bit mỗi cột). Khi tìm, Postgres dựng chữ ký của điều kiện rồi đọc toàn bộ index (nhỏ) để tìm dòng có đủ các bit đó.

- Một index phục vụ mọi tổ hợp cột, chỉ với `=`.
- Thô: vài dòng không khớp vẫn lọt qua (dương tính giả), nên kế hoạch luôn có `Recheck Cond`.
- Không unique, không tìm `IS NULL`; opclass có sẵn cho `int4` và `text`.

## Ví dụ

```sql
SELECT count(*) AS matches FROM items WHERE c = 7 AND e = 3;
```

Không cần index, câu vẫn đúng; index chỉ đổi cách đọc, không đổi kết quả.

## Thực hành

Tạo một index bloom trên sáu cột, rồi chứng minh nó phục vụ một tổ hợp cột mà không cần B-tree riêng.

# EN

## Key idea

A table has six columns and users filter on any combination (`c = 7 AND e = 3`, `b = 50 AND f = 20`...). Covering every combination with multicolumn B-trees takes a great many indexes, and every index makes every write slower.

A bloom index (extension `bloom`) stores a bit "signature" per row: each column turns on a few bits (by default an 80-bit signature, 2 bits per column). To search, Postgres builds the signature of the condition and reads the whole (small) index for rows with all those bits set.

- One index serves every column combination, for `=` only.
- Lossy: a few non-matching rows slip through (false positives), so the plan always has a `Recheck Cond`.
- No uniqueness, no `IS NULL` search; built-in opclasses exist for `int4` and `text`.

## Example

```sql
SELECT count(*) AS matches FROM items WHERE c = 7 AND e = 3;
```

The query is correct without any index; an index only changes how rows are read, never the result.

## Practice

Create one bloom index on six columns, then prove it serves a column combination without a dedicated B-tree.
