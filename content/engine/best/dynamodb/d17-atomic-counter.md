---
id: e-bp-d17
engine: best
track: dynamodb
level: L2
module: d
title: "Bộ đếm: UpdateItem với ADD, không đọc rồi ghi lại"
title_en: "Counters: UpdateItem with ADD, not read then write"
kind: quiz
minutes: 3
objectives:
  - vi: "Tăng một số bằng một `UpdateItem` với `ADD` (atomic counter), thay vì đọc giá trị rồi ghi giá trị mới."
    en: "Increase a number with one `UpdateItem` using `ADD` (an atomic counter) instead of reading the value and writing a new one."
avoid:
  vi: "Lost update: hai client cùng đọc 4, cùng ghi 5, mất một lượt."
  en: "A lost update: two clients both read 4, both write 5, and one count is lost."
requires: [e-dy-l2-05]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.AtomicCounters
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: diff
  setup: |
    {"tables": [
      {"TableName":"Pages","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Pages": [
        {"pk":{"S":"PAGE#home"},"sk":{"S":"COUNTER"},"views":{"N":"5"}}
      ]
    }}
  bad: |
    {"op": "UpdateItem", "input": {"TableName": "Pages", "Key": {"pk": {"S": "PAGE#home"}, "sk": {"S": "COUNTER"}}, "UpdateExpression": "SET #v = :v", "ExpressionAttributeNames": {"#v": "views"}, "ExpressionAttributeValues": {":v": {"N": "5"}}, "ReturnValues": "ALL_NEW"}}
  good: |
    {"op": "UpdateItem", "input": {"TableName": "Pages", "Key": {"pk": {"S": "PAGE#home"}, "sk": {"S": "COUNTER"}}, "UpdateExpression": "ADD #v :one", "ExpressionAttributeNames": {"#v": "views"}, "ExpressionAttributeValues": {":one": {"N": "1"}}, "ReturnValues": "ALL_NEW"}}
  expect: null
quiz:
  - q:
      vi: "Một `UpdateItem` với `ADD` hết thời gian chờ và SDK tự gửi lại. Có thể xảy ra gì?"
      en: "An `UpdateItem` with `ADD` times out and the SDK sends it again. What can happen?"
    options:
      - { vi: "Không gì, `ADD` là idempotent", en: "Nothing, `ADD` is idempotent" }
      - { vi: "Có thể cộng hai lần, vì atomic counter không idempotent", en: "It may add twice, because an atomic counter is not idempotent" }
      - { vi: "Lần gửi thứ hai luôn lỗi", en: "The second send always fails" }
    answer: 1
    why:
      vi: "Docs nói rõ atomic counter không idempotent: mỗi lần gọi đều cộng. Đếm lượt xem thì chấp nhận được; tiền hay tồn kho thì dùng ghi có điều kiện (`ConditionExpression`)."
      en: "The docs state plainly that an atomic counter is not idempotent: every call adds. That is fine for page views; for money or stock use a conditional write (`ConditionExpression`)."
---

## Ý chính

Tăng hoặc giảm số bằng một `UpdateItem` với `ADD` (hoặc `SET x = x + :n`). Không `GetItem` rồi ghi giá trị mới.

## Vì sao

- Đọc rồi ghi: hai client cùng đọc giá trị cũ, cùng ghi đè, mất một lần cập nhật.
- `UpdateItem` áp mọi lần ghi theo thứ tự nhận, nên `ADD` không mất lượt nào.
- Atomic counter không idempotent: retry có thể đếm hai lần.

## Ví dụ

Bộ đếm đang là 5. Client A đã đọc 4 từ trước, cộng 1 rồi ghi `SET views = 5` (bản Không nên): lượt của client B, người đã đưa nó lên 5, mất. Bản Nên gửi `ADD` 1 và nhận 6.

# EN

## Key idea

Increase or decrease a number with one `UpdateItem` using `ADD` (or `SET x = x + :n`). Do not `GetItem` and then write the new value.

## Why

- Read then write: two clients read the old value and both overwrite it, losing one update.
- `UpdateItem` applies writes in the order received, so `ADD` loses nothing.
- An atomic counter is not idempotent: a retry may count twice.

## Example

The counter is at 5. Client A read 4 earlier, added 1 and writes `SET views = 5` (Avoid): the increment of client B, who had already brought it to 5, is lost. Prefer sends `ADD` 1 and gets 6.
