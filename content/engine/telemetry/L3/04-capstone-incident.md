---
id: e-tm-l3-04
engine: telemetry
level: L3
module: promql
title: "Tổng hợp: sự cố ở API theo dõi container"
title_en: "Capstone: an incident at the tracking API"
kind: capstone
runtime: browser
minutes: 40
figures: [{ name: tm-incident-trace, at: idea }]
objectives:
  - vi: Đi đúng thứ tự metrics → log → trace để khoanh vùng một sự cố.
    en: Go in the right order, metrics → logs → traces, to narrow an incident down.
  - vi: Tìm endpoint chậm từ metrics, lý do từ log, và bước chậm từ trace.
    en: Find the slow endpoint from the metrics, the reason from the logs, and the slow step from a trace.
  - vi: Kết luận bằng con số, không bằng cảm giác.
    en: Conclude with numbers, not with a hunch.
requires: [e-tm-l2-04, e-tm-l2-03, e-tm-l2-02]
sources:
  - { url: "https://opentelemetry.io/docs/concepts/signals/", title: "OpenTelemetry: Signals" }
  - { url: "https://opentelemetry.io/docs/concepts/signals/logs/", title: "OpenTelemetry: Logs (TraceId, SpanId)" }
  - { url: "https://prometheus.io/docs/practices/histograms/", title: "Prometheus: Histograms and summaries" }
