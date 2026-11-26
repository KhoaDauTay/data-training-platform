---
id: e-tm-l2-02
engine: telemetry
level: L2
module: query
title: "Phân vị: từ giá trị thô và từ histogram"
title_en: "Percentiles: from raw values and from a histogram"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: tm-histogram-buckets, at: idea }]
objectives:
  - vi: Tính p50, p95 từ giá trị thô bằng `percentile_cont` và thấy vì sao trung bình che mất đuôi chậm.
    en: Compute p50 and p95 from raw values with `percentile_cont` and see why the average hides the slow tail.
  - vi: Ước lượng phân vị từ ngăn histogram bằng nội suy tuyến tính, như `histogram_quantile`.
    en: Estimate a percentile from histogram buckets by linear interpolation, as `histogram_quantile` does.
  - vi: Biết rằng không được lấy trung bình các p95 của từng nhóm.
    en: Know that the p95s of separate groups must not be averaged.
requires: [e-tm-l1-02]
sources:
  - { url: "https://www.postgresql.org/docs/current/functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE", title: "PostgreSQL: Ordered-set aggregates (percentile_cont)" }
  - { url: "https://prometheus.io/docs/practices/histograms/", title: "Prometheus: Histograms and summaries" }
  - { url: "https://prometheus.io/docs/prometheus/latest/querying/functions/", title: "Prometheus: histogram_quantile()" }
lab:
  setup: |
    CREATE TABLE requests (
      ts timestamp, route text, ms int
    );
    INSERT INTO requests
    SELECT timestamp '2026-10-31 10:00'
        + i * interval '3 seconds', '/track', ms
    FROM unnest(ARRAY[60, 70, 80, 85, 90, 95, 100,
      110, 120, 130, 140, 150, 160, 180, 200,
      240, 300, 450, 900, 1200])
      WITH ORDINALITY AS t(ms, i);
    INSERT INTO requests
    SELECT timestamp '2026-10-31 10:00'
        + i * interval '6 seconds', '/quote', ms
    FROM unnest(ARRAY[40, 45, 50, 55, 60, 65, 70,
      75, 80, 600])
      WITH ORDINALITY AS t(ms, i);
    CREATE TABLE latency_bucket (
      route text, le float8, cnt int
    );
    INSERT INTO latency_bucket VALUES
      ('/track', 100, 7), ('/track', 250, 16),
      ('/track', 500, 18), ('/track', 1000, 19),
      ('/track', 'Infinity', 20);
  steps:
    - task:
        vi: "Mỗi route: thời gian trung bình, p50 và p95 (mili giây) từ giá trị thô. Trả `route`, `avg_ms`, `p50`, `p95`."
        en: "Each route: the average time, p50 and p95 (milliseconds) from the raw values. Return `route`, `avg_ms`, `p50`, `p95`."
      solution: |
        SELECT route, avg(ms) AS avg_ms,
          percentile_cont(0.5)
            WITHIN GROUP (ORDER BY ms) AS p50,
          percentile_cont(0.95)
            WITHIN GROUP (ORDER BY ms) AS p95
        FROM requests
        GROUP BY route
      check: rows
      hint:
        vi: "`percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)`, cùng `avg(ms)`, `GROUP BY route`."
        en: "`percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)`, with `avg(ms)`, `GROUP BY route`."
    - task:
        vi: "Từ `latency_bucket` (cộng dồn, ngăn `Infinity` là tổng): tỉ lệ request của `/track` xong trong 250 ms. Trả `under_250`."
        en: "From `latency_bucket` (cumulative, the `Infinity` bucket is the total): the share of `/track` requests done within 250 ms. Return `under_250`."
      solution: |
        SELECT b.cnt::float8 / t.cnt AS under_250
        FROM latency_bucket b, latency_bucket t
        WHERE b.le = 250
          AND t.le = 'Infinity'
      check: rows
      hint:
        vi: "Ngăn `le = 250` đếm mọi request ≤ 250 ms; chia cho ngăn `le = 'Infinity'`. Ép `::float8` để không chia nguyên."
        en: "Bucket `le = 250` counts every request ≤ 250 ms; divide by bucket `le = 'Infinity'`. Cast `::float8` to avoid integer division."
    - task:
        vi: "Ước lượng p50 của `/track` từ ngăn: tìm ngăn đầu tiên có `cnt` ≥ 0,5 × tổng, rồi nội suy tuyến tính giữa cận dưới (cận ngăn trước, hoặc 0) và cận trên. Trả `p50`."
        en: "Estimate `/track`'s p50 from the buckets: find the first bucket whose `cnt` ≥ 0.5 × the total, then interpolate linearly between its lower bound (the previous bucket's bound, or 0) and its upper bound. Return `p50`."
      solution: |
        WITH b AS (
          SELECT le, cnt,
            lag(le, 1, 0::float8) OVER w AS lo,
            lag(cnt, 1, 0) OVER w AS below,
            max(cnt) OVER () AS n
          FROM latency_bucket
          WINDOW w AS (ORDER BY le))
        SELECT lo + (le - lo)
          * (0.5 * n - below) / (cnt - below)
          AS p50
        FROM b
        WHERE cnt >= 0.5 * n
        ORDER BY le
        LIMIT 1
      check: rows
      hint:
        vi: "Trong một CTE: `lag(le, 1, 0::float8)` là cận dưới, `lag(cnt, 1, 0)` là số request dưới ngăn, `max(cnt) OVER ()` là tổng. Rồi `lo + (le - lo) * (0.5 * n - below) / (cnt - below)` trên ngăn đầu tiên có `cnt >= 0.5 * n`."
        en: "In a CTE: `lag(le, 1, 0::float8)` is the lower bound, `lag(cnt, 1, 0)` the requests below the bucket, `max(cnt) OVER ()` the total. Then `lo + (le - lo) * (0.5 * n - below) / (cnt - below)` on the first bucket with `cnt >= 0.5 * n`."
    - task:
        vi: "p95 của mọi request (cả hai route gộp lại) từ giá trị thô. Trả `p95`."
        en: "The p95 of every request (both routes together) from the raw values. Return `p95`."
      solution: |
        SELECT percentile_cont(0.95)
          WITHIN GROUP (ORDER BY ms) AS p95
        FROM requests
      check: rows
      hint:
        vi: "Một `percentile_cont(0.95)` trên cả bảng, không `GROUP BY`."
        en: "One `percentile_cont(0.95)` over the whole table, no `GROUP BY`."
