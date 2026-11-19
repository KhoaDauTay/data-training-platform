---
id: e-pg-l3-13
engine: postgres
level: L3
module: wal
title: "Lab: đọc bản ghi WAL thật"
title_en: "Lab: read real WAL records"
kind: lab
minutes: 20
viz: wal-flow
objectives:
  - vi: Đọc các bản ghi WAL mà một INSERT và một UPDATE sinh ra
    en: Read the WAL records produced by an INSERT and an UPDATE
  - vi: Thấy full-page image ở lần sửa đầu sau checkpoint và nối `pd_lsn` với WAL
    en: See the full-page image on the first change after a checkpoint and link `pd_lsn` to the WAL
requires: [e-pg-l3-12, e-pg-l3-07]
sources:
  - https://www.postgresql.org/docs/18/pgwalinspect.html
  - https://www.postgresql.org/docs/18/wal-internals.html
  - https://www.postgresql.org/docs/18/wal-reliability.html
  - https://www.postgresql.org/docs/18/runtime-config-wal.html
  - https://www.postgresql.org/docs/18/storage-page-layout.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE EXTENSION IF NOT EXISTS pg_walinspect;
    CREATE TABLE mark(name text PRIMARY KEY, lsn pg_lsn);
    CREATE TABLE w(id int PRIMARY KEY, v text);
    INSERT INTO mark VALUES ('a', pg_current_wal_lsn());
    INSERT INTO w VALUES (1, 'a');
    INSERT INTO mark VALUES ('b', pg_current_wal_lsn());
    INSERT INTO w VALUES (2, 'b');
    INSERT INTO mark VALUES ('c', pg_current_wal_lsn());
    SELECT count(*) FROM w;
    CHECKPOINT;
    INSERT INTO mark VALUES ('d', pg_current_wal_lsn());
    UPDATE w SET v = 'x' WHERE id = 1;
    INSERT INTO mark VALUES ('e', pg_current_wal_lsn());
    UPDATE w SET v = 'y' WHERE id = 2;
    INSERT INTO mark VALUES ('f', pg_current_wal_lsn());
  steps:
    - task:
        vi: "Bảng `mark` giữ LSN lab chụp giữa các lệnh: `a` → INSERT dòng 1 → `b` → INSERT dòng 2 → `c` → CHECKPOINT → `d` → UPDATE dòng 1 → `e` → UPDATE dòng 2 → `f`. Lấy `resource_manager`, `record_type`, `block_fpi_length` của các bản ghi giữa `a` và `b` chạm vào `w` hoặc `w_pkey`, theo `start_lsn`."
        en: "Table `mark` keeps LSNs the lab captured between commands: `a` -> INSERT row 1 -> `b` -> INSERT row 2 -> `c` -> CHECKPOINT -> `d` -> UPDATE row 1 -> `e` -> UPDATE row 2 -> `f`. Return `resource_manager`, `record_type`, `block_fpi_length` of the records between `a` and `b` that touch `w` or `w_pkey`, by `start_lsn`."
      solution: |
        SELECT resource_manager, record_type, block_fpi_length
        FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'), (SELECT lsn FROM mark WHERE name = 'b'))
        WHERE relfilenode IN (pg_relation_filenode('w'), pg_relation_filenode('w_pkey'))
        ORDER BY start_lsn, block_id
      check: rows
      ordered: true
      hint:
        vi: "`pg_get_wal_block_info(start_lsn, end_lsn)` trả một dòng mỗi trang mà bản ghi chạm; lọc theo `relfilenode`."
        en: "`pg_get_wal_block_info(start_lsn, end_lsn)` returns one row per page a record touches; filter on `relfilenode`."
      fact:
        vi: "INSERT đầu tiên sinh `Heap INSERT+INIT` (trang heap mới khởi tạo), rồi B-tree `NEWROOT` (2 trang) và `INSERT_LEAF`. Không full-page image nào: trang mới khởi tạo thì không cần."
        en: "The first INSERT produces `Heap INSERT+INIT` (a freshly initialised heap page), then B-tree `NEWROOT` (2 pages) and `INSERT_LEAF`. No full-page image: a freshly initialised page does not need one."
        probe: SELECT string_agg(resource_manager || ' ' || record_type || ' ' || block_fpi_length, ', ' ORDER BY start_lsn, block_id) FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'), (SELECT lsn FROM mark WHERE name = 'b')) WHERE relfilenode IN (pg_relation_filenode('w'), pg_relation_filenode('w_pkey'))
        expect: [["Heap INSERT+INIT 0, Btree NEWROOT 0, Btree NEWROOT 0, Btree INSERT_LEAF 0"]]
    - task:
        vi: "Làm lại câu trên cho đoạn `b` → `c` (INSERT dòng 2)."
        en: "Repeat the query for the range `b` -> `c` (INSERT of row 2)."
      solution: |
        SELECT resource_manager, record_type, block_fpi_length
        FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'b'), (SELECT lsn FROM mark WHERE name = 'c'))
        WHERE relfilenode IN (pg_relation_filenode('w'), pg_relation_filenode('w_pkey'))
        ORDER BY start_lsn, block_id
      check: rows
      ordered: true
      hint:
        vi: Chỉ đổi hai mốc `a`, `b` thành `b`, `c`.
        en: Only change the two marks `a`, `b` to `b`, `c`.
      fact:
        vi: "Chỉ còn `Heap INSERT` (không `+INIT`, trang đã có) và `Btree INSERT_LEAF`, mỗi cái vài chục byte."
        en: "Just `Heap INSERT` (no `+INIT`, the page exists) and `Btree INSERT_LEAF`, a few dozen bytes each."
        probe: SELECT string_agg(resource_manager || ' ' || record_type || ' ' || block_fpi_length, ', ' ORDER BY start_lsn, block_id) FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'b'), (SELECT lsn FROM mark WHERE name = 'c')) WHERE relfilenode IN (pg_relation_filenode('w'), pg_relation_filenode('w_pkey'))
        expect: [["Heap INSERT 0, Btree INSERT_LEAF 0"]]
    - task:
        vi: "So hai UPDATE sau CHECKPOINT: với các bản ghi chạm `w` trong đoạn `d` → `f`, lấy `record_type` và một cột đúng/sai `block_fpi_length > 0`, theo `start_lsn`."
        en: "Compare the two UPDATEs after the CHECKPOINT: for the records touching `w` in the range `d` -> `f`, return `record_type` and a true/false column `block_fpi_length > 0`, by `start_lsn`."
      solution: |
        SELECT record_type, block_fpi_length > 0 AS full_page
        FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'd'), (SELECT lsn FROM mark WHERE name = 'f'))
        WHERE relfilenode = pg_relation_filenode('w')
        ORDER BY start_lsn
      check: rows
      ordered: true
      hint:
        vi: "Lọc `relfilenode = pg_relation_filenode('w')`."
        en: "Filter `relfilenode = pg_relation_filenode('w')`."
      fact:
        vi: "Hai bản ghi `HOT_UPDATE` (cột `v` không có index). Cái đầu mang full-page image vì là lần sửa đầu của trang sau CHECKPOINT; cái thứ hai, cùng trang, thì không."
        en: "Two `HOT_UPDATE` records (column `v` has no index). The first carries a full-page image because it is the page's first change after the CHECKPOINT; the second, on the same page, does not."
        probe: SELECT string_agg(record_type || ' ' || (block_fpi_length > 0), ', ' ORDER BY start_lsn) FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'd'), (SELECT lsn FROM mark WHERE name = 'f')) WHERE relfilenode = pg_relation_filenode('w')
        expect: [["HOT_UPDATE true, HOT_UPDATE false"]]
    - task:
        vi: "Kiểm bằng một cột đúng/sai: `lsn` trong header trang 0 của `w` có bằng `end_lsn` lớn nhất của các bản ghi chạm `w` từ mốc `a` tới `pg_current_wal_lsn()` không."
        en: "Check with one true/false column: does the `lsn` in the header of page 0 of `w` equal the largest `end_lsn` among records touching `w` from mark `a` to `pg_current_wal_lsn()`."
      solution: |
        SELECT h.lsn = (SELECT max(end_lsn) FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'), pg_current_wal_lsn())
                        WHERE relfilenode = pg_relation_filenode('w')) AS same
        FROM page_header(get_raw_page('w', 0)) h
      check: rows
      hint:
        vi: "`page_header(get_raw_page('w', 0))` có cột `lsn`; so với một truy vấn con `max(end_lsn)`."
        en: "`page_header(get_raw_page('w', 0))` has an `lsn` column; compare it with a `max(end_lsn)` subquery."
      fact:
        vi: "Đúng: `pd_lsn` của trang là điểm kết thúc bản ghi WAL cuối cùng đã sửa nó. Luật WAL dùng chính số này: trang chỉ được ghi xuống đĩa khi WAL đã flush tới đó."
        en: "True: the page's `pd_lsn` is the end of the last WAL record that changed it. The WAL rule uses exactly this number: the page may reach disk only once WAL is flushed up to it."
        probe: SELECT h.lsn = (SELECT max(end_lsn) FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'), pg_current_wal_lsn()) WHERE relfilenode = pg_relation_filenode('w')) FROM page_header(get_raw_page('w', 0)) h
        expect: [[true]]
---

## Ý chính

Mỗi thay đổi sinh một hoặc vài bản ghi WAL, ghi theo "resource manager" (Heap, Btree, Transaction…). `pg_walinspect` đọc chúng theo khoảng LSN. Lab chụp sẵn LSN vào bảng `mark` giữa các lệnh, nên bạn đọc được đúng bản ghi của từng lệnh.

## Ví dụ

```sql
SELECT resource_manager, record_type, block_fpi_length
FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'),
                           (SELECT lsn FROM mark WHERE name = 'b'))
WHERE relfilenode = pg_relation_filenode('w');
```

Lọc theo `relfilenode` vì cùng khoảng LSN còn có bản ghi của catalog và của chính bảng `mark`.

## Thực hành

Bốn bước. Số LSN thật đổi theo máy nên lab chỉ chấm loại bản ghi và các so sánh. Sau lab này bạn đo được một lệnh sinh bao nhiêu WAL, và giải thích được vì sao ngay sau checkpoint WAL tăng vọt (full-page image), một nguyên nhân hay gặp của replication lag và đầy ổ WAL.

# EN

## Key idea

Every change produces one or a few WAL records, filed by "resource manager" (Heap, Btree, Transaction…). `pg_walinspect` reads them by LSN range. The lab captured LSNs into the `mark` table between commands, so you can read exactly the records of each command.

## Example

```sql
SELECT resource_manager, record_type, block_fpi_length
FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'),
                           (SELECT lsn FROM mark WHERE name = 'b'))
WHERE relfilenode = pg_relation_filenode('w');
```

Filter on `relfilenode` because the same LSN range also holds catalog records and those of the `mark` table itself.

## Practice

Four steps. Real LSN numbers differ per machine, so the lab grades record types and comparisons only. After this lab you can measure how much WAL a command produces, and explain why WAL spikes right after a checkpoint (full-page images), a common cause of replication lag and full WAL disks.
