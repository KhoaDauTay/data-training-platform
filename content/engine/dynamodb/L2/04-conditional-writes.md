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
figures: [{ name: dy-conditional-write, at: idea }]
objectives:
  - vi: Chỉ thêm item khi khóa còn mới, bằng `attribute_not_exists`.
    en: Insert an item only when its key is new, with `attribute_not_exists`.
  - vi: Chặn bán quá tồn kho và chống lost update bằng `ConditionExpression`.
    en: Prevent overselling and lost updates with a `ConditionExpression`.
  - vi: Biết một lần ghi bị từ chối vẫn tốn WCU và trả `ConditionalCheckFailedException`.
    en: Know that a rejected write still costs WCU and returns `ConditionalCheckFailedException`.
requires: [e-dy-l2-03]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html, title_vi: "Biểu thức điều kiện (condition expression)" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html, title_vi: "Làm việc với item" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html, title_vi: "Thao tác đọc và ghi" }
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
        vi: 'Đây là optimistic locking (không giữ lock nào, chỉ kiểm lúc ghi rằng dữ liệu chưa bị người khác đổi): điều kiện kiểm giá trị bạn đã đọc.'
        en: 'This is optimistic locking (no lock is held; the write only checks that nobody changed the data meanwhile): the condition checks the value you read.'
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
    trap: 2
    why:
      vi: Nghe hợp lý vì lần ghi không xảy ra, nhưng theo AWS, khi điều kiện sai DynamoDB vẫn tiêu thụ WCU (write capacity unit, đơn vị ghi) theo cỡ item đang có, tối thiểu 1, vì nó đã phải đọc item để kiểm điều kiện; cuốn `978-0-02` nhỏ hơn 1 KB nên tốn 1 WCU. Item cũng không bị trừ thành -1, vì `stock >= :q` (1 ≥ 2) sai nên DynamoDB không ghi gì. Thêm `ReturnValuesOnConditionCheckFailure` là `ALL_OLD` để lấy item hiện tại trong lỗi mà không cần đọc lại.
      en: It sounds right because the write never happened, but per AWS, when the condition is false DynamoDB still consumes WCU (write capacity unit) based on the existing item size, at least 1, because it had to read the item to check the condition; book `978-0-02` is under 1 KB, so it costs 1 WCU. The item does not go down to -1 either, because `stock >= :q` (1 ≥ 2) is false, so DynamoDB writes nothing. Add `ReturnValuesOnConditionCheckFailure` set to `ALL_OLD` to get the current item inside the error without reading it again.
  - q:
      vi: '`PutItem` cuốn `978-0-01` (đã có) với `title` mới, không có `ConditionExpression`. DynamoDB làm gì?'
      en: '`PutItem` for book `978-0-01` (already there) with a new `title` and no `ConditionExpression`. What does DynamoDB do?'
    options:
      - vi: Báo lỗi khóa trùng, như `INSERT` trong SQL
        en: It reports a duplicate key, like an SQL `INSERT`
      - vi: Thay cả item bằng item mới, im lặng
        en: It replaces the whole item with the new one, silently
      - vi: Chỉ đổi `title`, giữ các thuộc tính khác
        en: It changes only `title` and keeps the other attributes
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý nếu quen `INSERT` của SQL, nhưng `PutItem` là "ghi đè hoặc tạo": item cũ biến mất, kể cả `stock` và `tags` không có trong item mới. Muốn "chỉ thêm" thì cần `attribute_not_exists(isbn)`; muốn sửa vài thuộc tính thì dùng `UpdateItem`.'
      en: 'It sounds right if you know SQL `INSERT`, but `PutItem` means "overwrite or create": the old item is gone, including `stock` and `tags` that the new item lacks. For "insert only" you need `attribute_not_exists(isbn)`; to change a few attributes, use `UpdateItem`.'
---

## Mở bài

Hai nhân viên cùng bán cuốn sách cuối cùng, hoặc nhà phát hành gửi trùng một cuốn đã có. Một lần ghi bình thường sẽ âm kho hoặc đè mất dữ liệu. Làm sao để DynamoDB chỉ ghi khi điều kiện còn đúng?

## Ý chính

`ConditionExpression` biến một lần ghi thành "ghi **nếu**". DynamoDB kiểm điều kiện trên item hiện tại và ghi trong cùng một bước nguyên tử (atomic). Ba mẫu hay dùng:

