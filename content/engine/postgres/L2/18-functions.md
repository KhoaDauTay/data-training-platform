---
id: e-pg-l2-18
engine: postgres
level: L2
module: functions
title: Hàm SQL và PL/pgSQL
title_en: SQL and PL/pgSQL functions
kind: lab
runtime: browser
minutes: 18
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Viết hàm `LANGUAGE sql` cho một biểu thức hoặc một câu truy vấn, và hàm `LANGUAGE plpgsql` khi cần biến và `IF`.
    en: Write a `LANGUAGE sql` function for one expression or one query, and a `LANGUAGE plpgsql` function when you need variables and `IF`.
  - vi: Chọn đúng `IMMUTABLE`, `STABLE` hoặc `VOLATILE` và biết vì sao chỉ hàm `IMMUTABLE` được dùng trong index.
    en: Pick the right `IMMUTABLE`, `STABLE` or `VOLATILE` and know why only an `IMMUTABLE` function may be used in an index.
  - vi: Nạp chồng một hàm theo kiểu tham số và xóa đúng một phiên bản bằng chữ ký đầy đủ.
    en: Overload a function by argument types and drop exactly one version with its full signature.
requires: [e-pg-l1-07]
sources:
  - https://www.postgresql.org/docs/18/sql-createfunction.html
  - https://www.postgresql.org/docs/18/xfunc-sql.html
  - https://www.postgresql.org/docs/18/plpgsql.html
  - https://www.postgresql.org/docs/18/xfunc-volatility.html
  - https://www.postgresql.org/docs/18/xfunc-overload.html
  - https://www.postgresql.org/docs/18/sql-dropfunction.html
  - https://www.postgresql.org/docs/18/errcodes-appendix.html
