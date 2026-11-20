---
id: e-bp-d06
engine: best
track: dynamodb
level: L1
module: d
title: "Query, đừng Scan"
title_en: "Query, don't Scan"
kind: quiz
minutes: 3
objectives:
  - vi: "Đọc trong luồng ứng dụng bằng `GetItem`/`Query` trên bảng hoặc index, giữ `Scan` cho việc nền."
    en: "Read in application paths with `GetItem`/`Query` on a table or index, and keep `Scan` for background jobs."
avoid:
  vi: "Trả tiền đọc cả bảng để lấy vài item của một khách."
  en: "Paying to read the whole table to get a few items of one customer."
requires: [e-dy-l1-09]
skills: [where, sargable]
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: same
  setup: |
    {"tables": [
          {"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
         ],
         "items": {
          "Shop": [
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#100"},"status":{"S":"PENDING"},"total":{"N":"50000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#101"},"status":{"S":"CANCELLED"},"total":{"N":"87000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#102"},"status":{"S":"PAID"},"total":{"N":"124000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#103"},"status":{"S":"PAID"},"total":{"N":"161000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#104"},"status":{"S":"PAID"},"total":{"N":"198000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#105"},"status":{"S":"PAID"},"total":{"N":"235000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#106"},"status":{"S":"PAID"},"total":{"N":"272000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#107"},"status":{"S":"PAID"},"total":{"N":"309000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#108"},"status":{"S":"PENDING"},"total":{"N":"346000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#109"},"status":{"S":"CANCELLED"},"total":{"N":"383000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#110"},"status":{"S":"PAID"},"total":{"N":"420000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#111"},"status":{"S":"PAID"},"total":{"N":"457000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#112"},"status":{"S":"PAID"},"total":{"N":"494000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#113"},"status":{"S":"PAID"},"total":{"N":"81000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#114"},"status":{"S":"PAID"},"total":{"N":"118000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#115"},"status":{"S":"PAID"},"total":{"N":"155000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#116"},"status":{"S":"PENDING"},"total":{"N":"192000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#117"},"status":{"S":"CANCELLED"},"total":{"N":"229000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#118"},"status":{"S":"PAID"},"total":{"N":"266000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#119"},"status":{"S":"PAID"},"total":{"N":"303000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#120"},"status":{"S":"PAID"},"total":{"N":"340000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#121"},"status":{"S":"PAID"},"total":{"N":"377000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#122"},"status":{"S":"PAID"},"total":{"N":"414000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#123"},"status":{"S":"PAID"},"total":{"N":"451000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#124"},"status":{"S":"PENDING"},"total":{"N":"488000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#125"},"status":{"S":"CANCELLED"},"total":{"N":"75000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#126"},"status":{"S":"PAID"},"total":{"N":"112000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#127"},"status":{"S":"PAID"},"total":{"N":"149000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#128"},"status":{"S":"PAID"},"total":{"N":"186000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#129"},"status":{"S":"PAID"},"total":{"N":"223000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#130"},"status":{"S":"PAID"},"total":{"N":"260000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#131"},"status":{"S":"PAID"},"total":{"N":"297000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#132"},"status":{"S":"PENDING"},"total":{"N":"334000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#133"},"status":{"S":"CANCELLED"},"total":{"N":"371000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#134"},"status":{"S":"PAID"},"total":{"N":"408000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#135"},"status":{"S":"PAID"},"total":{"N":"445000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#136"},"status":{"S":"PAID"},"total":{"N":"482000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#137"},"status":{"S":"PAID"},"total":{"N":"69000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#138"},"status":{"S":"PAID"},"total":{"N":"106000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#139"},"status":{"S":"PAID"},"total":{"N":"143000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#140"},"status":{"S":"PENDING"},"total":{"N":"180000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#141"},"status":{"S":"CANCELLED"},"total":{"N":"217000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#142"},"status":{"S":"PAID"},"total":{"N":"254000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#143"},"status":{"S":"PAID"},"total":{"N":"291000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#144"},"status":{"S":"PAID"},"total":{"N":"328000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#145"},"status":{"S":"PAID"},"total":{"N":"365000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#146"},"status":{"S":"PAID"},"total":{"N":"402000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#147"},"status":{"S":"PAID"},"total":{"N":"439000"},"note":{"S":"Deliver to the side door, call before arriving. Deliver to the side door, call before arriving. Deliver to the side door, call before arriving."}}
          ]
         }}
  bad: |
    {"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "CUST#2"}}, "ReturnConsumedCapacity": "TOTAL"}}
  good: |
    {"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "CUST#2"}}, "ReturnConsumedCapacity": "TOTAL"}}
  expect: { compare: rcu }
quiz:
  - q:
      vi: "Một `Scan` có `FilterExpression` trả 8 item trên bảng 48 item. Bạn trả tiền đọc cho bao nhiêu item?"
      en: "A `Scan` with a `FilterExpression` returns 8 items from a 48-item table. How many items do you pay to read?"
    options:
      - { vi: "8", en: "8" }
      - { vi: "48", en: "48" }
      - { vi: "0, vì filter chạy trước khi đọc", en: "0, because the filter runs before the read" }
    answer: 1
    why:
      vi: "`FilterExpression` lọc **sau** khi đọc: `ScannedCount` là 48, `Count` là 8, và RCU tính theo 48 item đã đọc. `Query` theo partition key chỉ đọc item collection của khách đó."
      en: "`FilterExpression` filters **after** the read: `ScannedCount` is 48, `Count` is 8, and RCU is charged for the 48 items read. A `Query` on the partition key reads only that customer's item collection."
---

## Ý chính

Truy vấn trong luồng ứng dụng dùng `GetItem` hoặc `Query` trên bảng hay index. `Scan` chỉ cho việc nền (xuất, sửa dữ liệu), có giới hạn tốc độ. `FilterExpression` không làm đọc rẻ hơn.

## Vì sao

- `Scan` đọc và tính phí mọi item, ăn capacity của bảng, làm request khác bị throttle.
- `FilterExpression` lọc sau khi đã đọc.
- `Query` dùng partition key để chỉ đọc đúng item collection cần.

# EN

## Key idea

Application reads use `GetItem` or `Query` on a table or index. `Scan` is for background jobs only (exports, data fixes), rate limited. A `FilterExpression` does not make a read cheaper.

## Why

- `Scan` reads and charges for every item, eats the table's capacity and gets other requests throttled.
- `FilterExpression` filters after the read.
- `Query` uses the partition key to read only the item collection you need.

