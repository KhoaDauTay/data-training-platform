---
id: e-dy-l1-07
engine: dynamodb
level: L1
module: crud
title: "UpdateItem và DeleteItem"
title_en: "UpdateItem and DeleteItem"
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Sửa vài thuộc tính bằng `UpdateItem` với `SET`, và xem bản sau khi sửa bằng `ReturnValues`.
    en: Change some attributes with `UpdateItem` and `SET`, and see the new image with `ReturnValues`.
  - vi: Biết `UpdateItem` trên khóa chưa có sẽ tạo item mới (upsert).
    en: Know that `UpdateItem` on a missing key creates a new item (upsert).
  - vi: Xóa một item bằng `DeleteItem` và lấy lại bản đã xóa.
    en: Delete an item with `DeleteItem` and get back the deleted image.
requires: [e-dy-l1-06]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html
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
        vi: Kho vừa nhận 25 cuốn `978-0-03`. Đặt `stock` của nó thành 25 và trả về item sau khi sửa.
        en: The store just received 25 copies of `978-0-03`. Set its `stock` to 25 and return the item after the change.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-03"}},
          "UpdateExpression": "SET stock = :s",
          "ExpressionAttributeValues": {":s": {"N": "25"}},
          "ReturnValues": "ALL_NEW"}}
      check: doc
      hint:
        vi: 'Giá trị không viết thẳng vào biểu thức - dùng chỗ giữ chỗ `:s` và khai nó trong `ExpressionAttributeValues`.'
        en: 'Values never go straight into the expression - use a placeholder `:s` and declare it in `ExpressionAttributeValues`.'
    - task:
        vi: 'Đặt trước một cuốn chưa có trong bảng - `isbn` `978-0-10`, chỉ có `title` "Shelf Notes". Dùng `UpdateItem`, không dùng `PutItem`.'
        en: 'Pre-register a book that is not in the table yet - `isbn` `978-0-10`, with only `title` "Shelf Notes". Use `UpdateItem`, not `PutItem`.'
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-10"}},
          "UpdateExpression": "SET title = :t",
          "ExpressionAttributeValues": {":t": {"S": "Shelf Notes"}}}}
      check: doc
      hint:
        vi: '`UpdateItem` trên khóa chưa có sẽ tạo item với khóa đó cộng các thuộc tính trong `SET`.'
        en: '`UpdateItem` on a missing key creates an item with that key plus the attributes in `SET`.'
    - task:
        vi: Ngừng bán cuốn `978-0-06`. Xóa nó và trả về item vừa xóa.
        en: The store stops selling `978-0-06`. Delete it and return the deleted item.
      solution: |
        {"op": "DeleteItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-06"}}, "ReturnValues": "ALL_OLD"}}
      check: doc
      hint:
        vi: '`DeleteItem` cần khóa đầy đủ, như `GetItem`.'
        en: '`DeleteItem` needs the full key, like `GetItem`.'
quiz:
  - q:
      vi: 'Bạn `UpdateItem` với `SET stock = :s` lên `isbn` `978-0-99`, chưa có trong bảng. Chuyện gì xảy ra?'
      en: 'You run `UpdateItem` with `SET stock = :s` on `isbn` `978-0-99`, which is not in the table. What happens?'
    options:
      - vi: 'Không có gì, giống `UPDATE … WHERE` không khớp dòng nào'
        en: 'Nothing, like an `UPDATE … WHERE` that matches no row'
      - vi: 'Một item mới được tạo, chỉ có `isbn` và `stock`'
        en: 'A new item is created with only `isbn` and `stock`'
      - vi: '`ValidationException` vì khóa không tồn tại'
        en: 'A `ValidationException` because the key does not exist'
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì `UPDATE` của SQL không tạo dòng, nhưng `UpdateItem` là upsert: khóa chưa có thì item được tạo với khóa đó cộng các thuộc tính trong `SET`. Muốn chặn, thêm điều kiện `attribute_exists` (L2).'
      en: 'It sounds right because SQL `UPDATE` never creates a row, but `UpdateItem` is an upsert: a missing key creates an item with that key plus the attributes in `SET`. To prevent it, add an `attribute_exists` condition (L2).'
  - q:
      vi: '`DeleteItem` một khóa không tồn tại. DynamoDB trả về gì?'
      en: '`DeleteItem` on a key that does not exist. What does DynamoDB return?'
    options:
      - vi: Lỗi vì không có gì để xóa
        en: An error, because there is nothing to delete
      - vi: Phản hồi thành công, bảng không đổi
        en: A successful response, and the table is unchanged
      - vi: Xóa item gần nhất theo thứ tự khóa
        en: It deletes the closest item in key order
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì xóa thứ không có trông như một lỗi, nhưng DynamoDB coi đó là thành công. Muốn biết item có thật bị xóa không, dùng `ReturnValues: "ALL_OLD"` hoặc một điều kiện.'
      en: 'It sounds right because deleting something that is not there looks like a mistake, but DynamoDB treats it as a success. To know whether an item was really deleted, use `ReturnValues: "ALL_OLD"` or a condition.'
