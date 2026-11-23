---
id: e-pg-l3-06
engine: postgres
level: L3
module: vacuum-hot
title: HOT, prune và VACUUM
title_en: HOT, pruning and VACUUM
kind: concept
runtime: docs
docs_why: next
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-hot-chain
objectives:
  - vi: Nêu hai điều kiện của một HOT update
    en: State the two conditions for a HOT update
  - vi: Kể bốn việc VACUUM làm
    en: List the four jobs of VACUUM
  - vi: Đọc tỉ lệ HOT trong `pg_stat_user_tables` và nhận ra index làm mất HOT
    en: Read the HOT ratio in `pg_stat_user_tables` and spot an index that kills HOT
requires: [e-pg-l3-04]
sources:
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/storage-vm.html
  - https://www.postgresql.org/docs/18/storage-fsm.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
quiz:
  - q:
      vi: "Bảng `orders` có index trên `id` và `updated_at`. Câu nào sau đây không bao giờ được HOT?"
      en: "Table `orders` has indexes on `id` and `updated_at`. Which statement can never be a HOT update?"
    options:
      - { vi: "`UPDATE orders SET note = 'x' WHERE id = 1`", en: "`UPDATE orders SET note = 'x' WHERE id = 1`" }
      - { vi: "`UPDATE orders SET updated_at = now() WHERE id = 1`", en: "`UPDATE orders SET updated_at = now() WHERE id = 1`" }
      - { vi: "Cả hai đều có thể HOT nếu trang còn chỗ", en: "Both can be HOT if the page has room" }
    answer: 1
    trap: 2
    why:
      vi: "\"Cả hai đều HOT nếu trang còn chỗ\" nghe hợp lý vì chỗ trống là điều kiện người ta hay nhớ nhất, nhưng đó mới là một nửa. HOT cần cả hai: không đổi cột nào mà index dùng (trừ BRIN), và trang còn chỗ. Câu thứ hai đổi `updated_at`, một cột có index, nên luôn phải chèn mục mới vào mọi index."
      en: "\"Both can be HOT if the page has room\" sounds right because free space is the condition people remember best, but it is only half. HOT needs both: no column used by an index changes (BRIN aside), and the page has room. The second statement changes `updated_at`, an indexed column, so it always inserts new entries into every index."
  - q:
      vi: "Việc nào không phải là một trong bốn lý do chạy VACUUM theo docs chính thức?"
      en: "Which of these is not one of the four reasons to VACUUM listed in the docs?"
    options:
      - { vi: "Thu hồi chỗ của dead tuple", en: "Recover the space of dead rows" }
      - { vi: "Cập nhật visibility map cho index-only scan", en: "Update the visibility map for index-only scans" }
      - { vi: "Sắp lại dòng theo khóa chính", en: "Reorder rows by primary key" }
      - { vi: "Chống mất dữ liệu do XID wraparound", en: "Protect against data loss from XID wraparound" }
    answer: 2
    trap: 1
    why:
      vi: "Nghe hợp lý khi nghĩ visibility map là việc riêng của index, nhưng chính VACUUM bật bit all-visible cho từng trang, và index-only scan dựa vào bit đó. Bốn lý do trong docs là: thu hồi chỗ, cập nhật thống kê cho planner, cập nhật visibility map, chống wraparound. VACUUM không sắp xếp lại dòng (đó là `CLUSTER`)."
      en: "It sounds right if you think the visibility map belongs to the indexes, but it is VACUUM that sets each page's all-visible bit, and index-only scans rely on that bit. The four reasons in the docs are: recover space, update planner statistics, update the visibility map, protect against wraparound. VACUUM never reorders rows (that is `CLUSTER`)."
  - q:
      vi: "Bảng `orders` (index trên `id` và `updated_at`) nhận rất nhiều câu `UPDATE orders SET note = 'x' WHERE id = 1`, và các UPDATE này đang HOT. Một đồng nghiệp đề xuất thêm index trên `note` cho nhanh. Điều gì xảy ra với các UPDATE đó?"
      en: "Table `orders` (indexes on `id` and `updated_at`) takes a lot of `UPDATE orders SET note = 'x' WHERE id = 1` statements, and these UPDATEs are HOT. A colleague suggests an index on `note` to make things faster. What happens to those UPDATEs?"
    options:
      - { vi: "Nhanh hơn: index giúp Postgres tìm dòng cần sửa", en: "Faster: the index helps Postgres find the row to change" }
      - { vi: "Không đổi: index chỉ ảnh hưởng câu đọc", en: "No change: an index only affects reads" }
      - { vi: "Chậm hơn: `note` giờ có index nên UPDATE đổi `note` không còn HOT; mỗi lần sửa thêm một mục vào cả ba index", en: "Slower: `note` is now indexed, so an UPDATE that changes `note` is no longer HOT; every change adds an entry to all three indexes" }
    answer: 2
    trap: 0
    why:
      vi: "Nghe hợp lý vì index đúng là làm câu đọc nhanh hơn, nhưng UPDATE này tìm dòng bằng `id`, đã có khóa chính. Index trên cột bị sửa phá điều kiện đầu của HOT: bản mới cần một mục trong mọi index, nên bảng và index cùng phình nhanh hơn. Chỉ thêm index khi có câu đọc cần nó."
      en: "It sounds right because an index does speed up reads, but this UPDATE finds its row by `id`, which already has the primary key. An index on the changed column breaks the first HOT condition: every new version needs an entry in every index, so table and indexes both grow faster. Only add an index when a read needs it."
