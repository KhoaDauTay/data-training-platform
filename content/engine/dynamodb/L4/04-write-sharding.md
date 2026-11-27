---
id: e-dy-l4-04
engine: dynamodb
level: L4
module: scale
title: "Write sharding: rải một khóa nóng bằng hậu tố ngẫu nhiên"
title_en: "Write sharding: spread a hot key with a random suffix"
figures: [{ name: dy-write-sharding, at: idea }]
kind: lab
runtime: browser
minutes: 12
objectives:
  - { vi: "Đọc một shard bằng một Query và thấy Query chỉ đọc đúng item của shard đó", en: "Read one shard with one Query and see that the Query reads only that shard's items" }
  - { vi: "Đọc lại cả ngày bằng cách liệt kê mọi shard, và hiểu giá phải trả khi đọc", en: "Read the whole day back by listing every shard, and understand the price paid on reads" }
  - { vi: "Ghi một phiếu mới vào một shard đã chọn", en: "Write a new vote into a chosen shard" }
requires: [e-dy-l4-01, e-dy-l4-03]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html, title_vi: "Chia nhỏ lượt ghi (write sharding)" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html, title_vi: "PartiQL: SELECT" }
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
      perf: { table: Votes }
      slow: |
        {"op":"Scan","input":{"TableName":"Votes","ExpressionAttributeValues":{":p":{"S":"VOTE#2026-11-20#3"}},"FilterExpression":"(pk = :p)"}}
      expect: { Count: 6, ScannedCount: 6 }
      hint: { vi: "Query cần đúng một giá trị partition key: ghép ngày và số shard.", en: "A Query needs exactly one partition key value: join the day and the shard number." }
    - task: { vi: "Đọc mọi phiếu của ngày 2026-11-20 trong một câu PartiQL, liệt kê đủ 8 khóa shard để câu không thành Scan.", en: "Read every vote of 2026-11-20 in one PartiQL statement, listing all 8 shard keys so the statement does not become a Scan." }
      solution: |
        SELECT * FROM "Votes" WHERE pk IN ['VOTE#2026-11-20#0', 'VOTE#2026-11-20#1', 'VOTE#2026-11-20#2', 'VOTE#2026-11-20#3', 'VOTE#2026-11-20#4', 'VOTE#2026-11-20#5', 'VOTE#2026-11-20#6', 'VOTE#2026-11-20#7']
      check: doc
      expect: { Count: 48 }
      hint: { vi: "PartiQL chỉ tránh được Scan khi điều kiện trên partition key dùng `=` hoặc `IN`.", en: "PartiQL avoids a Scan only when the partition key condition uses `=` or `IN`." }
    - task: { vi: "Một phiếu mới cho bài `S3` vừa tới, ứng dụng bốc ngẫu nhiên shard 6 của ngày 2026-11-20. Ghi item có `sk` là `V#066`.", en: "A new vote for song `S3` arrives, and the application picks shard 6 of 2026-11-20 at random. Write the item with `sk` `V#066`." }
      solution: |
        {"op": "PutItem", "input": {"TableName": "Votes", "Item": {"pk": {"S": "VOTE#2026-11-20#6"}, "sk": {"S": "V#066"}, "song": {"S": "S3"}}}}
      check: doc
      hint: { vi: "Partition key là ngày ghép số shard: `VOTE#2026-11-20#6`.", en: "The partition key is the day joined with the shard number: `VOTE#2026-11-20#6`." }
