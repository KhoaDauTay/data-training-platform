---
id: e-dy-l4-05
engine: dynamodb
level: L4
module: scale
title: "Hậu tố tính được: shard mà vẫn GetItem được"
title_en: "Calculated suffix: sharded, yet still one GetItem away"
kind: lab
runtime: browser
minutes: 10
objectives:
  - { vi: "Tính shard của một item từ chính thuộc tính bạn hay tra cứu", en: "Compute an item's shard from the attribute you look it up by" }
  - { vi: "Đọc thẳng một item bằng GetItem thay vì hỏi mọi shard", en: "Read one item directly with GetItem instead of asking every shard" }
requires: [e-dy-l4-04]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
viz: dy-partitions
lab:
  setup: |
    {"tables": [
      {"TableName":"Orders","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}
    ], "items": {
      "Orders": [
        {"pk":"ORD#2026-11-20#1","sk":"O-1001","customer":"C01","total":570000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1002","customer":"C08","total":940000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1003","customer":"C02","total":410000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1004","customer":"C09","total":780000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1005","customer":"C03","total":250000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1006","customer":"C10","total":620000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1007","customer":"C04","total":990000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1008","customer":"C11","total":460000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1009","customer":"C05","total":830000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1010","customer":"C12","total":300000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1011","customer":"C06","total":670000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1012","customer":"C13","total":140000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1013","customer":"C07","total":510000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1014","customer":"C01","total":880000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1015","customer":"C08","total":350000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1016","customer":"C02","total":720000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1017","customer":"C09","total":190000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1018","customer":"C03","total":560000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1019","customer":"C10","total":930000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1020","customer":"C04","total":400000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1021","customer":"C11","total":770000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1022","customer":"C05","total":240000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1023","customer":"C12","total":610000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1024","customer":"C06","total":980000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1025","customer":"C13","total":450000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1026","customer":"C07","total":820000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1027","customer":"C01","total":290000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1028","customer":"C08","total":660000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1029","customer":"C02","total":130000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1030","customer":"C09","total":500000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1031","customer":"C03","total":870000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1032","customer":"C10","total":340000},
        {"pk":"ORD#2026-11-20#1","sk":"O-1033","customer":"C04","total":710000},
        {"pk":"ORD#2026-11-20#2","sk":"O-1034","customer":"C11","total":180000},
        {"pk":"ORD#2026-11-20#3","sk":"O-1035","customer":"C05","total":550000},
        {"pk":"ORD#2026-11-20#0","sk":"O-1036","customer":"C12","total":920000}
      ]
    }}
  steps:
    - task: { vi: "Bảng `Orders` rải đơn của ngày 2026-11-20 qua 4 shard. Số shard = số của mã đơn chia lấy dư cho 4, nên partition key là `ORD#2026-11-20#<shard>`, sort key là mã đơn. Đọc đơn `O-1027` bằng một GetItem.", en: "The `Orders` table spreads the orders of 2026-11-20 over 4 shards. Shard = the order number modulo 4, so the partition key is `ORD#2026-11-20#<shard>` and the sort key is the order id. Read order `O-1027` with one GetItem." }
      solution: |
        {"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#3"}, "sk": {"S": "O-1027"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","FilterExpression":"#k0 = :k0 AND #k1 = :k1","ExpressionAttributeNames":{"#k0":"pk","#k1":"sk"},"ExpressionAttributeValues":{":k0":{"S":"ORD#2026-11-20#3"},":k1":{"S":"O-1027"}}}}
      expect: { Count: 1 }
      hint: { vi: "1027 chia 4 dư 3.", en: "1027 modulo 4 is 3." }
    - task: { vi: "Đọc các đơn từ `O-1010` tới `O-1020` (gồm cả hai đầu) nằm trong shard 2, bằng một Query có điều kiện trên sort key.", en: "Read the orders from `O-1010` to `O-1020` (both included) that live in shard 2, with one Query that has a sort key condition." }
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "pk = :p AND sk BETWEEN :a AND :b", "ExpressionAttributeValues": {":p": {"S": "ORD#2026-11-20#2"}, ":a": {"S": "O-1010"}, ":b": {"S": "O-1020"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeValues":{":p":{"S":"ORD#2026-11-20#2"},":a":{"S":"O-1010"},":b":{"S":"O-1020"}},"FilterExpression":"(pk = :p AND sk BETWEEN :a AND :b)"}}
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "`BETWEEN` trên sort key vẫn nằm trong `KeyConditionExpression`, không cần FilterExpression.", en: "`BETWEEN` on the sort key still lives in `KeyConditionExpression`, no FilterExpression needed." }
---

## Ý chính

Hậu tố ngẫu nhiên rải tải tốt nhưng làm mất khả năng đọc thẳng một item. AWS gợi ý **hậu tố tính được**: tính số shard từ thuộc tính bạn hay tra cứu (ví dụ mã đơn), rồi ghép vào khóa trước khi ghi.

- Ghi vẫn rải đều, miễn phép tính cho ra các số phân bố đều.
- Đọc một item: tính lại số shard, gọi **GetItem**, không phải hỏi mọi shard.
- Đọc cả ngày: vẫn phải gửi một Query cho mỗi shard rồi gộp, như hậu tố ngẫu nhiên.

Phép tính phải ổn định: cùng mã đơn luôn ra cùng số. Đổi số shard sau này thì các item cũ nằm sai chỗ, nên chọn số shard đủ dư ngay từ đầu.

## Ví dụ

AWS gợi ý một phép tính đơn giản như tích các mã UTF-8 của mã đơn, chia lấy dư cho 200, cộng 1. Ở đây mã đơn là số nên dùng phép chia lấy dư cho 4:

```text
O-1027 -> 1027 % 4 = 3 -> pk = ORD#2026-11-20#3
O-1012 -> 1012 % 4 = 0 -> pk = ORD#2026-11-20#0
```

## Thực hành

Bảng `Orders` có 36 đơn, từ `O-1001` tới `O-1036`, mỗi shard 9 đơn.

# EN

## Key idea

A random suffix spreads load well but loses direct reads of one item. AWS suggests a **calculated suffix**: compute the shard number from the attribute you look items up by (for example the order id), then append it to the key before writing.

- Writes still spread evenly, as long as the calculation gives evenly distributed numbers.
- Reading one item: compute the shard number again, call **GetItem**, no need to ask every shard.
- Reading the whole day: you still send one Query per shard and merge, as with a random suffix.

The calculation must be stable: the same order id always gives the same number. Changing the shard count later leaves old items in the wrong place, so choose a shard count with headroom from the start.

## Example

AWS suggests a simple calculation such as the product of the UTF-8 code points of the order id, modulo 200, plus 1. Here the order id is a number, so modulo 4 is enough:

```text
O-1027 -> 1027 % 4 = 3 -> pk = ORD#2026-11-20#3
O-1012 -> 1012 % 4 = 0 -> pk = ORD#2026-11-20#0
```

## Practice

The `Orders` table holds 36 orders, from `O-1001` to `O-1036`, 9 per shard.