quiz:
  - q:
      vi: "p95 của `/track` là 915 ms, của `/quote` là 366 ms. p95 của mọi request gộp lại là bao nhiêu?"
      en: "`/track`'s p95 is 915 ms and `/quote`'s is 366 ms. What is the p95 of all requests together?"
    options:
      - { vi: "640,5 ms, trung bình hai p95", en: "640.5 ms, the mean of the two" }
      - { vi: "915 ms, p95 lớn hơn", en: "915 ms, the larger p95" }
      - { vi: "765 ms, tính lại trên mọi giá trị", en: "765 ms, recomputed on all values" }
    answer: 2
    trap: 0
    why:
      vi: "Lấy trung bình hai p95 nghe công bằng, nhưng phân vị không cộng hay chia trung bình được: p95 gộp phụ thuộc vào mọi giá trị và số request của mỗi route (20 và 10). Tính lại trên 30 giá trị: hạng 0,95 × 29 = 27,55 rơi giữa 600 và 900, ra 600 + 0,55 × 300 = 765 ms (bước 4). Vì thế Prometheus gộp ngăn histogram (`sum by (le)`) trước rồi mới tính phân vị; summary đã tính sẵn phân vị thì không gộp được."
      en: "Averaging the two p95s sounds fair, but percentiles cannot be added or averaged: the combined p95 depends on every value and on each route's request count (20 and 10). Recomputed on the 30 values: rank 0.95 × 29 = 27.55 falls between 600 and 900, giving 600 + 0.55 × 300 = 765 ms (step 4). That is why Prometheus adds histogram buckets (`sum by (le)`) first and computes the percentile after; a summary's precomputed quantiles cannot be combined."
  - q:
      vi: "Từ ngăn, p50 của `/track` ước ra 150 ms; giá trị thô cho 135 ms. Vì sao lệch?"
      en: "From the buckets, `/track`'s p50 is estimated at 150 ms; the raw values give 135 ms. Why the gap?"
    options:
      - { vi: "Ngăn giả sử đều trong 100–250", en: "Buckets assume even spread in 100-250" }
      - { vi: "Histogram đếm thiếu request", en: "The histogram misses requests" }
      - { vi: "`percentile_cont` làm tròn", en: "`percentile_cont` rounds" }
    answer: 0
    why:
      vi: "Histogram vẫn đếm đủ 20 request; nó chỉ không giữ giá trị từng request. Hạng 10 rơi vào ngăn (100; 250], và `histogram_quantile` giả sử các request trải đều trong ngăn (nội suy tuyến tính): 100 + 150 × (10 - 7)/(16 - 7) = 150. Thật ra 9 request trong ngăn dồn về phía dưới (110 tới 240), nên giá trị thật nhỏ hơn. Tài liệu Prometheus nói sai số bị giới hạn bởi độ rộng ngăn chứa phân vị."
      en: "The histogram still counts all 20 requests; it just does not keep each value. Rank 10 falls in the (100, 250] bucket, and `histogram_quantile` assumes the requests are spread evenly inside it (linear interpolation): 100 + 150 × (10 - 7)/(16 - 7) = 150. In fact the 9 requests in that bucket lean toward the bottom (110 to 240), so the real value is lower. The Prometheus docs say the error is limited by the width of the bucket the quantile is in."
