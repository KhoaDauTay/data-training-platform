---
id: e-tm-l2-03
engine: telemetry
level: L2
module: query
title: "Log dạng JSONB và index GIN"
title_en: "Logs as JSONB with a GIN index"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: tm-logs-gin, at: idea }]
objectives:
  - vi: Lọc log có cấu trúc bằng toán tử chứa `@>` và toán tử có khóa `?` của jsonb.
    en: Filter structured logs with jsonb's containment operator `@>` and key-exists operator `?`.
  - vi: Tạo index GIN trên cột jsonb và biết toán tử nào nó phục vụ.
    en: Create a GIN index on a jsonb column and know which operators it serves.
  - vi: So sánh với Loki, nơi chỉ nhãn được đánh index.
    en: Compare with Loki, where only labels are indexed.
requires: [e-tm-l1-01]
sources:
  - { url: "https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING", title: "PostgreSQL: jsonb indexing" }
  - { url: "https://www.postgresql.org/docs/current/functions-json.html", title: "PostgreSQL: JSON functions and operators" }
  - { url: "https://grafana.com/docs/loki/latest/get-started/overview/", title: "Grafana Loki: Overview" }
lab:
  setup: |
    CREATE TABLE logs (
      id int PRIMARY KEY, ts timestamp,
      body jsonb
    );
    INSERT INTO logs
    SELECT i,
      timestamp '2026-10-31 09:00'
        + i * interval '5 seconds',
      jsonb_build_object(
        'level', CASE WHEN i % 25 = 0 OR i % 21 = 0
          THEN 'error' ELSE 'info' END,
        'route', (ARRAY['/track', '/quote', '/book'])[i % 3 + 1],
        'code', CASE WHEN i % 25 = 0 OR i % 21 = 0
          THEN 500 ELSE 200 END,
        'trace_id', 't-' || i,
        'msg', CASE WHEN i % 21 = 0 THEN 'carrier timeout'
          WHEN i % 25 = 0 THEN 'db slow' ELSE 'ok' END)
      || CASE WHEN i % 100 = 0
        THEN jsonb_build_object('user_id', 'u' || i)
        ELSE '{}'::jsonb END
    FROM generate_series(1, 600) i;
  steps:
    - task:
        vi: "Có bao nhiêu log lỗi (`level` là `error`) trên route `/track`? Dùng toán tử chứa của jsonb. Trả `errors`."
        en: "How many error logs (`level` is `error`) are there on route `/track`? Use jsonb's containment operator. Return `errors`."
      solution: |
        SELECT count(*) AS errors
        FROM logs
        WHERE body @>
          '{"level": "error", "route": "/track"}'
      check: rows
      hint:
        vi: "`body @> '{\"level\": \"error\", \"route\": \"/track\"}'` giữ log chứa cả hai cặp khóa - giá trị."
        en: "`body @> '{\"level\": \"error\", \"route\": \"/track\"}'` keeps logs that contain both key-value pairs."
    - task:
        vi: "Tạo một index GIN trên `body` với lớp toán tử mặc định (phục vụ `@>` và `?`)."
        en: "Create a GIN index on `body` with the default operator class (it serves `@>` and `?`)."
      solution: |
        CREATE INDEX logs_body_gin
          ON logs USING gin (body)
      after: |
        SELECT a.amname,
          pg_get_indexdef(i.indexrelid, 1, true) AS col
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_am a ON a.oid = c.relam
        WHERE i.indrelid = 'logs'::regclass
          AND a.amname = 'gin'
      check: rows
      hint:
        vi: "`CREATE INDEX … ON logs USING gin (body)`; không thêm `jsonb_path_ops` (lớp đó không phục vụ `?`)."
        en: "`CREATE INDEX … ON logs USING gin (body)`; do not add `jsonb_path_ops` (that class does not serve `?`)."
    - task:
        vi: "Log lỗi theo route và thông báo: mỗi cặp có bao nhiêu dòng? Trả `route`, `msg`, `n`."
        en: "Error logs by route and message: how many rows per pair? Return `route`, `msg`, `n`."
      solution: |
        SELECT body->>'route' AS route,
          body->>'msg' AS msg, count(*) AS n
        FROM logs
        WHERE body @> '{"level": "error"}'
        GROUP BY 1, 2
      check: rows
      hint:
        vi: "Lọc bằng `@>`, rồi lấy chữ bằng `->>` để `GROUP BY 1, 2`."
        en: "Filter with `@>`, then take the text with `->>` and `GROUP BY 1, 2`."
    - task:
        vi: "Bao nhiêu log có khóa `user_id`? Dùng toán tử có khóa. Trả `with_user`."
        en: "How many logs have a `user_id` key? Use the key-exists operator. Return `with_user`."
      solution: |
        SELECT count(*) AS with_user
        FROM logs
        WHERE body ? 'user_id'
      check: rows
      hint:
        vi: "`body ? 'user_id'` đúng khi `body` có khóa đó ở mức trên cùng."
        en: "`body ? 'user_id'` is true when `body` has that key at the top level."
