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
    why:
      vi: Request báo thành công nên dễ nghĩ cả lô đã ghi xong. Nhưng lô chỉ lỗi khi mọi yêu cầu con đều lỗi. Phần chưa làm (ví dụ vì bị throttle, tức bị giới hạn tốc độ) nằm trong `UnprocessedItems` (hoặc `UnprocessedKeys` với `BatchGetItem`) và phải gửi lại.
      en: The call reports success, so it is easy to think the whole batch was written. But a batch fails only when every request in it fails. Whatever was not done (for example because of throttling) comes back in `UnprocessedItems` (or `UnprocessedKeys` for `BatchGetItem`) and must be sent again.
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
      vi: '`BatchWriteItem` không hỗ trợ Update và mỗi request tối đa 25 yêu cầu Put/Delete. Put trong lô sẽ thay cả item, không cộng dồn.'
      en: '`BatchWriteItem` does not support updates and takes at most 25 Put/Delete requests. A Put in a batch replaces the whole item, it does not add.'
---

## Ý chính

Batch gộp nhiều thao tác theo khóa vào một lần gọi mạng. DynamoDB chạy chúng song song, nhưng **mỗi phần vẫn là một thao tác riêng**: không nguyên tử, phần này thành công không phụ thuộc phần kia.

- `BatchGetItem`: tối đa **100** khóa, **16 MB**, có thể trên nhiều bảng. Mỗi item được tính capacity như một `GetItem` riêng.
- `BatchWriteItem`: tối đa **25** yêu cầu `PutRequest`/`DeleteRequest`, **16 MB**. **Không có Update**, và không đặt được `ConditionExpression`.

Phần chưa xử lý được trả lại trong `UnprocessedKeys` / `UnprocessedItems`. Code phải gửi lại phần đó, có chờ tăng dần.

## Ví dụ

Nạp dữ liệu lớn bằng lô 25:

```text
for chunk in items, 25 at a time:
  pending = chunk
  while pending not empty:
    r = BatchWriteItem(pending)
    pending = r.UnprocessedItems
    wait a little longer each round
```

## Thực hành

Bước 1 trả 3 item không theo thứ tự khóa, nên được chấm như một tập. Bước 2 được chấm bằng trạng thái bảng sau khi ghi.

# EN

## Key idea

A batch packs several key-based operations into one network call. DynamoDB runs them in parallel, but **each part is still its own operation**: not atomic, and one part succeeding does not depend on another.

- `BatchGetItem`: up to **100** keys, **16 MB**, possibly across several tables. Each item is charged like its own `GetItem`.
- `BatchWriteItem`: up to **25** `PutRequest`/`DeleteRequest` entries, **16 MB**. **No updates**, and no `ConditionExpression`.

Anything not processed comes back in `UnprocessedKeys` / `UnprocessedItems`. Your code must send that part again, with increasing waits.

## Example

Loading a lot of data in batches of 25:

```text
for chunk in items, 25 at a time:
  pending = chunk
  while pending not empty:
    r = BatchWriteItem(pending)
    pending = r.UnprocessedItems
    wait a little longer each round
```

## Practice

Step 1 returns 3 items in no particular key order, so it is graded as a set. Step 2 is graded by the table's state after the write.
