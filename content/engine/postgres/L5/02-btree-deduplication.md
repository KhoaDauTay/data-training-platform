---
id: e-pg-l5-02
engine: postgres
level: L5
module: index-internals
title: "B-tree: dedup và posting list"
title_en: "B-tree deduplication and posting lists"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Thấy posting list thật: một khóa + mảng TID trong `bt_page_items`", en: "See a real posting list: one key + a TID array in `bt_page_items`" }
  - { vi: "Đo tác dụng của dedup trên cột ít giá trị", en: "Measure what deduplication does on a low-cardinality column" }
  - { vi: "Biết các trường hợp dedup không áp dụng (kể cả mọi index có `INCLUDE`)", en: "Know the cases where deduplication cannot apply (including every index with `INCLUDE`)" }
requires: [e-pg-l5-01]
sources:
  - https://www.postgresql.org/docs/18/btree.html
  - https://www.postgresql.org/docs/18/pageinspect.html
viz: pg-btree
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    DROP TABLE IF EXISTS tickets CASCADE;
    CREATE TABLE tickets (id int, prio int NOT NULL);
    INSERT INTO tickets SELECT g, g % 4 FROM generate_series(1, 20000) g;
    CREATE INDEX tickets_prio_dedup ON tickets (prio);
    CREATE INDEX tickets_prio_nodedup ON tickets (prio) WITH (deduplicate_items = off);
    CREATE INDEX tickets_prio_incl ON tickets (prio) INCLUDE (id);
  steps:
    - task: { vi: "So kích thước (số trang 8 KB) của ba index có tên bắt đầu bằng `tickets_prio`, sắp theo tên. Đoán trước: index có INCLUDE nhỏ như bản có dedup hay to như bản tắt dedup?", en: "Compare the size (number of 8 KB pages) of the three indexes whose names start with `tickets_prio`, ordered by name. Guess first: is the index with INCLUDE as small as the deduplicated one or as big as the one with deduplication off?" }
      solution: "SELECT relname, pg_relation_size(oid) / 8192 AS pages FROM pg_class WHERE relname LIKE 'tickets_prio%' ORDER BY relname"
      check: rows
      ordered: true
      hint: { vi: "`pg_relation_size(oid)` trả về byte.", en: "`pg_relation_size(oid)` returns bytes." }
    - task: { vi: "Trên trang 1 của `tickets_prio_dedup`, liệt kê 3 posting list đầu tiên: `itemoffset`, `htid` (ép text) và số TID trong `tids`.", en: "On page 1 of `tickets_prio_dedup`, list the first 3 posting lists: `itemoffset`, `htid` (cast to text) and the number of TIDs in `tids`." }
      solution: "SELECT itemoffset, htid::text, cardinality(tids) AS n_tids FROM bt_page_items('tickets_prio_dedup', 1) WHERE tids IS NOT NULL ORDER BY itemoffset LIMIT 3"
      check: rows
      ordered: true
      hint: { vi: "Mục là posting list khi cột `tids` khác NULL.", en: "An item is a posting list when the `tids` column is not NULL." }
    - task: { vi: "`bt_metap` có cột `allequalimage`: true nghĩa là dedup an toàn cho mọi cột của index. Đọc nó cho cả ba index (tên + giá trị), sắp theo tên.", en: "`bt_metap` has an `allequalimage` column: true means deduplication is safe for every column of the index. Read it for all three indexes (name + value), ordered by name." }
      solution: "SELECT c.relname, m.allequalimage FROM pg_class c, bt_metap(c.relname) m WHERE c.relname LIKE 'tickets_prio%' ORDER BY c.relname"
      check: rows
      ordered: true
      hint: { vi: "Gọi `bt_metap` cho từng tên index trong FROM.", en: "Call `bt_metap` for each index name in the FROM clause." }
