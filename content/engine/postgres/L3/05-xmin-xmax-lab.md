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
viz: pg-mvcc
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
        vi: "Với mỗi tuple, lấy `lp` và trạng thái của transaction đã chèn nó (`txid_status`)."
        en: "For each tuple return `lp` and the status of the transaction that inserted it (`txid_status`)."
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
        vi: "Với các tuple có `t_xmax` khác 0, lấy `lp` và một cột đúng/sai: `raw_flags` có chứa `HEAP_XMAX_LOCK_ONLY` không."
        en: "For the tuples with a non-zero `t_xmax`, return `lp` and a true/false column: does `raw_flags` contain `HEAP_XMAX_LOCK_ONLY`."
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
---

## Ý chính

Mỗi tuple mang `xmin` (transaction đã chèn nó) và `xmax` (transaction đã xóa, thay nó hoặc giữ row lock trên nó). Mỗi thao tác để lại dấu khác nhau trên trang:

- UPDATE: bản cũ có `xmax` và `t_ctid` trỏ sang bản mới;
- DELETE: chỉ ghi `xmax`;
- ROLLBACK: tuple vẫn nằm đó, nhưng transaction chèn nó là `aborted`;
- `FOR UPDATE`: ghi `xmax` kèm cờ `HEAP_XMAX_LOCK_ONLY`, dòng vẫn sống.

## Ví dụ

```sql
SELECT lp, t_ctid, t_xmax <> '0' AS has_xmax
FROM heap_page_items(get_raw_page('acct', 0));
```

Số `xmin/xmax` thật đổi theo máy, nên lab chỉ chấm các so sánh (khác 0, bằng nhau, trạng thái) chứ không chấm số.

## Thực hành

Năm bước trên một bảng 3 dòng đã qua bốn thao tác. Sau lab này bạn giải thích được vì sao bảng hay UPDATE/DELETE phình ra dù số dòng không đổi, và vì sao một transaction lớn bị ROLLBACK vẫn để lại rác cho VACUUM.

# EN

## Key idea

Each tuple carries `xmin` (the transaction that inserted it) and `xmax` (the transaction that deleted, replaced or locked it). Each operation leaves a different mark on the page:

- UPDATE: the old version has `xmax` and a `t_ctid` pointing to the new one;
- DELETE: only stamps `xmax`;
- ROLLBACK: the tuple stays, but the transaction that inserted it is `aborted`;
- `FOR UPDATE`: stamps `xmax` with the `HEAP_XMAX_LOCK_ONLY` flag, the row stays alive.

## Example

```sql
SELECT lp, t_ctid, t_xmax <> '0' AS has_xmax
FROM heap_page_items(get_raw_page('acct', 0));
```

Real `xmin/xmax` numbers differ from machine to machine, so the lab grades comparisons (non-zero, equal, status), never the numbers.

## Practice

Five steps on a 3-row table that went through four operations. After this lab you can explain why a table with many UPDATEs/DELETEs grows while its row count stays flat, and why a large transaction that rolls back still leaves garbage for VACUUM.
