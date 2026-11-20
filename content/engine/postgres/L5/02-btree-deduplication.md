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
    why: { vi: "Docs chính thức liệt kê: `numeric`, `jsonb`, `float4`/`float8`, kiểu chứa (composite, mảng, range), `text` với collation không xác định, và mọi index có `INCLUDE`. Lý do: hai giá trị \"bằng nhau\" có thể khác biểu diễn (ví dụ `1.0` và `1.00`).", en: "The docs list: `numeric`, `jsonb`, `float4`/`float8`, container types (composite, array, range), `text` with a nondeterministic collation, and every index with `INCLUDE`. The reason: two \"equal\" values can have different representations (for example `1.0` and `1.00`)." }
---

## Ý chính

- Dedup gộp các mục trùng khóa thành một posting list: khóa xuất hiện một lần, theo sau là mảng TID đã sắp. Bật mặc định từ PostgreSQL 13; tắt từng index bằng `deduplicate_items = off`.
- Dedup chạy "lười": chỉ khi một lá sắp phải tách, Postgres thử gộp trùng trước để tránh tách.
- Tác dụng lớn với cột ít giá trị (trạng thái, mức ưu tiên, khóa ngoại phổ biến): index nhỏ hơn nhiều, ít trang hơn trong bộ đệm.
- Không áp dụng cho: `numeric`, `jsonb`, `float4`/`float8`, kiểu chứa, `text` với collation không xác định, và mọi index có `INCLUDE`. `allequalimage` trong `bt_metap` cho biết index có đủ điều kiện không.
- Index unique cũng có thể dedup: các phiên bản cũ của cùng một khóa (do UPDATE) tạm thời trùng nhau.

## Ví dụ

Kết quả thật trên PGlite cho một bảng khác bài: `logins(id, user_id)`, 30.000 dòng, `user_id` có 500 giá trị (mỗi giá trị 60 dòng), một index thường và một index `deduplicate_items = off`:

```text
relname              pages
logins_user_dedup    27
logins_user_nodedup  84

itemoffset  htid    n_tids
2           (2,48)  60
3           (0,1)   60
```

Dedup làm index nhỏ đi khoảng 3 lần: mỗi khóa được lưu một lần kèm một posting list 60 TID. Bài lab hỏi thêm điều ví dụ này không nói: index có `INCLUDE` thì sao.

## Thực hành

So kích thước, đọc posting list và cờ `allequalimage`. Kỹ năng chuyên gia: biết khi nào thêm `INCLUDE` làm mất dedup và index phình to, để cân giữa index-only scan và kích thước.

# EN

## Key idea

- Deduplication merges items with the same key into one posting list: the key appears once, followed by a sorted array of TIDs. It is on by default since PostgreSQL 13; turn it off per index with `deduplicate_items = off`.
- It runs "lazily": only when a leaf is about to split does Postgres first try merging duplicates to avoid the split.
- It pays off most on low-cardinality columns (status, priority, popular foreign keys): a much smaller index and fewer pages in the cache.
- It does not apply to `numeric`, `jsonb`, `float4`/`float8`, container types, `text` with a nondeterministic collation, and any index with `INCLUDE`. `allequalimage` in `bt_metap` says whether the index qualifies.
- Unique indexes can deduplicate too: old versions of the same key (from UPDATEs) are temporary duplicates.

## Example

Real output from PGlite for a table other than the lesson's: `logins(id, user_id)`, 30,000 rows, `user_id` has 500 values (60 rows each), one plain index and one with `deduplicate_items = off`:

```text
relname              pages
logins_user_dedup    27
logins_user_nodedup  84

itemoffset  htid    n_tids
2           (2,48)  60
3           (0,1)   60
```

Deduplication makes the index about 3 times smaller: each key is stored once with a posting list of 60 TIDs. The lab asks what this example does not say: what happens to an index with `INCLUDE`.

## Practice

Compare sizes, read the posting lists and the `allequalimage` flag. Expert skill: know when adding `INCLUDE` loses deduplication and bloats the index, so you can weigh an index-only scan against size.
