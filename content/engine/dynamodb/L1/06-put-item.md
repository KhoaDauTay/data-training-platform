---
id: e-dy-l1-06
engine: dynamodb
level: L1
module: crud
title: "PutItem: thêm hoặc thay cả item"
title_en: "PutItem: insert or replace a whole item"
kind: lab
runtime: browser
minutes: 8
objectives:
  - vi: Thêm một item bằng `PutItem`.
    en: Insert an item with `PutItem`.
  - vi: Biết `PutItem` lên khóa đã có sẽ thay cả item, và dùng `ReturnValues` để thấy bản cũ.
    en: Know that `PutItem` on an existing key replaces the whole item, and use `ReturnValues` to see the old image.
requires: [e-dy-l1-05]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
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
        vi: 'Thêm vào `Books` cuốn mới - `isbn` `978-0-09`, `title` "Write Paths", `author` "Vo Khanh", `price` 110000, `stock` 10.'
        en: 'Add a new book to `Books` - `isbn` `978-0-09`, `title` "Write Paths", `author` "Vo Khanh", `price` 110000, `stock` 10.'
      solution: |
        {"op": "PutItem", "input": {"TableName": "Books", "Item": {
          "isbn": {"S": "978-0-09"}, "title": {"S": "Write Paths"}, "author": {"S": "Vo Khanh"},
          "price": {"N": "110000"}, "stock": {"N": "10"}}}}
      check: doc
      hint:
        vi: '`Item` chứa mọi thuộc tính, mỗi giá trị có nhãn kiểu. Số viết trong chuỗi - `{"N": "110000"}`.'
        en: '`Item` holds every attribute, each value with a type tag. Numbers go inside a string - `{"N": "110000"}`.'
    - task:
        vi: 'Ghi đè cuốn `978-0-02` bằng item chỉ có `isbn`, `title` "Keys and Values" và `price` 90000, và trả về bản cũ để thấy những gì đã mất.'
        en: 'Overwrite book `978-0-02` with an item that has only `isbn`, `title` "Keys and Values" and `price` 90000, and return the old image to see what was lost.'
      solution: |
        {"op": "PutItem", "input": {"TableName": "Books",
          "Item": {"isbn": {"S": "978-0-02"}, "title": {"S": "Keys and Values"}, "price": {"N": "90000"}},
          "ReturnValues": "ALL_OLD"}}
      check: doc
      hint:
        vi: '`PutItem` chỉ nhận `ReturnValues` là `NONE` hoặc `ALL_OLD`.'
        en: '`PutItem` accepts only `NONE` or `ALL_OLD` for `ReturnValues`.'
---

## Ý chính

`PutItem` ghi **cả một item**. Nếu khóa chưa có, item mới được thêm. Nếu khóa đã có, item cũ bị **thay toàn bộ**: thuộc tính nào không có trong item mới thì mất.

Đây là chỗ khác `UPDATE` của SQL. Muốn chỉ sửa vài thuộc tính, dùng `UpdateItem` (bài sau). Muốn "chỉ thêm, không bao giờ ghi đè", thêm điều kiện `attribute_not_exists` (bài L2).

`ReturnValues: "ALL_OLD"` trả về item trước khi bị thay. Khi khóa còn mới, phản hồi không có `Attributes`.

## Ví dụ

Sau bước 2, cuốn `978-0-02` mất `author`, `stock` và `tags`, vì item mới không có chúng:

```json
{"isbn": "978-0-02", "title": "Keys and Values", "price": 90000}
```

## Thực hành

Bước ghi được chấm bằng cách so **cả bảng** sau khi ghi với bảng sau đáp án. Mỗi bước bắt đầu lại từ dữ liệu gốc.

# EN

## Key idea

`PutItem` writes **a whole item**. If the key is new, the item is added. If the key exists, the old item is **replaced entirely**: any attribute missing from the new item is gone.

This differs from SQL `UPDATE`. To change only some attributes, use `UpdateItem` (next lesson). For "insert only, never overwrite", add an `attribute_not_exists` condition (level L2).

`ReturnValues: "ALL_OLD"` returns the item as it was before the replace. When the key is new, the response has no `Attributes`.

## Example

After step 2, book `978-0-02` has lost `author`, `stock` and `tags`, because the new item does not have them:

```json
{"isbn": "978-0-02", "title": "Keys and Values", "price": 90000}
```

## Practice

A write step is graded by comparing the **whole table** after your write with the table after the solution. Every step starts again from the original data.
