---
id: e-dy-l4-05
engine: dynamodb
level: L4
module: scale
title: "Hậu tố tính được: shard mà vẫn GetItem được"
title_en: "Calculated suffix: sharded, yet still one GetItem away"
figures: [{ name: dy-write-sharding, at: idea, variant: calc }]
kind: lab
runtime: browser
minutes: 10
objectives:
  - { vi: "Tính shard của một item từ chính thuộc tính bạn hay tra cứu", en: "Compute an item's shard from the attribute you look it up by" }
  - { vi: "Đọc thẳng một item bằng GetItem thay vì hỏi mọi shard", en: "Read one item directly with GetItem instead of asking every shard" }
  - { vi: "Ghi item mới vào đúng shard mà lần đọc sau sẽ tính ra", en: "Write a new item into the very shard a later read will compute" }
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
    - task: { vi: "Đơn mới `O-1037` của khách `C04`, tổng 300000. Ghi nó vào shard mà phép tính chọn, để GetItem sau này tìm thấy.", en: "New order `O-1037` from customer `C04`, total 300000. Write it into the shard the calculation picks, so a later GetItem finds it." }
      solution: |
        {"op": "PutItem", "input": {"TableName": "Orders", "Item": {"pk": {"S": "ORD#2026-11-20#1"}, "sk": {"S": "O-1037"}, "customer": {"S": "C04"}, "total": {"N": "300000"}}}}
      check: doc
      hint: { vi: "1037 chia 4 dư 1.", en: "1037 modulo 4 is 1." }
quiz:
  - q: { vi: "Vì sao hậu tố tính được đọc lại một đơn rẻ hơn hậu tố ngẫu nhiên?", en: "Why does a calculated suffix read one order back more cheaply than a random suffix?" }
    options:
      - { vi: "Vì nó rải tải đều hơn", en: "Because it spreads the load more evenly" }
      - { vi: "Vì ứng dụng tính lại được số shard từ mã đơn, nên có đủ khóa chính cho một GetItem", en: "Because the application can compute the shard number from the order id again, so it has the whole primary key for one GetItem" }
      - { vi: "Vì DynamoDB nhớ shard của từng item", en: "Because DynamoDB remembers each item's shard" }
    answer: 1
    trap: 0
    why: { vi: "Rải đều nghe hợp lý vì đó là mục đích của shard, nhưng cả hai cách đều rải đều nếu phép tính phân bố tốt, nên đó không phải chỗ khác nhau. Khác ở phía đọc: `O-1027` cho 1027 % 4 = 3, nên ứng dụng tự dựng được partition key `ORD#2026-11-20#3`, có đủ khóa chính và gọi một GetItem thay vì hỏi 4 shard. DynamoDB không ghi nhớ item nằm ở shard nào: số shard chỉ là một phần chuỗi khóa do ứng dụng tạo ra.", en: "Spreading evenly sounds right because that is what shards are for, but both ways spread evenly when the calculation is well distributed, so that is not the difference. The difference is on reads: `O-1027` gives 1027 % 4 = 3, so the application builds the partition key `ORD#2026-11-20#3` itself, has the whole primary key and calls one GetItem instead of asking 4 shards. DynamoDB does not remember which shard holds an item: the shard number is just part of the key string the application made." }
  - q: { vi: "Sau một năm, bạn đổi từ 4 shard sang 8 shard (chia lấy dư cho 8). Chuyện gì xảy ra với đơn cũ?", en: "After a year you change from 4 shards to 8 (modulo 8). What happens to the old orders?" }
    options:
      - { vi: "DynamoDB tự chuyển chúng sang shard mới", en: "DynamoDB moves them to the new shards by itself" }
      - { vi: "Nhiều đơn cũ nằm ở shard khác với phép tính mới, GetItem theo phép tính mới không tìm thấy chúng", en: "Many old orders sit in a different shard than the new calculation gives, so a GetItem using the new calculation misses them" }
      - { vi: "Không có gì, số shard không ảnh hưởng tới khóa", en: "Nothing, the shard count does not affect the key" }
    answer: 1
    why: { vi: "Số shard nằm trong partition key đã ghi, nên nó quyết định khóa của item. Ví dụ `O-1028`: 1028 % 4 = 0, nên item nằm ở `ORD#2026-11-20#0`; phép tính mới cho 1028 % 8 = 4, GetItem tìm ở `ORD#2026-11-20#4` và về rỗng. DynamoDB không tự chuyển item: nó không biết phép tính của ứng dụng, và không đổi được khóa của item đã có. Phải ghi lại dữ liệu cũ theo khóa mới, hoặc chọn số shard đủ dư ngay từ đầu.", en: "The shard number is inside the partition key already written, so it decides the item's key. For example `O-1028`: 1028 % 4 = 0, so the item sits under `ORD#2026-11-20#0`; the new calculation gives 1028 % 8 = 4, so GetItem looks under `ORD#2026-11-20#4` and comes back empty. DynamoDB does not move items: it does not know the application's calculation, and an existing item's key cannot be changed. Rewrite the old data under the new keys, or choose a shard count with headroom from the start." }
