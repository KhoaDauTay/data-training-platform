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
        vi: "`CREATE INDEX docs_title_trgm ON docs USING gin (title gin_trgm_ops)`."
        en: "`CREATE INDEX docs_title_trgm ON docs USING gin (title gin_trgm_ops)`."
    - task:
        vi: "Chạy truy vấn tìm kiếm: `id` của các tiêu đề chứa `abc1`. Kế hoạch phải đọc index vừa tạo."
        en: "Run the search: the `id` of titles that contain `abc1`. The plan must read the index you just created."
      solution: SELECT id FROM docs WHERE title LIKE '%abc1%'
      check: plan
      hint:
        vi: "`SELECT id FROM docs WHERE title LIKE '%abc1%'`."
        en: "`SELECT id FROM docs WHERE title LIKE '%abc1%'`."
quiz:
  - q: { vi: "Bảng log 2 tỉ dòng, chỉ chèn thêm, truy vấn luôn là \"khoảng thời gian X đến Y\". Ổ đĩa đắt. Chọn gì cho cột thời gian?", en: "A 2-billion-row append-only log table; queries are always \"time range X to Y\". Disk is expensive. What goes on the timestamp column?" }
    options:
      - { vi: "BRIN", en: "BRIN" }
      - { vi: "Hash", en: "Hash" }
      - { vi: "GIN", en: "GIN" }
      - { vi: "GiST", en: "GiST" }
    answer: 0
    why: { vi: "GiST nghe hợp vì truy vấn luôn là một khoảng, nhưng nó vẫn giữ một mục cho mỗi dòng, quá tốn với 2 tỉ dòng khi ổ đĩa đắt. Thời gian chèn tăng dần nên correlation ≈ 1; BRIN nhỏ hơn B-tree hàng trăm lần và loại được gần hết khoảng khối. Nhớ giữ tóm tắt mới (VACUUM hoặc `autosummarize`).", en: "GiST sounds right because the query is always a range, but it still keeps one entry per row, too costly for 2 billion rows on expensive disks. Insert time grows, so correlation ≈ 1; BRIN is hundreds of times smaller than a B-tree and rules out almost every block range. Remember to keep summaries fresh (VACUUM or `autosummarize`)." }
  - q: { vi: "Tìm sản phẩm theo tên gõ sai hoặc một phần: `name ILIKE '%ao khoac%'`. Chọn gì?", en: "Search products by a misspelled or partial name: `name ILIKE '%ao khoac%'`. What do you choose?" }
    options:
      - { vi: "B-tree trên `name`", en: "A B-tree on `name`" }
      - { vi: "GIN với `gin_trgm_ops` (extension `pg_trgm`)", en: "GIN with `gin_trgm_ops` (the `pg_trgm` extension)" }
      - { vi: "Hash trên `name`", en: "A Hash on `name`" }
      - { vi: "BRIN trên `name`", en: "A BRIN on `name`" }
    answer: 1
    why: { vi: "B-tree trên `name` hấp dẫn vì B-tree là loại index mặc định, nhưng mẫu `%…%` không có tiền tố cố định. B-tree chỉ giúp `LIKE` khi mẫu có tiền tố cố định (và collation C hoặc opclass pattern). Trigram tách chuỗi thành bộ ba ký tự nên phục vụ `%…%`, `ILIKE` và độ tương tự.", en: "A B-tree on `name` is tempting because B-tree is the default index type, but the pattern `%…%` has no fixed prefix. A B-tree only helps `LIKE` when the pattern has a fixed prefix (and a C collation or pattern opclass). Trigrams split strings into three-character pieces, so they serve `%…%`, `ILIKE` and similarity." }
  - q: { vi: "Cột `attrs jsonb`, truy vấn `attrs @> '{\"color\":\"red\"}'`. Chọn gì?", en: "Column `attrs jsonb`, query `attrs @> '{\"color\":\"red\"}'`. What do you choose?" }
    options:
      - { vi: "GIN `jsonb_path_ops`", en: "GIN `jsonb_path_ops`" }
      - { vi: "B-tree trên `attrs`", en: "A B-tree on `attrs`" }
      - { vi: "SP-GiST", en: "SP-GiST" }
      - { vi: "BRIN", en: "BRIN" }
    answer: 0
    why: { vi: "B-tree trên `attrs` nghe hợp lý vì nó xử lý được phép so sánh bằng, nhưng `@>` hỏi về chứa đựng, không phải bằng nhau. GIN là index đảo cho giá trị có nhiều thành phần. `jsonb_path_ops` nhỏ và nhanh cho `@>`; dùng `jsonb_ops` nếu cần thêm `?`, `?|`, `?&`.", en: "A B-tree on `attrs` sounds right because it handles equality, but `@>` asks about containment, not equality. GIN is the inverted index for multi-part values. `jsonb_path_ops` is small and fast for `@>`; use `jsonb_ops` when you also need `?`, `?|`, `?&`." }
  - q: { vi: "\"10 cửa hàng gần tôi nhất\" trên cột `point`. Chọn gì?", en: "\"The 10 stores nearest to me\" on a `point` column. What do you choose?" }
    options:
      - { vi: "GiST (hoặc SP-GiST) với `ORDER BY loc <-> … LIMIT 10`", en: "GiST (or SP-GiST) with `ORDER BY loc <-> … LIMIT 10`" }
      - { vi: "B-tree trên `(loc[0], loc[1])`", en: "A B-tree on `(loc[0], loc[1])`" }
      - { vi: "Hash", en: "Hash" }
      - { vi: "GIN", en: "GIN" }
    answer: 0
    why: { vi: "B-tree trên hai tọa độ nghe hợp lý vì nó lọc được từng trục, nhưng gần nhất là chuyện khoảng cách, không phải thứ tự từng trục. Chỉ AM có toán tử khoảng cách (GiST, SP-GiST) trả về theo thứ tự gần nhất mà không đọc hết. B-tree hai cột không biết khoảng cách hai chiều.", en: "A B-tree on the two coordinates sounds right because it can filter each axis, but nearest is about distance, not the order of each axis. Only access methods with a distance operator (GiST, SP-GiST) return rows nearest-first without reading everything. A two-column B-tree knows nothing about 2-D distance." }
  - q: { vi: "Bảng 12 cột, người dùng lọc bằng bất kỳ tổ hợp nào của 8 cột, luôn bằng dấu bằng; không thể tạo 8! index. Chọn gì để thử?", en: "A 12-column table; users filter on any combination of 8 columns, always with equality; you cannot create 8! indexes. What do you try?" }
    options:
      - { vi: "Một index `bloom` trên 8 cột", en: "One `bloom` index on the 8 columns" }
      - { vi: "Một B-tree 8 cột", en: "One 8-column B-tree" }
      - { vi: "8 index Hash", en: "8 Hash indexes" }
      - { vi: "BRIN 8 cột", en: "An 8-column BRIN" }
    answer: 0
    why: { vi: "Bloom lưu một chữ ký mỗi dòng, trả lời được mọi tổ hợp điều kiện bằng với một index, đổi lại là lossy (phải recheck) và chỉ hỗ trợ `=`. Một B-tree nhiều cột chủ yếu hiệu quả khi có điều kiện trên cột đầu. Mỗi index Hash riêng lẻ cũng dùng được qua BitmapAnd, nhưng tốn chỗ hơn.", en: "Bloom stores one signature per row and answers any combination of equality conditions with one index, at the cost of being lossy (rechecks) and supporting only `=`. A multicolumn B-tree is mostly effective when the leading column is constrained. Separate single-column indexes combined by BitmapAnd also work, but take more space." }
  - q: { vi: "AM nào hỗ trợ cả UNIQUE, `INCLUDE` và index-only scan?", en: "Which access method supports UNIQUE, `INCLUDE` and index-only scans together?" }
    options:
      - { vi: "B-tree", en: "B-tree" }
      - { vi: "GIN", en: "GIN" }
      - { vi: "BRIN", en: "BRIN" }
      - { vi: "Hash", en: "Hash" }
    answer: 0
    why: { vi: "Hash nghe hợp với UNIQUE vì nó vốn chỉ trả lời câu hỏi bằng nhau, nhưng Hash không hỗ trợ ràng buộc duy nhất. Chỉ B-tree hỗ trợ UNIQUE. `INCLUDE` có ở B-tree, GiST, SP-GiST. GIN không bao giờ index-only scan; BRIN là lossy.", en: "Hash sounds right for UNIQUE because it only answers equality questions anyway, but Hash does not support unique constraints. Only B-tree supports UNIQUE. `INCLUDE` exists for B-tree, GiST and SP-GiST. GIN never does index-only scans; BRIN is lossy." }
