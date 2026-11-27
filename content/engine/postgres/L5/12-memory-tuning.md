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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đọc `Sort Method` trong `EXPLAIN ANALYZE`: quicksort, top-N heapsort, external merge", en: "Read `Sort Method` in `EXPLAIN ANALYZE`: quicksort, top-N heapsort, external merge" }
  - { vi: "Biết `work_mem` áp cho từng nút sort/hash của từng câu, không phải cho cả server", en: "Know that `work_mem` applies per sort/hash node of each query, not to the whole server" }
  - { vi: "Đề xuất chỉnh `work_mem` ở đúng phạm vi (phiên, vai trò, transaction) thay vì toàn cục", en: "Propose a `work_mem` change at the right scope (session, role, transaction) instead of globally" }
requires: [e-pg-l5-11]
sources:
  - { url: https://www.postgresql.org/docs/18/runtime-config-resource.html, title_vi: "Cấu hình tài nguyên (bộ nhớ)" }
  - { url: https://www.postgresql.org/docs/18/using-explain.html, title_vi: "Dùng EXPLAIN" }
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
    - task: { vi: "Ai được đổi thiết lập nào, và đổi ở đâu? Với bốn thiết lập của bước 1, đọc tên và `context` (sắp theo tên).", en: "Who may change which setting, and where? For the four settings of step 1, read the name and `context` (ordered by name)." }
      solution: "SELECT name, context FROM pg_settings WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'hash_mem_multiplier') ORDER BY name"
      check: rows
      ordered: true
      hint: { vi: "Cột `context` của `pg_settings`.", en: "The `context` column of `pg_settings`." }
      fact:
        vi: "`shared_buffers` là `postmaster`: chỉ đổi khi khởi động lại server. Ba thiết lập còn lại là `user`: mỗi phiên, vai trò hay transaction tự đặt được."
        en: "`shared_buffers` is `postmaster`: it only changes with a server restart. The other three are `user`: each session, role or transaction can set them."
        probe: "SELECT string_agg(name || '=' || context, ', ' ORDER BY name) FROM pg_settings WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'hash_mem_multiplier')"
        expect: [["hash_mem_multiplier=user, maintenance_work_mem=user, shared_buffers=postmaster, work_mem=user"]]
quiz:
  - q: { vi: "Sắp cả 30.000 dòng với `work_mem` mặc định 4 MB. `Sort Method` là gì?", en: "Sorting all 30,000 rows with the default 4 MB `work_mem`. What is the `Sort Method`?" }
    options:
      - { vi: "`quicksort` trong bộ nhớ (khoảng 1,2 MB)", en: "`quicksort` in memory (about 1.2 MB)" }
      - { vi: "`external merge` trên đĩa", en: "`external merge` on disk" }
      - { vi: "`top-N heapsort`", en: "`top-N heapsort`" }
    answer: 0
    trap: 1
    why: { vi: "30.000 dòng nghe nhiều nên dễ đoán là sắp trên đĩa, nhưng điều quyết định là dung lượng dữ liệu cần sắp, không phải số dòng: khoảng 1,2 MB, vừa trong 4 MB `work_mem`, nên Postgres sắp trong bộ nhớ bằng quicksort. Giảm `work_mem` xuống 64 KB (phần Ví dụ) thì cùng câu tràn ra đĩa (spill to disk) và chuyển sang `external merge`. `top-N heapsort` chỉ xuất hiện khi có LIMIT: Postgres giữ N dòng đứng đầu thay vì sắp hết.", en: "30,000 rows sounds like a lot, so a disk sort is easy to guess, but what decides is the size of the data to sort, not the row count: about 1.2 MB, which fits in the 4 MB `work_mem`, so Postgres sorts in memory with quicksort. Lowering `work_mem` to 64 KB (the Example section) makes the same query spill to disk and switch to `external merge`. `top-N heapsort` only appears with a LIMIT: Postgres keeps the top N rows instead of sorting everything." }
  - q: { vi: "Server 64 GB RAM, 300 kết nối, câu báo cáo có 4 nút sort/hash. Đặt `work_mem = 256MB` toàn cục có rủi ro gì?", en: "A 64 GB server, 300 connections, a report query with 4 sort/hash nodes. What is the risk of a global `work_mem = 256MB`?" }
    options:
      - { vi: "Không rủi ro, Postgres tự giới hạn tổng", en: "No risk, Postgres caps the total" }
      - { vi: "Mỗi nút của mỗi câu được dùng tới 256 MB (hash còn nhân `hash_mem_multiplier`), nên lúc cao điểm tổng có thể vượt RAM và server bị hết bộ nhớ", en: "Every node of every query may use up to 256 MB (hashes times `hash_mem_multiplier`), so at peak the total can exceed RAM and the server runs out of memory" }
      - { vi: "Chỉ ảnh hưởng VACUUM", en: "It only affects VACUUM" }
    answer: 1
    trap: 0
    why: { vi: "\"Postgres tự giới hạn tổng\" sai: `work_mem` không phải ngân sách chung mà là giới hạn cho từng nút sort/hash của từng câu. Lúc cao điểm: 300 kết nối × 4 nút × 256 MB ≈ 300 GB (nút hash còn được nhân `hash_mem_multiplier`), gần gấp 5 lần 64 GB RAM, nên server có thể hết bộ nhớ. Không chỉ ảnh hưởng VACUUM: VACUUM dùng `maintenance_work_mem`, còn `work_mem` áp cho câu truy vấn thường. Cách đúng: giữ mặc định thấp, chỉ nâng cho phiên hoặc vai trò báo cáo (`SET work_mem`, `ALTER ROLE … SET work_mem`).", en: "\"Postgres caps the total\" is wrong: `work_mem` is not a shared budget but a limit per sort/hash node of each query. At peak: 300 connections × 4 nodes × 256 MB ≈ 300 GB (hash nodes are further multiplied by `hash_mem_multiplier`), almost 5 times the 64 GB of RAM, so the server can run out of memory. It does not only affect VACUUM: VACUUM uses `maintenance_work_mem`, while `work_mem` applies to ordinary queries. The right way: keep the default low and raise it only for the reporting session or role (`SET work_mem`, `ALTER ROLE … SET work_mem`)." }
---
## Mở bài

Báo cáo cuối tháng chạy 40 giây, và `EXPLAIN ANALYZE` có dòng `Sort Method: external merge  Disk: …`. Có người đề xuất đặt `work_mem = 1GB` cho cả server. Nên tăng bộ nhớ ở đâu, và tăng bao nhiêu thì an toàn?

## Ý chính

`work_mem` (mặc định 4 MB) là giới hạn bộ nhớ cho mỗi nút sort hoặc hash trong mỗi câu. Nút hash được dùng tới `work_mem` × `hash_mem_multiplier` (mặc định 2). Vượt giới hạn thì tràn ra đĩa: sort thành `external merge  Disk: …`, hash chia thành nhiều `Batches`. Với `work_mem` quá nhỏ, planner còn đổi hẳn kế hoạch, ví dụ bỏ `HashAggregate` để sắp rồi gom. Có LIMIT thì Postgres dùng `top-N heapsort`, chỉ giữ N dòng tốt nhất trong bộ nhớ.

Nhiều người nghĩ `work_mem` là một ngân sách chung cho cả server. Thật ra nó là giới hạn cho từng nút: một câu có bốn nút sort/hash dùng tới bốn lần, và 300 phiên làm cùng lúc thì nhân tiếp. Vì vậy giữ mặc định thấp và chỉ nâng cho phiên, vai trò hay transaction cần nó.

`maintenance_work_mem` (mặc định 64 MB) dành cho `CREATE INDEX`, `VACUUM`, thêm khóa ngoại; nâng nó giúp tạo index nhanh hơn. `shared_buffers` (mặc định 128 MB) là bộ đệm trang chung, chỉ đổi khi khởi động lại. `effective_cache_size` chỉ là gợi ý cho planner, không cấp phát gì. Dấu hiệu tràn đĩa trên server thật: `temp_blks_written` trong `pg_stat_statements` và `log_temp_files`.

## Cú pháp

```sql
SET work_mem = 'value';
BEGIN; SET LOCAL work_mem = 'value'; ... COMMIT;
ALTER ROLE role_name SET work_mem = 'value';
RESET work_mem;
EXPLAIN (ANALYZE [, BUFFERS ] [, TIMING OFF ]) query;
```

- `SET`: cho đến hết phiên; `SET LOCAL`: chỉ tới hết transaction.
- `ALTER ROLE ... SET`: áp từ phiên kế tiếp của vai trò đó.
- `value`: có đơn vị (`kB`, `MB`, `GB`); không ghi đơn vị thì tính bằng kB.
- `Sort Method` và `Batches` trong `EXPLAIN ANALYZE` cho biết có tràn đĩa không.

## Ví dụ

Sắp cả 30.000 dòng với `work_mem` mặc định:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY v;
```

`Sort Method: quicksort  Memory: 1216kB`: vừa trong 4 MB.

Cùng câu với 64 kB, rồi một phép gom theo `v`:

```sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY v;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT v, count(*) FROM big GROUP BY v;
RESET work_mem;
```

Câu sắp tràn đĩa (`external merge  Disk: 544kB`, kèm `temp read/written` trong `Buffers`). Câu gom chuyển sang `GroupAggregate` trên một Sort cũng tràn đĩa.

Cùng phép gom với bộ nhớ mặc định:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT v, count(*) FROM big GROUP BY v;
```

`HashAggregate` với `Batches: 1  Memory Usage: 2321kB`: bảng băm nằm gọn trong bộ nhớ, không tràn, và planner không cần sắp trước khi gom.

Nâng bộ nhớ cho riêng vai trò chạy báo cáo:

```sql
CREATE ROLE reporting NOLOGIN;
ALTER ROLE reporting SET work_mem = '64MB';
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'reporting';
```

## Lỗi hay gặp

Đổi `shared_buffers` trong phiên:

```sql
-- ERROR 55P02: parameter "shared_buffers" cannot be changed without restarting the server
SET shared_buffers = '1GB';
```

Bộ đệm chung được cấp phát lúc khởi động; đổi trong file cấu hình rồi khởi động lại server.

Đặt `work_mem` dưới mức tối thiểu:

```sql
-- ERROR 22023: 10 kB is outside the valid range for parameter "work_mem" (64 kB .. 2097151 kB)
SET work_mem = '10kB';
```

`SET LOCAL` ngoài transaction:

```sql
-- WRONG: outside BEGIN, SET LOCAL only warns and changes nothing
SET LOCAL work_mem = '32MB';
SHOW work_mem;
```

```sql
-- FIX: SET LOCAL inside a transaction
BEGIN;
SET LOCAL work_mem = '32MB';
SHOW work_mem;
COMMIT;
```

Câu sai vẫn thấy `4MB`: Postgres chỉ cảnh báo rồi bỏ qua. Trong `BEGIN … COMMIT`, giá trị `32MB` có hiệu lực tới hết transaction rồi tự trở lại.

## Thực hành

Ba bước: đọc bốn thiết lập bộ nhớ, viết câu top-N có kế hoạch Limit trên Sort, rồi đọc ai được đổi thiết lập nào. Sau đó là hai câu hỏi.

## Tóm tắt

- `work_mem` là giới hạn cho từng nút sort/hash của từng câu; hash được nhân `hash_mem_multiplier`.
- Tràn đĩa hiện thành `external merge  Disk:` hay `Batches` > 1; `work_mem` nhỏ có thể đổi cả kế hoạch.
- Nâng `work_mem` theo phiên, vai trò hay transaction, không nâng toàn cục.
- `shared_buffers` chỉ đổi khi khởi động lại; `effective_cache_size` chỉ là gợi ý.

# EN

## Opening

The month-end report runs for 40 seconds, and `EXPLAIN ANALYZE` shows `Sort Method: external merge  Disk: …`. Someone proposes `work_mem = 1GB` for the whole server. Where should memory go up, and by how much is safe?

## Key idea

`work_mem` (default 4 MB) is the memory limit for each sort or hash node in each query. A hash node may use `work_mem` × `hash_mem_multiplier` (default 2). Over the limit it spills to disk: a sort becomes `external merge  Disk: …`, a hash splits into several `Batches`. With a very small `work_mem` the planner even changes the plan, for example dropping `HashAggregate` to sort and then group. With a LIMIT, Postgres uses `top-N heapsort`, keeping only the best N rows in memory.

Many people think `work_mem` is one shared budget for the whole server. In fact it is a limit per node: a query with four sort/hash nodes uses up to four times as much, and 300 sessions doing it at once multiply that again. So keep the default low and raise it only for the session, role or transaction that needs it.

`maintenance_work_mem` (default 64 MB) is for `CREATE INDEX`, `VACUUM` and adding foreign keys; raising it speeds up index builds. `shared_buffers` (default 128 MB) is the shared page cache and only changes with a restart. `effective_cache_size` is only a hint to the planner and allocates nothing. Spill signs on a real server: `temp_blks_written` in `pg_stat_statements` and `log_temp_files`.

## Syntax

```sql
SET work_mem = 'value';
BEGIN; SET LOCAL work_mem = 'value'; ... COMMIT;
ALTER ROLE role_name SET work_mem = 'value';
RESET work_mem;
EXPLAIN (ANALYZE [, BUFFERS ] [, TIMING OFF ]) query;
```

- `SET`: until the session ends; `SET LOCAL`: only until the transaction ends.
- `ALTER ROLE ... SET`: applies from that role's next session.
- `value`: with a unit (`kB`, `MB`, `GB`); without a unit it counts in kB.
- `Sort Method` and `Batches` in `EXPLAIN ANALYZE` tell whether it spilled to disk.

## Example

Sorting all 30,000 rows with the default `work_mem`:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY v;
```

`Sort Method: quicksort  Memory: 1216kB`: it fits in 4 MB.

The same query with 64 kB, then a grouping by `v`:

```sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY v;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT v, count(*) FROM big GROUP BY v;
RESET work_mem;
```

The sort spills to disk (`external merge  Disk: 544kB`, with `temp read/written` in `Buffers`). The grouping switches to a `GroupAggregate` over a Sort that also spills.

The same grouping with the default memory:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT v, count(*) FROM big GROUP BY v;
```

`HashAggregate` with `Batches: 1  Memory Usage: 2321kB`: the hash table fits in memory, nothing spills, and the planner need not sort before grouping.

Raising memory only for the role that runs reports:

```sql
CREATE ROLE reporting NOLOGIN;
ALTER ROLE reporting SET work_mem = '64MB';
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'reporting';
```

## Common mistakes

Changing `shared_buffers` in a session:

```sql
-- ERROR 55P02: parameter "shared_buffers" cannot be changed without restarting the server
SET shared_buffers = '1GB';
```

The shared cache is allocated at startup; change it in the configuration file, then restart the server.

Setting `work_mem` below its minimum:

```sql
-- ERROR 22023: 10 kB is outside the valid range for parameter "work_mem" (64 kB .. 2097151 kB)
SET work_mem = '10kB';
```

`SET LOCAL` outside a transaction:

```sql
-- WRONG: outside BEGIN, SET LOCAL only warns and changes nothing
SET LOCAL work_mem = '32MB';
SHOW work_mem;
```

```sql
-- FIX: SET LOCAL inside a transaction
BEGIN;
SET LOCAL work_mem = '32MB';
SHOW work_mem;
COMMIT;
```

The wrong version still shows `4MB`: Postgres only warns and ignores it. Inside `BEGIN … COMMIT`, the value `32MB` holds until the transaction ends, then goes back by itself.

## Practice

Three steps: read the four memory settings, write a top-N query whose plan is a Limit over a Sort, then read who may change which setting. Then two questions.

## Recap

- `work_mem` limits each sort/hash node of each query; a hash gets `hash_mem_multiplier` times more.
- A spill shows as `external merge  Disk:` or `Batches` > 1; a small `work_mem` can change the whole plan.
- Raise `work_mem` per session, role or transaction, not globally.
- `shared_buffers` only changes with a restart; `effective_cache_size` is only a hint.
