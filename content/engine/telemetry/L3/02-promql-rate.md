---
id: e-tm-l3-02
engine: telemetry
level: L3
module: promql
title: "PromQL: rate, increase và sum by"
title_en: "PromQL: rate, increase and sum by"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: tm-rate-extrapolation, at: idea }]
objectives:
  - vi: Tính tốc độ mỗi giây của counter bằng `rate()` và mức tăng bằng `increase()`.
    en: Compute a counter's per-second speed with `rate()` and its increase with `increase()`.
  - vi: Biết `rate()` tự xử lý reset và ngoại suy tới hai đầu khoảng.
    en: Know that `rate()` handles resets and extrapolates to both ends of the range.
  - vi: Lấy `rate()` trước rồi mới `sum by (…)`.
    en: Take `rate()` first, then `sum by (…)`.
requires: [e-tm-l3-01, e-tm-l2-01]
sources:
  - { url: "https://prometheus.io/docs/prometheus/latest/querying/functions/", title: "Prometheus: Query functions (rate, increase)", title_vi: "Prometheus: histogram_quantile()" }
  - { url: "https://prometheus.io/docs/prometheus/latest/querying/operators/", title: "Prometheus: Operators (aggregation)", title_vi: "Prometheus: toán tử (gộp nhóm)" }
  - { url: "https://github.com/prometheus/prometheus/blob/v3.5.0/promql/functions.go", title: "Prometheus v3.5.0 source: extrapolatedRate", title_vi: "Mã nguồn Prometheus v3.5.0: extrapolatedRate" }
lab:
  setup: |
    CREATE TABLE samples (
      metric text, labels jsonb,
      ts timestamp, value float8
    );
    INSERT INTO samples
    SELECT 'http_requests_total',
      jsonb_build_object('job', 'api',
        'route', r, 'code', c),
      timestamp '2026-10-31 09:55'
        + n * interval '15 seconds',
      CASE WHEN r = '/track' AND c = '200'
        THEN CASE WHEN n < 12 THEN 500 + n * 30
          ELSE (n - 12) * 30 END
        ELSE n * k END
    FROM (VALUES ('/track', '200', 30),
        ('/track', '500', 3), ('/quote', '200', 12),
        ('/quote', '500', 1), ('/book', '200', 6),
        ('/book', '500', 0)) AS v(r, c, k),
      generate_series(0, 20) n;
  steps:
    - task:
        vi: "Request mỗi giây của các series `/track`, tính trên 1 phút cuối."
        en: "Requests per second of the `/track` series, over the last minute."
      solution: 'rate(http_requests_total{route="/track"}[1m])'
      lang: promql
      check: rows
      hint:
        vi: "`rate(…[1m])` quanh một range vector: `rate(http_requests_total{route=\"/track\"}[1m])`."
        en: "`rate(…[1m])` around a range vector: `rate(http_requests_total{route=\"/track\"}[1m])`."
    - task:
        vi: "Số request thành công của `/track` trong 5 phút cuối, dù dịch vụ đã khởi động lại lúc 09:58."
        en: "The successful `/track` requests in the last 5 minutes, even though the service restarted at 09:58."
      solution: 'increase(http_requests_total{route="/track", code="200"}[5m])'
      lang: promql
      check: rows
      hint:
        vi: "`increase(…[5m])` trên series `route=\"/track\", code=\"200\"`; nó tự cộng phần trước reset."
        en: "`increase(…[5m])` on the series `route=\"/track\", code=\"200\"`; it adds the part before the reset by itself."
    - task:
        vi: "Request mỗi giây theo từng route (cộng mọi mã), trên 5 phút."
        en: "Requests per second per route (every code added), over 5 minutes."
      solution: 'sum by (route) (rate(http_requests_total[5m]))'
      lang: promql
      check: rows
      hint:
        vi: "`rate` trước, `sum by (route)` sau: `sum by (route) (rate(http_requests_total[5m]))`."
        en: "`rate` first, `sum by (route)` after: `sum by (route) (rate(http_requests_total[5m]))`."
    - task:
        vi: "Tổng số lỗi mỗi giây của cả API (`code` là `500`), một con số, trên 5 phút."
        en: "The whole API's errors per second (`code` is `500`), one number, over 5 minutes."
      solution: 'sum(rate(http_requests_total{code="500"}[5m]))'
      lang: promql
      check: rows
      hint:
        vi: "`sum(…)` không `by` gộp mọi series thành một: `sum(rate(http_requests_total{code=\"500\"}[5m]))`."
        en: "`sum(…)` without `by` adds every series into one: `sum(rate(http_requests_total{code=\"500\"}[5m]))`."