---

## Ý chính

Mỗi dòng: toán tử · mạnh ở · lưu ý.

- B-tree: `<` `<=` `=` `>=` `>`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'abc%'` · mặc định; UNIQUE; sắp xếp; index-only · luật cột đầu (18 có skip scan)
- Hash: chỉ `=` · khóa dài, chỉ so bằng · không UNIQUE, không nhiều cột
- GIN: `@>` `<@` `&&` `?` `@@` · mảng, `jsonb`, full-text, trigram · ghi chậm hơn (pending list); không index-only
- GiST: `&&` `<@` `@>` `<->` … · hình học, range, exclusion constraint, KNN · lossy với nhiều opclass
- SP-GiST: như GiST cho điểm/chuỗi · dữ liệu phân bố lệch, quadtree, radix · không cân bằng
- BRIN: `<` `=` `>` (minmax) · bảng cực lớn, dữ liệu theo thứ tự chèn · lossy, cần correlation cao
- bloom: `=` · lọc bằng trên nhiều tổ hợp cột · extension, lossy, không UNIQUE

## Ví dụ

Cùng dữ liệu, các bài trước trong mô-đun đã cho thấy trên PGlite:

```text
B-tree      seq_keys_idx        2 levels, 55 leaves for 20000 int keys
GIN         docs_tags_fast      Bitmap Index Scan for tags @> '{new}'
BRIN        readings2_brin      20 ranges summarize 153 heap pages
GiST        stores_loc_gist     Index Scan ... Order By: (loc <-> '(50,50)'::point)
SP-GiST     stores_loc_spgist   Bitmap Index Scan for loc <@ box
```

## Thực hành

Quy trình chuyên gia: (1) liệt kê truy vấn và toán tử thật; (2) xem kiểu dữ liệu và phân bố (`pg_stats`, correlation); (3) xem mẫu ghi (append-only, update nhiều); (4) chọn AM rồi kiểm bằng EXPLAIN trên dữ liệu thật; (5) đo kích thước và chi phí ghi.

Lab hai bước (chọn AM cho tìm chuỗi ở giữa, rồi kiểm kế hoạch), rồi sáu tình huống. Kỹ năng chuyên gia: từ một yêu cầu truy vấn và mẫu dữ liệu, chọn đúng AM, opclass và giải thích vì sao các lựa chọn khác kém hơn.

# EN

## Key idea

Each line: operators · strong at · watch out.

- B-tree: `<` `<=` `=` `>=` `>`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'abc%'` · the default; UNIQUE; ordering; index-only · leading-column rule (18 adds skip scan)
- Hash: `=` only · long keys, equality only · no UNIQUE, no multiple columns
- GIN: `@>` `<@` `&&` `?` `@@` · arrays, `jsonb`, full text, trigrams · slower writes (pending list); no index-only
- GiST: `&&` `<@` `@>` `<->` … · geometry, ranges, exclusion constraints, KNN · lossy for many opclasses
- SP-GiST: like GiST for points/strings · skewed data, quadtrees, radix trees · unbalanced
- BRIN: `<` `=` `>` (minmax) · huge tables, data in insert order · lossy, needs high correlation
- bloom: `=` · equality filters over many column combinations · an extension, lossy, no UNIQUE

## Example

On the same kind of data, the earlier lessons of this module showed on PGlite:

```text
B-tree      seq_keys_idx        2 levels, 55 leaves for 20000 int keys
GIN         docs_tags_fast      Bitmap Index Scan for tags @> '{new}'
BRIN        readings2_brin      20 ranges summarize 153 heap pages
GiST        stores_loc_gist     Index Scan ... Order By: (loc <-> '(50,50)'::point)
SP-GiST     stores_loc_spgist   Bitmap Index Scan for loc <@ box
```

## Practice

The expert routine: (1) list the real queries and operators; (2) look at the data type and distribution (`pg_stats`, correlation); (3) look at the write pattern (append-only, update-heavy); (4) pick the access method and check it with EXPLAIN on real data; (5) measure size and write cost.

A two-step lab (pick the access method for a search inside strings, then check the plan), then six scenarios. Expert skill: from a query requirement and a data pattern, choose the right access method and opclass, and explain why the alternatives are worse.
