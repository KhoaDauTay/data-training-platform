---
id: e-pg-l2-11
engine: postgres
level: L2
module: search
title: jsonb và jsonb_path_ops
title_en: jsonb and jsonb_path_ops
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-gin-postings
objectives:
  - vi: Đọc trường trong `jsonb` bằng `->` và `->>`, lọc bằng `@>`.
    en: Read `jsonb` fields with `->` and `->>`, and filter with `@>`.
  - vi: Chọn `jsonb_path_ops` (nhỏ, nhanh, chỉ `@>` và jsonpath) hay `jsonb_ops` mặc định (thêm `?`, `?|`, `?&`) cho index GIN.
    en: Choose between `jsonb_path_ops` (smaller, faster, only `@>` and jsonpath) and the default `jsonb_ops` (also `?`, `?|`, `?&`) for a GIN index.
  - vi: Viết bộ lọc thuộc tính sao cho index GIN dùng được, và so số đúng kiểu.
    en: Write attribute filters the GIN index can use, and compare numbers with the right type.
requires: [e-pg-l2-10]
sources:
  - https://www.postgresql.org/docs/18/datatype-json.html
  - https://www.postgresql.org/docs/18/functions-json.html
  - https://www.postgresql.org/docs/18/gin.html
lab:
  setup: |
    CREATE TABLE products (
      id int PRIMARY KEY,
      doc jsonb NOT NULL
    );
    INSERT INTO products
    SELECT g, jsonb_build_object(
      'name', 'Product ' || g,
      'price', (g % 200) + 0.99,
      'color', (ARRAY['red', 'blue', 'green', 'black', 'white'])[1 + g % 5],
      'size', (ARRAY['S', 'M', 'L', 'XL'])[1 + (g / 5) % 4],
      'brand', CASE WHEN g % 97 = 0 THEN 'Acme' ELSE 'Generic' END)
    FROM generate_series(1, 20000) AS g;
    ANALYZE products;
  steps:
    - task:
        vi: "Lấy `id`, tên (khóa `name` của cột jsonb `doc`, dạng chữ) và giá (khóa `price`, dạng `numeric`) của 3 sản phẩm có `id` nhỏ nhất, sắp theo `id`."
        en: "Return the `id`, the name (key `name` of the jsonb column `doc`, as text) and the price (key `price`, as `numeric`) of the 3 products with the smallest `id`, ordered by `id`."
      solution: SELECT id, doc ->> 'name' AS name, (doc ->> 'price')::numeric AS price FROM products ORDER BY id LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`doc ->> 'name'` trả `text`; ép giá bằng `::numeric`."
        en: "`doc ->> 'name'` returns `text`; cast the price with `::numeric`."
    - task:
        vi: "Tạo index GIN tên `products_doc_idx` trên `doc`, dùng opclass `jsonb_path_ops`."
        en: "Create a GIN index named `products_doc_idx` on `doc`, using the `jsonb_path_ops` opclass."
      solution: CREATE INDEX products_doc_idx ON products USING gin (doc jsonb_path_ops)
      target: SELECT id FROM products WHERE doc @> '{"brand":"Acme","size":"M"}'
      check: catalog
      hint:
        vi: "Opclass viết ngay sau tên cột: `USING gin (doc jsonb_path_ops)`."
        en: "The opclass goes right after the column: `USING gin (doc jsonb_path_ops)`."
    - task:
        vi: "Lấy `id` các sản phẩm hãng Acme cỡ M. Kế hoạch phải dùng `products_doc_idx`."
        en: "Return the `id` of Acme products in size M. The plan must use `products_doc_idx`."
      solution: SELECT id FROM products WHERE doc @> '{"brand":"Acme","size":"M"}'
      check: plan
      hint:
        vi: "`doc @> '{...}'`: `doc` chứa mọi cặp khóa/giá trị đã cho. `doc ->> 'brand' = 'Acme'` thì không dùng được index GIN này."
        en: "`doc @> '{...}'`: `doc` contains every listed key/value pair. `doc ->> 'brand' = 'Acme'` cannot use this GIN index."
    - task:
        vi: "Trang danh mục lọc hàng Acme màu đỏ (`red`). Trả về `id` của chúng. Câu phải nhanh: đi qua `products_doc_idx`, không quét cả bảng."
        en: "The catalog page filters Acme items in red (`red`). Return their `id`. The query must be fast: through `products_doc_idx`, not a full table scan."
      solution: SELECT id FROM products WHERE doc @> '{"brand":"Acme","color":"red"}'
      check: rows
      perf: { table: products }
      slow: SELECT id FROM products WHERE doc ->> 'brand' = 'Acme' AND doc ->> 'color' = 'red'
      hint:
        vi: "Gom cả hai điều kiện vào một `@>`. Hai phép `->>` bằng cho cùng dòng nhưng index GIN không đọc được chúng."
        en: "Put both conditions in one `@>`. Two `->>` equalities give the same rows, but the GIN index cannot read them."
