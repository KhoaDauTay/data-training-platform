---
id: e-tm-l1-02
engine: telemetry
level: L1
module: signals
title: "Loại metric: counter, gauge, histogram"
title_en: "Metric types: counter, gauge, histogram"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: tm-metric-types, at: idea }]
objectives:
  - vi: Phân biệt counter (chỉ tăng, về 0 khi khởi động lại), gauge (lên xuống tự do) và histogram (đếm theo ngăn).
    en: Tell a counter (only goes up, back to 0 on restart) from a gauge (goes up and down) and a histogram (counts per bucket).
  - vi: Đọc đúng mỗi loại bằng SQL - lần đọc cuối của gauge, hiệu hai lần đọc của counter.
    en: Read each type correctly in SQL - the last reading of a gauge, the difference of two readings of a counter.
  - vi: Biến các ngăn cộng dồn `le` của histogram thành số quan sát trong từng ngăn.
    en: Turn a histogram's cumulative `le` buckets into the count inside each bucket.
requires: [e-tm-l1-01]
sources:
  - { url: "https://prometheus.io/docs/concepts/metric_types/", title: "Prometheus: Metric types" }
  - { url: "https://opentelemetry.io/docs/concepts/signals/metrics/", title: "OpenTelemetry: Metrics" }
lab:
  setup: |
    CREATE TABLE metrics (
      ts timestamp, name text,
      labels jsonb, value float8
    );
    INSERT INTO metrics VALUES
      ('2026-10-31 10:00', 'queue_depth', '{"worker": "w1"}', 5),
      ('2026-10-31 10:01', 'queue_depth', '{"worker": "w1"}', 12),
      ('2026-10-31 10:02', 'queue_depth', '{"worker": "w1"}', 3),
      ('2026-10-31 10:03', 'queue_depth', '{"worker": "w1"}', 8),
      ('2026-10-31 10:00', 'jobs_done_total', '{"worker": "w1"}', 100),
      ('2026-10-31 10:01', 'jobs_done_total', '{"worker": "w1"}', 130),
      ('2026-10-31 10:02', 'jobs_done_total', '{"worker": "w1"}', 150),
      ('2026-10-31 10:03', 'jobs_done_total', '{"worker": "w1"}', 190),
      ('2026-10-31 10:03', 'job_seconds_bucket', '{"worker": "w1", "le": "0.5"}', 120),
      ('2026-10-31 10:03', 'job_seconds_bucket', '{"worker": "w1", "le": "1"}', 170),
      ('2026-10-31 10:03', 'job_seconds_bucket', '{"worker": "w1", "le": "2"}', 185),
      ('2026-10-31 10:03', 'job_seconds_bucket', '{"worker": "w1", "le": "+Inf"}', 190),
      ('2026-10-31 10:03', 'job_seconds_count', '{"worker": "w1"}', 190),
      ('2026-10-31 10:03', 'job_seconds_sum', '{"worker": "w1"}', 140.5);
  steps:
    - task:
        vi: "Gauge `queue_depth`: hàng đợi đang dài bao nhiêu (lần đọc mới nhất) và dài nhất là bao nhiêu? Trả `latest`, `peak`."
        en: "Gauge `queue_depth`: how long is the queue now (the newest reading) and what was its peak? Return `latest`, `peak`."
      solution: |
        SELECT (array_agg(value ORDER BY ts DESC))[1]
            AS latest,
          max(value) AS peak
        FROM metrics
        WHERE name = 'queue_depth'
      check: rows
      hint:
        vi: "Gauge lên xuống tự do, nên lần đọc mới nhất mới là \"bây giờ\": `(array_agg(value ORDER BY ts DESC))[1]`, và `max(value)` cho đỉnh."
        en: "A gauge goes up and down, so only the newest reading is \"now\": `(array_agg(value ORDER BY ts DESC))[1]`, and `max(value)` for the peak."
    - task:
        vi: "Counter `jobs_done_total`: từ 10:00 tới 10:03 worker làm xong bao nhiêu job? Trả `jobs`."
        en: "Counter `jobs_done_total`: how many jobs did the worker finish from 10:00 to 10:03? Return `jobs`."
      solution: |
        SELECT max(value) - min(value) AS jobs
        FROM metrics
        WHERE name = 'jobs_done_total'
      check: rows
      hint:
        vi: "Counter cộng dồn, không reset trong khoảng này: `max(value) - min(value)`."
        en: "A counter accumulates and did not reset in this window: `max(value) - min(value)`."
    - task:
        vi: "Histogram `job_seconds_bucket` cộng dồn theo `le`. Mỗi ngăn thật sự chứa bao nhiêu job? Trả `le` (chữ), `jobs`."
        en: "Histogram `job_seconds_bucket` is cumulative by `le`. How many jobs fall inside each bucket? Return `le` (text), `jobs`."
      solution: |
        SELECT labels->>'le' AS le,
          value - coalesce(lag(value)
            OVER (ORDER BY value), 0) AS jobs
        FROM metrics
        WHERE name = 'job_seconds_bucket'
      check: rows
      hint:
        vi: "Ngăn `le` đếm mọi job ≤ `le`, nên trừ ngăn trước: `value - coalesce(lag(value) OVER (ORDER BY value), 0)`."
        en: "Bucket `le` counts every job ≤ `le`, so subtract the previous bucket: `value - coalesce(lag(value) OVER (ORDER BY value), 0)`."
    - task:
        vi: "Thời gian trung bình một job, từ `job_seconds_sum` chia `job_seconds_count`. Trả `avg_seconds`."
        en: "The average time per job, `job_seconds_sum` divided by `job_seconds_count`. Return `avg_seconds`."
      solution: |
        SELECT s.value / c.value AS avg_seconds
        FROM metrics s, metrics c
        WHERE s.name = 'job_seconds_sum'
          AND c.name = 'job_seconds_count'
      check: rows
      hint:
        vi: "Hai dòng, một của `_sum`, một của `_count`: lấy mỗi dòng bằng một bí danh rồi chia `s.value / c.value`."
        en: "Two rows, one for `_sum`, one for `_count`: take each with an alias and divide `s.value / c.value`."