- **Chỉ thêm**: `attribute_not_exists(pk)`. `PutItem` thường sẽ ghi đè im lặng.
- **Không vượt giới hạn**: `stock >= :q` khi trừ kho.
- **Optimistic locking** (chống lost update: hai người cùng đọc rồi cùng ghi, người ghi sau đè mất thay đổi của người trước): `version = :read` (hoặc giá trị bạn đã đọc), rồi `SET version = version + :one`.

Khi điều kiện sai:

- request lỗi với `ConditionalCheckFailedException`, item không đổi;
- **vẫn tốn WCU** (đơn vị năng lực ghi) theo cỡ item đang có (tối thiểu 1), dù phản hồi lỗi không báo con số đó;
- `ReturnValuesOnConditionCheckFailure: "ALL_OLD"` gửi kèm item hiện tại trong lỗi.

Ghi có điều kiện idempotent khi điều kiện kiểm chính thuộc tính đang sửa: gửi lại bước 3 lần nữa sẽ bị từ chối vì giá đã là `92000`, nên không có gì bị ghi hai lần.

Hình từng bước ở cuối mục này cho hai quầy cùng lấy 2 cuốn của sách `978-0-02` (còn 3): lần thứ hai bị từ chối mà vẫn tốn WCU, còn `PutItem` không điều kiện thì ghi đè lặng lẽ.

## Cú pháp

```text
{"op": "PutItem" | "UpdateItem" | "DeleteItem", "input": {...,
  "ConditionExpression": "attribute_not_exists(isbn)" | "stock >= :q" | "version = :v",
  "ReturnValuesOnConditionCheckFailure": "ALL_OLD"}}
```

- Điều kiện được kiểm trên item hiện tại, ngay trước khi ghi, cùng một bước.
- Điều kiện sai: `ConditionalCheckFailedException`, không ghi gì.

## Ví dụ

Đổi giá `978-0-06` chỉ khi giá vẫn là giá bạn đã đọc:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-06"}}, "UpdateExpression": "SET price = :new", "ConditionExpression": "price = :old", "ExpressionAttributeValues": {":new": {"N": "75000"}, ":old": {"N": "70000"}}, "ReturnValues": "ALL_NEW"}}
```

Giá vẫn là 70000 nên điều kiện đúng và giá mới 75000 được ghi, tốn 1 WCU.

Xóa cuốn `978-0-03` chỉ khi đã hết hàng:

```json
{"op": "DeleteItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-03"}}, "ConditionExpression": "stock = :z", "ExpressionAttributeValues": {":z": {"N": "0"}}, "ReturnValues": "ALL_OLD"}}
```

Kho của `978-0-03` là 0, nên item bị xóa; `ALL_OLD` trả lại item như trước khi xóa.

## Lỗi hay gặp

"Chỉ thêm" một cuốn đã có:

```json
// ERROR ConditionalCheckFailedException
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-01"}, "title": {"S": "Data at Rest"}}, "ConditionExpression": "attribute_not_exists(isbn)"}}
```

`978-0-01` đã có, nên điều kiện sai và không có gì được ghi. Engine không báo capacity cho lần ghi bị từ chối; dòng WCU dưới lỗi là ước tính theo luật của AWS.

Bán 5 cuốn `978-0-02` khi kho chỉ còn 3:

```json
// ERROR ConditionalCheckFailedException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET stock = stock - :q", "ConditionExpression": "stock >= :q", "ExpressionAttributeValues": {":q": {"N": "5"}}}}
```

Kho chỉ còn 3 nên `stock >= :q` sai và `stock` giữ nguyên 3: không bao giờ âm.

Đổi giá bằng `PutItem`:

```json
// WRONG: the whole item is replaced, stock and tags are lost
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-02"}, "title": {"S": "Keys and Values"}, "price": {"N": "90000"}}}}
```

```json
// FIX: UpdateItem changes one attribute and keeps the rest
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET price = :p", "ExpressionAttributeValues": {":p": {"N": "90000"}}}}
```

Bản sai để `978-0-02` chỉ còn `isbn`, `title` và `price`; bản sửa đổi giá và giữ mọi thuộc tính khác.

## Thực hành

Bảng `Books` có 8 cuốn. Mỗi bước chạy lại từ dữ liệu gốc và được chấm bằng trạng thái bảng sau khi ghi. Bước 1 chỉ thêm khi khóa chưa có. Bước 2 trừ kho có giới hạn. Bước 3 là optimistic locking trên giá bạn đã đọc.

## Tóm tắt

- `ConditionExpression` kiểm và ghi trong một bước nguyên tử.
- `attribute_not_exists(pk)` = chỉ thêm khi chưa có.
- Kiểm giá trị đã đọc (hoặc `version`) = optimistic locking.
- Điều kiện sai: `ConditionalCheckFailedException`, item giữ nguyên, vẫn tốn WCU.

# EN

## Opening

Two clerks sell the last copy at once, or the publisher resends a book you already have. A plain write would make stock negative or overwrite data. How do you make DynamoDB write only while a condition still holds?

## Key idea

A `ConditionExpression` turns a write into "write **if**". DynamoDB checks the condition against the current item and writes in the same atomic step. Three common patterns:

- **Insert only**: `attribute_not_exists(pk)`. A plain `PutItem` would overwrite silently.
- **Stay within a limit**: `stock >= :q` when taking stock.
- **Optimistic locking** (against lost updates: two people read, then both write, and the later write wipes out the earlier one): `version = :read` (or the value you read), then `SET version = version + :one`.

When the condition is false:

- the request fails with `ConditionalCheckFailedException` and the item is unchanged;
- it **still consumes WCU** based on the size of the existing item (at least 1), even though the error response does not report that number;
- `ReturnValuesOnConditionCheckFailure: "ALL_OLD"` puts the current item into the error.

A conditional write is idempotent when the condition checks the attribute being changed: sending step 3 again is rejected because the price is already `92000`, so nothing is written twice.

The step-through figure at the end of this section has two desks each take 2 copies of book `978-0-02` (3 left): the second is refused yet still uses WCU, while a `PutItem` with no condition overwrites silently.

## Syntax

```text
{"op": "PutItem" | "UpdateItem" | "DeleteItem", "input": {...,
  "ConditionExpression": "attribute_not_exists(isbn)" | "stock >= :q" | "version = :v",
  "ReturnValuesOnConditionCheckFailure": "ALL_OLD"}}