quiz:
  - q:
      vi: "Bảng có index GIN `jsonb_path_ops` trên `doc`. Câu nào dùng được index đó?"
      en: "The table has a GIN `jsonb_path_ops` index on `doc`. Which query can use it?"
    options:
      - { vi: "`WHERE doc ->> 'brand' = 'Acme'`, vì index nằm trên cả cột `doc`", en: "`WHERE doc ->> 'brand' = 'Acme'`, because the index covers the whole `doc` column" }
      - { vi: "`WHERE doc @> '{\"brand\":\"Acme\"}'`", en: "`WHERE doc @> '{\"brand\":\"Acme\"}'`" }
      - { vi: "`WHERE doc ? 'brand'`", en: "`WHERE doc ? 'brand'`" }
    answer: 1
    trap: 0
    why:
      vi: "Index nằm trên cả cột `doc` nên dễ nghĩ câu nào đọc `doc` cũng dùng được, nhưng index chỉ phục vụ các toán tử trong opclass (operator class: bộ toán tử index đó hiểu) của nó. `->>` lấy ra một giá trị `text` rồi so `=`: index GIN không biết phép đó. `?` (có khóa không) cần opclass mặc định `jsonb_ops`, không có trong `jsonb_path_ops`. Chỉ `@>` (và jsonpath `@?`, `@@`) đi qua `jsonb_path_ops`."
      en: "The index covers the whole `doc` column, so any query reading `doc` seems able to use it, but an index only serves the operators in its opclass (operator class: the set of operators that index understands). `->>` pulls out a `text` value and then compares it with `=`: the GIN index knows nothing of that. `?` (does the key exist?) needs the default `jsonb_ops` opclass, which `jsonb_path_ops` lacks. Only `@>` (and the jsonpath `@?`, `@@`) goes through `jsonb_path_ops`."
  - q:
      vi: "`doc ->> 'price' > '150'` đếm được 14.200 dòng, trong khi chỉ 5.000 sản phẩm có giá trên 150. Vì sao?"
      en: "`doc ->> 'price' > '150'` counts 14,200 rows while only 5,000 products cost more than 150. Why?"
    options:
      - { vi: "`->>` trả `text`, nên Postgres so chuỗi theo từng ký tự: `'20.99'` lớn hơn `'150'`", en: "`->>` returns `text`, so Postgres compares strings character by character: `'20.99'` is greater than `'150'`" }
      - { vi: "Thống kê cũ, cần `ANALYZE`", en: "Stale statistics, run `ANALYZE`" }
      - { vi: "`jsonb` làm tròn số khi lưu", en: "`jsonb` rounds numbers when storing them" }
    answer: 0
    trap: 1
    why:
      vi: "Thống kê (statistics) cũ chỉ làm sai ước lượng số dòng, tức đổi kế hoạch, không bao giờ đổi kết quả; `jsonb` cũng lưu số đúng như nhập, không làm tròn. Kết quả sai vì kiểu: `->>` luôn trả `text`, và chuỗi được so từng ký tự từ trái sang: `'20.99'` lớn hơn `'150'` vì `2` > `1`. Ép kiểu trước khi so: `(doc ->> 'price')::numeric > 150` đếm đúng 5.000 (200 mức giá từ 0,99 tới 199,99, có 50 mức trên 150: 50/200 × 20.000 sản phẩm)."
      en: "Stale statistics only skew row estimates, which changes the plan, never the result; `jsonb` also stores numbers exactly as given, with no rounding. The result is wrong because of the type: `->>` always returns `text`, and strings compare character by character from the left: `'20.99'` is greater than `'150'` because `2` > `1`. Cast before comparing: `(doc ->> 'price')::numeric > 150` counts exactly 5,000 (200 price levels from 0.99 to 199.99, 50 of them above 150: 50/200 × 20,000 products)."
