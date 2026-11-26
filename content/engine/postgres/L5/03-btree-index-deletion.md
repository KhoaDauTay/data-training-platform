---
id: e-pg-l5-03
engine: postgres
level: L5
module: index-internals
title: "B-tree tự dọn: simple và bottom-up deletion"
title_en: "How B-tree indexes clean themselves: simple and bottom-up deletion"
kind: concept
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Phân biệt ba cách dọn mục chết trong B-tree: simple deletion, bottom-up deletion, VACUUM", en: "Tell apart the three ways a B-tree drops dead items: simple deletion, bottom-up deletion and VACUUM" }
  - { vi: "Giải thích \"version churn\": UPDATE không phải HOT tạo bản sao mục trong mọi index, kể cả index có cột không đổi", en: "Explain \"version churn\": a non-HOT UPDATE adds a new entry to every index, even indexes whose columns did not change" }
  - { vi: "Biết vì sao từ PostgreSQL 14 index ít phình hơn dưới tải UPDATE nặng", en: "Know why, since PostgreSQL 14, indexes bloat less under heavy UPDATE load" }
requires: [e-pg-l5-02]
sources:
  - https://www.postgresql.org/docs/18/btree.html
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
viz: pg-btree
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE TABLE sessions (id int PRIMARY KEY, user_id int NOT NULL, last_seen timestamptz NOT NULL);
    CREATE INDEX sessions_user_idx ON sessions (user_id);
    CREATE INDEX sessions_seen_idx ON sessions (last_seen);
    INSERT INTO sessions SELECT g, g % 40, timestamptz '2026-10-01 00:00+00' + g * interval '1 minute' FROM generate_series(1, 100) AS g;
  steps:
    - task:
        vi: "Index `sessions_user_idx` còn nhỏ: một trang lá (khối 1). Đếm số mục trên trang đó bằng `bt_page_items`."
        en: "Index `sessions_user_idx` is still small: one leaf page (block 1). Count the items on that page with `bt_page_items`."
      solution: SELECT count(*) FROM bt_page_items('sessions_user_idx', 1)
      check: rows
      hint:
        vi: "`bt_page_items()` nhận tên index và số khối; đếm số dòng nó trả về."
        en: "`bt_page_items()` takes the index name and the block number; count the rows it returns."
      fact:
        vi: "100 mục, mỗi phiên một mục."
        en: "100 items, one per session."
        probe: SELECT count(*) FROM bt_page_items('sessions_user_idx', 1)
        expect: [[100]]
    - task:
        vi: "Ứng dụng dời `last_seen` của mọi phiên thêm một phút (cột `user_id` không đổi). Viết câu `UPDATE` đó, trả về `id` của các dòng đã sửa (`RETURNING id`)."
        en: "The app moves every session's `last_seen` one minute later (`user_id` does not change). Write that `UPDATE`, returning the `id` of the changed rows (`RETURNING id`)."
      solution: UPDATE sessions SET last_seen = last_seen + interval '1 minute' RETURNING id
      check: rows
      hint:
        vi: "Cộng `interval '1 minute'` vào `last_seen`, không `WHERE`, rồi `RETURNING id`."
        en: "Add `interval '1 minute'` to `last_seen`, no `WHERE`, then `RETURNING id`."
    - task:
        vi: "Đếm lại số mục trên khối 1 của `sessions_user_idx`."
        en: "Count the items on block 1 of `sessions_user_idx` again."
      solution: SELECT count(*) FROM bt_page_items('sessions_user_idx', 1)
      check: rows
      hint:
        vi: "Cùng câu với bước 1."
        en: "The same query as step 1."
      fact:
        vi: "Ra 200 = 100 mục cũ + 100 mục mới. `last_seen` có index, nên UPDATE không thể là HOT (heap-only tuple: bản dòng mới chỉ ghi vào bảng, không thêm mục index). Vì thế mọi index, kể cả index `user_id`, nhận một mục mới cho mỗi phiên bản dòng mới dù `user_id` không đổi: đó là version churn. 100 mục cũ trỏ tới phiên bản chết vẫn nằm đó vì trang chưa đầy: bottom-up deletion chỉ chạy khi trang sắp tách, còn lại phải chờ VACUUM."
        en: "It is 200 = 100 old items + 100 new ones. `last_seen` is indexed, so the UPDATE cannot be HOT (heap-only tuple: the new row version goes only into the table, with no new index item). So every index, the `user_id` one included, gets a new item for each new row version although `user_id` did not change: that is version churn. The 100 old items pointing to dead versions stay because the page is not full: bottom-up deletion only runs when a page is about to split; otherwise they wait for VACUUM."
        probe: SELECT count(*) FROM bt_page_items('sessions_user_idx', 1)
        expect: [[200]]
