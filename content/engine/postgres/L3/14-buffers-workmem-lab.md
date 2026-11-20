---
id: e-pg-l3-14
engine: postgres
level: L3
module: memory
title: "Lab: shared buffers, trang bẩn và sort tràn đĩa"
title_en: "Lab: shared buffers, dirty pages and sorts that spill to disk"
kind: lab
runtime: browser
minutes: 20
objectives:
  - vi: Đếm trang của một bảng đang nằm trong shared buffers và trang nào bẩn
    en: Count a table's pages in shared buffers and which of them are dirty
  - vi: Thấy `external merge Disk:` khi `work_mem` quá nhỏ và `quicksort Memory:` khi đủ
    en: See `external merge Disk:` when `work_mem` is too small and `quicksort Memory:` when it is enough
requires: [e-pg-l3-12]
sources:
  - https://www.postgresql.org/docs/18/pgbuffercache.html
  - https://www.postgresql.org/docs/18/runtime-config-resource.html
  - https://www.postgresql.org/docs/18/wal-configuration.html
  - https://www.postgresql.org/docs/18/using-explain.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_buffercache;
    CREATE TABLE big(id int PRIMARY KEY, val int, pad text) WITH (fillfactor = 90);
    INSERT INTO big SELECT g, (g * 7919) % 10007, 'x' FROM generate_series(1, 20000) g;
    VACUUM big;
    CHECKPOINT;
    UPDATE big SET pad = 'y' WHERE id = 1;
    CREATE FUNCTION sort_plan(mem text) RETURNS SETOF text LANGUAGE plpgsql AS $$ BEGIN PERFORM set_config('work_mem', mem, true); RETURN QUERY EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT * FROM big ORDER BY val, id'; END $$;
  steps:
    - task:
        vi: "Lab đã nạp `big`, VACUUM, CHECKPOINT, rồi sửa một dòng. Đếm số buffer của fork chính (`relforknumber = 0`) của `big` trong `pg_buffercache`, và bao nhiêu trong số đó bẩn (`isdirty`)."
        en: "The lab loaded `big`, vacuumed it, ran a CHECKPOINT, then updated one row. Count the buffers of the main fork (`relforknumber = 0`) of `big` in `pg_buffercache`, and how many of them are dirty (`isdirty`)."
      solution: |
        SELECT count(*) AS buffers, count(*) FILTER (WHERE isdirty) AS dirty
        FROM pg_buffercache
        WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0
      check: rows
      hint:
        vi: "Nối `pg_buffercache` với bảng qua `relfilenode = pg_relation_filenode('big')`."
        en: "Link `pg_buffercache` to the table through `relfilenode = pg_relation_filenode('big')`."
      fact:
        vi: "Cả 120 trang của `big` đều nằm trong bộ đệm (bảng nhỏ hơn nhiều so với 128 MB), và đúng 1 trang bẩn: CHECKPOINT đã ghi mọi trang xuống đĩa, chỉ trang mà UPDATE vừa sửa là bẩn lại. Bản mới ở cùng trang (HOT, nhờ `fillfactor = 90`)."
        en: "All 120 pages of `big` sit in the buffer (the table is far smaller than 128 MB), and exactly 1 is dirty: the CHECKPOINT wrote every page out, only the page the UPDATE just changed is dirty again. The new version stays on that page (HOT, thanks to `fillfactor = 90`)."
        probe: SELECT count(*), count(*) FILTER (WHERE isdirty), pg_relation_size('big') / 8192, (SELECT ctid::text FROM big WHERE id = 1) FROM pg_buffercache WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0
        expect: [[120, 1, 120, "(0,168)"]]
    - task:
        vi: "Đọc kích thước bộ đệm chung: `current_setting('shared_buffers')` và tổng số buffer trong `pg_buffercache`."
        en: "Read the size of the shared buffer pool: `current_setting('shared_buffers')` and the total number of buffers in `pg_buffercache`."
      solution: SELECT current_setting('shared_buffers') AS size, count(*) AS buffers FROM pg_buffercache
      check: rows
      hint:
        vi: "`pg_buffercache` có một dòng cho mỗi buffer, kể cả buffer trống."
        en: "`pg_buffercache` has one row per buffer, empty ones included."
      fact:
        vi: "`128MB` = 16.384 buffer × 8 KB: shared buffers là một mảng trang cố định, dùng chung cho mọi bảng và index."
        en: "`128MB` = 16,384 buffers x 8 KB: shared buffers are a fixed array of pages shared by every table and index."
        probe: SELECT current_setting('shared_buffers'), count(*) FROM pg_buffercache
        expect: [["128MB", 16384]]
    - task:
        vi: "Hàm `sort_plan(mem)` chạy `EXPLAIN ANALYZE` của câu sắp xếp cả bảng `big` với `work_mem` = `mem`. Gọi nó với `'64kB'` và chỉ giữ dòng chứa `Sort Method`. Đoán trước khi chạy: 120 trang có sort vừa trong `'64kB'` không?"
        en: "The function `sort_plan(mem)` runs `EXPLAIN ANALYZE` of a query sorting all of `big` with `work_mem` = `mem`. Call it with `'64kB'` and keep only the line containing `Sort Method`. Guess before you run it: can a 120-page table be sorted within `'64kB'`?"
      solution: SELECT l FROM sort_plan('64kB') AS l WHERE l LIKE '%Sort Method%'
      check: rows
      hint:
        vi: "`sort_plan()` trả về các dòng chữ; lọc bằng `LIKE '%Sort Method%'`."
        en: "`sort_plan()` returns text lines; filter with `LIKE '%Sort Method%'`."
      fact:
        vi: "Với 64 KB, sort không vừa bộ nhớ: `external merge`, ghi 424 KB file tạm ra đĩa."
        en: "With 64 KB the sort does not fit in memory: `external merge`, writing 424 KB of temporary files to disk."
        probe: SELECT trim(l) FROM sort_plan('64kB') AS l WHERE l LIKE '%Sort Method%'
        expect: [["Sort Method: external merge  Disk: 424kB"]]
    - task:
        vi: "Gọi lại `sort_plan()` với `'8MB'`, vẫn chỉ giữ dòng `Sort Method`."
        en: "Call `sort_plan()` again with `'8MB'`, still keeping only the `Sort Method` line."
      solution: SELECT l FROM sort_plan('8MB') AS l WHERE l LIKE '%Sort Method%'
      check: rows
      hint:
        vi: Chỉ đổi đối số.
        en: Only change the argument.
      fact:
        vi: "Với 8 MB: `quicksort` trong bộ nhớ, không còn file tạm. `work_mem` áp cho **mỗi** nút sort/hash của mỗi câu, nên tăng nó trên toàn server phải tính cả số kết nối."
        en: "With 8 MB: an in-memory `quicksort`, no temporary files. `work_mem` applies to **each** sort/hash node of each query, so raising it server-wide must account for the number of connections."
        probe: "SELECT trim(l) LIKE 'Sort Method: quicksort  Memory:%' FROM sort_plan('8MB') AS l WHERE l LIKE '%Sort Method%'"
        expect: [[true]]
