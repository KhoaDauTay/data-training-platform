---
id: e-pg-l3-15
engine: postgres
level: L3
module: capstone-l3
title: "Kiểm tra cấp L3: bảng giỏ hàng phình to"
title_en: "L3 check: the cart table that keeps growing"
kind: capstone
runtime: browser
minutes: 30
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-hot-chain
objectives:
  - vi: Chẩn đoán vì sao UPDATE không HOT trên một bảng còn chỗ trống, từ bộ đếm, trang heap, index và WAL
    en: Diagnose why UPDATEs are not HOT on a table that has free space, from the counters, the heap page, the indexes and the WAL
  - vi: Bác một cách chữa nghe hợp lý bằng số đo, rồi chọn cách chữa đúng
    en: Reject a plausible fix with measurements, then choose the right one
requires: [e-pg-l3-08, e-pg-l3-13, e-pg-l3-16, e-pg-l3-18]
sources:
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
  - https://www.postgresql.org/docs/18/pgwalinspect.html
  - https://www.postgresql.org/docs/18/sql-createtable.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_walinspect;
    CREATE TABLE carts(id int PRIMARY KEY, user_id int NOT NULL, touched_at timestamp NOT NULL, items int NOT NULL) WITH (fillfactor = 70);
    CREATE TABLE carts_lean(id int PRIMARY KEY, user_id int NOT NULL, touched_at timestamp NOT NULL, items int NOT NULL) WITH (fillfactor = 70);
    INSERT INTO carts SELECT g, g, TIMESTAMP '2026-11-01' + g * INTERVAL '1 minute', 1 FROM generate_series(1, 400) g;
    INSERT INTO carts_lean SELECT * FROM carts;
    CREATE INDEX carts_touched_idx ON carts (touched_at);
    VACUUM ANALYZE carts;
    VACUUM ANALYZE carts_lean;
    SELECT pg_stat_reset();
    SELECT items FROM carts WHERE id = 7;
    SELECT items FROM carts WHERE id = 8;
    CREATE TABLE wal_marks(name text NOT NULL, lsn pg_lsn NOT NULL);
    INSERT INTO wal_marks VALUES ('before', pg_current_wal_insert_lsn());
    UPDATE carts SET touched_at = touched_at + INTERVAL '1 day', items = items + 1 WHERE id <= 50;
    INSERT INTO wal_marks VALUES ('after', pg_current_wal_insert_lsn());
    UPDATE carts_lean SET touched_at = touched_at + INTERVAL '1 day', items = items + 1 WHERE id <= 50;
    SELECT pg_stat_force_next_flush();
  steps:
    - task:
        vi: "Đội ứng dụng báo: bảng `carts` (400 giỏ hàng, mỗi lần khách bấm thì `touched_at` và `items` đổi) phình nhanh dù đã đặt `fillfactor = 70`. Vừa có 50 giỏ được sửa. Đọc bộ đếm của `carts`: `n_tup_upd`, `n_tup_hot_upd`, `n_dead_tup`."
        en: "The app team reports: table `carts` (400 carts; each customer click changes `touched_at` and `items`) grows fast even though `fillfactor = 70` is set. 50 carts were just updated. Read the counters of `carts`: `n_tup_upd`, `n_tup_hot_upd`, `n_dead_tup`."
      solution: SELECT n_tup_upd, n_tup_hot_upd, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'carts'
      check: rows
      hint:
        vi: "`pg_stat_user_tables`, lọc `relname`."
        en: "`pg_stat_user_tables`, filter on `relname`."
      fact:
        vi: "50 UPDATE, 0 HOT, 50 dead tuple: mỗi lần sửa để lại một phiên bản chết (MVCC) và không lần nào HOT."
        en: "50 updates, 0 HOT, 50 dead tuples: every change left a dead version behind (MVCC) and none was HOT."
        probe: SELECT n_tup_upd, n_tup_hot_upd, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'carts'
        expect: [[50, 0, 50]]
    - task:
        vi: "Ở bài fillfactor, HOT hỏng vì trang đầy. Ở đây có phải vậy không? Bản mới của 50 giỏ nằm ở trang nào: lấy số trang (phần đầu của `ctid`, kiểu int, tên page) và số dòng, cho `id <= 50`, theo trang."
        en: "In the fillfactor lesson HOT failed because the page was full. Is that the case here? Which pages hold the new versions of the 50 carts: return the page number (first part of `ctid`, as int, named page) and the row count for `id <= 50`, by page."
      solution: |
        SELECT (ctid::text::point)[0]::int AS page, count(*) AS n
        FROM carts
        WHERE id <= 50
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "`(ctid::text::point)[0]` lấy số trang của `ctid`."
        en: "`(ctid::text::point)[0]` takes the page number out of `ctid`."
      fact:
        vi: "48 trên 50 bản mới vẫn nằm ở trang 0, cùng trang với bản cũ: trang còn chỗ, nên giả thuyết \"trang đầy\" sai. Chỉ 2 bản cuối phải sang trang 3 khi trang 0 vừa đầy."
        en: "48 of the 50 new versions are still on page 0, the same page as the old ones: the page had room, so the \"full page\" theory is wrong. Only the last 2 had to move to page 3 once page 0 filled up."
        probe: SELECT (ctid::text::point)[0]::int, count(*) FROM carts WHERE id <= 50 GROUP BY 1 ORDER BY 1
        expect: [[0, 48], [3, 2]]
    - task:
        vi: "Điều kiện còn lại của HOT là các index. Liệt kê index của `carts`: tên, `idx_scan` (số lần được dùng từ lúc reset), số trang (`pg_relation_size(indexrelid)` chia 8192), theo tên."
        en: "The other HOT condition is about indexes. List the indexes of `carts`: name, `idx_scan` (times used since the reset), page count (`pg_relation_size(indexrelid)` divided by 8192), by name."
      solution: SELECT indexrelname, idx_scan, pg_relation_size(indexrelid) / 8192 AS pages FROM pg_stat_user_indexes WHERE relname = 'carts' ORDER BY indexrelname
      check: rows
      ordered: true
      hint:
        vi: "`pg_stat_user_indexes` có `indexrelname`, `idx_scan` và `indexrelid`."
        en: "`pg_stat_user_indexes` has `indexrelname`, `idx_scan` and `indexrelid`."
      fact:
        vi: "`carts_touched_idx` nằm trên đúng cột mà mỗi lần bấm đều đổi, nên không UPDATE nào HOT được. Và nó chưa được câu nào dùng (`idx_scan` = 0), trong khi khóa chính được dùng 2 lần."
        en: "`carts_touched_idx` sits on exactly the column every click changes, so no UPDATE can be HOT. And no query has used it (`idx_scan` = 0), while the primary key was used twice."
        probe: SELECT indexrelname, idx_scan, pg_relation_size(indexrelid) / 8192 FROM pg_stat_user_indexes WHERE relname = 'carts' ORDER BY indexrelname
        expect: [[carts_pkey, 2, 4], [carts_touched_idx, 0, 4]]
    - task:
        vi: "Cái giá ghi ra WAL: lab đã lưu LSN trước và sau đợt UPDATE vào bảng `wal_marks`. Đếm bản ghi WAL trong khoảng đó theo `resource_manager`, chỉ giữ các `record_type` ghi một phiên bản dòng hay một mục index: `UPDATE`, `HOT_UPDATE`, `INSERT_LEAF`, `SPLIT_L`, `SPLIT_R`."
        en: "The cost in WAL: the lab saved the LSN before and after the UPDATE batch in table `wal_marks`. Count the WAL records in that range by `resource_manager`, keeping only the `record_type` values that write a row version or an index entry: `UPDATE`, `HOT_UPDATE`, `INSERT_LEAF`, `SPLIT_L`, `SPLIT_R`."
      solution: |
        SELECT resource_manager, count(*) AS n
        FROM pg_get_wal_records_info(
          (SELECT lsn FROM wal_marks WHERE name = 'before'),
          (SELECT lsn FROM wal_marks WHERE name = 'after'))
        WHERE record_type IN ('UPDATE', 'HOT_UPDATE', 'INSERT_LEAF', 'SPLIT_L', 'SPLIT_R')
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "`pg_get_wal_records_info(start_lsn, end_lsn)`; lấy hai LSN bằng truy vấn con trên `wal_marks`."
        en: "`pg_get_wal_records_info(start_lsn, end_lsn)`; get the two LSNs with subqueries on `wal_marks`."
      fact:
        vi: "50 bản ghi Heap (đều là `UPDATE`, không có `HOT_UPDATE` nào) và 100 bản ghi Btree: 99 `INSERT_LEAF` và 1 `SPLIT_L`, lần chèn làm tách một trang lá. Mỗi UPDATE không HOT thêm một mục vào **cả hai** index, kể cả khóa chính dù `id` không đổi."
        en: "50 Heap records (all `UPDATE`, not a single `HOT_UPDATE`) and 100 Btree records: 99 `INSERT_LEAF` and 1 `SPLIT_L`, an insert that split a leaf page. Every non-HOT UPDATE adds an entry to **both** indexes, the primary key included even though `id` did not change."
        probe: SELECT resource_manager, record_type, count(*) FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE name = 'before'), (SELECT lsn FROM wal_marks WHERE name = 'after')) WHERE record_type IN ('UPDATE', 'HOT_UPDATE', 'INSERT_LEAF', 'SPLIT_L', 'SPLIT_R') GROUP BY 1, 2 ORDER BY 1, 2
        expect: [[Btree, INSERT_LEAF, 99], [Btree, SPLIT_L, 1], [Heap, UPDATE, 50]]
    - task:
        vi: "`carts_lean` là bản sao của `carts`, cùng `fillfactor = 70` và cùng đợt UPDATE, chỉ không có index trên `touched_at`. Đọc `n_tup_upd`, `n_tup_hot_upd` của nó."
        en: "`carts_lean` is a copy of `carts` with the same `fillfactor = 70` and the same UPDATE batch, only without the index on `touched_at`. Read its `n_tup_upd` and `n_tup_hot_upd`."
      solution: SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'carts_lean'
      check: rows
      hint:
        vi: "Như bước 1, đổi tên bảng."
        en: "Like step 1, with the other table name."
      fact:
        vi: "48 trên 50 UPDATE là HOT: đúng 48 bản mới vừa trang 0, còn 2 bản phải sang trang khác thì không HOT được. Cùng dữ liệu, cùng `fillfactor`; khác biệt duy nhất là index thừa."
        en: "48 of the 50 updates are HOT: exactly the 48 new versions that fit on page 0, while the 2 that had to move to another page could not be. Same data, same `fillfactor`; the only difference is the extra index."
        probe: SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'carts_lean'
        expect: [[50, 48]]
    - task:
        vi: "Khóa chính thì phải giữ: trang giỏ hàng đọc giỏ của khách qua nó mỗi lần bấm. Lấy `id`, `items`, `touched_at` của giỏ `id = 42`. Bước này có thanh hiệu năng: câu trả đúng dòng mà không đi qua index vẫn chưa qua."
        en: "The primary key must stay: the cart page reads the customer's cart through it on every click. Return `id`, `items`, `touched_at` of cart `id = 42`. This step has a performance bar: a query that returns the right rows without going through an index does not pass."
      solution: SELECT id, items, touched_at FROM carts WHERE id = 42
      check: rows
      perf: { table: carts }
      slow: SELECT id, items, touched_at FROM carts WHERE id::text = '42'
      hint:
        vi: "So cột `id` trực tiếp với số 42; ép kiểu cột (`id::text`) làm planner bỏ `carts_pkey`."
        en: "Compare column `id` directly with the number 42; casting the column (`id::text`) makes the planner drop `carts_pkey`."
      fact:
        vi: "Giỏ 42 có `items` = 2 sau đợt sửa. Index Scan trên `carts_pkey` chỉ chạm vài trang; `id::text = '42'` phải Seq Scan cả bảng, và bảng phình vì HOT miss thì càng đắt."
        en: "Cart 42 has `items` = 2 after the batch. An Index Scan on `carts_pkey` touches a few pages; `id::text = '42'` has to Seq Scan the whole table, which costs more the more it bloats from HOT misses."
        probe: SELECT id, items FROM carts WHERE id = 42
        expect: [[42, 2]]
