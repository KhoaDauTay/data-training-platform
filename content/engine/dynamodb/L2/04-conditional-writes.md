---
id: e-dy-l2-04
engine: dynamodb
level: L2
module: safe-writes
title: "Ghi có điều kiện: chống ghi đè và lost update"
title_en: "Conditional writes: no overwrites, no lost updates"
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Chỉ thêm item khi khóa còn mới, bằng `attribute_not_exists`.
    en: Insert an item only when its key is new, with `attribute_not_exists`.
  - vi: Chặn bán quá tồn kho và chống lost update bằng `ConditionExpression`.
    en: Prevent overselling and lost updates with a `ConditionExpression`.
  - vi: Biết một lần ghi bị từ chối vẫn tốn WCU và trả `ConditionalCheckFailedException`.
    en: Know that a rejected write still costs WCU and returns `ConditionalCheckFailedException`.
requires: [e-dy-l2-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
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
        vi: 'Thêm cuốn `978-0-11` (`title` "Safe Writes", `price` `99000`) nhưng chỉ khi chưa có cuốn nào mang `isbn` đó.'
        en: 'Add book `978-0-11` (`title` "Safe Writes", `price` `99000`), but only if no book has that `isbn` yet.'
      solution: |
        {"op": "PutItem", "input": {"TableName": "Books",
          "Item": {"isbn": {"S": "978-0-11"}, "title": {"S": "Safe Writes"}, "price": {"N": "99000"}},
          "ConditionExpression": "attribute_not_exists(isbn)"}}
      check: doc
      hint:
        vi: '`attribute_not_exists` trên thuộc tính partition key nghĩa là "chưa có item nào với khóa này".'
        en: '`attribute_not_exists` on the partition key attribute means "no item with this key exists yet".'
    - task:
        vi: Khách mua 2 cuốn `978-0-02`. Trừ `stock` đi 2, nhưng chỉ khi kho còn ít nhất 2 cuốn, và trả về item sau khi sửa.
        en: A customer buys 2 copies of `978-0-02`. Subtract 2 from `stock`, but only if at least 2 are in stock, and return the item after the change.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-02"}},
          "UpdateExpression": "SET stock = stock - :q",
          "ConditionExpression": "stock >= :q",
          "ExpressionAttributeValues": {":q": {"N": "2"}},
          "ReturnValues": "ALL_NEW"}}
      check: doc
      hint:
        vi: Điều kiện và phép trừ dùng chung chỗ giữ chỗ `:q`.
        en: The condition and the subtraction share the placeholder `:q`.
    - task:
        vi: Bạn đã đọc giá cuốn `978-0-04` là `88000` và muốn đổi thành `92000`. Chỉ ghi nếu giá vẫn là `88000`, để không đè lên thay đổi của người khác.
        en: You read the price of `978-0-04` as `88000` and want to change it to `92000`. Write only if the price is still `88000`, so you do not overwrite someone else's change.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-04"}},
          "UpdateExpression": "SET price = :new",
          "ConditionExpression": "price = :old",
          "ExpressionAttributeValues": {":new": {"N": "92000"}, ":old": {"N": "88000"}}}}
      check: doc
      hint:
        vi: 'Đây là optimistic locking: điều kiện kiểm giá trị bạn đã đọc.'
        en: 'This is optimistic locking: the condition checks the value you read.'
quiz:
  - q:
      vi: Nếu bước 2 chạy khi `stock` chỉ còn 1, chuyện gì xảy ra?
      en: If step 2 runs when `stock` is only 1, what happens?
    options:
      - vi: Item bị trừ thành -1.
        en: The item goes down to -1.
      - vi: Ghi bị từ chối với `ConditionalCheckFailedException`, item giữ nguyên, nhưng vẫn tốn WCU.
        en: The write is rejected with `ConditionalCheckFailedException`, the item stays the same, but WCU is still consumed.
      - vi: Ghi bị từ chối và không tốn gì.
        en: The write is rejected and costs nothing.
    answer: 1
    why:
      vi: Dễ nghĩ một lần ghi không xảy ra thì không mất gì. Nhưng theo AWS, khi điều kiện sai DynamoDB vẫn tiêu thụ WCU theo cỡ item đang có (tối thiểu 1). Thêm `ReturnValuesOnConditionCheckFailure` là `ALL_OLD` để lấy item hiện tại trong lỗi mà không cần đọc lại.
      en: It is easy to think a write that never happened costs nothing. But per AWS, when the condition is false DynamoDB still consumes WCU based on the existing item size (at least 1). Add `ReturnValuesOnConditionCheckFailure` set to `ALL_OLD` to get the current item inside the error without reading it again.
---

## Ý chính

`ConditionExpression` biến một lần ghi thành "ghi **nếu**". DynamoDB kiểm điều kiện trên item hiện tại và ghi trong cùng một bước nguyên tử (atomic). Ba mẫu hay dùng:

- **Chỉ thêm**: `attribute_not_exists(pk)`. `PutItem` thường sẽ ghi đè im lặng.
- **Không vượt giới hạn**: `stock >= :q` khi trừ kho.
- **Optimistic locking** (chống lost update: hai người cùng đọc rồi cùng ghi, người ghi sau đè mất thay đổi của người trước): `version = :read` (hoặc giá trị bạn đã đọc), rồi `SET version = version + :one`.

Khi điều kiện sai:

- request lỗi với `ConditionalCheckFailedException`, item không đổi;
- **vẫn tốn WCU** (đơn vị năng lực ghi) theo cỡ item đang có (tối thiểu 1), dù phản hồi lỗi không báo con số đó;
- `ReturnValuesOnConditionCheckFailure: "ALL_OLD"` gửi kèm item hiện tại trong lỗi.

## Ví dụ

Optimistic locking với số phiên bản:

```json
{"UpdateExpression": "SET price = :p, version = version + :one",
 "ConditionExpression": "version = :v",
 "ExpressionAttributeValues": {":p": {"N": "92000"}, ":one": {"N": "1"}, ":v": {"N": "7"}}}
```

## Thực hành

Ghi có điều kiện idempotent khi điều kiện kiểm chính thuộc tính đang sửa: gửi lại bước 3 lần nữa sẽ bị từ chối vì giá đã là `92000`, nên không có gì bị ghi hai lần.

# EN

## Key idea

A `ConditionExpression` turns a write into "write **if**". DynamoDB checks the condition against the current item and writes in the same atomic step. Three common patterns:

- **Insert only**: `attribute_not_exists(pk)`. A plain `PutItem` would overwrite silently.
- **Stay within a limit**: `stock >= :q` when taking stock.
- **Optimistic locking** (against lost updates: two people read, then both write, and the later write wipes out the earlier one): `version = :read` (or the value you read), then `SET version = version + :one`.

When the condition is false:

- the request fails with `ConditionalCheckFailedException` and the item is unchanged;
- it **still consumes WCU** based on the size of the existing item (at least 1), even though the error response does not report that number;
- `ReturnValuesOnConditionCheckFailure: "ALL_OLD"` puts the current item into the error.

## Example

Optimistic locking with a version number:

```json
{"UpdateExpression": "SET price = :p, version = version + :one",
 "ConditionExpression": "version = :v",
 "ExpressionAttributeValues": {":p": {"N": "92000"}, ":one": {"N": "1"}, ":v": {"N": "7"}}}
```

## Practice

A conditional write is idempotent when the condition checks the attribute being changed: sending step 3 again is rejected because the price is already `92000`, so nothing is written twice.
