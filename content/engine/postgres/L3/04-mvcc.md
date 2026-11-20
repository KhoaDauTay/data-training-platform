---
id: e-pg-l3-04
engine: postgres
level: L3
module: mvcc
title: "MVCC: mỗi UPDATE là một phiên bản mới"
title_en: "MVCC: every UPDATE is a new version"
kind: concept
runtime: docs
minutes: 10
viz: pg-mvcc-timeline
objectives:
  - vi: Giải thích UPDATE = tuple mới + `xmax` trên tuple cũ
    en: Explain UPDATE = new tuple + `xmax` on the old tuple
  - vi: Nói vì sao người đọc không chặn người ghi
    en: Say why readers do not block writers
requires: [e-pg-l3-01]
sources:
  - https://www.postgresql.org/docs/18/mvcc-intro.html
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://www.postgresql.org/docs/18/storage-page-layout.html
quiz:
  - q:
      vi: "Bảng có 3 dòng ở (0,1), (0,2), (0,3). Ta sửa cột `owner` của dòng 2. Sau đó `ctid` của dòng 2 là gì?"
      en: "A table has 3 rows at (0,1), (0,2), (0,3). We change the `owner` column of row 2. What is row 2's `ctid` afterwards?"
    options:
      - { vi: "Vẫn (0,2): UPDATE sửa dòng tại chỗ", en: "Still (0,2): UPDATE changes the row in place" }
      - { vi: "(0,4): UPDATE ghi một tuple mới, bản cũ ở (0,2) được đánh dấu `xmax`", en: "(0,4): UPDATE writes a new tuple, the old one at (0,2) gets an `xmax`" }
      - { vi: "(1,1): bản mới luôn sang trang mới", en: "(1,1): the new version always goes to a new page" }
    answer: 1
    why:
      vi: "Postgres không sửa tại chỗ. Lab kế tiếp đo đúng điều này: dòng 2 chuyển sang (0,4), còn (0,2) vẫn nằm trên trang với `t_ctid` trỏ sang (0,4). Trang còn chỗ nên bản mới ở cùng trang."
      en: "Postgres never updates in place. The next lab measures exactly this: row 2 moves to (0,4), while (0,2) stays on the page with a `t_ctid` pointing to (0,4). The page has room, so the new version stays on the same page."
  - q:
      vi: "Một bảng 1.000 dòng, mỗi dòng bị UPDATE đúng một lần, chưa VACUUM. Trên đĩa có khoảng bao nhiêu tuple?"
      en: "A 1,000-row table, every row updated exactly once, no VACUUM yet. About how many tuples are on disk?"
    options:
      - { vi: "1.000", en: "1,000" }
      - { vi: "2.000", en: "2,000" }
      - { vi: "1.001", en: "1,001" }
    answer: 1
    why:
      vi: "Mỗi UPDATE để lại bản cũ (có `xmax`) và thêm bản mới. Bản cũ chỉ biến mất khi VACUUM dọn, và chỉ khi không còn transaction nào cần nó."
      en: "Each UPDATE leaves the old version (with `xmax`) and adds a new one. The old version disappears only when VACUUM removes it, and only once no transaction still needs it."
  - q:
      vi: "Transaction A đang đọc bảng ở mức Repeatable Read. Transaction B sửa một dòng rồi COMMIT. A đọc lại dòng đó thấy gì?"
      en: "Transaction A is reading a table at Repeatable Read. Transaction B updates a row and commits. What does A see when it reads that row again?"
    options:
      - { vi: "Bản mới của B", en: "B's new version" }
      - { vi: "Bản cũ, vì snapshot của A có trước khi B commit", en: "The old version, because A's snapshot predates B's commit" }
      - { vi: "A bị chặn cho tới khi B xong", en: "A is blocked until B finishes" }
    answer: 1
    why:
      vi: "Ở Repeatable Read, A dùng một snapshot cho cả transaction. Bản cũ vẫn còn trên trang nên A đọc nó mà không phải chờ ai. Ở Read Committed, mỗi câu lấy snapshot mới nên câu sau của A sẽ thấy bản của B."
      en: "At Repeatable Read, A uses one snapshot for the whole transaction. The old version is still on the page, so A reads it without waiting for anyone. At Read Committed each statement takes a new snapshot, so A's next statement would see B's version."
---

## Ý chính

UPDATE một dòng 1 lần, bảng có thêm mấy phiên bản?

Postgres không ghi đè dòng. Mỗi tuple (một phiên bản của dòng nằm trên trang) mang hai số transaction:

- `xmin`: transaction đã chèn nó;
- `xmax`: transaction đã xóa hay thay nó (0 nếu chưa ai).

UPDATE = chèn tuple mới (`xmin` = transaction hiện tại) + ghi `xmax` lên tuple cũ, và `t_ctid` của tuple cũ trỏ sang bản mới. Mỗi câu đọc có một **snapshot**: danh sách transaction đã commit lúc nó bắt đầu. Nó chọn phiên bản có `xmin` nằm trong snapshot và `xmax` chưa. Vì vậy người đọc không cần lock, người ghi không phải chờ người đọc.

Cái giá: bản cũ nằm lại trên trang cho tới khi VACUUM dọn. Đây là gốc của chuyện bảng phình.

## Ví dụ

```sql
SELECT ctid, xmin, xmax, * FROM acct;
```

Phiên bản thấy được luôn có `xmax` = 0, hoặc `xmax` của một transaction chưa commit / đã hủy / chỉ giữ row lock trên dòng.

## Thực hành

Bấm qua sơ đồ hai làn thời gian (phiên A, phiên B). PGlite chỉ có một kết nối, nên phiên B trong sơ đồ là mô phỏng; số `xmin/xmax` lấy từ lab kế tiếp chạy thật. Học xong mô-đun này bạn giải thích được vì sao UPDATE làm bảng phình.

# EN

## Key idea

UPDATE one row once: how many versions does the table now hold?

Postgres never overwrites a row. Every tuple (one version of a row stored on the page) carries two transaction numbers:

- `xmin`: the transaction that inserted it;
- `xmax`: the transaction that deleted or replaced it (0 if none).

UPDATE = insert a new tuple (`xmin` = current transaction) + stamp `xmax` on the old one, whose `t_ctid` now points to the new version. Each read has a **snapshot**: the set of transactions committed when it started. It picks the version whose `xmin` is in the snapshot and whose `xmax` is not. So readers take no locks, and writers never wait for readers.

The price: old versions stay on the page until VACUUM removes them. This is where table bloat comes from.

## Example

```sql
SELECT ctid, xmin, xmax, * FROM acct;
```

A visible version always has `xmax` = 0, or an `xmax` from a transaction that is uncommitted / aborted / only locking the row.

## Practice

Step through the two-lane timeline (session A, session B). PGlite has a single connection, so session B in the diagram is simulated; the `xmin/xmax` numbers come from the next lab, which runs for real. After this module you can explain why UPDATEs make a table grow.
