---
id: e-sr-l3-02
engine: search
level: L3
module: postgres
title: "Full-text trên PostgreSQL cho tiếng Việt"
title_en: "PostgreSQL full-text for Vietnamese"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sr-pg-tsvector, at: idea }]
objectives:
  - vi: "Tìm theo từ trên PostgreSQL với cấu hình `simple` và hàm bỏ dấu `f_unaccent`, vì PostgreSQL không có cấu hình tiếng Việt."
    en: "Search by word in PostgreSQL with the `simple` configuration and the accent-removing `f_unaccent`, since PostgreSQL has no Vietnamese configuration."
  - vi: "Xếp kết quả bằng `ts_rank` và so nó với `_score` của Elasticsearch."
    en: "Rank hits with `ts_rank` and compare it with Elasticsearch's `_score`."
  - vi: "Lưu sẵn `tsvector` trong một cột sinh (generated column) và đánh index GIN trên đó."
    en: "Store the `tsvector` ahead in a generated column and put a GIN index on it."
requires: [e-sr-l1-03, e-pg-l2-12]
sources:
  - https://www.postgresql.org/docs/18/textsearch-controls.html
  - https://www.postgresql.org/docs/18/textsearch-tables.html
  - https://www.postgresql.org/docs/18/unaccent.html
  - https://www.postgresql.org/docs/18/ddl-generated-columns.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE FUNCTION f_unaccent(text) RETURNS text
      LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      RETURN unaccent('unaccent', $1);
    CREATE TABLE products (
      id int PRIMARY KEY, name text NOT NULL,
      brand text NOT NULL, category text NOT NULL,
      price int NOT NULL);
    INSERT INTO products VALUES
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
  steps:
    - task:
        vi: "Khách gõ `đèn lồng`. Trả `id` các sản phẩm có cả hai từ khi bỏ dấu, dùng cấu hình `simple`, xếp theo `id`."
        en: "A customer types `đèn lồng`. Return the `id` of products holding both words once accents are removed, with the `simple` configuration, sorted by `id`."
      solution: |
        SELECT id FROM products
        WHERE to_tsvector('simple',
            f_unaccent(name))
          @@ plainto_tsquery('simple',
            f_unaccent('đèn lồng'))
        ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "Hai phía cùng bỏ dấu: `to_tsvector('simple', f_unaccent(name)) @@ plainto_tsquery('simple', f_unaccent('đèn lồng'))`."
        en: "Remove accents on both sides: `to_tsvector('simple', f_unaccent(name)) @@ plainto_tsquery('simple', f_unaccent('đèn lồng'))`."
    - task:
        vi: "Khách gõ `lua`. Trả `id` và điểm `ts_rank` (cột `rank`) của 3 sản phẩm điểm cao nhất; bằng điểm thì `id` nhỏ trước."
        en: "A customer types `lua`. Return the `id` and the `ts_rank` score (column `rank`) of the 3 best products; on a tie, smaller `id` first."
      solution: |
        SELECT id, ts_rank(
            to_tsvector('simple',
              f_unaccent(name)),
            plainto_tsquery('simple', 'lua'))
          AS rank
        FROM products
        WHERE to_tsvector('simple',
            f_unaccent(name))
          @@ plainto_tsquery('simple', 'lua')
        ORDER BY rank DESC, id
        LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`ts_rank(vector, query) AS rank`, rồi `ORDER BY rank DESC, id LIMIT 3`."
        en: "`ts_rank(vector, query) AS rank`, then `ORDER BY rank DESC, id LIMIT 3`."
    - task:
        vi: "Thêm cột sinh `doc` kiểu `tsvector`, `GENERATED ALWAYS AS (to_tsvector('simple', f_unaccent(name))) STORED`, để không phải tính lại mỗi lần tìm."
        en: "Add a generated column `doc` of type `tsvector`, `GENERATED ALWAYS AS (to_tsvector('simple', f_unaccent(name))) STORED`, so it is not recomputed at every search."
      solution: |
        ALTER TABLE products ADD COLUMN doc
          tsvector GENERATED ALWAYS AS (
            to_tsvector('simple',
              f_unaccent(name))) STORED
      check: rows
      after: SELECT id FROM products WHERE doc @@ to_tsquery('simple', 'tra') ORDER BY id
      hint:
        vi: "`ALTER TABLE products ADD COLUMN doc tsvector GENERATED ALWAYS AS (...) STORED`."
        en: "`ALTER TABLE products ADD COLUMN doc tsvector GENERATED ALWAYS AS (...) STORED`."
    - task:
        vi: "Tạo index GIN tên `products_doc_idx` trên cột `doc`."
        en: "Create a GIN index named `products_doc_idx` on the column `doc`."
      solution: CREATE INDEX products_doc_idx ON products USING gin (doc)
      check: catalog
      hint:
        vi: "`CREATE INDEX ... ON products USING gin (doc)`."
        en: "`CREATE INDEX ... ON products USING gin (doc)`."
