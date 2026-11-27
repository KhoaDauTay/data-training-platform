---
id: e-bp-l03
engine: best
track: telemetry
level: L3
module: l
title: "Không lấy trung bình các phân vị"
title_en: "Never average percentiles"
kind: quiz
minutes: 4
objectives:
  - vi: "Tính phân vị chung bằng cách cộng bucket của mọi instance trước, rồi mới gọi `histogram_quantile` một lần."
    en: "Compute an overall percentile by adding every instance's buckets first, then calling `histogram_quantile` once."
avoid:
  vi: "`avg` các p90 của từng instance: instance ít request kéo con số lệch, và kết quả không phải p90 của ai cả."
  en: "`avg` of each instance's p90: an instance with few requests pulls the number off, and the result is nobody's p90."
requires: [e-tm-l3-03]
skills: []
adv: []
sources:
  - https://prometheus.io/docs/practices/histograms/
verified: { version: "BoonData PromQL simulation (Prometheus v3.5.0 rules) on PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: promql
  check: diff
  setup: |
    CREATE TABLE samples (metric text, labels jsonb, ts timestamp, value float8);
    INSERT INTO samples SELECT 'http_request_duration_seconds_bucket', jsonb_build_object('job', 'api', 'instance', i, 'le', le), timestamp '2026-10-31 09:55' + n * interval '15 seconds', n * c FROM (VALUES ('a', '0.1', 50), ('a', '0.5', 90), ('a', '1', 98), ('a', '+Inf', 100), ('b', '0.1', 1), ('b', '0.5', 2), ('b', '1', 6), ('b', '+Inf', 10)) AS v(i, le, c), generate_series(0, 20) n;
  bad: |
    avg(histogram_quantile(0.9,
      sum by (le, instance) (rate(
        http_request_duration_seconds_bucket[5m]))))
  good: |
    histogram_quantile(0.9,
      sum by (le) (rate(
        http_request_duration_seconds_bucket[5m])))
  expect: null
quiz:
  - q:
      vi: "Instance `a` nhận 100 request mỗi chu kỳ, instance `b` chỉ 10. Vì sao trung bình hai p90 không phải p90 của cả dịch vụ?"
      en: "Instance `a` serves 100 requests per interval, instance `b` only 10. Why is the average of the two p90 values not the service's p90?"
    options:
      - { vi: "Vì trung bình cho hai instance trọng số bằng nhau, dù `b` chỉ có một phần mười số request", en: "Because the average weighs both instances equally, although `b` has a tenth of the requests" }
      - { vi: "Vì `avg` làm tròn kết quả", en: "Because `avg` rounds the result" }
      - { vi: "Thực ra hai cách luôn cho cùng một số", en: "In fact both ways always give the same number" }
    answer: 0
    why:
      vi: "`avg` không làm tròn gì, và trên dữ liệu này hai cách cho hai số khác nhau (khoảng 0.75 và 0.79). Phân vị không cộng hay chia trung bình được: p90 là mức mà 90 % request nằm dưới, và nó phụ thuộc cả phân bố lẫn số request. Lấy trung bình hai p90 cho instance 10 request nặng ngang instance 100 request. Cộng bucket trước (`sum by (le)`) gom mọi request thành một phân bố, rồi tính p90 một lần."
      en: "`avg` does not round, and on this data the two ways give different numbers (about 0.75 and 0.79). Percentiles cannot be added or averaged: p90 is the level under which 90 % of requests fall, and it depends on both the distribution and the request count. Averaging two p90 values gives the 10-request instance the same weight as the 100-request one. Adding the buckets first (`sum by (le)`) pools every request into one distribution, then p90 is computed once."
---

## Ý chính

Muốn phân vị (percentile) của cả dịch vụ, cộng bucket histogram của mọi instance trước (`sum by (le)`), rồi tính `histogram_quantile` một lần. Không tính phân vị từng instance rồi lấy trung bình.

## Vì sao

- Phân vị không cộng hay lấy trung bình được. Tài liệu Prometheus nói rõ: phân vị tính sẵn (summary) không gộp được, còn histogram thì gộp được vì bucket là counter.
- Trung bình hai p90 cho mỗi instance trọng số bằng nhau, bất kể instance đó phục vụ bao nhiêu request.
- Bucket là số đếm, nên cộng bucket là gộp mọi request lại một chỗ, đúng như khi chỉ có một máy.
- Bản Không nên trả khoảng `0.75` giây; bản Nên trả khoảng `0.79` giây, p90 thật của toàn bộ request, tính trên bộ mô phỏng PromQL.

# EN

## Key idea

For a service-wide percentile, add every instance's histogram buckets first (`sum by (le)`), then compute `histogram_quantile` once. Do not compute each instance's percentile and average them.

## Why

- Percentiles cannot be added or averaged. The Prometheus docs say so: precomputed quantiles (summaries) cannot be aggregated, while histograms can, because buckets are counters.
- Averaging two p90 values gives each instance the same weight, whatever number of requests it served.
- Buckets are counts, so adding buckets pools every request in one place, just as if there were one machine.
- The Avoid version returns about `0.75` seconds; the Prefer version about `0.79` seconds, the true p90 of all requests, computed by the PromQL simulation.
