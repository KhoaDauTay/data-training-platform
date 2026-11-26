---
id: e-pg-l2-19
engine: postgres
level: L2
module: functions
title: Thủ tục, CALL, vòng lặp và cursor
title_en: Procedures, CALL, loops and cursors
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Viết thủ tục bằng `CREATE PROCEDURE`, gọi bằng `CALL`, và biết khi nào thủ tục được `COMMIT` bên trong.
    en: Write a procedure with `CREATE PROCEDURE`, run it with `CALL`, and know when a procedure may `COMMIT` inside.
  - vi: Viết khối `DO` với `FOR`, `WHILE`, `EXIT`, `CONTINUE`, và thay vòng lặp từng dòng bằng một câu lệnh theo tập.
    en: Write a `DO` block with `FOR`, `WHILE`, `EXIT`, `CONTINUE`, and replace a row-by-row loop with one set-based statement.
  - vi: Đọc kết quả từng phần bằng cursor, trong PL/pgSQL và bằng `DECLARE ... CURSOR` của SQL.
    en: Read a result piece by piece with a cursor, in PL/pgSQL and with SQL `DECLARE ... CURSOR`.
requires: [e-pg-l2-18]
sources:
  - https://www.postgresql.org/docs/18/sql-createprocedure.html
  - https://www.postgresql.org/docs/18/sql-call.html
  - https://www.postgresql.org/docs/18/plpgsql-control-structures.html
  - https://www.postgresql.org/docs/18/plpgsql-cursors.html
  - https://www.postgresql.org/docs/18/plpgsql-transactions.html
  - https://www.postgresql.org/docs/18/sql-declare.html
