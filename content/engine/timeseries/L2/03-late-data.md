---
id: e-ts-l2-03
engine: timeseries
level: L2
module: analysis
title: Dữ liệu về trễ và về sai thứ tự
title_en: Late and out-of-order data
kind: lab
runtime: browser
minutes: 22
figures: [{ name: ts-late-window, at: idea }]
objectives:
  - vi: Phân biệt thời điểm đo (`measured_at`) với thời điểm nhận (`ingested_at`), và tìm số đo về trễ.
    en: Tell the measurement time (`measured_at`) from the arrival time (`ingested_at`), and find late readings.
  - vi: Tìm những giờ đã tổng hợp cần tính lại vì có số đo mới về sau lần chạy trước.
    en: Find the already summarised hours that need recomputing because new readings arrived after the last run.
  - vi: Tính lại đúng những giờ đó bằng `INSERT ... ON CONFLICT DO UPDATE`.
    en: Recompute exactly those hours with `INSERT ... ON CONFLICT DO UPDATE`.
requires: [e-ts-l2-02]
sources:
  - https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT
  - https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC
lab:
  setup: |
    CREATE TABLE readings (
      sensor_id int NOT NULL,
      measured_at timestamptz NOT NULL,
      ingested_at timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL
    );
    INSERT INTO readings
    SELECT 1 + g % 2,
      timestamptz '2026-10-31 06:00+00'
        + (g / 2) * interval '10 minutes',
      timestamptz '2026-10-31 06:01+00'
        + (g / 2) * interval '10 minutes',
      -18 + (g % 5) / 2.0
    FROM generate_series(0, 35) g;
    UPDATE readings
    SET ingested_at = '2026-10-31 09:20+00'
    WHERE sensor_id = 2
      AND measured_at
        BETWEEN '2026-10-31 07:30+00'
        AND '2026-10-31 07:50+00';
    CREATE TABLE hourly (
      sensor_id int,
      hour timestamptz,
      avg_c numeric(5,2) NOT NULL,
      readings int NOT NULL,
      PRIMARY KEY (sensor_id, hour)
    );
    INSERT INTO hourly
    SELECT sensor_id,
      date_trunc('hour', measured_at),
      round(avg(temp_c), 2), count(*)
    FROM readings
    WHERE ingested_at <= '2026-10-31 09:05+00'
    GROUP BY 1, 2;
  steps:
    - task:
        vi: "Số đo nào về kho trễ hơn 15 phút sau lúc đo? Trả `sensor_id`, `measured_at`, `ingested_at`, xếp theo `sensor_id`, `measured_at`."
        en: "Which readings reached the store more than 15 minutes after they were measured? Return `sensor_id`, `measured_at`, `ingested_at`, sorted by `sensor_id`, `measured_at`."
      solution: |
        SELECT sensor_id, measured_at,
          ingested_at
        FROM readings
        WHERE ingested_at
          > measured_at + interval '15 minutes'
        ORDER BY sensor_id, measured_at
      check: rows
      ordered: true
      hint:
        vi: "So `ingested_at` với `measured_at + interval '15 minutes'`."
        en: "Compare `ingested_at` with `measured_at + interval '15 minutes'`."
    - task:
        vi: "Bảng `hourly` được tổng hợp lúc 09:05 (UTC) ngày 31/10. Những giờ nào của cảm biến nào có số đo về sau lần chạy đó, nên phải tính lại? Trả `sensor_id`, `hour`, không lặp, xếp theo `sensor_id`, `hour`."
        en: "Table `hourly` was summarised at 09:05 (UTC) on 31 Oct. Which hours of which sensor got readings after that run, and so must be recomputed? Return `sensor_id`, `hour`, without repeats, sorted by `sensor_id`, `hour`."
      solution: |
        SELECT DISTINCT sensor_id,
          date_trunc('hour', measured_at)
            AS hour
        FROM readings
        WHERE ingested_at
          > '2026-10-31 09:05+00'
        ORDER BY sensor_id, hour
      check: rows
      ordered: true
      hint:
        vi: "Lọc theo thời điểm nhận `ingested_at > '2026-10-31 09:05+00'`, rồi lấy giờ của thời điểm đo."
        en: "Filter on the arrival time `ingested_at > '2026-10-31 09:05+00'`, then take the hour of the measurement time."
    - task:
        vi: "Tính lại `avg_c` (làm tròn 2 chữ số) và `readings` của đúng những giờ có số đo về sau 09:05, ghi đè vào `hourly`."
        en: "Recompute `avg_c` (rounded to 2 decimals) and `readings` for exactly the hours that got readings after 09:05, overwriting them in `hourly`."
      solution: |
        INSERT INTO hourly
        SELECT r.sensor_id,
          date_trunc('hour', r.measured_at),
          round(avg(r.temp_c), 2), count(*)
        FROM readings r
        WHERE (r.sensor_id,
            date_trunc('hour', r.measured_at))
          IN (SELECT sensor_id,
              date_trunc('hour', measured_at)
            FROM readings
            WHERE ingested_at
              > '2026-10-31 09:05+00')
        GROUP BY 1, 2
        ON CONFLICT (sensor_id, hour)
        DO UPDATE SET
          avg_c = EXCLUDED.avg_c,
          readings = EXCLUDED.readings
      check: rows
      after: |
        SELECT sensor_id, hour, avg_c,
          readings
        FROM hourly
        ORDER BY sensor_id, hour
      hint:
        vi: "`INSERT INTO hourly SELECT ... GROUP BY 1, 2 ON CONFLICT (sensor_id, hour) DO UPDATE SET avg_c = EXCLUDED.avg_c, readings = EXCLUDED.readings`; chỉ chọn các giờ của câu trước."
        en: "`INSERT INTO hourly SELECT ... GROUP BY 1, 2 ON CONFLICT (sensor_id, hour) DO UPDATE SET avg_c = EXCLUDED.avg_c, readings = EXCLUDED.readings`; pick only the hours from the previous step."