lab:
  setup: |
    CREATE TABLE metrics (
      ts timestamp, name text,
      labels jsonb, value float8
    );
    INSERT INTO metrics
    SELECT timestamp '2026-10-31 10:00'
        + (i - 1) * interval '1 minute',
      'http_p95_ms', jsonb_build_object('route', r), v
    FROM (VALUES
        ('/track', ARRAY[120, 130, 125, 118, 122,
          640, 820, 910, 880, 860]),
        ('/quote', ARRAY[90, 92, 95, 91, 93,
          94, 92, 96, 95, 93]),
        ('/book', ARRAY[150, 155, 160, 152, 158,
          157, 160, 159, 154, 156])) AS t(r, a),
      unnest(a) WITH ORDINALITY AS u(v, i);
    INSERT INTO metrics VALUES
      ('2026-10-31 10:04', 'http_requests_total', '{"route": "/track"}', 5000),
      ('2026-10-31 10:09', 'http_requests_total', '{"route": "/track"}', 6200),
      ('2026-10-31 10:04', 'http_errors_total', '{"route": "/track"}', 10),
      ('2026-10-31 10:09', 'http_errors_total', '{"route": "/track"}', 130),
      ('2026-10-31 10:04', 'http_requests_total', '{"route": "/quote"}', 2000),
      ('2026-10-31 10:09', 'http_requests_total', '{"route": "/quote"}', 2400),
      ('2026-10-31 10:04', 'http_errors_total', '{"route": "/quote"}', 4),
      ('2026-10-31 10:09', 'http_errors_total', '{"route": "/quote"}', 5),
      ('2026-10-31 10:04', 'http_requests_total', '{"route": "/book"}', 800),
      ('2026-10-31 10:09', 'http_requests_total', '{"route": "/book"}', 950),
      ('2026-10-31 10:04', 'http_errors_total', '{"route": "/book"}', 1),
      ('2026-10-31 10:09', 'http_errors_total', '{"route": "/book"}', 2);
    CREATE TABLE logs (
      ts timestamp(3), trace_id text, body jsonb
    );
    INSERT INTO logs VALUES
      ('2026-10-31 10:03:10', 'x1', '{"level": "info", "route": "/track", "msg": "ok"}'),
      ('2026-10-31 10:05:20', 'x4', '{"level": "error", "route": "/track", "msg": "carrier API timeout"}'),
      ('2026-10-31 10:06:01.900', 'x2', '{"level": "error", "route": "/track", "msg": "carrier API timeout"}'),
      ('2026-10-31 10:06:30', 'x5', '{"level": "error", "route": "/track", "msg": "carrier API timeout"}'),
      ('2026-10-31 10:07:00.900', 'x3', '{"level": "warn", "route": "/track", "msg": "carrier API slow"}'),
      ('2026-10-31 10:07:40', 'x6', '{"level": "error", "route": "/track", "msg": "carrier API timeout"}'),
      ('2026-10-31 10:08:05', 'x7', '{"level": "error", "route": "/track", "msg": "db slow"}'),
      ('2026-10-31 10:08:50', 'x8', '{"level": "error", "route": "/track", "msg": "carrier API timeout"}'),
      ('2026-10-31 10:06:10', 'q1', '{"level": "error", "route": "/quote", "msg": "rate missing"}'),
      ('2026-10-31 10:09:00', 'x9', '{"level": "error", "route": "/track", "msg": "carrier API timeout"}');
    CREATE TABLE spans (
      trace_id text, span_id text PRIMARY KEY,
      parent_id text, name text,
      start_ts timestamp(3), dur_ms int
    );
    INSERT INTO spans VALUES
      ('x1', 'a1', NULL, 'GET /track', '2026-10-31 10:03:10', 130),
      ('x1', 'a2', 'a1', 'call carrier API', '2026-10-31 10:03:10.020', 90),
      ('x2', 'b1', NULL, 'GET /track', '2026-10-31 10:06:00', 1900),
      ('x2', 'b2', 'b1', 'db: shipments', '2026-10-31 10:06:00.010', 110),
      ('x2', 'b3', 'b1', 'call carrier API', '2026-10-31 10:06:00.130', 1750),
      ('x2', 'b4', 'b3', 'http POST carrier/track', '2026-10-31 10:06:00.140', 1720),
      ('x3', 'c1', NULL, 'GET /track', '2026-10-31 10:07:00', 900),
      ('x3', 'c2', 'c1', 'call carrier API', '2026-10-31 10:07:00.050', 820),
      ('q1', 'd1', NULL, 'GET /quote', '2026-10-31 10:06:10', 95);
  steps:
    - name: { vi: "Metrics", en: "Metrics" }
      task:
        vi: "Route nào có p95 nhảy nhiều nhất: đỉnh `http_p95_ms` từ 10:05 trừ đỉnh trước 10:05? Trả `route`, `jump`, một dòng."
        en: "Which route's p95 jumped the most: the peak of `http_p95_ms` from 10:05 minus the peak before 10:05? Return `route`, `jump`, one row."
      solution: |
        SELECT labels->>'route' AS route,
          max(value) FILTER (WHERE ts >= '2026-10-31 10:05')
          - max(value) FILTER (WHERE ts < '2026-10-31 10:05')
            AS jump
        FROM metrics
        WHERE name = 'http_p95_ms'
        GROUP BY 1
        ORDER BY jump DESC
        LIMIT 1
      check: rows
      ordered: true
      hint:
        vi: "Hai `max(value) FILTER (WHERE ts …)`, một sau và một trước 10:05, trừ nhau; `ORDER BY jump DESC LIMIT 1`."
        en: "Two `max(value) FILTER (WHERE ts …)`, one after and one before 10:05, subtracted; `ORDER BY jump DESC LIMIT 1`."
    - name: { vi: "Tỉ lệ lỗi", en: "Error ratio" }
      task:
        vi: "Từ hai counter lúc 10:04 và 10:09: tỉ lệ lỗi của mỗi route trong 5 phút đó (lỗi mới / request mới). Trả `route`, `error_ratio`."
        en: "From the two counters at 10:04 and 10:09: each route's error ratio over those 5 minutes (new errors / new requests). Return `route`, `error_ratio`."
      solution: |
        SELECT labels->>'route' AS route,
          (max(value) FILTER (WHERE name = 'http_errors_total')
            - min(value) FILTER (WHERE name = 'http_errors_total'))
          / (max(value) FILTER (WHERE name = 'http_requests_total')
            - min(value) FILTER (WHERE name = 'http_requests_total'))
            AS error_ratio
        FROM metrics
        WHERE name IN ('http_errors_total', 'http_requests_total')
        GROUP BY 1
      check: rows
      hint:
        vi: "Với mỗi counter, mức tăng = `max - min`, lọc tên bằng `FILTER`; chia mức tăng của lỗi cho mức tăng của request."
        en: "For each counter, increase = `max - min`, picking the name with `FILTER`; divide the errors' increase by the requests' increase."
    - name: { vi: "Log", en: "Logs" }
      task:
        vi: "Log lỗi của `/track` từ 10:05: mỗi thông báo xuất hiện bao nhiêu lần, nhiều nhất trước. Trả `msg`, `n`."
        en: "`/track` error logs from 10:05: how often each message appears, most first. Return `msg`, `n`."
      solution: |
        SELECT body->>'msg' AS msg, count(*) AS n
        FROM logs
        WHERE body @> '{"level": "error", "route": "/track"}'
          AND ts >= '2026-10-31 10:05'
        GROUP BY 1
        ORDER BY n DESC
      check: rows
      ordered: true
      hint:
        vi: "`body @> '{\"level\": \"error\", \"route\": \"/track\"}'` và `ts >= '2026-10-31 10:05'`, gom theo `body->>'msg'`."
        en: "`body @> '{\"level\": \"error\", \"route\": \"/track\"}'` and `ts >= '2026-10-31 10:05'`, grouped by `body->>'msg'`."
    - name: { vi: "Trace", en: "Trace" }
      task:
        vi: "Trace `/track` chậm nhất từ 10:05: span gốc `GET /track` dài nhất. Trả `trace_id`, `dur_ms`, một dòng."
        en: "The slowest `/track` trace from 10:05: the longest `GET /track` root span. Return `trace_id`, `dur_ms`, one row."
      solution: |
        SELECT trace_id, dur_ms
        FROM spans
        WHERE parent_id IS NULL
          AND name = 'GET /track'
          AND start_ts >= '2026-10-31 10:05'
        ORDER BY dur_ms DESC
        LIMIT 1
      check: rows
      ordered: true
      hint:
        vi: "Span gốc (`parent_id IS NULL`) tên `GET /track` bắt đầu từ 10:05, `ORDER BY dur_ms DESC LIMIT 1`."
        en: "Root spans (`parent_id IS NULL`) named `GET /track` starting from 10:05, `ORDER BY dur_ms DESC LIMIT 1`."
    - name: { vi: "Bước chậm", en: "Slow step" }
      task:
        vi: "Trong trace đó (tìm bằng truy vấn con như bước 4), span lá nào chậm nhất? Span lá là span không có con. Trả `name`, `dur_ms`."
        en: "In that trace (found with a subquery as in step 4), which leaf span is the slowest? A leaf span has no children. Return `name`, `dur_ms`."
      solution: |
        SELECT s.name, s.dur_ms
        FROM spans s
        WHERE s.trace_id = (
            SELECT trace_id FROM spans
            WHERE parent_id IS NULL
              AND name = 'GET /track'
              AND start_ts >= '2026-10-31 10:05'
            ORDER BY dur_ms DESC LIMIT 1)
          AND NOT EXISTS (SELECT 1 FROM spans c
            WHERE c.parent_id = s.span_id)
        ORDER BY s.dur_ms DESC
        LIMIT 1
      check: rows
      ordered: true
      hint:
        vi: "Truy vấn con của bước 4 cho `trace_id`; `NOT EXISTS (SELECT 1 FROM spans c WHERE c.parent_id = s.span_id)` giữ span lá."
        en: "Step 4's subquery gives the `trace_id`; `NOT EXISTS (SELECT 1 FROM spans c WHERE c.parent_id = s.span_id)` keeps the leaf spans."