quiz:
  - q:
      vi: "Có index GIN mặc định trên `body`. Điều kiện nào index đó phục vụ được?"
      en: "There is a default GIN index on `body`. Which condition can that index serve?"
    options:
      - { vi: "`body->>'level' = 'error'`", en: "`body->>'level' = 'error'`" }
      - { vi: "`body @> '{\"level\": \"error\"}'`", en: "`body @> '{\"level\": \"error\"}'`" }
      - { vi: "`body::text LIKE '%error%'`", en: "`body::text LIKE '%error%'`" }
    answer: 1
    trap: 0
    why:
      vi: "`->>` trông gọn và quen, nhưng tài liệu PostgreSQL liệt kê các toán tử lớp GIN mặc định của jsonb phục vụ: `?`, `?|`, `?&`, `@>`, `@?` và `@@`, áp thẳng lên cột có index. `body->>'level' = 'error'` là phép so sánh chữ trên một biểu thức, không phải toán tử đó, nên cần một index biểu thức riêng như `((body->>'level'))`. `LIKE` trên `body::text` cũng không dùng được index này."
      en: "`->>` looks neat and familiar, but the PostgreSQL docs list the operators the default jsonb GIN class serves: `?`, `?|`, `?&`, `@>`, `@?` and `@@`, applied directly to the indexed column. `body->>'level' = 'error'` is a text comparison on an expression, not one of those operators, so it needs its own expression index such as `((body->>'level'))`. `LIKE` on `body::text` cannot use this index either."
  - q:
      vi: "Loki lưu log khác bảng này thế nào?"
      en: "How does Loki store logs differently from this table?"
    options:
      - { vi: "Nó đánh index mọi chữ của log", en: "It indexes every word of a log" }
      - { vi: "Nó lưu mỗi log thành một dòng SQL", en: "It stores each log as a SQL row" }
      - { vi: "Nó chỉ đánh index nhãn, nén log", en: "It indexes only labels, compresses logs" }
    answer: 2
    why:
      vi: "Theo tài liệu Grafana, Loki không đánh index nội dung log mà chỉ đánh index siêu dữ liệu là một tập nhãn; dòng log được nén thành chunk trong kho đối tượng, và lọc theo chữ diễn ra lúc đọc. Vì thế nhãn tốt (ít giá trị, như route) quyết định truy vấn nhanh. Index GIN ở đây làm ngược lại: nó đánh index mọi khóa và giá trị trong `body`."
      en: "According to the Grafana docs, Loki does not index the contents of logs, only metadata as a set of labels; log lines are compressed into chunks in an object store, and text filtering happens at read time. So a good label set (few values, like route) is what makes queries fast. The GIN index here does the opposite: it indexes every key and value in `body`."
---
## Mở bài

API theo dõi container ghi 600 log có cấu trúc trong một giờ, mỗi log là một đối tượng JSON. Đội trực cần lọc nhanh log lỗi theo route. Bài này lưu log trong cột `jsonb`, lọc bằng toán tử jsonb và tạo index GIN cho chúng.

## Ý chính

Log có cấu trúc (JSON) để được trong cột `jsonb`. Toán tử **chứa** `@>` giữ dòng có đủ các cặp khóa - giá trị cho trước; toán tử **có khóa** `?` hỏi một khóa có mặt không; `->>` lấy giá trị ra dạng chữ để hiển thị hay gom nhóm. Tài liệu PostgreSQL nói lớp toán tử GIN mặc định của jsonb phục vụ `?`, `?|`, `?&`, `@>`, `@?` và `@@`; lớp `jsonb_path_ops` nhỏ hơn nhưng bỏ ba toán tử có khóa. Điều kiện viết bằng `->>` không dùng được index GIN trên cột; nó cần index biểu thức riêng.

Loki của Grafana đi hướng khác: nó chỉ đánh index một tập nhãn (route, dịch vụ), còn nội dung log nén thành chunk và được lọc lúc đọc, nên chọn nhãn tốt là chìa khóa. Bài cardinality cấp 1 vẫn đúng ở đây: mã người dùng là nội dung, không phải nhãn. Hình cuối mục so sánh hai cách.

## Cú pháp

```sql
-- containment and key-exists
SELECT count(*) FROM logs
WHERE body @> '{"level": "error"}';
CREATE INDEX logs_gin
  ON logs USING gin (body);
```

- `body @> '{"k": "v"}'`: chứa cặp khóa - giá trị (index GIN dùng được).
- `body ? 'k'`: có khóa `k` (lớp mặc định dùng được, `jsonb_path_ops` thì không).
- `body->>'k'`: lấy chữ để hiển thị; điều kiện trên nó cần index biểu thức.

