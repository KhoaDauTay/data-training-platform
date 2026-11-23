---
id: e-pg-l2-09
engine: postgres
level: L2
module: index-types
title: Bloom cho lọc tổ hợp cột bất kỳ
title_en: Bloom for filters on any combination of columns
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Dùng một index bloom thay cho nhiều B-tree khi người dùng lọc bằng dấu bằng trên tổ hợp cột bất kỳ.
    en: Use one bloom index instead of many B-trees when users filter by equality on any combination of columns.
  - vi: Biết bloom là index "thô" (có dương tính giả), chỉ phục vụ `=` và không làm unique.
    en: Know bloom is lossy (false positives), serves only `=` and cannot enforce uniqueness.
  - vi: Đọc `Rows Removed by Index Recheck` để thấy dương tính giả trong kế hoạch thật.
    en: Read `Rows Removed by Index Recheck` to see the false positives in a real plan.
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
    - task:
        vi: "Ô lọc gửi lên `a` là 10 và `d` là 40. Lấy `id` các dòng khớp. Bài chấm cả tốc độ: đúng mà không dùng được `items_bloom_idx` là chưa đạt."
        en: "The filter form sends `a` = 10 and `d` = 40. Return the `id` of the matching rows. Speed is graded too: a right answer that cannot use `items_bloom_idx` does not pass."
      solution: SELECT id FROM items WHERE a = 10 AND d = 40
      check: rows
      perf: { table: items }
      slow: SELECT id FROM items WHERE a::text = '10' AND d::text = '40'
      hint:
        vi: "So thẳng cột với số; ép cột sang `text` thì bloom không còn dùng được."
        en: "Compare the columns themselves with numbers; casting a column to `text` stops bloom from being used."
