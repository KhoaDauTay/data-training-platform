---
id: e-pg-l1-07
engine: postgres
level: L1
module: transactions
title: Transaction và savepoint
title_en: Transactions and savepoints
kind: concept
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-mvcc-timeline
objectives:
  - vi: Gói nhiều câu ghi trong `BEGIN ... COMMIT` để chúng cùng thành công hoặc cùng bị hủy.
    en: Wrap several writes in `BEGIN ... COMMIT` so they all succeed or are all undone.
  - vi: Dùng `SAVEPOINT` để hủy một phần, và nhận ra lỗi "current transaction is aborted".
    en: Use `SAVEPOINT` to undo part of the work, and recognise the "current transaction is aborted" error.
requires: [e-pg-l1-06]
sources:
  - https://www.postgresql.org/docs/18/tutorial-transactions.html
  - https://www.postgresql.org/docs/18/sql-begin.html
  - https://www.postgresql.org/docs/18/sql-savepoint.html
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
    why:
      vi: "Nghe hợp lý vì `SELECT` chỉ đọc, chẳng liên quan gì tới câu bị lỗi; nhưng sau lỗi, transaction ở trạng thái hỏng: mọi câu nhận lỗi \"current transaction is aborted\" cho tới `ROLLBACK` (hoặc `ROLLBACK TO SAVEPOINT`). Gõ `COMMIT` lúc này cũng chỉ là rollback."
      en: "It sounds right because a `SELECT` only reads and has nothing to do with the failed statement, but after an error the transaction is aborted: every statement gets \"current transaction is aborted\" until `ROLLBACK` (or `ROLLBACK TO SAVEPOINT`). Typing `COMMIT` at that point also just rolls back."
  - q:
      vi: "Phiên A đã `UPDATE` một dòng nhưng chưa `COMMIT`. Phiên B đọc dòng đó. B thấy gì?"
      en: "Session A has run `UPDATE` on a row but not `COMMIT`. Session B reads that row. What does B see?"
    options:
      - { vi: "Giá trị mới của A", en: "A's new value" }
      - { vi: "Giá trị cũ, đã commit trước đó", en: "The old, previously committed value" }
      - { vi: "B phải chờ A commit xong mới đọc được", en: "B must wait for A to commit before it can read" }
    answer: 1
    why:
      vi: "Phải chờ nghe hợp lý vì A đang giữ lock trên dòng đó; nhưng lock ấy chỉ chặn người ghi khác. Thay đổi chưa commit không ai khác thấy, và nhờ MVCC, đọc không chờ ghi: B đọc phiên bản đã commit mà không bị chặn."
      en: "Waiting sounds right because A holds a lock on that row, but that lock only blocks other writers. Uncommitted changes are invisible to everyone else, and thanks to MVCC, readers do not wait for writers: B reads the committed version without blocking."
  - q:
      vi: "Mức cô lập mặc định là Read Committed. Trong một transaction, bạn chạy cùng một câu `SELECT count(*)` hai lần; giữa hai lần, phiên khác thêm một dòng và `COMMIT`. Lần thứ hai thấy gì?"
      en: "The default isolation level is Read Committed. Inside one transaction you run the same `SELECT count(*)` twice; in between, another session inserts a row and runs `COMMIT`. What does the second run see?"
    options:
      - { vi: "Cùng con số với lần đầu: một transaction luôn thấy dữ liệu đứng yên", en: "The same number as the first: a transaction always sees frozen data" }
      - { vi: "Con số mới, có cả dòng vừa commit", en: "The new number, including the row just committed" }
      - { vi: "Lỗi, vì dữ liệu đã đổi", en: "An error, because the data changed" }
    answer: 1
    why:
      vi: "Dữ liệu đứng yên nghe hợp lý vì ta hay hình dung transaction là một khối tách khỏi thế giới bên ngoài; nhưng ở Read Committed, mỗi câu lệnh lấy một ảnh chụp (snapshot) mới, nên câu sau thấy những gì đã commit trước nó. Muốn cả transaction thấy cùng một ảnh chụp thì dùng `REPEATABLE READ` (học kỹ ở L4)."
      en: "Frozen data sounds right because a transaction is often pictured as sealed off from the outside world, but under Read Committed each statement takes a fresh snapshot, so a later statement sees whatever was committed before it. For one snapshot across the whole transaction use `REPEATABLE READ` (covered in depth in L4)."
