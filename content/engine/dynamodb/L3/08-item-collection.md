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
  - vi: Nhận ra vì sao Scan có lọc cho cùng kết quả nhưng đọc cả bảng.
    en: See why a filtered Scan gives the same result but reads the whole table.
requires: [e-dy-l3-07]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html, title_vi: "Thực hành tốt: thiết kế NoSQL" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html, title_vi: "Query: điều kiện trên khóa (key condition expression)" }
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
quiz:
  - q:
      vi: "Trang khách hàng cần hồ sơ và mọi đơn của `C-02`. Một Scan có `FilterExpression` `PK = :pk` trả đúng 3 item. Có gì sai?"
      en: "The customer page needs the profile and every order of `C-02`. A Scan with `FilterExpression` `PK = :pk` returns exactly 3 items. What is wrong?"
    options:
      - { vi: "Không sai gì: bộ lọc chạy trước khi đọc nên chỉ 3 item bị tính phí", en: "Nothing: the filter runs before the read, so only 3 items are charged" }
      - { vi: "Scan đọc mọi item của bảng rồi mới lọc, nên `ScannedCount` và capacity tính trên cả bảng", en: "The Scan reads every item of the table before filtering, so `ScannedCount` and capacity count the whole table" }
      - { vi: "Scan không trả được item có sort key", en: "A Scan cannot return items that have a sort key" }
    answer: 1
    trap: 0
    why:
      vi: "Trong SQL, điều kiện lọc có thể dùng index để đọc ít đi, nhưng `FilterExpression` của DynamoDB chạy sau khi item đã được đọc: `Count` là 3, còn `ScannedCount` là cả 38 item của bảng `Shop`, và capacity tính trên 38 item đó. Scan vẫn trả item có sort key bình thường; vấn đề chỉ là chi phí. Query với `KeyConditionExpression` `PK = :pk` đi thẳng tới item collection của `C-02`, nên chỉ đọc 3 item."
      en: "In SQL a filter can use an index to read less, but a DynamoDB `FilterExpression` runs after the items have been read: `Count` is 3 while `ScannedCount` is all 38 items of table `Shop`, and capacity is charged on those 38. A Scan returns items with a sort key just fine; the problem is only the cost. A Query with `KeyConditionExpression` `PK = :pk` goes straight to the item collection of `C-02`, so it reads only 3 items."
  - q:
      vi: "Sort key của đơn là `ORDER#2026-09-08#O-502`. Vì sao Query với `ScanIndexForward: false` ra đơn mới nhất trước?"
      en: "An order's sort key is `ORDER#2026-09-08#O-502`. Why does a Query with `ScanIndexForward: false` return the newest order first?"
    options:
      - { vi: "DynamoDB đọc ngày trong chuỗi và sắp theo ngày", en: "DynamoDB reads the date inside the string and sorts by date" }
      - { vi: "Sort key kiểu chuỗi sắp theo byte, và ngày dạng YYYY-MM-DD sắp theo byte cũng là sắp theo thời gian", en: "A string sort key sorts by bytes, and a YYYY-MM-DD date sorted by bytes is also sorted by time" }
      - { vi: "Item ghi sau luôn đứng sau", en: "Items written later always come later" }
    answer: 1
    why:
      vi: "DynamoDB không hiểu ngày: với sort key kiểu chuỗi, nó chỉ so từng byte UTF-8 từ trái sang. Thứ tự ghi cũng không quyết định gì; item được xếp theo giá trị sort key, ghi lúc nào cũng vậy. Ngày viết YYYY-MM-DD có cùng độ dài và năm đứng trước, nên so byte `2026-09-08` với `2026-08-26` cũng chính là so thời gian, và đọc ngược cho đơn mới nhất trước."
      en: "DynamoDB does not understand dates: for a string sort key it only compares UTF-8 bytes from left to right. Write order decides nothing either; items are placed by their sort key value, whenever they were written. A YYYY-MM-DD date has a fixed length with the year first, so comparing `2026-09-08` with `2026-08-26` byte by byte is the same as comparing time, and reading backwards gives the newest order first."
---
## Mở bài

Trong SQL, trang khách hàng nối bảng khách với bảng đơn. DynamoDB không có JOIN. Vậy làm sao lấy hồ sơ và mọi đơn của một khách chỉ bằng một request?

