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
    trap: 0
    why:
      vi: 'Nghe hợp lý là không ghi thì không tốn. Nhưng trang transaction của AWS ghi capacity vẫn bị tiêu khi transaction không thành công. Bộ máy trong trình duyệt không trả số cho lần hủy, nên trang này chỉ ghi một ước tính theo luật, có nhãn rõ.'
      en: 'Nothing written sounds like nothing charged. But the AWS transaction page says capacity is still consumed when a transaction does not succeed. The in-browser engine reports no number for a cancellation, so this page shows only a rule-based estimate, clearly labelled.'
  - q:
      vi: 'Vì sao điều kiện `AND amount >= 100000` nằm ở câu trừ tiền chứ không ở câu cộng tiền?'
      en: 'Why does the condition `AND amount >= 100000` sit on the debit statement and not on the credit?'
    options:
      - { vi: "Vì chỉ ví bị trừ mới có thể xuống dưới 0; một điều kiện sai là đủ hủy cả khối", en: "Because only the debited wallet can drop below 0; one false condition is enough to cancel the whole block" }
      - { vi: "Vì DynamoDB chỉ cho một điều kiện mỗi transaction", en: "Because DynamoDB allows only one condition per transaction" }
      - { vi: "Vì câu cộng tiền chạy trước", en: "Because the credit statement runs first" }
    answer: 0
    why:
      vi: 'Mỗi câu được có điều kiện riêng. Quy tắc nghiệp vụ "không âm tiền" chỉ liên quan ví bị trừ; khi nó sai, câu cộng tiền cũng không được ghi.'
      en: 'Each statement may have its own condition. The business rule "no negative balance" only concerns the debited wallet; when it is false, the credit is not written either.'
---
## Mở bài

Ứng dụng ví cần nút "chuyển tiền" thật sự an toàn: trừ một ví, cộng ví kia, và không bao giờ để số dư âm. Trình duyệt chưa chạy được `TransactWriteItems`, nhưng chạy được transaction PartiQL. Bài này bạn tự viết nó.

## Ý chính

`ExecuteTransaction` gửi tối đa 100 câu PartiQL ghi (`INSERT`, `UPDATE`, `DELETE`, `EXISTS`) thành một khối tất-cả-hoặc-không. Điều kiện nằm ngay trong `WHERE`: `AND amount >= 100000`. Sai một điều kiện thì cả khối bị hủy với `TransactionCanceledException`. Mỗi câu phải chỉ đúng một item bằng đủ khóa chính; không hai câu trên cùng một item.

Giá: mỗi item tốn 2 WCU cho mỗi 1 KB (một lần chuẩn bị, một lần xác nhận). Hai ví là 4 WCU, thêm dòng sổ cái là 6.

Nhiều người nghĩ transaction tự bảo vệ số dư. Thật ra transaction chỉ hứa tất-cả-hoặc-không; quy tắc "không âm tiền" phải do bạn viết thành điều kiện. Thiếu điều kiện, transaction vẫn thành công và ví xuống dưới 0.

Lab chạy bằng dynoxide trong trình duyệt; `WriteCapacityUnits` là số đo thật của engine.

## Cú pháp

```text
{"op": "ExecuteTransaction", "input": {"TransactStatements": [
  {"Statement": "UPDATE \"<t>\" SET a = a - :x WHERE pk = '...' AND sk = '...' AND a >= :x"},
  {"Statement": "UPDATE \"<t>\" SET a = a + :x WHERE pk = '...' AND sk = '...'"},
  {"Statement": "INSERT INTO \"<t>\" VALUE {'pk': '...', 'sk': '...', ...}"}
], ["ClientRequestToken": "<id>"]}}
```

- Tối đa 100 câu; mỗi câu một item, khóa chính đầy đủ.
- Điều kiện là phần thêm vào `WHERE`.
- 2 WCU mỗi item tới 1 KB.

## Ví dụ

Chuyển 50000 từ `w3` sang `w2`:

```json
{"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 50000 WHERE pk = 'WALLET#w3' AND sk = 'BALANCE' AND amount >= 50000"}, {"Statement": "UPDATE \"Wallets\" SET amount = amount + 50000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'"}]}}
```

`w3` còn 1150000, `w2` lên 100000; 4 WCU.

Kiểm lại số dư bằng một câu đọc:

```partiql
SELECT * FROM "Wallets" WHERE pk IN ['WALLET#w2', 'WALLET#w3']
```

Hai ví với số dư ban đầu: mỗi lần chạy trong lab bắt đầu lại từ dữ liệu gốc.

```text
UPDATE w1 (-100000) + UPDATE w2 (+100000)               4 WCU
UPDATE w1 + UPDATE w2 + INSERT TX#0001                  6 WCU
UPDATE w2 (amount 50000 >= 100000 false) + UPDATE w3    TransactionCanceledException
```

## Lỗi hay gặp

Quên điều kiện trên câu trừ tiền:

```text
// WRONG: no condition, the transaction succeeds and w2 ends at -50000
UPDATE "Wallets" SET amount = amount - 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'
```

Thêm điều kiện, và cả khối bị hủy đúng như mong muốn:

```json
// ERROR TransactionCanceledException
{"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE' AND amount >= 100000"}, {"Statement": "UPDATE \"Wallets\" SET amount = amount + 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}]}}
```