---
## Mở bài

Đơn hàng trong ngày đã được rải ra nhiều shard bằng hậu tố ngẫu nhiên, và tải ghi êm. Nhưng giờ nhân viên chăm sóc khách hỏi "đơn O-1027 đâu?" và ứng dụng phải hỏi từng shard một. Có cách nào vừa rải tải vừa đọc thẳng được một đơn?

## Ý chính

Hậu tố ngẫu nhiên rải tải tốt nhưng làm mất khả năng đọc thẳng một item. AWS gợi ý hậu tố tính được: tính số shard từ thuộc tính bạn hay tra cứu (ví dụ mã đơn), rồi ghép vào khóa trước khi ghi. Ghi vẫn rải đều, miễn phép tính cho ra các số phân bố đều. Đọc một item: tính lại số shard, gọi GetItem. Đọc cả ngày: vẫn phải đọc mọi shard rồi gộp, như hậu tố ngẫu nhiên.

Phép tính phải ổn định: cùng mã đơn luôn ra cùng số. AWS gợi ý ví dụ tích các mã UTF-8 của chuỗi, chia lấy dư cho 200, cộng 1; ở đây mã đơn là số nên chia lấy dư cho 4 là đủ.

Nhiều người nghĩ có thể tăng số shard sau, khi tải lớn lên. Thật ra số shard nằm trong partition key đã ghi: đổi phép tính thì item cũ nằm sai chỗ, và GetItem theo phép tính mới không thấy chúng. Hãy chọn số shard đủ dư ngay từ đầu.

Lab chạy bằng dynoxide trong trình duyệt.

Hình dưới vẽ 36 đơn chia đều bốn shard, và cách tính lại shard của một đơn.

## Cú pháp

```text
shard = f(lookup attribute) mod N        -- stable: same input, same shard
pk    = "<key>#" + shard
read one:  {"op": "GetItem", "input": {"TableName": "<t>", "Key": {"pk": ..., "sk": ...}}}
read range in a shard: KeyConditionExpression "pk = :p AND sk BETWEEN :a AND :b"
```

- `f`: hàm ổn định, phân bố đều (số đơn, tổng mã ký tự…).
- GetItem cần cả partition key lẫn sort key.
- `BETWEEN` trên sort key nằm trong điều kiện khóa, không cần bộ lọc.

## Ví dụ

Đọc đơn `O-1012`: 1012 % 4 = 0.

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#0"}, "sk": {"S": "O-1012"}}}}
```

Một item, không đọc thêm gì.

Đọc cả shard 1, tức 9 đơn có số chia 4 dư 1:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "ORD#2026-11-20#1"}}}}
```

Ghi đơn `O-1038`: 1038 % 4 = 2.

```json
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"pk": {"S": "ORD#2026-11-20#2"}, "sk": {"S": "O-1038"}, "customer": {"S": "C05"}, "total": {"N": "120000"}}}}
```

## Lỗi hay gặp

Tính sai shard khi đọc:

```json
// WRONG: O-1027 is not in shard 0, nothing comes back
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#0"}, "sk": {"S": "O-1027"}}}}
```

```json
// FIX: 1027 % 4 = 3
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#3"}, "sk": {"S": "O-1027"}}}}
```