## Ý chính

Item collection là mọi item có cùng partition key. Trong bảng một-bảng `Shop`, mỗi collection được thiết kế để là một "trang" của ứng dụng: `CUST#…` giữ hồ sơ khách và các đơn của khách, `ORDER#…` giữ các dòng hàng của một đơn. Một Query trên `PK` đọc cả trang, các item nằm cạnh nhau trên cùng partition và đã sắp theo sort key.

Sort key là chuỗi, sắp theo byte. Tiền tố như `ORDER#` chọn loại item bằng `begins_with(SK, …)`, và ngày dạng `2026-09-08` đặt ngay sau tiền tố làm cho thứ tự byte trùng thứ tự thời gian. `ScanIndexForward: false` đảo chiều để lấy mới nhất trước.

Nhiều người nghĩ một Scan có `FilterExpression` cũng tốt như Query vì nó trả cùng item. Thật ra bộ lọc chạy sau khi đọc: Scan đọc cả bảng, trả 3 item nhưng `ScannedCount` là toàn bộ bảng, và capacity tính trên phần đã đọc. Cái giá của thiết kế này là nhân bản một phần dữ liệu (ví dụ `total` lưu sẵn trên item đơn) để mỗi trang chỉ cần một request.

Lab chạy bằng dynoxide trong trình duyệt; số `Count`, `ScannedCount` là số đo thật của engine này.

## Cú pháp

```text
{"op": "Query", "input": {"TableName": "<table>",
  "KeyConditionExpression": "PK = :pk [AND begins_with(SK, :prefix) | AND SK BETWEEN :a AND :b]",
  "ExpressionAttributeValues": {":pk": {"S": "<value>"}, ...},
  ["ScanIndexForward": false,] ["Limit": <n>]}}
SELECT * FROM "<table>" WHERE PK = '<value>' [AND begins_with(SK, '<prefix>')]
```

- `KeyConditionExpression`: bằng trên partition key là bắt buộc; sort key được thêm một điều kiện.
- `begins_with(SK, :p)`: chọn một loại item trong collection.
- `ScanIndexForward: false`: đọc ngược sort key, mới nhất trước.
- PartiQL: `WHERE` có bằng trên `PK` thì thành một Query, không có thì thành Scan.

## Ví dụ

Cả trang của khách `C-03`: hồ sơ và hai đơn.

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-03"}}}}
```

Ba item, `ScannedCount` cũng là 3: Query chỉ đọc đúng collection đó. `ORDER#…` đứng trước `PROFILE` vì `O` nhỏ hơn `P` theo byte.

Chỉ các đơn của `C-04`, mới nhất trước:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-04"}, ":o": {"S": "ORDER#"}}, "ScanIndexForward": false}}
```

Đơn `O-508` (2026-09-02) ra trước `O-507` (2026-08-08), không cần sắp thêm.

Cùng một trang bằng PartiQL:

```partiql
SELECT * FROM "Shop" WHERE PK = 'ORDER#O-502'
```

Ba dòng hàng của đơn `O-502`; có bằng trên `PK` nên engine đọc như một Query.

## Lỗi hay gặp

Dùng Scan có lọc thay cho Query:

```json
// WRONG: same 3 items, but the whole table is read
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}}}}
```

```json
// FIX: a Query reads only the collection
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}}}}
```

Hai câu trả cùng 3 item, nhưng câu sai có `ScannedCount` bằng cả bảng (38), câu sửa chỉ 3. Bảng càng lớn, câu sai càng đắt, mà kết quả không cho thấy điều đó.

Đặt điều kiện lên thuộc tính không phải khóa trong `KeyConditionExpression`:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND #t = :t", "ExpressionAttributeNames": {"#t": "type"}, "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}, ":t": {"S": "order"}}}}
```

`type` không phải khóa nên không dùng được ở đây. Chọn loại item bằng tiền tố sort key (`begins_with(SK, :o)`), hoặc để `type` vào `FilterExpression` nếu chấp nhận đọc cả collection.

## Thực hành

Ba bước trên cùng bảng `Shop`: lấy cả trang của một khách, chỉ lấy đơn mới nhất trước, rồi lấy các dòng hàng của một đơn. Bước 1 và 3 có thanh chi phí: một Scan cho cùng item vẫn không đạt.

## Tóm tắt

