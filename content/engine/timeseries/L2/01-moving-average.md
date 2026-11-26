---
id: e-ts-l2-01
engine: timeseries
level: L2
module: analysis
title: Trung bình trượt theo dòng và theo thời gian
title_en: Moving averages by rows and by time
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ts-rows-vs-range, at: idea }]
objectives:
  - vi: Tính trung bình trượt của 3 số đo gần nhất bằng khung `ROWS`.
    en: Compute a moving average of the 3 latest readings with a `ROWS` frame.
  - vi: Tính trung bình của 3 giờ gần nhất bằng khung `RANGE` theo khoảng thời gian, đúng cả khi có giờ mất số đo.
    en: Compute the average of the last 3 hours with a time-based `RANGE` frame, right even when some hours have no reading.
  - vi: Tách cửa sổ theo từng thiết bị bằng `PARTITION BY`.
    en: Split the window per device with `PARTITION BY`.
requires: [e-ts-l1-05]
sources:
  - https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
  - https://www.postgresql.org/docs/18/tutorial-window.html
lab:
  setup: |
    CREATE TABLE temps (
      container_id text NOT NULL,
      ts timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL,
      PRIMARY KEY (container_id, ts)
    );
    INSERT INTO temps
    SELECT c, timestamptz '2026-10-30 00:00+00'
        + h * interval '1 hour',
      -18 + ((h * 5 + n) % 7) / 2.0
    FROM generate_series(0, 23) h,
      (VALUES ('CQRU1001', 1),
        ('CQRU1002', 2)) v(c, n)
    WHERE NOT (c = 'CQRU1001'
      AND h IN (9, 10));
  steps:
    - task:
        vi: "Container `CQRU1001`, từ 06:00 tới trước 14:00 (UTC) ngày 30/10: với mỗi số đo, tính trung bình của nó và hai số đo liền trước (làm tròn 2 chữ số). Trả `ts`, `temp_c`, `avg3`, xếp theo `ts`."
        en: "Container `CQRU1001`, from 06:00 to before 14:00 (UTC) on 30 Oct: for each reading, average it with the two readings just before it (rounded to 2 decimals). Return `ts`, `temp_c`, `avg3`, sorted by `ts`."
      solution: |
        SELECT ts, temp_c,
          round(avg(temp_c) OVER (
            ORDER BY ts
            ROWS BETWEEN 2 PRECEDING
              AND CURRENT ROW), 2) AS avg3
        FROM temps
        WHERE container_id = 'CQRU1001'
          AND ts >= '2026-10-30 06:00+00'
          AND ts < '2026-10-30 14:00+00'
        ORDER BY ts
      check: rows
      ordered: true
      hint:
        vi: "`avg(temp_c) OVER (ORDER BY ts ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`."
        en: "`avg(temp_c) OVER (ORDER BY ts ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`."
    - task:
        vi: "Cùng container và khoảng giờ, nhưng lần này lấy trung bình mọi số đo trong 3 giờ tính tới số đo hiện tại (từ 2 giờ trước tới nó, làm tròn 2 chữ số). Trả `ts`, `temp_c`, `avg3h`, xếp theo `ts`."
        en: "Same container and hours, but this time average every reading in the 3 hours up to the current one (from 2 hours before it to it, rounded to 2 decimals). Return `ts`, `temp_c`, `avg3h`, sorted by `ts`."
      solution: |
        SELECT ts, temp_c,
          round(avg(temp_c) OVER (
            ORDER BY ts
            RANGE BETWEEN interval '2 hours'
              PRECEDING AND CURRENT ROW), 2)
            AS avg3h
        FROM temps
        WHERE container_id = 'CQRU1001'
          AND ts >= '2026-10-30 06:00+00'
          AND ts < '2026-10-30 14:00+00'
        ORDER BY ts
      check: rows
      ordered: true
      hint:
        vi: "`RANGE BETWEEN interval '2 hours' PRECEDING AND CURRENT ROW` đo khung bằng thời gian, không bằng số dòng."
        en: "`RANGE BETWEEN interval '2 hours' PRECEDING AND CURRENT ROW` measures the frame in time, not in rows."
    - task:
        vi: "Cả hai container, từ 20:00 (UTC) ngày 30/10: trung bình 3 giờ như câu trước, nhưng mỗi container tính riêng. Trả `container_id`, `ts`, `avg3h`, xếp theo `container_id`, `ts`."
        en: "Both containers, from 20:00 (UTC) on 30 Oct: the 3-hour average as before, but each container on its own. Return `container_id`, `ts`, `avg3h`, sorted by `container_id`, `ts`."
      solution: |
        SELECT container_id, ts,
          round(avg(temp_c) OVER (
            PARTITION BY container_id
            ORDER BY ts
            RANGE BETWEEN interval '2 hours'
              PRECEDING AND CURRENT ROW), 2)
            AS avg3h
        FROM temps
        WHERE ts >= '2026-10-30 20:00+00'
        ORDER BY container_id, ts
      check: rows
      ordered: true
      hint:
        vi: "Thêm `PARTITION BY container_id` trước `ORDER BY ts` trong `OVER (...)`."
        en: "Add `PARTITION BY container_id` before `ORDER BY ts` inside `OVER (...)`."
