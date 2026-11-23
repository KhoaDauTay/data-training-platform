---
id: e-pg-l3-05
engine: postgres
level: L3
module: mvcc
title: "Lab: đọc dấu vết của UPDATE, DELETE, ROLLBACK"
title_en: "Lab: read what UPDATE, DELETE and ROLLBACK leave behind"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-mvcc-timeline
objectives:
  - vi: Thấy UPDATE để lại bản cũ có `xmax` trỏ sang bản mới
    en: See an UPDATE leave the old version with an `xmax` pointing to the new one
  - vi: Phân biệt tuple bị xóa, tuple của transaction bị hủy và `xmax` chỉ giữ row lock
    en: Tell a deleted tuple, an aborted transaction's tuple and a lock-only `xmax` apart
requires: [e-pg-l3-04, e-pg-l3-02]
sources:
  - https://www.postgresql.org/docs/18/storage-page-layout.html
  - https://www.postgresql.org/docs/18/ddl-system-columns.html
  - https://www.postgresql.org/docs/18/pageinspect.html
  - https://www.postgresql.org/docs/18/mvcc-intro.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE TABLE acct(id int, owner text);
    INSERT INTO acct VALUES (1, 'an'), (2, 'binh'), (3, 'chi');
    UPDATE acct SET owner = 'binh moi' WHERE id = 2;
    DELETE FROM acct WHERE id = 1;
    BEGIN;
    INSERT INTO acct VALUES (4, 'dung');
    ROLLBACK;
    BEGIN;
    SELECT * FROM acct WHERE id = 3 FOR UPDATE;
    COMMIT;
  steps:
    - task:
        vi: "Lab đã: sửa chủ tài khoản 2, xóa tài khoản 1, chèn tài khoản 4 rồi ROLLBACK, và giữ row lock trên tài khoản 3 bằng `FOR UPDATE`. Đọc `id`, `owner`, `ctid` và một cột đúng/sai `xmax` khác 0 của các dòng còn thấy, theo `id`."
        en: "The lab has: changed account 2's owner, deleted account 1, inserted account 4 then rolled back, and locked account 3 with `FOR UPDATE`. Read `id`, `owner`, `ctid` and a true/false column for non-zero `xmax` of the visible rows, by `id`."
      solution: SELECT id, owner, ctid, xmax <> '0' AS has_xmax FROM acct ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`xmax` là kiểu `xid`; so với chuỗi `'0'`."
        en: "`xmax` has type `xid`; compare it with the string `'0'`."
      fact:
        vi: "Chỉ còn 2 dòng thấy được. Dòng 2 giờ ở (0,4), không còn ở (0,2). Dòng 3 vẫn ở (0,3) và có `xmax` khác 0 mà vẫn thấy được."
        en: "Only 2 rows are visible. Row 2 now lives at (0,4), no longer at (0,2). Row 3 is still at (0,3) and has a non-zero `xmax`, yet it is visible."
        probe: SELECT id, ctid::text, xmax <> '0' FROM acct ORDER BY id
        expect: [[2, "(0,4)", false], [3, "(0,3)", true]]
    - task:
        vi: "Liệt kê mọi tuple của trang 0 với `lp`, `t_ctid` và một cột đúng/sai `t_xmax` khác 0. Đoán trước khi chạy: trang giữ mấy tuple cho 2 dòng còn thấy được?"
        en: "List every tuple of page 0 with `lp`, `t_ctid` and a true/false column for non-zero `t_xmax`. Guess before you run it: how many tuples does the page keep for the 2 visible rows?"
      solution: SELECT lp, t_ctid, t_xmax <> '0' AS has_xmax FROM heap_page_items(get_raw_page('acct', 0))
      check: rows
      ordered: true
      hint:
        vi: "`heap_page_items(get_raw_page('acct', 0))`."
        en: "`heap_page_items(get_raw_page('acct', 0))`."
      fact:
        vi: "Trang giữ 5 tuple cho 2 dòng thấy được. lp 2 (bản cũ của dòng 2) có `t_ctid` = (0,4), tức là trỏ sang bản mới."
        en: "The page keeps 5 tuples for 2 visible rows. lp 2 (the old version of row 2) has `t_ctid` = (0,4): it points to the new version."
        probe: SELECT lp, t_ctid::text, t_xmax <> '0' FROM heap_page_items(get_raw_page('acct', 0))
        expect: [[1, "(0,1)", true], [2, "(0,4)", true], [3, "(0,3)", true], [4, "(0,4)", false], [5, "(0,5)", false]]
    - task:
        vi: "Với mỗi tuple, lấy `lp` và trạng thái của transaction đã chèn nó (`txid_status`). Hàm này nhận `bigint`, còn `t_xmin` kiểu `xid`: ép qua `text` rồi sang `bigint`."
        en: "For each tuple return `lp` and the status of the transaction that inserted it (`txid_status`). That function takes a `bigint` while `t_xmin` is an `xid`: cast it through `text` to `bigint`."
      solution: SELECT lp, txid_status(t_xmin::text::bigint) AS inserted_by FROM heap_page_items(get_raw_page('acct', 0))
      check: rows
      ordered: true
      hint:
        vi: "`txid_status()` nhận `bigint`; đổi `t_xmin` qua `text` rồi `bigint`."
        en: "`txid_status()` takes a `bigint`; cast `t_xmin` through `text` to `bigint`."
      fact:
        vi: "lp 5 do một transaction `aborted` chèn: ROLLBACK không xóa tuple khỏi trang, nó chỉ làm tuple vô hình. Bốn tuple còn lại do transaction `committed` chèn."
        en: "lp 5 was inserted by an `aborted` transaction: ROLLBACK does not remove the tuple from the page, it only makes it invisible. The other four were inserted by `committed` transactions."
        probe: SELECT lp, txid_status(t_xmin::text::bigint) FROM heap_page_items(get_raw_page('acct', 0))
        expect: [[1, committed], [2, committed], [3, committed], [4, committed], [5, aborted]]
    - task:
        vi: "Với các tuple có `t_xmax` khác 0, lấy `lp` và một cột đúng/sai: `raw_flags` có chứa `HEAP_XMAX_LOCK_ONLY` không. Mảng `raw_flags` do hàm `heap_tuple_infomask_flags(t_infomask, t_infomask2)` trả, đổi các bit thành tên cờ."
        en: "For the tuples with a non-zero `t_xmax`, return `lp` and a true/false column: does `raw_flags` contain `HEAP_XMAX_LOCK_ONLY`. The `raw_flags` array comes from the function `heap_tuple_infomask_flags(t_infomask, t_infomask2)`, which turns the bits into flag names."
      solution: |
        SELECT lp, 'HEAP_XMAX_LOCK_ONLY' = ANY(raw_flags) AS lock_only
        FROM heap_page_items(get_raw_page('acct', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
        WHERE t_xmax <> '0'
      check: rows
      ordered: true
      hint:
        vi: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` đổi bit thành tên cờ."
        en: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` turns bits into flag names."
      fact:
        vi: "Chỉ lp 3 có `HEAP_XMAX_LOCK_ONLY`: `xmax` của nó là row lock của `FOR UPDATE`, không phải xóa. lp 1 (DELETE) và lp 2 (UPDATE) có `xmax` thật."
        en: "Only lp 3 carries `HEAP_XMAX_LOCK_ONLY`: its `xmax` is the `FOR UPDATE` lock, not a delete. lp 1 (DELETE) and lp 2 (UPDATE) have a real `xmax`."
        probe: SELECT lp, 'HEAP_XMAX_LOCK_ONLY' = ANY(raw_flags) FROM heap_page_items(get_raw_page('acct', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2) WHERE t_xmax <> '0'
        expect: [[1, false], [2, false], [3, true]]
    - task:
        vi: "Kiểm tra bằng một cột đúng/sai: `t_xmax` của lp 2 có bằng `t_xmin` của lp 4 không."
        en: "Check with one true/false column: does lp 2's `t_xmax` equal lp 4's `t_xmin`."
      solution: |
        SELECT o.t_xmax = n.t_xmin AS same_tx
        FROM heap_page_items(get_raw_page('acct', 0)) o, heap_page_items(get_raw_page('acct', 0)) n
        WHERE o.lp = 2 AND n.lp = 4
      check: rows
      hint:
        vi: Gọi `heap_page_items()` hai lần, đặt hai bí danh, nối bằng `WHERE`.
        en: Call `heap_page_items()` twice with two aliases and join them in `WHERE`.
      fact:
        vi: "Đúng: cùng một transaction vừa đánh dấu bản cũ (`xmax`) vừa tạo bản mới (`xmin`). Đó là định nghĩa của UPDATE trong MVCC."
        en: "True: one transaction both stamped the old version (`xmax`) and created the new one (`xmin`). That is what an UPDATE is under MVCC."
        probe: SELECT o.t_xmax = n.t_xmin FROM heap_page_items(get_raw_page('acct', 0)) o, heap_page_items(get_raw_page('acct', 0)) n WHERE o.lp = 2 AND n.lp = 4
        expect: [[true]]
quiz:
  - q:
      vi: "Một transaction chèn 1 triệu dòng vào bảng rồi ROLLBACK. Bảng có to ra không?"
      en: "A transaction inserts 1 million rows into a table, then rolls back. Does the table grow?"
    options:
      - { vi: "Không: ROLLBACK xóa sạch những gì transaction đã chèn", en: "No: ROLLBACK wipes out everything the transaction inserted" }
      - { vi: "Có: các tuple vẫn nằm trên trang, vô hình, chờ VACUUM dọn", en: "Yes: the tuples stay on the pages, invisible, until VACUUM removes them" }
      - { vi: "Chỉ to ra nếu bảng có index", en: "Only if the table has an index" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì sau ROLLBACK không ai thấy dòng nào, nhưng ROLLBACK chỉ ghi transaction là `aborted`. Tuple vẫn chiếm chỗ trên trang (lab thấy lp 5 do transaction hủy chèn) cho tới khi VACUUM thu hồi."
      en: "It sounds right because after the ROLLBACK nobody sees any row, but ROLLBACK only records the transaction as `aborted`. The tuples keep their space on the pages (the lab sees lp 5 inserted by an aborted transaction) until VACUUM reclaims it."
  - q:
      vi: "Một dòng có `xmax` khác 0, vậy mà `SELECT` vẫn trả nó. Vì sao?"
      en: "A row has a non-zero `xmax`, yet `SELECT` still returns it. Why?"
    options:
      - { vi: "Không thể: `xmax` khác 0 nghĩa là dòng đã bị xóa", en: "Impossible: a non-zero `xmax` means the row was deleted" }
      - { vi: "`xmax` có thể chỉ là row lock (`FOR UPDATE`), hoặc thuộc một transaction xóa đã bị hủy", en: "`xmax` may be only a row lock (`FOR UPDATE`), or belong to a deleting transaction that was rolled back" }
      - { vi: "`SELECT` đọc từ một bản sao cũ trong bộ nhớ", en: "`SELECT` reads from an old copy in memory" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì DELETE đúng là ghi `xmax`, nhưng `xmax` còn được ghi khi khóa dòng và vẫn ở lại khi transaction xóa bị hủy. Dòng chỉ vô hình khi `xmax` là một xóa hay sửa thật đã commit; cờ `HEAP_XMAX_LOCK_ONLY` và `txid_status` cho bạn phân biệt."
      en: "It sounds right because DELETE does stamp `xmax`, but `xmax` is also stamped when a row is locked, and it stays when the deleting transaction rolls back. A row is invisible only when `xmax` is a real committed delete or update; the `HEAP_XMAX_LOCK_ONLY` flag and `txid_status` tell them apart."
---
## Mở bài

Bảng `acct` chỉ còn hai dòng thấy được, nhưng trang của nó giữ năm tuple. Mỗi tuple thừa kể lại một chuyện: một UPDATE, một DELETE, một ROLLBACK hay một row lock.

## Ý chính

Mỗi tuple mang `xmin` (transaction đã chèn nó) và `xmax` (transaction đã xóa, thay hoặc khóa nó). Mỗi thao tác để lại dấu riêng trên trang:

- UPDATE: bản cũ có `xmax` và `t_ctid` trỏ sang bản mới; `xmax` của bản cũ bằng `xmin` của bản mới;
- DELETE: chỉ ghi `xmax`, tuple vẫn nằm đó;
- ROLLBACK: tuple đã chèn vẫn nằm đó, nhưng transaction chèn nó có trạng thái `aborted`;
- `SELECT ... FOR UPDATE`: ghi `xmax` kèm cờ `HEAP_XMAX_LOCK_ONLY`, dòng vẫn sống.

Nhiều người nghĩ `xmax` khác 0 nghĩa là dòng đã chết. Thật ra phải hỏi thêm hai câu: transaction trong `xmax` đã commit chưa, và nó xóa thật hay chỉ khóa. `txid_status()` trả `committed`, `aborted` hoặc `in progress` cho một số transaction; `heap_tuple_infomask_flags()` đổi các bit `t_infomask` thành tên cờ để đọc.

Số `xmin`/`xmax` thật đổi theo máy, nên lab chỉ chấm các so sánh (khác 0, bằng nhau, trạng thái), không chấm con số.

## Cú pháp

```sql
SELECT lp, t_xmin, t_xmax, t_ctid, t_infomask, t_infomask2
FROM heap_page_items(get_raw_page('table_name', block_number));
SELECT txid_status(xid_value::text::bigint);
SELECT raw_flags FROM heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

- `txid_status`: nhận `bigint`, nên đổi `xid` qua `text` trước.
- `raw_flags`: mảng tên cờ; kiểm một cờ bằng `'HEAP_XMAX_LOCK_ONLY' = ANY(raw_flags)`.
- `xmax <> '0'`: so `xid` với chuỗi `'0'` để biết có ai ghi `xmax` chưa.

## Ví dụ

Một bảng nhỏ riêng để thử, chèn trong một transaction:

```sql
CREATE TABLE box (id int PRIMARY KEY, label text);
INSERT INTO box VALUES (1, 'pen'), (2, 'ink');
SELECT id, label, ctid, xmin, xmax FROM box ORDER BY id;
```

Hai dòng có chung `xmin`, `xmax` = 0.

Xóa dòng 1 rồi đổi ý:

```sql
BEGIN;
DELETE FROM box WHERE id = 1;
ROLLBACK;
SELECT id, label, xmax <> '0' AS has_xmax,
       txid_status(xmax::text::bigint) AS deleter
FROM box ORDER BY id;
```

Dòng 1 vẫn thấy được nhưng mang `xmax` của transaction xóa, có trạng thái `aborted`. Dòng 2 không có `xmax`, nên `deleter` là `NULL`.

```sql
SELECT lp, t_ctid, t_xmax <> '0' AS has_xmax
FROM heap_page_items(get_raw_page('box', 0));
```

Trang của `box` vẫn chỉ có 2 tuple: DELETE bị hủy không chép dòng ra đâu cả, nó chỉ để lại `xmax`.

## Lỗi hay gặp

Truyền `xid` thẳng vào `txid_status`:

```sql
-- ERROR 42883: function txid_status(xid) does not exist
SELECT lp, txid_status(t_xmin) FROM heap_page_items(get_raw_page('acct', 0));
```

Hàm nhận `bigint`. Viết `txid_status(t_xmin::text::bigint)`.

Đếm dòng sống bằng `xmax = 0`:

```sql
-- WRONG: a row lock also sets xmax, so a live row is left out
SELECT count(*) AS live FROM acct WHERE xmax = '0';
```

```sql
-- FIX: let the snapshot decide what is visible
SELECT count(*) AS live FROM acct;
```

Câu sai ra 1 vì tài khoản 3 đang mang `xmax` của row lock; câu đúng ra 2.

So lớn nhỏ hai số transaction:

```sql
-- ERROR 42883: operator does not exist: xid < xid
SELECT id FROM acct WHERE xmin < xmax;
```

`xid` quay vòng nên không có phép so lớn nhỏ; chỉ so bằng nhau, hoặc dùng `age()`.

## Thực hành

Bảng `acct` đã qua bốn thao tác: sửa tài khoản 2, xóa tài khoản 1, chèn tài khoản 4 rồi ROLLBACK, khóa tài khoản 3 bằng `FOR UPDATE`. Năm bước đọc dấu vết của từng thao tác trên trang 0, sau đó là hai câu hỏi.

## Tóm tắt

- UPDATE để lại bản cũ có `xmax` bằng `xmin` của bản mới và `t_ctid` trỏ sang nó.
- DELETE chỉ ghi `xmax`; ROLLBACK để lại tuple của transaction `aborted`.
- `xmax` khác 0 chưa chắc là dòng chết: có thể là row lock hoặc xóa đã bị hủy.
- Đọc trạng thái bằng `txid_status()` và cờ bằng `heap_tuple_infomask_flags()`.

# EN

## Opening

Table `acct` has only two visible rows, yet its page holds five tuples. Each extra tuple tells a story: an UPDATE, a DELETE, a ROLLBACK or a row lock.

## Key idea

Each tuple carries `xmin` (the transaction that inserted it) and `xmax` (the transaction that deleted, replaced or locked it). Each operation leaves its own mark on the page:

- UPDATE: the old version has `xmax` and a `t_ctid` pointing to the new one; the old version's `xmax` equals the new version's `xmin`;
- DELETE: only stamps `xmax`, the tuple stays;
- ROLLBACK: the inserted tuple stays, but the transaction that inserted it has status `aborted`;
- `SELECT ... FOR UPDATE`: stamps `xmax` with the `HEAP_XMAX_LOCK_ONLY` flag, the row stays alive.

Many people think a non-zero `xmax` means the row is dead. In fact you have to ask two more questions: did the transaction in `xmax` commit, and did it really delete or only lock. `txid_status()` returns `committed`, `aborted` or `in progress` for a transaction number; `heap_tuple_infomask_flags()` turns the `t_infomask` bits into readable flag names.

Real `xmin`/`xmax` numbers differ from machine to machine, so the lab grades comparisons (non-zero, equal, status), never the numbers.

## Syntax

```sql
SELECT lp, t_xmin, t_xmax, t_ctid, t_infomask, t_infomask2
FROM heap_page_items(get_raw_page('table_name', block_number));
SELECT txid_status(xid_value::text::bigint);
SELECT raw_flags FROM heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

- `txid_status`: takes a `bigint`, so cast the `xid` through `text` first.
- `raw_flags`: an array of flag names; test one flag with `'HEAP_XMAX_LOCK_ONLY' = ANY(raw_flags)`.
- `xmax <> '0'`: compare the `xid` with the string `'0'` to see whether anyone stamped `xmax`.

## Example

A small table of your own to experiment with, inserted by one transaction:

```sql
CREATE TABLE box (id int PRIMARY KEY, label text);
INSERT INTO box VALUES (1, 'pen'), (2, 'ink');
SELECT id, label, ctid, xmin, xmax FROM box ORDER BY id;
```

Both rows share one `xmin`, with `xmax` = 0.

Delete row 1, then change your mind:

```sql
BEGIN;
DELETE FROM box WHERE id = 1;
ROLLBACK;
SELECT id, label, xmax <> '0' AS has_xmax,
       txid_status(xmax::text::bigint) AS deleter
FROM box ORDER BY id;
```

Row 1 is still visible but carries the deleting transaction's `xmax`, with status `aborted`. Row 2 has no `xmax`, so `deleter` is `NULL`.

```sql
SELECT lp, t_ctid, t_xmax <> '0' AS has_xmax
FROM heap_page_items(get_raw_page('box', 0));
```

The page of `box` still holds only 2 tuples: a rolled-back DELETE copies nothing anywhere, it only leaves an `xmax` behind.

## Common mistakes

Passing an `xid` straight to `txid_status`:

```sql
-- ERROR 42883: function txid_status(xid) does not exist
SELECT lp, txid_status(t_xmin) FROM heap_page_items(get_raw_page('acct', 0));
```

The function takes a `bigint`. Write `txid_status(t_xmin::text::bigint)`.

Counting live rows with `xmax = 0`:

```sql
-- WRONG: a row lock also sets xmax, so a live row is left out
SELECT count(*) AS live FROM acct WHERE xmax = '0';
```

```sql
-- FIX: let the snapshot decide what is visible
SELECT count(*) AS live FROM acct;
```

The wrong query returns 1 because account 3 carries the `xmax` of a row lock; the right one returns 2.

Comparing two transaction numbers for larger or smaller:

```sql
-- ERROR 42883: operator does not exist: xid < xid
SELECT id FROM acct WHERE xmin < xmax;
```

`xid` wraps around, so it has no larger/smaller comparison; compare for equality only, or use `age()`.

## Practice

Table `acct` went through four operations: account 2 updated, account 1 deleted, account 4 inserted then rolled back, account 3 locked with `FOR UPDATE`. Five steps read the trace of each operation on page 0, then two questions.

## Recap

- UPDATE leaves the old version with an `xmax` equal to the new version's `xmin` and a `t_ctid` pointing to it.
- DELETE only stamps `xmax`; ROLLBACK leaves the tuples of an `aborted` transaction behind.
- A non-zero `xmax` does not prove the row is dead: it can be a row lock or a rolled-back delete.
- Read the status with `txid_status()` and the flags with `heap_tuple_infomask_flags()`.
