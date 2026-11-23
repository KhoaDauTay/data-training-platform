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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
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
quiz:
  - q:
      vi: "Một báo cáo đêm có `Sort Method: external merge  Disk: 900kB`. Máy chủ có 100 kết nối. Cách sửa nào hợp lý nhất?"
      en: "A nightly report shows `Sort Method: external merge  Disk: 900kB`. The server has 100 connections. Which fix is the most sensible?"
    options:
      - { vi: "Tăng `shared_buffers`, vì sort đang tràn ra đĩa", en: "Raise `shared_buffers`, because the sort spills to disk" }
      - { vi: "Tăng `work_mem` cho riêng câu báo cáo, ví dụ `SET LOCAL work_mem` trong transaction của nó", en: "Raise `work_mem` for the report query only, for example `SET LOCAL work_mem` inside its transaction" }
      - { vi: "Đặt `work_mem` của cả máy chủ lên 1 GB", en: "Set the server-wide `work_mem` to 1 GB" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì cả hai đều là \"bộ nhớ\", nhưng shared buffers là bộ đệm trang dùng chung, còn sort dùng bộ nhớ riêng của câu, giới hạn bởi `work_mem`. Đặt 1 GB cho cả máy chủ thì nguy hiểm: `work_mem` áp cho mỗi nút sort hay hash của mỗi câu, nên 100 kết nối có thể đòi nhiều lần 100 GB."
      en: "It sounds right because both are \"memory\", but shared buffers are the shared page cache, while a sort uses the query's private memory, limited by `work_mem`. Setting 1 GB server-wide is dangerous: `work_mem` applies to every sort or hash node of every query, so 100 connections could ask for many times 100 GB."
  - q:
      vi: "Ngay sau `CHECKPOINT`, bạn sửa một dòng của bảng 120 trang. `pg_buffercache` báo bao nhiêu trang bẩn của bảng?"
      en: "Right after a `CHECKPOINT` you update one row of a 120-page table. How many of the table's pages does `pg_buffercache` show as dirty?"
    options:
      - { vi: "120: sửa bảng thì cả bảng phải ghi lại", en: "120: changing the table means rewriting the whole table" }
      - { vi: "1: chỉ trang chứa dòng đó bẩn, vì checkpoint vừa ghi mọi trang xuống đĩa", en: "1: only the page holding the row is dirty, because the checkpoint just wrote every page to disk" }
      - { vi: "0: COMMIT đã ghi trang xuống đĩa", en: "0: COMMIT already wrote the page to disk" }
    answer: 1
    why:
      vi: "Trang bẩn là trang đã đổi trong bộ nhớ mà chưa ghi xuống đĩa. CHECKPOINT làm sạch mọi trang; UPDATE chỉ làm bẩn trang nó sửa (ở lab, bản mới nằm cùng trang nhờ HOT). COMMIT không ghi trang: nó chỉ chờ WAL bền."
      en: "A dirty page is a page changed in memory but not yet written to disk. The CHECKPOINT cleaned every page; the UPDATE only dirties the page it changes (in the lab the new version stays on the same page thanks to HOT). COMMIT does not write pages: it only waits for the WAL to be durable."
---
## Mở bài

Một báo cáo chạy 2 giây trên máy của bạn nhưng 40 giây trên máy chủ, và ai đó đề nghị "tăng RAM cho Postgres". Tăng chỗ nào: bộ đệm chung hay bộ nhớ của từng câu?

## Ý chính

Postgres có hai loại bộ nhớ rất khác nhau. Shared buffers là một mảng trang 8 KB dùng chung cho mọi kết nối, kích thước cố định bằng `shared_buffers` (mặc định 128 MB), chỉ đổi được khi khởi động lại. Mọi lần đọc hay ghi bảng và index đều đi qua đây.

Một trang bị sửa trong shared buffers thành trang bẩn (dirty page): đã đổi trong bộ nhớ, chưa ghi xuống đĩa. COMMIT không ghi nó; checkpoint hoặc background writer ghi nó sau, khi WAL đã bền. Extension `pg_buffercache` cho xem từng buffer: của bảng nào, fork nào, có bẩn không.

Bộ nhớ riêng của một câu thì khác: mỗi nút sort hay hash được dùng tới `work_mem` (mặc định 4 MB). Vượt quá thì nó tràn ra file tạm trên đĩa: kế hoạch ghi `Sort Method: external merge  Disk: …` thay vì `quicksort  Memory: …`, và chạy chậm hẳn.

Nhiều người nghĩ sort tràn đĩa là do shared buffers nhỏ. Thật ra sort không dùng shared buffers; chỉ `work_mem` quyết định. Và `work_mem` nhân lên theo mỗi nút sort/hash của mỗi câu ở mỗi kết nối, nên hãy tăng nó cho đúng câu cần, bằng `SET LOCAL` trong transaction của câu đó, không tăng bừa cho cả máy chủ.

## Cú pháp

```sql
SELECT * FROM pg_buffercache WHERE relfilenode = pg_relation_filenode('table_name') [ AND relforknumber = 0 ];
SET [ LOCAL ] work_mem = 'size';
RESET work_mem;
EXPLAIN (ANALYZE [, COSTS OFF ] [, TIMING OFF ]) query;
```

- `relforknumber`: 0 = dữ liệu chính, 1 = free space map, 2 = visibility map.
- `isdirty`: buffer đã đổi mà chưa ghi xuống đĩa.
- `SET LOCAL`: chỉ có hiệu lực tới hết transaction hiện tại; ngoài transaction thì không có tác dụng.
- `work_mem` nhỏ nhất là `64kB`.

## Ví dụ

Trang của `big` trong bộ đệm, và bao nhiêu trang bẩn:

```sql
SELECT count(*) AS buffers, count(*) FILTER (WHERE isdirty) AS dirty
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0;
```

Hai cài đặt bộ nhớ đang dùng:

```sql
SELECT current_setting('shared_buffers') AS shared_buffers, current_setting('work_mem') AS work_mem;
```

Một CHECKPOINT ghi mọi trang bẩn xuống đĩa:

```sql
CHECKPOINT;
SELECT count(*) FILTER (WHERE isdirty) AS dirty
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big');
```

Kết quả 0: trang vẫn trong bộ đệm nhưng đã sạch.

Cả kế hoạch của câu sắp xếp với `work_mem` = `64kB`:

```sql
SELECT l FROM sort_plan('64kB') AS l;
```

Dòng `Sort Method: external merge  Disk: …` là dấu hiệu sort tràn đĩa.

## Lỗi hay gặp

Đếm buffer mà quên lọc fork:

```sql
-- WRONG: counts the free space map and visibility map buffers too
SELECT count(*) AS buffers
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big');
```

```sql
-- FIX: main fork only
SELECT count(*) AS buffers
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0;
```

Câu sai ra nhiều hơn số trang của bảng vì cộng cả trang của free space map và visibility map.

Dùng `SET LOCAL` ngoài transaction:

```sql
-- WRONG: SET LOCAL outside a transaction does nothing
SET work_mem = '64kB';
SET LOCAL work_mem = '8MB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY val, id;
```

```sql
-- FIX: SET LOCAL inside the query's transaction
BEGIN;
SET LOCAL work_mem = '8MB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY val, id;
COMMIT;
RESET work_mem;
```

Ngoài transaction, `SET LOCAL` chỉ để lại một cảnh báo, nên sort vẫn `external merge`. Trong transaction, sort thành `quicksort` trong bộ nhớ và `work_mem` tự trở lại khi COMMIT.

Đổi `shared_buffers` cho phiên đang chạy:

```sql
-- ERROR 55P02: parameter "shared_buffers" cannot be changed without restarting the server
SET shared_buffers = '256MB';
```

Bộ đệm chung được cấp một lần lúc khởi động; đổi nó trong file cấu hình rồi khởi động lại máy chủ.

## Thực hành

Bốn bước: đếm trang của `big` trong bộ đệm và trang bẩn, đọc kích thước bộ đệm chung, rồi so kế hoạch sắp xếp với `work_mem` nhỏ và đủ lớn. Sau đó là hai câu hỏi.

## Tóm tắt

- Shared buffers là bộ đệm trang dùng chung, cố định từ lúc khởi động; mọi trang bảng và index đi qua đó.
- Trang bẩn đã đổi trong bộ nhớ, chưa ghi xuống đĩa; checkpoint hay background writer ghi nó, không phải COMMIT.
- Sort và hash dùng `work_mem` riêng của câu; vượt quá thì tràn file tạm (`external merge Disk:`).
- Tăng `work_mem` cho đúng câu bằng `SET LOCAL` trong transaction, không tăng bừa cho cả máy chủ.

# EN

## Opening

A report runs in 2 seconds on your machine but 40 seconds on the server, and someone suggests "give Postgres more RAM". More of which: the shared buffer pool, or each query's own memory?

## Key idea

Postgres has two very different kinds of memory. Shared buffers are an array of 8 KB pages shared by every connection, a fixed size set by `shared_buffers` (128 MB by default) that changes only on restart. Every read or write of a table or index goes through it.

A page changed in shared buffers becomes a dirty page: changed in memory, not yet written to disk. COMMIT does not write it; a checkpoint or the background writer writes it later, once the WAL is durable. The `pg_buffercache` extension shows each buffer: which table, which fork, dirty or not.

A query's private memory is different: each sort or hash node may use up to `work_mem` (4 MB by default). Beyond that it spills to temporary files on disk: the plan says `Sort Method: external merge  Disk: …` instead of `quicksort  Memory: …`, and it gets much slower.

Many people think a sort spills to disk because shared buffers are too small. In fact a sort does not use shared buffers; `work_mem` alone decides. And `work_mem` multiplies by every sort/hash node of every query on every connection, so raise it for the query that needs it, with `SET LOCAL` inside that query's transaction, not blindly for the whole server.

## Syntax

```sql
SELECT * FROM pg_buffercache WHERE relfilenode = pg_relation_filenode('table_name') [ AND relforknumber = 0 ];
SET [ LOCAL ] work_mem = 'size';
RESET work_mem;
EXPLAIN (ANALYZE [, COSTS OFF ] [, TIMING OFF ]) query;
```

- `relforknumber`: 0 = main data, 1 = free space map, 2 = visibility map.
- `isdirty`: the buffer changed and is not yet written to disk.
- `SET LOCAL`: lasts until the end of the current transaction; outside a transaction it has no effect.
- The smallest `work_mem` is `64kB`.

## Example

The pages of `big` in the buffer pool, and how many are dirty:

```sql
SELECT count(*) AS buffers, count(*) FILTER (WHERE isdirty) AS dirty
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0;
```

The two memory settings in use:

```sql
SELECT current_setting('shared_buffers') AS shared_buffers, current_setting('work_mem') AS work_mem;
```

A CHECKPOINT writes every dirty page to disk:

```sql
CHECKPOINT;
SELECT count(*) FILTER (WHERE isdirty) AS dirty
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big');
```

The result is 0: the pages are still in the buffer pool, but clean.

The whole plan of the sort query with `work_mem` = `64kB`:

```sql
SELECT l FROM sort_plan('64kB') AS l;
```

The line `Sort Method: external merge  Disk: …` is the sign of a sort spilling to disk.

## Common mistakes

Counting buffers without filtering the fork:

```sql
-- WRONG: counts the free space map and visibility map buffers too
SELECT count(*) AS buffers
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big');
```

```sql
-- FIX: main fork only
SELECT count(*) AS buffers
FROM pg_buffercache
WHERE relfilenode = pg_relation_filenode('big') AND relforknumber = 0;
```

The wrong query returns more than the table's page count because it adds the pages of the free space map and the visibility map.

Using `SET LOCAL` outside a transaction:

```sql
-- WRONG: SET LOCAL outside a transaction does nothing
SET work_mem = '64kB';
SET LOCAL work_mem = '8MB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY val, id;
```

```sql
-- FIX: SET LOCAL inside the query's transaction
BEGIN;
SET LOCAL work_mem = '8MB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM big ORDER BY val, id;
COMMIT;
RESET work_mem;
```

Outside a transaction `SET LOCAL` only leaves a warning, so the sort is still an `external merge`. Inside a transaction the sort becomes an in-memory `quicksort`, and `work_mem` goes back by itself at COMMIT.

Changing `shared_buffers` for the running session:

```sql
-- ERROR 55P02: parameter "shared_buffers" cannot be changed without restarting the server
SET shared_buffers = '256MB';
```

The shared buffer pool is allocated once at startup; change it in the configuration file and restart the server.

## Practice

Four steps: count the pages of `big` in the buffer pool and the dirty ones, read the size of the shared pool, then compare the sort plan with a small and a large enough `work_mem`. Then two questions.

## Recap

- Shared buffers are the shared page cache, fixed at startup; every table and index page goes through it.
- A dirty page changed in memory and is not yet on disk; a checkpoint or the background writer writes it, not COMMIT.
- Sorts and hashes use the query's own `work_mem`; beyond it they spill to temporary files (`external merge Disk:`).
- Raise `work_mem` for the one query with `SET LOCAL` inside a transaction, not blindly for the whole server.