---
## Mở bài

Báo cáo tuần nói API `/track` trả lời trung bình 243 ms, ổn. Nhưng một request trong hai mươi mất gần một giây. Bài này đo đúng phần đuôi đó bằng phân vị, từ giá trị thô và từ histogram.

## Ý chính

**Phân vị** p95 là giá trị mà 95% request nhanh hơn hoặc bằng. Trung bình bị vài request rất chậm kéo lên nhưng vẫn che mất chúng; p95 và p99 nói thẳng đuôi chậm dài bao nhiêu. Khi có từng giá trị, PostgreSQL tính bằng `percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)`: nó nội suy giữa hai giá trị đứng quanh hạng 0,95 × (n - 1).

Khi chỉ có **histogram** (ngăn cộng dồn `le`), ta ước lượng: hạng = q × tổng, tìm ngăn đầu tiên đếm đủ hạng đó, rồi nội suy tuyến tính trong ngăn, giả sử request trải đều. Đây đúng là cách `histogram_quantile()` của Prometheus làm, với cận dưới của ngăn đầu là 0. Sai số bị giới hạn bởi độ rộng ngăn. Một điều quan trọng: phân vị không lấy trung bình được. Muốn p95 của nhiều máy, Prometheus cộng các ngăn (`sum by (le)`) rồi mới tính; summary đã tính sẵn phân vị trên từng máy nên không gộp được. Hình cuối mục chỉ chỗ hạng 10 rơi vào ngăn.

## Cú pháp

```sql
SELECT percentile_cont(0.95)
  WITHIN GROUP (ORDER BY ms) AS p95
FROM requests;
```

- `percentile_cont(q)`: nội suy giữa hai giá trị quanh hạng q × (n - 1).
- Từ ngăn: hạng = q × tổng; ngăn đầu tiên có `cnt` ≥ hạng; nội suy từ cận dưới tới cận trên.
- Không lấy trung bình các phân vị; gộp dữ liệu (hay ngăn) trước.

## Ví dụ

Trung bình và p95 của mỗi route: trung bình thấp hơn p95 nhiều.

```sql
SELECT route, round(avg(ms)) AS avg_ms,
  percentile_cont(0.95)
    WITHIN GROUP (ORDER BY ms) AS p95
FROM requests
GROUP BY route ORDER BY route;
```

Các ngăn cộng dồn của `/track`.

```sql
SELECT le, cnt
FROM latency_bucket
ORDER BY le;
```

## Lỗi hay gặp

Lấy trung bình các p95 của từng route: ra 640,5, không phải 765.

```sql
-- WRONG: the mean of two p95s
SELECT avg(p95) AS p95
FROM (
  SELECT percentile_cont(0.95)
    WITHIN GROUP (ORDER BY ms) AS p95
  FROM requests GROUP BY route) t;
```

```sql
-- FIX: one p95 over every value
SELECT percentile_cont(0.95)
  WITHIN GROUP (ORDER BY ms) AS p95
FROM requests;
```

Chia cho tổng các ngăn: ngăn cộng dồn nên mẫu bị đếm nhiều lần.