---
## Mở bài

Mỗi sản phẩm có bộ thuộc tính riêng: áo có cỡ, ốc vít có đường kính, và thêm một cột cho mỗi thuộc tính thì bảng phình ra mãi. Gom chúng vào một cột `jsonb` thì gọn, nhưng bộ lọc "hãng Acme, màu đỏ" phải đọc cả 20.000 tài liệu. Bài này làm cho bộ lọc đó dùng được index.

## Ý chính

`jsonb` lưu JSON đã phân tích sẵn ở dạng nhị phân: đọc nhanh, khóa trùng chỉ giữ giá trị cuối, không giữ khoảng trắng hay thứ tự khóa. Kiểu `json` thì giữ nguyên văn bản gốc và phải phân tích lại mỗi lần đọc, nên hầu như chỉ dùng khi cần đúng văn bản ban đầu.

Đọc một trường: `doc -> 'size'` trả `jsonb`, còn `doc ->> 'size'` trả `text`. Vì `->>` luôn ra chữ, muốn so số thì phải ép kiểu, ví dụ `(doc ->> 'price')::numeric`. Hỏi "có chứa": `doc @> '{"size":"M"}'` đúng khi tài liệu có cặp đó, so cả kiểu của giá trị (số `5.99` khác chuỗi `"5.99"`). Hỏi "có khóa": `doc ? 'brand'`.

Index GIN cho `jsonb` có hai opclass. `jsonb_ops` (mặc định) lưu một khóa index cho mỗi khóa và mỗi giá trị, phục vụ `@>`, `?`, `?|`, `?&` và jsonpath. `jsonb_path_ops` lưu một mã băm cho mỗi đường dẫn tới giá trị: index nhỏ hơn và tìm `@>` nhanh hơn, nhưng không trả lời được `?`. Trên bảng bài này, bản `jsonb_path_ops` khoảng 1,3 MB, bản mặc định khoảng 1,8 MB.

Nhiều người nghĩ đã có index trên cột `doc` thì câu nào đọc `doc` cũng nhanh. Thật ra index chỉ giúp toán tử của opclass nó: `doc ->> 'brand' = 'Acme'` là một biểu thức khác, Postgres phải tính nó cho từng dòng. Muốn index đúng biểu thức đó thì cần một index biểu thức B-tree trên `(doc ->> 'brand')`.

## Cú pháp

```sql
SELECT doc -> 'key' AS as_jsonb, doc ->> 'key' AS as_text FROM table_name;
SELECT ... WHERE doc @> '{"key": value [, ...]}';
CREATE INDEX index_name ON table_name USING gin ( doc [ jsonb_path_ops ] );
```

- `->`: lấy giá trị, giữ kiểu `jsonb`.
- `->>`: lấy giá trị dưới dạng `text`.
- `@>`: tài liệu chứa mọi cặp khóa/giá trị đã cho.
- `jsonb_path_ops`: index nhỏ hơn, chỉ cho `@>` và jsonpath; bỏ trống là `jsonb_ops`.

## Ví dụ

Hai cách đọc một trường, và câu hỏi "có khóa":

```sql
SELECT doc -> 'size' AS as_jsonb, doc ->> 'size' AS as_text, doc ? 'brand' AS has_brand,
       pg_typeof(doc -> 'price') AS arrow_type, pg_typeof(doc ->> 'price') AS text_type
FROM products WHERE id = 5;
```

Cả hai cột đầu hiện `M`, nhưng một bên là `jsonb`, một bên là `text`.

`json` và `jsonb` khác nhau khi gặp khóa trùng và khoảng trắng:

