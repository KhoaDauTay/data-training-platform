---
id: e-dy-l4-11
engine: dynamodb
level: L4
module: transactions
title: "TransactWriteItems: tất cả hoặc không gì cả"
title_en: "TransactWriteItems: all or nothing"
kind: concept
runtime: docs
minutes: 8
objectives:
  - { vi: "Nêu giới hạn của một giao dịch: 100 hành động, 4 MB, không hai hành động trên một item, một account và một Region", en: "State a transaction's limits: 100 actions, 4 MB, no two actions on one item, one account and one Region" }
  - { vi: "Giải thích vì sao mỗi item trong giao dịch tốn gấp đôi capacity, kể cả khi giao dịch bị hủy", en: "Explain why each item in a transaction costs double capacity, even when the transaction is cancelled" }
  - { vi: "Dùng client token để gửi lại một giao dịch an toàn trong 10 phút", en: "Use a client token to resend a transaction safely within 10 minutes" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
quiz:
  - q: { vi: "Một giao dịch ghi 3 item, mỗi item 500 byte, chạy 1 lần mỗi giây. Cần bao nhiêu WCU?", en: "A transaction writes 3 items of 500 bytes each, once per second. How many WCU does it need?" }
    options:
      - { vi: "3 WCU", en: "3 WCU" }
      - { vi: "6 WCU: mỗi item một lần chuẩn bị và một lần xác nhận", en: "6 WCU: one prepare and one commit per item" }
      - { vi: "1,5 WCU", en: "1.5 WCU" }
    answer: 1
    why: { vi: "DynamoDB ghi mỗi item hai lần (prepare + commit). 500 byte làm tròn lên 1 KB = 1 WCU, nhân 2, nhân 3 item = 6 WCU. Đây chính là ví dụ trong tài liệu AWS.", en: "DynamoDB writes each item twice (prepare + commit). 500 bytes round up to 1 KB = 1 WCU, times 2, times 3 items = 6 WCU. This is the example in the AWS docs." }
  - q: { vi: "Giao dịch bị hủy vì một `ConditionCheck` sai. Capacity thì sao?", en: "A transaction is cancelled because one `ConditionCheck` is false. What about capacity?" }
    options:
      - { vi: "Không tốn gì, vì không có gì được ghi", en: "Nothing is consumed, since nothing was written" }
      - { vi: "Vẫn tốn capacity cho các item nó đã thử, như giao dịch thành công", en: "It still consumes capacity for the items it attempted, like a successful one" }
      - { vi: "Chỉ tốn cho item có điều kiện sai", en: "Only the item with the false condition is charged" }
    answer: 1
    why: { vi: "Tài liệu AWS: capacity của giao dịch bị hủy vẫn bị tiêu như giao dịch thành công. Gom quá nhiều hành động vào một giao dịch làm tăng cả xác suất hủy lẫn tiền mất khi hủy.", en: "The AWS docs: a cancelled transaction still consumes capacity like a successful one. Packing too many actions into one transaction raises both the chance of cancellation and the cost of it." }
  - q: { vi: "Mạng bị timeout, bạn gửi lại cùng `TransactWriteItems` với cùng client token sau 3 phút. Chuyện gì xảy ra nếu lần đầu đã thành công?", en: "The network timed out and you resend the same `TransactWriteItems` with the same client token after 3 minutes. What happens if the first call succeeded?" }
    options:
      - { vi: "Ghi lần nữa, số dư bị trừ hai lần", en: "It writes again and the balance is charged twice" }
      - { vi: "Trả về thành công mà không đổi gì", en: "It returns success without changing anything" }
      - { vi: "Luôn báo `IdempotentParameterMismatch`", en: "It always returns `IdempotentParameterMismatch`" }
    answer: 1
    why: { vi: "Token có hiệu lực 10 phút sau khi request dùng nó kết thúc. Trong 10 phút, gửi lại đúng request thì thành công mà không ghi thêm; đổi tham số khác thì mới báo `IdempotentParameterMismatch`.", en: "A token is valid for 10 minutes after the request that used it finishes. Within those 10 minutes the same request succeeds without writing again; changing another parameter is what returns `IdempotentParameterMismatch`." }
---

## Ý chính

`TransactWriteItems` gom tối đa **100 hành động** (`Put`, `Update`, `Delete`, `ConditionCheck`) thành một thao tác tất-cả-hoặc-không. Khác `BatchWriteItem`, nơi một phần có thể thành công còn phần khác thì không.

- Tối đa 100 item khác nhau, tổng **4 MB**, trong một account và **một Region**. Không có giao dịch xuyên Region kể cả với global table.
- **Không hai hành động trên cùng một item**: ví dụ không thể vừa `ConditionCheck` vừa `Update` một item.
- Không dùng được trên index.
- **Giá gấp đôi**: DynamoDB đọc/ghi mỗi item hai lần (prepare + commit). Capacity vẫn bị tiêu khi giao dịch bị hủy.
- **Idempotent**: kèm `ClientRequestToken` thì gửi lại trong 10 phút sẽ không ghi lần hai.
- **Cô lập**: serializable giữa giao dịch và `PutItem`/`UpdateItem`/`DeleteItem`/`GetItem`; read-committed giữa giao dịch và `Query`/`Scan`/`BatchGetItem` (tính cả thao tác).
- Hủy vì điều kiện sai, xung đột với giao dịch khác hoặc thiếu capacity sẽ báo `TransactionCanceledException`, kèm danh sách lý do theo đúng thứ tự hành động.

Bộ máy DynamoDB trong trình duyệt (dynoxide 1.5.0) trả `UnsupportedOperation` cho `TransactWriteItems`, nên API này **chưa chạy được trong trình duyệt**. Hai bài sau dùng phần chạy được: `TransactGetItems` và giao dịch PartiQL `ExecuteTransaction`.

## Ví dụ

Chuyển 100.000 đ từ ví `w1` sang ví `w2`, chỉ khi `w1` đủ tiền:

```json
{"TransactItems": [
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount - :x", "ConditionExpression": "amount >= :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}},
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount + :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}}
], "ClientRequestToken": "transfer-2026-11-20-0001"}
```

Hai item × 1 WCU × 2 = 4 WCU cho mỗi lần chuyển, dù thành công hay bị hủy.

# EN

## Key idea

`TransactWriteItems` groups up to **100 actions** (`Put`, `Update`, `Delete`, `ConditionCheck`) into one all-or-nothing operation. Unlike `BatchWriteItem`, where some writes may succeed and others not.

- At most 100 distinct items, **4 MB** in total, in one account and **one Region**. There are no cross-Region transactions, even with a global table.
- **No two actions on the same item**: for example you cannot both `ConditionCheck` and `Update` one item.
- Not usable on indexes.
- **Double price**: DynamoDB reads/writes each item twice (prepare + commit). The capacity is consumed even when the transaction is cancelled.
- **Idempotent**: with a `ClientRequestToken`, a resend within 10 minutes does not write twice.
- **Isolation**: serializable between a transaction and `PutItem`/`UpdateItem`/`DeleteItem`/`GetItem`; read-committed between a transaction and `Query`/`Scan`/`BatchGetItem` (as a whole operation).
- A cancellation because of a false condition, a conflict with another transaction or missing capacity returns `TransactionCanceledException`, with a list of reasons in the order of the actions.

The in-browser DynamoDB engine (dynoxide 1.5.0) returns `UnsupportedOperation` for `TransactWriteItems`, so this API does not run in the browser yet. The next two lessons use what does run: `TransactGetItems` and the PartiQL transaction `ExecuteTransaction`.

## Example

Move 100,000 VND from wallet `w1` to wallet `w2`, only if `w1` has enough:

```json
{"TransactItems": [
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w1"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount - :x", "ConditionExpression": "amount >= :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}},
  {"Update": {"TableName": "Wallets", "Key": {"pk": {"S": "WALLET#w2"}, "sk": {"S": "BALANCE"}}, "UpdateExpression": "SET amount = amount + :x", "ExpressionAttributeValues": {":x": {"N": "100000"}}}}
], "ClientRequestToken": "transfer-2026-11-20-0001"}
```

Two items × 1 WCU × 2 = 4 WCU per transfer, whether it succeeds or is cancelled.
