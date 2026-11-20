---
id: e-pg-l5-12
engine: postgres
level: L5
module: observe-tune
title: "Tinh chỉnh bộ nhớ: work_mem, sort và hash"
title_en: "Memory tuning: work_mem, sorts and hashes"
kind: lab
runtime: browser
minutes: 15
objectives:
  - { vi: "Đọc `Sort Method` trong `EXPLAIN ANALYZE`: quicksort, top-N heapsort, external merge", en: "Read `Sort Method` in `EXPLAIN ANALYZE`: quicksort, top-N heapsort, external merge" }
  - { vi: "Biết `work_mem` áp cho từng nút sort/hash của từng câu, không phải cho cả server", en: "Know that `work_mem` applies per sort/hash node of each query, not to the whole server" }
  - { vi: "Đề xuất chỉnh `work_mem` ở đúng phạm vi (phiên, vai trò, transaction) thay vì toàn cục", en: "Propose a `work_mem` change at the right scope (session, role, transaction) instead of globally" }
requires: [e-pg-l5-11]
sources:
  - https://www.postgresql.org/docs/18/runtime-config-resource.html
  - https://www.postgresql.org/docs/18/using-explain.html
lab:
  setup: |
    DROP TABLE IF EXISTS big CASCADE;
    CREATE TABLE big (id int, v int);
    INSERT INTO big SELECT g, (g * 7919) % 100000 FROM generate_series(1, 30000) g;
    ANALYZE big;
  steps:
    - task: { vi: "Đọc bốn thiết lập bộ nhớ: `shared_buffers`, `work_mem`, `maintenance_work_mem`, `hash_mem_multiplier` (tên, giá trị, đơn vị; sắp theo tên).", en: "Read four memory settings: `shared_buffers`, `work_mem`, `maintenance_work_mem`, `hash_mem_multiplier` (name, value, unit; ordered by name)." }
      solution: "SELECT name, setting, unit FROM pg_settings WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'hash_mem_multiplier') ORDER BY name"
      check: rows
      ordered: true
      hint: { vi: "`setting` đi kèm `unit`: `shared_buffers` tính theo trang 8 KB.", en: "`setting` comes with `unit`: `shared_buffers` is counted in 8 KB pages." }
    - task: { vi: "10 giá trị `v` nhỏ nhất của `big` (mọi cột, sắp theo `v`). Kế hoạch: Limit trên một Sort.", en: "The 10 smallest `v` values of `big` (every column, ordered by `v`). The plan: a Limit over a Sort." }
      solution: "SELECT * FROM big ORDER BY v LIMIT 10"
      check: plan
      hint: { vi: "ORDER BY rồi LIMIT. Không có index nên phải sắp.", en: "ORDER BY, then LIMIT. There is no index, so it must sort." }
quiz:
  - q: { vi: "Sắp cả 30.000 dòng với `work_mem` mặc định 4 MB. `Sort Method` là gì?", en: "Sorting all 30,000 rows with the default 4 MB `work_mem`. What is the `Sort Method`?" }
    options:
      - { vi: "`quicksort` trong bộ nhớ (khoảng 1,2 MB)", en: "`quicksort` in memory (about 1.2 MB)" }
      - { vi: "`external merge` trên đĩa", en: "`external merge` on disk" }
      - { vi: "`top-N heapsort`", en: "`top-N heapsort`" }
    answer: 0
    why: { vi: "Dữ liệu cần sắp vừa trong 4 MB nên sắp trong bộ nhớ. Giảm `work_mem` xuống 64 KB (ghi lại bên dưới) thì cùng câu chuyển sang `external merge` và ghi đĩa. `top-N heapsort` chỉ xuất hiện khi có LIMIT.", en: "The data to sort fits in 4 MB, so it sorts in memory. Lowering `work_mem` to 64 KB (captured below) moves the same query to `external merge` on disk. `top-N heapsort` only appears with a LIMIT." }
  - q: { vi: "Server 64 GB RAM, 300 kết nối, câu báo cáo có 4 nút sort/hash. Đặt `work_mem = 256MB` toàn cục có rủi ro gì?", en: "A 64 GB server, 300 connections, a report query with 4 sort/hash nodes. What is the risk of a global `work_mem = 256MB`?" }
    options:
      - { vi: "Không rủi ro, Postgres tự giới hạn tổng", en: "No risk, Postgres caps the total" }
      - { vi: "Mỗi nút của mỗi câu được dùng tới 256 MB (hash còn nhân `hash_mem_multiplier`), nên lúc cao điểm tổng có thể vượt RAM và server bị hết bộ nhớ", en: "Every node of every query may use up to 256 MB (hashes times `hash_mem_multiplier`), so at peak the total can exceed RAM and the server runs out of memory" }
      - { vi: "Chỉ ảnh hưởng VACUUM", en: "It only affects VACUUM" }
    answer: 1
    why: { vi: "Docs chính thức: một câu phức tạp có thể chạy nhiều sort/hash song song, mỗi cái dùng tới `work_mem`, và nhiều phiên làm cùng lúc. Cách đúng: giữ mặc định thấp, nâng cho phiên hoặc vai trò báo cáo (`SET work_mem`, `ALTER ROLE … SET work_mem`).", en: "The docs: a complex query can run several sorts/hashes at once, each up to `work_mem`, and many sessions do it at the same time. The right way: keep the default low, raise it for the reporting session or role (`SET work_mem`, `ALTER ROLE … SET work_mem`)." }
