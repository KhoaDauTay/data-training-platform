---
id: e-pg-l3-18
engine: postgres
level: L3
module: memory
title: "Lab: đọc dòng Buffers trong kế hoạch"
title_en: "Lab: reading the Buffers line of a plan"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-buffer-hit-read, at: idea }]
objectives:
  - vi: Nối `shared hit` của một nút quét với số trang bảng và index
    en: Link the `shared hit` of a scan node to the page count of the table and index
  - vi: Tách bộ nhớ chung (`shared`) khỏi file tạm của một câu (`temp`)
    en: Tell shared memory (`shared`) apart from a query's temporary files (`temp`)
requires: [e-pg-l3-14]
sources:
  - https://www.postgresql.org/docs/18/sql-explain.html
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/runtime-config-resource.html
lab:
  setup: |
    CREATE TABLE trips(id int PRIMARY KEY, driver_id int NOT NULL, km int NOT NULL, pad text);
    INSERT INTO trips SELECT g, g % 300 + 1, (g * 7919) % 500, 'x' FROM generate_series(1, 30000) g;
    VACUUM ANALYZE trips;
    CREATE FUNCTION plan_buf(q text, mem text) RETURNS SETOF text LANGUAGE plpgsql AS $$ DECLARE l text; BEGIN PERFORM set_config('work_mem', mem, true); FOR l IN EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS ON) ' || q LOOP EXIT WHEN l = 'Planning:'; RETURN NEXT l; END LOOP; END $$;
  steps:
    - task:
        vi: "Hàm `plan_buf(q, mem)` chạy `EXPLAIN (ANALYZE, BUFFERS)` của câu `q` với `work_mem` = `mem` và trả từng dòng kế hoạch. Gọi nó cho `'SELECT sum(km) FROM trips'` với `'4MB'`, chỉ giữ các dòng chứa `Buffers`. Đoán trước: con số sẽ bằng gì của bảng?"
        en: "The function `plan_buf(q, mem)` runs `EXPLAIN (ANALYZE, BUFFERS)` of query `q` with `work_mem` = `mem` and returns each plan line. Call it for `'SELECT sum(km) FROM trips'` with `'4MB'`, keeping only the lines containing `Buffers`. Guess first: what number of the table will it match?"
      solution: SELECT l FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l WHERE l LIKE '%Buffers%'
      check: rows
      hint:
        vi: "Lọc bằng `LIKE '%Buffers%'`."
        en: "Filter with `LIKE '%Buffers%'`."
      fact:
        vi: "`Buffers: shared hit=163` ở cả `Aggregate` và `Seq Scan`: đúng 163 trang của `trips`, mỗi trang đọc một lần qua shared buffers. Số của nút cha đã gồm số của nút con, nên đừng cộng hai dòng. `hit` là trang đã nằm sẵn trong bộ đệm; `read` là trang phải lấy từ ngoài vào (đĩa hoặc page cache của hệ điều hành)."
        en: "`Buffers: shared hit=163` on both `Aggregate` and `Seq Scan`: exactly the 163 pages of `trips`, each read once through shared buffers. A parent's number already includes its child's, so do not add the two lines. `hit` is a page already in the buffer; `read` is a page brought in from outside (disk or the OS page cache)."
        probe: SELECT trim(l), pg_relation_size('trips') / 8192 FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l WHERE l LIKE '%Seq Scan%' OR l LIKE '%Buffers%'
        expect: [["Buffers: shared hit=163", 163], ["->  Seq Scan on trips (actual rows=30000.00 loops=1)", 163], ["Buffers: shared hit=163", 163]]
    - task:
        vi: "Gọi `plan_buf()` cho câu lấy `km` của chuyến `id = 777` (vẫn `'4MB'`), lấy mọi dòng."
        en: "Call `plan_buf()` for the query reading `km` of trip `id = 777` (still `'4MB'`), returning every line."
      solution: SELECT l FROM plan_buf('SELECT km FROM trips WHERE id = 777', '4MB') AS l
      check: rows
      hint:
        vi: "Câu bên trong là `SELECT km FROM trips WHERE id = 777`."
        en: "The inner query is `SELECT km FROM trips WHERE id = 777`."
      fact:
        vi: "Index Scan với `Buffers: shared hit=3`: gốc của `trips_pkey`, một trang lá, và một trang heap. Đó là thứ index mua được: 3 trang thay vì 163."
        en: "Index Scan with `Buffers: shared hit=3`: the root of `trips_pkey`, one leaf page and one heap page. That is what the index buys: 3 pages instead of 163."
        probe: SELECT trim(l) FROM plan_buf('SELECT km FROM trips WHERE id = 777', '4MB') AS l WHERE l LIKE '%Buffers%'
        expect: [["Buffers: shared hit=3"]]
    - task:
        vi: "Giờ sắp xếp cả bảng: gọi `plan_buf()` cho `'SELECT * FROM trips ORDER BY km, id'` với `'64kB'`, chỉ giữ dòng chứa `Sort Method` hoặc `temp`."
        en: "Now sort the whole table: call `plan_buf()` for `'SELECT * FROM trips ORDER BY km, id'` with `'64kB'`, keeping only the lines containing `Sort Method` or `temp`."
      solution: SELECT l FROM plan_buf('SELECT * FROM trips ORDER BY km, id', '64kB') AS l WHERE l LIKE '%Sort Method%' OR l LIKE '%temp%'
      check: rows
      hint:
        vi: "Hai điều kiện `LIKE` nối bằng `OR`."
        en: "Two `LIKE` conditions joined with `OR`."
      fact:
        vi: "`external merge  Disk: 760kB` và `Buffers: shared hit=163, temp read=184 written=205`: bảng vẫn đọc 163 trang qua shared buffers, nhưng sort không vừa `work_mem` nên ghi 205 và đọc lại 184 khối file tạm. Phần `temp` thuộc về `work_mem` của câu, không phải shared buffers."
        en: "`external merge  Disk: 760kB` and `Buffers: shared hit=163, temp read=184 written=205`: the table is still read as 163 pages through shared buffers, but the sort does not fit `work_mem`, so it writes 205 and reads back 184 blocks of temporary files. The `temp` part belongs to the query's `work_mem`, not to shared buffers."
        probe: SELECT trim(l) FROM plan_buf('SELECT * FROM trips ORDER BY km, id', '64kB') AS l WHERE l LIKE '%Sort Method%' OR l LIKE '%temp%'
        expect: [["Sort Method: external merge  Disk: 760kB"], ["Buffers: shared hit=163, temp read=184 written=205"]]
    - task:
        vi: "Cùng câu sắp xếp với `'8MB'`, vẫn chỉ giữ dòng chứa `Sort Method` hoặc `Buffers`."
        en: "The same sort with `'8MB'`, keeping only the lines containing `Sort Method` or `Buffers`."
      solution: SELECT l FROM plan_buf('SELECT * FROM trips ORDER BY km, id', '8MB') AS l WHERE l LIKE '%Sort Method%' OR l LIKE '%Buffers%'
      check: rows
      hint:
        vi: "Đổi đối số thứ hai và mẫu `LIKE` thứ hai."
        en: "Change the second argument and the second `LIKE` pattern."
      fact:
        vi: "`quicksort  Memory: 1450kB` và chỉ còn `shared hit=163`: không còn khối `temp` nào. Shared buffers không đổi gì giữa hai lần chạy; chỉ `work_mem` quyết định sort có tràn đĩa không."
        en: "`quicksort  Memory: 1450kB` and only `shared hit=163` left: no `temp` blocks at all. Shared buffers did not change between the two runs; `work_mem` alone decides whether the sort spills."
        probe: "SELECT count(*) FILTER (WHERE l LIKE '%temp%'), count(*) FILTER (WHERE trim(l) = 'Sort Method: quicksort  Memory: 1450kB') FROM plan_buf('SELECT * FROM trips ORDER BY km, id', '8MB') AS l"
        expect: [[0, 1]]