quiz:
  - q:
      vi: "Vì sao không viết `rate(sum(http_requests_total)[5m])` mà phải `sum(rate(…[5m]))`?"
      en: "Why not write `rate(sum(http_requests_total)[5m])` instead of `sum(rate(…[5m]))`?"
    options:
      - { vi: "Hai cách cho cùng một số", en: "Both give the same number" }
      - { vi: "Cộng trước thì mất dấu reset", en: "Summing first hides the resets" }
      - { vi: "`sum` không chạy trên counter", en: "`sum` does not work on counters" }
    answer: 1
    trap: 0
    why:
      vi: "Trông như phép cộng đổi chỗ được, nhưng tài liệu Prometheus dặn luôn lấy `rate()` trước rồi mới gộp, vì nếu không `rate()` không nhận ra counter reset khi một target khởi động lại. Ở lab, series `/track` 200 rơi từ 830 về 0 lúc 09:58; cộng với các series khác thì tổng chỉ giảm một chút, nên lần reset bị che và rate sai. `sum` vẫn chạy trên counter; chỉ là thứ tự sai."
      en: "It looks like addition you could reorder, but the Prometheus docs say to always take `rate()` first and aggregate after, otherwise `rate()` cannot detect counter resets when a target restarts. In the lab, the `/track` 200 series drops from 830 to 0 at 09:58; added to the other series, the total only dips a little, so the reset is hidden and the rate is wrong. `sum` does run on counters; only the order is wrong."
  - q:
      vi: "Series `/track` 500 có 4 mẫu trong `[1m]`: 51, 54, 57, 60, từ 09:59:15. `increase(…[1m])` ra bao nhiêu?"
      en: "The `/track` 500 series has 4 samples in `[1m]`: 51, 54, 57, 60, from 09:59:15. What does `increase(…[1m])` give?"
    options:
      - { vi: "9, mẫu cuối trừ mẫu đầu", en: "9, last sample minus first" }
      - { vi: "60, giá trị mới nhất", en: "60, the newest value" }
      - { vi: "12, ngoại suy thêm 15 giây", en: "12, extrapolated 15 seconds" }
    answer: 2
    trap: 0
    why:
      vi: "60 - 51 = 9 là mức tăng giữa hai mẫu đầu và cuối, cách nhau 45 giây. `increase()` ngoại suy tới hai đầu khoảng 60 giây: mẫu đầu cách mép trái 15 giây, nhỏ hơn 1,1 × khoảng trung bình (16,5 giây), nên kéo dài đủ 15 giây: 9 × 60/45 = 12. 60 là giá trị counter, không phải mức tăng. Tài liệu nói vì vậy `increase()` có thể ra số không nguyên dù counter chỉ tăng từng đơn vị."
      en: "60 - 51 = 9 is the increase between the first and last sample, 45 seconds apart. `increase()` extrapolates to both ends of the 60-second range: the first sample is 15 seconds from the left edge, less than 1.1 × the average interval (16.5 seconds), so it stretches the full 15 seconds: 9 × 60/45 = 12. 60 is the counter's value, not an increase. The docs note that this is why `increase()` can return a non-integer even when a counter only grows by whole steps."
---
## Mở bài

Bài rate bằng SQL đã tự xử lý lần dịch vụ khởi động lại. PromQL làm việc đó trong một hàm: `rate()`. Bài này chạy `rate`, `increase` và `sum by` trên bản mô phỏng và so con số với cách tính bằng tay.

## Ý chính

`rate(v[5m])` tính tốc độ tăng trung bình mỗi giây của từng series trong khoảng; `increase(v[5m])` là mức tăng trong khoảng. Theo tài liệu Prometheus, cả hai tự điều chỉnh khi counter reset (mọi lần giảm là reset) và **ngoại suy** tới hai đầu khoảng: nếu mẫu đầu hay cuối cách mép khoảng ít hơn 1,1 lần khoảng cách trung bình giữa các mẫu, hàm kéo dài tới mép; nếu xa hơn, chỉ kéo thêm nửa khoảng cách. Với counter, phần kéo về đầu không được vượt quá điểm mà counter về 0. Kết quả là `increase` có thể ra số lẻ, và `rate` = `increase` / số giây của khoảng. Cả hai bỏ tên metric khỏi kết quả.

Gộp series bằng `sum by (route) (…)` hay `avg by (…)`; tài liệu dặn luôn lấy `rate()` trước rồi mới gộp, kẻo `rate()` không thấy reset. Bản mô phỏng của BoonData (mô phỏng, không phải Prometheus) theo đúng các luật này, đối chiếu với mã nguồn Prometheus v3.5.0; đồng hồ ảo dừng ở 10:00:00. Hình cuối mục vẽ phần ngoại suy.

## Cú pháp

```promql
rate(http_requests_total[5m])
increase(http_requests_total[5m])
sum by (route) (rate(
  http_requests_total[5m]))
```

- `rate` và `increase` cần range vector; kết quả mất tên metric.
- Reset: lần giảm giữa hai mẫu liên tiếp, tự cộng phần trước reset.
- Gộp: `sum`/`avg by (route) (…)` hoặc `sum(…) by (route)`; `rate` trước, gộp sau.

## Ví dụ

Series `/track` 200 quanh lần khởi động lại lúc 09:58.

```sql
SELECT ts, value
FROM samples
WHERE labels->>'route' = '/track'
  AND labels->>'code' = '200'
  AND ts BETWEEN '2026-10-31 09:57:30'
    AND '2026-10-31 09:58:30'
ORDER BY ts;
```

