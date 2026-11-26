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
    why: { vi: "GiST nghe hợp lý vì nó phục vụ được truy vấn khoảng, nhưng GiST (như B-tree) giữ một mục index cho mỗi dòng: 2 tỉ mục, tốn rất nhiều đĩa. Hash chỉ trả lời phép bằng, không trả lời khoảng. GIN dành cho giá trị nhiều thành phần (mảng, `jsonb`, văn bản), không phải một mốc thời gian. Bảng chỉ chèn thêm nên thời gian tăng đúng theo thứ tự ghi (correlation ≈ 1). BRIN chỉ lưu min/max cho mỗi khoảng trang, nên nhỏ hơn B-tree hàng trăm lần mà vẫn bỏ qua gần hết các khoảng. Nhớ giữ tóm tắt mới (VACUUM hoặc `autosummarize`).", en: "GiST sounds right because it can serve range queries, but GiST (like a B-tree) keeps one index entry per row: 2 billion entries, a lot of disk. Hash only answers equality, not ranges. GIN is for multi-part values (arrays, `jsonb`, text), not a single timestamp. The table is append-only, so time grows exactly in write order (correlation ≈ 1). A BRIN stores only min/max per page range, so it is hundreds of times smaller than a B-tree and still skips almost every range. Keep summaries fresh (VACUUM or `autosummarize`)." }
  - q: { vi: "Tìm sản phẩm theo tên gõ sai hoặc một phần: `name ILIKE '%ao khoac%'`. Chọn gì?", en: "Search products by a misspelled or partial name: `name ILIKE '%ao khoac%'`. What do you choose?" }
    options:
      - { vi: "B-tree trên `name`", en: "A B-tree on `name`" }
      - { vi: "GIN với `gin_trgm_ops` (extension `pg_trgm`)", en: "GIN with `gin_trgm_ops` (the `pg_trgm` extension)" }
      - { vi: "Hash trên `name`", en: "A Hash on `name`" }
      - { vi: "BRIN trên `name`", en: "A BRIN on `name`" }
    answer: 1
    trap: 0
    why: { vi: "B-tree nghe hợp lý vì là loại index mặc định, nhưng B-tree chỉ giúp `LIKE` khi mẫu bắt đầu bằng một tiền tố cố định; mẫu `%…%` có thể khớp ở giữa chuỗi, nên B-tree không biết bắt đầu đọc từ đâu. Hash chỉ trả lời phép bằng nguyên chuỗi. BRIN chỉ hợp cột có thứ tự theo vị trí ghi, tên sản phẩm thì không. GIN với `gin_trgm_ops` tách chuỗi thành các cụm 3 ký tự (trigram), nên tìm được chuỗi con ở bất kỳ đâu, cả `ILIKE` lẫn tên gõ sai gần đúng.", en: "A B-tree sounds right because it is the default index type, but a B-tree only helps `LIKE` when the pattern starts with a fixed prefix; the pattern `%…%` can match in the middle of the string, so a B-tree does not know where to start reading. Hash only answers equality on the whole string. BRIN only suits columns ordered by write position, and product names are not. GIN with `gin_trgm_ops` splits strings into 3-character groups (trigrams), so it finds a substring anywhere, including `ILIKE` and near-miss typos." }
  - q: { vi: "Cột `attrs jsonb`, truy vấn `attrs @> '{\"color\":\"red\"}'`. Chọn gì?", en: "Column `attrs jsonb`, query `attrs @> '{\"color\":\"red\"}'`. What do you choose?" }
    options:
      - { vi: "GIN `jsonb_path_ops`", en: "GIN `jsonb_path_ops`" }
      - { vi: "B-tree trên `attrs`", en: "A B-tree on `attrs`" }
      - { vi: "SP-GiST", en: "SP-GiST" }
      - { vi: "BRIN", en: "BRIN" }
    answer: 0
    trap: 1
    why: { vi: "B-tree nghe hợp lý vì xử lý được phép bằng, nhưng `@>` hỏi \"giá trị này có chứa cặp màu đỏ không\", còn B-tree chỉ so nguyên giá trị `attrs` với nhau. SP-GiST (chia không gian) và BRIN (tóm tắt theo khoảng trang) không có cách trả lời `@>` trên `jsonb`. GIN là index đảo (inverted index): mỗi thành phần bên trong giá trị trỏ tới danh sách các dòng chứa nó, đúng thứ `@>` cần. `jsonb_path_ops` nhỏ và nhanh cho `@>`; dùng `jsonb_ops` nếu cần thêm `?`, `?|`, `?&`.", en: "A B-tree sounds right because it handles equality, but `@>` asks \"does this value contain the red colour pair?\", while a B-tree only compares whole `attrs` values. SP-GiST (space partitioning) and BRIN (per-page-range summaries) have no way to answer `@>` on `jsonb`. GIN is an inverted index: each part inside a value points to the list of rows that contain it, which is exactly what `@>` needs. `jsonb_path_ops` is small and fast for `@>`; use `jsonb_ops` when you also need `?`, `?|`, `?&`." }
  - q: { vi: "\"10 cửa hàng gần tôi nhất\" trên cột `point`. Chọn gì?", en: "\"The 10 stores nearest to me\" on a `point` column. What do you choose?" }
    options:
      - { vi: "GiST (hoặc SP-GiST) với `ORDER BY loc <-> … LIMIT 10`", en: "GiST (or SP-GiST) with `ORDER BY loc <-> … LIMIT 10`" }
      - { vi: "B-tree trên `(loc[0], loc[1])`", en: "A B-tree on `(loc[0], loc[1])`" }
      - { vi: "Hash", en: "Hash" }
      - { vi: "GIN", en: "GIN" }
    answer: 0
    trap: 1
    why: { vi: "B-tree hai cột nghe hợp lý vì lọc được từng trục, nhưng nó sắp theo trục x trước rồi mới tới y: hai cửa hàng gần nhau theo x có thể rất xa nhau theo y. \"Gần nhất\" là khoảng cách, không phải thứ tự từng trục. Hash và GIN không có toán tử khoảng cách. GiST và SP-GiST hỗ trợ `<->` trong ORDER BY: index trả dòng theo khoảng cách tăng dần (tìm KNN, k láng giềng gần nhất), nên `LIMIT 10` dừng sau 10 dòng mà không đọc hết bảng.", en: "A two-column B-tree sounds right because it can filter each axis, but it sorts by x first and only then by y: two stores close on x can be far apart on y. \"Nearest\" is about distance, not the order of each axis. Hash and GIN have no distance operator. GiST and SP-GiST support `<->` in ORDER BY: the index returns rows by increasing distance (a KNN, k-nearest-neighbour, search), so `LIMIT 10` stops after 10 rows without reading the whole table." }
  - q: { vi: "Bảng 12 cột, người dùng lọc bằng bất kỳ tổ hợp nào của 8 cột, luôn bằng dấu bằng; không thể tạo 8! index. Chọn gì để thử?", en: "A 12-column table; users filter on any combination of 8 columns, always with equality; you cannot create 8! indexes. What do you try?" }
    options:
      - { vi: "Một index `bloom` trên 8 cột", en: "One `bloom` index on the 8 columns" }
      - { vi: "Một B-tree 8 cột", en: "One 8-column B-tree" }
      - { vi: "8 index Hash", en: "8 Hash indexes" }
      - { vi: "BRIN 8 cột", en: "An 8-column BRIN" }
    answer: 0
    why: { vi: "B-tree 8 cột chỉ hiệu quả khi có điều kiện trên cột đầu (và các cột liền sau); lọc riêng cột thứ năm thì gần như phải đọc cả index. 8 index Hash phục vụ mỗi cái một cột, tốn chỗ nhiều lần hơn và phải ghép bằng BitmapAnd. BRIN chỉ hợp cột có thứ tự theo vị trí ghi. Bloom lưu cho mỗi dòng một chữ ký bit nhỏ tạo từ cả 8 cột, nên một index trả lời được mọi tổ hợp điều kiện `=`. Đổi lại nó lossy: chữ ký có thể khớp nhầm, nên Postgres phải kiểm lại dòng trong bảng (recheck), và nó chỉ hỗ trợ `=`.", en: "An 8-column B-tree is only effective when the leading column (and the ones right after it) is constrained; a filter on the fifth column alone reads almost the whole index. 8 Hash indexes each serve one column, take several times the space and must be combined with a BitmapAnd. BRIN only suits columns ordered by write position. Bloom stores a small bit signature per row built from all 8 columns, so one index answers any combination of `=` conditions. The cost: it is lossy, a signature can match by mistake, so Postgres rechecks the row in the table, and it supports only `=`." }
  - q: { vi: "AM nào hỗ trợ cả UNIQUE, `INCLUDE` và index-only scan?", en: "Which access method supports UNIQUE, `INCLUDE` and index-only scans together?" }
    options:
      - { vi: "B-tree", en: "B-tree" }
      - { vi: "GIN", en: "GIN" }
      - { vi: "BRIN", en: "BRIN" }
      - { vi: "Hash", en: "Hash" }
    answer: 0
    trap: 3
    why: { vi: "Hash nghe hợp lý vì vốn chỉ trả lời phép bằng, đúng thứ UNIQUE cần, nhưng Hash không làm được UNIQUE: ví dụ của bài đọc catalog và chỉ `btree` có `can_unique`. `INCLUDE` có ở B-tree, GiST, SP-GiST, không có ở GIN, BRIN hay Hash. GIN không bao giờ cho index-only scan (đọc chỉ index, không vào bảng) vì không giữ lại nguyên giá trị; BRIN là lossy nên luôn phải đọc bảng. Chỉ B-tree có cả ba.", en: "Hash sounds right because it only answers equality anyway, which is what UNIQUE needs, but Hash cannot do UNIQUE: the lesson's example reads the catalog and only `btree` has `can_unique`. `INCLUDE` exists for B-tree, GiST and SP-GiST, not for GIN, BRIN or Hash. GIN never gives an index-only scan (reading the index without the table) because it does not keep whole values; BRIN is lossy, so it always reads the table. Only B-tree has all three." }
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
