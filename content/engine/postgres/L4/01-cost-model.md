---
id: e-pg-l4-01
engine: postgres
level: L4
module: planner-stats
title: "Mô hình chi phí: chi phí của kế hoạch từ đâu ra"
title_en: "The cost model: where a plan's cost comes from"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Tính lại chi phí của một Seq Scan từ relpages, reltuples và các hằng số chi phí", en: "Recompute a Seq Scan's cost from relpages, reltuples and the cost constants" }
  - { vi: "Giải thích vì sao chi phí là đơn vị ước lượng, không phải mili giây", en: "Explain why cost is an estimate unit, not milliseconds" }
  - { vi: "Biết hằng số nào đổi khi bảng nằm trên SSD hoặc gần như nằm hết trong RAM", en: "Know which constants to change when the data sits on SSD or mostly in RAM" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/runtime-config-query.html
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/planner-stats.html
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS parcels CASCADE;
    CREATE TABLE parcels (id int PRIMARY KEY, hub int NOT NULL, status text NOT NULL, day int NOT NULL, weight int NOT NULL);
    INSERT INTO parcels
      SELECT g, g % 20 + 1,
             CASE WHEN g % 100 < 70 THEN 'delivered' WHEN g % 100 < 90 THEN 'in_transit' WHEN g % 100 < 99 THEN 'returned' ELSE 'lost' END,
             (g - 1) / 100 + 1, (g * 7919) % 5000
      FROM generate_series(1, 20000) g;
    ANALYZE parcels;
  steps:
    - task: { vi: "Đọc số trang và số dòng mà planner đang tin cho bảng `parcels` (hai cột: relpages, reltuples).", en: "Read the page count and row count the planner believes for `parcels` (two columns: relpages, reltuples)." }
      solution: "SELECT relpages, reltuples FROM pg_class WHERE relname = 'parcels'"
      check: rows
      hint: { vi: "Hai con số này nằm trong `pg_class`, được ANALYZE/VACUUM cập nhật.", en: "Both numbers live in `pg_class` and are refreshed by ANALYZE/VACUUM." }
    - task: { vi: "Tính chi phí Seq Scan của `SELECT * FROM parcels` bằng công thức: số trang × `seq_page_cost` + số dòng × `cpu_tuple_cost`. Đọc hai hằng số bằng `current_setting`. Một cột tên seq_cost.", en: "Compute the Seq Scan cost of `SELECT * FROM parcels` with the formula pages × `seq_page_cost` + rows × `cpu_tuple_cost`. Read both constants with `current_setting`. One column named seq_cost." }
      solution: "SELECT relpages * current_setting('seq_page_cost')::float8 + reltuples * current_setting('cpu_tuple_cost')::float8 AS seq_cost FROM pg_class WHERE relname = 'parcels'"
      check: rows
      hint: { vi: "`current_setting` trả về text, nhớ ép sang `float8`.", en: "`current_setting` returns text, so cast it to `float8`." }
    - task: { vi: "Thêm điều kiện lọc làm Postgres phải tính thêm một phép so sánh trên mỗi dòng: viết câu đọc mọi cột của các kiện nặng hơn 100 để planner chọn Seq Scan có Filter.", en: "Add a filter that makes Postgres pay one more comparison per row: read every column of the parcels heavier than 100 so the planner picks a Seq Scan with a Filter." }
      solution: "SELECT * FROM parcels WHERE weight > 100"
      check: plan
      hint: { vi: "Gần như mọi dòng đều thỏa điều kiện, nên đọc tuần tự vẫn rẻ nhất.", en: "Almost every row matches, so a sequential read is still the cheapest." }
predict:
  sql: "SELECT * FROM parcels WHERE weight > 100"
  q: { vi: "Không lọc, Seq Scan trên `parcels` có chi phí 348. Thêm `WHERE weight > 100` thì chi phí tổng là bao nhiêu?", en: "Without a filter the Seq Scan on `parcels` costs 348. With `WHERE weight > 100`, what is the total cost?" }
  options:
    - { vi: "Vẫn 348, vì số trang đọc không đổi", en: "Still 348, because the number of pages read does not change" }
    - { vi: "398: thêm 20.000 × `cpu_operator_cost` (0,0025) cho phép so sánh", en: "398: plus 20,000 × `cpu_operator_cost` (0.0025) for the comparison" }
    - { vi: "Thấp hơn 348, vì ít dòng được trả về hơn", en: "Below 348, because fewer rows come back" }
  answer: 1
  trap: 0
  why: { vi: "\"Vẫn 348\" sai vì số trang không đổi nhưng phép so sánh `weight > 100` trên mỗi dòng cũng có giá. 348 = 148 trang × 1 + 20.000 dòng × 0,01. Có bộ lọc, planner vẫn đọc đủ 148 trang và 20.000 dòng, rồi cộng một toán tử cho mỗi dòng: 348 + 20.000 × 0,0025 = 398. \"Thấp hơn 348\" cũng sai: chi phí (cost) tính công việc phải làm, không tính số dòng trả về; dòng bị loại vẫn phải được đọc và kiểm tra.", en: "\"Still 348\" is wrong: the pages do not change, but the `weight > 100` comparison on each row has a price too. 348 = 148 pages × 1 + 20,000 rows × 0.01. With the filter the planner still reads all 148 pages and 20,000 rows, then adds one operator per row: 348 + 20,000 × 0.0025 = 398. \"Below 348\" is wrong too: cost counts the work done, not the rows returned; a rejected row must still be read and checked." }
  expect: { node: Seq Scan, table: parcels }
quiz:
  - q: { vi: "`EXPLAIN` in `cost=0.00..348.00` cho một câu. Con số 348 nói gì?", en: "`EXPLAIN` prints `cost=0.00..348.00` for a query. What does 348 tell you?" }
    options:
      - { vi: "Câu sẽ chạy khoảng 348 mili giây", en: "The query will run for about 348 milliseconds" }
      - { vi: "Chi phí tổng ước lượng, tính bằng đơn vị \"một trang đọc tuần tự\", chỉ dùng để so các kế hoạch với nhau", en: "The estimated total cost, in units of \"one page read sequentially\", only meant for comparing plans" }
      - { vi: "Câu sẽ trả về 348 dòng", en: "The query will return 348 rows" }
    answer: 1
    trap: 0
    why: { vi: "Con số trông giống thời gian, nhưng planner không đo gì cả: nó cộng giá đọc trang và giá xử lý dòng theo các hằng số, với mốc `seq_page_cost` = 1 cho một trang đọc tuần tự. Vì không gắn với tốc độ máy, cùng chi phí 348 có thể chạy 2 ms trên máy này và 200 ms trên máy khác; thời gian thật chỉ có trong `EXPLAIN ANALYZE`. Đó cũng không phải số dòng: ước lượng số dòng (row estimate) nằm riêng ở `rows=`.", en: "The figure looks like a time, but the planner measures nothing: it adds up page reads and row work priced by constants, with `seq_page_cost` = 1 for one page read in order as the reference. Since it is not tied to machine speed, the same cost of 348 can take 2 ms on one machine and 200 ms on another; real time only shows in `EXPLAIN ANALYZE`. It is not a row count either: the row estimate is separate, in `rows=`." }
---
## Mở bài

Hai kế hoạch cho cùng một câu: một cái ghi `cost=348`, cái kia `cost=295`. Planner chọn cái rẻ hơn, nhưng 348 là 348 cái gì, và ai quyết định một trang đọc đắt hơn một dòng bao nhiêu?

## Ý chính

Chi phí (cost) trong `EXPLAIN` là một đơn vị quy ước. Mốc là đọc một trang 8 KB theo thứ tự, `seq_page_cost` = 1. Mọi việc khác được định giá so với mốc đó: đọc một trang ở vị trí ngẫu nhiên `random_page_cost` = 4, xử lý một dòng `cpu_tuple_cost` = 0,01, xử lý một mục index `cpu_index_tuple_cost` = 0,005, tính một toán tử hay hàm `cpu_operator_cost` = 0,0025.

Seq Scan không lọc tốn `relpages × seq_page_cost + reltuples × cpu_tuple_cost`. Mỗi điều kiện trong `Filter` cộng thêm `cpu_operator_cost` trên mỗi dòng đọc được, kể cả dòng bị loại. Hai số trong `cost=a..b` là chi phí khởi động (trước dòng đầu tiên) và chi phí tổng.

Nhiều người nghĩ chi phí là mili giây. Thật ra planner không đo gì: nó chỉ cộng các con số trên để so các kế hoạch của cùng một câu. Thời gian thật chỉ có khi chạy `EXPLAIN ANALYZE`.

Số trang và số dòng nằm trong `pg_class` (`relpages`, `reltuples`), được `ANALYZE` và `VACUUM` cập nhật. Khi bảng lớn lên mà chưa ANALYZE, planner vẫn đọc số trang thật của file và nhân với mật độ dòng cũ, nên tổng số dòng ước lượng không lệch xa; thứ bị cũ là thống kê từng cột, như tần suất giá trị.

Hằng số là của phiên hoặc server, đổi được bằng `SET`. Dữ liệu trên SSD hay gần như nằm hết trong RAM thì đọc ngẫu nhiên gần rẻ bằng đọc tuần tự, nên người ta hạ `random_page_cost` xuống khoảng 1,1. Đổi một hằng số là đổi cả mô hình, nên đo trên tải thật trước khi đổi cho cả server.

## Cú pháp

```sql
EXPLAIN [ ( [ ANALYZE ] [, COSTS { ON | OFF } ] [, FORMAT { TEXT | JSON } ] ) ] statement;
SET cost_parameter = value;
RESET cost_parameter;
SELECT relpages, reltuples FROM pg_class WHERE relname = 'table_name';
```

- `cost=a..b`: chi phí khởi động .. chi phí tổng, cùng đơn vị với `seq_page_cost`.
- `rows=`: số dòng ước lượng mà nút này trả lên.
- `SET`: đổi hằng số cho phiên hiện tại; `RESET` trả về giá trị mặc định.

## Ví dụ

Kế hoạch của cả bảng và năm hằng số đang dùng:

```sql
EXPLAIN SELECT * FROM parcels;
```

```sql
SELECT name, setting FROM pg_settings
WHERE name IN ('seq_page_cost', 'random_page_cost', 'cpu_tuple_cost', 'cpu_index_tuple_cost', 'cpu_operator_cost')
ORDER BY name;
```

Bảng có 148 trang và 20.000 dòng: 148 × 1 + 20.000 × 0,01 = 348, đúng con số trong kế hoạch.

Hai điều kiện lọc là hai toán tử trên mỗi dòng:

```sql
EXPLAIN SELECT * FROM parcels WHERE hub = 3 AND weight > 100;
```

Chi phí là 448 = 348 + 2 × 20.000 × 0,0025. Số dòng ước lượng giảm còn khoảng 980, nhưng chi phí tăng vì mọi dòng vẫn phải được kiểm tra.

Hạ giá đọc ngẫu nhiên thì đường đi qua index rẻ đi:

```sql
EXPLAIN SELECT * FROM parcels WHERE id < 8000;
```

```sql
SET random_page_cost = 1.1;
EXPLAIN SELECT * FROM parcels WHERE id < 8000;
RESET random_page_cost;
```

Cùng Index Scan trên `parcels_pkey`, chi phí tổng giảm từ khoảng 295 xuống khoảng 226 khi `random_page_cost` = 1,1. Với một câu khác, sự chênh đó đủ để planner đổi hẳn từ Seq Scan sang index.

## Lỗi hay gặp

Tự tính chi phí mà quên `current_setting` trả về text:

```sql
-- ERROR 42883: operator does not exist: integer * text
SELECT relpages * current_setting('seq_page_cost') FROM pg_class WHERE relname = 'parcels';
```

Ép sang số trước khi nhân: `current_setting('seq_page_cost')::float8`.

Nạp nhiều dữ liệu rồi tin ngay vào ước lượng. Ở đây ta thêm 20.000 kiện, toàn bộ là 'delivered':

```sql
-- WRONG: column statistics still describe the old data
INSERT INTO parcels
SELECT g, g % 20 + 1, 'delivered', (g - 1) / 100 + 1, g % 5000
FROM generate_series(20001, 40000) AS g;
EXPLAIN SELECT * FROM parcels WHERE status = 'delivered';
```

```sql
-- FIX: refresh the statistics after a big load
ANALYZE parcels;
EXPLAIN SELECT * FROM parcels WHERE status = 'delivered';
```

Trước ANALYZE, planner đã thấy bảng gấp đôi số trang nên ước lượng tổng gần 40.000 dòng, nhưng vẫn dùng tần suất cũ 70 % cho 'delivered': khoảng 27.900 dòng, trong khi thật là 34.000. Sau ANALYZE ước lượng về gần 34.000. Hãy ANALYZE ngay sau mỗi lần nạp lớn thay vì chờ autovacuum.

## Thực hành

Ba bước: đọc `pg_class`, tự tính chi phí Seq Scan bằng SQL, rồi viết một câu mà planner phải trả thêm giá lọc. Sau đó là hai câu hỏi.

## Tóm tắt

- Chi phí là đơn vị quy ước (một trang đọc tuần tự = 1), chỉ để so kế hoạch, không phải mili giây.
- Seq Scan = `relpages × seq_page_cost + reltuples × cpu_tuple_cost`, cộng `cpu_operator_cost` cho mỗi toán tử trên mỗi dòng.
- `random_page_cost` mặc định 4; trên SSD hay dữ liệu nằm trong RAM thường hạ xuống khoảng 1,1.
- Sau một lần nạp lớn, chạy `ANALYZE` để thống kê cột theo kịp dữ liệu.

# EN

## Opening

Two plans for the same query: one says `cost=348`, the other `cost=295`. The planner picks the cheaper one, but 348 of what, and who decides how much more a page read costs than a row?

## Key idea

The cost in `EXPLAIN` is a made-up unit. The reference is reading one 8 KB page in order, `seq_page_cost` = 1. Everything else is priced against it: reading a page at a random place `random_page_cost` = 4, processing one row `cpu_tuple_cost` = 0.01, processing one index entry `cpu_index_tuple_cost` = 0.005, evaluating one operator or function `cpu_operator_cost` = 0.0025.

An unfiltered Seq Scan costs `relpages × seq_page_cost + reltuples × cpu_tuple_cost`. Each condition in the `Filter` adds `cpu_operator_cost` for every row read, rejected rows included. The two numbers in `cost=a..b` are the startup cost (before the first row) and the total cost.

Many people think cost is milliseconds. In fact the planner measures nothing: it only adds up these figures to compare the plans of one query. Real time only appears when you run `EXPLAIN ANALYZE`.

Page and row counts live in `pg_class` (`relpages`, `reltuples`) and are refreshed by `ANALYZE` and `VACUUM`. When a table grows before an ANALYZE, the planner still reads the file's real page count and multiplies it by the old row density, so the total row estimate stays close; what goes stale is the per-column statistics, such as value frequencies.

The constants belong to the session or the server and can be changed with `SET`. On SSD, or when the data mostly fits in RAM, a random read costs almost as little as a sequential one, so people lower `random_page_cost` to about 1.1. Changing a constant changes the whole model, so measure on the real workload before changing it for the server.

## Syntax

```sql
EXPLAIN [ ( [ ANALYZE ] [, COSTS { ON | OFF } ] [, FORMAT { TEXT | JSON } ] ) ] statement;
SET cost_parameter = value;
RESET cost_parameter;
SELECT relpages, reltuples FROM pg_class WHERE relname = 'table_name';
```

- `cost=a..b`: startup cost .. total cost, in the same unit as `seq_page_cost`.
- `rows=`: the estimated number of rows this node returns.
- `SET`: changes a constant for the current session; `RESET` goes back to the default.

## Example

The plan for the whole table and the five constants in use:

```sql
EXPLAIN SELECT * FROM parcels;
```

```sql
SELECT name, setting FROM pg_settings
WHERE name IN ('seq_page_cost', 'random_page_cost', 'cpu_tuple_cost', 'cpu_index_tuple_cost', 'cpu_operator_cost')
ORDER BY name;
```

The table has 148 pages and 20,000 rows: 148 × 1 + 20,000 × 0.01 = 348, exactly the figure in the plan.

Two filter conditions are two operators per row:

```sql
EXPLAIN SELECT * FROM parcels WHERE hub = 3 AND weight > 100;
```

The cost is 448 = 348 + 2 × 20,000 × 0.0025. The row estimate drops to about 980, yet the cost goes up because every row must still be checked.

Lower the price of a random read and the index path gets cheaper:

```sql
EXPLAIN SELECT * FROM parcels WHERE id < 8000;
```

```sql
SET random_page_cost = 1.1;
EXPLAIN SELECT * FROM parcels WHERE id < 8000;
RESET random_page_cost;
```

Same Index Scan on `parcels_pkey`, but the total cost falls from about 295 to about 226 with `random_page_cost` = 1.1. For another query, a gap like that is enough to switch the planner from a Seq Scan to the index.

## Common mistakes

Computing a cost by hand and forgetting that `current_setting` returns text:

```sql
-- ERROR 42883: operator does not exist: integer * text
SELECT relpages * current_setting('seq_page_cost') FROM pg_class WHERE relname = 'parcels';
```

Cast to a number before multiplying: `current_setting('seq_page_cost')::float8`.

Loading a lot of data and trusting the estimate right away. Here we add 20,000 parcels, all 'delivered':

```sql
-- WRONG: column statistics still describe the old data
INSERT INTO parcels
SELECT g, g % 20 + 1, 'delivered', (g - 1) / 100 + 1, g % 5000
FROM generate_series(20001, 40000) AS g;
EXPLAIN SELECT * FROM parcels WHERE status = 'delivered';
```

```sql
-- FIX: refresh the statistics after a big load
ANALYZE parcels;
EXPLAIN SELECT * FROM parcels WHERE status = 'delivered';
```

Before ANALYZE the planner already sees twice the pages, so its total is close to 40,000 rows, but it still uses the old 70% frequency for 'delivered': about 27,900 rows, while the truth is 34,000. After ANALYZE the estimate comes back close to 34,000. Run ANALYZE right after each big load instead of waiting for autovacuum.

## Practice

Three steps: read `pg_class`, compute the Seq Scan cost yourself in SQL, then write a query that makes the planner pay for a filter. Then two questions.

## Recap

- Cost is a made-up unit (one page read in order = 1), only for comparing plans, not milliseconds.
- Seq Scan = `relpages × seq_page_cost + reltuples × cpu_tuple_cost`, plus `cpu_operator_cost` for each operator on each row.
- `random_page_cost` defaults to 4; on SSD or with data in RAM it is often lowered to about 1.1.
- After a big load, run `ANALYZE` so column statistics catch up with the data.
