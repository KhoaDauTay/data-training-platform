---
id: e-pg-l5-09
engine: postgres
level: L5
module: integrity
title: "WAL đào sâu: full-page write sau checkpoint"
title_en: "WAL in depth: full-page writes after a checkpoint"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-wal-flow
objectives:
  - { vi: "Đọc bản ghi WAL thật giữa hai LSN bằng `pg_get_wal_records_info`", en: "Read real WAL records between two LSNs with `pg_get_wal_records_info`" }
  - { vi: "Thấy lần sửa đầu tiên của một trang sau checkpoint ghi cả trang (FPI), lần sau thì không", en: "See that the first change to a page after a checkpoint writes the whole page (FPI) and later changes do not" }
  - { vi: "Giải thích vì sao checkpoint dày làm WAL phình", en: "Explain why frequent checkpoints inflate WAL volume" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/wal-configuration.html
  - https://www.postgresql.org/docs/18/wal-intro.html
  - https://www.postgresql.org/docs/18/pgwalinspect.html
  - https://www.postgresql.org/docs/18/runtime-config-wal.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_walinspect;
    DROP TABLE IF EXISTS wal_marks, stock CASCADE;
    CREATE TABLE wal_marks (step text PRIMARY KEY, lsn pg_lsn NOT NULL);
    CREATE TABLE stock (id int PRIMARY KEY, qty int NOT NULL) WITH (fillfactor = 70);
    INSERT INTO stock SELECT g, 10 FROM generate_series(1, 100) g;
    -- read every row before the CHECKPOINT: it sets the hint bits now, so no FPI_FOR_HINT lands between 'start' and the first UPDATE
    SELECT count(*) FROM stock;
    CHECKPOINT;
    INSERT INTO wal_marks VALUES ('start', pg_current_wal_insert_lsn());
    UPDATE stock SET qty = qty - 1 WHERE id = 1;
    UPDATE stock SET qty = qty - 1 WHERE id = 2;
    INSERT INTO wal_marks VALUES ('end', pg_current_wal_insert_lsn());
  steps:
    - task: { vi: "Giữa hai mốc 'start' và 'end' trong `wal_marks` (cột `step` là tên mốc, cột `lsn` là LSN), liệt kê các bản ghi của resource manager 'Heap' chạm tới bảng `stock`: loại bản ghi và cột full_page (true nếu bản ghi chứa ảnh cả trang). Sắp theo `start_lsn`. Đoán trước: hai UPDATE trên cùng trang, cái nào mang ảnh cả trang?", en: "Between the 'start' and 'end' marks in `wal_marks` (column `step` is the mark name, column `lsn` the LSN), list the 'Heap' resource-manager records that touch table `stock`: record type and a column full_page (true if the record carries a full-page image). Order by `start_lsn`. Guess first: of the two UPDATEs on the same page, which carries the full-page image?" }
      solution: "SELECT record_type, fpi_length > 0 AS full_page FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE step = 'start'), (SELECT lsn FROM wal_marks WHERE step = 'end')) WHERE resource_manager = 'Heap' AND block_ref LIKE '%/' || pg_relation_filenode('stock') || ' %' ORDER BY start_lsn"
      check: rows
      ordered: true
      hint: { vi: "Cột `block_ref` chứa `rel <tablespace>/<db>/<filenode>`; lấy filenode bằng `pg_relation_filenode('stock')`.", en: "The `block_ref` column holds `rel <tablespace>/<db>/<filenode>`; get the filenode with `pg_relation_filenode('stock')`." }
      fact:
        vi: "Hai bản ghi `HOT_UPDATE`: cái đầu mang ảnh cả trang (lần sửa đầu của trang 0 sau `CHECKPOINT`), cái thứ hai cùng trang thì không."
        en: "Two `HOT_UPDATE` records: the first carries a full-page image (the first change to page 0 after the `CHECKPOINT`), the second, on the same page, does not."
        probe: "SELECT string_agg(record_type || ' ' || (fpi_length > 0), ', ' ORDER BY start_lsn) FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE step = 'start'), (SELECT lsn FROM wal_marks WHERE step = 'end')) WHERE resource_manager = 'Heap' AND block_ref LIKE '%/' || pg_relation_filenode('stock') || ' %'"
        expect: [["HOT_UPDATE true, HOT_UPDATE false"]]
    - task: { vi: "Đọc ba thiết lập liên quan: `full_page_writes`, `checkpoint_timeout`, `max_wal_size` (tên, giá trị, đơn vị; sắp theo tên).", en: "Read three related settings: `full_page_writes`, `checkpoint_timeout`, `max_wal_size` (name, value, unit; ordered by name)." }
      solution: "SELECT name, setting, unit FROM pg_settings WHERE name IN ('full_page_writes', 'checkpoint_timeout', 'max_wal_size') ORDER BY name"
      check: rows
      ordered: true
      hint: { vi: "View `pg_settings`.", en: "The `pg_settings` view." }
    - task: { vi: "Ảnh cả trang không chỉ rơi vào `stock`. Giữa hai mốc 'start' và 'end', liệt kê mọi bản ghi có ảnh cả trang (`fpi_length > 0`): resource_manager, record_type và cột is_stock (true nếu bản ghi chạm bảng `stock`). Sắp theo `start_lsn`.", en: "Full-page images do not land only on `stock`. Between the 'start' and 'end' marks, list every record that carries a full-page image (`fpi_length > 0`): resource_manager, record_type and a column is_stock (true if the record touches table `stock`). Order by `start_lsn`." }
      solution: "SELECT resource_manager, record_type, block_ref LIKE '%/' || pg_relation_filenode('stock') || ' %' AS is_stock FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE step = 'start'), (SELECT lsn FROM wal_marks WHERE step = 'end')) WHERE fpi_length > 0 ORDER BY start_lsn"
      check: rows
      ordered: true
      hint: { vi: "Lọc `fpi_length > 0`; is_stock dùng cùng phép `LIKE` với filenode như bước 1, đặt trong danh sách cột.", en: "Filter on `fpi_length > 0`; is_stock uses the same `LIKE` on the filenode as step 1, placed in the column list." }
      fact:
        vi: "Ba ảnh cả trang: hai `FPI_FOR_HINT` trên trang của catalog hệ thống (lần đầu đọc catalog sau checkpoint đặt hint bit) và một `HOT_UPDATE` trên `stock`."
        en: "Three full-page images: two `FPI_FOR_HINT` on system catalog pages (the first catalog reads after the checkpoint set hint bits) and one `HOT_UPDATE` on `stock`."
        probe: "SELECT string_agg(record_type, ', ' ORDER BY start_lsn) FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE step = 'start'), (SELECT lsn FROM wal_marks WHERE step = 'end')) WHERE fpi_length > 0"
        expect: [["FPI_FOR_HINT, FPI_FOR_HINT, HOT_UPDATE"]]
quiz:
  - q: { vi: "Vì sao lần sửa đầu tiên của một trang sau checkpoint phải ghi cả trang vào WAL?", en: "Why must the first change to a page after a checkpoint write the whole page to WAL?" }
    options:
      - { vi: "Để tăng tốc đọc", en: "To speed up reads" }
      - { vi: "Nếu máy sập giữa lúc ghi trang 8 KB, trang trên đĩa có thể bị ghi dở; replay bắt đầu từ ảnh cả trang trong WAL nên sửa được", en: "If the machine crashes mid-write of an 8 KB page, the page on disk can be torn; replay starts from the full-page image in WAL, so it can be repaired" }
      - { vi: "Để standby nhận nhanh hơn", en: "So standbys receive it faster" }
    answer: 1
    trap: 2
    why: { vi: "Nghe hợp lý vì WAL cũng được gửi sang standby, nhưng ảnh cả trang làm WAL lớn hơn chứ không nhanh hơn; mục đích là chống trang ghi dở. Đó là `full_page_writes` (mặc định on). Replay bắt đầu từ checkpoint, nên chỉ lần sửa đầu sau mỗi checkpoint cần ảnh cả trang.", en: "It sounds right because WAL is also shipped to the standby, but full-page images make WAL bigger, not faster; their purpose is to survive torn pages. That is `full_page_writes` (on by default). Replay starts from the checkpoint, so only the first change after each checkpoint needs the full image." }
  - q: { vi: "Một hệ thống đặt `checkpoint_timeout = 30s` để \"phục hồi nhanh\". Tác dụng phụ chính?", en: "A system sets `checkpoint_timeout = 30s` for \"fast recovery\". The main side effect?" }
    options:
      - { vi: "Không có", en: "None" }
      - { vi: "WAL phình vì nhiều trang hơn phải ghi ảnh cả trang sau mỗi checkpoint, cộng thêm I/O ghi trang bẩn thường xuyên", en: "WAL grows because more pages need a full-page image after each checkpoint, plus frequent I/O to flush dirty pages" }
      - { vi: "Mất dữ liệu đã commit", en: "Committed data is lost" }
    answer: 1
    trap: 0
    why: { vi: "Nghe như không có tác dụng phụ vì checkpoint dày chỉ làm phục hồi nhanh hơn, nhưng mỗi checkpoint đều có giá. Docs chính thức (WAL Configuration): checkpoint dày làm giảm thời gian phục hồi nhưng tăng chi phí I/O và lượng WAL do full-page write. Mặc định 5 phút / 1 GB là điểm cân bằng thường dùng.", en: "It sounds free because frequent checkpoints only make recovery faster, but every checkpoint has a price. WAL Configuration docs: frequent checkpoints cut recovery time but raise I/O cost and WAL volume through full-page writes. The 5 min / 1 GB defaults are the usual balance." }
---
## Mở bài

Một job cập nhật giá được dời sang chạy ngay sau mỗi checkpoint, và lượng WAL mỗi giờ tăng gấp mấy lần dù số dòng sửa vẫn vậy. Vì sao cùng một số UPDATE lại sinh ra lượng WAL khác nhau?

## Ý chính

Luật của WAL: bản ghi mô tả một thay đổi phải nằm bền trên đĩa trước khi trang dữ liệu được ghi xuống. Checkpoint ghi mọi trang bẩn xuống đĩa rồi đặt một mốc; khi máy sập, Postgres replay WAL từ mốc đó. Checkpoint chạy theo `checkpoint_timeout` (mặc định 5 phút) hoặc khi WAL sắp vượt `max_wal_size` (mặc định 1 GB).

Một trang 8 KB không được ghi xuống đĩa trong một nhịp duy nhất. Máy sập giữa chừng thì trang bị ghi dở (torn page), và bản ghi WAL chỉ mô tả vài byte thay đổi không sửa được nó. Vì vậy với `full_page_writes` (mặc định on), lần sửa đầu tiên của mỗi trang sau một checkpoint chép cả trang vào WAL (FPI). Phần trống giữa trang được bỏ ra, nên ảnh thường nhỏ hơn 8 KB.

Nhiều người nghĩ lượng WAL tỉ lệ với số dòng bị sửa. Thật ra nó phụ thuộc nhiều vào số trang khác nhau bị chạm lần đầu sau mỗi checkpoint: một UPDATE nhỏ trên một trang mới chạm có thể kéo theo vài KB ảnh trang. Checkpoint càng dày thì càng nhiều lần "lần đầu".

Khi cụm bật `data_checksums` (PGlite bật) hoặc `wal_log_hints`, ngay cả việc chỉ đặt hint bit lên một trang cũng cần ảnh cả trang: bản ghi `FPI_FOR_HINT`. Extension `pg_walinspect` đọc bản ghi WAL thật, với các cột `resource_manager`, `record_type`, `fpi_length`, `block_ref`.

## Cú pháp

```sql
SELECT pg_current_wal_insert_lsn();
SELECT ... FROM pg_get_wal_records_info(start_lsn, end_lsn);
SELECT ... FROM pg_get_wal_stats(start_lsn, end_lsn [, per_record]);
CHECKPOINT;
```

- `start_lsn`, `end_lsn`: khoảng WAL cần đọc; đầu phải nhỏ hơn cuối.
- `fpi_length`: số byte ảnh cả trang trong bản ghi, 0 khi không có.
- `block_ref`: trang bị chạm, dạng `rel tablespace/db/filenode ... blk n`, thêm `(FPW)` khi có ảnh.
- `per_record`: `true` thì gom theo từng loại bản ghi thay vì theo resource manager.
- `CHECKPOINT`: ép một checkpoint ngay; cần superuser hoặc vai trò `pg_checkpoint`.

## Ví dụ

Tổng kết WAL giữa hai mốc của phần dựng dữ liệu:

```sql
SELECT "resource_manager/record_type" AS rmgr, count, record_size, fpi_size
FROM pg_get_wal_stats(
  (SELECT lsn FROM wal_marks WHERE step = 'start'),
  (SELECT lsn FROM wal_marks WHERE step = 'end'))
WHERE count > 0
ORDER BY rmgr;
```

Phần mô tả thay đổi chỉ khoảng 560 byte, còn ảnh trang (`fpi_size`) gần 20 KB: 3660 byte ở `Heap` và 16276 byte ở `XLOG`.

Một bảng rộng trải trên nhiều trang, sau một checkpoint mới, sửa hai dòng cùng trang và một dòng ở trang khác:

```sql
CREATE TABLE wide (id int PRIMARY KEY, n int NOT NULL, pad char(1000) NOT NULL) WITH (fillfactor = 50);
INSERT INTO wide SELECT g, 0, 'x' FROM generate_series(1, 20) g;
SELECT count(*) FROM wide;
CHECKPOINT;
INSERT INTO wal_marks VALUES ('wide', pg_current_wal_insert_lsn());
UPDATE wide SET n = 1 WHERE id IN (1, 2, 20);
SELECT record_type, substring(block_ref FROM 'blk (\d+)') AS page, fpi_length > 0 AS full_page
FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE step = 'wide'), pg_current_wal_insert_lsn())
WHERE block_ref LIKE '%/' || pg_relation_filenode('wide') || ' %'
ORDER BY start_lsn;
```

Ba dòng sửa, hai ảnh cả trang: dòng đầu của mỗi trang mang ảnh, dòng thứ hai trên cùng trang thì không.

Hai thiết lập giải thích các ảnh `FPI_FOR_HINT` và cách làm ảnh nhỏ lại:

```sql
SELECT name, setting, context
FROM pg_settings
WHERE name IN ('data_checksums', 'wal_compression', 'wal_log_hints')
ORDER BY name;
```

`data_checksums` là on, nên hint bit cũng sinh ảnh trang. `wal_compression` đang off; bật nó (superuser đặt được trong phiên) thì ảnh trang được nén.

## Lỗi hay gặp

Tắt `full_page_writes` cho một phiên để đỡ WAL:

```sql
-- ERROR 55P02: parameter "full_page_writes" cannot be changed now
SET full_page_writes = off;
```

Thiết lập này có context `sighup`: chỉ đổi trong file cấu hình rồi reload, không đổi theo phiên. Tắt nó chỉ an toàn trên hệ thống file chống được trang ghi dở; muốn giảm WAL thì giãn checkpoint hoặc bật `wal_compression`.

Đảo ngược hai mốc LSN:

```sql
-- ERROR 22023: WAL start LSN must be less than end LSN
SELECT count(*)
FROM pg_get_wal_records_info(
  (SELECT lsn FROM wal_marks WHERE step = 'end'),
  (SELECT lsn FROM wal_marks WHERE step = 'start'));
```

Mốc đầu luôn là LSN lấy trước. Lấy mốc bằng `pg_current_wal_insert_lsn()` ngay trước và ngay sau việc cần đo.

Lọc theo tên bảng trong `block_ref`:

```sql
-- WRONG: block_ref holds filenode numbers, never table names
SELECT count(*) AS stock_records
FROM pg_get_wal_records_info(
  (SELECT lsn FROM wal_marks WHERE step = 'start'),
  (SELECT lsn FROM wal_marks WHERE step = 'end'))
WHERE block_ref LIKE '%stock%';
```

```sql
-- FIX: match the table's filenode
SELECT count(*) AS stock_records
FROM pg_get_wal_records_info(
  (SELECT lsn FROM wal_marks WHERE step = 'start'),
  (SELECT lsn FROM wal_marks WHERE step = 'end'))
WHERE block_ref LIKE '%/' || pg_relation_filenode('stock') || ' %';
```

Câu sai đếm 0 mà không báo lỗi gì. WAL chỉ biết số file (`pg_relation_filenode`), và số này đổi sau `TRUNCATE`, `VACUUM FULL` hay `CLUSTER`, nên luôn hỏi lại nó thay vì chép tay.

## Thực hành

Ba bước trên WAL mà phần dựng dữ liệu đã ghi giữa hai mốc: hai UPDATE trên trang của `stock`, ba thiết lập WAL, rồi mọi ảnh cả trang trong khoảng đó. Sau đó là hai câu hỏi.

## Tóm tắt

- WAL phải bền trước trang dữ liệu; sau khi sập, Postgres replay từ checkpoint gần nhất.
- Lần sửa đầu của mỗi trang sau checkpoint chép cả trang (FPI) để chữa trang ghi dở; các lần sau thì không.
- Lượng WAL theo số trang khác nhau bị chạm sau checkpoint; checkpoint dày làm WAL phình.
- Có checksum hoặc `wal_log_hints` thì hint bit cũng sinh `FPI_FOR_HINT`; `wal_compression` nén ảnh trang.
- Đọc bản ghi thật bằng `pg_walinspect`, lọc bảng theo filenode chứ không theo tên.

# EN

## Opening

A price-update job is moved to run right after every checkpoint, and WAL volume per hour grows several times although the number of changed rows stays the same. Why does the same number of UPDATEs produce different amounts of WAL?

## Key idea

The WAL rule: the record describing a change must be durable on disk before the data page is written. A checkpoint writes every dirty page to disk and sets a mark; after a crash, Postgres replays WAL from that mark. A checkpoint runs every `checkpoint_timeout` (5 minutes by default) or when WAL is about to exceed `max_wal_size` (1 GB by default).

An 8 KB page is not written to disk in a single beat. A crash halfway leaves a torn page, and a WAL record that describes only a few changed bytes cannot repair it. So with `full_page_writes` (on by default), the first change to each page after a checkpoint copies the whole page into WAL (an FPI). The free hole in the middle of the page is left out, so the image is usually smaller than 8 KB.

Many people think WAL volume is proportional to the number of rows changed. In fact it depends heavily on how many distinct pages are touched for the first time after each checkpoint: one small UPDATE on a freshly touched page can drag in several KB of page image. The more frequent the checkpoints, the more "first times".

When the cluster has `data_checksums` (PGlite does) or `wal_log_hints` on, even just setting hint bits on a page needs a full-page image: the `FPI_FOR_HINT` record. The `pg_walinspect` extension reads real WAL records, with columns `resource_manager`, `record_type`, `fpi_length`, `block_ref`.

## Syntax

```sql
SELECT pg_current_wal_insert_lsn();
SELECT ... FROM pg_get_wal_records_info(start_lsn, end_lsn);
SELECT ... FROM pg_get_wal_stats(start_lsn, end_lsn [, per_record]);
CHECKPOINT;
```

- `start_lsn`, `end_lsn`: the WAL range to read; the start must be lower than the end.
- `fpi_length`: bytes of full-page image in the record, 0 when there is none.
- `block_ref`: the pages touched, as `rel tablespace/db/filenode ... blk n`, plus `(FPW)` when there is an image.
- `per_record`: `true` groups by record type instead of by resource manager.
- `CHECKPOINT`: forces a checkpoint now; needs a superuser or the `pg_checkpoint` role.

## Example

A summary of the WAL between the setup's two marks:

```sql
SELECT "resource_manager/record_type" AS rmgr, count, record_size, fpi_size
FROM pg_get_wal_stats(
  (SELECT lsn FROM wal_marks WHERE step = 'start'),
  (SELECT lsn FROM wal_marks WHERE step = 'end'))
WHERE count > 0
ORDER BY rmgr;
```

The descriptions of the changes take only about 560 bytes, while the page images (`fpi_size`) take nearly 20 KB: 3660 bytes in `Heap` and 16276 bytes in `XLOG`.

A wide table spread over several pages, after a new checkpoint, changes two rows on the same page and one row on another page:

```sql
CREATE TABLE wide (id int PRIMARY KEY, n int NOT NULL, pad char(1000) NOT NULL) WITH (fillfactor = 50);
INSERT INTO wide SELECT g, 0, 'x' FROM generate_series(1, 20) g;
SELECT count(*) FROM wide;
CHECKPOINT;
INSERT INTO wal_marks VALUES ('wide', pg_current_wal_insert_lsn());
UPDATE wide SET n = 1 WHERE id IN (1, 2, 20);
SELECT record_type, substring(block_ref FROM 'blk (\d+)') AS page, fpi_length > 0 AS full_page
FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE step = 'wide'), pg_current_wal_insert_lsn())
WHERE block_ref LIKE '%/' || pg_relation_filenode('wide') || ' %'
ORDER BY start_lsn;
```

Three changed rows, two full-page images: the first row on each page carries an image, the second row on the same page does not.

Two settings explain the `FPI_FOR_HINT` images and how to make images smaller:

```sql
SELECT name, setting, context
FROM pg_settings
WHERE name IN ('data_checksums', 'wal_compression', 'wal_log_hints')
ORDER BY name;
```

`data_checksums` is on, so hint bits produce page images too. `wal_compression` is off; turning it on (a superuser can set it in a session) compresses page images.

## Common mistakes

Turning `full_page_writes` off for one session to save WAL:

```sql
-- ERROR 55P02: parameter "full_page_writes" cannot be changed now
SET full_page_writes = off;
```

This setting has context `sighup`: it only changes in the configuration file followed by a reload, never per session. Turning it off is only safe on a file system that prevents torn writes; to cut WAL, space out checkpoints or turn on `wal_compression`.

Swapping the two LSN marks:

```sql
-- ERROR 22023: WAL start LSN must be less than end LSN
SELECT count(*)
FROM pg_get_wal_records_info(
  (SELECT lsn FROM wal_marks WHERE step = 'end'),
  (SELECT lsn FROM wal_marks WHERE step = 'start'));
```

The start mark is always the LSN taken first. Take the marks with `pg_current_wal_insert_lsn()` right before and right after the work you measure.

Filtering `block_ref` by table name:

```sql
-- WRONG: block_ref holds filenode numbers, never table names
SELECT count(*) AS stock_records
FROM pg_get_wal_records_info(
  (SELECT lsn FROM wal_marks WHERE step = 'start'),
  (SELECT lsn FROM wal_marks WHERE step = 'end'))
WHERE block_ref LIKE '%stock%';
```

```sql
-- FIX: match the table's filenode
SELECT count(*) AS stock_records
FROM pg_get_wal_records_info(
  (SELECT lsn FROM wal_marks WHERE step = 'start'),
  (SELECT lsn FROM wal_marks WHERE step = 'end'))
WHERE block_ref LIKE '%/' || pg_relation_filenode('stock') || ' %';
```

The wrong query counts 0 without any error. WAL only knows file numbers (`pg_relation_filenode`), and that number changes after `TRUNCATE`, `VACUUM FULL` or `CLUSTER`, so always ask for it instead of copying it by hand.

## Practice

Three steps on the WAL the setup recorded between two marks: two UPDATEs on a page of `stock`, three WAL settings, then every full-page image in that range. Then two questions.

## Recap

- WAL must be durable before the data page; after a crash, Postgres replays from the last checkpoint.
- The first change to each page after a checkpoint copies the whole page (FPI) to repair torn pages; later changes do not.
- WAL volume follows the number of distinct pages touched after a checkpoint; frequent checkpoints inflate WAL.
- With checksums or `wal_log_hints`, hint bits also produce `FPI_FOR_HINT`; `wal_compression` compresses page images.
- Read real records with `pg_walinspect`, and filter a table by filenode, not by name.
