---
id: e-tm-l3-03
engine: telemetry
level: L3
module: promql
title: "PromQL: histogram_quantile và avg by"
title_en: "PromQL: histogram_quantile and avg by"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: tm-histogram-quantile, at: idea }]
objectives:
  - vi: Tính p95 từ ngăn histogram bằng `histogram_quantile(0.95, sum by (le) (rate(…_bucket[5m])))`.
    en: Compute p95 from histogram buckets with `histogram_quantile(0.95, sum by (le) (rate(…_bucket[5m])))`.
  - vi: Giữ nhãn `le` (và nhãn muốn tách, như `route`) khi gộp ngăn.
    en: Keep the `le` label (and the labels to split by, such as `route`) when combining buckets.
  - vi: Dùng `avg by` và `sum by` trên rate của `_count`.
    en: Use `avg by` and `sum by` on the rate of `_count`.
requires: [e-tm-l3-02, e-tm-l2-02]
sources:
  - { url: "https://prometheus.io/docs/prometheus/latest/querying/functions/", title: "Prometheus: histogram_quantile()" }
  - { url: "https://prometheus.io/docs/practices/histograms/", title: "Prometheus: Histograms and summaries" }
  - { url: "https://github.com/prometheus/prometheus/blob/v3.5.0/promql/quantile.go", title: "Prometheus v3.5.0 source: BucketQuantile" }
lab:
  setup: |
    CREATE TABLE samples (
      metric text, labels jsonb,
      ts timestamp, value float8
    );
    INSERT INTO samples
    SELECT 'request_seconds_bucket',
      jsonb_build_object('route', r, 'pod', p, 'le', le),
      timestamp '2026-10-31 09:55'
        + n * interval '15 seconds',
      n * k
    FROM (VALUES
        ('/track', 'a', '0.1', 2), ('/track', 'a', '0.25', 5),
        ('/track', 'a', '0.5', 8), ('/track', 'a', '1', 10),
        ('/track', 'a', '+Inf', 10),
        ('/track', 'b', '0.1', 1), ('/track', 'b', '0.25', 4),
        ('/track', 'b', '0.5', 7), ('/track', 'b', '1', 10),
        ('/track', 'b', '+Inf', 10),
        ('/quote', 'a', '0.1', 6), ('/quote', 'a', '0.25', 9),
        ('/quote', 'a', '0.5', 10), ('/quote', 'a', '1', 10),
        ('/quote', 'a', '+Inf', 10),
        ('/quote', 'b', '0.1', 6), ('/quote', 'b', '0.25', 9),
        ('/quote', 'b', '0.5', 10), ('/quote', 'b', '1', 10),
        ('/quote', 'b', '+Inf', 10)) AS v(r, p, le, k),
      generate_series(0, 20) n;
    INSERT INTO samples
    SELECT 'request_seconds_count',
      labels - 'le', ts, value
    FROM samples
    WHERE labels->>'le' = '+Inf';
  steps:
    - task:
        vi: "Request mỗi giây của mỗi route (cộng hai pod), từ `request_seconds_count`, trên 5 phút."
        en: "Requests per second of each route (both pods added), from `request_seconds_count`, over 5 minutes."
      solution: 'sum by (route) (rate(request_seconds_count[5m]))'
      lang: promql
      check: rows
      hint:
        vi: "`sum by (route) (rate(request_seconds_count[5m]))`."
        en: "`sum by (route) (rate(request_seconds_count[5m]))`."
    - task:
        vi: "p95 thời gian trả lời của `/track` (hai pod gộp lại), trên 5 phút."
        en: "The p95 response time of `/track` (both pods together), over 5 minutes."
      solution: 'histogram_quantile(0.95, sum by (le) (rate(request_seconds_bucket{route="/track"}[5m])))'
      lang: promql
      check: rows
      hint:
        vi: "`rate` từng ngăn, `sum by (le)` gộp pod nhưng giữ `le`, rồi `histogram_quantile(0.95, …)`."
        en: "`rate` each bucket, `sum by (le)` to add the pods but keep `le`, then `histogram_quantile(0.95, …)`."
    - task:
        vi: "p95 của từng route trong một truy vấn."
        en: "The p95 of each route in one query."
      solution: 'histogram_quantile(0.95, sum by (route, le) (rate(request_seconds_bucket[5m])))'
      lang: promql
      check: rows
      hint:
        vi: "Như bước 2, bỏ matcher `route` và gộp `sum by (route, le)`."
        en: "As in step 2, drop the `route` matcher and combine with `sum by (route, le)`."
    - task:
        vi: "Request mỗi giây trung bình của một pod, theo từng route (`avg by`)."
        en: "The average requests per second of one pod, per route (`avg by`)."
      solution: 'avg by (route) (rate(request_seconds_count[5m]))'
      lang: promql
      check: rows
      hint:
        vi: "`avg by (route) (rate(request_seconds_count[5m]))`."
        en: "`avg by (route) (rate(request_seconds_count[5m]))`."