---

## Ý chính

Postgres đọc và ghi trang qua **shared buffers**, một mảng trang 8 KB dùng chung (`shared_buffers`, mặc định 128 MB). Trang bị sửa thành **trang bẩn (dirty page)**: đã đổi trong bộ nhớ, chưa ghi xuống đĩa; checkpoint (hoặc background writer) mới ghi nó xuống đĩa, sau khi WAL đã bền.

Bộ nhớ riêng của một câu thì khác: mỗi nút sort hay hash được tối đa `work_mem` (mặc định 4 MB). Vượt quá thì nó tràn ra file tạm trên đĩa và chậm hẳn.

## Ví dụ

```sql
SELECT count(*) AS buffers, count(*) FILTER (WHERE isdirty) AS dirty
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0;
```

## Thực hành

Bốn bước. Sau lab này bạn thấy được `external merge Disk:` trong kế hoạch thực thi (execution plan) của một câu chậm và sửa bằng `work_mem` (đặt cho phiên hoặc cho đúng câu đó, không tăng bừa cho cả server).

# EN

## Key idea

Postgres reads and writes pages through **shared buffers**, a shared array of 8 KB pages (`shared_buffers`, 128 MB by default). A changed page becomes **dirty**: changed in memory, not yet written to disk; a checkpoint (or the background writer) writes it to disk later, once the WAL is durable.

A query's private memory is different: each sort or hash node gets up to `work_mem` (4 MB by default). Beyond that it spills to temporary files on disk and gets much slower.

## Example

```sql
SELECT count(*) AS buffers, count(*) FILTER (WHERE isdirty) AS dirty
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0;
```

## Practice

Four steps. After this lab you can spot `external merge Disk:` in the plan of a slow query and fix it with `work_mem` (set for the session or for that one query, not raised blindly for the whole server).
