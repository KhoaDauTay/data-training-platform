---
id: e-dy-l5-01
engine: dynamodb
level: L5
module: streams-ttl
title: "DynamoDB Streams: nhật ký thay đổi theo từng item"
title_en: "DynamoDB Streams: a change log per item"
kind: concept
runtime: docs
minutes: 8
objectives:
  - { vi: "Nêu ba bảo đảm của Streams: giữ 24 giờ, mỗi bản ghi đúng một lần, đúng thứ tự trong từng item", en: "State the three guarantees of Streams: kept 24 hours, each record exactly once, in order within each item" }
  - { vi: "Chọn kiểu view phù hợp (KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES)", en: "Pick the right view type (KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES)" }
  - { vi: "Thiết kế bộ xử lý không dựa vào thứ tự giữa các item hay tính nguyên khối của transaction", en: "Design a consumer that does not rely on ordering across items or on transaction atomicity" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
quiz:
  - q: { vi: "Bộ xử lý Streams cộng tổng tiền theo cửa hàng. Hai đơn khác nhau của cùng cửa hàng được ghi gần như cùng lúc. Điều gì được bảo đảm?", en: "A Streams consumer adds up totals per store. Two different orders of the same store are written almost at once. What is guaranteed?" }
    options:
      - { vi: "Hai bản ghi đến theo đúng thứ tự ghi, vì cùng cửa hàng", en: "The two records arrive in write order, since it is the same store" }
      - { vi: "Mỗi bản ghi đến đúng một lần; thứ tự chỉ được bảo đảm giữa các thay đổi của cùng một item", en: "Each record arrives exactly once; order is only guaranteed between changes to the same item" }
      - { vi: "Không có gì được bảo đảm", en: "Nothing is guaranteed" }
    answer: 1
    trap: 0
    why: { vi: "\"Cùng cửa hàng\" chưa đủ: hai đơn là hai item với hai khóa chính khác nhau, mà Streams chỉ bảo đảm thứ tự giữa các thay đổi của cùng một khóa chính, không theo partition hay item collection. Nhưng không phải không có gì: mỗi bản ghi vẫn xuất hiện đúng một lần trong stream. Phép cộng tổng không phụ thuộc thứ tự nên vẫn đúng.", en: "\"Same store\" is not enough: the two orders are two items with two different primary keys, and Streams only guarantees order between changes to the same primary key, not per partition or item collection. But it is not \"nothing\" either: each record still appears exactly once in the stream. A sum does not depend on order, so it stays correct." }
  - q: { vi: "Một `TransactWriteItems` sửa ba item. Bộ xử lý Streams nhìn thấy gì?", en: "One `TransactWriteItems` changes three items. What does the Streams consumer see?" }
    options:
      - { vi: "Một bản ghi gộp cả ba item", en: "One record covering all three items" }
      - { vi: "Ba bản ghi, có thể đến vào các thời điểm khác nhau và xen với bản ghi của transaction khác", en: "Three records, possibly arriving at different times and interleaved with other transactions' records" }
      - { vi: "Không có bản ghi nào, transaction đi đường riêng", en: "No records, transactions take a separate path" }
    answer: 1
    why: { vi: "Streams ghi theo từng item, nên ba item đổi là ba bản ghi, không có bản ghi gộp. Transaction cũng không đi đường riêng: mọi lần ghi làm đổi dữ liệu đều vào stream. Ba bản ghi lan sang Streams dần dần và có thể xen với bản ghi của transaction khác, nên bộ xử lý không được giả định cả ba đến cùng lúc hay theo thứ tự.", en: "Streams records per item, so three changed items make three records, never one combined record. Transactions do not take a separate path either: every write that changes data goes into the stream. The three records propagate gradually and may interleave with other transactions' records, so the consumer must not assume they arrive together or in order." }
  - q: { vi: "Bạn muốn biết số tiền cũ và mới mỗi khi một đơn bị sửa. Chọn view nào?", en: "You want both the old and the new amount whenever an order changes. Which view type?" }
    options:
      - { vi: "`KEYS_ONLY`", en: "`KEYS_ONLY`" }
      - { vi: "`NEW_IMAGE`", en: "`NEW_IMAGE`" }
      - { vi: "`NEW_AND_OLD_IMAGES`", en: "`NEW_AND_OLD_IMAGES`" }
    answer: 2
    why: { vi: "`KEYS_ONLY` chỉ ghi khóa của item, không có số tiền nào; `NEW_IMAGE` chỉ có item sau khi sửa, nên thiếu số tiền cũ. Chỉ `NEW_AND_OLD_IMAGES` ghi cả item trước và sau khi sửa. View type không đổi được sau khi bật stream: phải tắt rồi tạo stream mới.", en: "`KEYS_ONLY` records only the item's key, no amount at all; `NEW_IMAGE` holds only the item after the change, so the old amount is missing. Only `NEW_AND_OLD_IMAGES` records the item both before and after the change. The view type cannot be edited once the stream is set up: disable it and create a new one." }
---

## Mở bài

Mỗi đơn mới phải cộng vào doanh thu của cửa hàng, gửi thông báo và đồng bộ sang kho dữ liệu. Gọi ba việc đó ngay trong request ghi làm chậm và dễ hỏng. Có cách nào để bảng tự kể lại mọi thay đổi cho người khác xử lý sau không?

## Ý chính

Bật **DynamoDB Streams** trên bảng thì mỗi lần tạo, sửa hay xóa một item, DynamoDB ghi một **bản ghi** (stream record) gần như tức thì. Ứng dụng đọc nhật ký đó để làm CDC: cập nhật tổng, đồng bộ sang hệ khác, gửi thông báo.

- Giữ tối đa **24 giờ**; cũ hơn có thể bị cắt bất cứ lúc nào.
- Mỗi bản ghi xuất hiện **đúng một lần** trong stream.
- Thứ tự được bảo đảm **theo từng item** (cùng khóa chính), không theo partition hay item collection.
- Bốn kiểu view: `KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`.

Bản ghi nằm trong các **shard**; mỗi shard đang mở ứng với đúng một partition của bảng, và không nên có quá **2** tiến trình cùng đọc một shard. `PutItem`/`UpdateItem` không đổi dữ liệu thì không sinh bản ghi. Thay đổi của một transaction đến dần, có thể xen với transaction khác.

Nhiều người nghĩ "đúng một lần" nghĩa là bộ xử lý chạy mỗi bản ghi đúng một lần. Thật ra stream giữ mỗi bản ghi một lần, nhưng bộ xử lý (ví dụ Lambda) lỗi giữa chừng thì cả lô được đọc lại: hãy viết bộ xử lý chịu được lần chạy lặp (idempotent).

Bộ máy trong trình duyệt (dynoxide 1.5.0) trả `UnsupportedOperation` cho các API Streams, nên bài này chưa chạy được trong trình duyệt.

## Cú pháp

```text
UpdateTable { TableName, StreamSpecification: { StreamEnabled: true,
  StreamViewType: KEYS_ONLY | NEW_IMAGE | OLD_IMAGE | NEW_AND_OLD_IMAGES } }
record = { eventName: INSERT | MODIFY | REMOVE, dynamodb: { Keys, NewImage?, OldImage?, SequenceNumber }, userIdentity? }
```

- `StreamViewType`: phần item được ghi vào bản ghi; không sửa được, phải tắt rồi bật stream mới.
- `eventName`: loại thay đổi.
- `userIdentity`: chỉ có khi dịch vụ xóa item (TTL).

## Ví dụ

Một bộ xử lý (thường là Lambda) cộng doanh thu theo cửa hàng, chỉ dùng ảnh cũ và mới của chính item:

```text
INSERT  ORDER#o1  NEW: store=S01 total=200000                  -> S01 += 200000
MODIFY  ORDER#o1  OLD: total=200000  NEW: total=250000         -> S01 += 50000
REMOVE  ORDER#o1  OLD: total=250000                            -> S01 -= 250000
```

Một `TransactWriteItems` chuyển tiền giữa hai ví thành hai bản ghi riêng, có thể xen với transaction khác:

```text
MODIFY  WALLET#a  (transaction T1)
MODIFY  WALLET#b  (transaction T2)   <- another transaction in between
MODIFY  WALLET#b  (transaction T1)
```

## Lỗi hay gặp

Tin vào thứ tự giữa các item:

```text
// WRONG: "order o2 was written after o1, so its record comes after o1's"
last_order[store] = record.NewImage.id
```

```text
// FIX: compare a value stored in the item itself
if record.NewImage.created_at > last_order[store].created_at: last_order[store] = record.NewImage
```

`o1` và `o2` là hai item khác khóa chính, nên Streams không hứa bản ghi của `o2` đến sau; so bằng một giá trị nằm trong chính item thì thứ tự đến không còn quan trọng.

Chọn view thiếu dữ liệu cần dùng:

```text
// WRONG: StreamViewType KEYS_ONLY, then the consumer needs the old total
S01 -= ???   (the record holds only the keys)
```

```text
// FIX: NEW_AND_OLD_IMAGES carries both images
S01 += NewImage.total - OldImage.total
```

## Tóm tắt

- Streams ghi mỗi thay đổi item thành một bản ghi, giữ 24 giờ.
- Thứ tự chỉ được bảo đảm trong cùng một item, không giữa các item hay trong một transaction.
- Chọn view theo dữ liệu bộ xử lý cần; view không sửa được sau khi bật.
- Bộ xử lý phải chịu được lần chạy lặp và không giả định tính nguyên khối của transaction.

# EN

## Opening

Every new order must be added to the store's revenue, trigger a notification and sync to the data warehouse. Doing all three inside the write request makes it slow and fragile. Is there a way for the table to report every change so someone else can handle it later?

## Key idea

With **DynamoDB Streams** on, every time an item is created, updated or deleted DynamoDB writes a **stream record** in near-real time. Applications read that log for CDC: update totals, sync another system, send notifications.

- Kept for at most **24 hours**; older data can be trimmed at any moment.
- Each record appears **exactly once** in the stream.
- Order is guaranteed **per item** (same primary key), not per partition or item collection.
- Four view types: `KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`.

Records live in **shards**; each open shard maps to exactly one partition of the table, and no more than **2** processes should read one shard at the same time. A `PutItem`/`UpdateItem` that changes no data writes no record. A transaction's changes arrive gradually and may interleave with other transactions.

Many people think "exactly once" means the consumer processes each record exactly once. In fact the stream holds each record once, but a consumer (for example Lambda) that fails midway reads the whole batch again: write consumers that tolerate a repeat run (idempotent).

The in-browser engine (dynoxide 1.5.0) returns `UnsupportedOperation` for the Streams APIs, so this lesson does not run in the browser yet.

## Syntax

```text
UpdateTable { TableName, StreamSpecification: { StreamEnabled: true,
  StreamViewType: KEYS_ONLY | NEW_IMAGE | OLD_IMAGE | NEW_AND_OLD_IMAGES } }
record = { eventName: INSERT | MODIFY | REMOVE, dynamodb: { Keys, NewImage?, OldImage?, SequenceNumber }, userIdentity? }
```

- `StreamViewType`: which part of the item goes into the record; it cannot be edited, disable it and enable a new stream.
- `eventName`: the kind of change.
- `userIdentity`: present only when the service deleted the item (TTL).

## Example

A consumer (usually Lambda) adds up revenue per store, using only that item's own old and new images:

```text
INSERT  ORDER#o1  NEW: store=S01 total=200000                  -> S01 += 200000
MODIFY  ORDER#o1  OLD: total=200000  NEW: total=250000         -> S01 += 50000
REMOVE  ORDER#o1  OLD: total=250000                            -> S01 -= 250000
```

One `TransactWriteItems` moving money between two wallets becomes two separate records, possibly interleaved with another transaction:

```text
MODIFY  WALLET#a  (transaction T1)
MODIFY  WALLET#b  (transaction T2)   <- another transaction in between
MODIFY  WALLET#b  (transaction T1)
```

## Common mistakes

Trusting order across items:

```text
// WRONG: "order o2 was written after o1, so its record comes after o1's"
last_order[store] = record.NewImage.id
```

```text
// FIX: compare a value stored in the item itself
if record.NewImage.created_at > last_order[store].created_at: last_order[store] = record.NewImage
```

`o1` and `o2` are two items with different primary keys, so Streams does not promise that the record of `o2` comes later; comparing a value stored in the item itself makes arrival order irrelevant.

Picking a view that lacks the data you need:

```text
// WRONG: StreamViewType KEYS_ONLY, then the consumer needs the old total
S01 -= ???   (the record holds only the keys)
```

```text
// FIX: NEW_AND_OLD_IMAGES carries both images
S01 += NewImage.total - OldImage.total
```

## Recap

- Streams turns every item change into a record, kept for 24 hours.
- Order is guaranteed only within one item, not across items or inside a transaction.
- Pick the view from the data the consumer needs; it cannot be edited once enabled.
- Consumers must tolerate repeat runs and must not assume transaction atomicity.