lab:
  setup: |
    CREATE TABLE orders (
      id int PRIMARY KEY,
      customer text NOT NULL,
      amount numeric(12,0) NOT NULL CHECK (amount > 0),
      status text NOT NULL DEFAULT 'new'
    );
    CREATE TABLE order_log (
      id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id int NOT NULL REFERENCES orders (id),
      note text NOT NULL
    );
    INSERT INTO orders (id, customer, amount) VALUES
      (1, 'An', 120000), (2, 'Binh', 650000), (3, 'An', 80000),
      (4, 'Chi', 1250000), (5, 'Binh', 300000), (6, 'Dung', 990000);
  steps:
    - task:
        vi: "Viết thủ tục `close_order(p_id int)` bằng `LANGUAGE sql` với thân `BEGIN ATOMIC`: đặt `status` của đơn đó thành `closed`, rồi ghi một dòng `order_log` với ghi chú `closed`."
        en: "Write a procedure `close_order(p_id int)` in `LANGUAGE sql` with a `BEGIN ATOMIC` body: set that order's `status` to `closed`, then write one `order_log` row with the note `closed`."
      solution: "CREATE PROCEDURE close_order(p_id int) LANGUAGE sql BEGIN ATOMIC UPDATE orders SET status = 'closed' WHERE id = p_id; INSERT INTO order_log (order_id, note) VALUES (p_id, 'closed'); END"
      check: catalog
      hint:
        vi: "`CREATE PROCEDURE name(arg type) LANGUAGE sql BEGIN ATOMIC statement1; statement2; END`. Thân này được lưu ở dạng đã phân tích, nên khoảng trắng không quan trọng."
        en: "`CREATE PROCEDURE name(arg type) LANGUAGE sql BEGIN ATOMIC statement1; statement2; END`. This body is stored in parsed form, so spacing does not matter."
    - task:
        vi: Đóng đơn số 4 bằng thủ tục vừa viết.
        en: Close order 4 with the procedure you just wrote.
      solution: CALL close_order(4)
      after: SELECT o.id, o.status, (SELECT count(*) FROM order_log l WHERE l.order_id = o.id) AS logs FROM orders o ORDER BY o.id
      check: rows
      hint:
        vi: "Thủ tục được gọi bằng `CALL`, không bằng `SELECT`."
        en: "A procedure is run with `CALL`, not with `SELECT`."
    - task:
        vi: "Viết một khối `DO` có vòng `FOR rec IN query LOOP`: với mỗi đơn từ 500000 trở lên, ghi một dòng `order_log` với ghi chú `big`."
        en: "Write a `DO` block with a `FOR rec IN query LOOP`: for each order of 500000 or more, write one `order_log` row with the note `big`."
      solution: |-
        DO $$
        DECLARE
          r record;
        BEGIN
          FOR r IN SELECT id FROM orders WHERE amount >= 500000 LOOP
            INSERT INTO order_log (order_id, note) VALUES (r.id, 'big');
          END LOOP;
        END $$
      after: SELECT order_id, note FROM order_log ORDER BY order_id, note
      check: rows
      hint:
        vi: "`DO $$ DECLARE r record; BEGIN FOR r IN SELECT ... LOOP INSERT ...; END LOOP; END $$`. Bài chấm trên các dòng `order_log` sau khi khối chạy."
        en: "`DO $$ DECLARE r record; BEGIN FOR r IN SELECT ... LOOP INSERT ...; END LOOP; END $$`. The step is graded on the `order_log` rows after the block runs."
    - task:
        vi: "Làm lại cùng việc theo tập, không vòng lặp: một câu `INSERT ... SELECT` ghi `vip` cho mọi đơn của khách `Binh`, trả lại mã đơn và ghi chú bằng `RETURNING`."
        en: "Do the same kind of work set-based, with no loop: one `INSERT ... SELECT` that writes `vip` for every order of customer `Binh`, returning the order id and the note with `RETURNING`."
      solution: INSERT INTO order_log (order_id, note) SELECT id, 'vip' FROM orders WHERE customer = 'Binh' RETURNING order_id, note
      check: rows
      hint:
        vi: "`INSERT INTO t (cols) SELECT ... FROM ... WHERE ... RETURNING cols`: một câu, một lần quét bảng."
        en: "`INSERT INTO t (cols) SELECT ... FROM ... WHERE ... RETURNING cols`: one statement, one pass over the table."
    - task:
        vi: "Viết hàm PL/pgSQL `top_orders(n int)` trả về `SETOF int`: mở một cursor trên các đơn xếp theo số tiền giảm dần (hòa thì mã nhỏ trước), `FETCH` tối đa `n` mã, rồi đóng cursor."
        en: "Write a PL/pgSQL function `top_orders(n int)` returning `SETOF int`: open a cursor over the orders by amount, largest first (ties: smaller id first), `FETCH` at most `n` ids, then close the cursor."
      solution: |-
        CREATE FUNCTION top_orders(n int) RETURNS SETOF int LANGUAGE plpgsql STABLE AS $$
        DECLARE
          c CURSOR FOR SELECT id FROM orders ORDER BY amount DESC, id;
          v int;
        BEGIN
          OPEN c;
          FOR k IN 1..n LOOP
            FETCH c INTO v;
            EXIT WHEN NOT FOUND;
            RETURN NEXT v;
          END LOOP;
          CLOSE c;
        END $$
      after: SELECT * FROM top_orders(3)
      check: rows
      hint:
        vi: "`DECLARE c CURSOR FOR SELECT ...;` rồi `OPEN c;`, trong vòng `FETCH c INTO v; EXIT WHEN NOT FOUND; RETURN NEXT v;`, cuối cùng `CLOSE c;`."
        en: "`DECLARE c CURSOR FOR SELECT ...;` then `OPEN c;`, in the loop `FETCH c INTO v; EXIT WHEN NOT FOUND; RETURN NEXT v;`, finally `CLOSE c;`."
