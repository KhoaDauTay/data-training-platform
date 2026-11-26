---
id: e-tm-l2-01
engine: telemetry
level: L2
module: query
title: "Rate từ counter có reset, bằng lag()"
title_en: "Rate from a counter with resets, with lag()"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: tm-counter-reset, at: idea }]
objectives:
  - vi: Tính mức tăng giữa hai lần đọc counter bằng `lag()`.
    en: Compute the increase between two counter readings with `lag()`.
  - vi: Xử lý lần counter về 0 khi tiến trình khởi động lại, như Prometheus làm.
    en: Handle the counter going back to 0 when the process restarts, as Prometheus does.
  - vi: Biết vì sao số rate bằng SQL khác `rate()` của Prometheus (không ngoại suy).
    en: Know why a SQL rate differs from Prometheus' `rate()` (no extrapolation).
requires: [e-tm-l1-02]
sources:
  - { url: "https://prometheus.io/docs/prometheus/latest/querying/functions/", title: "Prometheus: Query functions (rate, increase, resets)" }
  - { url: "https://www.postgresql.org/docs/current/functions-window.html", title: "PostgreSQL: Window functions (lag)" }
lab:
  setup: |
    CREATE TABLE metrics (
      ts timestamp, name text,
      labels jsonb, value float8
    );
    INSERT INTO metrics
    SELECT timestamp '2026-10-31 10:00'
        + n * interval '15 seconds',
      'http_requests_total',
      '{"route": "/track"}', v
    FROM unnest(ARRAY[100, 130, 160, 190, 220, 20, 50, 80, 110])
      WITH ORDINALITY AS t(v, i),
      LATERAL (SELECT i - 1 AS n) x;
  steps:
    - task:
        vi: "Mức tăng giữa mỗi lần đọc và lần đọc trước. Trả `ts`, `delta` (dòng đầu không có lần trước)."
        en: "The change between each reading and the one before. Return `ts`, `delta` (the first row has no previous reading)."
      solution: |
        SELECT ts,
          value - lag(value) OVER (ORDER BY ts)
            AS delta
        FROM metrics
      check: rows
      hint:
        vi: "`value - lag(value) OVER (ORDER BY ts)`."
        en: "`value - lag(value) OVER (ORDER BY ts)`."
    - task:
        vi: "Tổng số request trong cả khoảng, tính cả lần counter về 0: một hiệu âm nghĩa là tiến trình khởi động lại, khi đó mức tăng là chính giá trị mới. Trả `increase`."
        en: "Total requests over the whole window, counting the restart: a negative difference means the process restarted, and then the increase is the new value itself. Return `increase`."
      solution: |
        WITH d AS (
          SELECT value,
            value - lag(value) OVER (ORDER BY ts)
              AS delta
          FROM metrics)
        SELECT sum(CASE WHEN delta < 0
            THEN value ELSE delta END) AS increase
        FROM d
      check: rows
      hint:
        vi: "Một CTE có `delta`, rồi `sum(CASE WHEN delta < 0 THEN value ELSE delta END)`; dòng đầu có `delta` NULL nên `sum` bỏ qua."
        en: "A CTE with `delta`, then `sum(CASE WHEN delta < 0 THEN value ELSE delta END)`; the first row has a NULL `delta`, so `sum` skips it."
    - task:
        vi: "Số request mỗi giây trung bình trong khoảng, từ lần đọc đầu tới lần đọc cuối. Trả `per_second`."
        en: "The average requests per second over the window, from the first reading to the last. Return `per_second`."
      solution: |
        WITH d AS (
          SELECT ts, value,
            value - lag(value) OVER (ORDER BY ts)
              AS delta
          FROM metrics)
        SELECT sum(CASE WHEN delta < 0
            THEN value ELSE delta END)
          / extract(epoch FROM max(ts) - min(ts))
          AS per_second
        FROM d
      check: rows
      hint:
        vi: "Mức tăng của bước 2 chia `extract(epoch FROM max(ts) - min(ts))` (số giây giữa lần đọc đầu và cuối)."
        en: "Step 2's increase divided by `extract(epoch FROM max(ts) - min(ts))` (the seconds between the first and last reading)."
    - task:
        vi: "Số request mỗi giây trong từng khoảng 15 giây, đã xử lý lần về 0. Trả `ts`, `per_second` (bỏ dòng đầu)."
        en: "Requests per second in each 15-second interval, with the restart handled. Return `ts`, `per_second` (skip the first row)."
      solution: |
        WITH d AS (
          SELECT ts, value,
            value - lag(value) OVER (ORDER BY ts)
              AS delta,
            extract(epoch FROM ts - lag(ts)
              OVER (ORDER BY ts)) AS secs
          FROM metrics)
        SELECT ts,
          CASE WHEN delta < 0 THEN value
            ELSE delta END / secs AS per_second
        FROM d
        WHERE delta IS NOT NULL
      check: rows
      hint:
        vi: "Thêm `secs` = `extract(epoch FROM ts - lag(ts) OVER (ORDER BY ts))`, chia mức tăng đã xử lý reset cho `secs`, lọc `delta IS NOT NULL`."
        en: "Add `secs` = `extract(epoch FROM ts - lag(ts) OVER (ORDER BY ts))`, divide the reset-aware increase by `secs`, keep `delta IS NOT NULL`."
