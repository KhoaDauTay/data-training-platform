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

## Ý chính

`EXPLAIN (ANALYZE, BUFFERS)` đếm trang, không đếm giây. Mỗi nút có một dòng `Buffers:` với hai phần khác nhau:

- `shared hit` / `shared read`: trang bảng và index đi qua shared buffers, đã có sẵn (`hit`) hay phải lấy vào (`read`);
- `temp read` / `temp written`: khối file tạm của chính câu đó, khi sort hay hash vượt `work_mem`.

Số của nút cha đã gồm số của các nút con.

## Ví dụ

```sql
SELECT l FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l WHERE l LIKE '%Buffers%';
```

## Thực hành

Bốn bước trên bảng `trips` (163 trang), rồi hai câu hỏi. Sau lab này bạn đọc được một dòng `Buffers:` và nói câu chậm vì đọc nhiều trang (cần index hay ít dữ liệu hơn) hay vì tràn file tạm (cần `work_mem`).

# EN

## Key idea

`EXPLAIN (ANALYZE, BUFFERS)` counts pages, not seconds. Each node gets a `Buffers:` line with two different parts:

- `shared hit` / `shared read`: table and index pages going through shared buffers, already there (`hit`) or brought in (`read`);
- `temp read` / `temp written`: blocks of the query's own temporary files, when a sort or hash goes over `work_mem`.

A parent node's numbers already include its children's.

## Example

```sql
SELECT l FROM plan_buf('SELECT sum(km) FROM trips', '4MB') AS l WHERE l LIKE '%Buffers%';
```

## Practice

Four steps on table `trips` (163 pages), then two questions. After this lab you can read a `Buffers:` line and say whether a query is slow because it reads many pages (needs an index or less data) or because it spills to temporary files (needs `work_mem`).