quiz:
  - q:
      vi: "Container mất số đo lúc 09:00 và 10:00. Ở dòng 11:00, khung `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` gồm những số đo nào?"
      en: "The container has no reading at 09:00 and 10:00. On the 11:00 row, which readings are in the frame `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`?"
    options:
      - { vi: "Chỉ 11:00, vì 09:00 và 10:00 trống", en: "Only 11:00, because 09:00 and 10:00 are empty" }
      - { vi: "07:00, 08:00 và 11:00", en: "07:00, 08:00 and 11:00" }
      - { vi: "09:00, 10:00 và 11:00, với hai ô NULL", en: "09:00, 10:00 and 11:00, with two NULL cells" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chỉ 11:00\" là đáp án của khung `RANGE` 2 giờ, không phải của `ROWS`. `ROWS` đếm dòng có thật, nên hai dòng liền trước 11:00 là 07:00 và 08:00, và trung bình trượt kéo theo số đo đã cũ 3–4 giờ. Không có dòng NULL nào được thêm vào cho giờ trống. Khi số đo không đều, dùng `RANGE BETWEEN interval '2 hours' PRECEDING AND CURRENT ROW` để khung là 3 giờ thật."
      en: "\"Only 11:00\" is the answer for a 2-hour `RANGE` frame, not for `ROWS`. `ROWS` counts real rows, so the two rows before 11:00 are 07:00 and 08:00, and the moving average drags in readings 3–4 hours old. No NULL rows are added for the empty hours. When readings are uneven, use `RANGE BETWEEN interval '2 hours' PRECEDING AND CURRENT ROW` so the frame is 3 real hours."
  - q:
      vi: "Bỏ `PARTITION BY container_id` khỏi câu trung bình 3 giờ cho hai container. Điều gì xảy ra?"
      en: "You drop `PARTITION BY container_id` from the 3-hour average over two containers. What happens?"
    options:
      - { vi: "Báo lỗi vì thiếu `PARTITION BY`", en: "An error, because `PARTITION BY` is missing" }
      - { vi: "Kết quả y hệt, vì đã xếp theo `ts`", en: "The same result, because rows are sorted by `ts`" }
      - { vi: "Mỗi trung bình trộn số của cả hai container", en: "Each average mixes both containers' readings" }
    answer: 2
    trap: 1
    why:
      vi: "Xếp theo `ts` nghe như đã đủ, nhưng không có `PARTITION BY` thì cả bảng là một cửa sổ: khung 3 giờ của một container gồm cả số đo cùng giờ của container kia. Câu vẫn chạy, không báo lỗi, nên con số sai khó thấy. `PARTITION BY container_id` chia cửa sổ theo từng container, để mỗi trung bình chỉ đọc số của chính nó."
      en: "Sorting by `ts` sounds like enough, but without `PARTITION BY` the whole table is one window: one container's 3-hour frame includes the other container's readings for the same hours. The query still runs without an error, so the wrong numbers are hard to spot. `PARTITION BY container_id` splits the window per container, so each average reads only its own readings."
---
## Mở bài

Nhiệt độ container lạnh dao động từng giờ, và người trực ca muốn thấy xu hướng chứ không phải từng nhịp nhảy. Trung bình trượt làm mượt chuỗi số, nhưng cách định nghĩa "gần đây" quyết định con số ra sao.

## Ý chính

**Hàm cửa sổ (window function) với khung.** `avg(temp_c) OVER (ORDER BY ts ...)` tính trung bình trên một khung (frame) quanh mỗi dòng, và vẫn giữ mọi dòng, khác `GROUP BY`.

**`ROWS` đếm dòng.** `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` là "dòng này và hai dòng có thật liền trước". Khi thiết bị gửi đều, nó đúng là 3 giờ; khi mất số đo, khung kéo dài ra và kéo theo số đo cũ.

**`RANGE` đo bằng thời gian.** `RANGE BETWEEN interval '2 hours' PRECEDING AND CURRENT ROW` là "mọi dòng có `ts` từ 2 giờ trước tới dòng này". Giờ trống chỉ làm khung có ít số đo hơn, không kéo số cũ vào. Khung `RANGE` với khoảng cách cần đúng một cột trong `ORDER BY`.

**`PARTITION BY` tách thiết bị.** Không có nó, cả bảng là một cửa sổ và số của các container trộn vào nhau. Lưu ý thêm: `WHERE` chạy trước hàm cửa sổ, nên dòng đầu của khoảng lọc không thấy số đo trước khoảng đó.

Hình cuối mục so hai khung ở dòng 11:00, ngay sau hai giờ mất số đo.

## Cú pháp

```sql
avg(temp_c) OVER (
  PARTITION BY container_id
  ORDER BY ts
  ROWS BETWEEN 2 PRECEDING
    AND CURRENT ROW)
-- by time instead of by rows
avg(temp_c) OVER (
  PARTITION BY container_id
  ORDER BY ts
  RANGE BETWEEN interval '2 hours'
    PRECEDING AND CURRENT ROW)
```

- Khung mặc định khi có `ORDER BY` là từ đầu cửa sổ tới dòng hiện tại (trung bình cộng dồn).
- `WINDOW w AS (...)` đặt tên một cửa sổ để dùng lại nhiều lần.

## Ví dụ

Trung bình cộng dồn (khung mặc định) của container `CQRU1002`:

```sql
SELECT ts, temp_c,
  round(avg(temp_c) OVER (
    ORDER BY ts), 2) AS running_avg
FROM temps
WHERE container_id = 'CQRU1002'
  AND ts < '2026-10-30 04:00+00'
ORDER BY ts;
```

Hai khung đặt cạnh nhau quanh hai giờ mất số đo:

```sql
SELECT ts,
  round(avg(temp_c) OVER w, 2)
    AS by_rows,
  round(avg(temp_c) OVER h, 2)
    AS by_time
FROM temps
WHERE container_id = 'CQRU1001'
  AND ts >= '2026-10-30 07:00+00'
  AND ts < '2026-10-30 13:00+00'
WINDOW
  w AS (ORDER BY ts ROWS BETWEEN
    2 PRECEDING AND CURRENT ROW),
  h AS (ORDER BY ts RANGE BETWEEN
    interval '2 hours' PRECEDING
    AND CURRENT ROW)
ORDER BY ts;
```

## Lỗi hay gặp

Khung theo dòng đi qua hai giờ trống và kéo số 07:00 vào trung bình lúc 11:00:

```sql
-- WRONG: 3 rows span 5 hours here
SELECT ts, round(avg(temp_c) OVER (
    ORDER BY ts ROWS BETWEEN 2
    PRECEDING AND CURRENT ROW), 2) AS a
FROM temps
WHERE container_id = 'CQRU1001'
  AND ts >= '2026-10-30 07:00+00'
  AND ts < '2026-10-30 13:00+00';
```

```sql
-- FIX: a 3-hour frame by time
SELECT ts, round(avg(temp_c) OVER (
    ORDER BY ts RANGE BETWEEN
    interval '2 hours' PRECEDING
    AND CURRENT ROW), 2) AS a
FROM temps
WHERE container_id = 'CQRU1001'
  AND ts >= '2026-10-30 07:00+00'
  AND ts < '2026-10-30 13:00+00';
```

Không tách theo container, hai chuỗi trộn vào nhau:

```sql
-- WRONG: one window for both
SELECT container_id, ts,
  round(avg(temp_c) OVER (
    ORDER BY ts ROWS BETWEEN 2
    PRECEDING AND CURRENT ROW), 2) AS a
FROM temps
WHERE ts >= '2026-10-30 20:00+00';
```

```sql
-- FIX: one window per container
SELECT container_id, ts,
  round(avg(temp_c) OVER (
    PARTITION BY container_id
    ORDER BY ts ROWS BETWEEN 2
    PRECEDING AND CURRENT ROW), 2) AS a
FROM temps
WHERE ts >= '2026-10-30 20:00+00';
```

Khung `RANGE` theo khoảng cách mà không có `ORDER BY`:

```sql
-- ERROR 42P20
SELECT avg(temp_c) OVER (
  RANGE BETWEEN interval '2 hours'
  PRECEDING AND CURRENT ROW)
FROM temps;
```

## Thực hành

Ba câu: trung bình 3 số đo theo dòng, trung bình 3 giờ theo thời gian trên cùng đoạn có giờ trống, và trung bình 3 giờ cho từng container.

## Tóm tắt

- Hàm cửa sổ tính trên một khung quanh mỗi dòng và giữ mọi dòng.
- `ROWS` đếm dòng có thật; khi mất số đo, khung kéo dài theo thời gian.
- `RANGE` với `interval` đo khung bằng thời gian thật.
- `PARTITION BY` tách từng thiết bị; thiếu nó thì số trộn vào nhau mà không báo lỗi.

# EN

## Opening

A reefer's temperature moves from hour to hour, and the duty officer wants the trend, not every jump. A moving average smooths the series, but how you define "recent" decides the number you get.

## Key idea

**A window function with a frame.** `avg(temp_c) OVER (ORDER BY ts ...)` averages over a frame around each row, and keeps every row, unlike `GROUP BY`.

**`ROWS` counts rows.** `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` is "this row and the two real rows just before it". When the device reports steadily it really is 3 hours; when readings go missing, the frame stretches and drags in old readings.

**`RANGE` measures in time.** `RANGE BETWEEN interval '2 hours' PRECEDING AND CURRENT ROW` is "every row whose `ts` is from 2 hours before this row up to it". An empty hour only leaves fewer readings in the frame; it does not pull old ones in. A `RANGE` frame with an offset needs exactly one column in `ORDER BY`.

**`PARTITION BY` separates devices.** Without it the whole table is one window and the containers' readings mix. One more note: `WHERE` runs before the window function, so the first rows of the filtered range cannot see readings from before it.

The figure at the end of this section compares the two frames on the 11:00 row, right after two hours without readings.

## Syntax

```sql
avg(temp_c) OVER (
  PARTITION BY container_id
  ORDER BY ts
  ROWS BETWEEN 2 PRECEDING
    AND CURRENT ROW)
-- by time instead of by rows
avg(temp_c) OVER (
  PARTITION BY container_id
  ORDER BY ts
  RANGE BETWEEN interval '2 hours'
    PRECEDING AND CURRENT ROW)
```

- With `ORDER BY`, the default frame runs from the start of the window to the current row (a running average).
- `WINDOW w AS (...)` names a window so it can be used several times.

## Example

The running average (the default frame) of container `CQRU1002`:

```sql
SELECT ts, temp_c,
  round(avg(temp_c) OVER (
    ORDER BY ts), 2) AS running_avg
FROM temps
WHERE container_id = 'CQRU1002'
  AND ts < '2026-10-30 04:00+00'
ORDER BY ts;
```

The two frames side by side around the two missing hours:

```sql
SELECT ts,
  round(avg(temp_c) OVER w, 2)
    AS by_rows,
  round(avg(temp_c) OVER h, 2)
    AS by_time
FROM temps
WHERE container_id = 'CQRU1001'
  AND ts >= '2026-10-30 07:00+00'
  AND ts < '2026-10-30 13:00+00'
WINDOW
  w AS (ORDER BY ts ROWS BETWEEN
    2 PRECEDING AND CURRENT ROW),
  h AS (ORDER BY ts RANGE BETWEEN
    interval '2 hours' PRECEDING
    AND CURRENT ROW)
ORDER BY ts;
```

## Common mistakes

The row frame crosses the two empty hours and pulls the 07:00 reading into the 11:00 average:

```sql
-- WRONG: 3 rows span 5 hours here
SELECT ts, round(avg(temp_c) OVER (
    ORDER BY ts ROWS BETWEEN 2
    PRECEDING AND CURRENT ROW), 2) AS a
FROM temps
WHERE container_id = 'CQRU1001'
  AND ts >= '2026-10-30 07:00+00'
  AND ts < '2026-10-30 13:00+00';
```

```sql
-- FIX: a 3-hour frame by time
SELECT ts, round(avg(temp_c) OVER (
    ORDER BY ts RANGE BETWEEN
    interval '2 hours' PRECEDING
    AND CURRENT ROW), 2) AS a
FROM temps
WHERE container_id = 'CQRU1001'
  AND ts >= '2026-10-30 07:00+00'
  AND ts < '2026-10-30 13:00+00';
```

Without splitting by container, the two series mix:

```sql
-- WRONG: one window for both
SELECT container_id, ts,
  round(avg(temp_c) OVER (
    ORDER BY ts ROWS BETWEEN 2
    PRECEDING AND CURRENT ROW), 2) AS a
FROM temps
WHERE ts >= '2026-10-30 20:00+00';
```

```sql
-- FIX: one window per container
SELECT container_id, ts,
  round(avg(temp_c) OVER (
    PARTITION BY container_id
    ORDER BY ts ROWS BETWEEN 2
    PRECEDING AND CURRENT ROW), 2) AS a
FROM temps
WHERE ts >= '2026-10-30 20:00+00';
```

A `RANGE` frame with an offset but no `ORDER BY`:

```sql
-- ERROR 42P20
SELECT avg(temp_c) OVER (
  RANGE BETWEEN interval '2 hours'
  PRECEDING AND CURRENT ROW)
FROM temps;
```

## Practice

Three questions: a 3-reading average by rows, a 3-hour average by time over the same stretch with empty hours, and the 3-hour average for each container.

## Recap

- A window function computes over a frame around each row and keeps every row.
- `ROWS` counts real rows; when readings go missing, the frame stretches in time.
- `RANGE` with an `interval` measures the frame in real time.
- `PARTITION BY` separates devices; without it the numbers mix with no error.
