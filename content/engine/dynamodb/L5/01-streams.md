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
  - { vi: "Thiết kế bộ xử lý không dựa vào thứ tự giữa các item hay tính nguyên khối của giao dịch", en: "Design a consumer that does not rely on ordering across items or on transaction atomicity" }
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
    why: { vi: "Streams bảo đảm thứ tự theo khóa chính của từng item, không theo partition hay item collection. Phép cộng tổng không phụ thuộc thứ tự nên vẫn đúng.", en: "Streams guarantees order per item primary key, not per partition or item collection. A sum does not depend on order, so it stays correct." }
  - q: { vi: "Một `TransactWriteItems` sửa ba item. Bộ xử lý Streams nhìn thấy gì?", en: "One `TransactWriteItems` changes three items. What does the Streams consumer see?" }
    options:
      - { vi: "Một bản ghi gộp cả ba item", en: "One record covering all three items" }
      - { vi: "Ba bản ghi, có thể đến vào các thời điểm khác nhau và xen với bản ghi của giao dịch khác", en: "Three records, possibly arriving at different times and interleaved with other transactions' records" }
      - { vi: "Không có bản ghi nào, giao dịch đi đường riêng", en: "No records, transactions take a separate path" }
    answer: 1
    why: { vi: "Thay đổi của giao dịch lan sang Streams dần dần; bộ xử lý không được giả định tính nguyên khối hay thứ tự của giao dịch.", en: "A transaction's changes propagate to Streams gradually; consumers must not assume transaction atomicity or ordering." }
  - q: { vi: "Bạn muốn biết số tiền cũ và mới mỗi khi một đơn bị sửa. Chọn view nào?", en: "You want both the old and the new amount whenever an order changes. Which view type?" }
    options:
      - { vi: "`KEYS_ONLY`", en: "`KEYS_ONLY`" }
      - { vi: "`NEW_IMAGE`", en: "`NEW_IMAGE`" }
      - { vi: "`NEW_AND_OLD_IMAGES`", en: "`NEW_AND_OLD_IMAGES`" }
    answer: 2
    why: { vi: "Chỉ `NEW_AND_OLD_IMAGES` ghi cả item trước và sau khi sửa. View type không đổi được sau khi bật stream: phải tắt rồi tạo stream mới.", en: "Only `NEW_AND_OLD_IMAGES` records the item both before and after the change. The view type cannot be edited once the stream is set up: disable it and create a new one." }
---

## Ý chính

Bật **DynamoDB Streams** trên bảng thì mỗi lần tạo, sửa hay xóa một item, DynamoDB ghi một **bản ghi** (stream record) gần như tức thì. Ứng dụng đọc nhật ký đó để làm CDC: cập nhật tổng, đồng bộ sang hệ khác, gửi thông báo.

- Giữ tối đa **24 giờ**; cũ hơn có thể bị cắt bất cứ lúc nào.
- Mỗi bản ghi xuất hiện **đúng một lần**.
- Thứ tự được bảo đảm **theo từng item** (cùng khóa chính), không theo partition hay item collection.
- Bốn kiểu view: `KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`.
- Bản ghi nằm trong các **shard**; mỗi shard đang mở ứng với đúng một partition của bảng. Không nên có quá **2** tiến trình cùng đọc một shard.
- `PutItem`/`UpdateItem` không đổi dữ liệu thì không sinh bản ghi.
- Thay đổi của một giao dịch đến dần, có thể xen với giao dịch khác.

Bộ máy trong trình duyệt (dynoxide 1.5.0) trả `UnsupportedOperation` cho các API Streams, nên bài này **chưa chạy được trong trình duyệt**.

## Ví dụ

Một bộ xử lý (thường là Lambda) cộng doanh thu theo cửa hàng:

```text
INSERT  ORDER#o1  NEW: store=S01 total=200000   -> S01 += 200000
MODIFY  ORDER#o1  OLD: total=200000 NEW: total=250000 -> S01 += 50000
REMOVE  ORDER#o1  OLD: total=250000             -> S01 -= 250000
```

Mỗi bước chỉ dùng ảnh cũ và mới của chính item đó, nên không cần thứ tự giữa các item.

# EN

## Key idea

With **DynamoDB Streams** on, every time an item is created, updated or deleted DynamoDB writes a **stream record** in near-real time. Applications read that log for CDC: update totals, sync another system, send notifications.

- Kept for at most **24 hours**; older data can be trimmed at any moment.
- Each record appears **exactly once**.
- Order is guaranteed **per item** (same primary key), not per partition or item collection.
- Four view types: `KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`.
- Records live in **shards**; each open shard maps to exactly one partition of the table. No more than **2** processes should read one shard at the same time.
- A `PutItem`/`UpdateItem` that changes no data writes no record.
- A transaction's changes arrive gradually and may interleave with other transactions.

The in-browser engine (dynoxide 1.5.0) returns `UnsupportedOperation` for the Streams APIs, so this lesson does not run in the browser yet.

## Example

A consumer (usually Lambda) adds up revenue per store:

```text
INSERT  ORDER#o1  NEW: store=S01 total=200000   -> S01 += 200000
MODIFY  ORDER#o1  OLD: total=200000 NEW: total=250000 -> S01 += 50000
REMOVE  ORDER#o1  OLD: total=250000             -> S01 -= 250000
```

Each step uses only that item's own old and new images, so no ordering across items is needed.
