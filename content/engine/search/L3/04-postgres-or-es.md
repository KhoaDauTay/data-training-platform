---
id: e-sr-l3-04
engine: search
level: L3
module: postgres
title: "PostgreSQL hay Elasticsearch: khi nào dùng cái nào"
title_en: "PostgreSQL or Elasticsearch: when to use which"
kind: lab
runtime: browser
minutes: 18
figures: [{ name: sr-pg-vs-es, at: idea }]
objectives:
  - vi: "Dựng một trang tìm kiếm nhỏ hoàn toàn trên PostgreSQL: tìm, lọc, đếm theo nhóm (facet bằng `GROUP BY`) và phân trang."
    en: "Build a small search page entirely on PostgreSQL: search, filter, count by group (facets with `GROUP BY`) and paginate."
  - vi: "Kể các dấu hiệu nên chuyển sang Elasticsearch: cần BM25 và analyzer tốt, n-gram, khối lượng lớn, nhiều máy."
    en: "List the signs that it is time for Elasticsearch: you need BM25 and good analyzers, n-grams, large volumes, many machines."
  - vi: "Biết cái giá của một máy tìm kiếm riêng: dữ liệu phải chép sang, và chỉ hiện ra sau một nhịp làm mới (gần thời gian thực)."
    en: "Know the cost of a separate search engine: data must be copied over, and shows up only after a refresh (near real time)."
