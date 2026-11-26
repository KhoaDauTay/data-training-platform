---
id: e-tm-l1-01
engine: telemetry
level: L1
module: signals
title: "Ba tín hiệu: metrics, log và trace"
title_en: "Three signals: metrics, logs and traces"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: tm-three-signals, at: idea }]
objectives:
  - vi: Nói được mỗi tín hiệu (metrics, log, trace) trả lời câu hỏi nào về một hệ thống.
    en: Say which question each signal (metrics, logs, traces) answers about a system.
  - vi: Nối log với trace bằng `trace_id`, không bằng khoảng thời gian.
    en: Link logs to a trace with `trace_id`, not with a time window.
  - vi: Đọc số request từ một counter bằng hiệu giữa hai lần đọc.
    en: Read a request count from a counter as the difference between two readings.
requires: [e-pg-l1-01]
sources:
  - { url: "https://opentelemetry.io/docs/concepts/signals/", title: "OpenTelemetry: Signals" }
  - { url: "https://opentelemetry.io/docs/concepts/signals/traces/", title: "OpenTelemetry: Traces" }
  - { url: "https://opentelemetry.io/docs/concepts/signals/logs/", title: "OpenTelemetry: Logs" }
lab:
  setup: |
    CREATE TABLE metrics (
      ts timestamp, name text,
      labels jsonb, value float8
    );
    INSERT INTO metrics VALUES
      ('2026-10-31 10:00', 'http_requests_total', '{"route": "/track"}', 1200),
      ('2026-10-31 10:05', 'http_requests_total', '{"route": "/track"}', 1500),
      ('2026-10-31 10:00', 'http_requests_total', '{"route": "/quote"}', 300),
      ('2026-10-31 10:05', 'http_requests_total', '{"route": "/quote"}', 340);
    CREATE TABLE spans (
      trace_id text, span_id text, parent_id text,
      name text, start_ts timestamp(3), end_ts timestamp(3),
      status text
    );
    INSERT INTO spans VALUES
      ('t1', 's1', NULL, 'GET /track', '2026-10-31 10:01:00.000', '2026-10-31 10:01:00.120', 'Ok'),
      ('t2', 's2', NULL, 'GET /track', '2026-10-31 10:02:00.000', '2026-10-31 10:02:02.400', 'Error'),
      ('t2', 's3', 's2', 'db: container_events', '2026-10-31 10:02:00.050', '2026-10-31 10:02:02.350', 'Error'),
      ('t3', 's4', NULL, 'GET /quote', '2026-10-31 10:02:01.000', '2026-10-31 10:02:01.090', 'Ok');
    CREATE TABLE logs (
      ts timestamp(3), severity text,
      trace_id text, span_id text, body text
    );
    INSERT INTO logs VALUES
      ('2026-10-31 10:01:00.100', 'INFO', 't1', 's1', 'track ok'),
      ('2026-10-31 10:02:01.000', 'WARN', 't2', 's3', 'query slower than 1s'),
      ('2026-10-31 10:02:01.050', 'INFO', 't3', 's4', 'quote ok'),
      ('2026-10-31 10:02:01.500', 'INFO', NULL, NULL, 'cron: refresh rates'),
      ('2026-10-31 10:02:02.390', 'ERROR', 't2', 's2', 'timeout reading container_events');
  steps:
    - task:
        vi: "Từ metrics: mỗi route nhận bao nhiêu request từ 10:00 tới 10:05? Trả `route`, `requests`."
        en: "From the metrics: how many requests did each route get from 10:00 to 10:05? Return `route`, `requests`."
      solution: |
        SELECT labels->>'route' AS route,
          max(value) - min(value) AS requests
        FROM metrics
        WHERE name = 'http_requests_total'
        GROUP BY 1
      check: rows
      hint:
        vi: "Counter chỉ tăng: số request = lần đọc sau trừ lần đọc trước. `max(value) - min(value)`, `GROUP BY` route."
        en: "A counter only goes up: requests = the later reading minus the earlier one. `max(value) - min(value)`, `GROUP BY` route."
    - task:
        vi: "Từ trace: request chậm nhất là trace nào và mất bao nhiêu mili giây? Chỉ xét span gốc (không có cha). Trả `trace_id`, `ms`."
        en: "From the traces: which request was the slowest and how many milliseconds did it take? Only root spans (no parent). Return `trace_id`, `ms`."
      solution: |
        SELECT trace_id,
          extract(epoch FROM end_ts - start_ts)
            * 1000 AS ms
        FROM spans
        WHERE parent_id IS NULL
        ORDER BY ms DESC
        LIMIT 1
      check: rows
      ordered: true
      hint:
        vi: "Span gốc có `parent_id IS NULL`. Thời lượng = `end_ts - start_ts`; `extract(epoch FROM …) * 1000` ra mili giây."
        en: "A root span has `parent_id IS NULL`. Duration = `end_ts - start_ts`; `extract(epoch FROM …) * 1000` gives milliseconds."
    - task:
        vi: "Từ log: mọi dòng log của request chậm nhất đó, theo thời gian. Tìm trace bằng một truy vấn con, không gõ tay `t2`. Trả `ts`, `severity`, `body`."
        en: "From the logs: every log line of that slowest request, in time order. Find the trace with a subquery, do not type `t2`. Return `ts`, `severity`, `body`."
      solution: |
        SELECT ts, severity, body
        FROM logs
        WHERE trace_id = (
          SELECT trace_id FROM spans
          WHERE parent_id IS NULL
          ORDER BY end_ts - start_ts DESC
          LIMIT 1)
        ORDER BY ts
      check: rows
      ordered: true
      hint:
        vi: "`WHERE trace_id = (SELECT trace_id FROM spans WHERE parent_id IS NULL ORDER BY end_ts - start_ts DESC LIMIT 1)`, rồi `ORDER BY ts`."
        en: "`WHERE trace_id = (SELECT trace_id FROM spans WHERE parent_id IS NULL ORDER BY end_ts - start_ts DESC LIMIT 1)`, then `ORDER BY ts`."
