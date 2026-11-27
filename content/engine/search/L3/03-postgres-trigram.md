---
id: e-sr-l3-03
engine: search
level: L3
module: postgres
title: "Gõ sai trên PostgreSQL: pg_trgm"
title_en: "Typos in PostgreSQL: pg_trgm"
kind: lab
runtime: browser
minutes: 18
figures: [{ name: sr-pg-trigram, at: idea }]
objectives:
  - vi: "Đo độ giống nhau của hai chuỗi bằng trigram (`similarity`) và xếp kết quả theo độ giống, kể cả khi khách gõ sai."
    en: "Measure how alike two strings are with trigrams (`similarity`) and rank hits by it, even when the customer mistypes."
  - vi: "Tìm chuỗi con có bỏ dấu bằng `ILIKE` trên `f_unaccent(lower(name))`, và đánh index GIN `gin_trgm_ops` cho đúng biểu thức đó."
    en: "Search an accent-free substring with `ILIKE` on `f_unaccent(lower(name))`, and give that exact expression a GIN `gin_trgm_ops` index."
  - vi: "So trigram của PostgreSQL với `fuzziness` của Elasticsearch: cùng việc chịu lỗi gõ, cách đo khác nhau."
    en: "Compare PostgreSQL's trigrams with Elasticsearch's `fuzziness`: the same job of tolerating typos, measured differently."
