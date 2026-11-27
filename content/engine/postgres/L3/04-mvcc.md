---
id: e-pg-l3-04
engine: postgres
level: L3
module: mvcc
title: "MVCC: mỗi UPDATE là một phiên bản mới"
title_en: "MVCC: every UPDATE is a new version"
kind: concept
runtime: docs
docs_why: next
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-mvcc-timeline
objectives:
  - vi: Giải thích UPDATE = tuple mới + `xmax` trên tuple cũ
    en: Explain UPDATE = new tuple + `xmax` on the old tuple
  - vi: Nói vì sao người đọc không chặn người ghi
    en: Say why readers do not block writers
  - vi: Giải thích vì sao ROLLBACK, UPDATE và DELETE đều để lại tuple chết trên trang
    en: Explain why ROLLBACK, UPDATE and DELETE all leave dead tuples on the page
requires: [e-pg-l3-01]
sources:
  - { url: https://www.postgresql.org/docs/18/mvcc-intro.html, title_vi: "Nhập môn MVCC" }
  - { url: https://www.postgresql.org/docs/18/transaction-iso.html, title_vi: "Mức cô lập transaction" }
  - { url: https://www.postgresql.org/docs/18/storage-page-layout.html, title_vi: "Cấu trúc trang dữ liệu" }
quiz:
  - q:
      vi: "Bảng có 3 dòng ở (0,1), (0,2), (0,3). Ta sửa cột `owner` của dòng 2. Sau đó `ctid` của dòng 2 là gì?"
      en: "A table has 3 rows at (0,1), (0,2), (0,3). We change the `owner` column of row 2. What is row 2's `ctid` afterwards?"
    options:
      - { vi: "Vẫn (0,2): UPDATE sửa dòng tại chỗ", en: "Still (0,2): UPDATE changes the row in place" }
      - { vi: "(0,4): UPDATE ghi một tuple mới, bản cũ ở (0,2) được đánh dấu `xmax`", en: "(0,4): UPDATE writes a new tuple, the old one at (0,2) gets an `xmax`" }
      - { vi: "(1,1): bản mới luôn sang trang mới", en: "(1,1): the new version always goes to a new page" }
    answer: 1
    trap: 0
    why:
      vi: "\"Sửa tại chỗ\" nghe tự nhiên vì câu lệnh tên là UPDATE, nhưng với MVCC (multiversion concurrency control, giữ nhiều phiên bản của một dòng) Postgres không bao giờ sửa tại chỗ. Nó ghi một tuple mới vào line pointer trống kế tiếp, tức (0,4), và ghi `xmax` lên bản cũ ở (0,2), có `t_ctid` trỏ sang (0,4). Bản mới chỉ sang trang khác khi trang hiện tại hết chỗ; trang này mới có 3 dòng ngắn nên còn chỗ."
      en: "\"In place\" sounds natural because the command is called UPDATE, but with MVCC (multiversion concurrency control, keeping several versions of a row) Postgres never updates in place. It writes a new tuple at the next free line pointer, (0,4), and stamps `xmax` on the old one at (0,2), whose `t_ctid` points to (0,4). The new version only goes to another page when the current page is full; this page holds 3 short rows, so it has room."
  - q:
      vi: "Một bảng 1.000 dòng, mỗi dòng bị UPDATE đúng một lần, chưa VACUUM. Trên đĩa có khoảng bao nhiêu tuple?"
      en: "A 1,000-row table, every row updated exactly once, no VACUUM yet. About how many tuples are on disk?"
    options:
      - { vi: "1.000", en: "1,000" }
      - { vi: "2.000", en: "2,000" }
      - { vi: "1.001", en: "1,001" }
    answer: 1
    trap: 0
    why:
      vi: "1.000 nghe đúng vì `SELECT` vẫn trả 1.000 dòng, nhưng đó là số phiên bản thấy được, không phải số tuple trên đĩa. Mỗi UPDATE để lại bản cũ (có `xmax`) và thêm một bản mới, nên 1.000 bản cũ + 1.000 bản mới = 2.000. 1.001 sẽ là con số nếu chỉ một dòng bị sửa. Bản cũ chỉ biến mất khi VACUUM dọn, và chỉ khi không còn transaction nào cần nó."
      en: "1,000 sounds right because a `SELECT` still returns 1,000 rows, but that is the number of visible versions, not the tuples on disk. Each UPDATE leaves the old version (with `xmax`) and adds a new one, so 1,000 old + 1,000 new = 2,000. 1,001 would be the count if only one row had been updated. Old versions disappear only when VACUUM removes them, and only once no transaction still needs them."
  - q:
      vi: "Transaction A đang đọc bảng ở mức Repeatable Read. Transaction B sửa một dòng rồi COMMIT. A đọc lại dòng đó thấy gì?"
      en: "Transaction A is reading a table at Repeatable Read. Transaction B updates a row and commits. What does A see when it reads that row again?"
    options:
      - { vi: "Bản mới của B", en: "B's new version" }
      - { vi: "Bản cũ, vì snapshot của A có trước khi B commit", en: "The old version, because A's snapshot predates B's commit" }
      - { vi: "A bị chặn cho tới khi B xong", en: "A is blocked until B finishes" }
    answer: 1
    trap: 0
    why:
      vi: "Thấy bản mới của B nghe hợp lý vì B đã commit, và ở Read Committed đúng là vậy. Ở Repeatable Read, A dùng một snapshot (danh sách transaction đã commit lúc chụp) cho cả transaction; B commit sau lúc chụp, nên bản của B vô hình với A. Bản cũ vẫn còn trên trang nên A đọc nó, không bị chặn và không cần lock. Ở Read Committed, mỗi câu lấy snapshot mới nên câu sau của A sẽ thấy bản của B."
      en: "Seeing B's new version sounds right because B has committed, and at Read Committed that would be true. At Repeatable Read, A uses one snapshot (the list of transactions committed when it was taken) for the whole transaction; B committed after that, so B's version is invisible to A. The old version is still on the page, so A reads it without being blocked and without a lock. At Read Committed each statement takes a new snapshot, so A's next statement would see B's version."
---
## Mở bài

Một phiên đang đọc báo cáo dài trên bảng `acct` thì phiên khác sửa chủ tài khoản 2. Người đọc không bị chặn, người sửa cũng không phải chờ. Postgres làm thế nào để cả hai cùng đúng?

## Ý chính

Postgres dùng MVCC (multiversion concurrency control): thay vì ghi đè, nó giữ nhiều phiên bản của một dòng. Mỗi tuple, tức một phiên bản nằm trên trang, mang hai số transaction:

- `xmin`: transaction đã chèn phiên bản này;
- `xmax`: transaction đã xóa hay thay nó, hoặc chỉ giữ row lock trên nó; bằng 0 nếu chưa ai đụng tới.

Nhiều người nghĩ UPDATE sửa dòng tại chỗ. Thật ra UPDATE là hai việc: chèn một tuple mới có `xmin` là transaction hiện tại, rồi ghi `xmax` lên tuple cũ và cho `t_ctid` của tuple cũ trỏ sang bản mới. DELETE chỉ làm nửa sau: ghi `xmax`. Bản cũ vẫn nằm nguyên trên trang.

Mỗi câu đọc nhìn dữ liệu qua một snapshot: danh sách transaction đã commit lúc snapshot được chụp. Một phiên bản thấy được khi `xmin` của nó đã commit trong snapshot, và `xmax` thì chưa (hoặc bằng 0, hoặc thuộc transaction bị hủy). Ở Read Committed mỗi câu chụp snapshot mới; ở Repeatable Read cả transaction dùng một snapshot. Vì bản cũ còn đó, người đọc cứ đọc bản cũ mà không cần lock, và người ghi không phải chờ ai đọc xong.

Cái giá là rác. ROLLBACK không xóa tuple đã chèn, nó chỉ đánh dấu transaction là hủy, nên tuple trở nên vô hình. Bản cũ của UPDATE và DELETE nằm lại cho tới khi VACUUM dọn, và chỉ khi không còn snapshot nào cần chúng. Đây là gốc của chuyện bảng phình dù số dòng không đổi.

Số transaction (`xid`) chỉ dài 32 bit và quay vòng, nên Postgres không cho so lớn nhỏ giữa hai `xid`. Muốn biết một phiên bản cũ cỡ nào, dùng `age(xmin)`: đã bao nhiêu transaction trôi qua kể từ khi nó được chèn.

## Cú pháp

```sql
SELECT ctid, xmin, xmax, column_name [, ...] FROM table_name;
SELECT txid_current();
SELECT age(xmin) FROM table_name;
BEGIN [ ISOLATION LEVEL { READ COMMITTED | REPEATABLE READ } ];
SELECT lp, t_xmin, t_xmax, t_ctid FROM heap_page_items(get_raw_page('table_name', block_number));
```

- `xmin`, `xmax`, `ctid`: cột hệ thống, chỉ thấy khi gọi tên.
- `txid_current()`: số của transaction đang chạy; gọi nó cũng cấp số cho transaction.
- `heap_page_items`: thấy cả tuple vô hình mà `SELECT` thường bỏ qua.

## Ví dụ

Ba tài khoản mới chèn, cùng một transaction:

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE TABLE acct (id int PRIMARY KEY, owner text);
INSERT INTO acct VALUES (1, 'an'), (2, 'binh'), (3, 'chi');
SELECT ctid, xmin, xmax, id, owner FROM acct ORDER BY id;
```

Ba dòng có cùng `xmin` và `xmax` = 0. Con số `xmin` thật đổi theo máy.

```sql
UPDATE acct SET owner = 'binh moi' WHERE id = 2;
SELECT ctid, xmin, xmax, id, owner FROM acct ORDER BY id;
```

Dòng 2 giờ ở (0,4) với một `xmin` mới: đó là một tuple khác, không phải tuple cũ được sửa.

```sql
SELECT lp, t_xmin, t_xmax, t_ctid
FROM heap_page_items(get_raw_page('acct', 0));
```

Trang có 4 tuple. lp 2 vẫn giữ `'binh'`, có `t_xmax` bằng `t_xmin` của lp 4, và `t_ctid` = (0,4) trỏ sang bản mới.

```sql
BEGIN;
INSERT INTO acct VALUES (4, 'dung');
ROLLBACK;
SELECT count(*) AS visible_rows,
       (SELECT count(*) FROM heap_page_items(get_raw_page('acct', 0))) AS tuples_on_page
FROM acct;
```

3 dòng thấy được nhưng 5 tuple trên trang: ROLLBACK để lại tuple của tài khoản 4, chỉ là không ai thấy nó.

## Lỗi hay gặp

So hai số transaction như so số nguyên:

```sql
-- ERROR 42883: operator does not exist: xid < xid
SELECT id FROM acct WHERE xmin < xmax;
```

```sql
SELECT id, age(xmin) AS tx_ago FROM acct ORDER BY id;
```

`xid` quay vòng sau khoảng 4 tỉ transaction, nên "nhỏ hơn" không có nghĩa "cũ hơn". `age()` trả số transaction đã qua, so được an toàn.

Đếm dòng để đoán bảng chiếm bao nhiêu chỗ:

```sql
-- WRONG: count(*) only counts the versions this snapshot sees
SELECT count(*) AS tuples FROM acct;
```

```sql
-- FIX: count every tuple on the page, visible or not
SELECT count(*) AS tuples FROM heap_page_items(get_raw_page('acct', 0));
```

Câu sai ra 3, câu đúng ra 5. Trên bảng hay UPDATE, khoảng cách này lớn dần cho tới khi VACUUM chạy.

## Tóm tắt

- Mỗi tuple mang `xmin` (ai chèn) và `xmax` (ai xóa, thay hoặc khóa); 0 là chưa ai.
- UPDATE = tuple mới + `xmax` và `t_ctid` trên tuple cũ; DELETE chỉ ghi `xmax`.
- Snapshot quyết định phiên bản nào thấy được, nên đọc không chặn ghi và ghi không chặn đọc.
- ROLLBACK, UPDATE và DELETE đều để lại tuple chết trên trang cho tới khi VACUUM dọn.
- `xid` quay vòng: không so lớn nhỏ, dùng `age(xmin)`.

# EN

## Opening

One session is reading a long report on table `acct` while another changes the owner of account 2. The reader is not blocked and the writer does not wait. How does Postgres keep both right?

## Key idea

Postgres uses MVCC (multiversion concurrency control): instead of overwriting, it keeps several versions of a row. Each tuple, that is one version stored on the page, carries two transaction numbers:

- `xmin`: the transaction that inserted this version;
- `xmax`: the transaction that deleted or replaced it, or only holds a row lock on it; 0 if nobody touched it.

Many people think UPDATE changes the row in place. In fact UPDATE is two things: insert a new tuple whose `xmin` is the current transaction, then stamp `xmax` on the old tuple and make the old tuple's `t_ctid` point to the new version. DELETE does only the second half: it stamps `xmax`. The old version stays on the page untouched.

Each read sees the data through a snapshot: the set of transactions committed when the snapshot was taken. A version is visible when its `xmin` committed within the snapshot and its `xmax` did not (it is 0, or belongs to an aborted transaction). At Read Committed each statement takes a new snapshot; at Repeatable Read the whole transaction uses one. Since the old version is still there, readers simply read it without any lock, and writers never wait for readers to finish.

The price is garbage. ROLLBACK does not remove the inserted tuples, it only marks the transaction as aborted, so its tuples become invisible. Old versions from UPDATE and DELETE stay until VACUUM removes them, and only once no snapshot needs them. This is where a table bloats while its row count stays flat.

Transaction numbers (`xid`) are only 32 bits and wrap around, so Postgres does not let you compare two `xid` values for larger or smaller. To see how old a version is, use `age(xmin)`: how many transactions have passed since it was inserted.

## Syntax

```sql
SELECT ctid, xmin, xmax, column_name [, ...] FROM table_name;
SELECT txid_current();
SELECT age(xmin) FROM table_name;
BEGIN [ ISOLATION LEVEL { READ COMMITTED | REPEATABLE READ } ];
SELECT lp, t_xmin, t_xmax, t_ctid FROM heap_page_items(get_raw_page('table_name', block_number));
```

- `xmin`, `xmax`, `ctid`: system columns, visible only when named.
- `txid_current()`: the number of the running transaction; calling it also assigns one.
- `heap_page_items`: shows the invisible tuples too, which a plain `SELECT` skips.

## Example

Three new accounts, inserted by one transaction:

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE TABLE acct (id int PRIMARY KEY, owner text);
INSERT INTO acct VALUES (1, 'an'), (2, 'binh'), (3, 'chi');
SELECT ctid, xmin, xmax, id, owner FROM acct ORDER BY id;
```

The three rows share one `xmin` and have `xmax` = 0. The real `xmin` number differs from machine to machine.

```sql
UPDATE acct SET owner = 'binh moi' WHERE id = 2;
SELECT ctid, xmin, xmax, id, owner FROM acct ORDER BY id;
```

Row 2 now lives at (0,4) with a new `xmin`: it is a different tuple, not the old one changed.

```sql
SELECT lp, t_xmin, t_xmax, t_ctid
FROM heap_page_items(get_raw_page('acct', 0));
```

The page holds 4 tuples. lp 2 still holds `'binh'`, its `t_xmax` equals the `t_xmin` of lp 4, and its `t_ctid` = (0,4) points to the new version.

```sql
BEGIN;
INSERT INTO acct VALUES (4, 'dung');
ROLLBACK;
SELECT count(*) AS visible_rows,
       (SELECT count(*) FROM heap_page_items(get_raw_page('acct', 0))) AS tuples_on_page
FROM acct;
```

3 visible rows but 5 tuples on the page: the ROLLBACK left account 4's tuple behind, only nobody can see it.

## Common mistakes

Comparing two transaction numbers like integers:

```sql
-- ERROR 42883: operator does not exist: xid < xid
SELECT id FROM acct WHERE xmin < xmax;
```

```sql
SELECT id, age(xmin) AS tx_ago FROM acct ORDER BY id;
```

`xid` wraps around after about 4 billion transactions, so "smaller" does not mean "older". `age()` returns the number of transactions passed, which compares safely.

Counting rows to guess how much space a table takes:

```sql
-- WRONG: count(*) only counts the versions this snapshot sees
SELECT count(*) AS tuples FROM acct;
```

```sql
-- FIX: count every tuple on the page, visible or not
SELECT count(*) AS tuples FROM heap_page_items(get_raw_page('acct', 0));
```

The wrong query returns 3, the right one 5. On an update-heavy table this gap keeps growing until VACUUM runs.

## Recap

- Each tuple carries `xmin` (who inserted it) and `xmax` (who deleted, replaced or locked it); 0 means nobody.
- UPDATE = a new tuple + `xmax` and `t_ctid` on the old one; DELETE only stamps `xmax`.
- The snapshot decides which version is visible, so reads do not block writes and writes do not block reads.
- ROLLBACK, UPDATE and DELETE all leave dead tuples on the page until VACUUM removes them.
- `xid` wraps around: never compare for larger or smaller, use `age(xmin)`.