GetItem không báo lỗi khi không có item: nó trả về rỗng. Phép tính lúc đọc phải đúng là phép tính lúc ghi.

Gọi GetItem chỉ với partition key:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#3"}}}}
```

Bảng có sort key thì `Key` phải đủ cả hai. Muốn đọc cả shard, dùng Query.

## Thực hành

Bảng `Orders` có 36 đơn, từ `O-1001` tới `O-1036`, mỗi shard 9 đơn. Đọc một đơn bằng GetItem, đọc một khoảng mã đơn trong một shard, rồi ghi một đơn mới vào đúng shard.

## Tóm tắt

- Hậu tố tính được: số shard = hàm ổn định của thuộc tính tra cứu.
- Đọc một item: tính lại số shard rồi gọi một GetItem.
- Đọc cả khóa gốc vẫn phải đọc mọi shard.
- Đổi số shard làm item cũ nằm sai chỗ: chọn đủ dư từ đầu.

# EN

## Opening

The day's orders are spread over several shards with a random suffix, and writes are smooth. But now customer service asks "where is order O-1027?" and the application must ask every shard in turn. Is there a way to spread the load and still read one order directly?

## Key idea

A random suffix spreads load well but loses direct reads of one item. AWS suggests a calculated suffix: compute the shard number from the attribute you look items up by (for example the order id), then append it to the key before writing. Writes still spread evenly, as long as the calculation gives evenly distributed numbers. Reading one item: compute the shard number again and call GetItem. Reading the whole day: you still read every shard and merge, as with a random suffix.

The calculation must be stable: the same order id always gives the same number. AWS suggests, for example, the product of the string's UTF-8 code points, modulo 200, plus 1; here the order id is a number, so modulo 4 is enough.

Many people think the shard count can be raised later, when the load grows. In fact the shard number is inside the partition key already written: change the calculation and old items sit in the wrong place, and a GetItem using the new calculation does not find them. Choose a shard count with headroom from the start.

The lab runs on dynoxide in the browser.

The figure below draws 36 orders spread over four shards, and how one order's shard is computed again.

## Syntax

```text
shard = f(lookup attribute) mod N        -- stable: same input, same shard
pk    = "<key>#" + shard
read one:  {"op": "GetItem", "input": {"TableName": "<t>", "Key": {"pk": ..., "sk": ...}}}
read range in a shard: KeyConditionExpression "pk = :p AND sk BETWEEN :a AND :b"
```

- `f`: a stable, evenly distributed function (order number, sum of character codes…).
- GetItem needs both the partition key and the sort key.
- `BETWEEN` on the sort key is part of the key condition, no filter needed.

## Example

Reading order `O-1012`: 1012 % 4 = 0.

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#0"}, "sk": {"S": "O-1012"}}}}
```

One item, nothing else read.

Reading all of shard 1, the 9 orders whose number modulo 4 is 1:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "ORD#2026-11-20#1"}}}}
```

Writing order `O-1038`: 1038 % 4 = 2.

```json
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"pk": {"S": "ORD#2026-11-20#2"}, "sk": {"S": "O-1038"}, "customer": {"S": "C05"}, "total": {"N": "120000"}}}}
```

## Common mistakes

Computing the wrong shard on read:

```json
// WRONG: O-1027 is not in shard 0, nothing comes back
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#0"}, "sk": {"S": "O-1027"}}}}
```

```json
// FIX: 1027 % 4 = 3
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#3"}, "sk": {"S": "O-1027"}}}}
```

GetItem raises no error when the item is missing: it returns nothing. The calculation on read must be exactly the one used on write.

Calling GetItem with only the partition key:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"pk": {"S": "ORD#2026-11-20#3"}}}}
```

When the table has a sort key, `Key` must hold both. To read a whole shard, use a Query.

## Practice

The `Orders` table holds 36 orders, from `O-1001` to `O-1036`, 9 per shard. Read one order with GetItem, read a range of order ids in one shard, then write a new order into the right shard.

## Recap

- Calculated suffix: shard number = a stable function of the lookup attribute.
- Reading one item: compute the shard number again and call one GetItem.
- Reading the whole original key still means reading every shard.
- Changing the shard count leaves old items in the wrong place: choose headroom from the start.
