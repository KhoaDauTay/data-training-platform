---
id: e-pg-l3-13
engine: postgres
level: L3
module: wal
title: "Lab: đọc bản ghi WAL thật"
title_en: "Lab: read real WAL records"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-wal-flow
objectives:
  - vi: Đọc các bản ghi WAL mà một INSERT và một UPDATE sinh ra
    en: Read the WAL records produced by an INSERT and an UPDATE
  - vi: Thấy full-page image ở lần sửa đầu sau checkpoint và nối `pd_lsn` với WAL
    en: See the full-page image on the first change after a checkpoint and link `pd_lsn` to the WAL
requires: [e-pg-l3-12, e-pg-l3-07]
sources:
  - { url: https://www.postgresql.org/docs/18/pgwalinspect.html, title_vi: "pg_walinspect" }
  - { url: https://www.postgresql.org/docs/18/wal-internals.html, title_vi: "WAL bên trong" }
  - { url: https://www.postgresql.org/docs/18/wal-reliability.html, title_vi: "Độ tin cậy" }
  - { url: https://www.postgresql.org/docs/18/runtime-config-wal.html, title_vi: "Cấu hình WAL" }
  - { url: https://www.postgresql.org/docs/18/storage-page-layout.html, title_vi: "Cấu trúc trang dữ liệu" }
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
        vi: "So hai UPDATE sau CHECKPOINT: với các bản ghi chạm `w` trong đoạn `d` → `f`, lấy `record_type` và một cột đúng/sai `block_fpi_length > 0`, theo `start_lsn`. Đoán trước khi chạy: hai UPDATE giống nhau, bản ghi nào mang full-page image?"
        en: "Compare the two UPDATEs after the CHECKPOINT: for the records touching `w` in the range `d` -> `f`, return `record_type` and a true/false column `block_fpi_length > 0`, by `start_lsn`. Guess before you run it: the two UPDATEs look alike, so which record carries a full-page image?"
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
quiz:
  - q:
      vi: "Ngay sau một CHECKPOINT, hai UPDATE giống hệt nhau chạy trên cùng một trang. Bản ghi WAL của UPDATE đầu lớn hơn hẳn. Vì sao?"
      en: "Right after a CHECKPOINT, two identical UPDATEs run on the same page. The first UPDATE's WAL record is much bigger. Why?"
    options:
      - { vi: "UPDATE đầu phải đọc trang từ đĩa vào bộ đệm, và việc đọc đó được ghi vào WAL", en: "The first UPDATE had to read the page from disk into the buffer, and that read is logged in the WAL" }
      - { vi: "Đó là lần sửa đầu của trang sau checkpoint, nên bản ghi mang theo cả trang (full-page image)", en: "It is the page's first change after the checkpoint, so its record carries the whole page (a full-page image)" }
      - { vi: "UPDATE thứ hai được nén lại vì giống UPDATE đầu", en: "The second UPDATE is compressed because it repeats the first" }
    answer: 1
    trap: 0
    why:
      vi: "\"Việc đọc trang được ghi vào WAL\" nghe hợp lý vì lần đầu thường là lần chậm, nhưng WAL chỉ ghi thay đổi, không ghi việc đọc. Cái làm bản ghi to là full-page image: lần sửa đầu của một trang sau mỗi checkpoint ghi cả trang 8 KB, để phát lại được cả khi trang trên đĩa bị ghi dở. Lần sửa thứ hai của cùng trang chỉ ghi phần thay đổi; nó nhỏ vì không kèm trang, không phải vì được nén. Bước 3 của lab thấy đúng vậy: `HOT_UPDATE true` rồi `HOT_UPDATE false`."
      en: "\"The read is logged in the WAL\" sounds right because the first run is usually the slow one, but the WAL logs changes, not reads. What makes the record big is the full-page image: the first change of a page after each checkpoint logs the whole 8 KB page, so replay works even if the on-disk page was torn. The second change of the same page logs only the change; it is small because it carries no page, not because it was compressed. Step 3 of the lab shows exactly that: `HOT_UPDATE true`, then `HOT_UPDATE false`."
  - q:
      vi: "Bạn chụp LSN trước và sau một INSERT rồi gọi `pg_get_wal_records_info` cho khoảng đó. Mọi dòng trả về là của INSERT đó?"
      en: "You capture the LSN before and after an INSERT, then call `pg_get_wal_records_info` on that range. Does every row belong to that INSERT?"
    options:
      - { vi: "Đúng: khoảng LSN chỉ chứa lệnh bạn chạy", en: "Yes: the LSN range only holds the command you ran" }
      - { vi: "Không: khoảng đó còn có COMMIT, bản ghi của bảng khác (như chính bảng lưu mốc) và của catalog; lọc theo `relfilenode` để chỉ giữ bảng của mình", en: "No: the range also holds COMMIT records, records of other tables (such as the table that stores the marks) and of the catalog; filter on `relfilenode` to keep only your table" }
      - { vi: "Không: WAL chỉ ghi COMMIT, không ghi dòng", en: "No: the WAL only logs COMMITs, not rows" }
    answer: 1
    trap: 0
    why:
      vi: "\"Khoảng LSN chỉ chứa lệnh bạn chạy\" nghe hợp lý vì bạn chỉ gõ một lệnh, nhưng WAL là một luồng chung cho cả cơ sở dữ liệu: COMMIT có bản ghi riêng, lệnh lưu mốc vào `mark` cũng ghi WAL, và đọc một trang có thể sinh bản ghi dọn trang (prune). Trong lab, khoảng `a` → `b` có 9 bản ghi, chỉ 3 thuộc `w` và `w_pkey`. WAL cũng ghi từng dòng chứ không chỉ COMMIT: chính các bản ghi `Heap INSERT` ở bước 1 là dòng mới."
      en: "\"The LSN range only holds your command\" sounds right because you typed one command, but the WAL is one stream for the whole database: COMMIT has its own record, the statement saving the mark into `mark` writes WAL too, and reading a page can produce a page-pruning record. In the lab the range `a` -> `b` holds 9 records, only 3 of them belong to `w` and `w_pkey`. The WAL logs rows too, not just COMMITs: the `Heap INSERT` records of step 1 are the new rows."
---
## Mở bài

Ổ đĩa chứa WAL của máy chủ đầy nhanh nhất vào đúng mấy phút sau mỗi checkpoint, dù lượng ghi của ứng dụng không đổi. Muốn biết vì sao, bạn cần đọc chính các bản ghi WAL.

## Ý chính

Mỗi thay đổi sinh một hoặc vài bản ghi WAL. Mỗi bản ghi thuộc một resource manager, tức phần của Postgres biết cách phát lại nó: `Heap` cho dòng của bảng, `Btree` cho index B-tree, `Transaction` cho COMMIT và ABORT. Bản ghi có `record_type` (`INSERT`, `HOT_UPDATE`, `INSERT_LEAF`…), độ dài, và danh sách trang mà nó chạm tới.

Extension `pg_walinspect` đọc WAL theo khoảng LSN. `pg_get_wal_records_info` trả một dòng cho mỗi bản ghi; `pg_get_wal_block_info` trả một dòng cho mỗi trang mà bản ghi chạm, kèm `relfilenode` (số hiệu file của bảng) và `block_fpi_length`, độ dài full-page image nếu có. Lab đã chụp sẵn LSN vào bảng `mark` giữa các lệnh, nên bạn đọc được đúng phần WAL của từng lệnh.

Nhiều người nghĩ một khoảng LSN chỉ chứa lệnh mình vừa chạy. Thật ra WAL là một luồng chung: COMMIT có bản ghi riêng, lệnh lưu mốc cũng ghi WAL, catalog cũng vậy. Phải lọc theo `relfilenode` mới thấy riêng bảng của mình.

Hai điều đáng để ý khi đọc. Trang heap mới tạo mang hậu tố `+INIT`, và không cần full-page image. Lần sửa đầu của một trang sau checkpoint thì mang full-page image: nội dung trang (trừ phần trống ở giữa), vài trăm byte với trang gần trống của lab và tới 8 KB với một trang đầy, trong khi lần sửa sau chỉ vài chục byte. Đó là lý do WAL tăng vọt ngay sau checkpoint.

## Cú pháp

```sql
SELECT * FROM pg_get_wal_records_info(start_lsn, end_lsn);
SELECT * FROM pg_get_wal_block_info(start_lsn, end_lsn [, show_data ]);
SELECT * FROM pg_get_wal_stats(start_lsn, end_lsn [, per_record ]);
SELECT pg_relation_filenode('table_name');
SELECT lsn FROM page_header(get_raw_page('table_name', block_number));
```

- `start_lsn` phải nhỏ hơn `end_lsn`.
- `pg_get_wal_stats`: số bản ghi và số byte theo resource manager; `per_record` = true thì theo từng `record_type`.
- `pg_relation_filenode`: số hiệu file để so với cột `relfilenode`; nó đổi khi bảng được viết lại (`VACUUM FULL`, `TRUNCATE`).
- `page_header(...).lsn`: `pd_lsn` của trang.

## Ví dụ

Mỗi đoạn giữa hai mốc dài bao nhiêu byte WAL:

```sql
SELECT name, pg_wal_lsn_diff(lead(lsn) OVER (ORDER BY lsn), lsn) AS bytes_to_next
FROM mark
ORDER BY lsn;
```

Số byte đổi theo máy, nhưng đoạn `d` (UPDATE đầu tiên sau CHECKPOINT) luôn dài nhất.

Gộp bản ghi của hai UPDATE theo resource manager:

```sql
SELECT resource_manager, count(*) AS records, sum(record_length) AS bytes
FROM pg_get_wal_records_info((SELECT lsn FROM mark WHERE name = 'd'),
                             (SELECT lsn FROM mark WHERE name = 'f'))
GROUP BY resource_manager
ORDER BY resource_manager;
```

`Heap` chiếm nhiều byte nhất vì một bản ghi của nó mang ảnh của cả trang.

Header của trang 0 bảng `w`:

```sql
SELECT lsn, lower, upper FROM page_header(get_raw_page('w', 0));
```

Cột `lsn` là `pd_lsn`: điểm kết thúc bản ghi WAL cuối cùng đã sửa trang.

## Lỗi hay gặp

Đếm mọi bản ghi trong khoảng và coi đó là WAL của lệnh:

```sql
-- WRONG: the range also holds the pages of mark and a pruning record
SELECT count(*) AS records
FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'),
                           (SELECT lsn FROM mark WHERE name = 'b'));
```

```sql
-- FIX: keep the pages of w and its index
SELECT count(*) AS records
FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'),
                           (SELECT lsn FROM mark WHERE name = 'b'))
WHERE relfilenode IN (pg_relation_filenode('w'), pg_relation_filenode('w_pkey'));
```

Câu sai đếm 9 trang, câu đúng 4: phần còn lại là trang của `mark`, của index `mark_pkey` và một bản ghi dọn trang.

Đặt mốc mới trước mốc cũ:

```sql
-- ERROR 22023: WAL start LSN must be less than end LSN
SELECT count(*)
FROM pg_get_wal_records_info((SELECT lsn FROM mark WHERE name = 'f'),
                             (SELECT lsn FROM mark WHERE name = 'a'));
```

Đối số đầu là mốc cũ (`a`), đối số sau là mốc mới.

## Thực hành

Bốn bước đọc WAL của hai INSERT và hai UPDATE, rồi nối `pd_lsn` của trang với WAL; sau đó là hai câu hỏi. Số LSN thật đổi theo máy, nên lab chỉ chấm loại bản ghi và các phép so sánh.

## Tóm tắt

- Mỗi thay đổi sinh bản ghi WAL thuộc một resource manager (`Heap`, `Btree`, `Transaction`…).
- `pg_get_wal_records_info` và `pg_get_wal_block_info` đọc WAL theo khoảng LSN, mốc cũ trước.
- Một khoảng LSN chứa cả COMMIT và bản ghi của bảng khác; lọc theo `relfilenode`.
- Lần sửa đầu của trang sau checkpoint mang full-page image; lần sau chỉ ghi phần thay đổi.
- `pd_lsn` của trang bằng điểm kết thúc bản ghi WAL cuối cùng đã sửa nó.

# EN

## Opening

The disk holding the server's WAL fills fastest in the few minutes right after each checkpoint, even though the application writes the same amount. To find out why, you need to read the WAL records themselves.

## Key idea

Every change produces one or a few WAL records. Each record belongs to a resource manager, the part of Postgres that knows how to replay it: `Heap` for table rows, `Btree` for B-tree indexes, `Transaction` for COMMIT and ABORT. A record has a `record_type` (`INSERT`, `HOT_UPDATE`, `INSERT_LEAF`…), a length, and the list of pages it touches.

The `pg_walinspect` extension reads the WAL by LSN range. `pg_get_wal_records_info` returns one row per record; `pg_get_wal_block_info` returns one row per page a record touches, with `relfilenode` (the table's file number) and `block_fpi_length`, the length of the full-page image if there is one. The lab captured LSNs into the `mark` table between commands, so you can read exactly the WAL of each command.

Many people think an LSN range holds only the command they just ran. In fact the WAL is one shared stream: COMMIT has its own record, the statement saving a mark writes WAL, and so does the catalog. Only a filter on `relfilenode` shows your own table alone.

Two things are worth noticing as you read. A freshly created heap page carries the `+INIT` suffix and needs no full-page image. The first change of a page after a checkpoint does carry a full-page image: the page content (minus the empty hole in the middle), a few hundred bytes for the lab's nearly empty page and up to 8 KB for a full one, while later changes take a few dozen bytes. That is why the WAL spikes right after a checkpoint.

## Syntax

```sql
SELECT * FROM pg_get_wal_records_info(start_lsn, end_lsn);
SELECT * FROM pg_get_wal_block_info(start_lsn, end_lsn [, show_data ]);
SELECT * FROM pg_get_wal_stats(start_lsn, end_lsn [, per_record ]);
SELECT pg_relation_filenode('table_name');
SELECT lsn FROM page_header(get_raw_page('table_name', block_number));
```

- `start_lsn` must be smaller than `end_lsn`.
- `pg_get_wal_stats`: record count and bytes per resource manager; with `per_record` = true, per `record_type`.
- `pg_relation_filenode`: the file number to compare with the `relfilenode` column; it changes when the table is rewritten (`VACUUM FULL`, `TRUNCATE`).
- `page_header(...).lsn`: the page's `pd_lsn`.

## Example

How many WAL bytes lie between each pair of marks:

```sql
SELECT name, pg_wal_lsn_diff(lead(lsn) OVER (ORDER BY lsn), lsn) AS bytes_to_next
FROM mark
ORDER BY lsn;
```

The byte counts differ per machine, but range `d` (the first UPDATE after the CHECKPOINT) is always the longest.

The two UPDATEs' records grouped by resource manager:

```sql
SELECT resource_manager, count(*) AS records, sum(record_length) AS bytes
FROM pg_get_wal_records_info((SELECT lsn FROM mark WHERE name = 'd'),
                             (SELECT lsn FROM mark WHERE name = 'f'))
GROUP BY resource_manager
ORDER BY resource_manager;
```

`Heap` takes the most bytes because one of its records carries an image of the whole page.

The header of page 0 of table `w`:

```sql
SELECT lsn, lower, upper FROM page_header(get_raw_page('w', 0));
```

Column `lsn` is `pd_lsn`: the end of the last WAL record that changed the page.

## Common mistakes

Counting every record in the range and calling it the command's WAL:

```sql
-- WRONG: the range also holds the pages of mark and a pruning record
SELECT count(*) AS records
FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'),
                           (SELECT lsn FROM mark WHERE name = 'b'));
```

```sql
-- FIX: keep the pages of w and its index
SELECT count(*) AS records
FROM pg_get_wal_block_info((SELECT lsn FROM mark WHERE name = 'a'),
                           (SELECT lsn FROM mark WHERE name = 'b'))
WHERE relfilenode IN (pg_relation_filenode('w'), pg_relation_filenode('w_pkey'));
```

The wrong query counts 9 pages, the right one 4: the rest are pages of `mark`, of its index `mark_pkey` and a page-pruning record.

Putting the newer mark before the older one:

```sql
-- ERROR 22023: WAL start LSN must be less than end LSN
SELECT count(*)
FROM pg_get_wal_records_info((SELECT lsn FROM mark WHERE name = 'f'),
                             (SELECT lsn FROM mark WHERE name = 'a'));
```

The first argument is the older mark (`a`), the second the newer one.

## Practice

Four steps read the WAL of two INSERTs and two UPDATEs, then link the page's `pd_lsn` to the WAL; then two questions. Real LSN numbers differ per machine, so the lab grades record types and comparisons only.

## Recap

- Every change produces WAL records belonging to a resource manager (`Heap`, `Btree`, `Transaction`…).
- `pg_get_wal_records_info` and `pg_get_wal_block_info` read the WAL by LSN range, older mark first.
- An LSN range also holds COMMITs and other tables' records; filter on `relfilenode`.
- The first change of a page after a checkpoint carries a full-page image; later changes log only the change.
- A page's `pd_lsn` equals the end of the last WAL record that changed it.