quiz:
  - q:
      vi: "Một đồng nghiệp đề xuất hạ `fillfactor` của `carts` xuống 50 và chạy `VACUUM FULL` để chừa thêm chỗ cho HOT. Có nên làm không?"
      en: "A colleague proposes lowering the `fillfactor` of `carts` to 50 and running `VACUUM FULL` to leave more room for HOT. Should you?"
    options:
      - { vi: "Có: bài fillfactor đã chứng minh trang có chỗ thì UPDATE được HOT", en: "Yes: the fillfactor lesson proved that a page with room gives HOT updates" }
      - { vi: "Không: 48 trên 50 bản mới đã nằm cùng trang mà vẫn 0 HOT, nên chỗ trống không phải vấn đề; `VACUUM FULL` còn giữ lock `ACCESS EXCLUSIVE` và bảng to thêm", en: "No: 48 of the 50 new versions already stayed on their page and still 0 were HOT, so free space is not the problem; `VACUUM FULL` also holds an `ACCESS EXCLUSIVE` lock and the table gets bigger" }
      - { vi: "Có, nhưng chỉ cần `VACUUM` thường, không cần FULL", en: "Yes, but a plain `VACUUM` is enough, no FULL needed" }
    answer: 1
    why:
      vi: "Đề xuất này hấp dẫn vì nó đúng ở bài fillfactor, với bảng khác: ở đó trang đầy. Ở đây bước 2 cho thấy trang còn chỗ (48 bản mới vẫn ở trang 0) mà bước 1 vẫn 0 HOT. HOT update cần **cả hai** điều kiện: trang có chỗ và không đổi cột có index. Cái hỏng là điều kiện về index (`touched_at` có index và đổi mỗi lần bấm), nên thêm chỗ trống, bằng `VACUUM FULL` hay `VACUUM` thường, không đổi được gì."
      en: "The proposal is tempting because it was right in the fillfactor lesson, on a different table: there the pages were full. Here step 2 shows the page had room (48 new versions still on page 0) and step 1 still has 0 HOT. A HOT update needs **both** conditions: room on the page and no indexed column changed. The broken one is the index condition (`touched_at` is indexed and changes on every click), so more free space, from `VACUUM FULL` or a plain `VACUUM`, changes nothing."
  - q:
      vi: "Kết luận cho đội ứng dụng: sửa `carts` thế nào?"
      en: "Conclusion for the app team: how should `carts` be fixed?"
    options:
      - { vi: "Thêm index trên `items` để UPDATE tìm giỏ nhanh hơn", en: "Add an index on `items` so UPDATEs find carts faster" }
      - { vi: "Bỏ `carts_touched_idx` (0 lần dùng; kiểm lại bộ đếm qua trọn một chu kỳ báo cáo trước khi xóa): UPDATE trở lại HOT như `carts_lean`, và WAL không còn 100 bản ghi index cho mỗi 50 lần sửa", en: "Drop `carts_touched_idx` (0 uses; check the counters over a full reporting cycle before dropping it): UPDATEs become HOT again as in `carts_lean`, and the WAL no longer gets 100 index records per 50 changes" }
      - { vi: "Tăng `shared_buffers` để UPDATE ghi vào bộ nhớ", en: "Raise `shared_buffers` so UPDATEs write to memory" }
      - { vi: "Chạy `CHECKPOINT` thường xuyên hơn để WAL nhỏ lại", en: "Run `CHECKPOINT` more often to shrink the WAL" }
    answer: 1
    why:
      vi: "Thêm index nghe như cách tăng tốc quen thuộc, nhưng UPDATE tìm giỏ bằng khóa chính, và một index trên cột bị sửa chính là thứ đã chặn HOT. Bằng chứng là ba con số: 0 HOT ở `carts`, 100 bản ghi Btree cho 50 UPDATE, và 48 HOT ở `carts_lean` chỉ vì thiếu index đó. `shared_buffers` không đổi được số bản ghi phải ghi. `CHECKPOINT` dày hơn còn làm WAL to thêm, vì mỗi lần sửa đầu tiên sau checkpoint ghi cả trang (full-page image)."
      en: "Adding an index sounds like the usual speed-up, but the UPDATE finds a cart by its primary key, and an index on a changed column is exactly what blocked HOT. The evidence is three numbers: 0 HOT on `carts`, 100 Btree records for 50 UPDATEs, and 48 HOT on `carts_lean` just for lacking that index. `shared_buffers` cannot change how many records must be written. A more frequent `CHECKPOINT` would make the WAL bigger, because the first change after each checkpoint logs the whole page (a full-page image)."
