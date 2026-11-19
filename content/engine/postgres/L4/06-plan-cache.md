---
id: e-pg-l4-06
engine: postgres
level: L4
module: prepared
title: "Câu đã chuẩn bị: kế hoạch chung và kế hoạch riêng"
title_en: "Prepared statements: generic vs custom plans"
kind: lab
runtime: browser
minutes: 15
objectives:
  - { vi: "Giải thích luật 5 lần đầu dùng kế hoạch riêng (custom) rồi mới cân nhắc kế hoạch chung (generic)", en: "Explain the rule: the first five executions use custom plans before a generic plan is considered" }
  - { vi: "Nhận ra lỗi hiệu năng kinh điển: kế hoạch chung tốt cho giá trị hiếm nhưng tệ cho giá trị phổ biến", en: "Recognise the classic problem: a generic plan good for rare values but bad for common ones" }
  - { vi: "Biết dùng `plan_cache_mode` và `EXPLAIN (GENERIC_PLAN)` để chẩn đoán", en: "Use `plan_cache_mode` and `EXPLAIN (GENERIC_PLAN)` to diagnose" }
requires: [e-pg-l4-02]
sources:
  - https://www.postgresql.org/docs/18/sql-prepare.html
  - https://www.postgresql.org/docs/18/runtime-config-query.html
  - https://www.postgresql.org/docs/18/sql-explain.html
  - https://www.postgresql.org/docs/18/view-pg-prepared-statements.html
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS parcels CASCADE;
    DROP FUNCTION IF EXISTS plan_lines(text, boolean);
    CREATE TABLE parcels (id int PRIMARY KEY, status text NOT NULL);
    INSERT INTO parcels
      SELECT g, CASE WHEN g % 100 < 70 THEN 'delivered' WHEN g % 100 < 90 THEN 'in_transit' WHEN g % 100 < 99 THEN 'returned' ELSE 'lost' END
      FROM generate_series(1, 20000) g;
    CREATE INDEX parcels_status_idx ON parcels (status);
    ANALYZE parcels;
    -- helper: the plan of one query as text lines; generic = true plans it with $1 unknown (author code, never player text)
    CREATE FUNCTION plan_lines(q text, generic boolean DEFAULT false) RETURNS SETOF text LANGUAGE plpgsql AS $$
    BEGIN
      IF generic THEN RETURN QUERY EXECUTE 'EXPLAIN (GENERIC_PLAN, COSTS OFF) ' || q;
      ELSE RETURN QUERY EXECUTE 'EXPLAIN (COSTS OFF) ' || q;
      END IF;
    END $$;
  steps:
    - task: { vi: "Xem kế hoạch chung (generic) của câu lọc kiện theo trạng thái là tham số `$1`: gọi `plan_lines(..., true)` với câu đó.", en: "Look at the generic plan of the query that filters parcels by a status parameter `$1`: call `plan_lines(..., true)` with that query." }
      solution: "SELECT * FROM plan_lines('SELECT * FROM parcels WHERE status = $1', true)"
      check: rows
      ordered: true
      hint: { vi: "Câu bên trong là chuỗi: `'SELECT * FROM parcels WHERE status = $1'`.", en: "The inner query is a string: `'SELECT * FROM parcels WHERE status = $1'`." }
    - task: { vi: "Giờ xem kế hoạch riêng (custom) cho giá trị phổ biến 'delivered' (70% bảng): gọi `plan_lines` với câu có hằng số, không có tham số thứ hai.", en: "Now look at the custom plan for the common value 'delivered' (70% of the table): call `plan_lines` with the query holding the constant, without the second argument." }
      solution: "SELECT * FROM plan_lines('SELECT * FROM parcels WHERE status = ''delivered''')"
      check: rows
      ordered: true
      hint: { vi: "Trong chuỗi SQL, dấu nháy đơn được viết đôi: `''delivered''`.", en: "Inside an SQL string, single quotes are doubled: `''delivered''`." }
