---
id: e-dy-l4-07
engine: dynamodb
level: L4
module: patterns
title: "Adjacency list: quan hệ nhiều-nhiều trong một bảng"
title_en: "Adjacency list: many-to-many in one table"
kind: lab
runtime: browser
minutes: 12
objectives:
  - { vi: "Lưu nút và cạnh của quan hệ nhiều-nhiều trong cùng một bảng", en: "Store the nodes and edges of a many-to-many relation in the same table" }
  - { vi: "Đi chiều ngược lại bằng một GSI đảo partition key và sort key", en: "Walk the opposite direction with a GSI that swaps the partition key and sort key" }
  - { vi: "Thêm một cạnh bằng một lần ghi, và thấy cả hai chiều cùng có nó", en: "Add an edge with one write, and see both directions pick it up" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
viz: dy-single-table
lab:
  setup: |
    {"tables": [
      {"TableName":"School","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST","GlobalSecondaryIndexes":[{"IndexName":"ByTarget","KeySchema":[{"AttributeName":"sk","KeyType":"HASH"},{"AttributeName":"pk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}
    ], "items": {
      "School": [
        {"pk":"STU#s01","sk":"STU#s01","name":"An"},
        {"pk":"STU#s02","sk":"STU#s02","name":"Binh"},
        {"pk":"STU#s03","sk":"STU#s03","name":"Chi"},
        {"pk":"STU#s04","sk":"STU#s04","name":"Dung"},
        {"pk":"STU#s05","sk":"STU#s05","name":"Giang"},
        {"pk":"STU#s06","sk":"STU#s06","name":"Hoa"},
        {"pk":"CRS#c1","sk":"CRS#c1","title":"Data modelling"},
        {"pk":"CRS#c2","sk":"CRS#c2","title":"Query design"},
        {"pk":"CRS#c3","sk":"CRS#c3","title":"Capacity planning"},
        {"pk":"CRS#c4","sk":"CRS#c4","title":"Streams"},
        {"pk":"STU#s01","sk":"CRS#c1","enrolled":"2026-08-01"},
        {"pk":"STU#s01","sk":"CRS#c2","enrolled":"2026-08-02"},
        {"pk":"STU#s02","sk":"CRS#c1","enrolled":"2026-09-01"},
        {"pk":"STU#s02","sk":"CRS#c3","enrolled":"2026-09-03"},
        {"pk":"STU#s02","sk":"CRS#c4","enrolled":"2026-09-04"},
        {"pk":"STU#s03","sk":"CRS#c3","enrolled":"2026-07-03"},
        {"pk":"STU#s04","sk":"CRS#c2","enrolled":"2026-08-02"},
        {"pk":"STU#s04","sk":"CRS#c3","enrolled":"2026-08-03"},
        {"pk":"STU#s05","sk":"CRS#c1","enrolled":"2026-09-01"},
        {"pk":"STU#s05","sk":"CRS#c4","enrolled":"2026-09-04"},
        {"pk":"STU#s06","sk":"CRS#c3","enrolled":"2026-07-03"},
        {"pk":"STU#s06","sk":"CRS#c4","enrolled":"2026-07-04"}
      ]
    }}
  steps:
    - task: { vi: "Bảng `School` lưu học viên (`STU#…`), khóa học (`CRS#…`) và các lượt ghi danh: item có partition key là học viên, sort key là khóa học. Đọc mọi khóa học mà học viên `STU#s02` đã ghi danh, không lấy item hồ sơ của học viên.", en: "The `School` table stores students (`STU#…`), courses (`CRS#…`) and enrolments: an item whose partition key is the student and whose sort key is the course. Read every course that student `STU#s02` is enrolled in, without the student's own profile item." }
      solution: |
        {"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "pk = :s AND begins_with(sk, :c)", "ExpressionAttributeValues": {":s": {"S": "STU#s02"}, ":c": {"S": "CRS#"}}}}
      check: doc
      perf: { table: School }
      slow: |
        {"op":"Scan","input":{"TableName":"School","ExpressionAttributeValues":{":s":{"S":"STU#s02"},":c":{"S":"CRS#"}},"FilterExpression":"(pk = :s AND begins_with(sk, :c))"}}
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "Hồ sơ có sort key `STU#s02`, lượt ghi danh có sort key bắt đầu bằng `CRS#`.", en: "The profile's sort key is `STU#s02`; enrolments have a sort key starting with `CRS#`." }
    - task: { vi: "Đi chiều ngược lại: đọc mọi học viên của khóa `CRS#c3` qua GSI `ByTarget` (partition key của GSI là `sk` của bảng, sort key là `pk`), không lấy item mô tả khóa học.", en: "Walk the other way: read every student of course `CRS#c3` through the GSI `ByTarget` (its partition key is the table's `sk`, its sort key is `pk`), without the course's own item." }
      solution: |
        {"op": "Query", "input": {"TableName": "School", "IndexName": "ByTarget", "KeyConditionExpression": "sk = :c AND begins_with(pk, :s)", "ExpressionAttributeValues": {":c": {"S": "CRS#c3"}, ":s": {"S": "STU#"}}}}
      check: doc
      perf: { table: School }
      slow: |
        {"op":"Scan","input":{"TableName":"School","IndexName":"ByTarget","ExpressionAttributeValues":{":c":{"S":"CRS#c3"},":s":{"S":"STU#"}},"FilterExpression":"(sk = :c AND begins_with(pk, :s))"}}
      expect: { Count: 4, ScannedCount: 4 }
      hint: { vi: "Trên GSI, `sk` là partition key: điều kiện bằng đặt lên `sk`, `begins_with` đặt lên `pk`.", en: "On the GSI, `sk` is the partition key: put the equality on `sk` and `begins_with` on `pk`." }
    - task: { vi: "Học viên `STU#s03` ghi danh khóa `CRS#c1` ngày 2026-10-01. Ghi đúng một item cạnh, với thuộc tính `enrolled`.", en: "Student `STU#s03` enrols in course `CRS#c1` on 2026-10-01. Write exactly one edge item, with the attribute `enrolled`." }
      solution: |
        {"op": "PutItem", "input": {"TableName": "School", "Item": {"pk": {"S": "STU#s03"}, "sk": {"S": "CRS#c1"}, "enrolled": {"S": "2026-10-01"}}}}
      check: doc
      hint: { vi: "Cạnh nằm trong partition của học viên, sort key là khóa học. GSI tự có bản sao để đi chiều ngược lại.", en: "The edge lives in the student's partition, with the course as sort key. The GSI gets its own copy for the other direction." }
quiz:
  - q: { vi: "Muốn biết cả \"khóa học của một học viên\" lẫn \"học viên của một khóa\". Với adjacency list, cần lưu mỗi lượt ghi danh mấy lần?", en: "You need both \"a student's courses\" and \"a course's students\". With an adjacency list, how many times do you store each enrolment?" }
    options:
      - { vi: "Hai lần, một item cho mỗi chiều", en: "Twice, one item per direction" }
      - { vi: "Một lần; GSI đảo khóa tự giữ bản sao cho chiều ngược lại", en: "Once; the inverted GSI keeps its own copy for the other direction" }
      - { vi: "Không cần lưu, DynamoDB tự nối hai bảng", en: "No need, DynamoDB joins the two tables itself" }
    answer: 1
    trap: 0
    why: { vi: "Hai item nghe hợp lý vì mỗi chiều là một Query riêng, nhưng ghi hai lần thì phải giữ hai bản khớp nhau bằng tay. Ứng dụng chỉ ghi một item cạnh (`pk` = học viên, `sk` = khóa học); GSI (global secondary index, index phụ toàn bảng) `ByTarget` lấy `sk` làm partition key, và DynamoDB tự chép item sang GSI mỗi khi bảng đổi, theo kiểu nhất quán cuối (eventually consistent). DynamoDB không nối bảng như SQL, nên \"tự nối\" không có.", en: "Two items sounds right because each direction is its own Query, but writing twice means keeping two copies in sync by hand. The application writes one edge item (`pk` = student, `sk` = course); the GSI (global secondary index) `ByTarget` uses `sk` as its partition key, and DynamoDB copies the item to the GSI itself whenever the table changes, eventually consistent. DynamoDB has no SQL-style join, so \"joins by itself\" does not exist." }
  - q: { vi: "Query `pk = STU#s02` không có điều kiện trên sort key trả mấy item?", en: "How many items does a Query on `pk = STU#s02` with no sort key condition return?" }
    options:
      - { vi: "3, các khóa học", en: "3, the courses" }
      - { vi: "4: hồ sơ học viên cùng 3 cạnh, vì chúng chung partition key", en: "4: the student profile plus 3 edges, since they share the partition key" }
      - { vi: "22, cả bảng", en: "22, the whole table" }
    answer: 1
    why: { vi: "3 nghe hợp lý vì `STU#s02` ghi danh 3 khóa, nhưng item hồ sơ của học viên có `pk = sk = STU#s02`, nằm chung item collection (nhóm item cùng partition key) với 3 cạnh. Query không điều kiện sort key trả cả collection: 1 + 3 = 4. Nó không trả 22 item của cả bảng, vì Query chỉ đọc đúng một partition key. Thêm `begins_with(sk, :c)` với `CRS#` để chỉ lấy cạnh.", en: "3 sounds right because `STU#s02` is enrolled in 3 courses, but the student's profile item has `pk = sk = STU#s02` and sits in the same item collection (the items sharing a partition key) as the 3 edges. A Query with no sort key condition returns the whole collection: 1 + 3 = 4. It does not return the table's 22 items, because a Query reads exactly one partition key. Add `begins_with(sk, :c)` with `CRS#` to get only the edges." }
---
## Mở bài

Một học viên học nhiều khóa, một khóa có nhiều học viên. Trong SQL bạn thêm bảng nối; DynamoDB không nối bảng. Làm sao trả lời cả hai câu "khóa của học viên này" và "học viên của khóa này", mỗi câu bằng một request?

## Ý chính

Adjacency list lưu nút và cạnh trong cùng một bảng. Mỗi thực thể chính (nút) là một partition key, có một item mô tả chính nó (`pk = sk`). Mỗi quan hệ (cạnh) là một item trong partition của nút nguồn, với sort key là mã nút đích. Một GSI đảo (partition key = `sk` của bảng, sort key = `pk`) cho phép đi chiều ngược lại.

Mỗi chiều là đúng một Query: "khóa của một học viên" đọc partition của học viên; "học viên của một khóa" đọc partition của khóa trên GSI. Tiền tố thực thể (`STU#`, `CRS#`) cùng `begins_with` tách item mô tả khỏi các cạnh. Thuộc tính của quan hệ (ngày ghi danh) nằm ngay trên item cạnh.

Nhiều người nghĩ phải ghi mỗi cạnh hai lần, một lần cho mỗi chiều. Thật ra ứng dụng ghi một item; DynamoDB tự chép nó sang GSI. Cái giá: GSI chỉ nhất quán cuối cùng, nên một lượt ghi danh vừa ghi có thể chưa hiện ở chiều ngược lại trong khoảnh khắc.

Lab chạy bằng dynoxide trong trình duyệt.

## Cú pháp

```text
node:  pk = "<TYPE>#<id>", sk = "<TYPE>#<id>"
edge:  pk = <source node>,  sk = <target node>, plus relation attributes
GSI:   {"IndexName": "ByTarget", "KeySchema": [{"AttributeName": "sk", "KeyType": "HASH"}, {"AttributeName": "pk", "KeyType": "RANGE"}]}
query: "pk = :src AND begins_with(sk, :targetType)"   (table)
       "sk = :dst AND begins_with(pk, :sourceType)"   (IndexName: ByTarget)
```

- Tiền tố loại trong khóa cho phép `begins_with` chọn đúng loại item.
- Trên GSI, vai trò hai thuộc tính đảo ngược.
- Ghi một cạnh = một PutItem; GSI theo sau.

## Ví dụ

Khóa học của `STU#s01`:

```json
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "pk = :s AND begins_with(sk, :c)", "ExpressionAttributeValues": {":s": {"S": "STU#s01"}, ":c": {"S": "CRS#"}}}}
```

Hai cạnh: `CRS#c1` và `CRS#c2`.

Học viên của `CRS#c4`, đi qua GSI:

```json
{"op": "Query", "input": {"TableName": "School", "IndexName": "ByTarget", "KeyConditionExpression": "sk = :c AND begins_with(pk, :s)", "ExpressionAttributeValues": {":c": {"S": "CRS#c4"}, ":s": {"S": "STU#"}}}}
```

Ba học viên: `s02`, `s05`, `s06`.

Hình dạng các item:

```text
pk        sk        attrs
STU#s02   STU#s02   name = Binh          (node)
STU#s02   CRS#c1    enrolled = ...       (edge s02 -> c1)
CRS#c3    CRS#c3    title = ...          (node)
```

## Lỗi hay gặp

Quên tách item mô tả khỏi cạnh:

```json
// WRONG: the profile comes back with the courses
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "pk = :s", "ExpressionAttributeValues": {":s": {"S": "STU#s02"}}}}
```

```json
// FIX: only items whose sort key is a course
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "pk = :s AND begins_with(sk, :c)", "ExpressionAttributeValues": {":s": {"S": "STU#s02"}, ":c": {"S": "CRS#"}}}}
```

Câu sai trả 4 item, trong đó một item không phải khóa học.

Đi chiều ngược lại trên chính bảng:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "sk = :c", "ExpressionAttributeValues": {":c": {"S": "CRS#c3"}}}}
```

Trên bảng, `sk` là sort key nên không đứng một mình trong điều kiện khóa. Thêm `"IndexName": "ByTarget"`, nơi `sk` là partition key.

## Thực hành

Bảng có 6 học viên, 4 khóa học và 12 lượt ghi danh (22 item). Đọc khóa của một học viên, đọc học viên của một khóa qua GSI, rồi ghi một lượt ghi danh mới.

## Tóm tắt

- Nút: `pk = sk`; cạnh: `pk` = nút nguồn, `sk` = nút đích.
- GSI đảo `sk`/`pk` cho chiều ngược lại; mỗi chiều là một Query.
- `begins_with` trên tiền tố loại tách item mô tả khỏi cạnh.
- Mỗi cạnh ghi một lần; GSI theo sau, nhất quán cuối cùng.

# EN

## Opening

A student takes many courses, and a course has many students. In SQL you add a join table; DynamoDB does not join tables. How do you answer both "this student's courses" and "this course's students", each with one request?

## Key idea

An adjacency list keeps nodes and edges in the same table. Each top-level entity (node) is a partition key, with one item describing itself (`pk = sk`). Each relation (edge) is an item in the source node's partition, with the target node's id as its sort key. An inverted GSI (partition key = the table's `sk`, sort key = `pk`) lets you walk the opposite direction.

Each direction is exactly one Query: "a student's courses" reads the student's partition; "a course's students" reads the course's partition on the GSI. Entity prefixes (`STU#`, `CRS#`) with `begins_with` separate the describing item from the edges. The relation's own attributes (the enrolment date) live right on the edge item.

Many people think each edge must be written twice, once per direction. In fact the application writes one item; DynamoDB copies it to the GSI. The price: a GSI is only eventually consistent, so an enrolment just written may not show in the other direction for a moment.

The lab runs on dynoxide in the browser.

## Syntax

```text
node:  pk = "<TYPE>#<id>", sk = "<TYPE>#<id>"
edge:  pk = <source node>,  sk = <target node>, plus relation attributes
GSI:   {"IndexName": "ByTarget", "KeySchema": [{"AttributeName": "sk", "KeyType": "HASH"}, {"AttributeName": "pk", "KeyType": "RANGE"}]}
query: "pk = :src AND begins_with(sk, :targetType)"   (table)
       "sk = :dst AND begins_with(pk, :sourceType)"   (IndexName: ByTarget)
```

- A type prefix in the key lets `begins_with` pick the right item type.
- On the GSI, the two attributes swap roles.
- Writing an edge = one PutItem; the GSI follows.

## Example

The courses of `STU#s01`:

```json
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "pk = :s AND begins_with(sk, :c)", "ExpressionAttributeValues": {":s": {"S": "STU#s01"}, ":c": {"S": "CRS#"}}}}
```

Two edges: `CRS#c1` and `CRS#c2`.

The students of `CRS#c4`, through the GSI:

```json
{"op": "Query", "input": {"TableName": "School", "IndexName": "ByTarget", "KeyConditionExpression": "sk = :c AND begins_with(pk, :s)", "ExpressionAttributeValues": {":c": {"S": "CRS#c4"}, ":s": {"S": "STU#"}}}}
```

Three students: `s02`, `s05`, `s06`.

The shape of the items:

```text
pk        sk        attrs
STU#s02   STU#s02   name = Binh          (node)
STU#s02   CRS#c1    enrolled = ...       (edge s02 -> c1)
CRS#c3    CRS#c3    title = ...          (node)
```

## Common mistakes

Forgetting to separate the describing item from the edges:

```json
// WRONG: the profile comes back with the courses
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "pk = :s", "ExpressionAttributeValues": {":s": {"S": "STU#s02"}}}}
```

```json
// FIX: only items whose sort key is a course
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "pk = :s AND begins_with(sk, :c)", "ExpressionAttributeValues": {":s": {"S": "STU#s02"}, ":c": {"S": "CRS#"}}}}
```

The wrong query returns 4 items, one of which is not a course.

Walking the other direction on the table itself:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "School", "KeyConditionExpression": "sk = :c", "ExpressionAttributeValues": {":c": {"S": "CRS#c3"}}}}
```

On the table, `sk` is the sort key, so it cannot stand alone in a key condition. Add `"IndexName": "ByTarget"`, where `sk` is the partition key.

## Practice

The table holds 6 students, 4 courses and 12 enrolments (22 items). Read a student's courses, read a course's students through the GSI, then write a new enrolment.

## Recap

- Node: `pk = sk`; edge: `pk` = source node, `sk` = target node.
- A GSI swapping `sk`/`pk` gives the other direction; each direction is one Query.
- `begins_with` on the type prefix separates the describing item from the edges.
- Each edge is written once; the GSI follows, eventually consistent.
