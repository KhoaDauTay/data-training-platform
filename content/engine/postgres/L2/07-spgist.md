---
id: e-pg-l2-07
engine: postgres
level: L2
module: index-types
title: SP-GiST chia không gian
title_en: SP-GiST partitions space
kind: predict
runtime: browser
minutes: 8
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Biết SP-GiST chia dữ liệu thành các vùng không chồng nhau (quadtree, k-d tree, radix tree) và hợp với điểm hay tiền tố chuỗi.
    en: Know that SP-GiST splits data into non-overlapping regions (quadtree, k-d tree, radix tree) and suits points or string prefixes.
requires: [e-pg-l2-06]
sources:
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/spgist.html
  - https://www.postgresql.org/docs/18/datatype-geometric.html
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
  why:
    vi: "Seq Scan nghe hợp lý nếu bạn quen nghĩ index chỉ phục vụ dấu bằng; nhưng SP-GiST cho `point` là một quadtree: mỗi nút chia mặt phẳng thành 4 góc. Câu `<@ box` chỉ đi vào các góc giao với ô cần tìm, nên chỉ chạm vài chục dòng trên 30.000. Planner ước khoảng 30 dòng và chọn Bitmap Index Scan trên `shops_loc_spgist`."
    en: "A Seq Scan sounds right if you think of indexes as serving only equality, but SP-GiST for `point` is a quadtree: each node splits the plane into 4 quadrants. A `<@ box` query only descends into quadrants that overlap the box, so it touches a few dozen of 30,000 rows. The planner estimates about 30 rows and picks a Bitmap Index Scan on `shops_loc_spgist`."
---
## Ý chính

SP-GiST ("space-partitioned GiST") dựng các cây không cân bằng chia không gian thành vùng không chồng nhau:

- quadtree và k-d tree cho `point`;
- radix tree (trie) cho chuỗi, phục vụ tìm theo tiền tố `^@`;
- cây cho khoảng (range) và địa chỉ mạng.

Khác GiST (các hộp bao có thể chồng nhau), mỗi điểm trong SP-GiST chỉ thuộc đúng một nhánh. Với dữ liệu phân bố đều như điểm trên bản đồ, cây nông và tìm nhanh. Opclass có toán tử thứ tự còn phục vụ "gần nhất" (`ORDER BY loc <-> point LIMIT n`).

## Ví dụ

```sql
EXPLAIN SELECT id FROM shops ORDER BY loc <-> point '(500,500)' LIMIT 5;
```

Kế hoạch: `Limit` trên `Index Scan using shops_loc_spgist` với `Order By: (loc <-> ...)`, không có Sort.

## Thực hành

Đoán kế hoạch cho câu tìm trong một ô vuông, rồi viết câu tìm 5 cửa hàng gần nhất qua cùng index.

# EN

## Key idea

SP-GiST ("space-partitioned GiST") builds unbalanced trees that split space into non-overlapping regions:

- quadtrees and k-d trees for `point`;
- radix trees (tries) for strings, serving prefix search with `^@`;
- trees for ranges and network addresses.

Unlike GiST (whose bounding boxes may overlap), each point in SP-GiST belongs to exactly one branch. For evenly spread data such as points on a map, the tree stays shallow and searches are fast. Opclasses with an ordering operator also serve "nearest" queries (`ORDER BY loc <-> point LIMIT n`).

## Example

```sql
EXPLAIN SELECT id FROM shops ORDER BY loc <-> point '(500,500)' LIMIT 5;
```

Plan: `Limit` over `Index Scan using shops_loc_spgist` with `Order By: (loc <-> ...)`, no Sort.

## Practice

Guess the plan for a search inside a box, then write the 5-nearest-shops query through the same index.
