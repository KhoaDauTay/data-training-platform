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
figures: [{ name: pg-generic-custom-plan, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
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
    - task: { vi: "Xem kế hoạch chung (generic) của câu lọc kiện theo trạng thái là tham số `$1`: gọi `plan_lines(sql, true)` với câu đó: tham số đầu là nguyên câu SQL dạng chuỗi, `true` nghĩa là xem kế hoạch chung.", en: "Look at the generic plan of the query that filters parcels by a status parameter `$1`: call `plan_lines(sql, true)` with that query: the first argument is the whole SQL query as a string, `true` asks for the generic plan." }
      solution: "SELECT * FROM plan_lines('SELECT * FROM parcels WHERE status = $1', true)"
      check: rows
      ordered: true
      hint: { vi: "Câu bên trong là chuỗi: `'SELECT * FROM parcels WHERE status = $1'`.", en: "The inner query is a string: `'SELECT * FROM parcels WHERE status = $1'`." }
    - task: { vi: "Giờ xem kế hoạch riêng (custom) cho giá trị phổ biến 'delivered' (70 % bảng): gọi `plan_lines` với câu có hằng số, không có tham số thứ hai.", en: "Now look at the custom plan for the common value 'delivered' (70% of the table): call `plan_lines` with the query holding the constant, without the second argument." }
      solution: "SELECT * FROM plan_lines('SELECT * FROM parcels WHERE status = ''delivered''')"
      check: rows
      ordered: true
      hint: { vi: "Trong chuỗi SQL, dấu nháy đơn được viết đôi: `''delivered''`.", en: "Inside an SQL string, single quotes are doubled: `''delivered''`." }
    - task: { vi: "Cuối cùng xem kế hoạch riêng cho giá trị hiếm 'lost' (1 % bảng), cũng bằng `plan_lines` không có tham số thứ hai. So với kế hoạch chung ở bước 1: nó giống kế hoạch của giá trị nào?", en: "Finally look at the custom plan for the rare value 'lost' (1% of the table), again with `plan_lines` and no second argument. Compare it with the generic plan of step 1: which value's plan does the generic one look like?" }
      solution: "SELECT * FROM plan_lines('SELECT * FROM parcels WHERE status = ''lost''')"
      check: rows
      ordered: true
      hint: { vi: "Như bước 2, chỉ đổi giá trị: `''lost''`.", en: "Like step 2, only the value changes: `''lost''`." }
quiz:
  - q: { vi: "Ứng dụng gọi `PREPARE` một câu lọc theo trạng thái. 5 lần đầu tham số là 'lost' (1 %). Lần thứ 6 trở đi, Postgres làm gì?", en: "An application runs `PREPARE` on a query that filters by status. The first 5 calls pass 'lost' (1%). What does Postgres do from the 6th call on?" }
    options:
      - { vi: "Luôn lập kế hoạch lại cho từng giá trị", en: "Always re-plans for each value" }
      - { vi: "Lập một kế hoạch chung với `$1`, so chi phí của nó với chi phí trung bình của 5 kế hoạch riêng; nếu không đắt hơn nhiều thì dùng kế hoạch chung từ đó", en: "Builds one generic plan with `$1`, compares its cost with the average cost of the 5 custom plans, and uses the generic plan from then on if it is not much more expensive" }
      - { vi: "Báo lỗi vì kế hoạch hết hạn", en: "Raises an error because the plan expired" }
    answer: 1
    trap: 0
    why: { vi: "\"Luôn lập lại\" đúng với 5 lần đầu, nhưng không phải mãi mãi: với `plan_cache_mode = auto` (mặc định), lần thứ 6 Postgres lập thêm một kế hoạch chung (generic plan) với `$1` chưa biết, rồi so chi phí của nó với chi phí trung bình của 5 kế hoạch riêng (custom plan). Ở đây 5 kế hoạch riêng cho 'lost' (200 dòng, qua index) rất rẻ, nên kế hoạch chung thường thua và Postgres tiếp tục lập riêng. Nếu 5 lần đầu là giá trị đắt như 'delivered', trung bình cao, kế hoạch chung thắng và được dùng cho mọi giá trị về sau. Không có chuyện kế hoạch hết hạn rồi báo lỗi.", en: "\"Always re-plans\" holds for the first 5 runs, not forever: with `plan_cache_mode = auto` (the default), on the 6th run Postgres also builds a generic plan with `$1` unknown and compares its cost with the average cost of the 5 custom plans. Here the 5 custom plans for 'lost' (200 rows, through the index) are very cheap, so the generic plan usually loses and Postgres keeps planning per value. If the first 5 runs use an expensive value like 'delivered', the average is high, the generic plan wins and serves every later value. Plans do not expire and raise an error." }
  - q: { vi: "Một câu đã chuẩn bị chạy chậm thất thường tùy giá trị tham số. Bước chẩn đoán đầu tiên tốt nhất?", en: "A prepared query is erratically slow depending on the parameter. Best first diagnostic step?" }
    options:
      - { vi: "So `EXPLAIN (GENERIC_PLAN)` với `EXPLAIN` có giá trị cụ thể, và xem `generic_plans`/`custom_plans` trong `pg_prepared_statements`", en: "Compare `EXPLAIN (GENERIC_PLAN)` with `EXPLAIN` on a concrete value, and check `generic_plans`/`custom_plans` in `pg_prepared_statements`" }
      - { vi: "Tăng `shared_buffers`", en: "Raise `shared_buffers`" }
      - { vi: "Xóa index trên cột trạng thái", en: "Drop the index on the status column" }
    answer: 0
    trap: 1
    why: { vi: "Tăng `shared_buffers` (vùng đệm trang dùng chung) nghe như chữa được mọi chỗ chậm, nhưng nó không giải thích vì sao chỉ vài giá trị tham số mới chậm. Triệu chứng \"chậm tùy giá trị\" gợi ý Postgres đã chuyển sang một kế hoạch chung không hợp với giá trị phổ biến. Nên trước hết so kế hoạch chung với kế hoạch cho một giá trị cụ thể, và xem `generic_plans` đã tăng chưa. Xóa index thì làm chậm luôn các giá trị hiếm. Khi đã xác nhận, sửa bằng `plan_cache_mode = force_custom_plan` cho phiên hoặc hàm đó, hoặc tách câu cho giá trị phổ biến.", en: "Raising `shared_buffers` (the shared page cache) sounds like a cure for any slowness, but it does not explain why only some parameter values are slow. \"Slow depending on the value\" suggests Postgres switched to a generic plan that does not suit the common values. So first compare the generic plan with the plan for a concrete value, and check whether `generic_plans` has grown. Dropping the index would slow the rare values too. Once confirmed, fix it with `plan_cache_mode = force_custom_plan` for that session or function, or a separate query for the common values." }
---
## Mở bài

Một câu đã chuẩn bị chạy nhanh suốt buổi sáng, rồi buổi chiều cùng câu đó chậm hẳn dù dữ liệu không đổi. Thủ phạm thường không phải dữ liệu mà là kế hoạch mà Postgres đã quyết định dùng lại.

## Ý chính

`PREPARE` (và driver dùng giao thức mở rộng) tách việc lập kế hoạch khỏi việc chạy, để một câu chạy nhiều lần với tham số khác nhau. Có hai loại kế hoạch. Kế hoạch riêng (custom) được lập lại cho đúng giá trị tham số, dùng tần suất của đúng giá trị đó trong danh sách giá trị phổ biến (MCV) và histogram. Kế hoạch chung (generic) dùng cho mọi giá trị, tham số giữ nguyên là `$1`, ước lượng theo độ chọn lọc trung bình của cột.

Luật mặc định, `plan_cache_mode = auto`: 5 lần chạy đầu luôn dùng kế hoạch riêng. Từ lần thứ 6, Postgres lập kế hoạch chung và so chi phí của nó với chi phí trung bình của các kế hoạch riêng (cộng thêm giá lập kế hoạch). Nếu kế hoạch chung không đắt hơn đáng kể, nó được dùng từ đó, khỏi lập lại.

Nhiều người nghĩ câu đã chuẩn bị luôn được lập kế hoạch theo giá trị truyền vào. Thật ra sau 5 lần, Postgres có thể chuyển hẳn sang một kế hoạch chung và không nhìn giá trị nữa.

Bẫy nằm ở dữ liệu lệch. Năm lần đầu toàn giá trị đắt ('delivered', 70 % bảng) thì trung bình cao, kế hoạch chung qua index trông rẻ hơn và thắng. Từ đó mọi lần gọi, kể cả 'delivered', đều đi qua index, chậm hơn đọc tuần tự.

Công cụ chẩn đoán: `pg_prepared_statements` đếm `generic_plans` và `custom_plans`; `EXPLAIN (GENERIC_PLAN)` (từ PostgreSQL 16) cho xem kế hoạch chung của một câu có `$1` mà không cần `PREPARE`; `plan_cache_mode` buộc một loại kế hoạch.

Hình từng bước ở cuối mục này theo một câu đã chuẩn bị trên `parcels` qua hai loại kế hoạch, và chỉ ra lúc kế hoạch chung thôi nhìn giá trị.

## Cú pháp

```sql
PREPARE name [ ( data_type [, ...] ) ] AS statement;
EXECUTE name [ ( value [, ...] ) ];
EXPLAIN [ ( GENERIC_PLAN ) ] statement_with_parameters;
SET plan_cache_mode = { auto | force_custom_plan | force_generic_plan };
DEALLOCATE { name | ALL };
```

- `auto`: 5 lần kế hoạch riêng, rồi so với kế hoạch chung (mặc định).
- `force_custom_plan`: luôn lập lại theo giá trị; tốn giá lập kế hoạch mỗi lần.
- `force_generic_plan`: luôn dùng kế hoạch chung.
- Câu đã chuẩn bị sống tới hết phiên, hoặc tới `DEALLOCATE`.

## Ví dụ

Chuẩn bị câu và xem kế hoạch riêng cho một giá trị hiếm:

```sql
PREPARE by_status(text) AS SELECT * FROM parcels WHERE status = $1;
EXPLAIN (COSTS OFF) EXECUTE by_status('lost');
```

Cùng câu, giá trị phổ biến:

```sql
EXPLAIN (COSTS OFF) EXECUTE by_status('delivered');
```

```sql
SELECT name, generic_plans, custom_plans FROM pg_prepared_statements;
```

'lost' đi qua `parcels_status_idx`, 'delivered' đọc tuần tự: hai kế hoạch riêng khác nhau, ghi hằng số thật trong điều kiện. Bộ đếm cho thấy 0 kế hoạch chung và 2 kế hoạch riêng: mỗi lần `EXPLAIN EXECUTE` cũng tính là một lần lập kế hoạch.

## Lỗi hay gặp

Chuẩn bị lại một tên đã có:

```sql
-- ERROR 42P05: prepared statement "by_status" already exists
PREPARE by_status(text) AS SELECT id FROM parcels WHERE status = $1;
```

Tên câu đã chuẩn bị là duy nhất trong phiên: `DEALLOCATE by_status` trước, hoặc chọn tên khác.

Gọi thiếu tham số:

```sql
-- ERROR 42601: wrong number of parameters for prepared statement "by_status"
EXECUTE by_status;
```

Tin rằng giá trị phổ biến luôn được lập kế hoạch riêng. Ba lần 'delivered' nữa, rồi lần thứ 6:

```sql
-- WRONG: after 5 custom plans the generic index plan wins, even for 'delivered'
EXECUTE by_status('delivered');
EXECUTE by_status('delivered');
EXECUTE by_status('delivered');
EXPLAIN (COSTS OFF) EXECUTE by_status('delivered');
```

```sql
-- FIX: force custom plans for this session
SET plan_cache_mode = force_custom_plan;
EXPLAIN (COSTS OFF) EXECUTE by_status('delivered');
RESET plan_cache_mode;
```

Lần thứ 6 ra kế hoạch chung: điều kiện ghi `$1` và đi qua index, cho một giá trị chiếm 70 % bảng. Trung bình 5 kế hoạch riêng đắt (4 lần đọc cả bảng) làm kế hoạch chung trông rẻ hơn. Với `force_custom_plan`, 'delivered' trở lại Seq Scan.

## Thực hành

Ba bước đọc kế hoạch thật bằng hàm `plan_lines`: kế hoạch chung với `$1`, kế hoạch riêng cho 'delivered', rồi kế hoạch riêng cho 'lost'. Sau đó là hai câu hỏi tình huống.

## Tóm tắt

- Kế hoạch riêng được lập theo giá trị; kế hoạch chung dùng `$1` và độ chọn lọc trung bình.
- Chế độ `auto`: 5 lần riêng, rồi dùng kế hoạch chung nếu nó không đắt hơn trung bình đáng kể.
- Dữ liệu lệch có thể làm kế hoạch chung thắng rồi chạy chậm cho giá trị phổ biến.
- Chẩn đoán bằng `pg_prepared_statements` và `EXPLAIN (GENERIC_PLAN)`; sửa bằng `plan_cache_mode` đúng chỗ.

# EN

## Opening

A prepared query runs fast all morning, then in the afternoon the same query is much slower although the data has not changed. The culprit is usually not the data but the plan Postgres decided to reuse.

## Key idea

`PREPARE` (and drivers using the extended protocol) separates planning from running, so one query can run many times with different parameters. There are two kinds of plan. A custom plan is rebuilt for the exact parameter value, using that value's frequency in the most-common-values (MCV) list and the histogram. A generic plan serves every value, keeps the parameter as `$1`, and is estimated from the column's average selectivity.

The default rule, `plan_cache_mode = auto`: the first 5 runs always use custom plans. From the 6th run, Postgres builds a generic plan and compares its cost with the average cost of the custom plans (plus the price of planning). If the generic plan is not clearly more expensive, it is used from then on, with no more planning.

Many people think a prepared query is always planned for the value passed in. In fact after 5 runs Postgres can switch for good to a generic plan and stop looking at the value.

The trap is skewed data. If the first five runs all use an expensive value ('delivered', 70% of the table), the average is high, the generic index plan looks cheaper and wins. From then on every call, 'delivered' included, goes through the index, slower than a sequential read.

Diagnostic tools: `pg_prepared_statements` counts `generic_plans` and `custom_plans`; `EXPLAIN (GENERIC_PLAN)` (since PostgreSQL 16) shows the generic plan of a query with `$1` without any `PREPARE`; `plan_cache_mode` forces one kind of plan.

The step-through figure at the end of this section follows one prepared query on `parcels` through both kinds of plan, and shows when the generic plan stops looking at the value.

## Syntax

```sql
PREPARE name [ ( data_type [, ...] ) ] AS statement;
EXECUTE name [ ( value [, ...] ) ];
EXPLAIN [ ( GENERIC_PLAN ) ] statement_with_parameters;
SET plan_cache_mode = { auto | force_custom_plan | force_generic_plan };
DEALLOCATE { name | ALL };
```

- `auto`: 5 custom plans, then a comparison with the generic plan (the default).
- `force_custom_plan`: always re-plan for the value; pays the planning price every time.
- `force_generic_plan`: always use the generic plan.
- A prepared statement lives until the session ends, or until `DEALLOCATE`.

## Example

Prepare the query and look at the custom plan for a rare value:

```sql
PREPARE by_status(text) AS SELECT * FROM parcels WHERE status = $1;
EXPLAIN (COSTS OFF) EXECUTE by_status('lost');
```

Same query, a common value:

```sql
EXPLAIN (COSTS OFF) EXECUTE by_status('delivered');
```

```sql
SELECT name, generic_plans, custom_plans FROM pg_prepared_statements;
```

'lost' goes through `parcels_status_idx`, 'delivered' reads sequentially: two different custom plans, each showing the real constant in its condition. The counters show 0 generic and 2 custom plans: each `EXPLAIN EXECUTE` also counts as one planning.

## Common mistakes

Preparing a name that already exists:

```sql
-- ERROR 42P05: prepared statement "by_status" already exists
PREPARE by_status(text) AS SELECT id FROM parcels WHERE status = $1;
```

A prepared statement name is unique within the session: `DEALLOCATE by_status` first, or pick another name.

Calling it without its parameter:

```sql
-- ERROR 42601: wrong number of parameters for prepared statement "by_status"
EXECUTE by_status;
```

Trusting that a common value always gets a custom plan. Three more 'delivered' calls, then the 6th:

```sql
-- WRONG: after 5 custom plans the generic index plan wins, even for 'delivered'
EXECUTE by_status('delivered');
EXECUTE by_status('delivered');
EXECUTE by_status('delivered');
EXPLAIN (COSTS OFF) EXECUTE by_status('delivered');
```

```sql
-- FIX: force custom plans for this session
SET plan_cache_mode = force_custom_plan;
EXPLAIN (COSTS OFF) EXECUTE by_status('delivered');
RESET plan_cache_mode;
```

The 6th call gets the generic plan: its condition reads `$1` and it goes through the index, for a value that is 70% of the table. The expensive average of the 5 custom plans (4 full-table reads) made the generic plan look cheaper. With `force_custom_plan`, 'delivered' goes back to a Seq Scan.

## Practice

Three steps that read real plans with the `plan_lines` function: the generic plan with `$1`, the custom plan for 'delivered', then the custom plan for 'lost'. Then two scenario questions.

## Recap

- A custom plan is built for the value; a generic plan uses `$1` and an average selectivity.
- `auto` mode: 5 custom plans, then the generic plan if it is not clearly more expensive than their average.
- Skewed data can make the generic plan win and then run slowly for a common value.
- Diagnose with `pg_prepared_statements` and `EXPLAIN (GENERIC_PLAN)`; fix with `plan_cache_mode` in the right place.
