---
id: e-pg-l2-07
engine: postgres
level: L2
module: index-types
title: SP-GiST chia không gian
title_en: SP-GiST partitions space
kind: predict
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Biết SP-GiST chia dữ liệu thành các vùng không chồng nhau (quadtree, k-d tree, radix tree) và hợp với điểm hay tiền tố chuỗi.
    en: Know that SP-GiST splits data into non-overlapping regions (quadtree, k-d tree, radix tree) and suits points or string prefixes.
  - vi: Viết câu "trong ô vuông" và "N điểm gần nhất" bằng toán tử mà index hiểu (`<@`, `<->`).
    en: Write "inside a box" and "N nearest points" queries with operators the index understands (`<@`, `<->`).
requires: [e-pg-l2-06]
figures: [{ name: pg-spgist-quadtree, at: idea }]
sources:
  - { url: https://www.postgresql.org/docs/18/indexes-types.html, title_vi: "Các loại index" }
  - { url: https://www.postgresql.org/docs/18/spgist.html, title_vi: "Index SP-GiST" }
  - { url: https://www.postgresql.org/docs/18/datatype-geometric.html, title_vi: "Kiểu hình học" }
  - { url: https://www.postgresql.org/docs/18/functions-geometry.html, title_vi: "Hàm và toán tử hình học" }
lab:
  setup: |
    CREATE TABLE shops (
      id int PRIMARY KEY,
      loc point NOT NULL
    );
    SELECT setseed(0.5);
    INSERT INTO shops SELECT g, point(random() * 1000, random() * 1000) FROM generate_series(1, 30000) AS g;
    CREATE INDEX shops_loc_spgist ON shops USING spgist (loc);
    ANALYZE shops;
  steps:
    - task:
        vi: "Lấy `id` của 5 cửa hàng gần điểm (500,500) nhất, gần trước. Kế hoạch phải dùng `shops_loc_spgist`."
        en: "Return the `id` of the 5 shops nearest to point (500,500), nearest first. The plan must use `shops_loc_spgist`."
      solution: SELECT id FROM shops ORDER BY loc <-> point '(500,500)' LIMIT 5
      check: plan
      ordered: true
      hint:
        vi: "`ORDER BY loc <-> point '(500,500)' LIMIT 5`: toán tử `<->` là khoảng cách."
        en: "`ORDER BY loc <-> point '(500,500)' LIMIT 5`: the `<->` operator is distance."
    - task:
        vi: "Khách đứng ở điểm (200,800). Lấy `id` của 3 cửa hàng gần nhất, gần trước. Bài chấm cả tốc độ: đúng mà không dùng được `shops_loc_spgist` là chưa đạt."
        en: "A customer stands at point (200,800). Return the `id` of the 3 nearest shops, nearest first. Speed is graded too: a right answer that cannot use `shops_loc_spgist` does not pass."
      solution: SELECT id FROM shops ORDER BY loc <-> point '(200,800)' LIMIT 3
      check: rows
      ordered: true
      perf: { table: shops }
      slow: SELECT id FROM shops ORDER BY sqrt((loc[0] - 200) ^ 2 + (loc[1] - 800) ^ 2) LIMIT 3
      hint:
        vi: "Đừng tự viết công thức khoảng cách; toán tử `<->` mới là thứ index hiểu."
        en: "Do not write the distance formula by hand; the `<->` operator is what the index understands."
quiz:
  - q:
      vi: "Điểm nào đúng khi so SP-GiST với GiST?"
      en: "Which statement is true when comparing SP-GiST with GiST?"
    options:
      - { vi: "Giống GiST, các vùng của SP-GiST có thể chồng lên nhau", en: "Like GiST, SP-GiST regions may overlap" }
      - { vi: "SP-GiST chia không gian thành vùng không chồng nhau, mỗi điểm thuộc đúng một nhánh", en: "SP-GiST splits space into non-overlapping regions, and each point belongs to exactly one branch" }
      - { vi: "SP-GiST chỉ dùng được cho chuỗi", en: "SP-GiST only works for strings" }
    answer: 1
    trap: 0
    why:
      vi: "Tên SP-GiST chứa chữ GiST nên dễ nghĩ hai loại chia giống nhau, nhưng không: GiST gom dữ liệu vào các hộp bao có thể chồng lên nhau, còn SP-GiST (space-partitioned GiST) cắt không gian thành các phần rời nhau, ví dụ quadtree chia mặt phẳng thành 4 góc, nên mỗi điểm thuộc đúng một nhánh. SP-GiST cũng không chỉ cho chuỗi: bài này dùng nó cho `point`, và nó còn phục vụ range và địa chỉ mạng."
      en: "The name SP-GiST contains GiST, so the two seem to split data the same way, but they do not: GiST groups data into bounding boxes that may overlap, while SP-GiST (space-partitioned GiST) cuts space into disjoint parts, for example a quadtree splits the plane into 4 quadrants, so each point belongs to exactly one branch. SP-GiST is not only for strings either: this lesson uses it for `point`, and it also serves ranges and network addresses."
predict:
  sql: SELECT id FROM shops WHERE loc <@ box '(100,100),(120,120)'
  expect: { node: Bitmap Index Scan, index: shops_loc_spgist }
  q:
    vi: "30.000 cửa hàng rải đều trên ô 1000 x 1000, có index SP-GiST trên `loc`. Câu hỏi các cửa hàng trong một ô vuông nhỏ 20 x 20 dùng kế hoạch nào?"
    en: "30,000 shops spread over a 1000 x 1000 square, with an SP-GiST index on `loc`. Which plan does a query for shops inside a small 20 x 20 box use?"
  options:
    - { vi: "Seq Scan: index chỉ dùng cho dấu bằng", en: "Seq Scan: indexes only serve equality" }
    - { vi: "Bitmap Heap Scan qua `shops_loc_spgist`", en: "Bitmap Heap Scan through `shops_loc_spgist`" }
    - { vi: "Index Only Scan qua `shops_pkey`", en: "Index Only Scan through `shops_pkey`" }
  answer: 1
  trap: 0
  why:
    vi: "Seq Scan nghe hợp lý nếu bạn quen nghĩ index chỉ phục vụ dấu bằng; nhưng SP-GiST cho `point` là một quadtree: mỗi nút chia mặt phẳng thành 4 góc. Câu `<@ box` chỉ đi vào các góc giao với ô cần tìm, nên chỉ chạm một phần rất nhỏ của bảng: ô 20 x 20 chiếm 400 / 1.000.000 mặt phẳng, tức khoảng 30.000 × 0,0004 = 12 dòng (thật có 14). Planner chọn Bitmap Index Scan trên `shops_loc_spgist`, rồi Bitmap Heap Scan đọc các dòng đó. `shops_pkey` là B-tree trên `id`, không biết gì về vị trí, nên không giúp được câu này."
    en: "A Seq Scan sounds right if you think of indexes as serving only equality, but SP-GiST for `point` is a quadtree: each node splits the plane into 4 quadrants. A `<@ box` query only descends into quadrants that overlap the box, so it touches a tiny part of the table: a 20 x 20 box is 400 / 1,000,000 of the plane, about 30,000 × 0.0004 = 12 rows (14 in fact). The planner picks a Bitmap Index Scan on `shops_loc_spgist`, then a Bitmap Heap Scan reads those rows. `shops_pkey` is a B-tree on `id` that knows nothing about location, so it cannot help here."
---
## Mở bài

Ứng dụng giao hàng có 30.000 cửa hàng trên bản đồ, và hai câu hỏi chạy liên tục: cửa hàng nào nằm trong khung nhìn, và cửa hàng nào gần khách nhất. B-tree xếp được một chiều, nhưng bản đồ có hai chiều. SP-GiST chia chính mặt phẳng ra để trả lời cả hai câu.

## Ý chính

SP-GiST ("space-partitioned GiST") dựng các cây không cân bằng chia không gian thành vùng không chồng nhau: quadtree và k-d tree cho `point`, radix tree (trie) cho chuỗi (phục vụ tìm theo tiền tố `^@`), và cây cho range hay địa chỉ mạng.

Nhiều người nghĩ SP-GiST chỉ là một biến thể của GiST nên cũng giống nó. Thật ra GiST gom dữ liệu vào các hộp bao có thể chồng nhau, còn trong SP-GiST mỗi điểm chỉ thuộc đúng một nhánh. Với dữ liệu phân bố đều như điểm trên bản đồ, cây nông và tìm nhanh.

Index chỉ giúp khi câu dùng toán tử nó hiểu. Với `point`, đó là `<@ box` (nằm trong hộp), `~=` (trùng điểm) và các toán tử trái, phải, trên, dưới. Opclass này còn có toán tử thứ tự `<->` (khoảng cách), nên `ORDER BY loc <-> point LIMIT n` đọc các điểm gần nhất thẳng từ index, không cần Sort. Một công thức khoảng cách tự viết cho cùng kết quả nhưng index không nhận ra, nên phải tính cho cả 30.000 dòng rồi sắp xếp.

Hình từng bước ở cuối mục này chia ô 1000 x 1000 của lab thành bốn phần, rồi lại bốn, và đếm số cửa hàng trong mỗi phần.

## Ví dụ

Đếm cửa hàng trong một ô 20 x 20:

```sql
SELECT count(*) AS shops_in_box FROM shops WHERE loc <@ box '(100,100),(120,120)';
```

Có `14` cửa hàng, gần với kỳ vọng 30.000 × (20 × 20) / (1000 × 1000) = 12 của dữ liệu rải đều.

## Lỗi hay gặp

Tự viết công thức khoảng cách:

```sql
-- WRONG: a hand-written distance cannot use the index, so every row is sorted
EXPLAIN SELECT id FROM shops
ORDER BY sqrt((loc[0] - 700) ^ 2 + (loc[1] - 300) ^ 2) LIMIT 5;
```

```sql
-- FIX: the distance operator walks the index nearest first
EXPLAIN SELECT id FROM shops ORDER BY loc <-> point '(700,300)' LIMIT 5;
```

Câu sai là `Seq Scan` rồi `Sort` cả 30.000 dòng; câu sửa là `Index Scan using shops_loc_spgist` với `Order By: (loc <-> ...)`. Hai câu trả cùng 5 cửa hàng.

Dùng SP-GiST để chặn trùng:

```sql
-- ERROR 0A000: access method "spgist" does not support unique indexes
CREATE UNIQUE INDEX demo_loc_key ON shops USING spgist (loc);
```

SP-GiST không làm unique và chỉ có một cột. Luật không trùng cần B-tree hoặc ràng buộc loại trừ.

## Thực hành

Đoán kế hoạch cho câu tìm trong một ô vuông, viết câu tìm 5 cửa hàng gần nhất qua cùng index, rồi tìm cửa hàng gần một khách sao cho vừa đúng vừa nhanh.

## Tóm tắt

- SP-GiST cắt không gian thành vùng rời nhau: quadtree, k-d tree, radix tree.
- Với `point`, index phục vụ `<@ box` và "N điểm gần nhất" qua `<->`.
- Công thức khoảng cách tự viết cho cùng kết quả nhưng mất index.
- SP-GiST không làm unique, không nhiều cột.

# EN

## Opening

A delivery app has 30,000 shops on a map, and two questions run all the time: which shops are inside the visible area, and which shops are nearest the customer. A B-tree sorts along one dimension, but a map has two. SP-GiST splits the plane itself to answer both questions.

## Key idea

SP-GiST ("space-partitioned GiST") builds unbalanced trees that split space into non-overlapping regions: quadtrees and k-d trees for `point`, radix trees (tries) for strings (serving prefix search with `^@`), and trees for ranges or network addresses.

Many people think SP-GiST is just a variant of GiST and so works like it. In fact GiST groups data into bounding boxes that may overlap, while in SP-GiST each point belongs to exactly one branch. For evenly spread data such as points on a map, the tree stays shallow and searches are fast.

An index only helps when the query uses an operator it understands. For `point` that is `<@ box` (inside a box), `~=` (same point) and the left, right, above and below operators. This opclass also has the ordering operator `<->` (distance), so `ORDER BY loc <-> point LIMIT n` reads the nearest points straight from the index, with no Sort. A hand-written distance formula gives the same result, but the index does not recognise it, so all 30,000 rows must be computed and sorted.

The step-through figure at the end of this section splits the lab's 1000 x 1000 square into four parts, then four again, counting the shops in each.

## Example

Count the shops inside a 20 x 20 box:

```sql
SELECT count(*) AS shops_in_box FROM shops WHERE loc <@ box '(100,100),(120,120)';
```

There are `14` shops, close to the 30,000 × (20 × 20) / (1000 × 1000) = 12 expected for evenly spread data.

## Common mistakes

Writing the distance formula by hand:

```sql
-- WRONG: a hand-written distance cannot use the index, so every row is sorted
EXPLAIN SELECT id FROM shops
ORDER BY sqrt((loc[0] - 700) ^ 2 + (loc[1] - 300) ^ 2) LIMIT 5;
```

```sql
-- FIX: the distance operator walks the index nearest first
EXPLAIN SELECT id FROM shops ORDER BY loc <-> point '(700,300)' LIMIT 5;
```

The wrong query is a `Seq Scan` and then a `Sort` of all 30,000 rows; the fixed one is an `Index Scan using shops_loc_spgist` with `Order By: (loc <-> ...)`. Both return the same 5 shops.

Using SP-GiST to block duplicates:

```sql
-- ERROR 0A000: access method "spgist" does not support unique indexes
CREATE UNIQUE INDEX demo_loc_key ON shops USING spgist (loc);
```

SP-GiST does not enforce uniqueness and has a single column. A no-duplicates rule needs a B-tree or an exclusion constraint.

## Practice

Guess the plan for a search inside a box, write the 5-nearest-shops query through the same index, then find the shops nearest a customer so the answer is both right and fast.

## Recap

- SP-GiST cuts space into disjoint regions: quadtrees, k-d trees, radix trees.
- For `point`, the index serves `<@ box` and "N nearest points" through `<->`.
- A hand-written distance formula gives the same result but loses the index.
- SP-GiST does not enforce uniqueness and has no multiple columns.