```sql
-- WRONG: buckets are cumulative
SELECT 16.0 / sum(cnt) AS under_250
FROM latency_bucket;
```

```sql
-- FIX: divide by the Infinity bucket
SELECT 16.0 / cnt AS under_250
FROM latency_bucket
WHERE le = 'Infinity';
```

## Thực hành

Bốn bước: trung bình, p50, p95 từ giá trị thô; tỉ lệ request xong trong 250 ms từ ngăn; p50 ước lượng từ ngăn bằng nội suy; rồi p95 gộp hai route tính lại từ đầu.

## Tóm tắt

- Trung bình che đuôi chậm; p95, p99 nói đuôi dài bao nhiêu.
- `percentile_cont(q) WITHIN GROUP (ORDER BY …)` tính phân vị từ giá trị thô.
- Từ histogram: hạng = q × tổng, nội suy tuyến tính trong ngăn chứa hạng, như `histogram_quantile`.
- Không lấy trung bình các phân vị; gộp giá trị hay ngăn rồi mới tính.

# EN

## Opening

The weekly report says the `/track` API answers in 243 ms on average, fine. But one request in twenty takes almost a second. This lesson measures that tail with percentiles, from raw values and from a histogram.

## Key idea

The **percentile** p95 is the value that 95% of requests are faster than or equal to. A few very slow requests pull the average up yet still hide inside it; p95 and p99 say plainly how long the slow tail is. When every value is kept, PostgreSQL computes it with `percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)`: it interpolates between the two values around rank 0.95 × (n - 1).

When only a **histogram** exists (cumulative `le` buckets), we estimate: rank = q × total, find the first bucket that counts up to that rank, then interpolate linearly inside it, assuming the requests are spread evenly. That is exactly what Prometheus' `histogram_quantile()` does, with 0 as the lowest bucket's lower bound. The error is limited by the bucket's width. One important point: percentiles cannot be averaged. For the p95 of many machines, Prometheus adds the buckets (`sum by (le)`) first and computes after; a summary's quantiles are computed per machine and cannot be combined. The figure at the end of this section shows where rank 10 falls.

## Syntax

```sql
SELECT percentile_cont(0.95)
  WITHIN GROUP (ORDER BY ms) AS p95
FROM requests;
```

- `percentile_cont(q)`: interpolates between the two values around rank q × (n - 1).
- From buckets: rank = q × total; the first bucket with `cnt` ≥ rank; interpolate from its lower to its upper bound.
- Never average percentiles; combine the data (or the buckets) first.

## Example

Each route's average and p95: the average is far below the p95.

```sql
SELECT route, round(avg(ms)) AS avg_ms,
  percentile_cont(0.95)
    WITHIN GROUP (ORDER BY ms) AS p95
FROM requests
GROUP BY route ORDER BY route;
```

The cumulative buckets of `/track`.

```sql
SELECT le, cnt
FROM latency_bucket
ORDER BY le;
```

## Common mistakes

Averaging each route's p95: it gives 640.5, not 765.

```sql
-- WRONG: the mean of two p95s
SELECT avg(p95) AS p95
FROM (
  SELECT percentile_cont(0.95)
    WITHIN GROUP (ORDER BY ms) AS p95
  FROM requests GROUP BY route) t;
```

```sql
-- FIX: one p95 over every value
SELECT percentile_cont(0.95)
  WITHIN GROUP (ORDER BY ms) AS p95
FROM requests;
```

Dividing by the sum of the buckets: they are cumulative, so samples are counted several times.

```sql
-- WRONG: buckets are cumulative
SELECT 16.0 / sum(cnt) AS under_250
FROM latency_bucket;
```

```sql
-- FIX: divide by the Infinity bucket
SELECT 16.0 / cnt AS under_250
FROM latency_bucket
WHERE le = 'Infinity';
```

## Practice

Four steps: the average, p50 and p95 from raw values; the share done within 250 ms from the buckets; p50 estimated from the buckets by interpolation; then the p95 of both routes together, computed afresh.

## Recap

- The average hides the slow tail; p95 and p99 say how long it is.
- `percentile_cont(q) WITHIN GROUP (ORDER BY …)` computes a percentile from raw values.
- From a histogram: rank = q × total, interpolate linearly in the bucket holding the rank, as `histogram_quantile` does.
- Never average percentiles; combine values or buckets first.