quiz:
  - q: { vi: "Ứng dụng gọi `PREPARE` một câu lọc theo trạng thái. 5 lần đầu tham số là 'lost' (1%). Lần thứ 6 trở đi, Postgres làm gì?", en: "An application runs `PREPARE` on a query that filters by status. The first 5 calls pass 'lost' (1%). What does Postgres do from the 6th call on?" }
    options:
      - { vi: "Luôn lập kế hoạch lại cho từng giá trị", en: "Always re-plans for each value" }
      - { vi: "Lập một kế hoạch chung với `$1`, so chi phí của nó với chi phí trung bình của 5 kế hoạch riêng; nếu không đắt hơn nhiều thì dùng kế hoạch chung từ đó", en: "Builds one generic plan with `$1`, compares its cost with the average cost of the 5 custom plans, and uses the generic plan from then on if it is not much more expensive" }
      - { vi: "Báo lỗi vì kế hoạch hết hạn", en: "Raises an error because the plan expired" }
    answer: 1
    why: { vi: "Đúng nguyên văn tài liệu PREPARE: 5 lần đầu dùng kế hoạch riêng, rồi so chi phí kế hoạch chung với trung bình. Nếu sau đó tham số là 'delivered' (70%), kế hoạch chung qua index có thể chậm hơn Seq Scan nhiều.", en: "This is the PREPARE documentation's rule: the first 5 runs use custom plans, then the generic plan's cost is compared with their average. If the parameter later becomes 'delivered' (70%), the generic index plan can be much slower than a Seq Scan." }
  - q: { vi: "Một câu đã chuẩn bị chạy chậm thất thường tùy giá trị tham số. Bước chẩn đoán đầu tiên tốt nhất?", en: "A prepared query is erratically slow depending on the parameter. Best first diagnostic step?" }
    options:
      - { vi: "So `EXPLAIN (GENERIC_PLAN)` với `EXPLAIN` có giá trị cụ thể, và xem `generic_plans`/`custom_plans` trong `pg_prepared_statements`", en: "Compare `EXPLAIN (GENERIC_PLAN)` with `EXPLAIN` on a concrete value, and check `generic_plans`/`custom_plans` in `pg_prepared_statements`" }
      - { vi: "Tăng `shared_buffers`", en: "Raise `shared_buffers`" }
      - { vi: "Xóa index trên cột trạng thái", en: "Drop the index on the status column" }
    answer: 0
    why: { vi: "Phải thấy kế hoạch chung khác kế hoạch riêng thế nào trước khi sửa. Sửa phổ biến: `plan_cache_mode = force_custom_plan` cho phiên/hàm đó, hoặc tách câu cho giá trị phổ biến.", en: "You must see how the generic plan differs from the custom one before fixing anything. A common fix: `plan_cache_mode = force_custom_plan` for that session or function, or a separate query for the common values." }
---

## Ý chính

- `PREPARE` (và driver dùng giao thức mở rộng) cho phép lập kế hoạch một lần, chạy nhiều lần. Có hai loại kế hoạch:
  - custom: lập lại cho giá trị tham số cụ thể, dùng MCV/histogram của đúng giá trị đó;
  - generic: một kế hoạch cho mọi giá trị, tham số là `$1`, ước lượng theo độ chọn lọc trung bình.
- Luật mặc định (`plan_cache_mode = auto`): 5 lần đầu dùng custom; sau đó lập generic, và dùng generic nếu chi phí của nó không cao hơn nhiều so với trung bình 5 lần custom.
- Bẫy: dữ liệu lệch. Generic plan chọn theo "giá trị trung bình" có thể rất tệ cho giá trị phổ biến (70% bảng).
- Công cụ: `EXPLAIN (GENERIC_PLAN)` (từ 16) cho xem kế hoạch chung của một câu có `$1` mà không cần `PREPARE`; `pg_prepared_statements` đếm `generic_plans`/`custom_plans`; `plan_cache_mode` = `force_custom_plan` hoặc `force_generic_plan`.

