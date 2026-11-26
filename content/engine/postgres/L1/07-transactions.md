---
id: e-pg-l1-07
engine: postgres
level: L1
module: transactions
title: Transaction và savepoint
title_en: Transactions and savepoints
kind: concept
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-savepoint-timeline, at: idea }]
viz: pg-mvcc-timeline
objectives:
  - vi: Gói nhiều câu ghi trong `BEGIN ... COMMIT` để chúng cùng thành công hoặc cùng bị hủy.
    en: Wrap several writes in `BEGIN ... COMMIT` so they all succeed or are all undone.
  - vi: Dùng `SAVEPOINT` và `ROLLBACK TO SAVEPOINT` để hủy một phần mà giữ phần còn lại.
    en: Use `SAVEPOINT` and `ROLLBACK TO SAVEPOINT` to undo part of the work and keep the rest.
  - vi: Nhận ra lỗi "current transaction is aborted" và biết cách thoát khỏi nó.
    en: Recognise the "current transaction is aborted" error and know how to get out of it.
requires: [e-pg-l1-06]
sources:
  - https://www.postgresql.org/docs/18/tutorial-transactions.html
  - https://www.postgresql.org/docs/18/sql-begin.html
  - https://www.postgresql.org/docs/18/sql-savepoint.html
  - https://www.postgresql.org/docs/18/sql-rollback-to.html
  - https://www.postgresql.org/docs/18/mvcc-intro.html
  - https://www.postgresql.org/docs/18/transaction-iso.html
lab:
  setup: |
    CREATE TABLE accounts (id int PRIMARY KEY, balance numeric NOT NULL CHECK (balance >= 0));
    INSERT INTO accounts VALUES (1, 100), (2, 50);
    BEGIN;
    UPDATE accounts SET balance = balance - 30 WHERE id = 1;
    UPDATE accounts SET balance = balance + 30 WHERE id = 2;
    SAVEPOINT before_fee;
  steps:
    - task:
        vi: "Một transaction đang mở: đã chuyển 30 từ tài khoản 1 sang 2 và đặt `SAVEPOINT before_fee`, chưa `COMMIT`. Đọc `id`, `balance` của `accounts` theo `id`."
        en: "A transaction is open: it moved 30 from account 1 to 2 and set `SAVEPOINT before_fee`, with no `COMMIT` yet. Read `id`, `balance` from `accounts` by `id`."
      solution: SELECT id, balance FROM accounts ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "Một `SELECT` thường, sắp theo `id`."
        en: "A plain `SELECT`, sorted by `id`."
      fact:
        vi: "70 và 80: trong transaction của mình bạn thấy ngay thay đổi chưa `COMMIT`; phiên khác lúc này vẫn thấy 100 và 50."
        en: "70 and 80: inside your own transaction you see your changes at once, before `COMMIT`; another session would still see 100 and 50."
        probe: SELECT id, balance FROM accounts ORDER BY id
        expect: [[1, 70], [2, 80]]
    - task:
        vi: "Thu phí 20 của tài khoản 2 trong cùng transaction (phí 500 sẽ vi phạm `CHECK`, thử xem). Trả về `id` và `balance` mới (`RETURNING`)."
        en: "Charge account 2 a fee of 20 in the same transaction (a fee of 500 would break the `CHECK`, try it). Return the `id` and new `balance` (`RETURNING`)."
      solution: UPDATE accounts SET balance = balance - 20 WHERE id = 2 RETURNING id, balance
      check: rows
      hint:
        vi: "`UPDATE ... SET balance = balance - 20 WHERE id = 2` rồi thêm `RETURNING`."
        en: "`UPDATE ... SET balance = balance - 20 WHERE id = 2`, then add `RETURNING`."
      fact:
        vi: "Còn 60. Nếu bạn thử phí 500 trước, câu đó lỗi 23514 và cả transaction bị hủy: mọi câu sau báo \"current transaction is aborted\" tới khi `ROLLBACK TO SAVEPOINT before_fee`."
        en: "60 left. Had you tried the 500 fee first, that statement fails with 23514 and the whole transaction is aborted: every later statement reports \"current transaction is aborted\" until `ROLLBACK TO SAVEPOINT before_fee`."