```sql
SELECT '{"a":1, "a":2,  "b":3}'::json::text AS as_json, '{"a":1, "a":2,  "b":3}'::jsonb::text AS as_jsonb;
```

`json` trả lại nguyên văn; `jsonb` chỉ còn `{"a": 2, "b": 3}`.

Tạo hai index cùng nội dung, khác opclass, rồi so kích thước:

```sql
CREATE INDEX demo_path_ops ON products USING gin (doc jsonb_path_ops);
CREATE INDEX demo_default_ops ON products USING gin (doc);
SELECT relname, pg_size_pretty(pg_relation_size(oid)) AS size
FROM pg_class WHERE relname IN ('demo_path_ops', 'demo_default_ops') ORDER BY relname;
```

`demo_path_ops` nhỏ hơn rõ: nó chỉ lưu đường dẫn tới giá trị, không lưu riêng từng khóa.

## Lỗi hay gặp

Dùng `->` rồi so với một chuỗi thường: vế phải bị đọc như JSON và `Acme` không phải JSON hợp lệ.

```sql
-- ERROR 22P02: invalid input syntax for type json
SELECT count(*) FROM products WHERE doc -> 'brand' = 'Acme';
```

Dùng `->>` cho chữ (`doc ->> 'brand' = 'Acme'`), hoặc tốt hơn là `doc @> '{"brand":"Acme"}'`.

So giá dưới dạng chữ:

```sql
-- WRONG: text comparison, '20.99' > '150'
SELECT count(*) AS pricey FROM products WHERE doc ->> 'price' > '150';
```

```sql
-- FIX: cast to numeric before comparing
SELECT count(*) AS pricey FROM products WHERE (doc ->> 'price')::numeric > 150;
```

Câu sai đếm 14.200, câu đúng đếm 5.000.

Viết số thành chuỗi trong `@>`:

```sql
-- WRONG: "5.99" is a string, the stored price is a number
SELECT count(*) AS hits FROM products WHERE doc @> '{"price":"5.99"}';
```

```sql
-- FIX: write the number as a JSON number
SELECT count(*) AS hits FROM products WHERE doc @> '{"price":5.99}';
```

`@>` so cả kiểu: câu sai ra 0, câu đúng ra 100.

## Thực hành

20.000 sản phẩm lưu trong một cột `jsonb`, 1 % là hãng Acme. Đọc trường, tạo index `jsonb_path_ops`, lọc bằng `@>`, rồi viết bộ lọc hai thuộc tính đủ nhanh để qua thanh hiệu năng. Sau lab là hai câu hỏi.

## Tóm tắt

- `->` trả `jsonb`, `->>` trả `text`; so số thì ép kiểu trước.
- `@>` hỏi "chứa các cặp này" và so cả kiểu giá trị.
- GIN `jsonb_path_ops` nhỏ và nhanh cho `@>`; cần `?` thì dùng `jsonb_ops` mặc định.
- Index chỉ giúp toán tử của opclass: `doc ->> 'brand' = 'Acme'` không đi qua index GIN.

# EN

## Opening

Every product has its own attributes: shirts have sizes, bolts have diameters, and a column per attribute makes the table grow forever. Packing them into one `jsonb` column is tidy, but the filter "brand Acme, colour red" must then read all 20,000 documents. This lesson makes that filter use an index.

## Key idea

`jsonb` stores JSON already parsed into a binary form: fast to read, a duplicate key keeps only its last value, and no whitespace or key order is kept. The `json` type keeps the original text and parses it again on every read, so it is mostly used when you need that exact text.

Reading a field: `doc -> 'size'` returns `jsonb`, while `doc ->> 'size'` returns `text`. Since `->>` always yields text, comparing numbers needs a cast, for example `(doc ->> 'price')::numeric`. Asking "contains": `doc @> '{"size":"M"}'` is true when the document has that pair, and it compares the value's type too (the number `5.99` differs from the string `"5.99"`). Asking "has key": `doc ? 'brand'`.

A GIN index on `jsonb` has two opclasses. `jsonb_ops` (the default) stores one index key per key and per value, and serves `@>`, `?`, `?|`, `?&` and jsonpath. `jsonb_path_ops` stores one hash per path to a value: the index is smaller and `@>` is faster, but it cannot answer `?`. On this lesson's table the `jsonb_path_ops` version is about 1.3 MB and the default one about 1.8 MB.

