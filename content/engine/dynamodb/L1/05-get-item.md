---
id: e-dy-l1-05
engine: dynamodb
level: L1
module: crud
title: "GetItem: đọc một item theo khóa"
title_en: "GetItem: read one item by its key"
kind: lab
runtime: browser
minutes: 8
objectives:
  - vi: Viết request `GetItem` với khóa chính đầy đủ.
    en: Write a `GetItem` request with the full primary key.
  - vi: Dùng `ProjectionExpression` để chỉ lấy vài thuộc tính, và biết nó không làm rẻ hơn.
    en: Use `ProjectionExpression` to return only some attributes, and know it does not make the read cheaper.
requires: [e-dy-l1-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
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
        vi: Đọc cuốn sách có `isbn` là `978-0-04` trong bảng `Books`.
        en: Read the book whose `isbn` is `978-0-04` from table `Books`.
      solution: |
        {"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}}}
      check: doc
      perf: { table: Books }
      slow: |
        {"op":"Scan","input":{"TableName":"Books","FilterExpression":"#k0 = :k0","ExpressionAttributeNames":{"#k0":"isbn"},"ExpressionAttributeValues":{":k0":{"S":"978-0-04"}}}}
      hint:
        vi: '`Key` là một map từ tên thuộc tính khóa tới giá trị có nhãn kiểu, ví dụ `{"isbn": {"S": "…"}}`.'
        en: '`Key` maps each key attribute name to a typed value, for example `{"isbn": {"S": "…"}}`.'
    - task:
        vi: Đọc lại cuốn `978-0-04`, nhưng chỉ lấy `title` và `price`.
        en: Read book `978-0-04` again, but return only `title` and `price`.
      solution: |
        {"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}, "ProjectionExpression": "title, price"}}
      check: doc
      perf: { table: Books }
      slow: |
        {"op":"Scan","input":{"TableName":"Books","FilterExpression":"#k0 = :k0","ExpressionAttributeNames":{"#k0":"isbn"},"ExpressionAttributeValues":{":k0":{"S":"978-0-04"}},"ProjectionExpression":"title, price"}}
      hint:
        vi: '`ProjectionExpression` là danh sách tên thuộc tính, cách nhau bằng dấu phẩy.'
        en: '`ProjectionExpression` is a comma-separated list of attribute names.'
---

## Ý chính

`GetItem` đọc **đúng một item** theo **khóa chính (primary key) đầy đủ**. Nếu bảng có sort key, `Key` phải có cả partition key lẫn sort key. Thiếu một phần là lỗi `ValidationException`, không phải "tìm gần đúng".

Không có item nào khớp thì phản hồi không có `Item`. Đó không phải lỗi, và lần đọc đó **vẫn tốn** capacity.

Mặc định `GetItem` đọc **nhất quán cuối** (eventually consistent): có thể chưa thấy lần ghi vừa xong. Thêm `"ConsistentRead": true` để đọc **nhất quán mạnh** (strongly consistent), giá gấp đôi (bài L2).

## Ví dụ

Bảng `Orders` có khóa kép, nên `Key` có hai thuộc tính:

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}}}}
```

`ProjectionExpression` chọn thuộc tính trả về, giống danh sách cột sau `SELECT`. Phản hồi gọn hơn nhưng **không rẻ hơn**: DynamoDB vẫn đọc cả item rồi mới cắt bớt.

## Thực hành

Bảng `Books` có 8 cuốn, khóa đơn `isbn`. Kết quả hiện ở tab Kết quả dạng JSON thường; request của bạn vẫn viết bằng DynamoDB JSON.

# EN

## Key idea

`GetItem` reads **exactly one item** by its **full primary key**. If the table has a sort key, `Key` must hold both the partition key and the sort key. Leaving one out is a `ValidationException`, not a "closest match".

When no item matches, the response has no `Item`. That is not an error, and the read **still costs** capacity.

By default `GetItem` is an **eventually consistent** read: it may miss a write that just finished. Add `"ConsistentRead": true` for a strongly consistent read, at twice the price (level L2).

## Example

Table `Orders` has a composite key, so `Key` holds two attributes:

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}}}}
```

`ProjectionExpression` picks the attributes to return, like the column list after `SELECT`. The response is smaller but **not cheaper**: DynamoDB still reads the whole item and then trims it.

## Practice

Table `Books` holds 8 books with the simple key `isbn`. The Result tab shows items as plain JSON; your request is still written in DynamoDB JSON.
