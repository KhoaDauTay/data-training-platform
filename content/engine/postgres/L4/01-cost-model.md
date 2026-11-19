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
    - { vi: "398: thêm 20000 × `cpu_operator_cost` (0.0025) cho phép so sánh", en: "398: plus 20000 × `cpu_operator_cost` (0.0025) for the comparison" }
    - { vi: "Thấp hơn 348, vì ít dòng được trả về hơn", en: "Below 348, because fewer rows come back" }
  answer: 1
  why: { vi: "Planner vẫn đọc mọi trang và mọi dòng, rồi tính thêm một toán tử trên mỗi dòng: 348 + 20000 × 0.0025 = 398. Số dòng ước lượng giảm, nhưng công việc thì không.", en: "The planner still reads every page and every row, then charges one operator per row: 348 + 20000 × 0.0025 = 398. The row estimate drops, the work does not." }
---

## Ý chính

- "Chi phí" trong `EXPLAIN` là đơn vị tùy ý mà planner dùng để so sánh các kế hoạch. Mặc định một trang đọc tuần tự = 1.0 (`seq_page_cost`). Nó không phải mili giây.
- Năm hằng số chính và giá trị mặc định: `seq_page_cost` 1.0, `random_page_cost` 4.0, `cpu_tuple_cost` 0.01, `cpu_index_tuple_cost` 0.005, `cpu_operator_cost` 0.0025. Thêm `effective_cache_size` (4GB) cho biết bao nhiêu dữ liệu có thể nằm sẵn trong bộ đệm.
- Seq Scan không lọc: `relpages × seq_page_cost + reltuples × cpu_tuple_cost`. Mỗi điều kiện trong `Filter` cộng thêm `cpu_operator_cost` trên mỗi dòng.
- `relpages` và `reltuples` trong `pg_class` chỉ được cập nhật khi VACUUM, ANALYZE hoặc vài lệnh DDL chạy. Thống kê cũ → chi phí sai → kế hoạch sai.
- Tinh chỉnh: dữ liệu trên SSD hoặc gần như nằm hết trong RAM thì đọc ngẫu nhiên gần rẻ bằng đọc tuần tự, nên người ta hạ `random_page_cost` (ví dụ 1.1). Đổi hằng số là đổi cả mô hình, nên hãy đo trên tải thật trước.

## Ví dụ

Kết quả thật trên PGlite (PostgreSQL 18.6), bảng `parcels` 20000 dòng, 148 trang:

```text
EXPLAIN SELECT * FROM parcels;
Seq Scan on parcels  (cost=0.00..348.00 rows=20000 width=26)

EXPLAIN SELECT * FROM parcels WHERE weight > 100;
Seq Scan on parcels  (cost=0.00..398.00 rows=19596 width=26)
  Filter: (weight > 100)
```

148 × 1.0 + 20000 × 0.01 = 348. Thêm một phép so sánh: 348 + 20000 × 0.0025 = 398. Hai số trong `cost=a..b` là chi phí khởi động (trước dòng đầu tiên) và chi phí tổng.

## Thực hành

Ba bước: đọc `pg_class`, tự tính chi phí bằng SQL, rồi viết một câu mà planner phải trả thêm chi phí lọc. Kỹ năng chuyên gia: nhìn một con số `cost` là biết nó đến từ đâu và hằng số nào đang làm planner chọn sai.

# EN

## Key idea

- The "cost" in `EXPLAIN` is an arbitrary unit the planner uses to compare plans. By default one sequentially read page = 1.0 (`seq_page_cost`). It is not milliseconds.
- The five main constants and their defaults: `seq_page_cost` 1.0, `random_page_cost` 4.0, `cpu_tuple_cost` 0.01, `cpu_index_tuple_cost` 0.005, `cpu_operator_cost` 0.0025. `effective_cache_size` (4GB) also tells the planner how much data may already be cached.
- An unfiltered Seq Scan costs `relpages × seq_page_cost + reltuples × cpu_tuple_cost`. Each condition in `Filter` adds `cpu_operator_cost` per row.
- `relpages` and `reltuples` in `pg_class` are only refreshed by VACUUM, ANALYZE and a few DDL commands. Stale statistics mean wrong costs, and wrong costs mean wrong plans.
- Tuning: on SSD, or when the data mostly fits in RAM, a random read costs almost as little as a sequential one, so people lower `random_page_cost` (for example to 1.1). Changing a constant changes the whole model, so measure on the real workload first.

## Example

Real output from PGlite (PostgreSQL 18.6), table `parcels` with 20000 rows in 148 pages:

```text
EXPLAIN SELECT * FROM parcels;
Seq Scan on parcels  (cost=0.00..348.00 rows=20000 width=26)

EXPLAIN SELECT * FROM parcels WHERE weight > 100;
Seq Scan on parcels  (cost=0.00..398.00 rows=19596 width=26)
  Filter: (weight > 100)
```

148 × 1.0 + 20000 × 0.01 = 348. One comparison more: 348 + 20000 × 0.0025 = 398. The two numbers in `cost=a..b` are the startup cost (before the first row) and the total cost.

## Practice

Three steps: read `pg_class`, compute the cost yourself in SQL, then write a query that makes the planner pay for a filter. Expert skill: look at a `cost` figure and know where it comes from and which constant is pushing the planner the wrong way.
