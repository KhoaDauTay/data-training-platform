---
id: e-pg-ext-02
engine: postgres
level: EXT
module: ext-geo
title: "PostGIS 1: điểm, hệ tọa độ, khoảng cách thật"
title_en: "PostGIS 1: points, SRIDs, real distance"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 + PostGIS 3.6.2 (PGlite 0.5.16)", date: "2026-11-26" }
figures: [{ name: pg-ext-geom-vs-geog, at: idea }]
objectives:
  - vi: Lưu vị trí cảng thành `geography(Point, 4326)` và đọc lại kinh độ, vĩ độ.
    en: Store port locations as `geography(Point, 4326)` and read longitude and latitude back.
  - vi: Đo khoảng cách thật bằng mét với `ST_Distance`, và biết vì sao `geometry` 4326 lại trả về độ.
    en: Measure real distances in metres with `ST_Distance`, and know why `geometry` 4326 returns degrees instead.
  - vi: Tìm điểm gần nhất bằng toán tử `<->` và lọc theo bán kính bằng `ST_DWithin`.
    en: Find the nearest point with the `<->` operator and filter by radius with `ST_DWithin`.
requires: [e-pg-ext-01]
sources:
  - https://www.postgresql.org/docs/18/gist.html
  - { url: "https://postgis.net/docs/using_postgis_dbmanagement.html#PostGIS_Geography", title: "PostGIS · Geography data type" }
  - { url: "https://postgis.net/docs/ST_Distance.html", title: "PostGIS · ST_Distance" }
  - { url: "https://postgis.net/docs/ST_DWithin.html", title: "PostGIS · ST_DWithin" }
  - { url: "https://postgis.net/docs/geometry_distance_knn.html", title: "PostGIS · <-> (KNN distance)" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE TABLE ports (
      code text PRIMARY KEY,
      name text NOT NULL,
      geog geography(Point, 4326) NOT NULL
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Da Nang (Tien Sa)', 'POINT(108.22 16.12)'),
      ('VNSGN', 'Ho Chi Minh (Cat Lai)', 'POINT(106.79 10.76)'),
      ('VNHPH', 'Hai Phong', 'POINT(106.70 20.86)'),
      ('SGSIN', 'Singapore', 'POINT(103.84 1.26)'),
      ('THLCH', 'Laem Chabang', 'POINT(100.88 13.08)'),
      ('HKHKG', 'Hong Kong', 'POINT(114.13 22.33)'),
      ('CNSHA', 'Shanghai', 'POINT(121.80 30.63)');
    CREATE TABLE ships (
      id int PRIMARY KEY,
      name text NOT NULL,
      pos geography(Point, 4326) NOT NULL
    );
    INSERT INTO ships VALUES
      (1, 'Lantern Star', 'POINT(109.00 14.50)'),
      (2, 'Cargo Queen', 'POINT(105.10 8.10)'),
      (3, 'Han River', 'POINT(112.50 18.40)');
  steps:
    - task:
        vi: "Khoảng cách trên mặt đất từ cảng `VNDAD` tới `VNSGN`, đổi ra km và làm tròn tới số nguyên (một cột `km`)."
        en: "The ground distance from port `VNDAD` to `VNSGN`, in km rounded to a whole number (one column `km`)."
      solution: SELECT round(ST_Distance(a.geog, b.geog) / 1000) AS km FROM ports a, ports b WHERE a.code = 'VNDAD' AND b.code = 'VNSGN'
      check: rows
      hint:
        vi: "`ST_Distance` trên hai cột `geography` trả về mét; chia 1000 rồi `round`."
        en: "`ST_Distance` on two `geography` columns returns metres; divide by 1000, then `round`."
    - task:
        vi: "Các cảng khác cách `VNDAD` không quá 1.000 km: `code` và `km` (làm tròn tới số nguyên), gần trước."
        en: "The other ports within 1,000 km of `VNDAD`: `code` and `km` (rounded to a whole number), nearest first."
      solution: SELECT b.code, round(ST_Distance(a.geog, b.geog) / 1000) AS km FROM ports a JOIN ports b ON b.code <> a.code WHERE a.code = 'VNDAD' AND ST_DWithin(a.geog, b.geog, 1000000) ORDER BY km
      check: rows
      ordered: true
      hint:
        vi: "`ST_DWithin(a, b, metres)` lọc theo bán kính; 1.000 km là 1000000 mét."
        en: "`ST_DWithin(a, b, metres)` filters by radius; 1,000 km is 1000000 metres."
    - task:
        vi: "Với mỗi tàu, cảng gần nhất: tên tàu (`name`) và mã cảng (`code`), theo `id` của tàu."
        en: "For each ship, its nearest port: ship name (`name`) and port code (`code`), by ship `id`."
      solution: SELECT s.name, p.code FROM ships s CROSS JOIN LATERAL (SELECT code FROM ports ORDER BY geog <-> s.pos LIMIT 1) p ORDER BY s.id
      check: rows
      ordered: true
      hint:
        vi: "`ORDER BY geog <-> s.pos LIMIT 1` trong một `LATERAL` chạy một lần cho mỗi tàu."
        en: "`ORDER BY geog <-> s.pos LIMIT 1` inside a `LATERAL` runs once per ship."
quiz:
  - q:
      vi: "Ép hai cột về `geometry` (SRID 4326) rồi gọi `ST_Distance` cho `VNDAD` và `VNSGN`, kết quả là 5.55. Đơn vị là gì?"
      en: "Cast both columns to `geometry` (SRID 4326) and call `ST_Distance` for `VNDAD` and `VNSGN`: the result is 5.55. What is the unit?"
    options:
      - { vi: "Ki-lô-mét, đã đổi sẵn từ mét", en: "Kilometres, already converted from metres" }
      - { vi: "Độ, đo thẳng trên mặt phẳng kinh–vĩ", en: "Degrees, measured flat on the lon–lat plane" }
      - { vi: "Hải lý, đơn vị chuẩn của hàng hải", en: "Nautical miles, the standard unit at sea" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì 5.55 trông như một quãng đường, nhưng `geometry` tính trên mặt phẳng theo đúng đơn vị của hệ tọa độ, và SRID 4326 đo bằng độ. Một độ kinh tuyến lại ngắn dần khi lên gần cực, nên đổi độ ra km là sai. `geography` tính trên mặt cầu và trả 613 km."
      en: "It sounds right because 5.55 looks like a distance, but `geometry` works on a plane in the units of its coordinate system, and SRID 4326 is in degrees. A degree of longitude also shrinks toward the poles, so turning degrees into km is wrong. `geography` works on the sphere and returns 613 km."
  - q:
      vi: "Bảng có 50.000 cảng và index GiST trên `geog`. Câu nào tìm cảng gần một vị trí nhất mà dùng được index?"
      en: "The table has 50,000 ports and a GiST index on `geog`. Which query finds the port nearest to a position and can use the index?"
    options:
      - { vi: "`ORDER BY geog <-> pos LIMIT 1`", en: "`ORDER BY geog <-> pos LIMIT 1`" }
      - { vi: "`ORDER BY ST_Distance(geog, pos) LIMIT 1`", en: "`ORDER BY ST_Distance(geog, pos) LIMIT 1`" }
      - { vi: "`WHERE geog = pos LIMIT 1`", en: "`WHERE geog = pos LIMIT 1`" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì cả hai cách cho cùng kết quả, nhưng index GiST chỉ trả dòng theo thứ tự gần dần khi câu sắp theo toán tử khoảng cách `<->`. Sắp theo `ST_Distance(...)` là sắp theo một hàm, nên Postgres tính khoảng cách cho cả 50.000 dòng rồi mới sắp."
      en: "It sounds right because both return the same answer, but a GiST index only hands rows back nearest first when the query sorts by the distance operator `<->`. Sorting by `ST_Distance(...)` sorts by a function, so Postgres computes the distance for all 50,000 rows and then sorts."
---
## Mở bài

Một tàu của Cargo Query đang ở ngoài khơi miền Trung và cần biết cảng gần nhất. Trước đây bài `e-pg-l2-16` đã làm việc này bằng `cube` và `earthdistance`, bản nhẹ. PostGIS là bộ đồ nghề đầy đủ mà các hệ thống bản đồ thật dùng.

## Ý chính

PostGIS thêm hai họ kiểu cho dữ liệu không gian. `geometry` là hình trên mặt phẳng: mọi phép đo theo đơn vị của hệ tọa độ. `geography` là điểm trên mặt cầu Trái Đất: khoảng cách, diện tích tính bằng mét theo đường cong mặt đất.

Mỗi giá trị mang một SRID, mã của hệ tọa độ. SRID 4326 là kinh độ, vĩ độ theo WGS 84, hệ mà GPS dùng. Điểm viết `POINT(lon lat)`: kinh độ (lon) trước.

- `ST_Distance(a, b)`: khoảng cách; mét với `geography`, đơn vị hệ tọa độ với `geometry`.
- `ST_DWithin(a, b, r)`: đúng khi hai điểm cách nhau không quá `r`, và dùng được index.
- `a <-> b`: toán tử khoảng cách; `ORDER BY ... <-> ... LIMIT n` đi qua index GiST để lấy n điểm gần nhất.
- `ST_Buffer(g, r)`: vùng quanh một điểm hay một hình, rộng `r` mét với `geography`.

Nhiều người nghĩ cứ lưu kinh độ, vĩ độ bằng `geometry` là đo được km. Thật ra `geometry` 4326 đo bằng độ trên một mặt phẳng, và một độ kinh tuyến ngắn dần khi đi về phía cực.

Hình hai bước ở cuối mục này đặt hai cách đo cạnh nhau cho cùng hai cảng.

## Cú pháp

```sql
geography(Point, 4326)
ST_Distance(a, b)
ST_DWithin(a, b, metres)
ORDER BY geog <-> point LIMIT n
```

Hằng số điểm viết `'POINT(108.22 16.12)'`; với cột `geography` Postgres tự đọc chuỗi đó. Muốn tính phẳng thì ép `::geometry`.

## Ví dụ

Đọc lại vị trí dưới dạng chữ:

```sql
SELECT code, ST_AsText(geog) AS wkt
FROM ports;
```

Mỗi cảng là `POINT(lon lat)`: kinh độ trước, vĩ độ sau.

Cùng hai cảng, hai cách đo:

```sql
SELECT
  ST_Distance(a.geog::geometry,
              b.geog::geometry) AS deg,
  ST_Distance(a.geog, b.geog) AS m
FROM ports a, ports b
WHERE a.code = 'VNDAD'
  AND b.code = 'VNSGN';
```

`deg` là 5.55 độ, `m` là khoảng 613.000 mét: chỉ số mét dùng được cho quãng đường.

Vùng 50 km quanh cảng Tiên Sa:

```sql
SELECT round(ST_Area(
  ST_Buffer(geog, 50000)) / 1e6) AS km2
FROM ports
WHERE code = 'VNDAD';
```

Khoảng 7.793 km², gần với π × 50²: `ST_Buffer` trên `geography` tính bằng mét.

## Lỗi hay gặp

Viết vĩ độ trước kinh độ:

```sql
-- WRONG: latitude first
SELECT round(ST_Distance(
  'POINT(16.12 108.22)'::geography,
  'POINT(10.76 106.79)'::geography
) / 1000) AS km;
```

```sql
-- FIX: longitude first, then latitude
SELECT round(ST_Distance(
  'POINT(108.22 16.12)'::geography,
  'POINT(106.79 10.76)'::geography
) / 1000) AS km;
```

Bản sai không báo lỗi mà trả 240 km, vì nó đặt hai điểm ở chỗ khác hẳn; bản sửa trả 613 km.

Trộn hai hệ tọa độ trong một phép đo:

```sql
-- ERROR XX000: mixed SRID geometries
SELECT ST_Distance(
  'SRID=4326;POINT(108 16)'::geometry,
  'SRID=3857;POINT(0 0)'::geometry);
```

Hai hình phải cùng SRID; đổi một bên bằng `ST_Transform` trước khi đo.

## Thực hành

Đo khoảng cách giữa hai cảng, lọc các cảng trong bán kính 1.000 km, rồi tìm cảng gần nhất cho từng tàu. Sau đó trả lời hai câu hỏi.

## Tóm tắt

- `geography(Point, 4326)` lưu kinh độ, vĩ độ trên mặt cầu; khoảng cách và diện tích ra mét.
- `geometry` 4326 đo phẳng bằng độ, không đổi ra km được.
- Điểm viết `POINT(lon lat)`; viết ngược không báo lỗi mà ra số sai.
- `ST_DWithin` lọc theo bán kính, `ORDER BY ... <-> ... LIMIT n` lấy điểm gần nhất qua index GiST.

# EN

## Opening

A Cargo Query ship is off the central coast and needs its nearest port. Lesson `e-pg-l2-16` did this with `cube` and `earthdistance`, the light version. PostGIS is the full toolkit real mapping systems use.

## Key idea

PostGIS adds two families of types for spatial data. `geometry` is shapes on a flat plane: every measure is in the units of its coordinate system. `geography` is points on the Earth's sphere: distances and areas come in metres along the curved surface.

Every value carries an SRID, the code of its coordinate system. SRID 4326 is longitude and latitude on WGS 84, the system GPS uses. A point is written `POINT(lon lat)`: longitude (lon) first.

- `ST_Distance(a, b)`: the distance; metres with `geography`, coordinate units with `geometry`.
- `ST_DWithin(a, b, r)`: true when the two are at most `r` apart, and it can use an index.
- `a <-> b`: the distance operator; `ORDER BY ... <-> ... LIMIT n` goes through a GiST index to fetch the n nearest points.
- `ST_Buffer(g, r)`: the area around a point or shape, `r` metres wide with `geography`.

Many people think storing longitude and latitude as `geometry` is enough to measure km. In fact `geometry` 4326 measures degrees on a plane, and a degree of longitude shrinks as you move toward the poles.

The two-step figure at the end of this section puts both ways of measuring side by side for the same two ports.

## Syntax

```sql
geography(Point, 4326)
ST_Distance(a, b)
ST_DWithin(a, b, metres)
ORDER BY geog <-> point LIMIT n
```

A point constant is written `'POINT(108.22 16.12)'`; for a `geography` column Postgres reads that string itself. Cast with `::geometry` to measure flat.

## Example

Read the locations back as text:

```sql
SELECT code, ST_AsText(geog) AS wkt
FROM ports;
```

Each port is `POINT(lon lat)`: longitude first, latitude second.

The same two ports, two ways of measuring:

```sql
SELECT
  ST_Distance(a.geog::geometry,
              b.geog::geometry) AS deg,
  ST_Distance(a.geog, b.geog) AS m
FROM ports a, ports b
WHERE a.code = 'VNDAD'
  AND b.code = 'VNSGN';
```

`deg` is 5.55 degrees, `m` about 613,000 metres: only the metres work as a travel distance.

A 50 km zone around Tien Sa port:

```sql
SELECT round(ST_Area(
  ST_Buffer(geog, 50000)) / 1e6) AS km2
FROM ports
WHERE code = 'VNDAD';
```

About 7,793 km², close to π × 50²: `ST_Buffer` on `geography` works in metres.

## Common mistakes

Writing latitude before longitude:

```sql
-- WRONG: latitude first
SELECT round(ST_Distance(
  'POINT(16.12 108.22)'::geography,
  'POINT(10.76 106.79)'::geography
) / 1000) AS km;
```

```sql
-- FIX: longitude first, then latitude
SELECT round(ST_Distance(
  'POINT(108.22 16.12)'::geography,
  'POINT(106.79 10.76)'::geography
) / 1000) AS km;
```

The wrong version raises no error and returns 240 km, because it puts both points somewhere else entirely; the fix returns 613 km.

Mixing two coordinate systems in one measure:

```sql
-- ERROR XX000: mixed SRID geometries
SELECT ST_Distance(
  'SRID=4326;POINT(108 16)'::geometry,
  'SRID=3857;POINT(0 0)'::geometry);
```

Both shapes need the same SRID; convert one side with `ST_Transform` before measuring.

## Practice

Measure the distance between two ports, keep the ports within 1,000 km, then find the nearest port for each ship. Then answer two questions.

## Recap

- `geography(Point, 4326)` stores longitude and latitude on the sphere; distances and areas come in metres.
- `geometry` 4326 measures flat in degrees, which do not convert to km.
- A point is `POINT(lon lat)`; writing it the other way round raises no error, only a wrong number.
- `ST_DWithin` filters by radius, and `ORDER BY ... <-> ... LIMIT n` fetches the nearest points through a GiST index.