quiz:
  - q: { vi: "Mỗi ngày được rải ra 8 shard bằng hậu tố ngẫu nhiên. Muốn đọc lại phiếu `V#043` của ngày 2026-11-20, cần mấy lần đọc?", en: "Each day is spread over 8 shards with a random suffix. To read back vote `V#043` of 2026-11-20, how many reads do you need?" }
    options:
      - { vi: "Một GetItem, vì `sk` đã định danh phiếu", en: "One GetItem, since `sk` already identifies the vote" }
      - { vi: "Có thể tới 8: hậu tố ngẫu nhiên không cho biết phiếu nằm ở shard nào", en: "Up to 8: a random suffix does not tell which shard holds the vote" }
      - { vi: "Một Scan là đủ và rẻ nhất", en: "One Scan is enough and the cheapest" }
    answer: 1
    trap: 0
    why: { vi: "`sk` là duy nhất trong một ngày, nhưng GetItem cần cả khóa chính, tức cả partition key có số shard `VOTE#2026-11-20#<shard>`. Hậu tố được bốc ngẫu nhiên lúc ghi và không lưu ở đâu khác, nên ứng dụng phải thử lần lượt 8 shard, tệ nhất là 8 lần đọc. Một Scan thì đọc cả 80 item của bảng rồi mới lọc, nên đắt nhất chứ không rẻ nhất. Bài \"Hậu tố tính được\" sửa chuyện này: tính số shard từ chính mã phiếu, rồi đọc lại bằng một GetItem.", en: "`sk` is unique within a day, but GetItem needs the whole primary key, including the partition key with its shard number `VOTE#2026-11-20#<shard>`. The suffix was drawn at random on write and stored nowhere else, so the application must try the 8 shards in turn, 8 reads at worst. A Scan reads all 80 items of the table and filters afterwards, so it is the most expensive, not the cheapest. The lesson \"Calculated suffix\" fixes this: compute the shard number from the vote id itself, then read it back with one GetItem." }
predict:
  sql: |
    {"op": "Scan", "input": {"TableName": "Votes", "FilterExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-20#3"}}}}
  q: { vi: "Thay Query ở bước 1 bằng Scan có FilterExpression như trên. `ScannedCount` là bao nhiêu?", en: "Replace the step 1 Query with the Scan above, which uses a FilterExpression. What is `ScannedCount`?" }
  options:
    - { vi: "6, như Query", en: "6, like the Query" }
    - { vi: "48, mọi phiếu của ngày 2026-11-20", en: "48, every vote of 2026-11-20" }
    - { vi: "80, mọi item trong bảng", en: "80, every item in the table" }
  answer: 2
  trap: 0
  why: { vi: "6 nghe hợp lý vì kết quả chỉ có 6 phiếu, nhưng đó là `Count`, số item còn lại sau bộ lọc. Scan không dùng partition key để tìm chỗ: nó đọc mọi item của bảng, 48 phiếu ngày 2026-11-20 cộng 32 phiếu ngày 2026-11-19 = 80, rồi mới áp `FilterExpression`. 48 sai vì Scan không biết dừng ở ngày 20: bộ lọc chạy sau khi đọc. Bạn trả capacity cho cả 80 item; Query đi thẳng tới một item collection nên chỉ đọc 6.", en: "6 sounds right because only 6 votes come back, but that is `Count`, the items left after the filter. A Scan does not use the partition key to find its place: it reads every item of the table, 48 votes of 2026-11-20 plus 32 votes of 2026-11-19 = 80, and only then applies the `FilterExpression`. 48 is wrong because the Scan cannot stop at the 20th: the filter runs after the read. You pay capacity for all 80 items; a Query goes straight to one item collection and reads only 6." }
---
## Mở bài

Đêm chung kết, một ngày bầu chọn nhận 5.000 phiếu mỗi giây, mà mọi phiếu cùng partition key là ngày hôm nay. Một partition chỉ nhận 1000 WCU, nên phần còn lại bị throttle. Làm sao rải một khóa nóng ra nhiều partition mà vẫn đọc lại được cả ngày?

## Ý chính

Khi một partition key nhận quá 1000 WCU mỗi giây, cách AWS khuyên là mở rộng không gian khóa: thêm một hậu tố ngẫu nhiên, ví dụ từ 0 tới N−1, vào sau giá trị khóa. `VOTE#2026-11-20` thành `VOTE#2026-11-20#0` … `VOTE#2026-11-20#7`, và tải ghi trong ngày rải đều qua nhiều partition. Chọn N từ phép tính ở bài "Tính xem partition nào sẽ nóng": tổng WCU của khóa chia cho 1000, cộng thêm phần dư.

Giá phải trả nằm ở phía đọc: muốn đọc cả ngày, ứng dụng phải đọc mọi shard (một Query mỗi shard, hoặc một câu PartiQL `WHERE pk IN [...]`) rồi tự gộp kết quả. Hậu tố ngẫu nhiên còn một nhược điểm: muốn đọc một item cụ thể, bạn không biết nó nằm ở shard nào. Bài sau sửa chuyện đó bằng hậu tố tính được.