lab:
  setup: |
    CREATE TABLE products (
      id int PRIMARY KEY,
      name text NOT NULL,
      price numeric(12,0) NOT NULL CHECK (price > 0)
    );
    INSERT INTO products VALUES (1, 'Pen', 12000), (2, 'Notebook', 45000), (3, 'Chair', 50000), (4, 'Lamp', 150000), (5, 'Backpack', 320000);
  steps:
    - task:
        vi: "Viết hàm `with_vat(p numeric)` trả về `numeric`: giá cộng thuế 8%, làm tròn tới đồng (`round(p * 1.08, 0)`). Dùng `LANGUAGE sql`, thân chuẩn SQL `RETURN`, và đánh dấu `IMMUTABLE`."
        en: "Write a function `with_vat(p numeric)` returning `numeric`: the price plus 8% tax, rounded to the dong (`round(p * 1.08, 0)`). Use `LANGUAGE sql`, the SQL-standard `RETURN` body, and mark it `IMMUTABLE`."
      solution: CREATE FUNCTION with_vat(p numeric) RETURNS numeric LANGUAGE sql IMMUTABLE RETURN round(p * 1.08, 0)
      check: catalog
      hint:
        vi: "`CREATE FUNCTION name(arg type) RETURNS type LANGUAGE sql IMMUTABLE RETURN expression`. Thân `RETURN` được Postgres phân tích rồi lưu, nên khoảng trắng không quan trọng."
        en: "`CREATE FUNCTION name(arg type) RETURNS type LANGUAGE sql IMMUTABLE RETURN expression`. Postgres parses a `RETURN` body before storing it, so spacing does not matter."
    - task:
        vi: "Viết hàm PL/pgSQL `price_band(p numeric)` trả về `text`: dưới 50000 là `cheap`, dưới 200000 là `mid`, còn lại là `premium`."
        en: "Write a PL/pgSQL function `price_band(p numeric)` returning `text`: under 50000 is `cheap`, under 200000 is `mid`, anything else is `premium`."
      solution: |-
        CREATE FUNCTION price_band(p numeric) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
        BEGIN
          IF p < 50000 THEN RETURN 'cheap';
          ELSIF p < 200000 THEN RETURN 'mid';
          END IF;
          RETURN 'premium';
        END $$
      after: SELECT id, price_band(price) AS band FROM products ORDER BY id
      check: rows
      hint:
        vi: "Thân nằm trong `$$ ... $$`: `BEGIN IF ... THEN RETURN ...; ELSIF ... THEN RETURN ...; END IF; RETURN ...; END`. Bài chấm bằng cách gọi hàm trên mọi sản phẩm."
        en: "The body goes inside `$$ ... $$`: `BEGIN IF ... THEN RETURN ...; ELSIF ... THEN RETURN ...; END IF; RETURN ...; END`. The step is graded by calling the function on every product."
    - task:
        vi: "Viết hàm `pricier_than(p numeric)` bằng `LANGUAGE sql`, trả về một bảng hai cột (tên, giá) gồm các sản phẩm đắt hơn `p`. Hàm đọc bảng nên đánh dấu `STABLE`."
        en: "Write a function `pricier_than(p numeric)` in `LANGUAGE sql` that returns a two-column table (name, price) of the products dearer than `p`. It reads a table, so mark it `STABLE`."
      solution: CREATE FUNCTION pricier_than(p numeric) RETURNS TABLE (product text, cost numeric) LANGUAGE sql STABLE AS $$ SELECT name, price FROM products WHERE price > p $$
      after: SELECT * FROM pricier_than(50000) ORDER BY 1
      check: rows
      hint:
        vi: "`RETURNS TABLE (col type, ...)` rồi `AS $$ SELECT ... $$`. Tên cột ra nên khác tên cột của bảng để khỏi nhầm."
        en: "`RETURNS TABLE (col type, ...)` then `AS $$ SELECT ... $$`. Give the output columns names other than the table's columns to avoid confusion."
    - task:
        vi: "Thêm phiên bản thứ hai của `with_vat` nhận thêm thuế suất: `with_vat(p numeric, rate numeric)` = `round(p * (1 + rate / 100), 0)`, cũng `LANGUAGE sql`, `IMMUTABLE`, thân `RETURN`."
        en: "Add a second version of `with_vat` that also takes the tax rate: `with_vat(p numeric, rate numeric)` = `round(p * (1 + rate / 100), 0)`, also `LANGUAGE sql`, `IMMUTABLE`, with a `RETURN` body."
      solution: CREATE FUNCTION with_vat(p numeric, rate numeric) RETURNS numeric LANGUAGE sql IMMUTABLE RETURN round(p * (1 + rate / 100), 0)
      check: catalog
      hint:
        vi: Cùng tên, khác danh sách kiểu tham số, là một hàm mới; hàm cũ vẫn còn.
        en: The same name with a different list of argument types is a new function; the old one stays.
    - task:
        vi: Xóa phiên bản một tham số của `with_vat`, giữ phiên bản có thuế suất.
        en: Drop the one-argument version of `with_vat` and keep the version with the rate.
      solution: DROP FUNCTION with_vat(numeric)
      check: catalog
      hint:
        vi: "Khi tên đã bị nạp chồng, `DROP FUNCTION` cần kiểu tham số trong ngoặc."
        en: "Once a name is overloaded, `DROP FUNCTION` needs the argument types in parentheses."