---
## Mở bài

Hai bảng cùng nhận một nghìn câu UPDATE mỗi phút. Một bảng giữ nguyên kích thước, bảng kia và các index của nó phình ra từng ngày: khác nhau ở đâu?

## Ý chính

Mỗi UPDATE ghi một tuple mới. Nếu bản mới nằm ở chỗ khác, mọi index của bảng cũng phải thêm một mục trỏ tới nó, kể cả index trên cột không đổi. Postgres có một lối tắt cho việc này: HOT (heap-only tuple).

Một UPDATE là HOT khi đủ hai điều kiện:

- không cột nào mà index dùng bị đổi giá trị (index tóm tắt như BRIN không tính);
- trang của bản cũ còn đủ chỗ cho bản mới.

Khi đó bản mới nằm cùng trang, bản cũ trỏ sang nó qua `t_ctid`, tạo thành một chuỗi HOT. Index không có mục mới: nó vẫn trỏ vào line pointer đầu chuỗi, và Postgres đi theo chuỗi trong trang để tới bản sống. Bản cũ mang cờ `HEAP_HOT_UPDATED`, bản mới mang `HEAP_ONLY_TUPLE`.

Nhiều người nghĩ thêm index không bao giờ làm hại, chỉ tốn chút chỗ. Thật ra một index trên cột hay bị sửa phá điều kiện đầu của HOT: mọi UPDATE cột đó phải ghi vào tất cả index, và bảng lẫn index cùng phình nhanh hơn. Điều kiện thứ hai thì chỉnh bằng `fillfactor`: đặt dưới 100 để INSERT chừa chỗ trống trên mỗi trang cho các bản UPDATE sau này.

Dọn dẹp có hai mức. Prune chạy ngay khi một trang gần đầy được đọc hay ghi: nó gỡ các bản chết trong chuỗi HOT, và line pointer đầu chuỗi thành redirect trỏ tới bản sống. VACUUM làm đủ bốn việc: thu hồi chỗ của tuple chết (ghi vào free space map), cập nhật thống kê cho planner, bật bit all-visible trong visibility map, và freeze tuple cũ để chống quay vòng số transaction.

## Cú pháp

```sql
CREATE TABLE table_name ( ... ) [ WITH ( fillfactor = percent ) ];
ALTER TABLE table_name SET ( fillfactor = percent );
VACUUM [ ( { VERBOSE | ANALYZE | FREEZE | FULL } [, ...] ) ] [ table_name ];
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'table_name';
```

- `fillfactor`: phần trăm trang mà INSERT được lấp, từ 10 tới 100; mặc định 100 cho bảng.
- `ALTER TABLE ... SET`: chỉ áp cho các trang ghi sau đó.
- `n_tup_hot_upd`: số UPDATE đã là HOT; chia cho `n_tup_upd` ra tỉ lệ HOT.
- `VACUUM` không có tên bảng thì chạy cho mọi bảng của database.

## Ví dụ

Một bảng ví có index trên `balance`, chừa 10 % mỗi trang:

```sql
CREATE TABLE wallet (id int PRIMARY KEY, balance int, note text) WITH (fillfactor = 90);
CREATE INDEX wallet_balance ON wallet (balance);
INSERT INTO wallet SELECT g, 100, 'new' FROM generate_series(1, 5) g;
SELECT relname, reloptions FROM pg_class WHERE relname = 'wallet';
```

