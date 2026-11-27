---
id: e-bp-l06
engine: best
track: telemetry
level: L2
module: l
title: "Lọc log JSONB bằng @> để dùng index GIN"
title_en: "Filter JSONB logs with @> to use the GIN index"
kind: quiz
minutes: 4
objectives:
  - vi: "Viết điều kiện trên log JSONB bằng `@>` (chứa), toán tử mà index GIN mặc định của `jsonb` hỗ trợ."
    en: "Write conditions on JSONB logs with `@>` (contains), the operator the default `jsonb` GIN index supports."
avoid:
  vi: "`payload->>'level' = 'error'`: index GIN không giúp được, PostgreSQL đọc hết bảng log."
  en: "`payload->>'level' = 'error'`: the GIN index cannot help, so PostgreSQL reads the whole log table."
requires: [e-tm-l2-03]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/datatype-json.html#JSON-INDEXING
  - https://www.postgresql.org/docs/18/functions-json.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine-hb
  check: plan
  setup: |
    CREATE TABLE logs (id int, payload jsonb);
    INSERT INTO logs SELECT i, jsonb_build_object('level', CASE WHEN i % 200 = 0 THEN 'error' ELSE 'info' END, 'route', '/r' || (i % 40)) FROM generate_series(1, 20000) AS i;
    CREATE INDEX logs_payload_gin ON logs USING gin (payload);
    VACUUM ANALYZE logs;
  bad: |
    SELECT count(*) FROM logs
    WHERE payload->>'level' = 'error'
  good: |
    SELECT count(*) FROM logs
    WHERE payload @> '{"level": "error"}'
  expect: { table: logs, bad: Seq Scan, good: Bitmap Heap Scan }
quiz:
  - q:
      vi: "Bảng `logs` có index `USING gin (payload)`. Điều kiện nào dùng được index đó?"
      en: "Table `logs` has an index `USING gin (payload)`. Which condition can use it?"
    options:
      - { vi: "`payload->>'level' = 'error'`", en: "`payload->>'level' = 'error'`" }
      - { vi: "`payload @> '{\"level\": \"error\"}'`", en: "`payload @> '{\"level\": \"error\"}'`" }
      - { vi: "Cả hai, vì cùng đọc trường `level`", en: "Both, because both read the `level` field" }
    answer: 1
    why:
      vi: "Index GIN trên cả cột `jsonb` lưu các khóa và giá trị bên trong giá trị JSON, và chỉ phục vụ các toán tử như `@>`, `?`, `?|`, `?&`. `payload->>'level' = 'error'` trích một chuỗi ra rồi so bằng `=`, là phép mà index này không biết, nên PostgreSQL đọc tuần tự cả bảng (Seq Scan). Viết `@>` thì planner dùng index (Bitmap Heap Scan). Nếu đã quen viết `->>`, hãy tạo index B-tree trên chính biểu thức đó."
      en: "A GIN index on a whole `jsonb` column stores the keys and values inside the JSON values, and only serves operators such as `@>`, `?`, `?|`, `?&`. `payload->>'level' = 'error'` extracts a string and compares it with `=`, which this index knows nothing about, so PostgreSQL reads the whole table (Seq Scan). Written with `@>`, the planner uses the index (Bitmap Heap Scan). If you prefer writing `->>`, build a B-tree index on that exact expression."
---

## Ý chính

Lọc log JSONB có index GIN bằng toán tử chứa: `payload @> '{"level": "error"}'`. Index GIN mặc định của `jsonb` (`jsonb_ops`) chỉ hỗ trợ `@>`, `?`, `?|`, `?&` và vài toán tử JSON path.

## Vì sao

- Index GIN tách mỗi giá trị JSON thành các khóa và giá trị con, rồi tìm các dòng chứa chúng. Nó không biết gì về chuỗi mà `->>` trích ra.
- Với `->>` và `=`, planner không có index nào để dùng, nên đọc tuần tự (Seq Scan) mọi dòng log.
- `@>` hỏi đúng câu "giá trị này có chứa cặp `level: error` không", là câu GIN trả lời được.
- Cả hai bản đếm 100 dòng lỗi. Bản Không nên đọc `logs` bằng Seq Scan, bản Nên bằng Bitmap Heap Scan qua index GIN.

# EN

## Key idea

Filter JSONB logs that have a GIN index with the containment operator: `payload @> '{"level": "error"}'`. The default `jsonb` GIN index (`jsonb_ops`) only supports `@>`, `?`, `?|`, `?&` and a few JSON path operators.

## Why

- A GIN index splits each JSON value into keys and inner values, then finds the rows that contain them. It knows nothing about the string that `->>` extracts.
- With `->>` and `=`, the planner has no index to use, so it reads every log row (Seq Scan).
- `@>` asks exactly "does this value contain the pair `level: error`", which GIN can answer.
- Both versions count 100 error rows. The Avoid version reads `logs` with a Seq Scan, the Prefer version with a Bitmap Heap Scan through the GIN index.
