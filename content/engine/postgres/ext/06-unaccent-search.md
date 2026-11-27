---
id: e-pg-ext-06
engine: postgres
level: EXT
module: ext-text
title: "unaccent: tìm tiếng Việt không dấu"
title_en: "unaccent: Vietnamese search without diacritics"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-26" }
figures: [{ name: pg-ext-unaccent-pipeline, at: idea }]
objectives:
  - vi: Bỏ dấu tiếng Việt bằng `unaccent`, kể cả chữ `đ`, để `den long hoi an` khớp `Đèn lồng Hội An`.
    en: Strip Vietnamese diacritics with `unaccent`, the letter `đ` included, so `den long hoi an` matches `Đèn lồng Hội An`.
  - vi: Viết một hàm bọc `IMMUTABLE` quanh dạng hai tham số của `unaccent`, vì bản gốc là `STABLE` và không đưa vào index được.
    en: Write an `IMMUTABLE` wrapper around the two-argument form of `unaccent`, because the original is `STABLE` and cannot go into an index.
  - vi: Dựng index trigram trên đúng biểu thức đó, và viết câu tìm khớp biểu thức để index được dùng.
    en: Build a trigram index on that exact expression, and write the search so it matches the expression and the index is used.
requires: [e-pg-ext-05]
sources:
  - { url: https://www.postgresql.org/docs/18/unaccent.html, title_vi: "unaccent" }
  - { url: https://www.postgresql.org/docs/18/pgtrgm.html, title_vi: "pg_trgm" }
  - { url: https://www.postgresql.org/docs/18/indexes-expressional.html, title_vi: "Index trên biểu thức" }
  - { url: https://www.postgresql.org/docs/18/xfunc-volatility.html, title_vi: "Mức thay đổi của hàm (volatility)" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE TABLE products (
      id int PRIMARY KEY,
      name text NOT NULL
    );
    INSERT INTO products
    SELECT g,
      (ARRAY['Đèn lồng', 'Đèn giấy', 'Đèn tre', 'Đèn lụa', 'Lồng đèn'])[1 + g % 5] || ' ' ||
      (ARRAY['Hội An', 'Phố cổ', 'Đà Nẵng', 'Huế', 'Sài Gòn', 'Hà Nội', 'Bà Nà'])[1 + (g / 5) % 7] || ' ' ||
      (ARRAY['đỏ', 'vàng', 'xanh', 'tím', 'trắng', 'hồng'])[1 + (g / 35) % 6] || ' ' ||
      (ARRAY['nhỏ', 'vừa', 'lớn'])[1 + (g / 210) % 3]
    FROM generate_series(1, 30000) AS g;
    ANALYZE products;
  steps:
    - task:
        vi: "Tạo hàm `f_unaccent(text)` trả về `text`, khai báo `IMMUTABLE`, gọi dạng hai tham số `unaccent('unaccent', $1)`."
        en: "Create a function `f_unaccent(text)` returning `text`, declared `IMMUTABLE`, that calls the two-argument form `unaccent('unaccent', $1)`."
      solution: CREATE FUNCTION f_unaccent(text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT RETURN unaccent('unaccent', $1)
      check: rows
      after: SELECT f_unaccent('Đèn lồng Hội An') AS plain, (SELECT provolatile FROM pg_proc WHERE proname = 'f_unaccent') AS volatility
      hint:
        vi: "`CREATE FUNCTION ... LANGUAGE sql IMMUTABLE RETURN unaccent('unaccent', $1)`."
        en: "`CREATE FUNCTION ... LANGUAGE sql IMMUTABLE RETURN unaccent('unaccent', $1)`."
    - task:
        vi: "Tạo index GIN tên `products_search_idx` trên `f_unaccent(lower(name))` với lớp toán tử `gin_trgm_ops`."
        en: "Create a GIN index named `products_search_idx` on `f_unaccent(lower(name))` with the operator class `gin_trgm_ops`."
      solution: CREATE INDEX products_search_idx ON products USING gin (f_unaccent(lower(name)) gin_trgm_ops)
      check: catalog
      hint:
        vi: "`CREATE INDEX ... USING gin (expr gin_trgm_ops)`; biểu thức đặt trong ngoặc."
        en: "`CREATE INDEX ... USING gin (expr gin_trgm_ops)`; the expression goes in parentheses."
    - task:
        vi: "Khách gõ \"den long hoi an do\". Đếm số hàng có cụm đó trong tên khi bỏ dấu và viết thường (một cột `found`). Bài chấm cả tốc độ: đúng mà phải bỏ dấu lại cho cả 30.000 dòng là chưa đạt."
        en: "A customer types \"den long hoi an do\". Count the products whose name holds that phrase once accents and capitals are removed (one column `found`). Speed is graded too: a right answer that strips accents again for all 30,000 rows does not pass."
      solution: SELECT count(*) AS found FROM products WHERE f_unaccent(lower(name)) LIKE '%den long hoi an do%'
      check: rows
      perf: { table: products }
      slow: SELECT count(*) AS found FROM products WHERE unaccent(name) ILIKE '%den long hoi an do%'
      hint:
        vi: "Viết đúng biểu thức của index: `f_unaccent(lower(name)) LIKE '%...%'`."
        en: "Write the index's exact expression: `f_unaccent(lower(name)) LIKE '%...%'`."
    - task:
        vi: "Khách gõ \"hoi an do lon\". Lấy `id` và `name` của 3 hàng đầu tiên khớp (bỏ dấu, viết thường), theo `id`."
        en: "A customer types \"hoi an do lon\". Return the `id` and `name` of the first 3 matching products (no accents, lower case), by `id`."
      solution: SELECT id, name FROM products WHERE f_unaccent(lower(name)) LIKE '%hoi an do lon%' ORDER BY id LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "Cùng biểu thức như bước trước, thêm `ORDER BY id LIMIT 3`."
        en: "The same expression as the step before, plus `ORDER BY id LIMIT 3`."
quiz:
  - q:
      vi: "Vì sao không viết thẳng `CREATE INDEX ... USING gin (unaccent(name) gin_trgm_ops)`?"
      en: "Why not simply write `CREATE INDEX ... USING gin (unaccent(name) gin_trgm_ops)`?"
    options:
      - { vi: "GIN chỉ nhận cột trơn, không nhận biểu thức", en: "GIN only takes plain columns, never expressions" }
      - { vi: "`unaccent` là `STABLE`, mà index cần hàm `IMMUTABLE`", en: "`unaccent` is `STABLE`, and an index needs `IMMUTABLE`" }
      - { vi: "`unaccent` quá chậm để chạy khi dựng index", en: "`unaccent` is too slow to run while building an index" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì đa số index là trên cột, nhưng Postgres cho phép index trên biểu thức, miễn hàm là `IMMUTABLE`. Bản một tham số của `unaccent` tìm từ điển qua `search_path`, nên được khai báo `STABLE` và lệnh báo lỗi 42P17. Hàm bọc gọi dạng hai tham số, tên từ điển cố định, nên khai báo `IMMUTABLE` được."
      en: "It sounds right because most indexes are on columns, but Postgres allows an index on an expression as long as its functions are `IMMUTABLE`. The one-argument `unaccent` finds its dictionary through `search_path`, so it is declared `STABLE` and the command fails with 42P17. The wrapper calls the two-argument form with a fixed dictionary name, so it can be declared `IMMUTABLE`."
  - q:
      vi: "Index nằm trên `f_unaccent(lower(name))`. Câu `WHERE lower(f_unaccent(name)) LIKE '%hoi an%'` có dùng index đó không?"
      en: "The index is on `f_unaccent(lower(name))`. Does `WHERE lower(f_unaccent(name)) LIKE '%hoi an%'` use it?"
    options:
      - { vi: "Có, vì hai biểu thức luôn cho cùng kết quả", en: "Yes, because both expressions always give the same result" }
      - { vi: "Không: planner chỉ khớp đúng biểu thức của index", en: "No: the planner only matches the index's exact expression" }
      - { vi: "Có, nhưng chỉ khi đổi `LIKE` thành `ILIKE`", en: "Yes, but only after changing `LIKE` to `ILIKE`" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì bỏ dấu rồi viết thường hay viết thường rồi bỏ dấu đều ra `den long`, nhưng planner không chứng minh hai biểu thức bằng nhau. Nó chỉ dùng index khi điều kiện viết đúng biểu thức đã đánh index, nên câu đó đọc cả 30.000 dòng."
      en: "It sounds right because stripping accents then lower-casing, or the other way round, both give `den long`, but the planner never proves two expressions equal. It only uses the index when the condition repeats the indexed expression exactly, so that query reads all 30,000 rows."
---
## Mở bài

Kho của Chợ Lồng Đèn có 30.000 mặt hàng tên tiếng Việt có dấu, như `Đèn lồng Hội An đỏ nhỏ`. Khách lại gõ không dấu: `den long hoi an`. Phải so hai chuỗi sau khi bỏ dấu, và phải đủ nhanh để ô tìm trả lời ngay khi gõ.

## Ý chính

Extension `unaccent` bỏ dấu theo một bảng luật: `Đèn lồng` thành `Den long`, kể cả `đ` thành `d`. So tên hàng và từ khách gõ sau khi cùng đi qua `unaccent(lower(...))` là đúng, nhưng chậm: mỗi lần tìm phải bỏ dấu lại cho mọi dòng.

Muốn nhanh thì lưu sẵn kết quả bỏ dấu trong một index trên biểu thức, kèm `gin_trgm_ops` để phục vụ `LIKE '%...%'`. Vướng một điều: hàm trong index phải `IMMUTABLE` (cùng đầu vào luôn cùng kết quả). Bản một tham số `unaccent(text)` tìm từ điển qua `search_path`, nên chỉ là `STABLE`.

- Viết hàm bọc `f_unaccent(text)` khai báo `IMMUTABLE`, gọi dạng hai tham số `unaccent('unaccent', $1)` để từ điển được ghi cố định.
- Index trên `f_unaccent(lower(name))` với `gin_trgm_ops`.
- Câu tìm phải viết đúng biểu thức đó: `f_unaccent(lower(name)) LIKE '%den long%'`.

Nhiều người nghĩ cứ chuẩn hóa Unicode rồi xóa dấu kết hợp là đủ. Thật ra `đ` là một chữ riêng chứ không phải `d` có dấu, nên cách đó để sót `đ`; `unaccent` thì có luật cho nó.

Hình ở cuối mục này cho thấy tên hàng và từ khách gõ cùng đi qua một hàm trước khi gặp index.

## Cú pháp

```sql
unaccent(text)
unaccent('unaccent', text)
CREATE FUNCTION f(text) RETURNS text
  LANGUAGE sql IMMUTABLE
  RETURN unaccent('unaccent', $1);
CREATE INDEX ON t USING gin
  (f(lower(col)) gin_trgm_ops);
```

`RETURN` là thân hàm kiểu chuẩn SQL: Postgres phân tích nó ngay lúc tạo hàm.

## Ví dụ

```sql
SELECT unaccent('Đèn lồng Hội An')
  AS plain;
```

Ra `Den long Hoi An`: `đ` thành `d`, mọi dấu thanh và dấu mũ đều mất.

Tìm không dấu, chưa có index:

```sql
SELECT count(*) AS found
FROM products
WHERE unaccent(lower(name))
  LIKE '%den long hoi an do%';
```

142 hàng, nhưng câu bỏ dấu lại cho cả 30.000 dòng.

Vì sao không index thẳng được:

```sql
SELECT proname, provolatile
FROM pg_proc
WHERE proname = 'unaccent';
```

Cả hai bản `unaccent` đều có `provolatile = s`, tức `STABLE`.

## Lỗi hay gặp

Đưa thẳng `unaccent` vào index:

```sql
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX ON products USING gin
  (unaccent(name) gin_trgm_ops);
```

Bọc nó trong một hàm `IMMUTABLE` gọi dạng hai tham số, như bước 1 của lab.

Tự bỏ dấu bằng chuẩn hóa Unicode:

```sql
-- WRONG: NFD + regexp keeps đ
SELECT count(*) AS found
FROM products
WHERE regexp_replace(
  normalize(lower(name), NFD),
  '[̀-ͯ]', '', 'g')
  LIKE '%den long hoi an%';
```

```sql
-- FIX: unaccent also maps đ to d
SELECT count(*) AS found
FROM products
WHERE unaccent(lower(name))
  LIKE '%den long hoi an%';
```

Bản sai ra 0: dấu thanh mất nhưng `đèn` thành `đen`, không khớp `den`. Bản sửa ra 857.

## Thực hành

Viết hàm bọc `IMMUTABLE`, dựng index trigram trên biểu thức, tìm một cụm không dấu (bước này chấm cả tốc độ), rồi lấy 3 hàng đầu của một cụm khác. Sau đó trả lời hai câu hỏi.

## Tóm tắt

- `unaccent` bỏ dấu tiếng Việt, kể cả `đ` thành `d`; chuẩn hóa Unicode rồi xóa dấu thì sót `đ`.
- `unaccent` là `STABLE`, nên không đưa thẳng vào index; bọc dạng hai tham số trong một hàm `IMMUTABLE`.
- Index GIN `gin_trgm_ops` trên `f_unaccent(lower(name))` phục vụ `LIKE '%...%'` không dấu.
- Câu tìm phải lặp đúng biểu thức của index, nếu không planner đọc cả bảng.

# EN

## Opening

Lantern Market's stock has 30,000 products with accented Vietnamese names, such as `Đèn lồng Hội An đỏ nhỏ`. Customers type without accents: `den long hoi an`. The two strings must be compared once the accents are gone, fast enough for a search box that answers while you type.

## Key idea

The `unaccent` extension strips diacritics by a table of rules: `Đèn lồng` becomes `Den long`, `đ` to `d` included. Comparing the product name and the customer's words after both go through `unaccent(lower(...))` is right, but slow: every search strips the accents again for every row.

To make it fast, keep the stripped result in an index on the expression, with `gin_trgm_ops` to serve `LIKE '%...%'`. One catch: a function in an index must be `IMMUTABLE` (the same input always gives the same result). The one-argument `unaccent(text)` finds its dictionary through `search_path`, so it is only `STABLE`.

- Write a wrapper `f_unaccent(text)` declared `IMMUTABLE` that calls the two-argument form `unaccent('unaccent', $1)`, so the dictionary is fixed.
- Index `f_unaccent(lower(name))` with `gin_trgm_ops`.
- The search must repeat that expression: `f_unaccent(lower(name)) LIKE '%den long%'`.

Many people think normalising Unicode and deleting the combining marks is enough. In fact `đ` is a letter of its own, not a `d` with a mark, so that approach leaves `đ` behind; `unaccent` has a rule for it.

The figure at the end of this section shows the product name and the customer's words going through one function before they meet the index.

## Syntax

```sql
unaccent(text)
unaccent('unaccent', text)
CREATE FUNCTION f(text) RETURNS text
  LANGUAGE sql IMMUTABLE
  RETURN unaccent('unaccent', $1);
CREATE INDEX ON t USING gin
  (f(lower(col)) gin_trgm_ops);
```

`RETURN` is a SQL-standard function body: Postgres parses it when the function is created.

## Example

```sql
SELECT unaccent('Đèn lồng Hội An')
  AS plain;
```

It gives `Den long Hoi An`: `đ` becomes `d`, and every tone and hat mark is gone.

An accent-free search with no index yet:

```sql
SELECT count(*) AS found
FROM products
WHERE unaccent(lower(name))
  LIKE '%den long hoi an do%';
```

142 products, but the query strips the accents again for all 30,000 rows.

Why it cannot go straight into an index:

```sql
SELECT proname, provolatile
FROM pg_proc
WHERE proname = 'unaccent';
```

Both versions of `unaccent` have `provolatile = s`, that is `STABLE`.

## Common mistakes

Putting `unaccent` straight into an index:

```sql
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX ON products USING gin
  (unaccent(name) gin_trgm_ops);
```

Wrap it in an `IMMUTABLE` function that calls the two-argument form, as in step 1 of the lab.

Stripping accents yourself with Unicode normalisation:

```sql
-- WRONG: NFD + regexp keeps đ
SELECT count(*) AS found
FROM products
WHERE regexp_replace(
  normalize(lower(name), NFD),
  '[̀-ͯ]', '', 'g')
  LIKE '%den long hoi an%';
```

```sql
-- FIX: unaccent also maps đ to d
SELECT count(*) AS found
FROM products
WHERE unaccent(lower(name))
  LIKE '%den long hoi an%';
```

The wrong version finds 0: the tone marks go, but `đèn` becomes `đen`, which does not match `den`. The fix finds 857.

## Practice

Write the `IMMUTABLE` wrapper, build the trigram index on the expression, search for a phrase without accents (this step is graded on speed too), then fetch the first 3 matches of another phrase. Then answer two questions.

## Recap

- `unaccent` strips Vietnamese diacritics, `đ` to `d` included; normalising Unicode and deleting marks leaves `đ` behind.
- `unaccent` is `STABLE`, so it cannot go straight into an index; wrap the two-argument form in an `IMMUTABLE` function.
- A GIN `gin_trgm_ops` index on `f_unaccent(lower(name))` serves accent-free `LIKE '%...%'`.
- The search must repeat the index's expression exactly, or the planner reads the whole table.
