---
id: e-bp-d15
engine: best
track: dynamodb
level: L2
module: d
title: "Điều kiện trên sort key đặt trong KeyConditionExpression"
title_en: "Sort-key conditions belong in the key condition"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết mọi điều kiện trên partition key và sort key trong `KeyConditionExpression`; `FilterExpression` chỉ cho thuộc tính thường."
    en: "Write every condition on the partition and sort key in `KeyConditionExpression`; keep `FilterExpression` for other attributes."
avoid:
  vi: "Request bị từ chối, hoặc đọc cả item collection rồi mới lọc."
  en: "A rejected request, or reading a whole item collection before filtering."
requires: [e-dy-l2-02]
skills: [where, sargable]
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: error
  setup: |
    {"tables": [
          {"TableName":"StoreDays","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
         ],
         "items": {
          "StoreDays": [
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-09-28"},"revenue":{"N":"1364000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-09-29"},"revenue":{"N":"1377000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-09-30"},"revenue":{"N":"1390000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-01"},"revenue":{"N":"1013000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-02"},"revenue":{"N":"1026000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-03"},"revenue":{"N":"1039000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-04"},"revenue":{"N":"1052000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-05"},"revenue":{"N":"1065000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-06"},"revenue":{"N":"1078000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-07"},"revenue":{"N":"1091000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-08"},"revenue":{"N":"1104000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-09"},"revenue":{"N":"1117000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-10"},"revenue":{"N":"1130000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-11"},"revenue":{"N":"1143000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-12"},"revenue":{"N":"1156000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-13"},"revenue":{"N":"1169000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-14"},"revenue":{"N":"1182000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-15"},"revenue":{"N":"1195000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-16"},"revenue":{"N":"1208000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-17"},"revenue":{"N":"1221000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-18"},"revenue":{"N":"1234000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-19"},"revenue":{"N":"1247000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-20"},"revenue":{"N":"1260000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-21"},"revenue":{"N":"1273000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-22"},"revenue":{"N":"1286000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-23"},"revenue":{"N":"1299000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-24"},"revenue":{"N":"1312000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-25"},"revenue":{"N":"1325000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-26"},"revenue":{"N":"1338000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-27"},"revenue":{"N":"1351000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-28"},"revenue":{"N":"1364000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-29"},"revenue":{"N":"1377000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-30"},"revenue":{"N":"1390000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-31"},"revenue":{"N":"1003000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-11-01"},"revenue":{"N":"1013000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-11-02"},"revenue":{"N":"1026000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-11-03"},"revenue":{"N":"1039000"}}
          ]
         }}
  bad: |
    {"op": "Query", "input": {"TableName": "StoreDays", "KeyConditionExpression": "pk = :p", "FilterExpression": "sk BETWEEN :a AND :b", "ExpressionAttributeValues": {":p": {"S": "STORE#3"}, ":a": {"S": "SALE#2026-10-01"}, ":b": {"S": "SALE#2026-10-07"}}}}
  good: |
    {"op": "Query", "input": {"TableName": "StoreDays", "KeyConditionExpression": "pk = :p AND sk BETWEEN :a AND :b", "ExpressionAttributeValues": {":p": {"S": "STORE#3"}, ":a": {"S": "SALE#2026-10-01"}, ":b": {"S": "SALE#2026-10-07"}}}}
  expect: { code: "ValidationException" }
quiz:
  - q:
      vi: "Một `Query` có `KeyConditionExpression` là `pk = :p` và `FilterExpression` là `sk BETWEEN :a AND :b`. Chuyện gì xảy ra?"
      en: "A `Query` has `KeyConditionExpression` `pk = :p` and `FilterExpression` `sk BETWEEN :a AND :b`. What happens?"
    options:
      - { vi: "Chạy, kết quả đúng nhưng đắt hơn", en: "It runs, correct but more expensive" }
      - { vi: "Bị từ chối: filter của `Query` không được chứa thuộc tính khóa", en: "It is rejected: a `Query` filter cannot contain key attributes" }
      - { vi: "Chạy và bỏ qua filter", en: "It runs and ignores the filter" }
    answer: 1
    why:
      vi: "Docs AWS ghi rõ: filter expression không được chứa partition key hay sort key. Điều kiện trên sort key thuộc về `KeyConditionExpression`, nơi nó thu hẹp phần dữ liệu được đọc."
      en: "The AWS docs say a filter expression cannot contain partition key or sort key attributes. A sort-key condition belongs in `KeyConditionExpression`, where it narrows what is read."
---

## Ý chính

Mọi điều kiện trên partition key và sort key (`=`, `<`, `BETWEEN`, `begins_with`) viết trong `KeyConditionExpression`. `FilterExpression` chỉ dành cho thuộc tính (attribute) thường.

## Vì sao

- Điều kiện khóa thu hẹp phần dữ liệu được **đọc**; filter chỉ bỏ bớt thứ **đã đọc**.
- Với `Query`, AWS từ chối hẳn filter trên khóa.
- Cùng ý với điều kiện sargable trong SQL: điều kiện phải dùng được khóa.

# EN

## Key idea

Every condition on the partition key and sort key (`=`, `<`, `BETWEEN`, `begins_with`) goes in `KeyConditionExpression`. `FilterExpression` is only for ordinary attributes.

## Why

- A key condition narrows what is **read**; a filter only drops what was **already read**.
- For `Query`, AWS rejects a filter on a key outright.
- Same idea as a sargable condition in SQL: the condition must be able to use the key.