Mức tăng có xử lý reset bằng SQL, chưa ngoại suy, trong (09:55, 10:00].

```sql
SELECT sum(CASE WHEN d < 0 THEN v
    ELSE d END) AS increase_raw
FROM (
  SELECT value AS v, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM samples
  WHERE labels->>'route' = '/track'
    AND labels->>'code' = '200'
    AND ts > '2026-10-31 09:55') t;
```

PromQL của cùng con số, có ngoại suy (chỉ hiển thị; chạy ở bước 2).

```promql
increase(http_requests_total{
  route="/track", code="200"}[5m])
```

## Lỗi hay gặp

`rate` cần range vector, không nhận kết quả của `sum`.

```promql
# ERROR promql: rate() needs a range
rate(sum(http_requests_total))
```

Cộng giá trị counter thô: ra tổng từ lúc khởi động, không phải tốc độ.

```promql
# WRONG: raw counter values
sum by (route) (http_requests_total)
```

```promql
# FIX: rate first, then sum
sum by (route) (rate(
  http_requests_total[5m]))
```

## Thực hành

Bốn bước PromQL trên bản mô phỏng: `rate` của `/track` trên 1 phút, `increase` qua lần khởi động lại, `sum by (route)` các rate, rồi tổng lỗi mỗi giây của cả API.

## Tóm tắt

- `rate(v[5m])`: tốc độ mỗi giây; `increase(v[5m])`: mức tăng trong khoảng.
- Cả hai tự xử lý reset và ngoại suy tới hai đầu khoảng, nên có thể ra số lẻ.
- `rate()` trước, `sum by (…)` sau.
- SQL với `lag()` cho mức tăng thô; PromQL thêm phần ngoại suy.

# EN

## Opening

The SQL rate lesson handled the service restart by hand. PromQL does it in one function: `rate()`. This lesson runs `rate`, `increase` and `sum by` on the simulation and checks the numbers against a hand calculation.

## Key idea

`rate(v[5m])` computes each series' average per-second increase over the range; `increase(v[5m])` is the increase over the range. According to the Prometheus docs, both adjust for counter resets (any decrease is a reset) and **extrapolate** to both ends of the range: if the first or last sample is less than 1.1 times the average sample interval from the range's edge, the function stretches to the edge; if further, it adds only half an interval. For a counter, the stretch toward the start never goes past the point where the counter would reach 0. So `increase` can return a fraction, and `rate` = `increase` / the range's seconds. Both drop the metric name from the result.

Series are combined with `sum by (route) (…)` or `avg by (…)`; the docs say to always take `rate()` first and aggregate after, or `rate()` cannot see resets. BoonData's simulation (simulated, not Prometheus) follows these rules, checked against the Prometheus v3.5.0 source; the virtual clock stands at 10:00:00. The figure at the end of this section draws the extrapolation.

## Syntax

```promql
rate(http_requests_total[5m])
increase(http_requests_total[5m])
sum by (route) (rate(
  http_requests_total[5m]))
```

- `rate` and `increase` need a range vector; the result loses the metric name.
- Reset: a decrease between two consecutive samples; the part before the reset is added back.
- Combining: `sum`/`avg by (route) (…)` or `sum(…) by (route)`; `rate` first, aggregate after.

## Example

The `/track` 200 series around the restart at 09:58.

```sql
SELECT ts, value
FROM samples
WHERE labels->>'route' = '/track'
  AND labels->>'code' = '200'
  AND ts BETWEEN '2026-10-31 09:57:30'
    AND '2026-10-31 09:58:30'
ORDER BY ts;
```

The reset-aware increase in SQL, not extrapolated, over (09:55, 10:00].

```sql
SELECT sum(CASE WHEN d < 0 THEN v
    ELSE d END) AS increase_raw
FROM (
  SELECT value AS v, value - lag(value)
    OVER (ORDER BY ts) AS d
  FROM samples
  WHERE labels->>'route' = '/track'
    AND labels->>'code' = '200'
    AND ts > '2026-10-31 09:55') t;
```

The PromQL of the same number, extrapolated (shown only; run it in step 2).

```promql
increase(http_requests_total{
  route="/track", code="200"}[5m])
```

## Common mistakes

`rate` needs a range vector; it does not take the result of `sum`.

```promql
# ERROR promql: rate() needs a range
rate(sum(http_requests_total))
```

Summing raw counter values: it gives totals since start-up, not a speed.

```promql
# WRONG: raw counter values
sum by (route) (http_requests_total)
```

```promql
# FIX: rate first, then sum
sum by (route) (rate(
  http_requests_total[5m]))
```

## Practice

Four PromQL steps on the simulation: `rate` of `/track` over 1 minute, `increase` across the restart, `sum by (route)` of the rates, then the whole API's errors per second.

## Recap

- `rate(v[5m])`: per-second speed; `increase(v[5m])`: the increase over the range.
- Both handle resets and extrapolate to both ends of the range, so they can return fractions.
- `rate()` first, `sum by (…)` after.
- SQL with `lag()` gives the raw increase; PromQL adds the extrapolation.
