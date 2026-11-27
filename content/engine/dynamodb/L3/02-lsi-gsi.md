---
id: e-dy-l3-02
engine: dynamodb
level: L3
module: secondary
title: "LSI và GSI: hai loại index phụ"
title_en: "LSI and GSI: two kinds of secondary index"
kind: concept
runtime: docs
minutes: 10
viz: dy-gsi
objectives:
  - vi: So sánh LSI và GSI về khóa, lúc tạo, consistency, throughput và giới hạn cỡ.
    en: Compare LSI and GSI on keys, creation time, consistency, throughput and size limits.
  - vi: Chọn projection `KEYS_ONLY`, `INCLUDE` hay `ALL` theo câu hỏi sẽ đọc index.
    en: Choose a `KEYS_ONLY`, `INCLUDE` or `ALL` projection from the questions that will read the index.
requires: [e-dy-l3-01]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html, title_vi: "Secondary index" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html, title_vi: "Global secondary index (GSI)" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html, title_vi: "Local secondary index (LSI)" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html, title_vi: "Hạn mức dịch vụ (quota)" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html, title_vi: "Giới hạn" }
demo_setup: |
  {"tables": [{"TableName": "Orders", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "customerId", "KeyType": "HASH"}, {"AttributeName": "orderId", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "customerId", "AttributeType": "S"}, {"AttributeName": "orderId", "AttributeType": "S"}, {"AttributeName": "status", "AttributeType": "S"}, {"AttributeName": "total", "AttributeType": "N"}], "LocalSecondaryIndexes": [{"IndexName": "byTotal", "KeySchema": [{"AttributeName": "customerId", "KeyType": "HASH"}, {"AttributeName": "total", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}], "GlobalSecondaryIndexes": [{"IndexName": "byStatus", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "orderId", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "KEYS_ONLY"}}]}],
   "items": {"Orders": [
    {"customerId": "C-01", "orderId": "2026-09-17#O-103", "status": "SHIPPED", "total": 800000, "city": "Hue"},
    {"customerId": "C-01", "orderId": "2026-10-19#O-104", "status": "NEW", "total": 120000, "city": "Hue"},
    {"customerId": "C-02", "orderId": "2026-10-03#O-108", "status": "NEW", "total": 820000, "city": "Da Nang"},
    {"customerId": "C-02", "orderId": "2026-08-26#O-106", "status": "PAID", "total": 910000, "city": "Da Nang"}
  ]}}
quiz:
  - q:
      vi: Bảng đã chạy một năm. Bạn cần tìm đơn theo `status`. Thêm loại index nào được?
      en: The table has been live for a year. You need to find orders by `status`. Which kind of index can you add?
    options:
      - vi: LSI, vì nó rẻ hơn.
        en: An LSI, because it is cheaper.
      - vi: GSI - LSI chỉ tạo được cùng lúc tạo bảng, và phải dùng chung partition key với bảng.
        en: A GSI - an LSI can only be created together with the table, and must share the table's partition key.
      - vi: Không thêm được index nào sau khi tạo bảng.
        en: No index can be added after the table is created.
    answer: 1
    trap: 0
    why:
      vi: 'LSI (local secondary index, index phụ cục bộ) có vẻ rẻ hơn vì dùng chung throughput với bảng, nhưng bảng này đã chạy một năm: LSI chỉ khai báo được lúc tạo bảng, và phải giữ partition key `customerId` của bảng, nên không đọc theo `status` được. GSI (global secondary index, index phụ toàn bảng) thêm được bất cứ lúc nào và nhận partition key tùy ý, ở đây là `status`. Câu "không thêm được index nào" sai vì thêm GSI chính là cách làm.'
      en: 'An LSI (local secondary index) looks cheaper because it shares the table''s throughput, but this table has been live for a year: an LSI can only be declared when the table is created, and it must keep the table''s partition key `customerId`, so it cannot read by `status`. A GSI (global secondary index) can be added at any time and takes any partition key, here `status`. "No index can be added" is wrong because adding a GSI is exactly how you do it.'
  - q:
      vi: Một GSI có projection `KEYS_ONLY`. Query trên GSI đó xin thêm thuộc tính `city`. Được gì?
      en: A GSI has a `KEYS_ONLY` projection. A Query on it asks for the attribute `city`. What comes back?
    options:
      - vi: '`city` được lấy tự động từ bảng gốc.'
        en: '`city` is fetched from the base table automatically.'
      - vi: 'Không có `city` - GSI chỉ trả được thuộc tính đã project. Muốn có thì GetItem bảng gốc, hoặc project thêm.'
        en: 'No `city` - a GSI can only return projected attributes. Get it with a GetItem on the base table, or project it.'
      - vi: Request lỗi vì bảng gốc đang bị giữ lock.
        en: The request fails because the base table is locked.
    answer: 1
    why:
      vi: 'GSI (global secondary index) là một bản sao riêng, chỉ chứa thuộc tính đã khai báo trong projection của index. Với `KEYS_ONLY` đó chỉ là khóa bảng và khóa index, nên item trả về không có `city`, và DynamoDB không tự đọc ngược về bảng gốc. Phương án lock không liên quan: đọc DynamoDB không chờ lock nào. Muốn có `city` thì `GetItem` bảng gốc theo khóa vừa nhận, hoặc đổi projection sang `INCLUDE` có `city`. Chỉ LSI (local secondary index) mới tự lấy thuộc tính chưa project từ bảng, và tốn thêm một lượt đọc cho việc đó.'
      en: 'A GSI (global secondary index) is a separate copy that holds only the attributes declared in the index projection. With `KEYS_ONLY` that is just the table key and the index key, so the items come back without `city`, and DynamoDB does not read back from the base table on its own. The lock option is unrelated: a DynamoDB read waits on no lock. To get `city`, `GetItem` the base table with the key you received, or change the projection to `INCLUDE` with `city`. Only an LSI (local secondary index) fetches unprojected attributes from the table itself, at the cost of an extra read.'