quiz:
  - q:
      vi: "Vì sao bài dùng cấu hình `simple` thay vì `english` cho tên hàng tiếng Việt?"
      en: "Why does the lesson use the `simple` configuration instead of `english` for Vietnamese product names?"
    options:
      - { vi: "`english` chạy chậm hơn trên chữ có dấu", en: "`english` runs slower on accented text" }
      - { vi: "`english` bỏ từ dừng tiếng Anh và cắt đuôi từ", en: "`english` drops English stop words and stems" }
      - { vi: "`simple` tự bỏ dấu tiếng Việt", en: "`simple` removes Vietnamese accents itself" }
    answer: 1
    trap: 2
    why:
      vi: "`simple` không bỏ dấu; việc đó là của `f_unaccent`. Nó chỉ viết thường và giữ mọi từ. `english` thì bỏ từ dừng tiếng Anh như `do` và `an`, vốn là `đỏ` và `An` (trong Hội An) sau khi bỏ dấu, rồi cắt đuôi từ theo luật tiếng Anh. Tìm `do` với `english` vì thế ra 0 dòng."
      en: "`simple` does not remove accents; that is the job of `f_unaccent`. It only lower-cases and keeps every word. `english` drops English stop words such as `do` and `an`, which are `đỏ` (red) and `An` (in Hoi An) once accents are gone, then stems words by English rules. So searching `do` with `english` returns 0 rows."
  - q:
      vi: "`ts_rank` của PostgreSQL và `_score` của Elasticsearch khác nhau ở điểm nào?"
      en: "How does PostgreSQL's `ts_rank` differ from Elasticsearch's `_score`?"
    options:
      - { vi: "`ts_rank` không xét từ hiếm hay phổ biến trong cả bảng", en: "`ts_rank` ignores how rare a word is in the whole table" }
      - { vi: "Giống hệt nhau: cả hai đều là BM25", en: "They are identical: both are BM25" }
      - { vi: "`ts_rank` chỉ chạy được khi có index GIN", en: "`ts_rank` only works with a GIN index" }
    answer: 0
    trap: 1
    why:
      vi: "Cả hai đều cho số cao hơn khi tài liệu hợp hơn, nên dễ tưởng là một. `ts_rank` chỉ nhìn vào chính dòng đó (số lần từ xuất hiện, có thể chia theo độ dài), không có IDF: một từ có ở mọi dòng vẫn được tính như từ hiếm. BM25 của Elasticsearch dùng IDF trên cả chỉ mục. `ts_rank` chạy được cả khi không có index."
      en: "Both give a higher number to a better fit, so they look like one thing. `ts_rank` looks only at the row itself (how often the words occur, optionally divided by length), with no IDF: a word found in every row counts like a rare one. Elasticsearch's BM25 uses IDF over the whole index. `ts_rank` works without any index."
---
## Mở bài

Chợ Lồng Đèn đã có PostgreSQL. Trước khi dựng thêm một cụm Elasticsearch, hãy xem chính PostgreSQL tìm theo chữ được tới đâu. Bài này làm lại ô tìm không dấu bằng `tsvector`.

## Ý chính

PostgreSQL có tìm kiếm toàn văn sẵn: `to_tsvector(config, text)` cắt chữ thành từ (lexeme) kèm vị trí, `plainto_tsquery(config, text)` biến chữ gõ thành câu hỏi "có đủ các từ này", và `@@` so hai thứ đó. Đó chính là chỉ mục đảo, ở dạng một kiểu dữ liệu.

PostgreSQL không có cấu hình tiếng Việt. Dùng `simple` (chỉ viết thường, giữ mọi từ), và bỏ dấu bằng extension `unaccent` ở cả hai phía. Bản một tham số `unaccent(text)` là `STABLE`, nên bài bọc nó trong hàm `IMMUTABLE` `f_unaccent` để dùng được trong cột sinh và index (chi tiết ở bài về unaccent của PostgreSQL).

`ts_rank` cho điểm theo số lần các từ xuất hiện trong dòng. Khác BM25, nó không có IDF: không biết từ nào hiếm trong cả bảng. Muốn nhanh trên bảng lớn thì lưu sẵn `tsvector` trong một cột sinh (`GENERATED ALWAYS AS (...) STORED`) và đánh index GIN trên cột đó; GIN là chỉ mục đảo của PostgreSQL.

## Cú pháp

```sql
SELECT id FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ plainto_tsquery('simple',
    f_unaccent('đèn lồng'));

ts_rank(tsvector, tsquery)

ALTER TABLE t ADD COLUMN doc tsvector
  GENERATED ALWAYS AS (...) STORED;
CREATE INDEX ON t USING gin (doc);
```

- `plainto_tsquery` nối các từ bằng AND; `websearch_to_tsquery` hiểu `"..."`, `or`, `-`.
- Cột sinh chỉ nhận hàm `IMMUTABLE`.

## Ví dụ

Tên `Đèn lồng Hội An` thành những từ nào:

```sql
SELECT to_tsvector('simple',
  f_unaccent('Đèn lồng Hội An'));
```

