---
id: e-pg-l2-23
engine: postgres
level: L2
module: triggers
title: "Trigger: BEFORE/AFTER, ROW/STATEMENT, NEW/OLD, bảng audit"
title_en: "Triggers: BEFORE/AFTER, ROW/STATEMENT, NEW/OLD and an audit table"
kind: lab
runtime: browser
minutes: 18
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-trigger-timing, at: idea }]
objectives:
  - vi: Gắn một hàm PL/pgSQL `RETURNS trigger` vào bảng, chọn đúng BEFORE hay AFTER, ROW hay STATEMENT.
    en: Attach a PL/pgSQL `RETURNS trigger` function to a table, choosing BEFORE or AFTER, ROW or STATEMENT correctly.
  - vi: Ghi một bảng audit từ `OLD`, `NEW` và `TG_OP`, chỉ khi điều kiện `WHEN` đúng.
    en: Write an audit table from `OLD`, `NEW` and `TG_OP`, only when a `WHEN` condition holds.
  - vi: Đếm các dòng một câu lệnh đã đổi bằng bảng chuyển tiếp của trigger STATEMENT.
    en: Count the rows a statement changed with the transition table of a STATEMENT trigger.
requires: [e-pg-l2-18]
sources:
  - { url: https://www.postgresql.org/docs/18/trigger-definition.html, title_vi: "Trigger hoạt động thế nào" }
  - { url: https://www.postgresql.org/docs/18/sql-createtrigger.html, title_vi: "CREATE TRIGGER" }
  - { url: https://www.postgresql.org/docs/18/plpgsql-trigger.html, title_vi: "Hàm trigger" }
  - { url: https://www.postgresql.org/docs/18/sql-droptrigger.html, title_vi: "DROP TRIGGER" }
lab:
  setup: |
    CREATE TABLE products (
      id int PRIMARY KEY,
      name text NOT NULL,
      price numeric(10,2) NOT NULL CHECK (price >= 0)
    );
    CREATE TABLE price_audit (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_id int NOT NULL,
      op text NOT NULL,
      old_price numeric(10,2),
      new_price numeric(10,2)
    );
    CREATE TABLE bulk_log (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      op text NOT NULL,
      row_count int NOT NULL
    );
    INSERT INTO products VALUES (1, 'pen', 10.00), (2, 'book', 50.00), (3, 'bag', 120.00);
    CREATE FUNCTION log_price() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO price_audit (product_id, op, old_price, new_price) VALUES (OLD.id, TG_OP, OLD.price, NEW.price);
      RETURN NULL;
    END $$;
    CREATE FUNCTION clean_product() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.name := lower(btrim(NEW.name));
      RETURN NEW;
    END $$;
    CREATE FUNCTION log_bulk() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO bulk_log (op, row_count) SELECT TG_OP, count(*) FROM changed;
      RETURN NULL;
    END $$;
  steps:
    - task:
        vi: "Tạo trigger `products_price_audit`: sau mỗi dòng bị UPDATE trên `products`, gọi `log_price()`, nhưng chỉ khi giá thật sự đổi (`OLD.price IS DISTINCT FROM NEW.price`)."
        en: "Create trigger `products_price_audit`: after each row UPDATE on `products`, call `log_price()`, but only when the price really changes (`OLD.price IS DISTINCT FROM NEW.price`)."
      solution: CREATE TRIGGER products_price_audit AFTER UPDATE ON products FOR EACH ROW WHEN (OLD.price IS DISTINCT FROM NEW.price) EXECUTE FUNCTION log_price()
      check: catalog
      hint:
        vi: "`CREATE TRIGGER name AFTER UPDATE ON table FOR EACH ROW WHEN (condition) EXECUTE FUNCTION fn()`."
        en: "`CREATE TRIGGER name AFTER UPDATE ON table FOR EACH ROW WHEN (condition) EXECUTE FUNCTION fn()`."
    - task:
        vi: Đổi giá sản phẩm `2` thành 55.00. Bảng audit phải có đúng một dòng mới.
        en: Change the price of product `2` to 55.00. The audit table must get exactly one new row.
      solution: UPDATE products SET price = 55.00 WHERE id = 2
      check: rows
      after: SELECT product_id, op, old_price, new_price FROM price_audit ORDER BY id
      hint:
        vi: "Một câu `UPDATE ... SET price = ... WHERE id = ...`; trigger tự ghi audit."
        en: "One `UPDATE ... SET price = ... WHERE id = ...`; the trigger writes the audit row."
    - task:
        vi: "Tạo trigger `products_clean`: trước mỗi dòng INSERT hoặc UPDATE trên `products`, gọi `clean_product()` để chuẩn hóa tên."
        en: "Create trigger `products_clean`: before each row INSERT or UPDATE on `products`, call `clean_product()` to normalise the name."
      solution: CREATE TRIGGER products_clean BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION clean_product()
      check: catalog
      hint:
        vi: "Muốn sửa `NEW` trước khi ghi thì dùng `BEFORE INSERT OR UPDATE ... FOR EACH ROW`."
        en: "To change `NEW` before it is stored, use `BEFORE INSERT OR UPDATE ... FOR EACH ROW`."
    - task:
        vi: "Thêm sản phẩm `4` tên '  Lamp ' giá 30.00, trả về `id`, `name`, `price` của dòng đã lưu."
        en: "Add product `4` named '  Lamp ' priced 30.00 and return `id`, `name`, `price` of the stored row."
      solution: INSERT INTO products (id, name, price) VALUES (4, '  Lamp ', 30.00) RETURNING id, name, price
      check: rows
      hint:
        vi: "`RETURNING` trả dòng sau khi trigger BEFORE đã sửa nó."
        en: "`RETURNING` returns the row after the BEFORE trigger changed it."
    - task:
        vi: "Tạo trigger `products_bulk`: sau mỗi câu UPDATE trên `products` (một lần mỗi câu), gọi `log_bulk()`, với bảng chuyển tiếp mới đặt tên `changed`."
        en: "Create trigger `products_bulk`: after each UPDATE statement on `products` (once per statement), call `log_bulk()`, with the new transition table named `changed`."
      solution: CREATE TRIGGER products_bulk AFTER UPDATE ON products REFERENCING NEW TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION log_bulk()
      check: catalog
      hint:
        vi: "`REFERENCING NEW TABLE AS changed` đứng trước `FOR EACH STATEMENT`."
        en: "`REFERENCING NEW TABLE AS changed` comes before `FOR EACH STATEMENT`."
    - task:
        vi: Tăng giá mọi sản phẩm thêm 1.00 bằng một câu.
        en: Raise the price of every product by 1.00 in one statement.
      solution: UPDATE products SET price = price + 1.00
      check: rows
      after: SELECT op, row_count, (SELECT count(*) FROM price_audit) AS audit_rows FROM bulk_log ORDER BY id
      hint:
        vi: "`UPDATE products SET price = price + 1.00` không có `WHERE`."
        en: "`UPDATE products SET price = price + 1.00` with no `WHERE`."
quiz:
  - q:
      vi: "Một trigger `AFTER INSERT ... FOR EACH ROW` gán `NEW.name := upper(NEW.name)` rồi `RETURN NEW`. Tên lưu trong bảng ra sao?"
      en: "An `AFTER INSERT ... FOR EACH ROW` trigger sets `NEW.name := upper(NEW.name)` and then does `RETURN NEW`. What name is stored in the table?"
    options:
      - { vi: "Chữ hoa, vì trigger đã sửa `NEW` và trả nó về", en: "Upper case, because the trigger changed `NEW` and returned it" }
      - { vi: "Như lúc INSERT: dòng đã được ghi trước khi trigger AFTER chạy", en: "As inserted: the row was already stored before the AFTER trigger ran" }
      - { vi: "Báo lỗi, AFTER trigger không được đụng tới `NEW`", en: "An error, an AFTER trigger may not touch `NEW`" }
    answer: 1
    trap: 0
    why:
      vi: "Cùng đoạn code đó chạy đúng trong trigger BEFORE, nhưng trigger AFTER chạy khi dòng đã nằm trong bảng, và giá trị nó trả về bị bỏ qua: tên vẫn như lúc INSERT. Postgres cũng không báo lỗi, vì trigger AFTER được đọc và gán `NEW`; việc gán chỉ không có tác dụng. Muốn sửa dòng trước khi ghi thì dùng BEFORE."
      en: "The same code works in a BEFORE trigger, but an AFTER trigger runs once the row is already in the table, and its return value is ignored: the name stays as inserted. Postgres raises no error either, since an AFTER trigger may read and assign `NEW`; the assignment just has no effect. To change a row before it is stored, use BEFORE."
  - q:
      vi: "Một câu `UPDATE` sửa 0 dòng. Trigger nào vẫn chạy?"
      en: "An `UPDATE` statement changes 0 rows. Which trigger still fires?"
    options:
      - { vi: "Trigger `FOR EACH ROW`", en: "A `FOR EACH ROW` trigger" }
      - { vi: "Trigger `FOR EACH STATEMENT`", en: "A `FOR EACH STATEMENT` trigger" }
      - { vi: "Không trigger nào", en: "No trigger" }
    answer: 1
    why:
      vi: "Trigger `FOR EACH STATEMENT` chạy một lần cho mỗi câu lệnh, kể cả khi câu đó không đụng dòng nào, nên \"không trigger nào\" là sai. Trigger `FOR EACH ROW` chạy một lần cho mỗi dòng bị sửa, nên với 0 dòng nó chạy 0 lần."
      en: "A `FOR EACH STATEMENT` trigger fires once per statement, even when the statement touches no row, so \"no trigger\" is wrong. A `FOR EACH ROW` trigger fires once per changed row, so with 0 rows it fires 0 times."
  - q:
      vi: "Bảng có hai trigger `BEFORE INSERT ... FOR EACH ROW` tên `b_trim` và `a_check`. Cái nào chạy trước?"
      en: "A table has two `BEFORE INSERT ... FOR EACH ROW` triggers named `b_trim` and `a_check`. Which one fires first?"
    options:
      - { vi: "`b_trim`, vì nó được tạo trước", en: "`b_trim`, because it was created first" }
      - { vi: "`a_check`, vì cùng loại thì chạy theo thứ tự tên", en: "`a_check`, because triggers of the same kind fire in name order" }
      - { vi: "Ngẫu nhiên", en: "At random" }
    answer: 1
    why:
      vi: "Thứ tự không ngẫu nhiên và không theo lúc tạo: các trigger cùng thời điểm (BEFORE) và cùng sự kiện (INSERT) chạy theo thứ tự chữ cái của tên, nên `a_check` chạy trước `b_trim`. Đặt tên có tiền tố khi thứ tự quan trọng."
      en: "The order is neither random nor by creation time: triggers with the same timing (BEFORE) and event (INSERT) fire in alphabetical order of their names, so `a_check` fires before `b_trim`. Use name prefixes when the order matters."
---
## Mở bài

Kế toán hỏi: ai đã đổi giá cuốn sách từ 50 lên 55, và lúc nào? Nếu ứng dụng quên ghi log, câu trả lời mất luôn. Trigger để chính database ghi lại mọi thay đổi, bất kể câu lệnh đến từ đâu.

## Ý chính

Trigger gắn một hàm vào một bảng và một sự kiện (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`). Hàm viết bằng PL/pgSQL, khai báo `RETURNS trigger`, và đọc được `NEW` (dòng mới), `OLD` (dòng cũ), `TG_OP` (tên thao tác), `TG_NAME` (tên trigger). Với `INSERT` thì `OLD` là NULL, với `DELETE` thì `NEW` là NULL.

Trigger `BEFORE ... FOR EACH ROW` chạy trước khi dòng được ghi: nó có thể sửa `NEW` rồi `RETURN NEW`, hoặc `RETURN NULL` để bỏ qua dòng đó mà không báo lỗi. Nhiều người nghĩ trigger `AFTER` cũng sửa được dòng. Thật ra lúc đó dòng đã nằm trong bảng và giá trị trả về bị bỏ qua; `AFTER` dùng để làm việc phụ như ghi bảng audit.

`FOR EACH STATEMENT` chạy một lần cho cả câu lệnh, kể cả khi câu đó không đụng dòng nào. Với `REFERENCING NEW TABLE AS ...` (chỉ cho trigger `AFTER`), hàm đọc được mọi dòng câu lệnh vừa đổi như một bảng. `WHEN` (điều kiện) lọc trước khi gọi hàm, nên rẻ hơn kiểm trong hàm.

Trigger cùng thời điểm và sự kiện chạy theo thứ tự tên. Trigger ROW chạy một lần mỗi dòng: một UPDATE trên một triệu dòng gọi hàm một triệu lần, nên với ghi hàng loạt hãy cân nhắc trigger STATEMENT có bảng chuyển tiếp.

Hình cuối mục này xếp các trigger theo thời gian cho một câu `UPDATE` trên 3 dòng của lab: mỗi loại chạy lúc nào, mấy lần, và loại nào còn sửa được `NEW`.

## Cú pháp

```sql
CREATE FUNCTION fn() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ... RETURN NEW; END $$;
CREATE [ OR REPLACE ] TRIGGER name
  { BEFORE | AFTER | INSTEAD OF } { INSERT | UPDATE [ OF column ] | DELETE | TRUNCATE } [ OR ... ]
  ON table_name
  [ REFERENCING { NEW | OLD } TABLE AS transition_name ]
  FOR [ EACH ] { ROW | STATEMENT }
  [ WHEN ( condition ) ]
  EXECUTE FUNCTION fn();
DROP TRIGGER [ IF EXISTS ] name ON table_name;
```

- `INSTEAD OF`: chỉ cho view, thay thế câu ghi.
- `UPDATE OF column`: chỉ chạy khi câu UPDATE có ghi cột đó.
- `REFERENCING`: chỉ cho trigger `AFTER`.
- `WHEN`: trong trigger ROW đọc được `OLD` và `NEW`, trừ `OLD` của INSERT và `NEW` của DELETE.

## Ví dụ

Bảng `accounts` với một trigger AFTER ghi mọi thay đổi vào `account_log`:

```sql
CREATE TABLE accounts (id int PRIMARY KEY, owner text NOT NULL, balance numeric(12,2) NOT NULL);
CREATE TABLE account_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id int NOT NULL, op text NOT NULL,
  old_balance numeric(12,2), new_balance numeric(12,2)
);
CREATE FUNCTION log_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO account_log (account_id, op, old_balance, new_balance)
  VALUES (coalesce(NEW.id, OLD.id), TG_OP, OLD.balance, NEW.balance);
  RETURN NULL; -- ignored for AFTER triggers
END $$;
CREATE TRIGGER accounts_log AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION log_account();
INSERT INTO accounts VALUES (1, 'an', 100), (2, 'binh', 40);
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
DELETE FROM accounts WHERE id = 2;
SELECT account_id, op, old_balance, new_balance FROM account_log ORDER BY id;
```

Bốn dòng log: hai `INSERT` (cũ là NULL), một `UPDATE` 100 → 70, một `DELETE` (mới là NULL).

Trigger BEFORE sửa `NEW` hoặc bỏ dòng:

```sql
CREATE FUNCTION tidy_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.balance < 0 THEN
    RETURN NULL; -- skip this row, no error
  END IF;
  NEW.owner := lower(btrim(NEW.owner));
  RETURN NEW;
END $$;
CREATE TRIGGER accounts_tidy BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION tidy_account();
INSERT INTO accounts VALUES (3, '  Chi ', 70), (4, 'dung', -5);
SELECT id, owner FROM accounts ORDER BY id;
```

Tài khoản `3` được lưu tên `chi`; tài khoản `4` biến mất không một lời báo. Quy tắc "số dư không âm" nên là một `CHECK` (bài sau).

Trigger STATEMENT đếm dòng qua bảng chuyển tiếp:

```sql
CREATE TABLE batch_log (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, op text NOT NULL, row_count int NOT NULL);
CREATE FUNCTION log_batch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO batch_log (op, row_count) SELECT TG_OP, count(*) FROM moved;
  RETURN NULL;
END $$;
CREATE TRIGGER accounts_batch AFTER UPDATE ON accounts
  REFERENCING NEW TABLE AS moved FOR EACH STATEMENT EXECUTE FUNCTION log_batch();
UPDATE accounts SET balance = balance + 1;
UPDATE accounts SET balance = balance WHERE id = 99;
SELECT op, row_count FROM batch_log ORDER BY id;
```

Hai dòng: câu đầu đổi 2 dòng, câu sau đổi 0 dòng nhưng trigger vẫn chạy một lần.

```sql
DROP TRIGGER accounts_batch ON accounts;
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'accounts'::regclass AND NOT tgisinternal
ORDER BY tgname;
```

`DROP TRIGGER` chỉ gỡ trigger, hàm `log_batch()` vẫn còn.

## Lỗi hay gặp

`WHEN` của trigger INSERT đọc `OLD`:

```sql
-- ERROR 42P17: INSERT trigger's WHEN condition cannot reference OLD values
CREATE TRIGGER accounts_big AFTER INSERT ON accounts
  FOR EACH ROW WHEN (OLD.balance > 1000) EXECUTE FUNCTION log_account();
```

Khi INSERT chưa có dòng cũ. Dùng `NEW` cho INSERT, `OLD` cho DELETE.

Sửa `NEW` trong trigger AFTER:

```sql
-- WRONG: an AFTER trigger cannot change the stored row
CREATE TABLE tags (id int PRIMARY KEY, label text NOT NULL);
CREATE FUNCTION upper_label() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.label := upper(NEW.label);
  RETURN NEW;
END $$;
CREATE TRIGGER tags_upper AFTER INSERT ON tags FOR EACH ROW EXECUTE FUNCTION upper_label();
INSERT INTO tags VALUES (1, 'sale');
SELECT label FROM tags ORDER BY id;
```

```sql
-- FIX: change NEW in a BEFORE trigger
DROP TRIGGER tags_upper ON tags;
CREATE TRIGGER tags_upper BEFORE INSERT ON tags FOR EACH ROW EXECUTE FUNCTION upper_label();
INSERT INTO tags VALUES (2, 'new');
SELECT label FROM tags ORDER BY id;
```

Câu sai vẫn lưu `sale` chữ thường, không có lỗi nào. Câu sửa lưu `NEW` chữ hoa.

Quên `RETURN` trong hàm trigger:

```sql
CREATE FUNCTION trim_label() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.label := btrim(NEW.label);
END $$;
CREATE TRIGGER tags_trim BEFORE INSERT ON tags FOR EACH ROW EXECUTE FUNCTION trim_label();
-- ERROR 2F005: control reached end of trigger procedure without RETURN
INSERT INTO tags VALUES (3, ' x ');
```

Hàm trigger luôn phải `RETURN NEW` (giữ dòng), `RETURN NULL` (bỏ dòng, hoặc trong AFTER) hoặc `RETURN OLD` cho DELETE.

## Thực hành

Bảng `products` có sẵn ba hàm trigger: `log_price()`, `clean_product()` và `log_bulk()`. Gắn chúng vào bảng, ghi vài thay đổi và đọc bảng `price_audit`, `bulk_log` để thấy trigger nào đã chạy; sau đó là ba câu hỏi.

## Tóm tắt

- Hàm trigger là PL/pgSQL `RETURNS trigger`, đọc `NEW`, `OLD`, `TG_OP`.
- `BEFORE ROW` sửa `NEW` hoặc bỏ dòng bằng `RETURN NULL`; `AFTER` dùng cho audit, không sửa được dòng.
- `FOR EACH STATEMENT` chạy một lần mỗi câu, đọc dòng đã đổi qua `REFERENCING NEW TABLE`.
- `WHEN` lọc trước khi gọi hàm; trigger cùng loại chạy theo thứ tự tên.
- Trigger ROW tốn một lần gọi mỗi dòng: cẩn thận với ghi hàng loạt.

# EN

## Opening

Accounting asks: who changed the book's price from 50 to 55, and when? If the application forgot to log it, the answer is gone. A trigger makes the database itself record every change, whatever statement it came from.

## Key idea

A trigger attaches a function to a table and an event (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`). The function is written in PL/pgSQL, declared `RETURNS trigger`, and can read `NEW` (the new row), `OLD` (the old row), `TG_OP` (the operation name) and `TG_NAME` (the trigger name). For `INSERT`, `OLD` is NULL; for `DELETE`, `NEW` is NULL.

A `BEFORE ... FOR EACH ROW` trigger runs before the row is stored: it can change `NEW` and `RETURN NEW`, or `RETURN NULL` to skip that row without an error. Many people think an `AFTER` trigger can change the row too. In fact by then the row is already in the table and the return value is ignored; `AFTER` is for side work such as writing an audit table.

`FOR EACH STATEMENT` fires once for the whole statement, even when the statement touches no row. With `REFERENCING NEW TABLE AS ...` (only for `AFTER` triggers), the function can read every row the statement changed as a table. `WHEN` (condition) filters before the function is called, which is cheaper than testing inside the function.

Triggers with the same timing and event fire in name order. A ROW trigger fires once per row: an UPDATE of a million rows calls the function a million times, so for bulk writes consider a STATEMENT trigger with a transition table.

The figure at the end of this section lines the triggers up in time for one `UPDATE` on the lab's 3 rows: when each kind fires, how many times, and which one can still change `NEW`.

## Syntax

```sql
CREATE FUNCTION fn() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ... RETURN NEW; END $$;
CREATE [ OR REPLACE ] TRIGGER name
  { BEFORE | AFTER | INSTEAD OF } { INSERT | UPDATE [ OF column ] | DELETE | TRUNCATE } [ OR ... ]
  ON table_name
  [ REFERENCING { NEW | OLD } TABLE AS transition_name ]
  FOR [ EACH ] { ROW | STATEMENT }
  [ WHEN ( condition ) ]
  EXECUTE FUNCTION fn();
DROP TRIGGER [ IF EXISTS ] name ON table_name;
```

- `INSTEAD OF`: views only, replaces the write.
- `UPDATE OF column`: fires only when the UPDATE sets that column.
- `REFERENCING`: only for `AFTER` triggers.
- `WHEN`: in a ROW trigger it can read `OLD` and `NEW`, except `OLD` of an INSERT and `NEW` of a DELETE.

## Example

Table `accounts` with an AFTER trigger that writes every change to `account_log`:

```sql
CREATE TABLE accounts (id int PRIMARY KEY, owner text NOT NULL, balance numeric(12,2) NOT NULL);
CREATE TABLE account_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id int NOT NULL, op text NOT NULL,
  old_balance numeric(12,2), new_balance numeric(12,2)
);
CREATE FUNCTION log_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO account_log (account_id, op, old_balance, new_balance)
  VALUES (coalesce(NEW.id, OLD.id), TG_OP, OLD.balance, NEW.balance);
  RETURN NULL; -- ignored for AFTER triggers
END $$;
CREATE TRIGGER accounts_log AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION log_account();
INSERT INTO accounts VALUES (1, 'an', 100), (2, 'binh', 40);
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
DELETE FROM accounts WHERE id = 2;
SELECT account_id, op, old_balance, new_balance FROM account_log ORDER BY id;
```

Four log rows: two `INSERT` (old is NULL), one `UPDATE` 100 → 70, one `DELETE` (new is NULL).

A BEFORE trigger changes `NEW` or skips the row:

```sql
CREATE FUNCTION tidy_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.balance < 0 THEN
    RETURN NULL; -- skip this row, no error
  END IF;
  NEW.owner := lower(btrim(NEW.owner));
  RETURN NEW;
END $$;
CREATE TRIGGER accounts_tidy BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION tidy_account();
INSERT INTO accounts VALUES (3, '  Chi ', 70), (4, 'dung', -5);
SELECT id, owner FROM accounts ORDER BY id;
```

Account `3` is stored with name `chi`; account `4` vanishes without a word. A "balance is never negative" rule should be a `CHECK` (next lesson).

A STATEMENT trigger counts rows through a transition table:

```sql
CREATE TABLE batch_log (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, op text NOT NULL, row_count int NOT NULL);
CREATE FUNCTION log_batch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO batch_log (op, row_count) SELECT TG_OP, count(*) FROM moved;
  RETURN NULL;
END $$;
CREATE TRIGGER accounts_batch AFTER UPDATE ON accounts
  REFERENCING NEW TABLE AS moved FOR EACH STATEMENT EXECUTE FUNCTION log_batch();
UPDATE accounts SET balance = balance + 1;
UPDATE accounts SET balance = balance WHERE id = 99;
SELECT op, row_count FROM batch_log ORDER BY id;
```

Two rows: the first statement changed 2 rows, the second changed 0 rows but the trigger still fired once.

```sql
DROP TRIGGER accounts_batch ON accounts;
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'accounts'::regclass AND NOT tgisinternal
ORDER BY tgname;
```

`DROP TRIGGER` removes only the trigger; function `log_batch()` stays.

## Common mistakes

The `WHEN` of an INSERT trigger reads `OLD`:

```sql
-- ERROR 42P17: INSERT trigger's WHEN condition cannot reference OLD values
CREATE TRIGGER accounts_big AFTER INSERT ON accounts
  FOR EACH ROW WHEN (OLD.balance > 1000) EXECUTE FUNCTION log_account();
```

An INSERT has no old row yet. Use `NEW` for INSERT and `OLD` for DELETE.

Changing `NEW` in an AFTER trigger:

```sql
-- WRONG: an AFTER trigger cannot change the stored row
CREATE TABLE tags (id int PRIMARY KEY, label text NOT NULL);
CREATE FUNCTION upper_label() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.label := upper(NEW.label);
  RETURN NEW;
END $$;
CREATE TRIGGER tags_upper AFTER INSERT ON tags FOR EACH ROW EXECUTE FUNCTION upper_label();
INSERT INTO tags VALUES (1, 'sale');
SELECT label FROM tags ORDER BY id;
```

```sql
-- FIX: change NEW in a BEFORE trigger
DROP TRIGGER tags_upper ON tags;
CREATE TRIGGER tags_upper BEFORE INSERT ON tags FOR EACH ROW EXECUTE FUNCTION upper_label();
INSERT INTO tags VALUES (2, 'new');
SELECT label FROM tags ORDER BY id;
```

The wrong version still stores `sale` in lower case, with no error at all. The fix stores `NEW` in upper case.

Forgetting `RETURN` in a trigger function:

```sql
CREATE FUNCTION trim_label() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.label := btrim(NEW.label);
END $$;
CREATE TRIGGER tags_trim BEFORE INSERT ON tags FOR EACH ROW EXECUTE FUNCTION trim_label();
-- ERROR 2F005: control reached end of trigger procedure without RETURN
INSERT INTO tags VALUES (3, ' x ');
```

A trigger function must always `RETURN NEW` (keep the row), `RETURN NULL` (skip the row, or in AFTER) or `RETURN OLD` for DELETE.

## Practice

Table `products` comes with three trigger functions: `log_price()`, `clean_product()` and `log_bulk()`. Attach them to the table, make a few changes and read tables `price_audit` and `bulk_log` to see which trigger fired; then three questions.

## Recap

- A trigger function is PL/pgSQL `RETURNS trigger` and reads `NEW`, `OLD`, `TG_OP`.
- `BEFORE ROW` changes `NEW` or skips the row with `RETURN NULL`; `AFTER` is for audit and cannot change the row.
- `FOR EACH STATEMENT` fires once per statement and reads changed rows through `REFERENCING NEW TABLE`.
- `WHEN` filters before the function is called; triggers of the same kind fire in name order.
- A ROW trigger costs one call per row: be careful with bulk writes.
