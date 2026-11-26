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
    - task:
        vi: 'Đọc `title` và `stock` của cuốn `978-0-02` bằng một lần đọc nhất quán mạnh, vì quầy vừa bán một cuốn.'
        en: 'Read `title` and `stock` of book `978-0-02` with a strongly consistent read, because the counter just sold a copy.'
      solution: |
        {"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "ProjectionExpression": "title, stock", "ConsistentRead": true}}
      check: doc
      expect: { CapacityUnits: 1 }
      hint:
        vi: 'Thêm `"ConsistentRead": true`. Item dưới 4 KB là một khối đọc: đọc nhất quán cuối (eventually consistent) tốn 0.5 RCU (read capacity unit, đơn vị đọc), đọc nhất quán mạnh (strongly consistent) tốn 1.'
        en: 'Add `"ConsistentRead": true`. An item under 4 KB is one read block: an eventually consistent read costs 0.5 RCU (read capacity unit), a strongly consistent one costs 1.'
quiz:
  - q:
      vi: 'Bạn gọi `GetItem` với `"ProjectionExpression": "title"` trên một item 3 KB. Lần đọc tốn bao nhiêu so với đọc cả item?'
      en: 'You call `GetItem` with `"ProjectionExpression": "title"` on a 3 KB item. How much does the read cost compared with reading the whole item?'
    options:
      - vi: Rẻ hơn, vì chỉ trả về một thuộc tính nhỏ
        en: Less, because only one small attribute comes back
      - vi: Bằng nhau, vì DynamoDB vẫn đọc cả item rồi mới cắt bớt
        en: The same, because DynamoDB still reads the whole item and then trims it
      - vi: Đắt hơn, vì phải xử lý thêm biểu thức
        en: More, because the expression needs extra work
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì phản hồi nhỏ đi, nhưng capacity tính theo kích thước item DynamoDB phải đọc, không theo phần trả về. Item 3 KB làm tròn lên một khối 4 KB, nên dù lấy `title` hay cả item, lần đọc nhất quán cuối vẫn là 1 × 0.5 = 0.5 RCU (read capacity unit, đơn vị đọc). `ProjectionExpression` chỉ cắt phản hồi sau khi đọc; việc cắt đó cũng không bị tính thêm, nên "đắt hơn" cũng sai.'
      en: 'It sounds right because the response gets smaller, but capacity is charged by the size of the item DynamoDB has to read, not by what comes back. A 3 KB item rounds up to one 4 KB block, so whether you take `title` or the whole item, an eventually consistent read is 1 × 0.5 = 0.5 RCU (read capacity unit). `ProjectionExpression` only trims the response after the read; the trimming is not charged either, so "more" is wrong too.'
  - q:
      vi: 'Bạn `GetItem` cuốn `978-0-99`, không có trong bảng. DynamoDB trả về gì?'
      en: 'You `GetItem` book `978-0-99`, which is not in the table. What does DynamoDB return?'
    options:
      - vi: 'Lỗi `ResourceNotFoundException`'
        en: 'A `ResourceNotFoundException` error'
      - vi: 'Phản hồi không có `Item`, và lần đọc vẫn tốn capacity'
        en: 'A response without `Item`, and the read still costs capacity'
      - vi: Item gần nhất theo thứ tự khóa
        en: The closest item in key order
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì nhiều API báo lỗi khi không tìm thấy, nhưng `ResourceNotFoundException` là khi bảng không tồn tại. Ở đây bảng `Books` có thật, chỉ item không có, nên phản hồi chỉ thiếu `Item`, và DynamoDB vẫn tính tiền lần đọc vì nó đã phải tìm theo khóa. `GetItem` cũng không trả item gần nhất: nó so khóa đúng từng ký tự, tìm gần đúng là việc của `Query` trên sort key.'
      en: 'It sounds right because many APIs raise an error when nothing is found, but `ResourceNotFoundException` means the table does not exist. Here table `Books` exists and only the item is missing, so the response just leaves `Item` out, and DynamoDB still charges for the read because it had to look the key up. `GetItem` never returns the closest item either: it matches the key exactly, and range lookups are the job of `Query` on a sort key.'
---
## Mở bài

Khách đứng ở quầy đọc mã `isbn` trên bìa sách và hỏi còn hàng không. Bạn có đủ khóa, vậy cách rẻ nhất để đọc đúng một item là gì?

## Ý chính

`GetItem` đọc **đúng một item** theo **khóa chính (primary key) đầy đủ**. Nếu bảng có sort key, `Key` phải có cả partition key lẫn sort key. Thiếu hay thừa một phần là lỗi `ValidationException`, không phải "tìm gần đúng".

Không có item nào khớp thì phản hồi không có `Item`. Đó không phải lỗi, và lần đọc đó **vẫn tốn** capacity.

Mặc định `GetItem` đọc **nhất quán cuối** (eventually consistent): có thể chưa thấy lần ghi vừa xong. Thêm `"ConsistentRead": true` để đọc **nhất quán mạnh** (strongly consistent), giá gấp đôi: item tới 4 KB tốn 0.5 RCU khi đọc nhất quán cuối, 1 RCU khi nhất quán mạnh.

`ProjectionExpression` chọn thuộc tính trả về, giống danh sách cột sau `SELECT`. Phản hồi gọn hơn nhưng **không rẻ hơn**: DynamoDB vẫn đọc cả item rồi mới cắt bớt.

## Cú pháp

```text
{"op": "GetItem", "input": {"TableName": "<table>",
  "Key": {"<pk>": {"S": "<value>"}, "<sk>": {"S": "<value>"}},
  "ProjectionExpression": "<attr>, <attr>",
  "ConsistentRead": true}}
```

- `Key`: mọi thuộc tính của khóa chính, không thêm thuộc tính nào khác.
- Mỗi giá trị có nhãn kiểu: `S` chuỗi, `N` số (viết trong chuỗi), `BOOL`…
- `ProjectionExpression` và `ConsistentRead` là tùy chọn.

## Ví dụ

Đọc cả item `978-0-01`:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}}}
```

Item về đủ sáu thuộc tính và lần đọc tốn 0.5 RCU, giá của một lần đọc nhất quán cuối.

Chỉ lấy `title` và `stock` của `978-0-06`:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-06"}}, "ProjectionExpression": "title, stock"}}
```

