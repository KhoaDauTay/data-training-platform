---
id: e-pg-ext-04
engine: postgres
level: EXT
module: ext-vector
title: "pgvector: tìm hàng \"giống\" bằng vector"
title_en: "pgvector: find \"similar\" products with vectors"
kind: lab
runtime: browser
minutes: 18
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16), pgvector 0.8.7", date: "2026-11-26" }
figures:
  - { name: pg-ext-vector-knn, at: idea }
objectives:
  - vi: Lưu vector trong cột `vector(n)` và tìm k hàng gần nhất bằng `ORDER BY ... LIMIT k`.
    en: Store vectors in a `vector(n)` column and find the k nearest rows with `ORDER BY ... LIMIT k`.
  - vi: Phân biệt khoảng cách cosine `<=>` và L2 `<->`, và thấy chúng chọn hàng khác nhau.
    en: Tell cosine distance `<=>` from L2 distance `<->`, and see that they pick different rows.
  - vi: Tạo index HNSW có lớp toán tử khớp với câu hỏi, và biết kết quả của nó là gần đúng.
    en: Create an HNSW index whose operator class matches the query, and know its result is approximate.
sources:
  - { url: https://github.com/pgvector/pgvector, title_vi: "pgvector trên GitHub" }
  - { url: https://www.npmjs.com/package/@electric-sql/pglite-pgvector, title_vi: "Gói npm pglite-pgvector" }
  - { url: https://www.postgresql.org/docs/18/indexes-ordering.html, title_vi: "Index và ORDER BY" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE products (
      id int PRIMARY KEY,
      name text NOT NULL,
      taste vector(4) NOT NULL
    );
    INSERT INTO products VALUES
      (1, 'Den long Hoi An lua do', '[0.9,0.9,0.6,0.5]'),
      (2, 'Den long Hoi An lua vang', '[0.9,0.7,0.6,0.5]'),
      (3, 'Den long tre lon', '[0.8,0.2,0.5,0.9]'),
      (4, 'Den giay xep nho', '[0.7,0.4,0.1,0.2]'),
      (5, 'Den long lua tim', '[0.85,0.8,0.7,0.4]'),
      (6, 'Den ong tre', '[0.6,0.3,0.3,0.6]');
    SELECT setseed(0.43);
    INSERT INTO products
    SELECT g, 'Mat hang ' || g,
      ('[' || round((random() * 0.2)::numeric, 3) || ',' || round(random()::numeric, 3) || ','
           || round(random()::numeric, 3) || ',' || round(random()::numeric, 3) || ']')::vector
    FROM generate_series(7, 3000) AS g;
    ANALYZE products;
  steps:
    - task:
        vi: "Cột `taste` của `products` là vector 4 chiều do chúng tôi tự viết (kiểu đèn, màu, mức giá, cỡ), không lấy từ mô hình nào. Tìm 5 hàng khác giống hàng 1 nhất theo khoảng cách cosine: `id`, `name`, gần trước."
        en: "Column `taste` of `products` is a 4-dimension vector we wrote by hand (lantern style, colour, price band, size), not taken from any model. Find the 5 other products most similar to product 1 by cosine distance: `id`, `name`, nearest first."
      solution: |-
        SELECT id, name FROM products WHERE id <> 1
        ORDER BY taste <=> (SELECT taste FROM products WHERE id = 1)
        LIMIT 5
      check: rows
      ordered: true
      hint:
        vi: "`ORDER BY taste <=> (SELECT taste FROM products WHERE id = 1) LIMIT 5`, bỏ chính hàng 1 bằng `WHERE id <> 1`."
        en: "`ORDER BY taste <=> (SELECT taste FROM products WHERE id = 1) LIMIT 5`, leaving out product 1 itself with `WHERE id <> 1`."
    - task:
        vi: "Cùng câu hỏi nhưng theo khoảng cách L2 (đường thẳng): 5 hàng khác gần hàng 1 nhất, `id`, `name`, gần trước. So với bước trước."
        en: "The same question with L2 (straight-line) distance: the 5 other products nearest to product 1, `id`, `name`, nearest first. Compare with the previous step."
      solution: |-
        SELECT id, name FROM products WHERE id <> 1
        ORDER BY taste <-> (SELECT taste FROM products WHERE id = 1)
        LIMIT 5
      check: rows
      ordered: true
      hint:
        vi: "Đổi `<=>` thành `<->`."
        en: "Change `<=>` to `<->`."
      fact:
        vi: "Cosine chỉ nhìn hướng của vector, L2 nhìn cả độ dài: hai danh sách không giống nhau. Chọn khoảng cách theo cách vector được tạo ra; với vector từ mô hình, tài liệu của mô hình thường nói nên dùng cái nào."
        en: "Cosine looks only at the direction of a vector, L2 also at its length: the two lists differ. Pick the distance to match how the vectors were made; for vectors from a model, its documentation usually says which one to use."
    - task:
        vi: "Tạo index HNSW tên `products_taste_hnsw` trên `taste` cho khoảng cách cosine."
        en: "Create an HNSW index named `products_taste_hnsw` on `taste` for cosine distance."
      solution: CREATE INDEX products_taste_hnsw ON products USING hnsw (taste vector_cosine_ops)
      target: SELECT id FROM products ORDER BY taste <=> '[0.9,0.9,0.6,0.5]' LIMIT 5
      check: catalog
      hint:
        vi: "`CREATE INDEX name ON table USING hnsw (col vector_cosine_ops)`."
        en: "`CREATE INDEX name ON table USING hnsw (col vector_cosine_ops)`."
    - task:
        vi: "Lấy `id` của 5 hàng gần vector `[0.9,0.9,0.6,0.5]` nhất theo cosine. Kế hoạch phải đọc `products_taste_hnsw` theo thứ tự khoảng cách, không có Sort."
        en: "Return the `id` of the 5 products nearest to vector `[0.9,0.9,0.6,0.5]` by cosine. The plan must read `products_taste_hnsw` in distance order, with no Sort."
      solution: SELECT id FROM products ORDER BY taste <=> '[0.9,0.9,0.6,0.5]' LIMIT 5
      check: plan
      ordered: true
      hint:
        vi: "Toán tử trong `ORDER BY` phải khớp lớp toán tử của index: `vector_cosine_ops` đi với `<=>`."
        en: "The operator in `ORDER BY` must match the index's operator class: `vector_cosine_ops` goes with `<=>`."
quiz:
  - q:
      vi: "Index HNSW tạo với `vector_cosine_ops`. Câu tìm hàng gần nhất lại sắp theo `taste <-> q`. Kế hoạch ra sao?"
      en: "The HNSW index was created with `vector_cosine_ops`. The nearest-product query sorts by `taste <-> q`. What does the plan do?"
    options:
      - { vi: "Seq Scan rồi Sort: index chỉ phục vụ toán tử của lớp nó", en: "Seq Scan, then Sort: the index serves only its class's operator" }
      - { vi: "Index Scan vẫn dùng được, vì hai khoảng cách gần như nhau", en: "Index Scan still works, since the two distances are close enough" }
      - { vi: "Báo lỗi vì toán tử trong câu không khớp với index đã tạo", en: "An error, because the query's operator does not match the index" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì cả hai đều là \"khoảng cách\", nhưng index chỉ biết sắp theo toán tử của lớp nó được tạo (`<=>` cho `vector_cosine_ops`). Câu dùng `<->` vẫn đúng kết quả, chỉ là đọc hết bảng. Muốn cả hai thì cần hai index."
      en: "It sounds right because both are \"distances\", but an index can only order by the operator of the class it was built with (`<=>` for `vector_cosine_ops`). The `<->` query still gives correct results, it just reads the whole table. To serve both you need two indexes."
  - q:
      vi: "Sau khi có index HNSW, top 5 có thể khác một chút so với lúc chưa có index. Vì sao?"
      en: "Once the HNSW index exists, the top 5 can differ slightly from the result without it. Why?"
    options:
      - { vi: "Index giữ vector đã làm tròn, nên khoảng cách bị lệch đi", en: "The index stores rounded vectors, so the distances drift a bit" }
      - { vi: "HNSW là tìm gần đúng: nó chỉ đo các điểm trên đường đi qua lớp", en: "HNSW is approximate: it only measures points on its walk through layers" }
      - { vi: "`ANALYZE` chưa chạy lại sau khi tạo index, nên thống kê cũ", en: "`ANALYZE` was not rerun after the index, so the statistics are stale" }
    answer: 1
    trap: 0
    why:
      vi: "Làm tròn nghe hợp lý, nhưng index lưu đúng vector. HNSW đổi độ chính xác lấy tốc độ: nó không đo mọi điểm, nên đôi khi bỏ sót một hàng gần. `hnsw.ef_search` (mặc định 40) tăng thì kết quả sát hơn và chậm hơn."
      en: "Rounding sounds plausible, but the index stores the exact vectors. HNSW trades accuracy for speed: it does not measure every point, so it can miss a near row. Raising `hnsw.ef_search` (default 40) gets closer results and slower queries."
---
## Mở bài

Khách xem "Đèn lồng Hội An lụa đỏ" ở Chợ Lồng Đèn; trang cần gợi ý vài món "giống". Giống theo nghĩa nào, và làm sao tìm nhanh trong hàng nghìn món mà không so từng cặp?

## Ý chính

pgvector thêm kiểu `vector(n)`: một dãy n số thực. Mỗi món hàng là một điểm trong không gian n chiều, và "giống" là "gần". Ở đây vector chỉ có 4 chiều do chúng tôi tự viết (kiểu đèn, màu, mức giá, cỡ) để dễ đọc; vector thật thường đến từ một mô hình học máy và có hàng trăm chiều.

Toán tử khoảng cách: `<->` là L2 (đường thẳng), `<=>` là cosine (chỉ xét hướng), `<#>` là tích vô hướng đổi dấu, `<+>` là L1. Tìm k hàng gần nhất là `ORDER BY taste <=> q LIMIT k`. Nhiều người nghĩ khoảng cách nào cũng cho cùng danh sách. Thật ra cosine bỏ qua độ dài vector còn L2 thì không, nên hai câu có thể chọn hàng khác nhau.

Không index thì Postgres đo khoảng cách tới mọi dòng rồi sắp. Index HNSW xếp các điểm thành nhiều lớp: lớp trên thưa, lớp đáy đủ. Câu tìm đi từ lớp trên xuống, mỗi lớp tiến tới điểm gần hơn, nên chỉ đo vài trăm điểm. Đổi lại, kết quả là gần đúng. Index được tạo cho một lớp toán tử (`vector_cosine_ops`, `vector_l2_ops`…) và chỉ phục vụ đúng toán tử đó.

## Cú pháp

```sql
CREATE EXTENSION vector;
CREATE TABLE t (
  id int PRIMARY KEY,
  v vector(4));
SELECT id FROM t
ORDER BY v <=> '[1,0,0,0]'
LIMIT 5;
CREATE INDEX ON t
  USING hnsw (v vector_cosine_ops);
SET hnsw.ef_search = 100;
```

- `<=>` cosine, `<->` L2, `<#>` tích vô hướng đổi dấu, `<+>` L1.
- `vector_cosine_ops` đi với `<=>`; `vector_l2_ops` đi với `<->`.
- `hnsw.ef_search`: số ứng viên khi tìm (mặc định 40); lớn hơn thì sát hơn, chậm hơn.

## Ví dụ

Vector của ba món đèn:

```sql
SELECT id, name, taste
FROM products
WHERE id IN (1, 2, 3)
ORDER BY id;
```

Món 1 và 2 chỉ khác chiều màu; món 3 khác hẳn ở cỡ.

Ba món gần món 1 nhất theo L2, chưa có index:

```sql
SELECT id, name,
  round((taste <-> '[0.9,0.9,0.6,0.5]')
    ::numeric, 3) AS dist
FROM products
WHERE id <> 1
ORDER BY dist
LIMIT 3;
```

Hai món đèn lụa đứng đầu: `Den long lua tim` và `Den long Hoi An lua vang`.

Tạo index HNSW rồi xem kế hoạch:

```sql
CREATE INDEX demo_hnsw ON products
  USING hnsw (taste vector_cosine_ops);
EXPLAIN (COSTS OFF)
SELECT id FROM products
ORDER BY taste <=> '[0.9,0.9,0.6,0.5]'
LIMIT 5;
```

`Limit` trên `Index Scan using demo_hnsw` với dòng `Order By`: không còn `Sort`.

## Lỗi hay gặp

So hai vector khác số chiều:

```sql
-- ERROR 22000:
SELECT '[0.9,0.9]'::vector
  <=> '[0.9,0.9,0.6,0.5]'::vector;
```

Vector truy vấn phải cùng số chiều với cột; vector từ hai mô hình khác nhau không so được với nhau.

Sắp theo toán tử khác lớp của index:

```sql
-- WRONG: L2 cannot use a cosine index
EXPLAIN (COSTS OFF)
SELECT id FROM products
ORDER BY taste <-> '[0.9,0.9,0.6,0.5]'
LIMIT 5;
```

```sql
-- FIX: the operator of the index
EXPLAIN (COSTS OFF)
SELECT id FROM products
ORDER BY taste <=> '[0.9,0.9,0.6,0.5]'
LIMIT 5;
```

Câu sai ra `Seq Scan` và `Sort` dù index đã có; câu đúng đọc `demo_hnsw`.

## Thực hành

3 000 món hàng với vector 4 chiều. Tìm 5 món giống món 1 theo cosine, rồi theo L2, so hai danh sách, tạo index HNSW, và viết câu tìm đi qua index. Sau lab là hai câu hỏi.

## Tóm tắt

- `vector(n)` lưu một điểm n chiều; k hàng gần nhất là `ORDER BY ... LIMIT k`.
- `<=>` (cosine) và `<->` (L2) có thể chọn hàng khác nhau; chọn theo cách vector được tạo.
- Index HNSW chỉ phục vụ toán tử của lớp nó: `vector_cosine_ops` với `<=>`.
- HNSW cho kết quả gần đúng; `hnsw.ef_search` đổi tốc độ lấy độ sát.

# EN

## Opening

A customer views "Hoi An silk lantern, red" at Lantern Market; the page should suggest a few "similar" items. Similar in what sense, and how do you find them quickly among thousands of items without comparing every pair?

## Key idea

pgvector adds the type `vector(n)`: a list of n real numbers. Each product is a point in n-dimensional space, and "similar" means "near". Here the vectors have only 4 dimensions that we wrote by hand (lantern style, colour, price band, size) so they are easy to read; real vectors usually come from a machine-learning model and have hundreds of dimensions.

Distance operators: `<->` is L2 (straight line), `<=>` is cosine (direction only), `<#>` is the negative inner product, `<+>` is L1. Finding the k nearest rows is `ORDER BY taste <=> q LIMIT k`. Many people think every distance gives the same list. In fact cosine ignores a vector's length and L2 does not, so the two queries can pick different rows.

Without an index Postgres measures the distance to every row and sorts. An HNSW index arranges the points in several layers: the top layer is sparse, the bottom one complete. A search walks down from the top, moving to a closer point on each layer, so it measures only a few hundred points. In exchange, the result is approximate. The index is built for one operator class (`vector_cosine_ops`, `vector_l2_ops`…) and serves only that operator.

## Syntax

```sql
CREATE EXTENSION vector;
CREATE TABLE t (
  id int PRIMARY KEY,
  v vector(4));
SELECT id FROM t
ORDER BY v <=> '[1,0,0,0]'
LIMIT 5;
CREATE INDEX ON t
  USING hnsw (v vector_cosine_ops);
SET hnsw.ef_search = 100;
```

- `<=>` cosine, `<->` L2, `<#>` negative inner product, `<+>` L1.
- `vector_cosine_ops` goes with `<=>`; `vector_l2_ops` goes with `<->`.
- `hnsw.ef_search`: candidates kept while searching (default 40); larger is closer and slower.

## Example

The vectors of three lanterns:

```sql
SELECT id, name, taste
FROM products
WHERE id IN (1, 2, 3)
ORDER BY id;
```

Items 1 and 2 differ only in colour; item 3 is very different in size.

The three items nearest to item 1 by L2, with no index yet:

```sql
SELECT id, name,
  round((taste <-> '[0.9,0.9,0.6,0.5]')
    ::numeric, 3) AS dist
FROM products
WHERE id <> 1
ORDER BY dist
LIMIT 3;
```

The two silk lanterns come first: `Den long lua tim` and `Den long Hoi An lua vang`.

Create an HNSW index, then look at the plan:

```sql
CREATE INDEX demo_hnsw ON products
  USING hnsw (taste vector_cosine_ops);
EXPLAIN (COSTS OFF)
SELECT id FROM products
ORDER BY taste <=> '[0.9,0.9,0.6,0.5]'
LIMIT 5;
```

A `Limit` over an `Index Scan using demo_hnsw` with an `Order By` line: no `Sort` any more.

## Common mistakes

Comparing two vectors with different dimensions:

```sql
-- ERROR 22000:
SELECT '[0.9,0.9]'::vector
  <=> '[0.9,0.9,0.6,0.5]'::vector;
```

The query vector must have as many dimensions as the column; vectors from two different models cannot be compared.

Sorting by an operator outside the index's class:

```sql
-- WRONG: L2 cannot use a cosine index
EXPLAIN (COSTS OFF)
SELECT id FROM products
ORDER BY taste <-> '[0.9,0.9,0.6,0.5]'
LIMIT 5;
```

```sql
-- FIX: the operator of the index
EXPLAIN (COSTS OFF)
SELECT id FROM products
ORDER BY taste <=> '[0.9,0.9,0.6,0.5]'
LIMIT 5;
```

The wrong query gives `Seq Scan` and `Sort` although the index exists; the right one reads `demo_hnsw`.

## Practice

3,000 products with 4-dimension vectors. Find the 5 items most similar to item 1 by cosine, then by L2, compare the lists, create an HNSW index, and write a search that goes through it. Two questions follow the lab.

## Recap

- `vector(n)` stores an n-dimensional point; the k nearest rows are `ORDER BY ... LIMIT k`.
- `<=>` (cosine) and `<->` (L2) can pick different rows; choose by how the vectors were made.
- An HNSW index serves only its class's operator: `vector_cosine_ops` with `<=>`.
- HNSW results are approximate; `hnsw.ef_search` trades speed for closeness.
