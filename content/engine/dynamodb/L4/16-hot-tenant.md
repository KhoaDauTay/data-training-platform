---
id: e-dy-l4-16
engine: dynamodb
level: L4
module: scale
title: "Lab: khách nóng, hậu tố chỉ cho khách lớn"
title_en: "Lab: a hot tenant, a suffix for the big tenant only"
kind: lab
runtime: browser
minutes: 15
viz: dy-partitions
objectives:
  - vi: "Tính số shard tối thiểu cho một khách lớn từ trần 1000 WCU của một partition"
    en: "Work out the minimum shard count for a big tenant from the 1000 WCU ceiling of one partition"
  - vi: "Đọc hạng và số shard của khách trước, rồi tính hậu tố cho GetItem"
    en: "Read the tenant's tier and shard count first, then compute the suffix for a GetItem"
  - vi: "Đo RCU của từng khách từ `ConsumedCapacity` thay vì đoán"
    en: "Measure each tenant's RCU from `ConsumedCapacity` instead of guessing"
requires: [e-dy-l4-05, e-dy-l3-14]
sources:
  - url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
    title: "Write sharding"
  - url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
    title: "Burst and adaptive capacity"
  - url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
    title: "Read and write operations"
lab:
  setup: |
    {"tables": [
      {"TableName": "Tenants", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}]},
      {"TableName": "Events", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"}]}
    ], "items": {
      "Tenants": [
        {"PK": "C01", "tier": "standard", "shards": 1},
        {"PK": "C04", "tier": "standard", "shards": 1},
        {"PK": "C09", "tier": "whale", "shards": 3}
      ],
      "Events": [
        {"PK": "TENANT#C01", "SK": "EV#E-1101", "kind": "pickup", "port": "Busan"},
        {"PK": "TENANT#C01", "SK": "EV#E-1102", "kind": "depart", "port": "Busan"},
        {"PK": "TENANT#C01", "SK": "EV#E-1103", "kind": "arrive", "port": "Da Nang"},
        {"PK": "TENANT#C04", "SK": "EV#E-1401", "kind": "pickup", "port": "Kaohsiung"},
        {"PK": "TENANT#C04", "SK": "EV#E-1402", "kind": "depart", "port": "Kaohsiung"},
        {"PK": "TENANT#C04", "SK": "EV#E-1403", "kind": "customs", "port": "Da Nang"},
        {"PK": "TENANT#C09#0", "SK": "EV#E-2001", "kind": "pickup", "port": "Singapore"},
        {"PK": "TENANT#C09#1", "SK": "EV#E-2002", "kind": "pickup", "port": "Singapore"},
        {"PK": "TENANT#C09#2", "SK": "EV#E-2003", "kind": "depart", "port": "Singapore"},
        {"PK": "TENANT#C09#0", "SK": "EV#E-2004", "kind": "depart", "port": "Singapore"},
        {"PK": "TENANT#C09#1", "SK": "EV#E-2005", "kind": "arrive", "port": "Da Nang"},
        {"PK": "TENANT#C09#2", "SK": "EV#E-2006", "kind": "customs", "port": "Da Nang"},
        {"PK": "TENANT#C09#0", "SK": "EV#E-2007", "kind": "arrive", "port": "Da Nang"},
        {"PK": "TENANT#C09#1", "SK": "EV#E-2008", "kind": "customs", "port": "Da Nang"},
        {"PK": "TENANT#C09#2", "SK": "EV#E-2009", "kind": "deliver", "port": "Da Nang"},
        {"PK": "TENANT#C09#0", "SK": "EV#E-2010", "kind": "pickup", "port": "Port Klang"},
        {"PK": "TENANT#C09#1", "SK": "EV#E-2011", "kind": "depart", "port": "Port Klang"},
        {"PK": "TENANT#C09#2", "SK": "EV#E-2012", "kind": "pickup", "port": "Port Klang"}
      ]
    }}
  steps:
    - name: { vi: "Hạng của khách", en: "The tenant's tier" }
      task:
        vi: "Bảng `Tenants` ghi hạng và số shard của mỗi khách trong cổng Cargo Query. Đọc item của khách `C09` bằng một GetItem."
        en: "Table `Tenants` records each Cargo Query portal tenant's tier and shard count. Read the item of tenant `C09` with one GetItem."
      solution: |
        {"op": "GetItem", "input": {
          "TableName": "Tenants",
          "Key": {"PK": {"S": "C09"}}}}
      check: doc
      perf: { table: Tenants }
      slow: |
        {"op":"Scan","input":{"TableName":"Tenants","FilterExpression":"PK = :p","ExpressionAttributeValues":{":p":{"S":"C09"}}}}
      expect: { Count: 1 }
      hint:
        vi: "Bảng `Tenants` chỉ có partition key `PK`."
        en: "Table `Tenants` has only the partition key `PK`."
    - name: { vi: "Một sự kiện của khách lớn", en: "One event of the big tenant" }
      task:
        vi: "Khách `C09` có 3 shard: shard = số của mã sự kiện chia lấy dư cho 3, partition key là `TENANT#C09#<shard>`, sort key là `EV#<id>`. Đọc sự kiện `E-2009` bằng một GetItem."
        en: "Tenant `C09` has 3 shards: shard = the event number modulo 3, the partition key is `TENANT#C09#<shard>`, the sort key is `EV#<id>`. Read event `E-2009` with one GetItem."
      solution: |
        {"op": "GetItem", "input": {
          "TableName": "Events",
          "Key": {
            "PK": {"S": "TENANT#C09#2"},
            "SK": {"S": "EV#E-2009"}}}}
      check: doc
      perf: { table: Events }
      slow: |
        {"op":"Scan","input":{"TableName":"Events","FilterExpression":"PK = :p AND SK = :s","ExpressionAttributeValues":{":p":{"S":"TENANT#C09#2"},":s":{"S":"EV#E-2009"}}}}
      expect: { Count: 1 }
      hint:
        vi: "2009 chia 3 dư 2."
        en: "2009 modulo 3 is 2."
    - name: { vi: "Một shard của khách lớn", en: "One shard of the big tenant" }
      task:
        vi: "Trang \"Mọi sự kiện\" của `C09` đọc từng shard rồi gộp: ba Query, mỗi shard một Query. Viết Query cho shard 1."
        en: "The \"All events\" page of `C09` reads each shard and merges: three Queries, one per shard. Write the Query for shard 1."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Events",
          "KeyConditionExpression": "PK = :p",
          "ExpressionAttributeValues": {
            ":p": {"S": "TENANT#C09#1"}}}}
      check: doc
      perf: { table: Events }
      slow: |
        {"op":"Scan","input":{"TableName":"Events","FilterExpression":"PK = :p","ExpressionAttributeValues":{":p":{"S":"TENANT#C09#1"}}}}
      expect: { Count: 4, ScannedCount: 4 }
      hint:
        vi: "Partition key `TENANT#C09#1`, không có điều kiện sort key."
        en: "Partition key `TENANT#C09#1`, no sort key condition."
    - name: { vi: "Ghi vào đúng shard", en: "Write into the right shard" }
      task:
        vi: "Sự kiện mới `E-2013` của `C09`: `kind` là `deliver`, `port` là `Port Klang`. Ghi nó vào shard mà phép tính chọn."
        en: "New event `E-2013` of `C09`: `kind` is `deliver`, `port` is `Port Klang`. Write it into the shard the calculation picks."
      solution: |
        {"op": "PutItem", "input": {
          "TableName": "Events",
          "Item": {
            "PK": {"S": "TENANT#C09#0"},
            "SK": {"S": "EV#E-2013"},
            "kind": {"S": "deliver"},
            "port": {"S": "Port Klang"}}}}
      check: doc
      hint:
        vi: "2013 chia 3 dư 0."
        en: "2013 modulo 3 is 0."