## Ví dụ

Ghi lại trên PGlite bằng kịch bản nhiều lệnh (người học không chạy được ở đây vì mỗi bài chỉ một câu trong một giao dịch). Bảng `parcels` 20000 dòng, 'lost' = 1%:

```text
PREPARE by_status(text) AS SELECT * FROM parcels WHERE status = $1;

EXPLAIN (COSTS OFF) EXECUTE by_status('lost');      -- custom
Bitmap Heap Scan on parcels
  Recheck Cond: (status = 'lost'::text)
  ->  Bitmap Index Scan on parcels_status_idx
        Index Cond: (status = 'lost'::text)

SET plan_cache_mode = force_generic_plan;
EXPLAIN (COSTS OFF) EXECUTE by_status('lost');      -- generic
Bitmap Heap Scan on parcels
  Recheck Cond: (status = $1)
  ->  Bitmap Index Scan on parcels_status_idx
        Index Cond: (status = $1)

SELECT name, generic_plans, custom_plans FROM pg_prepared_statements;
by_status | 1 | 1
```

Kế hoạch chung vẫn dùng index cho mọi giá trị, kể cả 'delivered', trong khi custom plan cho 'delivered' là Seq Scan (bài e-pg-l4-02).

## Thực hành

Hai bước đọc kế hoạch thật bằng hàm `plan_lines` (chung với `$1`, riêng với 'delivered'), rồi hai câu hỏi tình huống. Kỹ năng chuyên gia: chẩn đoán "câu chạy lúc nhanh lúc chậm" do kế hoạch chung của câu đã chuẩn bị, và chọn cách sửa đúng chỗ.

# EN

## Key idea

- `PREPARE` (and drivers using the extended protocol) lets you plan once and run many times. There are two kinds of plan:
  - custom: re-planned for the concrete parameter value, using the MCV/histogram for that value;
  - generic: one plan for every value, with `$1` as the parameter, estimated from an average selectivity.
- Default rule (`plan_cache_mode = auto`): the first 5 runs use custom plans; then a generic plan is built and used if its cost is not much higher than the average of the 5 custom plans.
- The trap: skewed data. A generic plan chosen for the "average value" can be very bad for a common value (70% of the table).
- Tools: `EXPLAIN (GENERIC_PLAN)` (since 16) shows the generic plan of a query with `$1` without `PREPARE`; `pg_prepared_statements` counts `generic_plans`/`custom_plans`; `plan_cache_mode` = `force_custom_plan` or `force_generic_plan`.

## Example

Captured on PGlite with a multi-statement script (a learner cannot run it here, because each lesson runs one statement inside one transaction). Table `parcels`, 20000 rows, 'lost' = 1%:

```text
PREPARE by_status(text) AS SELECT * FROM parcels WHERE status = $1;

EXPLAIN (COSTS OFF) EXECUTE by_status('lost');      -- custom
Bitmap Heap Scan on parcels
  Recheck Cond: (status = 'lost'::text)
  ->  Bitmap Index Scan on parcels_status_idx
        Index Cond: (status = 'lost'::text)

SET plan_cache_mode = force_generic_plan;
EXPLAIN (COSTS OFF) EXECUTE by_status('lost');      -- generic
Bitmap Heap Scan on parcels
  Recheck Cond: (status = $1)
  ->  Bitmap Index Scan on parcels_status_idx
        Index Cond: (status = $1)

SELECT name, generic_plans, custom_plans FROM pg_prepared_statements;
by_status | 1 | 1
```

The generic plan uses the index for every value, 'delivered' included, while the custom plan for 'delivered' is a Seq Scan (lesson e-pg-l4-02).

## Practice

Two steps that read real plans with the `plan_lines` function (generic with `$1`, custom with 'delivered'), then two scenario questions. Expert skill: diagnose "the query is sometimes fast, sometimes slow" as a prepared statement's generic plan, and fix it in the right place.
