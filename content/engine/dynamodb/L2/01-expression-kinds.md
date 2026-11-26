---
id: e-dy-l2-01
engine: dynamodb
level: L2
module: expressions
title: "Năm loại biểu thức và chỗ giữ chỗ"
title_en: "Five kinds of expressions and their placeholders"
kind: concept
runtime: docs
minutes: 8
objectives:
  - vi: Biết mỗi loại biểu thức (key condition, filter, projection, condition, update) làm việc ở bước nào của request.
    en: Know at which step of a request each kind of expression (key condition, filter, projection, condition, update) works.
  - vi: Dùng `ExpressionAttributeNames` (`#n`) và `ExpressionAttributeValues` (`:v`) đúng chỗ.
    en: Use `ExpressionAttributeNames` (`#n`) and `ExpressionAttributeValues` (`:v`) in the right places.
  - vi: Nhớ giới hạn - biểu thức tối đa 4 KB, 300 toán tử, `IN` tối đa 100 toán hạng.
    en: Remember the limits - an expression is at most 4 KB, 300 operators, and `IN` takes at most 100 operands.
requires: [e-dy-l1-09]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeValues.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
demo_setup: |
  {"tables": [{"TableName": "Orders", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "customerId", "KeyType": "HASH"}, {"AttributeName": "orderId", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "customerId", "AttributeType": "S"}, {"AttributeName": "orderId", "AttributeType": "S"}]}],
   "items": {"Orders": [
    {"customerId": "C-02", "orderId": "2026-07-25#O-105", "status": "SHIPPED", "total": 640000},
    {"customerId": "C-02", "orderId": "2026-08-26#O-106", "status": "PAID", "total": 910000},
    {"customerId": "C-02", "orderId": "2026-09-17#O-107", "status": "DELIVERED", "total": 210000},
    {"customerId": "C-02", "orderId": "2026-10-03#O-108", "status": "NEW", "total": 820000},
    {"customerId": "C-03", "orderId": "2026-10-13#O-112", "status": "NEW", "total": 580000}
  ]}}
quiz:
  - q:
      vi: 'Request có `"FilterExpression": "total > 500000"`. DynamoDB trả lỗi gì và sửa thế nào?'
      en: 'A request has `"FilterExpression": "total > 500000"`. What error comes back, and how do you fix it?'
    options:
      - vi: Không lỗi gì, biểu thức lọc nhận giá trị viết thẳng như mệnh đề WHERE của SQL.
        en: No error at all, a filter takes literal values just like an SQL WHERE clause.
      - vi: '`ValidationException` vì `total` là từ dành riêng và số phải qua chỗ giữ chỗ - viết `#t > :x` và khai cả hai.'
        en: '`ValidationException` because `total` is a reserved word and the number must go through a placeholder - write `#t > :x` and declare both.'
      - vi: '`ConditionalCheckFailedException`.'
        en: '`ConditionalCheckFailedException`.'
    answer: 1
    trap: 0
    why:
      vi: Nghe hợp lý vì câu này trông giống WHERE của SQL, nhưng biểu thức DynamoDB không nhận giá trị viết thẳng như `500000`, và mọi từ dành riêng (`total`, `status`, `name`, `date`…) phải được thay bằng một tên `#…` trong `ExpressionAttributeNames`. Request bị từ chối ngay khi đọc cú pháp, trước khi chạm item nào, nên lỗi là `ValidationException`. `ConditionalCheckFailedException` chỉ xảy ra với một lệnh ghi có `ConditionExpression` sai điều kiện, không phải với bộ lọc.
      en: It sounds right because it looks like an SQL WHERE, but DynamoDB expressions never take a literal value such as `500000`, and every reserved word (`total`, `status`, `name`, `date`...) must be replaced by a `#…` name declared in `ExpressionAttributeNames`. The request is refused while its syntax is read, before any item is touched, so the error is a `ValidationException`. `ConditionalCheckFailedException` only happens to a write whose `ConditionExpression` is false, never to a filter.
  - q:
      vi: 'Biểu thức lọc `#a = :v OR #b = :v` có bao nhiêu toán tử theo cách DynamoDB đếm?'
      en: 'How many operators does the filter `#a = :v OR #b = :v` have, the way DynamoDB counts them?'
    options:
      - vi: "1"
        en: "1"
      - vi: "2"
        en: "2"
      - vi: "3"
        en: "3"
    answer: 2
    why:
      vi: Hai phép so `=` và một `OR`, tổng 2 + 1 = 3; đáp án 1 hay 2 là quên rằng `OR` và mỗi phép so đều tính riêng. Giới hạn là 300 toán tử mỗi biểu thức. Trong `SET a = a + :v`, dấu `=` của `SET` không tính, chỉ `+` tính.
      en: Two `=` comparisons and one `OR`, 2 + 1 = 3; answering 1 or 2 forgets that the `OR` and each comparison count separately. The limit is 300 operators per expression. In `SET a = a + :v`, the `=` of `SET` does not count, only the `+` does.
