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
quiz:
  - q: { vi: "Transaction chuyển tiền bị hủy vì ví nguồn không đủ tiền. Ứng dụng nên làm gì tiếp?", en: "A transfer transaction is cancelled because the source wallet lacks money. What should the application do next?" }
    options:
      - { vi: "Đọc `CancellationReasons`: lý do `ConditionalCheckFailed` ở câu 1 là quy tắc nghiệp vụ, báo người dùng, không gửi lại", en: "Read `CancellationReasons`: `ConditionalCheckFailed` on statement 1 is a business rule, tell the user, do not resend" }
      - { vi: "Gửi lại ngay cho tới khi thành công", en: "Resend right away until it succeeds" }
      - { vi: "Chạy riêng câu cộng tiền cho ví đích", en: "Run the credit statement for the target wallet on its own" }
    answer: 0
    why: { vi: "Điều kiện sai sẽ sai lại y nguyên. Chỉ lý do tạm thời (xung đột với transaction khác, thiếu capacity) mới đáng gửi lại có backoff.", en: "A false condition fails again exactly the same way. Only temporary reasons (a conflict with another transaction, missing capacity) are worth a resend with backoff." }
predict:
  sql: |
    {"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE' AND amount >= 100000"}, {"Statement": "UPDATE \"Wallets\" SET amount = amount + 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}]}}
  q: { vi: "Ví `w2` có 50.000 đ, ví `w1` có 300.000 đ. Transaction trên chuyển 100.000 đ từ `w2` sang `w1`. Kết quả?", en: "Wallet `w2` holds 50,000 VND and wallet `w1` holds 300,000 VND. The transaction above moves 100,000 VND from `w2` to `w1`. What happens?" }
  options:
    - { vi: "Câu thứ hai chạy: `w1` thành 400.000 đ, `w2` giữ nguyên", en: "The second statement runs: `w1` becomes 400,000 VND, `w2` stays the same" }
    - { vi: "Cả transaction bị hủy với `TransactionCanceledException`, lý do `[ConditionalCheckFailed, None]`; hai ví giữ nguyên", en: "The whole transaction is cancelled with `TransactionCanceledException`, reasons `[ConditionalCheckFailed, None]`; both wallets stay the same" }
    - { vi: "`w2` thành -50.000 đ và `w1` thành 400.000 đ", en: "`w2` becomes -50,000 VND and `w1` becomes 400,000 VND" }
  answer: 1
  trap: 0
  why: { vi: "Đáp án ghi nửa chừng nghe hợp lý nếu nghĩ mỗi câu chạy riêng như `BatchWriteItem`. Nhưng điều kiện `amount >= 100000` của câu đầu sai, nên DynamoDB hủy cả transaction. Danh sách lý do theo thứ tự câu lệnh: câu 1 `ConditionalCheckFailed`, câu 2 `None`. Bộ máy trong trình duyệt cho đúng kết quả này; capacity của hai item vẫn bị tính trên AWS thật.", en: "A half write sounds right if each statement seems to run on its own, as in `BatchWriteItem`. But the first statement's condition `amount >= 100000` is false, so DynamoDB cancels the whole transaction. The reasons follow statement order: statement 1 `ConditionalCheckFailed`, statement 2 `None`. The in-browser engine gives exactly this result; on real AWS the capacity for both items is still charged." }
---
## Mở bài

Một người bấm "chuyển 100.000 đ" khi ví chỉ còn 50.000 đ. Câu trừ tiền phải thất bại; câu cộng tiền cho người nhận thì không có điều kiện gì. Trong một transaction, liệu câu thứ hai có vẫn chạy?

## Ý chính

`ExecuteTransaction` là transaction viết bằng PartiQL: tối đa 100 câu `INSERT`/`UPDATE`/`DELETE`/`EXISTS` (hoặc toàn `SELECT`), chạy tất-cả-hoặc-không như `TransactWriteItems`, cùng giá gấp đôi. Điều kiện đặt ngay trong `WHERE` của câu `UPDATE`, ví dụ `AND amount >= 100000`.

Một điều kiện sai thì cả transaction bị hủy với `TransactionCanceledException`; `CancellationReasons` liệt kê lý do theo đúng thứ tự câu lệnh, câu không lỗi có lý do `None`. Không câu nào được ghi: không có "trừ xong nhưng chưa cộng".

Nhiều người nghĩ mỗi câu trong transaction chạy riêng, như `BatchWriteItem`. Thật ra chỉ cần một câu có điều kiện sai là không câu nào được ghi; trên AWS thật, capacity của mọi item vẫn bị tính.

Đây là cách tập transaction ghi chạy được trong trình duyệt, vì `TransactWriteItems` chưa có (bài 11). Đoán trước, rồi đọc lại số dư ở bước lab.

## Ví dụ

Cùng một chuyển khoản viết bằng PartiQL, theo chiều đủ tiền (`w1` có 300.000 đ):

```text
UPDATE "Wallets" SET amount = amount - 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE' AND amount >= 100000
UPDATE "Wallets" SET amount = amount + 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'
```

Gửi hai câu này trong một `ExecuteTransaction` thì cả hai cùng được ghi.

## Tóm tắt

- `ExecuteTransaction`: tối đa 100 câu PartiQL, tất-cả-hoặc-không.
- Điều kiện nằm trong `WHERE` của câu `UPDATE`.
- Một điều kiện sai: cả transaction bị hủy, không câu nào được ghi.
- `CancellationReasons` theo thứ tự câu lệnh; câu không lỗi có lý do `None`.

# EN

## Opening

Someone presses "send 100,000 VND" while their wallet holds only 50,000 VND. The debit statement must fail; the credit statement for the receiver has no condition at all. Inside one transaction, does the second statement still run?

## Key idea

`ExecuteTransaction` is a transaction written in PartiQL: up to 100 `INSERT`/`UPDATE`/`DELETE`/`EXISTS` statements (or only `SELECT` statements), all or nothing like `TransactWriteItems`, at the same double price. The condition sits right in the `WHERE` of the `UPDATE` statement, for example `AND amount >= 100000`.

One false condition cancels the whole transaction with `TransactionCanceledException`; `CancellationReasons` lists the reasons in statement order, and a statement without an error has the reason `None`. No statement is written: there is no "debited but not yet credited".

Many people think each statement in a transaction runs on its own, as in `BatchWriteItem`. In fact one statement with a false condition means no statement is written; on real AWS, the capacity for every item is still charged.

This is the way to practise write transactions in the browser, since `TransactWriteItems` is not available yet (lesson 11). Guess first, then read the balances back in the lab step.

## Example

The same transfer written in PartiQL, in the direction with enough money (`w1` holds 300,000 VND):

```text
UPDATE "Wallets" SET amount = amount - 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE' AND amount >= 100000
UPDATE "Wallets" SET amount = amount + 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'
```

Sending both statements in one `ExecuteTransaction` writes both.

## Recap

- `ExecuteTransaction`: up to 100 PartiQL statements, all or nothing.
- The condition sits in the `WHERE` of the `UPDATE` statement.
- One false condition: the whole transaction is cancelled, nothing is written.
- `CancellationReasons` follow statement order; a statement without an error has `None`.