- Item collection = mọi item cùng partition key; một Query đọc cả collection.
- Thiết kế mỗi collection thành một trang của ứng dụng để thay cho JOIN.
- `begins_with(SK, …)` chọn loại item; sort key chuỗi sắp theo byte.
- `FilterExpression` lọc sau khi đọc: Scan có lọc vẫn trả phí cho cả bảng.

# EN

## Opening

In SQL, the customer page joins the customer table with the order table. DynamoDB has no JOIN. So how do you fetch a customer's profile and every order of theirs in one request?

## Key idea

An item collection is every item with the same partition key. In the single table `Shop`, each collection is designed to be one "page" of the application: `CUST#…` holds the customer profile and their orders, `ORDER#…` holds the lines of one order. A Query on `PK` reads the whole page; the items sit next to each other in the same partition, already sorted by sort key.

The sort key is a string, sorted by bytes. A prefix such as `ORDER#` picks an item type with `begins_with(SK, …)`, and a date like `2026-09-08` right after the prefix makes byte order match time order. `ScanIndexForward: false` reverses the direction to get the newest first.

Many people think a Scan with a `FilterExpression` is as good as a Query because it returns the same items. In fact the filter runs after the read: the Scan reads the whole table, returns 3 items but has a `ScannedCount` of the whole table, and capacity is charged on what was read. The price of this design is duplicating some data (for example `total` stored on the order item) so each page needs only one request.

The lab runs on dynoxide in the browser; `Count` and `ScannedCount` are real figures from this engine.

## Syntax

```text
{"op": "Query", "input": {"TableName": "<table>",
  "KeyConditionExpression": "PK = :pk [AND begins_with(SK, :prefix) | AND SK BETWEEN :a AND :b]",
  "ExpressionAttributeValues": {":pk": {"S": "<value>"}, ...},
  ["ScanIndexForward": false,] ["Limit": <n>]}}
SELECT * FROM "<table>" WHERE PK = '<value>' [AND begins_with(SK, '<prefix>')]
```

- `KeyConditionExpression`: equality on the partition key is required; the sort key may add one condition.
- `begins_with(SK, :p)`: picks one item type inside the collection.
- `ScanIndexForward: false`: reads the sort key backwards, newest first.
- PartiQL: a `WHERE` with equality on `PK` becomes a Query, without it a Scan.

## Example

The whole page of customer `C-03`: the profile and two orders.

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-03"}}}}
```

Three items, and `ScannedCount` is 3 too: the Query reads only that collection. `ORDER#…` comes before `PROFILE` because `O` is smaller than `P` in bytes.

Only the orders of `C-04`, newest first:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-04"}, ":o": {"S": "ORDER#"}}, "ScanIndexForward": false}}
```

Order `O-508` (2026-09-02) comes before `O-507` (2026-08-08), with no extra sort.

The same kind of page in PartiQL:

```partiql
SELECT * FROM "Shop" WHERE PK = 'ORDER#O-502'
```

The three lines of order `O-502`; there is an equality on `PK`, so the engine reads it like a Query.

## Common mistakes

Using a filtered Scan instead of a Query:

```json
// WRONG: same 3 items, but the whole table is read
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}}}}
```

```json
// FIX: a Query reads only the collection
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}}}}
```

Both return the same 3 items, but the wrong one has a `ScannedCount` of the whole table (38), the fix only 3. The bigger the table, the dearer the wrong one, and the result never shows it.

Putting a non-key attribute in the `KeyConditionExpression`:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND #t = :t", "ExpressionAttributeNames": {"#t": "type"}, "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}, ":t": {"S": "order"}}}}
```

`type` is not a key, so it cannot be used here. Pick the item type with a sort key prefix (`begins_with(SK, :o)`), or put `type` in a `FilterExpression` if reading the whole collection is acceptable.

## Practice

Three steps on the same `Shop` table: fetch a customer's whole page, fetch only the orders newest first, then fetch the lines of one order. Steps 1 and 3 have a cost bar: a Scan that gives the same items still does not pass.

## Recap

- Item collection = every item with the same partition key; one Query reads the whole collection.
- Design each collection as one page of the application to replace a JOIN.
- `begins_with(SK, …)` picks an item type; a string sort key sorts by bytes.
- `FilterExpression` filters after the read: a filtered Scan still pays for the whole table.
