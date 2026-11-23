---
id: e-dy-l4-15
engine: dynamodb
level: L4
module: transactions
title: "ExecuteTransaction: tự viết một lần chuyển tiền"
title_en: "ExecuteTransaction: write a money transfer yourself"
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Viết một `ExecuteTransaction` gồm nhiều câu PartiQL ghi, có điều kiện trong `WHERE`.
    en: Write an `ExecuteTransaction` of several PartiQL write statements, with a condition in the `WHERE`.
  - vi: "Đọc giá của transaction trong `ConsumedCapacity`: 2 WCU cho mỗi item tới 1 KB."
    en: "Read a transaction's price in `ConsumedCapacity`: 2 WCU per item up to 1 KB."
  - vi: Gặp `TransactionCanceledException` khi một điều kiện sai, và thấy không item nào bị ghi.
    en: Meet `TransactionCanceledException` when one condition is false, and see that no item was written.
requires: [e-dy-l4-13]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ExecuteTransaction.html
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
    - task:
        vi: 'Chuyển 100000 từ ví `w1` sang ví `w2` trong một transaction. Chỉ trừ khi `w1` còn ít nhất 100000.'
        en: 'Move 100000 from wallet `w1` to wallet `w2` in one transaction. Debit only when `w1` still holds at least 100000.'
      solution: |
        {"op": "ExecuteTransaction", "input": {"TransactStatements": [
          {"Statement": "UPDATE \"Wallets\" SET amount = amount - 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE' AND amount >= 100000"},
          {"Statement": "UPDATE \"Wallets\" SET amount = amount + 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'"}]}}
      check: doc
      expect: { WriteCapacityUnits: 4 }
      name: { vi: "Chuyển tiền", en: "Transfer" }
      hint:
        vi: 'Hai câu `UPDATE "Wallets" SET amount = amount ± 100000 WHERE pk = … AND sk = …`; điều kiện `AND amount >= 100000` nằm ở câu trừ tiền.'
        en: 'Two statements `UPDATE "Wallets" SET amount = amount ± 100000 WHERE pk = … AND sk = …`; the condition `AND amount >= 100000` goes on the debit.'
    - task:
        vi: 'Làm lại lần chuyển ấy, và trong cùng transaction ghi một dòng sổ cái: item `pk` = `WALLET#w1`, `sk` = `TX#0001`, `amount` = -100000. Đọc giá mới trong `ConsumedCapacity`.'
        en: 'Make the same transfer again, and in the same transaction write a ledger line: an item with `pk` = `WALLET#w1`, `sk` = `TX#0001`, `amount` = -100000. Read the new price in `ConsumedCapacity`.'
      solution: |
        {"op": "ExecuteTransaction", "input": {"TransactStatements": [
          {"Statement": "UPDATE \"Wallets\" SET amount = amount - 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE' AND amount >= 100000"},
          {"Statement": "UPDATE \"Wallets\" SET amount = amount + 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'"},
          {"Statement": "INSERT INTO \"Wallets\" VALUE {'pk': 'WALLET#w1', 'sk': 'TX#0001', 'amount': -100000}"}]}}
      check: doc
      expect: { WriteCapacityUnits: 6 }
      name: { vi: "Kèm sổ cái", en: "With a ledger line" }
      hint:
        vi: 'Thêm câu thứ ba `INSERT INTO "Wallets" VALUE {…}`. Ba item, mỗi item dưới 1 KB, mỗi item 2 WCU.'
        en: 'Add a third statement `INSERT INTO "Wallets" VALUE {…}`. Three items, each under 1 KB, 2 WCU each.'
    - task:
        vi: 'Giờ chuyển 100000 từ ví `w2` (chỉ có 50000) sang ví `w3`, với cùng điều kiện trên câu trừ tiền. Bước này đạt khi DynamoDB hủy cả transaction.'
        en: 'Now move 100000 from wallet `w2` (it holds only 50000) to wallet `w3`, with the same condition on the debit. This step passes when DynamoDB cancels the whole transaction.'
      solution: |
        {"op": "ExecuteTransaction", "input": {"TransactStatements": [
          {"Statement": "UPDATE \"Wallets\" SET amount = amount - 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE' AND amount >= 100000"},
          {"Statement": "UPDATE \"Wallets\" SET amount = amount + 100000 WHERE pk = 'WALLET#w3' AND sk = 'BALANCE'"}]}}
      check: doc
      error: TransactionCanceledException
      name: { vi: "Bị hủy", en: "Cancelled" }
      hint:
        vi: Cùng mẫu với bước 1, chỉ đổi hai ví. Lỗi chính là kết quả bước này cần.
        en: The same pattern as step 1 with the two wallets swapped. The error is the result this step wants.
