---
id: e-dy-l3-08
engine: dynamodb
level: L3
module: single-table
title: "Một Query thay cho JOIN"
title_en: "One Query instead of a JOIN"
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Đọc một khách cùng mọi đơn của khách bằng một Query trên bảng một-bảng.
    en: Read a customer together with all of their orders with one Query on a single table.
  - vi: Chọn đúng một loại item trong collection bằng `begins_with` trên `SK`.
    en: Pick one item type inside a collection with `begins_with` on `SK`.
requires: [e-dy-l3-07]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
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
        vi: Trang khách hàng cần hồ sơ của `C-02` và mọi đơn của khách trong một request.
        en: The customer page needs the profile of `C-02` and every order of theirs in one request.
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk",
          "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"CUST#C-02"}},"FilterExpression":"(PK = :pk)"}}
      ordered: true
      expect: { Count: 3, ScannedCount: 3 }
      hint:
        vi: Hồ sơ và đơn dùng chung `PK = CUST#C-02`.
        en: The profile and the orders share `PK = CUST#C-02`.
    - task:
        vi: Chỉ lấy các đơn của `C-01`, không lấy hồ sơ, mới nhất trước.
        en: Get only the orders of `C-01`, not the profile, newest first.
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk AND begins_with(SK, :o)",
          "ExpressionAttributeValues": {":pk": {"S": "CUST#C-01"}, ":o": {"S": "ORDER#"}},
          "ScanIndexForward": false}}
      check: doc
      ordered: true
      hint:
        vi: Tiền tố `ORDER#` trên sort key chọn loại item.
        en: The `ORDER#` prefix on the sort key picks the item type.
    - task:
        vi: Lấy các dòng hàng của đơn `O-503`.
        en: Get the order lines of order `O-503`.
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk",
          "ExpressionAttributeValues": {":pk": {"S": "ORDER#O-503"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"ORDER#O-503"}},"FilterExpression":"(PK = :pk)"}}
      ordered: true
      expect: { Count: 3 }
      hint:
        vi: Dòng hàng nằm trong item collection của chính đơn, `ORDER#…`.
        en: Order lines live in the order's own item collection, `ORDER#…`.
---

## Ý chính

Trong bảng `Shop`, mỗi item collection là một "trang" của ứng dụng:

- `CUST#…`: hồ sơ khách và các đơn của khách.
- `ORDER#…`: các dòng hàng của một đơn.

Query trên `PK` lấy cả trang. Thêm `begins_with(SK, …)` để chỉ lấy một loại item. Sort key sắp theo byte, nên tiền tố `ORDER#2026-…` vừa chọn loại vừa sắp theo thời gian.

## Ví dụ

Cùng câu hỏi trong SQL cần nối hai bảng:

```text
SQL:      SELECT ... FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 'C-02'
DynamoDB: Query PK = CUST#C-02
```

## Thực hành

Thiết kế này nhân bản một phần dữ liệu (ví dụ `total` lưu sẵn trên item đơn). Đổi lại, mỗi trang chỉ cần một request.

# EN

## Key idea

In table `Shop`, each item collection is one "page" of the application:

- `CUST#…`: the customer profile and the customer's orders.
- `ORDER#…`: the lines of one order.

A Query on `PK` fetches the whole page. Add `begins_with(SK, …)` to fetch one item type. The sort key sorts by bytes, so the prefix `ORDER#2026-…` both picks the type and sorts by time.

## Example

The same question in SQL needs to join two tables:

```text
SQL:      SELECT ... FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 'C-02'
DynamoDB: Query PK = CUST#C-02
```

## Practice

This design duplicates some data (for example `total` stored on the order item). In return, each page needs only one request.
