---
id: e-pg-l2-16
engine: postgres
level: L2
module: geo-lite
title: "5 điểm gần nhất: GiST, KNN và earthdistance"
title_en: "The 5 nearest points: GiST, KNN and earthdistance"
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-gist-boxes
objectives:
  - vi: Tìm N điểm gần nhất bằng `ORDER BY loc <-> p LIMIT n` đi qua index GiST, không sắp xếp cả bảng.
    en: Find the N nearest points with `ORDER BY loc <-> p LIMIT n` through a GiST index, without sorting the whole table.
  - vi: Tính khoảng cách thật trên mặt đất (mét) từ vĩ độ/kinh độ bằng `earthdistance`.
    en: Compute real ground distance (metres) from latitude/longitude with `earthdistance`.
requires: [e-pg-l2-15]
sources:
  - https://www.postgresql.org/docs/18/datatype-geometric.html
  - https://www.postgresql.org/docs/18/functions-geometry.html
  - https://www.postgresql.org/docs/18/gist.html
  - https://www.postgresql.org/docs/18/earthdistance.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS cube;
    CREATE EXTENSION IF NOT EXISTS earthdistance;
    CREATE TABLE shops (
      id int PRIMARY KEY,
      loc point NOT NULL
    );
    SELECT setseed(0.7);
    INSERT INTO shops SELECT g, point(random() * 1000, random() * 1000) FROM generate_series(1, 30000) AS g;
    CREATE TABLE cities (name text PRIMARY KEY, lat float8 NOT NULL, lon float8 NOT NULL);
    INSERT INTO cities VALUES ('Da Nang', 16.0544, 108.2022), ('Hue', 16.4637, 107.5909), ('Hoi An', 15.8801, 108.3380);
    ANALYZE shops;
  steps:
    - task:
        vi: "Tạo index GiST tên `shops_loc_gist` trên cột `loc`."
        en: "Create a GiST index named `shops_loc_gist` on column `loc`."
      solution: CREATE INDEX shops_loc_gist ON shops USING gist (loc)
      target: SELECT id FROM shops ORDER BY loc <-> point '(500,500)' LIMIT 5
      check: catalog
      hint:
        vi: "`CREATE INDEX name ON table USING gist (col)`."
        en: "`CREATE INDEX name ON table USING gist (col)`."
    - task:
        vi: "Lấy `id` và khoảng cách (làm tròn 2 chữ số, kiểu `numeric`) của 5 cửa hàng gần điểm (500,500) nhất, gần trước."
        en: "Return the `id` and the distance (rounded to 2 decimals, as `numeric`) of the 5 shops nearest to point (500,500), nearest first."
      solution: SELECT id, round((loc <-> point '(500,500)')::numeric, 2) AS dist FROM shops ORDER BY loc <-> point '(500,500)' LIMIT 5
      check: rows
      ordered: true
      hint:
        vi: "`loc <-> point '(500,500)'` là khoảng cách; dùng nó trong cả danh sách cột và `ORDER BY`."
        en: "`loc <-> point '(500,500)'` is the distance; use it in both the select list and `ORDER BY`."
    - task:
        vi: "Lấy `id` của 5 cửa hàng gần điểm (120,880) nhất. Kế hoạch phải đọc `shops_loc_gist` theo thứ tự khoảng cách, không có Sort."
        en: "Return the `id` of the 5 shops nearest to point (120,880). The plan must read `shops_loc_gist` in distance order, with no Sort."
      solution: SELECT id FROM shops ORDER BY loc <-> point '(120,880)' LIMIT 5
      check: plan
      ordered: true
      hint:
        vi: "Khoảng cách phải nằm trong `ORDER BY` và có `LIMIT`; một phía của `<->` là hằng."
        en: "The distance must be in `ORDER BY` with a `LIMIT`; one side of `<->` is a constant."
    - task:
        vi: "Bảng `cities(name, lat, lon)` giữ tọa độ ba thành phố (độ). Khoảng cách đường chim bay từ Da Nang tới Hue và Hoi An, tính bằng km (làm tròn số nguyên). Trả về `name` và `km`, sắp theo `name`, bỏ chính Da Nang."
        en: "Table `cities(name, lat, lon)` holds the coordinates of three cities (degrees). Straight-line distance from Da Nang to Hue and to Hoi An in km (rounded to whole numbers). Return `name` and `km`, ordered by `name`, leaving out Da Nang itself."
      solution: SELECT c.name, round((earth_distance(ll_to_earth(d.lat, d.lon), ll_to_earth(c.lat, c.lon)) / 1000)::numeric) AS km FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name
      check: rows
      ordered: true
      hint:
        vi: "`earth_distance(ll_to_earth(lat1, lon1), ll_to_earth(lat2, lon2))` trả mét."
        en: "`earth_distance(ll_to_earth(lat1, lon1), ll_to_earth(lat2, lon2))` returns metres."