Nhiều người nghĩ một Scan có `FilterExpression` là cách gọn để đọc cả ngày. Thật ra Scan đọc mọi item của bảng, kể cả các ngày khác, rồi mới lọc: `Count` đúng nhưng `ScannedCount` và capacity tính trên cả bảng.

Lab chạy bằng dynoxide trong trình duyệt: không có partition thật, nhưng `Count` và `ScannedCount` là số đo thật.

Hình dưới vẽ một khóa nóng vượt trần, rồi tám khóa có hậu tố cùng chia tải.

## Cú pháp

```text
write:  pk = "<key>#" + random(0..N-1)
read one shard: {"op": "Query", "input": {"TableName": "<t>", "KeyConditionExpression": "pk = :p", ...}}
read all shards: SELECT * FROM "<t>" WHERE pk IN ['<key>#0', '<key>#1', ..., '<key>#N-1']
```

- N: tổng WCU của khóa / 1000, cộng phần dư.
- Đọc cả khóa gốc cần N lần đọc, hoặc một câu `IN` liệt kê đủ N khóa.
- `IN` trên partition key không biến câu PartiQL thành Scan.

## Ví dụ

Ghi một phiếu: chọn ngẫu nhiên một số shard rồi ghép vào khóa.

```json
{"op": "PutItem", "input": {"TableName": "Votes", "Item": {"pk": {"S": "VOTE#2026-11-20#5"}, "sk": {"S": "V#056"}, "song": {"S": "S2"}}}}
```

Kết quả là bảng sau khi ghi: shard 5 giờ có 7 phiếu.

Đọc một shard của ngày hôm trước:

```json
{"op": "Query", "input": {"TableName": "Votes", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-19#0"}}}}
```

4 phiếu, `ScannedCount` cũng là 4.

Đọc hai shard trong một câu PartiQL:

```partiql
SELECT * FROM "Votes" WHERE pk IN ['VOTE#2026-11-19#0', 'VOTE#2026-11-19#1']
```

8 phiếu; đọc cả ngày thì liệt kê đủ 8 khóa như bước 2.

## Lỗi hay gặp

Đọc một shard bằng Scan có lọc:

```json
// WRONG: 6 items back, 80 items read
{"op": "Scan", "input": {"TableName": "Votes", "FilterExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-20#3"}}}}
```

```json
// FIX: a Query reads only that shard
{"op": "Query", "input": {"TableName": "Votes", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-20#3"}}}}
```

Cùng 6 phiếu, nhưng câu sai có `ScannedCount` 80, câu sửa 6: Scan đọc hết 80 item của bảng rồi mới lọc, còn Query đi thẳng tới partition key `VOTE#2026-11-20#3`. Capacity tính trên số item đã đọc, nên câu sai trả cho 80 item.

Mong `begins_with` gom mọi shard của một ngày trong một Query:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Votes", "KeyConditionExpression": "begins_with(pk, :d)", "ExpressionAttributeValues": {":d": {"S": "VOTE#2026-11-20#"}}}}
```

DynamoDB băm (hash) giá trị partition key để chọn partition, nên `VOTE#2026-11-20#0` và `VOTE#2026-11-20#1` nằm ở hai chỗ không liền nhau; vì vậy điều kiện trên partition key chỉ nhận `=`, không nhận tiền tố. Liệt kê từng shard bằng `IN`, hoặc gửi N Query.

## Thực hành

Bảng `Votes` có 80 item: 48 phiếu ngày 2026-11-20 (8 shard × 6) và 32 phiếu ngày 2026-11-19 (8 shard × 4). Đoán trước `ScannedCount` của Scan, rồi đọc một shard, đọc cả ngày và ghi một phiếu mới.

## Tóm tắt

- Hậu tố ngẫu nhiên `#0…#N-1` rải một khóa nóng ra N partition.
- Chọn N từ tổng WCU của khóa chia 1000, rồi để dư.
- Đọc cả khóa gốc phải đọc mọi shard: N Query hoặc một câu `IN`.
- Partition key chỉ so bằng: `begins_with` không gom được shard, Scan có lọc thì đọc cả bảng.

# EN

## Opening

On the final night, one voting day gets 5,000 votes a second, and every vote has today's date as its partition key. One partition takes only 1000 WCU, so the rest is throttled. How do you spread one hot key over many partitions and still read the whole day back?

