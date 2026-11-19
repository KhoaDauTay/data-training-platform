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
viz: pg-vacuum-vm
objectives:
  - vi: Đọc trạng thái line pointer sau VACUUM (`lp_flags` 0 unused, 1 normal, 2 redirect)
    en: Read line pointer states after VACUUM (`lp_flags` 0 unused, 1 normal, 2 redirect)
  - vi: Nối `Heap Fetches` của index-only scan với visibility map
    en: Link the `Heap Fetches` of an index-only scan to the visibility map
requires: [e-pg-l3-07]
sources:
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/storage-vm.html
  - https://www.postgresql.org/docs/18/storage-fsm.html
  - https://www.postgresql.org/docs/18/pgvisibility.html
  - https://www.postgresql.org/docs/18/pgfreespacemap.html
  - https://www.postgresql.org/docs/18/indexes-index-only-scans.html
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
        vi: "Đọc visibility map của cả hai bảng: một dòng mỗi bảng với tên bảng, `all_visible`, `all_frozen` của block 0, theo tên bảng."
        en: "Read the visibility map of both tables: one row per table with the table name, `all_visible` and `all_frozen` of block 0, by table name."
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
        vi: "Index Only Scan nhưng `Heap Fetches: 20`: không trang nào all-visible, nên dòng nào cũng phải về heap kiểm tra. Cùng câu trên `reading_touched` cũng cho `Heap Fetches: 20`: chỉ một UPDATE đã làm cả trang 0 mất bit, nên 20 dòng của nó lại phải về heap; sau một VACUUM sẽ là 0."
        en: "Index Only Scan but `Heap Fetches: 20`: no page is all-visible, so every row goes back to the heap. The same query on `reading_touched` also gives `Heap Fetches: 20`: a single UPDATE cleared page 0's bit, so all 20 of its rows go back to the heap; after one VACUUM it would be 0."
        probe: SELECT heap_fetches('SELECT id FROM reading_fresh WHERE id <= 20'), heap_fetches('SELECT id FROM reading_touched WHERE id <= 20')
        expect: [["Heap Fetches: 20", "Heap Fetches: 20"]]
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
---

## Ý chính

Một lần VACUUM:

- biến dead tuple (tuple không còn transaction nào thấy) thành line pointer **unused** (dùng lại được), hoặc **redirect** khi nó là đầu một chuỗi HOT mà index còn trỏ vào;
- ghi chỗ trống vào **free space map** để INSERT sau tìm tới;
- bật bit **all-visible** trong **visibility map** khi mọi tuple trên trang thấy được với mọi transaction.

Index-only scan chỉ bỏ qua heap ở trang all-visible. Bất kỳ thay đổi nào trên trang cũng tắt bit đó.

## Ví dụ

```sql
SELECT lp, lp_flags, lp_off FROM heap_page_items(get_raw_page('cart', 0));
SELECT all_visible, all_frozen FROM pg_visibility_map_summary('reading_touched');
```

## Thực hành

Sáu bước so bảng chưa VACUUM với bảng đã VACUUM, và `VACUUM` với `VACUUM FULL`. Sau lab này bạn chẩn đoán được bloat do VACUUM không theo kịp: trang đầy dead tuple, FSM trống, và "Index Only Scan" vẫn chậm vì `Heap Fetches` cao. Cách chữa là VACUUM thường hơn (chỉnh autovacuum), không phải thêm index.

# EN

## Key idea

One VACUUM pass:

- turns dead tuples into **unused** line pointers (reusable), or a **redirect** when the tuple heads a HOT chain an index still points at;
- records the free space in the **free space map** so later INSERTs find it;
- sets the **all-visible** bit in the **visibility map** once every tuple on the page is visible to every transaction.

An index-only scan skips the heap only on all-visible pages. Any change on the page clears that bit.

## Example

```sql
SELECT lp, lp_flags, lp_off FROM heap_page_items(get_raw_page('cart', 0));
SELECT all_visible, all_frozen FROM pg_visibility_map_summary('reading_touched');
```

## Practice

Six steps comparing a table that was not vacuumed with one that was, and `VACUUM` with `VACUUM FULL`. After this lab you can diagnose bloat from VACUUM falling behind: pages full of dead tuples, an empty FSM, and an "Index Only Scan" that is still slow because `Heap Fetches` is high. The fix is to vacuum more often (tune autovacuum), not to add an index.