quiz:
  - q:
      vi: "Một báo cáo có `Buffers: shared hit=163, temp read=184 written=205` ở nút Sort. Đề xuất nào sửa đúng chỗ?"
      en: "A report shows `Buffers: shared hit=163, temp read=184 written=205` on its Sort node. Which proposal fixes the right thing?"
    options:
      - { vi: "Tăng `shared_buffers` để bảng nằm hết trong bộ nhớ", en: "Raise `shared_buffers` so the whole table fits in memory" }
      - { vi: "Tăng `work_mem` cho đúng phiên hoặc câu báo cáo (ví dụ `SET LOCAL work_mem`)", en: "Raise `work_mem` for that session or that report query only (for example `SET LOCAL work_mem`)" }
      - { vi: "Thêm index trên `km` cho mọi trường hợp", en: "Add an index on `km` in every case" }
      - { vi: "Chạy `CHECKPOINT` trước báo cáo", en: "Run `CHECKPOINT` before the report" }
    answer: 1
    trap: 0
    why:
      vi: "Tăng `shared_buffers` nghe hợp lý vì chữ \"Buffers\" nằm ngay trên dòng đó, nhưng phần shared đã toàn `hit` (163 trang đều có sẵn). Phần đắt là `temp`: sort tràn ra file tạm vì `work_mem` nhỏ, và với `'8MB'` nó biến mất. Tăng cho đúng câu cần, vì `work_mem` nhân lên theo mỗi nút sort/hash và mỗi kết nối."
      en: "Raising `shared_buffers` sounds right because the word \"Buffers\" is on that very line, but the shared part is already all `hit` (all 163 pages were in memory). The costly part is `temp`: the sort spills to temporary files because `work_mem` is small, and with `'8MB'` it is gone. Raise it only for the query that needs it, since `work_mem` multiplies by every sort/hash node and every connection."
  - q:
      vi: "Trên server thật, cùng một câu chạy hai lần: lần đầu `shared read=163`, lần sau `shared hit=163`. Điều gì đúng?"
      en: "On a real server the same query runs twice: first `shared read=163`, then `shared hit=163`. What is true?"
    options:
      - { vi: "Lần đầu chắc chắn đọc 163 trang từ đĩa vật lý", en: "The first run surely read 163 pages from the physical disk" }
      - { vi: "Lần đầu 163 trang chưa có trong shared buffers nên phải lấy vào (từ đĩa hoặc từ page cache của hệ điều hành); lần sau chúng đã ở sẵn", en: "On the first run the 163 pages were not in shared buffers, so they were brought in (from disk or from the OS page cache); on the second run they were already there" }
      - { vi: "Lần sau câu đọc ít trang hơn", en: "The second run read fewer pages" }
    answer: 1
    why:
      vi: "Dễ đọc `read` thành \"đọc đĩa\", nhưng Postgres chỉ biết trang không có trong shared buffers; trang đó có thể đến từ page cache của hệ điều hành mà không chạm đĩa. Tổng vẫn là 163 cả hai lần: số trang câu cần không đổi, chỉ chỗ lấy trang đổi."
      en: "It is easy to read `read` as \"disk read\", but Postgres only knows the page was not in shared buffers; it may come from the OS page cache without touching the disk. The total is 163 both times: the pages the query needs do not change, only where they come from."