## Ví dụ

Một log mẫu.

```sql
SELECT id, body
FROM logs
WHERE id = 25;
```

Số log theo mức độ, lấy chữ bằng `->>`.

```sql
SELECT body->>'level' AS level,
  count(*) AS n
FROM logs
GROUP BY 1 ORDER BY 1;
```

## Lỗi hay gặp

So `->` (ra jsonb) với một chuỗi thường: PostgreSQL đọc `'error'` như JSON và báo lỗi.

```sql
-- ERROR 22P02: 'error' is not JSON
SELECT count(*) FROM logs
WHERE body->'level' = 'error';
```

Mã lỗi lưu là số, lọc bằng chuỗi `"500"` thì không khớp dòng nào.

```sql
-- WRONG: "500" is a string
SELECT count(*) AS n FROM logs
WHERE body @> '{"code": "500"}';
```

```sql
-- FIX: 500 is a number in the log
SELECT count(*) AS n FROM logs
WHERE body @> '{"code": 500}';
```

## Thực hành

Bốn bước: đếm log lỗi của `/track` bằng `@>`, tạo index GIN mặc định trên `body`, đếm log lỗi theo route và thông báo, rồi đếm log có khóa `user_id` bằng `?`.

## Tóm tắt

- Log có cấu trúc để trong `jsonb`; lọc bằng `@>` và `?`, hiển thị bằng `->>`.
- GIN mặc định phục vụ `?`, `?|`, `?&`, `@>`, `@?`, `@@`; `jsonb_path_ops` bỏ các toán tử có khóa.
- Điều kiện trên `->>` cần index biểu thức riêng.
- Loki chỉ đánh index nhãn và nén nội dung log; nhãn tốt là chìa khóa.

# EN

## Opening

The container tracking API writes 600 structured logs in one hour, each a JSON object. The on-call team needs to filter error logs by route quickly. This lesson keeps the logs in a `jsonb` column, filters them with jsonb operators and builds a GIN index for them.

## Key idea

Structured (JSON) logs can live in a `jsonb` column. The **containment** operator `@>` keeps rows that contain the given key-value pairs; the **key-exists** operator `?` asks whether a key is present; `->>` takes a value out as text for display or grouping. The PostgreSQL docs say the default jsonb GIN operator class serves `?`, `?|`, `?&`, `@>`, `@?` and `@@`; the `jsonb_path_ops` class is smaller but drops the three key-exists operators. A condition written with `->>` cannot use the GIN index on the column; it needs its own expression index.

Grafana's Loki goes the other way: it indexes only a set of labels (route, service), while log contents are compressed into chunks and filtered at read time, so choosing good labels is the key. The level 1 cardinality lesson still holds here: a user id is content, not a label. The figure at the end of this section compares the two approaches.

## Syntax

```sql
-- containment and key-exists
SELECT count(*) FROM logs
WHERE body @> '{"level": "error"}';
CREATE INDEX logs_gin
  ON logs USING gin (body);
```

- `body @> '{"k": "v"}'`: contains the key-value pair (a GIN index can serve it).
- `body ? 'k'`: has key `k` (the default class serves it, `jsonb_path_ops` does not).
- `body->>'k'`: takes text for display; a condition on it needs an expression index.

## Example

A sample log.

```sql
SELECT id, body
FROM logs
WHERE id = 25;
```

Logs per level, the text taken with `->>`.

```sql
SELECT body->>'level' AS level,
  count(*) AS n
FROM logs
GROUP BY 1 ORDER BY 1;
```

## Common mistakes

Comparing `->` (which gives jsonb) with a plain string: PostgreSQL reads `'error'` as JSON and raises an error.

```sql
-- ERROR 22P02: 'error' is not JSON
SELECT count(*) FROM logs
WHERE body->'level' = 'error';
```

The error code is stored as a number, so filtering with the string `"500"` matches no row.

```sql
-- WRONG: "500" is a string
SELECT count(*) AS n FROM logs
WHERE body @> '{"code": "500"}';
```

```sql
-- FIX: 500 is a number in the log
SELECT count(*) AS n FROM logs
WHERE body @> '{"code": 500}';
```

## Practice

Four steps: count `/track` error logs with `@>`, create the default GIN index on `body`, count error logs by route and message, then count logs with a `user_id` key using `?`.

## Recap

- Structured logs live in `jsonb`; filter with `@>` and `?`, display with `->>`.
- The default GIN class serves `?`, `?|`, `?&`, `@>`, `@?`, `@@`; `jsonb_path_ops` drops the key-exists operators.
- A condition on `->>` needs its own expression index.
- Loki indexes only labels and compresses log contents; good labels are the key.
