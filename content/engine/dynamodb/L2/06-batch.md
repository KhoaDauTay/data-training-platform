---
id: e-dy-l2-06
engine: dynamodb
level: L2
module: safe-writes
title: "BatchGetItem và BatchWriteItem"
title_en: "BatchGetItem and BatchWriteItem"
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Đọc nhiều item theo khóa trong một request bằng `BatchGetItem` (tối đa 100 item, 16 MB).
    en: Read several items by key in one request with `BatchGetItem` (up to 100 items, 16 MB).
  - vi: Thêm và xóa nhiều item bằng `BatchWriteItem` (tối đa 25 yêu cầu, 16 MB, không có Update).
    en: Put and delete several items with `BatchWriteItem` (up to 25 requests, 16 MB, no updates).
  - vi: Xử lý `UnprocessedKeys` và `UnprocessedItems`.
    en: Handle `UnprocessedKeys` and `UnprocessedItems`.
requires: [e-dy-l1-07]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
lab:
  setup: |
    {"tables": [{"TableName":"Books","KeySchema":[{"AttributeName":"isbn","KeyType":"HASH"}],"AttributeDefinitions":[{"AttributeName":"isbn","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {"Books": [
      {"isbn":"978-0-01","title":"Data at Rest","author":"Mai Lan","price":120000,"stock":14,"tags":["db","storage"]},
      {"isbn":"978-0-02","title":"Keys and Values","author":"Tran Binh","price":95000,"stock":3,"tags":["nosql"]},
      {"isbn":"978-0-03","title":"The Partition Book","author":"Le Hoa","price":150000,"stock":0,"tags":["nosql","scale"]},
      {"isbn":"978-0-04","title":"Query Not Scan","author":"Pham An","price":88000,"stock":22,"tags":["nosql","perf"]},
      {"isbn":"978-0-05","title":"Indexes by Hand","author":"Mai Lan","price":132000,"stock":7,"tags":["db"]},
      {"isbn":"978-0-06","title":"Small Items Fast","author":"Vo Khanh","price":70000,"stock":41,"tags":["perf"]},
      {"isbn":"978-0-07","title":"One Table","author":"Le Hoa","price":160000,"stock":5,"tags":["nosql","design"]},
      {"isbn":"978-0-08","title":"Eventually","author":"Tran Binh","price":99000,"stock":12,"tags":["nosql"]}
    ]}}
  steps:
    - task:
        vi: Trang giỏ hàng cần `title` và `price` của ba cuốn `978-0-01`, `978-0-03`, `978-0-07`. Đọc cả ba trong một request.
        en: The cart page needs the `title` and `price` of three books, `978-0-01`, `978-0-03` and `978-0-07`. Read all three in one request.
      solution: |
        {"op": "BatchGetItem", "input": {"RequestItems": {"Books": {
          "Keys": [{"isbn": {"S": "978-0-01"}}, {"isbn": {"S": "978-0-03"}}, {"isbn": {"S": "978-0-07"}}],
          "ProjectionExpression": "isbn, title, price"}}}}
      check: doc
      hint:
        vi: '`RequestItems` là map từ tên bảng tới `{"Keys": [...]}`. Kết quả không theo thứ tự khóa, nên giữ `isbn` trong projection để ghép lại.'
        en: '`RequestItems` maps each table name to `{"Keys": [...]}`. Results do not come back in key order, so keep `isbn` in the projection to match them up.'
    - task:
        vi: 'Trong một request - thêm cuốn `978-0-12` (`title` "Batch Basics", `price` `75000`), thêm cuốn `978-0-13` (`title` "Many at Once", `price` `82000`), và xóa cuốn `978-0-06`.'
        en: 'In one request - add book `978-0-12` (`title` "Batch Basics", `price` `75000`), add book `978-0-13` (`title` "Many at Once", `price` `82000`), and delete book `978-0-06`.'
      solution: |
        {"op": "BatchWriteItem", "input": {"RequestItems": {"Books": [
          {"PutRequest": {"Item": {"isbn": {"S": "978-0-12"}, "title": {"S": "Batch Basics"}, "price": {"N": "75000"}}}},
          {"PutRequest": {"Item": {"isbn": {"S": "978-0-13"}, "title": {"S": "Many at Once"}, "price": {"N": "82000"}}}},
          {"DeleteRequest": {"Key": {"isbn": {"S": "978-0-06"}}}}]}}}
      check: doc
      hint:
        vi: Mỗi phần tử là một `PutRequest` (có `Item`) hoặc một `DeleteRequest` (có `Key`).
        en: Each element is a `PutRequest` (with an `Item`) or a `DeleteRequest` (with a `Key`).
    - task:
        vi: 'Hai cuốn `978-0-03` và `978-0-08` ngừng bán. Xóa cả hai trong một request.'
        en: 'Books `978-0-03` and `978-0-08` are discontinued. Delete both in one request.'
      solution: |
        {"op": "BatchWriteItem", "input": {"RequestItems": {"Books": [
          {"DeleteRequest": {"Key": {"isbn": {"S": "978-0-03"}}}},
          {"DeleteRequest": {"Key": {"isbn": {"S": "978-0-08"}}}}]}}}
      check: doc
      hint:
        vi: Hai phần tử `DeleteRequest`, mỗi phần tử một `Key`.
        en: Two `DeleteRequest` elements, each with one `Key`.
quiz:
  - q:
      vi: '`BatchWriteItem` trả về thành công nhưng `UnprocessedItems` không rỗng. Nên làm gì?'
      en: '`BatchWriteItem` succeeds but `UnprocessedItems` is not empty. What should you do?'
    options:
      - vi: Bỏ qua, vì request đã thành công.
        en: Ignore it, the request succeeded.
      - vi: Gửi lại đúng phần `UnprocessedItems`, có chờ tăng dần (exponential backoff).
        en: Send exactly the `UnprocessedItems` again, with exponential backoff.
      - vi: Gửi lại cả lô ban đầu.
        en: Send the whole original batch again.
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì request báo thành công, nhưng lô chỉ lỗi khi mọi yêu cầu con đều lỗi. Phần chưa làm (ví dụ vì bị throttle, tức bị DynamoDB từ chối vì vượt mức) nằm trong `UnprocessedItems` (hoặc `UnprocessedKeys` với `BatchGetItem`); bỏ qua là mất dữ liệu. Gửi lại cả lô thì làm lại cả phần đã ghi xong, tốn thêm WCU (write capacity unit, đơn vị ghi) và dễ bị throttle tiếp. Chờ tăng dần (1, 2, 4… lần) giữa các lần gửi lại để bảng kịp hồi.'
      en: 'It sounds right because the call reports success, but a batch fails only when every request in it fails. Whatever was not done (for example because of throttling, that is DynamoDB refusing requests over the limit) comes back in `UnprocessedItems` (or `UnprocessedKeys` for `BatchGetItem`); ignoring it loses data. Resending the whole batch redoes the part already written, costs extra WCU (write capacity units) and invites more throttling. Wait longer each time (1, 2, 4… units) between resends so the table can recover.'
  - q:
      vi: Bạn cần tăng `stock` của 30 cuốn sách. `BatchWriteItem` có làm được không?
      en: You need to increase `stock` on 30 books. Can `BatchWriteItem` do it?
    options:
      - vi: Có, một request 30 Update.
        en: Yes, one request with 30 updates.
      - vi: Không - nó chỉ nhận Put và Delete, tối đa 25 mỗi request. Dùng 30 lần `UpdateItem`.
        en: No - it accepts only Put and Delete, at most 25 per request. Use 30 `UpdateItem` calls.
      - vi: Có, nếu chia thành hai lô 15.
        en: Yes, if split into two batches of 15.
    answer: 1
    why:
      vi: '`BatchWriteItem` không hỗ trợ Update và mỗi request tối đa 25 yêu cầu Put/Delete. Chia hai lô 15 chỉ giải quyết con số 25, còn chuyện thiếu Update vẫn nguyên: Put trong lô sẽ thay cả item, không cộng dồn vào `stock`, nên các thuộc tính khác cũng mất. Cách đúng là 30 lần `UpdateItem` với `ADD` hoặc `SET stock = stock + :n`.'
      en: '`BatchWriteItem` does not support updates and takes at most 25 Put/Delete requests. Splitting into two batches of 15 only solves the limit of 25; the missing Update remains: a Put in a batch replaces the whole item, it does not add to `stock`, so the other attributes are lost too. The right way is 30 `UpdateItem` calls with `ADD` or `SET stock = stock + :n`.'
---

## Mở bài

Trang giỏ hàng cần ba cuốn sách, và bạn đang gọi `GetItem` ba lần nối tiếp. Gộp chúng vào một lần gọi mạng thì nhanh hơn, nhưng có rẻ hơn không, và có nguyên tử không?

## Ý chính

Batch gộp nhiều thao tác theo khóa vào một lần gọi mạng. DynamoDB chạy chúng song song, nhưng **mỗi phần vẫn là một thao tác riêng**: không nguyên tử, phần này thành công không phụ thuộc phần kia.

- `BatchGetItem`: tối đa **100** khóa, **16 MB**, có thể trên nhiều bảng. Mỗi item được tính capacity như một `GetItem` riêng.
- `BatchWriteItem`: tối đa **25** yêu cầu `PutRequest`/`DeleteRequest`, **16 MB**. **Không có Update**, và không đặt được `ConditionExpression`.

Phần chưa xử lý được trả lại trong `UnprocessedKeys` / `UnprocessedItems`. Code phải gửi lại phần đó, có chờ tăng dần. Kết quả của `BatchGetItem` không theo thứ tự khóa, nên giữ thuộc tính khóa trong projection để ghép lại.

## Cú pháp

```text
{"op": "BatchGetItem", "input": {"RequestItems": {"<table>": {"Keys": [<key>, ...], "ProjectionExpression": "..."}}}}
{"op": "BatchWriteItem", "input": {"RequestItems": {"<table>": [
  {"PutRequest": {"Item": <item>}}, {"DeleteRequest": {"Key": <key>}}]}}}
```

- Nạp dữ liệu lớn: chia lô 25, gửi lại `UnprocessedItems` tới khi rỗng, mỗi vòng chờ lâu hơn.

## Ví dụ

Đọc hai cuốn trong một request:

```json
{"op": "BatchGetItem", "input": {"RequestItems": {"Books": {"Keys": [{"isbn": {"S": "978-0-02"}}, {"isbn": {"S": "978-0-05"}}], "ProjectionExpression": "isbn, title, stock"}}}}
```

Hai cuốn trở về với đúng ba thuộc tính đã chọn. Engine tính 1 RCU cho cả lô: mỗi item nhỏ tốn 0.5 RCU như một `GetItem` riêng.

Thêm một cuốn và xóa một cuốn trong cùng lô:

```json
{"op": "BatchWriteItem", "input": {"RequestItems": {"Books": [{"PutRequest": {"Item": {"isbn": {"S": "978-0-15"}, "title": {"S": "Batch Day"}, "price": {"N": "60000"}}}}, {"DeleteRequest": {"Key": {"isbn": {"S": "978-0-06"}}}}]}}}
```

Bảng có thêm `978-0-15` và mất `978-0-06`; engine tính 2 WCU, một cho mỗi yêu cầu. Nếu một phần không xử lý được, nó nằm trong `UnprocessedItems`, còn phần kia vẫn đã được ghi.

## Lỗi hay gặp

Lặp một khóa trong cùng `BatchGetItem`:

```json
// ERROR ValidationException
{"op": "BatchGetItem", "input": {"RequestItems": {"Books": {"Keys": [{"isbn": {"S": "978-0-02"}}, {"isbn": {"S": "978-0-02"}}]}}}}
```

Một khóa chỉ được xuất hiện một lần trong lô; thông báo nói danh sách khóa có phần tử trùng. Bỏ bản lặp trước khi gửi.

Dùng `PutRequest` để "sửa" giá trong lô:

```json
// WRONG: the Put replaces the whole item, stock and tags are lost
{"op": "BatchWriteItem", "input": {"RequestItems": {"Books": [{"PutRequest": {"Item": {"isbn": {"S": "978-0-01"}, "price": {"N": "110000"}}}}]}}}
```

```json
// FIX: one UpdateItem per book that changes
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET price = :p", "ExpressionAttributeValues": {":p": {"N": "110000"}}}}
```

Bản sai để `978-0-01` chỉ còn `isbn` và `price`; bản sửa giữ tên sách, tác giả, kho và nhãn. Lô không có Update, nên muốn sửa một phần thì gọi `UpdateItem` cho từng item.

## Thực hành

Bước 1 trả 3 item không theo thứ tự khóa, nên được chấm như một tập. Bước ghi được chấm bằng trạng thái bảng sau khi ghi. Bước 1 đọc ba cuốn trong một `BatchGetItem`. Bước 2 trộn hai `PutRequest` với một `DeleteRequest` trong cùng lô. Bước 3 xóa hai cuốn trong một lô.

## Tóm tắt

- Batch gộp nhiều thao tác theo khóa vào một lần gọi, không nguyên tử.
- `BatchGetItem`: tối đa 100 khóa; mỗi item tính như một `GetItem`.
- `BatchWriteItem`: tối đa 25 Put/Delete, không Update, không điều kiện.
- Luôn gửi lại `UnprocessedKeys` / `UnprocessedItems`, có chờ tăng dần.

# EN

## Opening

The cart page needs three books, and you call `GetItem` three times in a row. Packing them into one network call is faster, but is it cheaper, and is it atomic?

## Key idea

A batch packs several key-based operations into one network call. DynamoDB runs them in parallel, but **each part is still its own operation**: not atomic, and one part succeeding does not depend on another.

- `BatchGetItem`: up to **100** keys, **16 MB**, possibly across several tables. Each item is charged like its own `GetItem`.
- `BatchWriteItem`: up to **25** `PutRequest`/`DeleteRequest` entries, **16 MB**. **No updates**, and no `ConditionExpression`.

Anything not processed comes back in `UnprocessedKeys` / `UnprocessedItems`. Your code must send that part again, with increasing waits. `BatchGetItem` results do not come back in key order, so keep the key attribute in the projection to match them up.

## Syntax

```text
{"op": "BatchGetItem", "input": {"RequestItems": {"<table>": {"Keys": [<key>, ...], "ProjectionExpression": "..."}}}}
{"op": "BatchWriteItem", "input": {"RequestItems": {"<table>": [
  {"PutRequest": {"Item": <item>}}, {"DeleteRequest": {"Key": <key>}}]}}}
```

- Loading a lot of data: chunks of 25, send `UnprocessedItems` again until it is empty, waiting longer each round.

## Example

Read two books in one request:

```json
{"op": "BatchGetItem", "input": {"RequestItems": {"Books": {"Keys": [{"isbn": {"S": "978-0-02"}}, {"isbn": {"S": "978-0-05"}}], "ProjectionExpression": "isbn, title, stock"}}}}
```

Both books come back with exactly the three chosen attributes. The engine charges 1 RCU for the batch: each small item costs 0.5 RCU, like its own `GetItem`.

Add one book and delete another in the same batch:

```json
{"op": "BatchWriteItem", "input": {"RequestItems": {"Books": [{"PutRequest": {"Item": {"isbn": {"S": "978-0-15"}, "title": {"S": "Batch Day"}, "price": {"N": "60000"}}}}, {"DeleteRequest": {"Key": {"isbn": {"S": "978-0-06"}}}}]}}}
```

The table gains `978-0-15` and loses `978-0-06`; the engine charges 2 WCU, one per request. If one part cannot be processed, it comes back in `UnprocessedItems` while the other part is already written.

## Common mistakes

Repeating a key in the same `BatchGetItem`:

```json
// ERROR ValidationException
{"op": "BatchGetItem", "input": {"RequestItems": {"Books": {"Keys": [{"isbn": {"S": "978-0-02"}}, {"isbn": {"S": "978-0-02"}}]}}}}
```

A key may appear only once in a batch; the message says the list of keys holds duplicates. Drop the repeat before sending.

Using a `PutRequest` to "change" a price in a batch:

```json
// WRONG: the Put replaces the whole item, stock and tags are lost
{"op": "BatchWriteItem", "input": {"RequestItems": {"Books": [{"PutRequest": {"Item": {"isbn": {"S": "978-0-01"}, "price": {"N": "110000"}}}}]}}}
```

```json
// FIX: one UpdateItem per book that changes
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET price = :p", "ExpressionAttributeValues": {":p": {"N": "110000"}}}}
```

The wrong version leaves `978-0-01` with only `isbn` and `price`; the fix keeps the title, author, stock and tags. A batch has no Update, so to change part of an item call `UpdateItem` for each item.

## Practice

Step 1 returns 3 items in no particular key order, so it is graded as a set. The write steps are graded by the table's state after the write. Step 1 reads three books in one `BatchGetItem`. Step 2 mixes two `PutRequest`s with one `DeleteRequest` in the same batch. Step 3 deletes two books in one batch.

## Recap

- A batch packs several key-based operations into one call; it is not atomic.
- `BatchGetItem`: up to 100 keys; each item is charged like a `GetItem`.
- `BatchWriteItem`: up to 25 Puts/Deletes, no updates, no conditions.
- Always resend `UnprocessedKeys` / `UnprocessedItems`, with increasing waits.
