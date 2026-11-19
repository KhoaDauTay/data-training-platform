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
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "Hồ sơ có sort key `STU#s02`, lượt ghi danh có sort key bắt đầu bằng `CRS#`.", en: "The profile's sort key is `STU#s02`; enrolments have a sort key starting with `CRS#`." }
    - task: { vi: "Đi chiều ngược lại: đọc mọi học viên của khóa `CRS#c3` qua GSI `ByTarget` (partition key của GSI là `sk` của bảng, sort key là `pk`), không lấy item mô tả khóa học.", en: "Walk the other way: read every student of course `CRS#c3` through the GSI `ByTarget` (its partition key is the table's `sk`, its sort key is `pk`), without the course's own item." }
      solution: |
        {"op": "Query", "input": {"TableName": "School", "IndexName": "ByTarget", "KeyConditionExpression": "sk = :c AND begins_with(pk, :s)", "ExpressionAttributeValues": {":c": {"S": "CRS#c3"}, ":s": {"S": "STU#"}}}}
      check: doc
      expect: { Count: 4, ScannedCount: 4 }
      hint: { vi: "Trên GSI, `sk` là partition key: điều kiện bằng đặt lên `sk`, `begins_with` đặt lên `pk`.", en: "On the GSI, `sk` is the partition key: put the equality on `sk` and `begins_with` on `pk`." }
---

## Ý chính

Quan hệ nhiều-nhiều (học viên ↔ khóa học, hóa đơn ↔ khoản phí) không có bảng nối như SQL. **Adjacency list** lưu mọi thứ trong một bảng:

- mỗi thực thể chính (nút) là một partition key, có một item mô tả chính nó (`pk = sk`);
- mỗi quan hệ (cạnh) là một item trong partition của nút nguồn, với **sort key là mã nút đích**;
- một **GSI đảo** (partition key = `sk` của bảng, sort key = `pk`) cho phép đi chiều ngược lại.

Mỗi chiều là đúng một Query: "khóa học của một học viên" đọc partition của học viên; "học viên của một khóa" đọc partition của khóa trên GSI. Tiền tố thực thể (`STU#`, `CRS#`) cùng `begins_with` tách item mô tả khỏi các cạnh.

## Ví dụ

```text
pk        sk        attrs
STU#s02   STU#s02   name = Binh          (node)
STU#s02   CRS#c1    enrolled = ...       (edge s02 -> c1)
STU#s02   CRS#c3    enrolled = ...       (edge s02 -> c3)
CRS#c3    CRS#c3    title = ...          (node)

GSI ByTarget: hash = sk, range = pk
CRS#c3 -> STU#s02, STU#s03, ... , CRS#c3
```

## Thực hành

Bảng có 6 học viên, 4 khóa học và 12 lượt ghi danh (22 item).

# EN

## Key idea

A many-to-many relation (students ↔ courses, invoices ↔ bills) has no join table as in SQL. An **adjacency list** keeps everything in one table:

- each top-level entity (node) is a partition key, with one item describing itself (`pk = sk`);
- each relation (edge) is an item in the source node's partition, with the **sort key set to the target node's id**;
- an **inverted GSI** (partition key = the table's `sk`, sort key = `pk`) lets you walk the opposite direction.

Each direction is exactly one Query: "a student's courses" reads the student's partition; "a course's students" reads the course's partition on the GSI. Entity prefixes (`STU#`, `CRS#`) with `begins_with` separate the describing item from the edges.

## Example

```text
pk        sk        attrs
STU#s02   STU#s02   name = Binh          (node)
STU#s02   CRS#c1    enrolled = ...       (edge s02 -> c1)
STU#s02   CRS#c3    enrolled = ...       (edge s02 -> c3)
CRS#c3    CRS#c3    title = ...          (node)

GSI ByTarget: hash = sk, range = pk
CRS#c3 -> STU#s02, STU#s03, ... , CRS#c3
```

## Practice

The table holds 6 students, 4 courses and 12 enrolments (22 items).