---

## Mở bài

Bạn viết `total > 500000` vào một request như viết WHERE trong SQL, và DynamoDB từ chối. Biểu thức của DynamoDB có những loại nào, và giá trị, tên thuộc tính phải đi qua đâu?

## Ý chính

Một request có thể mang tới năm loại biểu thức, mỗi loại làm việc ở một bước:

- `KeyConditionExpression` (Query): chọn item collection và khoảng sort key **trước khi đọc**. Chỉ dùng thuộc tính khóa.
- `FilterExpression` (Query, Scan): bỏ bớt item **sau khi đọc**. Không dùng được thuộc tính khóa chính trong Query.
- `ProjectionExpression`: chọn thuộc tính trả về.
- `ConditionExpression` (Put, Update, Delete): ghi chỉ khi điều kiện đúng.
- `UpdateExpression` (Update): `SET`, `REMOVE`, `ADD`, `DELETE`.

Hai bảng thay thế đi kèm:

- `ExpressionAttributeValues`: mọi **giá trị** trong biểu thức là một chỗ giữ chỗ `:x`.
- `ExpressionAttributeNames`: một **tên** `#x` thay cho tên thuộc tính trùng từ dành riêng, có ký tự đặc biệt, hoặc lặp nhiều lần.

Danh sách từ dành riêng có hơn 500 từ, gồm nhiều tên rất hay gặp như `status`, `total`, `name`, `date`, `data`, `count`. Thói quen an toàn: luôn dùng một tên thay thế như `#n` trong biểu thức. Giới hạn: mỗi biểu thức tối đa 4 KB và 300 toán tử (so sánh, `AND`/`OR`/`NOT`, `BETWEEN`, `IN`, hàm, `+`/`-`); `IN` tối đa 100 toán hạng.

Nhiều người nghĩ `FilterExpression` làm request rẻ hơn, vì phản hồi có ít item hơn. Thật ra DynamoDB tính capacity theo lượng đã đọc, trước khi lọc: bộ lọc chỉ làm phản hồi gọn lại. `ProjectionExpression` cũng vậy: item vẫn được đọc đủ rồi mới bị cắt thuộc tính. Muốn đọc ít hơn, phải đưa điều kiện vào khóa, tức vào `KeyConditionExpression`.

## Cú pháp

```text
"KeyConditionExpression": "<pk> = :p AND <sk condition>",
"FilterExpression": "#n <op> :v",
"ExpressionAttributeNames": {"#n": "<attribute name>"},
"ExpressionAttributeValues": {":p": {"S": "..."}, ":v": {"N": "..."}}
```

- Chỗ giữ chỗ giá trị bắt đầu bằng `:`, chỗ giữ chỗ tên bắt đầu bằng `#`.
- Mọi chỗ giữ chỗ đã khai phải được dùng trong một biểu thức của request.

## Ví dụ

Các đơn của `C-02` trên 500000, `total` qua tên `#t`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}}}}
```

Kết quả có 3 đơn (`O-105`, `O-106`, `O-108`), nhưng `ScannedCount` là 4: Query đọc cả bốn đơn của `C-02`, rồi bộ lọc mới bỏ đơn `O-107` (210000). Capacity 0.5 RCU được tính trên cả 4 item đã đọc.

Cùng khách, chỉ trả `orderId` và `status`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ProjectionExpression": "orderId, #s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

Bốn đơn trở về, mỗi đơn chỉ còn `orderId` và `status`. Tên `#s` vừa né từ dành riêng, vừa dùng lại được ở nhiều chỗ trong cùng request.

## Lỗi hay gặp

Dùng thẳng từ dành riêng `status` trong biểu thức:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "status = :s", "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":s": {"S": "NEW"}}}}
```

Thông báo lỗi nêu đúng từ bị vướng: `status` là từ dành riêng. Sửa bằng `#s = :s` và khai `"#s": "status"` trong `ExpressionAttributeNames`.

