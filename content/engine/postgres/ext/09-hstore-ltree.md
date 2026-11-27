---
id: e-pg-ext-09
engine: postgres
level: EXT
module: ext-types
title: "hstore và ltree: cặp khóa–giá trị và cây danh mục"
title_en: "hstore and ltree: key–value pairs and category trees"
kind: lab
runtime: browser
minutes: 16
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16)", date: "2026-11-26" }
figures:
  - { name: pg-ext-ltree-path, at: idea }
objectives:
  - vi: Đọc và lọc cặp khóa–giá trị trong `hstore` bằng `->`, `?` và `@>`, và biết khi nào chọn `jsonb` thay.
    en: Read and filter key–value pairs in `hstore` with `->`, `?` and `@>`, and know when to pick `jsonb` instead.
  - vi: Lưu cây danh mục bằng `ltree` và hỏi cả một nhánh bằng `<@`, không cần câu đệ quy.
    en: Store a category tree with `ltree` and ask for a whole branch with `<@`, with no recursive query.
  - vi: Tạo index GiST cho cột `ltree`.
    en: Create a GiST index for an `ltree` column.
sources:
  - { url: https://www.postgresql.org/docs/18/hstore.html, title_vi: "hstore" }
  - { url: https://www.postgresql.org/docs/18/ltree.html, title_vi: "ltree" }
  - { url: https://www.postgresql.org/docs/18/datatype-json.html, title_vi: "Kiểu JSON" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS hstore;
    CREATE EXTENSION IF NOT EXISTS ltree;
    CREATE TABLE products (
      id int PRIMARY KEY,
      name text NOT NULL,
      specs hstore NOT NULL,
      category ltree NOT NULL
    );
    INSERT INTO products VALUES
      (1, 'Den long Hoi An lua do', 'color=>do, size=>M, material=>lua', 'den_long.hoi_an.lua'),
      (2, 'Den long Hoi An lua vang', 'color=>vang, size=>L, material=>lua', 'den_long.hoi_an.lua'),
      (3, 'Den long Hoi An giay', 'color=>trang, size=>S, material=>giay', 'den_long.hoi_an.giay'),
      (4, 'Den long Hue tre', 'color=>nau, size=>L, material=>tre', 'den_long.hue.tre'),
      (5, 'Den ngu sac', 'color=>nhieu, size=>M', 'den_long.trung_thu'),
      (6, 'Day treo den', 'length=>5m', 'phu_kien.day'),
      (7, 'Moc treo', 'size=>S', 'phu_kien.moc');
  steps:
    - task:
        vi: "Cột `specs` của `products` là `hstore`. Lấy các món có `material` là `lua`: `id`, `name`, sắp theo `id`."
        en: "Column `specs` of `products` is an `hstore`. Return the products whose `material` is `lua`: `id`, `name`, ordered by `id`."
      solution: SELECT id, name FROM products WHERE specs -> 'material' = 'lua' ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`specs -> 'material'` trả giá trị của khóa đó dưới dạng `text`."
        en: "`specs -> 'material'` returns that key's value as `text`."
    - task:
        vi: "Lấy các món không ghi khóa `material` nào: `id`, `name`, sắp theo `id`."
        en: "Return the products that have no `material` key at all: `id`, `name`, ordered by `id`."
      solution: SELECT id, name FROM products WHERE NOT specs ? 'material' ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`specs ? 'material'` hỏi khóa có tồn tại không; đặt `NOT` trước."
        en: "`specs ? 'material'` asks whether the key exists; put `NOT` in front."
    - task:
        vi: "Cột `category` là `ltree`. Lấy mọi món nằm dưới nhánh `den_long.hoi_an`: `id`, `name`, sắp theo `id`."
        en: "Column `category` is an `ltree`. Return every product under the branch `den_long.hoi_an`: `id`, `name`, ordered by `id`."
      solution: SELECT id, name FROM products WHERE category <@ 'den_long.hoi_an' ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`category <@ 'den_long.hoi_an'`: nằm dưới (hoặc chính là) nút đó."
        en: "`category <@ 'den_long.hoi_an'`: under (or equal to) that node."
    - task:
        vi: "Đếm số món theo nhãn gốc của danh mục: cột `top` (nhãn đầu tiên) và `n`, sắp theo `top`."
        en: "Count the products per root label of their category: columns `top` (the first label) and `n`, ordered by `top`."
      solution: SELECT subpath(category, 0, 1) AS top, count(*) AS n FROM products GROUP BY top ORDER BY top
      check: rows
      ordered: true
      hint:
        vi: "`subpath(category, 0, 1)` lấy nhãn đầu tiên."
        en: "`subpath(category, 0, 1)` takes the first label."
    - task:
        vi: "Tạo index GiST tên `products_category_gist` trên `category`, để `<@` không phải đọc cả bảng khi danh mục nhiều lên."
        en: "Create a GiST index named `products_category_gist` on `category`, so `<@` need not read the whole table as the catalogue grows."
      solution: CREATE INDEX products_category_gist ON products USING gist (category)
      target: SELECT id FROM products WHERE category <@ 'den_long.hoi_an'
      check: catalog
      hint:
        vi: "`CREATE INDEX name ON table USING gist (col)`."
        en: "`CREATE INDEX name ON table USING gist (col)`."
quiz:
  - q:
      vi: "Món 6 không có khóa `material`. Câu `WHERE specs -> 'material' <> 'lua'` có trả món 6 không?"
      en: "Product 6 has no `material` key. Does `WHERE specs -> 'material' <> 'lua'` return product 6?"
    options:
      - { vi: "Có: không có khóa thì giá trị khác `lua`, điều kiện đúng", en: "Yes: no key means the value is not `lua`, so the condition holds" }
      - { vi: "Không: khóa thiếu cho `NULL`, và `NULL <> 'lua'` không đúng", en: "No: a missing key gives `NULL`, and `NULL <> 'lua'` is not true" }
      - { vi: "Báo lỗi, vì khóa `material` không có trong giá trị `hstore`", en: "An error, because key `material` is missing from the `hstore` value" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì \"không có\" nghe như \"khác\", nhưng `->` trả `NULL` cho khóa thiếu, và so sánh với `NULL` cho `NULL`, nên dòng bị loại. Muốn gồm cả món không ghi chất liệu: `NOT specs @> 'material=>lua'`."
      en: "It sounds right because \"missing\" feels like \"different\", but `->` returns `NULL` for a missing key, and comparing with `NULL` gives `NULL`, so the row is dropped. To include products with no material: `NOT specs @> 'material=>lua'`."
  - q:
      vi: "Thông số hàng mới cần giá trị lồng nhau (kích thước có rộng và cao) và số thật. Nên lưu bằng gì?"
      en: "New product specs need nested values (a size with width and height) and real numbers. What should store them?"
    options:
      - { vi: "`hstore`, vì nó là extension sinh ra riêng cho cặp khóa–giá trị", en: "`hstore`, since it is the extension made for key–value pairs" }
      - { vi: "Một cột `text` cho từng thông số, thêm cột khi có khóa mới", en: "One `text` column per spec, adding a column for each new key" }
      - { vi: "`jsonb`: lồng được, có số và đúng/sai, không cần extension", en: "`jsonb`: it nests, has numbers and booleans, and needs no extension" }
    answer: 2
    trap: 0
    why:
      vi: "hstore nghe hợp lý vì nó làm đúng việc cặp khóa–giá trị, nhưng chỉ một tầng và mọi giá trị là chuỗi. `jsonb` là kiểu lõi, lồng được, có kiểu số, và có cùng các toán tử `?`, `@>` với index GIN. hstore vẫn ổn cho dữ liệu cũ phẳng."
      en: "hstore sounds right because it does key–value pairs exactly, but it is one level deep and every value is a string. `jsonb` is a core type, nests, has numeric types, and offers the same `?`, `@>` operators with GIN indexes. hstore is still fine for old flat data."
---
## Mở bài

Mỗi món ở Chợ Lồng Đèn có thông số riêng: đèn có màu và chất liệu, dây treo có chiều dài. Danh mục lại là cây: đèn lồng, rồi Hội An, rồi lụa. Hai extension cũ của Postgres giải hai việc này mà không cần thêm bảng.

## Ý chính

`hstore` lưu một tập cặp khóa–giá trị dạng chuỗi trong một cột. `specs -> 'color'` đọc một giá trị, `specs ? 'material'` hỏi khóa có không, `specs @> 'material=>lua'` hỏi có chứa cặp đó không, và index GIN giúp hai toán tử sau. Nhiều người nghĩ khóa thiếu nghĩa là giá trị "khác". Thật ra `->` trả `NULL` cho khóa thiếu, nên `specs -> 'material' <> 'lua'` bỏ sót món không ghi chất liệu. Ngày nay `jsonb` là kiểu lõi làm được việc của `hstore` và hơn thế (lồng nhau, số, đúng/sai), nên dữ liệu mới thường dùng `jsonb`.

`ltree` lưu một đường đi nhãn như `den_long.hoi_an.lua`. Vì cả đường đi nằm trong giá trị, hỏi một nhánh chỉ là một điều kiện: `category <@ 'den_long.hoi_an'` là "nằm dưới hoặc chính là nút đó". `lquery` cho mẫu như `'den_long.*.lua'`, `nlevel` đếm số nhãn, `subpath` cắt một đoạn. Index GiST giúp `<@`, `@>` và `~`. Đổi lại, dời một nhánh nghĩa là sửa đường đi của mọi dòng trong nhánh đó.

## Cú pháp

```sql
SELECT specs -> 'color',
       specs ? 'size',
       specs @> 'material=>lua'
FROM products;
SELECT * FROM products
WHERE category <@ 'den_long.hoi_an';
SELECT * FROM products
WHERE category ~ 'den_long.*.lua';
CREATE INDEX ON products
  USING gist (category);
```

- `->`: giá trị của khóa (`NULL` nếu thiếu); `?`: có khóa; `@>`: có cặp.
- `<@`: nằm dưới nút; `~`: khớp mẫu `lquery`.
- `nlevel`, `subpath`: đếm và cắt nhãn.

## Ví dụ

Màu của các món có ghi màu:

```sql
SELECT name, specs -> 'color' AS color
FROM products
WHERE specs ? 'color'
ORDER BY id
LIMIT 3;
```

Ba món đầu và màu của chúng.

Cùng thông số dưới dạng `jsonb`:

```sql
SELECT id, hstore_to_jsonb(specs)
  AS specs_json
FROM products
WHERE id = 1;
```

Một đối tượng JSON với ba khóa, mọi giá trị là chuỗi.

Độ sâu danh mục của các món đèn:

```sql
SELECT name, nlevel(category) AS depth
FROM products
WHERE category <@ 'den_long'
ORDER BY id;
```

Năm món; đèn ngũ sắc ở độ sâu 2, các món khác ở độ sâu 3.

Mẫu `lquery`: đèn lụa ở bất kỳ vùng nào:

```sql
SELECT name
FROM products
WHERE category ~ 'den_long.*.lua'
ORDER BY id;
```

Hai món đèn lụa Hội An.

## Lỗi hay gặp

Lọc "khác" trên khóa có thể thiếu:

```sql
-- WRONG: missing keys are dropped
SELECT id FROM products
WHERE specs -> 'material' <> 'lua'
ORDER BY id;
```

```sql
-- FIX: ask about the pair instead
SELECT id FROM products
WHERE NOT specs @> 'material=>lua'
ORDER BY id;
```

Câu sai ra 3 và 4; câu đúng thêm 5, 6, 7 là các món không ghi chất liệu.

Nhãn có dấu cách:

```sql
-- ERROR 42601:
SELECT 'den_long.hoi an'::ltree;
```

Nhãn chỉ gồm chữ, số, `_` và `-`; viết `hoi_an`.

## Thực hành

Năm bước: lọc theo một khóa `hstore`, tìm món thiếu khóa, lấy một nhánh danh mục bằng `<@`, đếm theo nhãn gốc, rồi tạo index GiST. Sau lab là hai câu hỏi.

## Tóm tắt

- `hstore`: `->` đọc giá trị, `?` hỏi khóa, `@>` hỏi cặp; khóa thiếu cho `NULL`.
- Dữ liệu mới, lồng nhau hay có số: dùng `jsonb`, kiểu lõi.
- `ltree` lưu cả đường đi; `<@` lấy một nhánh không cần câu đệ quy.
- Index GiST giúp `<@`, `@>`, `~` trên `ltree`.

# EN

## Opening

Every item at Lantern Market has its own specs: a lantern has a colour and a material, a hanging cord has a length. The categories are a tree: lanterns, then Hoi An, then silk. Two long-standing Postgres extensions handle both without extra tables.

## Key idea

`hstore` stores a set of string key–value pairs in one column. `specs -> 'color'` reads one value, `specs ? 'material'` asks whether a key exists, `specs @> 'material=>lua'` asks whether it contains that pair, and a GIN index helps the last two. Many people think a missing key means a "different" value. In fact `->` returns `NULL` for a missing key, so `specs -> 'material' <> 'lua'` misses the items with no material. Today `jsonb` is a core type that does what `hstore` does and more (nesting, numbers, booleans), so new data usually goes to `jsonb`.

`ltree` stores a path of labels such as `den_long.hoi_an.lua`. Because the whole path sits in the value, asking for a branch is a single condition: `category <@ 'den_long.hoi_an'` means "under or equal to that node". `lquery` gives patterns such as `'den_long.*.lua'`, `nlevel` counts labels, `subpath` cuts out a part. A GiST index helps `<@`, `@>` and `~`. In exchange, moving a branch means rewriting the path of every row in it.

## Syntax

```sql
SELECT specs -> 'color',
       specs ? 'size',
       specs @> 'material=>lua'
FROM products;
SELECT * FROM products
WHERE category <@ 'den_long.hoi_an';
SELECT * FROM products
WHERE category ~ 'den_long.*.lua';
CREATE INDEX ON products
  USING gist (category);
```

- `->`: the key's value (`NULL` if missing); `?`: has the key; `@>`: has the pair.
- `<@`: under the node; `~`: matches an `lquery` pattern.
- `nlevel`, `subpath`: count and cut labels.

## Example

The colour of the items that record one:

```sql
SELECT name, specs -> 'color' AS color
FROM products
WHERE specs ? 'color'
ORDER BY id
LIMIT 3;
```

The first three items and their colours.

The same specs as `jsonb`:

```sql
SELECT id, hstore_to_jsonb(specs)
  AS specs_json
FROM products
WHERE id = 1;
```

One JSON object with three keys, every value a string.

The category depth of the lanterns:

```sql
SELECT name, nlevel(category) AS depth
FROM products
WHERE category <@ 'den_long'
ORDER BY id;
```

Five items; the five-colour lantern is at depth 2, the others at depth 3.

An `lquery` pattern: silk lanterns from any region:

```sql
SELECT name
FROM products
WHERE category ~ 'den_long.*.lua'
ORDER BY id;
```

The two Hoi An silk lanterns.

## Common mistakes

Filtering "different" on a key that may be missing:

```sql
-- WRONG: missing keys are dropped
SELECT id FROM products
WHERE specs -> 'material' <> 'lua'
ORDER BY id;
```

```sql
-- FIX: ask about the pair instead
SELECT id FROM products
WHERE NOT specs @> 'material=>lua'
ORDER BY id;
```

The wrong query gives 3 and 4; the right one adds 5, 6 and 7, the items with no material.

A label with a space:

```sql
-- ERROR 42601:
SELECT 'den_long.hoi an'::ltree;
```

Labels hold only letters, digits, `_` and `-`; write `hoi_an`.

## Practice

Five steps: filter by an `hstore` key, find items missing a key, take a category branch with `<@`, count per root label, then create a GiST index. Two questions follow the lab.

## Recap

- `hstore`: `->` reads a value, `?` asks for a key, `@>` asks for a pair; a missing key gives `NULL`.
- New, nested or numeric data: use `jsonb`, a core type.
- `ltree` stores the whole path; `<@` takes a branch with no recursive query.
- A GiST index helps `<@`, `@>` and `~` on `ltree`.
