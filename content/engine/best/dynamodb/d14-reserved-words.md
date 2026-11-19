---
id: e-bp-d14
engine: best
track: dynamodb
level: L1
module: d
title: "Từ dành riêng phải qua ExpressionAttributeNames"
title_en: "Reserved words need name placeholders"
kind: quiz
minutes: 2
objectives:
  - vi: "Viết tên thuộc tính trùng từ dành riêng (`status`, `total`, `name`…) qua placeholder `#x`."
    en: "Write attribute names that are reserved words (`status`, `total`, `name`…) through a `#x` placeholder."
avoid:
  vi: "Request bị từ chối lúc chạy chỉ vì một thuộc tính tên `status`."
  en: "A request rejected at run time just because an attribute is named `status`."
requires: [e-dy-l2-01]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: error
  setup: |
    {"tables": [
          {"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"},{"AttributeName":"status","AttributeType":"S"}],"GlobalSecondaryIndexes":[{"IndexName":"ByStatus","KeySchema":[{"AttributeName":"status","KeyType":"HASH"}],"Projection":{"ProjectionType":"KEYS_ONLY"}}]}
         ],
         "items": {
          "Shop": [
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#100"},"status":{"S":"PENDING"},"total":{"N":"50000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#101"},"status":{"S":"CANCELLED"},"total":{"N":"87000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#102"},"status":{"S":"PAID"},"total":{"N":"124000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#103"},"status":{"S":"PAID"},"total":{"N":"161000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#104"},"status":{"S":"PAID"},"total":{"N":"198000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#105"},"status":{"S":"PAID"},"total":{"N":"235000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#106"},"status":{"S":"PAID"},"total":{"N":"272000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#107"},"status":{"S":"PAID"},"total":{"N":"309000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#108"},"status":{"S":"PENDING"},"total":{"N":"346000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#109"},"status":{"S":"CANCELLED"},"total":{"N":"383000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#110"},"status":{"S":"PAID"},"total":{"N":"420000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#111"},"status":{"S":"PAID"},"total":{"N":"457000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#112"},"status":{"S":"PAID"},"total":{"N":"494000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#113"},"status":{"S":"PAID"},"total":{"N":"81000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#114"},"status":{"S":"PAID"},"total":{"N":"118000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#115"},"status":{"S":"PAID"},"total":{"N":"155000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#116"},"status":{"S":"PENDING"},"total":{"N":"192000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#117"},"status":{"S":"CANCELLED"},"total":{"N":"229000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#118"},"status":{"S":"PAID"},"total":{"N":"266000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#119"},"status":{"S":"PAID"},"total":{"N":"303000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#120"},"status":{"S":"PAID"},"total":{"N":"340000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#121"},"status":{"S":"PAID"},"total":{"N":"377000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#122"},"status":{"S":"PAID"},"total":{"N":"414000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#123"},"status":{"S":"PAID"},"total":{"N":"451000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#124"},"status":{"S":"PENDING"},"total":{"N":"488000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#125"},"status":{"S":"CANCELLED"},"total":{"N":"75000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#126"},"status":{"S":"PAID"},"total":{"N":"112000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#127"},"status":{"S":"PAID"},"total":{"N":"149000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#128"},"status":{"S":"PAID"},"total":{"N":"186000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#129"},"status":{"S":"PAID"},"total":{"N":"223000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#130"},"status":{"S":"PAID"},"total":{"N":"260000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#131"},"status":{"S":"PAID"},"total":{"N":"297000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#132"},"status":{"S":"PENDING"},"total":{"N":"334000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#133"},"status":{"S":"CANCELLED"},"total":{"N":"371000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#134"},"status":{"S":"PAID"},"total":{"N":"408000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#135"},"status":{"S":"PAID"},"total":{"N":"445000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#136"},"status":{"S":"PAID"},"total":{"N":"482000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#137"},"status":{"S":"PAID"},"total":{"N":"69000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#138"},"status":{"S":"PAID"},"total":{"N":"106000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#139"},"status":{"S":"PAID"},"total":{"N":"143000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#140"},"status":{"S":"PENDING"},"total":{"N":"180000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#141"},"status":{"S":"CANCELLED"},"total":{"N":"217000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#142"},"status":{"S":"PAID"},"total":{"N":"254000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#143"},"status":{"S":"PAID"},"total":{"N":"291000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#144"},"status":{"S":"PAID"},"total":{"N":"328000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#145"},"status":{"S":"PAID"},"total":{"N":"365000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#146"},"status":{"S":"PAID"},"total":{"N":"402000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#147"},"status":{"S":"PAID"},"total":{"N":"439000"}}
          ]
         }}
  bad: |
    {"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "FilterExpression": "status = :s", "ExpressionAttributeValues": {":p": {"S": "CUST#2"}, ":s": {"S": "PAID"}}}}
  good: |
    {"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "FilterExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":p": {"S": "CUST#2"}, ":s": {"S": "PAID"}}}}
  expect: { code: "ValidationException" }
quiz:
  - q:
      vi: "`FilterExpression` viết `status = :s`. DynamoDB làm gì?"
      en: "A `FilterExpression` says `status = :s`. What does DynamoDB do?"
    options:
      - { vi: "Chạy bình thường", en: "Runs normally" }
      - { vi: "Từ chối bằng `ValidationException`: `status` là từ dành riêng", en: "Rejects it with `ValidationException`: `status` is a reserved word" }
      - { vi: "Chạy nhưng bỏ qua điều kiện", en: "Runs but ignores the condition" }
    answer: 1
    why:
      vi: "DynamoDB có hơn 500 từ dành riêng, `STATUS` và `TOTAL` cũng trong đó. Viết `#s` trong biểu thức và khai `\"#s\": \"status\"` trong `ExpressionAttributeNames`."
      en: "DynamoDB has over 500 reserved words, `STATUS` and `TOTAL` among them. Write `#s` in the expression and declare `\"#s\": \"status\"` in `ExpressionAttributeNames`."
---

## Ý chính

Tên thuộc tính trùng từ dành riêng (`status`, `total`, `name`, `date`, `count`…) phải viết qua placeholder `#x` trong mọi biểu thức. Tốt nhất là không đặt tên như vậy ngay từ đầu.

## Vì sao

- DynamoDB có hơn 500 từ dành riêng.
- Biểu thức dùng thẳng tên đó bị từ chối bằng `ValidationException`. Không sai âm thầm, nhưng lỗi chỉ lộ ra lúc chạy.
- Giống tên cột phải nháy kép trong SQL.

## Ví dụ

`status = :s` bị từ chối vì `status` là từ dành riêng. `#s = :s` với `ExpressionAttributeNames` trả 6 đơn đã trả của `CUST#2`.

# EN

## Key idea

An attribute name that is a reserved word (`status`, `total`, `name`, `date`, `count`…) must go through a `#x` placeholder in every expression. Better still, do not use such names in the first place.

## Why

- DynamoDB has over 500 reserved words.
- An expression that uses the name directly is rejected with `ValidationException`. Nothing goes silently wrong, but the error only shows up at run time.
- It is like a column name that needs double quotes in SQL.

## Example

`status = :s` is rejected because `status` is a reserved word. `#s = :s` with `ExpressionAttributeNames` returns the 6 paid orders of `CUST#2`.