Một UPDATE cột không có index, một UPDATE cột có index, rồi đọc bộ đếm:

```sql
UPDATE wallet SET note = 'vip' WHERE id = 1;
UPDATE wallet SET balance = 200 WHERE id = 2;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

2 UPDATE, 1 HOT. `pg_stat_force_next_flush()` đẩy bộ đếm của phiên ra ngay để đọc được.

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
SELECT lp, t_ctid, 'HEAP_ONLY_TUPLE' = ANY (raw_flags) AS heap_only
FROM heap_page_items(get_raw_page('wallet', 0)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

lp 1 trỏ sang (0,6), và lp 6 là heap-only. lp 2 trỏ sang (0,7) cùng trang, nhưng lp 7 không phải heap-only: cùng trang chưa đủ để là HOT.

```sql
VACUUM wallet;
SELECT lp, lp_flags, lp_off FROM heap_page_items(get_raw_page('wallet', 0));
```

Sau VACUUM, lp 1 có `lp_flags` = 2 (redirect) và `lp_off` = 6: index vẫn trỏ lp 1, lp 1 chuyển tiếp tới lp 6. lp 2 thành 0 (unused), dùng lại được.

## Lỗi hay gặp

Chạy VACUUM trong một transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM wallet;
```

Nhiều công cụ và ORM tự mở transaction. Chạy VACUUM ở chế độ autocommit; sau lỗi này nhớ `ROLLBACK` vì transaction đã hỏng.

Đánh index lên cột hay bị sửa:

```sql
-- WRONG: an index on note makes every note UPDATE non-HOT
ROLLBACK;
CREATE INDEX wallet_note ON wallet (note);
UPDATE wallet SET note = 'gold' WHERE id = 3;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

```sql
-- FIX: drop the index no query needs, and the UPDATE is HOT again
DROP INDEX wallet_note;
UPDATE wallet SET note = 'silver' WHERE id = 4;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

Bản sai thêm một UPDATE mà số HOT vẫn là 1 (3 và 1). Bản sửa lên 4 và 2. Chỉ giữ index khi có câu đọc thật sự cần nó.

Hạ `fillfactor` quá tay:

```sql
-- ERROR 22023: value 5 out of bounds for option "fillfactor"
ALTER TABLE wallet SET (fillfactor = 5);
```

Giới hạn dưới là 10. Thường 70 tới 90 là đủ cho bảng hay UPDATE; thấp hơn nữa làm bảng to và quét chậm.

## Tóm tắt

- HOT cần hai điều kiện: không cột nào có index đổi giá trị, và trang còn chỗ.
- UPDATE HOT không thêm mục index; bản cũ mang `HEAP_HOT_UPDATED`, bản mới `HEAP_ONLY_TUPLE`.
- Index thừa trên cột hay sửa giết HOT; `fillfactor` dưới 100 chừa chỗ cho bản mới.
- Prune dọn chuỗi HOT trong trang; VACUUM thu hồi chỗ, cập nhật thống kê, visibility map và freeze.
- Theo dõi tỉ lệ `n_tup_hot_upd / n_tup_upd` trong `pg_stat_user_tables`.

# EN

## Opening

Two tables each take a thousand UPDATEs a minute. One keeps its size, the other and its indexes grow every day: what is the difference?

## Key idea

Every UPDATE writes a new tuple. If the new version lands somewhere else, every index of the table must also add an entry pointing to it, even an index on an unchanged column. Postgres has a shortcut for this: HOT (heap-only tuple).

An UPDATE is HOT when both conditions hold:

- no column used by an index changes its value (summarizing indexes such as BRIN do not count);
- the old version's page has room for the new one.

Then the new version stays on the same page, and the old one points to it through `t_ctid`, forming a HOT chain. Indexes get no new entry: they keep pointing at the line pointer at the head of the chain, and Postgres follows the chain inside the page to the live version. The old version carries the `HEAP_HOT_UPDATED` flag, the new one `HEAP_ONLY_TUPLE`.

Many people think an extra index never hurts beyond a little space. In fact an index on a frequently changed column breaks the first HOT condition: every UPDATE of that column must write to all indexes, and both the table and the indexes grow faster. The second condition is tuned with `fillfactor`: set it below 100 so INSERTs leave free space on each page for later UPDATE versions.

