---
id: e-pg-l3-09
engine: postgres
level: L3
module: vacuum-hot
title: "Lab: VACUUM đổi gì trên trang, FSM và visibility map"
title_en: "Lab: what VACUUM changes on the page, the FSM and the visibility map"
kind: lab
runtime: browser
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-vacuum-flow
objectives:
  - vi: Đọc trạng thái line pointer sau VACUUM (`lp_flags` 0 unused, 1 normal, 2 redirect)
    en: Read line pointer states after VACUUM (`lp_flags` 0 unused, 1 normal, 2 redirect)
  - vi: Nối `Heap Fetches` của index-only scan với visibility map
    en: Link the `Heap Fetches` of an index-only scan to the visibility map
requires: [e-pg-l3-07]
sources:
  - { url: https://www.postgresql.org/docs/18/routine-vacuuming.html, title_vi: "VACUUM định kỳ" }
  - { url: https://www.postgresql.org/docs/18/storage-vm.html, title_vi: "Bản đồ hiển thị (visibility map)" }
  - { url: https://www.postgresql.org/docs/18/storage-fsm.html, title_vi: "Bản đồ chỗ trống (free space map)" }
  - { url: https://www.postgresql.org/docs/18/pgvisibility.html, title_vi: "pg_visibility" }
  - { url: https://www.postgresql.org/docs/18/pgfreespacemap.html, title_vi: "pg_freespacemap" }
  - { url: https://www.postgresql.org/docs/18/indexes-index-only-scans.html, title_vi: "Index-only scan và covering index" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE EXTENSION IF NOT EXISTS pg_visibility;
    CREATE EXTENSION IF NOT EXISTS pg_freespacemap;
    CREATE TABLE cart_raw(id int PRIMARY KEY, qty int, item text);
    CREATE TABLE cart(id int PRIMARY KEY, qty int, item text);
    INSERT INTO cart_raw VALUES (1, 1, 'pen'), (2, 1, 'ink'), (3, 1, 'pad');
    INSERT INTO cart VALUES (1, 1, 'pen'), (2, 1, 'ink'), (3, 1, 'pad');
    UPDATE cart_raw SET item = 'red ink' WHERE id = 2;
    UPDATE cart SET item = 'red ink' WHERE id = 2;
    DELETE FROM cart_raw WHERE id = 3;
    DELETE FROM cart WHERE id = 3;
    VACUUM cart;
    CREATE TABLE reading_fresh(id int PRIMARY KEY, val int);
    CREATE TABLE reading_touched(id int PRIMARY KEY, val int);
    INSERT INTO reading_fresh SELECT g, g FROM generate_series(1, 10000) g;
    INSERT INTO reading_touched SELECT g, g FROM generate_series(1, 10000) g;
    ANALYZE reading_fresh;
    VACUUM ANALYZE reading_touched;
    UPDATE reading_touched SET val = val + 1 WHERE id = 5;
    CREATE TABLE space_vac(id int, pad char(100));
    CREATE TABLE space_full(id int, pad char(100));
    INSERT INTO space_vac SELECT g, 'p' FROM generate_series(1, 1000) g;
    INSERT INTO space_full SELECT g, 'p' FROM generate_series(1, 1000) g;
    DELETE FROM space_vac WHERE id <= 900;
    DELETE FROM space_full WHERE id <= 900;
    VACUUM space_vac;
    VACUUM FULL space_full;
    CREATE FUNCTION heap_fetches(q text) RETURNS text LANGUAGE plpgsql AS $$ DECLARE l text; BEGIN FOR l IN EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) ' || q LOOP IF l LIKE '%Heap Fetches%' THEN RETURN trim(l); END IF; END LOOP; RETURN NULL; END $$;
  steps:
    - task:
        vi: "`cart_raw` và `cart` đã qua cùng một UPDATE (dòng 2, HOT) và một DELETE (dòng 3); chỉ `cart` được VACUUM. Liệt kê `lp` và `lp_flags` của trang 0 bảng `cart_raw`."
        en: "`cart_raw` and `cart` went through the same UPDATE (row 2, HOT) and DELETE (row 3); only `cart` was vacuumed. List `lp` and `lp_flags` of page 0 of `cart_raw`."
      solution: SELECT lp, lp_flags FROM heap_page_items(get_raw_page('cart_raw', 0))
      check: rows
      ordered: true
      hint:
        vi: "`heap_page_items(get_raw_page('cart_raw', 0))`."
        en: "`heap_page_items(get_raw_page('cart_raw', 0))`."
      fact:
        vi: "Chưa VACUUM: cả 4 line pointer đều `lp_flags` = 1 (normal), kể cả bản cũ của dòng 2 và dòng 3 đã xóa. Trang nhìn như còn 4 dòng."
        en: "Not vacuumed: all 4 line pointers have `lp_flags` = 1 (normal), including the old row 2 and the deleted row 3. The page looks like it still holds 4 rows."
        probe: SELECT lp, lp_flags FROM heap_page_items(get_raw_page('cart_raw', 0))
        expect: [[1, 1], [2, 1], [3, 1], [4, 1]]
    - task:
        vi: "Giờ đọc `lp`, `lp_flags`, `lp_off` của trang 0 bảng `cart` (đã VACUUM)."
        en: "Now read `lp`, `lp_flags`, `lp_off` of page 0 of `cart` (vacuumed)."
      solution: SELECT lp, lp_flags, lp_off FROM heap_page_items(get_raw_page('cart', 0))
      check: rows
      ordered: true
      hint:
        vi: "Với line pointer redirect, `lp_off` không phải offset byte mà là số lp đích."
        en: "For a redirect line pointer, `lp_off` is not a byte offset but the target lp number."
      fact:
        vi: "lp 2 thành redirect (`lp_flags` 2) trỏ tới lp 4, bản HOT còn sống; lp 3 thành unused (0) và dùng lại được; lp 1 và lp 4 vẫn normal."
        en: "lp 2 became a redirect (`lp_flags` 2) to lp 4, the live HOT version; lp 3 became unused (0) and can be reused; lp 1 and lp 4 stay normal."
        probe: SELECT lp, lp_flags, CASE WHEN lp_flags = 2 THEN lp_off END FROM heap_page_items(get_raw_page('cart', 0))
        expect: [[1, 1, null], [2, 2, 4], [3, 0, null], [4, 1, null]]
    - task:
        vi: "Đọc visibility map của cả hai bảng: một dòng mỗi bảng với tên bảng, `all_visible`, `all_frozen` của block 0, theo tên bảng. `pg_visibility_map(table, block)` trả một dòng cho một block."
        en: "Read the visibility map of both tables: one row per table with the table name, `all_visible` and `all_frozen` of block 0, by table name. `pg_visibility_map(table, block)` returns one row for one block."
      solution: |
        SELECT 'cart' AS t, all_visible, all_frozen FROM pg_visibility_map('cart', 0)
        UNION ALL
        SELECT 'cart_raw', all_visible, all_frozen FROM pg_visibility_map('cart_raw', 0)
        ORDER BY t
      check: rows
      ordered: true
      hint:
        vi: "`pg_visibility_map(table, block)` trả một dòng; nối hai bảng bằng `UNION ALL`."
        en: "`pg_visibility_map(table, block)` returns one row; combine the two tables with `UNION ALL`."
      fact:
        vi: "`cart` all-visible, `cart_raw` thì không. Free space map của `cart` cũng ghi khoảng 8 KB trống ở block 0, còn `cart_raw` chưa có FSM nào."
        en: "`cart` is all-visible, `cart_raw` is not. The free space map of `cart` also records about 8 KB free on block 0, while `cart_raw` has no FSM yet."
        probe: SELECT (SELECT all_visible FROM pg_visibility_map('cart', 0)), (SELECT all_visible FROM pg_visibility_map('cart_raw', 0)), pg_freespace('cart', 0) > 7900, pg_freespace('cart_raw', 0)
        expect: [[true, false, true, 0]]
    - task:
        vi: "`reading_fresh` (10.000 dòng, chưa VACUUM) và `reading_touched` (đã VACUUM, rồi sửa dòng 5). Đọc `pg_visibility_map_summary()` của hai bảng: tên bảng và `all_visible`, theo tên bảng."
        en: "`reading_fresh` (10,000 rows, never vacuumed) and `reading_touched` (vacuumed, then row 5 updated). Read `pg_visibility_map_summary()` of both tables: table name and `all_visible`, by table name."
      solution: |
        SELECT 'reading_fresh' AS t, all_visible FROM pg_visibility_map_summary('reading_fresh')
        UNION ALL
        SELECT 'reading_touched', all_visible FROM pg_visibility_map_summary('reading_touched')
        ORDER BY t
      check: rows
      ordered: true
      hint:
        vi: "Hàm trả số trang all-visible và all-frozen của cả bảng."
        en: "The function returns the counts of all-visible and all-frozen pages for the whole table."
      fact:
        vi: "`reading_fresh`: 0 trang all-visible. `reading_touched`: 43 trên 45 trang. Một UPDATE tắt bit của 2 trang: trang 0 (bản cũ) và trang 44, nơi bản mới rơi vào vì trang 0 đã đầy."
        en: "`reading_fresh`: 0 all-visible pages. `reading_touched`: 43 of 45 pages. One UPDATE cleared the bit on 2 pages: page 0 (old version) and page 44, where the new version landed because page 0 was full."
        probe: SELECT (SELECT all_visible FROM pg_visibility_map_summary('reading_fresh')), (SELECT all_visible FROM pg_visibility_map_summary('reading_touched')), pg_relation_size('reading_touched') / 8192, (SELECT ctid::text FROM reading_touched WHERE id = 5)
        expect: [[0, 43, 45, "(44,57)"]]
    - task:
        vi: "Chạy `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)` cho câu lấy `id` của 20 dòng đầu (`id <= 20`) trong `reading_fresh`. Đoán trước khi chạy: Index Only Scan có phải về heap lần nào không?"
        en: "Run `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)` for the query reading `id` of the first 20 rows (`id <= 20`) of `reading_fresh`. Guess before you run it: does the Index Only Scan go back to the heap at all?"
      solution: EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT id FROM reading_fresh WHERE id <= 20
      check: rows
      hint:
        vi: Chỉ chọn cột `id` để index khóa chính đủ trả lời.
        en: Select only `id` so the primary key index alone can answer.
      fact:
        vi: "Index Only Scan nhưng `Heap Fetches: 20`: không trang nào all-visible, nên dòng nào cũng phải về heap kiểm tra. Trên `reading_touched`, chỉ một UPDATE đã làm cả trang 0 mất bit, nên 20 dòng của nó cũng phải về heap: lần quét đầu ra `Heap Fetches: 21`, vì index còn một mục trỏ tới bản cũ (đã chết) của dòng 5; lần quét đó đánh dấu mục chết, các lần sau ra 20. Sau một VACUUM sẽ là 0."
        en: "Index Only Scan but `Heap Fetches: 20`: no page is all-visible, so every row goes back to the heap. On `reading_touched` a single UPDATE cleared page 0's bit, so its 20 rows go back to the heap too: the first scan shows `Heap Fetches: 21`, because the index still has an entry for the old (dead) version of row 5; that scan marks the entry dead, and later scans show 20. After one VACUUM it would be 0."
        probe: SELECT heap_fetches('SELECT id FROM reading_fresh WHERE id <= 20'), heap_fetches('SELECT id FROM reading_touched WHERE id <= 20')
        expect: [["Heap Fetches: 20", "Heap Fetches: 21"]]
    - task:
        vi: "`space_vac` và `space_full` cùng có 1.000 dòng rồi bị xóa 900 dòng đầu. `space_vac` qua `VACUUM`, `space_full` qua `VACUUM FULL`. Lấy tên bảng, số trang (`pg_relation_size` chia 8192) và tổng byte trống theo FSM (`sum(avail)` của `pg_freespace`), theo tên bảng. Đoán trước khi chạy: sau `VACUUM`, `space_vac` còn bao nhiêu trang so với lúc có 1.000 dòng?"
        en: "`space_vac` and `space_full` both had 1,000 rows, then lost the first 900. `space_vac` got `VACUUM`, `space_full` got `VACUUM FULL`. Return the table name, the number of pages (`pg_relation_size` divided by 8192) and the total free bytes per the FSM (`sum(avail)` of `pg_freespace`), by table name. Guess before you run it: after `VACUUM`, how many pages does `space_vac` keep compared with when it held 1,000 rows?"
      solution: |
        SELECT t, pg_relation_size(t) / 8192 AS pages, (SELECT sum(avail) FROM pg_freespace(t::regclass)) AS fsm_free
        FROM unnest(ARRAY['space_full', 'space_vac']) AS t
        ORDER BY t
      check: rows
      ordered: true
      hint:
        vi: "`pg_freespace(table)` trả một dòng mỗi block với cột `avail`."
        en: "`pg_freespace(table)` returns one row per block with an `avail` column."
      fact:
        vi: "`VACUUM` không trả chỗ cho hệ điều hành: `space_vac` vẫn 18 trang, chỗ của 900 dòng chỉ được ghi vào FSM để dòng mới dùng lại. `VACUUM FULL` viết lại bảng: `space_full` còn 2 trang (nhưng giữ lock `ACCESS EXCLUSIVE` trên bảng suốt lúc chạy)."
        en: "`VACUUM` does not give space back to the OS: `space_vac` is still 18 pages, the space of the 900 rows is only recorded in the FSM for new rows to reuse. `VACUUM FULL` rewrites the table: `space_full` is down to 2 pages (but it holds an `ACCESS EXCLUSIVE` lock on the table while it runs)."
        probe: SELECT t, pg_relation_size(t) / 8192, (SELECT sum(avail) FROM pg_freespace(t::regclass)) > 90000 FROM unnest(ARRAY['space_full', 'space_vac']) AS t ORDER BY t
        expect: [[space_full, 2, false], [space_vac, 18, true]]
quiz:
  - q:
      vi: "Bảng 10 GB bị xóa một nửa số dòng, rồi autovacuum chạy xong. File của bảng giờ khoảng bao nhiêu?"
      en: "Half the rows of a 10 GB table are deleted, then autovacuum finishes. About how big is the table's file now?"
    options:
      - { vi: "Khoảng 5 GB: VACUUM trả chỗ trống cho hệ điều hành", en: "About 5 GB: VACUUM gives the free space back to the OS" }
      - { vi: "Vẫn khoảng 10 GB: chỗ trống được ghi vào FSM để dòng mới dùng lại", en: "Still about 10 GB: the free space is recorded in the FSM for new rows to reuse" }
      - { vi: "0: VACUUM xóa file rồi tạo lại", en: "0: VACUUM deletes the file and creates it again" }
    answer: 1
    trap: 0
    why:
      vi: "\"Khoảng 5 GB\" nghe hợp lý vì VACUUM đúng là thu hồi chỗ, nhưng chỗ đó ở lại trong file: VACUUM ghi nó vào FSM (free space map, bản đồ chỗ trống của từng trang) cho INSERT và UPDATE sau dùng lại. VACUUM thường chỉ cắt được các trang trống ở cuối file, và không bao giờ xóa file. Bước 6 thấy `space_vac` vẫn 18 trang sau khi mất 900/1.000 dòng; chỉ `VACUUM FULL` (viết lại bảng, giữ lock trên cả bảng) mới co về 2 trang."
      en: "\"About 5 GB\" sounds right because VACUUM does reclaim space, but that space stays inside the file: VACUUM records it in the FSM (free space map, the free space of each page) for later INSERTs and UPDATEs to reuse. Plain VACUUM can only cut off empty pages at the end of the file, and never deletes the file. Step 6 shows `space_vac` still at 18 pages after losing 900 of 1,000 rows; only `VACUUM FULL` (which rewrites the table under a lock on all of it) shrinks it to 2."
  - q:
      vi: "`EXPLAIN ANALYZE` ra Index Only Scan nhưng `Heap Fetches: 5000` trên 5000 dòng. Cách chữa nào đúng?"
      en: "`EXPLAIN ANALYZE` shows an Index Only Scan but `Heap Fetches: 5000` for 5000 rows. Which fix is right?"
    options:
      - { vi: "Thêm một index nữa để khỏi về heap", en: "Add another index so it skips the heap" }
      - { vi: "Cho VACUUM chạy (hoặc chỉnh autovacuum chạy thường hơn) để bật bit all-visible", en: "Let VACUUM run (or tune autovacuum to run more often) so the all-visible bits get set" }
      - { vi: "Chạy `ANALYZE` để cập nhật thống kê", en: "Run `ANALYZE` to refresh the statistics" }
    answer: 1
    trap: 0
    why:
      vi: "\"Thêm index\" nghe hợp lý vì chậm thì hay nghĩ tới index, nhưng Index Only Scan nghĩa là index đã đủ cột. Nó vẫn về heap vì trang chưa có bit all-visible (mọi dòng của trang thấy được với mọi transaction) trong visibility map, nên phải kiểm tra từng dòng. Chỉ VACUUM bật bit đó; `ANALYZE` chỉ cập nhật thống kê cho planner. Ở bước 5, `Heap Fetches` của `reading_fresh` là 20 vì bảng chưa VACUUM lần nào; sau một `VACUUM` nó về 0."
      en: "\"Add an index\" sounds right because slowness makes people think of indexes, but an Index Only Scan means the index already covers the columns. It still goes to the heap because the pages lack the all-visible bit (every row on the page is visible to every transaction) in the visibility map, so each row must be checked. Only VACUUM sets that bit; `ANALYZE` only refreshes the planner's statistics. In step 5, `reading_fresh` shows `Heap Fetches` 20 because it was never vacuumed; after one `VACUUM` it drops to 0."
---
## Mở bài

Bạn xóa 90 % dòng của một bảng, VACUUM chạy xong, mà file vẫn to như cũ. VACUUM thật ra đã làm gì?

## Ý chính

Một lần VACUUM:

- biến tuple chết (không transaction nào còn thấy) thành line pointer unused, dùng lại được; hoặc redirect khi đó là đầu một chuỗi HOT mà index còn trỏ vào;
- ghi chỗ trống vào free space map (FSM) để INSERT sau tìm tới;
- bật bit all-visible trong visibility map (VM) khi mọi tuple trên trang thấy được với mọi transaction, và bit all-frozen khi đã freeze.

Nhiều người nghĩ VACUUM làm file nhỏ lại. Thật ra chỗ thu hồi ở lại trong file cho dòng mới; chỉ `VACUUM FULL` viết lại bảng cho gọn, và nó giữ khóa `ACCESS EXCLUSIVE` suốt lúc chạy.

Index-only scan chỉ bỏ qua heap ở trang all-visible. Một thay đổi bất kỳ trên trang tắt bit đó, nên bảng hay sửa mà ít VACUUM sẽ có `Heap Fetches` cao. Trên máy chủ thật, autovacuum lo việc này; khi nó không theo kịp, bạn thấy bảng phình, FSM trống và index-only scan chậm dần.

## Cú pháp

```sql
VACUUM [ ( { FULL | FREEZE | VERBOSE | ANALYZE } [, ...] ) ] [ table_name ];
SELECT all_visible, all_frozen FROM pg_visibility_map('table_name', block_number);
SELECT all_visible, all_frozen FROM pg_visibility_map_summary('table_name');
SELECT pg_freespace('table_name', block_number);
```

- `lp_flags`: 0 unused, 1 normal, 2 redirect, 3 dead.
- `FREEZE`: freeze mọi tuple ngay, bật cả all-frozen.

## Ví dụ

```sql
SELECT all_visible, pg_freespace('cart_raw', 0) AS fsm_free
FROM pg_visibility_map('cart_raw', 0);
```

`cart_raw` chưa VACUUM: chưa all-visible, FSM ghi 0.

```sql
VACUUM cart_raw;
SELECT all_visible, pg_freespace('cart_raw', 0) AS fsm_free
FROM pg_visibility_map('cart_raw', 0);
```

Sau VACUUM: all-visible, FSM ghi 8064 byte trống.

```sql
VACUUM (FREEZE) cart_raw;
SELECT all_visible, all_frozen FROM pg_visibility_map('cart_raw', 0);
```

`FREEZE` bật cả all-frozen: trang này không cần quét lại khi chống wraparound.

## Lỗi hay gặp

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM cart;
```

VACUUM phải chạy ngoài transaction, nên công cụ tự mở transaction sẽ gặp lỗi này; sau lỗi, `ROLLBACK`.

```sql
-- WRONG: the visibility map is stale, so the index-only scan visits the heap
ROLLBACK;
SELECT heap_fetches('SELECT id FROM reading_touched WHERE id <= 20') AS fetches;
```

```sql
-- FIX: VACUUM sets the all-visible bits again
VACUUM reading_touched;
SELECT heap_fetches('SELECT id FROM reading_touched WHERE id <= 20') AS fetches;
```

21 lần về heap trước, 0 sau VACUUM. Thêm index không chữa được chuyện này, vì index đã đủ cột; thiếu là bit all-visible.

## Thực hành

Sáu bước: trang chưa và đã VACUUM, visibility map, index-only scan, rồi `VACUUM` so với `VACUUM FULL`. Sau đó là hai câu hỏi.

## Tóm tắt

- VACUUM biến tuple chết thành unused (hoặc redirect), ghi chỗ trống vào FSM, bật bit trong VM.
- VACUUM không trả chỗ cho hệ điều hành; `VACUUM FULL` thì có, nhưng khóa cả bảng.
- Index-only scan chỉ bỏ qua heap ở trang all-visible; `Heap Fetches` cao nghĩa là cần VACUUM, không phải index.
- `VACUUM (FREEZE)` bật all-frozen; VACUUM không chạy được trong transaction.

# EN

## Opening

You delete 90% of a table's rows, VACUUM finishes, and the file is as big as before. What did VACUUM actually do?

## Key idea

One VACUUM pass:

- turns dead tuples (no transaction can see them any more) into unused line pointers, ready for reuse; or into a redirect when the tuple heads a HOT chain an index still points at;
- records the free space in the free space map (FSM) so later INSERTs find it;
- sets the all-visible bit in the visibility map (VM) once every tuple on the page is visible to every transaction, and the all-frozen bit once they are frozen.

Many people think VACUUM makes the file smaller. In fact the reclaimed space stays inside the file for new rows; only `VACUUM FULL` rewrites the table compactly, and it holds an `ACCESS EXCLUSIVE` lock the whole time.

An index-only scan skips the heap only on all-visible pages. Any change on a page clears that bit, so a frequently changed table that is rarely vacuumed shows high `Heap Fetches`. On a real server autovacuum does this work; when it falls behind, you see the table bloat, the FSM stay empty and index-only scans slow down.

## Syntax

```sql
VACUUM [ ( { FULL | FREEZE | VERBOSE | ANALYZE } [, ...] ) ] [ table_name ];
SELECT all_visible, all_frozen FROM pg_visibility_map('table_name', block_number);
SELECT all_visible, all_frozen FROM pg_visibility_map_summary('table_name');
SELECT pg_freespace('table_name', block_number);
```

- `lp_flags`: 0 unused, 1 normal, 2 redirect, 3 dead.
- `FREEZE`: freezes every tuple at once and sets all-frozen too.

## Example

```sql
SELECT all_visible, pg_freespace('cart_raw', 0) AS fsm_free
FROM pg_visibility_map('cart_raw', 0);
```

`cart_raw` is not vacuumed: not all-visible, the FSM says 0.

```sql
VACUUM cart_raw;
SELECT all_visible, pg_freespace('cart_raw', 0) AS fsm_free
FROM pg_visibility_map('cart_raw', 0);
```

After VACUUM: all-visible, and the FSM records 8064 free bytes.

```sql
VACUUM (FREEZE) cart_raw;
SELECT all_visible, all_frozen FROM pg_visibility_map('cart_raw', 0);
```

`FREEZE` sets all-frozen as well: this page needs no rescan to protect against wraparound.

## Common mistakes

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM cart;
```

VACUUM must run outside a transaction, so a tool that opens one for you hits this error; after the error, `ROLLBACK`.

```sql
-- WRONG: the visibility map is stale, so the index-only scan visits the heap
ROLLBACK;
SELECT heap_fetches('SELECT id FROM reading_touched WHERE id <= 20') AS fetches;
```

```sql
-- FIX: VACUUM sets the all-visible bits again
VACUUM reading_touched;
SELECT heap_fetches('SELECT id FROM reading_touched WHERE id <= 20') AS fetches;
```

21 heap visits before, 0 after VACUUM. Adding an index does not fix this, because the index already covers the columns; what is missing is the all-visible bit.

## Practice

Six steps: pages before and after VACUUM, the visibility map, an index-only scan, then `VACUUM` against `VACUUM FULL`. Then two questions.

## Recap

- VACUUM turns dead tuples into unused (or redirect) line pointers, records free space in the FSM and sets bits in the VM.
- VACUUM does not give space back to the OS; `VACUUM FULL` does, but locks the whole table.
- An index-only scan skips the heap only on all-visible pages; high `Heap Fetches` means VACUUM is needed, not an index.
- `VACUUM (FREEZE)` sets all-frozen; VACUUM cannot run inside a transaction.
