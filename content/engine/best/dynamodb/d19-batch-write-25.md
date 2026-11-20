---
id: e-bp-d19
engine: best
track: dynamodb
level: L2
module: d
title: "BatchWriteItem: lô 25, gửi lại UnprocessedItems"
title_en: "BatchWriteItem: batches of 25, resend UnprocessedItems"
kind: quiz
minutes: 3
objectives:
  - vi: "Chia lô tối đa 25 yêu cầu put/delete, và gửi lại `UnprocessedItems` với backoff tới khi rỗng."
    en: "Split into batches of at most 25 put/delete requests, and resend `UnprocessedItems` with backoff until it is empty."
avoid:
  vi: "Mất dữ liệu âm thầm vì bỏ qua `UnprocessedItems` của một lô đã \"thành công\"."
  en: "Silently losing data by ignoring the `UnprocessedItems` of a batch that \"succeeded\"."
requires: [e-dy-l2-06]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: error
  setup: |
    {"tables": [
      {"TableName":"Imports","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Imports": [
        {"pk":{"S":"IMPORT#0"},"sk":{"S":"ROW#00"}}
      ]
    }}
  bad: |
    {"op": "BatchWriteItem", "input": {"RequestItems": {"Imports": [{"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#00"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#01"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#02"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#03"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#04"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#05"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#06"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#07"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#08"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#09"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#10"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#11"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#12"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#13"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#14"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#15"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#16"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#17"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#18"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#19"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#20"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#21"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#22"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#23"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#24"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#25"}}}}]}}}
  good: |
    {"op": "BatchWriteItem", "input": {"RequestItems": {"Imports": [{"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#00"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#01"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#02"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#03"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#04"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#05"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#06"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#07"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#08"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#09"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#10"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#11"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#12"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#13"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#14"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#15"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#16"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#17"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#18"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#19"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#20"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#21"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#22"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#23"}}}}, {"PutRequest": {"Item": {"pk": {"S": "IMPORT#1"}, "sk": {"S": "ROW#24"}}}}]}}}
  expect: { code: "ValidationException" }
quiz:
  - q:
      vi: "`BatchWriteItem` trả về thành công, nhưng `UnprocessedItems` còn 3 item. Nên làm gì?"
      en: "`BatchWriteItem` returns success, but `UnprocessedItems` holds 3 items. What should you do?"
    options:
      - { vi: "Không gì, request đã thành công", en: "Nothing, the request succeeded" }
      - { vi: "Gửi lại đúng 3 item đó, chờ tăng dần giữa các lần", en: "Resend exactly those 3 items, waiting longer between tries" }
      - { vi: "Gửi lại cả lô", en: "Resend the whole batch" }
    answer: 1
    why:
      vi: "Batch có thể chỉ ghi một phần mà không báo lỗi; phần chưa ghi nằm trong `UnprocessedItems`. Docs khuyên gửi lại phần đó với exponential backoff, vì gửi lại ngay vẫn dễ bị throttle."
      en: "A batch can write only part of its items without an error; the rest comes back in `UnprocessedItems`. The docs recommend resending those with exponential backoff, because an immediate resend is likely to be throttled again."
---

## Ý chính

Chia lô tối đa 25 yêu cầu put/delete. Sau mỗi lần gọi, gửi lại `UnprocessedItems` với exponential backoff tới khi rỗng. Batch không có điều kiện và không nguyên tử: cần "tất cả hoặc không" thì dùng transaction.

## Vì sao

- Quá 25 yêu cầu thì cả lô bị từ chối với `ValidationException`.
- Khi bị throttle, DynamoDB trả phần chưa ghi trong `UnprocessedItems` thay vì báo lỗi.

## Ví dụ

Bản Không nên gửi 26 yêu cầu trong một lô; bản Nên gửi 25. Emulator không throttle, nên `UnprocessedItems` ở đây luôn rỗng.

# EN

## Key idea

Split into batches of at most 25 put/delete requests. After each call, resend `UnprocessedItems` with exponential backoff until it is empty. A batch has no conditions and is not atomic: for "all or nothing" use a transaction.

## Why

- Over 25 requests and the whole batch is rejected with `ValidationException`.
- When throttled, DynamoDB returns what it could not write in `UnprocessedItems` instead of an error.

## Example

Avoid sends 26 requests in one batch; Prefer sends 25. The emulator never throttles, so `UnprocessedItems` is always empty here.
