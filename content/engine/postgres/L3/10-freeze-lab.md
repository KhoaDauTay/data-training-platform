---
id: e-pg-l3-10
engine: postgres
level: L3
module: vacuum-hot
title: "Lab: freeze một trang"
title_en: "Lab: freeze a page"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-vacuum-flow
objectives:
  - vi: Thấy cờ `HEAP_XMIN_FROZEN` sau `VACUUM (FREEZE)` trong khi `xmin` vẫn giữ nguyên
    en: See the `HEAP_XMIN_FROZEN` flag after `VACUUM (FREEZE)` while `xmin` stays the same
  - vi: Đọc `age(relfrozenxid)` và bit all-frozen của visibility map
    en: Read `age(relfrozenxid)` and the visibility map's all-frozen bit
requires: [e-pg-l3-09]
sources:
  - { url: https://www.postgresql.org/docs/18/routine-vacuuming.html, title_vi: "VACUUM định kỳ" }
  - { url: https://www.postgresql.org/docs/18/sql-vacuum.html, title_vi: "VACUUM" }
  - { url: https://www.postgresql.org/docs/18/pgvisibility.html, title_vi: "pg_visibility" }
  - { url: https://www.postgresql.org/docs/18/pageinspect.html, title_vi: "pageinspect" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE EXTENSION IF NOT EXISTS pg_visibility;
    CREATE TABLE ledger_plain(id int, amount int);
    CREATE TABLE ledger_touched(id int, amount int);
    CREATE TABLE ledger_frozen(id int, amount int);
    INSERT INTO ledger_plain VALUES (1, 10), (2, 20), (3, 30);
    INSERT INTO ledger_touched VALUES (1, 10), (2, 20), (3, 30);
    INSERT INTO ledger_frozen VALUES (1, 10), (2, 20), (3, 30);
    VACUUM ledger_plain;
    VACUUM (FREEZE) ledger_touched;
    UPDATE ledger_touched SET amount = 11 WHERE id = 1;
    VACUUM (FREEZE) ledger_frozen;
  steps:
    - task:
        vi: "Ba bảng giống nhau: `ledger_plain` qua VACUUM thường, `ledger_frozen` qua `VACUUM (FREEZE)`, `ledger_touched` qua `VACUUM (FREEZE)` rồi bị sửa một dòng. Với mỗi tuple của trang 0 bảng `ledger_plain`, lấy `lp` và một cột đúng/sai: `combined_flags` có `HEAP_XMIN_FROZEN` không. `heap_tuple_infomask_flags(t_infomask, t_infomask2)` trả hai mảng: `raw_flags` (từng bit) và `combined_flags` (cờ ghép từ nhiều bit, như `HEAP_XMIN_FROZEN` = hai bit COMMITTED và INVALID cùng bật)."
        en: "Three identical tables: `ledger_plain` had a normal VACUUM, `ledger_frozen` had `VACUUM (FREEZE)`, `ledger_touched` had `VACUUM (FREEZE)` and then one row updated. For each tuple of page 0 of `ledger_plain` return `lp` and a true/false column: does `combined_flags` contain `HEAP_XMIN_FROZEN`. `heap_tuple_infomask_flags(t_infomask, t_infomask2)` returns two arrays: `raw_flags` (one name per bit) and `combined_flags` (flags made of several bits, such as `HEAP_XMIN_FROZEN` = the COMMITTED and INVALID bits both set)."
      solution: |
        SELECT lp, 'HEAP_XMIN_FROZEN' = ANY(combined_flags) AS frozen
        FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
      check: rows
      ordered: true
      hint:
        vi: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` trả `raw_flags` và `combined_flags`."
        en: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` returns `raw_flags` and `combined_flags`."
      fact:
        vi: "Không tuple nào frozen: VACUUM thường chỉ freeze tuple già hơn `vacuum_freeze_min_age` (mặc định 50 triệu transaction)."
        en: "No tuple is frozen: a normal VACUUM only freezes tuples older than `vacuum_freeze_min_age` (50 million transactions by default)."
        probe: SELECT lp, 'HEAP_XMIN_FROZEN' = ANY(combined_flags) FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
        expect: [[1, false], [2, false], [3, false]]
    - task:
        vi: "Làm lại câu trên cho `ledger_frozen`, thêm một cột đúng/sai: `t_xmin` có khác `'2'` (`FrozenTransactionId`) không. Đoán trước khi chạy: freeze có ghi đè `t_xmin` không?"
        en: "Repeat the query for `ledger_frozen`, adding a true/false column: is `t_xmin` different from `'2'` (`FrozenTransactionId`). Guess before you run it: does freezing overwrite `t_xmin`?"
      solution: |
        SELECT lp, 'HEAP_XMIN_FROZEN' = ANY(combined_flags) AS frozen, t_xmin <> '2' AS xmin_kept
        FROM heap_page_items(get_raw_page('ledger_frozen', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
      check: rows
      ordered: true
      hint:
        vi: "Đổi tên bảng và thêm `t_xmin <> '2'` vào danh sách cột."
        en: "Change the table name and add `t_xmin <> '2'` to the column list."
      fact:
        vi: "Cả 3 tuple mang `HEAP_XMIN_FROZEN`, và `t_xmin` vẫn là số transaction cũ (không phải 2, `FrozenTransactionId`): từ 9.4, freeze chỉ bật cờ và giữ `xmin` để tra cứu."
        en: "All 3 tuples carry `HEAP_XMIN_FROZEN`, and `t_xmin` is still the old transaction number (not 2, `FrozenTransactionId`): since 9.4 freezing only sets a flag and keeps `xmin` for forensics."
        probe: SELECT count(*) FILTER (WHERE 'HEAP_XMIN_FROZEN' = ANY(combined_flags)), count(DISTINCT t_xmin::text), bool_and(t_xmin::text <> '2') FROM heap_page_items(get_raw_page('ledger_frozen', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
        expect: [[3, 1, true]]
    - task:
        vi: "Đọc visibility map block 0 của ba bảng: tên bảng, `all_visible`, `all_frozen`, theo tên bảng."
        en: "Read the visibility map of block 0 for the three tables: table name, `all_visible`, `all_frozen`, by table name."
      solution: |
        SELECT t, all_visible, all_frozen
        FROM unnest(ARRAY['ledger_frozen', 'ledger_plain', 'ledger_touched']) AS t, pg_visibility_map(t::regclass, 0)
        ORDER BY t
      check: rows
      ordered: true
      hint:
        vi: "Ba câu `pg_visibility_map(table, 0)` nối bằng `UNION ALL`, hoặc `unnest` một mảng tên bảng."
        en: "Three `pg_visibility_map(table, 0)` calls joined with `UNION ALL`, or `unnest` an array of table names."
      fact:
        vi: "`ledger_frozen`: all-visible và all-frozen. `ledger_plain`: chỉ all-visible. `ledger_touched`: mất cả hai sau một UPDATE, nên VACUUM chống wraparound lần sau phải đọc lại trang này."
        en: "`ledger_frozen`: all-visible and all-frozen. `ledger_plain`: all-visible only. `ledger_touched`: lost both after one UPDATE, so the next anti-wraparound VACUUM must read this page again."
        probe: SELECT t, all_visible, all_frozen FROM unnest(ARRAY['ledger_frozen', 'ledger_plain', 'ledger_touched']) AS t, pg_visibility_map(t::regclass, 0) ORDER BY t
        expect: [[ledger_frozen, true, true], [ledger_plain, true, false], [ledger_touched, false, false]]
    - task:
        vi: "Đọc tên bảng và `age(relfrozenxid)` của ba bảng trong `pg_class`, theo tên bảng."
        en: "Read the table name and `age(relfrozenxid)` of the three tables from `pg_class`, by table name."
      solution: SELECT relname, age(relfrozenxid) FROM pg_class WHERE relname LIKE 'ledger%' ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "Lọc `pg_class` theo `relname`."
        en: "Filter `pg_class` by `relname`."
      fact:
        vi: "`ledger_frozen` có tuổi 0 (vừa freeze, là lệnh cuối). `ledger_touched` tuổi 1, `ledger_plain` tuổi 4: tuple của nó chưa freeze, nên `relfrozenxid` không thể vượt `xmin` của chúng (transaction INSERT). Autovacuum so con số này với `autovacuum_freeze_max_age` (mặc định 200 triệu)."
        en: "`ledger_frozen` has age 0 (just frozen, the last command). `ledger_touched` has age 1, `ledger_plain` age 4: its tuples are not frozen, so `relfrozenxid` cannot move past their `xmin` (the INSERT transaction). Autovacuum compares this number with `autovacuum_freeze_max_age` (200 million by default)."
        probe: SELECT relname, age(relfrozenxid), relfrozenxid::text = (SELECT t_xmin::text FROM heap_page_items(get_raw_page('ledger_plain', 0)) WHERE lp = 1) FROM pg_class WHERE relname LIKE 'ledger%' ORDER BY relname
        expect: [[ledger_frozen, 0, false], [ledger_plain, 4, true], [ledger_touched, 1, false]]
quiz:
  - q:
      vi: "Sau `VACUUM (FREEZE)`, cột `t_xmin` của một tuple đã freeze chứa gì?"
      en: "After `VACUUM (FREEZE)`, what does the `t_xmin` of a frozen tuple hold?"
    options:
      - { vi: "Số 2 (`FrozenTransactionId`), thay cho số transaction cũ", en: "The number 2 (`FrozenTransactionId`), replacing the old transaction number" }
      - { vi: "Vẫn là số transaction cũ; tuple chỉ được bật cờ `HEAP_XMIN_FROZEN`", en: "Still the old transaction number; the tuple only gets the `HEAP_XMIN_FROZEN` flag" }
      - { vi: "NULL, vì tuple đã thấy được với mọi transaction", en: "NULL, because the tuple is now visible to every transaction" }
    answer: 1
    trap: 0
    why:
      vi: "Số 2 nghe hợp lý vì Postgres trước 9.4 đúng là ghi đè `xmin` bằng 2, nhưng từ 9.4 freeze chỉ bật hai bit COMMITTED và INVALID cùng lúc, tức cờ `HEAP_XMIN_FROZEN`. `xmin` giữ nguyên để còn tra cứu tuple do transaction nào tạo; bước 2 của lab thấy cả 3 tuple vẫn giữ số cũ. `xmin` cũng không bao giờ là NULL: mọi tuple đều mang số của transaction đã chèn nó. Vì vậy kiểm tra freeze bằng `t_xmin = '2'` luôn ra 0 dòng."
      en: "The number 2 sounds right because Postgres before 9.4 did overwrite `xmin` with 2, but since 9.4 freezing only sets the COMMITTED and INVALID bits together, the `HEAP_XMIN_FROZEN` flag. `xmin` is kept so you can still tell which transaction created the tuple; step 2 of the lab sees all 3 tuples keep the old number. `xmin` is never NULL either: every tuple carries the number of the transaction that inserted it. That is why checking for frozen tuples with `t_xmin = '2'` always finds 0 rows."
  - q:
      vi: "Một bảng lưu trữ 500 GB gần như chỉ đọc, vậy mà log ghi autovacuum chạy trên nó \"to prevent wraparound\". Vì sao?"
      en: "A 500 GB archive table is almost read only, yet the log shows autovacuum running on it \"to prevent wraparound\". Why?"
    options:
      - { vi: "Autovacuum chỉ chạy khi có dead tuple, nên chắc có ai đang sửa bảng", en: "Autovacuum only runs when there are dead tuples, so someone must be changing the table" }
      - { vi: "`age(relfrozenxid)` của bảng đã vượt `autovacuum_freeze_max_age`; tuple chưa freeze vẫn phải freeze dù bảng không đổi", en: "The table's `age(relfrozenxid)` passed `autovacuum_freeze_max_age`; unfrozen tuples must still be frozen even though the table does not change" }
      - { vi: "Bảng bị hỏng và autovacuum đang sửa trang", en: "The table is corrupted and autovacuum is repairing pages" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chắc có ai đang sửa bảng\" nghe hợp lý vì autovacuum thường được kích bởi số dead tuple, nhưng còn lý do thứ hai: tuổi của `relfrozenxid`. XID (số hiệu transaction, 32 bit, quay vòng) tăng theo transaction của cả cơ sở dữ liệu, nên bảng không ai sửa vẫn già đi. Khi tuổi vượt `autovacuum_freeze_max_age` (mặc định 200 triệu), autovacuum phải freeze các tuple còn lại để chúng không bỗng trông như \"ở tương lai\" sau khi XID quay vòng (wraparound). Đây là việc định kỳ, không phải sửa trang hỏng. Một lần `VACUUM (FREEZE)` lúc vắng tải đánh dấu các trang all-frozen, và những lần sau bỏ qua chúng."
      en: "\"Someone must be changing the table\" sounds right because autovacuum is usually triggered by dead tuples, but there is a second reason: the age of `relfrozenxid`. The XID (transaction ID, 32 bits, wrapping round) grows with the whole database's transactions, so a table nobody touches still ages. Once that age passes `autovacuum_freeze_max_age` (200 million by default), autovacuum must freeze the remaining tuples so they do not suddenly look \"in the future\" after the XID wraps round (wraparound). This is routine work, not page repair. One `VACUUM (FREEZE)` at a quiet time marks the pages all-frozen, and later runs skip them."
---
## Mở bài

Một bảng sổ cái được ghi từ năm ngoái và không ai sửa nữa, vậy mà autovacuum vẫn quay lại đọc từng trang của nó. Nó đang làm gì ở đó, và làm sao để lần sau nó bỏ qua?

## Ý chính

XID (số hiệu transaction) chỉ có 32 bit nên quay vòng: đó là wraparound. Để một tuple cũ không bỗng trông như "ở tương lai", VACUUM freeze nó: bật cờ nói "tuple này thấy được với mọi transaction, bất kể `xmin`". Cờ đó là `HEAP_XMIN_FROZEN`, ghép từ hai bit COMMITTED và INVALID cùng bật.

Nhiều người nghĩ freeze là ghi đè `xmin` bằng một số đặc biệt. Thật ra từ PostgreSQL 9.4 freeze chỉ bật cờ; `t_xmin` vẫn giữ số transaction đã tạo tuple, để còn tra cứu.

VACUUM thường chỉ freeze tuple già hơn `vacuum_freeze_min_age` (mặc định 50 triệu transaction). `VACUUM (FREEZE)` đặt ngưỡng đó về 0 và freeze mọi tuple nó thấy được. Trang có mọi tuple đã freeze được đánh dấu all-frozen trong visibility map, nên lần VACUUM chống wraparound sau bỏ qua trang đó. Bất kỳ INSERT, UPDATE hay DELETE nào trên trang cũng xóa cả bit all-visible lẫn all-frozen.

Mỗi bảng có `relfrozenxid`: mốc mà mọi XID cũ hơn trong bảng đã được freeze. `age(relfrozenxid)` là số transaction đã trôi qua kể từ mốc đó. Khi nó vượt `autovacuum_freeze_max_age` (200 triệu), autovacuum ép một lần VACUUM chống wraparound, dù bảng không đổi gì.

## Cú pháp

```sql
VACUUM [ ( FREEZE [, VERBOSE ] [, DISABLE_PAGE_SKIPPING ] ) ] [ table_name [, ...] ];
SELECT relname, age(relfrozenxid) FROM pg_class WHERE relname = 'table_name';
SELECT * FROM heap_tuple_infomask_flags(t_infomask, t_infomask2);
SELECT * FROM pg_visibility_map('table_name' [, block_number ]);
SELECT * FROM pg_visibility_map_summary('table_name');
```

- `FREEZE`: freeze mọi tuple thấy được, như thể `vacuum_freeze_min_age` = 0.
- `DISABLE_PAGE_SKIPPING`: đọc cả trang đã all-visible hay all-frozen; chỉ dùng khi nghi visibility map sai.
- `heap_tuple_infomask_flags`: đổi hai cột bit của `heap_page_items` thành tên cờ (pageinspect).
- `pg_visibility_map`: hai bit all-visible và all-frozen của từng trang (pg_visibility).

## Ví dụ

Tuổi `relfrozenxid` của ba bảng lab:

```sql
SELECT relname, age(relfrozenxid) AS xid_age FROM pg_class WHERE relname LIKE 'ledger%' ORDER BY relname;
```

`ledger_frozen` có tuổi 0 vì nó vừa được freeze; hai bảng còn lại già hơn.

Một bảng riêng để xem cờ trước khi freeze:

```sql
CREATE TABLE ledger_demo(id int PRIMARY KEY, amount int);
INSERT INTO ledger_demo VALUES (1, 10), (2, 20);
SELECT lp, raw_flags, combined_flags
FROM heap_page_items(get_raw_page('ledger_demo', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
ORDER BY lp;
```

Và sau khi freeze:

```sql
VACUUM (FREEZE) ledger_demo;
SELECT lp, t_xmin, raw_flags, combined_flags
FROM heap_page_items(get_raw_page('ledger_demo', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
ORDER BY lp;
```

`combined_flags` giờ có `HEAP_XMIN_FROZEN`, còn `t_xmin` của hai dòng vẫn là số transaction của lệnh INSERT.

Visibility map của cả bảng gộp lại:

```sql
SELECT all_visible, all_frozen FROM pg_visibility_map_summary('ledger_demo');
```

Bảng một trang nên cả hai cột bằng 1: trang đó vừa all-visible vừa all-frozen.

## Lỗi hay gặp

Chạy VACUUM trong một transaction, ví dụ khi công cụ migration bọc mọi lệnh trong `BEGIN`:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM (FREEZE) ledger_plain;
```

VACUUM tự quản lý transaction của nó, nên phải chạy ở ngoài. Gõ `ROLLBACK` để thoát transaction đã hỏng, rồi chạy lại riêng lệnh VACUUM.

Tìm tuple đã freeze bằng `xmin = 2`:

```sql
-- WRONG: since 9.4 freezing keeps xmin
ROLLBACK;
SELECT count(*) AS frozen FROM heap_page_items(get_raw_page('ledger_frozen', 0)) WHERE t_xmin = '2';
```

```sql
-- FIX: read the HEAP_XMIN_FROZEN flag
SELECT count(*) FILTER (WHERE 'HEAP_XMIN_FROZEN' = ANY(combined_flags)) AS frozen
FROM heap_page_items(get_raw_page('ledger_frozen', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

Câu sai ra 0 dù cả 3 tuple đã freeze. Hãy đọc cờ, không đọc `xmin`.

Tin rằng VACUUM thường đã freeze bảng:

```sql
-- WRONG: a plain VACUUM skips young tuples
VACUUM ledger_plain;
SELECT count(*) FILTER (WHERE 'HEAP_XMIN_FROZEN' = ANY(combined_flags)) AS frozen
FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

```sql
-- FIX: ask for FREEZE
VACUUM (FREEZE) ledger_plain;
SELECT count(*) FILTER (WHERE 'HEAP_XMIN_FROZEN' = ANY(combined_flags)) AS frozen
FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

VACUUM thường bỏ qua tuple trẻ hơn `vacuum_freeze_min_age`, nên vẫn 0. Muốn freeze ngay, ví dụ một bảng lưu trữ sắp không đổi nữa, hãy ghi rõ `FREEZE`.

## Thực hành

Bốn bước trên ba bảng giống nhau ở ba trạng thái: `ledger_plain` qua VACUUM thường, `ledger_frozen` qua `VACUUM (FREEZE)`, `ledger_touched` bị sửa một dòng sau khi freeze. Bạn đọc cờ của tuple, visibility map và tuổi `relfrozenxid`; sau đó là hai câu hỏi.

## Tóm tắt

- Freeze bật cờ `HEAP_XMIN_FROZEN` và giữ nguyên `t_xmin`; đừng tìm tuple đã freeze bằng `xmin = 2`.
- VACUUM thường chỉ freeze tuple già hơn `vacuum_freeze_min_age`; `VACUUM (FREEZE)` freeze mọi tuple thấy được.
- Trang mà mọi tuple đã freeze là all-frozen trong visibility map; một UPDATE xóa bit đó.
- `age(relfrozenxid)` vượt `autovacuum_freeze_max_age` thì autovacuum ép VACUUM chống wraparound, kể cả trên bảng chỉ đọc.

# EN

## Opening

A ledger table was written last year and nobody changes it any more, yet autovacuum keeps coming back to read every page of it. What is it doing there, and how do you make it skip the table next time?

## Key idea

An XID (transaction ID) is only 32 bits, so it wraps around. To keep an old tuple from suddenly looking "in the future", VACUUM freezes it: it sets a flag that says "this tuple is visible to every transaction, whatever its `xmin`". That flag is `HEAP_XMIN_FROZEN`, made of the COMMITTED and INVALID bits set together.

Many people think freezing overwrites `xmin` with a special number. In fact since PostgreSQL 9.4 freezing only sets the flag; `t_xmin` keeps the number of the transaction that created the tuple, for forensics.

A normal VACUUM only freezes tuples older than `vacuum_freeze_min_age` (50 million transactions by default). `VACUUM (FREEZE)` sets that threshold to 0 and freezes every tuple it can see. A page whose tuples are all frozen is marked all-frozen in the visibility map, so the next anti-wraparound VACUUM skips it. Any INSERT, UPDATE or DELETE on the page clears both the all-visible and the all-frozen bit.

Every table has a `relfrozenxid`: the horizon below which every XID in the table is frozen. `age(relfrozenxid)` is the number of transactions since that horizon. When it passes `autovacuum_freeze_max_age` (200 million), autovacuum forces an anti-wraparound VACUUM, even if the table never changes.

## Syntax

```sql
VACUUM [ ( FREEZE [, VERBOSE ] [, DISABLE_PAGE_SKIPPING ] ) ] [ table_name [, ...] ];
SELECT relname, age(relfrozenxid) FROM pg_class WHERE relname = 'table_name';
SELECT * FROM heap_tuple_infomask_flags(t_infomask, t_infomask2);
SELECT * FROM pg_visibility_map('table_name' [, block_number ]);
SELECT * FROM pg_visibility_map_summary('table_name');
```

- `FREEZE`: freezes every visible tuple, as if `vacuum_freeze_min_age` = 0.
- `DISABLE_PAGE_SKIPPING`: also reads pages already all-visible or all-frozen; only when you suspect the visibility map is wrong.
- `heap_tuple_infomask_flags`: turns the two bit columns of `heap_page_items` into flag names (pageinspect).
- `pg_visibility_map`: the all-visible and all-frozen bits of each page (pg_visibility).

## Example

The `relfrozenxid` age of the three lab tables:

```sql
SELECT relname, age(relfrozenxid) AS xid_age FROM pg_class WHERE relname LIKE 'ledger%' ORDER BY relname;
```

`ledger_frozen` has age 0 because it was just frozen; the other two are older.

A separate table to see the flags before freezing:

```sql
CREATE TABLE ledger_demo(id int PRIMARY KEY, amount int);
INSERT INTO ledger_demo VALUES (1, 10), (2, 20);
SELECT lp, raw_flags, combined_flags
FROM heap_page_items(get_raw_page('ledger_demo', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
ORDER BY lp;
```

And after freezing:

```sql
VACUUM (FREEZE) ledger_demo;
SELECT lp, t_xmin, raw_flags, combined_flags
FROM heap_page_items(get_raw_page('ledger_demo', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
ORDER BY lp;
```

`combined_flags` now holds `HEAP_XMIN_FROZEN`, while the `t_xmin` of both rows is still the INSERT's transaction number.

The visibility map of the whole table, summed up:

```sql
SELECT all_visible, all_frozen FROM pg_visibility_map_summary('ledger_demo');
```

A one-page table, so both columns are 1: that page is both all-visible and all-frozen.

## Common mistakes

Running VACUUM inside a transaction, for example when a migration tool wraps every command in `BEGIN`:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM (FREEZE) ledger_plain;
```

VACUUM manages its own transactions, so it must run outside one. Type `ROLLBACK` to leave the failed transaction, then run the VACUUM on its own.

Looking for frozen tuples with `xmin = 2`:

```sql
-- WRONG: since 9.4 freezing keeps xmin
ROLLBACK;
SELECT count(*) AS frozen FROM heap_page_items(get_raw_page('ledger_frozen', 0)) WHERE t_xmin = '2';
```

```sql
-- FIX: read the HEAP_XMIN_FROZEN flag
SELECT count(*) FILTER (WHERE 'HEAP_XMIN_FROZEN' = ANY(combined_flags)) AS frozen
FROM heap_page_items(get_raw_page('ledger_frozen', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

The wrong query returns 0 although all 3 tuples are frozen. Read the flag, not `xmin`.

Believing a plain VACUUM has frozen the table:

```sql
-- WRONG: a plain VACUUM skips young tuples
VACUUM ledger_plain;
SELECT count(*) FILTER (WHERE 'HEAP_XMIN_FROZEN' = ANY(combined_flags)) AS frozen
FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

```sql
-- FIX: ask for FREEZE
VACUUM (FREEZE) ledger_plain;
SELECT count(*) FILTER (WHERE 'HEAP_XMIN_FROZEN' = ANY(combined_flags)) AS frozen
FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

A plain VACUUM skips tuples younger than `vacuum_freeze_min_age`, so it is still 0. To freeze now, for example an archive table that will not change any more, say `FREEZE` explicitly.

## Practice

Four steps on three identical tables in three states: `ledger_plain` had a normal VACUUM, `ledger_frozen` had `VACUUM (FREEZE)`, `ledger_touched` had one row updated after freezing. You read the tuple flags, the visibility map and the `relfrozenxid` age; then two questions.

## Recap

- Freezing sets the `HEAP_XMIN_FROZEN` flag and keeps `t_xmin`; do not look for frozen tuples with `xmin = 2`.
- A normal VACUUM only freezes tuples older than `vacuum_freeze_min_age`; `VACUUM (FREEZE)` freezes every visible tuple.
- A page whose tuples are all frozen is all-frozen in the visibility map; one UPDATE clears that bit.
- When `age(relfrozenxid)` passes `autovacuum_freeze_max_age`, autovacuum forces an anti-wraparound VACUUM, even on a read-only table.
