---
id: e-pg-l4-03
engine: postgres
level: L4
module: planner-stats
title: "Thống kê mở rộng cho các cột tương quan"
title_en: "Extended statistics for correlated columns"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Nhận ra ước lượng thấp do planner coi hai cột là độc lập", en: "Spot an underestimate caused by the planner treating two columns as independent" }
  - { vi: "Chọn loại `CREATE STATISTICS` phù hợp: dependencies, ndistinct, mcv", en: "Pick the right `CREATE STATISTICS` kind: dependencies, ndistinct, mcv" }
  - { vi: "Đọc kết quả trong `pg_stats_ext`", en: "Read the result in `pg_stats_ext`" }
requires: [e-pg-l4-02]
sources:
  - { url: https://www.postgresql.org/docs/18/planner-stats.html, title_vi: "Thống kê mà planner dùng" }
  - { url: https://www.postgresql.org/docs/18/sql-createstatistics.html, title_vi: "CREATE STATISTICS" }
  - { url: https://www.postgresql.org/docs/18/multivariate-statistics-examples.html, title_vi: "Ví dụ thống kê nhiều cột" }
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS addr_plain, addr_stats CASCADE;
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
    - task: { vi: "Mỗi quận (`district`) chỉ thuộc một thành phố (`city`). So ba con số cho điều kiện city = 3 và district = 33: ước lượng trên `addr_plain`, ước lượng trên `addr_stats`, và số dòng thật. Ba cột: plain, with_stats, actual. Dùng hàm `est(text)` có sẵn: nó nhận nguyên một câu SQL dạng chuỗi và trả số dòng planner ước lượng. Đoán trước: ước lượng trên bảng không có thống kê mở rộng thấp hơn, cao hơn hay bằng số thật?", en: "Each `district` belongs to exactly one `city`. Compare three numbers for city = 3 and district = 33: the estimate on `addr_plain`, the estimate on `addr_stats`, and the real count. Three columns: plain, with_stats, actual. Use the ready-made `est(text)` function: it takes a whole SQL query as a string and returns the planner's row estimate. Guess first: is the estimate without extended statistics lower than, higher than or equal to the real count?" }
      solution: "SELECT est('SELECT * FROM addr_plain WHERE city = 3 AND district = 33') AS plain, est('SELECT * FROM addr_stats WHERE city = 3 AND district = 33') AS with_stats, (SELECT count(*) FROM addr_plain WHERE city = 3 AND district = 33) AS actual"
      check: rows
      hint: { vi: "`est` nhận nguyên câu SQL dưới dạng chuỗi.", en: "`est` takes the whole SQL query as a string." }
    - task: { vi: "Đọc đối tượng thống kê của `addr_stats`: tên, các cột (ép text) và phần `dependencies`.", en: "Read the statistics object of `addr_stats`: its name, its columns (cast to text) and its `dependencies`." }
      solution: "SELECT statistics_name, attnames::text, dependencies FROM pg_stats_ext WHERE tablename = 'addr_stats'"
      check: rows
      hint: { vi: "View `pg_stats_ext` giống `pg_stats` nhưng cho thống kê nhiều cột.", en: "The `pg_stats_ext` view is like `pg_stats`, for multi-column statistics." }
    - task: { vi: "Sửa gốc cho `addr_plain`: tạo đối tượng thống kê tên `addr_plain_dep`, loại phụ thuộc hàm (dependencies), trên hai cột city và district.", en: "Fix the root cause for `addr_plain`: create a statistics object named `addr_plain_dep`, of the functional-dependency kind (dependencies), on the two columns city and district." }
      solution: "CREATE STATISTICS addr_plain_dep (dependencies) ON city, district FROM addr_plain"
      check: catalog
      hint: { vi: "`CREATE STATISTICS name (kind) ON col1, col2 FROM table`. Ngoài đời, nhớ ANALYZE sau đó.", en: "`CREATE STATISTICS name (kind) ON col1, col2 FROM table`. In real life, remember to ANALYZE afterwards." }
quiz:
  - q: { vi: "Báo cáo lọc `WHERE city = … AND district = …` luôn ước lượng thấp 10 lần và chọn Nested Loop chậm. Sửa thế nào là đúng gốc?", en: "A report filtering `WHERE city = … AND district = …` is always underestimated tenfold and picks a slow Nested Loop. What is the root-cause fix?" }
    options:
      - { vi: "`CREATE STATISTICS … (dependencies) ON city, district` rồi ANALYZE", en: "`CREATE STATISTICS … (dependencies) ON city, district`, then ANALYZE" }
      - { vi: "Tắt `enable_nestloop` cho cả server", en: "Turn `enable_nestloop` off for the whole server" }
      - { vi: "Tăng `random_page_cost`", en: "Raise `random_page_cost`" }
    answer: 0
    trap: 1
    why: { vi: "Tắt `enable_nestloop` nghe hợp lý vì Nested Loop chậm là thứ bạn nhìn thấy, nhưng nó chỉ là hậu quả. Gốc nằm ở ước lượng số dòng (row estimate): planner coi hai điều kiện độc lập và nhân độ chọn lọc, 1/10 × 1/100, trong khi quận đã quyết định thành phố, nên ước lượng thấp 10 lần và planner tưởng vòng lặp chỉ chạy vài lần. Thống kê mở rộng (extended statistics) loại `dependencies` cho planner biết điều đó; tắt Nested Loop cho cả server làm hỏng những câu mà nó là cách nhanh nhất. `random_page_cost` là giá đọc trang, không sửa được ước lượng số dòng.", en: "Turning `enable_nestloop` off sounds right because the slow Nested Loop is what you see, but it is only the consequence. The root is the row estimate: the planner treats the two conditions as independent and multiplies the selectivities, 1/10 × 1/100, while the district already decides the city, so the estimate is ten times too low and the planner thinks the loop runs only a few times. Extended statistics of kind `dependencies` tell the planner that; disabling Nested Loop server-wide hurts the queries where it is the fastest way. `random_page_cost` prices page reads and cannot fix a row estimate." }
  - q: { vi: "`GROUP BY city, district` bị ước lượng quá nhiều nhóm. Loại thống kê nào giúp?", en: "`GROUP BY city, district` is estimated with far too many groups. Which statistics kind helps?" }
    options:
      - { vi: "`mcv`", en: "`mcv`" }
      - { vi: "`ndistinct`", en: "`ndistinct`" }
      - { vi: "`dependencies`", en: "`dependencies`" }
    answer: 1
    trap: 2
    why: { vi: "`dependencies` nghe hợp lý vì hai cột phụ thuộc nhau, nhưng nó chỉ sửa ước lượng của điều kiện bằng trong WHERE, không sửa số nhóm. Không có thống kê mở rộng, planner nhân số giá trị khác nhau của từng cột: 10 thành phố × 100 quận = 1.000 nhóm, trong khi thật chỉ có 100 cặp. `ndistinct` lưu đúng số tổ hợp khác nhau của nhóm cột, thứ GROUP BY cần để ước lượng số nhóm. `mcv` chỉ giữ các tổ hợp phổ biến và tần suất của chúng, dùng cho điều kiện lọc.", en: "`dependencies` sounds right because the columns depend on each other, but it only fixes the estimate of equality conditions in WHERE, not the group count. Without extended statistics the planner multiplies each column's distinct count: 10 cities × 100 districts = 1,000 groups, while only 100 pairs exist. `ndistinct` stores the exact number of distinct combinations of the columns, which is what GROUP BY needs to estimate the group count. `mcv` only keeps the common combinations and their frequencies, for filter conditions." }
---
## Mở bài

Bảng địa chỉ lọc theo thành phố và quận, và planner ước lượng 10 dòng trong khi thật là 100. Mỗi cột có thống kê đúng, vậy sai ở đâu?

## Ý chính

Thống kê thường (`pg_stats`) nói về từng cột riêng. Khi câu có hai điều kiện trên hai cột, mặc định planner coi chúng độc lập và nhân độ chọn lọc: sel(`city = 3`) × sel(`district = 33`) = 1/10 × 1/100. Với 10.000 dòng, nó ước lượng 10.

Nhiều người nghĩ planner biết các cột liên quan với nhau. Thật ra nó không biết, trừ khi bạn khai báo. Ở đây quận 33 luôn thuộc thành phố 3, nên điều kiện thành phố không lọc thêm dòng nào: số thật là 100, gấp 10 lần ước lượng. Cột tương quan kiểu này rất hay gặp: quận và thành phố, mã bưu điện và tỉnh, mẫu xe và hãng.

Ước lượng sai ở tầng dưới lan lên trên. Số dòng thấp giả tạo làm planner chọn Nested Loop vì tưởng vòng lặp chỉ chạy vài lần, rồi nó chạy hàng nghìn lần. Dấu hiệu: `rows=` của `EXPLAIN` lệch hơn 10 lần so với `actual rows` của `EXPLAIN ANALYZE` ngay ở một nút lọc.

`CREATE STATISTICS` khai báo thống kê trên nhiều cột, có ba loại. `dependencies` (phụ thuộc hàm) sửa ước lượng của các điều kiện bằng. `ndistinct` lưu số tổ hợp khác nhau, dùng cho `GROUP BY` và `DISTINCT`. `mcv` lưu danh sách tổ hợp phổ biến, chính xác nhất: nó biết cả tổ hợp không tồn tại. Đối tượng thống kê chỉ có dữ liệu sau `ANALYZE`; xem kết quả trong `pg_stats_ext`.

## Cú pháp

```sql
CREATE STATISTICS [ IF NOT EXISTS ] stat_name [ ( kind [, ...] ) ]
  ON column_name, column_name [, ...] FROM table_name;
ANALYZE table_name;
SELECT statistics_name, attnames, n_distinct, dependencies FROM pg_stats_ext WHERE tablename = 'table_name';
DROP STATISTICS [ IF EXISTS ] stat_name;
```

- `dependencies`: cột này quyết định cột kia tới mức nào; cho điều kiện bằng.
- `ndistinct`: số tổ hợp khác nhau; cho `GROUP BY`, `DISTINCT`.
- `mcv`: các tổ hợp phổ biến và tần suất; cho điều kiện bằng và khoảng.
- Không ghi `kind`: tạo cả ba loại.

## Ví dụ

Ước lượng thấp 10 lần khi không có thống kê mở rộng:

```sql
SELECT est('SELECT * FROM addr_plain WHERE city = 7 AND district = 77') AS estimate, count(*) AS actual
FROM addr_plain WHERE city = 7 AND district = 77;
```

Số nhóm của `GROUP BY` cũng bị ước lượng sai, theo chiều ngược lại:

```sql
SELECT est('SELECT city, district FROM addr_plain GROUP BY city, district') AS groups_guess,
       (SELECT count(*) FROM (SELECT DISTINCT city, district FROM addr_plain) AS d) AS groups_real;
```

Planner nhân 10 × 100 = 1.000 nhóm, thật chỉ có 100. Thêm `ndistinct` rồi ANALYZE:

```sql
CREATE STATISTICS addr_plain_nd (ndistinct) ON city, district FROM addr_plain;
ANALYZE addr_plain;
SELECT est('SELECT city, district FROM addr_plain GROUP BY city, district') AS groups_guess;
```

```sql
SELECT statistics_name, n_distinct FROM pg_stats_ext WHERE tablename = 'addr_plain';
```

Ước lượng về đúng 100; `n_distinct` ghi `{"2, 3": 100}`: cột số 2 và 3 có 100 tổ hợp.

`dependencies` không biết một tổ hợp không tồn tại. Quận 34 thuộc thành phố 4, không phải 3:

```sql
SELECT est('SELECT * FROM addr_stats WHERE city = 3 AND district = 34') AS dep_guess;
```

```sql
CREATE STATISTICS addr_stats_mcv (mcv) ON city, district FROM addr_stats;
ANALYZE addr_stats;
SELECT est('SELECT * FROM addr_stats WHERE city = 3 AND district = 34') AS mcv_guess;
```

Vậy tổ hợp (3, 34) không có dòng nào. Chỉ có `dependencies`, planner vẫn ước lượng 100, vì nó chỉ biết quận quyết định thành phố chứ không biết cặp nào tồn tại. Có `mcv`, nó thấy tổ hợp này không nằm trong danh sách và ước lượng 1, mức thấp nhất.

## Lỗi hay gặp

Khai báo thống kê mở rộng trên một cột:

```sql
-- ERROR 42P17: extended statistics require at least 2 columns
CREATE STATISTICS addr_one (dependencies) ON city FROM addr_plain;
```

Thống kê một cột đã có sẵn trong `pg_stats`; muốn chi tiết hơn thì dùng `SET STATISTICS` cho cột đó.

Tạo đối tượng thống kê rồi quên ANALYZE:

```sql
-- WRONG: the statistics object is still empty
CREATE TABLE addr_copy AS SELECT * FROM addr_plain;
ANALYZE addr_copy;
CREATE STATISTICS addr_copy_dep (dependencies) ON city, district FROM addr_copy;
SELECT est('SELECT * FROM addr_copy WHERE city = 3 AND district = 33') AS estimate;
```

```sql
-- FIX: ANALYZE fills it
ANALYZE addr_copy;
SELECT est('SELECT * FROM addr_copy WHERE city = 3 AND district = 33') AS estimate;
```

`CREATE STATISTICS` chỉ ghi định nghĩa; ước lượng vẫn là 10 cho tới khi ANALYZE tính phụ thuộc, sau đó là 100.

## Thực hành

Ba bước: so ước lượng với số thật trên hai bảng, đọc đối tượng thống kê của `addr_stats`, rồi tự tạo thống kê phụ thuộc cho `addr_plain`. Sau đó là hai câu hỏi.

## Tóm tắt

- Mặc định planner nhân độ chọn lọc của các cột như thể độc lập, nên cột tương quan bị ước lượng thấp.
- `dependencies` cho điều kiện bằng, `ndistinct` cho `GROUP BY`, `mcv` chính xác nhất và biết tổ hợp không tồn tại.
- Thống kê mở rộng cần ít nhất hai cột và chỉ có dữ liệu sau `ANALYZE`.
- Sửa ước lượng tận gốc, đừng tắt một loại join để che triệu chứng.

# EN

## Opening

An address table is filtered by city and district, and the planner estimates 10 rows while the truth is 100. Each column has correct statistics, so what went wrong?

## Key idea

Plain statistics (`pg_stats`) describe each column on its own. When a query has two conditions on two columns, the planner by default treats them as independent and multiplies the selectivities: sel(`city = 3`) × sel(`district = 33`) = 1/10 × 1/100. With 10,000 rows it estimates 10.

Many people think the planner knows which columns are related. In fact it does not, unless you declare it. Here district 33 always belongs to city 3, so the city condition removes no extra row: the real count is 100, ten times the estimate. Correlated columns like these are common: district and city, postcode and province, car model and maker.

A wrong estimate at the bottom spreads upward. An artificially low row count makes the planner pick a Nested Loop because it expects the loop to run a few times, and then it runs thousands of times. The sign: the `rows=` of `EXPLAIN` is more than 10 times off from the `actual rows` of `EXPLAIN ANALYZE` right at a filter node.

`CREATE STATISTICS` declares statistics over several columns, in three kinds. `dependencies` (functional dependencies) fixes the estimate of equality conditions. `ndistinct` stores the number of distinct combinations, for `GROUP BY` and `DISTINCT`. `mcv` stores a list of common combinations and is the most precise: it even knows which combinations do not exist. A statistics object only holds data after `ANALYZE`; read the result in `pg_stats_ext`.

## Syntax

```sql
CREATE STATISTICS [ IF NOT EXISTS ] stat_name [ ( kind [, ...] ) ]
  ON column_name, column_name [, ...] FROM table_name;
ANALYZE table_name;
SELECT statistics_name, attnames, n_distinct, dependencies FROM pg_stats_ext WHERE tablename = 'table_name';
DROP STATISTICS [ IF EXISTS ] stat_name;
```

- `dependencies`: how far one column determines the other; for equality conditions.
- `ndistinct`: the number of distinct combinations; for `GROUP BY`, `DISTINCT`.
- `mcv`: the common combinations and their frequencies; for equality and range conditions.
- No `kind` given: all three are built.

## Example

A tenfold underestimate without extended statistics:

```sql
SELECT est('SELECT * FROM addr_plain WHERE city = 7 AND district = 77') AS estimate, count(*) AS actual
FROM addr_plain WHERE city = 7 AND district = 77;
```

The group count of a `GROUP BY` is wrong too, the other way round:

```sql
SELECT est('SELECT city, district FROM addr_plain GROUP BY city, district') AS groups_guess,
       (SELECT count(*) FROM (SELECT DISTINCT city, district FROM addr_plain) AS d) AS groups_real;
```

The planner multiplies 10 × 100 = 1,000 groups; there are only 100. Add `ndistinct`, then ANALYZE:

```sql
CREATE STATISTICS addr_plain_nd (ndistinct) ON city, district FROM addr_plain;
ANALYZE addr_plain;
SELECT est('SELECT city, district FROM addr_plain GROUP BY city, district') AS groups_guess;
```

```sql
SELECT statistics_name, n_distinct FROM pg_stats_ext WHERE tablename = 'addr_plain';
```

The estimate becomes exactly 100; `n_distinct` reads `{"2, 3": 100}`: columns 2 and 3 have 100 combinations.

`dependencies` does not know that a combination does not exist. District 34 belongs to city 4, not 3:

```sql
SELECT est('SELECT * FROM addr_stats WHERE city = 3 AND district = 34') AS dep_guess;
```

```sql
CREATE STATISTICS addr_stats_mcv (mcv) ON city, district FROM addr_stats;
ANALYZE addr_stats;
SELECT est('SELECT * FROM addr_stats WHERE city = 3 AND district = 34') AS mcv_guess;
```

So the pair (3, 34) has no row at all. With `dependencies` only, the planner still estimates 100, because it only knows that the district decides the city, not which pairs exist. With `mcv` it sees the combination is not in the list and estimates 1, the lowest it ever goes.

## Common mistakes

Declaring extended statistics on one column:

```sql
-- ERROR 42P17: extended statistics require at least 2 columns
CREATE STATISTICS addr_one (dependencies) ON city FROM addr_plain;
```

Single-column statistics already exist in `pg_stats`; for more detail, use `SET STATISTICS` on that column.

Creating a statistics object and forgetting ANALYZE:

```sql
-- WRONG: the statistics object is still empty
CREATE TABLE addr_copy AS SELECT * FROM addr_plain;
ANALYZE addr_copy;
CREATE STATISTICS addr_copy_dep (dependencies) ON city, district FROM addr_copy;
SELECT est('SELECT * FROM addr_copy WHERE city = 3 AND district = 33') AS estimate;
```

```sql
-- FIX: ANALYZE fills it
ANALYZE addr_copy;
SELECT est('SELECT * FROM addr_copy WHERE city = 3 AND district = 33') AS estimate;
```

`CREATE STATISTICS` only records the definition; the estimate stays at 10 until ANALYZE computes the dependency, then it is 100.

## Practice

Three steps: compare the estimates with the real count on both tables, read the statistics object of `addr_stats`, then create dependency statistics for `addr_plain` yourself. Then two questions.

## Recap

- By default the planner multiplies column selectivities as if they were independent, so correlated columns are underestimated.
- `dependencies` for equality conditions, `ndistinct` for `GROUP BY`, `mcv` the most precise and aware of combinations that do not exist.
- Extended statistics need at least two columns and only hold data after `ANALYZE`.
- Fix the estimate at the root; do not switch off a join type to hide the symptom.