quiz:
  - q:
      vi: "Counter đọc 220 rồi 20 sau 15 giây. Trong 15 giây đó có bao nhiêu request?"
      en: "A counter reads 220, then 20 fifteen seconds later. How many requests happened in those 15 seconds?"
    options:
      - { vi: "-200, counter giảm", en: "-200, the counter fell" }
      - { vi: "0, bỏ khoảng có reset", en: "0, skip the reset interval" }
      - { vi: "Ít nhất 20, đếm từ 0", en: "At least 20, counted from 0" }
    answer: 2
    trap: 0
    why:
      vi: "Phép trừ cho -200, nhưng counter không bao giờ giảm vì có ít request: tài liệu Prometheus coi mọi lần giảm giữa hai mẫu liên tiếp là reset (tiến trình khởi động lại, counter về 0). Sau reset, counter đã đếm lại từ 0 lên 20, nên có ít nhất 20 request; những request trước lúc chết mà chưa được đọc thì mất. Bỏ cả khoảng (0) làm mất 20 request có thật."
      en: "The subtraction gives -200, but a counter never falls because there were few requests: the Prometheus docs treat any decrease between two consecutive samples as a reset (the process restarted, the counter went back to 0). After the reset the counter counted again from 0 to 20, so at least 20 requests happened; requests before the crash that were never read are lost. Skipping the interval (0) loses 20 real requests."
  - q:
      vi: "Bước 3 ra 1,92 request/giây. `rate(http_requests_total[2m])` lúc 10:02 trên cùng dữ liệu ra 1,90. Vì sao khác?"
      en: "Step 3 gives 1.92 requests/second. `rate(http_requests_total[2m])` at 10:02 on the same data gives 1.90. Why the difference?"
    options:
      - { vi: "Prometheus bỏ mẫu 10:00 và ngoại suy", en: "Prometheus drops 10:00 and extrapolates" }
      - { vi: "Prometheus không xử lý reset", en: "Prometheus does not handle resets" }
      - { vi: "SQL làm tròn sai số thực", en: "SQL rounds floats badly" }
    answer: 0
    trap: 1
    why:
      vi: "Prometheus có xử lý reset (cùng luật: lần giảm là reset), nên lựa chọn thứ hai sai. Khác biệt đến từ hai luật khác: khoảng `[2m]` mở bên trái, nên mẫu đúng 10:00 bị loại; và `rate()` ngoại suy tới hai đầu khoảng. Còn 8 mẫu từ 10:00:15, mức tăng 200, kéo thêm 15 giây về đầu: 200 × 120/105 = 228,6, chia 120 giây = 1,90. SQL ở đây không ngoại suy và chia cho đúng 120 giây giữa lần đọc đầu và cuối: 230/120 = 1,92."
      en: "Prometheus does handle resets (same rule: a decrease is a reset), so the second option is wrong. The difference comes from two other rules: the `[2m]` range is left-open, so the sample at exactly 10:00 is excluded; and `rate()` extrapolates to both ends of the range. That leaves 8 samples from 10:00:15, an increase of 200, stretched 15 seconds back to the start: 200 × 120/105 = 228.6, over 120 seconds = 1.90. The SQL here does not extrapolate and divides by exactly the 120 seconds between the first and last reading: 230/120 = 1.92."