quiz:
  - q:
      vi: "Index bloom phủ cả sáu cột. Câu `WHERE c < 3 AND e = 3` đọc thế nào?"
      en: "A bloom index covers all six columns. How is `WHERE c < 3 AND e = 3` read?"
    options:
      - { vi: "Qua index bloom, vì bloom phục vụ mọi tổ hợp cột", en: "Through the bloom index, since bloom serves any column combination" }
      - { vi: "Seq Scan: bloom chỉ hiểu `=`, còn `c < 3` là một khoảng", en: "Seq Scan: bloom only understands `=`, and `c < 3` is a range" }
      - { vi: "Index Only Scan qua index bloom", en: "Index Only Scan through the bloom index" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì bloom nổi tiếng là phục vụ tổ hợp cột bất kỳ, nhưng chỉ với dấu bằng. Chữ ký bit được dựng từ mã băm của từng giá trị, nên không biết giá trị nào nhỏ hơn giá trị nào. Planner Seq Scan; cần lọc khoảng thì phải có B-tree."
      en: "It sounds right because bloom is known for serving any column combination, but only with equality. The bit signature is built from hashes of each value, so it cannot tell which value is smaller. The planner does a Seq Scan; a range filter needs a B-tree."
  - q:
      vi: "Vì sao kế hoạch dùng index bloom luôn có `Recheck Cond`?"
      en: "Why does a plan using a bloom index always show `Recheck Cond`?"
    options:
      - { vi: "Vì thống kê của bảng đã cũ", en: "Because the table statistics are stale" }
      - { vi: "Vì chữ ký có thể khớp cả dòng không thỏa điều kiện (dương tính giả), nên mỗi dòng phải được kiểm lại", en: "Because a signature can also match rows that do not satisfy the condition (false positives), so each row is checked again" }
      - { vi: "Vì bloom nén dòng và phải giải nén", en: "Because bloom compresses rows and must decompress them" }
    answer: 1
    why:
      vi: "Nhiều giá trị khác nhau có thể bật cùng các bit, nên index chỉ nói \"có thể khớp\". Bitmap Heap Scan đọc các dòng ứng viên và kiểm lại điều kiện thật; `Rows Removed by Index Recheck` đếm số dòng bị loại."
      en: "Different values can turn on the same bits, so the index only says \"may match\". The Bitmap Heap Scan reads the candidate rows and checks the real condition; `Rows Removed by Index Recheck` counts the rows dropped."
---
## Mở bài

Màn hình tra kho có sáu ô lọc, và người dùng điền bất kỳ hai ba ô nào. Muốn mọi tổ hợp đều nhanh bằng B-tree nhiều cột thì cần hàng chục index, và mỗi lần ghi phải cập nhật tất cả. Một index bloom phục vụ mọi tổ hợp dấu bằng chỉ với một cấu trúc.

## Ý chính

Phủ mọi tổ hợp bằng B-tree nhiều cột là bất khả: sáu cột đã có 15 cặp, chưa kể bộ ba, và B-tree chỉ thật nhanh khi câu có điều kiện trên cột đầu. Mỗi index thêm vào cũng làm mọi lần ghi chậm thêm.

Index bloom (extension `bloom`) lưu cho mỗi dòng một "chữ ký" bit. Mỗi cột băm giá trị của nó và bật vài bit trong chữ ký; mặc định chữ ký dài 80 bit, mỗi cột bật 2 bit, và cả hai số đều chỉnh được bằng `WITH (length = ..., col1 = ...)`. Khi tìm, Postgres dựng chữ ký của điều kiện rồi đọc toàn bộ index để nhặt các dòng có đủ các bit đó.

Vì nhiều giá trị khác nhau có thể bật trùng bit, bloom là index "thô": vài dòng không khớp vẫn lọt qua (dương tính giả), nên kế hoạch luôn có `Recheck Cond` và Bitmap Heap Scan kiểm lại từng dòng ứng viên. Bloom không bao giờ bỏ sót dòng khớp thật.

Nhiều người nghĩ bloom phục vụ mọi kiểu lọc trên mọi cột. Thật ra nó chỉ hiểu `=`: không khoảng, không `IN`, không `IS NULL`, không unique. Opclass có sẵn chỉ cho `int4` và `text`. Một index bloom cỡ chừng một B-tree hai cột, nhưng thay được cả chục cái.

## Cú pháp

```sql
CREATE EXTENSION IF NOT EXISTS bloom;
CREATE INDEX index_name ON table_name USING bloom ( column [, ...] )
  [ WITH ( length = bits [, col1 = bits_for_first_column, ...] ) ];
```

- `length`: độ dài chữ ký (bit), mặc định 80; dài hơn thì ít dương tính giả hơn nhưng index to hơn.
- `col1`, `col2`...: số bit mỗi cột bật, mặc định 2.
- Chỉ phục vụ `=` nối bằng `AND`, trên bất kỳ tập con nào của các cột.

## Ví dụ

Câu đúng trước đã, chưa cần index:

```sql
SELECT count(*) AS matches FROM items WHERE c = 7 AND e = 3;
```

Có `1` dòng khớp. Index chỉ đổi cách đọc, không đổi kết quả.

```sql
CREATE INDEX demo_bloom ON items USING bloom (a, b, c, d, e, f);
EXPLAIN SELECT id FROM items WHERE c = 7 AND e = 3;
```

Kế hoạch là `Bitmap Index Scan on demo_bloom` với `Index Cond: ((c = 7) AND (e = 3))`, rồi `Bitmap Heap Scan` có `Recheck Cond`.

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id FROM items WHERE b = 20 AND e = 50;
```

Index đưa ra 7 dòng ứng viên; `Rows Removed by Index Recheck: 5` cho thấy 5 dòng là dương tính giả, chỉ 2 dòng khớp thật.

```sql
SELECT pg_size_pretty(pg_relation_size('demo_bloom')) AS bloom,
       pg_size_pretty(pg_relation_size('items')) AS heap;
```

Index `480 kB`, bảng `1768 kB`: một index cho mọi tổ hợp của sáu cột.

## Lỗi hay gặp

Trông chờ bloom lọc khoảng:

```sql
-- WRONG: bloom only serves =, so the range falls back to a Seq Scan
EXPLAIN SELECT id FROM items WHERE c < 3 AND e = 3;
```

```sql
-- FIX: a range needs a B-tree, equality column first
CREATE INDEX demo_e_c ON items (e, c);
EXPLAIN SELECT id FROM items WHERE c < 3 AND e = 3;
```

Câu sai là `Seq Scan on items`; sau khi có B-tree `(e, c)`, cùng câu đó đọc qua `demo_e_c`. Bloom cho các tổ hợp dấu bằng, B-tree cho vài câu khoảng quan trọng.

Dùng bloom để chặn trùng:

```sql
-- ERROR 0A000: access method "bloom" does not support unique indexes
CREATE UNIQUE INDEX demo_bloom_key ON items USING bloom (a, b);
```

Bloom có dương tính giả nên không thể nói chắc hai dòng trùng nhau. Luật unique luôn cần B-tree.

## Thực hành

Bảng `items` có 30.000 dòng, sáu cột số từ 0 đến 99. Tạo một index bloom trên cả sáu cột, chứng minh nó phục vụ một tổ hợp cột không có B-tree riêng, rồi viết câu lọc cho ô tìm kiếm vừa đúng vừa nhanh.

## Tóm tắt

- Một index bloom phục vụ `=` trên mọi tổ hợp cột của nó, thay cho nhiều B-tree.
- Bloom là index thô: có dương tính giả, nên kế hoạch luôn kiểm lại bằng `Recheck Cond`.
- Không khoảng, không `IN`, không unique; opclass có sẵn cho `int4` và `text`.
- So thẳng cột với giá trị; ép kiểu cột thì mất index.

# EN

## Opening

The stock search screen has six filter boxes, and users fill in any two or three of them. Making every combination fast with multicolumn B-trees takes dozens of indexes, and every write must update them all. One bloom index serves every equality combination with a single structure.

## Key idea

Covering every combination with multicolumn B-trees is hopeless: six columns already give 15 pairs, before any triples, and a B-tree is only really fast when the query has a condition on its leading column. Every extra index also makes every write slower.

A bloom index (extension `bloom`) stores a bit "signature" per row. Each column hashes its value and turns on a few bits of the signature; by default the signature is 80 bits long and each column turns on 2 bits, and both numbers can be tuned with `WITH (length = ..., col1 = ...)`. To search, Postgres builds the signature of the condition and reads the whole index to pick the rows with all those bits set.

Because different values can turn on the same bits, bloom is lossy: a few non-matching rows slip through (false positives), so the plan always has a `Recheck Cond` and the Bitmap Heap Scan checks each candidate row again. Bloom never misses a row that truly matches.

Many people think bloom serves any kind of filter on any column. In fact it only understands `=`: no ranges, no `IN`, no `IS NULL`, no uniqueness. Built-in opclasses exist only for `int4` and `text`. One bloom index is about the size of one two-column B-tree, but replaces a dozen of them.

## Syntax

```sql
CREATE EXTENSION IF NOT EXISTS bloom;
CREATE INDEX index_name ON table_name USING bloom ( column [, ...] )
  [ WITH ( length = bits [, col1 = bits_for_first_column, ...] ) ];
```

- `length`: signature length in bits, default 80; longer means fewer false positives but a bigger index.
- `col1`, `col2`...: bits each column turns on, default 2.
- Serves only `=` joined by `AND`, on any subset of the columns.

## Example

First the right answer, no index needed:

```sql
SELECT count(*) AS matches FROM items WHERE c = 7 AND e = 3;
```

There is `1` matching row. An index only changes how rows are read, never the result.

```sql
CREATE INDEX demo_bloom ON items USING bloom (a, b, c, d, e, f);
EXPLAIN SELECT id FROM items WHERE c = 7 AND e = 3;
```

The plan is a `Bitmap Index Scan on demo_bloom` with `Index Cond: ((c = 7) AND (e = 3))`, then a `Bitmap Heap Scan` with a `Recheck Cond`.

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id FROM items WHERE b = 20 AND e = 50;
```

The index hands over 7 candidate rows; `Rows Removed by Index Recheck: 5` shows 5 of them were false positives, and only 2 truly match.

```sql
SELECT pg_size_pretty(pg_relation_size('demo_bloom')) AS bloom,
       pg_size_pretty(pg_relation_size('items')) AS heap;
```

The index is `480 kB`, the table `1768 kB`: one index for every combination of six columns.

## Common mistakes

Expecting bloom to filter a range:

```sql
-- WRONG: bloom only serves =, so the range falls back to a Seq Scan
EXPLAIN SELECT id FROM items WHERE c < 3 AND e = 3;
```

```sql
-- FIX: a range needs a B-tree, equality column first
CREATE INDEX demo_e_c ON items (e, c);
EXPLAIN SELECT id FROM items WHERE c < 3 AND e = 3;
```

The wrong query is a `Seq Scan on items`; once the B-tree on `(e, c)` exists, the same query reads through `demo_e_c`. Bloom for equality combinations, B-trees for the few range queries that matter.

Using bloom to block duplicates:

```sql
-- ERROR 0A000: access method "bloom" does not support unique indexes
CREATE UNIQUE INDEX demo_bloom_key ON items USING bloom (a, b);
```

Bloom has false positives, so it can never say for sure that two rows are equal. A unique rule always needs a B-tree.

## Practice

Table `items` holds 30,000 rows with six number columns from 0 to 99. Create one bloom index on all six columns, prove it serves a column combination with no dedicated B-tree, then write the search-box filter so it is both right and fast.

## Recap

- One bloom index serves `=` on any combination of its columns, instead of many B-trees.
- Bloom is lossy: it has false positives, so the plan always checks again with `Recheck Cond`.
- No ranges, no `IN`, no uniqueness; built-in opclasses exist for `int4` and `text`.
- Compare the columns themselves with values; casting a column loses the index.