quiz:
  - q:
      vi: "Trace `t2` chạy từ 10:02:00.000 tới 10:02:02.400. Lấy mọi log có `ts` trong khoảng đó thì được log của `t2`?"
      en: "Trace `t2` ran from 10:02:00.000 to 10:02:02.400. Do all logs with `ts` in that window belong to `t2`?"
    options:
      - { vi: "Có, cùng thời gian là cùng request", en: "Yes, same time means same request" }
      - { vi: "Không, còn log của `t3` và cron", en: "No, `t3` and the cron log too" }
      - { vi: "Không, vì log không có thời gian", en: "No, because logs have no time" }
    answer: 1
    trap: 0
    why:
      vi: "Cùng khoảng thời gian thì dễ nghĩ là cùng request, nhưng máy chủ phục vụ nhiều request song song: trong 2,4 giây đó còn có log `quote ok` của `t3` và log `cron: refresh rates` không thuộc request nào. Log có cột `trace_id` (OpenTelemetry gắn nó khi có trace đang chạy), nên lọc `trace_id = 't2'` mới ra đúng hai dòng của `t2`. Log có thời gian, nên lựa chọn thứ ba sai."
      en: "The same window suggests the same request, but a server handles many requests at once: in those 2.4 seconds there is also `quote ok` from `t3` and `cron: refresh rates`, which belongs to no request. Logs carry a `trace_id` column (OpenTelemetry adds it when a trace is active), so filtering `trace_id = 't2'` gives exactly the two lines of `t2`. Logs do have a time, so the third option is wrong."
  - q:
      vi: "Câu hỏi nào metrics trả lời tốt nhất?"
      en: "Which question do metrics answer best?"
    options:
      - { vi: "Request `t2` chậm ở bước nào?", en: "Which step slowed request `t2`?" }
      - { vi: "Thông báo lỗi của request `t2`?", en: "What error did request `t2` print?" }
      - { vi: "Mỗi phút có bao nhiêu request?", en: "How many requests arrive per minute?" }
    answer: 2
    why:
      vi: "Metrics là con số đo theo thời gian, gộp mọi request lại (một counter đếm tất cả), nên trả lời \"bao nhiêu, nhanh hay chậm\" cho cả hệ thống. Bước chậm của một request nằm trong trace (từng span có thời gian riêng), còn câu báo lỗi nằm trong log."
      en: "Metrics are numbers measured over time that add up every request (one counter counts them all), so they answer \"how many, how fast\" for the whole system. The slow step of one request is in its trace (each span has its own timing), and the error text is in the logs."
---
## Mở bài

API theo dõi container của Cargo Query vừa có một request mất 2,4 giây. Ba nguồn dữ liệu cùng ghi lại sự việc đó: metrics, log và trace. Bài này cho bạn đọc cả ba bằng SQL và nối chúng lại.

## Ý chính

OpenTelemetry gọi các đầu ra mô tả hoạt động của hệ thống là **tín hiệu** (signal) và hiện hỗ trợ trace, metrics, log và baggage. Ba tín hiệu đầu là thứ bài này dùng. **Metrics** là con số đo theo thời gian, gộp mọi request: một counter `http_requests_total` chỉ tăng, nên số request trong 5 phút là hiệu hai lần đọc. **Log** là từng dòng sự kiện có thời gian, mức độ (severity) và nội dung. **Trace** là đường đi của một request, gồm các **span**; mỗi span là một đơn vị công việc có tên, thời điểm bắt đầu và kết thúc, `trace_id`, `span_id` và `parent_id` (span gốc không có cha).

Chỗ nối giữa chúng là `trace_id`: khi có trace đang chạy, OpenTelemetry tự gắn `trace_id` và `span_id` vào bản ghi log. Vì thế ta hỏi theo thứ tự: metrics báo có chuyện (nhiều request chậm), trace chỉ ra request và bước chậm, log của đúng trace đó nói vì sao. Hình cuối mục vẽ một request để lại dấu trên cả ba.

## Cú pháp

```sql
-- logs of one trace
SELECT ts, severity, body
FROM logs
WHERE trace_id = 't2'
ORDER BY ts;
```