---
## Mở bài

Bảng `Orders` trả lời tốt "đơn của một khách theo thời gian". Giờ kho hỏi "mọi đơn đang `NEW`", còn kế toán hỏi "đơn lớn nhất của khách này". Bạn cần thêm cách đọc mà không Scan cả bảng.

## Ý chính

Index phụ là một bản sao có khóa khác của một phần dữ liệu, để thêm mẫu truy cập mà không Scan. DynamoDB có hai loại, khác nhau ở partition key và ở lúc tạo.

GSI (global secondary index): partition key và sort key tùy ý, không cần duy nhất; thêm hoặc xóa bất cứ lúc nào; cập nhật bất đồng bộ nên chỉ đọc eventually consistent; có throughput riêng, và mỗi lần ghi bảng làm đổi index thì tốn thêm WCU cho index; chỉ trả thuộc tính đã project.

LSI (local secondary index): cùng partition key với bảng, chỉ khác sort key; chỉ tạo cùng lúc tạo bảng; đọc strongly consistent được; dùng chung throughput với bảng; khi bảng có LSI, mỗi item collection tối đa 10 GB. Hạn mức: 5 LSI mỗi bảng, 20 GSI mỗi bảng (mặc định, xin tăng được), tổng 100 thuộc tính `INCLUDE` trên mọi index của bảng.

Nhiều người nghĩ GSI tự đọc ngược về bảng khi thiếu thuộc tính. Thật ra GSI chỉ có những gì đã project; muốn thêm thì project thêm hoặc `GetItem` bảng gốc. Chỉ LSI mới lấy được thuộc tính chưa project từ bảng (tốn thêm lượt đọc).

## Cú pháp

```text
"LocalSecondaryIndexes":  [{"IndexName": "<name>", "KeySchema": [<table HASH>, <other RANGE>], "Projection": {...}}]
"GlobalSecondaryIndexes": [{"IndexName": "<name>", "KeySchema": [<any HASH>, [<any RANGE>]], "Projection": {...}}]
"Projection": {"ProjectionType": "KEYS_ONLY" | "ALL" | "INCLUDE", ["NonKeyAttributes": ["<attr>", ...]]}
```

- `KEYS_ONLY`: khóa bảng và khóa index; nhỏ nhất, rẻ nhất khi ghi.
- `INCLUDE`: thêm vài thuộc tính trong `NonKeyAttributes`.
- `ALL`: cả item; đọc gì cũng có, nhưng mỗi item được lưu và ghi thêm một bản đầy đủ.
- Query một index: thêm `"IndexName"`, điều kiện dùng khóa của index.

## Ví dụ

Bảng nhỏ có LSI `byTotal` và GSI `byStatus` (`KEYS_ONLY`), chạy bằng dynoxide. Mọi đơn `NEW` qua GSI:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

Hai đơn, mỗi item chỉ có `customerId`, `orderId`, `status`: không có `total` hay `city` vì projection là `KEYS_ONLY`.

Đơn lớn nhất của `C-01` qua LSI, đọc strong:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-01"}}, "ScanIndexForward": false, "Limit": 1, "ConsistentRead": true}}
```

LSI cho phép `ConsistentRead`; item trả về có đủ thuộc tính vì `byTotal` project `ALL`.

## Lỗi hay gặp

Xin đọc nhất quán mạnh (strongly consistent) trên GSI:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}, "ConsistentRead": true}}
```

GSI nhận thay đổi của bảng bất đồng bộ, trễ một chút sau lượt ghi, nên nó không bảo đảm được đọc nhất quán mạnh và DynamoDB từ chối cả request. Cần đọc nhất quán mạnh thì đọc bảng (hoặc một LSI); trên GSI chỉ đọc nhất quán cuối (eventually consistent).