---
## Mở bài

Đội ứng dụng báo bảng giỏ hàng `carts` phình nhanh dù đã đặt `fillfactor = 70` theo đúng bài trước. Có người đề nghị hạ fillfactor thêm nữa. Trước khi làm, bạn cần số đo.

## Ý chính

Bài cuối cấp L3 dùng một bảng mới và một nguyên nhân khác bài fillfactor. Bạn ghép cả cấp: bộ đếm cho biết có chuyện (0 HOT, dead tuple), trang heap loại một giả thuyết (trang còn chỗ), index chỉ ra vì sao (index trên cột bị sửa), WAL cho thấy cái giá, và một bảng đối chứng chứng minh kết luận. Bước cuối có thanh hiệu năng: đọc giỏ hàng phải đi qua khóa chính.

## Thực hành

Sáu bước chạy thật trên bảng `carts` và bản đối chứng `carts_lean`, rồi hai câu hỏi: một câu "có nên làm không" và một câu kết luận.

## Tóm tắt

- HOT cần hai điều kiện: trang còn chỗ, và không index nào chứa cột bị sửa.
- `pg_stat_user_tables` (`n_tup_hot_upd`) báo HOT miss; `ctid` cho biết bản mới nằm ở trang nào.
- Mỗi UPDATE không HOT thêm một mục vào mọi index và nhiều bản ghi WAL hơn.
- Index không ai dùng (`idx_scan` = 0) trên cột hay đổi là ứng viên để bỏ; khóa chính dùng để tra thì giữ.
- So cột trực tiếp với giá trị; ép kiểu cột làm planner bỏ index.

# EN

## Opening

The app team reports that the cart table `carts` grows fast even though `fillfactor = 70` is set, exactly as the earlier lesson taught. Someone proposes lowering the fillfactor further. Before doing anything, you need measurements.

## Key idea

The L3 final lesson uses a new table and a different cause from the fillfactor lesson. You put the whole level together: the counters say that something is wrong (0 HOT, dead tuples), the heap page rules out one theory (the page has room), the indexes show why (an index on a changed column), the WAL shows the cost, and a control table proves the conclusion. The last step has a performance bar: reading a cart must go through the primary key.

## Practice

Six real steps on table `carts` and its control copy `carts_lean`, then two questions: one "should we do it" and one conclusion.

## Recap

- HOT needs two conditions: room on the page, and no index containing a changed column.
- `pg_stat_user_tables` (`n_tup_hot_upd`) reveals HOT misses; `ctid` tells which page holds the new version.
- Every non-HOT UPDATE adds an entry to every index and more WAL records.
- An unused index (`idx_scan` = 0) on a frequently changed column is a candidate to drop; the primary key used for lookups stays.
- Compare the column directly with the value; casting the column makes the planner drop the index.
