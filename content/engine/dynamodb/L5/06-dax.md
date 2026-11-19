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
      - { vi: "Lỗi, vì query cache bị khóa khi có lần ghi", en: "An error, because the query cache is locked during a write" }
    answer: 1
    why: { vi: "Write-through chỉ cập nhật item cache. Item cache và query cache độc lập: lần ghi không làm mất hiệu lực hay sửa kết quả `Query`/`Scan` đã lưu.", en: "Write-through only updates the item cache. The item cache and the query cache are independent: a write neither invalidates nor changes a stored `Query`/`Scan` result." }
  - q: { vi: "Request nào DAX **không** lưu vào bộ đệm, mà chuyển thẳng sang DynamoDB?", en: "Which request does DAX **not** cache, passing it straight to DynamoDB?" }
    options:
      - { vi: "`GetItem` đọc cuối cùng (mặc định)", en: "An eventually consistent `GetItem` (the default)" }
      - { vi: "`Query` đọc cuối cùng", en: "An eventually consistent `Query`" }
      - { vi: "`GetItem` có `ConsistentRead: true`, và mọi `TransactGetItems`", en: "A `GetItem` with `ConsistentRead: true`, and every `TransactGetItems`" }
    answer: 2
    why: { vi: "DAX không gắn chặt với DynamoDB nên không tự trả được đọc mạnh. Đọc mạnh và `TransactGetItems` đi thẳng sang DynamoDB, kết quả trả về nhưng không được lưu.", en: "DAX is not tightly coupled to DynamoDB, so it cannot serve strong reads itself. Strong reads and `TransactGetItems` go straight to DynamoDB; the result is returned but not cached." }
  - q: { vi: "Ứng dụng nào hợp với DAX nhất?", en: "Which application suits DAX best?" }
    options:
      - { vi: "Nạp hàng loạt dữ liệu, ghi nhiều đọc ít", en: "Bulk data loading, many writes and few reads" }
      - { vi: "Trang khuyến mãi một ngày: một sản phẩm bị đọc lặp lại hàng nghìn lần mỗi giây, chấp nhận dữ liệu trễ vài phút", en: "A one-day sale page: one product read thousands of times per second, a few minutes of staleness accepted" }
      - { vi: "Số dư ví phải luôn đọc bản mới nhất", en: "A wallet balance that must always read the latest value" }
    answer: 1
    why: { vi: "DAX hợp với đọc lặp lại trên ít khóa (khóa nóng) khi chấp nhận đọc cuối cùng; AWS nói nó tốt nhất khi tỉ lệ trúng bộ đệm trên 90 %. Ứng dụng ghi nhiều hoặc cần đọc mạnh không hợp.", en: "DAX suits repeated reads of a few keys (hot keys) when eventual reads are fine; AWS says it performs best above a 90% cache hit rate. Write-heavy apps and apps needing strong reads do not fit." }
---

## Ý chính

**DAX** (DynamoDB Accelerator) là một cụm bộ đệm trong bộ nhớ đặt trước bảng, API tương thích DynamoDB. Đọc trúng bộ đệm giảm từ vài mili giây xuống **micro giây**, và bớt RCU phải mua cho đọc lặp lại.

- **Item cache**: kết quả `GetItem`, `BatchGetItem`, lưu theo khóa chính.
- **Query cache**: kết quả `Query`, `Scan`, lưu theo tham số request. Hai bộ đệm **độc lập**.
- Mỗi bộ đệm có TTL (item cache mặc định **5 phút**) và LRU.
- **Write-through**: `PutItem`, `UpdateItem`, `DeleteItem`, `BatchWriteItem` ghi vào DynamoDB trước, rồi cập nhật item cache. Lần ghi **không** làm mất hiệu lực query cache.
- Đọc mạnh (`ConsistentRead: true`) và `TransactGetItems` đi thẳng sang DynamoDB, không được lưu.
- Ghi thẳng vào bảng (bỏ qua DAX) thì item cache giữ bản cũ tới khi hết TTL.
- Cụm chạy trong VPC, cần client DAX. Không hợp với ứng dụng cần đọc mạnh, ghi nhiều, hoặc ít đọc lặp lại.

DAX chỉ có trên AWS thật, nên bài này **chưa chạy được trong trình duyệt**.

## Ví dụ

```text
request (through DAX)                    served from
GetItem, eventual                        item cache (miss: DynamoDB, then cached)
Query, eventual                          query cache (miss: DynamoDB, then cached)
GetItem, ConsistentRead: true            DynamoDB, not cached
TransactGetItems                         DynamoDB, not cached
UpdateItem                               DynamoDB, then item cache; query cache unchanged
```

# EN

## Key idea

**DAX** (DynamoDB Accelerator) is an in-memory cache cluster in front of a table, API-compatible with DynamoDB. A cache hit drops a read from a few milliseconds to **microseconds**, and cuts the RCU you buy for repeated reads.

- **Item cache**: results of `GetItem`, `BatchGetItem`, stored by primary key.
- **Query cache**: results of `Query`, `Scan`, stored by request parameters. The two caches are **independent**.
- Each cache has a TTL (the item cache defaults to **5 minutes**) and LRU.
- **Write-through**: `PutItem`, `UpdateItem`, `DeleteItem`, `BatchWriteItem` write to DynamoDB first, then update the item cache. A write does **not** invalidate the query cache.
- Strong reads (`ConsistentRead: true`) and `TransactGetItems` go straight to DynamoDB and are not cached.
- Writing to the table directly (bypassing DAX) leaves the old version in the item cache until its TTL runs out.
- The cluster runs in a VPC and needs the DAX client. It does not fit apps that need strong reads, write a lot, or rarely repeat reads.

DAX exists only on real AWS, so this lesson does not run in the browser yet.

## Example

```text
request (through DAX)                    served from
GetItem, eventual                        item cache (miss: DynamoDB, then cached)
Query, eventual                          query cache (miss: DynamoDB, then cached)
GetItem, ConsistentRead: true            DynamoDB, not cached
TransactGetItems                         DynamoDB, not cached
UpdateItem                               DynamoDB, then item cache; query cache unchanged
```