quiz:
  - q: { vi: "Bảng `sessions` có index trên `user_id` và `last_seen`. Ứng dụng cập nhật `last_seen` liên tục. Index `user_id` nhận gì sau mỗi UPDATE?", en: "Table `sessions` has indexes on `user_id` and `last_seen`. The app updates `last_seen` constantly. What does the `user_id` index get after each UPDATE?" }
    options:
      - { vi: "Không gì, vì `user_id` không đổi", en: "Nothing, because `user_id` did not change" }
      - { vi: "Một mục mới trỏ tới phiên bản dòng mới, vì cột được index `last_seen` đổi nên UPDATE không thể là HOT", en: "A new entry pointing to the new row version, because an indexed column (`last_seen`) changed, so the UPDATE cannot be HOT" }
      - { vi: "Mục cũ bị sửa tại chỗ", en: "The old entry is changed in place" }
    answer: 1
    trap: 0
    why: { vi: "\"Không gì\" nghe hợp lý vì `user_id` không đổi, nhưng UPDATE trong Postgres ghi một phiên bản dòng mới ở chỗ khác trong bảng, và mục index trỏ tới từng phiên bản, không tới cột. Mục cũ cũng không thể sửa tại chỗ, vì các transaction đang chạy có thể vẫn cần phiên bản cũ. Chỉ một UPDATE HOT (heap-only tuple) mới tránh được mục mới, mà HOT bị loại vì `last_seen` có index. Kết quả: index `user_id` nhận một mục mới mỗi lần, mục cũ trỏ tới phiên bản chết. Đó là version churn, thứ bottom-up deletion dọn trước khi lá phải tách.", en: "\"Nothing\" sounds right because `user_id` does not change, but an UPDATE in Postgres writes a new row version elsewhere in the table, and index items point to versions, not columns. The old item cannot be changed in place either, because running transactions may still need the old version. Only a HOT (heap-only tuple) UPDATE avoids a new item, and HOT is ruled out because `last_seen` is indexed. So the `user_id` index gets a new item each time, and the old one points to a dead version. That is version churn, which bottom-up deletion clears before a leaf has to split." }
  - q: { vi: "Điều gì kích hoạt một lượt bottom-up deletion?", en: "What triggers a bottom-up deletion pass?" }
    options:
      - { vi: "Autovacuum vượt ngưỡng số dòng chết của bảng", en: "Autovacuum crossing the table's dead-row threshold" }
      - { vi: "Một lần tách lá sắp xảy ra mà Postgres đoán là do version churn (index không bị UPDATE sửa về mặt logic)", en: "An imminent leaf split that Postgres suspects is caused by version churn (an index not logically changed by the UPDATE)" }
      - { vi: "Lệnh `REINDEX`", en: "A `REINDEX` command" }
    answer: 1
    trap: 0
    why: { vi: "Autovacuum nghe hợp lý vì nó là công cụ dọn dòng chết quen thuộc, nhưng nó dọn cả bảng khi số dòng chết vượt ngưỡng, không nhìn vào một lá cụ thể. `REINDEX` thì dựng lại cả index, không phải một lượt dọn nhỏ. Bottom-up deletion chạy ngay trong lúc chèn một mục vào index: lá sắp đầy và sắp phải tách, Postgres thấy các mục mới đến từ UPDATE không đổi cột của index này (version churn), nên thử xóa các mục trỏ tới phiên bản chết trên chính lá đó. Dọn được đủ chỗ thì không cần tách.", en: "Autovacuum sounds right because it is the familiar cleaner of dead rows, but it cleans the whole table when dead rows pass a threshold, without looking at one leaf. `REINDEX` rebuilds the whole index; it is not a small cleanup pass. Bottom-up deletion runs inside an index insert: the leaf is full and about to split, Postgres sees that the new items come from UPDATEs that did not change this index's columns (version churn), so it tries to delete items pointing to dead versions on that leaf. If that frees enough room, no split is needed." }
