---
id: e-pg-l3-07
engine: postgres
level: L3
module: vacuum-hot
title: "Lab: một UPDATE HOT và một UPDATE không HOT"
title_en: "Lab: a HOT update and a non-HOT update"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-hot-chain
objectives:
  - vi: Nhận ra một UPDATE là HOT qua cờ `HEAP_HOT_UPDATED` và `HEAP_ONLY_TUPLE`
    en: Recognise a HOT update by the flags `HEAP_HOT_UPDATED` and `HEAP_ONLY_TUPLE`
  - vi: Chứng minh UPDATE cột có index thêm mục vào mọi index, còn HOT thì không
    en: Prove that updating an indexed column adds an entry to every index, while HOT adds none
requires: [e-pg-l3-06, e-pg-l3-05]
sources:
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/pageinspect.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE TABLE wallet(id int PRIMARY KEY, balance int, note text);
    CREATE INDEX wallet_balance ON wallet(balance);
    INSERT INTO wallet SELECT g, 100, 'new' FROM generate_series(1, 5) g;
    UPDATE wallet SET note = 'vip' WHERE id = 1;
    UPDATE wallet SET balance = 200 WHERE id = 2;
    SELECT pg_stat_force_next_flush();
  steps:
    - task:
        vi: "Lab đã đổi `note` của ví 1 (cột không có index) và `balance` của ví 2 (có index `wallet_balance`). Với mỗi tuple của trang 0, lấy `lp`, `t_ctid` và hai cột đúng/sai: `raw_flags` có `HEAP_HOT_UPDATED` không, có `HEAP_ONLY_TUPLE` không."
        en: "The lab changed wallet 1's `note` (no index) and wallet 2's `balance` (indexed by `wallet_balance`). For each tuple of page 0 return `lp`, `t_ctid` and two true/false columns: does `raw_flags` contain `HEAP_HOT_UPDATED`, does it contain `HEAP_ONLY_TUPLE`."
      solution: |
        SELECT lp, t_ctid, 'HEAP_HOT_UPDATED' = ANY(raw_flags) AS hot_updated, 'HEAP_ONLY_TUPLE' = ANY(raw_flags) AS heap_only
        FROM heap_page_items(get_raw_page('wallet', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
      check: rows
      ordered: true
      hint:
        vi: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` trả mảng `raw_flags`; dùng `= ANY(...)`."
        en: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` returns the `raw_flags` array; use `= ANY(...)`."
      fact:
        vi: "lp 1 có `HEAP_HOT_UPDATED` và trỏ (0,6); lp 6 có `HEAP_ONLY_TUPLE`. lp 2 trỏ (0,7) nhưng cả lp 2 lẫn lp 7 không có cờ HOT nào, dù cùng trang."
        en: "lp 1 carries `HEAP_HOT_UPDATED` and points to (0,6); lp 6 carries `HEAP_ONLY_TUPLE`. lp 2 points to (0,7) but neither lp 2 nor lp 7 has any HOT flag, although they share the page."
        probe: |
          SELECT lp, t_ctid::text, 'HEAP_HOT_UPDATED' = ANY(raw_flags), 'HEAP_ONLY_TUPLE' = ANY(raw_flags)
          FROM heap_page_items(get_raw_page('wallet', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2) WHERE lp IN (1, 2, 6, 7)
        expect: [[1, "(0,6)", true, false], [2, "(0,7)", false, false], [6, "(0,6)", false, true], [7, "(0,7)", false, false]]
    - task:
        vi: "Đọc trang lá của index khóa chính `wallet_pkey` (block 1) bằng `bt_page_items(index_name, block_number)` của pageinspect: lấy `itemoffset` và `ctid`. Đoán trước khi chạy: khóa chính không đổi, vậy index này có mấy mục cho 5 dòng?"
        en: "Read the leaf page of the primary key index `wallet_pkey` (block 1) with pageinspect's `bt_page_items(index_name, block_number)`: return `itemoffset` and `ctid`. Guess before you run it: no primary key changed, so how many entries does this index hold for 5 rows?"
      solution: SELECT itemoffset, ctid FROM bt_page_items('wallet_pkey', 1)
      check: rows
      ordered: true
      hint:
        vi: "`bt_page_items(index_name, block_number)`."
        en: "`bt_page_items(index_name, block_number)`."
      fact:
        vi: "Index khóa chính có 6 mục cho 5 dòng: ví 2 có hai mục, (0,2) và (0,7), vì UPDATE không HOT chèn vào mọi index, kể cả index của cột không đổi. Ví 1 chỉ có (0,1)."
        en: "The primary key index has 6 entries for 5 rows: wallet 2 has two, (0,2) and (0,7), because a non-HOT update inserts into every index, even one on an unchanged column. Wallet 1 only has (0,1)."
        probe: SELECT string_agg(ctid::text, ' ' ORDER BY itemoffset) FROM bt_page_items('wallet_pkey', 1)
        expect: [["(0,1) (0,2) (0,7) (0,3) (0,4) (0,5)"]]
    - task:
        vi: "Đếm số mục trong trang lá (block 1) của cả hai index: `wallet_pkey` và `wallet_balance`, trong một dòng hai cột."
        en: "Count the entries on the leaf page (block 1) of both indexes, `wallet_pkey` and `wallet_balance`, as one row with two columns."
      solution: SELECT (SELECT count(*) FROM bt_page_items('wallet_pkey', 1)) AS pkey, (SELECT count(*) FROM bt_page_items('wallet_balance', 1)) AS bal
      check: rows
      hint:
        vi: Hai truy vấn con `count(*)` trong cùng `SELECT`.
        en: Two `count(*)` subqueries in one `SELECT`.
      fact:
        vi: "6 và 6: mỗi index có thêm đúng một mục, do UPDATE không HOT. HOT update của ví 1 không thêm mục nào."
        en: "6 and 6: each index gained exactly one entry, from the non-HOT update. Wallet 1's HOT update added none."
        probe: SELECT (SELECT count(*) FROM bt_page_items('wallet_pkey', 1)), (SELECT count(*) FROM bt_page_items('wallet_balance', 1))
        expect: [[6, 6]]
    - task:
        vi: "Lab đã đẩy thống kê. Đọc `n_tup_upd` và `n_tup_hot_upd` của bảng `wallet`."
        en: "The lab has flushed the statistics. Read `n_tup_upd` and `n_tup_hot_upd` for the table `wallet`."
      solution: SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet'
      check: rows
      hint:
        vi: "Hai cột nằm trong `pg_stat_user_tables`."
        en: "Both columns live in `pg_stat_user_tables`."
      fact:
        vi: "2 UPDATE, 1 HOT. Trên máy chủ thật, đây là con số đầu tiên cần xem khi UPDATE chậm và index phình."
        en: "2 updates, 1 HOT. On a real server this is the first number to check when UPDATEs are slow and indexes grow."
        probe: SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet'
        expect: [[2, 1]]
quiz:
  - q:
      vi: "Bảng có 5 index (B-tree). Một UPDATE đổi đúng một cột có index và không HOT. Mỗi index nhận thêm bao nhiêu mục?"
      en: "A table has 5 (B-tree) indexes. One UPDATE changes exactly one indexed column and is not HOT. How many new entries does each index get?"
    options:
      - { vi: "Chỉ index của cột bị đổi nhận 1 mục, bốn index kia không đổi", en: "Only the changed column's index gets 1 entry, the other four stay the same" }
      - { vi: "Mỗi index nhận 1 mục: tổng 5 mục mới", en: "Every index gets 1 entry: 5 new entries in total" }
      - { vi: "Không index nào: index được sửa tại chỗ", en: "None: indexes are updated in place" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chỉ index của cột bị đổi\" nghe hợp lý vì bốn cột kia không đổi, nhưng bản mới là một tuple khác, có `ctid` mới, và mỗi index phải trỏ được tới nó. Không HOT thì không có chuỗi trong trang để đi theo, nên cả 5 index đều nhận 1 mục. Index B-tree cũng không sửa tại chỗ: mục cũ trỏ bản cũ vẫn ở đó. Bước 2 của lab thấy đúng vậy: `wallet_pkey` có thêm mục (0,7) cho ví 2 dù khóa chính không đổi."
      en: "\"Only the changed column's index\" sounds right because the other four columns did not change, but the new version is a different tuple with a new `ctid`, and every index must be able to reach it. Without HOT there is no chain inside the page to follow, so all 5 indexes get 1 entry. A B-tree is not updated in place either: the old entry pointing at the old version stays. Step 2 of the lab shows exactly that: `wallet_pkey` gains an entry (0,7) for wallet 2 although the primary key did not change."
  - q:
      vi: "`balance` có index. Câu `UPDATE wallet SET balance = balance WHERE id = 4` có thể là HOT không?"
      en: "`balance` is indexed. Can `UPDATE wallet SET balance = balance WHERE id = 4` be HOT?"
    options:
      - { vi: "Không: cột có index nằm trong `SET`", en: "No: an indexed column is in the `SET` list" }
      - { vi: "Có, nếu trang còn chỗ: giá trị cột có index không đổi", en: "Yes, if the page has room: the indexed column's value does not change" }
      - { vi: "Không bao giờ: UPDATE nào cũng phải ghi vào khóa chính", en: "Never: every UPDATE must write to the primary key" }
    answer: 1
    trap: 0
    why:
      vi: "\"Cột có index nằm trong `SET`\" nghe hợp lý, nhưng Postgres so giá trị cũ và mới của từng cột có index, không nhìn danh sách `SET`. `balance = balance` giữ nguyên giá trị, nên điều kiện HOT chỉ còn là trang có chỗ. Khóa chính cũng không đổi, nên không index nào cần mục mới. Chạy câu này trên `wallet` của lab, `n_tup_hot_upd` tăng thêm 1."
      en: "\"An indexed column is in `SET`\" sounds right, but Postgres compares the old and new values of each indexed column, not the `SET` list. `balance = balance` keeps the value, so the only HOT condition left is room on the page. The primary key does not change either, so no index needs a new entry. Run this on the lab's `wallet` and `n_tup_hot_upd` goes up by 1."
---
## Mở bài

Hai câu UPDATE trên cùng bảng `wallet`, mỗi câu sửa một dòng, và bản mới của cả hai đều nằm cùng trang. Vậy mà một câu ghi thêm vào mọi index, câu kia không ghi gì: bạn sẽ tự tìm ra vì sao.

## Ý chính

Một UPDATE là HOT khi không cột nào có index đổi giá trị và trang còn chỗ. Khi đó bản cũ mang cờ `HEAP_HOT_UPDATED`, bản mới mang `HEAP_ONLY_TUPLE`, và không index nào có mục mới. UPDATE không HOT thì bản mới được chèn vào mọi index của bảng, kể cả index trên cột không đổi.

Nhiều người nghĩ bản mới nằm cùng trang là đủ để HOT. Thật ra trang chỉ là điều kiện thứ hai: một UPDATE đổi cột có index vẫn không HOT dù bản mới nằm ngay cạnh bản cũ. Muốn biết chắc, đọc cờ trên heap hoặc đếm mục trong index, đừng nhìn `ctid`.

Ba chỗ để kiểm: cờ của tuple qua `heap_tuple_infomask_flags()`, mục của index qua `bt_page_items()`, và bộ đếm `n_tup_upd` / `n_tup_hot_upd` trong `pg_stat_user_tables`. Trên máy chủ thật, bộ đếm là chỗ bạn nhìn đầu tiên; hai chỗ kia giúp hiểu vì sao.

## Cú pháp

```sql
SELECT lp, t_ctid, raw_flags
FROM heap_page_items(get_raw_page('table_name', block_number)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2);
SELECT itemoffset, ctid FROM bt_page_items('index_name', block_number);
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'table_name';
```

- `bt_page_items`: block 0 của B-tree là metapage; với index nhỏ, trang lá đầu tiên là block 1.
- `ctid` trong `bt_page_items`: chỗ trên heap mà mục index trỏ tới.
- `pg_stat_force_next_flush()`: đẩy bộ đếm của phiên ra ngay để đọc.

## Ví dụ

Bảng có những index nào, trên cột nào:

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'wallet' ORDER BY indexname;
```

`wallet_pkey` trên `id`, `wallet_balance` trên `balance`; `note` không có index.

Sửa `note` của ví 3 rồi xem bản mới nằm đâu và index khóa chính có thêm mục không:

```sql
UPDATE wallet SET note = 'gold' WHERE id = 3;
SELECT (SELECT ctid FROM wallet WHERE id = 3) AS new_ctid,
       (SELECT count(*) FROM bt_page_items('wallet_pkey', 1)) AS pkey_entries;
```

Bản mới ở (0,8), nhưng `wallet_pkey` vẫn 6 mục: HOT không đụng tới index.

```sql
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

Giờ có 3 UPDATE, 2 HOT.

## Lỗi hay gặp

Đoán HOT bằng trang của bản mới:

```sql
-- WRONG: both new versions are on page 0, which says nothing about HOT
SELECT id, ctid < '(1,0)' AS on_page_0 FROM wallet WHERE id IN (1, 2) ORDER BY id;
```

```sql
-- FIX: read the HOT flag on the old version
SELECT lp, 'HEAP_HOT_UPDATED' = ANY (raw_flags) AS hot
FROM heap_page_items(get_raw_page('wallet', 0)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2)
WHERE lp IN (1, 2);
```

Câu sai ra đúng cho cả hai ví. Câu đúng chỉ ra đúng cho lp 1: UPDATE của ví 2 đổi `balance`, cột có index.

Đọc block 0 của index:

```sql
-- ERROR 22023: block 0 is a meta page
SELECT itemoffset, ctid FROM bt_page_items('wallet_pkey', 0);
```

Block 0 của B-tree chỉ giữ thông tin chung của cây. Đọc mục từ block 1 trở đi.

## Thực hành

Lab đã sửa `note` của ví 1 (không có index) và `balance` của ví 2 (có index). Bốn bước: cờ trên heap, mục trong index khóa chính, số mục của hai index, rồi bộ đếm. Sau đó là hai câu hỏi.

## Tóm tắt

- HOT: không cột có index nào đổi giá trị, và trang còn chỗ; bản mới cùng trang chưa đủ.
- UPDATE không HOT thêm một mục vào mọi index, kể cả index trên cột không đổi.
- Kiểm bằng cờ `HEAP_HOT_UPDATED` / `HEAP_ONLY_TUPLE`, bằng `bt_page_items()` và bằng `n_tup_hot_upd`.
- Tỉ lệ HOT thấp kèm index phình thường do một index thừa trên cột hay bị sửa.

# EN

## Opening

Two UPDATEs on the same table `wallet`, each changing one row, and both new versions land on the same page. Yet one writes to every index while the other writes nothing: you will find out why yourself.

## Key idea

An UPDATE is HOT when no indexed column changes value and the page has room. Then the old version carries the `HEAP_HOT_UPDATED` flag, the new one `HEAP_ONLY_TUPLE`, and no index gets a new entry. For a non-HOT UPDATE the new version is inserted into every index of the table, even an index on an unchanged column.

Many people think that a new version on the same page is enough to be HOT. In fact the page is only the second condition: an UPDATE that changes an indexed column is still not HOT even when the new version sits right next to the old one. To know for sure, read the flags on the heap or count the entries in the index, do not look at `ctid`.

Three places to check: the tuple flags through `heap_tuple_infomask_flags()`, the index entries through `bt_page_items()`, and the counters `n_tup_upd` / `n_tup_hot_upd` in `pg_stat_user_tables`. On a real server the counters are where you look first; the other two explain why.

## Syntax

```sql
SELECT lp, t_ctid, raw_flags
FROM heap_page_items(get_raw_page('table_name', block_number)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2);
SELECT itemoffset, ctid FROM bt_page_items('index_name', block_number);
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'table_name';
```

- `bt_page_items`: block 0 of a B-tree is the metapage; for a small index the first leaf page is block 1.
- `ctid` in `bt_page_items`: the heap location the index entry points to.
- `pg_stat_force_next_flush()`: pushes the session's counters out at once so they can be read.

## Example

Which indexes the table has, on which columns:

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'wallet' ORDER BY indexname;
```

`wallet_pkey` on `id`, `wallet_balance` on `balance`; `note` has no index.

Change wallet 3's `note`, then see where the new version lives and whether the primary key index gained an entry:

```sql
UPDATE wallet SET note = 'gold' WHERE id = 3;
SELECT (SELECT ctid FROM wallet WHERE id = 3) AS new_ctid,
       (SELECT count(*) FROM bt_page_items('wallet_pkey', 1)) AS pkey_entries;
```

The new version is at (0,8), but `wallet_pkey` still has 6 entries: HOT does not touch the indexes.

```sql
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

Now there are 3 UPDATEs, 2 of them HOT.

## Common mistakes

Guessing HOT from the new version's page:

```sql
-- WRONG: both new versions are on page 0, which says nothing about HOT
SELECT id, ctid < '(1,0)' AS on_page_0 FROM wallet WHERE id IN (1, 2) ORDER BY id;
```

```sql
-- FIX: read the HOT flag on the old version
SELECT lp, 'HEAP_HOT_UPDATED' = ANY (raw_flags) AS hot
FROM heap_page_items(get_raw_page('wallet', 0)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2)
WHERE lp IN (1, 2);
```

The wrong query says true for both wallets. The right one says true only for lp 1: wallet 2's UPDATE changed `balance`, an indexed column.

Reading block 0 of an index:

```sql
-- ERROR 22023: block 0 is a meta page
SELECT itemoffset, ctid FROM bt_page_items('wallet_pkey', 0);
```

Block 0 of a B-tree only holds the tree's general information. Read entries from block 1 on.

## Practice

The lab changed wallet 1's `note` (no index) and wallet 2's `balance` (indexed). Four steps: flags on the heap, entries in the primary key index, the entry counts of both indexes, then the counters. Then two questions.

## Recap

- HOT: no indexed column changes value, and the page has room; a new version on the same page is not enough.
- A non-HOT UPDATE adds an entry to every index, even one on an unchanged column.
- Check with the `HEAP_HOT_UPDATED` / `HEAP_ONLY_TUPLE` flags, with `bt_page_items()` and with `n_tup_hot_upd`.
- A low HOT ratio with growing indexes usually means a needless index on a frequently changed column.
