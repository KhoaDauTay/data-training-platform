---
id: e-pg-l4-10
engine: postgres
level: L4
module: locks
title: "Row lock: bốn mức, ghi trong tuple"
title_en: "Row locks: four strengths, stored in the tuple"
kind: concept
runtime: docs
minutes: 15
objectives:
  - { vi: "Phân biệt `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE` và bảng xung đột của chúng", en: "Tell apart `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE` and their conflict table" }
  - { vi: "Giải thích vì sao row lock không nằm trong `pg_locks` mà nằm trong header của tuple", en: "Explain why row locks are not in `pg_locks` but in the tuple header" }
  - { vi: "Biết vì sao khóa ngoại dùng `FOR KEY SHARE` để không chặn cập nhật thường", en: "Know why foreign keys use `FOR KEY SHARE` so ordinary updates are not blocked" }
requires: [e-pg-l4-09]
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/sql-select.html
  - https://www.postgresql.org/docs/18/pageinspect.html
viz: pg-lock-matrix
quiz:
  - q: { vi: "Transaction A chèn đơn hàng tham chiếu khách 42 (khóa ngoại). Transaction B cùng lúc `UPDATE customers SET region = 3 WHERE id = 42` (không đổi cột khóa). B có phải chờ A không?", en: "Transaction A inserts an order that references customer 42 (foreign key). Transaction B at the same time runs `UPDATE customers SET region = 3 WHERE id = 42` (key unchanged). Must B wait for A?" }
    options:
      - { vi: "Có, vì A giữ row lock trên dòng khách", en: "Yes, because A locked the customer row" }
      - { vi: "Không: kiểm tra khóa ngoại lấy `FOR KEY SHARE`, còn UPDATE không đổi cột khóa lấy `FOR NO KEY UPDATE`; hai mức này không xung đột", en: "No: the foreign-key check takes `FOR KEY SHARE`, the key-preserving UPDATE takes `FOR NO KEY UPDATE`, and those two do not conflict" }
      - { vi: "Không, vì khóa ngoại không lấy lock nào cả", en: "No, because foreign keys lock nothing at all" }
    answer: 1
    why: { vi: "`FOR KEY SHARE` chỉ xung đột với `FOR UPDATE` (xóa dòng hoặc đổi cột khóa). Nhờ vậy chèn dòng con không làm nghẽn việc sửa các cột thường của dòng cha.", en: "`FOR KEY SHARE` only conflicts with `FOR UPDATE` (deleting the row or changing a key column). So inserting child rows does not jam updates to the parent's ordinary columns." }
  - q: { vi: "Một job giữ row lock trên 2 triệu dòng bằng `SELECT … FOR UPDATE`. Điều gì đúng?", en: "A job locks 2 million rows with `SELECT … FOR UPDATE`. What is true?" }
    options:
      - { vi: "Postgres hết bộ nhớ bảng lock và nâng lên lock trên bảng", en: "Postgres runs out of lock-table memory and escalates to a table lock" }
      - { vi: "Không có giới hạn số dòng bị giữ lock vì lock được ghi vào từng tuple; cái giá là ghi xuống trang (và WAL) cho mỗi dòng", en: "There is no limit on locked rows because each lock is written into its tuple; the price is a page write (and WAL) per row" }
      - { vi: "Chỉ 1000 dòng đầu bị giữ lock", en: "Only the first 1000 rows get locked" }
    answer: 1
    why: { vi: "Nhiều người nghĩ như các database khác: giữ nhiều row lock thì lock bị nâng lên cả bảng. Docs chính thức: Postgres không nhớ trong bộ nhớ dòng nào bị sửa hay giữ lock, nên không giới hạn số dòng bị giữ lock, nhưng lấy lock một dòng có thể gây ghi đĩa. Postgres không có lock escalation.", en: "Many people expect what other databases do: enough row locks get escalated to a table lock. The docs: Postgres keeps no in-memory record of modified/locked rows, so there is no limit on how many rows are locked, but locking a row may cause a disk write. Postgres has no lock escalation." }
---

## Ý chính

Một job giữ row lock trên 2 triệu dòng: Postgres nhớ chúng ở đâu? Bốn mức row lock, từ yếu tới mạnh, và mức nào chặn mức nào:

- FOR KEY SHARE chặn: FOR UPDATE
- FOR SHARE chặn: FOR NO KEY UPDATE, FOR UPDATE
- FOR NO KEY UPDATE chặn: FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE
- FOR UPDATE chặn: FOR KEY SHARE, FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE

- `UPDATE` không đổi cột thuộc unique index lấy `FOR NO KEY UPDATE`; `DELETE` hoặc `UPDATE` đổi cột khóa lấy `FOR UPDATE`. Kiểm tra khóa ngoại lấy `FOR KEY SHARE` trên dòng cha.
- Row lock không nằm trong bảng lock ở bộ nhớ chung mà được ghi vào tuple: `xmax` = transaction giữ lock, các bit trong `t_infomask` cho biết loại lock và rằng đây chỉ là lock (`HEAP_XMAX_LOCK_ONLY`), không phải xóa.

## Ví dụ

