---
id: e-dy-l4-13
engine: dynamodb
level: L4
module: transactions
title: "Transaction PartiQL bị hủy: không ghi nửa chừng"
title_en: "A cancelled PartiQL transaction: no half writes"
kind: predict
runtime: browser
minutes: 6
objectives:
  - { vi: "Đoán kết quả của một transaction có một điều kiện sai", en: "Predict the outcome of a transaction with one false condition" }
  - { vi: "Đọc danh sách lý do hủy theo thứ tự câu lệnh", en: "Read the list of cancellation reasons in statement order" }
requires: [e-dy-l4-11]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
lab:
  setup: |
    {"tables": [
      {"TableName":"Wallets","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}
    ], "items": {
      "Wallets": [
        {"pk":"WALLET#w1","sk":"BALANCE","owner":"An","amount":300000},
        {"pk":"WALLET#w2","sk":"BALANCE","owner":"Binh","amount":50000},
        {"pk":"WALLET#w3","sk":"BALANCE","owner":"Chi","amount":1200000}
      ]
    }}
  steps:
    - task: { vi: "Sau khi đoán, kiểm số dư: đọc ví `w1` và `w2` trong một câu PartiQL.", en: "After your guess, check the balances: read wallets `w1` and `w2` in one PartiQL statement." }
      solution: |
        SELECT * FROM "Wallets" WHERE pk IN ['WALLET#w1', 'WALLET#w2']
      check: doc
      expect: { Count: 2 }
      hint: { vi: "`IN` trên partition key, như bài write sharding.", en: "`IN` on the partition key, as in the write sharding lesson." }
predict:
  sql: |
    {"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE' AND amount >= 100000"}, {"Statement": "UPDATE \"Wallets\" SET amount = amount + 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}]}}
  q: { vi: "Ví `w2` có 50.000 đ, ví `w1` có 300.000 đ. Transaction trên chuyển 100.000 đ từ `w2` sang `w1`. Kết quả?", en: "Wallet `w2` holds 50,000 VND and wallet `w1` holds 300,000 VND. The transaction above moves 100,000 VND from `w2` to `w1`. What happens?" }
  options:
    - { vi: "Câu thứ hai chạy: `w1` thành 400.000 đ, `w2` giữ nguyên", en: "The second statement runs: `w1` becomes 400,000 VND, `w2` stays the same" }
    - { vi: "Cả transaction bị hủy với `TransactionCanceledException`, lý do `[ConditionalCheckFailed, None]`; hai ví giữ nguyên", en: "The whole transaction is cancelled with `TransactionCanceledException`, reasons `[ConditionalCheckFailed, None]`; both wallets stay the same" }
    - { vi: "`w2` thành -50.000 đ và `w1` thành 400.000 đ", en: "`w2` becomes -50,000 VND and `w1` becomes 400,000 VND" }
  answer: 1
  why: { vi: "Đáp án ghi nửa chừng nghe hợp lý nếu nghĩ mỗi câu chạy riêng như `BatchWriteItem`. Nhưng điều kiện `amount >= 100000` của câu đầu sai, nên DynamoDB hủy cả transaction. Danh sách lý do theo thứ tự câu lệnh: câu 1 `ConditionalCheckFailed`, câu 2 `None`. Bộ máy trong trình duyệt cho đúng kết quả này; capacity của hai item vẫn bị tính trên AWS thật.", en: "A half write sounds right if each statement seems to run on its own, as in `BatchWriteItem`. But the first statement's condition `amount >= 100000` is false, so DynamoDB cancels the whole transaction. The reasons follow statement order: statement 1 `ConditionalCheckFailed`, statement 2 `None`. The in-browser engine gives exactly this result; on real AWS the capacity for both items is still charged." }
---

## Ý chính

`ExecuteTransaction` là transaction viết bằng PartiQL: tối đa 100 câu `INSERT`/`UPDATE`/`DELETE`/`EXISTS` (hoặc toàn `SELECT`), chạy tất-cả-hoặc-không như `TransactWriteItems`, cùng giá gấp đôi.

- Điều kiện đặt ngay trong `WHERE` của câu `UPDATE`: `AND amount >= 100000`.
- Một điều kiện sai thì cả transaction bị hủy; `CancellationReasons` liệt kê lý do theo đúng thứ tự câu lệnh.
- Không câu nào được ghi: không có "trừ xong nhưng chưa cộng".

Đây là cách tập transaction ghi chạy được trong trình duyệt, vì `TransactWriteItems` chưa có (bài 11).

## Ví dụ

Cùng một chuyển khoản viết bằng PartiQL, theo chiều đủ tiền (`w1` có 300.000 đ):

```sql
UPDATE "Wallets" SET amount = amount - 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE' AND amount >= 100000
UPDATE "Wallets" SET amount = amount + 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'
```

Gửi hai câu này trong một `ExecuteTransaction` thì cả hai cùng được ghi.

# EN

## Key idea

`ExecuteTransaction` is a transaction written in PartiQL: up to 100 `INSERT`/`UPDATE`/`DELETE`/`EXISTS` statements (or only `SELECT` statements), all or nothing like `TransactWriteItems`, at the same double price.

- The condition sits in the `WHERE` of the `UPDATE` statement: `AND amount >= 100000`.
- One false condition cancels the whole transaction; `CancellationReasons` lists the reasons in statement order.
- No statement is written: there is no "debited but not yet credited".

This is the way to practise write transactions in the browser, since `TransactWriteItems` is not available yet (lesson 11).

## Example

The same transfer written in PartiQL, in the direction with enough money (`w1` holds 300,000 VND):

```sql
UPDATE "Wallets" SET amount = amount - 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE' AND amount >= 100000
UPDATE "Wallets" SET amount = amount + 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'
```

Sending both statements in one `ExecuteTransaction` writes both.
