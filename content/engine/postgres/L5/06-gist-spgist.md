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
    - task: { vi: "Đọc 5 khóa đầu trên trang gốc (trang 0) của `stores_loc_gist`: `itemoffset` và `keys`.", en: "Read the first 5 keys on the root page (page 0) of `stores_loc_gist`: `itemoffset` and `keys`." }
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
    why: { vi: "Đổi lại, GiST luôn cân bằng và dùng được cho mọi kiểu có \"hộp bao\" (range, hình học, `tsvector` qua chữ ký). SP-GiST không cân bằng, hợp với dữ liệu phân bố không đều (điểm, chuỗi có tiền tố chung). Cả hai hỗ trợ KNN với opclass có toán tử khoảng cách.", en: "In exchange GiST is always balanced and works for any type with a \"bounding\" key (ranges, geometry, `tsvector` via signatures). SP-GiST is unbalanced and suits unevenly distributed data (points, strings with common prefixes). Both support KNN with an opclass that has a distance operator." }
  - q: { vi: "Ràng buộc \"không có hai lịch đặt phòng chồng giờ cho cùng một phòng\" dùng index nào?", en: "\"No two bookings of the same room may overlap in time\": which index enforces it?" }
    options:
      - { vi: "UNIQUE B-tree trên (room_id, during)", en: "A UNIQUE B-tree on (room_id, during)" }
      - { vi: "`EXCLUDE USING gist (room_id WITH =, during WITH &&)` (cần `btree_gist` cho cột `=`)", en: "`EXCLUDE USING gist (room_id WITH =, during WITH &&)` (needs `btree_gist` for the `=` column)" }
      - { vi: "BRIN trên during", en: "A BRIN on during" }
    answer: 1
    why: { vi: "Exclusion constraint cần một AM trả lời được \"có chồng nhau không\", đó là GiST (hoặc SP-GiST). B-tree chỉ biết bằng/thứ tự nên chỉ làm UNIQUE.", en: "An exclusion constraint needs an access method that answers \"does it overlap?\", which is GiST (or SP-GiST). B-tree only knows equality and order, so it can only do UNIQUE." }
---

## Ý chính

- GiST là khung cây cân bằng tổng quát: mỗi nút trong giữ một khóa "bao" mọi thứ bên dưới (với hình học: hộp bao nhỏ nhất). Hộp các nút anh em có thể chồng nhau, nên tìm kiếm có thể đi nhiều nhánh. Dùng cho hình học, range, full-text (chữ ký), `pg_trgm`, `btree_gist`, exclusion constraint.
- KNN: với `ORDER BY col <-> … LIMIT k` (một phía là hằng), GiST duyệt theo khoảng cách nhỏ nhất có thể của từng hộp, trả dòng đúng thứ tự mà không cần Sort.
- SP-GiST (space-partitioned) chia không gian thành các ô không chồng: quadtree, k-d tree cho điểm; radix tree cho chuỗi. Cây không cân bằng, có thể nhỏ và nhanh với dữ liệu phân bố lệch. Cũng hỗ trợ KNN với opclass phù hợp.

## Ví dụ

Kết quả thật trên PGlite (5000 điểm trên lưới 100 × 100):

```text
itemoffset  keys
1           (loc)=("(3,11),(0,0)")
2           (loc)=("(22,14),(11,3)")
3           (loc)=("(6,37),(1,22)")
4           (loc)=("(25,29),(14,18)")
5           (loc)=("(46,10),(30,2)")

Limit
  ->  Index Scan using stores_loc_gist on stores
        Order By: (loc <-> '(50,50)'::point)

Aggregate
  ->  Bitmap Heap Scan on stores_sp
        Recheck Cond: (loc <@ '(20,20),(10,10)'::box)
        ->  Bitmap Index Scan on stores_loc_spgist
```

Mỗi khóa ở gốc là một hộp bao (góc trên phải, góc dưới trái) của cả một trang con.

## Thực hành

`pageinspect` có `gist_page_items`/`gist_page_opaque_info` để đọc trang GiST; không có hàm tương ứng cho SP-GiST, nên phần bên trong SP-GiST ở bài này là sơ đồ.

Đọc hộp bao thật, viết KNN, rồi dùng SP-GiST cho truy vấn hộp. Sơ đồ cho thấy hộp chồng nhau (GiST) cạnh ô chia bốn (quadtree). Kỹ năng chuyên gia: chọn GiST hay SP-GiST theo kiểu dữ liệu, phân bố và toán tử cần dùng.

# EN

## Key idea

- GiST is a general balanced-tree framework: each internal node holds a key that "covers" everything below it (for geometry: the smallest bounding box). Sibling boxes may overlap, so a search can descend several branches. Used for geometry, ranges, full text (signatures), `pg_trgm`, `btree_gist` and exclusion constraints.
- KNN: with `ORDER BY col <-> … LIMIT k` (one side a constant), GiST walks boxes by their smallest possible distance and returns rows in order with no Sort.
- SP-GiST (space-partitioned) splits space into non-overlapping cells: quadtrees and k-d trees for points, radix trees for strings. The tree is unbalanced and can be small and fast on skewed data. It also supports KNN with a suitable opclass.

## Example

Real output from PGlite (5000 points on a 100 × 100 grid):

```text
itemoffset  keys
1           (loc)=("(3,11),(0,0)")
2           (loc)=("(22,14),(11,3)")
3           (loc)=("(6,37),(1,22)")
4           (loc)=("(25,29),(14,18)")
5           (loc)=("(46,10),(30,2)")

Limit
  ->  Index Scan using stores_loc_gist on stores
        Order By: (loc <-> '(50,50)'::point)

Aggregate
  ->  Bitmap Heap Scan on stores_sp
        Recheck Cond: (loc <@ '(20,20),(10,10)'::box)
        ->  Bitmap Index Scan on stores_loc_spgist
```

Each root key is the bounding box (upper right corner, lower left corner) of a whole child page.

## Practice

`pageinspect` has `gist_page_items`/`gist_page_opaque_info` to read GiST pages; there are no matching functions for SP-GiST, so SP-GiST internals in this lesson are a diagram.

Read real bounding boxes, write a KNN query, then use SP-GiST for a box query. The diagram shows overlapping boxes (GiST) next to quartered cells (quadtree). Expert skill: choose GiST or SP-GiST from the data type, its distribution and the operators you need.
