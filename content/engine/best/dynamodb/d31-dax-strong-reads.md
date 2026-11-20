---
id: e-bp-d31
engine: best
track: dynamodb
level: L5
module: d
title: "DAX không giúp đọc strongly consistent"
title_en: "DAX does not help strongly consistent reads"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng DAX cho đọc lặp lại eventually consistent, và biết đọc `ConsistentRead: true` đi thẳng tới DynamoDB."
    en: "Use DAX for repeated eventually consistent reads, and know that `ConsistentRead: true` reads go straight to DynamoDB."
avoid:
  vi: "Trả tiền một cluster DAX cho tải toàn đọc strongly consistent mà RCU không giảm."
  en: "Paying for a DAX cluster on an all-strong-read workload while the RCU stays the same."
requires: [e-dy-l5-06]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "GetItem", "via": "DAX", "input": {"TableName": "Catalog", "Key": {"pk": {"S": "P#1"}}, "ConsistentRead": true}}
  good: |
    {"op": "GetItem", "via": "DAX", "input": {"TableName": "Catalog", "Key": {"pk": {"S": "P#1"}}}}
  expect: null
quiz:
  - q:
      vi: "Một `GetItem` với `ConsistentRead: true` gửi qua DAX. DAX làm gì?"
      en: "A `GetItem` with `ConsistentRead: true` is sent through DAX. What does DAX do?"
    options:
      - { vi: "Trả từ cache nếu có", en: "Answers from its cache if it can" }
      - { vi: "Chuyển tới DynamoDB và không cache kết quả", en: "Passes it to DynamoDB and does not cache the result" }
      - { vi: "Từ chối request", en: "Rejects the request" }
    answer: 1
    why:
      vi: "Docs: DAX chuyển đọc strongly consistent sang DynamoDB, trả kết quả cho client nhưng không cache. Lần đọc đó tốn RCU như đọc thẳng bảng."
      en: "The docs: DAX passes strongly consistent reads to DynamoDB, returns the result to the client, but does not cache it. That read costs the same RCU as reading the table directly."
---

## Ý chính

Dùng DAX cho đọc lặp lại, eventually consistent (danh mục, hồ sơ). Đường đọc cần `ConsistentRead: true` thì đi thẳng tới bảng: DAX không giúp, cũng không giảm RCU.

## Vì sao

- DAX chuyển đọc strongly consistent sang DynamoDB và không cache kết quả.
- Trả tiền cluster DAX cho tải toàn đọc mạnh là trả cho một lớp chỉ chuyển tiếp.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide không có DAX. Khóa `via` chỉ để đánh dấu request đi qua client DAX, không phải tham số API.

# EN

## Key idea

Use DAX for repeated, eventually consistent reads (catalogues, profiles). Read paths that need `ConsistentRead: true` go straight to the table: DAX does not help and does not cut RCU.

## Why

- DAX passes strongly consistent reads to DynamoDB and does not cache the result.
- Paying for a DAX cluster under an all-strong-read workload pays for a pass-through layer.

## Example

Syntax only: dynoxide has no DAX. The `via` key only marks a request sent through the DAX client; it is not an API parameter.
