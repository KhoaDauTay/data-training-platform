---
id: e-pg-l1-07
engine: postgres
level: L1
module: transactions
title: Transaction và savepoint
title_en: Transactions and savepoints
kind: concept
runtime: docs
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
      vi: "Sau lỗi, transaction ở trạng thái hỏng: mọi câu nhận lỗi \"current transaction is aborted\" cho tới `ROLLBACK` (hoặc `ROLLBACK TO SAVEPOINT`). Gõ `COMMIT` lúc này cũng chỉ là rollback."
      en: "After an error the transaction is aborted: every statement gets \"current transaction is aborted\" until `ROLLBACK` (or `ROLLBACK TO SAVEPOINT`). Typing `COMMIT` at that point also just rolls back."
  - q:
      vi: "Phiên A đã `UPDATE` một dòng nhưng chưa `COMMIT`. Phiên B đọc dòng đó. B thấy gì?"
      en: "Session A has run `UPDATE` on a row but not `COMMIT`. Session B reads that row. What does B see?"
    options:
      - { vi: "Giá trị mới của A", en: "A's new value" }
      - { vi: "Giá trị cũ, đã commit trước đó", en: "The old, previously committed value" }
      - { vi: "B phải chờ A commit xong mới đọc được", en: "B must wait for A to commit before it can read" }
    answer: 1
    why:
      vi: "Thay đổi chưa commit không ai khác thấy. Nhờ MVCC, đọc không chờ ghi: B đọc phiên bản đã commit mà không bị chặn."
      en: "Uncommitted changes are invisible to everyone else. Thanks to MVCC, readers do not wait for writers: B reads the committed version without blocking."
  - q:
      vi: "Mức cô lập mặc định là READ COMMITTED. Trong một transaction, bạn chạy cùng một câu `SELECT count(*)` hai lần; giữa hai lần, phiên khác thêm một dòng và `COMMIT`. Lần thứ hai thấy gì?"
      en: "The default isolation level is READ COMMITTED. Inside one transaction you run the same `SELECT count(*)` twice; in between, another session inserts a row and runs `COMMIT`. What does the second run see?"
    options:
      - { vi: "Cùng con số với lần đầu: một transaction luôn thấy dữ liệu đứng yên", en: "The same number as the first: a transaction always sees frozen data" }
      - { vi: "Con số mới, có cả dòng vừa commit", en: "The new number, including the row just committed" }
      - { vi: "Lỗi, vì dữ liệu đã đổi", en: "An error, because the data changed" }
    answer: 1
    why:
      vi: "Ở READ COMMITTED, mỗi câu lệnh lấy một ảnh chụp (snapshot) mới, nên câu sau thấy những gì đã commit trước nó. Muốn cả transaction thấy cùng một ảnh chụp thì dùng `REPEATABLE READ` (học kỹ ở L4)."
      en: "Under READ COMMITTED each statement takes a fresh snapshot, so a later statement sees whatever was committed before it. For one snapshot across the whole transaction use `REPEATABLE READ` (covered in depth in L4)."
---
## Ý chính

Transaction gói nhiều câu thành một đơn vị "tất cả hoặc không gì cả". Ví dụ chuyển tiền: trừ tài khoản A và cộng tài khoản B phải cùng xảy ra.

- `BEGIN` mở transaction; `COMMIT` ghi lại mọi thay đổi; `ROLLBACK` hủy hết.
- Không có `BEGIN` thì mỗi câu là một transaction riêng, tự commit.
- Thay đổi chưa commit chỉ phiên của bạn thấy. Các phiên khác vẫn thấy dữ liệu cũ, và không bị chặn khi đọc (MVCC, học kỹ ở L3).
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

Sơ đồ cho thấy hai phiên trên cùng một dòng theo thời gian. Bấm qua từng bước, rồi trả lời ba câu hỏi.

# EN

## Key idea

A transaction groups several statements into one "all or nothing" unit. A money transfer is the classic case: debiting account A and crediting account B must both happen.

- `BEGIN` opens a transaction; `COMMIT` keeps every change; `ROLLBACK` undoes them all.
- Without `BEGIN`, each statement is its own transaction and commits by itself.
- Uncommitted changes are visible only to your session. Other sessions still see the old data and are not blocked when reading (MVCC, covered in depth in L3).
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

The diagram shows two sessions working on one row over time. Step through it, then answer the three questions.
