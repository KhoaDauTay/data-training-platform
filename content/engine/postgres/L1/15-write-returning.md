---
id: e-pg-l1-15
engine: postgres
level: L1
module: write
title: Ghi dữ liệu và RETURNING
title_en: Writing data and RETURNING
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Thêm nhiều dòng trong một câu `INSERT`, kể cả chép từ bảng khác bằng `INSERT ... SELECT`.
    en: Insert several rows in one `INSERT`, including copying from another table with `INSERT ... SELECT`.
  - vi: Sửa và xóa đúng những dòng cần bằng `WHERE`, `UPDATE ... FROM` và `DELETE ... USING`.
    en: Update and delete exactly the rows you mean with `WHERE`, `UPDATE ... FROM` and `DELETE ... USING`.
  - vi: Đọc lại dòng vừa ghi bằng `RETURNING`, kể cả giá trị cũ qua `old` (Postgres 18).
    en: Read back the rows you just wrote with `RETURNING`, including the previous values through `old` (Postgres 18).
requires: [e-pg-l1-03]
sources:
  - https://www.postgresql.org/docs/18/sql-insert.html
  - https://www.postgresql.org/docs/18/sql-update.html
  - https://www.postgresql.org/docs/18/sql-delete.html
  - https://www.postgresql.org/docs/18/dml-returning.html
lab:
  setup: |
    CREATE TABLE products (
      sku text PRIMARY KEY,
      name text NOT NULL,
      price numeric(10,2) NOT NULL CHECK (price > 0),
      stock int NOT NULL DEFAULT 0
    );
    INSERT INTO products VALUES
      ('P01', 'Pen', 1.50, 40), ('P02', 'Notebook', 3.20, 25), ('P03', 'Stapler', 7.90, 4),
      ('P04', 'Marker', 2.10, 0), ('P05', 'Folder', 0.90, 60), ('P06', 'Eraser', 0.60, 0);
    CREATE TABLE supplier_prices (sku text PRIMARY KEY, price numeric(10,2) NOT NULL);
    INSERT INTO supplier_prices VALUES ('P01', 1.70), ('P05', 1.00), ('P09', 4.00);
    CREATE TABLE discontinued (sku text PRIMARY KEY);
    INSERT INTO discontinued VALUES ('P04'), ('P05'), ('P06');
    CREATE TABLE price_log (id int PRIMARY KEY, sku text NOT NULL, price numeric(10,2) NOT NULL, changed_on date NOT NULL);
    INSERT INTO price_log VALUES (1, 'P02', 3.50, '2026-11-01'), (2, 'P02', 3.40, '2026-11-15'), (3, 'P03', 8.20, '2026-11-10');
    CREATE TABLE restock (sku text PRIMARY KEY, qty int NOT NULL CHECK (qty > 0));
  steps:
    - task:
        vi: "Thêm hai sản phẩm trong một câu: (`P07`, `Scissors`, giá 4.50, tồn kho để mặc định) và (`P08`, `Tape`, giá 1.10, tồn kho 30). Trả về `sku, name, price, stock`."
        en: "Add two products in one statement: (`P07`, `Scissors`, price 4.50, stock left to its default) and (`P08`, `Tape`, price 1.10, stock 30). Return `sku, name, price, stock`."
      solution: INSERT INTO products (sku, name, price, stock) VALUES ('P07', 'Scissors', 4.50, DEFAULT), ('P08', 'Tape', 1.10, 30) RETURNING sku, name, price, stock
      check: rows
      hint:
        vi: "Nhiều bộ giá trị cách nhau bằng dấu phẩy; từ khóa `DEFAULT` lấy giá trị mặc định của cột."
        en: "Several value lists separated by commas; the keyword `DEFAULT` takes the column's default."
    - task:
        vi: "Nhà cung cấp gửi bảng giá `supplier_prices`. Đặt giá mới cho mọi sản phẩm có trong bảng đó và trả về `sku, price` của các dòng đã sửa."
        en: "The supplier sent the price list `supplier_prices`. Set the new price on every product listed there and return `sku, price` of the changed rows."
      solution: UPDATE products p SET price = s.price FROM supplier_prices s WHERE s.sku = p.sku RETURNING p.sku, p.price
      check: rows
      hint:
        vi: "`UPDATE products p SET ... FROM supplier_prices s WHERE s.sku = p.sku`."
        en: "`UPDATE products p SET ... FROM supplier_prices s WHERE s.sku = p.sku`."
    - task:
        vi: "Xóa các sản phẩm vừa nằm trong `discontinued` vừa hết hàng (tồn kho 0). Trả về `sku, name` của dòng bị xóa."
        en: "Delete the products that are both listed in `discontinued` and out of stock (stock 0). Return `sku, name` of the deleted rows."
      solution: DELETE FROM products p USING discontinued d WHERE d.sku = p.sku AND p.stock = 0 RETURNING p.sku, p.name
      check: rows
      hint:
        vi: "`DELETE FROM products p USING discontinued d WHERE ...`, nhớ thêm điều kiện tồn kho."
        en: "`DELETE FROM products p USING discontinued d WHERE ...`, and keep the stock condition."
    - task:
        vi: "Ghi vào `restock` mọi sản phẩm còn dưới 10 cái, với số lượng đặt là `50 - stock`. Trả về `sku, qty`."
        en: "Write into `restock` every product with fewer than 10 left, ordering `50 - stock` units. Return `sku, qty`."
      solution: INSERT INTO restock (sku, qty) SELECT sku, 50 - stock FROM products WHERE stock < 10 RETURNING sku, qty
      check: rows
      hint:
        vi: "`INSERT INTO restock (sku, qty) SELECT ...`: không có `VALUES`, câu `SELECT` cung cấp các dòng."
        en: "`INSERT INTO restock (sku, qty) SELECT ...`: no `VALUES`, the `SELECT` supplies the rows."
    - task:
        vi: "Vừa bán 3 cái `P03`. Giảm tồn kho của nó đi 3 và trả về `sku`, tồn kho trước (`stock_before`) và sau (`stock_after`)."
        en: "Three `P03` were just sold. Lower its stock by 3 and return `sku`, the stock before (`stock_before`) and after (`stock_after`)."
      solution: UPDATE products SET stock = stock - 3 WHERE sku = 'P03' RETURNING sku, old.stock AS stock_before, new.stock AS stock_after
      check: rows
      hint:
        vi: "Trong `RETURNING` của Postgres 18, `old.stock` là giá trị trước câu lệnh, `new.stock` là giá trị sau."
        en: "In the `RETURNING` of Postgres 18, `old.stock` is the value before the statement, `new.stock` the value after."