---
## Ý chính

Postgres có sẵn kiểu hình học phẳng: `point`, `box`, `circle`, `polygon`. Toán tử `<->` là khoảng cách; `<@` là "nằm trong".

Câu "5 cửa hàng gần nhất" (KNN) không có index thì phải tính khoảng cách cho mọi dòng rồi sắp xếp. Index GiST giữ các điểm trong cây hộp bao (R-tree): mỗi nút là một hình chữ nhật bao các con. Với `ORDER BY loc <-> p LIMIT 5`, GiST duyệt hộp gần `p` nhất trước và dừng sau 5 điểm. Điều kiện để dùng được: khoảng cách nằm trong `ORDER BY`, một phía là hằng, và có `LIMIT`.

## Ví dụ

```sql
SELECT count(*) AS inside FROM shops WHERE loc <@ circle '((500,500),50)';
```

Số cửa hàng trong vòng tròn bán kính 50 quanh (500,500).

## Thực hành

Kiểu `point` là mặt phẳng, đơn vị tùy bạn. Trên Trái Đất, vĩ độ/kinh độ không phải mặt phẳng: extension `earthdistance` (cần `cube`) đổi tọa độ sang điểm trên mặt cầu bằng `ll_to_earth`, và `earth_distance` trả mét. Khi cần hình học đầy đủ (đa giác thật, hệ tọa độ, chiếu bản đồ) thì dùng PostGIS, một extension riêng ngoài lõi.

30.000 cửa hàng trên ô 1000 x 1000 và ba thành phố có tọa độ thật. Tạo index GiST, tìm 5 điểm gần nhất qua index, rồi tính khoảng cách thật bằng km.

# EN

## Key idea

Postgres ships flat geometric types: `point`, `box`, `circle`, `polygon`. The `<->` operator is distance; `<@` means "is inside".

Without an index, "the 5 nearest shops" (KNN) must compute the distance of every row and sort. A GiST index keeps points in a tree of bounding boxes (an R-tree): each node is a rectangle around its children. For `ORDER BY loc <-> p LIMIT 5`, GiST visits the boxes nearest to `p` first and stops after 5 points. To be usable: the distance is in `ORDER BY`, one side is a constant, and there is a `LIMIT`.

## Example

```sql
SELECT count(*) AS inside FROM shops WHERE loc <@ circle '((500,500),50)';
```

The number of shops inside the circle of radius 50 around (500,500).

## Practice

The `point` type is flat, in whatever unit you choose. On Earth, latitude/longitude is not a plane: the `earthdistance` extension (which needs `cube`) turns coordinates into a point on a sphere with `ll_to_earth`, and `earth_distance` returns metres. For full geometry (real polygons, coordinate systems, map projections) use PostGIS, a separate extension outside core.

30,000 shops on a 1000 x 1000 square and three cities with real coordinates. Create a GiST index, find the 5 nearest points through it, then compute real distances in km.