---

## Mở bài

Ứng dụng chỉ cập nhật cột `last_seen`, vậy mà index trên `user_id` vẫn phình ra mỗi ngày. Vì sao một index không liên quan lại nhận mục mới, và ai dọn chúng?

## Ý chính

Mỗi UPDATE trong Postgres tạo một phiên bản dòng mới trong heap; phiên bản cũ thành dòng chết khi không còn transaction nào cần nó. Nếu UPDATE không đổi cột nào có index và trang heap còn chỗ, phiên bản mới nằm cùng trang và nối vào chuỗi HOT (heap-only tuple): không index nào nhận mục mới.

Nhiều người nghĩ một index chỉ nhận mục mới khi cột của chính nó đổi. Thật ra index lưu mục theo phiên bản dòng. Chỉ cần một cột có index đổi, hoặc trang heap hết chỗ, UPDATE không còn là HOT và mọi index của bảng đều nhận một mục mới, kể cả index trên cột không đổi. Mục cũ vẫn nằm đó, trỏ tới phiên bản đã chết. Hiện tượng này gọi là version churn.

B-tree có ba cách dọn mục chết. Simple deletion: khi một Index Scan gặp mục trỏ tới tuple đã chết với mọi transaction, nó đặt bit `LP_DEAD` trên mục; lúc lá sắp tách, các mục mang bit này bị xóa trước. Bottom-up deletion (từ PostgreSQL 14): lá sắp tách mà Postgres đoán là do version churn thì nó kiểm heap cho các mục nghi là rác ngay trên lá đó, xóa chúng và thường tránh được việc tách. VACUUM: dọn "từ trên xuống" mọi mục trỏ tới dòng chết, khi bảng vượt ngưỡng của autovacuum.

Lá đã tách thì không bao giờ gộp lại, nên phòng vẫn hơn chữa. Giảm churn từ gốc: đừng index cột đổi liên tục nếu không thật cần, và hạ `fillfactor` của bảng để trang heap còn chỗ cho phiên bản mới. Index đã phình thì `REINDEX INDEX CONCURRENTLY` dựng lại mà không chặn ghi.

## Cú pháp

```sql
CREATE TABLE table_name ( ... ) [ WITH ( fillfactor = 10..100 ) ];
ALTER TABLE table_name SET ( fillfactor = 10..100 );
VACUUM [ ( VERBOSE ) ] table_name;
REINDEX INDEX [ CONCURRENTLY ] index_name;
SELECT itemoffset, ctid, dead FROM bt_page_items('index_name', block_number);
```

- `fillfactor` của bảng: mặc định 100; thấp hơn thì mỗi trang chừa chỗ cho UPDATE kiểu HOT.
- `ALTER TABLE ... SET`: chỉ áp dụng cho trang ghi sau đó, không viết lại trang cũ.
- `VACUUM`: không chạy được trong một transaction block.
- `dead`: true khi mục đã mang bit `LP_DEAD`.

## Ví dụ

Bảng `devices` có index trên `user_id`, chưa có index trên `battery`. Cập nhật `battery`:

```sql
CREATE TABLE devices (id int PRIMARY KEY, user_id int NOT NULL, battery int NOT NULL);
CREATE INDEX devices_user_idx ON devices (user_id);
INSERT INTO devices SELECT g, g % 10, 100 FROM generate_series(1, 40) AS g;
UPDATE devices SET battery = battery - 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('devices_user_idx', 1);
```

Vẫn 40 mục: UPDATE là HOT, index `user_id` không nhận gì.

Thêm index trên `battery` rồi cập nhật lại:

```sql
CREATE INDEX devices_battery_idx ON devices (battery);
UPDATE devices SET battery = battery - 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('devices_user_idx', 1);
```

Giờ là 80: `battery` có index nên UPDATE không còn HOT, và index `user_id` nhận thêm 40 mục dù `user_id` không đổi.

Một Index Scan đánh dấu mục chết nó gặp:

```sql
SET enable_seqscan = off;
SELECT count(*) FROM devices WHERE user_id = 3;
RESET enable_seqscan;
SELECT count(*) FILTER (WHERE dead) AS dead_items, count(*) AS items
FROM bt_page_items('devices_user_idx', 1);
```

Câu tìm `user_id = 3` đi qua 8 mục, 4 mục trỏ tới phiên bản cũ nên được đặt `LP_DEAD`. Khi lá này sắp tách, 4 mục đó bị xóa trước.

