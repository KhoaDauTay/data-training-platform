---
id: e-bp-d18
engine: best
track: dynamodb
level: L1
module: d
title: "Số lưu kiểu N, nhất là khi làm sort key"
title_en: "Store numbers as N, especially in sort keys"
kind: quiz
minutes: 3
objectives:
  - vi: "Chọn kiểu `N` cho điểm, số tiền, số lượng, nhất là khi thuộc tính đó là sort key."
    en: "Choose type `N` for scores, amounts and quantities, above all when the attribute is a sort key."
avoid:
  vi: "Top N sai âm thầm vì sort key chuỗi xếp `\"9\"` sau `\"250\"`."
  en: "A silently wrong top N because a string sort key puts `\"9\"` after `\"250\"`."
requires: [e-dy-l1-01, e-dy-l1-02]
skills: [order_by, cast]
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes.String
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: diff
  setup: |
    {"tables": [
      {"TableName": "BoardText", "BillingMode": "PAY_PER_REQUEST",
       "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "score", "KeyType": "RANGE"}],
       "AttributeDefinitions": [{"AttributeName": "pk", "AttributeType": "S"}, {"AttributeName": "score", "AttributeType": "S"}]},
      {"TableName": "BoardNum", "BillingMode": "PAY_PER_REQUEST",
       "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "score", "KeyType": "RANGE"}],
       "AttributeDefinitions": [{"AttributeName": "pk", "AttributeType": "S"}, {"AttributeName": "score", "AttributeType": "N"}]}
     ],
     "items": {
      "BoardText": [
        {"pk": {"S": "BOARD"}, "score": {"S": "9"}}, {"pk": {"S": "BOARD"}, "score": {"S": "75"}},
        {"pk": {"S": "BOARD"}, "score": {"S": "80"}}, {"pk": {"S": "BOARD"}, "score": {"S": "100"}},
        {"pk": {"S": "BOARD"}, "score": {"S": "250"}}],
      "BoardNum": [
        {"pk": {"S": "BOARD"}, "score": {"N": "9"}}, {"pk": {"S": "BOARD"}, "score": {"N": "75"}},
        {"pk": {"S": "BOARD"}, "score": {"N": "80"}}, {"pk": {"S": "BOARD"}, "score": {"N": "100"}},
        {"pk": {"S": "BOARD"}, "score": {"N": "250"}}]
     }}
  bad: |
    {"op": "Query", "input": {"TableName": "BoardText", "KeyConditionExpression": "pk = :p", "ScanIndexForward": false, "Limit": 3, "ExpressionAttributeValues": {":p": {"S": "BOARD"}}}}
  good: |
    {"op": "Query", "input": {"TableName": "BoardNum", "KeyConditionExpression": "pk = :p", "ScanIndexForward": false, "Limit": 3, "ExpressionAttributeValues": {":p": {"S": "BOARD"}}}}
  expect: null
quiz:
  - q:
      vi: "Sort key `score` có kiểu `S`, chứa các điểm 9, 75, 80, 100, 250. `Query` với `ScanIndexForward: false` và `Limit: 3` trả ba điểm nào?"
      en: "Sort key `score` has type `S` and holds the scores 9, 75, 80, 100, 250. Which three scores does a `Query` with `ScanIndexForward: false` and `Limit: 3` return?"
    options:
      - { vi: "250, 100, 80", en: "250, 100, 80" }
      - { vi: "9, 80, 75", en: "9, 80, 75" }
      - { vi: "Báo lỗi vì `score` không phải số", en: "An error, because `score` is not a number" }
    answer: 1
    why:
      vi: "Kiểu `S` xếp theo byte UTF-8, từng ký tự một: \"9\" lớn hơn \"8\", \"7\", \"2\", \"1\". Kiểu `N` xếp theo giá trị số nên trả 250, 100, 80."
      en: "Type `S` sorts by UTF-8 bytes, character by character: \"9\" is greater than \"8\", \"7\", \"2\", \"1\". Type `N` sorts by numeric value, so it returns 250, 100, 80."
---

## Ý chính

Điểm, số tiền, số lượng, epoch giây lưu kiểu `N`. Nếu buộc phải ghép số vào một sort key (sort key, khóa sắp xếp) dạng chuỗi, đệm số 0 tới độ dài cố định (`"000250"`).

## Vì sao

- Sort key kiểu `S` sắp theo byte UTF-8, nên `"9"` đứng sau `"80"` và `"250"`.
- Top N, khoảng `BETWEEN` và phân trang đều sai mà không có lỗi nào.
- Kiểu `N` được sắp theo giá trị số.

## Ví dụ

Cùng năm điểm, `Query` giảm dần lấy 3 item. Bảng có `score` kiểu `S` trả `9, 80, 75`. Bảng có `score` kiểu `N` trả `250, 100, 80`.

# EN

## Key idea

Store scores, amounts, quantities and epoch seconds as type `N`. If you must put a number inside a string sort key, pad it with zeros to a fixed width (`"000250"`).

## Why

- A sort key of type `S` sorts by UTF-8 bytes, so `"9"` comes after `"80"` and `"250"`.
- Top N, `BETWEEN` ranges and pagination all go wrong with no error.
- Type `N` sorts by numeric value.

## Example

Same five scores, a descending `Query` takes 3 items. The table whose `score` is type `S` returns `9, 80, 75`. The table whose `score` is type `N` returns `250, 100, 80`.
