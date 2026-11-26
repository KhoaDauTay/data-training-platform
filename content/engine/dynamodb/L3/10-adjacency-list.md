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
figures: [{ name: dy-adjacency-list, at: idea }]
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
    - task:
        vi: 'Nhập thêm hạt cà phê cần biết những đơn nào đã mua `P-03`. Đọc từ `GSI1`. Bước này có thanh chi phí.'
        en: 'Restocking coffee beans needs to know which orders bought `P-03`. Read from `GSI1`. This step has a cost bar.'
      solution: |
        {"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1",
          "KeyConditionExpression": "GSI1PK = :p",
          "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-03"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":p":{"S":"PRODUCT#P-03"}},"FilterExpression":"(GSI1PK = :p)"}}
      expect: { Count: 3, ScannedCount: 3 }
      hint:
        vi: Cùng câu như bước 2, đổi mã sản phẩm.
        en: The same request as step 2 with another product code.
quiz:
  - q:
      vi: 'Bảng có item cạnh `PK = ORDER#…`, `SK = PRODUCT#…`. Muốn biết "đơn nào có sản phẩm `P-04`" mà không Scan, cần gì?'
      en: 'The table has edge items `PK = ORDER#…`, `SK = PRODUCT#…`. To find "which orders contain product `P-04`" without a Scan, what do you need?'
    options:
      - { vi: "Một Query `SK = PRODUCT#P-04` trên bảng", en: "A Query `SK = PRODUCT#P-04` on the table" }
      - { vi: "Một GSI có khóa đảo: partition key là sản phẩm, sort key là đơn", en: "A GSI with swapped keys: the product as partition key, the order as sort key" }
      - { vi: "Một LSI trên `SK`", en: "An LSI on `SK`" }
    answer: 1
    trap: 0
    why:
      vi: Nghe hợp lý vì `SK` có giá trị cần tìm, nhưng Query bắt buộc bằng trên partition key; chỉ biết `SK` thì phải Scan. LSI vẫn chia theo đơn. GSI đảo khóa biến sản phẩm thành partition key.
      en: It sounds right because `SK` holds the value you need, but a Query requires equality on the partition key; knowing only `SK` means a Scan. An LSI is still split by order. A GSI with swapped keys makes the product the partition key.
  - q:
      vi: Item cạnh `ORDER#O-503 / PRODUCT#P-04` nên mang thêm gì?
      en: What should the edge item `ORDER#O-503 / PRODUCT#P-04` also carry?
    options:
      - { vi: "Dữ liệu của chính quan hệ: `qty`, giá lúc mua", en: "The relation's own data: `qty`, the price at purchase" }
      - { vi: "Toàn bộ hồ sơ khách", en: "The whole customer profile" }
      - { vi: "Không gì ngoài khóa", en: "Nothing but the keys" }
    answer: 0
    why:
      vi: Như bảng nối trong SQL, item cạnh giữ dữ liệu thuộc về cặp (đơn, sản phẩm). Giá lúc mua phải lưu ở đây vì giá sản phẩm có thể đổi sau.
      en: Like a SQL join table, the edge item holds data that belongs to the pair (order, product). The purchase price must live here because the product price may change later.
---

## Mở bài

Một đơn có nhiều sản phẩm, một sản phẩm nằm trong nhiều đơn. Trang đơn hỏi "đơn này có gì", còn kho hỏi "những đơn nào có món này". Trong SQL đó là một bảng nối và hai JOIN; ở đây là hai Query.

## Ý chính

Quan hệ nhiều-nhiều được lưu bằng item cạnh: mỗi cặp (đơn, sản phẩm) là một item. Trên bảng, `PK = ORDER#O-503`, `SK = PRODUCT#P-04` cho chiều xuôi: Query `PK` của đơn trả mọi sản phẩm của đơn. Item cạnh mang luôn dữ liệu của quan hệ (`qty`, `price` lúc mua), giống bảng nối trong SQL.

Chiều ngược cần một GSI có khóa đảo: `GSI1PK = PRODUCT#P-04`, `GSI1SK = ORDER#O-503`. Query `GSI1PK` của sản phẩm trả mọi đơn có sản phẩm đó. AWS gọi việc nhiều loại item dùng chung tên khóa của một GSI là GSI overloading: một index phục vụ nhiều mẫu truy cập.

Nhiều người nghĩ chỉ cần Query `SK = PRODUCT#P-04` trên bảng. Thật ra Query luôn cần bằng trên partition key; chỉ biết sort key thì phải Scan. Ở đây `GSI1PK`/`GSI1SK` được ghi riêng trên item cạnh; một cách khác AWS mô tả là GSI có partition key là `SK` và sort key là `PK` của bảng, để mọi item tự có chiều ngược.

Hình dưới vẽ cùng một item cạnh ở hai nơi: trong partition của đơn trên bảng, và trong partition của sản phẩm trên GSI1. Lab chạy bằng dynoxide trên bảng `Shop` của các bài trước.

## Cú pháp

```text
forward:    Query  PK = ORDER#<o> AND begins_with(SK, "PRODUCT#")
reverse:    Query  IndexName GSI1, GSI1PK = PRODUCT#<p>
```

