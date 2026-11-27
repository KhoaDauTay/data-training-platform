---
id: e-bp-l02
engine: best
track: telemetry
level: L3
module: l
title: "histogram_quantile cần giữ nhãn le"
title_en: "histogram_quantile needs the le label"
kind: quiz
minutes: 4
objectives:
  - vi: "Cộng bucket bằng `sum by (le) (rate(…_bucket[5m]))` rồi mới gọi `histogram_quantile`."
    en: "Add buckets with `sum by (le) (rate(…_bucket[5m]))` before calling `histogram_quantile`."
avoid:
  vi: "`sum` không giữ `le`: các bucket bị cộng thành một số, và phân vị không còn gì để tính."
  en: "A `sum` that drops `le`: the buckets collapse into one number, leaving the percentile nothing to compute from."
requires: [e-tm-l3-03]
skills: []
adv: []
sources:
  - https://prometheus.io/docs/prometheus/latest/querying/functions/
  - https://prometheus.io/docs/practices/histograms/
verified: { version: "BoonData PromQL simulation (Prometheus v3.5.0 rules) on PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: promql
  check: diff
  setup: |
    CREATE TABLE samples (metric text, labels jsonb, ts timestamp, value float8);
    INSERT INTO samples SELECT 'http_request_duration_seconds_bucket', jsonb_build_object('job', 'api', 'instance', i, 'le', le), timestamp '2026-10-31 09:55' + n * interval '15 seconds', n * c FROM (VALUES ('a', '0.1', 50), ('a', '0.5', 90), ('a', '1', 98), ('a', '+Inf', 100), ('b', '0.1', 1), ('b', '0.5', 2), ('b', '1', 6), ('b', '+Inf', 10)) AS v(i, le, c), generate_series(0, 20) n;
  bad: |
    histogram_quantile(0.9,
      sum(rate(
        http_request_duration_seconds_bucket[5m])))
  good: |
    histogram_quantile(0.9,
      sum by (le) (rate(
        http_request_duration_seconds_bucket[5m])))
  expect: null
quiz:
  - q:
      vi: "Vì sao `histogram_quantile(0.9, sum(rate(x_bucket[5m])))` không trả kết quả nào?"
      en: "Why does `histogram_quantile(0.9, sum(rate(x_bucket[5m])))` return no result?"
    options:
      - { vi: "Vì `sum` bỏ mọi nhãn, kể cả `le`, nên không còn biết bucket nào ứng với ngưỡng nào", en: "Because `sum` drops every label, `le` included, so no bucket can be tied to its bound" }
      - { vi: "Vì `rate` không dùng được với histogram", en: "Because `rate` cannot be used on histograms" }
      - { vi: "Vì 0.9 phải viết là 90", en: "Because 0.9 must be written as 90" }
    answer: 0
    why:
      vi: "`rate` trên bucket là cách đúng, và phân vị viết dạng 0 đến 1, nên 0.9 không sai. Mỗi bucket là một series có nhãn `le` (ngưỡng trên, ví dụ 0.5 giây); `histogram_quantile` đọc các ngưỡng đó để biết 90 % request nằm dưới mức nào. `sum` không có `by` cộng hết mọi series thành một và bỏ luôn `le`, nên hàm không còn bucket nào để đọc. `sum by (le)` cộng các instance nhưng giữ từng ngưỡng."
      en: "`rate` on buckets is the right way, and percentiles are written from 0 to 1, so 0.9 is fine. Each bucket is a series with an `le` label (its upper bound, for example 0.5 seconds); `histogram_quantile` reads those bounds to find the level under which 90 % of requests fall. A `sum` with no `by` adds every series into one and drops `le` too, so the function has no bucket left to read. `sum by (le)` adds up the instances but keeps each bound."
---

## Ý chính

Khi cộng histogram của nhiều instance, luôn giữ nhãn `le`: `histogram_quantile(0.9, sum by (le) (rate(x_bucket[5m])))`. Thêm nhãn khác vào `by` nếu muốn phân vị theo từng nhóm, nhưng không bao giờ bỏ `le`.

## Vì sao

- Histogram của Prometheus là một nhóm counter, mỗi bucket một series với nhãn `le` là ngưỡng trên của nó.
- `histogram_quantile` nội suy giữa các ngưỡng đó. Không có `le`, hàm không biết ngưỡng nào, nên không trả gì.
- `sum by (le)` cộng các instance theo từng ngưỡng: kết quả vẫn là một histogram hợp lệ.
- Bản Không nên trả 0 dòng. Bản Nên trả khoảng `0.79` giây cho phân vị 90 (p90) của cả hai instance, tính trên bộ mô phỏng PromQL.

# EN

## Key idea

When you add up histograms from several instances, always keep the `le` label: `histogram_quantile(0.9, sum by (le) (rate(x_bucket[5m])))`. Add other labels to `by` for one percentile per group, but never drop `le`.

## Why

- A Prometheus histogram is a set of counters, one series per bucket, whose `le` label is its upper bound.
- `histogram_quantile` interpolates between those bounds. Without `le` it knows no bound, so it returns nothing.
- `sum by (le)` adds the instances bound by bound: the result is still a valid histogram.
- The Avoid version returns 0 rows. The Prefer version returns about `0.79` seconds for the 90th percentile (p90) of both instances, computed by the PromQL simulation.