quiz:
  - q:
      vi: "Số job đang chờ trong hàng đợi nên là loại metric nào?"
      en: "Which metric type should the number of jobs waiting in a queue be?"
    options:
      - { vi: "Counter, vì nó đếm job", en: "A counter, because it counts jobs" }
      - { vi: "Gauge, vì nó lên và xuống", en: "A gauge, because it goes up and down" }
      - { vi: "Histogram, vì nó có ngăn", en: "A histogram, because it has buckets" }
    answer: 1
    trap: 0
    why:
      vi: "Chữ \"đếm\" làm ta nghĩ tới counter, nhưng counter chỉ tăng hoặc về 0 khi khởi động lại; tài liệu Prometheus dặn không dùng counter cho giá trị có thể giảm. Hàng đợi dài 12 lúc 10:01 rồi còn 3 lúc 10:02, tức là giảm, nên đó là gauge. Histogram dùng để đếm quan sát vào các ngăn (thời gian chạy job), không phải để ghi một con số hiện tại."
      en: "The word \"count\" suggests a counter, but a counter only goes up or back to 0 on restart; the Prometheus docs say not to use a counter for a value that can decrease. The queue was 12 long at 10:01 and 3 at 10:02, so it decreases: a gauge. A histogram counts observations into buckets (job durations), it does not record one current number."
  - q:
      vi: "Ngăn `le=\"1\"` báo 170, ngăn `le=\"0.5\"` báo 120. Bao nhiêu job chạy hơn 0,5 giây nhưng không quá 1 giây?"
      en: "Bucket `le=\"1\"` reports 170 and bucket `le=\"0.5\"` reports 120. How many jobs took more than 0.5 seconds but at most 1 second?"
    options:
      - { vi: "170", en: "170" }
      - { vi: "290", en: "290" }
      - { vi: "50", en: "50" }
    answer: 2
    trap: 0
    why:
      vi: "Ngăn của histogram Prometheus là cộng dồn: `le=\"1\"` đếm mọi job ≤ 1 giây, kể cả 120 job ≤ 0,5 giây. Job trong khoảng (0,5; 1] là 170 - 120 = 50. 170 quên rằng ngăn đã cộng dồn; 290 cộng hai ngăn, đếm 120 job hai lần."
      en: "Prometheus histogram buckets are cumulative: `le=\"1\"` counts every job ≤ 1 second, including the 120 jobs ≤ 0.5 seconds. Jobs in (0.5, 1] are 170 - 120 = 50. 170 forgets the buckets are cumulative; 290 adds two buckets and counts the 120 jobs twice."
