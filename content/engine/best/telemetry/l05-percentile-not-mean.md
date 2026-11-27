---
id: e-bp-l05
engine: best
track: telemetry
level: L2
module: l
title: "Độ trễ đo bằng phân vị, không bằng trung bình"
title_en: "Measure latency with percentiles, not the mean"
kind: quiz
minutes: 3
objectives:
  - vi: "Báo độ trễ bằng p95/p99 (`percentile_disc`), để thấy phần request chậm mà trung bình che mất."
    en: "Report latency as p95/p99 (`percentile_disc`), to see the slow requests the mean hides."
avoid:
  vi: "Báo độ trễ trung bình 152 ms trong khi cứ 20 request lại có một cái chờ 2 giây."
  en: "Reporting a 152 ms average latency while one request in 20 waits 2 seconds."
requires: [e-tm-l2-02]
skills: []
adv: []
sources:
  - https://prometheus.io/docs/practices/histograms/
  - https://www.postgresql.org/docs/18/functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE requests (id int, ms int);
    INSERT INTO requests SELECT i, CASE WHEN i % 20 = 0 THEN 2000 ELSE 40 + i % 30 END FROM generate_series(1, 200) AS i;
  bad: |
    SELECT round(avg(ms)) AS latency_ms
    FROM requests
  good: |
    SELECT percentile_disc(0.99)
      WITHIN GROUP (ORDER BY ms) AS latency_ms
    FROM requests
  expect: null
quiz:
  - q:
      vi: "200 request: 190 cái mất 40–69 ms, 10 cái mất 2 000 ms. Con số nào cho biết khách chậm nhất gặp gì?"
      en: "200 requests: 190 take 40–69 ms, 10 take 2,000 ms. Which number tells you what the slowest customers see?"
    options:
      - { vi: "Trung bình, khoảng 152 ms", en: "The mean, about 152 ms" }
      - { vi: "Phân vị 99 (p99), 2 000 ms", en: "The 99th percentile (p99), 2,000 ms" }
      - { vi: "Trung vị (p50), khoảng 55 ms", en: "The median (p50), about 55 ms" }
    answer: 1
    why:
      vi: "Trung bình 152 ms là con số không request nào thật sự mất: 190 cái nhanh hơn nhiều, 10 cái chậm hơn mười lần. Trung vị chỉ nói về request ở giữa, bỏ qua phần chậm. p99 là mức mà 99 % request nằm dưới: ở đây 10 request (5 %) mất 2 000 ms, nên p99 bằng 2 000 ms, đúng điều khách chậm nhất gặp. Vì thế mục tiêu dịch vụ (SLO) thường đặt trên p95 hoặc p99."
      en: "The 152 ms mean is a time no request actually took: 190 are much faster, 10 are ten times slower. The median only describes the middle request and ignores the slow part. p99 is the level under which 99 % of requests fall: here 10 requests (5 %) take 2,000 ms, so p99 is 2,000 ms, exactly what the slowest customers see. That is why service objectives (SLOs) are usually set on p95 or p99."
---

## Ý chính

Độ trễ báo bằng phân vị (p95, p99), không bằng trung bình. Trong SQL: `percentile_disc(0.99) WITHIN GROUP (ORDER BY ms)`; trên Prometheus: `histogram_quantile` trên bucket.

## Vì sao

- Phân bố độ trễ thường lệch: đa số nhanh, một ít rất chậm. Trung bình trộn hai nhóm thành một con số không ai gặp.
- Phần chậm thường là điều khách phàn nàn; p99 cho biết mức mà chỉ 1 % request vượt qua.
- Đặt mục tiêu dịch vụ (SLO) trên phân vị, ví dụ "99 % request dưới 300 ms", để kiểm được bằng số liệu.
- Bản Không nên trả `152` ms. Bản Nên trả `2000` ms: cứ 20 request có một request chờ 2 giây.

# EN

## Key idea

Report latency as percentiles (p95, p99), not the mean. In SQL: `percentile_disc(0.99) WITHIN GROUP (ORDER BY ms)`; in Prometheus: `histogram_quantile` over buckets.

## Why

- Latency distributions are usually skewed: most requests are fast, a few are very slow. The mean blends both groups into a number nobody experiences.
- The slow part is usually what customers complain about; p99 gives the level that only 1 % of requests exceed.
- Set service objectives (SLOs) on percentiles, for example "99 % of requests under 300 ms", so they can be checked against data.
- The Avoid version returns `152` ms. The Prefer version returns `2000` ms: one request in 20 waits 2 seconds.
