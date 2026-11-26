---
id: e-dy-l5-06
engine: dynamodb
level: L5
module: global-ops
title: "DAX: bộ đệm trong bộ nhớ trước DynamoDB"
title_en: "DAX: an in-memory cache in front of DynamoDB"
kind: concept
runtime: docs
minutes: 8
figures: [{ name: dy-dax-caches, at: example }]
objectives:
  - { vi: "Phân biệt item cache (GetItem, BatchGetItem) và query cache (Query, Scan) của DAX", en: "Tell the DAX item cache (GetItem, BatchGetItem) from its query cache (Query, Scan)" }
  - { vi: "Biết request nào DAX trả từ bộ đệm và request nào nó chuyển thẳng sang DynamoDB", en: "Know which requests DAX answers from cache and which it passes straight to DynamoDB" }
  - { vi: "Chọn hay không chọn DAX cho một mẫu truy cập", en: "Decide whether an access pattern should use DAX" }
requires: [e-dy-l4-06]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html
quiz:
  - q: { vi: "Ứng dụng ghi một item qua DAX bằng `UpdateItem`, rồi chạy lại đúng `Query` đã chạy một phút trước. `Query` trả gì?", en: "An app writes an item through DAX with `UpdateItem`, then reruns the exact `Query` it ran a minute ago. What does the `Query` return?" }
    options:
      - { vi: "Kết quả mới, vì DAX là write-through", en: "The new result, because DAX is write-through" }
      - { vi: "Kết quả cũ trong query cache, tới khi TTL của kết quả đó hết hoặc nó bị LRU loại", en: "The old result from the query cache, until that result's TTL expires or LRU evicts it" }
      - { vi: "Lỗi, vì query cache bị giữ lock khi có lần ghi", en: "An error, because the query cache is locked during a write" }
    answer: 1
    trap: 0
    why: { vi: "Đáp án \"kết quả mới\" nghe hợp lý vì DAX (DynamoDB Accelerator, bộ đệm trong bộ nhớ) là write-through. Nhưng write-through chỉ cập nhật item cache, nơi giữ kết quả `GetItem` theo khóa. Query cache là bộ đệm độc lập: lần ghi không làm mất hiệu lực hay sửa kết quả `Query` đã lưu, nên `Query` một phút trước vẫn được trả lại cho tới khi hạn sống (TTL) của kết quả đó hết hoặc LRU (loại mục lâu không dùng) đẩy nó ra. Cũng không có lỗi: DAX không khóa (lock) bộ đệm khi ghi, nó chỉ trả bản cũ.", en: "\"The new result\" sounds right because DAX (DynamoDB Accelerator, an in-memory cache) is write-through. But write-through only updates the item cache, which holds `GetItem` results by key. The query cache is independent: a write neither invalidates nor changes a stored `Query` result, so the minute-old `Query` result comes back until that result's time to live (TTL) runs out or LRU (evicting the least recently used entry) pushes it out. There is no error either: DAX does not lock the cache during a write, it just returns the old copy." }
  - q: { vi: "Request nào DAX **không** lưu vào bộ đệm, mà chuyển thẳng sang DynamoDB?", en: "Which request does DAX **not** cache, passing it straight to DynamoDB?" }
    options:
      - { vi: "`GetItem` đọc cuối cùng (mặc định)", en: "An eventually consistent `GetItem` (the default)" }
      - { vi: "`Query` đọc cuối cùng", en: "An eventually consistent `Query`" }
      - { vi: "`GetItem` có `ConsistentRead: true`, và mọi `TransactGetItems`", en: "A `GetItem` with `ConsistentRead: true`, and every `TransactGetItems`" }
    answer: 2
    why: { vi: "`GetItem` và `Query` đọc nhất quán cuối (eventually consistent) chính là thứ DAX (DynamoDB Accelerator) lưu: `GetItem` vào item cache, `Query` vào query cache. Đọc nhất quán mạnh (strongly consistent) phải thấy lần ghi mới nhất, mà bộ đệm có thể đang giữ bản cũ, nên DAX không tự trả được. Đọc nhất quán mạnh và `TransactGetItems` đi thẳng sang DynamoDB, kết quả trả về nhưng không được lưu.", en: "Eventually consistent `GetItem` and `Query` are exactly what DAX (DynamoDB Accelerator) caches: `GetItem` in the item cache, `Query` in the query cache. A strongly consistent read must see the latest write, and the cache may hold an old copy, so DAX cannot serve it itself. Strongly consistent reads and `TransactGetItems` go straight to DynamoDB; the result is returned but not cached." }
  - q: { vi: "Ứng dụng nào hợp với DAX nhất?", en: "Which application suits DAX best?" }
    options:
      - { vi: "Nạp hàng loạt dữ liệu, ghi nhiều đọc ít", en: "Bulk data loading, many writes and few reads" }
      - { vi: "Trang khuyến mãi một ngày: một sản phẩm bị đọc lặp lại hàng nghìn lần mỗi giây, chấp nhận dữ liệu trễ vài phút", en: "A one-day sale page: one product read thousands of times per second, a few minutes of staleness accepted" }
      - { vi: "Số dư ví phải luôn đọc bản mới nhất", en: "A wallet balance that must always read the latest value" }
    answer: 1
    why: { vi: "DAX (DynamoDB Accelerator) hợp với đọc lặp lại trên ít khóa (khóa nóng) khi chấp nhận đọc nhất quán cuối; AWS nói nó tốt nhất khi tỉ lệ trúng bộ đệm trên 90 %. Trang khuyến mãi đọc một sản phẩm hàng nghìn lần mỗi giây nên gần như lần nào cũng trúng. Nạp hàng loạt thì ghi nhiều đọc ít, bộ đệm không có gì để trả lại. Số dư ví cần đọc nhất quán mạnh, loại đọc DAX chuyển thẳng sang DynamoDB, nên không lợi gì.", en: "DAX (DynamoDB Accelerator) suits repeated reads of a few keys (hot keys) when eventually consistent reads are fine; AWS says it performs best above a 90% cache hit rate. The sale page reads one product thousands of times per second, so nearly every read is a hit. Bulk loading writes a lot and reads little, so the cache has nothing to serve. A wallet balance needs strongly consistent reads, which DAX passes straight to DynamoDB, so it gains nothing." }
