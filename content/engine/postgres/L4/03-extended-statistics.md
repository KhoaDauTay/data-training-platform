---
id: e-pg-l4-03
engine: postgres
level: L4
module: planner
title_en: "Extended statistics for correlated columns"
kind: lab
minutes: 15
objectives:
  - { vi: "Nhận ra ước lượng thấp do planner coi hai cột là độc lập", en: "Spot an underestimate caused by the planner treating two columns as independent" }
  - { vi: "Chọn loại `CREATE STATISTICS` phù hợp: dependencies, ndistinct, mcv", en: "Pick the right `CREATE STATISTICS` kind: dependencies, ndistinct, mcv" }
  - { vi: "Đọc kết quả trong `pg_stats_ext`", en: "Read the result in `pg_stats_ext`" }
requires: [e-pg-l4-02]
sources:
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/sql-createstatistics.html
  - https://www.postgresql.org/docs/18/multivariate-statistics-examples.html
viz: planTree
lab:
  setup: |
    DROP TABLE IF EXISTS addr_plain, addr_stats;
    DROP FUNCTION IF EXISTS est(text);
    CREATE TABLE addr_plain (id int, city int, district int);
    INSERT INTO addr_plain SELECT g, g % 10, g % 100 FROM generate_series(1, 10000) g;
    CREATE TABLE addr_stats (LIKE addr_plain);
    INSERT INTO addr_stats SELECT * FROM addr_plain;
    CREATE STATISTICS addr_stats_dep (dependencies) ON city, district FROM addr_stats;
    ANALYZE addr_plain, addr_stats;
    -- helper: the planner's row estimate for one query (author code, never player text)
    CREATE FUNCTION est(q text) RETURNS bigint LANGUAGE plpgsql AS $$
    DECLARE j json;
    BEGIN
      EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j;
      RETURN (j->0->'Plan'->>'Plan Rows')::bigint;
    END $$;
  steps:
    - task: { vi: "Mỗi quận (`district`) chỉ thuộc một thành phố (`city`). So ba con số cho điều kiện city = 3 và district = 33: ước lượng trên `addr_plain`, ước lượng trên `addr_stats`, và số dòng thật. Ba cột: plain, with_stats, actual. Dùng hàm `est(text)` có sẵn.", en: "Each `district` belongs to exactly one `city`. Compare three numbers for city = 3 and district = 33: the estimate on `addr_plain`, the estimate on `addr_stats`, and the real count. Three columns: plain, with_stats, actual. Use the ready-made `est(text)` function." }
      solution: "SELECT est('SELECT * FROM addr_plain WHERE city = 3 AND district = 33') AS plain, est('SELECT * FROM addr_stats WHERE city = 3 AND district = 33') AS with_stats, (SELECT count(*) FROM addr_plain WHERE city = 3 AND district = 33) AS actual"
      check: rows
      hint: { vi: "`est` nhận nguyên câu SQL dưới dạng chuỗi.", en: "`est` takes the whole SQL query as a string." }
    - task: { vi: "Đọc đối tượng thống kê của `addr_stats`: tên, các cột (ép text) và phần `dependencies`.", en: "Read the statistics object of `addr_stats`: its name, its columns (cast to text) and its `dependencies`." }
      solution: "SELECT statistics_name, attnames::text, dependencies FROM pg_stats_ext WHERE tablename = 'addr_stats'"
      check: catalog
      hint: { vi: "View `pg_stats_ext` giống `pg_stats` nhưng cho thống kê nhiều cột.", en: "The `pg_stats_ext` view is like `pg_stats`, for multi-column statistics." }