quiz:
  - q:
      vi: "Đã có `fee(x int)`. Bạn chạy `CREATE OR REPLACE FUNCTION fee(x bigint) ...`. Sau đó database có gì?"
      en: "`fee(x int)` exists. You run `CREATE OR REPLACE FUNCTION fee(x bigint) ...`. What does the database hold afterwards?"
    options:
      - { vi: "Một hàm `fee(bigint)`: bản cũ đã bị thay", en: "One function `fee(bigint)`: the old one was replaced" }
      - { vi: "Hai hàm `fee(integer)` và `fee(bigint)`", en: "Two functions, `fee(integer)` and `fee(bigint)`" }
      - { vi: "Lỗi, vì tên `fee` đã tồn tại", en: "An error, because the name `fee` exists" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì chữ REPLACE, nhưng Postgres nhận diện hàm bằng tên cộng kiểu tham số. Kiểu khác thì là chữ ký khác, nên REPLACE không tìm thấy gì để thay và tạo hàm thứ hai."
      en: "It sounds right because of the word REPLACE, but Postgres identifies a function by its name plus its argument types. Different types make a different signature, so REPLACE finds nothing to replace and creates a second function."
  - q:
      vi: "Hàm `stock_of(id)` đọc bảng `stock`. Nên đánh dấu nó thế nào?"
      en: "Function `stock_of(id)` reads table `stock`. How should it be marked?"
    options:
      - { vi: "`IMMUTABLE`, vì cùng một id trả cùng kết quả trong hôm nay", en: "`IMMUTABLE`, because the same id gives the same result today" }
      - { vi: "`STABLE`: kết quả không đổi trong một câu lệnh, nhưng đổi khi bảng đổi", en: "`STABLE`: the result holds within one statement but changes when the table changes" }
      - { vi: "`VOLATILE` là bắt buộc với mọi hàm đọc bảng", en: "`VOLATILE` is required for every function that reads a table" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì kết quả trông cố định, nhưng `IMMUTABLE` hứa kết quả không bao giờ đổi, nên planner có thể tính sẵn và index có thể lưu nó; khi bảng đổi, kết quả cũ thành sai. `STABLE` là lời hứa đúng cho hàm chỉ đọc."
      en: "It sounds right because the result looks fixed, but `IMMUTABLE` promises it never changes, so the planner may precompute it and an index may store it; once the table changes, the old result is wrong. `STABLE` is the honest promise for a read-only function."
---
## Mở bài

Công thức giá sau thuế đang được chép tay trong mười câu báo cáo, và mỗi câu làm tròn một kiểu. Một hàm trong database cho mọi câu dùng chung một công thức. Bài này viết vài hàm như vậy và học cách Postgres phân biệt chúng.

## Ý chính

Hàm `LANGUAGE sql` chứa một biểu thức hoặc một câu truy vấn. Từ Postgres 14 có thân chuẩn SQL: `RETURN expression` hoặc `BEGIN ATOMIC ... END`; thân này được phân tích lúc tạo và lưu ở dạng đã phân tích. Thân trong `$$ ... $$` được lưu nguyên văn; với PL/pgSQL, một bảng sai tên chỉ lộ ra khi hàm chạy. Khi cần biến, `IF` hay vòng lặp, dùng `LANGUAGE plpgsql` với `DECLARE` và `BEGIN ... END`.

Hàm có thể trả một giá trị, một tập dòng (`RETURNS SETOF products`) hoặc một bảng tự đặt cột (`RETURNS TABLE (...)`); hàm trả tập dòng được gọi trong `FROM`.

Độ biến động là lời hứa với planner. `IMMUTABLE`: cùng tham số luôn cùng kết quả, không đọc bảng. `STABLE`: không đổi trong một câu lệnh, được đọc bảng. `VOLATILE` (mặc định): có thể đổi mỗi lần gọi. Chỉ hàm `IMMUTABLE` được dùng trong index biểu thức, vì index lưu kết quả lại.

Nhiều người nghĩ một tên hàm là một hàm. Thật ra Postgres nhận diện hàm bằng tên cộng kiểu tham số, nên cùng tên có thể có nhiều phiên bản (nạp chồng). Vì vậy `DROP FUNCTION` một tên đã nạp chồng cần chữ ký đầy đủ, và `CREATE OR REPLACE` chỉ thay được thân, không đổi được kiểu trả về.

## Cú pháp

```sql
CREATE [ OR REPLACE ] FUNCTION name ( [ arg_name ] arg_type [ DEFAULT value ] [, ...] )
  RETURNS type | SETOF type | TABLE ( column type [, ...] )
  LANGUAGE sql | plpgsql
  [ IMMUTABLE | STABLE | VOLATILE ]
  { RETURN expression | BEGIN ATOMIC statement; [...] END | AS $$ body $$ };
-- PL/pgSQL body: [ DECLARE var type [ := value ]; ] BEGIN ... RETURN value; END
DROP FUNCTION [ IF EXISTS ] name [ ( arg_type [, ...] ) ] [ CASCADE ];
```

- `OR REPLACE`: thay thân của hàm cùng chữ ký; kiểu trả về phải giữ nguyên.
- `SETOF` / `TABLE`: trả nhiều dòng, gọi trong `FROM`.
- `IMMUTABLE`: được tính sẵn và dùng trong index; `STABLE`: được đọc bảng.
- `DEFAULT`: tham số có giá trị mặc định thì được bỏ qua khi gọi.

## Ví dụ

Hàm SQL một dòng, thân `RETURN`:

```sql
CREATE FUNCTION discounted(p numeric, pct int) RETURNS numeric
  LANGUAGE sql IMMUTABLE RETURN round(p * (100 - pct) / 100, 0);
SELECT name, price, discounted(price, 10) AS sale FROM products ORDER BY id;
```

Hàm PL/pgSQL có biến và `IF`:

```sql
CREATE FUNCTION shipping_fee(total numeric) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  fee numeric := 30000;
BEGIN
  IF total >= 300000 THEN fee := 0;
  ELSIF total >= 100000 THEN fee := 15000;
  END IF;
  RETURN fee;
END $$;
SELECT name, shipping_fee(price) AS fee FROM products ORDER BY id;
```

Hàm trả tập dòng, gọi như một bảng:

```sql
CREATE FUNCTION cheaper_than(cap numeric) RETURNS SETOF products
  LANGUAGE sql STABLE AS $$ SELECT * FROM products WHERE price < cap $$;
SELECT id, name FROM cheaper_than(50000) ORDER BY id;
```

Hai hàm cùng tên, khác kiểu tham số:

```sql
CREATE FUNCTION kind_of(x int) RETURNS text LANGUAGE sql IMMUTABLE RETURN 'number ' || x;
CREATE FUNCTION kind_of(x text) RETURNS text LANGUAGE sql IMMUTABLE RETURN 'text ' || x;
SELECT kind_of(7) AS a, kind_of('seven') AS b;
SELECT p.oid::regprocedure AS signature, p.provolatile AS volatility
FROM pg_proc p WHERE p.proname IN ('kind_of', 'cheaper_than') ORDER BY 1;
```

Postgres chọn phiên bản theo kiểu đối số. Cột `provolatile` ghi `i`, `s` hoặc `v` cho `IMMUTABLE`, `STABLE`, `VOLATILE`.

## Lỗi hay gặp

Xóa một tên đã nạp chồng mà không ghi kiểu:

```sql
-- ERROR 42725: function name "kind_of" is not unique
DROP FUNCTION kind_of;
```

```sql
DROP FUNCTION kind_of(text);
SELECT p.oid::regprocedure AS left_over FROM pg_proc p WHERE p.proname = 'kind_of';
```

Ghi chữ ký trong ngoặc để chỉ đúng một phiên bản. Cẩn thận: sau khi xóa bản `text`, lời gọi `kind_of('seven')` sẽ thử bản `int` và báo lỗi kiểu.

Dùng hàm `VOLATILE` (mặc định) trong index:

```sql
CREATE FUNCTION clean_name(n text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN lower(trim(n)); END $$;
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX products_clean_idx ON products (clean_name(name));
```

```sql
CREATE OR REPLACE FUNCTION clean_name(n text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN lower(trim(n)); END $$;
CREATE INDEX products_clean_idx ON products (clean_name(name));
SELECT indexname FROM pg_indexes WHERE indexname = 'products_clean_idx';
```

Chỉ ghi `IMMUTABLE` khi điều đó đúng: hàm đọc bảng hoặc giờ hệ thống mà ghi `IMMUTABLE` sẽ làm index lưu kết quả sai. Một hàm `LANGUAGE sql` đơn giản đôi khi lọt qua kiểm tra này vì Postgres nhúng thân của nó vào biểu thức index; đừng dựa vào điều đó.

Đổi kiểu trả về bằng `CREATE OR REPLACE`:

```sql
-- ERROR 42P13: cannot change return type of existing function
CREATE OR REPLACE FUNCTION discounted(p numeric, pct int) RETURNS int
  LANGUAGE sql IMMUTABLE RETURN round(p * (100 - pct) / 100, 0);
```

Muốn đổi kiểu trả về thì `DROP FUNCTION` rồi tạo lại, sau khi kiểm xem view hay hàm nào đang dùng nó.

## Thực hành

Bảng `products` có năm sản phẩm. Bạn viết một hàm SQL tính giá sau thuế, một hàm PL/pgSQL xếp hạng giá, một hàm trả bảng, rồi nạp chồng và xóa đúng một phiên bản; sau đó là hai câu hỏi.

## Tóm tắt

- `LANGUAGE sql` cho một biểu thức hay một câu truy vấn; `LANGUAGE plpgsql` khi cần biến, `IF`, vòng lặp.
- `RETURNS SETOF` / `RETURNS TABLE` trả nhiều dòng và được gọi trong `FROM`.
- `IMMUTABLE`, `STABLE`, `VOLATILE` là lời hứa với planner; chỉ hàm `IMMUTABLE` vào được index.
- Hàm được nhận diện bằng tên cộng kiểu tham số: `DROP FUNCTION` cần chữ ký khi tên bị nạp chồng.
- `CREATE OR REPLACE` không đổi được kiểu trả về (`42P13`).

# EN

## Opening

The after-tax price formula is copied by hand into ten report queries, and each one rounds differently. A function in the database gives every query one shared formula. This lesson writes a few such functions and shows how Postgres tells them apart.

## Key idea

A `LANGUAGE sql` function holds one expression or one query. Since Postgres 14 there is an SQL-standard body: `RETURN expression` or `BEGIN ATOMIC ... END`; it is parsed when the function is created and stored in parsed form. A body inside `$$ ... $$` is stored as text; in PL/pgSQL a wrong table name only shows up when the function runs. When you need variables, `IF` or loops, use `LANGUAGE plpgsql` with `DECLARE` and `BEGIN ... END`.

A function can return one value, a set of rows (`RETURNS SETOF products`) or a table with its own columns (`RETURNS TABLE (...)`); a function that returns rows is called in `FROM`.

Volatility is a promise to the planner. `IMMUTABLE`: the same arguments always give the same result, no table reads. `STABLE`: fixed within one statement, may read tables. `VOLATILE` (the default): may change on every call. Only an `IMMUTABLE` function may appear in an expression index, because the index stores its results.

Many people think one function name is one function. In fact Postgres identifies a function by its name plus its argument types, so one name can have several versions (overloading). That is why `DROP FUNCTION` on an overloaded name needs the full signature, and `CREATE OR REPLACE` can only replace the body, not change the return type.

## Syntax

```sql
CREATE [ OR REPLACE ] FUNCTION name ( [ arg_name ] arg_type [ DEFAULT value ] [, ...] )
  RETURNS type | SETOF type | TABLE ( column type [, ...] )
  LANGUAGE sql | plpgsql
  [ IMMUTABLE | STABLE | VOLATILE ]
  { RETURN expression | BEGIN ATOMIC statement; [...] END | AS $$ body $$ };
-- PL/pgSQL body: [ DECLARE var type [ := value ]; ] BEGIN ... RETURN value; END
DROP FUNCTION [ IF EXISTS ] name [ ( arg_type [, ...] ) ] [ CASCADE ];
```

- `OR REPLACE`: replaces the body of the function with the same signature; the return type must stay.
- `SETOF` / `TABLE`: returns many rows, called in `FROM`.
- `IMMUTABLE`: may be precomputed and used in an index; `STABLE`: may read tables.
- `DEFAULT`: an argument with a default may be left out of the call.

## Example

A one-line SQL function with a `RETURN` body:

```sql
CREATE FUNCTION discounted(p numeric, pct int) RETURNS numeric
  LANGUAGE sql IMMUTABLE RETURN round(p * (100 - pct) / 100, 0);
SELECT name, price, discounted(price, 10) AS sale FROM products ORDER BY id;
```

A PL/pgSQL function with a variable and `IF`:

```sql
CREATE FUNCTION shipping_fee(total numeric) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  fee numeric := 30000;
BEGIN
  IF total >= 300000 THEN fee := 0;
  ELSIF total >= 100000 THEN fee := 15000;
  END IF;
  RETURN fee;
END $$;
SELECT name, shipping_fee(price) AS fee FROM products ORDER BY id;
```

A function that returns rows, called like a table:

```sql
CREATE FUNCTION cheaper_than(cap numeric) RETURNS SETOF products
  LANGUAGE sql STABLE AS $$ SELECT * FROM products WHERE price < cap $$;
SELECT id, name FROM cheaper_than(50000) ORDER BY id;
```

Two functions with one name and different argument types:

```sql
CREATE FUNCTION kind_of(x int) RETURNS text LANGUAGE sql IMMUTABLE RETURN 'number ' || x;
CREATE FUNCTION kind_of(x text) RETURNS text LANGUAGE sql IMMUTABLE RETURN 'text ' || x;
SELECT kind_of(7) AS a, kind_of('seven') AS b;
SELECT p.oid::regprocedure AS signature, p.provolatile AS volatility
FROM pg_proc p WHERE p.proname IN ('kind_of', 'cheaper_than') ORDER BY 1;
```

Postgres picks the version from the argument types. Column `provolatile` holds `i`, `s` or `v` for `IMMUTABLE`, `STABLE`, `VOLATILE`.

## Common mistakes

Dropping an overloaded name without the types:

```sql
-- ERROR 42725: function name "kind_of" is not unique
DROP FUNCTION kind_of;
```

```sql
DROP FUNCTION kind_of(text);
SELECT p.oid::regprocedure AS left_over FROM pg_proc p WHERE p.proname = 'kind_of';
```

Put the signature in parentheses to name exactly one version. Careful: once the `text` version is gone, the call `kind_of('seven')` tries the `int` version and fails on the type.

Using a `VOLATILE` function (the default) in an index:

```sql
CREATE FUNCTION clean_name(n text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN lower(trim(n)); END $$;
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX products_clean_idx ON products (clean_name(name));
```

```sql
CREATE OR REPLACE FUNCTION clean_name(n text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN lower(trim(n)); END $$;
CREATE INDEX products_clean_idx ON products (clean_name(name));
SELECT indexname FROM pg_indexes WHERE indexname = 'products_clean_idx';
```

Only write `IMMUTABLE` when it is true: a function that reads a table or the clock but claims `IMMUTABLE` makes the index store wrong results. A simple `LANGUAGE sql` function sometimes slips past this check because Postgres inlines its body into the index expression; do not rely on that.

Changing the return type with `CREATE OR REPLACE`:

```sql
-- ERROR 42P13: cannot change return type of existing function
CREATE OR REPLACE FUNCTION discounted(p numeric, pct int) RETURNS int
  LANGUAGE sql IMMUTABLE RETURN round(p * (100 - pct) / 100, 0);
```

To change the return type, `DROP FUNCTION` and create it again, after checking which views or functions use it.

## Practice

Table `products` holds five products. You write an SQL function for the after-tax price, a PL/pgSQL function that bands prices, a function that returns a table, then overload a name and drop exactly one version; then two questions.

## Recap

- `LANGUAGE sql` for one expression or one query; `LANGUAGE plpgsql` when you need variables, `IF`, loops.
- `RETURNS SETOF` / `RETURNS TABLE` return many rows and are called in `FROM`.
- `IMMUTABLE`, `STABLE`, `VOLATILE` are promises to the planner; only an `IMMUTABLE` function can go into an index.
- A function is identified by its name plus argument types: `DROP FUNCTION` needs the signature when the name is overloaded.
- `CREATE OR REPLACE` cannot change the return type (`42P13`).
