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
  - { vi: "So giá của `TransactGetItems` với `GetItem` đọc nhất quán mạnh để biết khi nào đáng dùng", en: "Compare the price of `TransactGetItems` with a strong `GetItem` to know when it is worth it" }
requires: [e-dy-l4-11]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html, title_vi: "API transaction" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html, title_vi: "Thao tác đọc và ghi" }
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
    - task: { vi: "Đối soát cuối ngày cần ví `w3` rồi ví `w2` trong cùng một ảnh chụp. Đọc chúng trong một `TransactGetItems`, theo thứ tự đó.", en: "End-of-day reconciliation needs wallet `w3` then wallet `w2` in the same snapshot. Read them in one `TransactGetItems`, in that order." }
      solution: |
        {"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w3"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}}}]}}
      check: doc
      ordered: true
      expect: { Count: 2 }
      hint: { vi: "`Responses` theo đúng thứ tự các `Get`, nên đặt `w3` trước.", en: "`Responses` follow the order of the `Get` actions, so put `w3` first." }
    - task: { vi: "Trang hồ sơ chỉ cần số dư của một ví, `w1`, và phải là số mới nhất. Đọc nó bằng một `GetItem` nhất quán mạnh: rẻ hơn một transaction cho một item.", en: "The profile page needs only one wallet's balance, `w1`, and it must be the latest. Read it with one strongly consistent `GetItem`: cheaper than a transaction for one item." }
      solution: |
        {"op": "GetItem", "input": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}, "ConsistentRead": true}}
      check: doc
      expect: { Count: 1 }
      hint: { vi: "`ConsistentRead: true` cho số mới nhất với 1 RCU; transaction thì 2 RCU.", en: "`ConsistentRead: true` gives the latest value for 1 RCU; a transaction costs 2 RCU." }
quiz:
  - q: { vi: "Ứng dụng đọc ví `w1` bằng `GetItem` rồi ví `w2` bằng `GetItem` thứ hai, cả hai đều nhất quán mạnh. Có thể thấy tổng tiền sai không?", en: "The application reads wallet `w1` with `GetItem`, then wallet `w2` with a second `GetItem`, both strongly consistent. Can it see a wrong total?" }
    options:
      - { vi: "Không, đọc nhất quán mạnh luôn trả số mới nhất", en: "No, a strong read always returns the latest value" }
      - { vi: "Có: một transaction chuyển tiền có thể commit giữa hai lần đọc, nên thấy `w1` đã trừ mà `w2` chưa cộng", en: "Yes: a transfer transaction can commit between the two reads, so you see `w1` debited but `w2` not yet credited" }
      - { vi: "Chỉ khi bảng có GSI", en: "Only when the table has a GSI" }
    answer: 1
    trap: 0
    why: { vi: "Mỗi lần đọc nhất quán mạnh đúng tại thời điểm của nó, nhưng hai `GetItem` chạy ở hai thời điểm khác nhau. Nếu một transaction chuyển tiền commit xen giữa, lần đọc `w1` (trước) chưa thấy gì, còn lần đọc `w2` (sau) đã thấy tiền được cộng, hoặc ngược lại, nên tổng sai. GSI không liên quan, vì cả hai lần đọc đều vào bảng. `TransactGetItems` đọc cả hai ví trong một ảnh chụp: thấy trọn một transaction ghi, hoặc không thấy gì của nó.", en: "Each strongly consistent read is right at its own moment, but the two `GetItem` calls run at two different moments. If a transfer transaction commits in between, the read of `w1` (first) sees nothing yet while the read of `w2` (second) already sees the money added, or the other way round, so the total is wrong. A GSI has nothing to do with it, since both reads hit the table. `TransactGetItems` reads both wallets in one snapshot: it sees a whole write transaction, or nothing of it." }
  - q: { vi: "`TransactGetItems` đọc 3 item, mỗi item 1 KB. Tốn bao nhiêu RCU?", en: "`TransactGetItems` reads 3 items of 1 KB each. How many RCU?" }
    options:
      - { vi: "1,5", en: "1.5" }
      - { vi: "3", en: "3" }
      - { vi: "6", en: "6" }
    answer: 2
    why: { vi: "Mỗi item 1 KB làm tròn lên 4 KB = 1 khối. Đọc trong transaction tốn 2 RCU (read capacity unit) mỗi khối, gấp đôi đọc nhất quán mạnh, vì DynamoDB phải bảo đảm không transaction ghi nào chen vào: 3 × 2 = 6. 3 là giá đọc nhất quán mạnh từng item; 1,5 là giá nhất quán cuối, mà transaction không có mức đó.", en: "Each 1 KB item rounds up to 4 KB = 1 block. A transactional read costs 2 RCU (read capacity unit) per block, twice a strongly consistent read, because DynamoDB must guarantee no write transaction slips in: 3 × 2 = 6. 3 is the strongly consistent price per item; 1.5 is the eventually consistent price, which transactions do not offer." }