quiz:
  - q:
      vi: "Một khối `DO` lặp qua 1 triệu đơn và `UPDATE` từng đơn. Một câu `UPDATE ... WHERE` làm cùng việc. Câu nào đúng?"
      en: "A `DO` block loops over 1 million orders and runs an `UPDATE` for each. One `UPDATE ... WHERE` does the same work. Which is true?"
    options:
      - { vi: "Hai cách nhanh như nhau, vì cả hai đều chạy trong server", en: "Both are equally fast, because both run inside the server" }
      - { vi: "Câu theo tập thường nhanh hơn nhiều: một lần lập kế hoạch, một lần quét, không có chi phí cho từng dòng", en: "The set-based statement is usually much faster: one plan, one pass, no cost per row" }
      - { vi: "Vòng lặp nhanh hơn vì mỗi UPDATE nhỏ hơn", en: "The loop is faster because each UPDATE is smaller" }
    answer: 1
    trap: 0
    why:
      vi: "Đúng là khối `DO` không tốn vòng qua mạng, nhưng nó vẫn chạy 1 triệu câu `UPDATE` riêng: mỗi câu được thực thi riêng, tìm lại dòng của nó qua index rồi cập nhật index, một triệu lần. Mỗi `UPDATE` nhỏ hơn không làm tổng nhỏ hơn, vì chi phí cố định của từng câu bị nhân 1 triệu. Một câu `UPDATE ... WHERE` được lập kế hoạch một lần và đọc bảng một lượt."
      en: "True, a `DO` block has no network round trips, but it still runs 1 million separate `UPDATE` statements: each is executed on its own, finds its row again through the index and updates the indexes, a million times. A smaller `UPDATE` does not make the total smaller, since each statement's fixed cost is multiplied by 1 million. One `UPDATE ... WHERE` is planned once and reads the table in one pass."
  - q:
      vi: "Thủ tục `archive()` có `COMMIT` bên trong. Bạn chạy `BEGIN; CALL archive();`. Chuyện gì xảy ra?"
      en: "Procedure `archive()` has a `COMMIT` inside. You run `BEGIN; CALL archive();`. What happens?"
    options:
      - { vi: "Chạy bình thường, `COMMIT` bên trong commit luôn transaction ngoài", en: "It runs, and the inner `COMMIT` also commits the outer transaction" }
      - { vi: "Lỗi `2D000`: thủ tục chỉ được COMMIT khi `CALL` không nằm trong một khối transaction", en: "Error `2D000`: a procedure may only COMMIT when `CALL` is not inside a transaction block" }
      - { vi: "`COMMIT` bên trong bị bỏ qua", en: "The inner `COMMIT` is ignored" }
    answer: 1
    trap: 0
    why:
      vi: "COMMIT trông như một lệnh độc lập, nhưng khi bạn đã mở `BEGIN`, transaction thuộc về bạn, và thủ tục không được kết thúc nó thay bạn. Postgres cũng không lặng lẽ bỏ qua `COMMIT` đó: nó dừng thủ tục với lỗi `2D000` (kết thúc transaction không hợp lệ). Gọi `CALL` ngoài khối transaction thì thủ tục mới tự commit được."
      en: "COMMIT looks like a standalone command, but once you opened `BEGIN` the transaction belongs to you, and the procedure may not end it for you. Postgres does not silently skip that `COMMIT` either: it stops the procedure with error `2D000` (invalid transaction termination). Only a `CALL` outside a transaction block lets the procedure commit by itself."
---
## Mở bài

Cuối ngày, nhóm vận hành phải đóng hàng trăm đơn và ghi nhật ký cho từng đơn. Gõ tay từng câu thì chậm và dễ sót. Bài này gói việc đó vào thủ tục và khối lệnh, rồi xem khi nào vòng lặp là lựa chọn tồi.

## Ý chính

Thủ tục (`CREATE PROCEDURE`) giống hàm nhưng không có giá trị trả về và được gọi bằng `CALL`, không nằm trong `SELECT`. Nó trả dữ liệu ra qua tham số `INOUT`. Khác biệt lớn: khi `CALL` chạy ngoài một khối transaction, thủ tục được `COMMIT` hoặc `ROLLBACK` giữa chừng, hữu ích cho việc xử lý dữ liệu theo từng mẻ. Hàm không bao giờ được làm vậy.