## Key idea

When one partition key gets more than 1000 WCU per second, the AWS advice is to expand the key space: append a random suffix, for example 0 to N−1, to the key value. `VOTE#2026-11-20` becomes `VOTE#2026-11-20#0` … `VOTE#2026-11-20#7`, and the day's writes spread evenly over many partitions. Pick N with the arithmetic from the lesson "Work out which partition will run hot": the key's total WCU divided by 1000, plus headroom.

The price is paid on reads: to read the whole day, the application must read every shard (one Query per shard, or one PartiQL statement with `WHERE pk IN [...]`) and merge the results itself. A random suffix has a second drawback: to read one specific item you do not know which shard holds it. The next lesson fixes that with a calculated suffix.

Many people think a Scan with a `FilterExpression` is a neat way to read the whole day. In fact a Scan reads every item in the table, other days included, and filters afterwards: `Count` is right but `ScannedCount` and capacity count the whole table.

The lab runs on dynoxide in the browser: there are no real partitions, but `Count` and `ScannedCount` are real figures.

The figure below draws one hot key over the ceiling, then eight suffixed keys sharing the load.

## Syntax

```text
write:  pk = "<key>#" + random(0..N-1)
read one shard: {"op": "Query", "input": {"TableName": "<t>", "KeyConditionExpression": "pk = :p", ...}}
read all shards: SELECT * FROM "<t>" WHERE pk IN ['<key>#0', '<key>#1', ..., '<key>#N-1']
```

- N: the key's total WCU / 1000, plus headroom.
- Reading the whole original key takes N reads, or one `IN` statement listing all N keys.
- `IN` on the partition key does not turn a PartiQL statement into a Scan.

## Example

Writing a vote: pick a random shard number and append it to the key.

```json
{"op": "PutItem", "input": {"TableName": "Votes", "Item": {"pk": {"S": "VOTE#2026-11-20#5"}, "sk": {"S": "V#056"}, "song": {"S": "S2"}}}}
```

The result is the table after the write: shard 5 now holds 7 votes.

Reading one shard of the day before:

```json
{"op": "Query", "input": {"TableName": "Votes", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-19#0"}}}}
```

4 votes, and `ScannedCount` is 4 too.

Reading two shards in one PartiQL statement:

```partiql
SELECT * FROM "Votes" WHERE pk IN ['VOTE#2026-11-19#0', 'VOTE#2026-11-19#1']
```

8 votes; to read the whole day, list all 8 keys as in step 2.

## Common mistakes

Reading one shard with a filtered Scan:

```json
// WRONG: 6 items back, 80 items read
{"op": "Scan", "input": {"TableName": "Votes", "FilterExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-20#3"}}}}
```

```json
// FIX: a Query reads only that shard
{"op": "Query", "input": {"TableName": "Votes", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "VOTE#2026-11-20#3"}}}}
```

Same 6 votes, but the wrong one has a `ScannedCount` of 80, the fix 6: the Scan reads all 80 items of the table and filters afterwards, while the Query goes straight to the partition key `VOTE#2026-11-20#3`. Capacity is charged on the items read, so the wrong one pays for 80.

Hoping `begins_with` gathers every shard of a day in one Query:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Votes", "KeyConditionExpression": "begins_with(pk, :d)", "ExpressionAttributeValues": {":d": {"S": "VOTE#2026-11-20#"}}}}
```

DynamoDB hashes the partition key value to pick a partition, so `VOTE#2026-11-20#0` and `VOTE#2026-11-20#1` sit in places that are not next to each other; that is why a partition key condition accepts only `=`, not a prefix. List each shard with `IN`, or send N Queries.

## Practice

The `Votes` table holds 80 items: 48 votes on 2026-11-20 (8 shards × 6) and 32 votes on 2026-11-19 (8 shards × 4). Guess the Scan's `ScannedCount` first, then read one shard, read the whole day and write a new vote.

## Recap

- A random suffix `#0…#N-1` spreads one hot key over N partitions.
- Pick N from the key's total WCU divided by 1000, then add headroom.
- Reading the whole original key means reading every shard: N Queries or one `IN` statement.
- The partition key only supports equality: `begins_with` cannot gather shards, a filtered Scan reads the whole table.
