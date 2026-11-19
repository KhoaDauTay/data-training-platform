---
id: e-pg-l3-07
engine: postgres
level: L3
module: vacuum-hot
title: "Lab: một UPDATE HOT và một UPDATE không HOT"
title_en: "Lab: a HOT update and a non-HOT update"
kind: lab
minutes: 20
viz: hot-chain
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
        vi: "Đọc trang lá của index khóa chính `wallet_pkey` (block 1): lấy `itemoffset` và `ctid`."
        en: "Read the leaf page of the primary key index `wallet_pkey` (block 1): return `itemoffset` and `ctid`."
      solution: SELECT itemoffset, ctid FROM bt_page_items('wallet_pkey', 1)
      check: rows
      ordered: true
      hint:
        vi: "`bt_page_items(index_name, block_number)`."
        en: "`bt_page_items(index_name, block_number)`."
      fact:
        vi: "Index khóa chính có 6 mục cho 5 dòng: ví 2 có hai mục, (0,2) và (0,7), vì UPDATE không HOT chèn vào **mọi** index, kể cả index của cột không đổi. Ví 1 chỉ có (0,1)."
        en: "The primary key index has 6 entries for 5 rows: wallet 2 has two, (0,2) and (0,7), because a non-HOT update inserts into **every** index, even one on an unchanged column. Wallet 1 only has (0,1)."
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
---

## Ý chính

Cùng một bảng, hai UPDATE: một đổi cột không có index (HOT), một đổi cột có index (không HOT). Bản mới của cả hai đều nằm cùng trang, nhưng chỉ HOT mới không phải ghi index.

## Ví dụ

```sql
SELECT lp, t_ctid, raw_flags
FROM heap_page_items(get_raw_page('wallet', 0)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

## Thực hành

Bốn bước: cờ trên heap, mục trong index, rồi bộ đếm. Sau lab này bạn chẩn đoán được "HOT miss": UPDATE chậm và index phình vì một index thừa trên cột hay đổi. Cách chữa thường là bỏ index đó, hoặc chừa chỗ bằng `fillfactor` khi lý do là trang đầy.

# EN

## Key idea

One table, two UPDATEs: one changes a column with no index (HOT), the other changes an indexed column (not HOT). Both new versions land on the same page, but only HOT avoids writing to the indexes.

## Example

```sql
SELECT lp, t_ctid, raw_flags
FROM heap_page_items(get_raw_page('wallet', 0)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

## Practice

Four steps: flags on the heap, entries in the index, then the counters. After this lab you can diagnose a "HOT miss": slow UPDATEs and growing indexes because a needless index sits on a frequently changed column. The usual fix is to drop that index, or to leave room with `fillfactor` when the cause is full pages.
