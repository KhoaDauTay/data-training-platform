---
id: e-dy-l4-04
engine: dynamodb
level: L4
module: scale
title: "Write sharding: rải một khóa nóng bằng hậu tố ngẫu nhiên"
title_en: "Write sharding: spread a hot key with a random suffix"
kind: lab
runtime: browser
minutes: 12
objectives:
  - { vi: "Đọc một shard bằng một Query và thấy Query chỉ đọc đúng item của shard đó", en: "Read one shard with one Query and see that the Query reads only that shard's items" }
  - { vi: "Đọc lại cả ngày bằng cách liệt kê mọi shard, và hiểu giá phải trả khi đọc", en: "Read the whole day back by listing every shard, and understand the price paid on reads" }
requires: [e-dy-l4-01, e-dy-l4-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html
viz: dy-partitions
lab:
  setup: |
    {"tables": [
      {"TableName":"Votes","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}
    ], "items": {
      "Votes": [
        {"pk":"VOTE#2026-11-20#0","sk":"V#000","song":"S1"},
        {"pk":"VOTE#2026-11-20#0","sk":"V#001","song":"S2"},
        {"pk":"VOTE#2026-11-20#0","sk":"V#002","song":"S3"},
        {"pk":"VOTE#2026-11-20#0","sk":"V#003","song":"S4"},
        {"pk":"VOTE#2026-11-20#0","sk":"V#004","song":"S5"},
        {"pk":"VOTE#2026-11-20#0","sk":"V#005","song":"S1"},
        {"pk":"VOTE#2026-11-20#1","sk":"V#010","song":"S4"},
        {"pk":"VOTE#2026-11-20#1","sk":"V#011","song":"S5"},
        {"pk":"VOTE#2026-11-20#1","sk":"V#012","song":"S1"},
        {"pk":"VOTE#2026-11-20#1","sk":"V#013","song":"S2"},
        {"pk":"VOTE#2026-11-20#1","sk":"V#014","song":"S3"},
        {"pk":"VOTE#2026-11-20#1","sk":"V#015","song":"S4"},
        {"pk":"VOTE#2026-11-20#2","sk":"V#020","song":"S2"},
        {"pk":"VOTE#2026-11-20#2","sk":"V#021","song":"S3"},
        {"pk":"VOTE#2026-11-20#2","sk":"V#022","song":"S4"},
        {"pk":"VOTE#2026-11-20#2","sk":"V#023","song":"S5"},
        {"pk":"VOTE#2026-11-20#2","sk":"V#024","song":"S1"},
        {"pk":"VOTE#2026-11-20#2","sk":"V#025","song":"S2"},
        {"pk":"VOTE#2026-11-20#3","sk":"V#030","song":"S5"},
        {"pk":"VOTE#2026-11-20#3","sk":"V#031","song":"S1"},
        {"pk":"VOTE#2026-11-20#3","sk":"V#032","song":"S2"},
        {"pk":"VOTE#2026-11-20#3","sk":"V#033","song":"S3"},
        {"pk":"VOTE#2026-11-20#3","sk":"V#034","song":"S4"},
        {"pk":"VOTE#2026-11-20#3","sk":"V#035","song":"S5"},
        {"pk":"VOTE#2026-11-20#4","sk":"V#040","song":"S3"},
        {"pk":"VOTE#2026-11-20#4","sk":"V#041","song":"S4"},
        {"pk":"VOTE#2026-11-20#4","sk":"V#042","song":"S5"},
        {"pk":"VOTE#2026-11-20#4","sk":"V#043","song":"S1"},
        {"pk":"VOTE#2026-11-20#4","sk":"V#044","song":"S2"},
        {"pk":"VOTE#2026-11-20#4","sk":"V#045","song":"S3"},
        {"pk":"VOTE#2026-11-20#5","sk":"V#050","song":"S1"},
        {"pk":"VOTE#2026-11-20#5","sk":"V#051","song":"S2"},
        {"pk":"VOTE#2026-11-20#5","sk":"V#052","song":"S3"},
        {"pk":"VOTE#2026-11-20#5","sk":"V#053","song":"S4"},
        {"pk":"VOTE#2026-11-20#5","sk":"V#054","song":"S5"},
        {"pk":"VOTE#2026-11-20#5","sk":"V#055","song":"S1"},
        {"pk":"VOTE#2026-11-20#6","sk":"V#060","song":"S4"},
        {"pk":"VOTE#2026-11-20#6","sk":"V#061","song":"S5"},
        {"pk":"VOTE#2026-11-20#6","sk":"V#062","song":"S1"},
        {"pk":"VOTE#2026-11-20#6","sk":"V#063","song":"S2"},
        {"pk":"VOTE#2026-11-20#6","sk":"V#064","song":"S3"},
        {"pk":"VOTE#2026-11-20#6","sk":"V#065","song":"S4"},
        {"pk":"VOTE#2026-11-20#7","sk":"V#070","song":"S2"},
        {"pk":"VOTE#2026-11-20#7","sk":"V#071","song":"S3"},
        {"pk":"VOTE#2026-11-20#7","sk":"V#072","song":"S4"},
        {"pk":"VOTE#2026-11-20#7","sk":"V#073","song":"S5"},
        {"pk":"VOTE#2026-11-20#7","sk":"V#074","song":"S1"},
        {"pk":"VOTE#2026-11-20#7","sk":"V#075","song":"S2"},
        {"pk":"VOTE#2026-11-19#0","sk":"V#000","song":"S1"},
        {"pk":"VOTE#2026-11-19#0","sk":"V#001","song":"S2"},
        {"pk":"VOTE#2026-11-19#0","sk":"V#002","song":"S3"},
        {"pk":"VOTE#2026-11-19#0","sk":"V#003","song":"S4"},
        {"pk":"VOTE#2026-11-19#1","sk":"V#010","song":"S4"},
        {"pk":"VOTE#2026-11-19#1","sk":"V#011","song":"S5"},
        {"pk":"VOTE#2026-11-19#1","sk":"V#012","song":"S1"},
        {"pk":"VOTE#2026-11-19#1","sk":"V#013","song":"S2"},
        {"pk":"VOTE#2026-11-19#2","sk":"V#020","song":"S2"},
        {"pk":"VOTE#2026-11-19#2","sk":"V#021","song":"S3"},
        {"pk":"VOTE#2026-11-19#2","sk":"V#022","song":"S4"},
        {"pk":"VOTE#2026-11-19#2","sk":"V#023","song":"S5"},
        {"pk":"VOTE#2026-11-19#3","sk":"V#030","song":"S5"},
        {"pk":"VOTE#2026-11-19#3","sk":"V#031","song":"S1"},
        {"pk":"VOTE#2026-11-19#3","sk":"V#032","song":"S2"},
        {"pk":"VOTE#2026-11-19#3","sk":"V#033","song":"S3"},
        {"pk":"VOTE#2026-11-19#4","sk":"V#040","song":"S3"},
        {"pk":"VOTE#2026-11-19#4","sk":"V#041","song":"S4"},
        {"pk":"VOTE#2026-11-19#4","sk":"V#042","song":"S5"},
        {"pk":"VOTE#2026-11-19#4","sk":"V#043","song":"S1"},
        {"pk":"VOTE#2026-11-19#5","sk":"V#050","song":"S1"},
        {"pk":"VOTE#2026-11-19#5","sk":"V#051","song":"S2"},
        {"pk":"VOTE#2026-11-19#5","sk":"V#052","song":"S3"},
        {"pk":"VOTE#2026-11-19#5","sk":"V#053","song":"S4"},
        {"pk":"VOTE#2026-11-19#6","sk":"V#060","song":"S4"},
        {"pk":"VOTE#2026-11-19#6","sk":"V#061","song":"S5"},
        {"pk":"VOTE#2026-11-19#6","sk":"V#062","song":"S1"},
        {"pk":"VOTE#2026-11-19#6","sk":"V#063","song":"S2"},
        {"pk":"VOTE#2026-11-19#7","sk":"V#070","song":"S2"},
        {"pk":"VOTE#2026-11-19#7","sk":"V#071","song":"S3"},
        {"pk":"VOTE#2026-11-19#7","sk":"V#072","song":"S4"},
        {"pk":"VOTE#2026-11-19#7","sk":"V#073","song":"S5"}
      ]
    }}
  steps:
    - task: { vi: "Bảng `Votes` lưu phiếu bầu. Mỗi ngày được rải ra 8 shard: partition key là `VOTE#<date>#<shard>`. Đọc mọi phiếu của shard 3 ngày 2026-11-20 bằng một Query.", en: "The `Votes` table stores votes. Each day is spread over 8 shards: the partition key is `VOTE#<date>#<shard>`. Read every vote of shard 3 on 2026-11-20 with one Query." }
      solution: |
        {"op": "Query", "input": {"TableName": "Votes", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-20#3"}}}}
      check: doc
      expect: { Count: 6, ScannedCount: 6 }
      hint: { vi: "Query cần đúng một giá trị partition key: ghép ngày và số shard.", en: "A Query needs exactly one partition key value: join the day and the shard number." }
    - task: { vi: "Đọc mọi phiếu của ngày 2026-11-20 trong một câu PartiQL, liệt kê đủ 8 khóa shard để câu không thành Scan.", en: "Read every vote of 2026-11-20 in one PartiQL statement, listing all 8 shard keys so the statement does not become a Scan." }
      solution: |
        SELECT * FROM "Votes" WHERE pk IN ['VOTE#2026-11-20#0', 'VOTE#2026-11-20#1', 'VOTE#2026-11-20#2', 'VOTE#2026-11-20#3', 'VOTE#2026-11-20#4', 'VOTE#2026-11-20#5', 'VOTE#2026-11-20#6', 'VOTE#2026-11-20#7']
      check: doc
      expect: { Count: 48 }
      hint: { vi: "PartiQL chỉ tránh được Scan khi điều kiện trên partition key dùng `=` hoặc `IN`.", en: "PartiQL avoids a Scan only when the partition key condition uses `=` or `IN`." }
predict:
  sql: |
    {"op": "Scan", "input": {"TableName": "Votes", "FilterExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-20#3"}}}}
  q: { vi: "Thay Query ở bước 1 bằng Scan có FilterExpression như trên. `ScannedCount` là bao nhiêu?", en: "Replace the step 1 Query with the Scan above, which uses a FilterExpression. What is `ScannedCount`?" }
  options:
    - { vi: "6, như Query", en: "6, like the Query" }
    - { vi: "48, mọi phiếu của ngày 2026-11-20", en: "48, every vote of 2026-11-20" }
    - { vi: "80, mọi item trong bảng", en: "80, every item in the table" }
  answer: 2
  why: { vi: "Đáp án 6 nghe hợp lý vì kết quả chỉ có 6 phiếu. Nhưng Scan đọc toàn bảng (80 item của hai ngày) rồi mới lọc; `Count` vẫn là 6 nhưng bạn trả tiền cho 80 item đã đọc. Query đi thẳng tới một item collection.", en: "6 sounds right because only 6 votes come back. But a Scan reads the whole table (80 items over two days) and filters afterwards; `Count` is still 6 but you pay for the 80 items read. A Query goes straight to one item collection." }
---

## Ý chính

Khi một partition key nhận quá 1000 WCU mỗi giây, cách AWS khuyên là **mở rộng không gian khóa**: thêm một hậu tố ngẫu nhiên, ví dụ từ 1 tới 200, vào sau giá trị khóa. `2026-11-20` thành `2026-11-20.1` … `2026-11-20.200`, và tải ghi trong ngày rải đều qua nhiều partition.

Giá phải trả nằm ở phía đọc: muốn đọc cả ngày, ứng dụng phải gửi **một Query cho mỗi hậu tố** rồi tự gộp kết quả. Hậu tố ngẫu nhiên còn có một nhược điểm: muốn đọc một item cụ thể, bạn không biết nó nằm ở shard nào. Bài sau sửa chuyện đó bằng hậu tố tính được.

Chọn số shard từ phép tính ở bài 3: tổng WCU của khóa chia cho 1000, cộng thêm phần dư.

## Ví dụ

Ghi một phiếu: chọn ngẫu nhiên một số shard rồi ghép vào khóa.

```json
{"op": "PutItem", "input": {"TableName": "Votes", "Item": {"pk": {"S": "VOTE#2026-11-20#5"}, "sk": {"S": "V#055"}, "song": {"S": "S2"}}}}
```

Đọc lại cả ngày bằng PartiQL: `WHERE pk IN [...]` trên partition key không biến câu thành Scan.

## Thực hành

Bảng `Votes` có 80 item: 48 phiếu ngày 2026-11-20 (8 shard × 6) và 32 phiếu ngày 2026-11-19 (8 shard × 4). Đoán trước `ScannedCount` của Scan rồi làm hai bước.

# EN

## Key idea

When one partition key gets more than 1000 WCU per second, the AWS advice is to **expand the key space**: append a random suffix, for example 1 to 200, to the key value. `2026-11-20` becomes `2026-11-20.1` … `2026-11-20.200`, and the day's writes spread evenly over many partitions.

The price is paid on reads: to read the whole day, the application must send **one Query per suffix** and merge the results itself. A random suffix has a second drawback: to read one specific item you do not know which shard holds it. The next lesson fixes that with a calculated suffix.

Pick the shard count with the arithmetic from lesson 3: the key's total WCU divided by 1000, plus headroom.

## Example

Writing a vote: pick a random shard number and append it to the key.

```json
{"op": "PutItem", "input": {"TableName": "Votes", "Item": {"pk": {"S": "VOTE#2026-11-20#5"}, "sk": {"S": "V#055"}, "song": {"S": "S2"}}}}
```

Reading the whole day back in PartiQL: `WHERE pk IN [...]` on the partition key does not turn the statement into a Scan.

## Practice

The `Votes` table holds 80 items: 48 votes on 2026-11-20 (8 shards × 6) and 32 votes on 2026-11-19 (8 shards × 4). Guess the Scan's `ScannedCount` first, then do the two steps.