---
## Mở bài

Màn hình đối soát đọc số dư hai ví ngay lúc một giao dịch chuyển tiền đang chạy. Nếu đọc hai lần riêng, có thể thấy tiền đã rời ví này mà chưa tới ví kia. Cần một lần đọc thấy cả hai ví ở cùng một thời điểm.

## Ý chính

Hai `GetItem` riêng lẻ có thể rơi vào hai phía của một transaction ghi. `TransactGetItems` gom tối đa 100 `Get` thành một lần đọc tất-cả-hoặc-không, serializable với `TransactWriteItems`: bạn thấy toàn bộ một transaction ghi, hoặc không thấy gì của nó. Kết quả `Responses` theo đúng thứ tự các `Get`; item không tồn tại thì phần tử đó rỗng. Nó bị hủy (`TransactionCanceledException`) nếu va vào một transaction ghi đang chạy trên cùng item.

Giá: đọc trong transaction tốn 2 RCU cho mỗi item tới 4 KB, so với 1 RCU khi đọc nhất quán mạnh và 0,5 RCU khi đọc nhất quán cuối.

Nhiều người nghĩ đọc nhất quán mạnh từng item là đủ để thấy dữ liệu khớp nhau. Thật ra đọc nhất quán mạnh chỉ đúng tại thời điểm của từng lần đọc. Dùng `TransactGetItems` khi cần một ảnh chụp nhất quán của vài item; một item thì `GetItem` đọc nhất quán mạnh rẻ bằng nửa.

Lab chạy bằng dynoxide trong trình duyệt; `ConsumedCapacity` là số engine tính theo đúng quy tắc trên.

## Cú pháp

```text
{"op": "TransactGetItems", "input": {
  "TransactItems": [
    {"Get": {"TableName": "<t>", "Key": {...}, ["ProjectionExpression": "..."]}},
    ...                                   -- up to 100
  ],
  ["ReturnConsumedCapacity": "TOTAL"]}}
```

- `Responses` theo thứ tự `TransactItems`.
- Mỗi item tới 4 KB: 2 RCU.
- Mỗi item chỉ xuất hiện một lần.

## Ví dụ

Đọc một ảnh chụp của ví `w3` và `w1`:

```json
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w3"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

Hai item theo đúng thứ tự: `Chi` 1.200.000 rồi `An` 300.000; `ConsumedCapacity` là 4 RCU.

Cùng hai ví bằng `BatchGetItem`:

```json
{"op": "BatchGetItem", "input": {"RequestItems": {"Wallets": {"Keys": [{"pk": {"S": "WALLET#w3"}, "sk": {"S": "BALANCE"}}, {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}]}}}}
```

Rẻ hơn (đọc nhất quán cuối, 0,5 RCU mỗi item) nhưng không phải ảnh chụp: mỗi item được đọc riêng, thứ tự không cam kết.

```text
GetItem w1 (eventual)        0.5 RCU
GetItem w1 (strong)          1 RCU
TransactGetItems w1 + w2     2 + 2 = 4 RCU
```

## Lỗi hay gặp

Tin rằng thứ tự kết quả không quan trọng:

```json
// WRONG: w2 first, so Responses[0] is w2
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

```json
// FIX: the order of the Gets is the order of the answers
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}}}]}}
```

Code đọc `Responses[0]` như ví `w1` sẽ lấy nhầm số dư của `w2`.

Gõ sai khóa và chờ một lỗi:

```json
// WRONG: keys are case-sensitive, this item does not exist
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "wallet#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

```json
// FIX: the exact key as written
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