---

## Mở bài

Trang khuyến mãi một ngày đọc cùng một sản phẩm 5.000 lần mỗi giây, và hóa đơn RCU tăng vọt. Bạn nghĩ tới một bộ đệm trước bảng. Bộ đệm đó trả gì khi dữ liệu vừa đổi?

## Ý chính

**DAX** (DynamoDB Accelerator) là một cụm bộ đệm trong bộ nhớ đặt trước bảng, API tương thích DynamoDB. Đọc trúng bộ đệm giảm từ vài mili giây xuống **micro giây**, và bớt RCU phải mua cho đọc lặp lại. Cụm chạy trong VPC và cần client DAX.

DAX có hai bộ đệm **độc lập**. **Item cache** giữ kết quả `GetItem`, `BatchGetItem` theo khóa chính. **Query cache** giữ kết quả `Query`, `Scan` theo tham số request. Mỗi bộ đệm có TTL (item cache mặc định **5 phút**) và loại bớt theo LRU. Đọc mạnh (`ConsistentRead: true`) và `TransactGetItems` đi thẳng sang DynamoDB, không được lưu.

Nhiều người nghĩ write-through nghĩa là mọi kết quả đã lưu đều mới. Thật ra `PutItem`, `UpdateItem`, `DeleteItem`, `BatchWriteItem` qua DAX ghi vào DynamoDB rồi chỉ cập nhật **item cache**: query cache giữ kết quả cũ tới khi hết TTL. Ghi thẳng vào bảng (bỏ qua DAX) thì cả item cache cũng giữ bản cũ tới khi hết TTL.

DAX hợp với đọc lặp lại trên ít khóa khi chấp nhận đọc cuối cùng; không hợp với ứng dụng cần đọc mạnh, ghi nhiều, hoặc ít đọc lặp lại. DAX chỉ có trên AWS thật, nên bài này chưa chạy được trong trình duyệt.

## Cú pháp

```text
CreateCluster { ClusterName, NodeType, ReplicationFactor, IamRoleArn, SubnetGroupName,
  ParameterGroupName }      (parameters: record-ttl-millis, query-ttl-millis)
client = DAX client (same calls as DynamoDB: GetItem, Query, PutItem, ...)  -> cluster endpoint
```

- `record-ttl-millis`: TTL của item cache (mặc định 5 phút).
- `query-ttl-millis`: TTL của query cache.
- `ReplicationFactor`: số node; nhiều node cho đọc nhiều hơn và chịu lỗi.

## Ví dụ

Request nào được phục vụ từ đâu:

```text
request (through DAX)                    served from
GetItem, eventual                        item cache (miss: DynamoDB, then cached)
Query, eventual                          query cache (miss: DynamoDB, then cached)
GetItem, ConsistentRead: true            DynamoDB, not cached
TransactGetItems                         DynamoDB, not cached
UpdateItem                               DynamoDB, then item cache; query cache unchanged
```

Một lần ghi qua DAX, rồi đọc lại: Query `category = tea` lúc 12:00:00 lưu 12 item vào query cache; `UpdateItem` đổi giá `P-01` thành 50000 lúc 12:00:30; `GetItem` lúc 12:00:40 thấy giá mới từ item cache, còn Query lúc 12:00:45 vẫn trả giá cũ từ query cache. Hình dưới đi từng bước.

## Lỗi hay gặp

Mong lần ghi làm mới kết quả Query:

