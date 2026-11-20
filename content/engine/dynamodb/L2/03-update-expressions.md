---
id: e-dy-l2-03
engine: dynamodb
level: L2
module: expressions
title: "UpdateExpression: SET, REMOVE, list_append, if_not_exists"
title_en: "UpdateExpression: SET, REMOVE, list_append, if_not_exists"
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Sửa số tại chỗ bằng `SET a = a - :d`, không cần đọc trước.
    en: Change a number in place with `SET a = a - :d`, without reading it first.
  - vi: Xóa thuộc tính bằng `REMOVE`, nối danh sách bằng `list_append`, đặt giá trị mặc định bằng `if_not_exists`.
    en: Remove an attribute with `REMOVE`, append to a list with `list_append`, and set a default with `if_not_exists`.
requires: [e-dy-l2-01, e-dy-l1-07]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
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
        vi: Giảm giá cuốn `978-0-05` thêm `12000` so với giá hiện tại, không đọc giá trước, và trả về item sau khi sửa.
        en: Lower the price of `978-0-05` by `12000` from its current price, without reading the price first, and return the item after the change.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-05"}},
          "UpdateExpression": "SET price = price - :d",
          "ExpressionAttributeValues": {":d": {"N": "12000"}},
          "ReturnValues": "ALL_NEW"}}
      check: doc
      hint:
        vi: '`SET` nhận phép `+` và `-` giữa một thuộc tính và một giá trị.'
        en: '`SET` accepts `+` and `-` between an attribute and a value.'
    - task:
        vi: Cuốn `978-0-08` không còn được gắn nhãn. Xóa hẳn thuộc tính `tags` của nó.
        en: Book `978-0-08` is no longer tagged. Remove its `tags` attribute entirely.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-08"}},
          "UpdateExpression": "REMOVE tags"}}
      check: doc
      hint:
        vi: '`REMOVE` theo sau là tên thuộc tính, không cần giá trị.'
        en: '`REMOVE` is followed by the attribute name, no value needed.'
    - task:
        vi: Thêm nhãn "classic" vào cuối danh sách `tags` của cuốn `978-0-01`.
        en: Append the tag "classic" to the end of the `tags` list of book `978-0-01`.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-01"}},
          "UpdateExpression": "SET tags = list_append(tags, :t)",
          "ExpressionAttributeValues": {":t": {"L": [{"S": "classic"}]}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: '`list_append` nối hai danh sách, nên giá trị mới cũng phải là một danh sách `L`.'
        en: '`list_append` joins two lists, so the new value must be an `L` list too.'
    - task:
        vi: 'Đếm lượt xem cuốn `978-0-07` trong thuộc tính `views`. Thuộc tính này chưa có - nếu chưa có thì coi là 0, rồi cộng 1.'
        en: 'Count the views of book `978-0-07` in the attribute `views`. It does not exist yet - treat a missing value as 0, then add 1.'
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-07"}},
          "UpdateExpression": "SET #v = if_not_exists(#v, :z) + :one",
          "ExpressionAttributeNames": {"#v": "views"},
          "ExpressionAttributeValues": {":z": {"N": "0"}, ":one": {"N": "1"}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: '`if_not_exists(views, :z)` trả về `views` nếu có, ngược lại trả `:z`. `views` cũng là từ dành riêng.'
        en: '`if_not_exists(views, :z)` returns `views` when it exists, otherwise `:z`. `views` is a reserved word too.'
---

## Ý chính

`UpdateExpression` có bốn mệnh đề, mỗi mệnh đề xuất hiện tối đa một lần, có thể ghép trong một request:

- `SET`: gán hoặc tính giá trị (`+`, `-`, `list_append`, `if_not_exists`).
- `REMOVE`: xóa thuộc tính, hoặc xóa phần tử danh sách theo vị trí (`REMOVE tags[0]`).
- `ADD`: cộng vào số, hoặc thêm phần tử vào tập hợp (bài bộ đếm).
- `DELETE`: bớt phần tử khỏi tập hợp `SS`/`NS`/`BS`.

Mọi phép tính chạy **ở phía server, trên một item, nguyên tử** (atomic): không cần đọc rồi ghi lại, nên hai người sửa cùng lúc không đè lên nhau.

## Ví dụ

Ghép nhiều mệnh đề trong một request:

```text
SET price = price - :d, tags = list_append(:first, tags) REMOVE promo
```

`list_append(:first, tags)` thêm vào **đầu** danh sách, `list_append(tags, :last)` thêm vào **cuối**.

## Thực hành

`if_not_exists` là cách đặt giá trị mặc định mà không cần biết item đã có thuộc tính hay chưa. Kết hợp với `+` ta có bộ đếm an toàn cho item mới.

# EN

## Key idea

An `UpdateExpression` has four clauses. Each appears at most once, and they can be combined in one request:

- `SET`: assign or compute a value (`+`, `-`, `list_append`, `if_not_exists`).
- `REMOVE`: delete an attribute, or a list element by position (`REMOVE tags[0]`).
- `ADD`: add to a number, or add elements to a set (counter lesson).
- `DELETE`: take elements out of an `SS`/`NS`/`BS` set.

Every computation runs **on the server, on one item, atomically**: no read-then-write, so two people changing the item at once do not overwrite each other.

## Example

Several clauses in one request:

```text
SET price = price - :d, tags = list_append(:first, tags) REMOVE promo
```

`list_append(:first, tags)` adds to the **front** of the list, `list_append(tags, :last)` to the **end**.

## Practice

`if_not_exists` sets a default without knowing whether the item already has the attribute. Combined with `+` it gives a safe counter for new items.
