---
id: e-dy-l3-10
engine: dynamodb
level: L3
module: single-table
title: "Adjacency list: quan hệ nhiều-nhiều và GSI đảo ngược"
title_en: "Adjacency list: many-to-many and the inverted GSI"
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Lưu quan hệ nhiều-nhiều (đơn và sản phẩm) bằng item cạnh `ORDER#… / PRODUCT#…`.
    en: Store a many-to-many relation (orders and products) as edge items `ORDER#… / PRODUCT#…`.
  - vi: Đọc chiều ngược lại bằng một GSI có khóa đảo.
    en: Read the reverse direction with a GSI whose keys are swapped.
requires: [e-dy-l3-08, e-dy-l3-04]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
lab:
  setup: |
    {"tables": [{"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"PK","KeyType":"HASH"},{"AttributeName":"SK","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"PK","AttributeType":"S"},{"AttributeName":"SK","AttributeType":"S"},{"AttributeName":"GSI1PK","AttributeType":"S"},{"AttributeName":"GSI1SK","AttributeType":"S"}],"GlobalSecondaryIndexes":[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}],
     "items": {"Shop": [
      {"PK":"PRODUCT#P-01","SK":"PRODUCT#P-01","type":"product","name":"Green tea","price":45000},
      {"PK":"PRODUCT#P-02","SK":"PRODUCT#P-02","type":"product","name":"Lotus tea","price":60000},
      {"PK":"PRODUCT#P-03","SK":"PRODUCT#P-03","type":"product","name":"Coffee beans","price":120000},
      {"PK":"PRODUCT#P-04","SK":"PRODUCT#P-04","type":"product","name":"Tea cup","price":80000},
      {"PK":"PRODUCT#P-05","SK":"PRODUCT#P-05","type":"product","name":"Kettle","price":350000},
      {"PK":"CUST#C-01","SK":"PROFILE","type":"customer","name":"An","city":"Da Nang"},
      {"PK":"CUST#C-01","SK":"ORDER#2026-08-26#O-501","type":"order","orderId":"O-501","total":160000},
      {"PK":"ORDER#O-501","SK":"PRODUCT#P-04","type":"line","qty":2,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-501"},
      {"PK":"CUST#C-01","SK":"ORDER#2026-09-08#O-502","type":"order","orderId":"O-502","total":380000},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-03","type":"line","qty":2,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-502"},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-02","type":"line","qty":1,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-502"},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-04","type":"line","qty":1,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-502"},
      {"PK":"CUST#C-02","SK":"PROFILE","type":"customer","name":"Binh","city":"Hue"},
      {"PK":"CUST#C-02","SK":"ORDER#2026-08-28#O-503","type":"order","orderId":"O-503","total":355000},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-04","type":"line","qty":2,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-503"},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-01","type":"line","qty":3,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-503"},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-02","type":"line","qty":1,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-503"},
      {"PK":"CUST#C-02","SK":"ORDER#2026-09-05#O-504","type":"order","orderId":"O-504","total":440000},
      {"PK":"ORDER#O-504","SK":"PRODUCT#P-03","type":"line","qty":3,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-504"},
      {"PK":"ORDER#O-504","SK":"PRODUCT#P-04","type":"line","qty":1,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-504"},
      {"PK":"CUST#C-03","SK":"PROFILE","type":"customer","name":"Chi","city":"Hoi An"},
      {"PK":"CUST#C-03","SK":"ORDER#2026-08-12#O-505","type":"order","orderId":"O-505","total":135000},
      {"PK":"ORDER#O-505","SK":"PRODUCT#P-01","type":"line","qty":3,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-505"},
      {"PK":"CUST#C-03","SK":"ORDER#2026-09-12#O-506","type":"order","orderId":"O-506","total":405000},
      {"PK":"ORDER#O-506","SK":"PRODUCT#P-03","type":"line","qty":3,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-506"},
      {"PK":"ORDER#O-506","SK":"PRODUCT#P-01","type":"line","qty":1,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-506"},
      {"PK":"CUST#C-04","SK":"PROFILE","type":"customer","name":"Dung","city":"Da Nang"},
      {"PK":"CUST#C-04","SK":"ORDER#2026-08-08#O-507","type":"order","orderId":"O-507","total":165000},
      {"PK":"ORDER#O-507","SK":"PRODUCT#P-01","type":"line","qty":1,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-507"},
      {"PK":"ORDER#O-507","SK":"PRODUCT#P-02","type":"line","qty":2,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-507"},
      {"PK":"CUST#C-04","SK":"ORDER#2026-09-02#O-508","type":"order","orderId":"O-508","total":700000},
      {"PK":"ORDER#O-508","SK":"PRODUCT#P-05","type":"line","qty":2,"price":350000,"GSI1PK":"PRODUCT#P-05","GSI1SK":"ORDER#O-508"},
      {"PK":"STORE","SK":"VN#DA-NANG#HAI-CHAU#S-01","type":"store","storeId":"S-01"},
      {"PK":"STORE","SK":"VN#DA-NANG#HAI-CHAU#S-02","type":"store","storeId":"S-02"},
      {"PK":"STORE","SK":"VN#DA-NANG#SON-TRA#S-03","type":"store","storeId":"S-03"},
      {"PK":"STORE","SK":"VN#HUE#PHU-HOI#S-04","type":"store","storeId":"S-04"},
      {"PK":"STORE","SK":"VN#QUANG-NAM#HOI-AN#S-05","type":"store","storeId":"S-05"},
      {"PK":"STORE","SK":"VN#DA-NANG#LIEN-CHIEU#S-06","type":"store","storeId":"S-06"}
    ]}}
  steps:
    - task:
        vi: Những sản phẩm nào nằm trong đơn `O-502`?
        en: Which products are in order `O-502`?
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk AND begins_with(SK, :p)",
          "ExpressionAttributeValues": {":pk": {"S": "ORDER#O-502"}, ":p": {"S": "PRODUCT#"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"ORDER#O-502"},":p":{"S":"PRODUCT#"}},"FilterExpression":"(PK = :pk AND begins_with(SK, :p))"}}
      ordered: true
      hint:
        vi: Chiều xuôi - partition key là đơn.
        en: The forward direction - the partition key is the order.
    - task:
        vi: 'Chiều ngược - những đơn nào có sản phẩm `P-04` (tách trà)? Dùng GSI `GSI1` (khóa `GSI1PK` = sản phẩm, `GSI1SK` = đơn).'
        en: 'The reverse direction - which orders contain product `P-04` (the tea cup)? Use GSI `GSI1` (keys `GSI1PK` = product, `GSI1SK` = order).'
      solution: |
        {"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1",
          "KeyConditionExpression": "GSI1PK = :p",
          "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-04"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","IndexName":"GSI1","ExpressionAttributeValues":{":p":{"S":"PRODUCT#P-04"}},"FilterExpression":"(GSI1PK = :p)"}}
      ordered: true
      expect: { Count: 4 }
      hint:
        vi: '`GSI1` lưu cùng item cạnh nhưng với khóa đổi chỗ, nên partition key của nó là sản phẩm.'
        en: '`GSI1` stores the same edge items with the keys swapped, so its partition key is the product.'
---

## Ý chính

Quan hệ nhiều-nhiều (một đơn có nhiều sản phẩm, một sản phẩm nằm trong nhiều đơn) được lưu bằng **item cạnh**: mỗi cặp (đơn, sản phẩm) là một item.

- Bảng: `PK = ORDER#O-503`, `SK = PRODUCT#P-04` → đọc "sản phẩm của một đơn".
- GSI đảo: `GSI1PK = PRODUCT#P-04`, `GSI1SK = ORDER#O-503` → đọc "đơn có một sản phẩm".

Item cạnh mang luôn dữ liệu của quan hệ (`qty`, `price` lúc mua), giống bảng nối trong SQL.

AWS gọi việc nhiều loại item cùng dùng tên khóa chung của một GSI là **GSI overloading**: một index phục vụ nhiều mẫu truy cập.

## Ví dụ

```text
PK            SK             GSI1PK         GSI1SK
ORDER#O-501   PRODUCT#P-04   PRODUCT#P-04   ORDER#O-501
ORDER#O-502   PRODUCT#P-04   PRODUCT#P-04   ORDER#O-502
ORDER#O-503   PRODUCT#P-04   PRODUCT#P-04   ORDER#O-503
```

## Thực hành

Ở đây `GSI1PK`/`GSI1SK` được ghi riêng trên item cạnh. Một cách khác của AWS là đặt GSI có partition key là `SK` và sort key là `PK` của bảng, để mọi item tự có chiều ngược.

# EN

## Key idea

A many-to-many relation (an order has many products, a product is in many orders) is stored as **edge items**: each (order, product) pair is one item.

- Table: `PK = ORDER#O-503`, `SK = PRODUCT#P-04` → read "the products of an order".
- Inverted GSI: `GSI1PK = PRODUCT#P-04`, `GSI1SK = ORDER#O-503` → read "the orders that contain a product".

The edge item also carries the data of the relation (`qty`, the `price` at purchase), like a join table in SQL.

AWS calls several item types sharing the generic key names of one GSI **GSI overloading**: one index serves several access patterns.

## Example

```text
PK            SK             GSI1PK         GSI1SK
ORDER#O-501   PRODUCT#P-04   PRODUCT#P-04   ORDER#O-501
ORDER#O-502   PRODUCT#P-04   PRODUCT#P-04   ORDER#O-502
ORDER#O-503   PRODUCT#P-04   PRODUCT#P-04   ORDER#O-503
```

## Practice

Here `GSI1PK`/`GSI1SK` are written separately on the edge items. Another AWS approach is a GSI whose partition key is the table's `SK` and whose sort key is its `PK`, so every item gets the reverse direction for free.