quiz:
  - q:
      vi: "Viết `histogram_quantile(0.95, sum by (route) (rate(…_bucket[5m])))`, bỏ `le`. Kết quả ra sao?"
      en: "You write `histogram_quantile(0.95, sum by (route) (rate(…_bucket[5m])))`, dropping `le`. What comes out?"
    options:
      - { vi: "p95 đúng của mỗi route", en: "The right p95 of each route" }
      - { vi: "Không ra series nào", en: "No series at all" }
      - { vi: "Một lỗi cú pháp", en: "A syntax error" }
    answer: 1
    trap: 0
    why:
      vi: "Câu viết đúng cú pháp nên trông như sẽ chạy, nhưng `sum by (route)` cộng mọi ngăn của một route thành một con số và xóa nhãn `le`. Tài liệu Prometheus ghi mỗi mẫu phải có nhãn `le` là cận trên của ngăn; mẫu không có `le` bị bỏ qua lặng lẽ. Không còn ngăn nào, nên kết quả rỗng, không báo lỗi. Sửa: `sum by (route, le)`."
      en: "The query is valid, so it looks like it will work, but `sum by (route)` adds every bucket of a route into one number and erases the `le` label. The Prometheus docs say each sample must have an `le` label holding the bucket's upper bound; samples without `le` are silently ignored. No bucket is left, so the result is empty, with no error. The fix: `sum by (route, le)`."
  - q:
      vi: "Ngăn gộp của `/track` tỉ lệ với 3, 9, 15, 20, 20 (le 0.1, 0.25, 0.5, 1, +Inf). p95 ra bao nhiêu giây?"
      en: "`/track`'s combined buckets are proportional to 3, 9, 15, 20, 20 (le 0.1, 0.25, 0.5, 1, +Inf). What is p95 in seconds?"
    options:
      - { vi: "0,9", en: "0.9" }
      - { vi: "1", en: "1" }
      - { vi: "0,5", en: "0.5" }
    answer: 0
    trap: 1
    why:
      vi: "Hạng = 0,95 × 20 = 19. Ngăn đầu tiên đếm tới 19 là `le=\"1\"` (20), nên 1 giây trông như đáp án, nhưng `histogram_quantile` nội suy trong ngăn đó: cận dưới 0,5, có 15 request dưới ngăn, ngăn chứa 5: 0,5 + 0,5 × (19 - 15)/5 = 0,9. 0,5 là cận dưới, nơi chỉ 75% request (15/20) đã xong."
      en: "Rank = 0.95 × 20 = 19. The first bucket counting up to 19 is `le=\"1\"` (20), so 1 second looks like the answer, but `histogram_quantile` interpolates inside that bucket: lower bound 0.5, 15 requests below it, 5 inside: 0.5 + 0.5 × (19 - 15)/5 = 0.9. 0.5 is the lower bound, where only 75% of requests (15/20) are done."