Cleanup comes at two levels. Pruning runs as soon as a nearly full page is read or written: it removes the dead versions of HOT chains, and the head line pointer becomes a redirect to the live version. VACUUM does all four jobs: recover the space of dead tuples (recorded in the free space map), update planner statistics, set all-visible bits in the visibility map, and freeze old tuples to protect against transaction number wraparound.

## Syntax

```sql
CREATE TABLE table_name ( ... ) [ WITH ( fillfactor = percent ) ];
ALTER TABLE table_name SET ( fillfactor = percent );
VACUUM [ ( { VERBOSE | ANALYZE | FREEZE | FULL } [, ...] ) ] [ table_name ];
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'table_name';
```

- `fillfactor`: the percentage of a page INSERTs may fill, from 10 to 100; the default for tables is 100.
- `ALTER TABLE ... SET`: applies only to pages written afterwards.
- `n_tup_hot_upd`: the number of UPDATEs that were HOT; divide by `n_tup_upd` for the HOT ratio.
- `VACUUM` with no table name runs on every table of the database.

## Example

A wallet table with an index on `balance`, keeping 10% of each page free:

```sql
CREATE TABLE wallet (id int PRIMARY KEY, balance int, note text) WITH (fillfactor = 90);
CREATE INDEX wallet_balance ON wallet (balance);
INSERT INTO wallet SELECT g, 100, 'new' FROM generate_series(1, 5) g;
SELECT relname, reloptions FROM pg_class WHERE relname = 'wallet';
```

One UPDATE of a column with no index, one of an indexed column, then read the counters:

```sql
UPDATE wallet SET note = 'vip' WHERE id = 1;
UPDATE wallet SET balance = 200 WHERE id = 2;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

2 UPDATEs, 1 HOT. `pg_stat_force_next_flush()` pushes the session's counters out at once so they can be read.

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
SELECT lp, t_ctid, 'HEAP_ONLY_TUPLE' = ANY (raw_flags) AS heap_only
FROM heap_page_items(get_raw_page('wallet', 0)),
     heap_tuple_infomask_flags(t_infomask, t_infomask2);
```

lp 1 points to (0,6), and lp 6 is heap-only. lp 2 points to (0,7) on the same page, but lp 7 is not heap-only: the same page is not enough to be HOT.

```sql
VACUUM wallet;
SELECT lp, lp_flags, lp_off FROM heap_page_items(get_raw_page('wallet', 0));
```

After VACUUM, lp 1 has `lp_flags` = 2 (redirect) and `lp_off` = 6: indexes still point at lp 1, which forwards to lp 6. lp 2 became 0 (unused), ready for reuse.

## Common mistakes

Running VACUUM inside a transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM wallet;
```

Many tools and ORMs open a transaction for you. Run VACUUM in autocommit mode; after this error remember `ROLLBACK`, because the transaction is aborted.

Indexing a frequently changed column:

```sql
-- WRONG: an index on note makes every note UPDATE non-HOT
ROLLBACK;
CREATE INDEX wallet_note ON wallet (note);
UPDATE wallet SET note = 'gold' WHERE id = 3;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

```sql
-- FIX: drop the index no query needs, and the UPDATE is HOT again
DROP INDEX wallet_note;
UPDATE wallet SET note = 'silver' WHERE id = 4;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

The wrong version adds an UPDATE while the HOT count stays at 1 (3 and 1). The fix goes to 4 and 2. Keep an index only when a real read needs it.

Lowering `fillfactor` too far:

```sql
-- ERROR 22023: value 5 out of bounds for option "fillfactor"
ALTER TABLE wallet SET (fillfactor = 5);
```

The lower limit is 10. For an update-heavy table 70 to 90 is usually enough; lower makes the table big and scans slow.

## Recap

- HOT needs two conditions: no indexed column changes value, and the page has room.
- A HOT update adds no index entry; the old version carries `HEAP_HOT_UPDATED`, the new one `HEAP_ONLY_TUPLE`.
- A needless index on a frequently changed column kills HOT; a `fillfactor` under 100 keeps room for new versions.
- Pruning cleans HOT chains inside the page; VACUUM recovers space, updates statistics and the visibility map, and freezes.
- Watch the ratio `n_tup_hot_upd / n_tup_upd` in `pg_stat_user_tables`.