## Lỗi hay gặp

Chạy VACUUM bên trong một transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM devices;
```

```sql
ROLLBACK;
VACUUM devices;
SELECT count(*) AS user_idx_items FROM bt_page_items('devices_user_idx', 1);
```

VACUUM tự quản lý transaction của nó. Kết thúc transaction đang mở bằng `ROLLBACK` rồi chạy riêng; sau VACUUM, index `user_id` về lại 40 mục.

Bảng đầy kín làm UPDATE mất HOT:

```sql
-- WRONG: the page has no room, so the new version moves and every index gets an entry
CREATE TABLE packed (id int PRIMARY KEY, user_id int NOT NULL, n int NOT NULL);
CREATE INDEX packed_user_idx ON packed (user_id);
INSERT INTO packed SELECT g, g % 10, 0 FROM generate_series(1, 200) AS g;
UPDATE packed SET n = 1 WHERE id = 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('packed_user_idx', 1);
```

```sql
-- FIX: leave room on each heap page with fillfactor
CREATE TABLE roomy (id int PRIMARY KEY, user_id int NOT NULL, n int NOT NULL) WITH (fillfactor = 50);
CREATE INDEX roomy_user_idx ON roomy (user_id);
INSERT INTO roomy SELECT g, g % 10, 0 FROM generate_series(1, 200) AS g;
UPDATE roomy SET n = 1 WHERE id = 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('roomy_user_idx', 1);
```

Cột `n` không có index, nhưng trang 0 của `packed` đã đầy nên phiên bản mới sang trang khác và index nhận mục thứ 201. Với `fillfactor = 50`, trang còn chỗ, UPDATE là HOT và index giữ 200 mục.

## Thực hành

Đếm mục trên lá thật của `sessions_user_idx`, chạy một UPDATE chỉ đổi `last_seen`, rồi đếm lại; sau đó hai câu hỏi. Sơ đồ cho thấy một lá đầy lên vì version churn và lượt bottom-up deletion dọn nó.

## Tóm tắt

- UPDATE kiểu HOT không thêm mục index nào; mất HOT thì mọi index nhận một mục mới.
- HOT cần hai điều: không cột có index nào đổi, và trang heap còn chỗ.
- Simple deletion xóa mục mang `LP_DEAD`, bottom-up deletion dọn version churn, cả hai chỉ khi lá sắp tách.
- VACUUM dọn mọi mục chết theo ngưỡng của bảng và không chạy trong transaction block.
- Phòng churn bằng thiết kế cho HOT và `fillfactor`; index đã phình thì `REINDEX INDEX CONCURRENTLY`.

# EN

## Opening

The app only updates column `last_seen`, yet the index on `user_id` grows every day. Why does an unrelated index get new entries, and who cleans them up?

## Key idea

Every UPDATE in Postgres writes a new row version into the heap; the old version becomes a dead row once no transaction needs it. If the UPDATE changes no indexed column and the heap page has room, the new version stays on the same page and joins a HOT chain (heap-only tuple): no index gets a new entry.

Many people think an index only gets a new entry when its own column changes. In fact an index stores entries per row version. As soon as one indexed column changes, or the heap page is full, the UPDATE is no longer HOT and every index on the table gets a new entry, including indexes on columns that did not change. The old entries stay, pointing to the dead version. This is called version churn.

A B-tree has three ways to remove dead entries. Simple deletion: when an Index Scan meets an entry pointing to a tuple dead to every transaction, it sets the `LP_DEAD` bit on that entry; when the leaf is about to split, entries with this bit are deleted first. Bottom-up deletion (since PostgreSQL 14): when a leaf is about to split and Postgres suspects version churn, it checks the heap for suspected garbage on that leaf, deletes it and often avoids the split. VACUUM: "top-down" removal of every entry that points to a dead row, once the table crosses an autovacuum threshold.

A split leaf is never merged back, so prevention beats cure. Reduce churn at the source: do not index columns that change all the time unless you really need to, and lower the table's `fillfactor` so heap pages keep room for new versions. Once an index has bloated, `REINDEX INDEX CONCURRENTLY` rebuilds it without blocking writes.

## Syntax

```sql
CREATE TABLE table_name ( ... ) [ WITH ( fillfactor = 10..100 ) ];
ALTER TABLE table_name SET ( fillfactor = 10..100 );
VACUUM [ ( VERBOSE ) ] table_name;
REINDEX INDEX [ CONCURRENTLY ] index_name;
SELECT itemoffset, ctid, dead FROM bt_page_items('index_name', block_number);
```

- The table's `fillfactor`: 100 by default; lower values keep room on each page for HOT updates.
- `ALTER TABLE ... SET`: applies only to pages written afterwards, it does not rewrite old pages.
- `VACUUM`: cannot run inside a transaction block.
- `dead`: true when the entry carries the `LP_DEAD` bit.

## Example

Table `devices` has an index on `user_id` and none on `battery` yet. Update `battery`:

```sql
CREATE TABLE devices (id int PRIMARY KEY, user_id int NOT NULL, battery int NOT NULL);
CREATE INDEX devices_user_idx ON devices (user_id);
INSERT INTO devices SELECT g, g % 10, 100 FROM generate_series(1, 40) AS g;
UPDATE devices SET battery = battery - 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('devices_user_idx', 1);
```

Still 40 entries: the UPDATE was HOT, and the `user_id` index got nothing.

Add an index on `battery`, then update again:

```sql
CREATE INDEX devices_battery_idx ON devices (battery);
UPDATE devices SET battery = battery - 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('devices_user_idx', 1);
```

Now it is 80: `battery` is indexed, so the UPDATE is no longer HOT, and the `user_id` index gets 40 more entries although `user_id` did not change.

An Index Scan marks the dead entries it meets:

```sql
SET enable_seqscan = off;
SELECT count(*) FROM devices WHERE user_id = 3;
RESET enable_seqscan;
SELECT count(*) FILTER (WHERE dead) AS dead_items, count(*) AS items
FROM bt_page_items('devices_user_idx', 1);
```

The search for `user_id = 3` walks 8 entries; 4 point to old versions, so they get `LP_DEAD`. When this leaf is about to split, those 4 are deleted first.

## Common mistakes

Running VACUUM inside a transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM devices;
```