Phản hồi chỉ còn `title` và `stock` (41), nhưng engine vẫn ghi 0.5 RCU, đúng bằng lần đọc cả item: projection làm phản hồi gọn, không làm lần đọc rẻ hơn.

Với bảng khóa kép như `Orders` (partition key `customerId`, sort key `orderId`), `Key` có hai thuộc tính:

```text
"Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}}
```

## Lỗi hay gặp

Đưa thêm một thuộc tính không thuộc khóa vào `Key`, như khi lọc trong SQL:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}, "title": {"S": "Query Not Scan"}}}}
```

`Key` chỉ nhận đúng các thuộc tính của khóa chính. Thông báo là "The provided key element does not match the schema", như khi thiếu một phần khóa.

Gõ sai khóa rồi tưởng sách đã hết, vì không thấy lỗi:

```json
// WRONG: no such key, so the response has no Item (and no error)
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-4"}}}}
```

```json
// FIX: the exact key value
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}}}
```

Bản sai trả về một phản hồi chỉ có `ConsumedCapacity` 0.5: không `Item`, không lỗi, và vẫn tốn tiền. Trước khi kết luận "hết hàng", code phải kiểm phản hồi có `Item` hay không, rồi mới đọc `stock`.

## Thực hành

Bảng `Books` có 8 cuốn, khóa đơn `isbn`. Bước 1 đọc cả item, bước 2 thêm `ProjectionExpression`; cả hai có thanh hiệu năng, nên một `Scan` lọc theo `isbn` ra cùng item vẫn không đạt. Bước 3 đọc nhất quán mạnh và được chấm thêm theo capacity: phải đúng 1 RCU. Kết quả hiện ngay dưới bước, dạng JSON thường; request của bạn vẫn viết bằng DynamoDB JSON.

## Tóm tắt

- `GetItem` đọc tối đa một item theo khóa chính đầy đủ.
- `Key` thiếu hay thừa thuộc tính là `ValidationException`.
- Không có item thì không có `Item`, không lỗi, vẫn tốn capacity.
- `ProjectionExpression` làm phản hồi gọn, không làm lần đọc rẻ hơn.
- `"ConsistentRead": true` đọc nhất quán mạnh, giá gấp đôi.

# EN

## Opening

A customer at the counter reads the `isbn` on a book cover and asks whether it is in stock. You have the full key, so what is the cheapest way to read exactly one item?

## Key idea

`GetItem` reads **exactly one item** by its **full primary key**. If the table has a sort key, `Key` must hold both the partition key and the sort key. A missing or extra part is a `ValidationException`, not a "closest match".

When no item matches, the response has no `Item`. That is not an error, and the read **still costs** capacity.

By default `GetItem` is an **eventually consistent** read: it may miss a write that just finished. Add `"ConsistentRead": true` for a **strongly consistent** read, at twice the price: an item up to 4 KB costs 0.5 RCU eventually consistent and 1 RCU strongly consistent.

`ProjectionExpression` picks the attributes to return, like the column list after `SELECT`. The response is smaller but **not cheaper**: DynamoDB still reads the whole item and then trims it.

## Syntax

```text
{"op": "GetItem", "input": {"TableName": "<table>",
  "Key": {"<pk>": {"S": "<value>"}, "<sk>": {"S": "<value>"}},
  "ProjectionExpression": "<attr>, <attr>",
  "ConsistentRead": true}}
