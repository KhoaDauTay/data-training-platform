---
id: e-bp-d12
engine: best
track: dynamodb
level: L2
module: d
title: "Đọc tới khi hết LastEvaluatedKey"
title_en: "Read until there is no LastEvaluatedKey"
kind: quiz
minutes: 3
objectives:
  - vi: "Coi `Limit` là số item đọc (trước khi lọc), và đọc tiếp bằng `ExclusiveStartKey` tới khi phản hồi không còn `LastEvaluatedKey`."
    en: "Treat `Limit` as the number of items read (before filtering), and keep reading with `ExclusiveStartKey` until the response has no `LastEvaluatedKey`."
avoid:
  vi: "Báo cáo chỉ đọc trang đầu và âm thầm thiếu dữ liệu."
  en: "A report that reads only the first page and silently misses data."
requires: [e-dy-l1-10]
skills: [limit]
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
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
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#100"},"total":{"N":"120000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-04#101"},"total":{"N":"450000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-07#102"},"total":{"N":"80000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-10#103"},"total":{"N":"90000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-13#104"},"total":{"N":"310000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-16#105"},"total":{"N":"60000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-19#106"},"total":{"N":"70000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-22#107"},"total":{"N":"520000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-25#108"},"total":{"N":"40000"}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-28#109"},"total":{"N":"380000"}}
      ]
    }}
  bad: |
    {"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "FilterExpression": "#t > :t", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":p": {"S": "CUST#1"}, ":t": {"N": "300000"}}, "Limit": 3}}
  good: |
    {"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "FilterExpression": "#t > :t", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":p": {"S": "CUST#1"}, ":t": {"N": "300000"}}}}
  expect: null
quiz:
  - q:
      vi: "Một `Query` có `Limit: 3` và `FilterExpression` trả `Count` 0 kèm `LastEvaluatedKey`. Nghĩa là gì?"
      en: "A `Query` with `Limit: 3` and a `FilterExpression` returns `Count` 0 together with a `LastEvaluatedKey`. What does it mean?"
    options:
      - { vi: "Không còn item nào khớp", en: "No item matches" }
      - { vi: "3 item đọc lên đều bị lọc; đọc tiếp với `ExclusiveStartKey`", en: "The 3 items read were all filtered out; keep reading with `ExclusiveStartKey`" }
      - { vi: "Request bị lỗi", en: "The request failed" }
    answer: 1
    why:
      vi: "`Limit` và giới hạn 1 MB áp lên item **đọc**, trước khi lọc. Một trang rỗng vẫn có thể còn trang sau; chỉ khi không còn `LastEvaluatedKey` mới là hết."
      en: "`Limit` and the 1 MB cap apply to the items **read**, before the filter. An empty page can still have pages after it; only a missing `LastEvaluatedKey` means the end."
---

## Ý chính

`Query` và `Scan` trả tối đa 1 MB mỗi lần. Luôn lặp với `ExclusiveStartKey` bằng `LastEvaluatedKey` vừa nhận, tới khi phản hồi không còn `LastEvaluatedKey`. Đừng dùng `Limit` như "số kết quả muốn có".

## Vì sao

- `Limit` đếm item đọc, không đếm item khớp sau `FilterExpression`.
- Chỉ đọc trang đầu là thiếu dữ liệu mà không có lỗi.

## Ví dụ

Khách `CUST#1` có 10 đơn, 4 đơn trên 300.000. Bản Không nên là một trang `Limit: 3`; bản Nên không đặt `Limit`, dữ liệu nhỏ nên một trang là hết. Với `Limit`, vòng lặp đúng là:

```js
let n = 0, key;
do {
  const p = await query({ ...input, ExclusiveStartKey: key });
  n += p.Count; key = p.LastEvaluatedKey;
} while (key);
```

# EN

## Key idea

`Query` and `Scan` return at most 1 MB per call. Always loop with `ExclusiveStartKey` set to the `LastEvaluatedKey` you just got, until the response has no `LastEvaluatedKey`. Do not use `Limit` as "how many results I want".

## Why

- `Limit` counts items read, not items that match after `FilterExpression`.
- Reading only the first page misses data without any error.

## Example

Customer `CUST#1` has 10 orders, 4 of them above 300,000. Avoid is one page with `Limit: 3`; Prefer sets no `Limit`, and the data is small, so one page is all of it. With a `Limit`, the right loop is:

```js
let n = 0, key;
do {
  const p = await query({ ...input, ExclusiveStartKey: key });
  n += p.Count; key = p.LastEvaluatedKey;
} while (key);
```