---
## Ý chính

Trừ tiền tài khoản A xong thì máy sập, trước khi kịp cộng cho B: tiền đi đâu? Transaction gói nhiều câu thành một đơn vị "tất cả hoặc không gì cả".

- `BEGIN` mở transaction; `COMMIT` ghi lại mọi thay đổi; `ROLLBACK` hủy hết.
- Không có `BEGIN` thì mỗi câu là một transaction riêng, tự commit.
- Thay đổi chưa commit chỉ phiên của bạn thấy. Các phiên khác vẫn thấy dữ liệu cũ, và không bị chặn khi đọc (MVCC, học kỹ ở L3).
- Mức cô lập mặc định là Read Committed: mỗi câu lệnh lấy một ảnh chụp (snapshot) mới lúc nó bắt đầu, nên hai câu giống nhau trong cùng một transaction có thể thấy kết quả khác nhau nếu giữa chúng có phiên khác commit.
- Khi một câu lỗi, cả transaction hỏng: các câu sau bị từ chối với lỗi "current transaction is aborted" cho tới khi bạn `ROLLBACK`.
- `SAVEPOINT name` đánh dấu một điểm; `ROLLBACK TO SAVEPOINT name` chỉ hủy phần sau điểm đó, và đưa transaction hỏng về trạng thái dùng được.

## Ví dụ

```sql
CREATE TABLE accounts (id int PRIMARY KEY, balance numeric NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 100), (2, 50);
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
SAVEPOINT before_fee;
-- ERROR: new row violates check constraint "accounts_balance_check"
UPDATE accounts SET balance = balance - 500 WHERE id = 2;
ROLLBACK TO SAVEPOINT before_fee;
COMMIT;
SELECT id, balance FROM accounts ORDER BY id;
```

Câu trừ 500 vi phạm `CHECK`. `ROLLBACK TO SAVEPOINT` bỏ riêng phần đó, nên `COMMIT` vẫn giữ lần chuyển 30: kết quả 70 và 80.

## Thực hành

Lab bên dưới mở sẵn một transaction như ví dụ: bạn đọc và ghi bên trong nó. Sơ đồ cho thấy hai phiên trên cùng một dòng theo thời gian (phần này cần hai phiên, nên chỉ là sơ đồ). Làm lab, bấm qua sơ đồ, rồi trả lời ba câu hỏi.

# EN

## Key idea

You debit account A and the machine dies before B is credited: where did the money go? A transaction groups several statements into one "all or nothing" unit.

- `BEGIN` opens a transaction; `COMMIT` keeps every change; `ROLLBACK` undoes them all.
- Without `BEGIN`, each statement is its own transaction and commits by itself.
- Uncommitted changes are visible only to your session. Other sessions still see the old data and are not blocked when reading (MVCC, covered in depth in L3).
- The default isolation level is Read Committed: each statement takes a fresh snapshot when it starts, so the same statement run twice in one transaction can see different results if another session commits in between.
- When a statement fails, the whole transaction is broken: later statements are refused with "current transaction is aborted" until you `ROLLBACK`.
- `SAVEPOINT name` marks a point; `ROLLBACK TO SAVEPOINT name` undoes only what came after it and makes a broken transaction usable again.

## Example

```sql
CREATE TABLE accounts (id int PRIMARY KEY, balance numeric NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 100), (2, 50);
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
SAVEPOINT before_fee;
-- ERROR: new row violates check constraint "accounts_balance_check"
UPDATE accounts SET balance = balance - 500 WHERE id = 2;
ROLLBACK TO SAVEPOINT before_fee;
COMMIT;
SELECT id, balance FROM accounts ORDER BY id;
```

The 500 debit breaks the `CHECK`. `ROLLBACK TO SAVEPOINT` drops just that part, so `COMMIT` still keeps the 30 transfer: the result is 70 and 80.

## Practice

The lab below opens a transaction like the example: you read and write inside it. The diagram shows two sessions working on one row over time (that part needs two sessions, so it is a diagram only). Do the lab, step through the diagram, then answer the three questions.