---

## Ý chính

- `work_mem` (mặc định 4 MB) là giới hạn bộ nhớ cho mỗi nút sort hoặc hash trong mỗi câu. Hash được dùng tới `work_mem` × `hash_mem_multiplier` (mặc định 2).
- Vượt giới hạn thì tràn đĩa: sort thành `external merge Disk: …`, hash chia thành nhiều `Batches`. `pg_stat_statements.temp_blks_written` và `log_temp_files` cho thấy câu nào tràn.
- `maintenance_work_mem` (mặc định 64 MB) dành cho `CREATE INDEX`, `VACUUM`, `ALTER TABLE ADD FOREIGN KEY`; nâng nó giúp tạo index nhanh hơn.
- `shared_buffers` (mặc định 128 MB) là bộ đệm trang chung; `effective_cache_size` chỉ là gợi ý cho planner, không cấp phát gì.
- Có LIMIT thì Postgres dùng `top-N heapsort`: chỉ giữ N dòng tốt nhất, rất ít bộ nhớ.

## Ví dụ

Kết quả thật trên PGlite, 30.000 dòng:

```text
work_mem = 4MB (default):
Sort (actual rows=30000.00 loops=1)
  Sort Key: v
  Sort Method: quicksort  Memory: 1216kB

work_mem = 64kB (captured with SET in a multi-statement script):
Sort (actual rows=30000.00 loops=1)
  Sort Key: v
  Sort Method: external merge  Disk: 544kB

ORDER BY v LIMIT 10:
Limit (actual rows=10.00 loops=1)
  ->  Sort (actual rows=10.00 loops=1)
        Sort Method: top-N heapsort  Memory: 17kB
```

## Thực hành

Đọc thiết lập bộ nhớ, viết một câu top-N, rồi trả lời về `Sort Method` dựa trên kết quả thật ở trên. Kỹ năng chuyên gia: đọc dấu hiệu tràn đĩa trong kế hoạch và tăng bộ nhớ đúng chỗ, không làm cả server có nguy cơ hết RAM.

# EN

## Key idea

- `work_mem` (default 4 MB) is the memory limit for each sort or hash node in each query. A hash may use `work_mem` × `hash_mem_multiplier` (default 2).
- Over the limit, it spills to disk: a sort becomes `external merge Disk: …`, a hash splits into several `Batches`. `pg_stat_statements.temp_blks_written` and `log_temp_files` show which queries spill.
- `maintenance_work_mem` (default 64 MB) is for `CREATE INDEX`, `VACUUM`, `ALTER TABLE ADD FOREIGN KEY`; raising it speeds up index builds.
- `shared_buffers` (default 128 MB) is the shared page cache; `effective_cache_size` is only a hint to the planner and allocates nothing.
- With a LIMIT, Postgres uses `top-N heapsort`: it keeps only the best N rows, using very little memory.

## Example

Real output from PGlite, 30,000 rows:

```text
work_mem = 4MB (default):
Sort (actual rows=30000.00 loops=1)
  Sort Key: v
  Sort Method: quicksort  Memory: 1216kB

work_mem = 64kB (captured with SET in a multi-statement script):
Sort (actual rows=30000.00 loops=1)
  Sort Key: v
  Sort Method: external merge  Disk: 544kB

ORDER BY v LIMIT 10:
Limit (actual rows=10.00 loops=1)
  ->  Sort (actual rows=10.00 loops=1)
        Sort Method: top-N heapsort  Memory: 17kB
```

## Practice

Read the memory settings, write a top-N query, then answer about the `Sort Method` from the real output above. Expert skill: read the spill signs in a plan and raise memory in the right place, without putting the whole server at risk of running out of RAM.