Lỗi là kết quả đúng ở đây: ứng dụng báo "không đủ tiền" thay vì gửi lại.

Hai câu trên cùng một item:

```json
// ERROR ValidationException
{"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 100 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}, {"Statement": "UPDATE \"Wallets\" SET owner = 'An B' WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}]}}
```

Gộp hai thay đổi vào một câu `SET amount = …, owner = …`.

## Thực hành

Bước 1 và 2 kiểm cả bảng sau khi ghi lẫn `WriteCapacityUnits` trong `ConsumedCapacity`: đó là số đo thật của bộ máy. Bước 3 cần thấy lỗi; dưới lỗi có dòng ước tính phí AWS vẫn tính, ghi rõ là ước tính.

## Tóm tắt

- `ExecuteTransaction`: tối đa 100 câu PartiQL ghi, tất-cả-hoặc-không.
- Quy tắc nghiệp vụ là điều kiện bạn viết trong `WHERE`; transaction không tự thêm.
- 2 WCU mỗi item tới 1 KB, kể cả khi bị hủy trên AWS thật.
- Mỗi item chỉ một câu trong một transaction.

# EN

## Opening

The wallet app needs a truly safe "send money" button: debit one wallet, credit the other, and never let a balance go negative. The browser cannot run `TransactWriteItems` yet, but it can run a PartiQL transaction. In this lesson you write it yourself.

## Key idea

`ExecuteTransaction` sends up to 100 PartiQL write statements (`INSERT`, `UPDATE`, `DELETE`, `EXISTS`) as one all-or-nothing block. The condition sits right in the `WHERE`: `AND amount >= 100000`. One false condition cancels the whole block with `TransactionCanceledException`. Each statement must name exactly one item by its full primary key; no two statements on the same item.

Price: each item costs 2 WCU per 1 KB (one prepare, one commit). Two wallets are 4 WCU, adding the ledger line makes 6.

Many people think a transaction protects the balance by itself. In fact a transaction only promises all or nothing; the "no negative balance" rule is a condition you must write. Without it, the transaction succeeds and the wallet goes below 0.

The lab runs on dynoxide in the browser; `WriteCapacityUnits` is the engine's real measured number.

## Syntax

```text
{"op": "ExecuteTransaction", "input": {"TransactStatements": [
  {"Statement": "UPDATE \"<t>\" SET a = a - :x WHERE pk = '...' AND sk = '...' AND a >= :x"},
  {"Statement": "UPDATE \"<t>\" SET a = a + :x WHERE pk = '...' AND sk = '...'"},
  {"Statement": "INSERT INTO \"<t>\" VALUE {'pk': '...', 'sk': '...', ...}"}
], ["ClientRequestToken": "<id>"]}}
```

- At most 100 statements; one item each, full primary key.
- The condition is an extra part of the `WHERE`.
- 2 WCU per item up to 1 KB.

## Example

Move 50000 from `w3` to `w2`:

```json
{"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 50000 WHERE pk = 'WALLET#w3' AND sk = 'BALANCE' AND amount >= 50000"}, {"Statement": "UPDATE \"Wallets\" SET amount = amount + 50000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'"}]}}
```

`w3` drops to 1150000, `w2` rises to 100000; 4 WCU.

Checking the balances with one read:

```partiql
SELECT * FROM "Wallets" WHERE pk IN ['WALLET#w2', 'WALLET#w3']
```

Both wallets with their original balances: every run in the lab starts again from the original data.

```text
UPDATE w1 (-100000) + UPDATE w2 (+100000)               4 WCU
UPDATE w1 + UPDATE w2 + INSERT TX#0001                  6 WCU
UPDATE w2 (amount 50000 >= 100000 false) + UPDATE w3    TransactionCanceledException
```

## Common mistakes

Forgetting the condition on the debit:

```text
// WRONG: no condition, the transaction succeeds and w2 ends at -50000
UPDATE "Wallets" SET amount = amount - 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE'
```

Add the condition, and the whole block is cancelled, exactly as wanted:

```json
// ERROR TransactionCanceledException
{"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 100000 WHERE pk = 'WALLET#w2' AND sk = 'BALANCE' AND amount >= 100000"}, {"Statement": "UPDATE \"Wallets\" SET amount = amount + 100000 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}]}}
```

The error is the right result here: the application says "not enough money" instead of resending.

Two statements on the same item:

```json
// ERROR ValidationException
{"op": "ExecuteTransaction", "input": {"TransactStatements": [{"Statement": "UPDATE \"Wallets\" SET amount = amount - 100 WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}, {"Statement": "UPDATE \"Wallets\" SET owner = 'An B' WHERE pk = 'WALLET#w1' AND sk = 'BALANCE'"}]}}
```

Merge both changes into one statement `SET amount = …, owner = …`.

## Practice

Steps 1 and 2 check both the table after the write and `WriteCapacityUnits` in `ConsumedCapacity`: that is the engine's real measured number. Step 3 wants to see the error; under it a line estimates what AWS still charges, clearly marked as an estimate.

## Recap

- `ExecuteTransaction`: up to 100 PartiQL write statements, all or nothing.
- A business rule is a condition you write in the `WHERE`; the transaction adds none by itself.
- 2 WCU per item up to 1 KB, even when cancelled on real AWS.
- One statement per item in a transaction.