Row lock nằm trong tuple, nên `pg_locks` chỉ cho thấy lock ROW SHARE trên bảng. Người chờ một dòng thì chờ trên ID transaction của người giữ (loại `transactionid`).

Ghi lại trên PGlite bằng một kịch bản nhiều lệnh trong một transaction (không chạy được trong bài một câu), đọc header tuple bằng `pageinspect`:

```text
BEGIN;
SELECT id FROM acct WHERE id = 3 FOR UPDATE;
SELECT id FROM acct WHERE id = 4 FOR SHARE;
SELECT id FROM acct WHERE id = 5 FOR KEY SHARE;
SELECT id FROM acct WHERE id = 6 FOR NO KEY UPDATE;
SELECT lp, t_infomask, t_infomask2 FROM heap_page_items(get_raw_page('acct', 0)) WHERE lp BETWEEN 3 AND 7;
 lp | t_infomask | t_infomask2
  3 |        448 |        8194   -- EXCL_LOCK + LOCK_ONLY, KEYS_UPDATED (FOR UPDATE)
  4 |        464 |           2   -- SHR_LOCK + LOCK_ONLY (FOR SHARE)
  5 |        400 |           2   -- KEYSHR_LOCK + LOCK_ONLY (FOR KEY SHARE)
  6 |        448 |           2   -- EXCL_LOCK + LOCK_ONLY (FOR NO KEY UPDATE)
  7 |       2304 |           2   -- not locked (XMAX_INVALID)
ROLLBACK;
```

Lưu ý: sau ROLLBACK, `xmax` của dòng từng bị giữ lock vẫn còn trên trang (ID của transaction đã hủy). Vì vậy "`xmax` khác 0" không có nghĩa dòng đang bị giữ lock hay đã bị xóa; phải xem các bit cờ và trạng thái transaction.

## Thực hành

Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

`NOWAIT` báo lỗi ngay thay vì chờ; `SKIP LOCKED` bỏ qua dòng đang bị giữ lock, hợp cho hàng đợi việc nhiều worker.

Bấm từng cặp trong ma trận row lock để thấy ai chờ ai (sơ đồ: PGlite chỉ có một phiên, nên không có chờ thật), rồi trả lời hai câu hỏi. Kỹ năng chuyên gia: chọn mức row lock yếu nhất đủ đúng, và giải thích vì sao khóa ngoại không làm nghẽn bảng cha.

# EN

## Key idea

A job holds row locks on 2 million rows: where does Postgres keep them? The four row-lock strengths, weakest first, and which blocks which:

- FOR KEY SHARE blocks: FOR UPDATE
- FOR SHARE blocks: FOR NO KEY UPDATE, FOR UPDATE
- FOR NO KEY UPDATE blocks: FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE
- FOR UPDATE blocks: FOR KEY SHARE, FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE

- An `UPDATE` that changes no column of a unique index takes `FOR NO KEY UPDATE`; a `DELETE` or an `UPDATE` of a key column takes `FOR UPDATE`. A foreign-key check takes `FOR KEY SHARE` on the parent row.
- Row locks are not in the shared-memory lock table; they are written into the tuple: `xmax` = the locking transaction, and bits in `t_infomask` give the lock kind and say it is only a lock (`HEAP_XMAX_LOCK_ONLY`), not a delete.

## Example

Because row locks live in the tuple, `pg_locks` only shows the ROW SHARE lock on the table. A session waiting for a row waits on the holder's transaction ID (type `transactionid`).

Captured on PGlite with a multi-statement script inside one transaction (not runnable as a one-statement lesson), reading tuple headers with `pageinspect`:

```text
BEGIN;
SELECT id FROM acct WHERE id = 3 FOR UPDATE;
SELECT id FROM acct WHERE id = 4 FOR SHARE;
SELECT id FROM acct WHERE id = 5 FOR KEY SHARE;
SELECT id FROM acct WHERE id = 6 FOR NO KEY UPDATE;
SELECT lp, t_infomask, t_infomask2 FROM heap_page_items(get_raw_page('acct', 0)) WHERE lp BETWEEN 3 AND 7;
 lp | t_infomask | t_infomask2
  3 |        448 |        8194   -- EXCL_LOCK + LOCK_ONLY, KEYS_UPDATED (FOR UPDATE)
  4 |        464 |           2   -- SHR_LOCK + LOCK_ONLY (FOR SHARE)
  5 |        400 |           2   -- KEYSHR_LOCK + LOCK_ONLY (FOR KEY SHARE)
  6 |        448 |           2   -- EXCL_LOCK + LOCK_ONLY (FOR NO KEY UPDATE)
  7 |       2304 |           2   -- not locked (XMAX_INVALID)
ROLLBACK;
```

Note: after the ROLLBACK, the locked rows still carry an `xmax` on the page (the ID of the aborted transaction). So "`xmax` is not 0" does not mean the row is locked or deleted; you have to read the flag bits and the transaction's status.

## Practice

The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded output.

`NOWAIT` errors at once instead of waiting; `SKIP LOCKED` skips locked rows, which suits job queues with many workers.

Click each pair in the row-lock matrix to see who waits for whom (a diagram: PGlite has one session, so there is no real wait), then answer two questions. Expert skill: pick the weakest row lock that is still correct, and explain why foreign keys do not jam the parent table.