---
## Mở bài

Worker xử lý job của Cargo Query gửi ba loại số: hàng đợi dài bao nhiêu, đã làm xong bao nhiêu job, và mỗi job mất bao lâu. Ba con số này phải đọc theo ba cách khác nhau. Đọc sai cách là ra số vô nghĩa mà không có lỗi nào báo.

## Ý chính

Prometheus có bốn loại metric. **Counter** là số cộng dồn chỉ tăng, hoặc về 0 khi tiến trình khởi động lại; giá trị tự nó ít ý nghĩa, ta đọc hiệu giữa hai lần đọc. Tài liệu dặn không dùng counter cho giá trị có thể giảm. **Gauge** là một con số lên xuống tự do (độ dài hàng đợi, bộ nhớ); lần đọc mới nhất là "bây giờ". **Histogram** đếm các quan sát (thời gian chạy, kích thước) vào các ngăn có cận trên `le`, và còn gửi `_sum` (tổng) và `_count` (số quan sát, bằng ngăn `le="+Inf"`). **Summary** cũng quan sát như vậy nhưng tự tính phân vị ở phía client.

Ngăn histogram là **cộng dồn**: `le="1"` đếm mọi quan sát ≤ 1, nên số trong một ngăn = ngăn này trừ ngăn trước. Trung bình = `_sum / _count`. OpenTelemetry gọi các dụng cụ đo tương ứng là Counter, UpDownCounter, Gauge và Histogram. Hình cuối mục đặt ba loại cạnh nhau.

## Cú pháp

```sql
-- a counter: later minus earlier
SELECT max(value) - min(value)
FROM metrics
WHERE name = 'jobs_done_total';
```

- Gauge: đọc lần mới nhất, hoặc `max`/`avg` theo thời gian.
- Counter: hiệu hai lần đọc (bài sau xử lý lúc counter về 0).
- Histogram: ngăn `le` cộng dồn; trung bình = `_sum / _count`.

## Ví dụ

Gauge lên xuống theo từng phút.

```sql
SELECT ts, value
FROM metrics
WHERE name = 'queue_depth'
ORDER BY ts;
```

Các ngăn histogram, cộng dồn theo `le`.

```sql
SELECT labels->>'le' AS le, value
FROM metrics
WHERE name = 'job_seconds_bucket'
ORDER BY value;
```

## Lỗi hay gặp

Cộng các ngăn histogram lại: mỗi job bị đếm nhiều lần.

```sql
-- WRONG: buckets are cumulative
SELECT sum(value) AS jobs
FROM metrics
WHERE name = 'job_seconds_bucket';
```

```sql
-- FIX: the +Inf bucket is the total
SELECT value AS jobs
FROM metrics
WHERE name = 'job_seconds_bucket'
  AND labels->>'le' = '+Inf';
```

Lấy trung bình của gauge làm "bây giờ": ra 7, hàng đợi thật đang là 8.

```sql
-- WRONG: the average is not now
SELECT avg(value) AS now_depth
FROM metrics
WHERE name = 'queue_depth';
```