```

- The condition is checked on the current item right before the write, in the same step.
- A false condition: `ConditionalCheckFailedException`, nothing is written.

## Example

Change the price of `978-0-06` only if it is still the price you read:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-06"}}, "UpdateExpression": "SET price = :new", "ConditionExpression": "price = :old", "ExpressionAttributeValues": {":new": {"N": "75000"}, ":old": {"N": "70000"}}, "ReturnValues": "ALL_NEW"}}
```

The price is still 70000, so the condition holds and the new price 75000 is written, for 1 WCU.

Delete book `978-0-03` only if it is sold out:

```json
{"op": "DeleteItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-03"}}, "ConditionExpression": "stock = :z", "ExpressionAttributeValues": {":z": {"N": "0"}}, "ReturnValues": "ALL_OLD"}}
```

The stock of `978-0-03` is 0, so the item is deleted; `ALL_OLD` returns the item as it was before the delete.

## Common mistakes

"Insert only" a book that is already there:

```json
// ERROR ConditionalCheckFailedException
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-01"}, "title": {"S": "Data at Rest"}}, "ConditionExpression": "attribute_not_exists(isbn)"}}
```

`978-0-01` exists, so the condition is false and nothing is written. The engine reports no capacity for a refused write; the WCU line under the error is an estimate by the AWS rule.

Selling 5 copies of `978-0-02` when only 3 are left:

```json
// ERROR ConditionalCheckFailedException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET stock = stock - :q", "ConditionExpression": "stock >= :q", "ExpressionAttributeValues": {":q": {"N": "5"}}}}
```

Only 3 are left, so `stock >= :q` is false and `stock` stays 3: it never goes negative.

Changing a price with `PutItem`:

```json
// WRONG: the whole item is replaced, stock and tags are lost
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-02"}, "title": {"S": "Keys and Values"}, "price": {"N": "90000"}}}}
```

```json
// FIX: UpdateItem changes one attribute and keeps the rest
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET price = :p", "ExpressionAttributeValues": {":p": {"N": "90000"}}}}
```

The wrong version leaves `978-0-02` with only `isbn`, `title` and `price`; the fix changes the price and keeps every other attribute.

## Practice

Table `Books` holds 8 books. Each step runs again from the original data and is graded by the table's state after the write. Step 1 inserts only when the key is new. Step 2 lowers the stock with a limit. Step 3 is optimistic locking on the price you read.

## Recap

- A `ConditionExpression` checks and writes in one atomic step.
- `attribute_not_exists(pk)` = insert only when new.
- Checking the value you read (or a `version`) = optimistic locking.
- A false condition: `ConditionalCheckFailedException`, the item unchanged, WCU still consumed.