quiz:
  - q:
      vi: "p95 của `/track` nhảy từ 130 lên 910 ms. Nên mở tín hiệu nào tiếp theo?"
      en: "`/track`'s p95 jumped from 130 to 910 ms. Which signal should you open next?"
    options:
      - { vi: "Mọi log của 10 phút đó", en: "Every log of those 10 minutes" }
      - { vi: "Log lỗi của `/track` từ 10:05", en: "`/track` error logs from 10:05" }
      - { vi: "Thêm nhãn `trace_id` vào metric", en: "Add a `trace_id` label to the metric" }
    answer: 1
    trap: 2
    why:
      vi: "Thêm nhãn `trace_id` nghe như nối được metric với trace, nhưng mỗi request một giá trị nhãn là cardinality bùng nổ, đúng điều bài nhãn và cardinality cấm. Đọc mọi log trong 10 phút thì lẫn cả `/quote` và log thường. Metrics đã khoanh vùng: route `/track`, từ 10:05; nên lọc log lỗi đúng route và khoảng đó, rồi dùng `trace_id` trong log để mở trace."
      en: "Adding a `trace_id` label sounds like a way to link metrics to traces, but one label value per request is a cardinality explosion, exactly what the labels and cardinality lesson forbids. Reading every log of 10 minutes mixes in `/quote` and ordinary logs. The metrics already narrowed it down: route `/track`, from 10:05; so filter the error logs of that route and window, then use the `trace_id` in the logs to open a trace."
  - q:
      vi: "Trace `x2` mất 1.900 ms; span `http POST carrier/track` mất 1.720 ms. Kết luận nào đúng nhất?"
      en: "Trace `x2` took 1,900 ms; span `http POST carrier/track` took 1,720 ms. Which conclusion fits best?"
    options:
      - { vi: "API của hãng tàu chậm, kéo `/track`", en: "The carrier's API is slow, dragging `/track`" }
      - { vi: "Cơ sở dữ liệu chậm, vì có log `db slow`", en: "The database is slow, there is a `db slow` log" }
      - { vi: "Máy chủ `/track` thiếu CPU", en: "The `/track` server lacks CPU" }
    answer: 0
    trap: 1
    why:
      vi: "Có một log `db slow` nên dễ đổ cho cơ sở dữ liệu, nhưng nó chỉ là 1 trong 7 log lỗi, còn 6 log kia là `carrier API timeout`; và trong trace `x2`, span `db: shipments` chỉ 110 ms. Span lá `http POST carrier/track` chiếm 1.720 trên 1.900 ms, nên thời gian nằm ở lời gọi sang hãng tàu. Không tín hiệu nào nói gì về CPU."
      en: "There is a `db slow` log, so it is tempting to blame the database, but it is 1 of 7 error logs, the other 6 being `carrier API timeout`; and in trace `x2` the `db: shipments` span takes only 110 ms. The leaf span `http POST carrier/track` takes 1,720 of the 1,900 ms, so the time is in the call to the carrier. No signal says anything about CPU."
