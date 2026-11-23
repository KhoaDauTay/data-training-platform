---
id: e-dy-l4-11
engine: dynamodb
level: L4
module: transactions
title: "TransactWriteItems: tất cả hoặc không gì cả"
title_en: "TransactWriteItems: all or nothing"
kind: concept
runtime: docs
minutes: 10
objectives:
  - { vi: "Nêu giới hạn của một transaction: 100 hành động, 4 MB, không hai hành động trên một item, một account và một Region", en: "State a transaction's limits: 100 actions, 4 MB, no two actions on one item, one account and one Region" }
  - { vi: "Giải thích vì sao mỗi item trong transaction tốn gấp đôi capacity, kể cả khi transaction bị hủy", en: "Explain why each item in a transaction costs double capacity, even when the transaction is cancelled" }
  - { vi: "Dùng client token để gửi lại một transaction an toàn trong 10 phút", en: "Use a client token to resend a transaction safely within 10 minutes" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
quiz:
  - q: { vi: "Một transaction ghi 3 item, mỗi item 500 byte, chạy 1 lần mỗi giây. Cần bao nhiêu WCU?", en: "A transaction writes 3 items of 500 bytes each, once per second. How many WCU does it need?" }
    options:
      - { vi: "3 WCU", en: "3 WCU" }
      - { vi: "6 WCU: mỗi item một lần chuẩn bị và một lần xác nhận", en: "6 WCU: one prepare and one commit per item" }
      - { vi: "1,5 WCU", en: "1.5 WCU" }
    answer: 1
    why: { vi: "DynamoDB ghi mỗi item hai lần (prepare + commit). 500 byte làm tròn lên 1 KB = 1 WCU, nhân 2, nhân 3 item = 6 WCU. Đây chính là ví dụ trong docs AWS.", en: "DynamoDB writes each item twice (prepare + commit). 500 bytes round up to 1 KB = 1 WCU, times 2, times 3 items = 6 WCU. This is the example in the AWS docs." }
  - q: { vi: "Transaction bị hủy vì một `ConditionCheck` sai. Capacity thì sao?", en: "A transaction is cancelled because one `ConditionCheck` is false. What about capacity?" }
    options:
      - { vi: "Không tốn gì, vì không có gì được ghi", en: "Nothing is consumed, since nothing was written" }
      - { vi: "Vẫn tốn capacity cho các item nó đã thử, như transaction thành công", en: "It still consumes capacity for the items it attempted, like a successful one" }
      - { vi: "Chỉ tốn cho item có điều kiện sai", en: "Only the item with the false condition is charged" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì không có gì được ghi. Nhưng docs AWS ghi: capacity của transaction bị hủy vẫn bị tiêu như transaction thành công. Gom quá nhiều hành động vào một transaction làm tăng cả xác suất hủy lẫn tiền mất khi hủy.", en: "It sounds right since nothing was written. But the AWS docs say a cancelled transaction still consumes capacity like a successful one. Packing too many actions into one transaction raises both the chance of cancellation and the cost of it." }
  - q: { vi: "Mạng bị timeout, bạn gửi lại cùng `TransactWriteItems` với cùng client token sau 3 phút. Chuyện gì xảy ra nếu lần đầu đã thành công?", en: "The network timed out and you resend the same `TransactWriteItems` with the same client token after 3 minutes. What happens if the first call succeeded?" }
    options:
      - { vi: "Ghi lần nữa, số dư bị trừ hai lần", en: "It writes again and the balance is charged twice" }
      - { vi: "Trả về thành công mà không đổi gì", en: "It returns success without changing anything" }
      - { vi: "Luôn báo `IdempotentParameterMismatch`", en: "It always returns `IdempotentParameterMismatch`" }
    answer: 1
    why: { vi: "Token có hiệu lực 10 phút sau khi request dùng nó kết thúc. Trong 10 phút, gửi lại đúng request thì thành công mà không ghi thêm; đổi tham số khác thì mới báo `IdempotentParameterMismatch`.", en: "A token is valid for 10 minutes after the request that used it finishes. Within those 10 minutes the same request succeeds without writing again; changing another parameter is what returns `IdempotentParameterMismatch`." }
---
## Mở bài

Chuyển tiền giữa hai ví là hai lần ghi: trừ ví này, cộng ví kia. Nếu lần thứ nhất thành công mà lần thứ hai lỗi, tiền biến mất. DynamoDB không có `BEGIN … COMMIT`; vậy làm sao để hai lần ghi cùng thành công hoặc cùng không?

## Ý chính

`TransactWriteItems` gom tối đa 100 hành động (`Put`, `Update`, `Delete`, `ConditionCheck`) thành một thao tác tất-cả-hoặc-không, khác `BatchWriteItem`, nơi một phần có thể thành công còn phần khác thì không. Giới hạn: tối đa 100 item khác nhau, tổng 4 MB, trong một account và một Region (không có transaction xuyên Region kể cả với global table); không hai hành động trên cùng một item; không dùng trên index.

Giá gấp đôi: DynamoDB đọc/ghi mỗi item hai lần (prepare + commit). Kèm `ClientRequestToken` thì gửi lại trong 10 phút không ghi lần hai. Cô lập là serializable giữa transaction và `PutItem`/`UpdateItem`/`DeleteItem`/`GetItem`; read-committed với `Query`/`Scan`/`BatchGetItem` tính cả thao tác. Hủy vì điều kiện sai, xung đột với transaction khác hoặc thiếu capacity sẽ báo `TransactionCanceledException`, kèm lý do theo đúng thứ tự hành động.

Nhiều người nghĩ transaction bị hủy thì không tốn gì. Thật ra capacity vẫn bị tiêu như khi thành công, nên đừng gom quá nhiều hành động vào một transaction.

Bộ máy trong trình duyệt (dynoxide 1.5.0) trả `UnsupportedOperation` cho `TransactWriteItems`, nên API này chưa chạy được ở đây. Hai bài sau dùng phần chạy được: `TransactGetItems` và transaction PartiQL `ExecuteTransaction`.

## Cú pháp

```text
{"op": "TransactWriteItems", "input": {
  "TransactItems": [
    {"Put":            {"TableName": ..., "Item": ..., ["ConditionExpression": ...]}},
    {"Update":         {"TableName": ..., "Key": ..., "UpdateExpression": ..., ["ConditionExpression": ...]}},
    {"Delete":         {"TableName": ..., "Key": ..., ["ConditionExpression": ...]}},
    {"ConditionCheck": {"TableName": ..., "Key": ..., "ConditionExpression": ...}}
  ],
  ["ClientRequestToken": "<id, valid 10 min>"]}}
```

- Tối đa 100 hành động, 4 MB, một Region.
- Mỗi item chỉ xuất hiện một lần trong `TransactItems`.
- WCU = cỡ item làm tròn × 2, kể cả khi bị hủy.

## Ví dụ

Chuyển 100.000 đ từ ví `w1` sang ví `w2`, chỉ khi `w1` đủ tiền:

```text
{"TransactItems": [
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount - :x", "ConditionExpression": "amount >= :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}},
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount + :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}}
], "ClientRequestToken": "transfer-2026-11-20-0001"}
```

Hai item × 1 WCU × 2 = 4 WCU cho mỗi lần chuyển, dù thành công hay bị hủy.

Khi `w1` không đủ tiền, lý do hủy đi theo thứ tự hành động:

```text
TransactionCanceledException
CancellationReasons: [ {Code: ConditionalCheckFailed}, {Code: None} ]
```

Hành động thứ nhất có điều kiện sai; hành động thứ hai không lỗi nhưng cũng không được ghi.

## Lỗi hay gặp

Chuyển tiền bằng `BatchWriteItem`:

```text
// WRONG: BatchWriteItem with two Puts, one may fail while the other succeeds
{"RequestItems": {"Wallets": [{"PutRequest": ...}, {"PutRequest": ...}]}}
```

```text
// FIX: TransactWriteItems (or ExecuteTransaction): both or neither
```

Batch chỉ gộp request cho đỡ tốn lượt gọi; nó không hứa tất-cả-hoặc-không, và không có điều kiện.

Hai hành động trên cùng một item:

```text
// ERROR ValidationException: ConditionCheck and Update on WALLET#w1 in one transaction
```

Gộp điều kiện vào `ConditionExpression` của chính hành động `Update`.

## Tóm tắt

- `TransactWriteItems`: tối đa 100 hành động, 4 MB, một Region, tất-cả-hoặc-không.
- Mỗi item tốn gấp đôi capacity, kể cả khi transaction bị hủy.
- `ClientRequestToken` cho phép gửi lại an toàn trong 10 phút.
- Không hai hành động trên một item; `BatchWriteItem` không phải transaction.

# EN

## Opening

Moving money between two wallets is two writes: take from one, add to the other. If the first succeeds and the second fails, money disappears. DynamoDB has no `BEGIN … COMMIT`; so how do two writes succeed together or not at all?

## Key idea

`TransactWriteItems` groups up to 100 actions (`Put`, `Update`, `Delete`, `ConditionCheck`) into one all-or-nothing operation, unlike `BatchWriteItem`, where some writes may succeed and others not. Limits: at most 100 distinct items, 4 MB in total, in one account and one Region (no cross-Region transactions, even with a global table); no two actions on the same item; not usable on indexes.

Double price: DynamoDB reads/writes each item twice (prepare + commit). With a `ClientRequestToken`, a resend within 10 minutes does not write twice. Isolation is serializable between a transaction and `PutItem`/`UpdateItem`/`DeleteItem`/`GetItem`; read-committed with `Query`/`Scan`/`BatchGetItem` as a whole operation. A cancellation because of a false condition, a conflict with another transaction or missing capacity returns `TransactionCanceledException`, with reasons in the order of the actions.

Many people think a cancelled transaction costs nothing. In fact the capacity is consumed as if it had succeeded, so do not pack too many actions into one transaction.

The in-browser engine (dynoxide 1.5.0) returns `UnsupportedOperation` for `TransactWriteItems`, so this API does not run here yet. The next two lessons use what does run: `TransactGetItems` and the PartiQL transaction `ExecuteTransaction`.

## Syntax

```text
{"op": "TransactWriteItems", "input": {
  "TransactItems": [
    {"Put":            {"TableName": ..., "Item": ..., ["ConditionExpression": ...]}},
    {"Update":         {"TableName": ..., "Key": ..., "UpdateExpression": ..., ["ConditionExpression": ...]}},
    {"Delete":         {"TableName": ..., "Key": ..., ["ConditionExpression": ...]}},
    {"ConditionCheck": {"TableName": ..., "Key": ..., "ConditionExpression": ...}}
  ],
  ["ClientRequestToken": "<id, valid 10 min>"]}}
```

- At most 100 actions, 4 MB, one Region.
- Each item appears only once in `TransactItems`.
- WCU = rounded item size × 2, even when cancelled.

## Example

Move 100,000 VND from wallet `w1` to wallet `w2`, only if `w1` has enough:

```text
{"TransactItems": [
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount - :x", "ConditionExpression": "amount >= :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}},
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount + :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}}
], "ClientRequestToken": "transfer-2026-11-20-0001"}
```

Two items × 1 WCU × 2 = 4 WCU per transfer, whether it succeeds or is cancelled.

When `w1` does not have enough, the cancellation reasons follow the order of the actions:

```text
TransactionCanceledException
CancellationReasons: [ {Code: ConditionalCheckFailed}, {Code: None} ]
```

The first action's condition is false; the second has no error but is not written either.

## Common mistakes

Moving money with `BatchWriteItem`:

```text
// WRONG: BatchWriteItem with two Puts, one may fail while the other succeeds
{"RequestItems": {"Wallets": [{"PutRequest": ...}, {"PutRequest": ...}]}}
```

```text
// FIX: TransactWriteItems (or ExecuteTransaction): both or neither
```

A batch only bundles requests to save round trips; it promises no all-or-nothing, and has no conditions.

Two actions on the same item:

```text
// ERROR ValidationException: ConditionCheck and Update on WALLET#w1 in one transaction
```

Put the condition in the `Update` action's own `ConditionExpression`.

## Recap

- `TransactWriteItems`: at most 100 actions, 4 MB, one Region, all or nothing.
- Each item costs double capacity, even when the transaction is cancelled.
- `ClientRequestToken` allows a safe resend within 10 minutes.
- No two actions on one item; `BatchWriteItem` is not a transaction.