Khối `DO` là đoạn PL/pgSQL chạy một lần, không lưu lại. Bên trong có `FOR i IN 1..10 LOOP`, `FOR rec IN query LOOP`, `WHILE condition LOOP`; `EXIT` thoát vòng, `CONTINUE` bỏ qua phần còn lại của vòng hiện tại.

Nhiều người nghĩ vòng lặp chạy trong server thì nhanh như một câu SQL. Thật ra mỗi vòng là một câu lệnh riêng: tìm dòng, ghi dòng, cập nhật index từng lần. Một câu theo tập như `INSERT ... SELECT` hay `UPDATE ... WHERE` để planner xử lý mọi dòng trong một lần quét. Chỉ dùng vòng lặp khi mỗi dòng cần một quyết định mà SQL không diễn đạt được.

Cursor đọc một kết quả từng phần thay vì lấy hết một lần. Trong PL/pgSQL: `OPEN`, `FETCH ... INTO`, `CLOSE`. Ở mức SQL: `DECLARE ... CURSOR` rồi `FETCH`, và chỉ chạy được trong `BEGIN ... COMMIT`.

## Cú pháp

```sql
CREATE [ OR REPLACE ] PROCEDURE name ( [ IN | INOUT ] arg type [, ...] )
  LANGUAGE plpgsql AS $$ body $$ | LANGUAGE sql BEGIN ATOMIC statement; [...] END;
CALL name ( value [, ...] );
DO $$ [ DECLARE ... ] BEGIN ... END $$;
-- FOR i IN a..b LOOP ... END LOOP;  FOR rec IN query LOOP ... END LOOP;
-- WHILE condition LOOP ... END LOOP;  EXIT [ WHEN cond ];  CONTINUE [ WHEN cond ];
DECLARE cursor_name CURSOR FOR query;  FETCH [ count | NEXT ] FROM cursor_name;  CLOSE cursor_name;
```

- `INOUT`: tham số thủ tục dùng để trả giá trị; `CALL` trả nó thành một dòng.
- `COMMIT` trong thủ tục: chỉ khi `CALL` không nằm trong `BEGIN`.
- `EXIT WHEN` / `CONTINUE WHEN`: thoát hoặc bỏ qua vòng hiện tại khi điều kiện đúng.
- `FETCH count`: lấy tối đa `count` dòng kế tiếp; hết dòng thì trả rỗng.

## Ví dụ

Thủ tục có tham số `INOUT` và `COMMIT` bên trong:

```sql
CREATE PROCEDURE mark_paid(p_customer text, INOUT changed int DEFAULT 0) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders SET status = 'paid' WHERE customer = p_customer AND status = 'new';
  GET DIAGNOSTICS changed = ROW_COUNT;
  COMMIT;
END $$;
CALL mark_paid('An');
```

`CALL` trả một dòng `changed = 2`: hai đơn của An đã được trả tiền và đã commit.

Khối `DO` với `CONTINUE` và `EXIT`:

```sql
DO $$
DECLARE
  r record;
  total numeric := 0;
BEGIN
  FOR r IN SELECT id, amount FROM orders ORDER BY id LOOP
    CONTINUE WHEN r.amount < 200000;
    total := total + r.amount;
    EXIT WHEN total > 2000000;
    INSERT INTO order_log (order_id, note) VALUES (r.id, 'counted');
  END LOOP;
END $$;
SELECT order_id, note FROM order_log ORDER BY order_id;
```

Đơn dưới 200000 bị bỏ qua; vòng dừng khi tổng vượt 2000000, nên chỉ đơn 2 và 4 được ghi.

Cursor ở mức SQL, trong một transaction:

```sql
BEGIN;
DECLARE big CURSOR FOR SELECT id, amount FROM orders ORDER BY amount DESC, id;
FETCH 2 FROM big;
```

```sql
FETCH NEXT FROM big;
CLOSE big;
COMMIT;
```

Lần `FETCH` đầu lấy hai đơn lớn nhất, lần sau lấy đơn thứ ba; cursor nhớ vị trí giữa các lần gọi.

