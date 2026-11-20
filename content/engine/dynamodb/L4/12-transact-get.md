---
id: e-dy-l4-12
engine: dynamodb
level: L4
module: transactions
title: "TransactGetItems: đọc nhiều item cùng một thời điểm"
title_en: "TransactGetItems: read several items as one snapshot"
kind: lab
runtime: browser
minutes: 8
objectives:
  - { vi: "Đọc hai item trong một `TransactGetItems` để không thấy trạng thái nửa vời của một transaction ghi", en: "Read two items in one `TransactGetItems` so you never see half of a write transaction" }
  - { vi: "Đối chiếu `ConsumedCapacity`: đọc trong transaction tốn 2 RCU mỗi item tới 4 KB", en: "Check `ConsumedCapacity`: a transactional read costs 2 RCU per item up to 4 KB" }
requires: [e-dy-l4-11]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
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
    - task: { vi: "Bảng `Wallets` có ba ví, mỗi ví một item (`pk` = `WALLET#<id>`, `sk` = `BALANCE`). Đọc ví `w1` và ví `w2` trong một `TransactGetItems`, theo thứ tự đó, và xin trả về `ConsumedCapacity`.", en: "The `Wallets` table holds three wallets, one item each (`pk` = `WALLET#<id>`, `sk` = `BALANCE`). Read wallet `w1` and wallet `w2` in one `TransactGetItems`, in that order, and ask for `ConsumedCapacity`." }
      solution: |
        {"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}}}], "ReturnConsumedCapacity": "TOTAL"}}
      check: doc
      ordered: true
      expect: { Count: 2 }
      hint: { vi: "Mỗi phần tử của `TransactItems` là một `Get` có `TableName` và `Key`.", en: "Each element of `TransactItems` is a `Get` with a `TableName` and a `Key`." }
---

## Ý chính

Hai `GetItem` riêng lẻ có thể rơi vào hai phía của một transaction ghi: bạn thấy ví `w1` đã bị trừ nhưng ví `w2` chưa được cộng. `TransactGetItems` gom tối đa **100** `Get` thành một lần đọc tất-cả-hoặc-không, serializable với `TransactWriteItems`: bạn thấy toàn bộ một transaction ghi, hoặc không thấy gì của nó.

- Kết quả `Responses` theo đúng thứ tự các `Get`. Item không tồn tại thì phần tử đó rỗng.
- Giá: đọc trong transaction tốn **2 RCU** cho mỗi item tới 4 KB (đọc mạnh 1, đọc cuối cùng 0,5).
- Bị hủy (`TransactionCanceledException`) nếu va vào một transaction ghi đang chạy trên cùng item.

Dùng nó khi cần một ảnh chụp nhất quán của vài item, không dùng thay cho mọi lần đọc.

## Ví dụ

```text
GetItem w1 (eventual)        0.5 RCU
GetItem w1 (strong)          1 RCU
TransactGetItems w1 + w2     2 + 2 = 4 RCU
```

## Thực hành

Bộ máy trong trình duyệt có `TransactGetItems` và trả `ConsumedCapacity` theo đúng quy tắc 2 RCU mỗi item. Viết request rồi đọc con số đó trong kết quả.

# EN

## Key idea

Two separate `GetItem` calls can land on both sides of a write transaction: you see wallet `w1` already debited but wallet `w2` not yet credited. `TransactGetItems` groups up to **100** `Get` actions into one all-or-nothing read, serializable with `TransactWriteItems`: you see all of a write transaction, or none of it.

- The `Responses` follow the order of the `Get` actions. A missing item leaves that element empty.
- Price: a transactional read costs **2 RCU** per item up to 4 KB (strong read 1, eventual read 0.5).
- It is cancelled (`TransactionCanceledException`) if it collides with a write transaction running on the same item.

Use it when you need a consistent snapshot of a few items, not as a replacement for every read.

## Example

```text
GetItem w1 (eventual)        0.5 RCU
GetItem w1 (strong)          1 RCU
TransactGetItems w1 + w2     2 + 2 = 4 RCU
```

## Practice

The in-browser engine has `TransactGetItems` and returns `ConsumedCapacity` following the 2 RCU per item rule. Write the request, then read that number in the result.