```

- `Key`: every attribute of the primary key and nothing else.
- Each value carries a type tag: `S` string, `N` number (written as a string), `BOOL`…
- `ProjectionExpression` and `ConsistentRead` are optional.

## Example

Read the whole item `978-0-01`:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}}}
```

The item comes back with all six attributes and the read costs 0.5 RCU, the price of an eventually consistent read.

Return only `title` and `stock` of `978-0-06`:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-06"}}, "ProjectionExpression": "title, stock"}}
```

The response holds only `title` and `stock` (41), but the engine still records 0.5 RCU, the same as reading the whole item: a projection makes the response smaller, not the read cheaper.

For a table with a composite key such as `Orders` (partition key `customerId`, sort key `orderId`), `Key` holds two attributes:

```text
"Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}}
```

## Common mistakes

Putting a non-key attribute into `Key`, as you would filter in SQL:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}, "title": {"S": "Query Not Scan"}}}}
```

`Key` takes exactly the attributes of the primary key. The message is "The provided key element does not match the schema", as when part of the key is missing.

Mistyping the key and concluding the book is gone, because no error shows:

```json
// WRONG: no such key, so the response has no Item (and no error)
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-4"}}}}
```

```json
// FIX: the exact key value
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}}}
```

The wrong version returns a response with only `ConsumedCapacity` 0.5: no `Item`, no error, and it still costs money. Before concluding "out of stock", the code must check whether the response has an `Item`, and only then read `stock`.

## Practice

Table `Books` holds 8 books with the simple key `isbn`. Step 1 reads the whole item, step 2 adds a `ProjectionExpression`; both have a performance bar, so a `Scan` filtered on `isbn` that returns the same item still does not pass. Step 3 reads with strong consistency and is also graded on capacity: it must be exactly 1 RCU. The result under the step shows items as plain JSON; your request is still written in DynamoDB JSON.

## Recap

- `GetItem` reads at most one item by the full primary key.
- A missing or extra attribute in `Key` is a `ValidationException`.
- No item means no `Item`, no error, and the read still costs capacity.
- `ProjectionExpression` makes the response smaller, not the read cheaper.
- `"ConsistentRead": true` is a strongly consistent read at twice the price.
