---
id: e-ts-l3-01
engine: timeseries
level: L3
module: storage
title: Gom gọn dữ liệu cũ thành bảng tổng hợp
title_en: Downsampling into rollups
kind: lab
runtime: browser
minutes: 22
figures: [{ name: ts-rollup-tiers, at: idea }]
objectives:
  - vi: Tạo bảng tổng hợp theo ngày bằng `CREATE MATERIALIZED VIEW`, và biết nó chỉ đổi khi `REFRESH`.
    en: Build a daily rollup with `CREATE MATERIALIZED VIEW`, and know it changes only on `REFRESH`.
  - vi: Lưu tổng và số đếm, không lưu trung bình, để gộp tiếp từ giờ lên ngày cho đúng.
    en: Store sums and counts, not averages, so hours can be rolled up into days correctly.
  - vi: Cập nhật bảng tổng hợp theo giờ chỉ cho những giờ mới, bằng `INSERT ... ON CONFLICT`.
    en: Update an hourly rollup table for the new hours only, with `INSERT ... ON CONFLICT`.
requires: [e-ts-l2-04]
sources:
  - https://www.postgresql.org/docs/18/rules-materializedviews.html
  - https://www.postgresql.org/docs/18/sql-refreshmaterializedview.html
  - https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT
lab:
  setup: |
    CREATE TABLE readings (
      sensor_id int NOT NULL,
      ts timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL
    );
    INSERT INTO readings
    SELECT s, timestamptz '2026-10-29 00:00+00'
        + m * interval '5 minutes',
      -18 + (m / 12 % 6) / 2.0 + s / 2.0
    FROM generate_series(0, 671) m,
      generate_series(1, 2) s
    WHERE NOT (s = 2 AND m / 12 % 6 = 5
      AND m % 12 >= 6);
    CREATE TABLE temp_hourly (
      sensor_id int,
      hour timestamptz,
      readings int NOT NULL,
      sum_c numeric NOT NULL,
      max_c numeric(4,1) NOT NULL,
      PRIMARY KEY (sensor_id, hour)
    );
    INSERT INTO temp_hourly
    SELECT sensor_id, date_trunc('hour', ts),
      count(*), sum(temp_c), max(temp_c)
    FROM readings
    WHERE ts < '2026-10-31 00:00+00'
    GROUP BY 1, 2;
  steps:
    - task:
        vi: "Tạo materialized view `temp_daily`: mỗi cảm biến mỗi ngày (UTC) một dòng với `sensor_id`, `day`, `readings` (số số đo), `avg_c` (trung bình, làm tròn 2 chữ số)."
        en: "Create the materialized view `temp_daily`: one row per sensor per day (UTC) with `sensor_id`, `day`, `readings` (the number of readings), `avg_c` (the average, rounded to 2 decimals)."
      solution: |
        CREATE MATERIALIZED VIEW temp_daily AS
        SELECT sensor_id,
          date_trunc('day', ts) AS day,
          count(*) AS readings,
          round(avg(temp_c), 2) AS avg_c
        FROM readings
        GROUP BY 1, 2
      check: rows
      after: |
        SELECT sensor_id, day, readings, avg_c
        FROM temp_daily
        ORDER BY sensor_id, day
      hint:
        vi: "`CREATE MATERIALIZED VIEW temp_daily AS SELECT ... GROUP BY 1, 2`; bài chấm bằng nội dung của view."
        en: "`CREATE MATERIALIZED VIEW temp_daily AS SELECT ... GROUP BY 1, 2`; the step is graded on the view's contents."
    - task:
        vi: "Chỉ dùng bảng tổng hợp `temp_hourly` (không đọc `readings`), tính trung bình theo ngày của mỗi cảm biến, đúng như tính từ số đo thô (làm tròn 2 chữ số). Trả `sensor_id`, `day`, `avg_c`, xếp theo `sensor_id`, `day`."
        en: "Using only the rollup `temp_hourly` (without reading `readings`), compute each sensor's daily average exactly as from the raw readings (rounded to 2 decimals). Return `sensor_id`, `day`, `avg_c`, sorted by `sensor_id`, `day`."
      solution: |
        SELECT sensor_id,
          date_trunc('day', hour) AS day,
          round(sum(sum_c) / sum(readings), 2)
            AS avg_c
        FROM temp_hourly
        GROUP BY 1, 2
        ORDER BY 1, 2
      check: rows
      ordered: true
      hint:
        vi: "Trung bình của các trung bình giờ sai khi giờ có số số đo khác nhau; dùng `sum(sum_c) / sum(readings)`."
        en: "An average of hourly averages is wrong when hours hold different numbers of readings; use `sum(sum_c) / sum(readings)`."
    - task:
        vi: "`temp_hourly` mới có tới hết ngày 30/10. Thêm các giờ từ 0 giờ ngày 31/10 (UTC) trở đi, tính từ `readings`; nếu một giờ đã có thì ghi đè."
        en: "`temp_hourly` only goes up to the end of 30 Oct. Add the hours from 00:00 on 31 Oct (UTC) onwards, computed from `readings`; if an hour already exists, overwrite it."
      solution: |
        INSERT INTO temp_hourly
        SELECT sensor_id,
          date_trunc('hour', ts),
          count(*), sum(temp_c), max(temp_c)
        FROM readings
        WHERE ts >= '2026-10-31 00:00+00'
        GROUP BY 1, 2
        ON CONFLICT (sensor_id, hour)
        DO UPDATE SET
          readings = EXCLUDED.readings,
          sum_c = EXCLUDED.sum_c,
          max_c = EXCLUDED.max_c
      check: rows
      after: |
        SELECT count(*) AS hours,
          max(hour) AS newest,
          sum(readings) AS readings
        FROM temp_hourly
      hint:
        vi: "`INSERT INTO temp_hourly SELECT ... WHERE ts >= '2026-10-31 00:00+00' GROUP BY 1, 2 ON CONFLICT (sensor_id, hour) DO UPDATE SET ...`."
        en: "`INSERT INTO temp_hourly SELECT ... WHERE ts >= '2026-10-31 00:00+00' GROUP BY 1, 2 ON CONFLICT (sensor_id, hour) DO UPDATE SET ...`."