quiz:
  - q: { vi: "Index nào sau đây KHÔNG bao giờ dùng dedup?", en: "Which of these indexes can NEVER use deduplication?" }
    options:
      - { vi: "`(customer_id int)`", en: "`(customer_id int)`" }
      - { vi: "`(amount numeric)`", en: "`(amount numeric)`" }
      - { vi: "`(status text)` với collation mặc định xác định", en: "`(status text)` with a deterministic default collation" }
    answer: 1
    trap: 2
    why: { vi: "Dedup (deduplication) gộp các mục bằng nhau thành một khóa kèm danh sách vị trí dòng, nên chỉ an toàn khi \"bằng nhau\" nghĩa là giống nhau từng byte. `numeric` không đạt: `1.0` và `1.00` bằng nhau nhưng khác cách hiển thị, gộp lại sẽ mất một cách viết. `int` luôn đạt. `text` nghe rủi ro vì phụ thuộc collation (quy tắc so sánh chuỗi), nhưng collation mặc định là loại xác định (deterministic): hai chuỗi bằng nhau thì giống nhau từng byte, nên dedup được. Docs còn loại `jsonb`, `float4`/`float8`, mảng, range và mọi index có `INCLUDE`.", en: "Deduplication merges equal items into one key plus a list of row locations, so it is only safe when \"equal\" means byte-for-byte identical. `numeric` fails: `1.0` and `1.00` are equal but display differently, and merging them would lose one spelling. `int` always qualifies. `text` sounds risky because it depends on a collation (the string comparison rules), but the default collation is deterministic: two equal strings are identical byte for byte, so they can be deduplicated. The docs also exclude `jsonb`, `float4`/`float8`, arrays, ranges and every index with `INCLUDE`." }
  - q: { vi: "Một index tạo với `deduplicate_items = off` đã to. Bạn chạy `ALTER INDEX ... SET (deduplicate_items = on)`. Index nhỏ đi lúc nào?", en: "An index built with `deduplicate_items = off` is already large. You run `ALTER INDEX ... SET (deduplicate_items = on)`. When does it shrink?" }
    options:
      - { vi: "Ngay khi lệnh chạy xong", en: "As soon as the command finishes" }
      - { vi: "Không tự nhỏ đi: dedup chỉ chạy trên lá sắp tách; muốn cả index gọn thì `REINDEX`", en: "It does not shrink by itself: deduplication only runs on a leaf about to split; to compact the whole index, `REINDEX`" }
      - { vi: "Sau lần VACUUM kế tiếp", en: "After the next VACUUM" }
    answer: 1
    trap: 0
    why: { vi: "Đổi tham số nghe như có hiệu lực ngay, nhưng `ALTER INDEX ... SET` chỉ ghi tham số vào system catalog (bảng hệ thống), không viết lại trang nào. Từ đó, dedup chỉ chạy khi một lá sắp phải tách: Postgres gộp trùng trên lá đó trước để tránh tách. VACUUM cũng không gộp các lá cũ. Chỉ `REINDEX` dựng lại cả index mới gom gọn mọi lá. Ví dụ trong bài: index vẫn 84 trang sau `ALTER INDEX`, còn 27 trang sau `REINDEX`.", en: "A changed parameter sounds like it applies at once, but `ALTER INDEX ... SET` only writes the parameter into the system catalog and rewrites no page. From then on, deduplication runs only when a leaf is about to split: Postgres merges duplicates on that leaf first to avoid the split. VACUUM does not merge the old leaves either. Only `REINDEX`, which rebuilds the whole index, compacts every leaf. The lesson's example: the index is still 84 pages after `ALTER INDEX` and 27 pages after `REINDEX`." }
---

## Mở bài

Cột `prio` chỉ có bốn giá trị, vậy mà mỗi dòng trong bảng vẫn cần một mục trong index. Nếu index lưu khóa lặp lại hàng nghìn lần, nó sẽ to hơn mức cần. Bài này đo xem Postgres tiết kiệm được bao nhiêu khi gộp khóa trùng.

## Ý chính

Dedup gộp các mục cùng khóa trên một lá thành một posting list: khóa ghi một lần, theo sau là mảng TID đã sắp. Tính năng này bật mặc định từ PostgreSQL 13; tắt cho từng index bằng `deduplicate_items = off`. Lợi lớn nhất là ở cột ít giá trị như trạng thái, mức ưu tiên hay khóa ngoại phổ biến: index nhỏ hơn vài lần và chiếm ít trang hơn trong bộ đệm.

Nhiều người nghĩ dedup gộp trùng ngay ở mỗi lần INSERT. Thật ra nó chạy "lười": chỉ khi một lá sắp phải tách, Postgres mới thử gộp các mục trùng trên lá đó trước, và thường tránh được việc tách. `CREATE INDEX` và `REINDEX` thì dựng posting list ngay từ đầu.

Dedup chỉ an toàn khi hai giá trị bằng nhau luôn có cùng biểu diễn byte. Vì vậy nó không áp dụng cho `numeric`, `jsonb`, `float4`/`float8`, kiểu chứa, `text` với collation không xác định, và mọi index có `INCLUDE`. Cờ `allequalimage` trong `bt_metap` cho biết index có đủ điều kiện hay không.

Index unique cũng có thể dedup: sau UPDATE, các phiên bản cũ và mới của cùng một khóa tạm thời trùng nhau trên lá.

## Cú pháp

```sql
CREATE INDEX index_name ON table_name (column) [ INCLUDE (column [, ...]) ] [ WITH ( deduplicate_items = on | off ) ];
ALTER INDEX index_name SET ( deduplicate_items = on | off );
SELECT itemoffset, htid, tids FROM bt_page_items('index_name', block_number);
SELECT allequalimage FROM bt_metap('index_name');
```

