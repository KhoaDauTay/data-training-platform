---
id: e-pg-ext-03
engine: postgres
level: EXT
module: ext-geo
title: "PostGIS 2: vùng giao hàng, ST_DWithin và index GiST"
title_en: "PostGIS 2: delivery zones, ST_DWithin and a GiST index"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 + PostGIS 3.6.2 (PGlite 0.5.16)", date: "2026-11-26" }
figures: [{ name: pg-ext-dwithin-index, at: idea }]
objectives:
  - vi: Xếp đơn vào vùng giao hàng bằng `ST_Covers`, và biết vì sao `ST_Contains` không nhận `geography`.
    en: Assign orders to delivery zones with `ST_Covers`, and know why `ST_Contains` does not accept `geography`.
  - vi: Đếm đơn trong bán kính bằng `ST_DWithin` để index GiST lọc trước, thay vì `ST_Distance(...) <= r`.
    en: Count orders within a radius with `ST_DWithin` so the GiST index filters first, instead of `ST_Distance(...) <= r`.
  - vi: "Đọc kế hoạch hai tầng: hộp bao trong index, rồi phép đo chính xác trên các dòng còn lại."
    en: "Read the two-stage plan: bounding boxes in the index, then the exact measure on the rows left."
requires: [e-pg-ext-02]
sources:
  - https://www.postgresql.org/docs/18/gist.html
  - https://www.postgresql.org/docs/18/indexes-types.html
  - { url: "https://postgis.net/docs/ST_DWithin.html", title: "PostGIS · ST_DWithin" }
  - { url: "https://postgis.net/docs/ST_Covers.html", title: "PostGIS · ST_Covers" }
  - { url: "https://postgis.net/docs/ST_Buffer.html", title: "PostGIS · ST_Buffer" }
  - { url: "https://postgis.net/docs/using_postgis_query.html", title: "PostGIS · Spatial queries and indexes" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE TABLE zones (
      id int PRIMARY KEY,
      name text NOT NULL,
      area geography(Polygon, 4326) NOT NULL
    );
    INSERT INTO zones VALUES
      (1, 'Hai Chau', ST_MakeEnvelope(108.20, 16.04, 108.23, 16.08, 4326)),
      (2, 'Son Tra', ST_MakeEnvelope(108.23, 16.05, 108.30, 16.12, 4326)),
      (3, 'Thanh Khe', ST_MakeEnvelope(108.17, 16.05, 108.20, 16.08, 4326)),
      (4, 'Ngu Hanh Son', ST_MakeEnvelope(108.23, 15.98, 108.28, 16.05, 4326)),
      (5, 'Cam Le', ST_MakeEnvelope(108.17, 15.98, 108.23, 16.04, 4326));
    CREATE TABLE shops (
      id int PRIMARY KEY,
      name text NOT NULL,
      pos geography(Point, 4326) NOT NULL
    );
    INSERT INTO shops VALUES
      (1, 'Han Market stall', 'POINT(108.224 16.068)'),
      (2, 'Son Tra stall', 'POINT(108.245 16.085)'),
      (3, 'Hoa Xuan stall', 'POINT(108.215 16.005)');
    CREATE TABLE orders (
      id int PRIMARY KEY,
      pos geography(Point, 4326) NOT NULL
    );
    INSERT INTO orders
    SELECT g, ST_MakePoint(108.12 + (g * 7919 % 20011) / 20011.0 * 0.18,
                           15.95 + (g * 104729 % 20021) / 20021.0 * 0.17)::geography
    FROM generate_series(1, 20000) AS g;
    CREATE INDEX orders_pos_gist ON orders USING gist (pos);
    ANALYZE zones;
    ANALYZE shops;
    ANALYZE orders;
  steps:
    - task:
        vi: "Mỗi vùng giao hàng có bao nhiêu đơn nằm trong nó? Tên vùng (`name`) và số đơn (`orders`), theo tên."
        en: "How many orders lie inside each delivery zone? Zone name (`name`) and order count (`orders`), by name."
      solution: SELECT z.name, count(*) AS orders FROM zones z JOIN orders o ON ST_Covers(z.area, o.pos) GROUP BY z.name ORDER BY z.name
      check: rows
      ordered: true
      hint:
        vi: "`ST_Covers(area, pos)` nhận `geography`; nối `zones` với `orders` theo điều kiện đó."
        en: "`ST_Covers(area, pos)` accepts `geography`; join `zones` to `orders` on it."
    - task:
        vi: "Có bao nhiêu đơn cách quầy số 1 (`shops.id = 1`) không quá 3 km? Một cột `orders`. Bài chấm cả tốc độ: đúng mà phải đo khoảng cách cho cả 20.000 đơn là chưa đạt."
        en: "How many orders are at most 3 km from stall 1 (`shops.id = 1`)? One column `orders`. Speed is graded too: a right answer that measures all 20,000 orders does not pass."
      solution: SELECT count(*) AS orders FROM orders o, shops s WHERE s.id = 1 AND ST_DWithin(o.pos, s.pos, 3000)
      check: rows
      perf: { table: orders }
      slow: SELECT count(*) AS orders FROM orders o, shops s WHERE s.id = 1 AND ST_Distance(o.pos, s.pos) <= 3000
      hint:
        vi: "`ST_DWithin(a, b, 3000)` cho index lọc trước; `ST_Distance(...) <= 3000` thì không."
        en: "`ST_DWithin(a, b, 3000)` lets the index filter first; `ST_Distance(...) <= 3000` does not."
    - task:
        vi: "Có bao nhiêu đơn không nằm trong vùng giao hàng nào? Một cột `outside`."
        en: "How many orders lie in no delivery zone at all? One column `outside`."
      solution: SELECT count(*) AS outside FROM orders o WHERE NOT EXISTS (SELECT FROM zones z WHERE ST_Covers(z.area, o.pos))
      check: rows
      hint:
        vi: "`NOT EXISTS` với một truy vấn con dùng `ST_Covers`."
        en: "`NOT EXISTS` with a subquery that uses `ST_Covers`."
    - task:
        vi: "Với mỗi quầy, số đơn trong bán kính 3 km: tên quầy (`name`) và số đơn (`orders`), theo `id` của quầy."
        en: "For each stall, the orders within 3 km: stall name (`name`) and order count (`orders`), by stall `id`."
      solution: SELECT s.name, (SELECT count(*) FROM orders o WHERE ST_DWithin(o.pos, s.pos, 3000)) AS orders FROM shops s ORDER BY s.id
      check: rows
      ordered: true
      hint:
        vi: "Một truy vấn con đếm đơn cho từng quầy, vẫn bằng `ST_DWithin`."
        en: "A subquery counts the orders for each stall, still with `ST_DWithin`."
quiz:
  - q:
      vi: "`ST_Distance(o.pos, s.pos) <= 3000` và `ST_DWithin(o.pos, s.pos, 3000)` cùng đếm được 1.562 đơn. Hai cách khác nhau ở đâu?"
      en: "`ST_Distance(o.pos, s.pos) <= 3000` and `ST_DWithin(o.pos, s.pos, 3000)` both count 1,562 orders. How do they differ?"
    options:
      - { vi: "Không khác: planner tự viết cách này thành cách kia", en: "No difference: the planner rewrites one into the other" }
      - { vi: "Chỉ `ST_DWithin` để index GiST lọc theo hộp bao trước", en: "Only `ST_DWithin` lets the GiST index filter by boxes first" }
      - { vi: "`ST_Distance` chính xác hơn, nên đáng chậm hơn", en: "`ST_Distance` is more exact, so it is worth being slower" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì hai câu cùng ý nghĩa và cùng kết quả, nhưng Postgres không viết lại một phép so sánh trên kết quả hàm. `ST_DWithin` mang theo điều kiện `&&` trên hộp bao mở rộng 3 km, nên index chỉ đưa ra 2.210 ứng viên; `ST_Distance` buộc đo cả 20.000 đơn, chi phí ước tính hơn 250.000 so với khoảng 38."
      en: "It sounds right because both mean the same and give the same answer, but Postgres does not rewrite a comparison on a function's result. `ST_DWithin` carries a `&&` condition on a box widened by 3 km, so the index hands out only 2,210 candidates; `ST_Distance` forces a measure of all 20,000 orders, an estimated cost over 250,000 against about 38."
  - q:
      vi: "Ép hai cột về `geometry` 4326 rồi viết `ST_DWithin(o.pos::geometry, s.pos::geometry, 3000)`. Câu đếm được bao nhiêu đơn?"
      en: "Cast both columns to `geometry` 4326 and write `ST_DWithin(o.pos::geometry, s.pos::geometry, 3000)`. How many orders does it count?"
    options:
      - { vi: "Đúng 1.562 đơn trong bán kính 3 km", en: "Exactly the 1,562 orders within 3 km" }
      - { vi: "Cả 20.000 đơn, vì 3000 lúc này là 3000 độ", en: "All 20,000 orders, because 3000 now means 3000 degrees" }
      - { vi: "Không đơn nào, vì `geometry` cần bán kính tính bằng km", en: "None, because `geometry` needs a radius in km" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì chỉ đổi kiểu chứ không đổi số, nhưng `geometry` 4326 đo bằng độ. Bán kính 3000 độ bao trọn cả địa cầu nên câu đếm đủ 20.000 đơn, không báo lỗi gì."
      en: "It sounds right because only the type changed, not the number, but `geometry` 4326 measures in degrees. A radius of 3000 degrees covers the whole globe, so the query counts all 20,000 orders with no error at all."
---
## Mở bài

Chợ Lồng Đèn chia Đà Nẵng thành năm vùng giao hàng, và mỗi ngày phải biết đơn nào thuộc vùng nào, đơn nào ở gần quầy để giao bằng xe máy. Bảng có 20.000 đơn. Đo khoảng cách cho từng đơn thì chậm; index GiST giúp được, nhưng chỉ khi câu viết đúng cách.

## Ý chính

Index GiST trên cột `geography` không lưu điểm mà lưu hộp bao: hình chữ nhật nhỏ nhất chứa mỗi giá trị, xếp lồng nhau thành cây. Một câu tìm theo bán kính đi qua hai tầng. Tầng một, index chỉ mở những hộp chạm vào vùng tìm kiếm và bỏ qua phần còn lại. Tầng hai, Postgres đo khoảng cách thật cho các dòng còn sót lại, vì hộp chạm vùng chưa chắc điểm nằm trong vùng.

- `ST_DWithin(a, b, r)` mang sẵn điều kiện `&&` trên hộp bao mở rộng `r` mét, nên planner dùng được index.
- `ST_Distance(a, b) <= r` là so sánh trên kết quả một hàm: không có điều kiện hộp nào, nên phải đo mọi dòng.
- `ST_Covers(area, pos)` nhận cả `geography` và dùng được index; `ST_Contains` chỉ dành cho `geometry`.
- `ST_Buffer(pos, r)` tạo một vùng tròn bán kính `r` mét, ví dụ vùng cấm xe tải quanh chợ.

Nhiều người nghĩ cứ có index GiST là mọi câu không gian đều nhanh. Thật ra index chỉ được dùng khi điều kiện là một toán tử hay hàm mà index hiểu, như `&&`, `<->`, `ST_DWithin`, `ST_Covers`.

Hình hai bước ở cuối mục này cho thấy hai tầng đó trên chính lab: 2.210 ứng viên qua hộp bao, rồi 1.562 đơn thật sự trong 3 km.

## Cú pháp

```sql
CREATE INDEX ON t USING gist (pos);
WHERE ST_DWithin(pos, point, metres)
WHERE ST_Covers(area, pos)
ST_Buffer(point, metres)
```

Bán kính của `ST_DWithin` và `ST_Buffer` là mét khi tham số là `geography`.

## Ví dụ

Diện tích các vùng giao hàng:

```sql
SELECT name, round((ST_Area(area)
  / 1e6)::numeric, 1) AS km2
FROM zones ORDER BY id;
```

`Son Tra` rộng nhất, 58 km²; `Thanh Khe` nhỏ nhất, 10,7 km².

Kế hoạch của câu đếm đơn quanh quầy số 1:

```sql
EXPLAIN SELECT count(*)
FROM orders o, shops s
WHERE s.id = 1
  AND ST_DWithin(o.pos, s.pos, 3000);
```

Có `Bitmap Index Scan on orders_pos_gist` với `Index Cond: (pos && _st_expand(...))`, rồi `Filter: st_dwithin(...)` đo lại từng ứng viên.

Đơn nằm trong vùng cấm xe tải 1 km quanh quầy số 1:

```sql
SELECT count(*) AS orders
FROM orders o, shops s
WHERE s.id = 1
  AND ST_Covers(
    ST_Buffer(s.pos, 1000), o.pos);
```

166 đơn, phải giao bằng xe máy.

## Lỗi hay gặp

Dùng `ST_Contains` với `geography`:

```sql
-- ERROR 42883: no st_contains(geography, geography)
SELECT count(*) FROM zones z
JOIN orders o
  ON ST_Contains(z.area, o.pos);
```

`ST_Contains` chỉ nhận `geometry`. Với `geography`, dùng `ST_Covers`.

Đo bán kính trên `geometry` 4326:

```sql
-- WRONG: 3000 degrees, not metres
SELECT count(*) AS orders
FROM orders o, shops s
WHERE s.id = 1 AND ST_DWithin(
  o.pos::geometry,
  s.pos::geometry, 3000);
```

```sql
-- FIX: geography, radius in metres
SELECT count(*) AS orders
FROM orders o, shops s
WHERE s.id = 1
  AND ST_DWithin(o.pos, s.pos, 3000);
```

Bản sai đếm đủ 20.000 đơn; bản sửa đếm 1.562.

So khoảng cách bằng `ST_Distance` thay vì `ST_DWithin`:

```sql
-- WRONG: no index condition, every row is measured
EXPLAIN SELECT count(*)
FROM orders o, shops s
WHERE s.id = 1
  AND ST_Distance(o.pos, s.pos) <= 3000;
```

```sql
-- FIX: ST_DWithin brings the box condition
EXPLAIN SELECT count(*)
FROM orders o, shops s
WHERE s.id = 1
  AND ST_DWithin(o.pos, s.pos, 3000);
```

Kế hoạch sai là `Seq Scan on orders` với chi phí ước tính hơn 250.000; kế hoạch sửa đi qua index, khoảng 38.

## Thực hành

Đếm đơn theo vùng, đếm đơn quanh một quầy (bước này chấm cả tốc độ), tìm đơn nằm ngoài mọi vùng, rồi đếm đơn quanh từng quầy. Sau đó trả lời hai câu hỏi.

## Tóm tắt

- Index GiST lưu hộp bao: tầng một loại các hộp ở xa, tầng hai đo chính xác phần còn lại.
- `ST_DWithin` dùng được index; `ST_Distance(...) <= r` buộc đo mọi dòng.
- Với `geography`, xếp điểm vào vùng bằng `ST_Covers`; `ST_Contains` chỉ dành cho `geometry`.
- Bán kính là mét với `geography`, nhưng là độ với `geometry` 4326.

# EN

## Opening

Lantern Market splits Da Nang into five delivery zones, and every day it must know which order belongs to which zone and which orders sit close enough to a stall for a motorbike run. The table holds 20,000 orders. Measuring every order is slow; a GiST index helps, but only when the query is written the right way.

## Key idea

A GiST index on a `geography` column does not store the points but their bounding boxes: the smallest rectangle around each value, nested into a tree. A radius search goes through two stages. In stage one the index only opens the boxes that touch the search area and skips the rest. In stage two Postgres measures the real distance for the rows left, because a box that touches the area does not mean the point is inside it.

- `ST_DWithin(a, b, r)` carries a `&&` condition on a bounding box widened by `r` metres, so the planner can use the index.
- `ST_Distance(a, b) <= r` is a comparison on a function's result: it has no box condition, so every row must be measured.
- `ST_Covers(area, pos)` accepts `geography` and can use the index; `ST_Contains` is for `geometry` only.
- `ST_Buffer(pos, r)` builds a round area `r` metres wide, such as a no-truck zone around the market.

Many people think a GiST index makes every spatial query fast. In fact the index is only used when the condition is an operator or function it understands, such as `&&`, `<->`, `ST_DWithin` or `ST_Covers`.

The two-step figure at the end of this section shows both stages on the lab itself: 2,210 candidates through the boxes, then the 1,562 orders that are really within 3 km.

## Syntax

```sql
CREATE INDEX ON t USING gist (pos);
WHERE ST_DWithin(pos, point, metres)
WHERE ST_Covers(area, pos)
ST_Buffer(point, metres)
```

The radius of `ST_DWithin` and `ST_Buffer` is in metres when the arguments are `geography`.

## Example

The area of each delivery zone:

```sql
SELECT name, round((ST_Area(area)
  / 1e6)::numeric, 1) AS km2
FROM zones ORDER BY id;
```

`Son Tra` is the largest at 58 km²; `Thanh Khe` the smallest at 10.7 km².

The plan for counting the orders around stall 1:

```sql
EXPLAIN SELECT count(*)
FROM orders o, shops s
WHERE s.id = 1
  AND ST_DWithin(o.pos, s.pos, 3000);
```

It has `Bitmap Index Scan on orders_pos_gist` with `Index Cond: (pos && _st_expand(...))`, then `Filter: st_dwithin(...)` measuring each candidate again.

The orders inside a 1 km no-truck zone around stall 1:

```sql
SELECT count(*) AS orders
FROM orders o, shops s
WHERE s.id = 1
  AND ST_Covers(
    ST_Buffer(s.pos, 1000), o.pos);
```

166 orders, to be delivered by motorbike.

## Common mistakes

Using `ST_Contains` with `geography`:

```sql
-- ERROR 42883: no st_contains(geography, geography)
SELECT count(*) FROM zones z
JOIN orders o
  ON ST_Contains(z.area, o.pos);
```

`ST_Contains` only takes `geometry`. With `geography`, use `ST_Covers`.

Measuring a radius on `geometry` 4326:

```sql
-- WRONG: 3000 degrees, not metres
SELECT count(*) AS orders
FROM orders o, shops s
WHERE s.id = 1 AND ST_DWithin(
  o.pos::geometry,
  s.pos::geometry, 3000);
```

```sql
-- FIX: geography, radius in metres
SELECT count(*) AS orders
FROM orders o, shops s
WHERE s.id = 1
  AND ST_DWithin(o.pos, s.pos, 3000);
```

The wrong version counts all 20,000 orders; the fix counts 1,562.

Comparing with `ST_Distance` instead of `ST_DWithin`:

```sql
-- WRONG: no index condition, every row is measured
EXPLAIN SELECT count(*)
FROM orders o, shops s
WHERE s.id = 1
  AND ST_Distance(o.pos, s.pos) <= 3000;
```

```sql
-- FIX: ST_DWithin brings the box condition
EXPLAIN SELECT count(*)
FROM orders o, shops s
WHERE s.id = 1
  AND ST_DWithin(o.pos, s.pos, 3000);
```

The wrong plan is a `Seq Scan on orders` at an estimated cost over 250,000; the fixed plan goes through the index at about 38.

## Practice

Count the orders per zone, count the orders around one stall (this step is graded on speed too), find the orders outside every zone, then count the orders around each stall. Then answer two questions.

## Recap

- A GiST index stores bounding boxes: stage one drops the far boxes, stage two measures the rest exactly.
- `ST_DWithin` can use the index; `ST_Distance(...) <= r` measures every row.
- With `geography`, put points into zones with `ST_Covers`; `ST_Contains` is for `geometry` only.
- The radius is metres with `geography`, but degrees with `geometry` 4326.
