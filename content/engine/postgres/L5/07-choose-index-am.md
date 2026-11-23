---
id: e-pg-l5-07
engine: postgres
level: L5
module: index-internals
title: "Chọn loại index (access method)"
title_en: "Choosing an index access method"
kind: quiz
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Chọn B-tree, Hash, GIN, GiST, SP-GiST, BRIN hay bloom từ kiểu dữ liệu, toán tử và mẫu ghi", en: "Choose B-tree, Hash, GIN, GiST, SP-GiST, BRIN or bloom from the data type, operators and write pattern" }
  - { vi: "Biết AM nào hỗ trợ UNIQUE, nhiều cột, `INCLUDE`, index-only scan và KNN", en: "Know which access methods support UNIQUE, multiple columns, `INCLUDE`, index-only scans and KNN" }
requires: [e-pg-l5-01, e-pg-l5-04, e-pg-l5-05, e-pg-l5-06]
sources:
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
  - https://www.postgresql.org/docs/18/indexes-index-only-scans.html
  - https://www.postgresql.org/docs/18/bloom.html
  - https://www.postgresql.org/docs/18/textsearch-indexes.html
viz: pg-plan-tree
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE TABLE docs (id int PRIMARY KEY, title text NOT NULL);
    INSERT INTO docs SELECT g, md5(g::text) FROM generate_series(1, 20000) AS g;
    ANALYZE docs;
  steps:
    - task:
        vi: "Người dùng tìm tiêu đề chứa một chuỗi ở bất kỳ đâu (`title LIKE '%abc1%'`); B-tree không giúp được. Tạo index tên `docs_title_trgm` hợp với truy vấn này: GIN với opclass trigram."
        en: "Users search for titles that contain a string anywhere (`title LIKE '%abc1%'`); a B-tree cannot help. Create an index named `docs_title_trgm` that fits this query: GIN with the trigram opclass."
      solution: CREATE INDEX docs_title_trgm ON docs USING gin (title gin_trgm_ops)
      check: catalog
      hint:
        vi: "`USING gin`, và opclass `gin_trgm_ops` đặt ngay sau tên cột."
        en: "`USING gin`, with the opclass `gin_trgm_ops` right after the column name."
    - task:
        vi: "Chạy truy vấn tìm kiếm: `id` của các tiêu đề chứa `abc1`. Kế hoạch phải đọc index vừa tạo."
        en: "Run the search: the `id` of titles that contain `abc1`. The plan must read the index you just created."
      solution: SELECT id FROM docs WHERE title LIKE '%abc1%'
      check: plan
      hint:
        vi: "`LIKE` với `%` ở cả hai đầu chuỗi."
        en: "`LIKE` with `%` at both ends of the string."