```sql
ROLLBACK;
VACUUM devices;
SELECT count(*) AS user_idx_items FROM bt_page_items('devices_user_idx', 1);
```

VACUUM manages its own transactions. End the open transaction with `ROLLBACK` and run it on its own; after VACUUM, the `user_id` index is back to 40 entries.

A packed table makes UPDATEs lose HOT:

```sql
-- WRONG: the page has no room, so the new version moves and every index gets an entry
CREATE TABLE packed (id int PRIMARY KEY, user_id int NOT NULL, n int NOT NULL);
CREATE INDEX packed_user_idx ON packed (user_id);
INSERT INTO packed SELECT g, g % 10, 0 FROM generate_series(1, 200) AS g;
UPDATE packed SET n = 1 WHERE id = 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('packed_user_idx', 1);
```

```sql
-- FIX: leave room on each heap page with fillfactor
CREATE TABLE roomy (id int PRIMARY KEY, user_id int NOT NULL, n int NOT NULL) WITH (fillfactor = 50);
CREATE INDEX roomy_user_idx ON roomy (user_id);
INSERT INTO roomy SELECT g, g % 10, 0 FROM generate_series(1, 200) AS g;
UPDATE roomy SET n = 1 WHERE id = 1;
SELECT count(*) AS user_idx_items FROM bt_page_items('roomy_user_idx', 1);
```

Column `n` has no index, but page 0 of `packed` is full, so the new version moves to another page and the index gets a 201st entry. With `fillfactor = 50` the page has room, the UPDATE is HOT and the index keeps 200 entries.

## Practice

Count the entries on a real leaf of `sessions_user_idx`, run an UPDATE that only changes `last_seen`, then count again; then two questions. The diagram shows a leaf filling up with version churn and the bottom-up deletion pass that clears it.

## Recap

- A HOT UPDATE adds no index entry; without HOT every index gets a new entry.
- HOT needs two things: no indexed column changes, and room on the heap page.
- Simple deletion removes entries marked `LP_DEAD`, bottom-up deletion clears version churn, both only when a leaf is about to split.
- VACUUM removes every dead entry on table-wide thresholds and cannot run in a transaction block.
- Prevent churn by designing for HOT and `fillfactor`; once an index has bloated, `REINDEX INDEX CONCURRENTLY`.
