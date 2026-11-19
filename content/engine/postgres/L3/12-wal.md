---
id: e-pg-l3-12
engine: postgres
level: L3
module: wal
title: "WAL: ghi nhật ký trước, ghi trang sau"
title_en: "WAL: log first, pages later"
kind: concept
minutes: 10
viz: wal-flow
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
    why:
      vi: "Luật WAL: thay đổi trang chỉ được ghi xuống đĩa sau khi bản ghi WAL mô tả nó đã bền. COMMIT chỉ chờ flush WAL (ghi tuần tự, rẻ); trang dữ liệu bẩn có thể nằm trong bộ đệm rất lâu, vì sau sự cố Postgres phát lại WAL để dựng lại chúng."
      en: "The WAL rule: a page change may reach disk only after the WAL record describing it is durable. COMMIT waits only for the WAL flush (sequential, cheap); dirty data pages may stay in the buffer for a long time, because after a crash Postgres replays the WAL to rebuild them."
  - q:
      vi: "Vì sao lần sửa **đầu tiên** của một trang sau mỗi checkpoint làm WAL to hơn hẳn?"
      en: "Why does the **first** change to a page after each checkpoint make the WAL much bigger?"
    options:
      - { vi: "Postgres ghi cả trang (full-page image) vào WAL để chữa trường hợp trang bị ghi dở khi sập", en: "Postgres writes the whole page (a full-page image) into the WAL to repair a page torn by a crash mid-write" }
      - { vi: "Checkpoint xóa WAL cũ nên phải ghi lại mọi trang", en: "A checkpoint deletes old WAL so every page must be written again" }
      - { vi: "Trang được nén lại sau checkpoint", en: "Pages are recompressed after a checkpoint" }
    answer: 0
    why:
      vi: "Với `full_page_writes = on`, lần sửa đầu của mỗi trang sau checkpoint ghi nguyên nội dung trang vào WAL. Replay bắt đầu từ checkpoint, nên bản trang đầy đủ này là điểm khởi đầu an toàn dù trang trên đĩa bị ghi dở. Checkpoint dày thì WAL nhiều hơn."
      en: "With `full_page_writes = on`, the first change of each page after a checkpoint logs the whole page into the WAL. Replay starts at the checkpoint, so this full copy is a safe starting point even if the on-disk page was torn. More frequent checkpoints mean more WAL."
---

## Ý chính

**Luật WAL**: thay đổi của một trang dữ liệu chỉ được ghi xuống đĩa **sau khi** bản ghi WAL mô tả nó đã được flush. Nhờ vậy COMMIT chỉ cần flush WAL (ghi tuần tự), còn trang bẩn ghi sau. Sau sự cố, Postgres **phát lại** (REDO) WAL từ checkpoint gần nhất.

- **LSN**: vị trí byte trong WAL. Mỗi trang lưu `pd_lsn` = byte ngay sau bản ghi WAL cuối cùng sửa nó.
- **Checkpoint**: mọi trang bẩn được ghi xuống đĩa; replay bắt đầu từ đây. Mặc định mỗi `checkpoint_timeout` (5 phút) hoặc khi WAL sắp vượt `max_wal_size` (1 GB).
- **Full-page write**: lần sửa đầu của một trang sau checkpoint ghi cả trang vào WAL.

## Ví dụ

```sql
SELECT resource_manager, record_type, block_fpi_length
FROM pg_get_wal_block_info(start_lsn, end_lsn);
```

Extension `pg_walinspect` đọc WAL thật: mỗi dòng là một bản ghi và trang mà nó chạm.

## Thực hành

Bấm qua sơ đồ: trang bẩn trong bộ đệm → bản ghi WAL ghi trước, LSN tăng → checkpoint → sập → replay. Phần sập và replay chỉ là sơ đồ: PGlite không mô phỏng được mất điện. Học xong mô-đun này bạn đọc được bản ghi WAL thật của một INSERT và biết vì sao checkpoint dày làm WAL phình.

# EN

## Key idea

**The WAL rule**: a change to a data page may be written to disk only **after** the WAL record describing it has been flushed. So COMMIT only needs a WAL flush (a sequential write) and dirty pages are written later. After a crash Postgres **replays** (REDO) the WAL from the latest checkpoint.

- **LSN**: a byte position in the WAL. Every page stores `pd_lsn` = the byte right after the last WAL record that changed it.
- **Checkpoint**: all dirty pages are written to disk; replay starts here. By default every `checkpoint_timeout` (5 minutes) or when WAL is about to exceed `max_wal_size` (1 GB).
- **Full-page write**: the first change of a page after a checkpoint logs the whole page.

## Example

```sql
SELECT resource_manager, record_type, block_fpi_length
FROM pg_get_wal_block_info(start_lsn, end_lsn);
```

The `pg_walinspect` extension reads the real WAL: each row is one record and the page it touches.

## Practice

Step through the diagram: dirty page in the buffer -> WAL record written first, LSN grows -> checkpoint -> crash -> replay. The crash and replay part is diagram only: PGlite cannot simulate a power loss. After this module you can read the real WAL records of an INSERT and explain why frequent checkpoints inflate the WAL.