requires: [e-sr-l3-02, e-pg-l2-13]
sources:
  - { url: https://www.postgresql.org/docs/18/pgtrgm.html, title_vi: "pg_trgm" }
  - { url: https://www.postgresql.org/docs/18/unaccent.html, title_vi: "unaccent" }
  - { url: https://www.postgresql.org/docs/18/indexes-expressional.html, title_vi: "Index trên biểu thức" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
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
        vi: "Khách gõ sai `tra sem tay ho`. Trả `id` và `similarity` (cột `sim`) giữa chữ gõ và `f_unaccent(lower(name))` của 3 sản phẩm giống nhất; bằng nhau thì `id` nhỏ trước."
        en: "A customer mistypes `tra sem tay ho`. Return the `id` and the `similarity` (column `sim`) between the typed text and `f_unaccent(lower(name))` of the 3 most alike products; on a tie, smaller `id` first."
      solution: |
        SELECT id, similarity(
            f_unaccent(lower(name)),
            'tra sem tay ho') AS sim
        FROM products
        ORDER BY sim DESC, id
        LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`similarity(f_unaccent(lower(name)), 'tra sem tay ho') AS sim`, rồi `ORDER BY sim DESC, id LIMIT 3`."
        en: "`similarity(f_unaccent(lower(name)), 'tra sem tay ho') AS sim`, then `ORDER BY sim DESC, id LIMIT 3`."
    - task:
        vi: "Đếm số sản phẩm có chuỗi `lua` trong tên khi đã bỏ dấu và viết thường (một cột `n`)."
        en: "Count the products whose name holds the substring `lua` once accents and capitals are removed (one column `n`)."
      solution: |
        SELECT count(*) AS n FROM products
        WHERE f_unaccent(lower(name))
          ILIKE '%lua%'
      check: rows
      hint:
        vi: "`WHERE f_unaccent(lower(name)) ILIKE '%lua%'`."
        en: "`WHERE f_unaccent(lower(name)) ILIKE '%lua%'`."
    - task:
        vi: "Tạo index GIN tên `products_trgm_idx` trên `f_unaccent(lower(name))` với lớp toán tử `gin_trgm_ops`."
        en: "Create a GIN index named `products_trgm_idx` on `f_unaccent(lower(name))` with the operator class `gin_trgm_ops`."
      solution: CREATE INDEX products_trgm_idx ON products USING gin (f_unaccent(lower(name)) gin_trgm_ops)
      check: catalog
      hint:
        vi: "`CREATE INDEX ... USING gin (f_unaccent(lower(name)) gin_trgm_ops)`."
        en: "`CREATE INDEX ... USING gin (f_unaccent(lower(name)) gin_trgm_ops)`."
quiz:
  - q:
      vi: "Trigram của chữ `sen` là gì?"
      en: "What are the trigrams of the word `sen`?"
    options:
      - { vi: "Chỉ một: `sen`", en: "Just one: `sen`" }
      - { vi: "Ba chữ cái riêng lẻ `s`, `e`, `n`", en: "The three single letters `s`, `e`, `n`" }
      - { vi: "Các mẩu 3 ký tự, kể cả có khoảng trắng đệm", en: "The 3-character pieces, padding spaces included" }
    answer: 2
    trap: 0
    why:
      vi: "Một từ 3 chữ trông như chỉ có một mẩu 3 ký tự, nhưng pg_trgm đệm hai khoảng trắng phía trước và một phía sau mỗi từ, nên `sen` cho 4 trigram: hai khoảng trắng + `s`, một khoảng trắng + `se`, `sen`, rồi `en` + một khoảng trắng. Nhờ phần đệm, đầu và cuối từ cũng được so."
      en: "A 3-letter word looks as if it had a single 3-character piece, but pg_trgm pads each word with two spaces in front and one behind, so `sen` gives 4 trigrams: two spaces + `s`, one space + `se`, `sen`, then `en` + one space. Thanks to the padding, word starts and ends are compared too."
  - q:
      vi: "Index GIN nằm trên `f_unaccent(lower(name))`. Câu `WHERE name ILIKE '%lua%'` có dùng nó không?"
      en: "The GIN index is on `f_unaccent(lower(name))`. Does `WHERE name ILIKE '%lua%'` use it?"
    options:
      - { vi: "Có, vì `ILIKE` đã bỏ qua chữ hoa", en: "Yes, because `ILIKE` already ignores case" }
      - { vi: "Không: planner chỉ dùng index cho đúng biểu thức", en: "No: the planner uses it only for the exact expression" }
      - { vi: "Có, nhưng chỉ khi bảng có hơn 1000 dòng", en: "Yes, but only with more than 1000 rows" }
    answer: 1
    trap: 0
    why:
      vi: "`ILIKE` đúng là không phân biệt chữ hoa, nhưng nó không bỏ dấu, và quan trọng hơn: index trên biểu thức chỉ được dùng khi điều kiện viết lại đúng biểu thức đó. `name ILIKE` đọc cột `name` gốc, không phải `f_unaccent(lower(name))`, nên planner quét cả bảng, và còn trượt `lụa` có dấu."
      en: "`ILIKE` does ignore case, but it does not remove accents, and more to the point an index on an expression is used only when the condition repeats that exact expression. `name ILIKE` reads the raw `name` column, not `f_unaccent(lower(name))`, so the planner scans the whole table, and it also misses the accented `lụa`."
---
## Mở bài

Elasticsearch có `fuzziness` cho lỗi gõ. PostgreSQL không có `fuzziness`, nhưng có extension `pg_trgm`. Bài này dùng nó để `tra sem tay ho` vẫn tìm ra trà sen Tây Hồ.

## Ý chính

Trigram là mẩu 3 ký tự liên tiếp của một từ, sau khi đệm hai khoảng trắng trước và một sau từ. `similarity(a, b)` đếm trigram chung của hai chuỗi chia cho số trigram khác nhau của cả hai, cho số từ 0 tới 1. Gõ sai một chữ chỉ làm hỏng vài trigram, nên chuỗi gõ sai vẫn giống chuỗi đúng hơn mọi chuỗi khác.

Khác `fuzziness` của Elasticsearch (đếm số chữ phải sửa trên từng từ, rồi tìm bằng chỉ mục đảo), trigram so cả chuỗi và cho một độ giống liên tục. Nó cũng phục vụ `LIKE` và `ILIKE` với `%...%`, việc mà B-tree không làm được.

Tiếng Việt vẫn cần bỏ dấu trước: so `f_unaccent(lower(name))` với chữ gõ không dấu. Để nhanh trên bảng lớn, đánh index GIN với lớp toán tử `gin_trgm_ops` trên **đúng biểu thức** đó, và viết câu tìm lặp lại đúng biểu thức ấy (bài PostgreSQL về pg_trgm và unaccent đi sâu hơn).

## Cú pháp

```sql
SELECT show_trgm('sen');
SELECT similarity('khna', 'khan');

SELECT id, similarity(
    f_unaccent(lower(name)), 'x')
  AS sim
FROM products
ORDER BY sim DESC LIMIT 3;

CREATE INDEX ON products USING gin
  (f_unaccent(lower(name))
   gin_trgm_ops);
```

- `similarity` trả số từ 0 tới 1; toán tử `%` dùng ngưỡng mặc định 0,3.
- Index biểu thức chỉ được dùng khi câu tìm viết đúng biểu thức đó.

## Ví dụ

Các trigram của một từ:

```sql
SELECT show_trgm('sen') AS t;
```

Đảo hai chữ vẫn còn giống:

```sql
SELECT similarity('khna', 'khan')
  AS sim;
```

Hàng giống chữ gõ sai nhất:

```sql
SELECT id, name FROM products
ORDER BY similarity(
  f_unaccent(lower(name)),
  'non la tre em') DESC, id
LIMIT 2;
```

## Lỗi hay gặp

GIN trên cột chữ cần lớp toán tử; thiếu `gin_trgm_ops` là lỗi:

```sql
-- ERROR 42704
CREATE INDEX products_name_gin
  ON products USING gin (name);
```

`ILIKE` trên tên có dấu: `den` không khớp `Đèn`.

```sql
-- WRONG: accents still there
SELECT count(*) AS n FROM products
WHERE name ILIKE '%den%';
```

```sql
-- FIX: remove accents first
SELECT count(*) AS n FROM products
WHERE f_unaccent(lower(name))
  ILIKE '%den%';
```

## Thực hành

Ba bước: xếp theo độ giống với chữ gõ sai, đếm chuỗi con không dấu, rồi đánh index trigram cho đúng biểu thức.

## Tóm tắt

- `pg_trgm` so chuỗi bằng các mẩu 3 ký tự; `similarity` cho số từ 0 tới 1.
- Lỗi gõ chỉ hỏng vài trigram, nên chuỗi gõ sai vẫn xếp đầu.
- Tiếng Việt: so `f_unaccent(lower(name))` với chữ không dấu.
- Index GIN `gin_trgm_ops` phải nằm trên đúng biểu thức của câu tìm.

# EN

## Opening

Elasticsearch has `fuzziness` for typos. PostgreSQL has no `fuzziness`, but it has the `pg_trgm` extension. This lesson uses it so that `tra sem tay ho` still finds the Tay Ho lotus tea.

## Key idea

A trigram is a run of 3 consecutive characters of a word, after padding the word with two spaces in front and one behind. `similarity(a, b)` counts the trigrams the two strings share, divided by the distinct trigrams of both, giving a number from 0 to 1. One wrong letter breaks only a few trigrams, so a mistyped string still looks more like the right one than like any other.

Unlike Elasticsearch's `fuzziness` (which counts the letters to fix in each word, then searches the inverted index), trigrams compare whole strings and give a continuous likeness. They also serve `LIKE` and `ILIKE` with `%...%`, which a B-tree cannot.

Vietnamese still needs the accents removed first: compare `f_unaccent(lower(name))` with the accent-free typed text. For speed on a big table, put a GIN index with the `gin_trgm_ops` operator class on **that exact expression**, and write the search so it repeats the expression (the PostgreSQL lesson on pg_trgm and unaccent goes deeper).

## Syntax

```sql
SELECT show_trgm('sen');
SELECT similarity('khna', 'khan');

SELECT id, similarity(
    f_unaccent(lower(name)), 'x')
  AS sim
FROM products
ORDER BY sim DESC LIMIT 3;

CREATE INDEX ON products USING gin
  (f_unaccent(lower(name))
   gin_trgm_ops);
```

- `similarity` returns a number from 0 to 1; the `%` operator uses a default threshold of 0.3.
- An expression index is used only when the search repeats that exact expression.

## Example

The trigrams of a word:

```sql
SELECT show_trgm('sen') AS t;
```

Two swapped letters still look alike:

```sql
SELECT similarity('khna', 'khan')
  AS sim;
```

The products most like a mistyped search:

```sql
SELECT id, name FROM products
ORDER BY similarity(
  f_unaccent(lower(name)),
  'non la tre em') DESC, id
LIMIT 2;
```

## Common mistakes

GIN on a text column needs an operator class; without `gin_trgm_ops` it fails:

```sql
-- ERROR 42704
CREATE INDEX products_name_gin
  ON products USING gin (name);
```

`ILIKE` on accented names: `den` does not match `Đèn`.

```sql
-- WRONG: accents still there
SELECT count(*) AS n FROM products
WHERE name ILIKE '%den%';
```

```sql
-- FIX: remove accents first
SELECT count(*) AS n FROM products
WHERE f_unaccent(lower(name))
  ILIKE '%den%';
```

## Practice

Three steps: rank by likeness to a mistyped search, count an accent-free substring, then give the exact expression a trigram index.

## Recap

- `pg_trgm` compares strings by 3-character pieces; `similarity` gives a number from 0 to 1.
- A typo breaks only a few trigrams, so the mistyped string still ranks first.
- Vietnamese: compare `f_unaccent(lower(name))` with accent-free text.
- A GIN `gin_trgm_ops` index must sit on the search's exact expression.