quiz:
  - q:
      vi: "Lần tổng hợp trước chạy lúc 09:05. Lần này chỉ đọc các số đo có `measured_at > '09:05'`. Điều gì bị bỏ sót?"
      en: "The previous summary ran at 09:05. This run reads only readings with `measured_at > '09:05'`. What gets missed?"
    options:
      - { vi: "Không gì, vì số đo mới đều đo sau 09:05", en: "Nothing, since new readings are all measured after 09:05" }
      - { vi: "Số đo của 07:30–07:50 về lúc 09:20", en: "The 07:30–07:50 readings that arrived at 09:20" }
      - { vi: "Số đo đo sau 09:05 nhưng về trước đó", en: "Readings measured after 09:05 but arriving before it" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như số đo mới thì đo sau 09:05, nhưng số đo về trễ được đo từ trước: ba số đo của cảm biến 2 đo lúc 07:30–07:50 và chỉ về lúc 09:20. Lọc theo thời điểm đo thì chúng rơi trước mốc và bị bỏ qua, nên giờ 07:00 giữ trung bình cũ của 3 số đo thay vì 6. Phải lọc theo thời điểm nhận (`ingested_at`), rồi tính lại các giờ mà những số đo đó thuộc về. Không thể có số đo về trước khi được đo."
      en: "It sounds like new readings are measured after 09:05, but late readings were measured earlier: sensor 2's three readings were measured at 07:30–07:50 and only arrived at 09:20. Filtering on the measurement time puts them before the mark, so they are skipped and the 07:00 hour keeps its old average of 3 readings instead of 6. Filter on the arrival time (`ingested_at`), then recompute the hours those readings belong to. A reading cannot arrive before it is measured."
  - q:
      vi: "Vì sao tính lại bằng `INSERT ... ON CONFLICT DO UPDATE` thay vì `INSERT` thường?"
      en: "Why recompute with `INSERT ... ON CONFLICT DO UPDATE` instead of a plain `INSERT`?"
    options:
      - { vi: "`INSERT` thường nhanh hơn nhưng bỏ qua dòng NULL", en: "A plain `INSERT` is faster but skips NULL rows" }
      - { vi: "Giờ 07:00 đã có dòng; `INSERT` thường vướng khóa chính", en: "The 07:00 hour already has a row; a plain `INSERT` hits the primary key" }
      - { vi: "`ON CONFLICT` tự tìm những giờ cần tính lại", en: "`ON CONFLICT` finds the hours to recompute by itself" }
    answer: 1
    trap: 2
    why:
      vi: "`ON CONFLICT` nghe như tự biết giờ nào cần tính lại, nhưng nó chỉ quyết định làm gì khi dòng đã có; việc chọn giờ là của điều kiện `WHERE` theo `ingested_at`. Giờ 07:00 của cảm biến 2 đã có trong `hourly`, nên `INSERT` thường báo lỗi trùng khóa chính (23505). `DO UPDATE SET avg_c = EXCLUDED.avg_c` ghi đè dòng cũ bằng số mới, còn giờ chưa có thì được thêm như thường."
      en: "`ON CONFLICT` sounds like it knows which hours to recompute, but it only decides what to do when the row already exists; choosing the hours is the job of the `WHERE` on `ingested_at`. Sensor 2's 07:00 hour is already in `hourly`, so a plain `INSERT` fails with a primary key violation (23505). `DO UPDATE SET avg_c = EXCLUDED.avg_c` overwrites the old row with the new figures, and an hour that does not exist yet is inserted as usual."
---
## Mở bài

Container lạnh trên sà lan mất sóng 1 tiếng, rồi gửi bù mọi số đo khi vào gần cảng. Số đo về trễ, và có khi về sai thứ tự, là chuyện thường của dữ liệu cảm biến; báo cáo theo giờ phải chịu được điều đó.

## Ý chính

**Hai thời điểm.** `measured_at` là lúc cảm biến đo; `ingested_at` là lúc dòng về kho. Báo cáo gom theo thời điểm đo, vì đó là sự thật đã xảy ra. Còn việc "lần trước đã xử lý tới đâu" thì phải theo thời điểm nhận.

**Tổng hợp tăng dần.** Bảng `hourly` lưu trung bình mỗi giờ để báo cáo khỏi đọc lại số đo thô. Mỗi lần chạy chỉ nên tính lại những giờ bị ảnh hưởng: các giờ của mọi số đo nhận được sau lần chạy trước. Lọc theo `measured_at` thay vì `ingested_at` là bỏ sót đúng những số đo về trễ.

**Cửa sổ tính lại.** Nhiều hệ thống chọn cách đơn giản hơn: mỗi lần chạy tính lại cố định N giờ gần nhất (ví dụ 3 giờ), chấp nhận rằng số đo trễ hơn N giờ sẽ không được tính. Cách nào cũng cần ghi rõ giới hạn đó trong báo cáo.

**Ghi đè, không thêm.** `INSERT ... ON CONFLICT (sensor_id, hour) DO UPDATE` ghi đè giờ đã có và thêm giờ chưa có, trong một câu.

Hình cuối mục cho thấy ba số đo của giờ 07:00 về lúc 09:20, sau lần tổng hợp 09:05.

## Cú pháp

```sql
-- late: arrived well after measured
WHERE ingested_at
  > measured_at + interval '15 minutes'
-- what changed since the last run
WHERE ingested_at
  > '2026-10-31 09:05+00'
-- overwrite or add one hour's row
INSERT INTO hourly SELECT ...
ON CONFLICT (sensor_id, hour)
DO UPDATE SET
  avg_c = EXCLUDED.avg_c
```

- `EXCLUDED` là dòng định thêm vào; nó mang số vừa tính.
- `ON CONFLICT (...)` cần một ràng buộc duy nhất hoặc khóa chính trên đúng các cột đó.

## Ví dụ

Giờ 07:00 của cảm biến 2 lúc 09:05 mới có 3 số đo:

```sql
SELECT sensor_id, hour, avg_c, readings
FROM hourly
ORDER BY sensor_id, hour;
```

Số đo về theo thứ tự nhận, không theo thứ tự đo:

```sql
SELECT ingested_at, sensor_id,
  measured_at
FROM readings
WHERE ingested_at
  >= '2026-10-31 07:51+00'
ORDER BY ingested_at, sensor_id;
```

## Lỗi hay gặp

Tìm việc cần làm theo thời điểm đo: không thấy số đo trễ nào.

```sql
-- WRONG: late rows were measured before
SELECT DISTINCT sensor_id,
  date_trunc('hour', measured_at) AS h
FROM readings
WHERE measured_at
  > '2026-10-31 09:05+00';
```

```sql
-- FIX: what arrived since the last run
SELECT DISTINCT sensor_id,
  date_trunc('hour', measured_at) AS h
FROM readings
WHERE ingested_at
  > '2026-10-31 09:05+00';
```

`ON CONFLICT` trên cột không có ràng buộc duy nhất:

```sql
-- ERROR 42P10
INSERT INTO hourly
VALUES (2, '2026-10-31 07:00+00',
  -17, 6)
ON CONFLICT (hour) DO NOTHING;
```

## Thực hành

Ba câu: tìm số đo về trễ, tìm những giờ cần tính lại, và tính lại đúng những giờ đó.

## Tóm tắt

- Gom theo thời điểm đo; theo dõi tiến độ xử lý theo thời điểm nhận.
- Số đo trễ làm thay đổi giờ cũ: tính lại các giờ của mọi số đo nhận sau lần chạy trước.
- Hoặc tính lại cố định N giờ gần nhất, và ghi rõ giới hạn đó.
- `INSERT ... ON CONFLICT DO UPDATE` ghi đè giờ đã có trong một câu.

# EN

## Opening

A reefer on a barge loses signal for an hour, then sends every missed reading once it gets close to the port. Late readings, sometimes out of order, are normal for sensor data; an hourly report must cope with them.

## Key idea

**Two times.** `measured_at` is when the sensor measured; `ingested_at` is when the row reached the store. Reports group by measurement time, because that is what happened. But "how far did the last run get" must follow the arrival time.

**Incremental summaries.** Table `hourly` keeps each hour's average so reports do not reread the raw readings. Each run should recompute only the affected hours: the hours of every reading received since the previous run. Filtering on `measured_at` instead of `ingested_at` misses exactly the late readings.

**A recompute window.** Many systems choose something simpler: each run recomputes a fixed last N hours (say 3 hours), accepting that readings later than N hours are not counted. Either way, the report should state that limit.

**Overwrite, do not add.** `INSERT ... ON CONFLICT (sensor_id, hour) DO UPDATE` overwrites an hour that exists and adds one that does not, in one statement.

The figure at the end of this section shows three readings of the 07:00 hour arriving at 09:20, after the 09:05 summary.

## Syntax

```sql
-- late: arrived well after measured
WHERE ingested_at
  > measured_at + interval '15 minutes'
-- what changed since the last run
WHERE ingested_at
  > '2026-10-31 09:05+00'
-- overwrite or add one hour's row
INSERT INTO hourly SELECT ...
ON CONFLICT (sensor_id, hour)
DO UPDATE SET
  avg_c = EXCLUDED.avg_c
```

- `EXCLUDED` is the row that was about to be inserted; it carries the new figures.
- `ON CONFLICT (...)` needs a unique constraint or primary key on exactly those columns.

## Example

At 09:05, sensor 2's 07:00 hour had only 3 readings:

```sql
SELECT sensor_id, hour, avg_c, readings
FROM hourly
ORDER BY sensor_id, hour;
```

Readings in arrival order, not in measurement order:

```sql
SELECT ingested_at, sensor_id,
  measured_at
FROM readings
WHERE ingested_at
  >= '2026-10-31 07:51+00'
ORDER BY ingested_at, sensor_id;
```

## Common mistakes

Finding the work by measurement time: no late reading shows up.

```sql
-- WRONG: late rows were measured before
SELECT DISTINCT sensor_id,
  date_trunc('hour', measured_at) AS h
FROM readings
WHERE measured_at
  > '2026-10-31 09:05+00';
```

```sql
-- FIX: what arrived since the last run
SELECT DISTINCT sensor_id,
  date_trunc('hour', measured_at) AS h
FROM readings
WHERE ingested_at
  > '2026-10-31 09:05+00';
```

`ON CONFLICT` on a column with no unique constraint:

```sql
-- ERROR 42P10
INSERT INTO hourly
VALUES (2, '2026-10-31 07:00+00',
  -17, 6)
ON CONFLICT (hour) DO NOTHING;
```

## Practice

Three questions: find the late readings, find the hours to recompute, and recompute exactly those hours.

## Recap

- Group by measurement time; track processing progress by arrival time.
- Late readings change old hours: recompute the hours of every reading received since the last run.
- Or recompute a fixed last N hours, and state that limit.
- `INSERT ... ON CONFLICT DO UPDATE` overwrites existing hours in one statement.
