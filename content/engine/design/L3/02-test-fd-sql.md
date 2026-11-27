---
id: e-ds-l3-02
engine: design
level: L3
module: fd
title: Thử một phụ thuộc hàm trên dữ liệu bằng SQL
title_en: Testing a functional dependency on data with SQL
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ds-fd-group-test, at: idea }]
objectives:
  - vi: Tìm phản ví dụ của một phụ thuộc, kể cả khi vế trái có nhiều cột.
    en: Find counter-examples to a dependency, including one with a multi-column left side.
  - vi: Không để NULL che mất vi phạm khi đếm giá trị khác nhau.
    en: Keep NULLs from hiding a violation when you count distinct values.
  - vi: Biến một phụ thuộc đã tin là đúng thành luật database bằng một bảng riêng có khóa.
    en: Turn a dependency you trust into a database rule with its own table and key.
requires: [e-ds-l3-01]
sources:
  - { url: https://www.postgresql.org/docs/18/functions-aggregate.html, title_vi: "Hàm gộp" }
  - { url: https://www.postgresql.org/docs/18/ddl-constraints.html, title_vi: "Ràng buộc" }
  - { url: https://www.bkent.net/Doc/simple5.htm, title_vi: "William Kent: hướng dẫn đơn giản về năm dạng chuẩn" }
lab:
  setup: |
    CREATE TABLE order_lines (
      order_id int NOT NULL,
      line_no int NOT NULL,
      product_code text NOT NULL,
      product_name text,
      unit_price numeric(10,2) NOT NULL,
      PRIMARY KEY (order_id, line_no)
    );
    INSERT INTO order_lines VALUES
      (1, 1, 'P1', 'pen', 5.00), (1, 2, 'P2', 'notebook', 35.00),
      (2, 1, 'P1', 'pen', 5.00), (2, 2, 'P3', 'ruler', 12.00),
      (3, 1, 'P2', 'notebook', 30.00), (3, 2, 'P3', NULL, 12.00),
      (4, 1, 'P3', 'ruler', 12.00);
  steps:
    - task:
        vi: "Kiểm `product_code → unit_price`: trả mã sản phẩm vi phạm cùng giá thấp nhất và cao nhất (`product_code`, `min_price`, `max_price`)."
        en: "Test `product_code → unit_price`: return each offending product code with its lowest and highest price (`product_code`, `min_price`, `max_price`)."
      solution: SELECT product_code, min(unit_price) AS min_price, max(unit_price) AS max_price FROM order_lines GROUP BY product_code HAVING count(DISTINCT unit_price) > 1
      check: rows
      hint:
        vi: "`GROUP BY product_code HAVING count(DISTINCT unit_price) > 1`, thêm `min` và `max` vào danh sách cột."
        en: "`GROUP BY product_code HAVING count(DISTINCT unit_price) > 1`, with `min` and `max` in the select list."
    - task:
        vi: "Kiểm `product_code → product_name`, coi NULL là một giá trị riêng: một mã có tên và có NULL cũng là vi phạm. Trả `product_code`."
        en: "Test `product_code → product_name`, counting NULL as its own value: a code with a name and a NULL is a violation too. Return `product_code`."
      solution: SELECT product_code FROM order_lines GROUP BY product_code HAVING count(DISTINCT product_name) + max(CASE WHEN product_name IS NULL THEN 1 ELSE 0 END) > 1
      check: rows
      hint:
        vi: "`count(DISTINCT product_name)` bỏ qua NULL; cộng thêm `max(CASE WHEN product_name IS NULL THEN 1 ELSE 0 END)`."
        en: "`count(DISTINCT product_name)` skips NULL; add `max(CASE WHEN product_name IS NULL THEN 1 ELSE 0 END)`."
    - task:
        vi: "Nghiệp vụ xác nhận mỗi mã chỉ có một tên. Tạo bảng `products` với cột `code text` làm khóa chính và cột `name text NOT NULL`. Đừng đặt tên ràng buộc."
        en: "The business confirms each code has exactly one name. Create table `products` with column `code text` as primary key and column `name text NOT NULL`. Do not name the constraint."
      solution: CREATE TABLE products (code text PRIMARY KEY, name text NOT NULL)
      check: catalog
      hint:
        vi: "`CREATE TABLE products (code text PRIMARY KEY, name text NOT NULL)`: khóa chính giữ luật `code → name`."
        en: "`CREATE TABLE products (code text PRIMARY KEY, name text NOT NULL)`: the primary key keeps the rule `code → name`."
    - task:
        vi: "Đổ dữ liệu vào `products`: mỗi mã một dòng, tên lấy từ `order_lines`, bỏ các dòng tên NULL."
        en: "Fill `products`: one row per code, the name taken from `order_lines`, skipping rows whose name is NULL."
      solution: INSERT INTO products (code, name) SELECT DISTINCT product_code, product_name FROM order_lines WHERE product_name IS NOT NULL
      after: SELECT code, name FROM products ORDER BY code
      check: rows
      ordered: true
      hint:
        vi: "`INSERT INTO products (code, name) SELECT DISTINCT … WHERE product_name IS NOT NULL`; lab đọc lại `products` để chấm."
        en: "`INSERT INTO products (code, name) SELECT DISTINCT … WHERE product_name IS NOT NULL`; the lab reads `products` back to grade it."
quiz:
  - q:
      vi: "Cột `product_name` có các giá trị `'ruler'`, `NULL`, `'ruler'` cho cùng một mã. `count(DISTINCT product_name)` trả bao nhiêu?"
      en: "Column `product_name` holds `'ruler'`, `NULL`, `'ruler'` for the same code. What does `count(DISTINCT product_name)` return?"
    options:
      - { vi: "2", en: "2" }
      - { vi: "1", en: "1" }
      - { vi: "3", en: "3" }
    answer: 1
    trap: 0
    why:
      vi: "2 nghe hợp lý vì NULL trông như một giá trị khác `'ruler'`, nhưng mọi hàm gộp trừ `count(*)` đều bỏ qua NULL. Còn lại `'ruler'`, `'ruler'`, và `DISTINCT` gộp hai chữ giống nhau làm một, nên kết quả là 1, không phải 3. Hệ quả: phép thử phụ thuộc hàm bỏ sót vi phạm (một dòng có tên, một dòng trống) nếu bạn không cộng thêm 1 cho nhóm có NULL, như bước 2 của lab."
      en: "2 sounds right because NULL looks like a value other than `'ruler'`, but every aggregate except `count(*)` skips NULLs. That leaves `'ruler'`, `'ruler'`, and `DISTINCT` merges the two equal names into one, so the result is 1, not 3. As a result, a functional dependency test misses the violation (one line with a name, one without) unless you add 1 for a group that has a NULL, as in step 2 of the lab."
  - q:
      vi: "Bảng phẳng `order_lines` lặp tên sản phẩm trên mỗi dòng. Cách nào giữ đúng luật `product_code → product_name`?"
      en: "The flat table `order_lines` repeats the product name on every line. Which way keeps the rule `product_code → product_name`?"
    options:
      - { vi: "Thêm `UNIQUE (product_code)` lên `order_lines`", en: "Add `UNIQUE (product_code)` to `order_lines`" }
      - { vi: "Chuyển tên sang bảng `products` có khóa `code`, dòng đơn chỉ giữ mã", en: "Move the name to a `products` table keyed by `code`, and keep only the code on order lines" }
      - { vi: "Thêm `CHECK (product_name IS NOT NULL)`", en: "Add `CHECK (product_name IS NOT NULL)`" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ phụ thuộc hàm là một kiểu `UNIQUE`, nhưng mã P1 nằm trên dòng của đơn 1 lẫn đơn 2 là bình thường, nên `UNIQUE (product_code)` chặn cả dữ liệu đúng. `CHECK (product_name IS NOT NULL)` chỉ cấm tên trống, vẫn cho cùng một mã mang hai tên khác nhau. Chuyển tên sang bảng `products` có khóa chính `code` thì khóa không cho hai dòng cùng mã, nên một mã không thể có hai tên."
      en: "Many people think a functional dependency is a kind of `UNIQUE`, but code P1 on lines of both order 1 and order 2 is normal, so `UNIQUE (product_code)` blocks correct data. `CHECK (product_name IS NOT NULL)` only forbids an empty name and still lets one code carry two different names. Move the name to a `products` table keyed by `code`, and the key forbids two rows with the same code, so a code cannot have two names."
---
## Mở bài

Bạn nhận một bảng dòng đơn hàng xuất từ hệ thống cũ, mỗi dòng ghi lại tên và giá sản phẩm. Trước khi tách bảng, cần biết các luật "mã quyết định tên", "mã quyết định giá" có thật đứng vững không. Bài này kiểm chúng bằng SQL rồi biến luật đúng thành ràng buộc.

## Ý chính

Phép thử `X → Y` trên dữ liệu luôn cùng một khuôn: gom theo X, đếm số giá trị khác nhau của Y, giữ nhóm nào đếm được hơn 1. Mỗi nhóm còn lại là một phản ví dụ. X có nhiều cột thì gom theo đủ các cột đó; Y có nhiều cột thì đếm số tổ hợp khác nhau, ví dụ `count(DISTINCT (a, b))`.

Cái bẫy là NULL. `count(DISTINCT y)` bỏ qua NULL, nên một mã có lúc ghi tên, lúc để trống, vẫn đếm ra 1. Theo nghĩa phụ thuộc hàm, hai dòng cùng X mà một dòng có Y, một dòng không, là hai giá trị khác nhau. Hãy cộng thêm một khi nhóm có NULL.

Khi đã tin một phụ thuộc là luật nghiệp vụ, đừng giữ nó bằng hy vọng. Tách nó ra bảng riêng mà vế trái là khóa chính: `products (code, name)`. Khóa không cho hai dòng cùng `code`, nên không thể có hai tên. Nhiều người thử giữ luật bằng `UNIQUE` trên bảng phẳng. Thật ra mã được lặp lại trên nhiều dòng đơn là đúng, nên ràng buộc đó chặn luôn dữ liệu hợp lệ.

Hình từng bước cuối mục này chạy phép thử trên `order_lines`: P2 có hai giá nên bị bác, còn tên của P3 có một NULL mà `count(DISTINCT)` vẫn đếm ra 1.

## Cú pháp

```sql
-- counter-examples to (x1, x2) → y, NULL counted as a value
SELECT x1, x2
FROM t
GROUP BY x1, x2
HAVING count(DISTINCT y) + max(CASE WHEN y IS NULL THEN 1 ELSE 0 END) > 1;
-- keep a trusted X → Y as a key
CREATE TABLE x_table (x type PRIMARY KEY, y type NOT NULL);
```

- `count(DISTINCT y)`: số giá trị khác nhau, không tính NULL.
- `max(CASE WHEN y IS NULL …)`: 1 nếu nhóm có ít nhất một NULL.
- `count(DISTINCT (a, b))`: đếm tổ hợp khi vế phải có hai cột.

## Ví dụ

Vế trái hai cột: `(order_id, line_no)` là khóa, nên đếm số phản ví dụ của `(order_id, line_no) → product_code` ra 0.

```sql
SELECT count(*) AS violations
FROM (SELECT order_id, line_no FROM order_lines
      GROUP BY order_id, line_no
      HAVING count(DISTINCT product_code) > 1) v;
```

Xem mọi giá đã ghi của từng mã để hiểu vì sao luật giá bị phá.

```sql
SELECT product_code, array_agg(DISTINCT unit_price ORDER BY unit_price) AS prices
FROM order_lines
GROUP BY product_code
ORDER BY product_code;
```

`P2` có hai giá, 30 và 35: hoặc giá đổi theo thời gian (khi đó giá thuộc về đơn, không thuộc về sản phẩm), hoặc dữ liệu sai.

Cách thứ hai: tự nối bảng với chính nó để thấy từng cặp dòng trái nhau.

```sql
SELECT DISTINCT a.product_code, a.unit_price AS price_a, b.unit_price AS price_b
FROM order_lines a
JOIN order_lines b ON a.product_code = b.product_code AND a.unit_price < b.unit_price
ORDER BY a.product_code;
```

## Lỗi hay gặp

Đếm giá trị khác nhau mà quên NULL.

```sql
-- WRONG: count(DISTINCT) skips the NULL name of P3
SELECT product_code FROM order_lines
GROUP BY product_code HAVING count(DISTINCT product_name) > 1;
```

```sql
-- FIX: a NULL counts as one more value
SELECT product_code FROM order_lines
GROUP BY product_code
HAVING count(DISTINCT product_name) + max(CASE WHEN product_name IS NULL THEN 1 ELSE 0 END) > 1;
```

Câu sai ra rỗng; câu sửa tìm ra `P3`, có tên `ruler` ở hai dòng và NULL ở một dòng.

Giữ phụ thuộc bằng `UNIQUE` trên bảng phẳng.

```sql
-- ERROR 23505: could not create unique index "order_lines_product_code_key"
ALTER TABLE order_lines ADD UNIQUE (product_code);
```

Mã `P1` nằm trên hai dòng đơn, chuyện hoàn toàn đúng, nên Postgres không tạo được index duy nhất. Chỗ của luật `code → name` là một bảng riêng có khóa `code`.

## Thực hành

Bảng `order_lines` lặp tên và giá sản phẩm trên mỗi dòng. Kiểm luật giá, kiểm luật tên có tính NULL, rồi tạo bảng `products` và đổ dữ liệu vào nó.

## Tóm tắt

- Phản ví dụ của `X → Y`: `GROUP BY` X, `HAVING count(DISTINCT` Y`) > 1`.
- `count(DISTINCT …)` bỏ qua NULL; cộng thêm một khi nhóm có NULL.
- Vế trái nhiều cột: gom theo đủ các cột; vế phải nhiều cột: `count(DISTINCT (a, b))`.
- Phụ thuộc đã tin là đúng thì tách ra bảng mà vế trái là khóa chính, không dùng `UNIQUE` trên bảng phẳng.

# EN

## Opening

You get an order-line table exported from an old system, and every line repeats the product's name and price. Before splitting tables you need to know whether the rules "code decides name" and "code decides price" really hold. This lesson tests them with SQL, then turns the true one into a constraint.

## Key idea

Testing `X → Y` on data always follows one pattern: group by X, count the distinct values of Y, keep the groups that count more than 1. Each group left is a counter-example. With several columns in X, group by all of them; with several columns in Y, count distinct combinations, for example `count(DISTINCT (a, b))`.

The trap is NULL. `count(DISTINCT y)` skips NULLs, so a code that sometimes has a name and sometimes an empty one still counts 1. For a functional dependency, two rows with the same X where one has Y and the other has none are two different values. Add one when the group holds a NULL.

Once you trust a dependency as a business rule, do not keep it by hope. Move it to its own table whose primary key is the left side: `products (code, name)`. The key forbids two rows with the same `code`, so two names are impossible. Many people try to keep the rule with `UNIQUE` on the flat table. In fact a code repeated on many order lines is correct, so that constraint also blocks valid data.

The step-through figure at the end of this section runs the test on `order_lines`: P2 has two prices, so it is refuted, while P3's names hold a NULL and `count(DISTINCT)` still counts 1.

## Syntax

```sql
-- counter-examples to (x1, x2) → y, NULL counted as a value
SELECT x1, x2
FROM t
GROUP BY x1, x2
HAVING count(DISTINCT y) + max(CASE WHEN y IS NULL THEN 1 ELSE 0 END) > 1;
-- keep a trusted X → Y as a key
CREATE TABLE x_table (x type PRIMARY KEY, y type NOT NULL);
```

- `count(DISTINCT y)`: the number of distinct values, NULL not counted.
- `max(CASE WHEN y IS NULL …)`: 1 when the group has at least one NULL.
- `count(DISTINCT (a, b))`: counts combinations when the right side has two columns.

## Example

A two-column left side: `(order_id, line_no)` is the key, so counting the counter-examples of `(order_id, line_no) → product_code` gives 0.

```sql
SELECT count(*) AS violations
FROM (SELECT order_id, line_no FROM order_lines
      GROUP BY order_id, line_no
      HAVING count(DISTINCT product_code) > 1) v;
```

List every price recorded for each code to see why the price rule breaks.

```sql
SELECT product_code, array_agg(DISTINCT unit_price ORDER BY unit_price) AS prices
FROM order_lines
GROUP BY product_code
ORDER BY product_code;
```

`P2` has two prices, 30 and 35: either the price changes over time (then the price belongs to the order, not the product), or the data is wrong.

A second way: join the table to itself to see each pair of conflicting rows.

```sql
SELECT DISTINCT a.product_code, a.unit_price AS price_a, b.unit_price AS price_b
FROM order_lines a
JOIN order_lines b ON a.product_code = b.product_code AND a.unit_price < b.unit_price
ORDER BY a.product_code;
```

## Common mistakes

Counting distinct values and forgetting NULL.

```sql
-- WRONG: count(DISTINCT) skips the NULL name of P3
SELECT product_code FROM order_lines
GROUP BY product_code HAVING count(DISTINCT product_name) > 1;
```

```sql
-- FIX: a NULL counts as one more value
SELECT product_code FROM order_lines
GROUP BY product_code
HAVING count(DISTINCT product_name) + max(CASE WHEN product_name IS NULL THEN 1 ELSE 0 END) > 1;
```

The wrong query returns nothing; the fixed one finds `P3`, named `ruler` on two lines and NULL on one.

Keeping the dependency with `UNIQUE` on the flat table.

```sql
-- ERROR 23505: could not create unique index "order_lines_product_code_key"
ALTER TABLE order_lines ADD UNIQUE (product_code);
```

Code `P1` sits on two order lines, which is perfectly correct, so Postgres cannot build a unique index. The rule `code → name` belongs in its own table keyed by `code`.

## Practice

Table `order_lines` repeats the product name and price on every line. Test the price rule, test the name rule counting NULL, then create table `products` and fill it.

## Recap

- Counter-examples to `X → Y`: `GROUP BY` X, `HAVING count(DISTINCT` Y`) > 1`.
- `count(DISTINCT …)` skips NULL; add one when the group has a NULL.
- Multi-column left side: group by all its columns; multi-column right side: `count(DISTINCT (a, b))`.
- Keep a trusted dependency in a table whose primary key is the left side, not with `UNIQUE` on the flat table.
