---
id: e-pg-l3-17
engine: postgres
level: L3
module: vacuum-hot
title: "Đoán trước: `count(*)` có đọc khóa chính cho nhanh không?"
title_en: "Predict: does `count(*)` read the primary key to be fast?"
kind: predict
runtime: browser
minutes: 10
objectives:
  - vi: Đoán kế hoạch của `count(*)` trên bảng vừa nạp và trên bảng đã VACUUM
    en: Predict the plan of `count(*)` on a freshly loaded table and on a vacuumed one
  - vi: Nối `Heap Fetches` với visibility map và MVCC
    en: Link `Heap Fetches` to the visibility map and MVCC
requires: [e-pg-l3-09]
sources:
  - https://www.postgresql.org/docs/18/indexes-index-only-scans.html
  - https://www.postgresql.org/docs/18/storage-vm.html
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://wiki.postgresql.org/wiki/Slow_Counting
lab:
  setup: |
    CREATE TABLE visits(id int PRIMARY KEY, page text, note char(200));
    INSERT INTO visits SELECT g, '/p' || g % 50, 'n' FROM generate_series(1, 10000) g;
    ANALYZE visits;
    CREATE TABLE visits_vac(id int PRIMARY KEY, page text, note char(200));
    INSERT INTO visits_vac SELECT g, '/p' || g % 50, 'n' FROM generate_series(1, 10000) g;
    VACUUM ANALYZE visits_vac;
    CREATE FUNCTION count_plan(t text, seq bool) RETURNS SETOF text LANGUAGE plpgsql AS $$ BEGIN PERFORM set_config('enable_seqscan', seq::text, true); RETURN QUERY EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT count(*) FROM ' || quote_ident(t); END $$;
  steps:
    - task:
        vi: "Đọc trong `pg_class` số trang (`relpages`) và số trang all-visible (`relallvisible`) của `visits`, `visits_pkey`, `visits_vac`, theo tên."
        en: "Read from `pg_class` the page count (`relpages`) and the all-visible page count (`relallvisible`) of `visits`, `visits_pkey` and `visits_vac`, by name."
      solution: SELECT relname, relpages, relallvisible FROM pg_class WHERE relname IN ('visits', 'visits_pkey', 'visits_vac') ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "Lọc `relname` bằng `IN` và `ORDER BY relname`."
        en: "Filter `relname` with `IN` and `ORDER BY relname`."
      fact:
        vi: "Heap 304 trang, index khóa chính chỉ 30 trang. Nhưng `visits` có 0 trang all-visible (chưa VACUUM), còn `visits_vac` có cả 304."
        en: "The heap is 304 pages, the primary key index only 30. But `visits` has 0 all-visible pages (never vacuumed), while `visits_vac` has all 304."
        probe: SELECT relname, relpages, relallvisible FROM pg_class WHERE relname IN ('visits', 'visits_pkey', 'visits_vac') ORDER BY relname
        expect: [[visits, 304, 0], [visits_pkey, 30, 0], [visits_vac, 304, 304]]
    - task:
        vi: "Hàm `count_plan(t, seq)` chạy `EXPLAIN ANALYZE` của `SELECT count(*)` trên bảng `t`; `seq` = false cấm Seq Scan để buộc dùng index. Gọi `count_plan('visits', false)` và chỉ giữ dòng chứa `Heap Fetches`."
        en: "The function `count_plan(t, seq)` runs `EXPLAIN ANALYZE` of `SELECT count(*)` on table `t`; `seq` = false forbids the Seq Scan to force the index. Call `count_plan('visits', false)` and keep only the line containing `Heap Fetches`."
      solution: SELECT l FROM count_plan('visits', false) AS l WHERE l LIKE '%Heap Fetches%'
      check: rows
      hint:
        vi: "`count_plan()` trả về các dòng chữ; lọc bằng `LIKE '%Heap Fetches%'`."
        en: "`count_plan()` returns text lines; filter with `LIKE '%Heap Fetches%'`."
      fact:
        vi: "Ép dùng index thì được Index Only Scan nhưng `Heap Fetches: 10000`: không trang nào all-visible, nên mỗi mục index phải về heap hỏi dòng đó có còn thấy được không. Index nhỏ hơn mà vẫn phải đọc cả heap, nên planner chọn Seq Scan là đúng."
        en: "Forcing the index gives an Index Only Scan but `Heap Fetches: 10000`: no page is all-visible, so every index entry goes back to the heap to ask whether that row is still visible. The index is smaller yet the heap is read anyway, so the planner is right to pick a Seq Scan."
        probe: SELECT trim(l) FROM count_plan('visits', false) AS l WHERE l LIKE '%Heap Fetches%'
        expect: [["Heap Fetches: 10000"]]
    - task:
        vi: "Giờ để planner tự chọn trên bảng đã VACUUM: gọi `count_plan('visits_vac', true)` và lấy mọi dòng."
        en: "Now let the planner choose on the vacuumed table: call `count_plan('visits_vac', true)` and return every line."
      solution: SELECT l FROM count_plan('visits_vac', true) AS l
      check: rows
      hint:
        vi: "Không lọc gì, chỉ đổi tên bảng và đối số thứ hai."
        en: "No filter, just change the table name and the second argument."
      fact:
        vi: "Sau VACUUM, planner tự chọn Index Only Scan trên `visits_vac_pkey` với `Heap Fetches: 0`: visibility map báo mọi trang all-visible, nên 30 trang index đủ trả lời. Một UPDATE hay INSERT sau đó sẽ tắt bit của trang nó chạm vào, và heap fetch quay lại."
        en: "After VACUUM the planner picks an Index Only Scan on `visits_vac_pkey` by itself, with `Heap Fetches: 0`: the visibility map says every page is all-visible, so the 30 index pages are enough. Any later UPDATE or INSERT clears the bit of the page it touches, and heap fetches come back."
        probe: "SELECT count(*) FILTER (WHERE l LIKE '%Index Only Scan using visits_vac_pkey%'), count(*) FILTER (WHERE trim(l) = 'Heap Fetches: 0') FROM count_plan('visits_vac', true) AS l"
        expect: [[1, 1]]
