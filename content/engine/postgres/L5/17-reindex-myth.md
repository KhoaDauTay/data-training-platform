---
id: e-pg-l5-17
engine: postgres
level: L5
module: index-internals
title: "REINDEX có cứu được câu chậm không?"
title_en: "Can REINDEX save a slow query?"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: So số trang index bị tách lộn xộn với index xây gọn (như sau REINDEX)
    en: Compare the pages of an index grown through scattered splits with a freshly built one (as after REINDEX)
  - vi: Tách trong `Buffers:` phần trang index và phần trang bảng của một câu chậm
    en: Split a slow query's `Buffers:` into index pages and table pages
requires: [e-pg-l5-01]
figures: [{ name: pg-index-two-costs, at: idea }]
sources:
  - { url: https://www.postgresql.org/docs/18/sql-reindex.html, title_vi: "REINDEX" }
  - { url: https://www.postgresql.org/docs/18/indexes-index-only-scans.html, title_vi: "Index-only scan và covering index" }
  - { url: https://www.postgresql.org/docs/18/sql-explain.html, title_vi: "EXPLAIN" }
  - { url: https://use-the-index-luke.com/sql/anatomy/slow-indexes, title_vi: "Vì sao index vẫn chậm" }
lab:
  setup: |
    CREATE TABLE orders_split(id int PRIMARY KEY, customer_id int NOT NULL, amount int NOT NULL, pad char(100));
    CREATE INDEX orders_split_customer_idx ON orders_split (customer_id);
    INSERT INTO orders_split SELECT g, (g * 7919) % 2000 + 1, g % 997, 'p' FROM generate_series(1, 20000) g;
    CREATE TABLE orders_packed(id int PRIMARY KEY, customer_id int NOT NULL, amount int NOT NULL, pad char(100));
    INSERT INTO orders_packed SELECT * FROM orders_split;
    CREATE INDEX orders_packed_customer_idx ON orders_packed (customer_id);
    CREATE TABLE orders_cover(id int PRIMARY KEY, customer_id int NOT NULL, amount int NOT NULL, pad char(100));
    INSERT INTO orders_cover SELECT * FROM orders_split;
    CREATE INDEX orders_cover_customer_idx ON orders_cover (customer_id) INCLUDE (amount);
    VACUUM ANALYZE orders_split;
    VACUUM ANALYZE orders_packed;
    VACUUM ANALYZE orders_cover;
    CREATE FUNCTION buffers(q text) RETURNS SETOF text LANGUAGE plpgsql AS $$ DECLARE l text; BEGIN FOR l IN EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS ON) ' || q LOOP EXIT WHEN l = 'Planning:'; RETURN NEXT l; END LOOP; END $$;
  steps:
    - task:
        vi: "Ba bảng giống hệt nhau, 20.000 đơn. `orders_split_customer_idx` được tạo trước khi nạp nên lớn dần qua các lần tách trang lộn xộn; `orders_packed_customer_idx` được tạo sau khi nạp, gọn như vừa REINDEX. Lấy tên và số trang (`pg_relation_size` chia 8192) của hai index này và của bảng `orders_split`, theo tên."
        en: "Three identical tables, 20,000 orders. `orders_split_customer_idx` was created before the load, so it grew through scattered page splits; `orders_packed_customer_idx` was created after the load, as compact as right after a REINDEX. Return the name and page count (`pg_relation_size` divided by 8192) of these two indexes and of table `orders_split`, by name."
      solution: |
        SELECT c, pg_relation_size(c) / 8192 AS pages
        FROM unnest(ARRAY['orders_packed_customer_idx', 'orders_split', 'orders_split_customer_idx']) AS c
        ORDER BY c
      check: rows
      ordered: true
      hint:
        vi: "`unnest(ARRAY[...])` với ba tên, `pg_relation_size(c)` tính byte."
        en: "`unnest(ARRAY[...])` with three names, `pg_relation_size(c)` counts bytes."
      fact:
        vi: "Index tách lộn xộn 37 trang, index xây gọn 25 trang: REINDEX sẽ bớt 12 trang, khoảng một phần ba. Nhưng bảng có 364 trang."
        en: "The split index is 37 pages, the compact one 25: a REINDEX would save 12 pages, about a third. But the table is 364 pages."
        probe: SELECT c, pg_relation_size(c) / 8192 FROM unnest(ARRAY['orders_packed_customer_idx', 'orders_split', 'orders_split_customer_idx']) AS c ORDER BY c
        expect: [[orders_packed_customer_idx, 25], [orders_split, 364], [orders_split_customer_idx, 37]]
    - task:
        vi: "Báo cáo chậm là tổng tiền của khách 100–299. Hàm `buffers(q)` chạy `EXPLAIN (ANALYZE, BUFFERS)` của `q`. Gọi nó cho `'SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299'` và chỉ giữ các dòng chứa `Heap Blocks` hoặc `Buffers`."
        en: "The slow report is the total amount of customers 100–299. The function `buffers(q)` runs `EXPLAIN (ANALYZE, BUFFERS)` of `q`. Call it for `'SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299'` and keep the lines containing `Heap Blocks` or `Buffers`."
      solution: SELECT l FROM buffers('SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299') AS l WHERE l LIKE '%Heap Blocks%' OR l LIKE '%Buffers%'
      check: rows
      hint:
        vi: "Hai điều kiện `LIKE` nối bằng `OR`."
        en: "Two `LIKE` conditions joined with `OR`."
      fact:
        vi: "Tổng 370 trang: `Heap Blocks: exact=364` (mọi trang của bảng, vì khách nằm rải khắp nơi) và chỉ 6 trang index. Cùng câu trên `orders_packed` đọc 368 trang (364 bảng + 4 index): REINDEX chỉ bớt 2 trong 370."
        en: "370 pages in total: `Heap Blocks: exact=364` (every page of the table, since the customers are spread everywhere) and only 6 index pages. The same query on `orders_packed` reads 368 pages (364 table + 4 index): a REINDEX saves just 2 of 370."
        probe: SELECT trim(l) FROM buffers('SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299') AS l WHERE l LIKE '%Heap Blocks%' OR l LIKE '%Buffers%'
        expect: [["Buffers: shared hit=370"], ["Heap Blocks: exact=364"], ["Buffers: shared hit=370"], ["Buffers: shared hit=6"]]
    - task:
        vi: "`orders_cover` có index `(customer_id) INCLUDE (amount)`, nên câu không cần về bảng. Gọi `buffers()` cho cùng câu trên `orders_cover`, lấy mọi dòng."
        en: "`orders_cover` has an index `(customer_id) INCLUDE (amount)`, so the query need not visit the table. Call `buffers()` for the same query on `orders_cover`, returning every line."
      solution: SELECT l FROM buffers('SELECT sum(amount) FROM orders_cover WHERE customer_id BETWEEN 100 AND 299') AS l
      check: rows
      hint:
        vi: "Chỉ đổi tên bảng trong câu bên trong."
        en: "Only change the table name inside the query."
      fact:
        vi: "Index Only Scan, `Heap Fetches: 0`, tổng 9 trang thay vì 370: cái đắt là truy cập bảng, và cách chữa là đừng về bảng (index phủ, hoặc sắp bảng theo khách), không phải xây lại cây."
        en: "Index Only Scan, `Heap Fetches: 0`, 9 pages in total instead of 370: the expensive part was the table access, and the fix is to avoid the table (a covering index, or a table ordered by customer), not to rebuild the tree."
        probe: "SELECT count(*) FILTER (WHERE l LIKE '%Index Only Scan using orders_cover_customer_idx%'), count(*) FILTER (WHERE trim(l) = 'Heap Fetches: 0'), count(*) FILTER (WHERE trim(l) IN ('Buffers: shared hit=2 read=7', 'Buffers: shared hit=9')) FROM buffers('SELECT sum(amount) FROM orders_cover WHERE customer_id BETWEEN 100 AND 299') AS l"
        expect: [[1, 1, 2]]
quiz:
  - q:
      vi: "Báo cáo này chậm. Một đồng nghiệp nói: \"index bị thoái hóa rồi, cứ REINDEX là nhanh lại\". Bạn trả lời sao?"
      en: "This report is slow. A colleague says: \"the index has degraded, just REINDEX and it will be fast again\". What do you answer?"
    options:
      - { vi: "Đồng ý: index bị tách trang nhiều lớn hơn một phần ba, xây lại là hết chậm", en: "Agree: the heavily split index is a third bigger, rebuilding it removes the slowness" }
      - { vi: "Không: câu đọc 370 trang mà 364 là trang bảng; REINDEX chỉ bớt 2 trang. Câu chậm vì truy cập bảng, nên chữa bằng index phủ (9 trang) hoặc đọc ít dòng hơn", en: "No: the query reads 370 pages and 364 are table pages; a REINDEX saves only 2. It is slow because of table access, so fix it with a covering index (9 pages) or by reading fewer rows" }
      - { vi: "Không: phải DROP rồi CREATE lại index, REINDEX không đủ", en: "No: you must DROP and CREATE the index again, REINDEX is not enough" }
      - { vi: "Đồng ý, và nên lên lịch REINDEX mỗi đêm cho mọi index", en: "Agree, and schedule a nightly REINDEX for every index" }
    answer: 1
    trap: 0
    why:
      vi: "REINDEX nghe hợp lý vì index tách lộn xộn đúng là to hơn (37 so với 25 trang) và REINDEX đúng là làm nó gọn lại. Nhưng câu này đọc 370 trang mà chỉ 6 là trang index; 364 là trang bảng, vì 2000 dòng của khách 100–299 nằm rải trên mọi trang. REINDEX chỉ bớt 2 trang (370 → 368); DROP rồi CREATE cũng chỉ cho đúng index gọn đó, và REINDEX mỗi đêm là tốn công vô ích. Chỗ đắt là truy cập bảng: index phủ bỏ hẳn phần đó, còn 9 trang."
      en: "A REINDEX sounds right because the split index really is bigger (37 against 25 pages) and a REINDEX really does pack it again. But this query reads 370 pages and only 6 are index pages; 364 are table pages, because the 2000 rows of customers 100–299 sit on every page. A REINDEX saves just 2 pages (370 → 368); DROP and CREATE give the same compact index, and a nightly REINDEX is wasted work. The expensive part is the table access: a covering index removes it entirely, leaving 9 pages."
  - q:
      vi: "Khi nào REINDEX thật sự đáng làm?"
      en: "When is a REINDEX really worth doing?"
    options:
      - { vi: "Mỗi khi một câu dùng index bị chậm", en: "Whenever a query that uses an index is slow" }
      - { vi: "Khi index phình nhiều so với kích thước xây mới (ví dụ sau khi xóa hàng loạt) và chính các trang index chiếm phần lớn `Buffers` của câu, hoặc khi amcheck báo index hỏng", en: "When the index is much bigger than a fresh build (for example after a mass delete) and its own pages make up most of the query's `Buffers`, or when amcheck reports the index as corrupt" }
      - { vi: "Không bao giờ, Postgres tự xây lại index", en: "Never, Postgres rebuilds indexes by itself" }
    answer: 1
    trap: 0
    why:
      vi: "\"Mỗi khi chậm\" nghe như một luật an toàn, nhưng nó đổ lỗi cho cây trước khi đo. Đo trước: nếu phần lớn `Buffers` là trang bảng như ở đây (364/370), REINDEX gần như không đổi gì. REINDEX đáng khi chính index phình to và chiếm phần lớn số trang đọc, hoặc khi index hỏng; Postgres không tự xây lại index."
      en: "\"Whenever it is slow\" sounds like a safe rule, but it blames the tree before measuring. Measure first: if most of the `Buffers` are table pages, as here (364/370), a REINDEX changes almost nothing. A REINDEX pays off when the index itself has bloated and makes up most of the pages read, or when it is corrupt; Postgres never rebuilds an index on its own."
---
## Mở bài

Báo cáo tổng tiền theo nhóm khách chậm dần sau vài tháng, dù kế hoạch vẫn dùng index. Một đồng nghiệp đề xuất lịch REINDEX mỗi đêm. Trước khi xây lại thứ gì, làm sao biết thời gian thật sự đi vào đâu?

## Ý chính

Nhiều người nghĩ câu dùng index mà chậm là do index "thoái hóa", và REINDEX là thuốc chữa. Thật ra một lần tra index có hai phần: đi xuống cây (vài trang) và truy cập bảng cho từng dòng tìm được. Khi các dòng nằm rải khắp bảng, phần thứ hai lấn át: cây gọn hay không gần như không đổi gì.

Index B-tree lớn dần qua các lần tách trang, nên một index nạp theo thứ tự lộn xộn thường to hơn index xây một lần trên dữ liệu có sẵn. REINDEX xây lại cây gọn như mới. Nó đáng làm khi chính index phình to (ví dụ sau một đợt xóa hàng loạt) và trang index chiếm phần lớn số trang mà câu đọc, hoặc khi `amcheck` báo index hỏng. Postgres không tự xây lại index.

Đo trước bằng `EXPLAIN (ANALYZE, BUFFERS)`: dòng `Buffers` của nút Bitmap Index Scan là trang index, `Heap Blocks` là trang bảng. Cột `correlation` trong `pg_stats` cho biết thứ tự của cột có đi theo thứ tự vật lý của bảng không; gần 0 nghĩa là các dòng cùng khoảng giá trị nằm rải khắp nơi. Cách chữa phần truy cập bảng là đừng về bảng: index phủ (`INCLUDE`) cho Index Only Scan, hoặc sắp lại bảng theo khách.

Hình từng bước ở cuối mục này tách số trang của báo cáo chậm thành trang cây và trang bảng, trên ba bảng của lab.

## Cú pháp

```sql
REINDEX [ ( VERBOSE ) ] { INDEX | TABLE } [ CONCURRENTLY ] name;
CREATE INDEX index_name ON table_name (key_column) INCLUDE (other_column);
EXPLAIN (ANALYZE, BUFFERS) query;
```

- `INDEX`/`TABLE`: xây lại một index, hoặc mọi index của một bảng.
- `CONCURRENTLY`: xây bản mới bên cạnh rồi đổi, không chặn ghi; không chạy trong transaction.
- `INCLUDE`: cột chỉ để đọc kèm, không thuộc khóa sắp xếp; cho phép Index Only Scan.
- `Heap Fetches`: số lần Index Only Scan vẫn phải về bảng vì visibility map chưa đánh dấu trang.

## Ví dụ

Kế hoạch của báo cáo chậm:

```sql
EXPLAIN (COSTS OFF)
SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299;
```

Bitmap Index Scan tìm các dòng trong index, rồi Bitmap Heap Scan đọc từng trang bảng chứa chúng.

Các dòng của một nhóm khách nằm ở đâu trong bảng?

```sql
SELECT attname, correlation
FROM pg_stats
WHERE tablename = 'orders_split' AND attname IN ('id', 'customer_id')
ORDER BY attname;
```

`id` có correlation = 1 (đúng thứ tự vật lý), `customer_id` gần 0: 2000 dòng của khách 100–299 rải trên hầu hết các trang.

REINDEX làm index gọn lại thật:

```sql
REINDEX INDEX orders_split_customer_idx;
SELECT pg_relation_size('orders_split_customer_idx') / 8192 AS pages_after_reindex;
```

Index còn 25 trang. Nhưng câu báo cáo vẫn phải đọc các trang bảng như trước.

## Lỗi hay gặp

REINDEX không khóa bảng, nhưng gửi trong một transaction:

```sql
BEGIN;
-- ERROR 25001: REINDEX CONCURRENTLY cannot run inside a transaction block
REINDEX INDEX CONCURRENTLY orders_split_customer_idx;
```

Đưa tên bảng cho `REINDEX INDEX`:

```sql
ROLLBACK;
-- ERROR 42809: "orders_split" is not an index
REINDEX INDEX orders_split;
```

Dùng `REINDEX TABLE orders_split` để xây lại mọi index của bảng.

Tin vào index phủ ngay sau một đợt UPDATE:

```sql
-- WRONG: the visibility map is stale, so the index-only scan goes back to the table
UPDATE orders_cover SET amount = amount WHERE customer_id BETWEEN 100 AND 299;
SELECT trim(l) AS line
FROM buffers('SELECT sum(amount) FROM orders_cover WHERE customer_id BETWEEN 100 AND 299') AS l
WHERE l LIKE '%Heap Fetches%' OR l LIKE '%Buffers%';
```

```sql
-- FIX: VACUUM sets the visibility map again
VACUUM orders_cover;
SELECT trim(l) AS line
FROM buffers('SELECT sum(amount) FROM orders_cover WHERE customer_id BETWEEN 100 AND 299') AS l
WHERE l LIKE '%Heap Fetches%' OR l LIKE '%Buffers%';
```

Sau UPDATE, `Heap Fetches: 4000` và hơn 4000 trang đọc; sau VACUUM, `Heap Fetches: 0` và 14 trang. Index Only Scan chỉ tránh được bảng với những trang mà visibility map đánh dấu là mọi dòng đều thấy được; autovacuum giữ điều đó trên server thật.

## Thực hành

Ba bước so index tách lộn xộn, index xây gọn và index phủ trên cùng dữ liệu, rồi hai câu hỏi. Sau bài này bạn trả lời được "có nên REINDEX không?" bằng số trang thật.

## Tóm tắt

- Một lần tra index = đi xuống cây + truy cập bảng; khi dòng nằm rải, phần bảng lấn át.
- Đo bằng `EXPLAIN (ANALYZE, BUFFERS)` trước khi xây lại: trang index hay trang bảng?
- REINDEX đáng làm khi index phình và chiếm phần lớn số trang đọc, hoặc khi index hỏng.
- Index phủ (`INCLUDE`) bỏ được phần truy cập bảng, miễn visibility map còn mới.

# EN

## Opening

The report that totals amounts per customer group grows slower over a few months, although the plan still uses an index. A colleague proposes a nightly REINDEX. Before rebuilding anything, how do you find where the time really goes?

## Key idea

Many people think a slow query that uses an index means the index has "degraded", and that REINDEX is the cure. In fact an index lookup has two parts: walking down the tree (a few pages) and accessing the table for each row found. When the rows are spread across the table, the second part dominates: whether the tree is compact barely matters.

A B-tree grows through page splits, so an index loaded in random order is usually bigger than one built once on existing data. REINDEX rebuilds the tree as compact as new. It pays off when the index itself has bloated (for example after a mass delete) and index pages make up most of the pages the query reads, or when `amcheck` reports the index as corrupt. Postgres never rebuilds an index on its own.

Measure first with `EXPLAIN (ANALYZE, BUFFERS)`: the `Buffers` line of the Bitmap Index Scan node is index pages, `Heap Blocks` is table pages. The `correlation` column in `pg_stats` says whether a column's order follows the table's physical order; near 0 means rows in the same value range are spread everywhere. The fix for the table access is to avoid the table: a covering index (`INCLUDE`) for an Index Only Scan, or reordering the table by customer.

The step-through figure at the end of this section splits the slow report's pages into tree pages and table pages, on the lab's three tables.

## Syntax

```sql
REINDEX [ ( VERBOSE ) ] { INDEX | TABLE } [ CONCURRENTLY ] name;
CREATE INDEX index_name ON table_name (key_column) INCLUDE (other_column);
EXPLAIN (ANALYZE, BUFFERS) query;
```

- `INDEX`/`TABLE`: rebuild one index, or every index of a table.
- `CONCURRENTLY`: builds a new copy alongside, then swaps, without blocking writes; never inside a transaction.
- `INCLUDE`: columns stored only for reading, not part of the sort key; they allow an Index Only Scan.
- `Heap Fetches`: how often an Index Only Scan still had to visit the table because the visibility map had not marked the page.

## Example

The plan of the slow report:

```sql
EXPLAIN (COSTS OFF)
SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299;
```

The Bitmap Index Scan finds the rows in the index, then the Bitmap Heap Scan reads every table page that holds them.

Where do one customer group's rows sit in the table?

```sql
SELECT attname, correlation
FROM pg_stats
WHERE tablename = 'orders_split' AND attname IN ('id', 'customer_id')
ORDER BY attname;
```

`id` has correlation = 1 (exactly the physical order), `customer_id` is near 0: the 2000 rows of customers 100–299 are spread over almost every page.

REINDEX really does make the index compact:

```sql
REINDEX INDEX orders_split_customer_idx;
SELECT pg_relation_size('orders_split_customer_idx') / 8192 AS pages_after_reindex;
```

The index is down to 25 pages. But the report still has to read the same table pages as before.

## Common mistakes

A REINDEX that does not lock the table, sent inside a transaction:

```sql
BEGIN;
-- ERROR 25001: REINDEX CONCURRENTLY cannot run inside a transaction block
REINDEX INDEX CONCURRENTLY orders_split_customer_idx;
```

Giving a table name to `REINDEX INDEX`:

```sql
ROLLBACK;
-- ERROR 42809: "orders_split" is not an index
REINDEX INDEX orders_split;
```

Use `REINDEX TABLE orders_split` to rebuild every index of the table.

Trusting a covering index right after a batch of UPDATEs:

```sql
-- WRONG: the visibility map is stale, so the index-only scan goes back to the table
UPDATE orders_cover SET amount = amount WHERE customer_id BETWEEN 100 AND 299;
SELECT trim(l) AS line
FROM buffers('SELECT sum(amount) FROM orders_cover WHERE customer_id BETWEEN 100 AND 299') AS l
WHERE l LIKE '%Heap Fetches%' OR l LIKE '%Buffers%';
```

```sql
-- FIX: VACUUM sets the visibility map again
VACUUM orders_cover;
SELECT trim(l) AS line
FROM buffers('SELECT sum(amount) FROM orders_cover WHERE customer_id BETWEEN 100 AND 299') AS l
WHERE l LIKE '%Heap Fetches%' OR l LIKE '%Buffers%';
```

After the UPDATE, `Heap Fetches: 4000` and over 4000 pages read; after VACUUM, `Heap Fetches: 0` and 14 pages. An Index Only Scan only avoids the table on pages the visibility map marks as all-visible; on a real server autovacuum keeps that up to date.

## Practice

Three steps comparing a split index, a compactly built index and a covering index on the same data, then two questions. After this lesson you can answer "should we REINDEX?" with real page counts.

## Recap

- An index lookup = walking the tree + accessing the table; when rows are spread out, the table part dominates.
- Measure with `EXPLAIN (ANALYZE, BUFFERS)` before rebuilding: index pages or table pages?
- REINDEX pays off when the index has bloated and makes up most of the pages read, or when it is corrupt.
- A covering index (`INCLUDE`) removes the table access, as long as the visibility map is fresh.
