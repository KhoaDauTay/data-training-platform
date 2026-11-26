---
id: e-pg-l5-06
engine: postgres
level: L5
module: index-internals
title: "GiST và SP-GiST: hộp bao và chia không gian"
title_en: "GiST and SP-GiST: bounding boxes vs space partitioning"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đọc khóa hộp bao thật trong trang gốc của một GiST bằng `gist_page_items`", en: "Read real bounding-box keys on a GiST root page with `gist_page_items`" }
  - { vi: "Viết truy vấn KNN (`ORDER BY … <-> … LIMIT`) mà index trả về theo thứ tự khoảng cách", en: "Write a KNN query (`ORDER BY … <-> … LIMIT`) that the index returns in distance order" }
  - { vi: "Phân biệt GiST (cây cân bằng, hộp có thể chồng nhau) với SP-GiST (chia không gian không chồng: quadtree, k-d tree, radix)", en: "Tell GiST (balanced tree, boxes may overlap) from SP-GiST (non-overlapping space partitioning: quadtree, k-d tree, radix)" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/gist.html
  - https://www.postgresql.org/docs/18/spgist.html
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/pageinspect.html
viz: pg-gist-boxes
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    DROP TABLE IF EXISTS stores, stores_sp CASCADE;
    CREATE TABLE stores (id int PRIMARY KEY, loc point NOT NULL);
    INSERT INTO stores SELECT g, point(g % 100, (g * 37) % 100) FROM generate_series(1, 5000) g;
    CREATE INDEX stores_loc_gist ON stores USING gist (loc);
    CREATE TABLE stores_sp (LIKE stores);
    INSERT INTO stores_sp SELECT * FROM stores;
    CREATE INDEX stores_loc_spgist ON stores_sp USING spgist (loc);
    ANALYZE stores, stores_sp;
  steps:
    - task: { vi: "Đọc 5 khóa đầu trên trang gốc (trang 0) của `stores_loc_gist`: `itemoffset` và `keys`. Hàm `gist_page_items(get_raw_page(index, 0), index)` nhận hai tham số: trang thô và tên index.", en: "Read the first 5 keys on the root page (page 0) of `stores_loc_gist`: `itemoffset` and `keys`. The function `gist_page_items(get_raw_page(index, 0), index)` takes two arguments: the raw page and the index name." }
      solution: "SELECT itemoffset, keys FROM gist_page_items(get_raw_page('stores_loc_gist', 0), 'stores_loc_gist') ORDER BY itemoffset LIMIT 5"
      check: rows
      ordered: true
      hint: { vi: "`gist_page_items(get_raw_page('stores_loc_gist', 0), 'stores_loc_gist')`. Gốc của GiST luôn ở trang 0.", en: "`gist_page_items(get_raw_page('stores_loc_gist', 0), 'stores_loc_gist')`. A GiST root is always page 0." }
    - task: { vi: "5 cửa hàng gần điểm (50, 50) nhất trong `stores` (chỉ cột id). Index phải trả về theo thứ tự khoảng cách, không có Sort.", en: "The 5 stores in `stores` nearest to point (50, 50) (id only). The index must return them in distance order, with no Sort." }
      solution: "SELECT id FROM stores ORDER BY loc <-> point(50, 50) LIMIT 5"
      check: plan
      hint: { vi: "Toán tử khoảng cách `<->` đặt trong ORDER BY, kèm LIMIT.", en: "The distance operator `<->` in ORDER BY, with LIMIT." }
    - task: { vi: "Đếm cửa hàng trong `stores_sp` nằm trong hộp từ (10, 10) tới (20, 20). Planner phải dùng `stores_loc_spgist`.", en: "Count the stores in `stores_sp` inside the box from (10, 10) to (20, 20). The planner must use `stores_loc_spgist`." }
      solution: "SELECT count(*) FROM stores_sp WHERE loc <@ box(point(10, 10), point(20, 20))"
      check: plan
      hint: { vi: "Toán tử \"nằm trong\" là `<@`.", en: "The \"is contained in\" operator is `<@`." }
quiz:
  - q: { vi: "Vì sao một truy vấn điểm trên GiST có thể phải đi xuống nhiều nhánh, còn trên SP-GiST quadtree thì chỉ một?", en: "Why can a point lookup on GiST descend several branches while on an SP-GiST quadtree it descends only one?" }
    options:
      - { vi: "Hộp bao của các nút GiST có thể chồng lên nhau; các ô của SP-GiST chia không gian không chồng", en: "GiST nodes' bounding boxes may overlap; SP-GiST cells partition space without overlap" }
      - { vi: "SP-GiST luôn nằm trong RAM", en: "SP-GiST always lives in RAM" }
      - { vi: "GiST không hỗ trợ điểm", en: "GiST does not support points" }
    answer: 0
    trap: 1
    why: { vi: "\"SP-GiST luôn nằm trong RAM\" sai: SP-GiST là index trên đĩa như mọi index khác, và số nhánh phải đi là chuyện cấu trúc, không phải bộ nhớ. \"GiST không hỗ trợ điểm\" cũng sai: bài này dựng GiST trên điểm. Nguyên nhân thật: mỗi nút GiST giữ một hộp bao (bounding box) quanh mọi điểm bên dưới, và các hộp này có thể chồng nhau, nên một điểm nằm trong vùng chồng buộc phải xuống cả hai nhánh. SP-GiST chia không gian thành các ô không chồng (như quadtree chia làm bốn), nên mỗi điểm thuộc đúng một ô. Đổi lại, GiST luôn cân bằng; SP-GiST thì không, và hợp với dữ liệu phân bố lệch.", en: "\"SP-GiST always lives in RAM\" is wrong: SP-GiST is an on-disk index like any other, and the number of branches is about structure, not memory. \"GiST does not support points\" is wrong too: this lesson builds a GiST on points. The real cause: each GiST node keeps a bounding box around every point below it, and these boxes may overlap, so a point inside an overlap forces a descent into both branches. SP-GiST splits space into cells that never overlap (a quadtree splits into four), so each point belongs to exactly one cell. In exchange GiST is always balanced; SP-GiST is not, and suits skewed data." }
  - q: { vi: "Ràng buộc \"không có hai lịch đặt phòng chồng giờ cho cùng một phòng\" dùng index nào?", en: "\"No two bookings of the same room may overlap in time\": which index enforces it?" }
    options:
      - { vi: "UNIQUE B-tree trên (room_id, during)", en: "A UNIQUE B-tree on (room_id, during)" }
      - { vi: "`EXCLUDE USING gist (room_id WITH =, during WITH &&)` (cần `btree_gist` cho cột `=`)", en: "`EXCLUDE USING gist (room_id WITH =, during WITH &&)` (needs `btree_gist` for the `=` column)" }
      - { vi: "BRIN trên during", en: "A BRIN on during" }
    answer: 1
    trap: 0
    why: { vi: "UNIQUE B-tree nghe hợp lý vì đây là luật cấm trùng, nhưng UNIQUE chỉ cấm hai khoảng giờ y hệt nhau: 9–11 giờ và 10–12 giờ khác nhau nên vẫn lọt dù chồng giờ. B-tree chỉ biết bằng và thứ tự, không trả lời được \"có chồng nhau không\" (toán tử `&&`). Exclusion constraint (ràng buộc loại trừ) cấm hai dòng mà mọi toán tử đã nêu đều đúng; nó cần một loại index hỗ trợ `&&`, tức GiST. BRIN không làm ràng buộc được: nó chỉ tóm tắt min/max theo khoảng trang, không kiểm tra từng dòng.", en: "A UNIQUE B-tree sounds right because this is a no-duplicates rule, but UNIQUE only forbids two identical time ranges: 9–11 and 10–12 differ, so they pass although they overlap. A B-tree only knows equality and order and cannot answer \"do they overlap?\" (the `&&` operator). An exclusion constraint forbids two rows for which every listed operator is true; it needs an index type that supports `&&`, which is GiST. A BRIN cannot enforce constraints: it only summarizes min/max per page range and never checks single rows." }
---

## Mở bài

Ứng dụng giao hàng cần năm cửa hàng gần khách nhất, và phòng họp không được đặt chồng giờ. B-tree không trả lời được cả hai câu này. Bài này mở hai loại index làm được việc đó và đọc khóa thật bên trong.

## Ý chính

GiST là một khung cây cân bằng tổng quát. Mỗi mục ở nút trong giữ một khóa "bao" mọi thứ bên dưới nó; với hình học, đó là hộp bao nhỏ nhất. Opclass quyết định khóa bao là gì, nên cùng một khung phục vụ được hình học, range, full-text, `pg_trgm`, `btree_gist` và exclusion constraint.

Nhiều người nghĩ tìm một điểm trong GiST chỉ đi một đường từ gốc xuống lá như B-tree. Thật ra hộp bao của các nút anh em có thể chồng nhau, nên một truy vấn có thể phải đi xuống nhiều nhánh. SP-GiST (space-partitioned) thì chia không gian thành các ô không chồng: quadtree hay k-d tree cho điểm, radix tree cho chuỗi. Cây SP-GiST không cân bằng, nhưng có thể nhỏ và nhanh với dữ liệu phân bố lệch.

KNN: với `ORDER BY col <-> point(x, y) LIMIT k`, GiST và SP-GiST duyệt các nút theo khoảng cách nhỏ nhất có thể, nên trả dòng đúng thứ tự gần nhất mà không cần Sort và không đọc hết bảng.

Exclusion constraint tổng quát hóa UNIQUE: "không có hai dòng mà mọi cặp cột đều thỏa toán tử". Với `room WITH =, during WITH &&`, hai lịch cùng phòng không được chồng giờ. Cột `int` cần extension `btree_gist` để có opclass GiST.

## Cú pháp

```sql
CREATE INDEX index_name ON table_name USING { gist | spgist } (column [ opclass ]);
SELECT ... FROM table_name ORDER BY column <-> constant LIMIT k;
CREATE TABLE table_name ( ..., EXCLUDE USING gist (column WITH operator [, ...]) );
SELECT * FROM gist_page_items(get_raw_page('index_name', block_number), 'index_name');
```

- `<->`: khoảng cách; trong ORDER BY kèm LIMIT thì index trả theo thứ tự gần nhất.
- `&&`: chồng nhau; `<@`: nằm trong; `@>`: chứa.
- `EXCLUDE`: từ chối dòng mới nếu có dòng cũ thỏa mọi toán tử đã nêu.
- Gốc GiST luôn ở trang 0; `pageinspect` không có hàm đọc trang SP-GiST.

## Ví dụ

Gốc của `stores_loc_gist` có bao nhiêu khóa, và index có bao nhiêu trang:

```sql
SELECT count(*) AS root_keys,
  (SELECT pg_relation_size('stores_loc_gist') / 8192) AS index_pages
FROM gist_page_items(get_raw_page('stores_loc_gist', 0), 'stores_loc_gist');
```

43 khóa ở gốc cho 44 trang: mỗi khóa là hộp bao của một trang lá.

KNN trên SP-GiST, kèm khoảng cách:

```sql
SELECT id, loc, loc <-> point(10, 10) AS dist
FROM stores_sp ORDER BY loc <-> point(10, 10) LIMIT 3;
```

Ba cửa hàng cùng ở (11,7), cách khoảng 3,16. `EXPLAIN` cho thấy `Index Scan using stores_loc_spgist` với `Order By`, không có Sort.

So kích thước hai index trên cùng 5000 điểm:

```sql
SELECT relname, pg_relation_size(oid) / 8192 AS pages
FROM pg_class WHERE relname IN ('stores_loc_gist', 'stores_loc_spgist')
ORDER BY relname;
```

GiST 44 trang, SP-GiST 32 trang.

## Lỗi hay gặp

Dùng B-tree cho kiểu hình học:

```sql
-- ERROR 42704: data type point has no default operator class for access method "btree"
CREATE INDEX stores_loc_btree ON stores (loc);
```

`point` không có thứ tự tuyến tính, nên không có opclass B-tree. Dùng GiST hoặc SP-GiST.

Tạo index unique bằng GiST:

```sql
-- ERROR 0A000: access method "gist" does not support unique indexes
CREATE UNIQUE INDEX stores_loc_uq ON stores USING gist (loc);
```

Chỉ B-tree làm UNIQUE. Luật kiểu "không chồng nhau" thì viết thành exclusion constraint.

Exclusion constraint có cột `int` cần extension `btree_gist`; thiếu nó, `CREATE TABLE` báo lỗi 42704 vì kiểu `integer` không có opclass GiST:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE bookings (id int PRIMARY KEY, room int NOT NULL, during tsrange NOT NULL,
  EXCLUDE USING gist (room WITH =, during WITH &&));
INSERT INTO bookings VALUES
  (1, 101, tsrange('2026-11-24 09:00', '2026-11-24 11:00')),
  (2, 102, tsrange('2026-11-24 10:00', '2026-11-24 12:00'));
SELECT conname FROM pg_constraint WHERE conrelid = 'bookings'::regclass AND contype = 'x';
```

`btree_gist` thêm opclass GiST cho `=` trên kiểu thường. Giờ ràng buộc `bookings_room_during_excl` chặn lịch chồng giờ:

```sql
-- ERROR 23P01: conflicting key value violates exclusion constraint "bookings_room_during_excl"
INSERT INTO bookings VALUES (3, 101, tsrange('2026-11-24 10:30', '2026-11-24 12:00'));
```

Phòng 101 đã bận tới 11:00. `tsrange` mặc định mở ở đầu phải, nên một lịch bắt đầu đúng 11:00 vẫn hợp lệ.

## Thực hành

Đọc hộp bao thật trên gốc GiST, viết KNN mà index trả đúng thứ tự, rồi dùng SP-GiST cho truy vấn trong hộp; sau đó hai câu hỏi. Sơ đồ đặt hộp chồng nhau của GiST cạnh ô chia bốn của quadtree.

## Tóm tắt

- GiST là khung cây cân bằng; nút trong giữ khóa bao, và hộp anh em có thể chồng nhau.
- SP-GiST chia không gian thành ô không chồng; cây không cân bằng, hợp dữ liệu lệch.
- `ORDER BY col <-> point(x, y) LIMIT k` cho KNN không cần Sort trên cả hai.
- GiST không làm UNIQUE; luật "không chồng" là exclusion constraint, cột `int` cần `btree_gist`.

# EN

## Opening

A delivery app needs the five stores nearest to a customer, and meeting rooms must not be double-booked. A B-tree can answer neither. This lesson opens the two index types that can, and reads the real keys inside.

## Key idea

GiST is a general framework for balanced trees. Each entry on an internal node holds a key that "covers" everything below it; for geometry, that is the smallest bounding box. The opclass decides what a covering key is, so the same framework serves geometry, ranges, full text, `pg_trgm`, `btree_gist` and exclusion constraints.

Many people think a point lookup in GiST follows one path from the root to a leaf, as in a B-tree. In fact the bounding boxes of sibling nodes can overlap, so a query may have to descend several branches. SP-GiST (space-partitioned) instead splits space into cells that do not overlap: quadtrees or k-d trees for points, radix trees for strings. An SP-GiST tree is unbalanced, but it can be small and fast on skewed data.

KNN: with `ORDER BY col <-> point(x, y) LIMIT k`, GiST and SP-GiST visit nodes by their smallest possible distance, so they return rows nearest-first with no Sort and without reading the whole table.

An exclusion constraint generalizes UNIQUE: "no two rows where every column pair satisfies its operator". With `room WITH =, during WITH &&`, two bookings of the same room may not overlap. An `int` column needs the `btree_gist` extension to get a GiST opclass.

## Syntax

```sql
CREATE INDEX index_name ON table_name USING { gist | spgist } (column [ opclass ]);
SELECT ... FROM table_name ORDER BY column <-> constant LIMIT k;
CREATE TABLE table_name ( ..., EXCLUDE USING gist (column WITH operator [, ...]) );
SELECT * FROM gist_page_items(get_raw_page('index_name', block_number), 'index_name');
```

- `<->`: distance; in ORDER BY with LIMIT the index returns rows nearest-first.
- `&&`: overlaps; `<@`: is contained in; `@>`: contains.
- `EXCLUDE`: refuses a new row if an existing row satisfies every listed operator.
- A GiST root is always page 0; `pageinspect` has no function to read SP-GiST pages.

## Example

How many keys the root of `stores_loc_gist` holds, and how many pages the index has:

```sql
SELECT count(*) AS root_keys,
  (SELECT pg_relation_size('stores_loc_gist') / 8192) AS index_pages
FROM gist_page_items(get_raw_page('stores_loc_gist', 0), 'stores_loc_gist');
```

43 keys on the root for 44 pages: each key is the bounding box of one leaf page.

KNN on SP-GiST, with the distance:

```sql
SELECT id, loc, loc <-> point(10, 10) AS dist
FROM stores_sp ORDER BY loc <-> point(10, 10) LIMIT 3;
```

Three stores share (11,7), about 3.16 away. `EXPLAIN` shows `Index Scan using stores_loc_spgist` with `Order By`, and no Sort.

Compare the size of the two indexes on the same 5000 points:

```sql
SELECT relname, pg_relation_size(oid) / 8192 AS pages
FROM pg_class WHERE relname IN ('stores_loc_gist', 'stores_loc_spgist')
ORDER BY relname;
```

GiST 44 pages, SP-GiST 32 pages.

## Common mistakes

Using a B-tree for a geometric type:

```sql
-- ERROR 42704: data type point has no default operator class for access method "btree"
CREATE INDEX stores_loc_btree ON stores (loc);
```

`point` has no linear order, so it has no B-tree opclass. Use GiST or SP-GiST.

Creating a unique index with GiST:

```sql
-- ERROR 0A000: access method "gist" does not support unique indexes
CREATE UNIQUE INDEX stores_loc_uq ON stores USING gist (loc);
```

Only B-tree does UNIQUE. A "no overlap" rule is written as an exclusion constraint.

An exclusion constraint with an `int` column needs the `btree_gist` extension; without it, `CREATE TABLE` fails with 42704 because type `integer` has no GiST opclass:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE bookings (id int PRIMARY KEY, room int NOT NULL, during tsrange NOT NULL,
  EXCLUDE USING gist (room WITH =, during WITH &&));
INSERT INTO bookings VALUES
  (1, 101, tsrange('2026-11-24 09:00', '2026-11-24 11:00')),
  (2, 102, tsrange('2026-11-24 10:00', '2026-11-24 12:00'));
SELECT conname FROM pg_constraint WHERE conrelid = 'bookings'::regclass AND contype = 'x';
```

`btree_gist` adds GiST opclasses for `=` on ordinary types. Now the constraint `bookings_room_during_excl` blocks overlapping bookings:

```sql
-- ERROR 23P01: conflicting key value violates exclusion constraint "bookings_room_during_excl"
INSERT INTO bookings VALUES (3, 101, tsrange('2026-11-24 10:30', '2026-11-24 12:00'));
```

Room 101 is busy until 11:00. A `tsrange` is open at its upper end by default, so a booking that starts exactly at 11:00 is still valid.

## Practice

Read real bounding boxes on the GiST root, write a KNN query the index returns in order, then use SP-GiST for a box query; then two questions. The diagram puts GiST's overlapping boxes next to a quadtree's quartered cells.

## Recap

- GiST is a balanced-tree framework; internal nodes hold covering keys, and sibling boxes may overlap.
- SP-GiST splits space into non-overlapping cells; the tree is unbalanced and suits skewed data.
- `ORDER BY col <-> point(x, y) LIMIT k` gives KNN with no Sort on both.
- GiST does not do UNIQUE; a "no overlap" rule is an exclusion constraint, and an `int` column needs `btree_gist`.