Many people think that once column `doc` has an index, any query reading `doc` is fast. In fact an index only helps the operators of its opclass: `doc ->> 'brand' = 'Acme'` is a different expression that Postgres must compute for every row. To index that exact expression you need a B-tree expression index on `(doc ->> 'brand')`.

## Syntax

```sql
SELECT doc -> 'key' AS as_jsonb, doc ->> 'key' AS as_text FROM table_name;
SELECT ... WHERE doc @> '{"key": value [, ...]}';
CREATE INDEX index_name ON table_name USING gin ( doc [ jsonb_path_ops ] );
```

- `->`: get the value, keeping type `jsonb`.
- `->>`: get the value as `text`.
- `@>`: the document contains every listed key/value pair.
- `jsonb_path_ops`: smaller index, only for `@>` and jsonpath; leave it out for `jsonb_ops`.

## Example

Two ways to read a field, and the "has key" question:

```sql
SELECT doc -> 'size' AS as_jsonb, doc ->> 'size' AS as_text, doc ? 'brand' AS has_brand,
       pg_typeof(doc -> 'price') AS arrow_type, pg_typeof(doc ->> 'price') AS text_type
FROM products WHERE id = 5;
```

Both first columns show `M`, but one is `jsonb` and the other `text`.

`json` and `jsonb` differ on duplicate keys and whitespace:

```sql
SELECT '{"a":1, "a":2,  "b":3}'::json::text AS as_json, '{"a":1, "a":2,  "b":3}'::jsonb::text AS as_jsonb;
```

`json` gives the text back unchanged; `jsonb` keeps only `{"a": 2, "b": 3}`.

Create two indexes with the same content and different opclasses, then compare their sizes:

```sql
CREATE INDEX demo_path_ops ON products USING gin (doc jsonb_path_ops);
CREATE INDEX demo_default_ops ON products USING gin (doc);
SELECT relname, pg_size_pretty(pg_relation_size(oid)) AS size
FROM pg_class WHERE relname IN ('demo_path_ops', 'demo_default_ops') ORDER BY relname;
```

`demo_path_ops` is clearly smaller: it stores paths to values, not every key on its own.

## Common mistakes

Using `->` and comparing with a plain string: the right side is read as JSON, and `Acme` is not valid JSON.

```sql
-- ERROR 22P02: invalid input syntax for type json
SELECT count(*) FROM products WHERE doc -> 'brand' = 'Acme';
```

Use `->>` for text (`doc ->> 'brand' = 'Acme'`), or better `doc @> '{"brand":"Acme"}'`.

Comparing prices as text:

```sql
-- WRONG: text comparison, '20.99' > '150'
SELECT count(*) AS pricey FROM products WHERE doc ->> 'price' > '150';
```

```sql
-- FIX: cast to numeric before comparing
SELECT count(*) AS pricey FROM products WHERE (doc ->> 'price')::numeric > 150;
```

The wrong query counts 14,200, the right one 5,000.

Writing a number as a string inside `@>`:

```sql
-- WRONG: "5.99" is a string, the stored price is a number
SELECT count(*) AS hits FROM products WHERE doc @> '{"price":"5.99"}';
```

```sql
-- FIX: write the number as a JSON number
SELECT count(*) AS hits FROM products WHERE doc @> '{"price":5.99}';
```

`@>` compares types too: the wrong query finds 0, the right one 100.

## Practice

20,000 products live in a `jsonb` column, 1% of them Acme. Read fields, create a `jsonb_path_ops` index, filter with `@>`, then write a two-attribute filter fast enough to pass the performance bar. Two questions follow the lab.

## Recap

- `->` returns `jsonb`, `->>` returns `text`; cast before comparing numbers.
- `@>` asks "contains these pairs" and compares value types too.
- GIN `jsonb_path_ops` is small and fast for `@>`; if you need `?`, use the default `jsonb_ops`.
- An index only helps its opclass's operators: `doc ->> 'brand' = 'Acme'` does not go through the GIN index.