---
## Mở bài

Kho vừa nhập thêm hàng cho một cuốn sách, và một cuốn khác ngừng bán. Bạn chỉ muốn đổi `stock`, không ghi lại cả item. Request nào làm việc đó?

## Ý chính

`UpdateItem` sửa **một phần** item qua `UpdateExpression`. Bài này dùng mệnh đề `SET`; L2 thêm `REMOVE`, `ADD`, `DELETE`. Giá trị không viết thẳng vào biểu thức mà đi qua chỗ giữ chỗ bắt đầu bằng `:`, khai trong `ExpressionAttributeValues`.

Hai điều khác SQL:

- **Upsert**: nếu khóa chưa có, `UpdateItem` tạo item mới. Muốn chặn, thêm điều kiện (L2).
- **Không có "UPDATE … WHERE"** cho nhiều item. Mỗi request sửa đúng một item theo khóa.

`ReturnValues` của `UpdateItem`: `NONE`, `ALL_OLD`, `UPDATED_OLD`, `ALL_NEW`, `UPDATED_NEW`. Của `DeleteItem`: `NONE` hoặc `ALL_OLD`.

`DeleteItem` xóa một item theo khóa đầy đủ. Xóa khóa không tồn tại không phải lỗi.

## Cú pháp

```text
{"op": "UpdateItem", "input": {"TableName": "<table>", "Key": {...},
  "UpdateExpression": "SET <attr> = :v, <attr2> = :w",
  "ExpressionAttributeValues": {":v": {...}, ":w": {...}},
  "ReturnValues": "ALL_NEW"}}
{"op": "DeleteItem", "input": {"TableName": "<table>", "Key": {...}, "ReturnValues": "ALL_OLD"}}
```

- `Key` là khóa đầy đủ, như `GetItem`.
- Mỗi chỗ giữ chỗ `:x` trong biểu thức phải có trong `ExpressionAttributeValues`.

## Ví dụ

Đổi giá và tồn kho của `978-0-01` trong một lệnh, xem bản sau khi sửa:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET price = :p, stock = :s", "ExpressionAttributeValues": {":p": {"N": "99000"}, ":s": {"N": "4"}}, "ReturnValues": "ALL_NEW"}}
```

Phản hồi `ALL_NEW` là cả item sau khi sửa: `price` 99000, `stock` 4, các thuộc tính khác giữ nguyên. Một request, hai thuộc tính, vẫn chỉ 1 WCU.

Xóa cuốn `978-0-08` và giữ lại bản đã xóa:

```json
{"op": "DeleteItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-08"}}, "ReturnValues": "ALL_OLD"}}
```

Bảng còn bảy cuốn, và phản hồi kèm bản đã xóa của cuốn "Eventually": đủ để hoàn tác bằng một `PutItem` nếu xóa nhầm.

## Lỗi hay gặp

Viết giá trị thẳng vào biểu thức như SQL:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-03"}}, "UpdateExpression": "SET stock = 25"}}
```

Biểu thức chỉ nhận tên thuộc tính và chỗ giữ chỗ, không nhận hằng số, nên dynoxide báo lỗi cú pháp ngay ở `25`. Đưa giá trị vào `ExpressionAttributeValues` dưới tên `:s`.

Gõ sai khóa: không có lỗi, mà có một item mới:

```json
// WRONG: the key 978-0-3 does not exist, so UpdateItem creates it
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-3"}}, "UpdateExpression": "SET stock = :s", "ExpressionAttributeValues": {":s": {"N": "25"}}}}
```

```json
// FIX: the exact key, so the existing book is changed
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-03"}}, "UpdateExpression": "SET stock = :s", "ExpressionAttributeValues": {":s": {"N": "25"}}}}
```

Bản sai để lại item mới `978-0-3` chỉ có `stock` 25, còn cuốn `978-0-03` vẫn `stock` 0. Bảng có thêm một item rác mà không ai thấy lỗi. Muốn `UpdateItem` từ chối khóa chưa có, thêm điều kiện `attribute_exists` (L2).

## Thực hành

