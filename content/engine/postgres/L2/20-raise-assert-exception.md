---
id: e-pg-l2-20
engine: postgres
level: L2
module: functions
title: RAISE, ASSERT, EXCEPTION và SQLSTATE
title_en: RAISE, ASSERT, EXCEPTION and SQLSTATE
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Báo lỗi bằng `RAISE EXCEPTION` kèm mã SQLSTATE, `HINT` và `DETAIL`, và biết `RAISE NOTICE` chỉ là lời nhắn.
    en: Raise an error with `RAISE EXCEPTION` plus an SQLSTATE code, `HINT` and `DETAIL`, and know that `RAISE NOTICE` is only a message.
  - vi: Bắt lỗi bằng `EXCEPTION WHEN` theo tên điều kiện hoặc mã, đọc `SQLSTATE`, `SQLERRM` và `GET STACKED DIAGNOSTICS`.
    en: Catch errors with `EXCEPTION WHEN` by condition name or code, and read `SQLSTATE`, `SQLERRM` and `GET STACKED DIAGNOSTICS`.
  - vi: Dùng `ASSERT` cho điều phải luôn đúng, không cho kiểm tra dữ liệu vào, và biết khối bắt lỗi hoàn tác phần việc bên trong nó.
    en: Use `ASSERT` for things that must always hold, never for input checks, and know a catching block undoes the work inside it.