---
## Mở bài

API `/track` chạy trên hai pod, mỗi pod gửi histogram thời gian trả lời riêng. Đội trực muốn một con số: p95 của `/track`. Bài này tính nó bằng `histogram_quantile` trên bản mô phỏng PromQL.

## Ý chính

Histogram cổ điển gửi ba loại series: `_bucket{le="…"}` (counter cộng dồn theo ngăn), `_sum` và `_count`. Muốn p95 trên 5 phút: lấy `rate()` của từng ngăn (số quan sát mỗi giây rơi vào ngăn), cộng các pod bằng `sum by (le)` (phải giữ `le`, và giữ thêm nhãn muốn tách như `route`), rồi `histogram_quantile(0.95, …)`. Đây chính là mẫu tài liệu Prometheus khuyên dùng; cộng ngăn trước rồi mới tính phân vị là điều histogram làm được mà summary không làm được.

`histogram_quantile` theo tài liệu và mã nguồn: hạng = q × số quan sát (ngăn `+Inf`), tìm ngăn đầu tiên đủ hạng, nội suy tuyến tính trong ngăn với cận dưới của ngăn đầu là 0; nếu hạng rơi vào ngăn `+Inf` thì trả cận của ngăn ngay dưới; không có ngăn `+Inf` thì ra NaN; mẫu thiếu `le` bị bỏ qua. `avg by` và `sum by` gộp các series còn lại. Bản mô phỏng của BoonData (mô phỏng, không phải Prometheus) làm đúng các luật đó, đồng hồ ảo ở 10:00:00. Hình cuối mục đi từng bước của câu p95.

## Cú pháp

```promql
histogram_quantile(0.95,
  sum by (le) (rate(
    request_seconds_bucket[5m]
  )))
```

- `rate` từng ngăn trước; `sum by (le, …)` giữ `le`.
- Hạng rơi vào `+Inf` → cận của ngăn ngay dưới; thiếu `+Inf` → NaN.
- `avg by (route)`, `sum by (route)` gộp phần còn lại.

## Ví dụ

Ngăn của pod `a` trên `/track` lúc 10:00, cộng dồn theo `le`.

```sql
SELECT labels->>'le' AS le, value
FROM samples
WHERE metric LIKE '%_bucket'
  AND labels @> '{"route": "/track",
    "pod": "a"}'
  AND ts = '2026-10-31 10:00'
ORDER BY value, le;
```

`_count` bằng ngăn `+Inf` của cùng pod.

```sql
SELECT labels->>'pod' AS pod, value
FROM samples
WHERE metric LIKE '%_count'
  AND labels->>'route' = '/track'
  AND ts = '2026-10-31 10:00'
ORDER BY pod;
```

Câu p95 của `/track` (chỉ hiển thị; chạy ở bước 2).

```promql
histogram_quantile(0.95,
  sum by (le) (rate(
    request_seconds_bucket{
      route="/track"}[5m])))
```

## Lỗi hay gặp

Gộp ngăn mà bỏ `le`: mọi mẫu mất `le`, kết quả rỗng.

```promql
# WRONG: le is gone, nothing left
histogram_quantile(0.95,
  sum by (route) (rate(
    request_seconds_bucket[5m]
  )))
```

```promql
# FIX: keep le
histogram_quantile(0.95,
  sum by (route, le) (rate(
    request_seconds_bucket[5m]
  )))
```

Quên `rate`: `sum` không nhận range vector.

```promql
# ERROR promql: rate is missing
histogram_quantile(0.95,
  sum by (le) (
    request_seconds_bucket[5m]
  ))
```

## Thực hành

Bốn bước PromQL trên bản mô phỏng: request mỗi giây theo route, p95 của `/track`, p95 của từng route trong một câu, rồi request mỗi giây trung bình của một pod theo route.

## Tóm tắt

