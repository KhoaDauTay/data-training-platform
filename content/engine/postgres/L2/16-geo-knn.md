---
id: e-pg-l2-16
engine: postgres
level: L2
module: geo-lite
title: "5 điểm gần nhất: GiST, KNN và earthdistance"
title_en: "The 5 nearest points: GiST, KNN and earthdistance"
kind: lab
runtime: browser
minutes: 16
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-gist-boxes
objectives:
  - vi: Tìm N điểm gần nhất bằng `ORDER BY loc <-> p LIMIT n` đi qua index GiST, không sắp xếp cả bảng.
    en: Find the N nearest points with `ORDER BY loc <-> p LIMIT n` through a GiST index, without sorting the whole table.
  - vi: Tìm mọi điểm trong một bán kính bằng `<@ circle`, để index GiST làm phần lọc.
    en: Find every point within a radius with `<@ circle`, so the GiST index does the filtering.
  - vi: Tính khoảng cách thật trên mặt đất (mét) từ vĩ độ/kinh độ bằng `earthdistance`.
    en: Compute real ground distance (metres) from latitude/longitude with `earthdistance`.
requires: [e-pg-l2-15]
sources:
  - { url: https://www.postgresql.org/docs/18/datatype-geometric.html, title_vi: "Kiểu hình học" }
  - { url: https://www.postgresql.org/docs/18/functions-geometry.html, title_vi: "Hàm và toán tử hình học" }
  - { url: https://www.postgresql.org/docs/18/gist.html, title_vi: "Index GiST" }
  - { url: https://www.postgresql.org/docs/18/earthdistance.html, title_vi: "earthdistance" }
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
    - task:
        vi: "Khách đứng ở điểm (300,700) hỏi mọi cửa hàng trong bán kính 10. Trả về `id` của chúng. Câu phải nhanh: để `shops_loc_gist` lọc, không tính khoảng cách cho cả 30.000 cửa hàng."
        en: "A customer at point (300,700) asks for every shop within radius 10. Return their `id`. The query must be fast: let `shops_loc_gist` do the filtering, without computing a distance for all 30,000 shops."
      solution: SELECT id FROM shops WHERE loc <@ circle '((300,700),10)'
      check: rows
      perf: { table: shops }
      slow: SELECT id FROM shops WHERE loc <-> point '(300,700)' <= 10
      hint:
        vi: "Hỏi \"nằm trong hình tròn\" bằng `loc <@ circle '((300,700),10)'`. So `loc <-> p <= 10` cho cùng dòng nhưng phải tính khoảng cách cho từng dòng."
        en: "Ask \"inside the circle\" with `loc <@ circle '((300,700),10)'`. Comparing `loc <-> p <= 10` gives the same rows but computes a distance for every row."
quiz:
  - q:
      vi: "Có index GiST trên `loc`. Bạn bỏ `LIMIT` khỏi câu `ORDER BY loc <-> point '(120,880)'`. Điều gì xảy ra?"
      en: "There is a GiST index on `loc`. You drop the `LIMIT` from `ORDER BY loc <-> point '(120,880)'`. What happens?"
    options:
      - { vi: "Báo lỗi: tìm theo khoảng cách bắt buộc có `LIMIT`", en: "An error: a distance search requires a `LIMIT`" }
      - { vi: "Kế hoạch vẫn có thể đọc index theo thứ tự khoảng cách; `LIMIT` chỉ là thứ cho phép dừng sớm sau vài điểm", en: "The plan can still read the index in distance order; `LIMIT` is only what lets it stop early after a few points" }
      - { vi: "Index không bao giờ dùng được nữa", en: "The index can never be used any more" }
    answer: 1
    trap: 2
    why:
      vi: "Không có lỗi nào: tìm k điểm gần nhất (KNN, k nearest neighbours) hay được giới thiệu cùng `LIMIT`, nhưng Postgres không bắt buộc nó. Điều kiện để dùng index GiST là khoảng cách nằm trong `ORDER BY`, một vế là cột có index, vế kia là hằng; bỏ `LIMIT` không đổi điều đó, nên index vẫn dùng được. Planner vẫn có thể chọn Index Scan có `Order By`, chỉ là phải đi hết cây để trả cả 30.000 điểm. `LIMIT` là thứ cho phép dừng sau vài điểm, nên chính nó làm câu rẻ."
      en: "There is no error: a k-nearest-neighbours (KNN) search is usually shown with `LIMIT`, but Postgres does not require it. What makes the GiST index usable is the distance in `ORDER BY`, one side the indexed column, the other a constant; dropping `LIMIT` does not change that, so the index stays usable. The planner can still pick an Index Scan with `Order By`; it just walks the whole tree to return all 30,000 points. `LIMIT` is what lets it stop after a few points, so it is what makes the query cheap."
  - q:
      vi: "Cột `loc` kiểu `point` lưu (kinh độ, vĩ độ) theo độ. `loc <-> p` trả 0.22 giữa Da Nang và Hoi An. Đó là gì?"
      en: "Column `loc` of type `point` stores (longitude, latitude) in degrees. `loc <-> p` returns 0.22 between Da Nang and Hoi An. What is that?"
    options:
      - { vi: "0,22 km", en: "0.22 km" }
      - { vi: "Khoảng cách trên mặt phẳng tính bằng độ, không phải đơn vị đo trên mặt đất; cần `earthdistance` để ra mét", en: "A flat-plane distance in degrees, not a ground unit; you need `earthdistance` to get metres" }
      - { vi: "0,22 dặm", en: "0.22 miles" }
    answer: 1
    trap: 0
    why:
      vi: "0,22 km hay 0,22 dặm nghe hợp lý vì hai thành phố gần nhau, nhưng `point` không biết đơn vị: nó tính Pythagoras trên đúng những con số bạn lưu, ở đây là độ. Một độ cũng không có độ dài cố định: một độ kinh tuyến ngắn dần khi đi về phía hai cực. `earth_distance(ll_to_earth(...), ll_to_earth(...))` tính trên mặt cầu và trả mét: Da Nang tới Hoi An khoảng 24 km, xa hơn 100 lần so với 0,22 km."
      en: "0.22 km or 0.22 miles sounds right because the cities are close, but `point` knows no unit: it applies Pythagoras to exactly the numbers you stored, here degrees. A degree has no fixed length either: a degree of longitude gets shorter towards the poles. `earth_distance(ll_to_earth(...), ll_to_earth(...))` works on a sphere and returns metres: Da Nang to Hoi An is about 24 km, over 100 times the 0.22 km reading."
---
## Mở bài

Ứng dụng giao hàng cần 5 cửa hàng gần khách nhất, giữa 30.000 cửa hàng, mỗi lần khách mở bản đồ. Tính khoảng cách tới cả 30.000 điểm rồi sắp xếp thì mỗi lần mở là một lần đọc cả bảng. Index GiST cho phép đi thẳng tới vùng gần khách.

## Ý chính

Postgres có sẵn kiểu hình học phẳng: `point`, `box`, `circle`, `polygon`. Toán tử `<->` trả khoảng cách giữa hai hình; `<@` hỏi "nằm trong", ví dụ `loc <@ circle '((300,700),10)'` là "điểm nằm trong hình tròn tâm (300,700), bán kính 10".

Câu "5 cửa hàng gần nhất" gọi là KNN (k láng giềng gần nhất). Không có index thì phải tính khoảng cách cho mọi dòng rồi sắp xếp. Index GiST giữ các điểm trong cây hộp bao: mỗi nút là một hình chữ nhật bao các con. Với `ORDER BY loc <-> p LIMIT 5`, GiST duyệt hộp gần `p` nhất trước, trả điểm theo đúng thứ tự khoảng cách, và dừng sau 5 điểm. Điều kiện: khoảng cách nằm trong `ORDER BY`, một vế là cột có index GiST, vế kia là hằng. `LIMIT` không bắt buộc, nhưng chính nó làm câu rẻ.

Tìm theo bán kính cũng vậy. `<@ circle` là toán tử GiST hiểu, nên index chỉ mở những hộp chạm hình tròn. Nhiều người nghĩ viết `loc <-> p <= 10` cũng thế, vì kết quả giống nhau. Thật ra `<->` trong `WHERE` là một phép tính trên từng dòng, không phải điều kiện index hiểu: Postgres tính khoảng cách cho cả 30.000 điểm.

Kiểu `point` là mặt phẳng, đơn vị tùy bạn. Trên Trái Đất, vĩ độ và kinh độ không phải mặt phẳng: một độ kinh tuyến ngắn dần về phía hai cực. Extension `earthdistance` (cần `cube`) đổi tọa độ sang điểm trên mặt cầu bằng `ll_to_earth(lat, lon)`, và `earth_distance` trả mét. Khi cần hình học đầy đủ (đa giác thật, hệ tọa độ, phép chiếu bản đồ) thì dùng PostGIS, một extension riêng ngoài lõi.

## Cú pháp

```sql
CREATE INDEX index_name ON table_name USING gist ( point_column );
SELECT ... FROM table_name ORDER BY point_column <-> point '(x,y)' [ LIMIT n ];
SELECT ... FROM table_name WHERE point_column <@ circle '((x,y),radius)';
SELECT earth_distance(ll_to_earth(lat1, lon1), ll_to_earth(lat2, lon2));
```

- `<->`: khoảng cách giữa hai hình.
- `<@`: nằm trong (`box`, `circle`, `polygon`).
- `LIMIT n`: cho GiST dừng sau n điểm gần nhất.
- `ll_to_earth`: nhận vĩ độ trước, kinh độ sau.

## Ví dụ

Khoảng cách và "nằm trong" trên hai hình cố định:

```sql
SELECT point '(0,0)' <-> point '(3,4)' AS d, point '(1,1)' <@ box '((0,0),(2,2))' AS inside_box;
```

`d` là 5 (tam giác 3-4-5), `inside_box` là `true`.

Đếm cửa hàng trong một hình tròn:

```sql
SELECT count(*) AS inside FROM shops WHERE loc <@ circle '((500,500),50)';
```

Có 261 cửa hàng trong vòng tròn bán kính 50 quanh (500,500).

Tạo index GiST rồi xem kế hoạch KNN:

```sql
CREATE INDEX demo_gist ON shops USING gist (loc);
EXPLAIN (COSTS OFF) SELECT id FROM shops ORDER BY loc <-> point '(500,500)' LIMIT 5;
```

Kế hoạch là `Limit` trên `Index Scan using demo_gist` với dòng `Order By`: không có nút `Sort`.

## Lỗi hay gặp

Tạo index B-tree cho cột `point`:

```sql
-- ERROR 42704: data type point has no default operator class for access method "btree"
CREATE INDEX demo_btree ON shops (loc);
```

B-tree chỉ sắp được theo một chiều; điểm hai chiều cần `USING gist`.

Lấy `<->` trên độ làm khoảng cách:

```sql
-- WRONG: a flat distance in degrees, not kilometres
SELECT c.name, round((point(d.lon, d.lat) <-> point(c.lon, c.lat))::numeric, 3) AS degrees
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

```sql
-- FIX: compute on the sphere with earthdistance
SELECT c.name, round((earth_distance(ll_to_earth(d.lat, d.lon), ll_to_earth(c.lat, c.lon)) / 1000)::numeric) AS km
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

Câu sai ra 0.221 và 0.736 (độ); câu đúng ra 24 km tới Hoi An và 80 km tới Hue.

Đảo thứ tự vĩ độ, kinh độ:

```sql
-- WRONG: ll_to_earth takes latitude first
SELECT c.name, round((earth_distance(ll_to_earth(d.lon, d.lat), ll_to_earth(c.lon, c.lat)) / 1000)::numeric) AS km
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

```sql
-- FIX: latitude, then longitude
SELECT c.name, round((earth_distance(ll_to_earth(d.lat, d.lon), ll_to_earth(c.lat, c.lon)) / 1000)::numeric) AS km
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

Câu sai vẫn ra số trông hợp lý (16 và 69 km) nhưng là hai điểm ở nơi khác trên địa cầu. Đặt tên cột `lat`, `lon` rõ ràng và giữ một thứ tự.

## Thực hành

30.000 cửa hàng trên ô 1000 x 1000 và ba thành phố có tọa độ thật. Tạo index GiST, tìm 5 điểm gần nhất qua index, tính khoảng cách thật bằng km, rồi viết câu tìm theo bán kính đủ nhanh để qua thanh hiệu năng. Sau lab là hai câu hỏi.

## Tóm tắt

- `ORDER BY loc <-> p LIMIT n` với index GiST trả n điểm gần nhất mà không sắp xếp cả bảng.
- Tìm theo bán kính bằng `<@ circle`; `<-> ... <= r` trong `WHERE` tính khoảng cách cho từng dòng.
- `point` là mặt phẳng; khoảng cách thật trên Trái Đất dùng `earth_distance(ll_to_earth(lat, lon), ...)`, ra mét.
- B-tree không index được `point`; dùng `USING gist`.

# EN

## Opening

A delivery app needs the 5 shops nearest to the customer, out of 30,000, every time the customer opens the map. Computing the distance to all 30,000 points and sorting means a full table read on every open. A GiST index lets the query go straight to the area near the customer.

## Key idea

Postgres ships flat geometric types: `point`, `box`, `circle`, `polygon`. The `<->` operator returns the distance between two shapes; `<@` asks "is inside", for example `loc <@ circle '((300,700),10)'` means "the point is inside the circle centred at (300,700) with radius 10".

The question "the 5 nearest shops" is called KNN (k nearest neighbours). Without an index, the distance of every row must be computed and sorted. A GiST index keeps points in a tree of bounding boxes: each node is a rectangle around its children. For `ORDER BY loc <-> p LIMIT 5`, GiST visits the boxes nearest to `p` first, returns points in exact distance order, and stops after 5 points. The conditions: the distance is in `ORDER BY`, one side is the GiST-indexed column, the other a constant. `LIMIT` is not required, but it is what makes the query cheap.

A radius search works the same way. `<@ circle` is an operator GiST understands, so the index only opens the boxes that touch the circle. Many people think writing `loc <-> p <= 10` is the same, since the rows are the same. In fact `<->` inside `WHERE` is a calculation on each row, not a condition the index understands: Postgres computes the distance for all 30,000 points.

The `point` type is flat, in whatever unit you choose. On Earth, latitude and longitude are not a plane: a degree of longitude gets shorter towards the poles. The `earthdistance` extension (which needs `cube`) turns coordinates into a point on a sphere with `ll_to_earth(lat, lon)`, and `earth_distance` returns metres. For full geometry (real polygons, coordinate systems, map projections) use PostGIS, a separate extension outside core.

## Syntax

```sql
CREATE INDEX index_name ON table_name USING gist ( point_column );
SELECT ... FROM table_name ORDER BY point_column <-> point '(x,y)' [ LIMIT n ];
SELECT ... FROM table_name WHERE point_column <@ circle '((x,y),radius)';
SELECT earth_distance(ll_to_earth(lat1, lon1), ll_to_earth(lat2, lon2));
```

- `<->`: the distance between two shapes.
- `<@`: is inside (`box`, `circle`, `polygon`).
- `LIMIT n`: lets GiST stop after the n nearest points.
- `ll_to_earth`: takes latitude first, longitude second.

## Example

Distance and "is inside" on two fixed shapes:

```sql
SELECT point '(0,0)' <-> point '(3,4)' AS d, point '(1,1)' <@ box '((0,0),(2,2))' AS inside_box;
```

`d` is 5 (the 3-4-5 triangle), `inside_box` is `true`.

Count the shops inside a circle:

```sql
SELECT count(*) AS inside FROM shops WHERE loc <@ circle '((500,500),50)';
```

There are 261 shops inside the circle of radius 50 around (500,500).

Create a GiST index, then look at the KNN plan:

```sql
CREATE INDEX demo_gist ON shops USING gist (loc);
EXPLAIN (COSTS OFF) SELECT id FROM shops ORDER BY loc <-> point '(500,500)' LIMIT 5;
```

The plan is a `Limit` over an `Index Scan using demo_gist` with an `Order By` line: there is no `Sort` node.

## Common mistakes

Creating a B-tree index on a `point` column:

```sql
-- ERROR 42704: data type point has no default operator class for access method "btree"
CREATE INDEX demo_btree ON shops (loc);
```

A B-tree can only sort along one dimension; two-dimensional points need `USING gist`.

Taking `<->` on degrees as a distance:

```sql
-- WRONG: a flat distance in degrees, not kilometres
SELECT c.name, round((point(d.lon, d.lat) <-> point(c.lon, c.lat))::numeric, 3) AS degrees
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

```sql
-- FIX: compute on the sphere with earthdistance
SELECT c.name, round((earth_distance(ll_to_earth(d.lat, d.lon), ll_to_earth(c.lat, c.lon)) / 1000)::numeric) AS km
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

The wrong query gives 0.221 and 0.736 (degrees); the right one gives 24 km to Hoi An and 80 km to Hue.

Swapping latitude and longitude:

```sql
-- WRONG: ll_to_earth takes latitude first
SELECT c.name, round((earth_distance(ll_to_earth(d.lon, d.lat), ll_to_earth(c.lon, c.lat)) / 1000)::numeric) AS km
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

```sql
-- FIX: latitude, then longitude
SELECT c.name, round((earth_distance(ll_to_earth(d.lat, d.lon), ll_to_earth(c.lat, c.lon)) / 1000)::numeric) AS km
FROM cities c, cities d WHERE d.name = 'Da Nang' AND c.name <> 'Da Nang' ORDER BY c.name;
```

The wrong query still gives plausible numbers (16 and 69 km), but for two points somewhere else on the globe. Name the columns `lat` and `lon` clearly and keep one order.

## Practice

30,000 shops on a 1000 x 1000 square and three cities with real coordinates. Create a GiST index, find the 5 nearest points through it, compute real distances in km, then write a radius search fast enough to pass the performance bar. Two questions follow the lab.

## Recap

- `ORDER BY loc <-> p LIMIT n` with a GiST index returns the n nearest points without sorting the whole table.
- Search a radius with `<@ circle`; `<-> ... <= r` in `WHERE` computes the distance for every row.
- `point` is flat; real distance on Earth uses `earth_distance(ll_to_earth(lat, lon), ...)`, in metres.
- A B-tree cannot index `point`; use `USING gist`.
