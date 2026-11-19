---
id: e-pg-l3-10
engine: postgres
level: L3
module: vacuum-hot
title: "Lab: freeze một trang"
title_en: "Lab: freeze a page"
kind: lab
minutes: 15
viz: vacuum-flow
objectives:
  - vi: Thấy cờ `HEAP_XMIN_FROZEN` sau `VACUUM (FREEZE)` trong khi `xmin` vẫn giữ nguyên
    en: See the `HEAP_XMIN_FROZEN` flag after `VACUUM (FREEZE)` while `xmin` stays the same
  - vi: Đọc `age(relfrozenxid)` và bit all-frozen của visibility map
    en: Read `age(relfrozenxid)` and the visibility map's all-frozen bit
requires: [e-pg-l3-09]
sources:
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/sql-vacuum.html
  - https://www.postgresql.org/docs/18/pgvisibility.html
  - https://www.postgresql.org/docs/18/pageinspect.html
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
        vi: "Ba bảng giống nhau: `ledger_plain` qua VACUUM thường, `ledger_frozen` qua `VACUUM (FREEZE)`, `ledger_touched` qua `VACUUM (FREEZE)` rồi bị sửa một dòng. Với mỗi tuple của trang 0 bảng `ledger_plain`, lấy `lp` và một cột đúng/sai: `combined_flags` có `HEAP_XMIN_FROZEN` không."
        en: "Three identical tables: `ledger_plain` had a normal VACUUM, `ledger_frozen` had `VACUUM (FREEZE)`, `ledger_touched` had `VACUUM (FREEZE)` and then one row updated. For each tuple of page 0 of `ledger_plain` return `lp` and a true/false column: does `combined_flags` contain `HEAP_XMIN_FROZEN`."
      solution: |
        SELECT lp, 'HEAP_XMIN_FROZEN' = ANY(combined_flags) AS frozen
        FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
      check: rows
      ordered: true
      hint:
        vi: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` trả `raw_flags` và `combined_flags`."
        en: "`heap_tuple_infomask_flags(t_infomask, t_infomask2)` returns `raw_flags` and `combined_flags`."
      fact:
        vi: "Không tuple nào frozen: VACUUM thường chỉ freeze tuple già hơn `vacuum_freeze_min_age` (mặc định 50 triệu giao dịch)."
        en: "No tuple is frozen: a normal VACUUM only freezes tuples older than `vacuum_freeze_min_age` (50 million transactions by default)."
        probe: SELECT lp, 'HEAP_XMIN_FROZEN' = ANY(combined_flags) FROM heap_page_items(get_raw_page('ledger_plain', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
        expect: [[1, false], [2, false], [3, false]]
    - task:
        vi: "Làm lại câu trên cho `ledger_frozen`, thêm một cột đúng/sai: `t_xmin` có khác `'2'` (`FrozenTransactionId`) không."
        en: "Repeat the query for `ledger_frozen`, adding a true/false column: is `t_xmin` different from `'2'` (`FrozenTransactionId`)."
      solution: |
        SELECT lp, 'HEAP_XMIN_FROZEN' = ANY(combined_flags) AS frozen, t_xmin <> '2' AS xmin_kept
        FROM heap_page_items(get_raw_page('ledger_frozen', 0)), heap_tuple_infomask_flags(t_infomask, t_infomask2)
      check: rows
      ordered: true
      hint:
        vi: "Đổi tên bảng và thêm `t_xmin <> '2'` vào danh sách cột."
        en: "Change the table name and add `t_xmin <> '2'` to the column list."
      fact:
        vi: "Cả 3 tuple mang `HEAP_XMIN_FROZEN`, và `t_xmin` vẫn là số giao dịch cũ (không phải 2, `FrozenTransactionId`): từ 9.4, freeze chỉ bật cờ và giữ `xmin` để tra cứu."
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
        vi: "`ledger_frozen` có tuổi 0 (vừa freeze, là lệnh cuối). `ledger_touched` tuổi 1, `ledger_plain` tuổi 4: tuple của nó chưa freeze, nên `relfrozenxid` không thể vượt `xmin` của chúng (giao dịch INSERT). Autovacuum so con số này với `autovacuum_freeze_max_age` (mặc định 200 triệu)."
        en: "`ledger_frozen` has age 0 (just frozen, the last command). `ledger_touched` has age 1, `ledger_plain` age 4: its tuples are not frozen, so `relfrozenxid` cannot move past their `xmin` (the INSERT transaction). Autovacuum compares this number with `autovacuum_freeze_max_age` (200 million by default)."
        probe: SELECT relname, age(relfrozenxid), relfrozenxid::text = (SELECT t_xmin::text FROM heap_page_items(get_raw_page('ledger_plain', 0)) WHERE lp = 1) FROM pg_class WHERE relname LIKE 'ledger%' ORDER BY relname
        expect: [[ledger_frozen, 0, false], [ledger_plain, 4, true], [ledger_touched, 1, false]]
---

## Ý chính

XID chỉ 32 bit nên nó quay vòng. Để tuple cũ không bỗng "ở tương lai", VACUUM **freeze** chúng: bật cờ nói "tuple này thấy được với mọi giao dịch, bất kể `xmin`". Trang có mọi tuple đã freeze được đánh dấu **all-frozen** trong visibility map, nên các lần VACUUM chống wraparound sau có thể bỏ qua nó.

## Ví dụ

```sql
SELECT relname, age(relfrozenxid) FROM pg_class WHERE relname LIKE 'ledger%' ORDER BY relname;
```

`age(relfrozenxid)` là số giao dịch đã trôi qua kể từ mốc freeze của bảng. Đây là con số phải theo dõi trên máy chủ thật.

## Thực hành

Bốn bước trên ba bảng ở ba trạng thái. Sau lab này bạn đọc được tuổi `relfrozenxid` của bảng và hiểu vì sao một bảng lớn ít đổi vẫn bị autovacuum "aggressive" ghé thăm.

# EN

## Key idea

XIDs are only 32 bits, so they wrap around. To keep old tuples from suddenly looking "in the future", VACUUM **freezes** them: it sets a flag that says "this tuple is visible to every transaction, whatever its `xmin`". A page whose tuples are all frozen is marked **all-frozen** in the visibility map, so later anti-wraparound vacuums can skip it.

## Example

```sql
SELECT relname, age(relfrozenxid) FROM pg_class WHERE relname LIKE 'ledger%' ORDER BY relname;
```

`age(relfrozenxid)` is the number of transactions since the table's freeze horizon. This is the number to watch on a real server.

## Practice

Four steps on three tables in three states. After this lab you can read a table's `relfrozenxid` age and understand why a large, rarely changed table still gets an "aggressive" autovacuum visit.