## Lỗi hay gặp

Gọi thủ tục có `COMMIT` bên trong một transaction:

```sql
BEGIN;
-- ERROR 2D000: invalid transaction termination
CALL mark_paid('Binh');
```

```sql
ROLLBACK;
CALL mark_paid('Binh');
```

Transaction mở bằng `BEGIN` là của bạn, thủ tục không được kết thúc nó. Kết thúc transaction trước, rồi `CALL` ở ngoài.

Gọi thủ tục như một hàm:

```sql
-- ERROR 42809: mark_paid(unknown) is a procedure
SELECT mark_paid('Chi');
```

Thủ tục chỉ chạy bằng `CALL`. Cần dùng kết quả trong một câu `SELECT` thì viết hàm.

Khai báo cursor SQL ngoài transaction:

```sql
-- ERROR 25P01: DECLARE CURSOR can only be used in transaction blocks
DECLARE late CURSOR FOR SELECT id FROM orders;
```

Một cursor thường chỉ sống đến cuối transaction, nên phải mở `BEGIN` trước `DECLARE`.

## Thực hành

Bảng `orders` có sáu đơn, bảng `order_log` đang trống. Bạn viết và gọi một thủ tục, ghi nhật ký bằng vòng lặp rồi bằng một câu theo tập, và cuối cùng đọc các đơn lớn nhất qua cursor; sau đó là hai câu hỏi.

## Tóm tắt

- Thủ tục chạy bằng `CALL`, trả dữ liệu qua `INOUT`, và được `COMMIT` bên trong khi `CALL` không nằm trong `BEGIN`.
- `DO` chạy một đoạn PL/pgSQL một lần; vòng `FOR`, `WHILE` điều khiển bằng `EXIT` và `CONTINUE`.
- Vòng lặp từng dòng chậm hơn một câu theo tập; ưu tiên `INSERT ... SELECT`, `UPDATE ... WHERE`.
- Cursor đọc kết quả từng phần: `OPEN`/`FETCH`/`CLOSE` trong PL/pgSQL, `DECLARE ... CURSOR` trong `BEGIN ... COMMIT` ở SQL.

# EN

## Opening

At the end of the day, the operations team must close hundreds of orders and log each one. Typing every statement by hand is slow and easy to get wrong. This lesson wraps that work into procedures and blocks, then shows when a loop is a poor choice.

## Key idea

A procedure (`CREATE PROCEDURE`) is like a function but has no return value and is run with `CALL`, never inside a `SELECT`. It hands data back through `INOUT` parameters. The big difference: when `CALL` runs outside a transaction block, the procedure may `COMMIT` or `ROLLBACK` part way, which helps when processing data in batches. A function never may.

A `DO` block is a piece of PL/pgSQL run once and not stored. Inside it you have `FOR i IN 1..10 LOOP`, `FOR rec IN query LOOP`, `WHILE condition LOOP`; `EXIT` leaves the loop, `CONTINUE` skips the rest of the current iteration.

Many people think a loop running inside the server is as fast as one SQL statement. In fact each iteration is a separate statement: find the row, write it, update indexes, one at a time. One set-based statement such as `INSERT ... SELECT` or `UPDATE ... WHERE` lets the planner handle every row in one pass. Only use a loop when each row needs a decision SQL cannot express.

A cursor reads a result piece by piece instead of all at once. In PL/pgSQL: `OPEN`, `FETCH ... INTO`, `CLOSE`. In SQL: `DECLARE ... CURSOR` then `FETCH`, and only inside `BEGIN ... COMMIT`.

## Syntax

```sql
CREATE [ OR REPLACE ] PROCEDURE name ( [ IN | INOUT ] arg type [, ...] )
  LANGUAGE plpgsql AS $$ body $$ | LANGUAGE sql BEGIN ATOMIC statement; [...] END;
CALL name ( value [, ...] );
DO $$ [ DECLARE ... ] BEGIN ... END $$;
-- FOR i IN a..b LOOP ... END LOOP;  FOR rec IN query LOOP ... END LOOP;
-- WHILE condition LOOP ... END LOOP;  EXIT [ WHEN cond ];  CONTINUE [ WHEN cond ];
DECLARE cursor_name CURSOR FOR query;  FETCH [ count | NEXT ] FROM cursor_name;  CLOSE cursor_name;
```