Khai một chỗ giữ chỗ mà không dùng:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}}}}
```

DynamoDB báo `:x` là giá trị đã khai mà không biểu thức nào dùng. Lỗi này hay gặp khi bạn bỏ bộ lọc mà quên xóa giá trị của nó: xóa `:x`, hoặc dùng lại nó trong `FilterExpression`.

Viết số thẳng vào biểu thức cũng là `ValidationException`: giá trị chỉ đi qua `:x`.

## Tóm tắt

- Năm loại biểu thức: key condition, filter, projection, condition, update.
- Key condition chọn trước khi đọc; filter bỏ bớt sau khi đọc.
- Mọi giá trị là một `:x` trong `ExpressionAttributeValues`.
- Từ dành riêng cần một tên `#x` trong `ExpressionAttributeNames`.
- Mỗi biểu thức tối đa 4 KB và 300 toán tử.

# EN

## Opening

You write `total > 500000` into a request the way you write an SQL WHERE, and DynamoDB refuses it. What kinds of expressions does DynamoDB have, and where must values and attribute names go?

## Key idea

A request can carry up to five kinds of expressions, each working at one step:

- `KeyConditionExpression` (Query): picks the item collection and sort key range **before reading**. Key attributes only.
- `FilterExpression` (Query, Scan): drops items **after reading**. In a Query it cannot use primary key attributes.
- `ProjectionExpression`: picks the attributes to return.
- `ConditionExpression` (Put, Update, Delete): writes only when the condition holds.
- `UpdateExpression` (Update): `SET`, `REMOVE`, `ADD`, `DELETE`.

Two substitution maps come with them:

- `ExpressionAttributeValues`: every **value** in an expression is a placeholder `:x`.
- `ExpressionAttributeNames`: a **name** `#x` stands in for an attribute name that is a reserved word, has special characters, or repeats often.

The reserved word list has over 500 words, including very common names such as `status`, `total`, `name`, `date`, `data`, `count`. A safe habit: always use a stand-in name such as `#n` in expressions. Limits: each expression is at most 4 KB and 300 operators (comparisons, `AND`/`OR`/`NOT`, `BETWEEN`, `IN`, functions, `+`/`-`); `IN` takes at most 100 operands.

Many people think a `FilterExpression` makes a request cheaper, because the response holds fewer items. In fact DynamoDB charges capacity for what it read, before the filter: the filter only makes the response smaller. A `ProjectionExpression` is the same: the whole item is read and then trimmed to the listed attributes. To read less, the condition has to go into the key, that is into the `KeyConditionExpression`.

## Syntax

```text
"KeyConditionExpression": "<pk> = :p AND <sk condition>",
"FilterExpression": "#n <op> :v",
"ExpressionAttributeNames": {"#n": "<attribute name>"},
"ExpressionAttributeValues": {":p": {"S": "..."}, ":v": {"N": "..."}}
```

- A value placeholder starts with `:`, a name placeholder with `#`.
- Every declared placeholder must be used in one of the request's expressions.

## Example

The orders of `C-02` above 500000, with `total` through the name `#t`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}}}}
```

The result holds 3 orders (`O-105`, `O-106`, `O-108`), but `ScannedCount` is 4: the Query reads all four orders of `C-02`, and only then does the filter drop order `O-107` (210000). The 0.5 RCU consumed is charged on all 4 items read.

The same customer, returning only `orderId` and `status`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ProjectionExpression": "orderId, #s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

Four orders come back, each with only `orderId` and `status`. The name `#s` both avoids the reserved word and can be reused in several places of the same request.

## Common mistakes

Using the reserved word `status` directly in an expression:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "status = :s", "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":s": {"S": "NEW"}}}}
```

The error message names the word that clashes: `status` is reserved. Fix it with `#s = :s` and declare `"#s": "status"` in `ExpressionAttributeNames`.

Declaring a placeholder and not using it:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}}}}
```

DynamoDB reports `:x` as a declared value that no expression uses. It often happens when you drop a filter and forget to delete its value: delete `:x`, or use it again in a `FilterExpression`.

Writing a number straight into an expression is a `ValidationException` too: values only go through `:x`.

## Recap

- Five kinds of expressions: key condition, filter, projection, condition, update.
- A key condition picks before reading; a filter drops items after reading.
- Every value is a `:x` in `ExpressionAttributeValues`.
- A reserved word needs a `#x` name in `ExpressionAttributeNames`.
- Each expression is at most 4 KB and 300 operators.
