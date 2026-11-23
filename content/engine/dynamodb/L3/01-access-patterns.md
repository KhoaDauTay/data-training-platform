---
id: e-dy-l3-01
engine: dynamodb
level: L3
module: secondary
title: "Mẫu truy cập trước, khóa sau"
title_en: "Access patterns first, keys second"
kind: concept
runtime: docs
minutes: 10
objectives:
  - vi: Liệt kê mẫu truy cập của một ứng dụng trước khi chọn khóa.
    en: List an application's access patterns before choosing keys.
  - vi: Áp dụng các nguyên tắc thiết kế của AWS - ít bảng, dữ liệu liên quan nằm cạnh nhau, dùng thứ tự sort, rải tải.
    en: Apply the AWS design principles - few tables, related data kept together, sort order used, load spread out.
  - vi: Đổi mỗi mẫu truy cập thành một `GetItem` hoặc một `Query`, không phải Scan.
    en: Turn each access pattern into one `GetItem` or one `Query`, not a Scan.
requires: [e-dy-l2-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
demo_setup: |
  {"tables": [{"TableName": "Shop", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"}]}],
   "items": {"Shop": [
    {"PK": "CUST#C-01", "SK": "PROFILE", "name": "An"},
    {"PK": "CUST#C-01", "SK": "ORDER#2026-08-26#O-501", "total": 160000},
    {"PK": "CUST#C-01", "SK": "ORDER#2026-09-08#O-502", "total": 380000},
    {"PK": "CUST#C-02", "SK": "PROFILE", "name": "Binh"},
    {"PK": "CUST#C-02", "SK": "ORDER#2026-08-28#O-503", "total": 355000},
    {"PK": "ORDER#O-501", "SK": "PRODUCT#P-04", "qty": 2}
  ]}}
quiz:
  - q:
      vi: Theo AWS, bước đầu tiên khi thiết kế bảng DynamoDB là gì?
      en: According to AWS, what is the first step when designing a DynamoDB table?
    options:
      - vi: Vẽ sơ đồ thực thể chuẩn hóa như SQL, rồi mỗi thực thể một bảng.
        en: Draw a normalised entity diagram as in SQL, then one table per entity.
      - vi: Hiểu các mẫu truy cập (câu hỏi ứng dụng sẽ hỏi) trước, rồi mới thiết kế khóa.
        en: Understand the access patterns (the questions the app will ask) first, then design the keys.
      - vi: Tạo bảng với khóa tự tăng rồi thêm index sau.
        en: Create a table with an auto-increment key and add indexes later.
    answer: 1
    trap: 0
    why:
      vi: Nghe hợp lý vì đó là cách làm quen với SQL, nhưng DynamoDB không có JOIN để ghép các bảng chuẩn hóa lúc đọc. AWS khuyên không thiết kế schema khi chưa biết những câu hỏi nó cần trả lời; mẫu truy cập quyết định khóa và index.
      en: It sounds right because that is the familiar SQL way, but DynamoDB has no JOIN to put normalised tables back together at read time. AWS advises not to design the schema until you know the questions it must answer; access patterns decide the keys and indexes.
  - q:
      vi: Partition key nào dễ gây partition nóng nhất cho bảng đơn hàng có hàng triệu đơn mỗi ngày?
      en: Which partition key is most likely to create a hot partition for an order table with millions of orders a day?
    options:
      - vi: '`customerId`'
        en: '`customerId`'
      - vi: '`orderDate` (ví dụ `2026-10-31`)'
        en: '`orderDate` (for example `2026-10-31`)'
      - vi: '`orderId`'
        en: '`orderId`'
    answer: 1
    why:
      vi: Mọi đơn của cùng một ngày dồn vào một giá trị partition key, nên một partition gánh toàn bộ lượt ghi của ngày đó. Khóa có nhiều giá trị khác nhau và được truy cập đều thì rải tải tốt hơn.
      en: Every order of the same day lands on one partition key value, so one partition takes all of that day's writes. Keys with many distinct, evenly used values spread the load better.
---
## Mở bài

Bạn quen thiết kế bảng chuẩn hóa trước rồi hỏi gì cũng được nhờ JOIN. Sang DynamoDB, đội bạn tạo năm bảng theo năm thực thể, và trang khách hàng phải gọi năm request. Thiếu bước nào ở đầu?

## Ý chính

Với SQL, bạn chuẩn hóa dữ liệu trước rồi viết câu hỏi nào cũng được. Với DynamoDB thì ngược lại: liệt kê câu hỏi trước (mẫu truy cập: ai hỏi gì, theo khóa nào, bao nhiêu lần mỗi giây), rồi chọn khóa để mỗi câu hỏi là một `GetItem` hoặc một `Query`. Câu hỏi nào chỉ trả lời được bằng Scan là dấu hiệu thiết kế còn thiếu.

Bốn nguyên tắc từ hướng dẫn thiết kế của AWS: ít bảng nhất có thể (phần lớn ứng dụng chỉ cần một bảng); dữ liệu đọc cùng nhau thì nằm cạnh nhau, trong cùng một item collection (mọi item chung một giá trị partition key); dùng thứ tự sort key để gom và sắp những thứ liên quan; rải tải bằng partition key có nhiều giá trị, mỗi giá trị được dùng tương đối đều.

Nhiều người nghĩ cứ tạo bảng rồi thêm index khi cần, như trong SQL. Thật ra index phụ của DynamoDB cũng phải chọn khóa trước, và mỗi GSI tốn thêm capacity khi ghi. Mẫu truy cập xuất hiện sau khi ra mắt vẫn thêm được bằng GSI (bài kế tiếp), nhưng danh sách ban đầu mới quyết định bảng chính.

## Cú pháp

```text
<access pattern>                 -> <operation> <key condition>
one customer profile             -> GetItem  PK = CUST#<id>, SK = PROFILE
a customer's orders over time    -> Query    PK = CUST#<id>, begins_with(SK, ORDER#)
```

- Mỗi dòng là một câu hỏi của ứng dụng và đúng một thao tác.
- `GetItem`: đủ cả partition key và sort key, trả tối đa một item.
- `Query`: bằng trên partition key, thêm tối đa một điều kiện trên sort key.
- Không có dòng nào là Scan.

## Ví dụ

Bảng mẫu truy cập của tiệm trà trong các bài sau:

```text
1. One customer profile            -> GetItem  PK = CUST#id, SK = PROFILE
2. A customer's orders over time  -> Query    PK = CUST#id, SK begins_with ORDER#
3. The lines of one order          -> Query    PK = ORDER#id
4. Orders that contain a product   -> Query    GSI1 PK = PRODUCT#id
5. Stores in one district          -> Query    PK = STORE, SK begins_with VN#DA-NANG#HAI-CHAU#
6. Open orders by city             -> Query    sparse GSI
```

Mẫu 1 trên một bảng nhỏ, chạy bằng dynoxide:

```json
{"op": "GetItem", "input": {"TableName": "Shop", "Key": {"PK": {"S": "CUST#C-01"}, "SK": {"S": "PROFILE"}}}}
```

Mẫu 2, đơn của `C-01` theo thời gian:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-01"}, ":o": {"S": "ORDER#"}}}}
```

Hai đơn, đã sắp theo ngày nhờ sort key.

## Lỗi hay gặp

Trả lời một mẫu truy cập bằng Scan có lọc:

```json
// WRONG: same orders, but every item of the table is read
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-01"}, ":o": {"S": "ORDER#"}}}}
```

```json
// FIX: the keys were chosen for this question, so it is one Query
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-01"}, ":o": {"S": "ORDER#"}}}}
```

Cùng hai đơn, nhưng `ScannedCount` của Scan là cả bảng (6), của Query là 2.

Chọn partition key có ít giá trị:

```text
// WRONG: every order of one day shares one partition key value
PK = 2026-10-31   SK = ORDER#O-901
// FIX: many distinct values, the date moves into the sort key
PK = CUST#C-01    SK = ORDER#2026-10-31#O-901
```

Mọi lượt ghi trong ngày dồn vào một partition và chạm trần của nó, dù cả bảng còn dư capacity.

## Tóm tắt

- Liệt kê mẫu truy cập trước, chọn khóa sau.
- Mỗi mẫu truy cập là một `GetItem` hoặc một `Query`, không phải Scan.
- Dữ liệu đọc cùng nhau nằm trong cùng item collection; thứ tự sort key gom và sắp chúng.
- Partition key cần nhiều giá trị được dùng đều để rải tải.

# EN

## Opening

You are used to designing normalised tables first and asking anything later thanks to JOIN. On DynamoDB your team creates five tables for five entities, and the customer page needs five requests. Which step was missing at the start?

## Key idea

With SQL you normalise the data first and can then ask any question. DynamoDB works the other way round: list the questions first (access patterns: who asks what, by which key, how many times a second), then pick keys so that each question is one `GetItem` or one `Query`. A question that only a Scan can answer is a sign the design is not finished.

Four principles from the AWS design guide: as few tables as possible (most applications need only one table); data read together lives together, in the same item collection (every item sharing one partition key value); use sort key order to group and sort related things; spread the load with a partition key that has many values, each used fairly evenly.

Many people think you can create the table and add indexes when needed, as in SQL. In fact DynamoDB secondary indexes also need their keys chosen up front, and every GSI costs extra capacity on writes. A pattern that appears after launch can still be added with a GSI (next lesson), but the first list is what decides the base table.

## Syntax

```text
<access pattern>                 -> <operation> <key condition>
one customer profile             -> GetItem  PK = CUST#<id>, SK = PROFILE
a customer's orders over time    -> Query    PK = CUST#<id>, begins_with(SK, ORDER#)
```

- Each line is one application question and exactly one operation.
- `GetItem`: the full partition key and sort key, at most one item.
- `Query`: equality on the partition key, plus at most one condition on the sort key.
- No line is a Scan.

## Example

The access pattern table of the tea shop in the next lessons:

```text
1. One customer profile            -> GetItem  PK = CUST#id, SK = PROFILE
2. A customer's orders over time  -> Query    PK = CUST#id, SK begins_with ORDER#
3. The lines of one order          -> Query    PK = ORDER#id
4. Orders that contain a product   -> Query    GSI1 PK = PRODUCT#id
5. Stores in one district          -> Query    PK = STORE, SK begins_with VN#DA-NANG#HAI-CHAU#
6. Open orders by city             -> Query    sparse GSI
```

Pattern 1 on a small table, run on dynoxide:

```json
{"op": "GetItem", "input": {"TableName": "Shop", "Key": {"PK": {"S": "CUST#C-01"}, "SK": {"S": "PROFILE"}}}}
```

Pattern 2, the orders of `C-01` over time:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-01"}, ":o": {"S": "ORDER#"}}}}
```

Two orders, already sorted by date thanks to the sort key.

## Common mistakes

Answering an access pattern with a filtered Scan:

```json
// WRONG: same orders, but every item of the table is read
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-01"}, ":o": {"S": "ORDER#"}}}}
```

```json
// FIX: the keys were chosen for this question, so it is one Query
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :o)", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-01"}, ":o": {"S": "ORDER#"}}}}
```

The same two orders, but the Scan's `ScannedCount` is the whole table (6), the Query's is 2.

Choosing a partition key with few values:

```text
// WRONG: every order of one day shares one partition key value
PK = 2026-10-31   SK = ORDER#O-901
// FIX: many distinct values, the date moves into the sort key
PK = CUST#C-01    SK = ORDER#2026-10-31#O-901
```

Every write of the day lands on one partition and hits its ceiling, even when the table as a whole has capacity to spare.

## Recap

- List the access patterns first, choose the keys second.
- Each access pattern is one `GetItem` or one `Query`, not a Scan.
- Data read together sits in the same item collection; sort key order groups and sorts it.
- A partition key needs many evenly used values to spread the load.