---
## Mở bài

Lúc 10:01:15 dịch vụ theo dõi container khởi động lại, và counter `http_requests_total` rơi từ 220 về 20. Một phép trừ ngây thơ báo -200 request. Bài này tính đúng số request mỗi giây bằng `lag()` trong SQL.

## Ý chính

Counter chỉ tăng, nên số sự kiện giữa hai lần đọc là hiệu của chúng: `value - lag(value) OVER (ORDER BY ts)`. Ngoại lệ là khi tiến trình khởi động lại: counter về 0 rồi đếm lại. Tài liệu Prometheus coi mọi lần giảm giữa hai mẫu liên tiếp là một reset và tự điều chỉnh; trong SQL ta làm y như vậy: hiệu âm thì mức tăng là chính giá trị mới (đếm từ 0). Rate = tổng mức tăng chia số giây.

Đây không phải `rate()` của Prometheus. `rate(v[2m])` lấy các mẫu trong khoảng mở bên trái (mẫu đúng ở đầu khoảng bị loại), rồi **ngoại suy** mức tăng tới hai đầu khoảng để bù lần đọc lệch nhịp, và chia cho đúng độ dài khoảng. Trên dữ liệu bài này SQL ra 1,92 request/giây, còn `rate()` ra 1,90. Bài PromQL ở cấp 3 tính `rate()` thật bằng bản mô phỏng. Hình cuối mục vẽ counter rơi về 0 và mức tăng được tính lại.

## Cú pháp

```sql
-- reset-aware increase per reading
SELECT ts,
  CASE WHEN d < 0 THEN value
    ELSE d END AS inc
FROM (
  SELECT ts, value, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

- `lag(value) OVER (ORDER BY ts)`: giá trị của lần đọc trước.
- Hiệu âm = reset: mức tăng là giá trị mới.
- Rate = tổng mức tăng / số giây giữa lần đọc đầu và cuối.

## Ví dụ

Chín lần đọc, cách nhau 15 giây; lần thứ sáu là sau khi khởi động lại.

```sql
SELECT ts, value
FROM metrics
ORDER BY ts;
```

Mức tăng của mỗi khoảng, đã xử lý reset.

```sql
SELECT ts,
  CASE WHEN d < 0 THEN value
    ELSE d END AS inc
