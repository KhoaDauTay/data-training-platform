---
id: e-pg-l4-10
engine: postgres
level: L4
module: locks
title: "Khóa dòng: bốn mức, ghi trong tuple"
title_en: "Row locks: four strengths, stored in the tuple"
kind: concept
minutes: 15
objectives:
  - { vi: "Phân biệt `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE` và bảng xung đột của chúng", en: "Tell apart `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE` and their conflict table" }
  - { vi: "Giải thích vì sao khóa dòng không nằm trong `pg_locks` mà nằm trong header của tuple", en: "Explain why row locks are not in `pg_locks` but in the tuple header" }
  - { vi: "Biết vì sao khóa ngoại dùng `FOR KEY SHARE` để không chặn cập nhật thường", en: "Know why foreign keys use `FOR KEY SHARE` so ordinary updates are not blocked" }
requires: [e-pg-l4-09]
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/sql-select.html
  - https://www.postgresql.org/docs/18/pageinspect.html
viz: lock-matrix
quiz:
  - q: { vi: "Giao dịch A chèn đơn hàng tham chiếu khách 42 (khóa ngoại). Giao dịch B cùng lúc `UPDATE customers SET region = 3 WHERE id = 42` (không đổi khóa). B có phải chờ A không?", en: "Transaction A inserts an order that references customer 42 (foreign key). Transaction B at the same time runs `UPDATE customers SET region = 3 WHERE id = 42` (key unchanged). Must B wait for A?" }
    options:
      - { vi: "Có, vì A khóa dòng khách", en: "Yes, because A locked the customer row" }
      - { vi: "Không: kiểm tra khóa ngoại lấy `FOR KEY SHARE`, còn UPDATE không đổi khóa lấy `FOR NO KEY UPDATE`; hai chế độ này không xung đột", en: "No: the foreign-key check takes `FOR KEY SHARE`, the key-preserving UPDATE takes `FOR NO KEY UPDATE`, and those two do not conflict" }
      - { vi: "Không, vì khóa ngoại không khóa gì cả", en: "No, because foreign keys lock nothing at all" }
    answer: 1
    why: { vi: "`FOR KEY SHARE` chỉ xung đột với `FOR UPDATE` (xóa dòng hoặc đổi cột khóa). Nhờ vậy chèn dòng con không làm nghẽn việc sửa các cột thường của dòng cha.", en: "`FOR KEY SHARE` only conflicts with `FOR UPDATE` (deleting the row or changing a key column). So inserting child rows does not jam updates to the parent's ordinary columns." }
  - q: { vi: "Một job khóa 2 triệu dòng bằng `SELECT … FOR UPDATE`. Điều gì đúng?", en: "A job locks 2 million rows with `SELECT … FOR UPDATE`. What is true?" }
    options:
      - { vi: "Postgres hết bộ nhớ bảng khóa và nâng lên khóa bảng", en: "Postgres runs out of lock-table memory and escalates to a table lock" }
      - { vi: "Không có giới hạn số dòng khóa vì khóa được ghi vào từng tuple; cái giá là ghi xuống trang (và WAL) cho mỗi dòng", en: "There is no limit on locked rows because each lock is written into its tuple; the price is a page write (and WAL) per row" }
      - { vi: "Chỉ 1000 dòng đầu bị khóa", en: "Only the first 1000 rows get locked" }
    answer: 1
    why: { vi: "Tài liệu: Postgres không nhớ dòng bị sửa/khóa trong bộ nhớ nên không giới hạn số dòng khóa, nhưng khóa một dòng có thể gây ghi đĩa. Postgres không có nâng cấp khóa (lock escalation).", en: "The docs: Postgres keeps no in-memory record of modified/locked rows, so there is no limit on how many rows are locked, but locking a row may cause a disk write. Postgres has no lock escalation." }
---

## Ý chính

Bốn mức khóa dòng, từ mạnh tới yếu, và bảng xung đột (X = chặn nhau):

- FOR KEY SHARE xung đột với: FOR UPDATE
- FOR SHARE xung đột với: FOR NO KEY UPDATE, FOR UPDATE
- FOR NO KEY UPDATE xung đột với: FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE
- FOR UPDATE xung đột với: FOR KEY SHARE, FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE

- `UPDATE` không đổi cột thuộc unique index lấy `FOR NO KEY UPDATE`; `DELETE` hoặc `UPDATE` đổi cột khóa lấy `FOR UPDATE`. Kiểm tra khóa ngoại lấy `FOR KEY SHARE` trên dòng cha.
- Khóa dòng không nằm trong bảng khóa ở bộ nhớ chung. Nó được ghi vào tuple: `xmax` = giao dịch khóa, các bit trong `t_infomask` cho biết loại khóa và rằng đây chỉ là khóa (`HEAP_XMAX_LOCK_ONLY`), không phải xóa.
- Vì vậy `pg_locks` chỉ cho thấy khóa bảng ROW SHARE đi kèm. Người đang chờ một dòng thì chờ trên ID giao dịch của người giữ (loại `transactionid` trong `pg_locks`).
- `NOWAIT` báo lỗi ngay thay vì chờ; `SKIP LOCKED` bỏ qua dòng đang bị khóa, hợp cho hàng đợi việc nhiều worker.

## Ví dụ

Ghi lại trên PGlite bằng một kịch bản nhiều lệnh trong một giao dịch (không chạy được trong bài một câu), đọc header tuple bằng `pageinspect`:

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

Lưu ý: sau ROLLBACK, `xmax` của dòng đã khóa vẫn còn trên trang (ID của giao dịch đã hủy). Vì vậy "`xmax` khác 0" không có nghĩa dòng đang bị khóa hay đã bị xóa; phải xem các bit cờ và trạng thái giao dịch.

## Thực hành

Bấm từng cặp trong ma trận khóa dòng để thấy ai chờ ai (sơ đồ: PGlite chỉ có một phiên, nên không có chờ thật), rồi trả lời hai câu hỏi. Kỹ năng chuyên gia: chọn mức khóa dòng yếu nhất đủ đúng, và giải thích vì sao khóa ngoại không làm nghẽn bảng cha.

# EN

## Key idea

Four row-lock strengths, strongest last, and their conflict table (X = they block each other):

- FOR KEY SHARE conflicts with: FOR UPDATE
- FOR SHARE conflicts with: FOR NO KEY UPDATE, FOR UPDATE
- FOR NO KEY UPDATE conflicts with: FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE
- FOR UPDATE conflicts with: FOR KEY SHARE, FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE

- An `UPDATE` that changes no column of a unique index takes `FOR NO KEY UPDATE`; a `DELETE` or an `UPDATE` of a key column takes `FOR UPDATE`. A foreign-key check takes `FOR KEY SHARE` on the parent row.
- Row locks are not in the shared-memory lock table. They are written into the tuple: `xmax` = the locking transaction, and bits in `t_infomask` give the lock kind and say it is only a lock (`HEAP_XMAX_LOCK_ONLY`), not a delete.
- That is why `pg_locks` only shows the ROW SHARE table lock that comes with them. A session waiting for a row waits on the holder's transaction ID (lock type `transactionid` in `pg_locks`).
- `NOWAIT` errors at once instead of waiting; `SKIP LOCKED` skips locked rows, which suits job queues with many workers.

## Example

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

Click each pair in the row-lock matrix to see who waits for whom (a diagram: PGlite has one session, so there is no real wait), then answer two questions. Expert skill: pick the weakest row lock that is still correct, and explain why foreign keys do not jam the parent table.
