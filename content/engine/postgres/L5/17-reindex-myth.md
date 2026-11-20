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
objectives:
  - vi: So số trang index bị tách lộn xộn với index xây gọn (như sau REINDEX)
    en: Compare the pages of an index grown through scattered splits with a freshly built one (as after REINDEX)
  - vi: Tách trong `Buffers:` phần trang index và phần trang bảng của một câu chậm
    en: Split a slow query's `Buffers:` into index pages and table pages
requires: [e-pg-l5-01]
sources:
  - https://www.postgresql.org/docs/18/sql-reindex.html
  - https://www.postgresql.org/docs/18/indexes-index-only-scans.html
  - https://www.postgresql.org/docs/18/sql-explain.html
  - https://use-the-index-luke.com/sql/anatomy/slow-indexes
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
    why:
      vi: "Chuyện REINDEX nghe hợp lý vì index tách lộn xộn đúng là to hơn (37 so với 25 trang) và REINDEX đúng là làm nó gọn lại. Nhưng câu này chỉ đọc 6 trang index; 364 trang còn lại là bảng, vì 2000 dòng nằm rải trên mọi trang. Đó là thành phần thứ hai của một lần tra index chậm: truy cập bảng. Index phủ bỏ hẳn phần đó: 9 trang."
      en: "The REINDEX story sounds right because the split index really is bigger (37 against 25 pages) and a REINDEX really does pack it again. But this query reads only 6 index pages; the other 364 are table pages, because the 2000 rows sit on every page. That is the second ingredient of a slow index lookup: the table access. A covering index removes that part entirely: 9 pages."
  - q:
      vi: "Khi nào REINDEX thật sự đáng làm?"
      en: "When is a REINDEX really worth doing?"
    options:
      - { vi: "Mỗi khi một câu dùng index bị chậm", en: "Whenever a query that uses an index is slow" }
      - { vi: "Khi index phình nhiều so với kích thước xây mới (ví dụ sau khi xóa hàng loạt) và chính các trang index chiếm phần lớn `Buffers` của câu, hoặc khi amcheck báo index hỏng", en: "When the index is much bigger than a fresh build (for example after a mass delete) and its own pages make up most of the query's `Buffers`, or when amcheck reports the index as corrupt" }
      - { vi: "Không bao giờ, Postgres tự xây lại index", en: "Never, Postgres rebuilds indexes by itself" }
    answer: 1
    why:
      vi: "\"Mỗi khi chậm\" nghe như một luật an toàn, nhưng nó đổ lỗi cho cây trước khi đo. Đo trước: nếu phần lớn `Buffers` là trang bảng như ở đây (364/370), REINDEX gần như không đổi gì. REINDEX đáng khi chính index phình to và chiếm phần lớn số trang đọc, hoặc khi index hỏng; Postgres không tự xây lại index."
      en: "\"Whenever it is slow\" sounds like a safe rule, but it blames the tree before measuring. Measure first: if most of the `Buffers` are table pages, as here (364/370), a REINDEX changes almost nothing. A REINDEX pays off when the index itself has bloated and makes up most of the pages read, or when it is corrupt; Postgres never rebuilds an index on its own."
---

## Ý chính

Nhiều người nghĩ câu dùng index mà chậm là do index "thoái hóa", và REINDEX là thuốc chữa. Thật ra một lần tra index có hai phần: đi xuống cây (vài trang) và **truy cập bảng** cho từng dòng tìm được. Khi các dòng nằm rải khắp bảng, phần thứ hai lấn át: cây gọn hay không gần như không đổi gì. Đo bằng `Buffers:` trước khi xây lại bất cứ thứ gì.

## Ví dụ

```sql
SELECT l
FROM buffers('SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299') AS l
WHERE l LIKE '%Heap Blocks%' OR l LIKE '%Buffers%';
```

## Thực hành

Ba bước so index tách lộn xộn, index xây gọn và index phủ trên cùng dữ liệu, rồi hai câu hỏi. Sau bài này bạn trả lời được câu "có nên REINDEX không?" bằng số trang thật, và chỉ ra phần nào của câu chậm là cây, phần nào là bảng.

# EN

## Key idea

Many people think a slow query that uses an index means the index has "degraded", and that REINDEX is the cure. In fact an index lookup has two parts: walking down the tree (a few pages) and **accessing the table** for each row found. When the rows are spread across the table, the second part dominates: whether the tree is compact barely matters. Measure with `Buffers:` before rebuilding anything.

## Example

```sql
SELECT l
FROM buffers('SELECT sum(amount) FROM orders_split WHERE customer_id BETWEEN 100 AND 299') AS l
WHERE l LIKE '%Heap Blocks%' OR l LIKE '%Buffers%';
```

## Practice

Three steps comparing a split index, a compactly built index and a covering index on the same data, then two questions. After this lesson you can answer "should we REINDEX?" with real page counts, and point at which part of a slow query is the tree and which is the table.