---
## Mở bài

Hai câu cùng chạy 300 ms, một câu cần index, câu kia cần thêm bộ nhớ. Thời gian không cho bạn biết câu nào là câu nào; dòng `Buffers:` trong kế hoạch thì có.

## Ý chính

`EXPLAIN (ANALYZE, BUFFERS)` đếm trang, không đếm giây. Thời gian đổi theo máy, theo tải và theo bộ đệm đang nóng hay nguội; số trang thì gần như đứng yên, nên nó là thước đo tốt để so hai cách viết. Từ PostgreSQL 18, `ANALYZE` tự bật `BUFFERS`.

Mỗi nút có một dòng `Buffers:` với hai phần khác nhau:

- `shared hit` / `shared read`: trang bảng và index đi qua shared buffers, đã có sẵn (`hit`) hay phải lấy vào (`read`). `read` không chắc là đọc đĩa: trang có thể đến từ page cache của hệ điều hành.
- `temp read` / `temp written`: khối file tạm của chính câu đó, khi sort hay hash vượt `work_mem`.

Nhiều người nghĩ phải cộng số của mọi dòng `Buffers:` để có tổng. Thật ra số của nút cha đã gồm số của các nút con, nên tổng của cả câu là dòng của nút trên cùng.

Đọc dòng này để chọn cách chữa. `shared` lớn (gần bằng số trang của bảng) khi chỉ cần vài dòng: thiếu index hay điều kiện lọc không dùng được index. Có `temp`: sort hay hash tràn đĩa, cần `work_mem` lớn hơn cho đúng câu đó.

Hình cuối mục này vẽ nơi `shared hit` / `shared read` sinh ra: trang có sẵn trong shared buffers dùng chung là hit, trang phải nạp từ đĩa là read. Còn `temp` thuộc `work_mem` riêng của câu, không đi qua shared buffers.

