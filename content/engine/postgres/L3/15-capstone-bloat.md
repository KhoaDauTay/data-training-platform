---
id: e-pg-l3-15
engine: postgres
level: L3
module: memory
title: "Kiểm tra cấp L3: bảng việc phình to"
title_en: "L3 check: the job table that keeps growing"
kind: capstone
minutes: 30
viz: hot-chain
objectives:
  - vi: Chẩn đoán HOT miss do trang đầy từ trang heap, bộ đếm và index
    en: Diagnose HOT misses caused by full pages from the heap page, the counters and the index
  - vi: Chọn cách chữa đúng và giải thích cái giá của nó
    en: Choose the right fix and explain its cost
requires: [e-pg-l3-08, e-pg-l3-09, e-pg-l3-13, e-pg-l3-14]
sources:
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/storage-page-layout.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
  - https://www.postgresql.org/docs/18/pageinspect.html
  - https://www.postgresql.org/docs/18/sql-createtable.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE TABLE jobs_full(id int PRIMARY KEY, tries int, pad char(100)) WITH (fillfactor = 100);
    CREATE TABLE jobs_room(id int PRIMARY KEY, tries int, pad char(100)) WITH (fillfactor = 70);
    INSERT INTO jobs_full SELECT g, 0, 'p' FROM generate_series(1, 200) g;
    INSERT INTO jobs_room SELECT g, 0, 'p' FROM generate_series(1, 200) g;
    UPDATE jobs_full SET tries = tries + 1 WHERE id <= 10;
    UPDATE jobs_room SET tries = tries + 1 WHERE id <= 10;
    SELECT pg_stat_force_next_flush();
  steps:
    - task:
        vi: "Đội vận hành báo: bảng `jobs_full` (200 việc, mỗi việc hay được tăng `tries`) cứ phình và UPDATE chậm dần. `jobs_room` là bản sao với `fillfactor = 70`. Cả hai vừa tăng `tries` cho việc 1–10. Đọc bộ đếm: tên bảng, `n_tup_upd`, `n_tup_hot_upd`, theo tên bảng."
        en: "Ops report: table `jobs_full` (200 jobs, each one's `tries` bumped often) keeps growing and its UPDATEs get slower. `jobs_room` is a copy with `fillfactor = 70`. Both just bumped `tries` for jobs 1-10. Read the counters: table name, `n_tup_upd`, `n_tup_hot_upd`, by table name."
      solution: SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname IN ('jobs_full', 'jobs_room') ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "`pg_stat_user_tables`, lọc hai tên bảng."
        en: "`pg_stat_user_tables`, filter the two table names."
      fact:
        vi: "`jobs_full`: 10 UPDATE, 0 HOT. `jobs_room`: 10 UPDATE, 10 HOT. Cột `tries` không có index, nên lý do duy nhất còn lại là chỗ trống trên trang."
        en: "`jobs_full`: 10 updates, 0 HOT. `jobs_room`: 10 updates, 10 HOT. Column `tries` has no index, so the only remaining reason is free space on the page."
        probe: SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname IN ('jobs_full', 'jobs_room') ORDER BY relname
        expect: [[jobs_full, 10, 0], [jobs_room, 10, 10]]
    - task:
        vi: "Xem kích thước hai bảng: một dòng mỗi bảng với tên bảng, số trang (`pg_relation_size` chia 8192) và số line pointer của trang 0, theo tên bảng."
        en: "Look at the size of both tables: one row per table with the table name, the number of pages (`pg_relation_size` divided by 8192) and the number of line pointers on page 0, by table name."
      solution: |
        SELECT t, pg_relation_size(t) / 8192 AS pages, (SELECT count(*) FROM heap_page_items(get_raw_page(t, 0))) AS lps
        FROM unnest(ARRAY['jobs_full', 'jobs_room']) AS t
        ORDER BY t
      check: rows
      ordered: true
      hint:
        vi: "`pg_relation_size(t)` tính byte; `heap_page_items(get_raw_page(t, 0))` cho line pointer."
        en: "`pg_relation_size(t)` counts bytes; `heap_page_items(get_raw_page(t, 0))` gives the line pointers."
      fact:
        vi: "`jobs_full`: 4 trang, trang 0 xếp 58 dòng và chỉ còn 48 byte trống ngay sau khi nạp, nên mọi bản mới phải sang trang khác. `jobs_room`: 5 trang, trang 0 giữ 40 dòng gốc + 10 bản mới. Không chấm số byte trống: một câu đọc bất kỳ có thể prune trang và đổi con số đó."
        en: "`jobs_full`: 4 pages, page 0 packs 58 rows and had only 48 bytes free right after loading, so every new version must go to another page. `jobs_room`: 5 pages, page 0 holds its 40 original rows + 10 new versions. Free bytes are not graded: any read may prune the page and change that number."
        probe: SELECT t, pg_relation_size(t) / 8192, (SELECT count(*) FROM heap_page_items(get_raw_page(t, 0))) FROM unnest(ARRAY['jobs_full', 'jobs_room']) AS t ORDER BY t
        expect: [[jobs_full, 4, 58], [jobs_room, 5, 50]]
    - task:
        vi: "Đếm số mục trong trang lá (block 1) của hai index khóa chính `jobs_full_pkey` và `jobs_room_pkey`, trong một dòng hai cột."
        en: "Count the entries on the leaf page (block 1) of the two primary key indexes `jobs_full_pkey` and `jobs_room_pkey`, as one row with two columns."
      solution: SELECT (SELECT count(*) FROM bt_page_items('jobs_full_pkey', 1)) AS full_idx, (SELECT count(*) FROM bt_page_items('jobs_room_pkey', 1)) AS room_idx
      check: rows
      hint:
        vi: Hai truy vấn con `count(*)` trên `bt_page_items()`.
        en: Two `count(*)` subqueries over `bt_page_items()`.
      fact:
        vi: "210 so với 200: mỗi UPDATE không HOT của `jobs_full` thêm một mục index (và một tuple chết cho VACUUM), còn `jobs_room` không thêm mục nào."
        en: "210 versus 200: each non-HOT UPDATE on `jobs_full` added an index entry (and a dead tuple for VACUUM), while `jobs_room` added none."
        probe: SELECT (SELECT count(*) FROM bt_page_items('jobs_full_pkey', 1)), (SELECT count(*) FROM bt_page_items('jobs_room_pkey', 1))
        expect: [[210, 200]]
    - task:
        vi: "Bản mới của việc 1 nằm ở đâu? Lấy tên bảng và `ctid` của `id = 1` trong hai bảng, theo tên bảng."
        en: "Where did job 1's new version go? Return the table name and the `ctid` of `id = 1` in both tables, by table name."
      solution: |
        SELECT 'jobs_full' AS t, ctid FROM jobs_full WHERE id = 1
        UNION ALL
        SELECT 'jobs_room', ctid FROM jobs_room WHERE id = 1
        ORDER BY t
      check: rows
      ordered: true
      hint:
        vi: "Hai câu `SELECT ctid` nối bằng `UNION ALL`."
        en: "Two `SELECT ctid` queries joined with `UNION ALL`."
      fact:
        vi: "Ở `jobs_full`, việc 1 đã rời trang 0 sang trang cuối; ở `jobs_room`, nó vẫn ở trang 0, ngay sau 40 dòng gốc."
        en: "In `jobs_full`, job 1 left page 0 for the last page; in `jobs_room` it stays on page 0, right after the 40 original rows."
        probe: SELECT 'jobs_full', ctid::text FROM jobs_full WHERE id = 1 UNION ALL SELECT 'jobs_room', ctid::text FROM jobs_room WHERE id = 1
        expect: [[jobs_full, "(3,27)"], [jobs_room, "(0,41)"]]
