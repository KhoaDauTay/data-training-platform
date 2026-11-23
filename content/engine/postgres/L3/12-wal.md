---
id: e-pg-l3-12
engine: postgres
level: L3
module: wal
title: "WAL: ghi nhật ký trước, ghi trang sau"
title_en: "WAL: log first, pages later"
kind: concept
runtime: docs
docs_why: next
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-wal-flow
objectives:
  - vi: Phát biểu luật WAL và vì sao COMMIT chỉ cần flush WAL
    en: State the WAL rule and why COMMIT only needs to flush the WAL
  - vi: Giải thích LSN, `pd_lsn`, checkpoint và full-page write
    en: Explain LSN, `pd_lsn`, checkpoints and full-page writes
requires: [e-pg-l3-02]
sources:
  - https://www.postgresql.org/docs/18/wal-intro.html
  - https://www.postgresql.org/docs/18/wal-configuration.html
  - https://www.postgresql.org/docs/18/wal-internals.html
  - https://www.postgresql.org/docs/18/runtime-config-wal.html
  - https://www.postgresql.org/docs/18/storage-page-layout.html
quiz:
  - q:
      vi: "Thứ tự nào đúng khi một UPDATE được COMMIT?"
      en: "Which order is right when an UPDATE commits?"
    options:
      - { vi: "Sửa trang trong shared buffers → ghi bản ghi WAL → flush WAL tới LSN của COMMIT → trang ghi xuống đĩa sau (checkpoint hoặc background writer)", en: "Change the page in shared buffers -> write the WAL record -> flush WAL up to the COMMIT's LSN -> the page reaches disk later (checkpoint or background writer)" }
      - { vi: "Ghi trang xuống đĩa → ghi WAL → báo COMMIT", en: "Write the page to disk -> write WAL -> report COMMIT" }
      - { vi: "Báo COMMIT → ghi WAL và trang cùng lúc ở checkpoint sau", en: "Report COMMIT -> write WAL and pages together at the next checkpoint" }
    answer: 0
    trap: 1
    why:
      vi: "Ghi trang xuống đĩa trước nghe an toàn vì dữ liệu \"nằm trên đĩa\" sớm nhất, nhưng ghi ngẫu nhiên từng trang mới là việc chậm, và WAL tồn tại để COMMIT khỏi phải chờ việc đó. Luật WAL: thay đổi trang chỉ được ghi xuống đĩa sau khi bản ghi WAL mô tả nó đã bền. COMMIT chỉ chờ flush WAL (ghi tuần tự, rẻ); trang dữ liệu bẩn có thể nằm trong bộ đệm rất lâu, vì sau khi máy sập Postgres phát lại WAL để dựng lại chúng."
      en: "Writing the page to disk first sounds safe because the data \"is on disk\" as soon as possible, but random page writes are the slow part, and the WAL exists so COMMIT does not wait for them. The WAL rule: a page change may reach disk only after the WAL record describing it is durable. COMMIT waits only for the WAL flush (sequential, cheap); dirty data pages may stay in the buffer for a long time, because after a crash Postgres replays the WAL to rebuild them."
  - q:
      vi: "Vì sao lần sửa **đầu tiên** của một trang sau mỗi checkpoint làm WAL to hơn hẳn?"
      en: "Why does the **first** change to a page after each checkpoint make the WAL much bigger?"
    options:
      - { vi: "Postgres ghi cả trang (full-page image) vào WAL để chữa trường hợp trang bị ghi dở khi sập", en: "Postgres writes the whole page (a full-page image) into the WAL to repair a page torn by a crash mid-write" }
      - { vi: "Checkpoint xóa WAL cũ nên phải ghi lại mọi trang", en: "A checkpoint deletes old WAL so every page must be written again" }
      - { vi: "Trang được nén lại sau checkpoint", en: "Pages are recompressed after a checkpoint" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe như checkpoint xóa WAL nên phải ghi lại mọi trang, nhưng chỉ trang **được sửa** lần đầu sau checkpoint mới ghi cả trang, và lý do là trang bị ghi dở. Với `full_page_writes = on`, lần sửa đầu của mỗi trang sau checkpoint ghi nguyên nội dung trang vào WAL. Replay bắt đầu từ checkpoint, nên bản trang đầy đủ này là điểm khởi đầu an toàn dù trang trên đĩa bị ghi dở. Checkpoint dày thì WAL nhiều hơn."
      en: "It sounds as if a checkpoint deletes WAL so every page must be written again, but only a page **changed** for the first time after a checkpoint is logged whole, and the reason is torn pages. With `full_page_writes = on`, the first change of each page after a checkpoint logs the whole page into the WAL. Replay starts at the checkpoint, so this full copy is a safe starting point even if the on-disk page was torn. More frequent checkpoints mean more WAL."
---
## Mở bài

Ứng dụng vừa nhận "COMMIT thành công" thì máy chủ mất điện, và trang dữ liệu vừa sửa chưa kịp xuống đĩa. Khởi động lại, đơn hàng đó còn hay mất? Câu trả lời nằm ở WAL.

## Ý chính

WAL (write-ahead log) là nhật ký ghi tuần tự mọi thay đổi của database. Luật WAL chỉ có một câu: thay đổi của một trang dữ liệu chỉ được ghi xuống đĩa sau khi bản ghi WAL mô tả nó đã được flush. Ghi nhật ký trước, ghi trang sau.

Nhờ luật này, COMMIT chỉ phải chờ một việc rẻ: flush WAL tới vị trí của bản ghi COMMIT, một lần ghi tuần tự. Các trang bị sửa thành trang bẩn (dirty page) trong shared buffers và có thể nằm đó rất lâu. Nếu máy sập, Postgres đọc WAL từ checkpoint gần nhất và phát lại (REDO) từng thay đổi, dựng lại đúng các trang chưa kịp ghi.

Nhiều người nghĩ COMMIT nghĩa là bảng đã nằm trên đĩa. Thật ra lúc COMMIT trả về, chỉ WAL chắc chắn đã bền; file của bảng có thể vẫn là bản cũ. Dữ liệu an toàn vì WAL đủ để dựng lại nó, không phải vì trang đã được ghi.

Ba khái niệm đi cùng WAL:

- LSN (log sequence number): vị trí byte trong WAL, kiểu `pg_lsn`, viết như `0/17A4160`. Mỗi trang lưu `pd_lsn`, điểm kết thúc bản ghi WAL cuối cùng đã sửa nó; trang chỉ được ghi xuống đĩa khi WAL đã flush tới số đó.
- Checkpoint: ghi mọi trang bẩn xuống đĩa và đánh dấu điểm bắt đầu phát lại. Mặc định mỗi `checkpoint_timeout` (5 phút) hoặc khi WAL sắp vượt `max_wal_size` (1 GB).
- Full-page write: lần sửa đầu tiên của một trang sau mỗi checkpoint ghi cả trang 8 KB vào WAL. Nếu máy sập giữa lúc đang ghi một trang, trang trên đĩa có thể bị ghi dở (nửa mới nửa cũ); bản trang đầy đủ trong WAL là điểm khởi đầu an toàn để phát lại.

Hệ quả thực tế: checkpoint càng dày thì càng nhiều full-page image, WAL càng phình; checkpoint càng thưa thì phát lại sau sự cố càng lâu. Extension `pg_walinspect` đọc được WAL thật, nên bạn kiểm được mọi điều trên bằng câu SQL.

## Cú pháp

```sql
SELECT pg_current_wal_insert_lsn();
SELECT pg_wal_lsn_diff(end_lsn, start_lsn);
SELECT * FROM pg_get_wal_records_info(start_lsn, end_lsn);
SELECT * FROM pg_get_wal_block_info(start_lsn, end_lsn [, show_data ]);
CHECKPOINT;
```

- `pg_current_wal_insert_lsn()`: vị trí WAL đang được chèn tới.
- `pg_wal_lsn_diff(a, b)`: số byte WAL giữa hai LSN.
- `pg_get_wal_records_info`: một dòng cho mỗi bản ghi WAL trong khoảng.
- `pg_get_wal_block_info`: một dòng cho mỗi trang mà bản ghi chạm tới, có `relfilenode` và `block_fpi_length`.

## Ví dụ

Chụp LSN trước và sau một INSERT, rồi tính số byte WAL nó sinh ra:

```sql
CREATE EXTENSION IF NOT EXISTS pg_walinspect;
CREATE TABLE notes(id int PRIMARY KEY, body text);
CREATE TABLE lsn_marks(name text PRIMARY KEY, lsn pg_lsn NOT NULL);
INSERT INTO lsn_marks VALUES ('start', pg_current_wal_insert_lsn());
INSERT INTO notes VALUES (1, 'first');
INSERT INTO lsn_marks VALUES ('one', pg_current_wal_insert_lsn());
SELECT pg_wal_lsn_diff((SELECT lsn FROM lsn_marks WHERE name = 'one'),
                       (SELECT lsn FROM lsn_marks WHERE name = 'start')) AS wal_bytes;
```

Vài trăm byte cho một dòng: bản ghi của heap, của index khóa chính, của chính bảng `lsn_marks` và các bản ghi COMMIT.

Chỉ giữ các bản ghi chạm vào `notes` và index của nó:

```sql
SELECT resource_manager, record_type, block_fpi_length
FROM pg_get_wal_block_info((SELECT lsn FROM lsn_marks WHERE name = 'start'),
                           (SELECT lsn FROM lsn_marks WHERE name = 'one'))
WHERE relfilenode IN (pg_relation_filenode('notes'), pg_relation_filenode('notes_pkey'))
ORDER BY start_lsn, block_id;
```

Bốn dòng: `Heap INSERT+INIT` (trang heap mới), hai trang `Btree NEWROOT` và một `INSERT_LEAF`. Không có full-page image vì trang mới khởi tạo không cần.

Full-page write sau checkpoint. Câu `SELECT` đầu đọc bảng trước để các cờ gợi ý (hint bit) được đặt xong; nếu không, chính việc đặt cờ sẽ mang full-page image:

```sql
SELECT count(*) FROM notes;
CHECKPOINT;
INSERT INTO lsn_marks VALUES ('ckpt', pg_current_wal_insert_lsn());
UPDATE notes SET body = 'second' WHERE id = 1;
UPDATE notes SET body = 'third' WHERE id = 1;
INSERT INTO lsn_marks VALUES ('two', pg_current_wal_insert_lsn());
SELECT record_type, block_fpi_length > 0 AS full_page
FROM pg_get_wal_block_info((SELECT lsn FROM lsn_marks WHERE name = 'ckpt'),
                           (SELECT lsn FROM lsn_marks WHERE name = 'two'))
WHERE relfilenode = pg_relation_filenode('notes')
ORDER BY start_lsn;
```

Hai `HOT_UPDATE` giống nhau, nhưng chỉ cái đầu mang cả trang: đó là lần sửa đầu tiên của trang sau checkpoint.

Nối `pd_lsn` của trang với WAL:

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
SELECT h.lsn = (SELECT max(end_lsn)
                FROM pg_get_wal_block_info((SELECT lsn FROM lsn_marks WHERE name = 'start'), pg_current_wal_insert_lsn())
                WHERE relfilenode = pg_relation_filenode('notes')) AS same
FROM page_header(get_raw_page('notes', 0)) h;
```

Kết quả `true`: header trang ghi đúng điểm kết thúc của bản ghi WAL cuối cùng đã sửa nó.

Các tham số WAL của máy chủ:

```sql
SELECT name, setting, unit
FROM pg_settings
WHERE name IN ('wal_level', 'full_page_writes', 'checkpoint_timeout', 'max_wal_size', 'synchronous_commit')
ORDER BY name;
```

## Lỗi hay gặp

Dán LSN như một con số:

```sql
-- ERROR 22P02: invalid input syntax for type pg_lsn: "12345"
SELECT pg_wal_lsn_diff('12345', '0/0');
```

LSN có dạng hai số hex cách nhau bởi `/`. Hãy chép nguyên chuỗi, hoặc lưu nó vào cột kiểu `pg_lsn`.

Lưu LSN thành chữ rồi so sánh:

```sql
-- WRONG: text order, '0/9FFFFF8' sorts after '0/1A000000'
SELECT max(lsn::text) AS latest
FROM (VALUES ('0/9FFFFF8'::pg_lsn), ('0/1A000000'::pg_lsn)) AS v(lsn);
```

```sql
-- FIX: compare pg_lsn values
SELECT max(lsn) AS latest
FROM (VALUES ('0/9FFFFF8'::pg_lsn), ('0/1A000000'::pg_lsn)) AS v(lsn);
```

So chữ thì `9` lớn hơn `1`, nên LSN nhỏ hơn bị chọn là mới nhất. Kiểu `pg_lsn` so theo vị trí byte thật.

Đảo ngược hai đầu khoảng:

```sql
-- ERROR 22023: WAL start LSN must be less than end LSN
SELECT count(*)
FROM pg_get_wal_records_info((SELECT lsn FROM lsn_marks WHERE name = 'two'),
                             (SELECT lsn FROM lsn_marks WHERE name = 'start'));
```

Mốc cũ đứng trước, mốc mới đứng sau.

Tắt full-page write cho riêng một phiên để WAL nhỏ lại:

```sql
-- ERROR 55P02: parameter "full_page_writes" cannot be changed now
SET full_page_writes = off;
```

Đây là tham số của cả máy chủ, chỉ đổi trong file cấu hình rồi nạp lại. Tắt nó chỉ an toàn khi hệ thống file và ổ đĩa bảo đảm không bao giờ ghi dở một trang; còn lại, hãy giảm full-page image bằng checkpoint thưa hơn.

## Tóm tắt

- Luật WAL: bản ghi WAL phải bền trước khi trang mà nó mô tả được ghi xuống đĩa.
- COMMIT chỉ chờ flush WAL; trang bẩn được checkpoint hay background writer ghi sau, và sau sự cố WAL được phát lại.
- LSN là vị trí byte trong WAL; `pd_lsn` của trang trỏ tới bản ghi cuối cùng đã sửa nó.
- Lần sửa đầu của một trang sau checkpoint ghi cả trang vào WAL, nên checkpoint dày làm WAL phình.
- `pg_walinspect` đọc WAL thật; lọc theo `relfilenode` để chỉ thấy bảng của mình.

# EN

## Opening

The application has just received "COMMIT succeeded" when the server loses power, and the data page it changed has not reached disk yet. After the restart, is that order still there? The answer lies in the WAL.

## Key idea

The WAL (write-ahead log) is a sequential log of every change in the database. The WAL rule is one sentence: a change to a data page may be written to disk only after the WAL record describing it has been flushed. Log first, pages later.

Thanks to this rule COMMIT waits for one cheap thing only: flushing the WAL up to its COMMIT record, a single sequential write. The changed pages become dirty pages in shared buffers and may stay there a long time. If the machine crashes, Postgres reads the WAL from the latest checkpoint and replays (REDO) each change, rebuilding exactly the pages that were not written.

Many people think COMMIT means the table is on disk. In fact when COMMIT returns only the WAL is sure to be durable; the table's file may still hold the old version. The data is safe because the WAL is enough to rebuild it, not because the page was written.

Three ideas come with the WAL:

- LSN (log sequence number): a byte position in the WAL, type `pg_lsn`, written like `0/17A4160`. Every page stores `pd_lsn`, the end of the last WAL record that changed it; the page may reach disk only once the WAL is flushed up to that number.
- Checkpoint: writes every dirty page to disk and marks where replay starts. By default every `checkpoint_timeout` (5 minutes) or when the WAL is about to exceed `max_wal_size` (1 GB).
- Full-page write: the first change of a page after each checkpoint logs the whole 8 KB page. If the machine crashes in the middle of writing a page, the on-disk page can be torn (half new, half old); the full page copy in the WAL is a safe starting point for replay.

In practice: the more frequent the checkpoints, the more full-page images and the bigger the WAL; the rarer they are, the longer replay takes after a crash. The `pg_walinspect` extension reads the real WAL, so you can check all of this with SQL.

## Syntax

```sql
SELECT pg_current_wal_insert_lsn();
SELECT pg_wal_lsn_diff(end_lsn, start_lsn);
SELECT * FROM pg_get_wal_records_info(start_lsn, end_lsn);
SELECT * FROM pg_get_wal_block_info(start_lsn, end_lsn [, show_data ]);
CHECKPOINT;
```

- `pg_current_wal_insert_lsn()`: the WAL position being inserted at now.
- `pg_wal_lsn_diff(a, b)`: the number of WAL bytes between two LSNs.
- `pg_get_wal_records_info`: one row per WAL record in the range.
- `pg_get_wal_block_info`: one row per page a record touches, with `relfilenode` and `block_fpi_length`.

## Example

Capture the LSN before and after an INSERT, then compute how many WAL bytes it produced:

```sql
CREATE EXTENSION IF NOT EXISTS pg_walinspect;
CREATE TABLE notes(id int PRIMARY KEY, body text);
CREATE TABLE lsn_marks(name text PRIMARY KEY, lsn pg_lsn NOT NULL);
INSERT INTO lsn_marks VALUES ('start', pg_current_wal_insert_lsn());
INSERT INTO notes VALUES (1, 'first');
INSERT INTO lsn_marks VALUES ('one', pg_current_wal_insert_lsn());
SELECT pg_wal_lsn_diff((SELECT lsn FROM lsn_marks WHERE name = 'one'),
                       (SELECT lsn FROM lsn_marks WHERE name = 'start')) AS wal_bytes;
```

A few hundred bytes for one row: records for the heap, for the primary key index, for the `lsn_marks` table itself and the COMMIT records.

Keep only the records touching `notes` and its index:

```sql
SELECT resource_manager, record_type, block_fpi_length
FROM pg_get_wal_block_info((SELECT lsn FROM lsn_marks WHERE name = 'start'),
                           (SELECT lsn FROM lsn_marks WHERE name = 'one'))
WHERE relfilenode IN (pg_relation_filenode('notes'), pg_relation_filenode('notes_pkey'))
ORDER BY start_lsn, block_id;
```

Four rows: `Heap INSERT+INIT` (a new heap page), two `Btree NEWROOT` pages and one `INSERT_LEAF`. No full-page image, because a freshly initialised page does not need one.

Full-page writes after a checkpoint. The first `SELECT` reads the table beforehand so its hint bits are already set; otherwise setting them would carry the full-page image:

```sql
SELECT count(*) FROM notes;
CHECKPOINT;
INSERT INTO lsn_marks VALUES ('ckpt', pg_current_wal_insert_lsn());
UPDATE notes SET body = 'second' WHERE id = 1;
UPDATE notes SET body = 'third' WHERE id = 1;
INSERT INTO lsn_marks VALUES ('two', pg_current_wal_insert_lsn());
SELECT record_type, block_fpi_length > 0 AS full_page
FROM pg_get_wal_block_info((SELECT lsn FROM lsn_marks WHERE name = 'ckpt'),
                           (SELECT lsn FROM lsn_marks WHERE name = 'two'))
WHERE relfilenode = pg_relation_filenode('notes')
ORDER BY start_lsn;
```

Two identical `HOT_UPDATE` records, but only the first carries the whole page: it is the page's first change after the checkpoint.

Link the page's `pd_lsn` to the WAL:

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
SELECT h.lsn = (SELECT max(end_lsn)
                FROM pg_get_wal_block_info((SELECT lsn FROM lsn_marks WHERE name = 'start'), pg_current_wal_insert_lsn())
                WHERE relfilenode = pg_relation_filenode('notes')) AS same
FROM page_header(get_raw_page('notes', 0)) h;
```

The result is `true`: the page header holds exactly the end of the last WAL record that changed it.

The server's WAL settings:

```sql
SELECT name, setting, unit
FROM pg_settings
WHERE name IN ('wal_level', 'full_page_writes', 'checkpoint_timeout', 'max_wal_size', 'synchronous_commit')
ORDER BY name;
```

## Common mistakes

Pasting an LSN as a plain number:

```sql
-- ERROR 22P02: invalid input syntax for type pg_lsn: "12345"
SELECT pg_wal_lsn_diff('12345', '0/0');
```

An LSN is two hex numbers separated by `/`. Copy the whole string, or store it in a column of type `pg_lsn`.

Storing LSNs as text and comparing them:

```sql
-- WRONG: text order, '0/9FFFFF8' sorts after '0/1A000000'
SELECT max(lsn::text) AS latest
FROM (VALUES ('0/9FFFFF8'::pg_lsn), ('0/1A000000'::pg_lsn)) AS v(lsn);
```

```sql
-- FIX: compare pg_lsn values
SELECT max(lsn) AS latest
FROM (VALUES ('0/9FFFFF8'::pg_lsn), ('0/1A000000'::pg_lsn)) AS v(lsn);
```

As text `9` is bigger than `1`, so the smaller LSN is picked as the latest. The `pg_lsn` type compares real byte positions.

Swapping the two ends of the range:

```sql
-- ERROR 22023: WAL start LSN must be less than end LSN
SELECT count(*)
FROM pg_get_wal_records_info((SELECT lsn FROM lsn_marks WHERE name = 'two'),
                             (SELECT lsn FROM lsn_marks WHERE name = 'start'));
```

The older mark goes first, the newer one second.

Turning full-page writes off for one session to shrink the WAL:

```sql
-- ERROR 55P02: parameter "full_page_writes" cannot be changed now
SET full_page_writes = off;
```

This is a server-wide setting, changed only in the configuration file followed by a reload. Turning it off is only safe when the file system and disks guarantee a page is never half written; otherwise reduce full-page images with less frequent checkpoints.

## Recap

- The WAL rule: a WAL record must be durable before the page it describes is written to disk.
- COMMIT only waits for the WAL flush; dirty pages are written later by a checkpoint or the background writer, and after a crash the WAL is replayed.
- An LSN is a byte position in the WAL; a page's `pd_lsn` points to the last record that changed it.
- The first change of a page after a checkpoint logs the whole page, so frequent checkpoints inflate the WAL.
- `pg_walinspect` reads the real WAL; filter on `relfilenode` to see only your own table.