quiz:
  - q:
      vi: "Trong một transaction, câu thứ hai báo lỗi. Bạn gõ tiếp một `SELECT` mà chưa `ROLLBACK`. Chuyện gì xảy ra?"
      en: "Inside a transaction the second statement fails. You type another `SELECT` without a `ROLLBACK`. What happens?"
    options:
      - { vi: "SELECT chạy bình thường", en: "The SELECT runs normally" }
      - { vi: "Postgres từ chối mọi câu cho tới khi transaction kết thúc", en: "Postgres refuses every statement until the transaction ends" }
      - { vi: "Postgres tự COMMIT phần đã chạy được", en: "Postgres commits the part that worked" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `SELECT` chỉ đọc, chẳng liên quan gì tới câu bị lỗi; nhưng sau lỗi, transaction ở trạng thái hỏng: mọi câu nhận lỗi 25P02 \"current transaction is aborted\" cho tới `ROLLBACK` (hoặc `ROLLBACK TO SAVEPOINT`). Gõ `COMMIT` lúc này cũng chỉ là rollback."
      en: "It sounds right because a `SELECT` only reads and has nothing to do with the failed statement, but after an error the transaction is aborted: every statement gets 25P02 \"current transaction is aborted\" until `ROLLBACK` (or `ROLLBACK TO SAVEPOINT`). Typing `COMMIT` at that point also just rolls back."
  - q:
      vi: "Phiên A đã `UPDATE` một dòng nhưng chưa `COMMIT`. Phiên B đọc dòng đó. B thấy gì?"
      en: "Session A has run `UPDATE` on a row but not `COMMIT`. Session B reads that row. What does B see?"
    options:
      - { vi: "Giá trị mới của A", en: "A's new value" }
      - { vi: "Giá trị cũ, đã commit trước đó", en: "The old, previously committed value" }
      - { vi: "B phải chờ A commit xong mới đọc được", en: "B must wait for A to commit before it can read" }
    answer: 1
    trap: 2
    why:
      vi: "Nghe hợp lý vì A đang giữ lock trên dòng đó, nhưng lock ấy chỉ chặn người ghi khác. Thay đổi chưa commit không ai khác thấy, và nhờ MVCC, đọc không chờ ghi: B đọc phiên bản đã commit mà không bị chặn."
      en: "It sounds right because A holds a lock on that row, but that lock only blocks other writers. Uncommitted changes are invisible to everyone else, and thanks to MVCC, readers do not wait for writers: B reads the committed version without blocking."
  - q:
      vi: "Mức cô lập mặc định là Read Committed. Trong một transaction, bạn chạy cùng một câu `SELECT count(*)` hai lần; giữa hai lần, phiên khác thêm một dòng và `COMMIT`. Lần thứ hai thấy gì?"
      en: "The default isolation level is Read Committed. Inside one transaction you run the same `SELECT count(*)` twice; in between, another session inserts a row and runs `COMMIT`. What does the second run see?"
    options:
      - { vi: "Cùng con số với lần đầu: một transaction luôn thấy dữ liệu đứng yên", en: "The same number as the first: a transaction always sees frozen data" }
      - { vi: "Con số mới, có cả dòng vừa commit", en: "The new number, including the row just committed" }
      - { vi: "Lỗi, vì dữ liệu đã đổi", en: "An error, because the data changed" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì ta hay hình dung transaction là một khối tách khỏi thế giới bên ngoài, nhưng ở Read Committed mỗi câu lệnh lấy một ảnh chụp (snapshot) mới, nên câu sau thấy những gì đã commit trước nó. Muốn cả transaction thấy cùng một ảnh chụp thì dùng `REPEATABLE READ` (học kỹ ở L4)."
      en: "It sounds right because a transaction is often pictured as sealed off from the outside world, but under Read Committed each statement takes a fresh snapshot, so a later statement sees whatever was committed before it. For one snapshot across the whole transaction use `REPEATABLE READ` (covered in depth in L4)."
---
## Mở bài

Bạn trừ 30 ở tài khoản 1, và máy sập ngay trước khi kịp cộng 30 cho tài khoản 2. Khi máy chạy lại, 30 đồng đó đã đi đâu? Bài này cho bạn cách để hai câu ghi đó cùng xảy ra hoặc cùng không xảy ra.

## Ý chính

Transaction gói nhiều câu lệnh thành một đơn vị "tất cả hoặc không gì cả". `BEGIN` mở transaction, `COMMIT` giữ lại mọi thay đổi, `ROLLBACK` hủy hết như chưa từng chạy. Nếu máy sập giữa chừng, Postgres khởi động lại và coi như transaction chưa commit chưa bao giờ xảy ra, nên tiền không thể bị trừ một nửa.

Nhiều người nghĩ không gõ `BEGIN` thì các câu không nằm trong transaction nào. Thật ra mỗi câu đứng một mình là một transaction riêng và tự commit ngay khi chạy xong (autocommit). Vì vậy `ROLLBACK` gõ sau một câu `UPDATE` đứng một mình không hủy được gì: câu đó đã commit rồi, Postgres chỉ cảnh báo "there is no transaction in progress".

Trong transaction của mình, bạn thấy ngay thay đổi chưa commit. Phiên khác thì chưa thấy: họ vẫn đọc bản đã commit trước đó, và không phải chờ bạn. Postgres làm được vậy nhờ MVCC, giữ nhiều phiên bản của một dòng cùng lúc (học kỹ ở L3).

Mức cô lập mặc định là Read Committed: mỗi câu lệnh lấy một ảnh chụp (snapshot) dữ liệu mới lúc nó bắt đầu. Hai câu giống hệt nhau trong cùng một transaction có thể ra kết quả khác nhau nếu giữa chúng có phiên khác commit.

Khi một câu trong `BEGIN` bị lỗi, cả transaction hỏng. Mọi câu sau, kể cả `SELECT`, bị từ chối với mã 25P02 cho tới khi transaction kết thúc. Gõ `COMMIT` lúc này không lưu gì: Postgres kết thúc transaction như một `ROLLBACK`.

`SAVEPOINT` đặt một mốc bên trong transaction. `ROLLBACK TO SAVEPOINT` chỉ hủy phần sau mốc đó, giữ phần trước, và đưa một transaction đang hỏng về trạng thái dùng được. Nhờ vậy một bước phụ thất bại (thu phí, ghi log) không kéo theo cả việc chính.

Hình từng bước ở cuối mục này đi lại đúng lần chuyển tiền của lab: đặt mốc `before_fee`, khoản phí lỗi làm hỏng transaction, rồi `ROLLBACK TO SAVEPOINT` chỉ bỏ phần sau mốc.

## Cú pháp

```sql
BEGIN [ ISOLATION LEVEL { READ COMMITTED | REPEATABLE READ | SERIALIZABLE } ];
SAVEPOINT savepoint_name;
ROLLBACK TO [ SAVEPOINT ] savepoint_name;
RELEASE [ SAVEPOINT ] savepoint_name;
{ COMMIT | ROLLBACK };
```

- `BEGIN`: mở transaction; không có nó, mỗi câu tự commit.
- `ISOLATION LEVEL`: mặc định là `READ COMMITTED`.
- `ROLLBACK TO`: hủy phần sau mốc, mốc vẫn còn để dùng lại.
- `RELEASE`: bỏ mốc, giữ thay đổi; sau đó không quay về mốc đó được nữa.
- `COMMIT` / `ROLLBACK`: kết thúc transaction, giữ hoặc hủy mọi thay đổi.

## Ví dụ

Setup của bài đã mở sẵn một transaction: chuyển 30 từ tài khoản 1 sang 2 rồi đặt `SAVEPOINT before_fee`. Các khối dưới chạy nối tiếp nhau. Đọc ngay bên trong transaction đó:

```sql
SELECT id, balance FROM accounts ORDER BY id;
```

Ra 70 và 80: bạn thấy thay đổi của chính mình dù chưa commit.

```sql
ROLLBACK;
SELECT id, balance FROM accounts ORDER BY id;
```

`ROLLBACK` hủy cả lần chuyển, nên số dư về lại 100 và 50.

Làm lại lần chuyển, đặt mốc, thu thử một khoản phí rồi quay về mốc:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
SAVEPOINT before_fee;
UPDATE accounts SET balance = balance - 20 WHERE id = 2;
ROLLBACK TO SAVEPOINT before_fee;
COMMIT;
SELECT id, balance FROM accounts ORDER BY id;
```

Kết quả 70 và 80: khoản phí 20 bị hủy, lần chuyển 30 trước mốc được commit.

```sql
SHOW transaction_isolation;
```

Ra `read committed`, mức cô lập mặc định.

## Lỗi hay gặp

Đặt mốc khi chưa mở transaction:

```sql
-- ERROR 25P01: SAVEPOINT can only be used in transaction blocks
SAVEPOINT x;
```

Câu đứng một mình đã tự commit, nên không có transaction nào để đặt mốc. Gõ `BEGIN` trước.

Một câu lỗi làm hỏng cả transaction:

```sql
BEGIN;
UPDATE accounts SET balance = balance + 10 WHERE id = 1;
-- ERROR 23514: new row for relation "accounts" violates check constraint "accounts_balance_check"
UPDATE accounts SET balance = balance - 500 WHERE id = 2;
```

```sql
-- ERROR 25P02: current transaction is aborted, commands ignored until end of transaction block
SELECT id, balance FROM accounts ORDER BY id;
```

```sql
COMMIT;
SELECT id, balance FROM accounts ORDER BY id;
```

Ngay cả `SELECT` cũng bị từ chối. `COMMIT` chỉ đóng transaction như `ROLLBACK`: số dư vẫn 70 và 80, khoản cộng 10 không được giữ. Muốn giữ phần trước lỗi, đặt `SAVEPOINT` trước câu dễ lỗi và `ROLLBACK TO SAVEPOINT` khi nó lỗi.

Tưởng `ROLLBACK` hủy được một câu đã chạy không có `BEGIN`:

```sql
-- WRONG: without BEGIN the UPDATE committed by itself
UPDATE accounts SET balance = balance + 1000 WHERE id = 1;
ROLLBACK;
SELECT id, balance FROM accounts ORDER BY id;
```

```sql
-- FIX: undo it by hand, then put BEGIN first so ROLLBACK can undo
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
BEGIN;
UPDATE accounts SET balance = balance + 1000 WHERE id = 1;
ROLLBACK;
SELECT id, balance FROM accounts ORDER BY id;
```

Bản sai để lại 1070: `ROLLBACK` chỉ cảnh báo vì không có transaction nào đang mở. Bản sửa mở `BEGIN` trước, nên `ROLLBACK` đưa số dư về 70.

## Tóm tắt

- `BEGIN ... COMMIT` gói nhiều câu thành một đơn vị: cùng được giữ hoặc cùng bị hủy.
- Không có `BEGIN`, mỗi câu tự commit; `ROLLBACK` sau đó không hủy được gì.
- Sau một lỗi trong transaction, mọi câu bị từ chối (25P02) và `COMMIT` chỉ là rollback.
- `SAVEPOINT` và `ROLLBACK TO SAVEPOINT` hủy riêng phần sau mốc và cứu transaction đang hỏng.
- Read Committed là mặc định: mỗi câu thấy những gì đã commit trước khi nó bắt đầu.

# EN

## Opening

You take 30 out of account 1, and the machine dies just before 30 is added to account 2. When it comes back, where did that 30 go? This lesson gives you a way to make both writes happen together or not at all.

## Key idea

A transaction groups several statements into one "all or nothing" unit. `BEGIN` opens a transaction, `COMMIT` keeps every change, `ROLLBACK` undoes them all as if they never ran. If the machine crashes halfway, Postgres restarts and treats an uncommitted transaction as if it never happened, so money can never be half moved.

Many people think statements outside a `BEGIN` are in no transaction at all. In fact each statement on its own is its own transaction and commits as soon as it finishes (autocommit). That is why a `ROLLBACK` typed after a lone `UPDATE` undoes nothing: the statement has already committed, and Postgres only warns "there is no transaction in progress".

Inside your own transaction you see your uncommitted changes at once. Other sessions do not see them yet: they keep reading the previously committed version and do not wait for you. Postgres does this with MVCC, keeping several versions of a row at the same time (covered in depth in L3).

The default isolation level is Read Committed: each statement takes a fresh snapshot of the data when it starts. Two identical statements in one transaction can return different results if another session commits between them.

When a statement inside `BEGIN` fails, the whole transaction is broken. Every later statement, even a `SELECT`, is refused with code 25P02 until the transaction ends. Typing `COMMIT` at that point saves nothing: Postgres ends the transaction like a `ROLLBACK`.

`SAVEPOINT` sets a marker inside a transaction. `ROLLBACK TO SAVEPOINT` undoes only what came after the marker, keeps what came before, and makes a broken transaction usable again. So a failed side step (a fee, a log line) does not drag the main work down with it.

The step-through figure at the end of this section walks through the lab's own transfer: the marker `before_fee` is set, the failing fee breaks the transaction, then `ROLLBACK TO SAVEPOINT` undoes only the part after the marker.

## Syntax

```sql
BEGIN [ ISOLATION LEVEL { READ COMMITTED | REPEATABLE READ | SERIALIZABLE } ];
SAVEPOINT savepoint_name;
ROLLBACK TO [ SAVEPOINT ] savepoint_name;
RELEASE [ SAVEPOINT ] savepoint_name;
{ COMMIT | ROLLBACK };
```

- `BEGIN`: opens a transaction; without it each statement commits by itself.
- `ISOLATION LEVEL`: the default is `READ COMMITTED`.
- `ROLLBACK TO`: undoes what came after the marker; the marker stays and can be reused.
- `RELEASE`: drops the marker and keeps the changes; you can no longer go back to it.
- `COMMIT` / `ROLLBACK`: end the transaction, keeping or undoing every change.

## Example

The lesson's setup has already opened a transaction: it moved 30 from account 1 to 2 and set `SAVEPOINT before_fee`. The blocks below run one after another. Read right inside that transaction:

```sql
SELECT id, balance FROM accounts ORDER BY id;
```

It shows 70 and 80: you see your own changes even though they are not committed.

```sql
ROLLBACK;
SELECT id, balance FROM accounts ORDER BY id;
```

`ROLLBACK` undoes the whole transfer, so the balances go back to 100 and 50.

Redo the transfer, set a marker, try charging a fee, then go back to the marker:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
SAVEPOINT before_fee;
UPDATE accounts SET balance = balance - 20 WHERE id = 2;
ROLLBACK TO SAVEPOINT before_fee;
COMMIT;
SELECT id, balance FROM accounts ORDER BY id;
```

The result is 70 and 80: the fee of 20 is undone, and the transfer of 30 before the marker is committed.

```sql
SHOW transaction_isolation;
```

It shows `read committed`, the default isolation level.

## Common mistakes

Setting a marker with no transaction open:

```sql
-- ERROR 25P01: SAVEPOINT can only be used in transaction blocks
SAVEPOINT x;
```

A lone statement has already committed by itself, so there is no transaction to put a marker in. Type `BEGIN` first.

One failed statement breaks the whole transaction:

```sql
BEGIN;
UPDATE accounts SET balance = balance + 10 WHERE id = 1;
-- ERROR 23514: new row for relation "accounts" violates check constraint "accounts_balance_check"
UPDATE accounts SET balance = balance - 500 WHERE id = 2;
```

```sql
-- ERROR 25P02: current transaction is aborted, commands ignored until end of transaction block
SELECT id, balance FROM accounts ORDER BY id;
```

```sql
COMMIT;
SELECT id, balance FROM accounts ORDER BY id;
```

Even the `SELECT` is refused. `COMMIT` only closes the transaction like a `ROLLBACK`: the balances are still 70 and 80, and the extra 10 is not kept. To keep the work before an error, set a `SAVEPOINT` before the risky statement and run `ROLLBACK TO SAVEPOINT` when it fails.

Believing `ROLLBACK` can undo a statement that ran without `BEGIN`:

```sql
-- WRONG: without BEGIN the UPDATE committed by itself
UPDATE accounts SET balance = balance + 1000 WHERE id = 1;
ROLLBACK;
SELECT id, balance FROM accounts ORDER BY id;
```

```sql
-- FIX: undo it by hand, then put BEGIN first so ROLLBACK can undo
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
BEGIN;
UPDATE accounts SET balance = balance + 1000 WHERE id = 1;
ROLLBACK;
SELECT id, balance FROM accounts ORDER BY id;
```

The wrong version leaves 1070: `ROLLBACK` only warns because no transaction is open. The fix opens `BEGIN` first, so `ROLLBACK` brings the balance back to 70.

## Recap

- `BEGIN ... COMMIT` turns several statements into one unit: all kept or all undone.
- Without `BEGIN` each statement commits by itself; a `ROLLBACK` afterwards undoes nothing.
- After an error inside a transaction every statement is refused (25P02) and `COMMIT` is only a rollback.
- `SAVEPOINT` and `ROLLBACK TO SAVEPOINT` undo just the part after the marker and rescue a broken transaction.
- Read Committed is the default: each statement sees what was committed before it started.