quiz:
  - q:
      vi: "Chỉ `C09` có hậu tố; `C01` và `C04` vẫn là `TENANT#<id>`. Vì sao không rải mọi khách ra 3 shard cho đồng đều?"
      en: "Only `C09` has a suffix; `C01` and `C04` stay `TENANT#<id>`. Why not spread every tenant over 3 shards to keep things uniform?"
    options:
      - { vi: "Nên rải hết: càng nhiều shard thì mỗi trang càng đọc rẻ hơn", en: "Spread them all: the more shards, the cheaper every page reads" }
      - { vi: "Khách nhỏ sẽ trả 3 Query cho mỗi trang mà không được gì thêm", en: "Small tenants would pay 3 Queries per page and gain nothing" }
      - { vi: "DynamoDB không cho một khách có nhiều partition key khác nhau", en: "DynamoDB does not let one tenant have several partition keys" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì shard rải tải ghi. Nhưng shard không làm trang đọc rẻ hơn: 3 sự kiện của `C01` rải ra 3 shard vẫn là 3 sự kiện, chỉ phải gửi 3 Query thay vì một rồi gộp lại. Khách nhỏ chưa chạm trần 1000 WCU (write capacity unit, đơn vị ghi) của một partition, nên hậu tố không cứu gì cho họ. DynamoDB thì không cấm một khách có nhiều partition key: `C09` đang có ba. Bảng `Tenants` giữ số shard theo từng khách: chỉ khách lớn trả cái giá đọc nhiều shard."
      en: "It sounds right because shards spread the write load. But shards do not make a page cheaper to read: the 3 events of `C01` spread over 3 shards are still 3 events, only now they need 3 Queries instead of one, plus a merge. Small tenants are nowhere near the 1000 WCU (write capacity unit) ceiling of one partition, so a suffix saves them nothing. And DynamoDB does not forbid one tenant several partition keys: `C09` already has three. Table `Tenants` keeps the shard count per tenant: only the big tenant pays for reading several shards."
  - q:
      vi: "Giờ cao điểm, `C09` ghi 2400 sự kiện mỗi giây, mỗi item dưới 1 KB. Với trần 1000 WCU mỗi partition, cần ít nhất bao nhiêu shard?"
      en: "At peak, `C09` writes 2400 events per second, each item under 1 KB. With a ceiling of 1000 WCU per partition, how many shards are needed at least?"
    options:
      - { vi: "2 shard: mỗi shard nhận 1200 WCU, gần với trần", en: "2 shards: each shard takes 1200 WCU, close to the ceiling" }
      - { vi: "24 shard: mỗi shard nhận 100 WCU cho thật an toàn", en: "24 shards: each shard takes 100 WCU to be really safe" }
      - { vi: "3 shard: mỗi shard nhận 800 WCU, dưới trần", en: "3 shards: each shard takes 800 WCU, under the ceiling" }
    answer: 2
    trap: 0
    why:
      vi: "Mỗi item dưới 1 KB nên mỗi lần ghi tốn 1 WCU (write capacity unit, đơn vị ghi): 2400 lần = 2400 WCU mỗi giây. Hai shard nghe đủ vì 2400 / 1000 = 2,4 gần 2, nhưng 2400 / 2 = 1200 WCU mỗi shard vẫn vượt trần 1000, nên phần dư bị throttle. Làm tròn lên: 3 shard, 2400 / 3 = 800 WCU mỗi shard. 24 shard cũng chạy được, nhưng trang \"Mọi sự kiện\" sẽ phải gửi 24 Query thay vì 3."
      en: "Each item is under 1 KB, so each write costs 1 WCU (write capacity unit): 2400 writes = 2400 WCU per second. Two shards sound enough because 2400 / 1000 = 2.4 is close to 2, but 2400 / 2 = 1200 WCU per shard is still over the 1000 ceiling, so the excess is throttled. Round up: 3 shards, 2400 / 3 = 800 WCU each. 24 shards would also work, but the \"All events\" page would have to send 24 Queries instead of 3."
---
## Mở bài

Cổng Cargo Query có hàng trăm khách nhỏ và một khách lớn, `C09`, gửi sự kiện theo dõi container nhiều hơn mọi khách khác cộng lại. Với khóa `TENANT#C09`, mọi lần ghi của khách đó dồn vào một partition. Bài này rải riêng khách lớn ra nhiều shard và để khách nhỏ yên.

## Ý chính

Một partition chịu tối đa 3000 RCU và 1000 WCU mỗi giây (bài `e-dy-l4-03`). Khách nhỏ ở rất xa trần đó; một khách nóng (hot tenant) thì không. Cách của AWS là write sharding với hậu tố tính được (bài `e-dy-l4-05`): `TENANT#C09#<n mod 3>`, với `n` là số của mã sự kiện. GetItem một sự kiện vẫn đi thẳng; đọc mọi sự kiện của khách lớn là một Query mỗi shard rồi gộp.

Hậu tố chỉ dành cho khách cần nó. Bảng `Tenants` ghi hạng và số shard từng khách: ứng dụng đọc nó trước (một GetItem, dễ đặt cache), rồi biết khóa là `TENANT#C01` hay `TENANT#C09#n`. Khi một khách nhỏ lớn lên, chỉ khách đó đổi số shard; dữ liệu cũ của khách đó phải ghi lại, như mọi lần đổi phép tính.

Chi phí theo từng khách: DynamoDB tính và báo `ConsumedCapacity` theo từng request, còn số liệu CloudWatch theo bảng và index. Muốn biết khách nào tốn bao nhiêu, ứng dụng cộng `ConsumedCapacity` của mỗi request vào mã khách của request đó. Contributor Insights cho thấy khóa nào bị truy cập nhiều nhất.

Lab chạy bằng dynoxide: item, `ScannedCount` và RCU là số đo. Throttle và adaptive capacity thì không: dynoxide không bao giờ throttle, nên phần đó là luật của AWS.

## Cú pháp

```text
shards = Tenants[tenant].shards
pk = shards == 1
  ? "TENANT#<t>"
  : "TENANT#<t>#" + (n mod shards)
read one:  GetItem { PK, SK }
read all:  one Query per shard, merge
```

- Số shard đọc từ bảng hạng khách, không viết cứng.
- Shard tối thiểu = đỉnh WCU / 1000, làm tròn lên, cộng dư.
- RCU của mỗi khách = tổng `ConsumedCapacity` theo khách.

## Ví dụ

Khách nhỏ `C01`: một Query, không hậu tố.

```json
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C01"}}}}
```

3 sự kiện. Request này trả `ConsumedCapacity` đo được: đó là chi phí của `C01` cho trang đó.

Shard 0 của khách lớn `C09`:

```json
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C09#0"}}}}
```

4 sự kiện: `E-2001`, `E-2004`, `E-2007`, `E-2010`. Shard 1 và 2 mỗi shard cũng 4.

Phần dynoxide không chạy được, theo luật của AWS (không đo):

```text
C09 peak: 2400 writes/s, item < 1 KB
1 partition: max 1000 WCU/s
shards >= ceil(2400 / 1000) = 3
over the ceiling -> throttled,
the AWS SDK retries with backoff
```

## Lỗi hay gặp

Quên hậu tố của khách lớn. Câu sai không tìm thấy gì và không báo lỗi:

```json
// WRONG
{"op": "GetItem", "input": {
  "TableName": "Events",
  "Key": {
    "PK": {"S": "TENANT#C09"},
    "SK": {"S": "EV#E-2009"}}}}
```

```json
// FIX
{"op": "GetItem", "input": {
  "TableName": "Events",
  "Key": {
    "PK": {"S": "TENANT#C09#2"},
    "SK": {"S": "EV#E-2009"}}}}
```

Không có item nào mang khóa `TENANT#C09`: mọi sự kiện của `C09` đều có hậu tố, và `E-2009` nằm ở shard 2 vì 2009 chia 3 dư 2. GetItem không tìm thấy khóa thì trả rỗng chứ không báo lỗi, nên lỗi này dễ lọt.

Thêm hậu tố cho mọi khách. Khách `C04` không có shard nào, nên câu sai trả rỗng:

```json
// WRONG
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C04#0"}}}}
```

```json
// FIX
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C04"}}}}
```

`C04` là khách hạng `standard` với `shards` = 1, nên sự kiện của nó nằm ở `TENANT#C04`, không có `#0`. Đọc hạng khách trong bảng `Tenants` trước, rồi mới dựng khóa.

## Thực hành

Bảng `Tenants` có 3 khách; bảng `Events` có 18 sự kiện, 12 của `C09` rải đều qua 3 shard. Đọc hạng của `C09`, đọc một sự kiện bằng GetItem, đọc một shard bằng Query, rồi ghi một sự kiện mới vào đúng shard. Ba bước đọc có thanh chi phí.

## Tóm tắt

- Một partition chịu tối đa 1000 WCU: khách lớn cần hậu tố.
- Chỉ khách lớn có hậu tố; bảng hạng khách giữ số shard.
- Đọc một item: tính hậu tố; đọc hết: một Query mỗi shard.
- Chi phí từng khách = cộng `ConsumedCapacity` theo khách; throttle là luật của AWS, không đo ở đây.
- Bản đồ chủ đề nhiều tenant: `e-ds-l4-09`; khóa có tiền tố khách: `e-dy-l3-14`.

# EN

## Opening

The Cargo Query portal has hundreds of small tenants and one big one, `C09`, which sends more container tracking events than all the others together. With the key `TENANT#C09`, every write of that tenant lands on one partition. This lesson spreads only the big tenant over several shards and leaves the small ones alone.

## Key idea

One partition carries at most 3000 RCU and 1000 WCU per second (lesson `e-dy-l4-03`). Small tenants are far from that ceiling; a hot tenant is not. The AWS way is write sharding with a calculated suffix (lesson `e-dy-l4-05`): `TENANT#C09#<n mod 3>`, with `n` the event number. A GetItem of one event still goes straight to it; reading all of the big tenant's events is one Query per shard, then a merge.

The suffix is only for the tenant that needs it. Table `Tenants` records each tenant's tier and shard count: the application reads it first (one GetItem, easy to cache), then knows whether the key is `TENANT#C01` or `TENANT#C09#n`. When a small tenant grows, only that tenant changes its shard count; its old data must be rewritten, as with any change of the calculation.

Cost per tenant: DynamoDB computes and reports `ConsumedCapacity` per request, while CloudWatch metrics are per table and index. To know what each tenant costs, the application adds each request's `ConsumedCapacity` to that request's tenant id. Contributor Insights shows which keys are accessed most.

The lab runs on dynoxide: items, `ScannedCount` and RCU are measured. Throttling and adaptive capacity are not: dynoxide never throttles, so that part is AWS's rule.

## Syntax

```text
shards = Tenants[tenant].shards
pk = shards == 1
  ? "TENANT#<t>"
  : "TENANT#<t>#" + (n mod shards)
read one:  GetItem { PK, SK }
read all:  one Query per shard, merge
```

- The shard count is read from the tenant tier table, never hard-coded.
- Minimum shards = peak WCU / 1000, rounded up, plus headroom.
- Each tenant's RCU = the sum of `ConsumedCapacity` per tenant.

## Example

Small tenant `C01`: one Query, no suffix.

```json
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C01"}}}}
```

3 events. This request returns a measured `ConsumedCapacity`: that is what the page cost `C01`.

Shard 0 of big tenant `C09`:

```json
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C09#0"}}}}
```

4 events: `E-2001`, `E-2004`, `E-2007`, `E-2010`. Shards 1 and 2 hold 4 each too.

The part dynoxide cannot run, by AWS's rule (not measured):

```text
C09 peak: 2400 writes/s, item < 1 KB
1 partition: max 1000 WCU/s
shards >= ceil(2400 / 1000) = 3
over the ceiling -> throttled,
the AWS SDK retries with backoff
```

## Common mistakes

Forgetting the big tenant's suffix. The wrong one finds nothing and raises no error:

```json
// WRONG
{"op": "GetItem", "input": {
  "TableName": "Events",
  "Key": {
    "PK": {"S": "TENANT#C09"},
    "SK": {"S": "EV#E-2009"}}}}
```

```json
// FIX
{"op": "GetItem", "input": {
  "TableName": "Events",
  "Key": {
    "PK": {"S": "TENANT#C09#2"},
    "SK": {"S": "EV#E-2009"}}}}
```

No item carries the key `TENANT#C09`: every event of `C09` has a suffix, and `E-2009` sits in shard 2 because 2009 modulo 3 is 2. A GetItem that finds no key returns nothing rather than an error, so this mistake slips through easily.

Adding a suffix for every tenant. Tenant `C04` has no shards, so the wrong one returns nothing:

```json
// WRONG
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C04#0"}}}}
```

```json
// FIX
{"op": "Query", "input": {
  "TableName": "Events",
  "KeyConditionExpression":
    "PK = :p",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#C04"}}}}
```

`C04` is a `standard` tenant with `shards` = 1, so its events live at `TENANT#C04`, without `#0`. Read the tenant's tier in table `Tenants` first, then build the key.

## Practice

Table `Tenants` holds 3 tenants; table `Events` holds 18 events, 12 of them from `C09`, spread evenly over 3 shards. Read the tier of `C09`, read one event with GetItem, read one shard with a Query, then write a new event into the right shard. The three reads have a cost bar.

## Recap

- One partition carries at most 1000 WCU: a big tenant needs a suffix.
- Only the big tenant has a suffix; the tenant tier table keeps the shard count.
- Reading one item: compute the suffix; reading all: one Query per shard.
- Each tenant's cost = the sum of `ConsumedCapacity` per tenant; throttling is AWS's rule, not measured here.
- The multi-tenant topic map: `e-ds-l4-09`; tenant-prefixed keys: `e-dy-l3-14`.