quiz:
  - q:
      vi: "Kết luận cho đội vận hành: sửa `jobs_full` thế nào?"
      en: "Conclusion for ops: how should `jobs_full` be fixed?"
    options:
      - { vi: "Thêm index trên `tries` để UPDATE tìm dòng nhanh hơn", en: "Add an index on `tries` so UPDATEs find rows faster" }
      - { vi: "`ALTER TABLE jobs_full SET (fillfactor = 70)` rồi viết lại bảng một lần (ví dụ `VACUUM FULL`, trong giờ thấp điểm) để trang cũ cũng có chỗ trống", en: "`ALTER TABLE jobs_full SET (fillfactor = 70)` then rewrite the table once (for example `VACUUM FULL`, off-peak) so the existing pages get free space too" }
      - { vi: "Chạy `CHECKPOINT` thường xuyên hơn", en: "Run `CHECKPOINT` more often" }
      - { vi: "Tăng `work_mem`", en: "Raise `work_mem`" }
    answer: 1
    why:
      vi: "Cột được sửa không có index, nên HOT chỉ thiếu chỗ trống. `fillfactor` chỉ áp cho trang ghi sau này, nên trang hiện có cần viết lại một lần (`VACUUM FULL` khóa bảng trong lúc chạy). Thêm index trên `tries` còn làm tệ hơn: nó cấm HOT hẳn."
      en: "The updated column has no index, so HOT only lacks free space. `fillfactor` applies to pages written later, so the existing pages need one rewrite (`VACUUM FULL` locks the table while it runs). An index on `tries` would make it worse: it rules HOT out entirely."
---

## Ý chính

Bài cuối cấp L3 ghép mọi thứ: bộ đếm cho biết **có** chuyện (HOT thấp), trang heap cho biết **vì sao** (trang đầy), index cho biết **cái giá** (mục thừa), và `ctid` cho thấy bản mới đã đi đâu.

## Ví dụ

```sql
SELECT relname, n_tup_upd, n_tup_hot_upd
FROM pg_stat_user_tables
WHERE relname IN ('jobs_full', 'jobs_room');
```

## Thực hành

Bốn bước chạy thật trên hai bảng lab dựng sẵn, rồi một câu kết luận. Xong bài này bạn chẩn đoán được một bảng phình vì HOT miss từ đầu tới cuối, và đề xuất cách chữa kèm cái giá của nó.

# EN

## Key idea

The L3 final lesson ties everything together: the counters say **that** something is wrong (low HOT), the heap page says **why** (full pages), the index shows **the cost** (extra entries), and `ctid` shows where the new version went.

## Example

```sql
SELECT relname, n_tup_upd, n_tup_hot_upd
FROM pg_stat_user_tables
WHERE relname IN ('jobs_full', 'jobs_room');
```

## Practice

Four real steps on two tables the lab builds, then one conclusion question. After this lesson you can diagnose a table bloated by HOT misses end to end, and propose a fix with its cost.
