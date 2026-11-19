---
id: e-pg-l5-09
engine: postgres
level: L5
module: integrity
title: "WAL đào sâu: full-page write sau checkpoint"
title_en: "WAL in depth: full-page writes after a checkpoint"
kind: lab
minutes: 20
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
    DROP TABLE IF EXISTS wal_marks, stock;
    CREATE TABLE wal_marks (step text PRIMARY KEY, lsn pg_lsn NOT NULL);
    CREATE TABLE stock (id int PRIMARY KEY, qty int NOT NULL) WITH (fillfactor = 70);
    INSERT INTO stock SELECT g, 10 FROM generate_series(1, 100) g;
    CHECKPOINT;
    INSERT INTO wal_marks VALUES ('start', pg_current_wal_insert_lsn());
    UPDATE stock SET qty = qty - 1 WHERE id = 1;
    UPDATE stock SET qty = qty - 1 WHERE id = 2;
    INSERT INTO wal_marks VALUES ('end', pg_current_wal_insert_lsn());
  steps:
    - task: { vi: "Giữa hai mốc 'start' và 'end' trong `wal_marks`, liệt kê các bản ghi của resource manager 'Heap' chạm tới bảng `stock`: loại bản ghi và cột full_page (true nếu bản ghi chứa ảnh cả trang). Sắp theo `start_lsn`.", en: "Between the 'start' and 'end' marks in `wal_marks`, list the 'Heap' resource-manager records that touch table `stock`: record type and a column full_page (true if the record carries a full-page image). Order by `start_lsn`." }
      solution: "SELECT record_type, fpi_length > 0 AS full_page FROM pg_get_wal_records_info((SELECT lsn FROM wal_marks WHERE step = 'start'), (SELECT lsn FROM wal_marks WHERE step = 'end')) WHERE resource_manager = 'Heap' AND block_ref LIKE '%/' || pg_relation_filenode('stock') || ' %' ORDER BY start_lsn"
      check: rows
      ordered: true
      hint: { vi: "Cột `block_ref` chứa `rel <tablespace>/<db>/<filenode>`; lấy filenode bằng `pg_relation_filenode('stock')`.", en: "The `block_ref` column holds `rel <tablespace>/<db>/<filenode>`; get the filenode with `pg_relation_filenode('stock')`." }
    - task: { vi: "Đọc ba thiết lập liên quan: `full_page_writes`, `checkpoint_timeout`, `max_wal_size` (tên, giá trị, đơn vị; sắp theo tên).", en: "Read three related settings: `full_page_writes`, `checkpoint_timeout`, `max_wal_size` (name, value, unit; ordered by name)." }
      solution: "SELECT name, setting, unit FROM pg_settings WHERE name IN ('full_page_writes', 'checkpoint_timeout', 'max_wal_size') ORDER BY name"
      check: catalog
      ordered: true
      hint: { vi: "View `pg_settings`.", en: "The `pg_settings` view." }
quiz:
  - q: { vi: "Vì sao lần sửa đầu tiên của một trang sau checkpoint phải ghi cả trang vào WAL?", en: "Why must the first change to a page after a checkpoint write the whole page to WAL?" }
    options:
      - { vi: "Để tăng tốc đọc", en: "To speed up reads" }
      - { vi: "Nếu máy sập giữa lúc ghi trang 8 KB, trang trên đĩa có thể bị ghi dở; replay bắt đầu từ ảnh cả trang trong WAL nên sửa được", en: "If the machine crashes mid-write of an 8 KB page, the page on disk can be torn; replay starts from the full-page image in WAL, so it can be repaired" }
      - { vi: "Để standby nhận nhanh hơn", en: "So standbys receive it faster" }
    answer: 1
    why: { vi: "Đó là `full_page_writes` (mặc định on). Replay bắt đầu từ checkpoint, nên chỉ lần sửa đầu sau mỗi checkpoint cần ảnh cả trang.", en: "That is `full_page_writes` (on by default). Replay starts from the checkpoint, so only the first change after each checkpoint needs the full image." }
  - q: { vi: "Một hệ thống đặt `checkpoint_timeout = 30s` để \"phục hồi nhanh\". Tác dụng phụ chính?", en: "A system sets `checkpoint_timeout = 30s` for \"fast recovery\". The main side effect?" }
    options:
      - { vi: "Không có", en: "None" }
      - { vi: "WAL phình vì nhiều trang hơn phải ghi ảnh cả trang sau mỗi checkpoint, cộng thêm I/O ghi trang bẩn thường xuyên", en: "WAL grows because more pages need a full-page image after each checkpoint, plus frequent I/O to flush dirty pages" }
      - { vi: "Mất dữ liệu đã commit", en: "Committed data is lost" }
    answer: 1
    why: { vi: "Tài liệu WAL Configuration: checkpoint dày làm giảm thời gian phục hồi nhưng tăng chi phí I/O và lượng WAL do full-page write. Mặc định 5 phút / 1 GB là điểm cân bằng thường dùng.", en: "WAL Configuration docs: frequent checkpoints cut recovery time but raise I/O cost and WAL volume through full-page writes. The 5 min / 1 GB defaults are the usual balance." }