---
## Mở bài

10:05 sáng 31/10, khách báo trang theo dõi container quay vòng. Bạn có metrics, log và trace của API trong 10 phút. Năm bước tới đây dẫn từ "có chuyện" tới "chậm ở đâu" bằng SQL.

## Ý chính

Một cuộc điều tra telemetry đi theo thứ tự tín hiệu. **Metrics** trả lời "có chuyện không, ở đâu, từ lúc nào": p95 theo route cho thấy route nào chậm và từ phút nào; tỉ lệ lỗi tính từ hai counter (mức tăng của lỗi chia mức tăng của request) cho thấy route nào lỗi. **Log** trả lời "vì sao": lọc log lỗi của đúng route và khoảng thời gian, đếm thông báo. **Trace** trả lời "chậm ở bước nào": mở trace chậm nhất trong khoảng đó và tìm span lá tốn thời gian.

Mỗi bước thu hẹp bước sau: không đọc mọi log, không mở mọi trace. `trace_id` trong log là cầu nối sang trace; nó không bao giờ là nhãn của metric (cardinality). Kết luận cuối phải dựa trên con số của cả ba tín hiệu, không dựa trên một dòng log đơn lẻ. Hình cuối mục vẽ đường đi của cuộc điều tra.

## Cú pháp

```sql
-- metrics: jump of a gauge
SELECT max(value) FILTER
    (WHERE ts >= '2026-10-31 10:05')
  - max(value) FILTER
    (WHERE ts < '2026-10-31 10:05')
FROM metrics
WHERE name = 'http_p95_ms';
```

- Metrics: route và thời điểm; tỉ lệ lỗi = mức tăng lỗi / mức tăng request.
- Log: `body @> '{…}'` theo route và khoảng thời gian, `count(*)` theo thông báo.
- Trace: span gốc dài nhất, rồi span lá dài nhất (`NOT EXISTS` con).

## Ví dụ

p95 của `/track` từng phút.

```sql
SELECT ts, value AS p95_ms
FROM metrics
WHERE name = 'http_p95_ms'
  AND labels->>'route' = '/track'
ORDER BY ts;
```

Các span của trace `x2`.

```sql
SELECT span_id, parent_id, name, dur_ms
FROM spans
WHERE trace_id = 'x2'
ORDER BY start_ts;
```

## Lỗi hay gặp

Đếm mọi log lỗi, không lọc route: lẫn lỗi của `/quote`.

```sql
-- WRONG: every route mixed in
SELECT body->>'msg' AS msg,
  count(*) AS n
FROM logs
WHERE body @> '{"level": "error"}'
GROUP BY 1 ORDER BY n DESC, msg;
```

```sql
-- FIX: the route the metrics named
SELECT body->>'msg' AS msg,
  count(*) AS n
FROM logs
WHERE body @> '{"level": "error",
  "route": "/track"}'
GROUP BY 1 ORDER BY n DESC, msg;
```

Tìm span chậm nhất của trace mà không loại span cha: ra chính span gốc.

```sql
-- WRONG: the root contains everything
SELECT name, dur_ms FROM spans
WHERE trace_id = 'x2'
ORDER BY dur_ms DESC LIMIT 1;
```