- `INOUT`: a procedure parameter used to hand a value back; `CALL` returns it as one row.
- `COMMIT` in a procedure: only when `CALL` is not inside `BEGIN`.
- `EXIT WHEN` / `CONTINUE WHEN`: leave the loop or skip the current iteration when the condition holds.
- `FETCH count`: takes at most `count` next rows; returns nothing once the rows run out.

## Example

A procedure with an `INOUT` parameter and a `COMMIT` inside:

```sql
CREATE PROCEDURE mark_paid(p_customer text, INOUT changed int DEFAULT 0) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders SET status = 'paid' WHERE customer = p_customer AND status = 'new';
  GET DIAGNOSTICS changed = ROW_COUNT;
  COMMIT;
END $$;
CALL mark_paid('An');
```

`CALL` returns one row, `changed = 2`: An's two orders are paid and committed.

A `DO` block with `CONTINUE` and `EXIT`:

```sql
DO $$
DECLARE
  r record;
  total numeric := 0;
BEGIN
  FOR r IN SELECT id, amount FROM orders ORDER BY id LOOP
    CONTINUE WHEN r.amount < 200000;
    total := total + r.amount;
    EXIT WHEN total > 2000000;
    INSERT INTO order_log (order_id, note) VALUES (r.id, 'counted');
  END LOOP;
END $$;
SELECT order_id, note FROM order_log ORDER BY order_id;
```

Orders under 200000 are skipped; the loop stops once the total passes 2000000, so only orders 2 and 4 are logged.

A cursor in SQL, inside a transaction:

```sql
BEGIN;
DECLARE big CURSOR FOR SELECT id, amount FROM orders ORDER BY amount DESC, id;
FETCH 2 FROM big;
```

```sql
FETCH NEXT FROM big;
CLOSE big;
COMMIT;
```

The first `FETCH` takes the two largest orders, the next one the third; the cursor remembers its position between calls.

## Common mistakes

Calling a procedure with a `COMMIT` inside from within a transaction:

```sql
BEGIN;
-- ERROR 2D000: invalid transaction termination
CALL mark_paid('Binh');
```

```sql
ROLLBACK;
CALL mark_paid('Binh');
```

A transaction opened with `BEGIN` is yours, and the procedure may not end it. End the transaction first, then `CALL` outside it.

Calling a procedure like a function:

```sql
-- ERROR 42809: mark_paid(unknown) is a procedure
SELECT mark_paid('Chi');
```

A procedure only runs with `CALL`. To use a result inside a `SELECT`, write a function.

Declaring an SQL cursor outside a transaction:

```sql
-- ERROR 25P01: DECLARE CURSOR can only be used in transaction blocks
DECLARE late CURSOR FOR SELECT id FROM orders;
```

A plain cursor lives only until the end of its transaction, so open `BEGIN` before `DECLARE`.

## Practice

Table `orders` holds six orders and `order_log` is empty. You write and call a procedure, log rows with a loop and then with one set-based statement, and finally read the largest orders through a cursor; then two questions.

## Recap

- A procedure runs with `CALL`, hands data back through `INOUT`, and may `COMMIT` inside when `CALL` is not inside `BEGIN`.
- `DO` runs a piece of PL/pgSQL once; `FOR` and `WHILE` loops are steered with `EXIT` and `CONTINUE`.
- A row-by-row loop is slower than one set-based statement; prefer `INSERT ... SELECT`, `UPDATE ... WHERE`.
- A cursor reads a result piece by piece: `OPEN`/`FETCH`/`CLOSE` in PL/pgSQL, `DECLARE ... CURSOR` inside `BEGIN ... COMMIT` in SQL.