quiz:
  - q:
      vi: 'Transaction ở bước 3 bị hủy. Trên DynamoDB thật, bạn có trả tiền capacity cho nó không?'
      en: 'The transaction in step 3 is cancelled. On real DynamoDB, do you pay capacity for it?'
    options:
      - { vi: "Không, vì không có item nào được ghi", en: "No, because no item was written" }
      - { vi: "Có: AWS vẫn tính capacity cho các item transaction đã thử, như khi thành công", en: "Yes: AWS still charges capacity for the items the transaction tried, as if it had succeeded" }
      - { vi: "Chỉ trả cho câu có điều kiện sai", en: "Only for the statement whose condition was false" }
    answer: 1
    why:
      vi: 'Nghe hợp lý là không ghi thì không tốn. Nhưng trang transaction của AWS ghi capacity vẫn bị tiêu khi transaction không thành công. Bộ máy trong trình duyệt không trả số cho lần hủy, nên trang này chỉ ghi một ước tính theo luật, có nhãn rõ.'
      en: 'Nothing written sounds like nothing charged. But the AWS transaction page says capacity is still consumed when a transaction does not succeed. The in-browser engine reports no number for a cancellation, so this page shows only a rule-based estimate, clearly labelled.'
---

## Ý chính

`ExecuteTransaction` gửi tối đa 100 câu PartiQL ghi (`INSERT`, `UPDATE`, `DELETE`, `EXISTS`) thành một khối tất-cả-hoặc-không. Đây là cách viết transaction ghi chạy được trong trình duyệt.

- Điều kiện nằm ngay trong `WHERE`: `AND amount >= 100000`. Sai một điều kiện thì cả khối bị hủy với `TransactionCanceledException`.
- Giá: mỗi item tốn **2 WCU** cho mỗi 1 KB (một lần chuẩn bị, một lần xác nhận). Hai ví là 4 WCU, thêm dòng sổ cái là 6.
- Mỗi câu phải chỉ đúng một item bằng đủ khóa chính; không hai câu trên cùng một item.

## Ví dụ

```text
UPDATE w1 (-100000) + UPDATE w2 (+100000)               4 WCU
UPDATE w1 + UPDATE w2 + INSERT TX#0001                  6 WCU
UPDATE w2 (amount 50000 >= 100000 false) + UPDATE w3    TransactionCanceledException
```

## Thực hành

Bước 1 và 2 kiểm cả bảng sau khi ghi lẫn `WriteCapacityUnits` trong `ConsumedCapacity`: đó là số đo thật của bộ máy. Bước 3 cần thấy lỗi; dưới lỗi có dòng ước tính phí AWS vẫn tính, ghi rõ là ước tính.

# EN

## Key idea

`ExecuteTransaction` sends up to 100 PartiQL write statements (`INSERT`, `UPDATE`, `DELETE`, `EXISTS`) as one all-or-nothing block. It is the way to write a write transaction that runs in the browser.

- The condition sits in the `WHERE`: `AND amount >= 100000`. One false condition cancels the whole block with `TransactionCanceledException`.
- Price: each item costs **2 WCU** per 1 KB (one prepare, one commit). Two wallets are 4 WCU, adding the ledger line makes 6.
- Each statement must name exactly one item by its full primary key; no two statements on the same item.

## Example

```text
UPDATE w1 (-100000) + UPDATE w2 (+100000)               4 WCU
UPDATE w1 + UPDATE w2 + INSERT TX#0001                  6 WCU
UPDATE w2 (amount 50000 >= 100000 false) + UPDATE w3    TransactionCanceledException
```

## Practice

Steps 1 and 2 check both the table after the write and `WriteCapacityUnits` in `ConsumedCapacity`: that is the engine's real measured number. Step 3 wants to see the error; under it a line estimates what AWS still charges, clearly marked as an estimate.