```text
// WRONG: "DAX is write-through, so the listing shows the new price at once"
UpdateItem via DAX, then the same Query   -> old result until query-ttl-millis
```

```text
// FIX: read the changed item by key, or keep a short query TTL for pages that must be fresh
GetItem via DAX   -> new price from the item cache
```

Đưa đọc mạnh qua DAX để "nhanh hơn":

```text
// WRONG: every balance read uses ConsistentRead: true through DAX
GetItem WALLET#w1, ConsistentRead: true   -> straight to DynamoDB, no cache gain
```

```text
// FIX: send only eventual reads of hot keys through DAX
GetItem PRODUCT#P-01 (eventual) via DAX   -> microseconds from the item cache
```

## Tóm tắt

- DAX = bộ đệm trong bộ nhớ trước DynamoDB, đọc trúng tính bằng micro giây.
- Item cache (`GetItem`, `BatchGetItem`) và query cache (`Query`, `Scan`) độc lập.
- Ghi qua DAX chỉ cập nhật item cache; query cache giữ kết quả cũ tới hết TTL.
- Đọc mạnh và `TransactGetItems` đi thẳng sang DynamoDB, không được lưu.

# EN

## Opening

A one-day sale page reads the same product 5,000 times per second, and the RCU bill shoots up. You think of a cache in front of the table. What does that cache return when the data has just changed?

## Key idea

**DAX** (DynamoDB Accelerator) is an in-memory cache cluster in front of a table, API-compatible with DynamoDB. A cache hit drops a read from a few milliseconds to **microseconds**, and cuts the RCU you buy for repeated reads. The cluster runs in a VPC and needs the DAX client.

DAX has two **independent** caches. The **item cache** holds `GetItem` and `BatchGetItem` results by primary key. The **query cache** holds `Query` and `Scan` results by request parameters. Each has a TTL (the item cache defaults to **5 minutes**) and LRU eviction. Strong reads (`ConsistentRead: true`) and `TransactGetItems` go straight to DynamoDB and are not cached.

Many people think write-through means every cached result is fresh. In fact `PutItem`, `UpdateItem`, `DeleteItem` and `BatchWriteItem` through DAX write to DynamoDB and then update only the **item cache**: the query cache keeps its old result until its TTL runs out. Writing to the table directly (bypassing DAX) leaves even the item cache stale until its TTL runs out.

DAX suits repeated reads of a few keys when eventual reads are fine; it does not fit apps that need strong reads, write a lot, or rarely repeat reads. DAX exists only on real AWS, so this lesson does not run in the browser yet.

## Syntax

```text
CreateCluster { ClusterName, NodeType, ReplicationFactor, IamRoleArn, SubnetGroupName,
  ParameterGroupName }      (parameters: record-ttl-millis, query-ttl-millis)
client = DAX client (same calls as DynamoDB: GetItem, Query, PutItem, ...)  -> cluster endpoint
```

- `record-ttl-millis`: the item cache TTL (default 5 minutes).
- `query-ttl-millis`: the query cache TTL.
- `ReplicationFactor`: the number of nodes; more nodes give more reads and fault tolerance.

## Example

Which request is served from where:

```text
request (through DAX)                    served from
GetItem, eventual                        item cache (miss: DynamoDB, then cached)
Query, eventual                          query cache (miss: DynamoDB, then cached)
GetItem, ConsistentRead: true            DynamoDB, not cached
TransactGetItems                         DynamoDB, not cached
UpdateItem                               DynamoDB, then item cache; query cache unchanged
```

One write through DAX, then reading again: a Query `category = tea` at 12:00:00 stores 12 items in the query cache; `UpdateItem` sets the price of `P-01` to 50000 at 12:00:30; a `GetItem` at 12:00:40 sees the new price from the item cache, while the Query at 12:00:45 still returns the old price from the query cache. The figure below goes step by step.

## Common mistakes

Expecting a write to refresh a Query result:

```text
// WRONG: "DAX is write-through, so the listing shows the new price at once"
UpdateItem via DAX, then the same Query   -> old result until query-ttl-millis
```

```text
// FIX: read the changed item by key, or keep a short query TTL for pages that must be fresh
GetItem via DAX   -> new price from the item cache
```

Sending strong reads through DAX to "go faster":

```text
// WRONG: every balance read uses ConsistentRead: true through DAX
GetItem WALLET#w1, ConsistentRead: true   -> straight to DynamoDB, no cache gain
```

```text
// FIX: send only eventual reads of hot keys through DAX
GetItem PRODUCT#P-01 (eventual) via DAX   -> microseconds from the item cache
```

## Recap

- DAX = an in-memory cache in front of DynamoDB, hits in microseconds.
- The item cache (`GetItem`, `BatchGetItem`) and the query cache (`Query`, `Scan`) are independent.
- A write through DAX updates only the item cache; the query cache stays stale until its TTL.
- Strong reads and `TransactGetItems` go straight to DynamoDB and are not cached.
