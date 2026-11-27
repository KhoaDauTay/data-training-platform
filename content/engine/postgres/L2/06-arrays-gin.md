---
id: e-pg-l2-06
engine: postgres
level: L2
module: index-types
title: Mảng và index GIN
title_en: Arrays and GIN indexes
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-gin-postings
objectives:
  - vi: Lưu nhãn trong cột mảng và lọc bằng `= ANY`, `@>` và `&&`.
    en: Store tags in an array column and filter with `= ANY`, `@>` and `&&`.
  - vi: Tạo index GIN cho mảng và viết điều kiện bằng toán tử mà GIN hiểu.
    en: Create a GIN index on an array and write the filter with an operator GIN understands.
  - vi: Phân biệt "chứa các nhãn này" (`@>`) với "đúng mảng này" (`=`).
    en: Tell "contains these tags" (`@>`) apart from "is exactly this array" (`=`).
requires: [e-pg-l2-05]
sources:
  - { url: https://www.postgresql.org/docs/18/arrays.html, title_vi: "Mảng" }
  - { url: https://www.postgresql.org/docs/18/functions-array.html, title_vi: "Hàm và toán tử mảng" }
  - { url: https://www.postgresql.org/docs/18/gin.html, title_vi: "Index GIN" }
lab:
  setup: |
    CREATE TABLE posts (
      id int PRIMARY KEY,
      title text NOT NULL,
      tags text[] NOT NULL
    );
    INSERT INTO posts
    SELECT g, 'Post ' || g,
           ARRAY[(ARRAY['sql', 'python', 'excel', 'bi'])[1 + g % 4],
                 (ARRAY['beginner', 'advanced'])[1 + (g / 4) % 2]]
           || CASE WHEN g % 150 = 0 THEN ARRAY['postgres'] ELSE ARRAY[]::text[] END
    FROM generate_series(1, 30000) AS g;
    ANALYZE posts;
  steps:
    - task:
        vi: "Đếm số bài có nhãn `sql` và cũng có nhãn `beginner` (một cột, một dòng)."
        en: "Count the posts tagged both `sql` and `beginner` (one column, one row)."
      solution: SELECT count(*) FROM posts WHERE tags @> ARRAY['sql', 'beginner']
      check: rows
      hint:
        vi: "`tags @> ARRAY[...]` nghĩa là mảng chứa mọi phần tử đã cho."
        en: "`tags @> ARRAY[...]` means the array contains every listed element."
    - task:
        vi: "Tạo index GIN tên `posts_tags_idx` trên cột `tags`."
        en: "Create a GIN index named `posts_tags_idx` on column `tags`."
      solution: CREATE INDEX posts_tags_idx ON posts USING gin (tags)
      target: SELECT id, title FROM posts WHERE tags @> ARRAY['postgres']
      check: catalog
      hint:
        vi: "`CREATE INDEX name ON table USING gin (col)`."
        en: "`CREATE INDEX name ON table USING gin (col)`."
    - task:
        vi: "Lấy `id, title` của các bài có nhãn `postgres`. Đoán trước: viết bằng `= ANY` thì kế hoạch có dùng index không? Kế hoạch phải dùng `posts_tags_idx`."
        en: "Return `id, title` of the posts tagged `postgres`. Guess first: written with `= ANY`, would the plan use the index? The plan must use `posts_tags_idx`."
      solution: SELECT id, title FROM posts WHERE tags @> ARRAY['postgres']
      check: plan
      hint:
        vi: "`'postgres' = ANY(tags)` không dùng được GIN; viết lại bằng `@>`."
        en: "`'postgres' = ANY(tags)` cannot use GIN; rewrite it with `@>`."
    - task:
        vi: "Đếm số bài vừa có nhãn `postgres` vừa có nhãn `advanced` (một cột, một dòng). Bài chấm cả tốc độ: đúng mà không dùng được `posts_tags_idx` là chưa đạt."
        en: "Count the posts tagged both `postgres` and `advanced` (one column, one row). Speed is graded too: a right answer that cannot use `posts_tags_idx` does not pass."
      solution: SELECT count(*) FROM posts WHERE tags @> ARRAY['postgres', 'advanced']
      check: rows
      perf: { table: posts }
      slow: SELECT count(*) FROM posts WHERE 'postgres' = ANY(tags) AND 'advanced' = ANY(tags)
      hint:
        vi: "Một `@>` với cả hai nhãn trong cùng một mảng; GIN lấy giao hai danh sách."
        en: "One `@>` with both tags in one array; GIN intersects the two lists."
quiz:
  - q:
      vi: "Bảng `posts` có index GIN trên `tags`. Câu `WHERE 'postgres' = ANY(tags)` có dùng được index đó không?"
      en: "Table `posts` has a GIN index on `tags`. Can `WHERE 'postgres' = ANY(tags)` use that index?"
    options:
      - { vi: "Có: nó cùng nghĩa với `tags @> ARRAY['postgres']`", en: "Yes: it means the same as `tags @> ARRAY['postgres']`" }
      - { vi: "Không: GIN cho mảng chỉ hiểu `@>`, `<@`, `&&` và `=` đặt trên cột mảng", en: "No: GIN on arrays only understands `@>`, `<@`, `&&` and `=` applied to the array column" }
      - { vi: "Chỉ khi thêm `ORDER BY id`", en: "Only with an added `ORDER BY id`" }
    answer: 1
    trap: 0
    why:
      vi: "Hai câu trả cùng dòng, nhưng index chỉ được dùng khi điều kiện có dạng \"cột, toán tử, hằng số\", với toán tử nằm trong operator class của index (danh sách toán tử mà index đó hiểu; với GIN trên mảng là `@>`, `<@`, `&&`, `=`). Trong `'postgres' = ANY(tags)`, toán tử `=` so hai giá trị `text`, còn cột mảng bị bọc trong `ANY`, nên GIN không áp vào được và kế hoạch là Seq Scan. Thêm `ORDER BY` chỉ đổi thứ tự trả về, không đổi được dạng điều kiện."
      en: "Both queries return the same rows, but an index is used only when the condition has the shape \"column, operator, constant\", with an operator in the index's operator class (the list of operators that index understands; for GIN on arrays: `@>`, `<@`, `&&`, `=`). In `'postgres' = ANY(tags)` the `=` compares two `text` values and the array column is wrapped in `ANY`, so GIN cannot apply and the plan is a Seq Scan. Adding `ORDER BY` only changes the output order, not the shape of the condition."
  - q:
      vi: "Cần các bài có ít nhất một trong hai nhãn `sql`, `bi`. Điều kiện nào đúng?"
      en: "You need posts with at least one of the two tags `sql`, `bi`. Which condition is right?"
    options:
      - { vi: "`tags @> ARRAY['sql', 'bi']`", en: "`tags @> ARRAY['sql', 'bi']`" }
      - { vi: "`tags && ARRAY['sql', 'bi']`", en: "`tags && ARRAY['sql', 'bi']`" }
      - { vi: "`tags = ARRAY['sql', 'bi']`", en: "`tags = ARRAY['sql', 'bi']`" }
    answer: 1
    why:
      vi: "`&&` là \"có phần tử chung\": một nhãn là đủ. `@>` đòi có cả hai nhãn, còn `=` đòi đúng mảng đó theo đúng thứ tự. Cả ba toán tử đều dùng được index GIN."
      en: "`&&` means \"share an element\": one tag is enough. `@>` needs both tags, and `=` needs exactly that array in that order. All three operators can use the GIN index."
---
## Mở bài

Mỗi bài viết có vài nhãn, và trang tìm kiếm lọc "bài có nhãn `postgres`" trên 30.000 bài. Dựng thêm một bảng phụ chỉ để lọc nhãn thì nặng nề, còn để nhãn trong một cột mảng thì B-tree lại không giúp được. Index GIN được làm ra cho đúng trường hợp này.

## Ý chính

Postgres có kiểu mảng: `text[]`, `int[]`... Một cột `tags text[]` thay được một bảng phụ khi nhãn chỉ dùng để lọc. Ba cách hỏi hay gặp: `'sql' = ANY(tags)` (mảng có phần tử này), `tags @> ARRAY['sql', 'beginner']` (mảng chứa mọi phần tử đã cho) và `tags && ARRAY['sql', 'bi']` (hai mảng có ít nhất một phần tử chung).

B-tree không giúp được các câu này, vì nó so cả mảng như một giá trị. GIN là index "đảo ngược": mỗi phần tử (mỗi nhãn) là một khóa, kèm danh sách các dòng chứa nó. Tìm `@> ARRAY['postgres']` là đọc đúng danh sách của khóa `postgres`; với nhiều phần tử thì lấy giao các danh sách. Cái giá: một dòng sinh ra nhiều khóa, nên ghi vào GIN chậm hơn ghi vào B-tree.

Nhiều người nghĩ `'postgres' = ANY(tags)` và `tags @> ARRAY['postgres']` là một, nên index nào dùng được cho câu này thì dùng được cho câu kia. Thật ra GIN cho mảng chỉ hiểu `@>`, `<@`, `&&` và `=` đặt trên cột mảng. Câu `= ANY` cho cùng dòng nhưng vẫn Seq Scan.

Một bẫy khác: `tags = ARRAY['sql', 'beginner']` không có nghĩa "có hai nhãn này". Phép `=` trên mảng đòi đúng từng phần tử, đúng thứ tự và không thừa phần tử nào.

## Cú pháp

```sql
CREATE INDEX index_name ON table_name USING gin ( array_column );
SELECT ... WHERE array_column @> ARRAY[value [, ...]];
SELECT ... WHERE array_column && ARRAY[value [, ...]];
SELECT ... WHERE array_column <@ ARRAY[value [, ...]];
```

- `@>`: chứa mọi phần tử đã cho.
- `&&`: có ít nhất một phần tử chung.
- `<@`: mọi phần tử của cột đều nằm trong danh sách.
- GIN chỉ nhận kiểu có operator class cho nó (mảng, `jsonb`, `tsvector`); cột số thường mặc định không có.

## Ví dụ

Bốn toán tử trên hai mảng nhỏ:

```sql
SELECT ARRAY['sql', 'bi'] @> ARRAY['sql'] AS contains,
       ARRAY['sql'] <@ ARRAY['sql', 'bi'] AS contained,
       ARRAY['sql', 'bi'] && ARRAY['bi', 'excel'] AS overlaps,
       ARRAY['a', 'b'] = ARRAY['b', 'a'] AS same;
```

Ba cột đầu là `true`; cột cuối là `false` vì `=` xét cả thứ tự.

```sql
SELECT count(*) FILTER (WHERE tags @> ARRAY['postgres']) AS postgres,
       count(*) FILTER (WHERE tags && ARRAY['sql', 'bi']) AS sql_or_bi
FROM posts;
```

Có `200` bài gắn `postgres` và `15000` bài có `sql` hoặc `bi`.

```sql
CREATE INDEX demo_tags_idx ON posts USING gin (tags);
EXPLAIN SELECT id FROM posts WHERE tags @> ARRAY['postgres'];
```

Kế hoạch là `Bitmap Index Scan on demo_tags_idx` rồi `Bitmap Heap Scan`: GIN luôn đi qua bitmap, không có Index Scan thường.

## Lỗi hay gặp

Viết điều kiện bằng `= ANY` dù đã có GIN:

```sql
-- WRONG: same rows, but GIN cannot serve = ANY
EXPLAIN SELECT id FROM posts WHERE 'postgres' = ANY(tags);
```

```sql
-- FIX: the containment operator uses the GIN index
EXPLAIN SELECT id FROM posts WHERE tags @> ARRAY['postgres'];
```

Câu sai là `Seq Scan on posts`, câu sửa đi qua `demo_tags_idx`.

Dùng `=` khi ý là "có các nhãn này":

```sql
-- WRONG: = needs exactly this array, so posts with a third tag are lost
SELECT count(*) FROM posts WHERE tags = ARRAY['excel', 'advanced'];
```

```sql
-- FIX: @> keeps every post that has both tags
SELECT count(*) FROM posts WHERE tags @> ARRAY['excel', 'advanced'];
```

Câu sai đếm `3700`, câu đúng đếm `3750`: 50 bài có thêm nhãn `postgres` bị bỏ sót mà không có lỗi nào báo.

Tạo GIN trên một cột số thường:

```sql
-- ERROR 42704: data type integer has no default operator class for access method "gin"
CREATE INDEX demo_id_gin ON posts USING gin (id);
```

GIN chỉ dành cho giá trị có nhiều phần tử bên trong. Cột số hay chuỗi đơn thì dùng B-tree.

## Thực hành

200 trên 30.000 bài có nhãn `postgres`. Đếm theo nhãn, tạo index GIN, viết câu dùng được nó, rồi đếm theo hai nhãn sao cho vừa đúng vừa nhanh.

## Tóm tắt

- Cột mảng lọc bằng `@>` (chứa hết), `&&` (có chung) và `<@` (nằm trong).
- GIN lưu mỗi phần tử là một khóa kèm danh sách dòng; đọc nhanh, ghi chậm hơn B-tree.
- GIN không phục vụ `= ANY(...)`; viết lại bằng `@>` để dùng index.
- `=` trên mảng đòi đúng mảng và đúng thứ tự, không phải "có các phần tử này".

# EN

## Opening

Each post has a few tags, and the search page filters "posts tagged `postgres`" over 30,000 posts. Building a side table just to filter tags is heavy, and with the tags in an array column a B-tree cannot help. A GIN index is made for exactly this case.

## Key idea

Postgres has array types: `text[]`, `int[]`... A `tags text[]` column can replace a side table when tags are only used for filtering. Three common questions: `'sql' = ANY(tags)` (the array has this element), `tags @> ARRAY['sql', 'beginner']` (the array contains every listed element) and `tags && ARRAY['sql', 'bi']` (the two arrays share at least one element).

A B-tree cannot help with these, because it compares the whole array as one value. GIN is an "inverted" index: each element (each tag) is a key, with a list of the rows that contain it. Finding `@> ARRAY['postgres']` reads exactly the list for key `postgres`; with several elements it intersects the lists. The price: one row produces many keys, so writing to GIN is slower than writing to a B-tree.

Many people think `'postgres' = ANY(tags)` and `tags @> ARRAY['postgres']` are the same, so an index that serves one serves the other. In fact GIN on arrays only understands `@>`, `<@`, `&&` and `=` applied to the array column. The `= ANY` query returns the same rows but still does a Seq Scan.

Another trap: `tags = ARRAY['sql', 'beginner']` does not mean "has these two tags". The `=` operator on arrays needs every element, in the same order, with nothing extra.

## Syntax

```sql
CREATE INDEX index_name ON table_name USING gin ( array_column );
SELECT ... WHERE array_column @> ARRAY[value [, ...]];
SELECT ... WHERE array_column && ARRAY[value [, ...]];
SELECT ... WHERE array_column <@ ARRAY[value [, ...]];
```

- `@>`: contains every listed element.
- `&&`: shares at least one element.
- `<@`: every element of the column is in the list.
- GIN only takes types with an operator class for it (arrays, `jsonb`, `tsvector`); a plain number column has none by default.

## Example

The four operators on two small arrays:

```sql
SELECT ARRAY['sql', 'bi'] @> ARRAY['sql'] AS contains,
       ARRAY['sql'] <@ ARRAY['sql', 'bi'] AS contained,
       ARRAY['sql', 'bi'] && ARRAY['bi', 'excel'] AS overlaps,
       ARRAY['a', 'b'] = ARRAY['b', 'a'] AS same;
```

The first three columns are `true`; the last is `false` because `=` also checks the order.

```sql
SELECT count(*) FILTER (WHERE tags @> ARRAY['postgres']) AS postgres,
       count(*) FILTER (WHERE tags && ARRAY['sql', 'bi']) AS sql_or_bi
FROM posts;
```

There are `200` posts tagged `postgres` and `15000` posts with `sql` or `bi`.

```sql
CREATE INDEX demo_tags_idx ON posts USING gin (tags);
EXPLAIN SELECT id FROM posts WHERE tags @> ARRAY['postgres'];
```

The plan is a `Bitmap Index Scan on demo_tags_idx` then a `Bitmap Heap Scan`: GIN always goes through a bitmap, never a plain Index Scan.

## Common mistakes

Writing the filter with `= ANY` although a GIN index exists:

```sql
-- WRONG: same rows, but GIN cannot serve = ANY
EXPLAIN SELECT id FROM posts WHERE 'postgres' = ANY(tags);
```

```sql
-- FIX: the containment operator uses the GIN index
EXPLAIN SELECT id FROM posts WHERE tags @> ARRAY['postgres'];
```

The wrong query is a `Seq Scan on posts`, the fixed one goes through `demo_tags_idx`.

Using `=` when you mean "has these tags":

```sql
-- WRONG: = needs exactly this array, so posts with a third tag are lost
SELECT count(*) FROM posts WHERE tags = ARRAY['excel', 'advanced'];
```

```sql
-- FIX: @> keeps every post that has both tags
SELECT count(*) FROM posts WHERE tags @> ARRAY['excel', 'advanced'];
```

The wrong query counts `3700`, the right one `3750`: 50 posts with an extra `postgres` tag are silently lost.

Creating GIN on a plain number column:

```sql
-- ERROR 42704: data type integer has no default operator class for access method "gin"
CREATE INDEX demo_id_gin ON posts USING gin (id);
```

GIN is for values with many elements inside. A plain number or string column takes a B-tree.

## Practice

200 of the 30,000 posts are tagged `postgres`. Count by tag, create a GIN index, write a query that can use it, then count by two tags so the answer is both right and fast.

## Recap

- Filter an array column with `@>` (contains all), `&&` (shares one) and `<@` (is inside).
- GIN stores each element as a key with a list of rows; fast to read, slower to write than a B-tree.
- GIN does not serve `= ANY(...)`; rewrite it with `@>` to use the index.
- `=` on arrays needs the exact array in the same order, not "has these elements".