requires: [e-sr-l3-02, e-sr-l3-01]
sources:
  - https://www.postgresql.org/docs/18/textsearch-intro.html
  - https://www.elastic.co/docs/manage-data/data-store/near-real-time-search
  - https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE FUNCTION f_unaccent(text) RETURNS text
      LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      RETURN unaccent('unaccent', $1);
    CREATE TABLE products (
      id int PRIMARY KEY, name text NOT NULL,
      brand text NOT NULL, category text NOT NULL,
      price int NOT NULL,
      doc tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', f_unaccent(name))) STORED);
    INSERT INTO products (id, name, brand, category, price) VALUES
      (1, 'Đèn lồng lụa đỏ', 'HoiAnLight', 'den', 180),
      (2, 'Đèn lồng tre nhỏ', 'HoiAnLight', 'den', 95),
      (3, 'Lồng đèn giấy kéo quân', 'SaiGonCraft', 'den', 60),
      (4, 'Nón lá bài thơ Huế', 'HueHat', 'non', 120),
      (5, 'Nón lá trẻ em', 'HueHat', 'non', 70),
      (6, 'Áo dài lụa tơ tằm', 'SilkHouse', 'ao', 950),
      (7, 'Khăn lụa tơ tằm đỏ', 'SilkHouse', 'khan', 320),
      (8, 'Trà sen Tây Hồ', 'TeaLotus', 'tra', 250),
      (9, 'Trà ô long Đà Lạt', 'TeaLotus', 'tra', 210),
      (10, 'Cà phê Buôn Ma Thuột', 'BMTCoffee', 'caphe', 150),
      (11, 'Đèn lồng Hội An đỏ lớn', 'HoiAnLight', 'den', 260),
      (12, 'Tranh lụa phố cổ Hội An', 'SilkHouse', 'tranh', 480);
    CREATE INDEX products_doc_idx ON products USING gin (doc);
  steps:
    - task:
        vi: "Bộ lọc bên cho câu tìm `lua`: đếm các sản phẩm khớp theo thương hiệu, trả `brand` và `n`, nhiều trước, bằng nhau thì theo `brand`."
        en: "Facets for the search `lua`: count the matching products per brand, returning `brand` and `n`, most first, ties by `brand`."
      solution: |
        SELECT brand, count(*) AS n
        FROM products
        WHERE doc @@ plainto_tsquery(
          'simple', 'lua')
        GROUP BY brand
        ORDER BY n DESC, brand
      check: rows
      ordered: true
      hint:
        vi: "`WHERE doc @@ plainto_tsquery('simple', 'lua') GROUP BY brand`."
        en: "`WHERE doc @@ plainto_tsquery('simple', 'lua') GROUP BY brand`."
    - task:
        vi: "Tìm `den` nhưng chỉ giá tới 200: trả `id` và `name`, xếp theo `id`."
        en: "Search `den` but only up to a price of 200: return `id` and `name`, sorted by `id`."
      solution: |
        SELECT id, name FROM products
        WHERE doc @@ plainto_tsquery(
          'simple', 'den')
          AND price <= 200
        ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "Điều kiện tìm và điều kiện giá nối bằng `AND`, như `filter` của Elasticsearch."
        en: "Join the search and the price condition with `AND`, like Elasticsearch's `filter`."
    - task:
        vi: "Trang 2 (mỗi trang 2 kết quả) của câu tìm `den`, xếp theo `ts_rank` giảm dần rồi `id`: trả `id`."
        en: "Page 2 (2 hits per page) of the search `den`, ordered by `ts_rank` descending then `id`: return `id`."
      solution: |
        SELECT id FROM products
        WHERE doc @@ plainto_tsquery(
          'simple', 'den')
        ORDER BY ts_rank(doc,
          plainto_tsquery('simple', 'den'))
          DESC, id
        LIMIT 2 OFFSET 2
      check: rows
      ordered: true
      hint:
        vi: "`ORDER BY ts_rank(...) DESC, id LIMIT 2 OFFSET 2`."
        en: "`ORDER BY ts_rank(...) DESC, id LIMIT 2 OFFSET 2`."
quiz:
  - q:
      vi: "Shop có 12.000 sản phẩm trong PostgreSQL, cần tìm không dấu và lọc theo giá. Nên làm gì trước?"
      en: "A shop keeps 12,000 products in PostgreSQL and needs accent-free search plus a price filter. What first?"
    options:
      - { vi: "Dựng ngay một cụm Elasticsearch ba máy", en: "Set up a three-node Elasticsearch cluster now" }
      - { vi: "Dùng `tsvector` + `f_unaccent` + GIN ngay trong PostgreSQL", en: "Use `tsvector` + `f_unaccent` + GIN inside PostgreSQL" }
      - { vi: "Viết `LIKE '%...%'` không cần index", en: "Write `LIKE '%...%'` without an index" }
    answer: 1
    trap: 0
    why:
      vi: "Elasticsearch nghe là lựa chọn của dân chuyên, nhưng 12.000 dòng là nhỏ. Thêm một cụm nghĩa là thêm máy, thêm đường chép dữ liệu và độ trễ trước khi hàng mới tìm được. Full-text của PostgreSQL với `tsvector`, `f_unaccent` và index GIN làm được việc này trong cùng một giao dịch với dữ liệu. `LIKE` không index thì đọc cả bảng mỗi lần và không xếp hạng."
      en: "Elasticsearch sounds like the professional choice, but 12,000 rows is small. A cluster means more machines, a pipeline to copy data and a delay before new products are searchable. PostgreSQL full-text with `tsvector`, `f_unaccent` and a GIN index does this job in the same transaction as the data. `LIKE` without an index reads the whole table every time and does not rank."
  - q:
      vi: "Vừa ghi một sản phẩm vào Elasticsearch, tìm ngay thì chưa thấy. Vì sao?"
      en: "A product was just written to Elasticsearch, and an immediate search does not find it. Why?"
    options:
      - { vi: "Tài liệu chỉ tìm được sau lần làm mới tiếp theo", en: "A document is searchable only after the next refresh" }
      - { vi: "Ghi bị lỗi và Elasticsearch không báo", en: "The write failed and Elasticsearch hid it" }
      - { vi: "Cần chạy lại analyzer bằng `_analyze`", en: "The analyzer must be rerun with `_analyze`" }
    answer: 0
    trap: 1
    why:
      vi: "Không thấy kết quả dễ làm tưởng ghi hỏng, nhưng lệnh ghi đã trả thành công. Elasticsearch gom tài liệu mới vào bộ nhớ và chỉ mở chúng cho việc tìm ở lần làm mới (refresh), mặc định mỗi giây với chỉ mục đang được tìm: đó là gần thời gian thực (near real time). `_analyze` chỉ để xem từ, không đổi chỉ mục. PostgreSQL thì thấy ngay sau `COMMIT`."
      en: "No hit makes it look like a failed write, but the write returned success. Elasticsearch collects new documents in memory and opens them to search only at the next refresh, by default every second on an index that is being searched: that is near real time. `_analyze` only shows words, it does not change the index. PostgreSQL sees the row right after `COMMIT`."
---
## Mở bài

Hai bài trước làm ô tìm bằng Elasticsearch và bằng PostgreSQL. Câu hỏi thật của Chợ Lồng Đèn: có cần cả hai không? Bài này dựng trọn một trang tìm kiếm trên PostgreSQL, rồi liệt kê lúc nào thì nên tách ra.

## Ý chính

Một trang tìm kiếm cần bốn việc, và PostgreSQL làm được cả bốn: **tìm** (`tsvector`, `@@`), **lọc** (thêm `AND price <= …`, như `filter`), **bộ lọc bên** (facet: `GROUP BY brand` trên các dòng khớp, như aggregation `terms`) và **phân trang** (`ORDER BY ts_rank(...) DESC, id LIMIT … OFFSET …`). Dữ liệu ở một chỗ, khớp ngay sau `COMMIT`, không phải chép đi đâu.

Nên dùng Elasticsearch (hay OpenSearch) khi:

- cần chấm điểm tốt: BM25 có IDF, analyzer theo ngôn ngữ, đồng nghĩa, n-gram cho gợi ý khi gõ;
- khối lượng lớn: hàng chục triệu tài liệu, log, nhiều máy (chia shard, có bản sao);
- tìm là sản phẩm chính, không phải một ô phụ.

Cái giá: dữ liệu phải chép từ cơ sở dữ liệu sang (đồng bộ, có thể lệch), một cụm máy phải vận hành, và tài liệu mới chỉ tìm được sau một nhịp làm mới (refresh, mặc định mỗi giây): gần thời gian thực, không tức thì. PostgreSQL vẫn là nơi giữ sự thật; Elasticsearch là bản sao để tìm.

## Cú pháp

```sql
-- search + filter
WHERE doc @@ plainto_tsquery(
        'simple', 'den')
  AND price <= 200
-- facets
GROUP BY brand
-- one page of hits
ORDER BY ts_rank(doc, q) DESC, id
LIMIT 2 OFFSET 2
```

- `GROUP BY` trên các dòng khớp = aggregation `terms`.
- Luôn thêm một khóa phụ (`id`) khi sắp theo điểm, để trang không nhảy.

## Ví dụ

Bộ lọc bên theo loại hàng cho câu tìm `den`:

```sql
SELECT category, count(*) AS n
FROM products
WHERE doc @@ plainto_tsquery(
  'simple', 'den')
GROUP BY category;
```

Tổng số kết quả, như `hits.total`:

```sql
SELECT count(*) AS total
FROM products
WHERE doc @@ plainto_tsquery(
  'simple', 'hoi an');
```

Tìm cụm từ theo đúng thứ tự với `<->`:

```sql
SELECT id, name FROM products
WHERE doc @@ to_tsquery(
  'simple', 'long <-> den');
```

## Lỗi hay gặp

`to_tsquery` cần toán tử giữa các từ; một khoảng trắng trơn là lỗi cú pháp:

```sql
-- ERROR 42601
SELECT id FROM products
WHERE doc @@ to_tsquery(
  'simple', 'den long');
```

Đếm bộ lọc bên trên cả bảng chứ không trên các dòng khớp:

```sql
-- WRONG: counts every product
SELECT brand, count(*) AS n
FROM products
GROUP BY brand ORDER BY brand;
```

```sql
-- FIX: only the matching rows
SELECT brand, count(*) AS n
FROM products
WHERE doc @@ plainto_tsquery(
  'simple', 'den')
GROUP BY brand ORDER BY brand;
```

## Thực hành

Ba bước trên PostgreSQL: bộ lọc bên, tìm cộng lọc giá, rồi trang 2 của kết quả.

## Tóm tắt

- PostgreSQL làm được tìm, lọc, facet (`GROUP BY`) và phân trang trên cùng dữ liệu.
- Chọn Elasticsearch khi cần BM25 và analyzer tốt, n-gram, khối lượng rất lớn, nhiều máy.
- Elasticsearch là bản sao để tìm: phải chép dữ liệu, và tài liệu mới hiện sau một nhịp refresh.
- Sắp theo điểm thì thêm `id` làm khóa phụ để phân trang ổn định.

# EN

## Opening

The last lessons built a search box with Elasticsearch and with PostgreSQL. Lantern Market's real question: does it need both? This lesson builds a whole search page on PostgreSQL, then lists when it is worth splitting off.

## Key idea

A search page needs four things, and PostgreSQL does all four: **search** (`tsvector`, `@@`), **filter** (add `AND price <= …`, like `filter`), **facets** (`GROUP BY brand` over the matching rows, like a `terms` aggregation) and **pagination** (`ORDER BY ts_rank(...) DESC, id LIMIT … OFFSET …`). The data lives in one place, matches right after `COMMIT`, and is copied nowhere.

Reach for Elasticsearch (or OpenSearch) when:

- you need good scoring: BM25 with IDF, language analyzers, synonyms, n-grams for search-as-you-type;
- volumes are large: tens of millions of documents, logs, many machines (shards, replicas);
- search is the main product, not a side box.

The cost: data must be copied over from the database (a sync that can drift), a cluster must be run, and a new document is searchable only after a refresh (every second by default): near real time, not instant. PostgreSQL stays the source of truth; Elasticsearch is a copy built for searching.

## Syntax

```sql
-- search + filter
WHERE doc @@ plainto_tsquery(
        'simple', 'den')
  AND price <= 200
-- facets
GROUP BY brand
-- one page of hits
ORDER BY ts_rank(doc, q) DESC, id
LIMIT 2 OFFSET 2
```

- `GROUP BY` over the matching rows = a `terms` aggregation.
- Always add a tiebreaker (`id`) when sorting by score, so pages do not shift.

## Example

Facets per category for the search `den`:

```sql
SELECT category, count(*) AS n
FROM products
WHERE doc @@ plainto_tsquery(
  'simple', 'den')
GROUP BY category;
```

The total number of hits, like `hits.total`:

```sql
SELECT count(*) AS total
FROM products
WHERE doc @@ plainto_tsquery(
  'simple', 'hoi an');
```

A phrase in order with `<->`:

```sql
SELECT id, name FROM products
WHERE doc @@ to_tsquery(
  'simple', 'long <-> den');
```

## Common mistakes

`to_tsquery` needs an operator between words; a bare space is a syntax error:

```sql
-- ERROR 42601
SELECT id FROM products
WHERE doc @@ to_tsquery(
  'simple', 'den long');
```

Counting facets over the whole table instead of the matching rows:

```sql
-- WRONG: counts every product
SELECT brand, count(*) AS n
FROM products
GROUP BY brand ORDER BY brand;
```

```sql
-- FIX: only the matching rows
SELECT brand, count(*) AS n
FROM products
WHERE doc @@ plainto_tsquery(
  'simple', 'den')
GROUP BY brand ORDER BY brand;
```

## Practice

Three steps on PostgreSQL: facets, search plus a price filter, then page 2 of the hits.

## Recap

- PostgreSQL does search, filters, facets (`GROUP BY`) and pagination on the same data.
- Choose Elasticsearch for BM25 and good analyzers, n-grams, very large volumes, many machines.
- Elasticsearch is a copy for searching: data must be copied, and new documents appear after a refresh.
- When sorting by score, add `id` as a tiebreaker for stable pages.