- Counter: số sự kiện = lần đọc sau trừ lần đọc trước.
- Span gốc: `parent_id IS NULL`; thời lượng = `end_ts - start_ts`.
- Log nối với trace bằng `trace_id`, không bằng thời gian.

## Ví dụ

Hai lần đọc counter của mỗi route.

```sql
SELECT ts, labels->>'route' AS route,
  value
FROM metrics
ORDER BY route, ts;
```

Các span của trace `t2`: span gốc và span con truy vấn cơ sở dữ liệu.

```sql
SELECT span_id, parent_id, name,
  end_ts - start_ts AS took
FROM spans
WHERE trace_id = 't2'
ORDER BY start_ts;
```

## Lỗi hay gặp

Lấy log theo khoảng thời gian của trace: dính log của request khác.

```sql
-- WRONG: a time window catches others
SELECT body FROM logs
WHERE ts BETWEEN
  '2026-10-31 10:02:00'
  AND '2026-10-31 10:02:02.4'
ORDER BY ts;
```

```sql
-- FIX: filter on trace_id
SELECT body FROM logs
WHERE trace_id = 't2'
ORDER BY ts;
```

Đếm request bằng số dòng metrics: ra số lần đọc, không phải số request.

```sql
-- WRONG: counts readings
SELECT labels->>'route' AS route,
  count(*) AS requests
FROM metrics
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: later reading minus earlier
SELECT labels->>'route' AS route,
  max(value) - min(value) AS requests
FROM metrics
GROUP BY 1 ORDER BY 1;
```

## Thực hành

Ba bước, mỗi bước một tín hiệu: số request mỗi route từ metrics, request chậm nhất từ trace, rồi log của đúng request đó.

## Tóm tắt

- Metrics: con số theo thời gian cho cả hệ thống; log: từng sự kiện; trace: đường đi của một request.
- Một trace gồm các span; span gốc có `parent_id IS NULL`.
- Log nối với trace bằng `trace_id`; khoảng thời gian bắt cả request khác.
- Số request từ counter = lần đọc sau trừ lần đọc trước.

# EN

## Opening

Cargo Query's container tracking API just had a request that took 2.4 seconds. Three data sources recorded it: metrics, logs and traces. This lesson reads all three with SQL and links them.

## Key idea

OpenTelemetry calls the outputs that describe a system's activity **signals** and currently supports traces, metrics, logs and baggage. The first three are what this lesson uses. **Metrics** are numbers measured over time that add up every request: a counter `http_requests_total` only goes up, so the requests in 5 minutes are the difference of two readings. **Logs** are single timestamped events with a severity and a body. A **trace** is the path of one request, made of **spans**; each span is a unit of work with a name, a start and end time, a `trace_id`, a `span_id` and a `parent_id` (a root span has no parent).

The link between them is `trace_id`: when a trace is active, OpenTelemetry adds `trace_id` and `span_id` to the log record. So we ask in order: metrics say something is wrong (many slow requests), the trace points to the request and its slow step, and the logs of that very trace say why. The figure at the end of this section draws one request leaving marks in all three.

## Syntax

```sql
-- logs of one trace
SELECT ts, severity, body
FROM logs
WHERE trace_id = 't2'
ORDER BY ts;
```

- Counter: events = the later reading minus the earlier one.
- Root span: `parent_id IS NULL`; duration = `end_ts - start_ts`.
- Logs link to a trace through `trace_id`, not through time.

## Example

The two readings of each route's counter.

```sql
SELECT ts, labels->>'route' AS route,
  value
FROM metrics
ORDER BY route, ts;
```

The spans of trace `t2`: the root span and the database child span.

```sql
SELECT span_id, parent_id, name,
  end_ts - start_ts AS took
FROM spans
WHERE trace_id = 't2'
ORDER BY start_ts;
```

## Common mistakes

Taking logs by the trace's time window: other requests' logs come along.

```sql
-- WRONG: a time window catches others
SELECT body FROM logs
WHERE ts BETWEEN
  '2026-10-31 10:02:00'
  AND '2026-10-31 10:02:02.4'
ORDER BY ts;
```

```sql
-- FIX: filter on trace_id
SELECT body FROM logs
WHERE trace_id = 't2'
ORDER BY ts;
```

Counting requests as metric rows: that counts readings, not requests.

```sql
-- WRONG: counts readings
SELECT labels->>'route' AS route,
  count(*) AS requests
FROM metrics
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: later reading minus earlier
SELECT labels->>'route' AS route,
  max(value) - min(value) AS requests
FROM metrics
GROUP BY 1 ORDER BY 1;
```

## Practice

Three steps, one signal each: requests per route from the metrics, the slowest request from the traces, then the logs of that very request.

## Recap

- Metrics: numbers over time for the whole system; logs: single events; traces: the path of one request.
- A trace is made of spans; a root span has `parent_id IS NULL`.
- Logs link to a trace through `trace_id`; a time window also catches other requests.
- Requests from a counter = the later reading minus the earlier one.
