---
id: e-bp-d28
engine: best
track: dynamodb
level: L2
module: d
title: "Khởi tạo trong UpdateExpression bằng if_not_exists"
title_en: "Initialise inside UpdateExpression with if_not_exists"
kind: quiz
minutes: 3
objectives:
  - vi: "Cộng vào số hay nối vào list có thể chưa tồn tại bằng `if_not_exists`, không đọc trước để kiểm."
    en: "Add to a number or append to a list that may not exist yet with `if_not_exists`, without reading first to check."
avoid:
  vi: "Một `UpdateItem` báo lỗi trên item chưa có bộ đếm, hoặc đọc rồi ghi để khởi tạo và mất cập nhật."
  en: "An `UpdateItem` that fails on an item with no counter yet, or a read-then-write to initialise it that loses updates."
requires: [e-dy-l2-03]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: error
  setup: |
    {"tables": [
      {"TableName":"Counters","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Counters": [
        {"pk":{"S":"C"},"sk":{"S":"1"},"label":{"S":"downloads"}}
      ]
    }}
  bad: |
    {"op": "UpdateItem", "input": {"TableName": "Counters", "Key": {"pk": {"S": "C"}, "sk": {"S": "1"}}, "UpdateExpression": "SET n = n + :one", "ExpressionAttributeValues": {":one": {"N": "1"}}, "ReturnValues": "ALL_NEW"}}
  good: |
    {"op": "UpdateItem", "input": {"TableName": "Counters", "Key": {"pk": {"S": "C"}, "sk": {"S": "1"}}, "UpdateExpression": "SET n = if_not_exists(n, :zero) + :one", "ExpressionAttributeValues": {":one": {"N": "1"}, ":zero": {"N": "0"}}, "ReturnValues": "ALL_NEW"}}
  expect: { code: "ValidationException" }
quiz:
  - q:
      vi: "Muốn nối `:t` vào list `tags`, mà item có thể chưa có `tags`. Viết `UpdateExpression` nào?"
      en: "You want to append `:t` to list `tags`, and the item may not have `tags` yet. Which `UpdateExpression`?"
    options:
      - { vi: "`SET tags = list_append(tags, :t)`", en: "`SET tags = list_append(tags, :t)`" }
      - { vi: "`SET tags = list_append(if_not_exists(tags, :empty), :t)`", en: "`SET tags = list_append(if_not_exists(tags, :empty), :t)`" }
      - { vi: "Đọc item trước, rồi `PutItem`", en: "Read the item first, then `PutItem`" }
    answer: 1
    why:
      vi: "`if_not_exists(tags, :empty)` trả list rỗng khi `tags` chưa có, nên một request vừa khởi tạo vừa nối. Bản đầu báo lỗi trên item chưa có `tags`; bản đọc rồi ghi mất cập nhật khi hai client chạy cùng lúc."
      en: "`if_not_exists(tags, :empty)` yields an empty list when `tags` is missing, so one request both initialises and appends. The first option fails on an item without `tags`; read then write loses updates when two clients run at once."
---

## Ý chính

Cộng vào số mà thuộc tính có thể chưa có thì viết `SET n = if_not_exists(n, :zero) + :one`. Nối vào list thì `list_append(if_not_exists(tags, :empty), :t)`. Không đọc trước để kiểm.

## Vì sao

- `SET n = n + :one` trên item chưa có `n` báo lỗi: biểu thức tham chiếu thuộc tính không tồn tại.
- Đọc rồi ghi để khởi tạo thì mất cập nhật khi chạy đồng thời.

## Ví dụ

Item `C` chưa có `n`. Bản Không nên cộng thẳng vào `n`; bản Nên dùng `if_not_exists` và trả `n` = 1.

# EN

## Key idea

To add to a number that may not exist yet, write `SET n = if_not_exists(n, :zero) + :one`. To append to a list, `list_append(if_not_exists(tags, :empty), :t)`. Do not read first to check.

## Why

- `SET n = n + :one` on an item without `n` fails: the expression refers to an attribute that does not exist.
- Reading then writing to initialise loses updates under concurrency.

## Example

Item `C` has no `n` yet. Avoid adds straight to `n`; Prefer uses `if_not_exists` and returns `n` = 1.