---

## Ý chính

- Luật WAL: bản ghi mô tả thay đổi phải bền trên đĩa trước khi trang dữ liệu được ghi. Khi sập, Postgres replay WAL từ checkpoint gần nhất.
- Checkpoint: mọi trang bẩn được ghi xuống, rồi một bản ghi checkpoint. Chạy theo `checkpoint_timeout` (mặc định 5 phút) hoặc khi WAL sắp vượt `max_wal_size` (1 GB).
- `full_page_writes` (mặc định on): lần sửa đầu tiên của mỗi trang sau checkpoint ghi ảnh cả trang (FPI) vào WAL, để sửa được trang bị ghi dở khi sập.
- Hệ quả: lượng WAL phụ thuộc mạnh vào số trang khác nhau bị chạm sau mỗi checkpoint. UPDATE rải rác trên nhiều trang ngay sau checkpoint đắt hơn nhiều so với cùng số UPDATE dồn trên ít trang.
- `pg_walinspect` đọc bản ghi WAL thật: `resource_manager`, `record_type`, `fpi_length`, `block_ref`.

## Ví dụ

Kết quả thật trên PGlite: `CHECKPOINT`, rồi hai UPDATE trên cùng trang 0 của `stock`:

```text
record_type  full_page
HOT_UPDATE   true
HOT_UPDATE   false
```

UPDATE đầu tiên sau checkpoint mang ảnh cả trang; UPDATE thứ hai chạm cùng trang nên chỉ ghi phần thay đổi. Cả hai là HOT vì `qty` không có index và `fillfactor = 70` để chỗ trống trên trang.

## Thực hành

Đọc WAL giữa hai mốc LSN do phần dựng dữ liệu ghi lại, rồi đọc ba thiết lập WAL. Kỹ năng chuyên gia: giải thích một đợt tăng WAL đột ngột (sau checkpoint, sau bật `wal_log_hints`/checksum) và tinh chỉnh `checkpoint_timeout`/`max_wal_size` có căn cứ.

# EN

## Key idea

- The WAL rule: the record describing a change must be durable before the data page is written. After a crash, Postgres replays WAL from the last checkpoint.
- A checkpoint writes every dirty page, then a checkpoint record. It runs every `checkpoint_timeout` (5 minutes by default) or when WAL is about to exceed `max_wal_size` (1 GB).
- `full_page_writes` (on by default): the first change to each page after a checkpoint writes a full-page image (FPI) into WAL, so a page torn by a crash can be repaired.
- Consequence: WAL volume depends heavily on how many distinct pages are touched after each checkpoint. UPDATEs scattered over many pages right after a checkpoint cost far more than the same number of UPDATEs on a few pages.
- `pg_walinspect` reads real WAL records: `resource_manager`, `record_type`, `fpi_length`, `block_ref`.

## Example

Real output from PGlite: `CHECKPOINT`, then two UPDATEs on the same page 0 of `stock`:

```text
record_type  full_page
HOT_UPDATE   true
HOT_UPDATE   false
```

The first UPDATE after the checkpoint carries a full-page image; the second touches the same page, so it only logs the change. Both are HOT because `qty` has no index and `fillfactor = 70` leaves free space on the page.

## Practice

Read the WAL between two LSN marks recorded by the setup, then read three WAL settings. Expert skill: explain a sudden WAL spike (after a checkpoint, after turning on `wal_log_hints`/checksums) and tune `checkpoint_timeout`/`max_wal_size` on evidence.
