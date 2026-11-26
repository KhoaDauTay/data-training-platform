---
id: e-pg-l3-17
engine: postgres
level: L3
module: vacuum-hot
title: "Đoán trước: count(*) có đọc khóa chính cho nhanh không?"
title_en: "Predict: does count(*) read the primary key to be fast?"
kind: predict
runtime: browser
minutes: 10
figures: [{ name: pg-vacuum-flow, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
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
  trap: 0
  why:
    vi: "Phương án Index Only Scan nghe hợp lý vì index nhỏ hơn heap 10 lần (30 so với 304 trang) và có đủ mọi khóa. Nhưng do MVCC (mỗi dòng có thể có nhiều phiên bản, mỗi transaction thấy một phần), index không biết dòng nào còn thấy được; chỉ visibility map mới cho bỏ qua heap, và ở đây nó trống (`relallvisible` = 0). Ép dùng index thì ra `Heap Fetches: 10000`, nên planner chọn Seq Scan. Số dòng trong `pg_class` chỉ là ước lượng cho planner, không phải kết quả của `count(*)`."
    en: "The Index Only Scan option sounds right because the index is 10 times smaller than the heap (30 against 304 pages) and holds every key. But because of MVCC (a row can have several versions, and each transaction sees some of them) the index does not know which rows are still visible; only the visibility map lets a scan skip the heap, and here it is empty (`relallvisible` = 0). Forcing the index gives `Heap Fetches: 10000`, so the planner picks a Seq Scan. The row count in `pg_class` is only an estimate for the planner, never the result of `count(*)`."
  expect: { node: Seq Scan, table: visits }
quiz:
  - q:
      vi: "`visits_vac` vừa VACUUM xong và `count(*)` chạy bằng Index Only Scan với `Heap Fetches: 0`. Rồi một UPDATE sửa đúng một dòng. Lần đếm sau có `Heap Fetches` bằng bao nhiêu?"
      en: "`visits_vac` was just vacuumed and `count(*)` runs as an Index Only Scan with `Heap Fetches: 0`. Then one UPDATE changes a single row. How many `Heap Fetches` does the next count show?"
    options:
      - { vi: "0: bảng đã VACUUM thì Index Only Scan không cần về heap nữa", en: "0: once the table is vacuumed, the Index Only Scan never needs the heap again" }
      - { vi: "Vài chục (35 trong lab): mọi mục index trỏ vào hai trang mà UPDATE vừa xóa bit all-visible", en: "A few dozen (35 in the lab): every index entry pointing into the two pages whose all-visible bit the UPDATE just cleared" }
      - { vi: "10.000: một UPDATE làm mất cả visibility map", en: "10,000: one UPDATE wipes out the whole visibility map" }
    answer: 1
    trap: 0
    why:
      vi: "\"0\" nghe hợp lý vì VACUUM vừa bật bit cho mọi trang, nhưng bit all-visible của một trang bị xóa ngay khi trang đó đổi. UPDATE đổi hai trang: trang của bản cũ và trang nhận bản mới (trang cũ đã đầy). Mỗi mục index trỏ vào hai trang đó phải về heap hỏi; mỗi trang giữ khoảng 33 dòng (10.000 ÷ 304), nên ra vài chục. Các trang khác vẫn giữ bit và được bỏ qua, nên không phải 10.000. Lần VACUUM sau bật lại bit."
      en: "\"0\" sounds right because VACUUM just set the bit on every page, but a page's all-visible bit is cleared as soon as that page changes. The UPDATE changed two pages: the old version's page and the page that took the new version (the old page was full). Every index entry pointing into those two pages must ask the heap; each page holds about 33 rows (10,000 ÷ 304), so a few dozen. All other pages keep their bit and are still skipped, so it is not 10,000. The next VACUUM sets the bits again."
  - q:
      vi: "Sau khi xóa 1.000 trong 10.000 dòng của `visits` (chưa VACUUM, chưa ANALYZE), `reltuples` trong `pg_class` là bao nhiêu?"
      en: "After deleting 1,000 of the 10,000 rows of `visits` (no VACUUM, no ANALYZE yet), what is `reltuples` in `pg_class`?"
    options:
      - { vi: "9000: `pg_class` luôn giữ số dòng chính xác", en: "9000: `pg_class` always holds the exact row count" }
      - { vi: "Vẫn 10000: đó là ước lượng, cập nhật bởi VACUUM, ANALYZE và vài lệnh DDL như CREATE INDEX", en: "Still 10000: it is an estimate, updated by VACUUM, ANALYZE and a few DDL commands such as CREATE INDEX" }
      - { vi: "0: DELETE xóa thống kê của bảng", en: "0: DELETE clears the table's statistics" }
    answer: 1
    trap: 0
    why:
      vi: "9000 nghe hợp lý vì con số nằm ngay trong catalog, nhưng `reltuples` chỉ là ước lượng số dòng (row estimate) cho planner, và DELETE không cập nhật nó. Do MVCC, không có một số dòng chung cho mọi transaction: transaction mở từ trước DELETE vẫn thấy 10.000. Vì vậy Postgres không giữ số đếm chính xác. DELETE cũng không xóa thống kê; con số chỉ đổi khi VACUUM, ANALYZE hay CREATE INDEX chạy. Muốn con số đúng cho transaction của bạn thì phải `count(*)`."
      en: "9000 sounds right because the number sits right in the catalog, but `reltuples` is only a row estimate for the planner, and DELETE does not update it. Because of MVCC there is no single row count valid for every transaction: a transaction opened before the DELETE still sees 10,000. So Postgres keeps no exact count. DELETE does not clear the statistics either; the number only changes when VACUUM, ANALYZE or CREATE INDEX runs. For the right number in your transaction you must `count(*)`."
---
## Mở bài

Trang quản trị hiện "Tổng số lượt truy cập" bằng `SELECT count(*)`, và trên bảng lớn nó chạy vài giây. Có người bảo: bảng có khóa chính, Postgres chỉ cần đếm index là xong. Đúng không?

## Ý chính

Nhiều người nghĩ `count(*)` chỉ cần đọc khóa chính nên gần như tức thì. Thật ra do MVCC, một dòng có thể thấy được với transaction này mà không với transaction khác, và index không ghi điều đó. Mục index chỉ trỏ tới tuple; muốn biết tuple còn thấy được không thì phải đọc `xmin`, `xmax` trên trang heap.

Index Only Scan bỏ qua heap được ở một trang duy nhất khi trang đó có bit all-visible trong visibility map: mọi tuple trên trang thấy được với mọi transaction. VACUUM bật bit này; bất kỳ INSERT, UPDATE hay DELETE nào trên trang cũng xóa nó. Trang không có bit thì mỗi mục index phải về heap hỏi, và kế hoạch ghi số lần đó ở `Heap Fetches`.

Vì vậy trên bảng vừa nạp mà chưa VACUUM, Index Only Scan đọc index rồi vẫn đọc gần hết heap: tệ hơn Seq Scan. Planner biết điều này qua `relallvisible` trong `pg_class` và chọn Seq Scan. Cách chữa `count(*)` chậm là để autovacuum theo kịp (hay chạy VACUUM sau một lần nạp lớn), không phải thêm index. Nếu chỉ cần con số gần đúng, `reltuples` trong `pg_class` là ước lượng miễn phí.

Hình từng bước ở cuối mục này cho thấy VACUUM đánh dấu trang "mọi dòng đều thấy được" trong visibility map; chỉ trang có dấu đó mới cho đếm mà không đọc heap.



## Ví dụ

Ép dùng index trên bảng chưa VACUUM và chỉ giữ dòng `Heap Fetches`:

```sql
SELECT l FROM count_plan('visits', false) AS l WHERE l LIKE '%Heap Fetches%';
```

## Thực hành

Chọn đáp án trước, rồi bấm "Xem thật" để thấy kế hoạch thật. Sau đó ba bước so `visits` (chưa VACUUM) với `visits_vac` (đã VACUUM), rồi hai câu hỏi.

## Tóm tắt

- Index không biết dòng nào còn thấy được; chỉ heap (`xmin`, `xmax`) biết.
- Index Only Scan bỏ qua heap ở trang all-visible; trang khác cần một heap fetch cho mỗi mục.
- VACUUM bật bit all-visible; mọi thay đổi trên trang xóa nó.
- `count(*)` chậm thì để autovacuum theo kịp; `reltuples` chỉ là ước lượng.

# EN

## Opening

The admin page shows "Total visits" with `SELECT count(*)`, and on a big table it takes several seconds. Someone says: the table has a primary key, Postgres only needs to count the index. Is that right?

## Key idea

Many people think `count(*)` only has to read the primary key and is nearly instant. In fact, because of MVCC, a row can be visible to one transaction and not to another, and the index does not record that. An index entry only points to a tuple; to know whether the tuple is still visible you must read `xmin` and `xmax` on the heap page.

An Index Only Scan can skip the heap for a page only when that page has the all-visible bit in the visibility map: every tuple on it is visible to every transaction. VACUUM sets this bit; any INSERT, UPDATE or DELETE on the page clears it. On a page without the bit, every index entry must go back to the heap to ask, and the plan counts those trips as `Heap Fetches`.

So on a freshly loaded table that was never vacuumed, an Index Only Scan reads the index and then still reads almost the whole heap: worse than a Seq Scan. The planner knows this through `relallvisible` in `pg_class` and picks a Seq Scan. The fix for a slow `count(*)` is autovacuum keeping up (or a VACUUM after a big load), not another index. If an approximate number is enough, `reltuples` in `pg_class` is a free estimate.

The step-through figure at the end of this section shows VACUUM marking pages "all visible" in the visibility map; only a marked page can be counted without reading the heap.



## Example

Force the index on the never-vacuumed table and keep only the `Heap Fetches` line:

```sql
SELECT l FROM count_plan('visits', false) AS l WHERE l LIKE '%Heap Fetches%';
```

## Practice

Pick an answer first, then press "See the real plan" to see the real plan. Then three steps compare `visits` (never vacuumed) with `visits_vac` (vacuumed), then two questions.

## Recap

- The index does not know which rows are still visible; only the heap (`xmin`, `xmax`) does.
- An Index Only Scan skips the heap on all-visible pages; other pages cost one heap fetch per entry.
- VACUUM sets the all-visible bit; any change on the page clears it.
- For a slow `count(*)`, let autovacuum keep up; `reltuples` is only an estimate.