Chọn `ALL` cho mọi index "cho chắc":

```text
// WRONG: the list page needs orderId and total, the index copies whole items
"Projection": {"ProjectionType": "ALL"}
// FIX: carry only what the question reads
"Projection": {"ProjectionType": "INCLUDE", "NonKeyAttributes": ["total"]}
```

Với `ALL`, mỗi lần ghi đổi item phải ghi lại cả item vào index: lưu trữ và WCU (write capacity unit, đơn vị ghi, 1 WCU cho mỗi 1 KB) của index tăng theo cỡ item, không theo câu hỏi. Trang danh sách chỉ đọc `total`, nên `INCLUDE` chỉ chép thuộc tính đó.

## Tóm tắt

- GSI: khóa tùy ý, thêm lúc nào cũng được, chỉ đọc eventually consistent, throughput riêng.
- LSI: cùng partition key, chỉ tạo cùng bảng, đọc strong được, item collection tối đa 10 GB.
- GSI chỉ trả thuộc tính đã project; chọn projection theo câu hỏi sẽ đọc index.
- Mỗi lần ghi làm đổi index tốn thêm capacity cho index đó.

# EN

## Opening

Table `Orders` answers "a customer's orders over time" well. Now the warehouse asks for "every `NEW` order", and accounting asks for "this customer's largest order". You need more ways to read without scanning the whole table.

## Key idea

A secondary index is a copy of part of the data under a different key, so you can add an access pattern without a Scan. DynamoDB has two kinds, which differ in partition key and in when they are created.

GSI (global secondary index): any partition key and sort key, not required to be unique; added or removed at any time; updated asynchronously, so only eventually consistent reads; its own throughput, and every table write that changes the index costs extra WCU for the index; returns only projected attributes.

LSI (local secondary index): same partition key as the table, only the sort key differs; created only together with the table; supports strongly consistent reads; shares the table's throughput; when a table has an LSI, each item collection is capped at 10 GB. Quotas: 5 LSIs per table, 20 GSIs per table (default, can be raised), 100 `INCLUDE` attributes in total across all indexes of a table.

Many people think a GSI reads back from the table when an attribute is missing. In fact a GSI has only what was projected; to get more, project it or `GetItem` the base table. Only an LSI can fetch unprojected attributes from the table (at an extra read cost).

## Syntax

```text
"LocalSecondaryIndexes":  [{"IndexName": "<name>", "KeySchema": [<table HASH>, <other RANGE>], "Projection": {...}}]
"GlobalSecondaryIndexes": [{"IndexName": "<name>", "KeySchema": [<any HASH>, [<any RANGE>]], "Projection": {...}}]
"Projection": {"ProjectionType": "KEYS_ONLY" | "ALL" | "INCLUDE", ["NonKeyAttributes": ["<attr>", ...]]}
```

- `KEYS_ONLY`: the table key and the index key; smallest and cheapest to write.
- `INCLUDE`: plus a few attributes listed in `NonKeyAttributes`.
- `ALL`: the whole item; everything is readable, but each item is stored and written again in full.
- Querying an index: add `"IndexName"`, the condition uses the index's keys.

## Example

A small table with LSI `byTotal` and GSI `byStatus` (`KEYS_ONLY`), run on dynoxide. Every `NEW` order through the GSI:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

Two orders, each item holding only `customerId`, `orderId`, `status`: no `total` or `city`, because the projection is `KEYS_ONLY`.

The largest order of `C-01` through the LSI, with a strong read:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-01"}}, "ScanIndexForward": false, "Limit": 1, "ConsistentRead": true}}
```

The LSI allows `ConsistentRead`; the item comes back whole because `byTotal` projects `ALL`.

## Common mistakes

Asking for a strongly consistent read on a GSI:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}, "ConsistentRead": true}}
```

A GSI receives the table's changes asynchronously, a moment after the write, so it cannot promise a strongly consistent read and DynamoDB refuses the whole request. If you need a strongly consistent read, read the table (or an LSI); a GSI only serves eventually consistent reads.

Choosing `ALL` for every index "to be safe":

```text
// WRONG: the list page needs orderId and total, the index copies whole items
"Projection": {"ProjectionType": "ALL"}
// FIX: carry only what the question reads
"Projection": {"ProjectionType": "INCLUDE", "NonKeyAttributes": ["total"]}
```

With `ALL`, every write that changes the item writes the whole item into the index again: index storage and WCU (write capacity units, 1 WCU per 1 KB) grow with the item's size, not with the question. The list page reads only `total`, so `INCLUDE` copies just that attribute.

## Recap

- GSI: any keys, added at any time, eventually consistent reads only, its own throughput.
- LSI: same partition key, created only with the table, strong reads allowed, item collection capped at 10 GB.
- A GSI returns only projected attributes; choose the projection from the questions that read it.
- Every write that changes an index costs extra capacity for that index.