## Cú pháp

```sql
EXPLAIN (ANALYZE [, BUFFERS { ON | OFF } ] [, COSTS OFF ] [, TIMING OFF ] [, SUMMARY OFF ]) query;
SELECT pg_relation_size('table_name') / 8192 AS pages;
```

- `ANALYZE`: chạy câu thật; không có nó thì không có số trang thật.
- `BUFFERS`: mặc định bật cùng `ANALYZE` từ PostgreSQL 18.
- `TIMING OFF`, `COSTS OFF`: bỏ số giây và chi phí ước lượng để kế hoạch gọn và ổn định.
- `pg_relation_size(...) / 8192`: số trang 8 KB của bảng, để so với `shared hit`.

## Ví dụ

Tổng cả bảng: cả hai nút đọc đúng số trang của `trips`:

```sql
SELECT l FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l;
```

Tra một chuyến qua khóa chính:

```sql
SELECT l FROM plan_buf('SELECT km FROM trips WHERE id = 777', '4MB') AS l;
```

Index chỉ chạm 3 trang thay vì 163.

Lọc trên cột không có index thì vẫn phải đọc cả bảng, dù chỉ giữ 100 dòng:

```sql
SELECT l FROM plan_buf('SELECT count(*) FROM trips WHERE driver_id = 7', '4MB') AS l;
```

`Rows Removed by Filter` lớn cùng `shared hit` bằng cả bảng là dấu hiệu thiếu index.

Không cần hàm: `EXPLAIN ANALYZE` trực tiếp cũng in `Buffers:`:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT sum(km) FROM trips;
```

## Lỗi hay gặp

Cộng mọi dòng `Buffers:`:

```sql
-- WRONG: the parent line already includes its child
SELECT sum(substring(l from 'hit=(\d+)')::int) AS pages
FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l
WHERE l LIKE '%Buffers%';
```

```sql
-- FIX: read the top node only
SELECT substring(l from 'hit=(\d+)')::int AS pages
FROM plan_buf('SELECT sum(km) FROM trips', '4MB') WITH ORDINALITY AS p(l, n)
WHERE l LIKE '%Buffers%'
ORDER BY n
LIMIT 1;
```

Câu sai ra 326, gấp đôi số trang thật của bảng (163).

Quên `ANALYZE`:

```sql
-- WRONG: without ANALYZE nothing runs, so there are no page counts
EXPLAIN (BUFFERS, COSTS OFF) SELECT sum(km) FROM trips;
```

```sql
-- FIX: ANALYZE runs the query and counts its pages
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT sum(km) FROM trips;
```

Không có `ANALYZE`, câu không chạy nên không có dòng `Buffers:` nào cho các nút.

Thử `work_mem` quá nhỏ:

```sql
-- ERROR 22023: 10 kB is outside the valid range for parameter "work_mem" (64 kB .. 2097151 kB)
SELECT l FROM plan_buf('SELECT * FROM trips ORDER BY km, id', '10kB') AS l;
```

`work_mem` nhỏ nhất là 64 kB; muốn thấy sort tràn đĩa thì dùng `'64kB'`.

## Thực hành

Bốn bước trên bảng `trips` (163 trang): đọc dòng `Buffers` của một câu quét cả bảng, của một câu tra theo khóa chính, rồi của một câu sắp xếp với `work_mem` nhỏ và đủ lớn. Sau đó là hai câu hỏi.

## Tóm tắt

- `EXPLAIN (ANALYZE, BUFFERS)` đếm trang; số trang ổn định hơn số giây khi so hai cách viết.
- `shared hit`/`read` là trang bảng và index qua shared buffers; `read` có thể đến từ page cache.
- `temp read`/`written` là file tạm của sort hay hash vượt `work_mem`.
- Số của nút cha đã gồm số của nút con; tổng của câu là dòng trên cùng.
- `shared` lớn thì nghĩ tới index; có `temp` thì nghĩ tới `work_mem`.

# EN

## Opening

Two queries both run in 300 ms; one needs an index, the other needs more memory. The timing does not tell you which is which; the `Buffers:` line of the plan does.

## Key idea

`EXPLAIN (ANALYZE, BUFFERS)` counts pages, not seconds. Timing changes with the machine, the load and whether the cache is warm or cold; page counts barely move, so they are a good yardstick for comparing two ways of writing a query. Since PostgreSQL 18, `ANALYZE` turns on `BUFFERS` by itself.

Each node gets a `Buffers:` line with two different parts:

- `shared hit` / `shared read`: table and index pages going through shared buffers, already there (`hit`) or brought in (`read`). `read` is not necessarily a disk read: the page may come from the OS page cache.
- `temp read` / `temp written`: blocks of the query's own temporary files, when a sort or hash goes over `work_mem`.

Many people think you must add up every `Buffers:` line to get the total. In fact a parent node's numbers already include its children's, so the whole query's total is the line of the top node.

Read this line to choose the fix. A large `shared` (close to the table's page count) when only a few rows are needed: a missing index, or a filter that cannot use one. Any `temp`: a sort or hash spilling to disk, which needs more `work_mem` for that query.

The figure at the end of this section draws where `shared hit` / `shared read` come from: a page already in the shared buffers is a hit, a page loaded from disk is a read. `temp` belongs to the query's private `work_mem` and never goes through the shared buffers.

## Syntax

```sql
EXPLAIN (ANALYZE [, BUFFERS { ON | OFF } ] [, COSTS OFF ] [, TIMING OFF ] [, SUMMARY OFF ]) query;
SELECT pg_relation_size('table_name') / 8192 AS pages;
```

- `ANALYZE`: runs the query for real; without it there are no real page counts.
- `BUFFERS`: on by default with `ANALYZE` since PostgreSQL 18.
- `TIMING OFF`, `COSTS OFF`: drop the timings and estimated costs so the plan is short and stable.
- `pg_relation_size(...) / 8192`: the table's number of 8 KB pages, to compare with `shared hit`.

## Example

A total over the whole table: both nodes read exactly the pages of `trips`:

```sql
SELECT l FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l;
```

Looking up one trip through the primary key:

```sql
SELECT l FROM plan_buf('SELECT km FROM trips WHERE id = 777', '4MB') AS l;
```

The index touches 3 pages instead of 163.

A filter on a column with no index still reads the whole table, even to keep 100 rows:

```sql
SELECT l FROM plan_buf('SELECT count(*) FROM trips WHERE driver_id = 7', '4MB') AS l;
```

A large `Rows Removed by Filter` together with a `shared hit` equal to the whole table is the sign of a missing index.

No function needed: a direct `EXPLAIN ANALYZE` prints `Buffers:` too:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT sum(km) FROM trips;
```

