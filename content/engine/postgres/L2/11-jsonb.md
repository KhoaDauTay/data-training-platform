---
id: e-pg-l2-11
engine: postgres
level: L2
module: search
title: jsonb và jsonb_path_ops
title_en: jsonb and jsonb_path_ops
kind: lab
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-gin
objectives:
  - vi: Đọc trường trong `jsonb` bằng `->` và `->>`, lọc bằng `@>`.
    en: Read `jsonb` fields with `->` and `->>`, and filter with `@>`.
  - vi: Chọn `jsonb_path_ops` (nhỏ, nhanh, chỉ `@>` và jsonpath) hay `jsonb_ops` mặc định (thêm `?`, `?|`, `?&`) cho index GIN.
    en: Choose between `jsonb_path_ops` (smaller, faster, only `@>` and jsonpath) and the default `jsonb_ops` (also `?`, `?|`, `?&`) for a GIN index.
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
        vi: "Lấy `id`, tên (dạng chữ) và giá (dạng `numeric`) của 3 sản phẩm có `id` nhỏ nhất, sắp theo `id`."
        en: "Return the `id`, the name (as text) and the price (as `numeric`) of the 3 products with the smallest `id`, ordered by `id`."
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
        vi: "`doc @> '{...}'`: tài liệu chứa mọi cặp khóa/giá trị đã cho. `doc ->> 'brand' = 'Acme'` thì không dùng được index GIN này."
        en: "`doc @> '{...}'`: the document contains every listed key/value pair. `doc ->> 'brand' = 'Acme'` cannot use this GIN index."
---
## Ý chính

`jsonb` lưu JSON đã phân tích sẵn ở dạng nhị phân: đọc nhanh, khóa không trùng, không giữ khoảng trắng hay thứ tự khóa. (`json` giữ nguyên chữ gốc, hầu như chỉ dùng khi cần đúng văn bản ban đầu.)

- `doc -> 'size'` trả `jsonb`; `doc ->> 'size'` trả `text`.
- `doc @> '{"size":"M"}'`: tài liệu chứa cặp đó.
- `doc ? 'brand'`: có khóa `brand`.

Index GIN cho `jsonb` có hai opclass:

- `jsonb_ops` (mặc định): một khóa index cho mỗi khóa và mỗi giá trị. Phục vụ `@>`, `?`, `?|`, `?&` và jsonpath.
- `jsonb_path_ops`: một mã băm cho mỗi đường dẫn tới giá trị. Index nhỏ hơn và tìm `@>` nhanh hơn, nhưng không phục vụ `?` (có khóa hay không).

Cả hai chỉ giúp các toán tử trên. `doc ->> 'brand' = 'Acme'` là một biểu thức khác; muốn index nó thì cần index biểu thức B-tree trên `(doc ->> 'brand')`.

## Ví dụ

```sql
SELECT doc -> 'size' AS as_jsonb, doc ->> 'size' AS as_text, doc ? 'brand' AS has_brand
FROM products WHERE id = 5;
```

## Thực hành

20 000 sản phẩm lưu trong một cột `jsonb`, 1% là hãng Acme. Đọc trường, tạo index `jsonb_path_ops`, rồi lọc bằng `@>`.

# EN

## Key idea

`jsonb` stores JSON already parsed into a binary form: fast to read, no duplicate keys, no whitespace or key order kept. (`json` keeps the original text and is mostly used when you need that exact text.)

- `doc -> 'size'` returns `jsonb`; `doc ->> 'size'` returns `text`.
- `doc @> '{"size":"M"}'`: the document contains that pair.
- `doc ? 'brand'`: the key `brand` exists.

A GIN index on `jsonb` has two opclasses:

- `jsonb_ops` (default): one index key per key and per value. Serves `@>`, `?`, `?|`, `?&` and jsonpath.
- `jsonb_path_ops`: one hash per path to a value. Smaller and faster for `@>`, but it does not serve `?` (key exists).

Both only help those operators. `doc ->> 'brand' = 'Acme'` is a different expression; to index it you need a B-tree expression index on `(doc ->> 'brand')`.

## Example

```sql
SELECT doc -> 'size' AS as_jsonb, doc ->> 'size' AS as_text, doc ? 'brand' AS has_brand
FROM products WHERE id = 5;
```

## Practice

20,000 products live in a `jsonb` column, 1% of them Acme. Read fields, create a `jsonb_path_ops` index, then filter with `@>`.