```sql
-- FIX: leaves only
SELECT s.name, s.dur_ms FROM spans s
WHERE s.trace_id = 'x2'
  AND NOT EXISTS (SELECT 1 FROM spans c
    WHERE c.parent_id = s.span_id)
ORDER BY s.dur_ms DESC LIMIT 1;
```

## Thực hành

Năm bước: route có p95 nhảy nhiều nhất, tỉ lệ lỗi của mỗi route từ hai counter, thông báo lỗi trong log của route đó, trace chậm nhất, rồi span lá chậm nhất trong trace.

## Tóm tắt

- Điều tra theo thứ tự: metrics (ở đâu, từ khi nào) → log (vì sao) → trace (bước nào).
- Tỉ lệ lỗi = mức tăng counter lỗi / mức tăng counter request.
- Mỗi tín hiệu thu hẹp tín hiệu sau; `trace_id` trong log nối sang trace.
- Kết luận dựa trên con số của cả ba tín hiệu, không trên một dòng log.

# EN

## Opening

10:05 on October 31, customers report the container tracking page spinning. You have the API's metrics, logs and traces for 10 minutes. The next five steps lead from "something is wrong" to "where it is slow", with SQL.

## Key idea

A telemetry investigation follows the signals in order. **Metrics** answer "is something wrong, where, since when": p95 by route shows which route is slow and from which minute; the error ratio from two counters (the errors' increase divided by the requests' increase) shows which route fails. **Logs** answer "why": filter the error logs of that route and time window and count the messages. **Traces** answer "which step is slow": open the slowest trace in that window and find the leaf span that costs the time.

Each step narrows the next: you never read every log or open every trace. The `trace_id` in the logs is the bridge to the traces; it is never a metric label (cardinality). The final conclusion must rest on numbers from all three signals, not on a single log line. The figure at the end of this section draws the investigation's path.

## Syntax

```sql
-- metrics: jump of a gauge
SELECT max(value) FILTER
    (WHERE ts >= '2026-10-31 10:05')
  - max(value) FILTER
    (WHERE ts < '2026-10-31 10:05')
FROM metrics
WHERE name = 'http_p95_ms';
```

- Metrics: the route and the time; error ratio = errors' increase / requests' increase.
- Logs: `body @> '{…}'` by route and time window, `count(*)` by message.
- Traces: the longest root span, then the longest leaf span (`NOT EXISTS` children).

## Example

`/track`'s p95 minute by minute.

```sql
SELECT ts, value AS p95_ms
FROM metrics
WHERE name = 'http_p95_ms'
  AND labels->>'route' = '/track'
ORDER BY ts;
```

The spans of trace `x2`.

```sql
SELECT span_id, parent_id, name, dur_ms
FROM spans
WHERE trace_id = 'x2'
ORDER BY start_ts;
```

## Common mistakes

Counting every error log without filtering the route: `/quote`'s errors get mixed in.

```sql
-- WRONG: every route mixed in
SELECT body->>'msg' AS msg,
  count(*) AS n
FROM logs
WHERE body @> '{"level": "error"}'
GROUP BY 1 ORDER BY n DESC, msg;
```

```sql
-- FIX: the route the metrics named
SELECT body->>'msg' AS msg,
  count(*) AS n
FROM logs
WHERE body @> '{"level": "error",
  "route": "/track"}'
GROUP BY 1 ORDER BY n DESC, msg;
```

Looking for a trace's slowest span without excluding parents: you get the root span itself.

```sql
-- WRONG: the root contains everything
SELECT name, dur_ms FROM spans
WHERE trace_id = 'x2'
ORDER BY dur_ms DESC LIMIT 1;
```

```sql
-- FIX: leaves only
SELECT s.name, s.dur_ms FROM spans s
WHERE s.trace_id = 'x2'
  AND NOT EXISTS (SELECT 1 FROM spans c
    WHERE c.parent_id = s.span_id)
ORDER BY s.dur_ms DESC LIMIT 1;
```

## Practice

Five steps: the route whose p95 jumped most, each route's error ratio from two counters, the error messages in that route's logs, the slowest trace, then the slowest leaf span in that trace.

## Recap

- Investigate in order: metrics (where, since when) → logs (why) → traces (which step).
- Error ratio = the error counter's increase / the request counter's increase.
- Each signal narrows the next; the `trace_id` in the logs leads to the trace.
- Conclude from the numbers of all three signals, not from one log line.