## Common mistakes

Adding up every `Buffers:` line:

```sql
-- WRONG: the parent line already includes its child
SELECT sum(substring(l from 'hit=(\d+)')::int) AS pages
FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l
WHERE l LIKE '%Buffers%';
```

```sql
-- FIX: read the top node only
SELECT substring(l from 'hit=(\d+)')::int AS pages
FROM plan_buf('SELECT sum(km) FROM trips', '4MB') WITH ORDINALITY AS p(l, n)
WHERE l LIKE '%Buffers%'
ORDER BY n
LIMIT 1;
```

The wrong query returns 326, twice the table's real page count (163).

Forgetting `ANALYZE`:

```sql
-- WRONG: without ANALYZE nothing runs, so there are no page counts
EXPLAIN (BUFFERS, COSTS OFF) SELECT sum(km) FROM trips;
```

```sql
-- FIX: ANALYZE runs the query and counts its pages
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT sum(km) FROM trips;
```

Without `ANALYZE` the query does not run, so its nodes get no `Buffers:` line at all.

Trying a `work_mem` that is too small:

```sql
-- ERROR 22023: 10 kB is outside the valid range for parameter "work_mem" (64 kB .. 2097151 kB)
SELECT l FROM plan_buf('SELECT * FROM trips ORDER BY km, id', '10kB') AS l;
```

The smallest `work_mem` is 64 kB; to see a sort spill, use `'64kB'`.

## Practice

Four steps on table `trips` (163 pages): read the `Buffers` line of a full-table query, of a primary-key lookup, then of a sort with a small and a large enough `work_mem`. Then two questions.

## Recap

- `EXPLAIN (ANALYZE, BUFFERS)` counts pages; page counts are steadier than seconds when comparing two queries.
- `shared hit`/`read` are table and index pages going through shared buffers; `read` may come from the page cache.
- `temp read`/`written` are temporary files of a sort or hash over `work_mem`.
- A parent node's numbers include its children's; the query's total is the top line.
- A large `shared` points to an index; any `temp` points to `work_mem`.