predict:
  sql: SELECT count(*) FROM visits
  q:
    vi: "`visits` vừa nạp 10.000 dòng và ANALYZE, chưa VACUUM. Khóa chính `visits_pkey` chỉ 30 trang, heap 304 trang. Postgres đếm thế nào?"
    en: "`visits` was just loaded with 10,000 rows and analyzed, never vacuumed. The primary key `visits_pkey` is only 30 pages, the heap 304. How does Postgres count?"
  options:
    - { vi: "Index Only Scan trên `visits_pkey`, 0 heap fetch: khóa chính đủ để đếm", en: "Index Only Scan on `visits_pkey`, 0 heap fetches: the primary key is enough to count" }
    - { vi: "Seq Scan đọc cả 304 trang heap", en: "Seq Scan reading all 304 heap pages" }
    - { vi: "Không quét gì: Postgres lưu sẵn số dòng của bảng", en: "No scan at all: Postgres keeps the row count ready" }
  answer: 1
  why:
    vi: "Phương án Index Only Scan nghe hợp lý vì index nhỏ hơn heap 10 lần và có đủ mọi khóa. Nhưng do MVCC, index không biết dòng nào còn thấy được; chỉ visibility map mới cho bỏ qua heap, và ở đây nó trống (`relallvisible` = 0). Ép dùng index thì ra `Heap Fetches: 10000`, nên planner chọn Seq Scan. Số dòng trong `pg_class` chỉ là ước lượng cho planner, không phải kết quả của `count(*)`."
    en: "The Index Only Scan option sounds right because the index is 10 times smaller than the heap and holds every key. But because of MVCC the index does not know which rows are still visible; only the visibility map lets a scan skip the heap, and here it is empty (`relallvisible` = 0). Forcing the index gives `Heap Fetches: 10000`, so the planner picks a Seq Scan. The row count in `pg_class` is only an estimate for the planner, never the result of `count(*)`."
  expect: { node: Seq Scan, table: visits }
---

## Ý chính

Nhiều người nghĩ `count(*)` chỉ cần đọc khóa chính nên gần như tức thì. Thật ra do MVCC, mỗi dòng có thể thấy được với transaction này mà không với transaction khác, và index không ghi điều đó. Index Only Scan chỉ bỏ qua heap ở trang có bit all-visible trong visibility map, bit mà VACUUM bật và mọi thay đổi trên trang tắt đi.

## Ví dụ

```sql
SELECT l FROM count_plan('visits', false) AS l WHERE l LIKE '%Heap Fetches%';
```

## Thực hành

Chọn đáp án trước, rồi bấm "Xem thật" để thấy kế hoạch thật. Sau đó ba bước so `visits` (chưa VACUUM) với `visits_vac` (đã VACUUM). Sau bài này bạn giải thích được vì sao `count(*)` trên bảng lớn vẫn chậm, và vì sao cách chữa là autovacuum theo kịp, không phải thêm index.

# EN

## Key idea

Many people think `count(*)` only has to read the primary key and is nearly instant. In fact, because of MVCC, a row can be visible to one transaction and not to another, and the index does not record that. An Index Only Scan skips the heap only on pages whose all-visible bit is set in the visibility map, a bit that VACUUM sets and any change on the page clears.

## Example

```sql
SELECT l FROM count_plan('visits', false) AS l WHERE l LIKE '%Heap Fetches%';
```

## Practice

Pick an answer first, then press "See the real plan" to see the real plan. Then three steps compare `visits` (never vacuumed) with `visits_vac` (vacuumed). After this lesson you can explain why `count(*)` on a big table is still slow, and why the fix is autovacuum keeping up, not another index.