- `deduplicate_items`: chỉ có ở B-tree, mặc định `on`.
- `tids`: mảng TID của một posting list; NULL ở mục thường.
- `htid`: TID đầu tiên của mục; NULL ở high key (mục 1 của lá không phải lá phải nhất).
- `allequalimage`: true nghĩa là mọi cột của index cho phép dedup.

## Ví dụ

Bảng `logins` có 30.000 dòng, `user_id` có 500 giá trị (mỗi giá trị 60 dòng). Dựng hai index giống nhau, một cái tắt dedup:

```sql
CREATE TABLE logins (id int PRIMARY KEY, user_id int NOT NULL);
INSERT INTO logins SELECT g, g % 500 FROM generate_series(1, 30000) AS g;
CREATE INDEX logins_user_dedup ON logins (user_id);
CREATE INDEX logins_user_nodedup ON logins (user_id) WITH (deduplicate_items = off);
SELECT relname, pg_relation_size(oid) / 8192 AS pages
FROM pg_class WHERE relname LIKE 'logins_user%' ORDER BY relname;
```

Bản có dedup 27 trang, bản tắt dedup 84 trang: nhỏ hơn khoảng 3 lần.

Đọc các posting list trên lá đầu tiên:

```sql
SELECT itemoffset, htid::text, cardinality(tids) AS n_tids
FROM bt_page_items('logins_user_dedup', 1) ORDER BY itemoffset LIMIT 4;
```

Mục 1 là high key (không có TID); mỗi mục sau là một khóa kèm 60 TID.

Một index trên biểu thức `numeric` không đủ điều kiện:

```sql
CREATE INDEX logins_user_num ON logins ((user_id::numeric));
SELECT c.relname, m.allequalimage
FROM pg_class AS c, bt_metap(c.relname) AS m
WHERE c.relname IN ('logins_user_dedup', 'logins_user_num') ORDER BY c.relname;
```

`allequalimage` là true cho index `int` và false cho index `numeric`.

## Lỗi hay gặp

Đặt tham số dedup cho loại index khác:

```sql
-- ERROR 22023: unrecognized parameter "deduplicate_items"
CREATE INDEX logins_user_hash ON logins USING hash (user_id) WITH (deduplicate_items = off);
```

Chỉ B-tree có posting list. Bỏ tham số này khi dùng hash, GIN hay GiST.

Đếm mục trên lá như đếm dòng:

```sql
-- WRONG: one posting list stands for many rows
SELECT count(*) AS rows_on_page FROM bt_page_items('logins_user_dedup', 1);
```

```sql
-- FIX: add up the TIDs of the posting lists
SELECT sum(cardinality(tids)) AS rows_on_page FROM bt_page_items('logins_user_dedup', 1);
```

Câu sai ra 21 (20 posting list + high key), câu đúng ra 1200 dòng.

Bật dedup bằng `ALTER INDEX` rồi chờ index nhỏ đi:

```sql
-- WRONG: ALTER INDEX rewrites no page
ALTER INDEX logins_user_nodedup SET (deduplicate_items = on);
SELECT pg_relation_size('logins_user_nodedup') / 8192 AS pages;
```

```sql
-- FIX: rebuild the index
REINDEX INDEX logins_user_nodedup;
SELECT pg_relation_size('logins_user_nodedup') / 8192 AS pages;
```

Sau `ALTER INDEX` vẫn 84 trang; sau `REINDEX` còn 27.

## Thực hành

Ba câu trên bảng `tickets` có ba index: có dedup, tắt dedup và có `INCLUDE`. So kích thước, đọc posting list, rồi đọc cờ `allequalimage`; sau đó hai câu hỏi.

## Tóm tắt

- Dedup gộp mục cùng khóa thành một posting list: khóa một lần, kèm mảng TID.
- Nó chạy khi lá sắp tách, còn `CREATE INDEX` và `REINDEX` dựng posting list ngay.
- Không dedup với `numeric`, `jsonb`, số thực, kiểu chứa, collation không xác định và mọi index có `INCLUDE`.
- `allequalimage` trong `bt_metap` cho biết index có dedup được không.
- Đổi `deduplicate_items` không viết lại index; cần `REINDEX` để thấy kích thước mới.

# EN

## Opening

Column `prio` has only four values, yet every row of the table still needs an entry in the index. If the index stored a key repeated thousands of times, it would be larger than it needs to be. This lesson measures how much Postgres saves by merging duplicate keys.

## Key idea

Deduplication merges the items with the same key on a leaf into one posting list: the key is written once, followed by a sorted array of TIDs. It is on by default since PostgreSQL 13; turn it off per index with `deduplicate_items = off`. It pays off most on low-cardinality columns such as status, priority or popular foreign keys: the index is several times smaller and takes fewer pages in the cache.