```sql
-- FIX: the newest reading
SELECT value AS now_depth
FROM metrics
WHERE name = 'queue_depth'
ORDER BY ts DESC LIMIT 1;
```

## Thực hành

Bốn bước, mỗi bước một cách đọc: lần đọc mới nhất và đỉnh của gauge, số job từ counter, số job trong từng ngăn histogram, rồi thời gian trung bình từ `_sum` và `_count`.

## Tóm tắt

- Counter chỉ tăng (về 0 khi khởi động lại); đọc hiệu hai lần đọc.
- Gauge lên xuống; lần đọc mới nhất là "bây giờ".
- Ngăn histogram cộng dồn theo `le`; ngăn `+Inf` bằng `_count`.
- Trung bình từ histogram = `_sum / _count`.

# EN

## Opening

Cargo Query's job worker sends three kinds of number: how long the queue is, how many jobs it has finished, and how long each job takes. These three must be read three different ways. Read one the wrong way and you get a meaningless number with no error to warn you.

## Key idea

Prometheus has four metric types. A **counter** is a cumulative number that only goes up, or back to 0 when the process restarts; its value means little by itself, so we read the difference between two readings. The docs say not to use a counter for a value that can decrease. A **gauge** is one number that goes up and down freely (queue length, memory); its newest reading is "now". A **histogram** counts observations (durations, sizes) into buckets with an upper bound `le`, and also sends `_sum` (the total) and `_count` (the number of observations, equal to the `le="+Inf"` bucket). A **summary** observes the same way but computes quantiles on the client.

Histogram buckets are **cumulative**: `le="1"` counts every observation ≤ 1, so the count inside one bucket = this bucket minus the previous one. The average = `_sum / _count`. OpenTelemetry calls the matching instruments Counter, UpDownCounter, Gauge and Histogram. The figure at the end of this section puts the three types side by side.

## Syntax

```sql
-- a counter: later minus earlier
SELECT max(value) - min(value)
FROM metrics
WHERE name = 'jobs_done_total';
```

- Gauge: read the newest reading, or `max`/`avg` over time.
- Counter: the difference of two readings (the next lesson handles a counter going back to 0).
- Histogram: cumulative `le` buckets; average = `_sum / _count`.

## Example

A gauge going up and down minute by minute.

```sql
SELECT ts, value
FROM metrics
WHERE name = 'queue_depth'
ORDER BY ts;
```

The histogram buckets, cumulative by `le`.

```sql
SELECT labels->>'le' AS le, value
FROM metrics
WHERE name = 'job_seconds_bucket'
ORDER BY value;
```

## Common mistakes

Adding the histogram buckets up: each job is counted several times.

```sql
-- WRONG: buckets are cumulative
SELECT sum(value) AS jobs
FROM metrics
WHERE name = 'job_seconds_bucket';
```

```sql
-- FIX: the +Inf bucket is the total
SELECT value AS jobs
FROM metrics
WHERE name = 'job_seconds_bucket'
  AND labels->>'le' = '+Inf';
```

Taking a gauge's average as "now": it gives 7, the queue is really 8.

```sql
-- WRONG: the average is not now
SELECT avg(value) AS now_depth
FROM metrics
WHERE name = 'queue_depth';
```

```sql
-- FIX: the newest reading
SELECT value AS now_depth
FROM metrics
WHERE name = 'queue_depth'
ORDER BY ts DESC LIMIT 1;
```

## Practice

Four steps, one way of reading each: the gauge's newest reading and peak, the jobs from the counter, the jobs inside each histogram bucket, then the average time from `_sum` and `_count`.

## Recap

- A counter only goes up (back to 0 on restart); read the difference of two readings.
- A gauge goes up and down; its newest reading is "now".
- Histogram buckets are cumulative by `le`; the `+Inf` bucket equals `_count`.
- The average from a histogram = `_sum / _count`.
