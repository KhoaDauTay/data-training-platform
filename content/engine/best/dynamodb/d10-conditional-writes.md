---
id: e-bp-d10
engine: best
track: dynamodb
level: L3
module: d
title: "Ghi có điều kiện: không ghi đè âm thầm"
title_en: "Conditional writes: no silent overwrites"
kind: quiz
minutes: 4
objectives:
  - vi: "Tạo mới với `attribute_not_exists(pk)`, sửa với điều kiện số phiên bản (`version = :v`) và tăng nó."
    en: "Create with `attribute_not_exists(pk)`, update with a version condition (`version = :v`) and bump it."
avoid:
  vi: "Một `PutItem` thay cả item đơn và xóa mất tổng tiền, khách và phiên bản mà không báo gì."
  en: "A `PutItem` that replaces the whole order item and erases its total, customer and version without a word."
requires: [e-dy-l2-04]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: diff
  setup: |
    {"tables": [
      {"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Shop": [
        {"pk":{"S":"ORDER#100"},"sk":{"S":"META"},"status":{"S":"PENDING"},"total":{"N":"250000"},"customerId":{"S":"7"},"version":{"N":"1"}}
      ]
    }}
  bad: |
    {"op": "PutItem", "input": {"TableName": "Shop", "Item": {"pk": {"S": "ORDER#100"}, "sk": {"S": "META"}, "status": {"S": "PAID"}}, "ReturnValues": "ALL_OLD"}}
  good: |
    {"op": "UpdateItem", "input": {"TableName": "Shop", "Key": {"pk": {"S": "ORDER#100"}, "sk": {"S": "META"}}, "UpdateExpression": "SET #s = :paid, version = version + :one", "ConditionExpression": "version = :v", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":paid": {"S": "PAID"}, ":v": {"N": "1"}, ":one": {"N": "1"}}, "ReturnValues": "ALL_NEW"}}
  expect: null
quiz:
  - q:
      vi: "Hai máy cùng đọc đơn `ORDER#100` ở `version` 1, rồi cùng gửi `UpdateItem` với `ConditionExpression` `version = :v` (`:v` = 1) và tăng `version`. Kết quả?"
      en: "Two servers both read order `ORDER#100` at `version` 1, then both send an `UpdateItem` with `ConditionExpression` `version = :v` (`:v` = 1) that bumps `version`. What happens?"
    options:
      - { vi: "Cả hai thành công, lần sau đè lần trước", en: "Both succeed, the second overwrites the first" }
      - { vi: "Lần đầu thành công; lần sau bị từ chối với `ConditionalCheckFailedException`", en: "The first succeeds; the second is rejected with `ConditionalCheckFailedException`" }
      - { vi: "Cả hai bị từ chối", en: "Both are rejected" }
    answer: 1
    why:
      vi: "Lần đầu làm `version` thành 2, nên điều kiện của lần sau sai và request bị từ chối, không ghi gì. Máy đó đọc lại rồi thử lại. Không có điều kiện thì lần sau đè mất lần đầu mà không ai biết."
      en: "The first makes `version` 2, so the second condition is false and that request is rejected without writing anything. That server reads again and retries. Without the condition the second write silently wipes out the first."
---

## Ý chính

Tạo mới thì kèm `ConditionExpression: attribute_not_exists(pk)` để không ghi đè item có sẵn. Sửa thì dùng `UpdateItem` kèm điều kiện số phiên bản và tăng nó (optimistic locking).

## Vì sao

- `PutItem` thay **cả** item: thuộc tính không gửi lên là mất.
- Không có điều kiện thì thử lại (retry) hoặc hai request song song đè nhau âm thầm.
- Điều kiện sai thì request bị từ chối rõ ràng, không ghi gì.

## Ví dụ

Đơn `ORDER#100` có `status`, `total`, `customerId`, `version`. Bản Không nên là `PutItem` chỉ có `status`, kèm `ReturnValues: ALL_OLD`: pane hiện item cũ, tức mọi thứ vừa bị thay. Bản Nên là `UpdateItem` có điều kiện, kèm `ALL_NEW`: item mới vẫn đủ thuộc tính.

# EN

## Key idea

Creates carry `ConditionExpression: attribute_not_exists(pk)` so they never overwrite an existing item. Updates use `UpdateItem` with a version condition and bump the version (optimistic locking).

## Why

- `PutItem` replaces the **whole** item: any attribute you do not send is gone.
- Without a condition, a retry or two parallel requests silently overwrite each other.
- A false condition makes the request fail loudly, writing nothing.

## Example

Order `ORDER#100` has `status`, `total`, `customerId`, `version`. Avoid is a `PutItem` with only `status`, plus `ReturnValues: ALL_OLD`: the pane shows the old item, which is everything that was just replaced. Prefer is a conditional `UpdateItem` with `ALL_NEW`: the new item keeps every attribute.