- p95 từ histogram: `histogram_quantile(0.95, sum by (le) (rate(…_bucket[5m])))`.
- Luôn giữ `le` khi gộp; mẫu thiếu `le` bị bỏ qua lặng lẽ.
- Nội suy tuyến tính trong ngăn; sai số tới cỡ độ rộng ngăn.
- Histogram gộp được giữa các pod; summary thì không.

# EN

## Opening

The `/track` API runs on two pods, and each pod sends its own response-time histogram. The on-call team wants one number: `/track`'s p95. This lesson computes it with `histogram_quantile` on the PromQL simulation.

## Key idea

A classic histogram sends three kinds of series: `_bucket{le="…"}` (cumulative counters per bucket), `_sum` and `_count`. For a p95 over 5 minutes: take each bucket's `rate()` (observations per second landing in it), add the pods with `sum by (le)` (`le` must be kept, plus any label to split by such as `route`), then `histogram_quantile(0.95, …)`. That is exactly the pattern the Prometheus docs recommend; adding buckets before computing the quantile is what a histogram can do and a summary cannot.

`histogram_quantile` per the docs and source: rank = q × the observations (the `+Inf` bucket), find the first bucket that reaches the rank, interpolate linearly inside it with 0 as the lowest bucket's lower bound; if the rank falls in the `+Inf` bucket, return the bound of the bucket below; with no `+Inf` bucket the result is NaN; samples missing `le` are ignored. `avg by` and `sum by` combine the remaining series. BoonData's simulation (simulated, not Prometheus) follows those rules, with the virtual clock at 10:00:00. The figure at the end of this section walks through the p95 query.

## Syntax

```promql
histogram_quantile(0.95,
  sum by (le) (rate(
    request_seconds_bucket[5m]
  )))
```

- `rate` each bucket first; `sum by (le, …)` keeps `le`.
- Rank in `+Inf` → the bound of the bucket below; no `+Inf` → NaN.
- `avg by (route)`, `sum by (route)` combine the rest.

## Example

Pod `a`'s buckets on `/track` at 10:00, cumulative by `le`.

```sql
SELECT labels->>'le' AS le, value
FROM samples
WHERE metric LIKE '%_bucket'
  AND labels @> '{"route": "/track",
    "pod": "a"}'
  AND ts = '2026-10-31 10:00'
ORDER BY value, le;
```

`_count` equals the `+Inf` bucket of the same pod.

```sql
SELECT labels->>'pod' AS pod, value
FROM samples
WHERE metric LIKE '%_count'
  AND labels->>'route' = '/track'
  AND ts = '2026-10-31 10:00'
ORDER BY pod;
```

The `/track` p95 query (shown only; run it in step 2).

```promql
histogram_quantile(0.95,
  sum by (le) (rate(
    request_seconds_bucket{
      route="/track"}[5m])))
```

## Common mistakes

Combining buckets without `le`: every sample loses `le`, the result is empty.

```promql
# WRONG: le is gone, nothing left
histogram_quantile(0.95,
  sum by (route) (rate(
    request_seconds_bucket[5m]
  )))
```

```promql
# FIX: keep le
histogram_quantile(0.95,
  sum by (route, le) (rate(
    request_seconds_bucket[5m]
  )))
```

Forgetting `rate`: `sum` does not take a range vector.

```promql
# ERROR promql: rate is missing
histogram_quantile(0.95,
  sum by (le) (
    request_seconds_bucket[5m]
  ))
```

## Practice

Four PromQL steps on the simulation: requests per second by route, the `/track` p95, each route's p95 in one query, then the average requests per second of one pod by route.

## Recap

- p95 from a histogram: `histogram_quantile(0.95, sum by (le) (rate(…_bucket[5m])))`.
- Always keep `le` when combining; samples missing `le` are silently ignored.
- Linear interpolation inside the bucket; the error is up to the bucket's width.
- Histograms combine across pods; summaries do not.