- Một item cho mỗi cặp của quan hệ.
- Bảng đọc chiều xuôi; GSI khóa đảo đọc chiều ngược.
- Dữ liệu của quan hệ nằm trên item cạnh.

## Ví dụ

Sản phẩm của đơn `O-503`:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :p)", "ExpressionAttributeValues": {":pk": {"S": "ORDER#O-503"}, ":p": {"S": "PRODUCT#"}}}}
```

Ba dòng hàng (`P-01`, `P-02`, `P-04`), mỗi dòng có `qty` và `price` lúc mua.

Những đơn có trà sen `P-02`:

```json
{"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1", "KeyConditionExpression": "GSI1PK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

Ba đơn: `O-502`, `O-503`, `O-507`, sắp theo `GSI1SK`.

## Lỗi hay gặp

Tìm chiều ngược bằng Scan bảng:

```json
// WRONG: reads the whole table to find the orders of one product
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "SK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

```json
// FIX: the inverted GSI is keyed on the product
{"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1", "KeyConditionExpression": "GSI1PK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

Cùng ba đơn (câu sai còn kèm item sản phẩm `P-02` vì item đó có `PK` bằng `SK`), nhưng câu sai đọc 38 item, câu sửa 3.

Dùng khóa của bảng khi Query GSI:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1", "KeyConditionExpression": "PK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

Trên `GSI1`, điều kiện khóa phải dùng `GSI1PK` (và `GSI1SK`), không phải `PK`.

## Thực hành

Ba bước: sản phẩm của một đơn, đơn có một sản phẩm qua `GSI1`, rồi đơn có một sản phẩm khác. Mọi bước có thanh chi phí.

## Tóm tắt

- Quan hệ nhiều-nhiều = item cạnh, mỗi cặp một item.
- Bảng đọc chiều xuôi; GSI có khóa đảo đọc chiều ngược.
- Query luôn cần bằng trên partition key của bảng hoặc index đang đọc.
- Item cạnh giữ dữ liệu của quan hệ, như giá lúc mua.

# EN

## Opening

One order has many products, one product appears in many orders. The order page asks "what is in this order", the warehouse asks "which orders contain this item". In SQL that is a join table and two JOINs; here it is two Queries.

## Key idea

A many-to-many relation is stored as edge items: each (order, product) pair is one item. On the table, `PK = ORDER#O-503`, `SK = PRODUCT#P-04` gives the forward direction: a Query on the order's `PK` returns every product of the order. The edge item also carries the relation's own data (`qty`, the `price` at purchase), like a SQL join table.

The reverse direction needs a GSI with swapped keys: `GSI1PK = PRODUCT#P-04`, `GSI1SK = ORDER#O-503`. A Query on the product's `GSI1PK` returns every order containing that product. AWS calls many item types sharing one GSI's key names GSI overloading: one index serving many access patterns.

Many people think a Query `SK = PRODUCT#P-04` on the table is enough. In fact a Query always needs equality on the partition key; knowing only the sort key means a Scan. Here `GSI1PK`/`GSI1SK` are written separately on the edge items; another way AWS describes is a GSI whose partition key is the table's `SK` and sort key its `PK`, so every item gets its reverse direction for free.

The figure below draws one edge item in two places: in the order's partition on the table, and in the product's partition on GSI1. The lab runs on dynoxide on the `Shop` table of the previous lessons.

## Syntax

```text
forward:    Query  PK = ORDER#<o> AND begins_with(SK, "PRODUCT#")
reverse:    Query  IndexName GSI1, GSI1PK = PRODUCT#<p>
```

- One item per pair of the relation.
- The table reads forward; the swapped-key GSI reads backward.
- The relation's data lives on the edge item.

## Example

The products of order `O-503`:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :p)", "ExpressionAttributeValues": {":pk": {"S": "ORDER#O-503"}, ":p": {"S": "PRODUCT#"}}}}
```

Three lines (`P-01`, `P-02`, `P-04`), each with `qty` and the `price` at purchase.

The orders containing lotus tea `P-02`:

```json
{"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1", "KeyConditionExpression": "GSI1PK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

Three orders: `O-502`, `O-503`, `O-507`, sorted by `GSI1SK`.

## Common mistakes

Finding the reverse direction with a table Scan:

```json
// WRONG: reads the whole table to find the orders of one product
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "SK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

```json
// FIX: the inverted GSI is keyed on the product
{"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1", "KeyConditionExpression": "GSI1PK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

The same three orders (the wrong one also returns the `P-02` product item, whose `PK` equals its `SK`), but the wrong one reads 38 items, the fix 3.

Using the table's key when querying the GSI:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1", "KeyConditionExpression": "PK = :p", "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-02"}}}}
```

On `GSI1`, the key condition must use `GSI1PK` (and `GSI1SK`), not `PK`.

## Practice

Three steps: the products of one order, the orders of one product through `GSI1`, then the orders of another product. Every step has a cost bar.

## Recap

- Many-to-many = edge items, one item per pair.
- The table reads forward; a GSI with swapped keys reads backward.
- A Query always needs equality on the partition key of the table or index it reads.
- The edge item holds the relation's data, such as the purchase price.