Ba bước độc lập, mỗi bước chạy trên dữ liệu gốc. Bước được chấm bằng trạng thái bảng sau khi ghi. Bước 1 sửa tồn kho và xin bản mới, bước 2 dùng chính tính upsert để tạo một item chưa có, bước 3 xóa một cuốn và xin bản cũ. Bước 2 cho thấy mặt tốt của điều vừa là bẫy ở trên.

## Tóm tắt

- `UpdateItem` sửa một phần item theo khóa; giá trị đi qua chỗ giữ chỗ `:x`.
- Khóa chưa có thì `UpdateItem` tạo item mới (upsert).
- Mỗi request sửa hoặc xóa đúng một item.
- `DeleteItem` khóa không tồn tại không phải lỗi; `ALL_OLD` trả bản đã xóa.

# EN

## Opening

The store just restocked one book, and another one is discontinued. You want to change only `stock`, not write the whole item again. Which request does that?

## Key idea

`UpdateItem` changes **part** of an item through an `UpdateExpression`. This lesson uses the `SET` clause; L2 adds `REMOVE`, `ADD`, `DELETE`. Values never go straight into the expression: they go through placeholders that start with `:`, declared in `ExpressionAttributeValues`.

Two differences from SQL:

- **Upsert**: if the key does not exist, `UpdateItem` creates a new item. To prevent that, add a condition (L2).
- **No "UPDATE ... WHERE"** across many items. Each request changes exactly one item by its key.

`ReturnValues` for `UpdateItem`: `NONE`, `ALL_OLD`, `UPDATED_OLD`, `ALL_NEW`, `UPDATED_NEW`. For `DeleteItem`: `NONE` or `ALL_OLD`.

`DeleteItem` deletes one item by its full key. Deleting a key that does not exist is not an error.

## Syntax

```text
{"op": "UpdateItem", "input": {"TableName": "<table>", "Key": {...},
  "UpdateExpression": "SET <attr> = :v, <attr2> = :w",
  "ExpressionAttributeValues": {":v": {...}, ":w": {...}},
  "ReturnValues": "ALL_NEW"}}
{"op": "DeleteItem", "input": {"TableName": "<table>", "Key": {...}, "ReturnValues": "ALL_OLD"}}
```

- `Key` is the full key, as in `GetItem`.
- Every placeholder `:x` in the expression must be in `ExpressionAttributeValues`.

## Example

Change the price and stock of `978-0-01` in one command and see the new image:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET price = :p, stock = :s", "ExpressionAttributeValues": {":p": {"N": "99000"}, ":s": {"N": "4"}}, "ReturnValues": "ALL_NEW"}}
```

The `ALL_NEW` response is the whole item after the change: `price` 99000, `stock` 4, every other attribute unchanged. One request, two attributes, still only 1 WCU.

Delete book `978-0-08` and keep the deleted image:

```json
{"op": "DeleteItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-08"}}, "ReturnValues": "ALL_OLD"}}
```

The table holds seven books, and the response carries the deleted image of "Eventually": enough to undo with a `PutItem` if it was a mistake.

## Common mistakes

Writing the value straight into the expression, as in SQL:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-03"}}, "UpdateExpression": "SET stock = 25"}}
```

An expression takes attribute names and placeholders, not literals, so dynoxide reports a syntax error right at `25`. Put the value in `ExpressionAttributeValues` under the name `:s`.

Mistyping the key: no error, but a new item:

```json
// WRONG: the key 978-0-3 does not exist, so UpdateItem creates it
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-3"}}, "UpdateExpression": "SET stock = :s", "ExpressionAttributeValues": {":s": {"N": "25"}}}}
```

```json
// FIX: the exact key, so the existing book is changed
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-03"}}, "UpdateExpression": "SET stock = :s", "ExpressionAttributeValues": {":s": {"N": "25"}}}}
```

The wrong version leaves a new item `978-0-3` with only `stock` 25, while book `978-0-03` still has `stock` 0. The table gains a junk item and nobody sees an error. To make `UpdateItem` refuse a key that does not exist yet, add an `attribute_exists` condition (L2).

## Practice

The three steps are independent; each runs on the original data. A step is graded by the table's state after the write. Step 1 changes the stock and asks for the new image, step 2 uses the upsert itself to create a missing item, step 3 deletes a book and asks for the old image. Step 2 shows the good side of what was a trap above.

## Recap

- `UpdateItem` changes part of an item by key; values go through `:x` placeholders.
- A missing key makes `UpdateItem` create a new item (upsert).
- Each request updates or deletes exactly one item.
- `DeleteItem` on a missing key is no error; `ALL_OLD` returns the deleted image.
