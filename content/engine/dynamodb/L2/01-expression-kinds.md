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
quiz:
  - q:
      vi: 'Request có `"FilterExpression": "total > 500000"`. DynamoDB trả lỗi gì và sửa thế nào?'
      en: 'A request has `"FilterExpression": "total > 500000"`. What error comes back, and how do you fix it?'
    options:
      - vi: Không lỗi gì.
        en: No error at all.
      - vi: '`ValidationException` vì `total` là từ dành riêng và số phải qua chỗ giữ chỗ - viết `#t > :x` và khai cả hai.'
        en: '`ValidationException` because `total` is a reserved word and the number must go through a placeholder - write `#t > :x` and declare both.'
      - vi: '`ConditionalCheckFailedException`.'
        en: '`ConditionalCheckFailedException`.'
    answer: 1
    why:
      vi: Biểu thức không nhận giá trị viết thẳng, và mọi từ dành riêng (`total`, `status`, `name`, `date`…) phải được thay bằng một tên `#…` trong `ExpressionAttributeNames`.
      en: Expressions never take literal values, and every reserved word (`total`, `status`, `name`, `date`...) must be replaced by a `#…` name declared in `ExpressionAttributeNames`.
  - q:
      vi: Biểu thức lọc `#a = :v OR #b = :v` có bao nhiêu toán tử theo cách DynamoDB đếm?
      en: How many operators does the filter `#a = :v OR #b = :v` have, the way DynamoDB counts them?
    options:
      - vi: "1"
        en: "1"
      - vi: "2"
        en: "2"
      - vi: "3"
        en: "3"
    answer: 2
    why:
      vi: Hai phép so `=` và một `OR`. Giới hạn là 300 toán tử mỗi biểu thức. Trong `SET a = a + :v`, dấu `=` của `SET` không tính, chỉ `+` tính.
      en: Two `=` comparisons and one `OR`. The limit is 300 operators per expression. In `SET a = a + :v`, the `=` of `SET` does not count, only the `+` does.
---

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

## Ví dụ

```json
{"KeyConditionExpression": "customerId = :c",
 "FilterExpression": "#t > :x AND #s <> :n",
 "ExpressionAttributeNames": {"#t": "total", "#s": "status"},
 "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}, ":n": {"S": "NEW"}}}
```

Giới hạn: mỗi biểu thức tối đa 4 KB và 300 toán tử (so sánh, `AND`/`OR`/`NOT`, `BETWEEN`, `IN`, hàm, `+`/`-`); `IN` tối đa 100 toán hạng.

## Thực hành

Danh sách từ dành riêng có hơn 500 từ, gồm nhiều tên rất hay gặp như `status`, `total`, `name`, `date`, `data`, `count`. Thói quen an toàn: luôn dùng một tên thay thế như `#n` trong biểu thức.

# EN

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

## Example

```json
{"KeyConditionExpression": "customerId = :c",
 "FilterExpression": "#t > :x AND #s <> :n",
 "ExpressionAttributeNames": {"#t": "total", "#s": "status"},
 "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}, ":n": {"S": "NEW"}}}
```

Limits: each expression is at most 4 KB and 300 operators (comparisons, `AND`/`OR`/`NOT`, `BETWEEN`, `IN`, functions, `+`/`-`); `IN` takes at most 100 operands.

## Practice

The reserved word list has over 500 words, including very common names such as `status`, `total`, `name`, `date`, `data`, `count`. A safe habit: always use a stand-in name such as `#n` in expressions.