quiz:
  - q:
      vi: "Cảm biến 2 có giờ đủ 12 số đo và giờ chỉ có 6. Trung bình ngày bằng `avg(avg_c)` của các giờ có đúng không?"
      en: "Sensor 2 has hours with 12 readings and hours with only 6. Is the daily average equal to `avg(avg_c)` over the hours?"
    options:
      - { vi: "Đúng, trung bình nào cũng như nhau", en: "Yes, an average is an average" }
      - { vi: "Sai, giờ 6 số đo được tính nặng như giờ 12 số đo", en: "No, a 6-reading hour weighs as much as a 12-reading hour" }
      - { vi: "Đúng nếu làm tròn 2 chữ số", en: "Yes, if rounded to 2 decimals" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như trung bình nào cũng vậy, nhưng `avg(avg_c)` coi mỗi giờ là một phiếu, dù giờ đó có 6 hay 12 số đo. Ở cảm biến 2, các giờ ấm nhất chỉ có 6 số đo, nên trung bình các giờ ra -15,75 trong khi trung bình thật của 264 số đo trong ngày là -15,86. Lưu tổng (`sum_c`) và số đếm (`readings`) rồi chia `sum(sum_c) / sum(readings)` thì gộp từ giờ lên ngày vẫn ra đúng. Làm tròn không sửa được độ lệch này."
      en: "It sounds like an average is an average, but `avg(avg_c)` gives each hour one vote, whether it holds 6 or 12 readings. For sensor 2 the warmest hours hold only 6 readings, so the average of hours is -15.75 while the real average of the day's 264 readings is -15.86. Storing the sum (`sum_c`) and the count (`readings`) and dividing `sum(sum_c) / sum(readings)` keeps the roll-up from hours to days right. Rounding does not fix this gap."
  - q:
      vi: "Một số đo trễ được thêm vào `readings` sau khi tạo `temp_daily`. Đọc `temp_daily` ngay lúc đó thấy gì?"
      en: "A late reading is added to `readings` after `temp_daily` was created. What does reading `temp_daily` right then show?"
    options:
      - { vi: "Số mới, vì view luôn đọc bảng gốc", en: "The new figures, because a view always reads the base table" }
      - { vi: "Số cũ, tới khi chạy `REFRESH MATERIALIZED VIEW`", en: "The old figures, until `REFRESH MATERIALIZED VIEW` runs" }
      - { vi: "Báo lỗi vì view đã cũ", en: "An error, because the view is stale" }
    answer: 1
    trap: 0
    why:
      vi: "View thường (`CREATE VIEW`) đúng là chạy lại câu mỗi lần đọc, nhưng materialized view lưu kết quả xuống đĩa lúc tạo, nên đọc nó nhanh mà không thấy dòng mới. Nó giữ số cũ, không báo lỗi gì, tới khi `REFRESH MATERIALIZED VIEW temp_daily` tính lại toàn bộ. Vì `REFRESH` tính lại cả bảng, với dữ liệu lớn người ta thường giữ bảng tổng hợp thường và chỉ cập nhật những giờ mới bằng `INSERT ... ON CONFLICT`."
      en: "A plain view (`CREATE VIEW`) does rerun its query on every read, but a materialized view stores its result on disk when it is created, so reading it is fast but it does not see new rows. It keeps the old figures, with no error, until `REFRESH MATERIALIZED VIEW temp_daily` recomputes everything. Because `REFRESH` recomputes the whole thing, with large data people often keep a plain rollup table and update only the new hours with `INSERT ... ON CONFLICT`."
---
## Mở bài

Hai cảm biến gửi một số đo mỗi 5 phút, tức 576 dòng mỗi ngày, mà báo cáo tháng chỉ cần một số mỗi giờ hoặc mỗi ngày. Gom dữ liệu cũ thành bảng tổng hợp (downsampling, rollup) giúp báo cáo đọc ít dòng hơn và cho phép xóa số đo thô sớm hơn.

## Ý chính

**Materialized view lưu kết quả.** `CREATE MATERIALIZED VIEW temp_daily AS SELECT ...` chạy câu một lần và lưu kết quả như một bảng. Đọc nó nhanh, nhưng nó không tự cập nhật: phải `REFRESH MATERIALIZED VIEW`, và lệnh đó tính lại toàn bộ. Muốn đọc trong lúc refresh thì dùng `REFRESH ... CONCURRENTLY`, cần một index duy nhất trên view.

**Bảng tổng hợp cập nhật dần.** Một bảng thường như `temp_hourly`, với khóa chính `(sensor_id, hour)`, cho phép chỉ thêm hoặc ghi đè những giờ mới bằng `INSERT ... ON CONFLICT DO UPDATE`. TimescaleDB tự làm việc này với continuous aggregate (bài `e-pg-ext-12`); ở đây ta làm bằng tay trên PostgreSQL thường.

**Lưu tổng và số đếm, không lưu trung bình.** Trung bình của các trung bình chỉ đúng khi nhóm nào cũng có bằng số dòng. Lưu `sum_c` và `readings` thì gộp tiếp từ giờ lên ngày, từ ngày lên tháng vẫn đúng: `sum(sum_c) / sum(readings)`. `max` và `min` gộp được thẳng, vì max của các max là max.

Hình cuối mục cho thấy ba tầng: số đo thô, tổng hợp theo giờ, tổng hợp theo ngày.

## Cú pháp

```sql
CREATE MATERIALIZED VIEW temp_daily AS
SELECT sensor_id,
  date_trunc('day', ts) AS day,
  count(*) AS readings
FROM readings GROUP BY 1, 2;
REFRESH MATERIALIZED VIEW temp_daily;
-- roll hours up into days
round(sum(sum_c) / sum(readings), 2)
```

- `REFRESH ... CONCURRENTLY` cần `CREATE UNIQUE INDEX` trên view.
- Bảng tổng hợp thường + `ON CONFLICT` cập nhật từng phần; materialized view thì tính lại toàn bộ.

## Ví dụ

Mỗi ngày còn bao nhiêu dòng trong bảng tổng hợp theo giờ, so với số đo thô:

```sql
SELECT date_trunc('day', hour) AS day,
  count(*) AS hourly_rows,
  sum(readings) AS raw_rows
FROM temp_hourly
GROUP BY 1 ORDER BY 1;
```

Giờ có ít số đo của cảm biến 2 (mỗi giờ thứ sáu chỉ có 6):

```sql
SELECT hour, readings,
  round(sum_c / readings, 2) AS avg_c
FROM temp_hourly
WHERE sensor_id = 2
  AND hour < '2026-10-29 06:00+00'
ORDER BY hour;
```

## Lỗi hay gặp

Trung bình của các trung bình giờ: giờ ít số đo được tính nặng như giờ đủ.

```sql
-- WRONG: every hour weighs the same
SELECT sensor_id,
  date_trunc('day', hour) AS day,
  round(avg(sum_c / readings), 2) AS a
FROM temp_hourly
GROUP BY 1, 2;
```

```sql
-- FIX: weight by the readings
SELECT sensor_id,
  date_trunc('day', hour) AS day,
  round(sum(sum_c) / sum(readings), 2)
    AS a
FROM temp_hourly
GROUP BY 1, 2;
```

Thêm số đo rồi đọc materialized view ngay: vẫn số cũ.

```sql
-- WRONG: read before the refresh
CREATE MATERIALIZED VIEW daily AS
SELECT date_trunc('day', ts) AS day,
  count(*) AS n
FROM readings GROUP BY 1;
INSERT INTO readings VALUES
  (1, '2026-10-30 12:00+00', -5);
SELECT day, n FROM daily;
```

```sql
-- FIX: refresh, then read
REFRESH MATERIALIZED VIEW daily;
SELECT day, n FROM daily;
```

`CONCURRENTLY` cần một index duy nhất trên view:

```sql
-- ERROR 55000
REFRESH MATERIALIZED VIEW
  CONCURRENTLY daily;
```

## Thực hành

Ba câu: tạo materialized view theo ngày, tính trung bình ngày đúng từ bảng tổng hợp theo giờ, và cập nhật bảng theo giờ cho những giờ mới.

## Tóm tắt

- Bảng tổng hợp giúp báo cáo đọc ít dòng và cho phép xóa số đo thô sớm.
- Materialized view chỉ đổi khi `REFRESH`, và `REFRESH` tính lại toàn bộ.
- Bảng tổng hợp thường + `INSERT ... ON CONFLICT` cập nhật đúng những giờ mới.
- Lưu tổng và số đếm; trung bình gộp tiếp là `sum(sum_c) / sum(readings)`.

# EN

## Opening

Two sensors send one reading every 5 minutes, 576 rows a day, while the monthly report needs only one figure per hour or per day. Rolling old data up into summary tables (downsampling) lets reports read fewer rows and lets you drop the raw readings sooner.

## Key idea

**A materialized view stores its result.** `CREATE MATERIALIZED VIEW temp_daily AS SELECT ...` runs the query once and stores the result like a table. Reading it is fast, but it does not update itself: you must `REFRESH MATERIALIZED VIEW`, and that recomputes everything. To keep reading during the refresh, use `REFRESH ... CONCURRENTLY`, which needs a unique index on the view.

**A rollup table updated step by step.** A plain table such as `temp_hourly`, with the primary key `(sensor_id, hour)`, lets you add or overwrite only the new hours with `INSERT ... ON CONFLICT DO UPDATE`. TimescaleDB does this for you with continuous aggregates (lesson `e-pg-ext-12`); here we do it by hand on plain PostgreSQL.

**Store sums and counts, not averages.** An average of averages is right only when every group has the same number of rows. Storing `sum_c` and `readings` keeps the roll-up from hours to days, and days to months, right: `sum(sum_c) / sum(readings)`. `max` and `min` roll up directly, because the max of maxima is the max.

The figure at the end of this section shows three tiers: raw readings, hourly rollup, daily rollup.

## Syntax

```sql
CREATE MATERIALIZED VIEW temp_daily AS
SELECT sensor_id,
  date_trunc('day', ts) AS day,
  count(*) AS readings
FROM readings GROUP BY 1, 2;
REFRESH MATERIALIZED VIEW temp_daily;
-- roll hours up into days
round(sum(sum_c) / sum(readings), 2)
```

- `REFRESH ... CONCURRENTLY` needs `CREATE UNIQUE INDEX` on the view.
- A plain rollup table + `ON CONFLICT` updates part of it; a materialized view recomputes everything.

## Example

How many rows each day keeps in the hourly rollup, against the raw readings:

```sql
SELECT date_trunc('day', hour) AS day,
  count(*) AS hourly_rows,
  sum(readings) AS raw_rows
FROM temp_hourly
GROUP BY 1 ORDER BY 1;
```

Sensor 2's thin hours (every sixth hour holds only 6):

```sql
SELECT hour, readings,
  round(sum_c / readings, 2) AS avg_c
FROM temp_hourly
WHERE sensor_id = 2
  AND hour < '2026-10-29 06:00+00'
ORDER BY hour;
```

## Common mistakes

The average of hourly averages: a thin hour weighs as much as a full one.

```sql
-- WRONG: every hour weighs the same
SELECT sensor_id,
  date_trunc('day', hour) AS day,
  round(avg(sum_c / readings), 2) AS a
FROM temp_hourly
GROUP BY 1, 2;
```

```sql
-- FIX: weight by the readings
SELECT sensor_id,
  date_trunc('day', hour) AS day,
  round(sum(sum_c) / sum(readings), 2)
    AS a
FROM temp_hourly
GROUP BY 1, 2;
```

Adding a reading and reading the materialized view at once: the old figures remain.

```sql
-- WRONG: read before the refresh
CREATE MATERIALIZED VIEW daily AS
SELECT date_trunc('day', ts) AS day,
  count(*) AS n
FROM readings GROUP BY 1;
INSERT INTO readings VALUES
  (1, '2026-10-30 12:00+00', -5);
SELECT day, n FROM daily;
```

```sql
-- FIX: refresh, then read
REFRESH MATERIALIZED VIEW daily;
SELECT day, n FROM daily;
```

`CONCURRENTLY` needs a unique index on the view:

```sql
-- ERROR 55000
REFRESH MATERIALIZED VIEW
  CONCURRENTLY daily;
```

## Practice

Three questions: create a daily materialized view, compute the right daily average from the hourly rollup, and update the hourly table for the new hours.

## Recap

- Rollups let reports read fewer rows and let you drop raw readings sooner.
- A materialized view changes only on `REFRESH`, and `REFRESH` recomputes everything.
- A plain rollup table + `INSERT ... ON CONFLICT` updates exactly the new hours.
- Store sums and counts; the rolled-up average is `sum(sum_c) / sum(readings)`.