Cụm từ trong ngoặc kép với `websearch_to_tsquery`:

```sql
SELECT id, name FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ websearch_to_tsquery('simple',
    '"hoi an"')
ORDER BY id;
```

Một từ hay `or`:

```sql
SELECT id FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ websearch_to_tsquery('simple',
    'non or khan')
ORDER BY id;
```

## Lỗi hay gặp

Cột sinh với `unaccent` một tham số bị từ chối vì hàm đó không `IMMUTABLE`:

```sql
-- ERROR 42P17
ALTER TABLE products ADD COLUMN d2
  tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      unaccent(name))) STORED;
```

Cấu hình `english` coi `do` (là `đỏ` sau khi bỏ dấu) là từ dừng và bỏ nó đi:

```sql
-- WRONG: english drops 'do'
SELECT count(*) AS n FROM products
WHERE to_tsvector('english',
    f_unaccent(name))
  @@ plainto_tsquery('english', 'do');
```

```sql
-- FIX: the simple configuration
SELECT count(*) AS n FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ plainto_tsquery('simple', 'do');
```

## Thực hành

Bốn bước: tìm không dấu, xếp hạng bằng `ts_rank`, lưu `tsvector` trong cột sinh, rồi đánh index GIN.

## Tóm tắt

- `to_tsvector`, `plainto_tsquery` và `@@` là chỉ mục đảo của PostgreSQL.
- Tiếng Việt: cấu hình `simple` cộng `f_unaccent` ở cả hai phía.
- `ts_rank` không có IDF, khác BM25.
- Cột sinh `tsvector` cộng index GIN cho tìm nhanh trên bảng lớn.

# EN

## Opening

Lantern Market already runs PostgreSQL. Before setting up an Elasticsearch cluster too, see how far PostgreSQL itself goes with text search. This lesson rebuilds the accent-free search box with `tsvector`.

## Key idea

PostgreSQL has full-text search built in: `to_tsvector(config, text)` cuts text into words (lexemes) with positions, `plainto_tsquery(config, text)` turns the typed text into a "has all these words" question, and `@@` compares the two. That is the inverted index, as a data type.

PostgreSQL has no Vietnamese configuration. Use `simple` (lower case only, every word kept), and remove accents with the `unaccent` extension on both sides. The one-argument `unaccent(text)` is `STABLE`, so the lesson wraps it in an `IMMUTABLE` function `f_unaccent` that can go into a generated column or an index (details in the PostgreSQL unaccent lesson).

`ts_rank` scores by how often the words occur in the row. Unlike BM25 it has no IDF: it does not know which words are rare in the whole table. For speed on a big table, store the `tsvector` ahead in a generated column (`GENERATED ALWAYS AS (...) STORED`) and put a GIN index on it; GIN is PostgreSQL's inverted index.

## Syntax

```sql
SELECT id FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ plainto_tsquery('simple',
    f_unaccent('đèn lồng'));

ts_rank(tsvector, tsquery)

ALTER TABLE t ADD COLUMN doc tsvector
  GENERATED ALWAYS AS (...) STORED;
CREATE INDEX ON t USING gin (doc);
```

- `plainto_tsquery` joins the words with AND; `websearch_to_tsquery` understands `"..."`, `or`, `-`.
- A generated column accepts only `IMMUTABLE` functions.

## Example

Which words the name `Đèn lồng Hội An` becomes:

```sql
SELECT to_tsvector('simple',
  f_unaccent('Đèn lồng Hội An'));
```

A quoted phrase with `websearch_to_tsquery`:

```sql
SELECT id, name FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ websearch_to_tsquery('simple',
    '"hoi an"')
ORDER BY id;
```

One word or another with `or`:

```sql
SELECT id FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ websearch_to_tsquery('simple',
    'non or khan')
ORDER BY id;
```

## Common mistakes

A generated column with the one-argument `unaccent` is refused because that function is not `IMMUTABLE`:

```sql
-- ERROR 42P17
ALTER TABLE products ADD COLUMN d2
  tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      unaccent(name))) STORED;
```

The `english` configuration treats `do` (which `đỏ` becomes without accents) as a stop word and drops it:

```sql
-- WRONG: english drops 'do'
SELECT count(*) AS n FROM products
WHERE to_tsvector('english',
    f_unaccent(name))
  @@ plainto_tsquery('english', 'do');
```

```sql
-- FIX: the simple configuration
SELECT count(*) AS n FROM products
WHERE to_tsvector('simple',
    f_unaccent(name))
  @@ plainto_tsquery('simple', 'do');
```

## Practice

Four steps: search without accents, rank with `ts_rank`, store the `tsvector` in a generated column, then add the GIN index.

## Recap

- `to_tsvector`, `plainto_tsquery` and `@@` are PostgreSQL's inverted index.
- Vietnamese: the `simple` configuration plus `f_unaccent` on both sides.
- `ts_rank` has no IDF, unlike BM25.
- A generated `tsvector` column plus a GIN index make search fast on a big table.