requires: [e-pg-l2-19]
figures: [{ name: pg-exception-subtx, at: idea }]
sources:
  - { url: https://www.postgresql.org/docs/18/plpgsql-errors-and-messages.html, title_vi: "PL/pgSQL › lỗi và thông báo" }
  - { url: https://www.postgresql.org/docs/18/plpgsql-control-structures.html, title_vi: "PL/pgSQL › cấu trúc điều khiển" }
  - { url: https://www.postgresql.org/docs/18/errcodes-appendix.html, title_vi: "Mã lỗi" }
  - { url: https://www.postgresql.org/docs/18/plpgsql.html, title_vi: "PL/pgSQL" }
lab:
  setup: |
    CREATE TABLE accounts (
      id int PRIMARY KEY,
      owner text NOT NULL UNIQUE,
      balance numeric(12,0) NOT NULL CHECK (balance >= 0)
    );
    INSERT INTO accounts VALUES (1, 'An', 500000), (2, 'Binh', 100000), (3, 'Chi', 0);
    CREATE FUNCTION sqlstate_of(q text) RETURNS text LANGUAGE plpgsql AS $$
    BEGIN
      EXECUTE q;
      RETURN 'ok';
    EXCEPTION WHEN OTHERS THEN
      RETURN SQLSTATE;
    END $$;
  steps:
    - task:
        vi: "Viết hàm `check_amount(amt numeric)` trả về `numeric`: nếu `amt` không lớn hơn 0 thì báo lỗi với mã `22023` (giá trị tham số không hợp lệ), nếu không thì trả lại `amt`. Hàm `sqlstate_of` có sẵn sẽ chạy thử nó."
        en: "Write a function `check_amount(amt numeric)` returning `numeric`: when `amt` is not above 0 it raises an error with code `22023` (invalid parameter value), otherwise it returns `amt`. The ready-made function `sqlstate_of` will try it."
      solution: |-
        CREATE FUNCTION check_amount(amt numeric) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
        BEGIN
          IF amt <= 0 THEN
            RAISE EXCEPTION 'amount must be above 0, got %', amt USING ERRCODE = '22023';
          END IF;
          RETURN amt;
        END $$
      after: "SELECT sqlstate_of('SELECT check_amount(-5)') AS negative, sqlstate_of('SELECT check_amount(0)') AS zero, sqlstate_of('SELECT check_amount(10)') AS positive"
      check: rows
      hint:
        vi: "`RAISE EXCEPTION 'text %', value USING ERRCODE = '22023';` trong một `IF`. Không ghi `ERRCODE` thì mã là `P0001`."
        en: "`RAISE EXCEPTION 'text %', value USING ERRCODE = '22023';` inside an `IF`. Without `ERRCODE` the code is `P0001`."
    - task:
        vi: "Viết hàm `withdraw(p_id int, amt numeric)` trả về `text`: trừ `amt` khỏi số dư rồi trả `ok`; nếu ràng buộc số dư không âm từ chối, bắt lỗi đó và trả `refused ` nối với `SQLSTATE`."
        en: "Write a function `withdraw(p_id int, amt numeric)` returning `text`: subtract `amt` from the balance and return `ok`; when the non-negative balance constraint refuses it, catch that error and return `refused ` followed by `SQLSTATE`."
      solution: |-
        CREATE FUNCTION withdraw(p_id int, amt numeric) RETURNS text LANGUAGE plpgsql AS $$
        BEGIN
          UPDATE accounts SET balance = balance - amt WHERE id = p_id;
          RETURN 'ok';
        EXCEPTION WHEN check_violation THEN
          RETURN 'refused ' || SQLSTATE;
        END $$
      after: SELECT withdraw(2, 300000) AS too_much, withdraw(2, 40000) AS fine
      check: rows
      hint:
        vi: "Thêm `EXCEPTION WHEN check_violation THEN RETURN ...;` trước `END`. Tên điều kiện `check_violation` ứng với mã `23514`."
        en: "Add `EXCEPTION WHEN check_violation THEN RETURN ...;` before `END`. The condition name `check_violation` stands for code `23514`."
    - task:
        vi: "Viết hàm `add_account(p_id int, p_owner text)` trả về `text`: thêm một tài khoản số dư 0 rồi trả `ok`; khi trùng khóa, bắt `unique_violation`, lấy tên ràng buộc bị vi phạm bằng `GET STACKED DIAGNOSTICS` và trả tên đó."
        en: "Write a function `add_account(p_id int, p_owner text)` returning `text`: insert an account with balance 0 and return `ok`; on a duplicate key, catch `unique_violation`, read the violated constraint's name with `GET STACKED DIAGNOSTICS` and return that name."
      solution: |-
        CREATE FUNCTION add_account(p_id int, p_owner text) RETURNS text LANGUAGE plpgsql AS $$
        DECLARE
          con text;
        BEGIN
          INSERT INTO accounts VALUES (p_id, p_owner, 0);
          RETURN 'ok';
        EXCEPTION WHEN unique_violation THEN
          GET STACKED DIAGNOSTICS con = CONSTRAINT_NAME;
          RETURN con;
        END $$
      after: "SELECT add_account(10, 'An') AS same_owner, add_account(1, 'Lan') AS same_id, add_account(11, 'Mai') AS fresh"
      check: rows
      hint:
        vi: "Khai báo một biến `text`, rồi trong nhánh bắt lỗi: `GET STACKED DIAGNOSTICS con = CONSTRAINT_NAME;`."
        en: "Declare a `text` variable, then in the handler: `GET STACKED DIAGNOSTICS con = CONSTRAINT_NAME;`."
quiz:
  - q:
      vi: "Hàm `pay(amt)` chặn số tiền âm bằng `ASSERT amt > 0`. Vì sao đây là lựa chọn sai?"
      en: "Function `pay(amt)` blocks negative amounts with `ASSERT amt > 0`. Why is this the wrong choice?"
    options:
      - { vi: "Không sai: ASSERT báo lỗi `P0004` mỗi khi điều kiện sai", en: "It is not wrong: ASSERT raises `P0004` whenever the condition is false" }
      - { vi: "`plpgsql.check_asserts = off` tắt mọi ASSERT, khi đó số âm lọt qua", en: "`plpgsql.check_asserts = off` turns every ASSERT off, and then negative amounts get through" }
      - { vi: "ASSERT chỉ chạy được trong khối `DO`", en: "ASSERT only works in a `DO` block" }
    answer: 1
    trap: 0
    why:
      vi: "ASSERT đúng là báo lỗi `P0004` khi đang bật, nhưng nó dành cho lỗi lập trình (điều code tin là luôn đúng), và chỉ cần đặt `plpgsql.check_asserts = off` là mọi ASSERT bị bỏ qua, số âm lọt vào. ASSERT không chỉ chạy trong `DO`; nó chạy trong mọi hàm PL/pgSQL. Kiểm tra dữ liệu vào phải dùng `IF ... RAISE EXCEPTION`, thứ không tham số nào tắt được."
      en: "ASSERT does raise `P0004` while it is on, but it is meant for programming bugs (things the code believes are always true), and setting `plpgsql.check_asserts = off` makes every ASSERT skip, so negative amounts get in. ASSERT is not limited to `DO`; it works in any PL/pgSQL function. Input checks must use `IF ... RAISE EXCEPTION`, which no setting can disable."
  - q:
      vi: "Một hàm thêm dòng A, rồi trong một khối `BEGIN ... EXCEPTION` thêm dòng B và gặp lỗi chia cho 0; nhánh bắt lỗi chỉ ghi `NULL;`. Khi hàm xong, bảng còn gì?"
      en: "A function inserts row A, then inside a `BEGIN ... EXCEPTION` block inserts row B and hits a division by zero; the handler only says `NULL;`. When the function ends, what does the table hold?"
    options:
      - { vi: "Cả A và B, vì lỗi đã được bắt", en: "Both A and B, because the error was caught" }
      - { vi: "Chỉ A: khối bắt lỗi hoàn tác mọi việc làm bên trong nó", en: "Only A: the catching block undoes everything done inside it" }
      - { vi: "Không dòng nào: lỗi hoàn tác cả hàm", en: "Neither: the error undoes the whole function" }
    answer: 1
    trap: 0
    why:
      vi: "Bắt lỗi trông như bỏ qua lỗi, nhưng mỗi khối có `EXCEPTION` chạy trong một subtransaction (transaction con bên trong transaction của hàm). Khi phép chia cho 0 xảy ra, Postgres rollback đúng subtransaction đó, nên mất B, rồi mới chạy nhánh bắt lỗi. Lỗi đã được bắt nên không lan ra ngoài: việc làm trước khối (A) vẫn còn, không phải mất cả hàm."
      en: "Catching looks like ignoring the error, but each block with `EXCEPTION` runs in a subtransaction (a child transaction inside the function's transaction). When the division by zero happens, Postgres rolls back just that subtransaction, so B is gone, and only then runs the handler. The error was caught, so it does not spread: work done before the block (A) stays, rather than the whole function being undone."
---
## Mở bài

Một lệnh rút tiền vượt số dư bị database từ chối, nhưng ứng dụng chỉ nhận một câu báo lỗi chung và không biết phải nói gì với khách. Nếu mỗi lỗi có một mã rõ ràng, ứng dụng rẽ nhánh được ngay. Bài này báo lỗi có mã, bắt lỗi theo mã và đọc chi tiết của nó.

## Ý chính

Mọi lỗi của Postgres có một mã SQLSTATE năm ký tự: `23505` trùng khóa, `23514` vi phạm `CHECK`, `22012` chia cho 0. Ứng dụng nên rẽ nhánh theo mã, không theo câu chữ, vì câu chữ có thể đổi giữa các phiên bản.

Trong PL/pgSQL, `RAISE` có nhiều mức. `NOTICE`, `WARNING` chỉ gửi lời nhắn và hàm chạy tiếp. `EXCEPTION` dừng câu lệnh với mã mặc định `P0001`; `USING ERRCODE` đặt mã khác, bằng tên điều kiện hoặc năm ký tự tự chọn, và `HINT`, `DETAIL` thêm gợi ý cho người đọc.

Khối `BEGIN ... EXCEPTION WHEN condition THEN ... END` bắt lỗi theo tên (`unique_violation`), theo mã (`SQLSTATE '22012'`) hoặc mọi lỗi (`OTHERS`). Trong nhánh bắt lỗi, `SQLSTATE` và `SQLERRM` cho mã và câu báo lỗi; `GET STACKED DIAGNOSTICS` cho thêm tên ràng buộc, bảng, cột.

Nhiều người nghĩ bắt lỗi là bỏ qua lỗi và giữ mọi thứ đã làm. Thật ra khối có `EXCEPTION` chạy trong một subtransaction: khi lỗi xảy ra, mọi thay đổi bên trong khối bị hoàn tác trước khi nhánh bắt lỗi chạy. Subtransaction có giá, nên đừng bọc mọi câu bằng `EXCEPTION` khi không cần.

`ASSERT condition, 'message'` báo lỗi `P0004` khi điều kiện sai, để bắt lỗi lập trình. Tham số `plpgsql.check_asserts` có thể tắt nó, nên không bao giờ dùng `ASSERT` để kiểm tra dữ liệu vào.

Hình từng bước ở cuối mục này theo hàm `open_two` của mục Ví dụ: dòng ghi trong khối bị hoàn tác, dòng ghi ngoài khối thì còn.

## Cú pháp

```sql
RAISE [ NOTICE | WARNING | EXCEPTION ] 'text with % placeholders' [, value [, ...] ]
  [ USING ERRCODE = 'code' | condition_name, HINT = 'text', DETAIL = 'text' ];
RAISE EXCEPTION USING ERRCODE = 'code', MESSAGE = 'text';
ASSERT condition [, 'message' ];
BEGIN
  statements
EXCEPTION
  WHEN condition_name [ OR ... ] THEN handler
  WHEN SQLSTATE 'code' THEN handler
  WHEN OTHERS THEN handler
END;
-- in a handler: SQLSTATE, SQLERRM, GET STACKED DIAGNOSTICS var = CONSTRAINT_NAME | MESSAGE_TEXT | ...
```

- `ERRCODE`: tên điều kiện như `check_violation` hoặc đúng năm ký tự.
- `OTHERS`: mọi lỗi trừ hủy truy vấn và `ASSERT`; dùng cẩn thận vì nó che lỗi thật.
- `GET STACKED DIAGNOSTICS`: chỉ dùng trong nhánh bắt lỗi.

## Ví dụ

`NOTICE` không dừng gì, `EXCEPTION` thì dừng với mã `P0001`:

```sql
DO $$ BEGIN RAISE NOTICE 'accounts: %', (SELECT count(*) FROM accounts); END $$;
SELECT sqlstate_of('DO $x$ BEGIN RAISE NOTICE ''hi''; END $x$') AS notice_code,
       sqlstate_of('DO $x$ BEGIN RAISE EXCEPTION ''stop''; END $x$') AS exception_code;
```

Kết quả là `ok` và `P0001`. Hàm `sqlstate_of` của bài chạy một câu và trả mã lỗi của nó.

Lỗi có mã tự chọn, kèm gợi ý và chi tiết:

```sql
CREATE FUNCTION reserve(amt numeric) RETURNS numeric LANGUAGE plpgsql AS $$
BEGIN
  IF amt > 1000000 THEN
    RAISE EXCEPTION 'amount % is over the daily limit', amt
      USING ERRCODE = 'BD001', HINT = 'split the payment', DETAIL = 'the limit is 1000000';
  END IF;
  RETURN amt;
END $$;
SELECT reserve(200000) AS ok_amount, sqlstate_of('SELECT reserve(5000000)') AS over_limit;
```

```sql
-- ERROR BD001: amount 5000000 is over the daily limit
SELECT reserve(5000000);
```

Câu cuối báo lỗi mã `BD001`; `psql` in thêm hai dòng `HINT` và `DETAIL` dưới câu báo lỗi.

Bắt lỗi theo mã và theo `OTHERS`:

```sql
CREATE FUNCTION safe_ratio(a numeric, b numeric) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN round(a / b, 2)::text;
EXCEPTION
  WHEN SQLSTATE '22012' THEN RETURN 'n/a';
  WHEN OTHERS THEN RETURN SQLSTATE || ': ' || SQLERRM;
END $$;
SELECT safe_ratio(10, 4) AS normal, safe_ratio(1, 0) AS by_zero;
```

Khối bắt lỗi hoàn tác phần việc bên trong nó:

```sql
CREATE FUNCTION open_two(p_owner text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO accounts VALUES (100, p_owner || ' A', 0);
  BEGIN
    INSERT INTO accounts VALUES (101, p_owner || ' B', 0);
    INSERT INTO accounts VALUES (1, 'clash', 0);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'inner block undone';
  END;
  RETURN 'all done';
END $$;
SELECT open_two('Kim') AS result;
SELECT id, owner FROM accounts WHERE id >= 100 ORDER BY id;
```

Chỉ còn tài khoản 100: dòng 101 nằm trong khối bị lỗi nên bị quay lui cùng khối.

## Lỗi hay gặp

Dùng `ASSERT` để kiểm tra dữ liệu vào:

```sql
-- WRONG: ASSERT guards the input, and check_asserts = off lets anything through
CREATE FUNCTION take(amt numeric) RETURNS text LANGUAGE plpgsql AS $$
BEGIN ASSERT amt > 0, 'amount must be positive'; RETURN 'took ' || amt; END $$;
SET plpgsql.check_asserts = off;
SELECT take(-50) AS result;
```

```sql
-- FIX: check the input with IF ... RAISE EXCEPTION, which no setting turns off
CREATE OR REPLACE FUNCTION take(amt numeric) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  IF amt <= 0 THEN RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023'; END IF;
  RETURN 'took ' || amt;
END $$;
SELECT sqlstate_of('SELECT take(-50)') AS result;
RESET plpgsql.check_asserts;
```

Bản sai trả `took -50`: khi `check_asserts` tắt, `ASSERT` không chạy. Bản sửa trả mã `22023`.

Dùng `ASSERT` cho việc của nó: kiểm một điều mà code tin là luôn đúng, ở đây là không tài khoản nào dưới 1000000:

```sql
-- ERROR P0004: a balance is below 1000000
DO $$ BEGIN ASSERT (SELECT min(balance) FROM accounts) >= 1000000, 'a balance is below 1000000'; END $$;
```

Mã `P0004` báo một giả định trong code đã sai; sửa code hoặc dữ liệu, đừng bắt nó.

Mã tự chọn không đủ năm ký tự:

```sql
-- ERROR 42704: unrecognized exception condition "BD01"
DO $$ BEGIN RAISE EXCEPTION 'limit reached' USING ERRCODE = 'BD01'; END $$;
```

Mã SQLSTATE luôn có đúng năm ký tự chữ hoa hoặc số. Chọn mã riêng không trùng các lớp chuẩn trong bảng mã lỗi.

## Thực hành

Bảng `accounts` có ba tài khoản, và hàm `sqlstate_of(q)` chạy câu `q` rồi trả `ok` hoặc mã lỗi. Bạn viết một hàm báo lỗi có mã, một hàm bắt lỗi ràng buộc `CHECK`, và một hàm đọc tên ràng buộc bị trùng; sau đó là hai câu hỏi.

## Tóm tắt

- Mọi lỗi có mã SQLSTATE năm ký tự; rẽ nhánh theo mã, không theo câu chữ.
- `RAISE NOTICE` chỉ nhắn; `RAISE EXCEPTION ... USING ERRCODE, HINT, DETAIL` dừng câu lệnh với mã bạn chọn (mặc định `P0001`).
- `EXCEPTION WHEN` bắt theo tên, theo `SQLSTATE` hoặc `OTHERS`; đọc `SQLSTATE`, `SQLERRM`, `GET STACKED DIAGNOSTICS`.
- Khối bắt lỗi là một subtransaction: việc bên trong bị hoàn tác khi lỗi, và nó tốn chi phí.
- `ASSERT` (`P0004`) cho lỗi lập trình; `plpgsql.check_asserts` tắt được nó, nên không dùng để kiểm tra dữ liệu vào.

# EN

## Opening

A withdrawal over the balance is refused by the database, but the application only gets a generic error text and does not know what to tell the customer. If each error carries a clear code, the application can branch at once. This lesson raises errors with codes, catches errors by code and reads their details.

## Key idea

Every Postgres error has a five-character SQLSTATE code: `23505` duplicate key, `23514` a `CHECK` violation, `22012` division by zero. Applications should branch on the code, never on the text, because the text can change between versions.

In PL/pgSQL, `RAISE` has several levels. `NOTICE` and `WARNING` only send a message and the function carries on. `EXCEPTION` stops the statement with the default code `P0001`; `USING ERRCODE` sets another code, as a condition name or five characters of your own, and `HINT`, `DETAIL` add guidance for the reader.

A `BEGIN ... EXCEPTION WHEN condition THEN ... END` block catches errors by name (`unique_violation`), by code (`SQLSTATE '22012'`) or all of them (`OTHERS`). In the handler, `SQLSTATE` and `SQLERRM` give the code and the message; `GET STACKED DIAGNOSTICS` also gives the constraint, table and column names.

Many people think catching an error ignores it and keeps everything done so far. In fact a block with `EXCEPTION` runs in a subtransaction: on an error, every change inside the block is undone before the handler runs. Subtransactions have a cost, so do not wrap every statement in `EXCEPTION` without a reason.

`ASSERT condition, 'message'` raises `P0004` when the condition is false, to catch programming bugs. The setting `plpgsql.check_asserts` can turn it off, so never use `ASSERT` to check input.

The step-through figure at the end of this section follows the Example's `open_two` function: the row written inside the block is undone, the one written outside stays.

## Syntax

```sql
RAISE [ NOTICE | WARNING | EXCEPTION ] 'text with % placeholders' [, value [, ...] ]
  [ USING ERRCODE = 'code' | condition_name, HINT = 'text', DETAIL = 'text' ];
RAISE EXCEPTION USING ERRCODE = 'code', MESSAGE = 'text';
ASSERT condition [, 'message' ];
BEGIN
  statements
EXCEPTION
  WHEN condition_name [ OR ... ] THEN handler
  WHEN SQLSTATE 'code' THEN handler
  WHEN OTHERS THEN handler
END;
-- in a handler: SQLSTATE, SQLERRM, GET STACKED DIAGNOSTICS var = CONSTRAINT_NAME | MESSAGE_TEXT | ...
```

- `ERRCODE`: a condition name such as `check_violation` or exactly five characters.
- `OTHERS`: every error except query cancel and `ASSERT`; use it with care, it hides real bugs.
- `GET STACKED DIAGNOSTICS`: only inside a handler.

## Example

`NOTICE` stops nothing, `EXCEPTION` stops with code `P0001`:

```sql
DO $$ BEGIN RAISE NOTICE 'accounts: %', (SELECT count(*) FROM accounts); END $$;
SELECT sqlstate_of('DO $x$ BEGIN RAISE NOTICE ''hi''; END $x$') AS notice_code,
       sqlstate_of('DO $x$ BEGIN RAISE EXCEPTION ''stop''; END $x$') AS exception_code;
```

The result is `ok` and `P0001`. The lesson's function `sqlstate_of` runs a statement and returns its error code.

An error with a code of your own, plus a hint and a detail:

```sql
CREATE FUNCTION reserve(amt numeric) RETURNS numeric LANGUAGE plpgsql AS $$
BEGIN
  IF amt > 1000000 THEN
    RAISE EXCEPTION 'amount % is over the daily limit', amt
      USING ERRCODE = 'BD001', HINT = 'split the payment', DETAIL = 'the limit is 1000000';
  END IF;
  RETURN amt;
END $$;
SELECT reserve(200000) AS ok_amount, sqlstate_of('SELECT reserve(5000000)') AS over_limit;
```

```sql
-- ERROR BD001: amount 5000000 is over the daily limit
SELECT reserve(5000000);
```

The last statement fails with code `BD001`; `psql` also prints the `HINT` and `DETAIL` lines under the message.

Catching by code and with `OTHERS`:

```sql
CREATE FUNCTION safe_ratio(a numeric, b numeric) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN round(a / b, 2)::text;
EXCEPTION
  WHEN SQLSTATE '22012' THEN RETURN 'n/a';
  WHEN OTHERS THEN RETURN SQLSTATE || ': ' || SQLERRM;
END $$;
SELECT safe_ratio(10, 4) AS normal, safe_ratio(1, 0) AS by_zero;
```

A catching block undoes the work inside it:

```sql
CREATE FUNCTION open_two(p_owner text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO accounts VALUES (100, p_owner || ' A', 0);
  BEGIN
    INSERT INTO accounts VALUES (101, p_owner || ' B', 0);
    INSERT INTO accounts VALUES (1, 'clash', 0);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'inner block undone';
  END;
  RETURN 'all done';
END $$;
SELECT open_two('Kim') AS result;
SELECT id, owner FROM accounts WHERE id >= 100 ORDER BY id;
```

Only account 100 is left: row 101 sat inside the failed block, so it was rolled back with the block.

## Common mistakes

Using `ASSERT` to check input:

```sql
-- WRONG: ASSERT guards the input, and check_asserts = off lets anything through
CREATE FUNCTION take(amt numeric) RETURNS text LANGUAGE plpgsql AS $$
BEGIN ASSERT amt > 0, 'amount must be positive'; RETURN 'took ' || amt; END $$;
SET plpgsql.check_asserts = off;
SELECT take(-50) AS result;
```

```sql
-- FIX: check the input with IF ... RAISE EXCEPTION, which no setting turns off
CREATE OR REPLACE FUNCTION take(amt numeric) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  IF amt <= 0 THEN RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023'; END IF;
  RETURN 'took ' || amt;
END $$;
SELECT sqlstate_of('SELECT take(-50)') AS result;
RESET plpgsql.check_asserts;
```

The wrong version returns `took -50`: with `check_asserts` off, `ASSERT` does not run. The fix returns code `22023`.

Use `ASSERT` for its own job: checking something the code believes always holds, here that no account is under 1000000:

```sql
-- ERROR P0004: a balance is below 1000000
DO $$ BEGIN ASSERT (SELECT min(balance) FROM accounts) >= 1000000, 'a balance is below 1000000'; END $$;
```

Code `P0004` says an assumption in the code is false; fix the code or the data, do not catch it.

A code of your own that is not five characters:

```sql
-- ERROR 42704: unrecognized exception condition "BD01"
DO $$ BEGIN RAISE EXCEPTION 'limit reached' USING ERRCODE = 'BD01'; END $$;
```

An SQLSTATE code is always exactly five upper-case letters or digits. Pick a code of your own that does not clash with the standard classes in the error code table.

## Practice

Table `accounts` holds three accounts, and function `sqlstate_of(q)` runs statement `q` and returns `ok` or the error code. You write a function that raises an error with a code, one that catches a `CHECK` violation, and one that reads the name of the duplicated constraint; then two questions.

## Recap

- Every error has a five-character SQLSTATE code; branch on the code, never on the text.
- `RAISE NOTICE` only informs; `RAISE EXCEPTION ... USING ERRCODE, HINT, DETAIL` stops the statement with the code you choose (default `P0001`).
- `EXCEPTION WHEN` catches by name, by `SQLSTATE` or `OTHERS`; read `SQLSTATE`, `SQLERRM`, `GET STACKED DIAGNOSTICS`.
- A catching block is a subtransaction: the work inside it is undone on an error, and it has a cost.
- `ASSERT` (`P0004`) is for programming bugs; `plpgsql.check_asserts` can turn it off, so never use it to check input.
