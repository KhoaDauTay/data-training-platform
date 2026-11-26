---
id: e-bp-d16
engine: best
track: dynamodb
level: L2
module: d
title: "Select: COUNT không làm đọc rẻ hơn"
title_en: "Select: COUNT does not make a read cheaper"
kind: quiz
minutes: 3
objectives:
  - vi: "Biết `Select: COUNT` và `ProjectionExpression` vẫn tính RCU theo item đã đọc, và giữ con số hay hỏi trong một item bộ đếm."
    en: "Know that `Select: COUNT` and `ProjectionExpression` still charge RCU for the items read, and keep a number you ask for often in a counter item."
avoid:
  vi: "Đếm đơn bằng `Scan` mỗi lần mở dashboard và trả tiền đọc cả bảng."
  en: "Counting orders with a `Scan` every time the dashboard opens, paying to read the whole table."
requires: [e-dy-l2-09]
skills: [aggregate]
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.CapacityUnits
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: runs
  setup: |
    {"tables": [
      {"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Shop": [
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#100"},"total":{"N":"50000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-04#101"},"total":{"N":"51000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-07#102"},"total":{"N":"52000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-10#103"},"total":{"N":"53000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-13#104"},"total":{"N":"54000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-16#105"},"total":{"N":"55000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#7"},"sk":{"S":"ORDER#2026-10-19#106"},"total":{"N":"56000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#8"},"sk":{"S":"ORDER#2026-10-22#107"},"total":{"N":"57000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-25#108"},"total":{"N":"58000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-28#109"},"total":{"N":"59000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-01#110"},"total":{"N":"60000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-04#111"},"total":{"N":"61000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-07#112"},"total":{"N":"62000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-10#113"},"total":{"N":"63000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#7"},"sk":{"S":"ORDER#2026-10-13#114"},"total":{"N":"64000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#8"},"sk":{"S":"ORDER#2026-10-16#115"},"total":{"N":"65000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-19#116"},"total":{"N":"66000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-22#117"},"total":{"N":"67000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-25#118"},"total":{"N":"68000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-28#119"},"total":{"N":"69000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-01#120"},"total":{"N":"70000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-04#121"},"total":{"N":"71000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#7"},"sk":{"S":"ORDER#2026-10-07#122"},"total":{"N":"72000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#8"},"sk":{"S":"ORDER#2026-10-10#123"},"total":{"N":"73000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-13#124"},"total":{"N":"74000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-16#125"},"total":{"N":"75000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-19#126"},"total":{"N":"76000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-22#127"},"total":{"N":"77000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-25#128"},"total":{"N":"78000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-28#129"},"total":{"N":"79000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#7"},"sk":{"S":"ORDER#2026-10-01#130"},"total":{"N":"80000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#8"},"sk":{"S":"ORDER#2026-10-04#131"},"total":{"N":"81000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-07#132"},"total":{"N":"82000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-10#133"},"total":{"N":"83000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-13#134"},"total":{"N":"84000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#135"},"total":{"N":"85000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-19#136"},"total":{"N":"86000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-22#137"},"total":{"N":"87000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#7"},"sk":{"S":"ORDER#2026-10-25#138"},"total":{"N":"88000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#8"},"sk":{"S":"ORDER#2026-10-28#139"},"total":{"N":"89000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"STATS"},"sk":{"S":"ORDERS"},"orders":{"N":"40"}}
      ]
    }}
  bad: |
    {"op": "Scan", "input": {"TableName": "Shop", "Select": "COUNT", "FilterExpression": "begins_with(sk, :o)", "ExpressionAttributeValues": {":o": {"S": "ORDER#"}}, "ReturnConsumedCapacity": "TOTAL"}}
  good: |
    {"op": "GetItem", "input": {"TableName": "Shop", "Key": {"pk": {"S": "STATS"}, "sk": {"S": "ORDERS"}}, "ReturnConsumedCapacity": "TOTAL"}}
  expect: { compare: rcu }
quiz:
  - q:
      vi: "Một `Query` có `ProjectionExpression` chỉ lấy `sk` trên các item 300 KB. RCU so với cùng `Query` không có projection?"
      en: "A `Query` with a `ProjectionExpression` that returns only `sk` reads 300 KB items. Its RCU compared with the same `Query` without a projection?"
    options:
      - { vi: "Gần như 0", en: "Close to 0" }
      - { vi: "Bằng nhau", en: "The same" }
      - { vi: "Gấp đôi", en: "Twice as much" }
    answer: 1
    why:
      vi: "Bằng nhau. RCU (read capacity unit, đơn vị đọc) tính theo cỡ item DynamoDB phải đọc: mỗi item 300 KB là 300 / 4 = 75 khối 4 KB, tức 75 RCU khi đọc nhất quán mạnh, dù chỉ trả `sk`. Projection chỉ bớt dữ liệu gửi qua mạng, nên không gần 0; cũng không gấp đôi, vì không có lượt đọc thứ hai. Docs của `Query` nói `COUNT` cũng tốn như vậy."
      en: "The same. RCU (read capacity unit) is charged on the size of the items DynamoDB must read: each 300 KB item is 300 / 4 = 75 blocks of 4 KB, so 75 RCU with a strongly consistent read, even if only `sk` comes back. A projection only trims what crosses the network, so not close to 0; and not twice, since there is no second read. The `Query` docs say `COUNT` costs the same."
---

## Ý chính

Đừng `Scan` với `Select: COUNT` để đếm trong luồng ứng dụng: nó tốn đúng như đọc cả item. Con số hay hỏi (tổng đơn) thì giữ sẵn trong một item bộ đếm, cập nhật bằng `ADD` lúc ghi.

## Vì sao

- RCU tính theo cỡ item đã đọc; `COUNT` chỉ bỏ phần trả về.
- `ProjectionExpression` cũng chỉ giảm dữ liệu trả về, không giảm RCU.
- DynamoDB không có `count(*)` rẻ phía server như SQL.

## Ví dụ

Bảng có 40 đơn và một item `STATS`. Bản Không nên đếm bằng `Scan` có `Select: COUNT`; bản Nên đọc item `STATS` bằng một `GetItem`. Số đo dưới pane là RCU.

# EN

## Key idea

Do not `Scan` with `Select: COUNT` to count things in an application path: it costs exactly what reading the items costs. Keep a number you ask for often (total orders) in a counter item, updated with `ADD` on each write.

## Why

- RCU is charged on the size of the items read; `COUNT` only drops the returned data.
- `ProjectionExpression` also trims only the returned data, not the RCU.
- DynamoDB has no cheap server-side `count(*)` like SQL.

## Example

The table holds 40 orders and one `STATS` item. Avoid counts with a `Scan` and `Select: COUNT`; Prefer reads the `STATS` item with one `GetItem`. The figure under each pane is the RCU.