FROM (
  SELECT ts, value, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t
WHERE d IS NOT NULL
ORDER BY ts;
```

## Lỗi hay gặp

Lấy lần đọc cuối trừ lần đọc đầu: reset làm mất 220 request.

```sql
-- WRONG: last minus first
SELECT max(value) FILTER (WHERE ts =
    '2026-10-31 10:02')
  - max(value) FILTER (WHERE ts =
    '2026-10-31 10:00') AS increase
FROM metrics;
```

```sql
-- FIX: sum reset-aware steps
SELECT sum(CASE WHEN d < 0 THEN value
    ELSE d END) AS increase
FROM (
  SELECT value, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

Cộng các hiệu mà không xử lý reset: -200 kéo tổng xuống.

```sql
-- WRONG: the -200 stays in
SELECT sum(d) AS increase
FROM (
  SELECT value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

```sql
-- FIX: a drop counts the new value
SELECT sum(CASE WHEN d < 0 THEN v
    ELSE d END) AS increase
FROM (
  SELECT value AS v, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

## Thực hành

Bốn bước: hiệu giữa các lần đọc, tổng mức tăng có xử lý reset, rate trung bình mỗi giây, rồi rate của từng khoảng 15 giây.

## Tóm tắt

- Mức tăng của counter = `value - lag(value) OVER (ORDER BY ts)`.
- Hiệu âm là reset (khởi động lại): mức tăng là giá trị mới.
- Rate bằng SQL = tổng mức tăng / số giây giữa lần đọc đầu và cuối.
- `rate()` của Prometheus khác: khoảng mở bên trái và ngoại suy tới hai đầu.

# EN

## Opening

At 10:01:15 the container tracking service restarted, and the counter `http_requests_total` dropped from 220 to 20. A naive subtraction reports -200 requests. This lesson computes requests per second correctly with `lag()` in SQL.

## Key idea

A counter only goes up, so the events between two readings are their difference: `value - lag(value) OVER (ORDER BY ts)`. The exception is a restart: the counter goes back to 0 and counts again. The Prometheus docs treat any decrease between two consecutive samples as a reset and adjust for it; in SQL we do the same: on a negative difference, the increase is the new value itself (counted from 0). Rate = the total increase divided by the seconds.

This is not Prometheus' `rate()`. `rate(v[2m])` takes the samples in a left-open range (a sample exactly at the start is excluded), then **extrapolates** the increase to both ends of the range to make up for readings out of step, and divides by exactly the range's length. On this lesson's data the SQL gives 1.92 requests/second, while `rate()` gives 1.90. The PromQL lesson at level 3 computes the real `rate()` with the simulation. The figure at the end of this section draws the counter falling to 0 and the increase computed again.

## Syntax

```sql
-- reset-aware increase per reading
SELECT ts,
  CASE WHEN d < 0 THEN value
    ELSE d END AS inc
FROM (
  SELECT ts, value, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

- `lag(value) OVER (ORDER BY ts)`: the previous reading's value.
- A negative difference = a reset: the increase is the new value.
- Rate = total increase / the seconds between the first and last reading.

## Example

Nine readings, 15 seconds apart; the sixth comes after the restart.

```sql
SELECT ts, value
FROM metrics
ORDER BY ts;
```

The increase of each interval, with the reset handled.

```sql
SELECT ts,
  CASE WHEN d < 0 THEN value
    ELSE d END AS inc
FROM (
  SELECT ts, value, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t
WHERE d IS NOT NULL
ORDER BY ts;
```

## Common mistakes

Taking the last reading minus the first: the reset loses 220 requests.

```sql
-- WRONG: last minus first
SELECT max(value) FILTER (WHERE ts =
    '2026-10-31 10:02')
  - max(value) FILTER (WHERE ts =
    '2026-10-31 10:00') AS increase
FROM metrics;
```

```sql
-- FIX: sum reset-aware steps
SELECT sum(CASE WHEN d < 0 THEN value
    ELSE d END) AS increase
FROM (
  SELECT value, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

Adding the differences without handling the reset: the -200 drags the total down.

```sql
-- WRONG: the -200 stays in
SELECT sum(d) AS increase
FROM (
  SELECT value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

```sql
-- FIX: a drop counts the new value
SELECT sum(CASE WHEN d < 0 THEN v
    ELSE d END) AS increase
FROM (
  SELECT value AS v, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM metrics) t;
```

## Practice

Four steps: the differences between readings, the total reset-aware increase, the average rate per second, then the rate of each 15-second interval.

## Recap

- A counter's increase = `value - lag(value) OVER (ORDER BY ts)`.
- A negative difference is a reset (a restart): the increase is the new value.
- A SQL rate = total increase / the seconds between the first and last reading.
- Prometheus' `rate()` differs: the range is left-open and it extrapolates to both ends.
