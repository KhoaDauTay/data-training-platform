---
id: e-bp-l01
engine: best
track: telemetry
level: L3
module: l
title: "Đọc counter bằng rate(), không đọc giá trị thô"
title_en: "Read counters with rate(), not their raw value"
kind: quiz
minutes: 4
objectives:
  - vi: "Bọc counter trong `rate(…[5m])` để có tốc độ mỗi giây, đúng cả khi dịch vụ khởi động lại."
    en: "Wrap a counter in `rate(…[5m])` to get a per-second speed that stays right across restarts."
avoid:
  vi: "Vẽ giá trị thô của counter: con số chỉ tăng, rơi về 0 mỗi lần khởi động lại, và không nói gì về tải hiện tại."
  en: "Charting a counter's raw value: it only grows, drops to 0 on every restart, and says nothing about the current load."
requires: [e-tm-l3-02]
skills: []
adv: []
sources:
  - https://prometheus.io/docs/prometheus/latest/querying/functions/
  - https://prometheus.io/docs/concepts/metric_types/
verified: { version: "BoonData PromQL simulation (Prometheus v3.5.0 rules) on PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: promql
  check: diff
  setup: |
    CREATE TABLE samples (metric text, labels jsonb, ts timestamp, value float8);
    INSERT INTO samples SELECT 'http_requests_total', jsonb_build_object('job', 'api', 'route', '/track'), timestamp '2026-10-31 09:55' + n * interval '15 seconds', CASE WHEN n < 12 THEN 500 + n * 30 ELSE (n - 12) * 30 END FROM generate_series(0, 20) n;
  bad: |
    http_requests_total{route="/track"}
  good: |
    rate(http_requests_total{route="/track"}[5m])
  expect: null
quiz:
  - q:
      vi: "Counter `http_requests_total` của `/track` lên 830 thì dịch vụ khởi động lại, về 0 và đếm tiếp tới 240. Vì sao `rate(…[5m])` vẫn ra tốc độ đúng?"
      en: "The `/track` counter `http_requests_total` reached 830, then the service restarted, went back to 0 and counted up to 240. Why does `rate(…[5m])` still give the right speed?"
    options:
      - { vi: "Vì `rate` coi mỗi lần giá trị giảm là một lần reset và cộng phần đã đếm trước đó", en: "Because `rate` treats every drop in value as a reset and adds back what was counted before it" }
      - { vi: "Vì `rate` chỉ đọc mẫu mới nhất", en: "Because `rate` reads only the newest sample" }
      - { vi: "Vì Prometheus lưu counter dưới dạng gauge", en: "Because Prometheus stores counters as gauges" }
    answer: 0
    why:
      vi: "Một mẫu mới nhất không cho biết tốc độ, vì cần ít nhất hai mẫu trong khoảng; và counter vẫn là counter, Prometheus không đổi nó thành gauge. Counter chỉ được phép tăng, nên khi giá trị tụt từ 830 về 0, `rate` hiểu là reset và cộng phần đã đếm trước đó vào, rồi chia cho số giây của khoảng. Giá trị thô 240 chỉ là số đếm từ lần khởi động gần nhất, không phải tải hiện tại."
      en: "The newest sample alone gives no speed, since at least two samples in the range are needed; and a counter stays a counter, Prometheus does not turn it into a gauge. A counter may only go up, so when the value falls from 830 to 0, `rate` reads it as a reset, adds back what was counted before, then divides by the range's seconds. The raw value 240 is only the count since the last start, not the current load."
---

## Ý chính

Counter (bộ đếm chỉ tăng) như `http_requests_total` luôn đọc qua `rate(…[5m])` hoặc `increase(…[5m])`. Giá trị thô của nó gần như không bao giờ là câu trả lời.

## Vì sao

- Counter tăng mãi từ lúc tiến trình khởi động. Con số thô phụ thuộc lần khởi động gần nhất, không phản ánh tải hiện tại.
- Khi tiến trình khởi động lại, counter về 0. `rate` nhận ra lần giảm đó là reset và bù lại, nên tốc độ không bị tụt hay âm.
- `rate` cần ít nhất hai mẫu trong khoảng; chọn khoảng dài ít nhất vài lần chu kỳ thu thập (scrape).
- Bản Không nên trả `240`, số đếm từ lần khởi động lại. Bản Nên trả khoảng `1.89` request mỗi giây trên 5 phút. Kết quả chạy trên bộ mô phỏng PromQL của BoonData, không phải Prometheus.

# EN

## Key idea

Always read a counter (a value that only goes up) such as `http_requests_total` through `rate(…[5m])` or `increase(…[5m])`. Its raw value is almost never the answer.

## Why

- A counter grows from the moment the process starts. The raw number depends on the last start, not on the current load.
- When the process restarts, the counter goes back to 0. `rate` recognises that drop as a reset and makes up for it, so the speed neither dips nor turns negative.
- `rate` needs at least two samples in the range; pick a range of at least a few scrape intervals.
- The Avoid version returns `240`, the count since the restart. The Prefer version returns about `1.89` requests per second over 5 minutes. The result comes from BoonData's PromQL simulation, not Prometheus.