Item không tồn tại không gây lỗi: phần tử của nó trong `Responses` chỉ rỗng. Khóa phân biệt chữ hoa chữ thường, nên hãy kiểm tra từng phần tử trước khi dùng.

## Thực hành

Bảng `Wallets` có ba ví. Đọc hai ví trong một ảnh chụp và xem `ConsumedCapacity`, đọc theo thứ tự khác, rồi đọc một ví bằng `GetItem` đọc nhất quán mạnh để so giá.

## Tóm tắt

- `TransactGetItems`: tối đa 100 `Get`, một ảnh chụp tất-cả-hoặc-không.
- `Responses` theo đúng thứ tự các `Get`.
- 2 RCU mỗi item tới 4 KB, gấp đôi đọc nhất quán mạnh.
- Một item thì `GetItem` với `ConsistentRead: true` là đủ và rẻ hơn.

# EN

## Opening

The reconciliation screen reads two wallet balances right while a transfer is running. Read them separately and you may see money gone from one wallet but not yet in the other. You need one read that sees both wallets at the same moment.

## Key idea

Two separate `GetItem` calls can land on both sides of a write transaction. `TransactGetItems` groups up to 100 `Get` actions into one all-or-nothing read, serializable with `TransactWriteItems`: you see all of a write transaction, or none of it. The `Responses` follow the order of the `Get` actions; a missing item leaves that element empty. It is cancelled (`TransactionCanceledException`) if it collides with a write transaction running on the same item.

Price: a transactional read costs 2 RCU per item up to 4 KB, compared with 1 RCU for a strong read and 0.5 RCU for an eventually consistent read.

Many people think reading each item strongly is enough to see data that agrees. In fact a strong read is only right at the moment of that read. Use `TransactGetItems` when you need a consistent snapshot of a few items; for one item, a strong `GetItem` costs half as much.

The lab runs on dynoxide in the browser; `ConsumedCapacity` is the number the engine computes with exactly the rule above.

## Syntax

```text
{"op": "TransactGetItems", "input": {
  "TransactItems": [
    {"Get": {"TableName": "<t>", "Key": {...}, ["ProjectionExpression": "..."]}},
    ...                                   -- up to 100
  ],
  ["ReturnConsumedCapacity": "TOTAL"]}}
```

- `Responses` follow the order of `TransactItems`.
- Each item up to 4 KB: 2 RCU.
- Each item appears only once.

## Example

Reading one snapshot of wallets `w3` and `w1`:

```json
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w3"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

Two items in exactly that order: `Chi` 1,200,000 then `An` 300,000; `ConsumedCapacity` is 4 RCU.

The same two wallets with `BatchGetItem`:

```json
{"op": "BatchGetItem", "input": {"RequestItems": {"Wallets": {"Keys": [{"pk": {"S": "WALLET#w3"}, "sk": {"S": "BALANCE"}}, {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}]}}}}
```

Cheaper (eventually consistent, 0.5 RCU per item) but not a snapshot: each item is read on its own, and the order is not promised.

```text
GetItem w1 (eventual)        0.5 RCU
GetItem w1 (strong)          1 RCU
TransactGetItems w1 + w2     2 + 2 = 4 RCU
```

## Common mistakes

Believing the order of the results does not matter:

```json
// WRONG: w2 first, so Responses[0] is w2
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

```json
// FIX: the order of the Gets is the order of the answers
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}, {"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}}}]}}
```

Code that reads `Responses[0]` as wallet `w1` would take `w2`'s balance by mistake.

Mistyping a key and waiting for an error:

```json
// WRONG: keys are case-sensitive, this item does not exist
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "wallet#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

```json
// FIX: the exact key as written
{"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}}}]}}
```

A missing item raises no error: its element in `Responses` is just empty. Keys are case-sensitive, so check each element before using it.

## Practice

The `Wallets` table holds three wallets. Read two wallets in one snapshot and look at `ConsumedCapacity`, read them in another order, then read one wallet with a strong `GetItem` to compare the price.

## Recap

- `TransactGetItems`: up to 100 `Get` actions, one all-or-nothing snapshot.
- `Responses` follow the order of the `Get` actions.
- 2 RCU per item up to 4 KB, twice a strong read.
- For one item, `GetItem` with `ConsistentRead: true` is enough and cheaper.