quiz:
  - q:
      vi: "Câu `UPDATE products SET price = price * 2 WHERE sku = 'P01' RETURNING price` trả về giá nào?"
      en: "Which price does `UPDATE products SET price = price * 2 WHERE sku = 'P01' RETURNING price` return?"
    options:
      - { vi: "Giá cũ, trước khi nhân đôi", en: "The old price, before doubling" }
      - { vi: "Giá mới, đã nhân đôi", en: "The new price, already doubled" }
      - { vi: "Cả hai, trong hai cột", en: "Both, in two columns" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì nhiều người coi `RETURNING` như bản ghi lại dữ liệu bị thay, nhưng với `UPDATE` cột không tiền tố là giá trị mới. Muốn giá cũ, Postgres 18 cho viết `old.price`; muốn cả hai thì ghi `old.price, new.price`."
      en: "It sounds right because many people treat `RETURNING` as a record of the data being replaced, but for `UPDATE` an unprefixed column is the new value. For the old price Postgres 18 lets you write `old.price`; for both, write `old.price, new.price`."
  - q:
      vi: "Trong `UPDATE ... FROM`, hai dòng của bảng nguồn cùng khớp một dòng đích. Điều gì xảy ra?"
      en: "In an `UPDATE ... FROM`, two rows of the source table match the same target row. What happens?"
    options:
      - { vi: "Postgres báo lỗi và không sửa gì", en: "Postgres raises an error and changes nothing" }
      - { vi: "Dòng đích được sửa một lần, bằng một dòng nguồn không đoán trước được", en: "The target row is updated once, from a source row you cannot predict" }
      - { vi: "Dòng đích được sửa hai lần, lần sau thắng", en: "The target row is updated twice and the second one wins" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `ON CONFLICT DO UPDATE` báo lỗi khi đụng một dòng hai lần, nhưng `UPDATE ... FROM` thì không: nó lặng lẽ dùng một dòng nguồn. Hãy thu bảng nguồn về một dòng cho mỗi khóa trước khi sửa."
      en: "It sounds right because `ON CONFLICT DO UPDATE` errors when it touches a row twice, but `UPDATE ... FROM` does not: it silently uses one source row. Reduce the source to one row per key before the update."
---
## Mở bài

Kho văn phòng phẩm vừa nhận bảng giá mới, có hàng ngừng bán và có hàng sắp hết. Bạn phải thêm, sửa, xóa đúng những dòng cần, và biết chắc mình đã đổi gì mà không cần chạy thêm câu `SELECT`.

## Ý chính

`INSERT` nhận nhiều bộ giá trị trong một câu, rẻ hơn nhiều câu rời vì chỉ đi một vòng tới server. Thay `VALUES` bằng một câu `SELECT` là chép dòng từ bảng khác. Cột bị bỏ qua, hoặc ghi rõ `DEFAULT`, nhận giá trị mặc định của nó. Giá trị khớp với danh sách cột theo vị trí, không theo tên.

`UPDATE` và `DELETE` tác động lên mọi dòng thỏa `WHERE`; không có `WHERE` là mọi dòng của bảng. Khi điều kiện nằm ở bảng khác, `UPDATE ... FROM` và `DELETE ... USING` nối bảng đó vào như một phép join.

`RETURNING` biến câu ghi thành câu đọc: nó trả về các dòng vừa thêm, sửa hay xóa, có thể kèm biểu thức tính. Nhiều người nghĩ `RETURNING` của `UPDATE` cho thấy giá trị cũ. Thật ra cột không tiền tố là giá trị mới; từ Postgres 18 bạn viết `old.price` cho giá trị trước và `new.price` cho giá trị sau.

## Cú pháp

```sql
INSERT INTO table [ ( column [, ...] ) ]
  { VALUES ( { expression | DEFAULT } [, ...] ) [, ...] | query }
  [ RETURNING output [, ...] ];
UPDATE table [ alias ] SET column = expression [, ...]
  [ FROM other_table ] [ WHERE condition ]
  [ RETURNING { old.column | new.column | expression } [, ...] ];
DELETE FROM table [ alias ] [ USING other_table ] [ WHERE condition ]
  [ RETURNING output [, ...] ];
```

- `query`: một `SELECT` cung cấp các dòng cần thêm.
- `FROM` / `USING`: bảng khác dùng trong điều kiện, như một join.
- `old.column` / `new.column`: giá trị trước và sau câu lệnh (Postgres 18).

## Ví dụ

Thêm hai dòng, một dòng lấy tồn kho mặc định, và trả về một cột tính:

```sql
INSERT INTO products (sku, name, price, stock)
VALUES ('P10', 'Ruler', 1.20, DEFAULT), ('P11', 'Glue', 2.40, 12)
RETURNING sku, stock, price * stock AS stock_value;
```

Chép từ bảng này sang bảng khác bằng `INSERT ... SELECT`:

```sql
INSERT INTO restock (sku, qty)
SELECT sku, 100 FROM products WHERE price < 1.00
RETURNING sku, qty;
```

Sửa giá và xem cả giá trước lẫn giá sau:

```sql
UPDATE products SET price = price * 1.10 WHERE sku = 'P02'
RETURNING sku, old.price AS old_price, new.price AS new_price;
```

```sql
DELETE FROM restock WHERE qty >= 100
RETURNING sku, qty;
```

`P02` đi từ 3.20 lên 3.52 (cột `numeric(10,2)` tự làm tròn). Câu cuối trả về đúng hai dòng vừa xóa, nên không cần đếm lại.

## Lỗi hay gặp

Quên `WHERE` trong `UPDATE` (hay `DELETE`):

```sql
-- WRONG: no WHERE, every row changes
BEGIN;
UPDATE products SET stock = 0 RETURNING sku, stock;
ROLLBACK;
```

```sql
-- FIX: name the rows with WHERE
UPDATE products SET stock = 0 WHERE sku = 'P04'
RETURNING sku, stock;
```

Câu sai trả về mọi sản phẩm. Ở đây `ROLLBACK` cứu được; ngoài transaction thì không. Hãy viết `WHERE` trước, thử bằng `SELECT` hoặc đặt trong `BEGIN`, xem `RETURNING` rồi mới `COMMIT`.

Danh sách cột một thứ tự, giá trị một thứ tự khác:

```sql
-- WRONG: the column list says name first, the values give the sku first
INSERT INTO products (name, sku, price) VALUES ('P20', 'Tape roll', 1.10)
RETURNING sku, name;
```

```sql
-- FIX: values in the same order as the column list
INSERT INTO products (name, sku, price) VALUES ('Tape roll', 'P20', 1.10)
RETURNING sku, name;
```

Cả hai cột đều là `text` nên không có lỗi kiểu nào báo hộ: mã và tên bị đổi chỗ trong im lặng. Luôn ghi danh sách cột và đọc lại bằng `RETURNING`.

`UPDATE ... FROM` khi bảng nguồn có hai dòng cho một sản phẩm:

```sql
-- WRONG: two log rows match P02, Postgres uses one of them, no error
UPDATE products p SET price = l.price
FROM price_log l WHERE l.sku = p.sku
RETURNING p.sku, p.price;
```

```sql
-- FIX: keep only the latest log row per product
UPDATE products p SET price = l.price
FROM price_log l
WHERE l.sku = p.sku
  AND l.changed_on = (SELECT max(x.changed_on) FROM price_log x WHERE x.sku = l.sku)
RETURNING p.sku, p.price;
```

Câu sai lấy giá 3.50 cũ của `P02` thay vì 3.40 mới nhất. Dòng nguồn nào thắng tùy kế hoạch thực thi, nên kết quả có thể đổi theo dữ liệu. Thu nguồn về một dòng cho mỗi khóa trước khi sửa.

## Thực hành

Năm bước trên kho hàng: thêm nhiều dòng một lúc, áp bảng giá nhà cung cấp, xóa hàng ngừng bán đã hết, lập phiếu đặt hàng bằng `INSERT ... SELECT`, rồi ghi một lần bán và đọc tồn kho trước và sau. Sau đó là hai câu hỏi.

## Tóm tắt

- Một `INSERT` thêm được nhiều dòng; `INSERT ... SELECT` chép dòng từ bảng khác; giá trị khớp cột theo vị trí.
- `UPDATE` và `DELETE` không có `WHERE` đụng mọi dòng; thử trong `BEGIN` trước khi `COMMIT`.
- `UPDATE ... FROM` và `DELETE ... USING` lọc theo bảng khác; nguồn phải có một dòng cho mỗi khóa.
- `RETURNING` trả về dòng vừa ghi; với `UPDATE`, cột trơn là giá trị mới, `old.price` là giá trị cũ (Postgres 18).

# EN

## Opening

The stationery store just got a new price list, some items were discontinued and some are running low. You must insert, update and delete exactly the right rows, and know for sure what you changed without running another `SELECT`.

## Key idea

`INSERT` takes several value lists in one statement, which is cheaper than separate statements because it makes one round trip to the server. Replace `VALUES` with a `SELECT` and you copy rows from another table. A column you leave out, or set to `DEFAULT`, gets its default value. Values match the column list by position, not by name.

`UPDATE` and `DELETE` act on every row that passes `WHERE`; with no `WHERE` that is every row of the table. When the condition lives in another table, `UPDATE ... FROM` and `DELETE ... USING` bring it in like a join.

`RETURNING` turns a write into a read: it returns the rows just inserted, updated or deleted, and can add computed expressions. Many people think the `RETURNING` of an `UPDATE` shows the old values. In fact an unprefixed column is the new value; since Postgres 18 you write `old.price` for the value before and `new.price` for the value after.

## Syntax

```sql
INSERT INTO table [ ( column [, ...] ) ]
  { VALUES ( { expression | DEFAULT } [, ...] ) [, ...] | query }
  [ RETURNING output [, ...] ];
UPDATE table [ alias ] SET column = expression [, ...]
  [ FROM other_table ] [ WHERE condition ]
  [ RETURNING { old.column | new.column | expression } [, ...] ];
DELETE FROM table [ alias ] [ USING other_table ] [ WHERE condition ]
  [ RETURNING output [, ...] ];
```

- `query`: a `SELECT` that supplies the rows to insert.
- `FROM` / `USING`: another table used in the condition, like a join.
- `old.column` / `new.column`: the value before and after the statement (Postgres 18).

## Example

Insert two rows, one taking the default stock, and return a computed column:

```sql
INSERT INTO products (sku, name, price, stock)
VALUES ('P10', 'Ruler', 1.20, DEFAULT), ('P11', 'Glue', 2.40, 12)
RETURNING sku, stock, price * stock AS stock_value;
```

Copy from one table into another with `INSERT ... SELECT`:

```sql
INSERT INTO restock (sku, qty)
SELECT sku, 100 FROM products WHERE price < 1.00
RETURNING sku, qty;
```

Change a price and see both the price before and the price after:

```sql
UPDATE products SET price = price * 1.10 WHERE sku = 'P02'
RETURNING sku, old.price AS old_price, new.price AS new_price;
```

```sql
DELETE FROM restock WHERE qty >= 100
RETURNING sku, qty;
```

`P02` goes from 3.20 to 3.52 (the `numeric(10,2)` column rounds by itself). The last statement returns exactly the two rows it deleted, so there is nothing to count again.

## Common mistakes

Forgetting `WHERE` in an `UPDATE` (or a `DELETE`):

```sql
-- WRONG: no WHERE, every row changes
BEGIN;
UPDATE products SET stock = 0 RETURNING sku, stock;
ROLLBACK;
```

```sql
-- FIX: name the rows with WHERE
UPDATE products SET stock = 0 WHERE sku = 'P04'
RETURNING sku, stock;
```

The wrong version returns every product. Here `ROLLBACK` saves you; outside a transaction nothing does. Write the `WHERE` first, try it as a `SELECT` or inside `BEGIN`, read the `RETURNING`, then `COMMIT`.

A column list in one order, values in another:

```sql
-- WRONG: the column list says name first, the values give the sku first
INSERT INTO products (name, sku, price) VALUES ('P20', 'Tape roll', 1.10)
RETURNING sku, name;
```

```sql
-- FIX: values in the same order as the column list
INSERT INTO products (name, sku, price) VALUES ('Tape roll', 'P20', 1.10)
RETURNING sku, name;
```

Both columns are `text`, so no type error warns you: code and name are swapped silently. Always write the column list and read it back with `RETURNING`.

`UPDATE ... FROM` when the source has two rows for one product:

```sql
-- WRONG: two log rows match P02, Postgres uses one of them, no error
UPDATE products p SET price = l.price
FROM price_log l WHERE l.sku = p.sku
RETURNING p.sku, p.price;
```

```sql
-- FIX: keep only the latest log row per product
UPDATE products p SET price = l.price
FROM price_log l
WHERE l.sku = p.sku
  AND l.changed_on = (SELECT max(x.changed_on) FROM price_log x WHERE x.sku = l.sku)
RETURNING p.sku, p.price;
```

The wrong version takes the old 3.50 for `P02` instead of the latest 3.40. Which source row wins depends on the plan, so the result can change with the data. Reduce the source to one row per key before the update.

## Practice

Five steps on the store: insert several rows at once, apply the supplier price list, delete discontinued items that are out of stock, build a restock order with `INSERT ... SELECT`, then record a sale and read the stock before and after. Then two questions.

## Recap

- One `INSERT` can add many rows; `INSERT ... SELECT` copies rows from another table; values match columns by position.
- `UPDATE` and `DELETE` without `WHERE` touch every row; try them inside `BEGIN` before `COMMIT`.
- `UPDATE ... FROM` and `DELETE ... USING` filter by another table; the source must have one row per key.
- `RETURNING` returns the rows just written; for `UPDATE`, a plain column is the new value and `old.price` the old one (Postgres 18).
