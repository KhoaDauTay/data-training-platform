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
---

## Ý chính

`UpdateItem` sửa **một phần** item qua `UpdateExpression`. Bài này dùng mệnh đề `SET`; L2 thêm `REMOVE`, `ADD`, `DELETE`.

Hai điều khác SQL:

- **Upsert**: nếu khóa chưa có, `UpdateItem` tạo item mới. Muốn chặn, thêm điều kiện (L2).
- **Không có "UPDATE … WHERE"** cho nhiều item. Mỗi request sửa đúng một item theo khóa.

`ReturnValues` của `UpdateItem`: `NONE`, `ALL_OLD`, `UPDATED_OLD`, `ALL_NEW`, `UPDATED_NEW`. Của `DeleteItem`: `NONE` hoặc `ALL_OLD`.

`DeleteItem` xóa một item theo khóa đầy đủ. Xóa khóa không tồn tại không phải lỗi.

## Ví dụ

Giá trị luôn đi qua chỗ giữ chỗ bắt đầu bằng `:`:

```json
{"UpdateExpression": "SET price = :p, stock = :s", "ExpressionAttributeValues": {":p": {"N": "99000"}, ":s": {"N": "4"}}}
```

## Thực hành

Ba bước độc lập, mỗi bước chạy trên dữ liệu gốc. Bước được chấm bằng trạng thái bảng sau khi ghi.

# EN

## Key idea

`UpdateItem` changes **part** of an item through an `UpdateExpression`. This lesson uses the `SET` clause; L2 adds `REMOVE`, `ADD`, `DELETE`.

Two differences from SQL:

- **Upsert**: if the key does not exist, `UpdateItem` creates a new item. To prevent that, add a condition (L2).
- **No "UPDATE ... WHERE"** across many items. Each request changes exactly one item by its key.

`ReturnValues` for `UpdateItem`: `NONE`, `ALL_OLD`, `UPDATED_OLD`, `ALL_NEW`, `UPDATED_NEW`. For `DeleteItem`: `NONE` or `ALL_OLD`.

`DeleteItem` deletes one item by its full key. Deleting a key that does not exist is not an error.

## Example

Values always go through placeholders that start with `:`:

```json
{"UpdateExpression": "SET price = :p, stock = :s", "ExpressionAttributeValues": {":p": {"N": "99000"}, ":s": {"N": "4"}}}
```

## Practice

The three steps are independent; each runs on the original data. A step is graded by the table's state after the write.