quiz:
  - q: { vi: "Bảng log 2 tỉ dòng, chỉ chèn thêm, truy vấn luôn là \"khoảng thời gian X đến Y\". Ổ đĩa đắt. Chọn gì cho cột thời gian?", en: "A 2-billion-row append-only log table; queries are always \"time range X to Y\". Disk is expensive. What goes on the timestamp column?" }
    options:
      - { vi: "BRIN", en: "BRIN" }
      - { vi: "Hash", en: "Hash" }
      - { vi: "GIN", en: "GIN" }
      - { vi: "GiST", en: "GiST" }
    answer: 0
    trap: 3
    why: { vi: "Nghe hợp lý vì truy vấn luôn là một khoảng, nhưng GiST vẫn giữ một mục cho mỗi dòng, quá tốn với 2 tỉ dòng. Thời gian chèn tăng dần nên correlation ≈ 1; BRIN nhỏ hơn B-tree hàng trăm lần và loại được gần hết khoảng khối. Nhớ giữ tóm tắt mới (VACUUM hoặc `autosummarize`).", en: "It sounds right because the query is always a range, but GiST still keeps one entry per row, too costly for 2 billion rows. Insert time grows, so correlation ≈ 1; BRIN is hundreds of times smaller than a B-tree and rules out almost every block range. Keep summaries fresh (VACUUM or `autosummarize`)." }
  - q: { vi: "Tìm sản phẩm theo tên gõ sai hoặc một phần: `name ILIKE '%ao khoac%'`. Chọn gì?", en: "Search products by a misspelled or partial name: `name ILIKE '%ao khoac%'`. What do you choose?" }
    options:
      - { vi: "B-tree trên `name`", en: "A B-tree on `name`" }
      - { vi: "GIN với `gin_trgm_ops` (extension `pg_trgm`)", en: "GIN with `gin_trgm_ops` (the `pg_trgm` extension)" }
      - { vi: "Hash trên `name`", en: "A Hash on `name`" }
      - { vi: "BRIN trên `name`", en: "A BRIN on `name`" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì B-tree là loại index mặc định, nhưng mẫu `%…%` không có tiền tố cố định. B-tree chỉ giúp `LIKE` khi mẫu có tiền tố cố định (và collation C hoặc opclass pattern). Trigram tách chuỗi thành bộ ba ký tự nên phục vụ `%…%`, `ILIKE` và độ tương tự.", en: "It sounds right because B-tree is the default index type, but the pattern `%…%` has no fixed prefix. A B-tree only helps `LIKE` when the pattern has a fixed prefix (and a C collation or pattern opclass). Trigrams split strings into three-character pieces, so they serve `%…%`, `ILIKE` and similarity." }
  - q: { vi: "Cột `attrs jsonb`, truy vấn `attrs @> '{\"color\":\"red\"}'`. Chọn gì?", en: "Column `attrs jsonb`, query `attrs @> '{\"color\":\"red\"}'`. What do you choose?" }
    options:
      - { vi: "GIN `jsonb_path_ops`", en: "GIN `jsonb_path_ops`" }
      - { vi: "B-tree trên `attrs`", en: "A B-tree on `attrs`" }
      - { vi: "SP-GiST", en: "SP-GiST" }
      - { vi: "BRIN", en: "BRIN" }
    answer: 0
    trap: 1
    why: { vi: "Nghe hợp lý vì B-tree xử lý được phép so sánh bằng, nhưng `@>` hỏi về chứa đựng, không phải bằng nhau. GIN là index đảo cho giá trị nhiều thành phần. `jsonb_path_ops` nhỏ và nhanh cho `@>`; dùng `jsonb_ops` nếu cần thêm `?`, `?|`, `?&`.", en: "It sounds right because a B-tree handles equality, but `@>` asks about containment, not equality. GIN is the inverted index for multi-part values. `jsonb_path_ops` is small and fast for `@>`; use `jsonb_ops` when you also need `?`, `?|`, `?&`." }
  - q: { vi: "\"10 cửa hàng gần tôi nhất\" trên cột `point`. Chọn gì?", en: "\"The 10 stores nearest to me\" on a `point` column. What do you choose?" }
    options:
      - { vi: "GiST (hoặc SP-GiST) với `ORDER BY loc <-> … LIMIT 10`", en: "GiST (or SP-GiST) with `ORDER BY loc <-> … LIMIT 10`" }
      - { vi: "B-tree trên `(loc[0], loc[1])`", en: "A B-tree on `(loc[0], loc[1])`" }
      - { vi: "Hash", en: "Hash" }
      - { vi: "GIN", en: "GIN" }
    answer: 0
    trap: 1
    why: { vi: "Nghe hợp lý vì B-tree hai cột lọc được từng trục, nhưng gần nhất là chuyện khoảng cách, không phải thứ tự từng trục. Chỉ AM có toán tử khoảng cách (GiST, SP-GiST) trả về theo thứ tự gần nhất mà không đọc hết.", en: "It sounds right because a two-column B-tree can filter each axis, but nearest is about distance, not the order of each axis. Only access methods with a distance operator (GiST, SP-GiST) return rows nearest-first without reading everything." }
  - q: { vi: "Bảng 12 cột, người dùng lọc bằng bất kỳ tổ hợp nào của 8 cột, luôn bằng dấu bằng; không thể tạo 8! index. Chọn gì để thử?", en: "A 12-column table; users filter on any combination of 8 columns, always with equality; you cannot create 8! indexes. What do you try?" }
    options:
      - { vi: "Một index `bloom` trên 8 cột", en: "One `bloom` index on the 8 columns" }
      - { vi: "Một B-tree 8 cột", en: "One 8-column B-tree" }
      - { vi: "8 index Hash", en: "8 Hash indexes" }
      - { vi: "BRIN 8 cột", en: "An 8-column BRIN" }
    answer: 0
    why: { vi: "Bloom lưu một chữ ký mỗi dòng, trả lời mọi tổ hợp điều kiện bằng với một index, đổi lại là lossy (phải recheck) và chỉ hỗ trợ `=`. B-tree nhiều cột chủ yếu hiệu quả khi có điều kiện trên cột đầu. Các index một cột ghép bằng BitmapAnd cũng dùng được, nhưng tốn chỗ hơn.", en: "Bloom stores one signature per row and answers any combination of equality conditions with one index, at the cost of being lossy (rechecks) and supporting only `=`. A multicolumn B-tree is mostly effective when the leading column is constrained. Single-column indexes combined by BitmapAnd also work, but take more space." }
  - q: { vi: "AM nào hỗ trợ cả UNIQUE, `INCLUDE` và index-only scan?", en: "Which access method supports UNIQUE, `INCLUDE` and index-only scans together?" }
    options:
      - { vi: "B-tree", en: "B-tree" }
      - { vi: "GIN", en: "GIN" }
      - { vi: "BRIN", en: "BRIN" }
      - { vi: "Hash", en: "Hash" }
    answer: 0
    trap: 3
    why: { vi: "Nghe hợp lý vì Hash vốn chỉ trả lời câu hỏi bằng nhau, nhưng Hash không làm được UNIQUE. Ví dụ của bài đọc từ catalog: chỉ `btree` có `can_unique`; `INCLUDE` có ở B-tree, GiST, SP-GiST. GIN không bao giờ index-only scan; BRIN là lossy.", en: "It sounds right because Hash only answers equality questions anyway, but Hash cannot do UNIQUE. The lesson's example reads the catalog: only `btree` has `can_unique`; `INCLUDE` exists for B-tree, GiST and SP-GiST. GIN never does index-only scans; BRIN is lossy." }
---

## Mở bài

Một câu truy vấn chậm, và phản xạ đầu tiên là "thêm index". Nhưng index loại nào? Chọn sai loại thì index vẫn được tạo, chiếm chỗ, làm ghi chậm đi, mà planner không bao giờ dùng.

## Ý chính

Nhiều người nghĩ cứ thêm B-tree là truy vấn nào cũng nhanh. Thật ra mỗi access method (AM) chỉ phục vụ một nhóm toán tử: planner chỉ dùng index khi toán tử trong WHERE hay ORDER BY thuộc opclass của nó. Bảng dưới: toán tử · mạnh ở · lưu ý.

- B-tree: `<` `<=` `=` `>=` `>`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'abc%'` · mặc định; UNIQUE; sắp xếp; index-only · luật cột đầu (18 có skip scan)
- Hash: chỉ `=` · khóa dài, chỉ so bằng · không UNIQUE, một cột
- GIN: `@>` `<@` `&&` `?` `@@` · mảng, `jsonb`, full-text, trigram · ghi chậm hơn (pending list); không index-only

- GiST: `&&` `<@` `@>` `<->` … · hình học, range, exclusion constraint, KNN · lossy với nhiều opclass
- SP-GiST: như GiST cho điểm/chuỗi · dữ liệu phân bố lệch, quadtree, radix · một cột, không cân bằng
- BRIN: `<` `=` `>` (minmax) · bảng cực lớn, dữ liệu theo thứ tự chèn · lossy, cần correlation cao
- bloom: `=` · lọc bằng trên nhiều tổ hợp cột · extension, lossy, không UNIQUE

Quy trình: liệt kê truy vấn và toán tử thật; xem kiểu dữ liệu và phân bố (`pg_stats`, correlation); xem mẫu ghi (chỉ chèn hay cập nhật nhiều); chọn AM và opclass; kiểm bằng EXPLAIN trên dữ liệu thật, rồi đo kích thước và chi phí ghi.

## Ví dụ

Catalog trả lời AM nào làm được gì:

```sql
CREATE EXTENSION IF NOT EXISTS bloom;
SELECT amname,
  pg_indexam_has_property(oid, 'can_unique') AS can_unique,
  pg_indexam_has_property(oid, 'can_multi_col') AS multi_col,
  pg_indexam_has_property(oid, 'can_include') AS can_include,
  pg_indexam_has_property(oid, 'can_exclude') AS can_exclude
FROM pg_am WHERE amtype = 'i' ORDER BY amname;
```

Chỉ `btree` có `can_unique`; `hash` và `spgist` chỉ một cột; `can_exclude` (dùng được cho exclusion constraint) có ở btree, hash, gist, spgist.

B-tree với opclass pattern giúp `LIKE` có tiền tố, nhưng không giúp mẫu `%…%`:

```sql
CREATE INDEX docs_title_prefix ON docs (title text_pattern_ops);
EXPLAIN (COSTS OFF) SELECT id FROM docs WHERE title LIKE 'abc1%';
```

```sql
EXPLAIN (COSTS OFF) SELECT id FROM docs WHERE title LIKE '%abc1%';
```

Câu đầu là `Index Scan using docs_title_prefix`; câu sau là `Seq Scan`, vì không có tiền tố để B-tree bắt đầu. Lab cho bạn chọn index đúng cho câu sau.

## Thực hành

Hai bước: tạo index hợp với tìm chuỗi ở giữa, rồi kiểm kế hoạch dùng nó. Sau đó sáu tình huống chọn AM.

## Tóm tắt

- Planner chỉ dùng index khi toán tử của truy vấn thuộc opclass của nó.
- B-tree cho so sánh, sắp xếp, UNIQUE; Hash chỉ `=`.
- GIN cho giá trị nhiều thành phần; GiST và SP-GiST cho hình học, range, KNN; BRIN cho bảng lớn theo thứ tự chèn.
- Đọc khả năng của AM bằng `pg_indexam_has_property`, rồi kiểm bằng EXPLAIN trên dữ liệu thật.

# EN

## Opening

A query is slow, and the first reflex is "add an index". But which kind? Pick the wrong kind and the index is still built, takes space, slows writes, and the planner never uses it.

## Key idea

Many people think adding a B-tree makes any query fast. In fact each access method (AM) only serves a group of operators: the planner uses an index only when the operator in WHERE or ORDER BY belongs to its opclass. The table below: operators · strong at · watch out.

- B-tree: `<` `<=` `=` `>=` `>`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'abc%'` · the default; UNIQUE; ordering; index-only · leading-column rule (18 adds skip scan)
- Hash: `=` only · long keys, equality only · no UNIQUE, one column
- GIN: `@>` `<@` `&&` `?` `@@` · arrays, `jsonb`, full text, trigrams · slower writes (pending list); no index-only

- GiST: `&&` `<@` `@>` `<->` … · geometry, ranges, exclusion constraints, KNN · lossy for many opclasses
- SP-GiST: like GiST for points/strings · skewed data, quadtrees, radix trees · one column, unbalanced
- BRIN: `<` `=` `>` (minmax) · huge tables, data in insert order · lossy, needs high correlation
- bloom: `=` · equality filters over many column combinations · an extension, lossy, no UNIQUE

The routine: list the real queries and operators; look at the data type and distribution (`pg_stats`, correlation); look at the write pattern (append-only or update-heavy); pick the AM and opclass; check with EXPLAIN on real data, then measure size and write cost.

## Example

The catalog says what each AM can do:

```sql
CREATE EXTENSION IF NOT EXISTS bloom;
SELECT amname,
  pg_indexam_has_property(oid, 'can_unique') AS can_unique,
  pg_indexam_has_property(oid, 'can_multi_col') AS multi_col,
  pg_indexam_has_property(oid, 'can_include') AS can_include,
  pg_indexam_has_property(oid, 'can_exclude') AS can_exclude
FROM pg_am WHERE amtype = 'i' ORDER BY amname;
```

Only `btree` has `can_unique`; `hash` and `spgist` take one column; `can_exclude` (usable in an exclusion constraint) holds for btree, hash, gist and spgist.

A B-tree with a pattern opclass helps a `LIKE` with a prefix, but not the pattern `%…%`:

```sql
CREATE INDEX docs_title_prefix ON docs (title text_pattern_ops);
EXPLAIN (COSTS OFF) SELECT id FROM docs WHERE title LIKE 'abc1%';
```

```sql
EXPLAIN (COSTS OFF) SELECT id FROM docs WHERE title LIKE '%abc1%';
```

The first is an `Index Scan using docs_title_prefix`; the second a `Seq Scan`, because there is no prefix for the B-tree to start from. The lab has you pick the right index for the second.

## Practice

Two steps: create an index that fits a search inside strings, then check that the plan uses it. Then six scenarios to pick an AM.

## Recap

- The planner uses an index only when the query's operator belongs to its opclass.
- B-tree for comparisons, ordering and UNIQUE; Hash for `=` only.
- GIN for multi-part values; GiST and SP-GiST for geometry, ranges and KNN; BRIN for big tables in insert order.
- Read what an AM can do with `pg_indexam_has_property`, then check with EXPLAIN on real data.