quiz:
  - q: { vi: "Báo cáo lọc `WHERE city = … AND district = …` luôn ước lượng thấp 10 lần và chọn Nested Loop chậm. Sửa thế nào là đúng gốc?", en: "A report filtering `WHERE city = … AND district = …` is always underestimated tenfold and picks a slow Nested Loop. What is the root-cause fix?" }
    options:
      - { vi: "`CREATE STATISTICS … (dependencies) ON city, district` rồi ANALYZE", en: "`CREATE STATISTICS … (dependencies) ON city, district`, then ANALYZE" }
      - { vi: "Tắt `enable_nestloop` cho cả server", en: "Turn `enable_nestloop` off for the whole server" }
      - { vi: "Tăng `random_page_cost`", en: "Raise `random_page_cost`" }
    answer: 0
    why: { vi: "Lỗi nằm ở ước lượng: planner nhân hai độ chọn lọc như thể độc lập. Thống kê phụ thuộc hàm cho nó biết district quyết định city. Tắt một loại join chỉ che triệu chứng và làm hỏng câu khác.", en: "The error is in the estimate: the planner multiplies two selectivities as if independent. Functional-dependency statistics tell it that district determines city. Disabling a join type only hides the symptom and hurts other queries." }
  - q: { vi: "`GROUP BY city, district` bị ước lượng quá nhiều nhóm. Loại thống kê nào giúp?", en: "`GROUP BY city, district` is estimated with far too many groups. Which statistics kind helps?" }
    options:
      - { vi: "`mcv`", en: "`mcv`" }
      - { vi: "`ndistinct`", en: "`ndistinct`" }
      - { vi: "`dependencies`", en: "`dependencies`" }
    answer: 1
    why: { vi: "`ndistinct` lưu số tổ hợp khác nhau của nhóm cột, đúng thứ GROUP BY cần để đoán số nhóm.", en: "`ndistinct` stores the number of distinct combinations of the columns, exactly what GROUP BY needs to guess the number of groups." }
---

## Ý chính

- Mặc định planner coi các điều kiện trên các cột khác nhau là **độc lập**: độ chọn lọc của `a = x AND b = y` = sel(a) × sel(b). Với cột tương quan (quận → thành phố, mã bưu điện → tỉnh) kết quả thấp hơn thật nhiều lần.
- `CREATE STATISTICS` có ba loại: `dependencies` (phụ thuộc hàm, cho điều kiện bằng), `ndistinct` (số tổ hợp khác nhau, cho GROUP BY), `mcv` (danh sách tổ hợp phổ biến, chính xác nhất cho điều kiện bằng và khoảng). Đối tượng thống kê chỉ có dữ liệu sau ANALYZE.
- Ước lượng sai ở tầng dưới lan lên trên: số dòng thấp giả tạo làm planner chọn Nested Loop, rồi vòng lặp chạy hàng nghìn lần.
- Kiểm tra: so `rows=` (ước lượng) với `actual rows` trong `EXPLAIN ANALYZE`. Lệch hơn 10 lần ở một nút lọc là dấu hiệu.

## Ví dụ

Kết quả thật trên PGlite: `district` từ 0 đến 99, `city = district % 10`.

```text
plain = 10    with_stats = 100    actual = 100

statistics_name  attnames         dependencies
addr_stats_dep   {city,district}  {"3 => 2": 1.000000}
```

Không có thống kê mở rộng: 10000 × 1/10 × 1/100 = 10. Có `dependencies`: Postgres biết cột 3 (district) quyết định cột 2 (city) với độ chắc 1.0, nên chỉ tính sel(district) = 1/100 → 100 dòng, đúng bằng thật.

## Thực hành

So ước lượng trước và sau, rồi đọc đối tượng thống kê. Kỹ năng chuyên gia: chẩn đoán ước lượng sai do cột tương quan và sửa bằng thống kê, không bằng cách tắt planner.

# EN

## Key ideas

- By default the planner treats conditions on different columns as **independent**: the selectivity of `a = x AND b = y` is sel(a) × sel(b). For correlated columns (district → city, postcode → province) the result is many times too low.
- `CREATE STATISTICS` has three kinds: `dependencies` (functional dependency, for equality conditions), `ndistinct` (number of distinct combinations, for GROUP BY), `mcv` (list of common combinations, the most precise for equality and range conditions). A statistics object only holds data after ANALYZE.
- A wrong estimate at the bottom spreads upward: an artificially low row count makes the planner choose a Nested Loop, and the loop then runs thousands of times.
- Check: compare `rows=` (estimate) with `actual rows` in `EXPLAIN ANALYZE`. More than 10× off at a filter node is the sign.

## Example

Real output from PGlite: `district` runs from 0 to 99, `city = district % 10`.

```text
plain = 10    with_stats = 100    actual = 100

statistics_name  attnames         dependencies
addr_stats_dep   {city,district}  {"3 => 2": 1.000000}
```

Without extended statistics: 10000 × 1/10 × 1/100 = 10. With `dependencies`, Postgres knows column 3 (district) determines column 2 (city) with degree 1.0, so it only uses sel(district) = 1/100, giving 100 rows, exactly the real count.

## Practice

Compare the estimate before and after, then read the statistics object. Expert skill: diagnose a bad estimate caused by correlated columns and fix it with statistics, not by switching planner features off.