Many people think deduplication merges duplicates on every INSERT. In fact it runs "lazily": only when a leaf is about to split does Postgres first try to merge the duplicates on that leaf, which often avoids the split. `CREATE INDEX` and `REINDEX` build posting lists straight away.

Deduplication is only safe when two equal values always have the same byte image. So it does not apply to `numeric`, `jsonb`, `float4`/`float8`, container types, `text` with a nondeterministic collation, and any index with `INCLUDE`. The `allequalimage` flag in `bt_metap` says whether an index qualifies.

Unique indexes can deduplicate too: after an UPDATE, the old and new versions of the same key are temporary duplicates on the leaf.

## Syntax

```sql
CREATE INDEX index_name ON table_name (column) [ INCLUDE (column [, ...]) ] [ WITH ( deduplicate_items = on | off ) ];
ALTER INDEX index_name SET ( deduplicate_items = on | off );
SELECT itemoffset, htid, tids FROM bt_page_items('index_name', block_number);
SELECT allequalimage FROM bt_metap('index_name');
```

- `deduplicate_items`: B-tree only, `on` by default.
- `tids`: the TID array of a posting list; NULL on a plain item.
- `htid`: the item's first TID; NULL on the high key (item 1 of any leaf but the rightmost).
- `allequalimage`: true means every column of the index allows deduplication.

## Example

Table `logins` has 30,000 rows and `user_id` has 500 values (60 rows each). Build two identical indexes, one with deduplication off:

```sql
CREATE TABLE logins (id int PRIMARY KEY, user_id int NOT NULL);
INSERT INTO logins SELECT g, g % 500 FROM generate_series(1, 30000) AS g;
CREATE INDEX logins_user_dedup ON logins (user_id);
CREATE INDEX logins_user_nodedup ON logins (user_id) WITH (deduplicate_items = off);
SELECT relname, pg_relation_size(oid) / 8192 AS pages
FROM pg_class WHERE relname LIKE 'logins_user%' ORDER BY relname;
```

The deduplicated index has 27 pages, the other 84: about 3 times smaller.

Read the posting lists on the first leaf:

```sql
SELECT itemoffset, htid::text, cardinality(tids) AS n_tids
FROM bt_page_items('logins_user_dedup', 1) ORDER BY itemoffset LIMIT 4;
```

Item 1 is the high key (no TID); each later item is one key with 60 TIDs.

An index on a `numeric` expression does not qualify:

```sql
CREATE INDEX logins_user_num ON logins ((user_id::numeric));
SELECT c.relname, m.allequalimage
FROM pg_class AS c, bt_metap(c.relname) AS m
WHERE c.relname IN ('logins_user_dedup', 'logins_user_num') ORDER BY c.relname;
```

`allequalimage` is true for the `int` index and false for the `numeric` one.

## Common mistakes

Setting the deduplication parameter on another index type:

```sql
-- ERROR 22023: unrecognized parameter "deduplicate_items"
CREATE INDEX logins_user_hash ON logins USING hash (user_id) WITH (deduplicate_items = off);
```

Only B-tree has posting lists. Leave this parameter out for hash, GIN or GiST.

Counting items on a leaf as if they were rows:

```sql
-- WRONG: one posting list stands for many rows
SELECT count(*) AS rows_on_page FROM bt_page_items('logins_user_dedup', 1);
```

```sql
-- FIX: add up the TIDs of the posting lists
SELECT sum(cardinality(tids)) AS rows_on_page FROM bt_page_items('logins_user_dedup', 1);
```

The wrong query says 21 (20 posting lists + the high key), the right one 1200 rows.

Turning deduplication on with `ALTER INDEX` and waiting for the index to shrink:

```sql
-- WRONG: ALTER INDEX rewrites no page
ALTER INDEX logins_user_nodedup SET (deduplicate_items = on);
SELECT pg_relation_size('logins_user_nodedup') / 8192 AS pages;
```

```sql
-- FIX: rebuild the index
REINDEX INDEX logins_user_nodedup;
SELECT pg_relation_size('logins_user_nodedup') / 8192 AS pages;
```

After `ALTER INDEX` it is still 84 pages; after `REINDEX` it is 27.

## Practice

Three queries on table `tickets`, which has three indexes: deduplicated, deduplication off, and with `INCLUDE`. Compare their sizes, read the posting lists, then read the `allequalimage` flag; then two questions.

## Recap

- Deduplication merges items with the same key into one posting list: the key once, plus a TID array.
- It runs when a leaf is about to split, while `CREATE INDEX` and `REINDEX` build posting lists at once.
- No deduplication for `numeric`, `jsonb`, floats, container types, nondeterministic collations and any index with `INCLUDE`.
- `allequalimage` in `bt_metap` says whether an index can deduplicate.
- Changing `deduplicate_items` rewrites nothing; `REINDEX` to see the new size.
